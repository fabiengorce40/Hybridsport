/**
 * Reason codes du RunningEngine (vague 1) — extension du registre du CORE, domaines existants
 * uniquement (aucun domaine CORE ajouté). Chaque échec a son code propre : aucun code générique
 * surchargé. Aucun texte : les textes seront des templates localisés.
 */
import { createCoreRegistry } from '@hybridsport/engine';
import type { ReasonCodeDefinition } from '@hybridsport/engine';

const S = 'string' as const;
const L = 'string[]' as const;
const B = 'boolean' as const;
const N = 'number' as const;

/** Codes stables exigés (phase 6B §M) → code enregistré. */
export const RUNNING_CODES = {
  UNRESOLVED_PARAMETER: 'RULE.RUNNING.UNRESOLVED_PARAMETER',
  CAPABILITY_DISABLED: 'SCOPE.RUNNING.CAPABILITY_DISABLED',
  G1_POLICY_UNSIGNED: 'SAFETY.RUNNING.G1_POLICY_UNSIGNED',
  REFERENCE_MISSING: 'DATA.RUNNING.REFERENCE_MISSING',
  REFERENCE_LOW_CONFIDENCE: 'DATA.RUNNING.REFERENCE_LOW_CONFIDENCE',
  PRESCRIPTION_PRECISION_REDUCED: 'DOSE.RUNNING.PRESCRIPTION_PRECISION_REDUCED',
  POPULATION_UNSUPPORTED: 'SCOPE.RUNNING.POPULATION_UNSUPPORTED',
  GOAL_UNSUPPORTED: 'GOAL.RUNNING.GOAL_UNSUPPORTED',
  FIRST_EXPOSURE_UNRESOLVED: 'PROGRESSION.RUNNING.FIRST_EXPOSURE_UNRESOLVED',
  RETURN_PROTOCOL_UNRESOLVED: 'STATE.RUNNING.RETURN_PROTOCOL_UNRESOLVED',
  NOVICE_ENTRY_UNRESOLVED: 'SCOPE.RUNNING.NOVICE_ENTRY_UNRESOLVED',
  PROGRESSION_UNRESOLVED: 'PROGRESSION.RUNNING.PROGRESSION_UNRESOLVED',
  MARATHON_RULE_UNRESOLVED: 'GOAL.RUNNING.MARATHON_RULE_UNRESOLVED',
  MODEL_UNAVAILABLE: 'DATA.RUNNING.MODEL_UNAVAILABLE',
  // Gouvernance et éligibilité
  DECISION_PENDING: 'RULE.RUNNING.DECISION_PENDING',
  RULESET_NOT_LOCKED: 'RULE.RUNNING.RULESET_NOT_LOCKED',
  TECHNICAL_DEPENDENCY: 'RULE.RUNNING.TECHNICAL_DEPENDENCY',
  CANDIDATE_VALUE_USED: 'RULE.RUNNING.CANDIDATE_VALUE_USED',
  CANDIDATE_OVERRIDE: 'RULE.RUNNING.CANDIDATE_OVERRIDE',
  CAPABILITY_ENABLED: 'SCOPE.RUNNING.CAPABILITY_ENABLED',
  CAPABILITY_NOT_REQUESTED: 'SCOPE.RUNNING.CAPABILITY_NOT_REQUESTED',
  MATURITY_TRANSITION_INVALID: 'RULE.RUNNING.MATURITY_TRANSITION_INVALID',
  // Références
  REFERENCE_SELECTED: 'DATA.RUNNING.REFERENCE_SELECTED',
  REFERENCE_REJECTED: 'DATA.RUNNING.REFERENCE_REJECTED',
  REFERENCE_STALE: 'DATA.RUNNING.REFERENCE_STALE',
  REFERENCE_CONFLICT: 'DATA.RUNNING.REFERENCE_CONFLICT',
  CALIBRATION_REQUIRED: 'DATA.RUNNING.CALIBRATION_REQUIRED',
  VARIABILITY_UNKNOWN: 'DATA.RUNNING.VARIABILITY_UNKNOWN',
  RECENT_LOAD_UNKNOWN: 'DATA.RUNNING.RECENT_LOAD_UNKNOWN',
  // Séances
  ARCHETYPE_POST_V1: 'PLAN.RUNNING.ARCHETYPE_POST_V1',
  ARCHETYPE_UNKNOWN: 'PLAN.RUNNING.ARCHETYPE_UNKNOWN',
  HOLD_OR_RESTORE_ONLY: 'PROGRESSION.RUNNING.HOLD_OR_RESTORE_ONLY',
  HYBRID_PLANNER_UNAVAILABLE: 'SCOPE.RUNNING.HYBRID_PLANNER_UNAVAILABLE',
  PRESCRIPTION_NOT_IMPLEMENTED: 'PLAN.RUNNING.PRESCRIPTION_NOT_IMPLEMENTED',
  // Vague 2 (phase 6C) : prescription
  DOSE_ANCHOR_SELECTED: 'DOSE.RUNNING.DOSE_ANCHOR_SELECTED',
  DOSE_ANCHOR_UNAVAILABLE: 'DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE',
  SIMULATION_REQUIRED: 'RULE.RUNNING.SIMULATION_REQUIRED',
  SIMULATED_PROPOSAL: 'RULE.RUNNING.SIMULATED_PROPOSAL',
  EXERCISE_UNAVAILABLE: 'PLAN.RUNNING.EXERCISE_UNAVAILABLE',
  TIME_EXCEEDED: 'PLAN.RUNNING.TIME_EXCEEDED',
  // Vague 3 (séances de qualité en HOLD)
  QUALITY_GUARD_FAILED: 'SCOPE.RUNNING.QUALITY_GUARD_FAILED',
  STRUCTURE_UNAVAILABLE: 'DOSE.RUNNING.STRUCTURE_UNAVAILABLE',
  FAMILY_AMBIGUOUS: 'PLAN.RUNNING.FAMILY_AMBIGUOUS',
  HIGH_DEMAND_DEFAULT_CONSERVATIVE: 'DOSE.RUNNING.HIGH_DEMAND_DEFAULT_CONSERVATIVE',
  // Décisions produit (D1, D5)
  DOSE_ANCHOR_FALLBACK: 'DOSE.RUNNING.DOSE_ANCHOR_FALLBACK',
  PROGRESSION_STEP_APPLIED: 'PROGRESSION.RUNNING.PROGRESSION_STEP_APPLIED',
  PROGRESSION_HOLD: 'PROGRESSION.RUNNING.PROGRESSION_HOLD',
} as const;
export type RunningCode = (typeof RUNNING_CODES)[keyof typeof RUNNING_CODES];

