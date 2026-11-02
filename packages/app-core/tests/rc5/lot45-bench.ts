/**
 * Reprise RC5 lot 4.5 — BANC DE VALIDATION (TEST_ONLY), suite du banc 4.4 (mêmes 20 profils, mêmes scénarios d'athlète,
 * plus « RIR déclaré imprécis » et « changement de programme ») :
 * - B : politiques de progression CANDIDATES sur le moteur de progression RÉEL (référence RIR corrigée au lot 4.5) :
 *   exclusion des séances allégées (R4), évaluation contre la référence durable, fatigue persistante (variante 6),
 *   estimation conservatrice hors plage, suspension faute d'estimation fiable, plages de validité candidates 10 / 15 / 20 ;
 * - C / D : B1, B1 + réévaluation des isolations, B1 + Q4 (contre-exemple) ; redistribution et ses variantes.
 * Rien n'est activé : options de simulation seulement. Comparaison de règles, aucune conclusion physiologique.
 */
import { readStrengthParams } from '@hybridsport/strength';
import { strengthContent, updateStrengthPersonalization } from '../../src/index.js';
import type { ProfileInput, ProgressionReadingOption, StrengthPersonalization } from '../../src/index.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { lot41Athlete } from './lot41-bench.js';
import { lot43Specs } from './lot43-bench.js';
import type { Lot43Variant } from './lot43-bench.js';
import { LOT44_VARIANTS, measureLot44, r4Scenarios } from './lot44-bench.js';
import type { Lot44Measure } from './lot44-bench.js';
import { P1 } from './lot4-profiles.js';

// technical-constant: TEST_ONLY — paramètres de simulation (repris du lot 4.4) et plages de validité CANDIDATES étudiées
const SIM = { floorWindow: 2, reassessEvery: 4, safetyBelow: 3 };
const opt = (o: Partial<ProgressionReadingOption>): ProgressionReadingOption => ({ ...SIM, ...o });
const v44 = (id: string) => LOT44_VARIANTS.find((v) => v.id === id) as Lot43Variant;

export const B_VARIANTS: readonly Lot43Variant[] = [
  v44('A'),
  { id: 'B-R4', label: 'Exclusion des séances allégées des décisions (R4 seul)', progression: opt({ policy: 'r4' }) },
  { id: 'B-REF', label: 'Évaluation spécifique : séance allégée jugée contre la référence durable (deux sens)', progression: opt({ policy: 'reference_eval' }) },
  { id: 'B-V6', label: 'Fatigue persistante : variante 6 (R4 + plancher + R3 + baisse après 3 séances allégées en dessous)', progression: opt({ policy: 'r4_floor_r3_safety' }) },
  { id: 'B-CLAMP', label: 'Estimation conservatrice : effort hors plage lu au plafond de la plage', progression: opt({ outOfRange: 'clamp' }) },
  { id: 'B-SUSP', label: 'Suspension : réussite sans estimation fiable ⇒ aucune décision', progression: opt({ suspendUnreliable: true }) },
  { id: 'B-REFCL', label: 'Évaluation spécifique + estimation conservatrice', progression: opt({ policy: 'reference_eval', outOfRange: 'clamp' }) },
  { id: 'B-RNG10', label: 'Sensibilité : plage de validité 10 répétitions jusqu’à l’échec', progression: opt({ e1rmMaxRtf: 10 }) },
  { id: 'B-RNG15', label: 'Sensibilité : plage 15', progression: opt({ e1rmMaxRtf: 15 }) },
  { id: 'B-RNG20', label: 'Sensibilité : plage 20', progression: opt({ e1rmMaxRtf: 20 }) },
];

