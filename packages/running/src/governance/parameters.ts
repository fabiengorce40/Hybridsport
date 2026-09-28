/**
 * Registre TYPÉ des paramètres Running (phase 6B §G, conception 5G « RUNNING-V1-PRODUCTION-ELIGIBILITY »).
 *
 * Un paramètre porte sa valeur OU son absence (`unresolved`), son unité, sa provenance, ses sources,
 * sa sensibilité, sa maturité, sa gouvernance et la version du ruleset. Le code des algorithmes ne lit
 * JAMAIS une valeur en dur : il appelle `resolveParameter`, qui échoue explicitement (fail-closed).
 */
import { z } from 'zod';
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningMode } from '../model.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';

/** États de maturité (5G §1). SAFETY_APPROVED n'existe que pour les paramètres gouvernés G1. */
export const MATURITY_STATES = ['UNRESOLVED', 'EXPERT_PROPOSED', 'EXPERT_APPROVED', 'PRODUCT_APPROVED', 'TECHNICAL_APPROVED', 'SAFETY_APPROVED', 'PRODUCTION_ELIGIBLE'] as const;
export type MaturityState = (typeof MATURITY_STATES)[number];

/**
 * Gouvernance (5G §1) :
 * - G1_POLICY : politique de sécurité (signature sécurité) ;
 * - G1_DOSE : dose gouvernée G1 (V33, V34) : approbation experte PUIS cosignature sécurité ;
 * - EXPERT : G2 (EXPERT_DESIGN_REVIEW, PROGRAMMING_HEURISTIC, CONTEXT_DEPENDENT…) ;
 * - PRODUCT_GUARDRAIL : G3 ; PRODUCT_GUARDRAIL_AND_EXPERT : gouvernance double (E-DENSITY, E-LOAD) ;
 * - TECHNICAL : revue technique.
 */
export const GOVERNANCE_CLASSES = ['G1_POLICY', 'G1_DOSE', 'EXPERT', 'PRODUCT_GUARDRAIL', 'PRODUCT_GUARDRAIL_AND_EXPERT', 'TECHNICAL'] as const;
export type GovernanceClass = (typeof GOVERNANCE_CLASSES)[number];

/** PRODUCT_DECISION : arbitrage du propriétaire du produit (candidat, jamais une approbation experte). */
export const PROVENANCE_CLASSES = ['SOURCE_DERIVED', 'SOURCE_INFORMED', 'EXPERT_PROPOSED', 'PRODUCT_GUARDRAIL', 'PRODUCT_DECISION', 'TECHNICAL', 'NONE'] as const;
export type ProvenanceClass = (typeof PROVENANCE_CLASSES)[number];

export const SENSITIVITIES = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;

/** État requis pour la production, par gouvernance (5G §1). */
export const REQUIRED_MATURITY: Readonly<Record<GovernanceClass, MaturityState>> = {
  G1_POLICY: 'SAFETY_APPROVED', G1_DOSE: 'SAFETY_APPROVED', EXPERT: 'EXPERT_APPROVED',
  PRODUCT_GUARDRAIL: 'PRODUCT_APPROVED', PRODUCT_GUARDRAIL_AND_EXPERT: 'PRODUCT_APPROVED', TECHNICAL: 'TECHNICAL_APPROVED',
};

/** Chemin d'approbation autorisé jusqu'à l'état requis, par gouvernance (ordre obligatoire). */
export const APPROVAL_PATH: Readonly<Record<GovernanceClass, readonly MaturityState[]>> = {
  G1_POLICY: ['EXPERT_PROPOSED', 'SAFETY_APPROVED'],
  G1_DOSE: ['EXPERT_PROPOSED', 'EXPERT_APPROVED', 'SAFETY_APPROVED'],
  EXPERT: ['EXPERT_PROPOSED', 'EXPERT_APPROVED'],
  PRODUCT_GUARDRAIL: ['EXPERT_PROPOSED', 'PRODUCT_APPROVED'],
  PRODUCT_GUARDRAIL_AND_EXPERT: ['EXPERT_PROPOSED', 'EXPERT_APPROVED', 'PRODUCT_APPROVED'],
  TECHNICAL: ['EXPERT_PROPOSED', 'TECHNICAL_APPROVED'],
};

