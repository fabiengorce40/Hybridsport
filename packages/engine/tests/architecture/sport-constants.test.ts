import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { findUnjustifiedNumericLiterals, loadCoreSources, visit } from './source-scanner.js';
import { CORE_PARAMETERS } from '../../src/index.js';

/** Seuls fichiers autorisés à porter des constantes d'algorithme sans annotation ligne à ligne. */
export const TECHNICAL_CONSTANT_FILES = ['packages/engine/src/core/hash.ts', 'packages/engine/src/core/rng.ts'];

describe('architecture — aucune constante sportive cachée (spec 09 §3.1)', () => {
  const files = loadCoreSources();

  it('aucun littéral numérique non justifié dans le CORE (hors 0 et 1)', () => {
    expect(findUnjustifiedNumericLiterals(files, TECHNICAL_CONSTANT_FILES)).toEqual([]);
  });

  it('le scanner détecte une valeur sportive écrite en dur (auto-test)', () => {
    const text = 'const minGapHours = 48;\nconst ok = 1;\n// technical-constant: conversion d’unités\nconst ms = 1000;\nconst sec = 60; // technical-constant: conversion';
    const fake = { path: 'fake.ts', text, ast: ts.createSourceFile('fake.ts', text, ts.ScriptTarget.ES2022, true) };
    expect(findUnjustifiedNumericLiterals([fake], []).map((f) => f.snippet)).toEqual(['48']);
  });

  it('un fichier « technical-constants-file » non listé dans l’allowlist n’est pas exempté', () => {
    const text = '/* technical-constants-file: x */ const k = 42;';
    const fake = { path: 'other.ts', text, ast: ts.createSourceFile('other.ts', text, ts.ScriptTarget.ES2022, true) };
    expect(findUnjustifiedNumericLiterals([fake], TECHNICAL_CONSTANT_FILES)).toHaveLength(1);
  });

  it('tout paramètre lu par le CORE est déclaré dans CORE_PARAMETERS (identifiants littéraux uniquement)', () => {
    const accessors = new Set(['number', 'boolean', 'string', 'stringList', 'numberRecord', 'table']);
    const declared = new Set(CORE_PARAMETERS.map((p) => p.id));
    const undeclared: string[] = [];
    const dynamic: string[] = [];
    for (const f of files.filter((x) => x.path.startsWith('packages/engine/src') && !x.path.endsWith('rules/ruleset.ts') && !x.path.endsWith('core-parameters.ts'))) {
      visit(f, (n) => {
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && accessors.has(n.expression.name.text)) {
          const recv = n.expression.expression.getText(f.ast);
          if (!/ruleset|rs\b/i.test(recv)) return;
          const arg = n.arguments[0];
          if (arg && ts.isStringLiteral(arg)) { if (!declared.has(arg.text)) undeclared.push(`${f.path}: ${arg.text}`); }
          else dynamic.push(`${f.path}: ${n.getText(f.ast).slice(0, 60)}`);
        }
      });
    }
    expect(undeclared).toEqual([]);
    expect(dynamic).toEqual([]);
  });
});
