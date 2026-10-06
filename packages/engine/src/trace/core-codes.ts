import { STRUCTURE_ISSUES } from '@hybridsport/domain';
import type { ReasonCodeDefinition } from './registry.js';

const S = 'string' as const;
const N = 'number' as const;
const L = 'string[]' as const;

/**
 * Reason codes utilisés par le CORE (spec 10 §1). Les moteurs de discipline ajouteront
 * les leurs. Aucun texte ici : les textes seront des templates localisés.
 */
export const CORE_REASON_CODES: readonly ReasonCodeDefinition[] = [
  // SAFETY — protection
  { code: 'SAFETY.RESTRICTION_VIOLATED', categories: ['safety'], params: { restriction: S, exerciseId: S }, audience: 'user', severity: 'error' },
  { code: 'SAFETY.PAIN.ZONE_RESTRICTED', categories: ['safety'], params: { bodyArea: S, exerciseId: S, painLevel: S }, audience: 'user', severity: 'error' },
  { code: 'SAFETY.PAIN.MOVEMENT_RESTRICTED', categories: ['safety'], params: { movement: S, exerciseId: S }, audience: 'user', severity: 'error' },
  { code: 'SAFETY.PAIN.P4_INTERRUPTED', categories: ['safety'], params: { messageKey: S }, audience: 'user', severity: 'error' },
  { code: 'SAFETY.PROGRAM_PAUSED', categories: ['safety'], params: { cause: S }, audience: 'user', severity: 'error' },
  { code: 'SAFETY.MAX_EFFORT_NOT_ELIGIBLE', categories: ['safety'], params: { exerciseId: S, requiredLevel: S }, audience: 'user', severity: 'error' },
  { code: 'SAFETY.OVERRIDES_PREFERENCE', categories: ['safety'], params: { ruleId: S }, audience: 'user', severity: 'notice' },
  { code: 'SAFETY.RATCHET_LOOSENED', categories: ['safety'], params: { parameterId: S, baseline: S, value: S }, audience: 'internal', severity: 'error' },
  // FEASIBILITY — exécution réellement possible
  { code: 'FEASIBILITY.EQUIPMENT_MISSING', categories: ['feasibility'], params: { exerciseId: S, missing: L }, audience: 'user', severity: 'error' },
  { code: 'FEASIBILITY.TIME_EXCEEDED', categories: ['feasibility'], params: { p90S: N, availableS: N }, audience: 'user', severity: 'error' },
  { code: 'FEASIBILITY.DAY_UNAVAILABLE', categories: ['feasibility'], params: { date: S }, audience: 'user', severity: 'error' },
  { code: 'FEASIBILITY.USER_EXCLUSION', categories: ['feasibility'], params: { exerciseId: S }, audience: 'user', severity: 'error' },
  { code: 'FEASIBILITY.EXERCISE_UNAVAILABLE', categories: ['feasibility'], params: { exerciseId: S, status: S }, audience: 'internal', severity: 'error' },
  // TECHNICAL — intégrité du système
  { code: 'TECHNICAL.SCHEMA_INVALID', categories: ['technical'], params: { path: S, problem: S }, audience: 'internal', severity: 'error' },
  { code: 'TECHNICAL.UNKNOWN_REFERENCE', categories: ['technical'], params: { kind: S, id: S }, audience: 'internal', severity: 'error' },
  { code: 'TECHNICAL.NON_FINITE_VALUE', categories: ['technical'], params: { path: S }, audience: 'internal', severity: 'error' },
  { code: 'TECHNICAL.SERIALIZATION_MISMATCH', categories: ['technical'], params: { path: S }, audience: 'internal', severity: 'error' },
  { code: 'TECHNICAL.STRUCTURE_INVALID', categories: ['technical'], params: { problem: S, target: S }, audience: 'internal', severity: 'error' },
  { code: 'TECHNICAL.PARAMETER_MISSING', categories: ['technical'], params: { parameterId: S }, audience: 'internal', severity: 'error' },
  { code: 'TECHNICAL.PARAMETER_TYPE', categories: ['technical'], params: { parameterId: S, expected: S }, audience: 'internal', severity: 'error' },
  { code: 'TECHNICAL.RULESET_INVALID', categories: ['technical'], params: { path: S, problem: S }, audience: 'internal', severity: 'error' },
  { code: 'TECHNICAL.SCHEMA_VERSION_UNSUPPORTED', categories: ['technical'], params: { kind: S, version: N, current: N }, audience: 'internal', severity: 'error' },
  { code: 'TECHNICAL.MIGRATION_FAILED', categories: ['technical'], params: { kind: S, from: N, to: N, problem: S }, audience: 'internal', severity: 'error' },
  // CORE-EXT-R1 : un code explicite par anomalie structurelle (séance à profondeur fixe)
  ...STRUCTURE_ISSUES.map((issue): ReasonCodeDefinition => ({ code: `TECHNICAL.STRUCTURE.${issue}`, categories: ['technical'], params: { path: S }, audience: 'internal', severity: 'error' })),
  { code: 'TECHNICAL.CATALOG_INVALID', categories: ['technical'], params: { path: S, problem: S }, audience: 'internal', severity: 'error' },
  // RULE — règles métier (HARD ou SOFT selon la politique)
  { code: 'RULE.ENFORCEMENT', categories: ['business_hard', 'business_soft', 'information'], params: { rule: S, level: S, threshold: N, factors: L }, audience: 'internal', severity: 'info', optionalParams: ['threshold'] },
  { code: 'RULE.VIOLATION', categories: ['business_hard', 'business_soft'], params: { ruleId: S, detail: S }, audience: 'internal', severity: 'warning' },
  { code: 'RECOVERY.MIN_GAP_VIOLATION', categories: ['business_hard', 'business_soft'], params: { structure: S, gapHours: N, requiredHours: N }, audience: 'user', severity: 'warning' },
  // Optimisation (couche B)
  { code: 'SELECT.CANDIDATE_INADMISSIBLE', categories: ['optimization'], params: { candidateId: S, layers: L }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.DECIDED_AT_LEVEL', categories: ['optimization'], params: { winnerId: S, level: S, gap: N }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.ADHERENCE_TIEBREAK', categories: ['optimization'], params: { winnerId: S }, audience: 'user', severity: 'info' },
  { code: 'SELECT.TIE_BROKEN_BY_SEED', categories: ['optimization'], params: { winnerId: S, tiedWith: L }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.BLOCKING_NEED', categories: ['feasibility'], params: { slotId: S, need: S, engineId: S }, audience: 'internal', severity: 'error' },
  { code: 'DATA.MISSING_FOR_PROPOSAL', categories: ['information'], params: { key: S, engineId: S }, audience: 'internal', severity: 'info' },
  { code: 'SELECT.NO_ADMISSIBLE_CANDIDATE', categories: ['optimization'], params: { candidates: N }, audience: 'internal', severity: 'error' },
  // Durée
  { code: 'DURATION.ESTIMATED', categories: ['information'], params: { p50S: N, p90S: N }, audience: 'internal', severity: 'info' },
  { code: 'DURATION.ADJUSTED', categories: ['optimization'], params: { levers: L }, audience: 'user', severity: 'notice' },
  { code: 'DURATION.MAIN_VOLUME_REDUCED', categories: ['optimization'], params: { blockId: S }, audience: 'user', severity: 'warning' },
  { code: 'DURATION.SHORTER_ACCEPTED', categories: ['optimization'], params: { p50S: N, targetS: N }, audience: 'user', severity: 'info' },
  { code: 'DURATION.INFEASIBLE', categories: ['feasibility'], params: { p90S: N, availableS: N }, audience: 'internal', severity: 'error' },
  // CORE-EXT-R1 / Q2 : estimations stockées, recalculées et comparées ; jamais reconstruites
  { code: 'DURATION.ESTIMATE_MISMATCH', categories: ['technical'], params: { path: S, field: S, storedMinS: N, storedMaxS: N, recomputedMinS: N, recomputedMaxS: N }, audience: 'internal', severity: 'error', optionalParams: ['storedMinS', 'storedMaxS', 'recomputedMinS', 'recomputedMaxS'] },
  { code: 'DURATION.ESTIMATE_UNAVAILABLE_LEGACY', categories: ['information'], params: { kind: S }, audience: 'internal', severity: 'info' },
  { code: 'DURATION.ESTIMATE_UNVERIFIABLE', categories: ['technical'], params: { problem: S }, audience: 'internal', severity: 'error' },
  { code: 'DURATION.OUT_OF_TOLERANCE', categories: ['business_soft'], params: { p50S: N, lowerS: N, upperS: N }, audience: 'internal', severity: 'warning' },
  // Anti-doublon (spec 07 §4) — SOFT par défaut ; les cas HARD sont des règles de discipline avec fiche
  { code: 'DUPLICATE.ACCIDENTAL', categories: ['business_soft'], params: { sessionId: S, similarity: N, level: S }, audience: 'internal', severity: 'warning' },
  { code: 'DUPLICATE.PLANNED', categories: ['information'], params: { sessionId: S, intents: L }, audience: 'internal', severity: 'info' },
  { code: 'DUPLICATE.PLANNED_BUT_STAGNANT', categories: ['business_soft'], params: { sessionId: S, intent: S }, audience: 'internal', severity: 'warning' },
  { code: 'DUPLICATE.INTENT_NOT_DECLARED', categories: ['technical'], params: { intent: S }, audience: 'internal', severity: 'error' },
  // Adaptation (couche C)
  { code: 'ADAPT.KEPT_STABILITY', categories: ['adaptation'], params: { level: S, gain: N, threshold: N }, audience: 'user', severity: 'info', optionalParams: ['level'] },
  { code: 'ADAPT.CHANGED', categories: ['adaptation'], params: { cause: S, level: S, gain: N }, audience: 'user', severity: 'notice', optionalParams: ['level', 'gain'] },
  // Réparation
  { code: 'REPAIR.ACTION', categories: ['adaptation'], params: { action: S, target: S, attempt: N }, audience: 'internal', severity: 'info' },
  { code: 'REPAIR.REST_RECOMMENDED', categories: ['adaptation'], params: { cause: S }, audience: 'user', severity: 'notice' },
  { code: 'REPAIR.EXHAUSTED', categories: ['adaptation'], params: { attempts: N }, audience: 'internal', severity: 'error' },
  { code: 'REPAIR.LOAD_TRANSFER_REFUSED', categories: ['safety', 'adaptation'], params: { itemId: S, exerciseId: S, substituteId: S }, audience: 'internal', severity: 'error' },
  { code: 'REPAIR.PACE_TRANSFER_REFUSED', categories: ['safety', 'adaptation'], params: { itemId: S, exerciseId: S, substituteId: S }, audience: 'internal', severity: 'error' },
  // Périmètre et données
  { code: 'SCOPE.OUT_OF_SCOPE', categories: ['safety'], params: { eligibility: S }, audience: 'user', severity: 'error' },
  { code: 'SCOPE.DECLARATION_REQUIRED', categories: ['safety'], params: { declarationKind: S }, audience: 'user', severity: 'error' },
  { code: 'DATA.READINESS_UNKNOWN', categories: ['information'], params: {}, audience: 'internal', severity: 'info' },
  { code: 'DATA.DEMAND_REPETITION_UNRESOLVED', categories: ['information'], params: { sessionId: S, blockId: S, format: S, cause: S }, audience: 'internal', severity: 'notice' },
  { code: 'DATA.DEMAND_PROFILE_UNAVAILABLE', categories: ['information'], params: { sessionId: S, cause: S, detail: S }, audience: 'internal', severity: 'warning' },
  { code: 'DATA.HEALTH_HISTORY_UNAVAILABLE', categories: ['information'], params: {}, audience: 'internal', severity: 'info' },
  { code: 'DATA.NOT_PERSISTED_NO_CONSENT', categories: ['information'], params: {}, audience: 'internal', severity: 'info' },
  { code: 'DATA.PERFORMANCE_EXCLUDED', categories: ['information'], params: { reason: S }, audience: 'internal', severity: 'info' },
];
