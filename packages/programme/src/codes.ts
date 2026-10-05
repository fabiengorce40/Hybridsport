/**
 * Reason codes du Programme Engine — extension du registre du CORE (domaines existants). Chaque décision longitudinale
 * porte un code et ses paramètres (données utilisées, politique, version) ; aucun texte.
 */
import { createCoreRegistry } from '@hybridsport/engine';
import type { ReasonCodeDefinition } from '@hybridsport/engine';

const S = 'string' as const;
const N = 'number' as const;
const L = 'string[]' as const;

export const PG_CODES = {
  DEFINITION_INVALID: 'GOAL.PROGRAMME.DEFINITION_INVALID',
  WEEK_OUT_OF_HORIZON: 'PLAN.PROGRAMME.WEEK_OUT_OF_HORIZON',
  WEEK_NOT_PLANNABLE: 'PLAN.PROGRAMME.WEEK_NOT_PLANNABLE',
  WEEK_PLANNED: 'PLAN.PROGRAMME.WEEK_PLANNED',
  WEEK_NOT_OVER: 'PLAN.PROGRAMME.WEEK_NOT_OVER',
  RESULT_UNKNOWN_REQUEST: 'DATA.PROGRAMME.RESULT_UNKNOWN_REQUEST',
  RESULT_DUPLICATE: 'DATA.PROGRAMME.RESULT_DUPLICATE',
  MISSED_DERIVED: 'ADAPT.PROGRAMME.MISSED_DERIVED',
  PARAMETER_UNAVAILABLE: 'RULE.PROGRAMME.PARAMETER_UNAVAILABLE',
  CANDIDATE_VALUE_USED: 'DATA.PROGRAMME.CANDIDATE_VALUE_USED',
  DECISION: 'ADAPT.PROGRAMME.DECISION',
  DECISION_BLOCKED: 'ADAPT.PROGRAMME.DECISION_BLOCKED',
  NO_VARIANT_DECLARED: 'ADAPT.PROGRAMME.NO_VARIANT_DECLARED',
  ASSESSMENT_REQUESTED: 'PROGRESSION.PROGRAMME.ASSESSMENT_REQUESTED',
  /** Évaluation demandée par l'UTILISATEUR (même contenu déclaré, même mécanisme). */
  ASSESSMENT_USER_REQUESTED: 'PROGRESSION.PROGRAMME.ASSESSMENT_USER_REQUESTED',
  /** Demande d'évaluation refusée (semaine non admissible, évaluation déjà ouverte, contenu non déclaré). */
  ASSESSMENT_REQUEST_REFUSED: 'PROGRESSION.PROGRAMME.ASSESSMENT_REQUEST_REFUSED',
  ASSESSMENT_CONTENT_UNAVAILABLE: 'PROGRESSION.PROGRAMME.ASSESSMENT_CONTENT_UNAVAILABLE',
  ASSESSMENT_COMPLETED: 'PROGRESSION.PROGRAMME.ASSESSMENT_COMPLETED',
  ASSESSMENT_RESULT_MISSING: 'PROGRESSION.PROGRAMME.ASSESSMENT_RESULT_MISSING',
  ASSESSMENT_NOT_PLANNED: 'PROGRESSION.PROGRAMME.ASSESSMENT_NOT_PLANNED',
} as const;

export const PG_REASON_CODES: readonly ReasonCodeDefinition[] = [
  { code: PG_CODES.DEFINITION_INVALID, categories: ['technical'], params: { path: S, problem: S }, audience: 'user', severity: 'error' },
  { code: PG_CODES.WEEK_OUT_OF_HORIZON, categories: ['feasibility'], params: { weekIndex: N, horizonWeeks: N }, audience: 'user', severity: 'error' },
  { code: PG_CODES.WEEK_NOT_PLANNABLE, categories: ['feasibility'], params: { weekIndex: N, status: S }, audience: 'user', severity: 'error' },
  { code: PG_CODES.WEEK_PLANNED, categories: ['information'], params: { weekIndex: N, weekStart: S, planned: N, requested: N }, audience: 'internal', severity: 'info' },
  { code: PG_CODES.WEEK_NOT_OVER, categories: ['feasibility'], params: { weekIndex: N, pending: L }, audience: 'user', severity: 'error' },
  { code: PG_CODES.RESULT_UNKNOWN_REQUEST, categories: ['technical'], params: { requestId: S }, audience: 'internal', severity: 'error' },
  { code: PG_CODES.RESULT_DUPLICATE, categories: ['technical'], params: { requestId: S }, audience: 'internal', severity: 'error' },
  { code: PG_CODES.MISSED_DERIVED, categories: ['information'], params: { requestId: S, date: S }, audience: 'internal', severity: 'info' },
  { code: PG_CODES.PARAMETER_UNAVAILABLE, categories: ['business_hard'], params: { parameterId: S, cause: S, mode: S }, audience: 'internal', severity: 'error' },
  { code: PG_CODES.CANDIDATE_VALUE_USED, categories: ['information'], params: { parameterId: S, status: S }, audience: 'internal', severity: 'warning' },
  { code: PG_CODES.DECISION, categories: ['adaptation'], params: { sport: S, decision: S, policyId: S, policyVersion: S, rule: N }, audience: 'internal', severity: 'info' },
  { code: PG_CODES.DECISION_BLOCKED, categories: ['adaptation'], params: { sport: S, cause: S }, audience: 'internal', severity: 'warning' },
  { code: PG_CODES.NO_VARIANT_DECLARED, categories: ['information'], params: { sport: S, decision: S }, audience: 'internal', severity: 'info' },
  { code: PG_CODES.ASSESSMENT_REQUESTED, categories: ['information'], params: { sport: S, assessmentId: S, weekIndex: N }, audience: 'user', severity: 'info' },
  { code: PG_CODES.ASSESSMENT_USER_REQUESTED, categories: ['information'], params: { sport: S, assessmentId: S, weekIndex: N }, audience: 'user', severity: 'info' },
  { code: PG_CODES.ASSESSMENT_REQUEST_REFUSED, categories: ['feasibility'], params: { sport: S, cause: S }, audience: 'user', severity: 'warning' },
  { code: PG_CODES.ASSESSMENT_CONTENT_UNAVAILABLE, categories: ['feasibility'], params: { sport: S, assessmentId: S }, audience: 'user', severity: 'warning' },
  { code: PG_CODES.ASSESSMENT_COMPLETED, categories: ['information'], params: { sport: S, assessmentId: S, requestId: S }, audience: 'user', severity: 'info' },
  { code: PG_CODES.ASSESSMENT_RESULT_MISSING, categories: ['information'], params: { sport: S, assessmentId: S }, audience: 'user', severity: 'warning' },
  { code: PG_CODES.ASSESSMENT_NOT_PLANNED, categories: ['feasibility'], params: { sport: S, assessmentId: S, category: S }, audience: 'user', severity: 'warning' },
];

export const pgReasons = createCoreRegistry(PG_REASON_CODES);
