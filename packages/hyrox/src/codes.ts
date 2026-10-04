/**
 * Reason codes du moteur HYROX (`hybrid_race`) — extension du registre du CORE, domaines existants uniquement.
 * Chaque refus a son code propre ; aucun texte (gabarits localisés côté application).
 */
import { createCoreRegistry } from '@hybridsport/engine';
import type { ReasonCodeDefinition } from '@hybridsport/engine';

const S = 'string' as const;
const L = 'string[]' as const;

export const HR_CODES = {
  ARCHETYPE_UNKNOWN: 'PLAN.HYROX.ARCHETYPE_UNKNOWN',
  HYBRID_PLANNER_UNAVAILABLE: 'SCOPE.HYROX.HYBRID_PLANNER_UNAVAILABLE',
  SIMULATION_REQUIRED: 'RULE.HYROX.SIMULATION_REQUIRED',
  PARAMETER_UNAVAILABLE: 'RULE.HYROX.PARAMETER_UNAVAILABLE',
  CANDIDATE_VALUE_USED: 'DATA.HYROX.CANDIDATE_VALUE_USED',
  RETURN_NOT_SUPPORTED: 'SAFETY.HYROX.RETURN_NOT_SUPPORTED',
  LEVEL_NOT_ELIGIBLE: 'SAFETY.HYROX.LEVEL_NOT_ELIGIBLE',
  STATION_DOSE_UNAVAILABLE: 'DOSE.HYROX.STATION_DOSE_UNAVAILABLE',
  LOAD_INVALID: 'DOSE.HYROX.LOAD_INVALID',
  MOVEMENT_INELIGIBLE: 'SAFETY.HYROX.MOVEMENT_INELIGIBLE',
  H1_PROPOSED: 'PLAN.HYROX.H1_PROPOSED',
  H1_MODIFIED_BY_CORE: 'RULE.HYROX.H1_MODIFIED_BY_CORE',
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
  { code: HR_CODES.LOAD_INVALID, categories: ['safety'], params: { exerciseId: S, cause: S }, audience: 'internal', severity: 'error' },
  { code: HR_CODES.MOVEMENT_INELIGIBLE, categories: ['safety', 'feasibility'], params: { exerciseId: S, causes: L }, audience: 'user', severity: 'error' },
  { code: HR_CODES.H1_PROPOSED, categories: ['information'], params: { stationId: S, exerciseId: S }, audience: 'internal', severity: 'info' },
  { code: HR_CODES.H1_MODIFIED_BY_CORE, categories: ['business_hard'], params: { sessionId: S }, audience: 'internal', severity: 'error' },
];

export const hrReasons = createCoreRegistry(HR_REASON_CODES);
