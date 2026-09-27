/**
 * Prescription de charge (spec strength 04 §10, addendum V1.1 §7). L'e1RM est une ESTIMATION avec une
 * confiance, jamais une vérité : aucun 1RM inventé, aucune conversion de charge entre machines ni vers
 * la barre, aucune précision supérieure aux données. Sans référence fiable : prescription autorégulée
 * prudente (calibration) dont les valeurs sont des paramètres G2.
 */
import type { Exercise, ReasonCode, SetIntensity } from '@hybridsport/domain';
import type { Env } from './model.js';
import { strengthReasons } from './codes.js';
import { assessDeclared, assessMeasured, assessTransferred } from './confidence.js';
import type { ConfidenceAssessment } from './confidence.js';
import { daysBetween, median, roundDownToStep } from './util.js';

export const CONFIDENCES = ['none', 'low', 'medium', 'high'] as const;
export type Confidence = (typeof CONFIDENCES)[number];
const notch = (c: Confidence, d: number): Confidence => CONFIDENCES[Math.max(0, Math.min(CONFIDENCES.length - 1, CONFIDENCES.indexOf(c) + d))] ?? 'none';

export interface LoadKnowledge {
  readonly confidence: Confidence;
  /** e1RM lissé (kg), seulement si une estimation est possible. */
  readonly e1rmKg?: number;
  /** Dernière charge de travail réellement réalisée sur CET exercice (double progression). */
  readonly lastLoadKg?: number;
  readonly lastReps?: number;
  readonly source: 'measured' | 'declared' | 'transferred' | 'none';
  readonly reasons: readonly ReasonCode[];
  /** PrescriptionConfidence ordinale (ruleset scientifique V1) : facteurs tracés ; absente en 0.2.0. */
  readonly assessment?: ConfidenceAssessment;
}

/** Pas réalisable (kg) : incrément déclaré pour le matériel de l'exercice, sinon incrément par défaut du modèle de charge. */
export function loadStep(e: Exercise, env: Env): { stepKg: number; maxKg?: number } | undefined {
  const declared = env.input.discipline.equipmentIncrements ?? {};
  for (const q of [...e.equipment.allOf, ...e.equipment.anyOf].sort()) {
    const d = declared[q];
    if (d && env.equipment.has(q)) return { stepKg: d.stepKg, ...(d.maxKg !== undefined ? { maxKg: d.maxKg } : {}) };
  }
  if (!e.loadModel) return undefined;
  const def = env.params['strength.load.defaultIncrements'][e.loadModel];
  return def === undefined ? undefined : { stepKg: def };
}

function e1rm(loadKg: number, repsToFailure: number, env: Env): number | undefined {
  const p = env.params['strength.load'];
  if (repsToFailure < p.validRepRange.min || repsToFailure > p.validRepRange.max) return undefined;
  return loadKg * (1 + repsToFailure / p.e1rmDivisor);
}

/** Fraction de l'e1RM pour (reps + RIR) = reps jusqu'à l'échec, lue dans la table du ruleset. */
export function pctFor(reps: number, rir: number, env: Env): number | undefined {
  const rtf = Math.round(reps + rir);
  return env.params['strength.load'].pctByRepsToFailure[String(rtf)];
}

function ageConfidence(base: Confidence, asOf: string, env: Env): Confidence {
  const w = env.params['strength.load'].referenceWindowsDays;
  const days = daysBetween(asOf, env.input.context.now);
  if (days > w.low) return 'none';
  if (days > w.medium) return notch(base, -1 - 1);
  if (days > w.high) return notch(base, -1);
  return base;
}

