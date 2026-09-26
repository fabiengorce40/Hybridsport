import { describe, expect, it } from 'vitest';
import { runCorePipeline, canonicalStringify, canonicalParse, explain } from '../../src/index.js';
import { coreContext } from '../harness/context.js';
import { REQUESTS } from '../harness/requests.js';
import { testRuleset } from '../fixtures/load.js';
import { testRulesetDocument } from '../fixtures/ruleset.js';

describe('pipeline CORE de bout en bout (PROFILE + STATE + RULESET + CATALOG + REQUEST + SEED)', () => {
  it('nominal : admissibilité → score → durée → validation → trace → résultat', () => {
    const { result, trace } = runCorePipeline(REQUESTS.nominal!, coreContext());
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    // B1 à 0,02 près (≤ ε) ⇒ B2 décide en faveur de la séance barre.
    expect(result.value.id).toBe('session.test.upper');
    expect(result.validation.status).toBe('VALID');
    expect(result.trace.traceId).toBe(trace.traceId);
    expect(trace.entries.map((e) => e.step)).toEqual(['safety', 'duration', 'validate', 'duration', 'validate', 'score', 'result']);
    const why = explain(trace, { kind: 'program', id: 'harness-seed' });
    expect(why.byCategory.optimization?.[0]).toMatchObject({ code: 'SELECT.DECIDED_AT_LEVEL', params: { level: 'B2' } });
  });

  it('aucun candidat admissible (haltères seuls) ⇒ réparation (substitutions) ⇒ séance valide', () => {
    const { result, trace } = runCorePipeline(REQUESTS.dumbbells_only!, coreContext());
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))).not.toContain('ex.bench_press');
    expect(trace.entries.some((e) => e.step === 'repair')).toBe(true);
  });

  it('douleur P2 sans consentement : adaptation immédiate, historique indisponible et lecture de l’état inconnue tracés', () => {
    const { result, trace } = runCorePipeline(REQUESTS.pain_p2_no_consent!, coreContext());
    const safety = trace.entries.find((e) => e.step === 'safety');
    expect(safety?.reasons.map((r) => r.code)).toEqual(expect.arrayContaining(['DATA.READINESS_UNKNOWN', 'DATA.HEALTH_HISTORY_UNAVAILABLE']));
    // Épaule exclue : aucun exercice sollicitant l'épaule ne subsiste, ou repos recommandé.
    expect(['ok', 'rest_recommended']).toContain(result.status);
    if (result.status === 'ok') {
      const cat = coreContext().catalog;
      for (const id of result.value.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))) expect(cat.exercise(id)?.painSensitiveAreas).not.toContain('shoulder');
    }
  });

  it('hors périmètre ⇒ OUT_OF_SCOPE ; P4 ⇒ SAFETY_BLOCK, quel que soit le score', () => {
    const scope = runCorePipeline(REQUESTS.out_of_scope!, coreContext()).result;
    expect(scope.status === 'error' && scope.error.code).toBe('OUT_OF_SCOPE');
    const p4 = runCorePipeline(REQUESTS.p4!, coreContext());
    expect(p4.result.status === 'error' && p4.result.error.code).toBe('SAFETY_BLOCK');
    expect(p4.trace.entries[0]?.reasons.map((r) => r.code)).toContain('SAFETY.PAIN.P4_INTERRUPTED');
  });

  it('déterminisme : même entrée + même graine ⇒ sortie identique octet pour octet ; sérialisable et rechargeable', () => {
    const a = canonicalStringify(runCorePipeline(REQUESTS.nominal!, coreContext('s1')));
    const b = canonicalStringify(runCorePipeline(REQUESTS.nominal!, coreContext('s1')));
    expect(a).toBe(b);
    expect(canonicalStringify(canonicalParse(a))).toBe(a);
  });

  it('paramètre manquant ⇒ erreur TECHNICAL explicite (jamais un résultat)', () => {
    const base = testRulesetDocument();
    const rs = testRuleset({ ...base, parameters: base.parameters.filter((p) => p.id !== 'core.optimization.epsilon') });
    const { result } = runCorePipeline(REQUESTS.nominal!, coreContext('s', rs));
    expect(result.status === 'error' && result.error.code).toBe('INVALID_INPUT');
    if (result.status === 'error') expect(result.error.reasons[0]?.category).toBe('technical');
  });
});