/** Rôle humain autorisé à accorder chaque état (aucun état n'est accordé par le code). */
export const APPROVER_ROLE: Readonly<Record<MaturityState, 'EXPERT' | 'FOUNDER' | 'TECHNICAL' | 'SAFETY' | 'RULESET_GATE' | 'AUTHOR'>> = {
  UNRESOLVED: 'AUTHOR', EXPERT_PROPOSED: 'AUTHOR', EXPERT_APPROVED: 'EXPERT', PRODUCT_APPROVED: 'FOUNDER',
  TECHNICAL_APPROVED: 'TECHNICAL', SAFETY_APPROVED: 'SAFETY', PRODUCTION_ELIGIBLE: 'RULESET_GATE',
};

const zJson: z.ZodType<unknown> = z.lazy(() => z.union([z.string(), z.number().refine(Number.isFinite), z.boolean(), z.null(), z.array(zJson), z.record(z.string(), zJson)]));

export const zParameterValue = z.discriminatedUnion('status', [
  z.object({ status: z.literal('unresolved'), reason: z.string().min(1) }).strict(),
  z.object({ status: z.literal('candidate'), value: zJson }).strict(),
]);

export const zApproval = z.object({ state: z.enum(MATURITY_STATES), role: z.string().min(1), reference: z.string().min(1) }).strict();

export const zRunningParameter = z.object({
  parameterId: z.string().regex(/^running\.[a-zA-Z0-9_.]+$/),
  /** Étiquette de la phase 5 (V01…V43), le cas échéant. */
  tag: z.string().regex(/^V\d{2}m?$/).optional(),
  value: zParameterValue,
  unit: z.string().min(1),
  provenanceClass: z.enum(PROVENANCE_CLASSES),
  evidenceReferenceIds: z.array(z.string().min(1)),
  sensitivity: z.enum(SENSITIVITIES),
  maturity: z.enum(MATURITY_STATES),
  governance: z.enum(GOVERNANCE_CLASSES),
  /** Classe détaillée de la phase 5 (EXPERT_DESIGN_REVIEW, PROGRAMMING_HEURISTIC…), à titre de trace. */
  statusClass: z.string().min(1),
  /** Décisions expertes qui gouvernent ce paramètre. */
  decisionIds: z.array(z.string().min(1)),
  /** Politique G1 de rattachement (obligatoire pour une gouvernance G1). */
  g1PolicyId: z.string().min(1).optional(),
  /** Approbations humaines tracées, dans l'ordre du chemin. */
  approvals: z.array(zApproval),
  rulesetVersion: z.string().min(1),
  provisional: z.boolean(),
}).strict();
export type RunningParameter = z.infer<typeof zRunningParameter>;

