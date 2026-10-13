/**
 * RC2 — capacités d'ÉTUDE de M3 (`sameSport`, `sports`, critère `later`) : INERTES par défaut. Une règle sans ces
 * champs ignore les paires du même sport exactement comme avant ; aucune gouvernance existante ne les renseigne.
 */
import { describe, expect, it } from 'vitest';
import { detectConflicts, yielderOf } from '../../src/m3-analysis.js';
import type { M3Node, PairRule } from '../../src/m3-analysis.js';
import { m3Parameters } from '../m3-governance.js';

const H = (day: number) => day * 24;
const node = (id: string, sport: M3Node['sport'], day: number, rank: number, lk: 'high' | 'moderate' | 'none' = 'high'): M3Node => ({
  requestId: id, sport, date: `2026-10-0${String(5 + day)}`, hours: H(day), rank, importance: 'unknown', origin: 'planned',
  demand: { lower_knee: lk, lower_hip: 'none', upper_push: 'none', upper_pull: 'none', axial: 'none', locomotor_impact: 'none', high_intensity_systemic: 'none', grip: 'none' },
});
const S1 = node('s1', 'strength', 0, 0);
const S2 = node('s2', 'strength', 1, 0);
const CT = node('ct', 'crosstraining', 2, 2);
const R = node('r', 'running', 2, 1);
const base: PairRule = { id: 'p', structures: ['lower_knee'], levels: ['high'], withinHours: 36 };

describe('RC2 — capacités d’étude M3 (inertes par défaut)', () => {
  it('C-1. sans `sameSport` : deux séances du même sport ne sont jamais un conflit (comportement antérieur)', () => {
    expect(detectConflicts([S1, S2], [base], [])).toEqual([]);
  });
  it('C-2. `sameSport: true` : paire Musculation ↔ Musculation détectée ; `sports` restreint les membres', () => {
    expect(detectConflicts([S1, S2], [{ ...base, sameSport: true }], []).map((c) => c.members)).toEqual([['s1', 's2']]);
    expect(detectConflicts([S2, CT, R], [{ ...base, sameSport: true, sports: ['strength', 'crosstraining'] }], []).map((c) => c.members)).toEqual([['s2', 'ct']]);
  });
  it('C-3. critère `later` : à égalité d’importance et de rang, la plus tardive cède ; absent ⇒ indécis (comme avant)', () => {
    const [c] = detectConflicts([S1, S2], [{ ...base, sameSport: true }], []);
    const map = new Map([S1, S2].map((n) => [n.requestId, n]));
    if (!c) throw new Error('conflit attendu');
    expect(yielderOf(c, map, ['importance', 'rank']).node).toBeNull();
    expect(yielderOf(c, map, ['importance', 'rank', 'later']).node?.requestId).toBe('s2');
  });
  it('C-4. la gouvernance TEST par défaut ne renseigne aucune capacité d’étude', () => {
    const p = m3Parameters();
    const pair = p.find((x) => x.id === 'planner.m3.pairRules')?.value as unknown as PairRule[];
    const yp = p.find((x) => x.id === 'planner.m3.yieldPolicy')?.value as unknown as { order: string[] };
    expect(pair.every((r) => r.sameSport === undefined && r.sports === undefined)).toBe(true);
    expect(yp.order).not.toContain('later');
  });
});
