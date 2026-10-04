/**
 * Classification des refus des moteurs (aucune décision sportive) : seule une contrainte de CRÉNEAU — séance plus
 * longue que le temps disponible — peut être résolue en changeant de créneau, sans rien changer à la demande.
 * Sécurité, gouvernance, intention invalide ou autre refus : jamais de recherche opportuniste d'un autre jour.
 */
import type { ReasonCode } from '@hybridsport/domain';

export const REFUSAL_CLASSES = ['retryable_slot_constraint', 'safety_blocked', 'governance_blocked', 'invalid_intent', 'non_retryable_engine_refusal'] as const;
export type RefusalClass = (typeof REFUSAL_CLASSES)[number];

/** Codes signalant que la séance demandée dépasse le temps du créneau (CORE et moteurs) : liste fermée. */
export const SLOT_CONSTRAINT_CODES: ReadonlySet<string> = new Set(['PLAN.RUNNING.TIME_EXCEEDED', 'FEASIBILITY.TIME_EXCEEDED', 'DURATION.INFEASIBLE']);
const SAFETY = /^SAFETY\.|^REPAIR\.REST_RECOMMENDED$|^REPAIR\.(LOAD|PACE)_TRANSFER_REFUSED$/;
const GOVERNANCE = /HYBRID_PLANNER_UNAVAILABLE|CAPABILITY_DISABLED|G1_POLICY_UNSIGNED|^RULE\./;
const INVALID_INTENT = /^TECHNICAL\.SCHEMA_INVALID$|ARCHETYPE_UNKNOWN|STATION_NOT_REQUESTED|^PLAN\.PLANNER\.PROGRAMME_INTENT_INCOMPLETE$/;
/** Codes purement informatifs, sans cause de refus (ignorés pour le classement). */
const INFORMATIVE = /^DURATION\.ESTIMATED$|^DATA\.|^PLAN\.[A-Z]+\.(PROPOSED|PLACED)$/;

/** Ordre de priorité : sécurité > gouvernance > intention invalide > créneau (seule cause) > autre refus. */
export function classifyRefusal(reasons: readonly ReasonCode[]): RefusalClass {
  const causes = reasons.filter((r) => !INFORMATIVE.test(r.code));
  if (causes.some((r) => SAFETY.test(r.code))) return 'safety_blocked';
  if (causes.some((r) => GOVERNANCE.test(r.code))) return 'governance_blocked';
  if (causes.some((r) => INVALID_INTENT.test(r.code))) return 'invalid_intent';
  if (causes.length > 0 && causes.every((r) => SLOT_CONSTRAINT_CODES.has(r.code))) return 'retryable_slot_constraint';
  return 'non_retryable_engine_refusal';
}
