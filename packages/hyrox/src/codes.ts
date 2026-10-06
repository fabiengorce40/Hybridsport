/**
 * Reason codes du moteur HYROX (`hybrid_race`) — extension du registre du CORE, domaines existants uniquement.
 * Chaque refus a son code propre ; aucun texte (gabarits localisés côté application).
 */
import { createCoreRegistry } from '@hybridsport/engine';
import type { ReasonCodeDefinition } from '@hybridsport/engine';

const S = 'string' as const;
const L = 'string[]' as const;
const N = 'number' as const;

export const HR_CODES = {
  ARCHETYPE_UNKNOWN: 'PLAN.HYROX.ARCHETYPE_UNKNOWN',
  HYBRID_PLANNER_UNAVAILABLE: 'SCOPE.HYROX.HYBRID_PLANNER_UNAVAILABLE',
  SIMULATION_REQUIRED: 'RULE.HYROX.SIMULATION_REQUIRED',
  PARAMETER_UNAVAILABLE: 'RULE.HYROX.PARAMETER_UNAVAILABLE',
  CANDIDATE_VALUE_USED: 'DATA.HYROX.CANDIDATE_VALUE_USED',
  RETURN_NOT_SUPPORTED: 'SAFETY.HYROX.RETURN_NOT_SUPPORTED',
  LEVEL_NOT_ELIGIBLE: 'SAFETY.HYROX.LEVEL_NOT_ELIGIBLE',
  STATION_DOSE_UNAVAILABLE: 'DOSE.HYROX.STATION_DOSE_UNAVAILABLE',
  STATION_NOT_REQUESTED: 'PLAN.HYROX.STATION_NOT_REQUESTED',
  LOAD_INVALID: 'DOSE.HYROX.LOAD_INVALID',
  MOVEMENT_INELIGIBLE: 'SAFETY.HYROX.MOVEMENT_INELIGIBLE',
  H1_PROPOSED: 'PLAN.HYROX.H1_PROPOSED',
  H1_MODIFIED_BY_CORE: 'RULE.HYROX.H1_MODIFIED_BY_CORE',
  // ——— H2 : composition de séance ———
  H2_PARAMETER_UNREADABLE: 'RULE.HYROX.H2_PARAMETER_UNREADABLE',
  H2_ROLE_UNAVAILABLE: 'SCOPE.HYROX.H2_ROLE_UNAVAILABLE',
  H2_INTENT: 'PLAN.HYROX.H2_INTENT',
  H2_GOAL_TRANSPORTED: 'PLAN.HYROX.H2_GOAL_TRANSPORTED',
  H2_SESSION_STRUCTURE: 'PLAN.HYROX.H2_SESSION_STRUCTURE',
  H2_BLOCK_NOT_GENERATED: 'PLAN.HYROX.H2_BLOCK_NOT_GENERATED',
  H2_STRUCTURE_UNAVAILABLE: 'SCOPE.HYROX.H2_STRUCTURE_UNAVAILABLE',
  H2_HISTORY: 'PLAN.HYROX.H2_HISTORY',
  H2_HISTORY_NEGATIVE: 'SAFETY.HYROX.H2_HISTORY_NEGATIVE',
  H2_NEIGHBOURS: 'PLAN.HYROX.H2_NEIGHBOURS',
  H2_STRUCTURE_REJECTED: 'PLAN.HYROX.H2_STRUCTURE_REJECTED',
  H2_STRUCTURE_CHOSEN: 'PLAN.HYROX.H2_STRUCTURE_CHOSEN',
  H2_NO_STRUCTURE: 'PLAN.HYROX.H2_NO_STRUCTURE',
  H2_CANDIDATES_REJECTED: 'PLAN.HYROX.H2_CANDIDATES_REJECTED',
  H2_STATION_SELECTED: 'PLAN.HYROX.H2_STATION_SELECTED',
  H2_RUN_COMPONENT: 'PLAN.HYROX.H2_RUN_COMPONENT',
  H2_DOSE: 'DOSE.HYROX.H2_DOSE',
  H2_TRANSITIONS: 'PLAN.HYROX.H2_TRANSITIONS',
  H2_DURATION: 'PLAN.HYROX.H2_DURATION',
  H2_ACCUMULATION: 'PLAN.HYROX.H2_ACCUMULATION',
  H2_REPEAT_UNAVOIDABLE: 'PLAN.HYROX.H2_REPEAT_UNAVOIDABLE',
  H2_PROPOSED: 'PLAN.HYROX.H2_PROPOSED',
  H2_MODIFIED_BY_CORE: 'RULE.HYROX.H2_MODIFIED_BY_CORE',
} as const;
export type HrCode = (typeof HR_CODES)[keyof typeof HR_CODES];