/** Références propres à l'exercice (mesurées d'abord, déclarées ensuite), sans aucun transfert. */
function ownKnowledge(e: Exercise, env: Env): Omit<LoadKnowledge, 'reasons'> & { conflict: boolean } {
  const ctx = env.input.discipline;
  const p = env.params['strength.load'];
  const rules = env.params['strength.prescriptionConfidence'];
  const exposures = ctx.recentExposures.filter((x) => x.exerciseId === e.id).sort((a, b) => (a.at < b.at ? 1 : -1));
  const measured: { value: number; withRir: boolean; at: string }[] = [];
  // Série trop LÉGÈRE pour la formule (reps jusqu'à l'échec au-delà de la plage valide) : seule une BORNE
  // INFÉRIEURE de l'e1RM est connue — gardée, en confiance basse (l'exécution doit mettre la confiance à jour).
  let lowerBound: number | undefined;
  for (const x of exposures) for (const s of x.sets) {
    if (s.loadKg === undefined || s.loadKg <= 0 || s.reps <= 0) continue;
    const rtf = s.reps + (s.rir ?? p.assumedRirWhenUnknown);
    const v = e1rm(s.loadKg, rtf, env);
    if (v !== undefined) measured.push({ value: v, withRir: s.rir !== undefined, at: x.at });
    else if (rtf > p.validRepRange.max) lowerBound = Math.max(lowerBound ?? 0, s.loadKg * (1 + p.validRepRange.max / p.e1rmDivisor));
  }
  const last = exposures.find((x) => x.sets.some((s) => s.loadKg !== undefined && s.loadKg > 0));
  const lastSet = last?.sets.filter((s) => s.loadKg !== undefined && s.loadKg > 0).at(-1);
  const lastPart = lastSet?.loadKg !== undefined ? { lastLoadKg: lastSet.loadKg, lastReps: lastSet.reps } : {};
  const caps = ctx.capacities.filter((c) => c.exerciseId === e.id && (c.contextKey === undefined || c.contextKey === ctx.currentContextKey));
  const declaredValues = caps.map((c) => ({ c, v: c.e1rmKg ?? (c.loadKg !== undefined && c.reps !== undefined ? e1rm(c.loadKg, c.reps + (c.rir ?? p.assumedRirWhenUnknown), env) : undefined) }))
    .filter((x): x is { c: (typeof caps)[number]; v: number } => x.v !== undefined);

  if (measured.length > 0) {
    const recent = measured.slice(0, p.smoothingWindow);
    const value = median(recent.map((m) => m.value)) ?? 0;
    const conflict = declaredValues.some((d) => Math.abs(d.v - value) / value > p.conflictTolerance);
    if (rules) {
      const assessment = assessMeasured(measured, { now: env.input.context.now, level: env.level, conflict }, env.params, rules);
      return { confidence: assessment.level, e1rmKg: value, source: 'measured', conflict, assessment, ...lastPart };
    }
    let conf: Confidence = recent.some((m) => m.withRir) ? 'high' : 'medium';
    conf = ageConfidence(conf, recent[0]?.at ?? env.input.context.now, env);
    if (conflict) conf = notch(conf, -1);
    return { confidence: conf, e1rmKg: value, source: 'measured', conflict, ...lastPart };
  }
  if (lowerBound !== undefined && declaredValues.length === 0) {
    const conf = ageConfidence('low', exposures[0]?.at ?? env.input.context.now, env);
    const assessment: ConfidenceAssessment | undefined = rules ? { level: conf, rulesVersion: rules.rulesVersion, factors: { recency: conf === 'none' ? 'expired' : 'fresh', observations: 0, sessions: 0, consistency: 'consistent', rir: 'uncertain', conflict: false, transfer: false, source: 'lower_bound' } } : undefined;
    return { confidence: conf, e1rmKg: lowerBound, source: 'measured', conflict: false, ...(assessment ? { assessment } : {}), ...lastPart };
  }
  if (declaredValues.length > 0) {
    const best = [...declaredValues].sort((a, b) => (a.c.asOf < b.c.asOf ? 1 : -1))[0];
    if (best) {
      const base: Confidence = best.c.source === 'app_sets_with_rir' ? 'high' : best.c.source === 'declared_1rm' || best.c.source === 'app_sets_without_rir' ? 'medium' : 'low';
      const vals = declaredValues.map((d) => d.v);
      const conflict = vals.some((v) => Math.abs(v - best.v) / best.v > p.conflictTolerance);
      if (rules) {
        const assessment = assessDeclared(base, best.c.asOf, { now: env.input.context.now, conflict }, env.params, rules);
        return { confidence: assessment.level, e1rmKg: best.v, source: 'declared', conflict, assessment, ...lastPart };
      }
      const conf = notch(ageConfidence(base, best.c.asOf, env), conflict ? -1 : 0);
      return { confidence: conf, e1rmKg: best.v, source: 'declared', conflict, ...lastPart };
    }
  }
  return { confidence: 'none', source: 'none', conflict: false, ...lastPart };
}

