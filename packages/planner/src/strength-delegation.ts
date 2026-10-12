/**
 * C4.2 — CONTRAT DE DÉLÉGATION D'UN BLOC DE FORCE PAR LE PLANIFICATEUR (orientations S1 / A1 validées).
 *
 *   1. Un moteur (Cross-training) EXPRIME un besoin de travail de force (stimulus qui l'exige) — il n'en prescrit aucun.
 *   2. Le planificateur SOLLICITE Strength pour un bloc compatible (budget de temps, structures à protéger).
 *   3. Strength reste PROPRIÉTAIRE des exercices, séries, répétitions, repos, charges et progressions.
 *   4. Le planificateur ASSEMBLE les blocs (force → bloc principal) et vérifie leur cohérence (interférence).
 *   5. Le CORE valide la séance assemblée et sa durée.
 *
 * Aucun import entre moteurs : seul le planificateur connaît les deux ports. État actuel : Strength ne compose que des
 * séances ENTIÈRES (archétypes ≥ 20 min, avec leur propre préparation) — il ne sait pas produire un bloc isolé. La
 * délégation est donc NON RÉSOLUE, avec la liste des règles manquantes ; aucune prescription de force n'est inventée.
 */
import type { ReasonCode } from '@hybridsport/domain';
import { GP_CODES, gpReasons } from './codes.js';

/** Besoin exprimé (aucune valeur sportive : budget et structures viendront de règles gouvernées encore absentes). */
export interface StrengthBlockRequest {
  readonly requester: 'crosstraining';
  readonly requestId: string;
  readonly purpose: 'strength_before_conditioning';
}

/** Capacité DÉCLARÉE par un port Strength ; absente ⇒ aucun bloc isolé (fail-closed). */
export interface StrengthBlockCapability { readonly composesIsolatedBlock?: boolean }

/**
 * Règles manquantes pour résoudre la délégation (propriétaire entre crochets) — liste fermée, documentée dans
 * docs/kairo/C4.2-CROSSTRAINING.md.
 */
export const STRENGTH_DELEGATION_MISSING_RULES = [
  'strength.blockMode', // [Strength] archétype « bloc » : 1 besoin principal, budget de temps, sans préparation propre
  'ct.strengthNeed', // [Cross-training] intention de force par stimulus (patterns, intensité relative) et budget
  'planner.intraSessionInterference', // [Planificateur] ordre force → conditionnement, structures à protéger dans la séance
  'strength.weeklyVolumeAccounting', // [Strength] prise en compte du bloc dans le volume et la progression hebdomadaires
  'app.strengthBlockExecution', // [App] exécution et enregistrement des séries du bloc dans l'historique Strength
] as const;

export type StrengthBlockOutcome = { readonly status: 'UNRESOLVED'; readonly cause: 'STRENGTH_BLOCK_MODE_UNAVAILABLE' | 'DELEGATION_RULES_MISSING'; readonly reasons: readonly ReasonCode[] };

/** Délégation : NON RÉSOLUE tant que les règles manquent (même si un port déclarait un jour le mode bloc). */
export function delegateStrengthBlock(req: StrengthBlockRequest, strength: StrengthBlockCapability | undefined): StrengthBlockOutcome {
  const cause = strength?.composesIsolatedBlock === true ? 'DELEGATION_RULES_MISSING' : 'STRENGTH_BLOCK_MODE_UNAVAILABLE';
  const missingRules = strength?.composesIsolatedBlock === true ? STRENGTH_DELEGATION_MISSING_RULES.filter((r) => r !== 'strength.blockMode') : [...STRENGTH_DELEGATION_MISSING_RULES];
  return { status: 'UNRESOLVED', cause, reasons: [gpReasons.emit(GP_CODES.STRENGTH_DELEGATION_UNRESOLVED, { requester: req.requester, requestId: req.requestId, purpose: req.purpose, cause, missingRules })] };
}

/** Le refus d'un moteur exprime-t-il un besoin de force délégable ? (cause tracée par Cross-training C3). */
export function expressesStrengthNeed(reasons: readonly ReasonCode[]): boolean {
  return reasons.some((r) => r.params.cause === 'STRENGTH_ENGINE_DELEGATION_UNAVAILABLE' && (r.params.kind === 'strength' || r.params.block === 'strength'));
}
