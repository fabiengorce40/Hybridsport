import { describe, expect, it } from 'vitest';
import { SeededRng, compareOptimization, readTolerances, selectBest, fromArray, RulesetParameterError } from '../../src/index.js';
import type { Tolerances } from '../../src/index.js';
import { candidate } from '../fixtures/candidates.js';
import { testRuleset } from '../fixtures/load.js';
import { param, testRulesetDocument } from '../fixtures/ruleset.js';

const eps: Tolerances = readTolerances(testRuleset());
const rng = () => SeededRng.fromSeed('select');

describe('couche B — score lexicographique à tolérance', () => {
  it('ε est lu dans le ruleset (aucune valeur définitive dans le code)', () => {
    expect(eps.B1).toBe(0.05);
    const base = testRulesetDocument();
    const bad = testRuleset({ ...base, parameters: base.parameters.map((p) => (p.id === 'core.optimization.epsilon' ? param(p.id, { B1: 0.1 }, 'G2') : p)) });
    expect(() => readTolerances(bad)).toThrow(RulesetParameterError);
  });

  it('écart ≤ ε ⇒ niveau suivant ; écart > ε ⇒ décision à ce niveau', () => {
    const a = fromArray([0.80, 0.5, 0.9, 0, 0, 0]);
    const b = fromArray([0.82, 0.5, 0.2, 0, 0, 0]);
    expect(compareOptimization(a, b, eps)).toMatchObject({ winner: 'a', decidingLevel: 'B3' });
    expect(compareOptimization(fromArray([0.9, 0, 0, 0, 0, 0]), b, eps)).toMatchObject({ winner: 'a', decidingLevel: 'B1' });
    expect(compareOptimization(a, a, eps)).toEqual({ winner: 'tie' });
  });
});

describe('cas de conflit de référence (spec 01 §5)', () => {
  it('A. séance optimale mais trop longue : filtrée par A2, la plus courte admissible gagne', () => {
    const s = selectBest([candidate('long_optimal', { B1: 1 }, ['A2']), candidate('short', { B1: 0.7 })], eps, rng());
    expect(s.status === 'selected' && s.winner.id).toBe('short');
    expect(s.rejected[0]?.reasons.map((r) => r.code)).toEqual(['SELECT.CANDIDATE_INADMISSIBLE', 'FEASIBILITY.TIME_EXCEEDED']);
  });

  it('B. légèrement meilleure mais détestée : écart B1 ≤ ε ⇒ B3 (adhérence) décide', () => {
    const s = selectBest([candidate('better_hated', { B1: 0.82, B3: 0.1 }), candidate('liked', { B1: 0.80, B3: 0.9 })], eps, rng());
    expect(s.status === 'selected' && [s.winner.id, s.decidingLevel]).toEqual(['liked', 'B3']);
    expect(s.reasons.map((r) => r.code)).toContain('SELECT.ADHERENCE_TIEBREAK');
    // Écart au-delà de ε : la meilleure séance est conservée.
    const s2 = selectBest([candidate('clearly_better_hated', { B1: 0.95, B3: 0.1 }), candidate('liked', { B1: 0.80, B3: 0.9 })], eps, rng());
    expect(s2.status === 'selected' && [s2.winner.id, s2.decidingLevel]).toEqual(['clearly_better_hated', 'B1']);
  });

  it('C. objectif secondaire incompatible avec une séance clé : B1 > B4', () => {
    const s = selectBest([candidate('keep_key', { B1: 0.9, B4: 0.1 }), candidate('serve_secondary', { B1: 0.6, B4: 1 })], eps, rng());
    expect(s.status === 'selected' && s.winner.id).toBe('keep_key');
  });

  it('D. variété contre progression : B2 > B6', () => {
    const s = selectBest([candidate('anchor_repeat', { B1: 0.8, B2: 0.9, B6: 0 }), candidate('novel', { B1: 0.8, B2: 0.4, B6: 1 })], eps, rng());
    expect(s.status === 'selected' && [s.winner.id, s.decidingLevel]).toEqual(['anchor_repeat', 'B2']);
  });

  it('F. préférence contre sécurité : A1 filtre, même avec un B6 maximal', () => {
    const s = selectBest([candidate('preferred_unsafe', { B1: 1, B6: 1000 }, ['A1']), candidate('safe', { B1: 0.1 })], eps, rng());
    expect(s.status === 'selected' && s.winner.id).toBe('safe');
    expect(s.rejected[0]?.reasons[1]?.category).toBe('safety');
  });

  it('aucune solution admissible ⇒ status none + raison explicite', () => {
    const s = selectBest([candidate('x', { B1: 1 }, ['A1'])], eps, rng());
    expect(s.status).toBe('none');
    expect(s.reasons[0]?.code).toBe('SELECT.NO_ADMISSIBLE_CANDIDATE');
  });

  it('égalité parfaite ⇒ départage par graine, tracé', () => {
    const s = selectBest([candidate('a', { B1: 0.5 }), candidate('b', { B1: 0.5 })], eps, rng());
    expect(s.status === 'selected' && s.reasons.map((r) => r.code)).toEqual(['SELECT.TIE_BROKEN_BY_SEED']);
  });

  it('vecteur non fini ⇒ rejet TECHNICAL (fail-closed)', () => {
    const bad = { ...candidate('nan', { B1: 1 }), optimization: [Number.NaN, 0, 0, 0, 0, 0] };
    const s = selectBest([bad, candidate('ok', { B1: 0.1 })], eps, rng());
    expect(s.status === 'selected' && s.winner.id).toBe('ok');
    expect(s.rejected[0]?.reasons[0]?.code).toBe('TECHNICAL.NON_FINITE_VALUE');
  });
});