/** Anomalies d'intégrité d'un registre (vide = registre cohérent). */
export function registryIssues(params: readonly RunningParameter[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const tags = new Set<string>();
  for (const raw of params) {
    const parsed = zRunningParameter.safeParse(raw);
    if (!parsed.success) { out.push(`${String((raw as { parameterId?: unknown }).parameterId)} : schéma invalide`); continue; }
    const p = parsed.data;
    if (ids.has(p.parameterId)) out.push(`${p.parameterId} : identifiant dupliqué`);
    ids.add(p.parameterId);
    if (p.tag !== undefined) { if (tags.has(p.tag)) out.push(`${p.parameterId} : étiquette ${p.tag} dupliquée`); tags.add(p.tag); }
    if (p.value.status === 'unresolved' && p.maturity !== 'UNRESOLVED') out.push(`${p.parameterId} : sans valeur mais maturité ${p.maturity}`);
    if (p.value.status === 'candidate' && p.maturity === 'UNRESOLVED') out.push(`${p.parameterId} : valeur candidate mais maturité UNRESOLVED`);
    if ((p.governance === 'G1_POLICY' || p.governance === 'G1_DOSE') !== (p.g1PolicyId !== undefined)) out.push(`${p.parameterId} : rattachement G1 incohérent avec la gouvernance`);
    if (p.maturity === 'SAFETY_APPROVED' && !(p.governance === 'G1_POLICY' || p.governance === 'G1_DOSE')) out.push(`${p.parameterId} : SAFETY_APPROVED réservé aux paramètres G1`);
    // Toute maturité au-delà d'EXPERT_PROPOSED doit être prouvée par l'approbation humaine correspondante.
    const path = APPROVAL_PATH[p.governance];
    const reached = p.maturity === 'PRODUCTION_ELIGIBLE' ? [...path.slice(1), 'PRODUCTION_ELIGIBLE' as const] : path.slice(1, path.indexOf(p.maturity) + 1);
    if (p.maturity !== 'UNRESOLVED' && p.maturity !== 'PRODUCTION_ELIGIBLE' && !path.includes(p.maturity)) out.push(`${p.parameterId} : maturité ${p.maturity} hors du chemin ${p.governance}`);
    for (const st of reached) if (!p.approvals.some((a) => a.state === st && a.role === APPROVER_ROLE[st])) out.push(`${p.parameterId} : état ${st} sans approbation ${APPROVER_ROLE[st]}`);
  }
  return out;
}

export type MaturityTransition =
  | { readonly ok: true; readonly parameter: RunningParameter }
  | { readonly ok: false; readonly reason: ReasonCode };

/**
 * Transition de maturité (pure). Autorisée seulement :
 * - UNRESOLVED → EXPERT_PROPOSED, avec une valeur ;
 * - vers l'état suivant du chemin de la gouvernance, par le rôle habilité, avec une référence ;
 * - état requis → PRODUCTION_ELIGIBLE, par la gate du ruleset, si le ruleset est verrouillé ;
 * - retour à EXPERT_PROPOSED (révision), qui efface les approbations.
 * Tout le reste est refusé (saut d'étape, rôle erroné, SAFETY_APPROVED hors G1, etc.).
 */
export function transitionMaturity(
  p: RunningParameter,
  to: MaturityState,
  approval: { readonly role: string; readonly reference: string },
  opts: { readonly rulesetLocked: boolean; readonly value?: unknown } = { rulesetLocked: false },
): MaturityTransition {
  const refuse = (cause: string): MaturityTransition => ({ ok: false, reason: runningReasons.emit(RUNNING_CODES.MATURITY_TRANSITION_INVALID, { parameterId: p.parameterId, from: p.maturity, to, cause }) });
  if (approval.reference.trim() === '') return refuse('référence d’approbation absente');
  const path = APPROVAL_PATH[p.governance];
  if (to === 'EXPERT_PROPOSED' && p.maturity === 'UNRESOLVED') {
    if (approval.role !== APPROVER_ROLE.EXPERT_PROPOSED) return refuse('rôle non habilité');
    const parsed = zJson.safeParse(opts.value);
    if (opts.value === undefined || !parsed.success) return refuse('valeur candidate absente ou non sérialisable');
    return { ok: true, parameter: { ...p, maturity: 'EXPERT_PROPOSED', value: { status: 'candidate', value: parsed.data }, approvals: [] } };
  }
  if (p.maturity === 'UNRESOLVED') return refuse('paramètre sans valeur : proposer une valeur d’abord');
  if (to === 'EXPERT_PROPOSED') {
    if (approval.role !== APPROVER_ROLE.EXPERT_PROPOSED) return refuse('rôle non habilité');
    return { ok: true, parameter: { ...p, maturity: 'EXPERT_PROPOSED', approvals: [] } };
  }
  if (to === 'PRODUCTION_ELIGIBLE') {
    if (p.maturity !== REQUIRED_MATURITY[p.governance]) return refuse(`état requis ${REQUIRED_MATURITY[p.governance]} non atteint`);
    if (!opts.rulesetLocked) return refuse('ruleset non verrouillé');
    if (approval.role !== APPROVER_ROLE.PRODUCTION_ELIGIBLE) return refuse('rôle non habilité');
    return { ok: true, parameter: { ...p, maturity: 'PRODUCTION_ELIGIBLE', approvals: [...p.approvals, { state: to, role: approval.role, reference: approval.reference }] } };
  }
  const next = path[path.indexOf(p.maturity) + 1];
  if (next === undefined || next !== to) return refuse(`transition hors chemin ${p.governance} (${path.join(' → ')})`);
  if (approval.role !== APPROVER_ROLE[to]) return refuse(`rôle ${approval.role} non habilité pour ${to}`);
  return { ok: true, parameter: { ...p, maturity: to, approvals: [...p.approvals, { state: to, role: approval.role, reference: approval.reference }] } };
}

export type ParameterResolution =
  | { readonly status: 'resolved'; readonly parameterId: string; readonly value: unknown; readonly maturity: MaturityState; readonly candidate: boolean; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'unresolved'; readonly parameterId: string; readonly cause: 'UNKNOWN_PARAMETER' | 'NO_VALUE' | 'MATURITY_INSUFFICIENT'; readonly reasons: readonly ReasonCode[] };

/**
 * Résout un paramètre pour un mode donné (fail-closed) :
 * - PRODUCTION : seulement un paramètre PRODUCTION_ELIGIBLE (état requis + ruleset verrouillé) ;
 * - CANDIDATE : toute valeur candidate, toujours tracée CANDIDATE_VALUE_USED (jamais présentée comme approuvée).
 * Un paramètre sans valeur n'est JAMAIS résolu, quel que soit le mode (aucun zéro, aucun défaut).
 */
export function resolveParameter(params: readonly RunningParameter[], parameterId: string, mode: RunningMode): ParameterResolution {
  const unresolved = (cause: 'UNKNOWN_PARAMETER' | 'NO_VALUE' | 'MATURITY_INSUFFICIENT'): ParameterResolution => ({
    status: 'unresolved', parameterId, cause, reasons: [runningReasons.emit(RUNNING_CODES.UNRESOLVED_PARAMETER, { parameterId, cause, mode })],
  });
  const p = params.find((x) => x.parameterId === parameterId);
  if (!p) return unresolved('UNKNOWN_PARAMETER');
  if (p.value.status !== 'candidate') return unresolved('NO_VALUE');
  if (mode === 'PRODUCTION' && p.maturity !== 'PRODUCTION_ELIGIBLE') return unresolved('MATURITY_INSUFFICIENT');
  const candidate = p.maturity !== 'PRODUCTION_ELIGIBLE';
  return {
    status: 'resolved', parameterId, value: p.value.value, maturity: p.maturity, candidate,
    reasons: candidate ? [runningReasons.emit(RUNNING_CODES.CANDIDATE_VALUE_USED, { parameterId, maturity: p.maturity })] : [],
  };
}

/** Un paramètre atteint-il l'état exigé pour la production (état requis ou PRODUCTION_ELIGIBLE) ? */
export function meetsRequiredMaturity(p: RunningParameter): boolean {
  if (p.value.status !== 'candidate') return false;
  if (p.maturity === 'PRODUCTION_ELIGIBLE') return true;
  const required = REQUIRED_MATURITY[p.governance];
  const path = APPROVAL_PATH[p.governance];
  return path.indexOf(p.maturity) >= path.indexOf(required);
}