/** Athlète à capacité réelle déclarant un RIR IMPRÉCIS (écart déterministe −1, 0, +1, 0…, jamais négatif). */
function noisyAthlete(gain: number): NonNullable<ProfileSpec['perform']> {
  const divisor = readStrengthParams(strengthContent().ruleset).values['strength.load'].e1rmDivisor;
  const base = new Map<string, number>();
  // technical-constant: TEST_ONLY — motif d'imprécision du RIR déclaré
  const NOISE = [-1, 0, 1, 0];
  let k = 0;
  return ({ week, exerciseId, kg, reps, rir }) => {
    if (!base.has(exerciseId)) base.set(exerciseId, kg * (1 + (reps + (rir ?? 2)) / divisor));
    const e1rm = (base.get(exerciseId) ?? kg) * (1 + gain) ** week;
    const toFailure = divisor * (e1rm / kg - 1);
    const done = Math.max(1, Math.min(reps, Math.floor(toFailure)));
    const noise = NOISE[k++ % NOISE.length] ?? 0;
    return { reps: done, rir: Math.max(0, Math.floor(toFailure - done) + noise) };
  };
}

/** Scénarios B : ceux du lot 4.4 + RIR imprécis + changement de programme (4× A/B puis 3× Full Body en S7). */
export function lot45Scenarios(): ProfileSpec[] {
  // technical-constant: TEST_ONLY — gain hebdomadaire, semaine du changement, jours du Full Body 3×
  const SC = { gain: 0.005, change: 6, fbDays: [0, 2, 4] };
  return [...r4Scenarios(),
    { ...lot41Athlete({ ...P1, id: 'E-NOISY', label: 'RIR déclaré imprécis (±1), athlète qui progresse' }), perform: noisyAthlete(SC.gain) } as ProfileSpec,
    lot41Athlete({ ...P1, id: 'E-CHANGE', label: 'Changement de programme : 4× A/B puis 3× Full Body (S7)', beforeWeek: (w, st, sunday) => {
      if (w !== SC.change || !st.profile) return st;
      const pers = st.profile.strength.personalization as StrengthPersonalization;
      return updateStrengthPersonalization(st, { ...st.profile, strength: { ...st.profile.strength, sessionsPerWeek: 3, personalization: { ...pers, days: SC.fbDays } } } as ProfileInput, sunday);
    } }),
  ];
}

export interface Lot45Measure extends Lot44Measure {
  /** Expositions classées « en dessous » JUSTE APRÈS une hausse (hausse non justifiée). */
  readonly belowAfterIncrease: number;
  /** Expositions « au-dessus » juste après une baisse (baisse non justifiée). */
  readonly aboveAfterDecrease: number;
  /** Décisions suspendues faute d'estimation fiable. */
  readonly suspended: number;
  /** Expositions dont la référence RIR est établie (source) / inconnue. */
  readonly referenceKnown: number; readonly referenceUnknown: number;
  /** Isolations : changements d'exercice d'une occurrence à la suivante, et retours à un exercice déjà quitté (oscillation). */
  readonly isolationChanges: number; readonly isolationOscillations: number;
}

export function measureLot45(s: ProfileSpec, v: Lot43Variant): Lot45Measure {
  const after = { inc: 0, dec: 0, susp: 0, known: 0, unknown: 0 };
  const m = measureLot44(s, v, true);
  // Relecture de l'audit (séquence par track) : décision puis exposition suivante.
  const audit = m.audit ?? [];
  const last = new Map<string, string>();
  for (const a of audit) {
    const id = String(a.params.trackId ?? '');
    if (a.code === 'PROGRESSION.EXPOSURE_CLASSIFIED') {
      const prev = last.get(id);
      if (prev === 'ADVANCED' && a.params.exposure === 'below') after.inc += 1;
      if (prev === 'REGRESSED' && a.params.exposure === 'above') after.dec += 1;
      if (a.params.referenceSource === 'unknown') after.unknown += 1; else after.known += 1;
      last.set(id, 'EXPOSED');
    } else if (a.code === 'PROGRESSION.ADVANCED' || a.code === 'PROGRESSION.REGRESSED') last.set(id, a.code.slice('PROGRESSION.'.length));
    else if (a.code === 'PROGRESSION.HELD' && a.params.cause === 'estimate_unreliable') after.susp += 1;
  }
  let changes = 0; let osc = 0;
  for (const seq of Object.values(m.isolationSequences ?? {})) {
    const left = new Set<string>();
    for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) { changes += 1; if (left.has(seq[i] ?? '')) osc += 1; left.add(seq[i - 1] ?? ''); }
  }
  const { audit: _a, isolationSequences: _i, ...rest } = m;
  return { ...rest, isolationChanges: changes, isolationOscillations: osc, belowAfterIncrease: after.inc, aboveAfterDecrease: after.dec, suspended: after.susp, referenceKnown: after.known, referenceUnknown: after.unknown };
}

