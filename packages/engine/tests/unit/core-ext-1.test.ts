/**
 * Phase 4B — CORE-EXT-1 : EXERCISE → PRESCRIPTION → SETS. Combinaisons incohérentes impossibles au
 * parsing ; DurationEngine compatible avec les plages de reps et les séries facultatives.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { zItem, zSetPrescription } from '@hybridsport/domain';
import type { SessionDraftInput } from '@hybridsport/domain';
import { applyLeverStep, canonicalStringify, estimateDuration, readDurationParams, readLeverSteps } from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';

const catalog = testCatalog();
const ruleset = testRuleset();
const params = readDurationParams(ruleset);
const est = (input: SessionDraftInput) => {
  const r = estimateDuration(session(input), catalog, params);
  if (!r.ok) throw new Error(JSON.stringify(r.reasons));
  return r.estimate;
};
type SetInput = Parameters<typeof zSetPrescription.parse>[0];
const ok = (s: SetInput) => zSetPrescription.safeParse(s).success;

describe('CORE-EXT-1 — séries typées', () => {
  it('formes valides : reps exactes, plage, load, pourcentage, effort RIR, effort RPE, montée relative, poids du corps, tempo, facultative', () => {
    expect(ok({ kind: 'working', reps: 5, restAfterS: 120 })).toBe(true);
    expect(ok({ kind: 'working', reps: 5, restAfterS: 120, rir: 2 })).toBe(true); // forme historique
    expect(ok({ kind: 'working', reps: { min: 6, max: 10 }, restAfterS: 90 })).toBe(true);
    expect(ok({ kind: 'working', reps: 5, restAfterS: 150, intensity: { mode: 'load', kg: 80, certainty: 'prescribed', effort: { rir: 2 } } })).toBe(true);
    expect(ok({ kind: 'working', reps: 3, restAfterS: 180, intensity: { mode: 'percent_of_reference', fraction: 0.85, reference: 'e1rm', kgRounded: 100 } })).toBe(true);
    expect(ok({ kind: 'working', reps: 8, restAfterS: 90, intensity: { mode: 'effort', effort: { rir: 1 } } })).toBe(true);
    expect(ok({ kind: 'working', reps: 8, restAfterS: 90, intensity: { mode: 'effort', effort: { rpe: 8 }, indicativeKg: { min: 40, max: 45 } } })).toBe(true);
    expect(ok({ kind: 'rampup', reps: 5, restAfterS: 60, intensity: { mode: 'relative_to_working', fraction: 0.5 } })).toBe(true);
    expect(ok({ kind: 'working', reps: 10, restAfterS: 60, intensity: { mode: 'bodyweight', addedKg: 10 } })).toBe(true);
    expect(ok({ kind: 'working', reps: 8, restAfterS: 90, tempo: [3, 1, null, null] })).toBe(true);
    expect(ok({ kind: 'working', reps: 8, restAfterS: 90, optional: true })).toBe(true);
  });

  it.each([
    ['RIR historique + intensity', { kind: 'working', reps: 5, restAfterS: 60, rir: 2, intensity: { mode: 'effort', effort: { rir: 2 } } }],
    ['RIR et RPE ensemble', { kind: 'working', reps: 5, restAfterS: 60, intensity: { mode: 'effort', effort: { rir: 2, rpe: 8 } } }],
    ['relative_to_working sur une série de travail', { kind: 'working', reps: 5, restAfterS: 60, intensity: { mode: 'relative_to_working', fraction: 0.8 } }],
    ['montée en charge facultative', { kind: 'rampup', reps: 5, restAfterS: 60, optional: true }],
    ['série lourde facultative', { kind: 'top_set', reps: 3, restAfterS: 180, optional: true }],
    ['plage min > max', { kind: 'working', reps: { min: 10, max: 6 }, restAfterS: 60 }],
    ['reps nulles', { kind: 'working', reps: 0, restAfterS: 60 }],
    ['repos négatif', { kind: 'working', reps: 5, restAfterS: -1 }],
    ['charge NaN', { kind: 'working', reps: 5, restAfterS: 60, intensity: { mode: 'load', kg: Number.NaN, certainty: 'prescribed' } }],
    ['charge infinie', { kind: 'working', reps: 5, restAfterS: 60, intensity: { mode: 'load', kg: Number.POSITIVE_INFINITY, certainty: 'prescribed' } }],
    ['fraction relative > 1', { kind: 'rampup', reps: 5, restAfterS: 60, intensity: { mode: 'relative_to_working', fraction: 1.2 } }],
    ['mode inconnu', { kind: 'working', reps: 5, restAfterS: 60, intensity: { mode: 'vibes' } }],
    ['champ inconnu', { kind: 'working', reps: 5, restAfterS: 60, validated: true }],
  ])('%s ⇒ refusé au parsing', (_n, s) => {
    expect(zSetPrescription.safeParse(s).success).toBe(false);
  });

  it('prescription en durée : jamais de répétitions exigées ; séries refusées hors type sets', () => {
    expect(zItem.safeParse({ id: 'i', exerciseId: 'ex.plank', prescription: { type: 'hold', seconds: 30 } }).success).toBe(true);
    expect(zItem.safeParse({ id: 'i', exerciseId: 'ex.plank', prescription: { type: 'hold', seconds: 30, reps: 5 } }).success).toBe(false);
  });

  it('références d’item : ancre déclarée sans trackId refusée ; alternatives bornées ; champs inconnus refusés', () => {
    const base = { id: 'i', exerciseId: 'ex.bench_press', prescription: { type: 'sets', sets: [{ kind: 'working', reps: 5, restAfterS: 120 }] } };
    expect(zItem.safeParse({ ...base, refs: { slotId: 's', progressionTrackId: 't', anchor: 'declared', prescriptionSource: 'track' } }).success).toBe(true);
    expect(zItem.safeParse({ ...base, refs: { anchor: 'declared' } }).success).toBe(false);
    expect(zItem.safeParse({ ...base, refs: { anchor: 'candidate', slotId: 's' } }).success).toBe(true);
    expect(zItem.safeParse({ ...base, alternatives: ['a', 'b', 'c', 'd'] }).success).toBe(false);
    expect(zItem.safeParse({ ...base, refs: { slotId: 's', trusted: true } }).success).toBe(false);
  });
});

describe('CORE-EXT-1 — DurationEngine', () => {
  const withSets = (sets: SetInput[]): SessionDraftInput => {
    const base = strengthSessionInput();
    const main = base.blocks[1]!;
    return { ...base, blocks: [base.blocks[0]!, { ...main, items: [{ ...main.items[0]!, prescription: { type: 'sets', sets } }] } as typeof main, base.blocks[2]!] };
  };

  it('séances sans nouveaux champs : estimation inchangée (valeurs de référence de la phase 3)', () => {
    const e = est(strengthSessionInput());
    expect(e.p50).toBe(1780);
    expect(e.p90).toBeCloseTo(2009.80, 1);
  });

  it('plage de reps : min → min, milieu → p50, max → p90 ; équivalente aux reps exactes quand min = max', () => {
    const exact = est(withSets([{ kind: 'working', reps: 8, restAfterS: 120 }, { kind: 'working', reps: 8, restAfterS: 120 }]));
    const degenerate = est(withSets([{ kind: 'working', reps: { min: 8, max: 8 }, restAfterS: 120 }, { kind: 'working', reps: { min: 8, max: 8 }, restAfterS: 120 }]));
    expect(canonicalStringify(degenerate)).toBe(canonicalStringify(exact));
    const range = est(withSets([{ kind: 'working', reps: { min: 6, max: 10 }, restAfterS: 120 }, { kind: 'working', reps: { min: 6, max: 10 }, restAfterS: 120 }]));
    expect(range.p50).toBeCloseTo(exact.p50, 6); // milieu de 6–10 = 8
    expect(range.p90).toBeGreaterThan(exact.p90);
  });

  it('série facultative : absente de p50, présente dans p90', () => {
    const two = est(withSets([{ kind: 'working', reps: 8, restAfterS: 120 }, { kind: 'working', reps: 8, restAfterS: 120 }]));
    const withOptional = est(withSets([{ kind: 'working', reps: 8, restAfterS: 120 }, { kind: 'working', reps: 8, restAfterS: 120 }, { kind: 'working', reps: 8, restAfterS: 120, optional: true }]));
    expect(withOptional.p50).toBe(two.p50);
    expect(withOptional.p90).toBeGreaterThan(two.p90);
  });

  it('propriété : p10 ≤ p50 ≤ p90 pour toute plage et toute présence de série facultative', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 15 }), fc.integer({ min: 0, max: 10 }), fc.boolean(), (lo, span, optional) => {
      const e = est(withSets([{ kind: 'working', reps: { min: lo, max: lo + span }, restAfterS: 90 }, { kind: 'working', reps: lo, restAfterS: 90, ...(optional ? { optional: true } : {}) }]));
      expect(e.p10).toBeLessThanOrEqual(e.p50);
      expect(e.p50).toBeLessThanOrEqual(e.p90);
    }), { numRuns: 100 });
  });

  it('levier reduce_sets : retire d’abord la série facultative, jamais une montée en charge', () => {
    const base = strengthSessionInput();
    const acc = base.blocks[2]!;
    const s = session({ ...base, blocks: [base.blocks[0]!, base.blocks[1]!, { ...acc, items: [{ ...acc.items[0]!, prescription: { type: 'sets', sets: [
      { kind: 'rampup', reps: 8, restAfterS: 60 }, { kind: 'working', reps: 10, restAfterS: 90 }, { kind: 'working', reps: 10, restAfterS: 90 }, { kind: 'working', reps: 10, restAfterS: 90, optional: true },
    ] } }, acc.items[1]!] } as typeof acc] });
    const after = applyLeverStep(s, { blockId: 'b.acc', lever: { kind: 'reduce_sets', min: 1 } }, readLeverSteps(ruleset));
    const p = after?.blocks[2]?.items[0]?.prescription;
    expect(p?.type === 'sets' && p.sets.map((x) => `${x.kind}${x.optional === true ? '?' : ''}`)).toEqual(['rampup', 'working', 'working']);
  });
});
