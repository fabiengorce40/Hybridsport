import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { SeededRng, canonicalStringify, canonicalParse } from '../../src/index.js';

describe('propriétés — déterminisme', () => {
  it('pour toute graine, la séquence est reproductible', () => {
    fc.assert(fc.property(fc.string({ minLength: 1 }), fc.integer({ min: 1, max: 50 }), (seed, n) => {
      const a = SeededRng.fromSeed(seed);
      const b = SeededRng.fromSeed(seed);
      for (let i = 0; i < n; i++) if (a.nextUint32() !== b.nextUint32()) return false;
      return true;
    }));
  });

  it('nextInt reste dans ses bornes et nextFloat dans [0, 1)', () => {
    fc.assert(fc.property(fc.string({ minLength: 1 }), fc.integer({ min: 1, max: 1_000_000 }), (seed, max) => {
      const r = SeededRng.fromSeed(seed);
      const i = r.nextInt(max);
      const f = r.nextFloat();
      return Number.isInteger(i) && i >= 0 && i < max && f >= 0 && f < 1;
    }));
  });

  it('JSON canonique : aller-retour idempotent pour toute valeur JSON finie', () => {
    fc.assert(fc.property(fc.jsonValue(), (v) => {
      const s = canonicalStringify(v);
      expect(canonicalStringify(canonicalParse(s))).toBe(s);
    }));
  });
});
