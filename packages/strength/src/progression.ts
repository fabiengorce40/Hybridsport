/**
 * ProgressionEngine — modèles de la musculation (spec strength 05 §12, addendum V1.1 §4–§5).
 * SEULE AUTORITÉ sur le cycle de vie des tracks : création (après exécution réelle d'une ancre
 * candidate ou d'un accessoire suivi), mise à jour, suspension, rotation, clôture. Le StrengthEngine ne
 * l'importe jamais (test d'architecture) : il ne fait qu'appliquer `nextPrescription`.
 *
 * Le modèle est porté par la TRACK (ou par l'exercice sans track), jamais par la séance ni par la série.
 * Une variable dominante progresse à la fois ; la double progression enchaîne reps puis charge, une
 * seule variable par pas. Douleur et pause de sécurité ne sont JAMAIS des échecs de performance.
 */
import type { Exercise, ISODateTime, Level, ReasonCode, RepTarget, SetPrescription } from '@hybridsport/domain';
import type { StrengthTrack } from './context.js';
import type { ProgressionModel, SlotRole, StrengthParams } from './params.js';
import { exerciseClass } from './model.js';
import { strengthReasons } from './codes.js';
import { daysBetween, median, roundDownToStep } from './util.js';

export const EXPOSURE_CLASSES = ['above', 'on_target', 'partial', 'below', 'no_data', 'interrupted', 'pain', 'safety_pause', 'substituted', 'load_deviation'] as const;
export type ExposureClass = (typeof EXPOSURE_CLASSES)[number];

export interface PerformedSet { readonly reps: number; readonly loadKg?: number; readonly rir?: number }

/** Exécution d'un exercice prescrit, telle que rapportée par le feedback (spec strength 06 §19). */
export interface ExecutedItem {
  readonly exerciseId: string;
  readonly prescribed: readonly SetPrescription[];
  /** Séries de TRAVAIL réalisées (montées exclues). Vide si rien n'a été saisi. */
  readonly performed: readonly PerformedSet[];
  readonly sessionCompleted: boolean;
  readonly skipReason?: 'pain' | 'safety_pause' | 'other';
  readonly substitutedFrom?: string;
  /** S5 — statut déclaré de la séance (exécution), pour la preuve : terminée, modifiée ou abandonnée. */
  readonly sessionStatus?: 'completed' | 'modified' | 'abandoned';
}

const targetMin = (r: RepTarget): number => (typeof r === 'number' ? r : r.min);
// technical-constant: jours par semaine (expiration d'un refus d'essai)
const WEEK_DAYS = 7;
// technical-constant: tolérance d'arrondi flottant au pas de charge (baisse bornée, arrondi au pas supérieur)
const ROUND_EPS = 1e-9;
const targetRir = (s: SetPrescription): number | undefined => {
  const i = s.intensity;
  if (i && 'effort' in i && i.effort && 'rir' in i.effort) return i.effort.rir;
  return s.rir;
};

export function classifyExposure(x: ExecutedItem, params: StrengthParams): ExposureClass {
  if (x.skipReason === 'pain') return 'pain';
  if (x.skipReason === 'safety_pause') return 'safety_pause';
  if (x.substitutedFrom !== undefined) return 'substituted';
  const work = x.prescribed.filter((s) => s.kind !== 'rampup' && s.optional !== true);
  if (x.performed.length === 0) return x.sessionCompleted ? 'no_data' : 'interrupted';
  // S3 — une exposition n'est une PREUVE de la prescription que si la charge prescrite a été portée : charge réalisée
  // inférieure à la charge prescrite, ou non saisie alors qu'une charge était prescrite ⇒ exposition non probante
  // (`load_deviation` : maintien, aucun compteur modifié). Aucune valeur ajoutée : comparaison stricte à la prescription.
  const prescribedKg = work.flatMap((s) => (s.intensity?.mode === 'load' ? [s.intensity.kg] : s.intensity?.mode === 'percent_of_reference' ? [s.intensity.kgRounded] : []));
  if (prescribedKg.length > 0 && x.performed.some((s) => s.loadKg === undefined || s.loadKg < Math.min(...prescribedKg))) return 'load_deviation';
  const p = params['strength.progression'];
  const first = work[0];
  if (!first) return 'no_data';
  const reps = targetMin(first.reps);
  const rir = targetRir(first);
  const met = x.performed.filter((s) => s.reps >= reps).length;
  if (!x.sessionCompleted && x.performed.length < work.length) return met === x.performed.length ? 'interrupted' : 'partial';
  const missed = work.length - met;
  const lastRir = x.performed.at(-1)?.rir;
  if (missed > p.partialMaxMissedSets || (rir !== undefined && lastRir !== undefined && lastRir <= rir - p.belowRirMargin)) return 'below';
  if (missed > 0) return 'partial';
  if (rir !== undefined && lastRir !== undefined && lastRir >= rir + p.aboveRirMargin) return 'above';
  return 'on_target';
}

/**
 * Strength S4/S5 — PREUVE d'une exposition : ce qui était prescrit face à ce qui a été réalisé, classée en UN seul
 * endroit (aucune condition dispersée). Contrat, aucune règle de décision : la politique qui transforme la preuve en
 * progression reste celle du modèle de la track (ruleset).
 *
 * Invariant S5 : l'EFFORT est `observed` (RIR réellement saisi, 0 compris) ou `unknown` (aucun RIR saisi) — une
 * absence n'est JAMAIS lue comme RIR 0.
 */