/**
 * Connaissance de la charge : références propres, sinon transfert LIMITÉ à la classe d'équivalence et aux
 * modèles de charge transférables (jamais une machine), avec un déclassement paramétré (D-S5).
 */
export function loadKnowledge(e: Exercise, env: Env): LoadKnowledge {
  const reasons: ReasonCode[] = [];
  const own = ownKnowledge(e, env);
  if (own.conflict) reasons.push(strengthReasons.emit('STATE.REFERENCE_CONFLICT', { exerciseId: e.id }));
  if (own.confidence !== 'none' || own.lastLoadKg !== undefined) return withAssessmentReason(e, { ...stripConflict(own), reasons });
  const p = env.params['strength.load'];
  const transferable = (x: Exercise) => x.loadModel !== undefined && p.transferableLoadModels.includes(x.loadModel);
  if (transferable(e)) {
    const peers = env.catalog.exercises().filter((x) => x.id !== e.id && x.equivalenceClass === e.equivalenceClass && transferable(x)).sort((a, b) => (a.id < b.id ? -1 : 1));
    for (const peer of peers) {
      const k = ownKnowledge(peer, env);
      if (k.e1rmKg !== undefined && k.confidence !== 'none') {
        if (k.assessment) {
          const assessment = assessTransferred(k.assessment, p.equivalenceTransferPenalty);
          return withAssessmentReason(e, { confidence: assessment.level, e1rmKg: k.e1rmKg, source: 'transferred', reasons, assessment });
        }
        return { confidence: notch(k.confidence, -p.equivalenceTransferPenalty), e1rmKg: k.e1rmKg, source: 'transferred', reasons };
      }
    }
  }
  return { confidence: 'none', source: 'none', reasons };
}

/** Trace des facteurs de la PrescriptionConfidence ordinale (ruleset scientifique V1 seulement). */
function withAssessmentReason(e: Exercise, k: LoadKnowledge): LoadKnowledge {
  const a = k.assessment;
  if (!a) return k;
  const f = a.factors;
  return { ...k, reasons: [...k.reasons, strengthReasons.emit('DOSE.LOAD.CONFIDENCE', {
    exerciseId: e.id, level: a.level, rules: a.rulesVersion, source: f.source, recency: f.recency, observations: f.observations, sessions: f.sessions,
    consistency: f.consistency, rir: f.rir, conflict: f.conflict, transfer: f.transfer,
  })] };
}

function stripConflict(k: Omit<LoadKnowledge, 'reasons'> & { conflict: boolean }): Omit<LoadKnowledge, 'reasons'> {
  const { conflict: _c, ...rest } = k;
  return rest;
}

export interface LoadDecision {
  readonly intensity: SetIntensity;
  readonly source: 'track' | 'base_profile' | 'calibration' | 'history';
  /** Charge de travail en kg (connue ou suggérée), pour la montée en charge et les marqueurs. */
  readonly workingKg?: number;
  readonly knowledge: 'known' | 'estimated' | 'effort' | 'unknown';
  readonly reasons: readonly ReasonCode[];
  /** Plafond matériel atteint : la variable progressée devient les répétitions. */
  readonly capped: boolean;
}

/**
 * Mode de prescription selon la confiance (spec 04 §10.2) : high ⇒ charge (ou % d'e1RM si la table le
 * permet) ; medium ⇒ charge suggérée + effort ; low ⇒ effort + fourchette indicative ; none ⇒ effort
 * seul (calibration). Poids du corps non lestable ⇒ `bodyweight`.
 */
