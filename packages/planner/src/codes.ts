/**
 * Reason codes du Global Planner — extension du registre du CORE (domaines existants). Chaque décision du planificateur
 * (placement, refus, créneau vide, conflit d'interférence) porte un code propre ; aucun texte.
 */
import { createCoreRegistry } from '@hybridsport/engine';
import type { ReasonCodeDefinition } from '@hybridsport/engine';

const S = 'string' as const;
const N = 'number' as const;
const L = 'string[]' as const;

export const GP_CODES = {
  /** Sport demandé sans moteur raccordé (aucun port fourni). */
  ENGINE_UNAVAILABLE: 'SCOPE.PLANNER.ENGINE_UNAVAILABLE',
  /** Plus aucun jour libre disponible pour cette demande (une séance par jour au plus : P3). */
  NOT_ENOUGH_DAYS: 'PLAN.PLANNER.NOT_ENOUGH_DAYS',
  /** Le moteur de la discipline a refusé la séance : ses raisons suivent, inchangées. */
  ENGINE_REFUSED: 'PLAN.PLANNER.ENGINE_REFUSED',
  /** Paramètre de gouvernance du planificateur indisponible pour ce mode. */
  PARAMETER_UNAVAILABLE: 'RULE.PLANNER.PARAMETER_UNAVAILABLE',
  CANDIDATE_VALUE_USED: 'DATA.PLANNER.CANDIDATE_VALUE_USED',
  /** Structures sollicitées d'une séance non dérivables (table de dérivation du ruleset de la discipline absente). */
  STRUCTURES_UNAVAILABLE: 'DATA.PLANNER.STRUCTURES_UNAVAILABLE',
  /** Conflit : la séance X (discipline A) et la séance Y (discipline B) sollicitent la structure S trop près, selon la règle R. */
  INTERFERENCE_CONFLICT: 'RECOVERY.PLANNER.INTERFERENCE_CONFLICT',
  /** Aucun jour sans conflit d'interférence : la demande n'est pas placée. */
  INTERFERENCE_UNRESOLVED: 'PLAN.PLANNER.INTERFERENCE_UNRESOLVED',
  /** Séance placée. */
  PLACED: 'PLAN.PLANNER.PLACED',
  /** Intention de programme incomplète pour ce sport (champs manquants) : le planificateur n'en invente aucun. */
  PROGRAMME_INTENT_INCOMPLETE: 'PLAN.PLANNER.PROGRAMME_INTENT_INCOMPLETE',
  /** Contexte voisin transmis au moteur (profils de demande des séances voisines d'autres disciplines). */
  NEIGHBOUR_CONTEXT: 'PLAN.PLANNER.NEIGHBOUR_CONTEXT',
  /** Profil de demande non utilisable dans ce mode (normalisation des doses non approuvée en production). */
  DEMAND_PROFILE_NOT_APPROVED: 'RULE.PLANNER.DEMAND_PROFILE_NOT_APPROVED',
  /** Refus du moteur dû au SEUL créneau (trop court) : même demande essayée sur un créneau plus long. */
  SLOT_RETRY: 'PLAN.PLANNER.SLOT_RETRY',
  /** Composition hebdomadaire du MOTEUR appliquée (autorité : approved | provisional). */
  COMPOSITION_APPLIED: 'PLAN.PLANNER.COMPOSITION_APPLIED',
  /** Composition demandée au moteur mais non gouvernée dans ce mode : aucune composition inventée. */
  COMPOSITION_UNRESOLVED: 'RULE.PLANNER.COMPOSITION_UNRESOLVED',
  /** Appel multisport d'un moteur sans provenance du planificateur global : refusé. */
  PROVENANCE_REQUIRED: 'SCOPE.PLANNER.PROVENANCE_REQUIRED',
  /** Jour sans séance : indisponible (0 min) ou aucune demande restante. */
  DAY_EMPTY: 'PLAN.PLANNER.DAY_EMPTY',
} as const;

export const GP_REASON_CODES: readonly ReasonCodeDefinition[] = [
  { code: GP_CODES.ENGINE_UNAVAILABLE, categories: ['feasibility'], params: { sport: S }, audience: 'user', severity: 'error' },
  { code: GP_CODES.NOT_ENOUGH_DAYS, categories: ['feasibility'], params: { sport: S, requestId: S }, audience: 'user', severity: 'error' },
  { code: GP_CODES.ENGINE_REFUSED, categories: ['feasibility'], params: { sport: S, requestId: S, date: S }, audience: 'user', severity: 'error' },
  { code: GP_CODES.PARAMETER_UNAVAILABLE, categories: ['technical', 'business_hard'], params: { parameterId: S, cause: S, mode: S }, audience: 'internal', severity: 'error' },
  { code: GP_CODES.CANDIDATE_VALUE_USED, categories: ['information'], params: { parameterId: S, status: S }, audience: 'internal', severity: 'warning' },
  { code: GP_CODES.STRUCTURES_UNAVAILABLE, categories: ['technical'], params: { sport: S, cause: S }, audience: 'internal', severity: 'error' },
  { code: GP_CODES.INTERFERENCE_CONFLICT, categories: ['business_hard'], params: { sport: S, date: S, withSport: S, withDate: S, structure: S, gapHours: N, rule: S }, audience: 'user', severity: 'warning' },
  { code: GP_CODES.INTERFERENCE_UNRESOLVED, categories: ['feasibility'], params: { sport: S, requestId: S, triedDates: L }, audience: 'user', severity: 'error' },
  { code: GP_CODES.PLACED, categories: ['information'], params: { sport: S, requestId: S, date: S }, audience: 'internal', severity: 'info' },
  { code: GP_CODES.PROGRAMME_INTENT_INCOMPLETE, categories: ['feasibility'], params: { sport: S, missing: L }, audience: 'user', severity: 'error' },
  { code: GP_CODES.NEIGHBOUR_CONTEXT, categories: ['information'], params: { requestId: S, known: S, neighbours: N, unknown: L }, audience: 'internal', severity: 'info' },
  { code: GP_CODES.DEMAND_PROFILE_NOT_APPROVED, categories: ['business_hard'], params: { sport: S, parameterId: S, mode: S }, audience: 'internal', severity: 'warning' },
  { code: GP_CODES.SLOT_RETRY, categories: ['information'], params: { sport: S, requestId: S, fromDate: S, fromMinutes: N, causes: L }, audience: 'internal', severity: 'info' },
  { code: GP_CODES.COMPOSITION_APPLIED, categories: ['information'], params: { sport: S, authority: S, role: S, archetypeId: S }, audience: 'internal', severity: 'info' },
  { code: GP_CODES.COMPOSITION_UNRESOLVED, categories: ['business_hard'], params: { sport: S, mode: S }, audience: 'user', severity: 'error' },
  { code: GP_CODES.PROVENANCE_REQUIRED, categories: ['business_hard'], params: { engineId: S }, audience: 'internal', severity: 'error' },
  { code: GP_CODES.DAY_EMPTY, categories: ['information'], params: { date: S, cause: S }, audience: 'internal', severity: 'info' },
];

export const gpReasons = createCoreRegistry(GP_REASON_CODES);
