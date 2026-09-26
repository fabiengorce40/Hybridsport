import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { SeededRng, readTolerances, selectBest } from '../../src/index.js';
import { candidate } from '../fixtures/candidates.js';
import { testRuleset } from '../fixtures/load.js';

const eps = readTolerances(testRuleset());
const layer = fc.constantFrom('A1', 'A2', 'A3', 'A4') as fc.Arbitrary<'A1' | 'A2' | 'A3' | 'A4'>;
const score = fc.double({ min: -1e12, max: 1e12, noNaN: true });
const cand = fc.record({ b: fc.array(score, { minLength: 6, maxLength: 6 }), violated: fc.subarray(['A1', 'A2', 'A3', 'A4'] as const) });

describe('propriétés — décision', () => {
  it('aucun score B, même énorme, ne fait gagner une solution rejetée par la couche A', () => {
    fc.assert(fc.property(fc.array(cand, { minLength: 1, maxLength: 8 }), layer, fc.string({ minLength: 1 }), (cs, huge, seed) => {
      const list = cs.map((c, i) => candidate(`c${i}`, { B1: c.b[0], B2: c.b[1], B3: c.b[2], B4: c.b[3], B5: c.b[4], B6: c.b[5] }, [...c.violated]));
      list.push(candidate('cheater', { B1: 1e15, B2: 1e15, B3: 1e15, B4: 1e15, B5: 1e15, B6: 1e15 }, [huge]));
      const s = selectBest(list, eps, SeededRng.fromSeed(seed));
      if (s.status === 'selected') {
        expect(s.winner.admissibility.admissible).toBe(true);
        expect(s.winner.id).not.toBe('cheater');
      } else {
        expect(list.every((c) => !c.admissibility.admissible)).toBe(true);
      }
    }), { numRuns: 300 });
  });

  it('le résultat ne dépend pas de l’ordre des candidats', () => {
    fc.assert(fc.property(fc.array(cand, { minLength: 1, maxLength: 8 }), fc.string({ minLength: 1 }), (cs, seed) => {
      const list = cs.map((c, i) => candidate(`c${i}`, { B1: c.b[0], B2: c.b[1], B3: c.b[2], B4: c.b[3], B5: c.b[4], B6: c.b[5] }, [...c.violated]));
      const a = selectBest(list, eps, SeededRng.fromSeed(seed));
      const b = selectBest([...list].reverse(), eps, SeededRng.fromSeed(seed));
      expect(b.status === 'selected' ? b.winner.id : null).toBe(a.status === 'selected' ? a.winner.id : null);
    }), { numRuns: 300 });
  });
});
