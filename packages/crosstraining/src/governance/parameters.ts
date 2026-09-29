/**
 * Registre TYPÉ des paramètres Cross-training. Un paramètre porte sa valeur OU son absence (`unresolved`),
 * sa CATÉGORIE (estimation interne, prescription, sécurité, planification, historique, classement), son statut
 * de preuve (a : soutenu, b : dérivé, c : décision, d : non résolu), sa maturité et sa gouvernance.
 * Le code des algorithmes ne lit JAMAIS une valeur en dur : il appelle `resolveParameter` (fail-closed).
 */
import { z } from 'zod';
import type { ReasonCode } from '@hybridsport/domain';
import type { CtMode } from '../model.js';
import { CT_CODES, ctReasons } from '../codes.js';

export const MATURITY_STATES = ['UNRESOLVED', 'EXPERT_PROPOSED', 'EXPERT_APPROVED', 'PRODUCT_APPROVED', 'SAFETY_APPROVED', 'PRODUCTION_ELIGIBLE'] as const;
export type MaturityState = (typeof MATURITY_STATES)[number];

export const GOVERNANCE_CLASSES = ['G1_POLICY', 'G1_DOSE', 'EXPERT', 'PRODUCT', 'PRODUCT_AND_EXPERT'] as const;
export type GovernanceClass = (typeof GOVERNANCE_CLASSES)[number];

/**
 * Catégorie : distingue des concepts que le modèle du CORE représente parfois de façon semblable.
 * - ESTIMATION : sert UNIQUEMENT à estimer une durée (débit d'un mouvement) — jamais une prescription ;
 * - PRESCRIPTION : ce qui est prescrit à l'athlète (reps, calories, mètres, durée, charge, effort) ;
 * - RESULT : mesure d'une performance réalisée (rounds + reps, temps, calories, distance) ;
 * - SAFETY, PLANNING, HISTORY, CLASSIFICATION.
 */
export const PARAMETER_CATEGORIES = ['ESTIMATION', 'PRESCRIPTION', 'RESULT', 'SAFETY', 'PLANNING', 'HISTORY', 'CLASSIFICATION'] as const;
export type ParameterCategory = (typeof PARAMETER_CATEGORIES)[number];

/** Statut de preuve (revue docs/kairo/CROSSTRAINING-EVIDENCE-PACK.md) : a / b / c / d. */
export const EVIDENCE_STATUSES = ['SUPPORTED', 'DERIVED', 'DECISION', 'UNRESOLVED'] as const;

const zJson: z.ZodType<unknown> = z.lazy(() => z.union([z.string(), z.number().refine(Number.isFinite), z.boolean(), z.null(), z.array(zJson), z.record(z.string(), zJson)]));

export const zParameterValue = z.discriminatedUnion('status', [
  z.object({ status: z.literal('unresolved'), reason: z.string().min(1) }).strict(),
  z.object({ status: z.literal('candidate'), value: zJson }).strict(),
]);

export const zApproval = z.object({ state: z.enum(MATURITY_STATES), role: z.string().min(1), reference: z.string().min(1) }).strict();

export const zCtParameter = z.object({
  parameterId: z.string().regex(/^ct\.[a-zA-Z0-9_.]+$/),
  /** Décision groupée de la carte du domaine (CT-D1…CT-D15, CT-G1). */
  decisionId: z.string().regex(/^CT-(D\d{1,2}|G1)$/),
  category: z.enum(PARAMETER_CATEGORIES),
  value: zParameterValue,
  unit: z.string().min(1),
  governance: z.enum(GOVERNANCE_CLASSES),
  maturity: z.enum(MATURITY_STATES),
  evidenceStatus: z.enum(EVIDENCE_STATUSES),
  /** Référence de la revue de preuve (section), jamais une valeur. */
  reviewRef: z.string().min(1),
  approvals: z.array(zApproval),
  rulesetVersion: z.string().min(1),
}).strict();
export type CtParameter = z.infer<typeof zCtParameter>;

/** Anomalies d'intégrité d'un registre (vide = cohérent). */
export function registryIssues(params: readonly unknown[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const raw of params) {
    const parsed = zCtParameter.safeParse(raw);
    if (!parsed.success) { out.push(`${String((raw as { parameterId?: unknown } | null)?.parameterId)} : schéma invalide`); continue; }
    const p = parsed.data;
    if (ids.has(p.parameterId)) out.push(`${p.parameterId} : identifiant dupliqué`);
    ids.add(p.parameterId);
    if (p.value.status === 'unresolved' && p.maturity !== 'UNRESOLVED') out.push(`${p.parameterId} : sans valeur mais maturité ${p.maturity}`);
    if (p.value.status === 'candidate' && p.maturity === 'UNRESOLVED') out.push(`${p.parameterId} : valeur candidate mais maturité UNRESOLVED`);
    if (p.value.status === 'unresolved' && p.evidenceStatus !== 'UNRESOLVED') out.push(`${p.parameterId} : sans valeur mais statut de preuve ${p.evidenceStatus}`);
    // Toute maturité au-delà d'EXPERT_PROPOSED doit être prouvée par une approbation humaine tracée.
    if (p.maturity !== 'UNRESOLVED' && p.maturity !== 'EXPERT_PROPOSED' && !p.approvals.some((a) => a.state === p.maturity)) out.push(`${p.parameterId} : maturité ${p.maturity} sans approbation`);
  }
  return out;
}

export type ParameterResolution =
  | { readonly status: 'resolved'; readonly value: unknown; readonly candidate: boolean; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'unresolved'; readonly cause: 'NOT_IN_REGISTRY' | 'NO_VALUE' | 'NOT_PRODUCTION_ELIGIBLE'; readonly reasons: readonly ReasonCode[] };

/**
 * Résolution FAIL-CLOSED :
 * - paramètre absent ou sans valeur ⇒ non résolu (jamais une valeur par défaut) ;
 * - PRODUCTION ⇒ exige PRODUCTION_ELIGIBLE ;
 * - CANDIDATE ⇒ une valeur candidate est utilisable, tracée CANDIDATE_VALUE_USED.
 */
export function resolveParameter(params: readonly CtParameter[], parameterId: string, mode: CtMode): ParameterResolution {
  const unresolved = (cause: 'NOT_IN_REGISTRY' | 'NO_VALUE' | 'NOT_PRODUCTION_ELIGIBLE'): ParameterResolution =>
    ({ status: 'unresolved', cause, reasons: [ctReasons.emit(CT_CODES.UNRESOLVED_PARAMETER, { parameterId, cause, mode })] });
  const p = params.find((x) => x.parameterId === parameterId);
  if (!p) return unresolved('NOT_IN_REGISTRY');
  if (p.value.status === 'unresolved') return unresolved('NO_VALUE');
  if (mode === 'PRODUCTION') {
    if (p.maturity !== 'PRODUCTION_ELIGIBLE') return unresolved('NOT_PRODUCTION_ELIGIBLE');
    return { status: 'resolved', value: p.value.value, candidate: false, reasons: [] };
  }
  const candidate = p.maturity !== 'PRODUCTION_ELIGIBLE';
  return { status: 'resolved', value: p.value.value, candidate, reasons: candidate ? [ctReasons.emit(CT_CODES.CANDIDATE_VALUE_USED, { parameterId, maturity: p.maturity })] : [] };
}
