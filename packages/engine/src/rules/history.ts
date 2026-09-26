import { canonicalEquals } from '../core/canonical.js';
import { compareSemVer } from '@hybridsport/domain';
import type { RulesetDocument } from '@hybridsport/domain';

export type RulesetChange =
  | { readonly kind: 'added' | 'removed'; readonly entity: 'parameter' | 'rule'; readonly id: string }
  | { readonly kind: 'modified'; readonly entity: 'parameter' | 'rule'; readonly id: string; readonly fields: readonly string[]; readonly versionBumped: boolean };

function diffEntities<T extends { id: string; version: string }>(entity: 'parameter' | 'rule', a: readonly T[], b: readonly T[]): RulesetChange[] {
  const out: RulesetChange[] = [];
  const ma = new Map(a.map((x) => [x.id, x]));
  const mb = new Map(b.map((x) => [x.id, x]));
  for (const id of [...new Set([...ma.keys(), ...mb.keys()])].sort()) {
    const x = ma.get(id);
    const y = mb.get(id);
    if (!x) { out.push({ kind: 'added', entity, id }); continue; }
    if (!y) { out.push({ kind: 'removed', entity, id }); continue; }
    const fields = [...new Set([...Object.keys(x), ...Object.keys(y)])]
      .filter((k) => k !== 'version' && k !== 'modifiedAt' && k !== 'changelog')
      .filter((k) => !canonicalEquals((x as Record<string, unknown>)[k] ?? null, (y as Record<string, unknown>)[k] ?? null))
      .sort();
    if (fields.length > 0) out.push({ kind: 'modified', entity, id, fields, versionBumped: compareSemVer(y.version, x.version) > 0 });
  }
  return out;
}

/** Différences entre deux versions de ruleset (audit, relecture par lots — spec 09 §5). */
export function diffRulesets(prev: RulesetDocument, next: RulesetDocument): RulesetChange[] {
  return [...diffEntities('parameter', prev.parameters, next.parameters), ...diffEntities('rule', prev.rules, next.rules)];
}

/** Discipline de versionnement : tout changement impose une montée de version (élément et ruleset). */
export function versioningIssues(prev: RulesetDocument, next: RulesetDocument): string[] {
  const changes = diffRulesets(prev, next);
  const out: string[] = [];
  for (const c of changes) {
    if (c.kind === 'modified' && !c.versionBumped) out.push(`${c.entity} ${c.id} modifié (${c.fields.join(', ')}) sans montée de version`);
  }
  if (changes.length > 0 && compareSemVer(next.rulesetVersion, prev.rulesetVersion) <= 0) out.push('ruleset modifié sans montée de rulesetVersion');
  return out;
}