export const HR_REASON_CODES: readonly ReasonCodeDefinition[] = [
  { code: HR_CODES.ARCHETYPE_UNKNOWN, categories: ['technical'], params: { archetypeId: S }, audience: 'internal', severity: 'error' },
  { code: HR_CODES.HYBRID_PLANNER_UNAVAILABLE, categories: ['feasibility'], params: { cause: S }, audience: 'user', severity: 'error' },
  { code: HR_CODES.SIMULATION_REQUIRED, categories: ['business_hard'], params: { mode: S }, audience: 'internal', severity: 'error' },
  { code: HR_CODES.PARAMETER_UNAVAILABLE, categories: ['technical', 'business_hard'], params: { parameterId: S, cause: S, mode: S }, audience: 'internal', severity: 'error' },
  { code: HR_CODES.CANDIDATE_VALUE_USED, categories: ['information'], params: { parameterId: S, status: S }, audience: 'internal', severity: 'warning' },
  { code: HR_CODES.RETURN_NOT_SUPPORTED, categories: ['safety'], params: { returnState: S }, audience: 'user', severity: 'error' },
  { code: HR_CODES.LEVEL_NOT_ELIGIBLE, categories: ['safety'], params: { level: S }, audience: 'user', severity: 'error' },
  { code: HR_CODES.STATION_DOSE_UNAVAILABLE, categories: ['feasibility'], params: { stationId: S, cause: S }, audience: 'user', severity: 'error' },
  { code: HR_CODES.STATION_NOT_REQUESTED, categories: ['feasibility'], params: {}, audience: 'user', severity: 'error' },
  { code: HR_CODES.LOAD_INVALID, categories: ['safety'], params: { exerciseId: S, cause: S }, audience: 'internal', severity: 'error' },
  { code: HR_CODES.MOVEMENT_INELIGIBLE, categories: ['safety', 'feasibility'], params: { exerciseId: S, causes: L }, audience: 'user', severity: 'error' },
  { code: HR_CODES.H1_PROPOSED, categories: ['information'], params: { stationId: S, exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H1_MODIFIED_BY_CORE, categories: ['business_hard'], params: { sessionId: S }, audience: 'internal', severity: 'error' },
  { code: HR_CODES.H2_PARAMETER_UNREADABLE, categories: ['technical', 'business_hard'], params: { parameterId: S, detail: S }, audience: 'internal', severity: 'error' },
  { code: HR_CODES.H2_ROLE_UNAVAILABLE, categories: ['feasibility'], params: { role: S, cause: S }, audience: 'user', severity: 'error' },
  { code: HR_CODES.H2_INTENT, categories: ['information'], params: { role: S, specificity: S, level: S, availableTimeS: N, sportPriority: L, rank: N, neighbours: N }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_GOAL_TRANSPORTED, categories: ['information'], params: { goal: S, targetTime: S, interpretation: S }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_SESSION_STRUCTURE, categories: ['information'], params: { role: S, blocks: L }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_BLOCK_NOT_GENERATED, categories: ['information'], params: { kind: S, cause: S }, audience: 'internal', severity: 'notice' },
  { code: HR_CODES.H2_STRUCTURE_UNAVAILABLE, categories: ['feasibility'], params: { role: S, kind: S, cause: S }, audience: 'user', severity: 'error' },
  { code: HR_CODES.H2_HISTORY, categories: ['information'], params: { sameRole: N, planned: N, recentStations: L, lastStructure: S }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_HISTORY_NEGATIVE, categories: ['safety'], params: { sessionId: S, causes: L, action: S }, audience: 'internal', severity: 'notice' },
  { code: HR_CODES.H2_NEIGHBOURS, categories: ['information'], params: { known: S, neighbours: L, policy: S, priorityPolicy: S }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_STRUCTURE_REJECTED, categories: ['information'], params: { structure: S, causes: L }, audience: 'internal', severity: 'notice' },
  { code: HR_CODES.H2_STRUCTURE_CHOSEN, categories: ['information'], params: { structure: S, criteria: L }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_NO_STRUCTURE, categories: ['feasibility'], params: { role: S, tried: L }, audience: 'user', severity: 'error' },
  { code: HR_CODES.H2_CANDIDATES_REJECTED, categories: ['information'], params: { structure: S, rejected: L }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_STATION_SELECTED, categories: ['information'], params: { structure: S, position: N, stationId: S, exerciseId: S, criteria: L }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_RUN_COMPONENT, categories: ['information'], params: { exerciseId: S, distanceM: N, contexts: L, pace: S }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_DOSE, categories: ['information'], params: { exerciseId: S, quantity: S, load: S }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_TRANSITIONS, categories: ['information'], params: { count: N, durationS: S, estimate: S }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_DURATION, categories: ['information'], params: { structure: S, timeCapS: N, estimatedTypicalS: N, estimatedSlowS: N, kind: S }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_ACCUMULATION, categories: ['information'], params: { role: S, sharedStructures: L, status: S }, audience: 'internal', severity: 'notice' },
  { code: HR_CODES.H2_REPEAT_UNAVOIDABLE, categories: ['information'], params: { identicalLevels: L }, audience: 'internal', severity: 'notice' },
  { code: HR_CODES.H2_PROPOSED, categories: ['information'], params: { role: S, structure: S, stations: L }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H2_MODIFIED_BY_CORE, categories: ['business_hard'], params: { sessionId: S }, audience: 'internal', severity: 'error' },
];

export const hrReasons = createCoreRegistry(HR_REASON_CODES);
