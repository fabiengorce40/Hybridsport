import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { SessionDraft } from '@hybridsport/domain';
import { estimateDuration, readDurationParams, fitDuration, checkDuration, readToleranceProfile, targetFromAvailable, defaultLeverPlan, canonicalStringify } from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { session, strengthSessionInput, set } from '../fixtures/sessions.js';

const catalog = testCatalog();
const ruleset = testRuleset();
const params = readDurationParams(ruleset);

function est(s: SessionDraft) {
  const r = estimateDuration(s, catalog, params);
  if (!r.ok) throw new Error(JSON.stringify(r.reasons));
  return r.estimate;
}

describe('DurationEngine — estimation par composants', () => {
  it('reproduit le calcul manuel (échauffement, séries, repos, mise en place, transitions, consignes)', () => {
    const e = est(session());
    // Échauffement 300 + 15 ; principal 652 (p50) ; accessoires 693 (p50) ; 2 transitions de bloc × 60.
    expect(e.byBlock.map((b) => b.p50)).toEqual([315, 652, 693]);
    expect(e.byBlock.map((b) => b.p90)).toEqual([315, 792.5, 841.5]);
    expect(e.p50).toBe(1780);
    expect(e.p90).toBeCloseTo(2009.80, 1);
    expect(e.p10).toBeCloseTo(1649.15, 1);
    expect(e.byBlock[0]?.fixed).toBe(true);
  });

  it('distingue temps disponible, cible, p50 et p90 ; faisable ⇔ p90 ≤ disponible', () => {
    const profile = readToleranceProfile(ruleset, 'strength_sets');
    expect(targetFromAvailable(2100, profile)).toBe(1740);
    const c = checkDuration(est(session()), 2100, 1740, profile);
    expect(c).toMatchObject({ feasible: true, withinTolerance: true, lowerS: 1566 });
    expect(checkDuration(est(session()), 2000, 1740, profile).feasible).toBe(false);
  });

  it('formats à durée fixe (AMRAP, EMOM) et For Time plafonné par le time cap', () => {
    const cond = session(strengthSessionInput({
      blocks: [{ id: 'b.amrap', kind: 'conditioning', role: 'primary', format: 'amrap', timeCapS: 600, items: [{ id: 'i.wb', exerciseId: 'ex.wall_ball', prescription: { type: 'reps', reps: 15 } }] }],
    }));
    expect(est(cond).p50).toBe(600 + 10 + 15); // time cap + mise en place + consignes
    const ft = session(strengthSessionInput({
      blocks: [{ id: 'b.ft', kind: 'conditioning', role: 'primary', format: 'for_time', rounds: 50, timeCapS: 900, items: [{ id: 'i.wb', exerciseId: 'ex.wall_ball', prescription: { type: 'reps', reps: 20 } }] }],
    }));
    expect(est(ft).p90).toBe(900 + 10 + 15);
  });

  it('donnée manquante ⇒ erreur TECHNICAL (jamais une valeur inventée)', () => {
    const bad = session(strengthSessionInput({ blocks: [{ id: 'b', kind: 'strength', role: 'primary', format: 'continuous', items: [{ id: 'i', exerciseId: 'ex.plank', prescription: { type: 'distance', distanceM: 100 } }] }] }));
    const r = estimateDuration(bad, catalog, params);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons[0]).toMatchObject({ code: 'TECHNICAL.UNKNOWN_REFERENCE', category: 'technical' });
  });

  it('déterministe : même entrée ⇒ même sortie octet pour octet', () => {
    expect(canonicalStringify(est(session()))).toBe(canonicalStringify(est(session())));
  });

  it('propriétés : p10 ≤ p50 ≤ p90 et une série de plus n’abaisse jamais p50', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 8 }), fc.integer({ min: 1, max: 15 }), fc.integer({ min: 0, max: 300 }), (n, reps, rest) => {
      const mk = (count: number) => session(strengthSessionInput({ blocks: [{ id: 'b', kind: 'strength', role: 'primary', format: 'sets', grouping: 'straight', items: [{ id: 'i', exerciseId: 'ex.back_squat', prescription: { type: 'sets', sets: Array.from({ length: count }, () => set('working', reps, rest)) } }] }] }));
      const a = est(mk(n));
      const b = est(mk(n + 1));
      expect(a.p10).toBeLessThanOrEqual(a.p50);
      expect(a.p50).toBeLessThanOrEqual(a.p90);
      expect(b.p50).toBeGreaterThan(a.p50);
    }), { numRuns: 200 });
  });
});