// technical-constant: TEST_ONLY — sensibilité du poids des contributions secondaires (hypothèse 0,5 du contenu)
const SECONDARY = { low: 0.25, high: 0.75 };
export const C_VARIANTS: readonly Lot43Variant[] = [
  v44('B1'), v44('B1Q4'), v44('B1ISO'),
  { id: 'B1ISO-25', label: 'B1 + réévaluation, poids indirect 0,25 (sensibilité)', synergists: 'arms', isolationReview: 'volume_fit', secondaryWeight: SECONDARY.low },
  { id: 'B1ISO-75', label: 'B1 + réévaluation, poids indirect 0,75 (sensibilité)', synergists: 'arms', isolationReview: 'volume_fit', secondaryWeight: SECONDARY.high },
];
export const D_VARIANTS: readonly Lot43Variant[] = [
  v44('RED'),
  { id: 'RED-DEF', label: 'Redistribution vers les groupes sous leur cible seulement', redistributeUnplaced: true, redistributeScope: 'deficit' },
  { id: 'RED-PRIO', label: 'Redistribution vers les groupes prioritaires seulement', redistributeUnplaced: true, redistributeScope: 'priority' },
  { id: 'RED-GUARD', label: 'Redistribution, sauf si elle supprime un emplacement à temps résiduel (stimulation minimale)', redistributeUnplaced: true, redistributeGuard: 'keep_residual' },
  { id: 'RED-DEF-GUARD', label: 'Redistribution vers les groupes sous leur cible, avec garde', redistributeUnplaced: true, redistributeScope: 'deficit', redistributeGuard: 'keep_residual' },
  { id: 'SW-ALT+RED-GUARD', label: 'Région alternée + redistribution avec garde', shortWeek: 'alternate_region', redistributeUnplaced: true, redistributeGuard: 'keep_residual' },
  { id: 'SW-FB+RED-GUARD', label: 'Full Body + redistribution avec garde', shortWeek: 'full_body', redistributeUnplaced: true, redistributeGuard: 'keep_residual' },
  v44('SW-ALT+RED'), v44('SW-FB+RED'),
];
/** Contenus CANDIDATS complets (hors registre), mesurés tels qu'ils seraient publiés. */
export const CANDIDATE_VARIANTS: readonly Lot43Variant[] = [
  { id: 'CAND-B1ISO', label: 'Candidat : B1 + réévaluation des isolations (catalogue B1 versionné, politique versionnée)', candidate: { b1IsolationReview: true } },
  { id: 'CAND-RED-GUARD', label: 'Candidat : redistribution avec garde (politique versionnée)', candidate: { redistribution: { guard: 'keep_residual' } } },
];
export function lot45Plan(): { variant: Lot43Variant; specs: ProfileSpec[] }[] {
  const all20 = lot43Specs();
  return [
    ...B_VARIANTS.map((variant) => ({ variant, specs: variant.id === 'A' ? [...all20, ...lot45Scenarios()] : lot45Scenarios() })),
    ...[...C_VARIANTS, ...D_VARIANTS, ...CANDIDATE_VARIANTS].map((variant) => ({ variant, specs: all20 })),
  ];
}