export const EVIDENCE_KINDS = [
  'pain', 'session_abandoned', 'substituted', 'insufficient_data', 'load_lower', 'partial_sets', 'reps_lower', 'effort_harder',
  'load_higher', 'exceeded_reps', 'better_rir', 'exact_effort_known', 'exact_effort_unknown',
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export interface ExposureEvidence {
  readonly exposure: ExposureClass;
  /** Verdict principal (le plus restrictif d'abord) et tous les signaux observés. */
  readonly kind: EvidenceKind;
  readonly signals: readonly string[];
  /** L'exposition prouve-t-elle que la prescription a été au moins réussie ? (sinon `why`). */
  readonly probative: boolean;
  readonly why: string;
  readonly success: 'exact' | 'exceeded' | 'none';
  readonly sets: { readonly prescribed: number; readonly performed: number };
  /** Répétitions : écart entre le minimum réalisé et la cible (borne haute d'une plage), en répétitions. */
  readonly repsDelta: number | null;
  /** Charge : écart entre la charge minimale réalisée et la charge prescrite (kg) ; null sans charge prescrite. */
  readonly loadDeltaKg: number | null;
  /** RIR : écart entre le RIR SAISI (dernière série) et le RIR visé ; null si non saisi ou non prescrit. */
  readonly rirDelta: number | null;
  readonly effort: 'observed' | 'unknown';
  /** Forme historique S4 de `effort` (`reported` = observé). */
  readonly rir: 'reported' | 'not_collected';
}

export function exposureEvidence(x: ExecutedItem, cls: ExposureClass): ExposureEvidence {
  const work = x.prescribed.filter((s) => s.kind !== 'rampup' && s.optional !== true);
  const first = work[0];
  const target = first ? (typeof first.reps === 'number' ? first.reps : first.reps.max) : undefined;
  const repsMin = x.performed.length > 0 ? Math.min(...x.performed.map((s) => s.reps)) : undefined;
  const kgOf = (s: SetPrescription): number | undefined => (s.intensity?.mode === 'load' ? s.intensity.kg : s.intensity?.mode === 'percent_of_reference' ? s.intensity.kgRounded : undefined);
  const prescribedKg = first ? kgOf(first) : undefined;
  const loads = x.performed.flatMap((s) => (s.loadKg !== undefined ? [s.loadKg] : []));
  const loadMin = loads.length === x.performed.length && loads.length > 0 ? Math.min(...loads) : undefined;
  const targetR = first ? targetRir(first) : undefined;
  const lastRir = x.performed.at(-1)?.rir;
  const repsDelta = target !== undefined && repsMin !== undefined ? repsMin - target : null;
  const loadDeltaKg = prescribedKg !== undefined && loadMin !== undefined ? loadMin - prescribedKg : null;
  const rirDelta = targetR !== undefined && lastRir !== undefined ? lastRir - targetR : null;
  const effort = x.performed.some((s) => s.rir !== undefined) ? 'observed' as const : 'unknown' as const;
  const signals = [
    ...(x.sessionStatus === 'modified' ? ['session_modified'] : []), ...(x.sessionStatus === 'abandoned' ? ['session_abandoned'] : []),
    ...(x.performed.length > 0 && x.performed.length < work.length ? ['partial_sets'] : []),
    ...((repsDelta ?? 0) < 0 ? ['reps_lower'] : []), ...((repsDelta ?? 0) > 0 ? ['reps_higher'] : []),
    ...((loadDeltaKg ?? 0) < 0 ? ['load_lower'] : []), ...((loadDeltaKg ?? 0) > 0 ? ['load_higher'] : []),
    ...((rirDelta ?? 0) < 0 ? ['rir_lower'] : []), ...((rirDelta ?? 0) > 0 ? ['rir_higher'] : []),
    `effort_${effort}`,
  ];
  const met = cls === 'on_target' || cls === 'above';
  // Verdict principal : le motif le plus RESTRICTIF l'emporte (douleur, interruption, données, charge, séries…).
  const kind: EvidenceKind = cls === 'pain' || cls === 'safety_pause' ? 'pain'
    : cls === 'interrupted' || x.sessionStatus === 'abandoned' ? 'session_abandoned'
    : cls === 'substituted' ? 'substituted'
    : cls === 'no_data' ? 'insufficient_data'
    : cls === 'load_deviation' ? 'load_lower'
    : cls === 'partial' && x.performed.length < work.length ? 'partial_sets'
    : !met && (repsDelta ?? 0) < 0 ? 'reps_lower'
    : !met ? 'effort_harder'
    : (loadDeltaKg ?? 0) > 0 ? 'load_higher'
    : (repsDelta ?? 0) > 0 ? 'exceeded_reps'
    : (rirDelta ?? 0) > 0 ? 'better_rir'
    : effort === 'observed' ? 'exact_effort_known' : 'exact_effort_unknown';
  const success = !met ? 'none' as const : kind === 'exact_effort_known' || kind === 'exact_effort_unknown' ? 'exact' as const : 'exceeded' as const;
  const why = met ? (effort === 'unknown' ? 'prescription réussie, effort inconnu' : 'prescription réussie, effort observé') : `non probante : ${kind}`;
  return {
    exposure: cls, kind, signals, probative: met, why, success,
    sets: { prescribed: work.length, performed: x.performed.length }, repsDelta, loadDeltaKg, rirDelta,
    effort, rir: effort === 'observed' ? 'reported' : 'not_collected',
  };
}

/**
 * S5 — estimation d'effort d'une exposition SANS RIR inventé :
 * - `observed` : e1RM (médiane) des séries dont le RIR a été SAISI ;
 * - `lowerBound` : borne INFÉRIEURE de l'e1RM des séries sans RIR (RIR ≥ 0 ⇒ e1RM ≥ charge × (1 + reps / diviseur)).
 * La borne n'est jamais une estimation ponctuelle : elle peut seulement relever une estimation qu'elle contredit.
 */
export function effortEstimate(sets: readonly PerformedSet[], params: StrengthParams): { observed?: number; lowerBound?: number } {
  const l = params['strength.load'];
  const valid = (rtf: number) => rtf >= l.validRepRange.min && rtf <= l.validRepRange.max;
  const observed = sets.flatMap((s) => (s.rir !== undefined && s.loadKg !== undefined && s.loadKg > 0 && valid(s.reps + s.rir) ? [s.loadKg * (1 + (s.reps + s.rir) / l.e1rmDivisor)] : []));
  const bounds = sets.flatMap((s) => (s.rir === undefined && s.loadKg !== undefined && s.loadKg > 0 && valid(s.reps) ? [s.loadKg * (1 + s.reps / l.e1rmDivisor)] : []));
  const o = median(observed);
  return { ...(o !== undefined ? { observed: o } : {}), ...(bounds.length > 0 ? { lowerBound: Math.max(...bounds) } : {}) };
}

/**
 * S5 — HISTORIQUE LONGITUDINAL des preuves d'une track : réussites EXACTES consécutives à la même prescription,
 * réparties selon l'effort (observé / inconnu), et nature de l'estimation e1RM. Contrat seulement : aucune politique
 * ne transforme encore une série de réussites exactes en hausse (capacité `exact_success_progression` BLOQUÉE).
 */
export function nextEvidence(before: StrengthTrack, after: StrengthTrack, ev: ExposureEvidence, basis: 'observed' | 'lower_bound' | undefined): StrengthTrack['evidence'] {
  const prev = before.evidence;
  const same = before.nextPrescription?.loadKg === after.nextPrescription?.loadKg && JSON.stringify(before.nextPrescription?.reps) === JSON.stringify(after.nextPrescription?.reps);
  const e1rmBasis = basis ?? prev?.e1rmBasis;
  const base = { ...(e1rmBasis ? { e1rmBasis } : {}) };
  if (ev.success === 'exact' && same) {
    return { ...base, exactStreak: (prev?.exactStreak ?? 0) + 1, effortKnown: (prev?.effortKnown ?? 0) + (ev.effort === 'observed' ? 1 : 0), effortUnknown: (prev?.effortUnknown ?? 0) + (ev.effort === 'unknown' ? 1 : 0) };
  }
  if (!prev && !basis) return undefined;
  return { ...base, exactStreak: 0, effortKnown: 0, effortUnknown: 0 };
}

export interface TrackUpdate {
  readonly track: StrengthTrack;
  readonly reasons: readonly ReasonCode[];
  /** Stagnation persistante : le ProgressionEngine décide une rotation à la prochaine frontière. */
  readonly rotate: boolean;
}

/** Pas de charge réalisable pour l'exercice (incrément × nombre d'incréments du ruleset). */
function stepFor(e: Exercise, params: StrengthParams, declaredStepKg?: number): number | undefined {
  const inc = declaredStepKg ?? (e.loadModel ? params['strength.load.defaultIncrements'][e.loadModel] : undefined);
  return inc === undefined ? undefined : inc * params['strength.progression'].loadStepIncrements;
}


/**
 * RIR prévisible pour `reps` répétitions à une charge, d'après la meilleure série MESURÉE de la séance
 * (formule du ruleset, sans borne de validité : sert à refuser un saut de charge, jamais à fixer une référence).
 */
function predictedRirAt(sets: readonly PerformedSet[], kg: number, reps: number, params: StrengthParams): number | undefined {
  const l = params['strength.load'];
  const e1rms = sets.flatMap((s) => (s.loadKg !== undefined && s.loadKg > 0 ? [s.loadKg * (1 + (s.reps + (s.rir ?? l.assumedRirWhenUnknown)) / l.e1rmDivisor)] : []));
  if (e1rms.length === 0) return undefined;
  return l.e1rmDivisor * (Math.max(...e1rms) / kg - 1) - reps;
}

/**
 * Mise à jour d'une track après exécution. Variable progressée selon le modèle de la TRACK.
 * `phaseKind = deload` : aucune hausse. Douleur / pause : track suspendue, rien ne baisse.
 */
/**
 * RC5.3 R4 — options de lecture d'une exposition. `modified` : la prescription de l'exercice a été MODIFIÉE (interférence,
 * état du jour, temps, adaptation au démarrage) ; l'appelant classe alors l'exposition contre le RIR de RÉFÉRENCE (RIR
 * de base + modificateurs durables), jamais contre le RIR relevé. Sans effet si le contenu ne déclare pas la politique
 * `strength.progression.policy.modifiedExposure` (sémantique antérieure, reproductible).
 */
export interface TrackUpdateOptions {
  readonly modified?: boolean;
  /** RC5.3 R2 — niveau de l'athlète (réussite exacte) et instant de l'exposition (refus d'un essai). */
  readonly level?: Level;
  readonly at?: ISODateTime;
}

export function updateTrack(track: StrengthTrack, x: ExecutedItem, cls: ExposureClass, e: Exercise, params: StrengthParams, phaseKind: string, declaredStepKg?: number, o: TrackUpdateOptions = {}): TrackUpdate {
  const soft = o.modified === true && params['strength.progression.policy']?.modifiedExposure?.mode === 'soft';
  const probes = params['strength.progression.policy']?.probes;
  // RC5.3 R2.2 — essai en cours : annulé par une exposition probante en dessous / partielle, confirmé par une réussite.
  // Exposition modifiée, décharge, données absentes… : l'essai reste en attente (ni validé, ni annulé).
  const probing = probes !== undefined && track.probe !== undefined && !soft && phaseKind !== 'deload';
  if (probing && (cls === 'below' || cls === 'partial')) return withEvidence(track, revertProbe(track, o.at), x, cls, params);
  const t0: StrengthTrack = probing && (cls === 'on_target' || cls === 'above') ? withoutProbe(track) : track;
  const u0 = soft ? updateModifiedTrack(t0, x, cls, e, params, phaseKind, declaredStepKg) : updateTrackModel(t0, x, cls, e, params, phaseKind, declaredStepKg);
  const u = soft || phaseKind === 'deload' ? u0 : probeDecisions(t0, u0, e, params, declaredStepKg, o);
  // S5 — historique longitudinal des preuves (douleur / pause : inchangé, ce n'est ni une réussite ni un échec).
  if (cls === 'pain' || cls === 'safety_pause') return u;
  // RC5.3 R4 — exposition modifiée : l'historique n'est enrichi que d'une preuve EXPLOITABLE (réussite, effort observé).
  if (soft && (cls === 'above' || cls === 'on_target' || cls === 'below' || cls === 'partial') && phaseKind !== 'deload' && !(u.track.consecutiveSuccess > track.consecutiveSuccess)) return u;
  return withEvidence(track, u, x, cls, params);
}

/** S5 — historique longitudinal des preuves après une mise à jour (douleur / pause exclues par l'appelant). */
function withEvidence(track: StrengthTrack, u: TrackUpdate, x: ExecutedItem, cls: ExposureClass, params: StrengthParams): TrackUpdate {
  const basis = track.model === 'autoregulated' ? autoregulatedBasis(x.performed, params, track.e1rmKg, u.track.e1rmKg) : undefined;
  const evidence = nextEvidence(track, u.track, exposureEvidence(x, cls), basis);
  if (evidence === undefined) return u;
  return { ...u, track: { ...u.track, evidence } };
}

const withoutProbe = (t: StrengthTrack): StrengthTrack => { const { probe: _p, ...rest } = t; return rest; };

/**
 * RC5.3 R2.2 — essai ANNULÉ : retour à la prescription d'avant l'essai (charge et répétitions, la dernière réussie),
 * maintien compté, niveau refusé mémorisé (R2.3). Aucune baisse au-delà de la prescription d'avant l'essai : une vraie
 * baisse de performance reste détectée par les règles communes, sur plusieurs expositions en dessous À cette prescription.
 */
function revertProbe(track: StrengthTrack, at: ISODateTime | undefined): TrackUpdate {
  const pr = track.probe;
  const next = track.nextPrescription;
  if (!pr || !next) return { track, reasons: [], rotate: false };
  const refusedKg = pr.kind === 'load' ? next.loadKg : undefined;
  const refusedReps = pr.kind === 'reps' ? targetMin(next.reps) : undefined;
  const refused = at === undefined ? {} : { probeRefused: { ...(refusedKg !== undefined ? { kg: refusedKg } : {}), ...(refusedReps !== undefined ? { reps: refusedReps } : {}), at } };
  const reverted: StrengthTrack = { ...withoutProbe(track), ...refused, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: track.consecutiveHolds + 1, nextPrescription: { ...next, reps: pr.fromReps, ...(pr.fromKg !== undefined ? { loadKg: pr.fromKg } : {}) } };
  return { track: reverted, reasons: [strengthReasons.emit('PROGRESSION.PROBE_REVERTED', { trackId: track.trackId, variable: pr.kind })], rotate: false };
}

/**
 * RC5.3 R2 — décisions de la politique d'essais, appliquées APRÈS le modèle de la track (inchangé) :
 * - R2.1 réussite exacte répétée d'un principal autorégulé ⇒ un pas de charge (seuil par niveau) ;
 * - R2.3 hausse vers un niveau refusé (refus encore valable) ⇒ maintien `probe_refused` ;
 * - R2.2 toute hausse retenue (charge ; répétitions si la politique le prévoit) ⇒ essai en cours.
 */
function probeDecisions(before: StrengthTrack, u: TrackUpdate, e: Exercise, params: StrengthParams, declaredStepKg: number | undefined, o: TrackUpdateOptions): TrackUpdate {
  const pol = params['strength.progression.policy'];
  const next = before.nextPrescription;
  if (!next) return u;
  let out = u;
  const step = stepFor(e, params, declaredStepKg);
  // R2.1 — réussite exacte (décision antérieurement BLOQUÉE) : un pas après la série de réussites exactes du niveau.
  const blocked = u.reasons.find((r) => r.code === 'PROGRESSION.DECISION_BLOCKED' && r.params.capability === 'exact_success_progression');
  const needed = o.level !== undefined ? pol?.exactSuccess?.streak[o.level] : undefined;
  if (blocked && needed !== undefined && pol?.exactSuccess && step !== undefined && next.loadKg !== undefined) {
    const streak = Number(blocked.params.exactStreak);
    const unknown = blocked.params.situation === 'exact_success_effort_unknown';
    if (streak >= needed + (unknown ? pol.exactSuccess.unknownEffortExtra : 0)) {
      const kg = next.loadKg + step;
      const cap = before.cycleStartLoadKg !== undefined ? Math.max(before.cycleStartLoadKg * (1 + params['strength.progression'].cycleCapFraction), before.cycleStartLoadKg + step) : undefined;
      out = cap !== undefined && kg > cap
        ? { ...u, reasons: [...u.reasons, strengthReasons.emit('PROGRESSION.CAP_REACHED', { trackId: before.trackId })] }
        : { ...u, track: { ...u.track, nextPrescription: { ...next, loadKg: kg } }, reasons: [strengthReasons.emit('PROGRESSION.ADVANCED', { trackId: before.trackId, variable: 'load', cause: 'exact_success', exactStreak: streak })] };
    }
  }
  const probes = pol?.probes;
  if (!probes) return out;
  const after = out.track.nextPrescription;
  const loadUp = after?.loadKg !== undefined && next.loadKg !== undefined && after.loadKg > next.loadKg;
  const repsUp = probes.reps && after !== undefined && after.loadKg === next.loadKg && targetMin(after.reps) > targetMin(next.reps);
  if (!loadUp && !repsUp) return out;
  // R2.3 — niveau refusé par un essai annulé, refus encore valable : maintien (ni hausse, ni compteur d'échec).
  const refusal = before.probeRefused;
  const valid = refusal !== undefined && (o.at === undefined || daysBetween(refusal.at, o.at) < probes.refusalMaxWeeks * WEEK_DAYS);
  const refusedNow = valid && ((loadUp && refusal.kg !== undefined && (after?.loadKg ?? 0) >= refusal.kg) || (repsUp && refusal.reps !== undefined && after !== undefined && targetMin(after.reps) >= refusal.reps));
  if (refusedNow) return { track: { ...before, consecutiveSuccess: 0, consecutiveBelow: 0 }, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: before.trackId, cause: 'probe_refused' })], rotate: false };
  const { probeRefused: _r, ...expired } = out.track;
  const track = valid ? out.track : expired;
  return { ...out, track: { ...track, probe: { kind: loadUp ? 'load' : 'reps', ...(next.loadKg !== undefined ? { fromKg: next.loadKg } : {}), fromReps: next.reps } } };
}

