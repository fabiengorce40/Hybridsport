import { DATA_QUALITIES, ENFORCEMENT_CONTEXT_KEYS } from '@hybridsport/domain';
import type { EnforcementContext, EnforcementContextKey, EnforcementLevel, EnforcementPolicyDocument, ReasonCode } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from './ruleset.js';

const reasons = createCoreRegistry();

export interface EnforcementDecision {
  readonly ruleId: string;
  readonly level: EnforcementLevel;
  readonly threshold?: number;
  readonly unit?: string;
  readonly penaltyWeight?: number;
  /** Facteurs de contexte ayant modifié la décision par défaut. */
  readonly factors: readonly EnforcementContextKey[];
  readonly reason: ReasonCode;
}

export class EnforcementPolicyError extends Error {
  constructor(readonly ruleId: string, problem: string) {
    super(`Politique d'application ${ruleId} : ${problem}`);
    this.name = 'EnforcementPolicyError';
  }
}

function matches(when: EnforcementPolicyDocument['overrides'][number]['when'], ctx: EnforcementContext): boolean {
  return Object.entries(when).every(([k, values]) => {
    const v = ctx[k as EnforcementContextKey];
    return v !== undefined && (values as string[]).includes(v);
  });
}

function resolveWith(policy: EnforcementPolicyDocument, ctx: EnforcementContext, ruleset: LoadedRuleset): Omit<EnforcementDecision, 'reason'> {
  let level: EnforcementLevel = policy.default.level;
  let threshold = policy.default.threshold;
  let thresholdParam = policy.default.thresholdParam;
  let penaltyWeight = policy.default.penaltyWeight;
  const factors = new Set<EnforcementContextKey>();
  // Les surcharges plus spécifiques (plus de facteurs) s'appliquent en dernier ; ordre de déclaration sinon.
  const applicable = policy.overrides
    .map((o, index) => ({ o, index, specificity: Object.keys(o.when).length }))
    .filter(({ o }) => matches(o.when, ctx))
    .sort((a, b) => a.specificity - b.specificity || a.index - b.index);
  for (const { o } of applicable) {
    if (o.set.level !== undefined) level = o.set.level;
    if (o.set.threshold !== undefined) { threshold = o.set.threshold; thresholdParam = undefined; }
    if (o.set.thresholdParam !== undefined) { thresholdParam = o.set.thresholdParam; threshold = undefined; }
    if (o.set.penaltyWeight !== undefined) penaltyWeight = o.set.penaltyWeight;
    Object.keys(o.when).forEach((k) => factors.add(k as EnforcementContextKey));
  }
  if (level === 'inactive' && !policy.allowInactive) throw new EnforcementPolicyError(policy.ruleId, '« inactive » non autorisé par la politique');
  const resolvedThreshold = thresholdParam !== undefined ? ruleset.number(thresholdParam) : threshold;
  return {
    ruleId: policy.ruleId, level,
    ...(resolvedThreshold !== undefined ? { threshold: resolvedThreshold } : {}),
    ...(policy.thresholdUnit !== undefined ? { unit: policy.thresholdUnit } : {}),
    ...(penaltyWeight !== undefined ? { penaltyWeight } : {}),
    factors: [...factors].sort(),
  };
}

function policyFor(ruleset: LoadedRuleset, ruleId: string): EnforcementPolicyDocument {
  const p = ruleset.document.policies.find((x) => x.ruleId === ruleId);
  if (!p) throw new EnforcementPolicyError(ruleId, 'politique absente du ruleset');
  return p;
}

/**
 * POINT D'ENTRÉE UNIQUE (spec 04 §4.1, CHANGELOG V1.1) : générateur, GlobalPlanner, InterferenceManager
 * et SessionValidator appellent tous cette fonction, avec le même contexte, pour qu'une règle n'ait
 * qu'une seule interprétation. La décision est tracée (RULE.ENFORCEMENT).
 */
export function resolveEnforcement(ruleset: LoadedRuleset, ruleId: string, ctx: EnforcementContext): EnforcementDecision {
  const d = resolveWith(policyFor(ruleset, ruleId), ctx, ruleset);
  const category = d.level === 'hard' ? 'business_hard' : d.level === 'soft' ? 'business_soft' : 'information';
  const reason = reasons.emit(
    'RULE.ENFORCEMENT',
    { rule: ruleId, level: d.level, factors: [...d.factors], ...(d.threshold !== undefined ? { threshold: d.threshold } : {}) },
    { category, ruleRefs: [`${ruleId}@${ruleset.rule(ruleId)?.version ?? 'no-metadata'}`] },
  );
  return { ...d, reason };
}

