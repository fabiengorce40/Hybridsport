/**
 * État de gouvernance Cross-training : décisions, politiques G1, dépendances techniques, verrou du ruleset et
 * registre. C'est une DONNÉE fournie au moteur : le code ne change jamais un statut.
 */
import { z } from 'zod';
import { CT_PARAMETER_REGISTRY_C1, CT_RULESET_VERSION } from './registry.js';
import { registryIssues, zCtParameter } from './parameters.js';
import type { CtParameter } from './parameters.js';

export const CT_DECISIONS = [
  'CT-D1', 'CT-D2', 'CT-D3', 'CT-D4', 'CT-D5', 'CT-D6', 'CT-D7', 'CT-D8',
  'CT-D9', 'CT-D10', 'CT-D11', 'CT-D12', 'CT-D13', 'CT-D14', 'CT-D15', 'CT-G1',
] as const;
export type CtDecisionId = (typeof CT_DECISIONS)[number];
export const DECISION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

/** Politiques G1 Cross-training : aucune n'est signée. */
export const CT_G1_POLICIES = ['CT-G1-PAIN', 'CT-G1-NOVICE', 'CT-G1-RETURN', 'CT-G1-EXERTIONAL'] as const;
export type CtG1PolicyId = (typeof CT_G1_POLICIES)[number];
export const G1_STATUSES = ['UNSIGNED', 'SIGNED'] as const;

/**
 * Dépendances techniques :
 * - CORE_EXT_C1 : représentation de la charge / de l'effort dans le conditioning (RFC, non autorisée) ;
 * - GLOBAL_PLANNER : Cross-training combiné à un autre sport ;
 * - CT_CONTENT : catalogue, ruleset et archétypes Cross-training relus (aucun n'existe).
 */
export const CT_TECHNICAL_DEPENDENCIES = ['CORE_EXT_C1', 'GLOBAL_PLANNER', 'CT_CONTENT'] as const;
export type CtTechnicalDependencyId = (typeof CT_TECHNICAL_DEPENDENCIES)[number];

const zRecord = <K extends readonly [string, ...string[]], V extends readonly [string, ...string[]]>(keys: K, values: V) =>
  z.object(Object.fromEntries(keys.map((k) => [k, z.enum(values)])) as { [P in K[number]]: z.ZodEnum<{ [Q in V[number]]: Q }> }).strict();

export const zCtGovernance = z.object({
  rulesetVersion: z.string().min(1),
  rulesetLocked: z.boolean(),
  decisions: zRecord(CT_DECISIONS, DECISION_STATUSES),
  g1Policies: zRecord(CT_G1_POLICIES, G1_STATUSES),
  technical: zRecord(CT_TECHNICAL_DEPENDENCIES, ['SATISFIED', 'UNSATISFIED'] as const),
  parameters: z.array(zCtParameter),
}).strict();
type GovernanceShape = z.infer<typeof zCtGovernance>;
export type CtGovernance = Readonly<Omit<GovernanceShape, 'parameters'>> & { readonly parameters: readonly CtParameter[] };

/** État réel en C1 : rien de décidé, rien de signé, aucune dépendance technique satisfaite. */
export const CURRENT_CT_GOVERNANCE: CtGovernance = {
  rulesetVersion: CT_RULESET_VERSION,
  rulesetLocked: false,
  decisions: Object.fromEntries(CT_DECISIONS.map((d) => [d, 'PENDING'])) as CtGovernance['decisions'],
  g1Policies: Object.fromEntries(CT_G1_POLICIES.map((g) => [g, 'UNSIGNED'])) as CtGovernance['g1Policies'],
  technical: { CORE_EXT_C1: 'UNSATISFIED', GLOBAL_PLANNER: 'UNSATISFIED', CT_CONTENT: 'UNSATISFIED' },
  parameters: CT_PARAMETER_REGISTRY_C1,
};

/** Anomalies d'un état de gouvernance (schéma, intégrité du registre, cohérence du verrou, décisions connues). */
export function governanceIssues(g: unknown): string[] {
  const parsed = zCtGovernance.safeParse(g);
  if (!parsed.success) return parsed.error.issues.map((i) => `${i.path.join('.')} : ${i.message}`);
  const out = registryIssues(parsed.data.parameters);
  for (const p of parsed.data.parameters) {
    if (p.rulesetVersion !== parsed.data.rulesetVersion) out.push(`${p.parameterId} : version ${p.rulesetVersion} ≠ ruleset ${parsed.data.rulesetVersion}`);
    if (p.maturity === 'PRODUCTION_ELIGIBLE' && !parsed.data.rulesetLocked) out.push(`${p.parameterId} : PRODUCTION_ELIGIBLE sans ruleset verrouillé`);
    if (!(CT_DECISIONS as readonly string[]).includes(p.decisionId)) out.push(`${p.parameterId} : décision ${p.decisionId} inconnue`);
  }
  return out;
}