describe('DurationEngine — ajustement au temps disponible', () => {
  it('déjà conforme ⇒ FITS sans levier', () => {
    const r = fitDuration(session(), catalog, ruleset);
    expect(r.status).toBe('FITS');
    expect(r.appliedLevers).toEqual([]);
  });

  it('trop long ⇒ leviers du travail secondaire, bloc principal intact, p90 ≤ disponible', () => {
    const s = session(strengthSessionInput({ availableTimeS: 1850, targetDurationS: 1490 }));
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).toBe('FITS');
    if (r.status === 'INFEASIBLE') return;
    expect(r.estimate.p90).toBeLessThanOrEqual(1850);
    expect(r.appliedLevers.every((l) => l.blockId === 'b.acc')).toBe(true);
    expect(r.session.blocks.find((b) => b.id === 'b.main')).toEqual(s.blocks.find((b) => b.id === 'b.main'));
    expect(r.reasons.map((x) => x.code)).toContain('DURATION.ADJUSTED');
  });

  it('le volume principal n’est réduit qu’en dernier recours, et c’est signalé', () => {
    const input = strengthSessionInput({ availableTimeS: 1500, targetDurationS: 1140 });
    const main = input.blocks[1]!;
    const s = session({ ...input, blocks: [input.blocks[0]!, { ...main, levers: [{ kind: 'reduce_main_volume', min: 1 }] } as typeof main, input.blocks[2]!] });
    expect(defaultLeverPlan(s).at(-1)?.lever.kind).toBe('reduce_main_volume');
    const r = fitDuration(s, catalog, ruleset);
    const firstMain = r.appliedLevers.findIndex((l) => l.lever.kind === 'reduce_main_volume');
    expect(firstMain).toBeGreaterThan(0);
    expect(r.appliedLevers.slice(firstMain).every((l) => l.lever.kind === 'reduce_main_volume')).toBe(true);
    if (r.status !== 'INFEASIBLE') expect(r.reasons.map((x) => x.code)).toContain('DURATION.MAIN_VOLUME_REDUCED');
  });

  it('impossible à tenir ⇒ INFEASIBLE (FEASIBILITY), jamais une séance publiée hors du temps disponible', () => {
    const r = fitDuration(session(strengthSessionInput({ availableTimeS: 700, targetDurationS: 500 })), catalog, ruleset);
    expect(r.status).toBe('INFEASIBLE');
    expect(r.reasons[0]).toMatchObject({ code: 'DURATION.INFEASIBLE', category: 'feasibility' });
  });

  it('séance plus courte que la cible ⇒ acceptée telle quelle, AUCUN ajout artificiel', () => {
    const s = session(strengthSessionInput({ availableTimeS: 3600, targetDurationS: 3240 }));
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).toBe('SHORTER_ACCEPTED');
    if (r.status === 'SHORTER_ACCEPTED') expect(r.session).toEqual(s);
    expect(r.reasons.map((x) => x.code)).toContain('DURATION.SHORTER_ACCEPTED');
  });

  it('un levier sur l’échauffement est refusé (TECHNICAL)', () => {
    const input = strengthSessionInput();
    const warm = { ...input.blocks[0]!, levers: [{ kind: 'reduce_rest' as const, floorS: 0 }] };
    const r = fitDuration(session({ ...input, blocks: [warm, input.blocks[1]!, input.blocks[2]!] }), catalog, ruleset);
    expect(r.status).toBe('INFEASIBLE');
    expect(r.reasons[0]?.code).toBe('TECHNICAL.STRUCTURE_INVALID');
  });

  it('propriété : toute séance déclarée FITS respecte p90 ≤ disponible', () => {
    fc.assert(fc.property(fc.integer({ min: 600, max: 4000 }), (available) => {
      const r = fitDuration(session(strengthSessionInput({ availableTimeS: available, targetDurationS: Math.max(60, available - 360) })), catalog, ruleset);
      if (r.status !== 'INFEASIBLE') expect(r.estimate.p90).toBeLessThanOrEqual(available);
    }), { numRuns: 100 });
  });
});