/** Nature de l'estimation après mise à jour : observée si un RIR a été saisi ; borne seulement si la borne l'a RELEVÉE. */
const autoregulatedBasis = (sets: readonly PerformedSet[], params: StrengthParams, before: number | undefined, after: number | undefined): 'observed' | 'lower_bound' | undefined => {
  const est = effortEstimate(sets, params);
  if (est.observed !== undefined) return 'observed';
  return est.lowerBound !== undefined && after === est.lowerBound && (before === undefined || est.lowerBound > before) ? 'lower_bound' : undefined;
};

/**
 * RC5.3 R4 (variante souple) — exposition à prescription modifiée : jamais une régression du seul fait de la
 * modification, jamais une hausse ni un essai validé décidés sur elle seule.
 * - réussite (au-dessus / dans la cible) avec effort OBSERVÉ : signal de capacité — une réussite comptée, estimation
 *   (e1RM) mise à jour par la médiane du ruleset ; charge et répétitions inchangées ;
 * - réussite sans effort saisi : maintien, aucun compteur (signal inexploitable) ;
 * - en dessous / partielle : maintien tracé `below_modified`, aucun compteur (signal visible pour la récupération) ;
 * - douleur, pause, substitution, données absentes, interruption, charge non portée, décharge : règles communes.
 */
