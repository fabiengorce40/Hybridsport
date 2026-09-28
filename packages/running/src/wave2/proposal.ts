/**
 * Vague 2 — correspondance candidat retenu → proposition du contrat SportEngine du CORE.
 * Aucune valeur nouvelle n'est créée ici : la séance reprend la structure (estimation dérivée par le CORE),
 * le temps disponible et la durée cible de l'INTENTION (jamais modifiés), le niveau du profil CORE, et le
 * profil de tolérance `fixed_time` (spec CORE 07 §3 : « course au temps »). Le CORE reste l'autorité de
 * validation, de durée et de réparation.
 */
import type { ReasonCode, SportEngineProposalInput } from '@hybridsport/domain';
import type { SportEngineInput } from '@hybridsport/engine';
import type { RunningContext } from '../context.js';
import type { Wave2Selection } from './pipeline.js';

/** Profil de tolérance du ruleset CORE pour une séance au temps (spec 07 §3, identifiant de donnée CORE). */
export const RUN_BY_TIME_TOLERANCE_PROFILE = 'fixed_time';

export const toProposalReasons = (rs: readonly ReasonCode[]): SportEngineProposalInput['reasons'] => rs.map((r) => ({
  ...r,
  params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === 'object' ? [...v] : v])) as Record<string, string | number | boolean | string[]>,
  ruleRefs: [...r.ruleRefs],
}));

/** Déduplication stable des raisons (code + paramètres). */
export function uniqueReasons(rs: readonly ReasonCode[]): ReasonCode[] {
  const seen = new Set<string>();
  return rs.filter((r) => { const k = JSON.stringify([r.code, r.params]); if (seen.has(k)) return false; seen.add(k); return true; });
}

/**
 * Répartition E5 (low / moderate / high) : parts de TEMPS de la structure, selon le modèle de domaines Running
 * (EASY_LOW ⊂ MODERATE ⇒ low ; THRESHOLD_LIKE, haut du domaine HEAVY ⇒ moderate ; SEVERE ⇒ high). Échauffement,
 * retour au calme et récupérations sont sous le plafond EASY_LOW. Donnée de la structure, jamais une estimation.
 */
export function energyOf(candidate: Wave2Selection['candidate']): { low: number; moderate: number; high: number } {
  const dose = candidate.dose;
  if (dose?.kind !== 'structure' || candidate.intensity?.domain === 'EASY_LOW') return { low: 1, moderate: 0, high: 0 };
  const s = dose.structure;
  const easyS = (s.warmupS ?? 0) + (s.cooldownS ?? 0) + (s.reps > 1 ? (s.reps - 1) * (s.recoveryS ?? 0) : 0);
  const total = easyS + dose.workS;
  const work = dose.workS / total;
  return candidate.intensity?.domain === 'SEVERE' ? { low: 1 - work, moderate: 0, high: work } : { low: 1 - work, moderate: work, high: 0 };
}

export function toCoreProposal(input: SportEngineInput<RunningContext>, sel: Wave2Selection, engine: { readonly id: string; readonly version: string }): SportEngineProposalInput {
  const { candidate, structure, exercise } = sel;
  const dose = candidate.dose;
  if (dose === undefined) throw new TypeError(`candidat retenu sans dose : ${candidate.candidateId}`);
  const itemId = `${input.intent.id}.run`;
  return {
    proposalId: `proposal.${candidate.candidateId}`,
    discipline: input.intent.discipline,
    intentId: input.intent.id,
    archetypeId: input.intent.archetypeId,
    stimulus: input.intent.stimulus,
    objective: input.intent.objective,
    session: {
      id: `${input.intent.id}.session`,
      discipline: input.intent.discipline,
      athleteLevel: input.profile.athleteLevel,
      availableTimeS: input.intent.availableTimeS,
      targetDurationS: input.intent.targetDurationS,
      toleranceProfile: RUN_BY_TIME_TOLERANCE_PROFILE,
      blocks: [{ id: `${input.intent.id}.block`, kind: 'running', role: 'primary', format: 'continuous', items: [{ id: itemId, exerciseId: exercise.id, prescription: structure }] }],
    },
    // Couche B : un seul candidat par construction, aucun critère calculé (aucun score inventé) ; le CORE applique ses pénalités.
    optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 },
    fingerprintInputs: {
      archetypeId: input.intent.archetypeId,
      stimulus: input.intent.stimulus,
      energy: energyOf(candidate),
      format: dose.kind === 'structure' && dose.structure.reps > 1 ? 'intervals' : 'continuous',
      volumeByItem: { [itemId]: dose.kind === 'duration' ? dose.durationS : dose.workS },
      prescriptionMarkers: dose.kind === 'duration'
        ? { [`${candidate.archetype}.doseS`]: dose.durationS }
        : { [`${candidate.archetype}.workS`]: dose.workS, [`${candidate.archetype}.reps`]: dose.structure.reps },
    },
    repetitionIntents: [],
    reasons: toProposalReasons(uniqueReasons(candidate.reasons)),
    provenance: { engineId: engine.id, engineVersion: engine.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
    // Paramètres du ruleset CORE réellement lus : aucun (les paramètres Running sont tracés dans les raisons et le candidat).
    parametersUsed: [],
  };
}
