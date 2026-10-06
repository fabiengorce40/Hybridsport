/**
 * C3 — unités : registre des formats (générabilité), taxonomie (revue), lecture de séance (historique), présentation.
 */
import { describe, expect, it } from 'vitest';
import {
  C3_FORMATS, C3_FORMAT_IDS, C3_TAXONOMY_REVIEW, CT_CODES, CURRENT_CT_GOVERNANCE, ctPrescriptionOf, formatGenerability, movementRoles, presentC3, readC3,
} from '../../src/index.js';
import type { C3Plan } from '../../src/index.js';
import { c3Governance } from '../c3-fixtures.js';

describe('registre des formats', () => {
  it('registre réel : AUCUN format générable sauf ceux sans exigence propre ; rounds et chipper bloqués structurellement', () => {
    const real = Object.fromEntries(C3_FORMAT_IDS.map((f) => [f, formatGenerability(f, CURRENT_CT_GOVERNANCE, 'CANDIDATE')]));
    expect(real).toMatchObject({
      continuous: { generable: true }, intervals: { generable: false, causes: ['UNGOVERNED:ct.stimulus.workRestRatios'] },
      emom: { generable: false }, amrap: { generable: false }, for_time: { generable: false },
      rounds: { generable: false, causes: ['REPRESENTATION_AMBIGUOUS'] }, chipper: { generable: false, causes: ['CHIPPER_DEFINITION_UNGOVERNED'] },
    });
  });

  it('gouvernance TEST_ONLY : tous générables sauf rounds / chipper ; durée prescrite (temps) vs estimée (tâche)', () => {
    const g = c3Governance();
    expect(C3_FORMAT_IDS.filter((f) => formatGenerability(f, g, 'CANDIDATE').generable)).toEqual(['continuous', 'intervals', 'emom', 'amrap', 'for_time']);
    expect(C3_FORMAT_IDS.filter((f) => C3_FORMATS[f].duration === 'estimated')).toEqual(['for_time', 'rounds', 'chipper']);
    // PRODUCTION : valeurs EXPERT_PROPOSED jamais utilisables.
    expect(C3_FORMAT_IDS.filter((f) => formatGenerability(f, g, 'PRODUCTION').generable)).toEqual(['continuous']);
  });

  it('lecture d’un paramètre : forme illisible ⇒ C3_PARAMETER_UNREADABLE', () => {
    const r = readC3(c3Governance({ override: { 'ct.format.timeCapMargin': 'vingt pour cent' } }), 'ct.format.timeCapMargin', 'CANDIDATE');
    expect(r.ok).toBe(false);
    expect(r.reasons.map((x) => x.code)).toContain(CT_CODES.C3_PARAMETER_UNREADABLE);
  });
});

describe('taxonomie et rôles', () => {
  it('revue : aucune catégorie retenue n’est définitive ; « conditioning pur », « engine », « mixed » refusés', () => {
    expect(C3_TAXONOMY_REVIEW.filter((t) => t.verdict.startsWith('REFUSED')).map((t) => t.category)).toEqual(['conditioning pur', 'engine', 'mixed']);
    expect(C3_TAXONOMY_REVIEW.some((t) => t.verdict === 'BLOCKED' && t.category === 'strength+conditioning')).toBe(true);
  });

  it('rôles dérivés du catalogue (type de mouvement, pattern, région)', () => {
    expect(movementRoles({ movementType: 'monostructural', patterns: { primary: 'rowing', secondary: [] } }, 'cyclic')).toEqual(['monostructural']);
    expect(movementRoles({ movementType: 'strength', patterns: { primary: 'squat', secondary: [] } }, 'lower')).toEqual(['lower_body']);
    expect(movementRoles({ movementType: 'gymnastic', patterns: { primary: 'pull_vertical', secondary: [] } }, 'upper')).toEqual(['upper_pull']);
    expect(movementRoles({ movementType: 'mobility', patterns: { primary: 'mobility', secondary: [] } }, 'none')).toEqual([]);
  });
});

