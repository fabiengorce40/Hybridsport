/**
 * Reason codes du StrengthEngine (spec strength 06 §21) — extension du registre du CORE, domaines
 * existants uniquement. Aucun texte : les textes seront des templates localisés.
 */
import { createCoreRegistry } from '@hybridsport/engine';
import type { ReasonCodeDefinition } from '@hybridsport/engine';

const S = 'string' as const;
const N = 'number' as const;
const L = 'string[]' as const;

export const STRENGTH_REASON_CODES: readonly ReasonCodeDefinition[] = [
  { code: 'SELECT.EXERCISE.CHOSEN', categories: ['optimization'], params: { exerciseId: S, slot: S, decidingCriterion: S }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.FILTERED', categories: ['information'], params: { slot: S, filter: S, count: N }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.NO_CANDIDATE_FOR_SLOT', categories: ['feasibility'], params: { slot: S, need: S }, audience: 'user', severity: 'error' },
  { code: 'SELECT.SUBSTITUTION', categories: ['adaptation'], params: { from: S, to: S, fidelity: S }, audience: 'user', severity: 'notice' },
  { code: 'SELECT.SUBSTITUTION_LOW_FIDELITY', categories: ['adaptation'], params: { from: S, to: S }, audience: 'user', severity: 'warning' },
  { code: 'SELECT.PATTERN_FALLBACK', categories: ['adaptation'], params: { slot: S, fallbackNeed: S }, audience: 'user', severity: 'warning' },
  { code: 'SELECT.CONTEXT_COMPROMISE', categories: ['business_soft'], params: { slot: S, structure: S }, audience: 'internal', severity: 'warning' },
  { code: 'SELECT.SLOT_OMITTED', categories: ['optimization'], params: { slot: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.LOAD.FROM_E1RM', categories: ['information'], params: { exerciseId: S, fraction: N, confidence: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.LOAD.FROM_HISTORY', categories: ['information'], params: { exerciseId: S, confidence: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.LOAD.RPE_BASED_LOW_CONFIDENCE', categories: ['information'], params: { exerciseId: S }, audience: 'user', severity: 'info' },
  { code: 'DOSE.LOAD.CALIBRATION', categories: ['information'], params: { exerciseId: S }, audience: 'user', severity: 'info' },
  { code: 'DOSE.LOAD.CAP_REACHED', categories: ['adaptation'], params: { exerciseId: S, maxKg: N }, audience: 'user', severity: 'notice' },
  { code: 'DOSE.MODIFIED', categories: ['optimization'], params: { modifier: S, exerciseId: S, setsDelta: N, rirDelta: N }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.VOLUME_ALLOCATED', categories: ['optimization'], params: { exerciseId: S, sets: N, group: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.SESSION_CAP_APPLIED', categories: ['safety'], params: { group: S, cap: N }, audience: 'internal', severity: 'notice' },
  { code: 'DOSE.RAMPUP', categories: ['information'], params: { exerciseId: S, steps: N, knowledge: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.TOP_SET', categories: ['information'], params: { exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.ADVANCED', categories: ['adaptation'], params: { trackId: S, variable: S }, audience: 'user', severity: 'info' },
  { code: 'PROGRESSION.HELD', categories: ['adaptation'], params: { trackId: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.REGRESSED', categories: ['adaptation'], params: { trackId: S }, audience: 'user', severity: 'notice' },
  { code: 'PROGRESSION.CAP_REACHED', categories: ['adaptation'], params: { trackId: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.SUSPENDED', categories: ['information'], params: { trackId: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.TRACK_CREATED', categories: ['information'], params: { trackId: S, tier: S, exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.TRACK_CLOSED', categories: ['adaptation'], params: { trackId: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.ANCHOR_PROPOSED', categories: ['information'], params: { slot: S, exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.ANCHOR_APPLIED', categories: ['information'], params: { trackId: S, exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: 'PLAN.ARCHETYPE_NOT_APPLICABLE', categories: ['feasibility'], params: { archetype: S, reason: S }, audience: 'internal', severity: 'error' },
  { code: 'PLAN.CONTEXT_INCOMPATIBLE', categories: ['feasibility'], params: { archetype: S, structures: L }, audience: 'internal', severity: 'error' },
  { code: 'PLAN.VOLUME_IMBALANCE_WEEK', categories: ['business_soft'], params: { group: S, planned: N, floor: N }, audience: 'internal', severity: 'warning' },
  { code: 'PLAN.STRUCTURE_LOWERED', categories: ['optimization'], params: { structure: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'DURATION.TARGET_BELOW_ARCHETYPE_MIN', categories: ['feasibility'], params: { requiredS: N, targetS: N }, audience: 'user', severity: 'error' },
  { code: 'DATA.WEEK_CONTEXT_UNKNOWN', categories: ['information'], params: {}, audience: 'internal', severity: 'info' },
  { code: 'STATE.REFERENCE_CONFLICT', categories: ['information'], params: { exerciseId: S }, audience: 'internal', severity: 'info' },
];

/** Registre du moteur : codes du CORE + codes de la musculation (un code non enregistré lève une erreur). */
export const strengthReasons = createCoreRegistry(STRENGTH_REASON_CODES);
