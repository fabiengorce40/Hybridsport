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

  it('bornes du paramètre : seuil = ε accepté ; niveau manquant refusé, erreur explicite et typée', () => {
    const base = testRulesetDocument();
    const withHyst = (v: Record<string, number>) => testRuleset({ ...base, parameters: base.parameters.map((p) => (p.id === 'core.stability.hysteresis' ? param(p.id, v, 'G2') : p)) });
    expect(readHysteresis(withHyst({ B1: 0.05, B2: 0.05, B3: 0.05 }), eps)).toEqual({ B1: 0.05, B2: 0.05, B3: 0.05 });
    try {
      readHysteresis(withHyst({ B1: 0.1, B2: 0.1 }), eps);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RulesetParameterError);
      expect(e).toMatchObject({ parameterId: 'core.stability.hysteresis', problem: 'type' });
      expect(String((e as Error).message)).toContain('B3');
    }
  });

  it('gain exactement égal au seuil ⇒ KEEP (il faut le DÉPASSER) ; au-delà ⇒ CHANGE avec le gain tracé', () => {
    const h = { B1: 0.25, B2: 0.25, B3: 0.25 };
    const equal = decideReplacement(candidate('c', { B1: 0.25 }), candidate('p', { B1: 0.5 }), eps, h);
    expect(equal).toMatchObject({ decision: 'KEEP', reason: { code: 'ADAPT.KEPT_STABILITY', params: { level: 'B1', gain: 0.25, threshold: 0.25 } } });
    const above = decideReplacement(candidate('c', { B1: 0.25 }), candidate('p', { B1: 0.625 }), eps, h);
    expect(above).toMatchObject({ decision: 'CHANGE', reason: { code: 'ADAPT.CHANGED', params: { cause: 'significant_gain', level: 'B1', gain: 0.375 } } });
  });

  it('raisons tracées : proposition moins bonne (gain 0, niveau décisif), gain hors B1–B3 (gain réel, sans seuil), deux candidats inadmissibles', () => {
    const worse = decideReplacement(candidate('c', { B1: 0.75 }), candidate('p', { B1: 0.25 }), eps, hyst);
    expect(worse).toMatchObject({ decision: 'KEEP', reason: { params: { gain: 0, threshold: 0, level: 'B1' } } });
    const b5 = decideReplacement(candidate('c', { B5: 0 }), candidate('p', { B5: 0.5 }), eps, hyst);
    expect(b5).toMatchObject({ decision: 'KEEP', reason: { params: { gain: 0.5, threshold: 0, level: 'B5' } } });
    const tie = decideReplacement(candidate('c', {}), candidate('p', {}), eps, hyst);
    expect(tie.reason.params).toEqual({ gain: 0, threshold: 0 });
    const none = decideReplacement(candidate('c', {}, ['A2']), candidate('p', {}, ['A1']), eps, hyst);
    expect(none.reason).toMatchObject({ code: 'SELECT.NO_ADMISSIBLE_CANDIDATE', params: { candidates: 2 } });
    const inadmissibleProposal = decideReplacement(candidate('c', {}), candidate('p', { B1: 1 }, ['A1']), eps, hyst);
    expect(inadmissibleProposal.reason.params).toEqual({ gain: 0, threshold: 0 });
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
