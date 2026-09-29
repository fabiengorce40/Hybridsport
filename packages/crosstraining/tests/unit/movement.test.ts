/**
 * C1 — validation structurelle qualitative : mouvements chargés non représentables, formats non résolus.
 */
import { describe, expect, it } from 'vitest';
import { CT_CODES, CT_FORMATS, CT_STIMULI, CURRENT_CT_GOVERNANCE, formatAdmissibility, movementRepresentability } from '../../src/index.js';
import type { CtGovernance } from '../../src/index.js';
import { testCatalog } from '../../../engine/tests/fixtures/load.js';
import { fullyValuedGovernance, withCandidate, withParameter } from '../fixtures.js';

const codes = (xs: readonly { code: string }[]) => xs.map((x) => x.code);

describe('représentabilité des mouvements', () => {
  it('non chargeable ou poids du corps ⇒ représentable ; tout autre modèle de charge ⇒ refus + CORE-EXT-C1', () => {
    expect(movementRepresentability({ id: 'a', loadable: false }, CURRENT_CT_GOVERNANCE)).toEqual({ representable: true });
    expect(movementRepresentability({ id: 'a', loadable: false, loadModel: 'barbell' }, CURRENT_CT_GOVERNANCE)).toEqual({ representable: true });
    expect(movementRepresentability({ id: 'a', loadable: true, loadModel: 'bodyweight_plus' }, CURRENT_CT_GOVERNANCE)).toEqual({ representable: true });
    for (const loadModel of ['barbell', 'dumbbell_pair', 'dumbbell_single', 'kettlebell', 'machine_stack', 'plate_loaded', 'implement_fixed'] as const) {
      const r = movementRepresentability({ id: 'x', loadable: true, loadModel }, CURRENT_CT_GOVERNANCE);
      expect(r.representable).toBe(false);
      if (!r.representable) {
        expect(r.reasons[0]).toMatchObject({ code: CT_CODES.MOVEMENT_LOAD_UNREPRESENTABLE, params: { exerciseId: 'x', loadModel } });
        expect(r.reasons[1]).toMatchObject({ code: CT_CODES.TECHNICAL_DEPENDENCY, params: { dependencyId: 'CORE_EXT_C1' } });
      }
    }
    const unspecified = movementRepresentability({ id: 'y', loadable: true }, CURRENT_CT_GOVERNANCE);
    expect(!unspecified.representable && unspecified.reasons[0]?.params).toEqual({ exerciseId: 'y', loadModel: 'unspecified' });
  });

  it('même avec CORE-EXT-C1 satisfaite, C1 refuse toujours la charge', () => {
    const r = movementRepresentability({ id: 'x', loadable: true, loadModel: 'kettlebell' }, fullyValuedGovernance());
    expect(r.representable).toBe(false);
    if (!r.representable) expect(codes(r.reasons)).toEqual([CT_CODES.MOVEMENT_LOAD_UNREPRESENTABLE]);
  });

  it('catalogue de test : les mouvements Cross-training chargés sont tous refusés', () => {
    const ct = testCatalog().exercises().filter((e) => e.disciplines.includes('crosstraining'));
    expect(ct.length).toBeGreaterThan(0);
    for (const e of ct) {
      const loaded = e.loadable && e.loadModel !== 'bodyweight_plus';
      expect(movementRepresentability(e, CURRENT_CT_GOVERNANCE).representable, e.id).toBe(!loaded);
    }
  });
});

describe('admissibilité d’un format', () => {
  it('registre C1 : tout couple stimulus × format est NON RÉSOLU (jamais admissible par défaut)', () => {
    for (const s of CT_STIMULI) for (const f of CT_FORMATS) for (const mode of ['CANDIDATE', 'PRODUCTION'] as const) {
      const r = formatAdmissibility(s, f, CURRENT_CT_GOVERNANCE, mode);
      expect(r.status).toBe('unresolved');
      expect(r.reasons[0]).toMatchObject({ code: CT_CODES.FORMAT_ADMISSIBILITY_UNRESOLVED, params: { stimulus: s, format: f, parameterId: 'ct.stimulus.admissibleFormats' } });
      expect(r.reasons[1]).toMatchObject({ code: CT_CODES.UNRESOLVED_PARAMETER, params: { cause: 'NO_VALUE', mode } });
    }
  });

  const withTable = (value: unknown): CtGovernance => withParameter(CURRENT_CT_GOVERNANCE, 'ct.stimulus.admissibleFormats', (p) => withCandidate(p, value));

  it('valeur illisible ⇒ refus UNREADABLE ; stimulus absent ⇒ refus STIMULUS_ABSENT', () => {
    const unreadable = formatAdmissibility('threshold', 'emom', withTable({ threshold: ['sprint'] }), 'CANDIDATE');
    expect(unreadable.status).toBe('unresolved');
    expect(unreadable.reasons.at(-1)?.params).toEqual({ parameterId: 'ct.stimulus.admissibleFormats', cause: 'UNREADABLE', mode: 'CANDIDATE' });
    expect(formatAdmissibility('threshold', 'emom', withTable('tout'), 'CANDIDATE').status).toBe('unresolved');
    const absent = formatAdmissibility('threshold', 'emom', withTable({ aerobic_capacity: ['continuous'] }), 'CANDIDATE');
    expect(absent.status).toBe('unresolved');
    expect(absent.reasons.at(-1)?.params).toEqual({ parameterId: 'ct.stimulus.admissibleFormats', cause: 'STIMULUS_ABSENT', mode: 'CANDIDATE' });
  });

  it('table candidate lisible (TEST) : admissible / inadmissible, valeur candidate tracée ; refusée en PRODUCTION', () => {
    const g = withTable({ threshold: ['intervals'] });
    const ok = formatAdmissibility('threshold', 'intervals', g, 'CANDIDATE');
    expect(ok.status).toBe('admissible');
    expect(codes(ok.reasons)).toEqual([CT_CODES.CANDIDATE_VALUE_USED]);
    expect(formatAdmissibility('threshold', 'amrap', g, 'CANDIDATE').status).toBe('inadmissible');
    expect(formatAdmissibility('threshold', 'intervals', g, 'PRODUCTION').status).toBe('unresolved');
  });
});