export const RUNNING_REASON_CODES: readonly ReasonCodeDefinition[] = [
  { code: RUNNING_CODES.UNRESOLVED_PARAMETER, categories: ['technical', 'business_hard'], params: { parameterId: S, cause: S, mode: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.CAPABILITY_DISABLED, categories: ['feasibility', 'information'], params: { capability: S, cause: S }, audience: 'internal', severity: 'notice' },
  { code: RUNNING_CODES.G1_POLICY_UNSIGNED, categories: ['safety'], params: { policyId: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.REFERENCE_MISSING, categories: ['information'], params: { decision: S }, audience: 'internal', severity: 'info' },
  { code: RUNNING_CODES.REFERENCE_LOW_CONFIDENCE, categories: ['information'], params: { referenceId: S, decision: S, level: S, factors: L }, audience: 'internal', severity: 'notice' },
  { code: RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED, categories: ['adaptation'], params: { archetype: S, precision: S, cause: S }, audience: 'user', severity: 'notice' },
  { code: RUNNING_CODES.POPULATION_UNSUPPORTED, categories: ['feasibility'], params: { population: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.GOAL_UNSUPPORTED, categories: ['feasibility'], params: { goal: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.FIRST_EXPOSURE_UNRESOLVED, categories: ['feasibility'], params: { archetype: S, capability: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.RETURN_PROTOCOL_UNRESOLVED, categories: ['safety'], params: { returnState: S }, audience: 'user', severity: 'error' },
  { code: RUNNING_CODES.NOVICE_ENTRY_UNRESOLVED, categories: ['safety'], params: { population: S }, audience: 'user', severity: 'error' },
  { code: RUNNING_CODES.PROGRESSION_UNRESOLVED, categories: ['adaptation'], params: { capability: S }, audience: 'internal', severity: 'notice' },
  { code: RUNNING_CODES.MARATHON_RULE_UNRESOLVED, categories: ['feasibility'], params: { strict: B }, audience: 'user', severity: 'error' },
  { code: RUNNING_CODES.MODEL_UNAVAILABLE, categories: ['information'], params: { goal: S, cause: S }, audience: 'internal', severity: 'notice' },
  { code: RUNNING_CODES.DECISION_PENDING, categories: ['business_hard'], params: { decisionId: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.RULESET_NOT_LOCKED, categories: ['business_hard'], params: { rulesetVersion: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.TECHNICAL_DEPENDENCY, categories: ['technical'], params: { dependencyId: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.CANDIDATE_VALUE_USED, categories: ['information'], params: { parameterId: S, maturity: S }, audience: 'internal', severity: 'warning' },
  { code: RUNNING_CODES.CANDIDATE_OVERRIDE, categories: ['information'], params: { capability: S, blockers: L }, audience: 'internal', severity: 'warning' },
  { code: RUNNING_CODES.CAPABILITY_ENABLED, categories: ['information'], params: { capability: S, mode: S }, audience: 'internal', severity: 'info' },
  { code: RUNNING_CODES.CAPABILITY_NOT_REQUESTED, categories: ['information'], params: { capability: S }, audience: 'internal', severity: 'info' },
  { code: RUNNING_CODES.MATURITY_TRANSITION_INVALID, categories: ['technical'], params: { parameterId: S, from: S, to: S, cause: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.REFERENCE_SELECTED, categories: ['information'], params: { referenceId: S, decision: S, level: S }, audience: 'internal', severity: 'info' },
  { code: RUNNING_CODES.REFERENCE_REJECTED, categories: ['information'], params: { referenceId: S, decision: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: RUNNING_CODES.REFERENCE_STALE, categories: ['information'], params: { referenceId: S }, audience: 'user', severity: 'notice' },
  { code: RUNNING_CODES.REFERENCE_CONFLICT, categories: ['information'], params: { referenceIds: L, severity: S, cause: S }, audience: 'internal', severity: 'warning' },
  { code: RUNNING_CODES.CALIBRATION_REQUIRED, categories: ['adaptation'], params: { cause: S }, audience: 'user', severity: 'notice' },
  { code: RUNNING_CODES.VARIABILITY_UNKNOWN, categories: ['information'], params: { cause: S }, audience: 'internal', severity: 'info' },
  { code: RUNNING_CODES.RECENT_LOAD_UNKNOWN, categories: ['information'], params: { dimension: S, cause: S }, audience: 'internal', severity: 'info' },
  { code: RUNNING_CODES.ARCHETYPE_POST_V1, categories: ['feasibility'], params: { archetype: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.ARCHETYPE_UNKNOWN, categories: ['technical'], params: { archetypeId: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.HOLD_OR_RESTORE_ONLY, categories: ['adaptation'], params: { capability: S }, audience: 'user', severity: 'notice' },
  { code: RUNNING_CODES.HYBRID_PLANNER_UNAVAILABLE, categories: ['feasibility'], params: { capability: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.PRESCRIPTION_NOT_IMPLEMENTED, categories: ['information'], params: { archetype: S, wave: S }, audience: 'internal', severity: 'info' },
  { code: RUNNING_CODES.DOSE_ANCHOR_SELECTED, categories: ['information'], params: { archetype: S, sessionId: S, realizedDurationS: N, feedbackKnown: B }, audience: 'internal', severity: 'info' },
  { code: RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE, categories: ['feasibility'], params: { archetype: S, cause: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.SIMULATION_REQUIRED, categories: ['business_hard'], params: { mode: S }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.SIMULATED_PROPOSAL, categories: ['information'], params: { rulesetVersion: S }, audience: 'internal', severity: 'warning' },
  { code: RUNNING_CODES.EXERCISE_UNAVAILABLE, categories: ['feasibility'], params: { cause: S, candidates: L }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.TIME_EXCEEDED, categories: ['feasibility'], params: { archetype: S, availableTimeS: N, estimatedMaxS: N }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.QUALITY_GUARD_FAILED, categories: ['feasibility', 'safety'], params: { archetype: S, rule: S, detail: S }, audience: 'user', severity: 'error' },
  { code: RUNNING_CODES.STRUCTURE_UNAVAILABLE, categories: ['feasibility'], params: { archetype: S, sessionId: S, cause: S }, audience: 'user', severity: 'error' },
  { code: RUNNING_CODES.FAMILY_AMBIGUOUS, categories: ['feasibility'], params: { archetype: S, families: L }, audience: 'internal', severity: 'error' },
  { code: RUNNING_CODES.DOSE_ANCHOR_FALLBACK, categories: ['adaptation'], params: { archetype: S, sessionId: S, negativeSessionIds: L }, audience: 'user', severity: 'notice' },
  { code: RUNNING_CODES.PROGRESSION_STEP_APPLIED, categories: ['adaptation'], params: { archetype: S, variable: S, from: N, to: N, parameterId: S }, audience: 'user', severity: 'info' },
  { code: RUNNING_CODES.PROGRESSION_HOLD, categories: ['adaptation'], params: { archetype: S, cause: S }, audience: 'user', severity: 'info' },
  { code: RUNNING_CODES.HIGH_DEMAND_DEFAULT_CONSERVATIVE, categories: ['information'], params: { archetype: S, parameterId: S }, audience: 'internal', severity: 'notice' },
];

export const runningReasons = createCoreRegistry(RUNNING_REASON_CODES);
