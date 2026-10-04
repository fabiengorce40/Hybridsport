/**
 * Reason codes du CrossTrainingEngine — extension du registre du CORE, domaines existants uniquement.
 * Chaque refus a son code propre ; aucun texte (les messages sont des gabarits localisés côté application).
 */
import { createCoreRegistry } from '@hybridsport/engine';
import type { ReasonCodeDefinition } from '@hybridsport/engine';

const S = 'string' as const;
const L = 'string[]' as const;

export const CT_CODES = {
  UNRESOLVED_PARAMETER: 'RULE.CROSSTRAINING.UNRESOLVED_PARAMETER',
  CANDIDATE_VALUE_USED: 'DATA.CROSSTRAINING.CANDIDATE_VALUE_USED',
  CAPABILITY_DISABLED: 'SCOPE.CROSSTRAINING.CAPABILITY_DISABLED',
  G1_POLICY_UNSIGNED: 'SAFETY.CROSSTRAINING.G1_POLICY_UNSIGNED',
  TECHNICAL_DEPENDENCY: 'RULE.CROSSTRAINING.TECHNICAL_DEPENDENCY',
  HYBRID_PLANNER_UNAVAILABLE: 'SCOPE.CROSSTRAINING.HYBRID_PLANNER_UNAVAILABLE',
  ARCHETYPE_UNKNOWN: 'PLAN.CROSSTRAINING.ARCHETYPE_UNKNOWN',
  DOSE_SOURCE_UNAVAILABLE: 'DOSE.CROSSTRAINING.DOSE_SOURCE_UNAVAILABLE',
  PRESCRIPTION_NOT_IMPLEMENTED: 'PLAN.CROSSTRAINING.PRESCRIPTION_NOT_IMPLEMENTED',
  SIMULATION_REQUIRED: 'RULE.CROSSTRAINING.SIMULATION_REQUIRED',
  MOVEMENT_LOAD_UNREPRESENTABLE: 'SCOPE.CROSSTRAINING.MOVEMENT_LOAD_UNREPRESENTABLE',
  FORMAT_ADMISSIBILITY_UNRESOLVED: 'RULE.CROSSTRAINING.FORMAT_ADMISSIBILITY_UNRESOLVED',
  // C2
  RETURN_NOT_SUPPORTED: 'SAFETY.CROSSTRAINING.RETURN_NOT_SUPPORTED',
  BOOTSTRAP_UNAVAILABLE: 'DOSE.CROSSTRAINING.BOOTSTRAP_UNAVAILABLE',
  MOVEMENT_INELIGIBLE: 'SAFETY.CROSSTRAINING.MOVEMENT_INELIGIBLE',
  REPLAY_SOURCE_INADMISSIBLE: 'DOSE.CROSSTRAINING.REPLAY_SOURCE_INADMISSIBLE',
  VOLUME_GUARD_REQUIRED: 'SAFETY.CROSSTRAINING.VOLUME_GUARD_REQUIRED',
  C2_PROPOSED: 'PLAN.CROSSTRAINING.C2_PROPOSED',
  C2_MODIFIED_BY_CORE: 'RULE.CROSSTRAINING.C2_MODIFIED_BY_CORE',
} as const;
export type CtCode = (typeof CT_CODES)[keyof typeof CT_CODES];

export const CT_REASON_CODES: readonly ReasonCodeDefinition[] = [
  { code: CT_CODES.UNRESOLVED_PARAMETER, categories: ['technical', 'business_hard'], params: { parameterId: S, cause: S, mode: S }, audience: 'internal', severity: 'error' },
  { code: CT_CODES.CANDIDATE_VALUE_USED, categories: ['information'], params: { parameterId: S, maturity: S }, audience: 'internal', severity: 'warning' },
  { code: CT_CODES.CAPABILITY_DISABLED, categories: ['feasibility', 'information'], params: { capability: S, cause: S, blockers: L }, audience: 'internal', severity: 'notice' },
  { code: CT_CODES.G1_POLICY_UNSIGNED, categories: ['safety'], params: { policyId: S }, audience: 'internal', severity: 'error' },
  { code: CT_CODES.TECHNICAL_DEPENDENCY, categories: ['technical'], params: { dependencyId: S }, audience: 'internal', severity: 'error' },
  { code: CT_CODES.HYBRID_PLANNER_UNAVAILABLE, categories: ['feasibility'], params: { cause: S }, audience: 'user', severity: 'error' },
  { code: CT_CODES.ARCHETYPE_UNKNOWN, categories: ['technical'], params: { archetypeId: S }, audience: 'internal', severity: 'error' },
  { code: CT_CODES.DOSE_SOURCE_UNAVAILABLE, categories: ['feasibility'], params: { stimulus: S, capabilities: L }, audience: 'user', severity: 'error' },
  { code: CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED, categories: ['information'], params: { stimulus: S, wave: S }, audience: 'internal', severity: 'info' },
  { code: CT_CODES.SIMULATION_REQUIRED, categories: ['business_hard'], params: { mode: S }, audience: 'internal', severity: 'error' },
  { code: CT_CODES.MOVEMENT_LOAD_UNREPRESENTABLE, categories: ['feasibility'], params: { exerciseId: S, loadModel: S }, audience: 'internal', severity: 'error' },
  { code: CT_CODES.FORMAT_ADMISSIBILITY_UNRESOLVED, categories: ['business_hard'], params: { stimulus: S, format: S, parameterId: S }, audience: 'internal', severity: 'error' },
  { code: CT_CODES.RETURN_NOT_SUPPORTED, categories: ['safety'], params: { returnState: S }, audience: 'user', severity: 'error' },
  { code: CT_CODES.BOOTSTRAP_UNAVAILABLE, categories: ['feasibility'], params: { cause: S, entries: L }, audience: 'user', severity: 'error' },
  { code: CT_CODES.MOVEMENT_INELIGIBLE, categories: ['safety', 'feasibility'], params: { exerciseId: S, causes: L }, audience: 'user', severity: 'error' },
  { code: CT_CODES.REPLAY_SOURCE_INADMISSIBLE, categories: ['feasibility'], params: { sessionId: S, causes: L }, audience: 'user', severity: 'error' },
  { code: CT_CODES.VOLUME_GUARD_REQUIRED, categories: ['safety'], params: { parameterId: S }, audience: 'internal', severity: 'error' },
  { code: CT_CODES.C2_PROPOSED, categories: ['information'], params: { source: S, exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: CT_CODES.C2_MODIFIED_BY_CORE, categories: ['business_hard'], params: { sessionId: S }, audience: 'internal', severity: 'error' },
];

export const ctReasons = createCoreRegistry(CT_REASON_CODES);
