import { describe, expect, it } from 'vitest';
import { findClockAndRandomUsage, loadCoreSources } from './source-scanner.js';

describe('architecture — horloge et hasard (lot 2)', () => {
  const files = loadCoreSources();

  it('analyse effectivement des sources du CORE', () => {
    expect(files.length).toBeGreaterThan(3);
    expect(files.some((f) => f.path.startsWith('packages/domain/src'))).toBe(true);
    expect(files.some((f) => f.path.startsWith('packages/engine/src'))).toBe(true);
  });

  it('aucune lecture directe de l’horloge ni source de hasard non injectée', () => {
    expect(findClockAndRandomUsage(files)).toEqual([]);
  });

  it('le scanner détecte bien les usages interdits (auto-test)', async () => {
    const ts = (await import('typescript')).default;
    const text = 'const a = Date.now(); const b = Math.random(); const c = new Date(); const d = process.env.X; import "node:crypto";';
    const fake = { path: 'fake.ts', text, ast: ts.createSourceFile('fake.ts', text, ts.ScriptTarget.ES2022, true) };
    expect(findClockAndRandomUsage([fake]).map((f) => f.rule).sort()).toEqual(
      ['clock-or-random', 'clock-or-random', 'clock-or-random', 'crypto-import', 'new-Date-without-argument'],
    );
  });
});