describe('lecture d’une séance CORE en prescription réalisée', () => {
  const block = (o: Record<string, unknown>, items: unknown[]) => ({ blocks: [{ id: 'b', kind: 'conditioning', role: 'primary', items, ...o }] }) as never;
  const reps = (exerciseId: string, n: number, kg?: number) => ({ id: exerciseId, exerciseId, prescription: { type: 'reps', reps: n, ...(kg ? { load: { kg, certainty: 'prescribed' } } : {}) } });
  it('AMRAP, EMOM, for time, intervalles, continu ; charge conservée ; hors périmètre ⇒ undefined', () => {
    expect(ctPrescriptionOf(block({ format: 'amrap', timeCapS: 600 }, [reps('ex.a', 10, 16)]))).toEqual({ format: 'amrap', durationS: 600, items: [{ exerciseId: 'ex.a', quantity: { kind: 'reps', value: 10 }, load: { kind: 'external_kg', value: 16 } }] });
    expect(ctPrescriptionOf(block({ format: 'emom', minutes: 10 }, [reps('ex.a', 5)]))?.format).toBe('emom');
    expect(ctPrescriptionOf(block({ format: 'for_time', rounds: 3, timeCapS: 900 }, [reps('ex.a', 5)]))).toMatchObject({ format: 'for_time', rounds: 3, timeCapS: 900 });
    expect(ctPrescriptionOf(block({ format: 'continuous' }, [{ id: 'i', exerciseId: 'ex.r', prescription: { type: 'timed', workS: 60, rounds: 4, restS: 30 } }]))).toMatchObject({ format: 'intervals', rounds: 4, workS: 60, restS: 30 });
    expect(ctPrescriptionOf(block({ format: 'continuous' }, [{ id: 'i', exerciseId: 'ex.r', prescription: { type: 'timed', workS: 600, rounds: 1, restS: 0 } }]))).toMatchObject({ format: 'continuous', durationS: 600 });
    expect(ctPrescriptionOf(block({ format: 'sets', grouping: 'straight' }, [reps('ex.a', 5)]))).toBeUndefined();
    expect(ctPrescriptionOf({ blocks: [] } as never)).toBeUndefined();
  });
});

describe('contrat de présentation', () => {
  it('chrono et résultats saisissables dérivés du format ; échauffement listé non généré', () => {
    const base = { stimulus: 'mixed_modal_medium', level: 'intermediate', structure: ['warmup', 'conditioning'], durationKind: 'prescribed', density: { kind: 'self_paced', detail: '' }, rejectedFormats: [], excludedByHistory: [], avoidedStructures: [], identicalToLast: [] } as const;
    const item = { itemId: 'i', role: 'lower_body', exerciseId: 'ex.a', quantity: { kind: 'reps', value: 10 }, criteria: ['x'] } as const;
    const emom = presentC3({ ...base, format: 'emom', blockS: 600, items: [item] } as C3Plan);
    expect(emom.blocks[0]).toMatchObject({ formatKey: 'ct.format.emom', chrono: { kind: 'every_minute', minutes: 10 }, resultKinds: ['emom', 'abandoned'] });
    expect(emom.notGenerated).toEqual(['warmup']);
    const ft = presentC3({ ...base, format: 'for_time', durationKind: 'estimated', blockS: 900, rounds: 3, items: [item] } as C3Plan);
    expect(ft.blocks[0]).toMatchObject({ rounds: 3, chrono: { kind: 'stopwatch_with_cap', capS: 900 }, resultKinds: ['time', 'capped', 'capped_rounds', 'abandoned'] });
    const iv = presentC3({ ...base, format: 'intervals', blockS: 900, items: [{ itemId: 'i', role: 'monostructural', exerciseId: 'ex.r', timed: { workS: 60, rounds: 5, restS: 30 }, criteria: ['x'] }] } as C3Plan);
    expect(iv.blocks[0]?.chrono).toEqual({ kind: 'intervals', workS: 60, restS: 30, rounds: 5 });
    expect(iv.blocks[0]?.movements[0]?.quantity).toEqual({ kind: 'duration_s', value: 60 });
  });
});