function updateModifiedTrack(track: StrengthTrack, x: ExecutedItem, cls: ExposureClass, e: Exercise, params: StrengthParams, phaseKind: string, declaredStepKg?: number): TrackUpdate {
  if (phaseKind === 'deload' || (cls !== 'above' && cls !== 'on_target' && cls !== 'below' && cls !== 'partial')) return updateTrackModel(track, x, cls, e, params, phaseKind, declaredStepKg);
  const resumed: StrengthTrack = track.status === 'suspended' ? { ...track, status: 'active' } : track;
  const held = (cause: string, t: StrengthTrack = resumed): TrackUpdate => ({ track: t, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause })], rotate: false });
  if (cls === 'below' || cls === 'partial') return held('below_modified');
  const est = effortEstimate(x.performed, params);
  if (est.observed === undefined) return held('modified_prescription');
  const e1rm = track.model === 'autoregulated' ? (track.e1rmKg === undefined ? est.observed : median([track.e1rmKg, est.observed])) : undefined;
  return held('modified_prescription', { ...resumed, consecutiveSuccess: resumed.consecutiveSuccess + 1, consecutiveBelow: 0, ...(e1rm !== undefined ? { e1rmKg: e1rm } : {}) });
}

function updateTrackModel(track: StrengthTrack, x: ExecutedItem, cls: ExposureClass, e: Exercise, params: StrengthParams, phaseKind: string, declaredStepKg?: number): TrackUpdate {
  const p = params['strength.progression'];
  const reasons: ReasonCode[] = [];
  const next = track.nextPrescription;
  if (cls === 'pain' || cls === 'safety_pause') {
    reasons.push(strengthReasons.emit('PROGRESSION.SUSPENDED', { trackId: track.trackId, cause: cls }));
    return { track: { ...track, status: 'suspended' }, reasons, rotate: false };
  }
  const resumed: StrengthTrack = track.status === 'suspended' ? { ...track, status: 'active' } : track;
  if (cls === 'substituted' || cls === 'no_data' || cls === 'interrupted' || cls === 'load_deviation' || phaseKind === 'deload') {
    reasons.push(strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: phaseKind === 'deload' ? 'deload' : cls }));
    return { track: resumed, reasons, rotate: false };
  }
  if (cls === 'partial') {
    const holds = resumed.consecutiveHolds + 1;
    reasons.push(strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'partial' }));
    return { track: { ...resumed, consecutiveHolds: holds, consecutiveSuccess: 0, consecutiveBelow: 0 }, reasons, rotate: holds >= p.stagnationHolds };
  }
  const step = stepFor(e, params, declaredStepKg);
  if (cls === 'below') {
    const below = resumed.consecutiveBelow + 1;
    if (below >= p.regressAfterBelow && next?.loadKg !== undefined && step !== undefined) {
      const kg = Math.max(step, roundDownToStep(next.loadKg * (1 - p.regressionFraction), step));
      reasons.push(strengthReasons.emit('PROGRESSION.REGRESSED', { trackId: track.trackId }));
      return { track: { ...resumed, consecutiveBelow: 0, consecutiveSuccess: 0, consecutiveHolds: resumed.consecutiveHolds + 1, nextPrescription: { ...next, loadKg: kg } }, reasons, rotate: resumed.consecutiveHolds + 1 >= p.stagnationHolds };
    }
    reasons.push(strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'below' }));
    return { track: { ...resumed, consecutiveBelow: below, consecutiveSuccess: 0, consecutiveHolds: resumed.consecutiveHolds + 1 }, reasons, rotate: resumed.consecutiveHolds + 1 >= p.stagnationHolds };
  }
  // Succès (above / on_target) : progression seulement sur preuves répétées.
  const success = resumed.consecutiveSuccess + 1;
  if (success < p.evidenceRequired[track.model] || !next) {
    return { track: { ...resumed, consecutiveSuccess: success, consecutiveBelow: 0 }, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'evidence' })], rotate: false };
  }
  const base: StrengthTrack = { ...resumed, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0 };
  // Plafond de gain par cycle, jamais inférieur à UN pas réalisable (sinon une charge légère ne progresserait jamais).
  const cap = track.cycleStartLoadKg !== undefined ? Math.max(track.cycleStartLoadKg * (1 + p.cycleCapFraction), track.cycleStartLoadKg + (step ?? 0)) : undefined;
  const capped = (kg: number) => cap !== undefined && kg > cap;
  switch (track.model) {
    case 'linear_load':
    case 'autoregulated': {
      if (next.loadKg === undefined || step === undefined) return { track: base, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'no_load' })], rotate: false };
      let kg = next.loadKg + step;
      let e1rm = track.e1rmKg;
      if (track.model === 'autoregulated') {
        // S5 — effort OBSERVÉ (RIR saisi) : estimation lissée (médiane avec l'estimation de la track, ruleset).
        // Effort INCONNU : seule une borne inférieure est connue ; elle relève l'estimation qu'elle contredit et ne
        // l'abaisse jamais (avant S5 : RIR 0 supposé, médiane ⇒ l'estimation était tirée vers le bas).
        const est = effortEstimate(x.performed, params);
        if (est.observed !== undefined) e1rm = e1rm === undefined ? est.observed : median([e1rm, est.observed]);
        if (est.lowerBound !== undefined && (e1rm === undefined || est.lowerBound > e1rm)) e1rm = est.lowerBound;
        const reps = targetMin(next.reps);
        const rtf = String(Math.round(reps + (next.rir ?? 0)));
        const pct = params['strength.load'].pctByRepsToFailure[rtf];
        if (e1rm !== undefined && pct !== undefined) kg = Math.max(next.loadKg, Math.min(next.loadKg + step, roundDownToStep(e1rm * pct, step)));
      }
      if (capped(kg)) return { track: base, reasons: [strengthReasons.emit('PROGRESSION.CAP_REACHED', { trackId: track.trackId })], rotate: false };
      if (kg === next.loadKg) {
        // S4 — réussite EXACTE (aucune marge mesurée) : l'estimation reproduit la charge prescrite ; aucune règle
        // gouvernée ne transforme une réussite exacte en hausse ⇒ décision tracée comme BLOQUÉE, jamais inventée.
        const ev = exposureEvidence(x, cls);
        const streak = (track.evidence?.exactStreak ?? 0) + 1;
        const blocked = ev.success === 'exact' ? [strengthReasons.emit('PROGRESSION.DECISION_BLOCKED', { trackId: track.trackId, model: track.model, situation: ev.effort === 'observed' ? 'exact_success' : 'exact_success_effort_unknown', capability: 'exact_success_progression', rir: ev.rir, exactStreak: streak })] : [];
        return { track: { ...base, ...(e1rm !== undefined ? { e1rmKg: e1rm } : {}) }, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'estimate' }), ...blocked], rotate: false };
      }
      return { track: { ...base, ...(e1rm !== undefined ? { e1rmKg: e1rm } : {}), nextPrescription: { ...next, loadKg: kg } }, reasons: [strengthReasons.emit('PROGRESSION.ADVANCED', { trackId: track.trackId, variable: 'load' })], rotate: false };
    }
    case 'double_progression': {
      const range = track.repRange ?? (typeof next.reps === 'number' ? { min: next.reps, max: next.reps } : next.reps);
      const current = targetMin(next.reps);
      if (current < range.max) {
        return { track: { ...base, nextPrescription: { ...next, reps: { min: current + 1, max: range.max } } }, reasons: [strengthReasons.emit('PROGRESSION.ADVANCED', { trackId: track.trackId, variable: 'reps' })], rotate: false };
      }
      if (next.loadKg === undefined || step === undefined) {
        // S4 — poids du corps en haut de plage : progression POSSIBLE mais méthode non gouvernée (lest, variante plus
        // difficile, nouvelle plage, maintien). Les méthodes listées sont celles que le catalogue rend possibles.
        if (next.loadKg === undefined && (e.loadModel === 'bodyweight_plus' || e.loadModel === undefined)) {
          const methods = [...(e.loadModel === 'bodyweight_plus' ? ['added_load'] : []), ...(e.progressionFamily ? ['harder_variant'] : []), 'new_rep_range', 'hold'];
          // S5 — l'effort observé distingue « haut de plage avec réserve » de « haut de plage à la cible » ; inconnu sinon.
          const ev = exposureEvidence(x, cls);
          const effort = ev.effort === 'unknown' ? 'unknown' : (ev.rirDelta ?? 0) > 0 ? 'reserve_above_target' : 'at_target';
          return { track: base, reasons: [strengthReasons.emit('PROGRESSION.METHOD_UNGOVERNED', { trackId: track.trackId, exerciseId: e.id, repsReached: range.max, methods, capability: 'bodyweight_overload_method', effort })], rotate: false };
        }
        return { track: base, reasons: [strengthReasons.emit('PROGRESSION.CAP_REACHED', { trackId: track.trackId })], rotate: false };
      }
      const kg = next.loadKg + step;
      if (capped(kg)) return { track: base, reasons: [strengthReasons.emit('PROGRESSION.CAP_REACHED', { trackId: track.trackId })], rotate: false };
      // Granularité du matériel : un saut de charge que la séance MESURÉE classerait d'avance « en dessous »
      // (RIR prévu au bas de la plage ≤ RIR visé − marge ; ex. 4 → 6 kg = +50 %) est refusé : charge maintenue,
      // stagnation comptée (rotation d'exercice à terme). Un pas ordinaire (30 → 32 kg) passe.
      const predictedRir = predictedRirAt(x.performed, kg, range.min, params);
      if (predictedRir !== undefined && predictedRir <= (next.rir ?? 0) - p.belowRirMargin) {
        const holds = resumed.consecutiveHolds + 1;
        // S5 — sans RIR saisi, la prédiction n'est qu'une BORNE (prudence inchangée), et la cause le dit.
        const cause = x.performed.some((z) => z.rir !== undefined) ? 'granularity' : 'granularity_effort_unknown';
        return { track: { ...resumed, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: holds }, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause })], rotate: holds >= p.stagnationHolds };
      }
      return { track: { ...base, nextPrescription: { ...next, loadKg: kg, reps: { min: range.min, max: range.max } } }, reasons: [strengthReasons.emit('PROGRESSION.ADVANCED', { trackId: track.trackId, variable: 'load' })], rotate: false };
    }
    case 'set_progression':
      // PM4 agit sur le volume hebdomadaire (allocation), jamais comme modèle de track.
      return { track: base, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'volume_model' })], rotate: false };
  }
}

