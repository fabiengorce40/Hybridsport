/**
 * Modèle de dégradation sûre (phase 6B §O, contrat 5C §3) : toute capacité ou donnée manquante produit
 * une dégradation EXPLICITE (effet, capacité, paramètres, code de raison) ou un NO_VALID explicite.
 * Jamais de substitution silencieuse ; jamais une valeur inventée pour combler l'absence.
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { CapabilityId } from './capability-definitions.js';

export const DEGRADATION_EFFECTS = [
  /** Allure indisponible ⇒ précision réduite (effort). */
  'PRECISION_REDUCED',
  /** Modèle de performance indisponible ⇒ calibration requise. */
  'CALIBRATION_REQUIRED',
  /** Progression au-delà de l'historique indisponible ⇒ HOLD ou restauration seulement. */
  'HOLD_OR_RESTORE_ONLY',
  /** Première exposition non résolue ⇒ composant indisponible (séance retirée). */
  'COMPONENT_UNAVAILABLE',
  /** Objectif marathon sans règle ⇒ programmation générale, SANS prétention de préparation marathon. */
  'GENERAL_PROGRAM_WITHOUT_GOAL_CLAIM',
  /** Capacité requise indisponible sans alternative sûre ⇒ aucune proposition (NO_VALID). */
  'NO_VALID',
] as const;
export type DegradationEffect = (typeof DEGRADATION_EFFECTS)[number];

export interface Degradation {
  readonly effect: DegradationEffect;
  /** Ce qui a été demandé (archétype, objectif, cible…) et ce qui est retenu à la place. */
  readonly subject: string;
  readonly capability?: CapabilityId;
  readonly parameterIds: readonly string[];
  readonly reason: ReasonCode;
}

/** Ordre stable des dégradations (déterminisme de la trace). */
export function sortDegradations(ds: readonly Degradation[]): Degradation[] {
  const k = (d: Degradation): string => `${d.subject}|${d.effect}|${d.capability ?? ''}|${d.reason.code}`;
  const seen = new Set<string>();
  return [...ds].sort((a, b) => (k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0)).filter((d) => { const key = k(d); if (seen.has(key)) return false; seen.add(key); return true; });
}
