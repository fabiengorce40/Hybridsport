import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { findBypassIdentifiers, loadCoreSources, visit } from './source-scanner.js';

describe('architecture — aucun contournement des règles HARD', () => {
  const files = loadCoreSources();

  it('aucune API du type skipValidation / disableRules / bypassSafety', () => {
    expect(findBypassIdentifiers(files)).toEqual([]);
  });

  it('le scanner détecte un contournement (auto-test)', () => {
    const text = 'export function run(o: { skipValidation?: boolean; disable_rules: boolean }) { return o; }';
    const fake = { path: 'fake.ts', text, ast: ts.createSourceFile('fake.ts', text, ts.ScriptTarget.ES2022, true) };
    expect(findBypassIdentifiers([fake]).length).toBeGreaterThanOrEqual(2);
  });

  it('une seule interprétation des politiques : seul rules/enforcement.ts lit `.policies`', () => {
    const readers = new Set<string>();
    for (const f of files) {
      visit(f, (n) => {
        if (ts.isPropertyAccessExpression(n) && n.name.text === 'policies') readers.add(f.path);
      });
    }
    expect([...readers]).toEqual(['packages/engine/src/rules/enforcement.ts']);
  });
});
