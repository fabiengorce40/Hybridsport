import { compareSemVer } from '@hybridsport/domain';
import type { GovernanceClass, ParameterMetadata, ParameterValue, ReasonCode, RuleMetadata, SemVerString, ApprovalRole } from '@hybridsport/domain';
import type { VersionedArtifact } from '../core/context.js';
import { createCoreRegistry } from '../trace/index.js';
import { zRulesetDocument } from '@hybridsport/domain';
import type { RulesetDocument } from '@hybridsport/domain';
import { RulesetParameterError } from './errors.js';

const registry = createCoreRegistry();

/** Rôle requis pour approuver un élément de chaque classe de gouvernance (spec 09 §4). */
export const APPROVER_ROLES: Readonly<Record<GovernanceClass, readonly ApprovalRole[]>> = {
  G1: ['sports_expert', 'medical_advisor'],
  G2: ['sports_expert'],
  G3: ['product'],
  G4: ['engineering'],
  G5: ['sports_expert'],
};

function issue(path: string, problem: string): ReasonCode {
  return registry.emit('TECHNICAL.RULESET_INVALID', { path, problem });
}

export function hasRequiredApproval(governance: GovernanceClass, version: string, approvals: readonly { role: ApprovalRole; verdict: string; version: string }[]): boolean {
  return approvals.some((a) => a.verdict === 'approved' && a.version === version && APPROVER_ROLES[governance].includes(a.role));
}

function semanticIssues(doc: RulesetDocument): ReasonCode[] {
  const out: ReasonCode[] = [];
  const seen = new Set<string>();
  doc.parameters.forEach((p, i) => {
    const path = `parameters[${i}](${p.id})`;
    if (seen.has(p.id)) out.push(issue(path, 'identifiant de paramètre dupliqué'));
    seen.add(p.id);
    if (p.status !== 'approved' && !p.provisional) out.push(issue(path, 'un paramètre non approuvé doit être marqué provisoire'));
    if (p.status === 'approved' && !hasRequiredApproval(p.governance, p.version, p.approvals)) {
      out.push(issue(path, `statut approved sans approbation du rôle requis (${APPROVER_ROLES[p.governance].join('|')}) pour la version ${p.version}`));
    }
    if (p.governance === 'G1' && typeof p.value === 'number' && p.safeDirection === undefined) {
      out.push(issue(path, 'paramètre G1 numérique sans safeDirection (cliquet impossible)'));
    }
    if (p.approvedBaseline !== undefined && typeof p.approvedBaseline !== typeof p.value) {
      out.push(issue(path, 'approvedBaseline de type différent de la valeur'));
    }
    if (p.approvedRange) {
      if (p.approvedRange.min > p.approvedRange.max) out.push(issue(path, 'approvedRange : min > max'));
      if (typeof p.value !== 'number') out.push(issue(path, 'approvedRange sur une valeur non numérique'));
      else if (p.status === 'approved' && (p.value < p.approvedRange.min || p.value > p.approvedRange.max)) {
        out.push(issue(path, 'valeur approuvée hors de sa plage approuvée'));
      }
    }
    for (const c of p.changelog) if (compareSemVer(c.version, p.version) > 0) out.push(issue(path, `changelog en avance sur la version (${c.version})`));
  });
  const seenRules = new Set<string>();
  doc.rules.forEach((r, i) => {
    const path = `rules[${i}](${r.id})`;
    if (seenRules.has(r.id)) out.push(issue(path, 'identifiant de règle dupliqué'));
    seenRules.add(r.id);
    if (r.review.status === 'approved' && !hasRequiredApproval(r.governance, r.version, r.review.approvals)) {
      out.push(issue(path, 'statut approved sans approbation du rôle requis pour cette version'));
    }
    if (r.nature === 'SAFETY' && r.governance !== 'G1') out.push(issue(path, 'une règle SAFETY relève de G1'));
    if (r.nature === 'TECHNICAL' && r.governance !== 'G4') out.push(issue(path, 'une règle TECHNICAL relève de G4'));
    for (const c of r.changelog) if (compareSemVer(c.version, r.version) > 0) out.push(issue(path, `changelog en avance sur la version (${c.version})`));
  });
  for (const h of doc.history) if (compareSemVer(h.version, doc.rulesetVersion) > 0) out.push(issue('history', `entrée en avance sur rulesetVersion (${h.version})`));
  return out;
}

/** Ruleset chargé et validé. Accès aux paramètres par identifiant, jamais par valeur codée en dur. */
export class LoadedRuleset implements VersionedArtifact {
  readonly version: SemVerString;
  private readonly params: ReadonlyMap<string, ParameterMetadata>;
  private readonly rules: ReadonlyMap<string, RuleMetadata>;

  constructor(readonly document: RulesetDocument) {
    this.version = document.rulesetVersion as SemVerString;
    this.params = new Map(document.parameters.map((p) => [p.id, p]));
    this.rules = new Map(document.rules.map((r) => [r.id, r]));
  }

  parameter(id: string): ParameterMetadata | undefined { return this.params.get(id); }
  rule(id: string): RuleMetadata | undefined { return this.rules.get(id); }
  parameterIds(): string[] { return [...this.params.keys()].sort(); }
  ruleIds(): string[] { return [...this.rules.keys()].sort(); }

  private value(id: string): ParameterValue {
    const p = this.params.get(id);
    if (!p || p.status === 'deprecated') throw new RulesetParameterError(id, 'missing');
    return p.value;
  }

  number(id: string): number {
    const v = this.value(id);
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new RulesetParameterError(id, 'type', 'number');
    return v;
  }

  boolean(id: string): boolean {
    const v = this.value(id);
    if (typeof v !== 'boolean') throw new RulesetParameterError(id, 'type', 'boolean');
    return v;
  }

  string(id: string): string {
    const v = this.value(id);
    if (typeof v !== 'string') throw new RulesetParameterError(id, 'type', 'string');
    return v;
  }

  stringList(id: string): string[] {
    const v = this.value(id);
    if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) throw new RulesetParameterError(id, 'type', 'string[]');
    return v as string[];
  }

  /** Table { clé: nombre }. */
  numberRecord(id: string): Record<string, number> {
    const v = this.value(id);
    if (v === null || typeof v !== 'object' || Array.isArray(v) || !Object.values(v).every((x) => typeof x === 'number' && Number.isFinite(x))) {
      throw new RulesetParameterError(id, 'type', 'Record<string, number>');
    }
    return v as Record<string, number>;
  }

  /** Table JSON arbitraire, validée par un garde fourni par le mécanisme consommateur. */
  table<T>(id: string, guard: (v: unknown) => v is T, expected: string): T {
    const v = this.value(id);
    if (!guard(v)) throw new RulesetParameterError(id, 'type', expected);
    return v;
  }
}

export type LoadResult = { ok: true; ruleset: LoadedRuleset } | { ok: false; issues: ReasonCode[] };

/** Charge et valide un ruleset (schéma + cohérence sémantique). Ne lève jamais. */
export function loadRuleset(input: unknown): LoadResult {
  const parsed = zRulesetDocument.safeParse(input);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map((i) => issue(i.path.join('.') || '$', i.message)) };
  }
  const issues = semanticIssues(parsed.data);
  return issues.length > 0 ? { ok: false, issues } : { ok: true, ruleset: new LoadedRuleset(parsed.data) };
}