/**
 * RC5.3 R3 — capacité OBSERVÉE d'un exercice sur le cycle écoulé : médiane des e1RM des expositions dont l'effort a été
 * saisi et reste dans le domaine de validité de l'estimation (aucun RIR supposé). `exposures` : nombre de ces preuves.
 */
export function cycleCapacity(exposures: readonly { readonly sets: readonly PerformedSet[] }[], params: StrengthParams): { readonly e1rmKg?: number; readonly exposures: number } {
  const l = params['strength.load'];
  // Série à effort saisi au-delà de la plage valide (répétitions + RIR > max) : preuve CENSURÉE — la capacité vaut AU
  // MOINS celle de la borne haute de la plage (estimation prudente, jamais extrapolée au-delà).
  const perSet = (s: PerformedSet) => (s.rir !== undefined && s.loadKg !== undefined && s.loadKg > 0 && s.reps + s.rir >= l.validRepRange.min ? [s.loadKg * (1 + Math.min(s.reps + s.rir, l.validRepRange.max) / l.e1rmDivisor)] : []);
  const obs = exposures.flatMap((x) => { const v = median(x.sets.flatMap(perSet)); return v === undefined ? [] : [v]; });
  return obs.length === 0 ? { exposures: 0 } : { e1rmKg: median(obs), exposures: obs.length };
}

