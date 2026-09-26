import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { decideReplacement, readHysteresis, readTolerances, RulesetParameterError } from '../../src/index.js';
import type { EvaluatedCandidate } from '../../src/index.js';
import { candidate } from '../fixtures/candidates.js';
import { testRuleset } from '../fixtures/load.js';
import { param, testRulesetDocument } from '../fixtures/ruleset.js';

const rs = testRuleset();
const eps = readTolerances(rs);
const hyst = readHysteresis(rs, eps);

describe('couche C — hystérésis de replanification', () => {
  it('seuils lus dans le ruleset et contraints à ≥ ε', () => {
    expect(hyst).toEqual({ B1: 0.1, B2: 0.1, B3: 0.15 });
    const base = testRulesetDocument();
    const bad = testRuleset({ ...base, parameters: base.parameters.map((p) => (p.id === 'core.stability.hysteresis' ? param(p.id, { B1: 0.01, B2: 0.1, B3: 0.15 }, 'G2') : p)) });
    expect(() => readHysteresis(bad, eps)).toThrow(RulesetParameterError);
  });

  it('E. gain inférieur au seuil ⇒ KEEP (stabilité contre petite amélioration théorique)', () => {
    const d = decideReplacement(candidate('current', { B1: 0.80 }), candidate('proposal', { B1: 0.88 }), eps, hyst);
    expect(d.decision).toBe('KEEP');
    expect(d.reason).toMatchObject({ code: 'ADAPT.KEPT_STABILITY', params: { level: 'B1', threshold: 0.1 } });
  });

  it('violation de la couche A du plan actuel ⇒ CHANGE, quel que soit le seuil', () => {
    const d = decideReplacement(candidate('current', { B1: 0.9 }, ['A1']), candidate('proposal', { B1: 0.1 }), eps, hyst);
    expect(d).toMatchObject({ decision: 'CHANGE', reason: { params: { cause: 'current_inadmissible' } } });
    expect(decideReplacement(candidate('c', {}, ['A2']), candidate('p', {}, ['A1']), eps, hyst).decision).toBe('NO_ADMISSIBLE');
  });

  it('gain significatif sur B1, B2 ou B3 ⇒ CHANGE', () => {
    expect(decideReplacement(candidate('c', { B1: 0.5 }), candidate('p', { B1: 0.8 }), eps, hyst).decision).toBe('CHANGE');
    expect(decideReplacement(candidate('c', { B1: 0.5, B2: 0.2 }), candidate('p', { B1: 0.5, B2: 0.5 }), eps, hyst).decision).toBe('CHANGE');
    expect(decideReplacement(candidate('c', { B3: 0.2 }), candidate('p', { B3: 0.5 }), eps, hyst).decision).toBe('CHANGE');
  });

  it('un gain uniquement en B4–B6 ne justifie jamais un changement ; proposition inadmissible ⇒ KEEP', () => {
    expect(decideReplacement(candidate('c', { B5: 0 }), candidate('p', { B5: 10 }), eps, hyst).decision).toBe('KEEP');
    expect(decideReplacement(candidate('c', { B1: 0.1 }), candidate('p', { B1: 1 }, ['A3']), eps, hyst).decision).toBe('KEEP');
  });

  it('répétition d’un même événement : pas d’oscillation', () => {
    const a = candidate('A', { B1: 0.8, B3: 0.2 });
    const b = candidate('B', { B1: 0.8, B3: 0.3 }); // écart B3 sous le seuil
    let current: EvaluatedCandidate<string> = a;
    let changes = 0;
    for (let i = 0; i < 20; i++) {
      const proposal = i % 2 === 0 ? b : a;
      if (decideReplacement(current, proposal, eps, hyst).decision === 'CHANGE') { current = proposal; changes++; }
    }
    expect(changes).toBe(0);
  });

  it('propriété : si B remplace A, alors A ne remplace jamais B (antisymétrie ⇒ aucune oscillation)', () => {
    const vec = fc.array(fc.double({ min: -2, max: 2, noNaN: true }), { minLength: 6, maxLength: 6 });
    fc.assert(fc.property(vec, vec, (va, vb) => {
      const A = candidate('A', { B1: va[0], B2: va[1], B3: va[2], B4: va[3], B5: va[4], B6: va[5] });
      const B = candidate('B', { B1: vb[0], B2: vb[1], B3: vb[2], B4: vb[3], B5: vb[4], B6: vb[5] });
      if (decideReplacement(A, B, eps, hyst).decision === 'CHANGE') expect(decideReplacement(B, A, eps, hyst).decision).toBe('KEEP');
    }), { numRuns: 500 });
  });
});
