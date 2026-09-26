import type { ReasonCode, RuleMetadata } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from './ruleset.js';

/** Règle implémentée dans le code : sa logique est ici, ses métadonnées et paramètres dans le ruleset. */
export interface RuleDefinition<I = unknown, O = unknown> {
  readonly id: string;
  readonly version: string;
  evaluate(input: I, ruleset: LoadedRuleset): O;
}

export interface RegistryIssue { readonly ruleId: string; readonly reason: ReasonCode }

const reasons = createCoreRegistry();

/**
 * Registre des règles : chaque règle du code doit posséder sa fiche dans le ruleset, à la même version
 * (traçabilité complète, spec 09 §3). Une règle sans fiche est une erreur TECHNICAL.
 */
export class RuleRegistry {
  private readonly defs: ReadonlyMap<string, RuleDefinition>;

  private constructor(defs: readonly RuleDefinition[], readonly ruleset: LoadedRuleset) {
    this.defs = new Map(defs.map((d) => [d.id, d]));
  }

  static create(defs: readonly RuleDefinition[], ruleset: LoadedRuleset): { ok: true; registry: RuleRegistry } | { ok: false; issues: RegistryIssue[] } {
    const issues: RegistryIssue[] = [];
    const ids = new Set<string>();
    for (const d of defs) {
      if (ids.has(d.id)) issues.push({ ruleId: d.id, reason: reasons.emit('TECHNICAL.RULESET_INVALID', { path: d.id, problem: 'règle définie deux fois dans le code' }) });
      ids.add(d.id);
      const meta = ruleset.rule(d.id);
      if (!meta) {
        issues.push({ ruleId: d.id, reason: reasons.emit('TECHNICAL.UNKNOWN_REFERENCE', { kind: 'rule-metadata', id: d.id }) });
      } else if (meta.version !== d.version) {
        issues.push({ ruleId: d.id, reason: reasons.emit('TECHNICAL.RULESET_INVALID', { path: d.id, problem: `version code ${d.version} ≠ fiche ${meta.version}` }) });
      } else if (meta.review.status === 'deprecated') {
        issues.push({ ruleId: d.id, reason: reasons.emit('TECHNICAL.RULESET_INVALID', { path: d.id, problem: 'règle dépréciée encore active dans le code' }) });
      }
    }
    return issues.length > 0 ? { ok: false, issues } : { ok: true, registry: new RuleRegistry(defs, ruleset) };
  }

  get(id: string): RuleDefinition | undefined { return this.defs.get(id); }
  metadata(id: string): RuleMetadata | undefined { return this.ruleset.rule(id); }
  ids(): string[] { return [...this.defs.keys()].sort(); }
  /** Référence de traçabilité 'id@version'. */
  ref(id: string): string { return `${id}@${this.defs.get(id)?.version ?? '?'}`; }
}