/**
 * RC5.3 R3 — NOUVEAU MÉSOCYCLE pour une track (une seule fois par cycle) : plafond de gain et refus d'essai remis à zéro ;
 * principal chargé (linéaire ou autorégulé) RÉÉVALUÉ sur preuve — capacité observée du cycle écoulé :
 * - preuve insuffisante (moins de `minEvidence` expositions à effort exploitable) : progression « non évaluable »,
 *   charge conservée, état explicite et tracé (jamais une hausse inventée, jamais une stagnation silencieuse) ;
 * - charge trop lourde (idéale < charge − 1 pas) : baisse vers l'idéale, au plus `maxDownFraction` ;
 * - charge trop légère (idéale ≥ charge + `lightThresholdSteps` pas) : hausse d'au plus `maxUpSteps` pas ;
 * - sinon : charge conservée.
 * Sans la politique `mesocycle` : track inchangée.
 */
export function startTrackCycle(track: StrengthTrack, o: { readonly cycle: number; readonly at: ISODateTime; readonly capacity: { readonly e1rmKg?: number; readonly exposures: number } }, e: Exercise, params: StrengthParams, declaredStepKg?: number): { track: StrengthTrack; reasons: readonly ReasonCode[] } {
  const pol = params['strength.progression.policy']?.mesocycle;
  if (!pol || track.status === 'closed' || track.cycleIndex === o.cycle) return { track, reasons: [] };
  const { probeRefused: _r, evaluation: _e, ...rest } = track;
  const next = track.nextPrescription;
  const reasons: ReasonCode[] = [strengthReasons.emit('PROGRESSION.CYCLE_STARTED', { trackId: track.trackId, cycle: o.cycle })];
  const step = stepFor(e, params, declaredStepKg);
  const main = track.model === 'autoregulated' || track.model === 'linear_load';
  if (!main || !next || next.loadKg === undefined || step === undefined) {
    return { track: { ...rest, cycleIndex: o.cycle, ...(next?.loadKg !== undefined ? { cycleStartLoadKg: next.loadKg } : {}) }, reasons };
  }
  const r = pol.reevaluation;
  const kg0 = next.loadKg;
  if (o.capacity.e1rmKg === undefined || o.capacity.exposures < r.minEvidence) {
    reasons.push(strengthReasons.emit('PROGRESSION.NOT_EVALUABLE', { trackId: track.trackId, cause: 'insufficient_effort_data', exposures: o.capacity.exposures }));
    return { track: { ...rest, cycleIndex: o.cycle, cycleStartLoadKg: kg0, evaluation: { status: 'not_evaluable', cause: 'insufficient_effort_data', at: o.at } }, reasons };
  }
  const pct = params['strength.load'].pctByRepsToFailure[String(Math.round(targetMin(next.reps) + (next.rir ?? 0)))];
  const ideal = pct === undefined ? undefined : Math.max(step, roundDownToStep(o.capacity.e1rmKg * pct, step));
  let kg = kg0;
  let cause: string | undefined;
  if (ideal !== undefined && ideal < kg0 - step) { kg = Math.max(ideal, Math.ceil(kg0 * (1 - r.maxDownFraction) / step - ROUND_EPS) * step); cause = 'too_heavy'; }
  else if (ideal !== undefined && ideal >= kg0 + r.lightThresholdSteps * step) { kg = Math.min(ideal, kg0 + r.maxUpSteps * step); cause = 'too_light'; }
  if (cause !== undefined && kg !== kg0) reasons.push(strengthReasons.emit('PROGRESSION.REEVALUATED', { trackId: track.trackId, fromKg: kg0, toKg: kg, cause, e1rmKg: o.capacity.e1rmKg, exposures: o.capacity.exposures }));
  const changed = kg !== kg0;
  const { probe: _p, ...base } = rest;
  const t: StrengthTrack = changed ? { ...base, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, nextPrescription: { ...next, loadKg: kg } } : rest;
  return { track: { ...t, cycleIndex: o.cycle, cycleStartLoadKg: kg }, reasons };
}

