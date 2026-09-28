/**
 * État de gouvernance Running : décisions expertes, politiques G1, dépendances techniques, verrou du
 * ruleset et registre des paramètres. C'est une DONNÉE fournie au moteur : le code ne change jamais un
 * statut (aucune approbation, aucune signature automatique).
 */
import { z } from 'zod';
import { RUNNING_PARAMETER_REGISTRY_V1_CANDIDATE, RUNNING_RULESET_VERSION } from './registry-v1-candidate.js';
import { registryIssues, zRunningParameter } from './parameters.js';
import type { RunningParameter } from './parameters.js';

/** Les 14 décisions expertes du périmètre C (5G). */
export const EXPERT_DECISIONS = ['E-PROG', 'E-QUALITY', 'E-LONG', 'E-RPE', 'E-PACE', 'E-RECOVERY', 'E-DENSITY', 'E-RECENCY', 'E-LOAD', 'E-TAPER', 'E-FIRST', 'E-MODEL', 'E-VARIABILITY', 'E-RECENTLOAD'] as const;
export type ExpertDecisionId = (typeof EXPERT_DECISIONS)[number];
export const DECISION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

/** Les 4 politiques G1 (5E). Aucune n'est signée. */
export const G1_POLICIES = ['G1-PAIN', 'G1-SCOPE', 'G1-NOVICE', 'G1-RETURN'] as const;
export type G1PolicyId = (typeof G1_POLICIES)[number];
export const G1_STATUSES = ['UNSIGNED', 'SIGNED'] as const;

/** Dépendances techniques (5G). */
export const TECHNICAL_DEPENDENCIES = ['CORE_EXT_R1', 'GLOBAL_PLANNER_INTEGRATION'] as const;
export type TechnicalDependencyId = (typeof TECHNICAL_DEPENDENCIES)[number];

const zRecord = <K extends readonly [string, ...string[]], V extends readonly [string, ...string[]]>(keys: K, values: V) =>
  z.object(Object.fromEntries(keys.map((k) => [k, z.enum(values)])) as { [P in K[number]]: z.ZodEnum<{ [Q in V[number]]: Q }> }).strict();

export const zRunningGovernance = z.object({
  rulesetVersion: z.string().min(1),
  rulesetLocked: z.boolean(),
  decisions: zRecord(EXPERT_DECISIONS, DECISION_STATUSES),
  g1Policies: zRecord(G1_POLICIES, G1_STATUSES),
  technical: zRecord(TECHNICAL_DEPENDENCIES, ['SATISFIED', 'UNSATISFIED'] as const),
  parameters: z.array(zRunningParameter),
}).strict();
type GovernanceShape = z.infer<typeof zRunningGovernance>;
export type RunningGovernance = Readonly<Omit<GovernanceShape, 'parameters'>> & { readonly parameters: readonly RunningParameter[] };

/**
 * État réel au début de la phase 6B : 14 décisions PENDING, 4 G1 UNSIGNED, ruleset non verrouillé,
 * CORE-EXT-R1 implémentée et durcie (phase 6A), planificateur global non intégré.
 */
export const CURRENT_RUNNING_GOVERNANCE: RunningGovernance = {
  rulesetVersion: RUNNING_RULESET_VERSION,
  rulesetLocked: false,
  decisions: Object.fromEntries(EXPERT_DECISIONS.map((d) => [d, 'PENDING'])) as RunningGovernance['decisions'],
  g1Policies: Object.fromEntries(G1_POLICIES.map((g) => [g, 'UNSIGNED'])) as RunningGovernance['g1Policies'],
  technical: { CORE_EXT_R1: 'SATISFIED', GLOBAL_PLANNER_INTEGRATION: 'UNSATISFIED' },
  parameters: RUNNING_PARAMETER_REGISTRY_V1_CANDIDATE,
};

/** Anomalies d'un état de gouvernance (schéma, intégrité du registre, cohérence du verrou). */
export function governanceIssues(g: unknown): string[] {
  const parsed = zRunningGovernance.safeParse(g);
  if (!parsed.success) return parsed.error.issues.map((i) => `${i.path.join('.')} : ${i.message}`);
  const out = registryIssues(parsed.data.parameters);
  for (const p of parsed.data.parameters) {
    if (p.rulesetVersion !== parsed.data.rulesetVersion) out.push(`${p.parameterId} : version ${p.rulesetVersion} ≠ ruleset ${parsed.data.rulesetVersion}`);
    if (p.maturity === 'PRODUCTION_ELIGIBLE' && !parsed.data.rulesetLocked) out.push(`${p.parameterId} : PRODUCTION_ELIGIBLE sans ruleset verrouillé`);
  }
  return out;
}