export function decideLoad(e: Exercise, reps: number, rir: number, env: Env, fromTrackKg?: number, allowPercent = true, trackE1rmKg?: number): LoadDecision {
  const effort = { rir };
  if (!e.loadable || !e.loadModel) {
    return { intensity: { mode: 'bodyweight', effort }, source: 'base_profile', knowledge: 'known', reasons: [], capped: false };
  }
  const step = loadStep(e, env);
  const own = loadKnowledge(e, env);
  // e1RM LISSÉ de la track (modèle autorégulé, propriété du ProgressionEngine) : il fait foi sur la dernière
  // exposition brute ; la confiance reste celle des données (jamais relevée au-delà de ce qu'elles montrent).
  const fromTrack = trackE1rmKg !== undefined && own.confidence !== 'none';
  const k: LoadKnowledge = fromTrack ? { ...own, e1rmKg: trackE1rmKg } : own;
  const reasons: ReasonCode[] = [...k.reasons];
  const round = (kg: number): number | undefined => (step ? Math.max(step.stepKg, roundDownToStep(kg, step.stepKg)) : undefined);
  const cap = (kg: number): { kg: number; capped: boolean } => (step?.maxKg !== undefined && kg > step.maxKg ? { kg: step.maxKg, capped: true } : { kg, capped: false });

  // Prescription de la track (ProgressionEngine) : elle fait foi si elle porte une charge.
  if (fromTrackKg !== undefined && step) {
    const c = cap(fromTrackKg);
    if (c.capped) reasons.push(strengthReasons.emit('DOSE.LOAD.CAP_REACHED', { exerciseId: e.id, maxKg: c.kg }));
    const kg = round(c.kg) ?? c.kg;
    const certainty = k.confidence === 'high' ? 'prescribed' : 'suggested';
    return { intensity: { mode: 'load', kg, certainty, effort }, source: 'track', workingKg: kg, knowledge: certainty === 'prescribed' ? 'known' : 'estimated', reasons, capped: c.capped };
  }
  // Hiérarchie de référence (ruleset scientifique V1) : une observation RÉCENTE et SPÉCIFIQUE (reps et RIR
  // proches de la cible, sur CET exercice) prime sur l'e1RM générique, qui n'est qu'un repli. La track reste
  // l'autorité quand elle porte la référence (trois autorités).
  const spec = env.params['strength.load.specificObservation'];
  if (spec && allowPercent && !fromTrack && step && (k.confidence === 'high' || k.confidence === 'medium')) {
    const obs = specificObservation(e, reps, rir, env, spec);
    if (obs) {
      const c = cap(obs.loadKg);
      const kg = round(c.kg) ?? c.kg;
      reasons.push(strengthReasons.emit('DOSE.LOAD.FROM_SPECIFIC', { exerciseId: e.id, observedKg: obs.loadKg, observedReps: obs.reps, observedRir: obs.rir, at: obs.at, confidence: k.confidence }));
      const certainty = k.confidence === 'high' ? 'prescribed' : 'suggested';
      return { intensity: { mode: 'load', kg, certainty, effort }, source: 'history', workingKg: kg, knowledge: certainty === 'prescribed' ? 'known' : 'estimated', reasons, capped: c.capped };
    }
  }
  const pct = pctFor(reps, rir, env);
  // Le % d'e1RM n'est utilisé que sur un composé principal ou secondaire (jamais sur l'isolation ni un accessoire).
  if (allowPercent && k.confidence === 'high' && k.e1rmKg !== undefined && pct !== undefined && step) {
    const c = cap(k.e1rmKg * pct);
    if (c.capped) reasons.push(strengthReasons.emit('DOSE.LOAD.CAP_REACHED', { exerciseId: e.id, maxKg: c.kg }));
    const kg = round(c.kg) ?? c.kg;
    // Traçabilité complète de la charge : référence (track lissée ou mesures), e1RM, fraction, valeur avant arrondi, pas.
    reasons.push(strengthReasons.emit('DOSE.LOAD.FROM_E1RM', { exerciseId: e.id, fraction: pct, confidence: k.confidence, e1rmKg: k.e1rmKg, reference: fromTrack ? 'track_smoothed' : k.source, unroundedKg: k.e1rmKg * pct, stepKg: step.stepKg }));
    return { intensity: { mode: 'percent_of_reference', fraction: pct, reference: 'e1rm', kgRounded: kg, effort }, source: fromTrack ? 'track' : 'base_profile', workingKg: kg, knowledge: 'known', reasons, capped: c.capped };
  }
  if ((k.confidence === 'high' || k.confidence === 'medium') && step && (k.e1rmKg !== undefined || k.lastLoadKg !== undefined)) {
    // Accessoire / isolation (double progression) : dernière charge réellement réalisée sur CET exercice.
    const raw = !allowPercent && k.lastLoadKg !== undefined ? k.lastLoadKg : k.e1rmKg !== undefined && pct !== undefined ? k.e1rmKg * pct : k.lastLoadKg ?? 0;
    const c = cap(raw);
    const kg = round(c.kg) ?? c.kg;
    reasons.push(strengthReasons.emit('DOSE.LOAD.FROM_HISTORY', { exerciseId: e.id, confidence: k.confidence }));
    const certainty = k.confidence === 'high' ? 'prescribed' : 'suggested';
    return { intensity: { mode: 'load', kg, certainty, effort }, source: 'history', workingKg: kg, knowledge: certainty === 'prescribed' ? 'known' : 'estimated', reasons, capped: c.capped };
  }
  if (k.confidence === 'low' && step && (k.e1rmKg !== undefined || k.lastLoadKg !== undefined)) {
    const raw = k.e1rmKg !== undefined && pct !== undefined ? k.e1rmKg * pct : k.lastLoadKg ?? 0;
    const spread = env.params['strength.load'].indicativeSpread;
    const lo = round(raw * (1 - spread));
    const hi = round(raw * (1 + spread));
    reasons.push(strengthReasons.emit('DOSE.LOAD.RPE_BASED_LOW_CONFIDENCE', { exerciseId: e.id }));
    const indicative = lo !== undefined && hi !== undefined && lo <= hi ? { indicativeKg: { min: lo, max: hi } } : {};
    return { intensity: { mode: 'effort', effort, ...indicative }, source: 'history', knowledge: 'effort', reasons, capped: false };
  }
  // Aucune référence fiable : calibration (valeurs G2 : cible d'effort et nombre de séries, voir dose).
  reasons.push(strengthReasons.emit('DOSE.LOAD.CALIBRATION', { exerciseId: e.id }));
  // Poids du corps lestable sans référence : au poids du corps, à l'effort (aucun lest inventé).
  if (e.loadModel === 'bodyweight_plus') return { intensity: { mode: 'bodyweight', effort }, source: 'calibration', knowledge: 'unknown', reasons, capped: false };
  return { intensity: { mode: 'effort', effort }, source: 'calibration', knowledge: 'unknown', reasons, capped: false };
}