/** Création d'une track après exécution réelle d'un item `candidate` (ancre) ou d'un accessoire suivi. */
export function createTrack(input: {
  readonly tier: 'anchor' | 'tracked'; readonly archetypeId: string; readonly slotId: string; readonly exercise: Exercise;
  readonly model: ProgressionModel; readonly prescribed: readonly SetPrescription[]; readonly performed: readonly PerformedSet[]; readonly at: ISODateTime;
  /** Stimulus et rôle de l'emplacement : le RIR de référence de la track est celui du PROFIL DE BASE, sans modificateur. */
  readonly stimulus: string; readonly role: SlotRole;
}, params: StrengthParams): { track: StrengthTrack; reasons: readonly ReasonCode[] } {
  const work = input.prescribed.filter((s) => s.kind !== 'rampup' && s.optional !== true);
  const first = work[0];
  const reps: RepTarget = first?.reps ?? 1;
  const lastLoad = [...input.performed].reverse().find((s) => s.loadKg !== undefined && s.loadKg > 0)?.loadKg;
  // S5 — e1RM initial : observé (RIR saisi) sinon borne inférieure (sans RIR) ; sa nature est mémorisée.
  const est = effortEstimate(input.performed, params);
  const e1rm = est.observed ?? est.lowerBound;
  const basis = est.observed !== undefined ? 'observed' as const : est.lowerBound !== undefined ? 'lower_bound' as const : undefined;
  // RIR de référence = profil de base (jamais le RIR de calibration ni un RIR modifié par le niveau / la phase).
  const profile = params['strength.stimuli'][input.stimulus]?.doseProfile;
  const cell = profile === undefined ? undefined : params['strength.dose.base'][profile]?.[input.role]?.[exerciseClass(input.exercise, params)];
  const rir = cell?.rir ?? (first ? targetRir(first) : undefined);
  // Double progression sur une prescription à reps FIXES (ex. modèle choisi pour pas grossier) : la plage est
  // celle du profil, sinon la progression en reps serait dégénérée (plage 6–6, simulation 4B).
  const dpRange = input.model === 'double_progression' && typeof reps === 'number' && cell ? { min: Math.min(reps, cell.reps.max), max: cell.reps.max } : undefined;
  // technical-constant: longueur de la date ISO AAAA-MM-JJ
  const trackId = `track.${input.archetypeId}.${input.slotId}.${input.exercise.id}.${input.at.slice(0, 10)}`;
  const track: StrengthTrack = {
    trackId, tier: input.tier, exerciseId: input.exercise.id, archetypeId: input.archetypeId, slotId: input.slotId, model: input.model,
    status: 'active', openedAt: input.at, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0,
    ...(dpRange ? { repRange: dpRange } : typeof reps !== 'number' ? { repRange: reps } : {}),
    ...(lastLoad !== undefined ? { cycleStartLoadKg: lastLoad } : {}),
    ...(e1rm !== undefined ? { e1rmKg: e1rm } : {}),
    nextPrescription: { sets: Math.max(1, work.length), reps: dpRange ?? reps, ...(lastLoad !== undefined ? { loadKg: lastLoad } : {}), ...(rir !== undefined ? { rir } : {}) },
    ...(basis ? { evidence: { exactStreak: 0, effortKnown: 0, effortUnknown: 0, e1rmBasis: basis } } : {}),
  };
  return { track, reasons: [strengthReasons.emit('PROGRESSION.TRACK_CREATED', { trackId, tier: input.tier, exerciseId: input.exercise.id })] };
}

