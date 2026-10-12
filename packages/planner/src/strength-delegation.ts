/**
 * C4.2 / C4.3 — DÉLÉGATION D'UN BLOC DE FORCE PAR LE PLANIFICATEUR (orientations S1 / A1 validées).
 *
 *   1. Cross-training EXPRIME un besoin de force (`C4_STRENGTH_NEED` : budget, objectif) — il n'en prescrit aucun.
 *   2. Le planificateur SOLLICITE le port Strength en MODE BLOC (archétype `usage: 'block'`, budget de temps, séances
 *      Strength de la semaine transmises pour le volume hebdomadaire).
 *   3. Strength reste PROPRIÉTAIRE des exercices, séries, répétitions, repos, intensités et charges.
 *   4. Le planificateur dérive les structures sollicitées par le bloc (table gouvernée du ruleset Strength) et transmet
 *      au Cross-training celles que le conditionnement ne doit PAS solliciter dans la même séance (règle
 *      `planner.intraSessionInterference`, TEST_ONLY), puis le bloc tel quel (ordre : force → conditionnement).
 *   5. Le CORE valide la séance assemblée (pipeline Cross-training) et sa durée.
 *
 * Aucun import entre moteurs : seul le planificateur connaît les deux ports. Toute règle absente (règle de délégation
 * non fournie, Strength qui refuse, Cross-training qui refuse avec le bloc) ⇒ délégation NON RÉSOLUE, tracée, et la
 * séance reste refusée comme en C4.2 (aucune prescription de force inventée, jamais deux séances fusionnées).
 */
import type { ReasonCode } from '@hybridsport/domain';
import { GP_CODES, gpReasons } from './codes.js';
import type { DeclaredIntent, PlannerMode } from './model.js';

/** Besoin exprimé par le moteur demandeur (aucune valeur sportive côté planificateur). */
export interface StrengthBlockRequest {
  readonly requester: 'crosstraining';
  readonly requestId: string;
  readonly purpose: 'strength_before_conditioning';
}

/** Capacité DÉCLARÉE par un port Strength ; absente ⇒ aucun bloc isolé (fail-closed). */
export interface StrengthBlockCapability { readonly composesIsolatedBlock?: boolean }

/**
 * C4.3 — règle de délégation (TEST_ONLY, fournie par l'environnement, jamais devinée) : intention Strength du bloc
 * (archétype de bloc), mode de lecture de la demande, niveaux de demande d'une structure du bloc qui l'excluent du
 * conditionnement de la même séance (`planner.intraSessionInterference`).
 */
export interface StrengthBlockRule {
  readonly ruleId: string;
  readonly status: 'TEST_ONLY';
  readonly intent: DeclaredIntent;
  readonly mode: PlannerMode;
  readonly excludeConditioningAtLevels: readonly string[];
  /** Le bloc doit contenir au moins un exercice à charge externe (modèle de charge ≠ poids du corps), sinon refus. */
  readonly requireExternalLoad: boolean;
  /** Les exercices du bloc ne sont jamais répétés dans le conditionnement de la même séance. */
  readonly noRepeatInConditioning: boolean;
}

/**
 * Règles du contrat (propriétaire entre crochets) — C4.3 : les cinq sont implémentées en TEST_ONLY ; elles restent
 * listées comme manquantes quand l'environnement n'en fournit pas (production : fail-closed).
 */
export const STRENGTH_DELEGATION_MISSING_RULES = [
  'strength.blockMode', // [Strength] archétype « bloc » : un besoin principal, budget de temps, sans préparation propre
  'ct.strengthNeed', // [Cross-training] intention de force par stimulus et budget de temps
  'planner.intraSessionInterference', // [Planificateur] ordre force → conditionnement, structures à protéger dans la séance
  'strength.weeklyVolumeAccounting', // [Strength] prise en compte du bloc dans le volume et l'alternance hebdomadaires
  'app.strengthBlockExecution', // [App] exécution et enregistrement des séries dans l'historique Strength
] as const;

export type StrengthBlockOutcome = { readonly status: 'UNRESOLVED'; readonly cause: string; readonly reasons: readonly ReasonCode[] };

/** Délégation NON RÉSOLUE (règle absente, refus d'un moteur) : trace avec la cause et les règles manquantes. */
export function delegateStrengthBlock(req: StrengthBlockRequest, strength: StrengthBlockCapability | undefined, cause?: string): StrengthBlockOutcome {
  const c = cause ?? (strength?.composesIsolatedBlock === true ? 'DELEGATION_RULES_MISSING' : 'STRENGTH_BLOCK_MODE_UNAVAILABLE');
  const missingRules = cause !== undefined ? [] : strength?.composesIsolatedBlock === true ? STRENGTH_DELEGATION_MISSING_RULES.filter((r) => r !== 'strength.blockMode') : [...STRENGTH_DELEGATION_MISSING_RULES];
  return { status: 'UNRESOLVED', cause: c, reasons: [gpReasons.emit(GP_CODES.STRENGTH_DELEGATION_UNRESOLVED, { requester: req.requester, requestId: req.requestId, purpose: req.purpose, cause: c, missingRules })] };
}

/** Le refus d'un moteur exprime-t-il un besoin de force délégable ? (cause tracée par Cross-training C3). */
export function expressesStrengthNeed(reasons: readonly ReasonCode[]): boolean {
  return reasons.some((r) => r.params.cause === 'STRENGTH_ENGINE_DELEGATION_UNAVAILABLE' && (r.params.kind === 'strength' || r.params.block === 'strength'));
}

/** Besoin chiffré exprimé par Cross-training (budget gouverné côté Cross-training), s'il est présent. */
export function strengthNeedOf(reasons: readonly ReasonCode[]): { readonly budgetMinS: number; readonly budgetMaxS: number; readonly purpose: string } | undefined {
  const r = reasons.find((x) => x.code === 'PLAN.CROSSTRAINING.C4_STRENGTH_NEED');
  if (!r) return undefined;
  const min = Number(r.params.budgetMinS);
  const max = Number(r.params.budgetMaxS);
  return Number.isFinite(min) && Number.isFinite(max) && max > 0 ? { budgetMinS: min, budgetMaxS: max, purpose: String(r.params.purpose) } : undefined;
}