/**
 * Observation spécifique récente (fraîche) : série réalisée sur CET exercice à des répétitions et un RIR
 * proches de la cible (tolérances G2). La séance la plus récente qui en contient une fait foi ; en cas
 * d'égalité, la série la plus proche de la cible puis la plus légère (prudence). Aucune extrapolation.
 */
export function specificObservation(e: Exercise, targetReps: number, targetRir: number, env: Env, spec: NonNullable<Env['params']['strength.load.specificObservation']>): { loadKg: number; reps: number; rir: number; at: string } | undefined {
  const p = env.params['strength.load'];
  const exposures = env.input.discipline.recentExposures.filter((x) => x.exerciseId === e.id).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  for (const x of exposures) {
    if (daysBetween(x.at, env.input.context.now) > p.referenceWindowsDays.high) continue;
    const matches = x.sets.flatMap((s) => {
      if (s.loadKg === undefined || s.loadKg <= 0 || (spec.requireRir && s.rir === undefined)) return [];
      const r = s.rir ?? p.assumedRirWhenUnknown;
      const dReps = Math.abs(s.reps - targetReps);
      const dRir = Math.abs(r - targetRir);
      return dReps <= spec.repsTolerance && dRir <= spec.rirTolerance ? [{ loadKg: s.loadKg, reps: s.reps, rir: r, at: x.at, d: dReps + dRir }] : [];
    }).sort((a, b) => a.d - b.d || a.loadKg - b.loadKg);
    const best = matches[0];
    if (best) return { loadKg: best.loadKg, reps: best.reps, rir: best.rir, at: best.at };
  }
  return undefined;
}