/**
 * Reprise d'une track SUSPENDUE (douleur, pause de sécurité) : décidée par le ProgressionEngine à une
 * frontière de semaine, quand l'état de douleur du CORE ne la concerne plus. La prescription reprend là où
 * elle s'était arrêtée (jamais une baisse : la suspension n'est pas un échec). Sans cette reprise, le
 * moteur ne l'appliquerait plus jamais (il n'applique que les tracks actives).
 */
export function resumeTrack(track: StrengthTrack, painCleared: boolean): { track: StrengthTrack; reasons: readonly ReasonCode[] } {
  if (track.status !== 'suspended' || !painCleared) return { track, reasons: [] };
  return { track: { ...track, status: 'active' }, reasons: [strengthReasons.emit('PROGRESSION.RESUMED', { trackId: track.trackId })] };
}

/**
 * Début d'un nouveau cycle (frontière de mésocycle) pour une track qui continue : la référence du plafond
 * de gain par cycle devient la charge courante. Sans cela, une ancre conservée d'un mésocycle à l'autre
 * resterait bloquée au plafond du PREMIER cycle.
 */
export function startCycle(track: StrengthTrack): { track: StrengthTrack; reasons: readonly ReasonCode[] } {
  const kg = track.nextPrescription?.loadKg;
  if (track.status !== 'active' || kg === undefined) return { track, reasons: [] };
  return { track: { ...track, cycleStartLoadKg: kg }, reasons: [strengthReasons.emit('PROGRESSION.CYCLE_STARTED', { trackId: track.trackId })] };
}

/** Rotation / clôture (frontière de semaine) : fin de mésocycle, durée maximale, stagnation, inadmissibilité durable. */
export function closureCause(track: StrengthTrack, o: { readonly now: string; readonly mesocycleEnded: boolean; readonly stagnant: boolean; readonly inadmissible: boolean; readonly level: keyof StrengthParams['strength.tracks']['anchorMaxWeeks'] }, params: StrengthParams): string | undefined {
  if (track.status === 'closed') return undefined;
  const t = params['strength.tracks'];
  // technical-constant: jours par semaine (conversion d'unités)
  const DAYS_PER_WEEK = 7;
  if (o.inadmissible) return 'inadmissible';
  if (o.stagnant) return 'stagnation';
  // Ruleset scientifique V1 : la durée n'est qu'un HORIZON DE REVUE (voir `anchorReviewDue`), jamais une cause
  // de clôture à elle seule ; une ancre ne change que pour une raison traçable.
  const horizon = params['strength.tracks.horizon']?.policy ?? 'close';
  if (horizon === 'close' && daysBetween(track.openedAt, o.now) > t.anchorMaxWeeks[o.level] * DAYS_PER_WEEK) return 'max_weeks';
  // Rotation en fin de mésocycle selon le niveau (un débutant garde ses ancres pour la progression linéaire).
  if (o.mesocycleEnded && t.rotateAtMesocycleEnd[o.level]) return 'mesocycle_end';
  return undefined;
}

/**
 * Horizon de revue d'une ancre (ruleset scientifique V1, politique `review`) : au-delà de `anchorMaxWeeks`,
 * le ProgressionEngine signale une revue (PROGRESSION.REVIEW_DUE) ; la track reste active tant qu'aucune
 * cause traçable (stagnation, inadmissibilité, fin de mésocycle déclarée) ne la clôt.
 */
export function anchorReviewDue(track: StrengthTrack, o: { readonly now: string; readonly level: keyof StrengthParams['strength.tracks']['anchorMaxWeeks'] }, params: StrengthParams): { due: boolean; reasons: readonly ReasonCode[] } {
  // technical-constant: jours par semaine (conversion d'unités)
  const DAYS_PER_WEEK = 7;
  if (track.status !== 'active' || params['strength.tracks.horizon']?.policy !== 'review') return { due: false, reasons: [] };
  const weeks = params['strength.tracks'].anchorMaxWeeks[o.level];
  if (daysBetween(track.openedAt, o.now) <= weeks * DAYS_PER_WEEK) return { due: false, reasons: [] };
  return { due: true, reasons: [strengthReasons.emit('PROGRESSION.REVIEW_DUE', { trackId: track.trackId, weeks })] };
}

export function closeTrack(track: StrengthTrack, cause: string): { track: StrengthTrack; reasons: readonly ReasonCode[] } {
  return { track: { ...track, status: 'closed' }, reasons: [strengthReasons.emit('PROGRESSION.TRACK_CLOSED', { trackId: track.trackId, cause })] };
}