// technical-constant: rang ordinal de permissivité (pas une valeur sportive)
const LEVEL_PERMISSIVENESS: Record<EnforcementLevel, number> = { hard: 0, soft: 1, inactive: 2 };

/** Compare la permissivité de deux décisions (positif si a est plus permissive que b). */
export function comparePermissiveness(
  a: Pick<EnforcementDecision, 'level' | 'threshold'>,
  b: Pick<EnforcementDecision, 'level' | 'threshold'>,
  thresholdSafeDirection: 'increase' | 'decrease' | undefined,
): number {
  const byLevel = LEVEL_PERMISSIVENESS[a.level] - LEVEL_PERMISSIVENESS[b.level];
  if (byLevel !== 0 || a.threshold === undefined || b.threshold === undefined || thresholdSafeDirection === undefined) return byLevel;
  const diff = a.threshold - b.threshold;
  return thresholdSafeDirection === 'increase' ? -diff : diff;
}

/**
 * Contrôle de monotonie : des données plus pauvres ne rendent JAMAIS une règle plus permissive
 * (spec 04 §4.1). Vérifié sur toutes les combinaisons de valeurs citées dans la politique.
 */
export function policyMonotonicityIssues(policy: EnforcementPolicyDocument, ruleset: LoadedRuleset): string[] {
  const values = new Map<EnforcementContextKey, Set<string | undefined>>();
  for (const k of ENFORCEMENT_CONTEXT_KEYS) values.set(k, new Set([undefined]));
  for (const o of policy.overrides) for (const [k, vs] of Object.entries(o.when)) (vs as string[]).forEach((v) => values.get(k as EnforcementContextKey)?.add(v));
  const otherKeys = ENFORCEMENT_CONTEXT_KEYS.filter((k) => k !== 'dataQuality');
  let combos: EnforcementContext[] = [{}];
  for (const k of otherKeys) {
    const next: EnforcementContext[] = [];
    for (const c of combos) for (const v of values.get(k) ?? [undefined]) next.push(v === undefined ? c : { ...c, [k]: v });
    combos = next;
  }
  const out: string[] = [];
  for (const c of combos) {
    const decisions = DATA_QUALITIES.map((q) => resolveWith(policy, { ...c, dataQuality: q }, ruleset)); // none, sparse, adequate
    for (let i = 0; i + 1 < decisions.length; i++) {
      const poorer = decisions[i];
      const richer = decisions[i + 1];
      if (poorer && richer && comparePermissiveness(poorer, richer, policy.thresholdSafeDirection) > 0) {
        out.push(`${policy.ruleId} : dataQuality=${DATA_QUALITIES[i]} plus permissif que ${DATA_QUALITIES[i + 1]} pour ${JSON.stringify(c)}`);
      }
    }
  }
  return out;
}

/** Contrôles structurels des politiques d'un ruleset (appelés au chargement). */
export function policyIssues(ruleset: LoadedRuleset): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of ruleset.document.policies) {
    if (seen.has(p.ruleId)) out.push(`${p.ruleId} : politique dupliquée`);
    seen.add(p.ruleId);
    if (!ruleset.rule(p.ruleId)) out.push(`${p.ruleId} : politique sans fiche de règle`);
    const levels = [p.default.level, ...p.overrides.map((o) => o.set.level)];
    if (!p.allowInactive && levels.includes('inactive')) out.push(`${p.ruleId} : « inactive » utilisé sans allowInactive`);
    const params = [p.default.thresholdParam, ...p.overrides.map((o) => o.set.thresholdParam)].filter((x): x is string => x !== undefined);
    for (const id of params) {
      const meta = ruleset.parameter(id);
      if (!meta || typeof meta.value !== 'number') out.push(`${p.ruleId} : thresholdParam ${id} absent ou non numérique`);
    }
    if (out.length === 0) out.push(...policyMonotonicityIssues(p, ruleset));
  }
  return out;
}
