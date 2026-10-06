/**
 * Reason codes du StrengthEngine (spec strength 06 §21) — extension du registre du CORE, domaines
 * existants uniquement. Aucun texte : les textes seront des templates localisés.
 */
import { createCoreRegistry } from '@hybridsport/engine';
import type { ReasonCodeDefinition } from '@hybridsport/engine';

const S = 'string' as const;
const N = 'number' as const;
const L = 'string[]' as const;
const B = 'boolean' as const;

export const STRENGTH_REASON_CODES: readonly ReasonCodeDefinition[] = [
  { code: 'PLAN.ANCHOR_CHOICE_GROUP_CONFLICT', categories: ['technical'], params: { group: S, trackIds: L }, audience: 'internal', severity: 'error' },
  { code: 'PLAN.ANCHOR_NOT_DECLARABLE', categories: ['technical'], params: { trackId: S, cause: S }, audience: 'internal', severity: 'error' },
  { code: 'SELECT.EXERCISE.CHOSEN', categories: ['optimization'], params: { exerciseId: S, slot: S, decidingCriterion: S }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.FILTERED', categories: ['information'], params: { slot: S, filter: S, count: N }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.NO_CANDIDATE_FOR_SLOT', categories: ['feasibility'], params: { slot: S, need: S }, audience: 'user', severity: 'error' },
  { code: 'SELECT.SUBSTITUTION', categories: ['adaptation'], params: { from: S, to: S, fidelity: S }, audience: 'user', severity: 'notice' },
  { code: 'SELECT.SUBSTITUTION_LOW_FIDELITY', categories: ['adaptation'], params: { from: S, to: S }, audience: 'user', severity: 'warning' },
  { code: 'SELECT.PATTERN_FALLBACK', categories: ['adaptation'], params: { slot: S, fallbackNeed: S }, audience: 'user', severity: 'warning' },
  { code: 'SELECT.CONTEXT_COMPROMISE', categories: ['business_soft'], params: { slot: S, structure: S }, audience: 'internal', severity: 'warning' },
  { code: 'SELECT.SLOT_OMITTED', categories: ['optimization'], params: { slot: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.LOAD.FROM_E1RM', categories: ['information'], params: { exerciseId: S, fraction: N, confidence: S, e1rmKg: N, reference: S, unroundedKg: N, stepKg: N }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.LOAD.FROM_SPECIFIC', categories: ['information'], params: { exerciseId: S, observedKg: N, observedReps: N, observedRir: N, at: S, confidence: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.LOAD.CONFIDENCE', categories: ['information'], params: { exerciseId: S, level: S, rules: S, source: S, recency: S, observations: N, sessions: N, consistency: S, rir: S, conflict: B, transfer: B }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.LOAD.FROM_HISTORY', categories: ['information'], params: { exerciseId: S, confidence: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.LOAD.RPE_BASED_LOW_CONFIDENCE', categories: ['information'], params: { exerciseId: S }, audience: 'user', severity: 'info' },
  { code: 'DOSE.LOAD.CALIBRATION', categories: ['information'], params: { exerciseId: S }, audience: 'user', severity: 'info' },
  { code: 'DOSE.LOAD.CAP_REACHED', categories: ['adaptation'], params: { exerciseId: S, maxKg: N }, audience: 'user', severity: 'notice' },
  { code: 'DOSE.MODIFIED', categories: ['optimization'], params: { modifier: S, exerciseId: S, setsDelta: N, rirDelta: N }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.VOLUME_ALLOCATED', categories: ['optimization'], params: { exerciseId: S, sets: N, group: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.SESSION_CAP_APPLIED', categories: ['safety'], params: { group: S, cap: N }, audience: 'internal', severity: 'notice' },
  { code: 'DOSE.RAMPUP', categories: ['information'], params: { exerciseId: S, steps: N, knowledge: S }, audience: 'internal', severity: 'info' },
  { code: 'DOSE.TOP_SET', categories: ['information'], params: { exerciseId: S, topKg: N, backoffFraction: N, backoffUnroundedKg: N, backoffKg: N, backoffSets: N }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.ADVANCED', categories: ['adaptation'], params: { trackId: S, variable: S }, audience: 'user', severity: 'info' },
  { code: 'PROGRESSION.HELD', categories: ['adaptation'], params: { trackId: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.REGRESSED', categories: ['adaptation'], params: { trackId: S }, audience: 'user', severity: 'notice' },
  { code: 'PROGRESSION.CAP_REACHED', categories: ['adaptation'], params: { trackId: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.SUSPENDED', categories: ['information'], params: { trackId: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.CYCLE_STARTED', categories: ['adaptation'], params: { trackId: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.RESUMED', categories: ['adaptation'], params: { trackId: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.TRACK_CREATED', categories: ['information'], params: { trackId: S, tier: S, exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.TRACK_CLOSED', categories: ['adaptation'], params: { trackId: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.ANCHOR_PROPOSED', categories: ['information'], params: { slot: S, exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.ANCHOR_NOT_APPLICABLE', categories: ['information'], params: { trackId: S, slot: S }, audience: 'internal', severity: 'notice' },
  { code: 'PROGRESSION.ANCHOR_APPLIED', categories: ['information'], params: { trackId: S, exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: 'PLAN.ARCHETYPE_NOT_APPLICABLE', categories: ['feasibility'], params: { archetype: S, reason: S }, audience: 'internal', severity: 'error' },
  { code: 'PLAN.CONTEXT_INCOMPATIBLE', categories: ['feasibility'], params: { archetype: S, structures: L }, audience: 'internal', severity: 'error' },
  { code: 'PLAN.VOLUME_IMBALANCE_WEEK', categories: ['business_soft'], params: { group: S, planned: N, floor: N }, audience: 'internal', severity: 'warning' },
  { code: 'PLAN.STRUCTURE_LOWERED', categories: ['optimization'], params: { structure: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'DURATION.TARGET_BELOW_ARCHETYPE_MIN', categories: ['feasibility'], params: { requiredS: N, targetS: N }, audience: 'user', severity: 'error' },
  { code: 'DATA.WEEK_CONTEXT_UNKNOWN', categories: ['information'], params: {}, audience: 'internal', severity: 'info' },
  { code: 'PLAN.INTERFERENCE_ASSESSED', categories: ['optimization'], params: { structure: S, level: S, action: S, source: S, hours: N, priority: S, demand: S }, audience: 'internal', severity: 'info' },
  { code: 'PLAN.INTERFERENCE_BASIS', categories: ['information'], params: { structure: S, level: S, action: S, mechanism: S, magnitude: S }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.STIMULUS_PRESERVED', categories: ['optimization'], params: { slot: S, exerciseId: S, removedSlot: S, removedExerciseId: S, groups: L, sets: N, otherSets: N }, audience: 'internal', severity: 'notice' },
  { code: 'PLAN.INTERFERENCE_SIGNAL', categories: ['business_soft'], params: { structure: S, level: S, source: S, overlap: S }, audience: 'internal', severity: 'warning' },
  { code: 'PROGRESSION.REVIEW_DUE', categories: ['information'], params: { trackId: S, weeks: N }, audience: 'internal', severity: 'notice' },
  { code: 'DATA.SCIENCE_REGISTRY', categories: ['information'], params: { version: S }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.CHOICE_GROUP', categories: ['optimization'], params: { group: S, need: S, cause: S, others: L }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.EXPOSURE_CLASSIFIED', categories: ['information'], params: { trackId: S, exerciseId: S, exposure: S, success: S, sets: S, repsDelta: S, loadDeltaKg: S, rirDelta: S, rir: S, kind: S, effort: S }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.CONTINUITY', categories: ['optimization'], params: { slot: S, incumbent: S, chosen: S, outcome: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.CONTINUITY_KEPT', categories: ['optimization'], params: { exercises: L }, audience: 'internal', severity: 'info' },
  { code: 'PLAN.SPORT_PRIORITY', categories: ['information'], params: { order: L, strengthRank: N, neighbours: L, policy: S }, audience: 'internal', severity: 'info' },
  { code: 'PROGRESSION.DECISION_BLOCKED', categories: ['information'], params: { trackId: S, model: S, situation: S, capability: S, rir: S, exactStreak: N }, audience: 'internal', severity: 'notice' },
  { code: 'PROGRESSION.METHOD_UNGOVERNED', categories: ['information'], params: { trackId: S, exerciseId: S, repsReached: N, methods: L, capability: S, effort: S }, audience: 'internal', severity: 'notice' },
  { code: 'PLAN.WEEK_PRESCRIPTION', categories: ['information'], params: { archetype: S, occurrence: N, weeklySessions: N, plannedBefore: N, belowFloor: L, atOrAboveHigh: L, noTarget: L, anchors: L, volumeRule: S, progressionRule: S, phase: S, blocked: L }, audience: 'internal', severity: 'info' },
  { code: 'PLAN.WEEK_COMPOSITION', categories: ['information'], params: { rule: S, version: S, status: S, band: S, sessions: N, rotation: L, firstBy: S, swaps: L }, audience: 'internal', severity: 'info' },
  { code: 'RULE.WEEK_COMPOSITION_UNGOVERNED', categories: ['business_hard'], params: { sessions: N, goal: S, cause: S }, audience: 'user', severity: 'error' },
  { code: 'STATE.REFERENCE_CONFLICT', categories: ['information'], params: { exerciseId: S }, audience: 'internal', severity: 'info' },
];

/** Registre du moteur : codes du CORE + codes de la musculation (un code non enregistré lève une erreur). */
export const strengthReasons = createCoreRegistry(STRENGTH_REASON_CODES);
