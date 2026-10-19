/**
 * RC4.4 (lot A, G5) — second passage de placement global : déclenché SEULEMENT par des Full Body à J/J+1, strictement
 * inerte sans son paramètre (résultat identique au placement V0), placement V0 gardé et motivé quand aucune organisation
 * ne l'améliore sans dégradation mesurée. Les cas où G5 RETIENT une organisation (profils P1, P3) sont vérifiés par le
 * chemin réel Beta 0 (app-core, tests rc4-audit et rc44).
 */
import { describe, expect, it } from 'vitest';
import { planCore, planMultisportWeek } from '../../src/index.js';
import type { PlannedWeek, PlannerInput, SportIntent, SportPorts } from '../../src/index.js';
import { clock, days, input } from '../fixtures.js';
import { D, m3Ports } from '../m3-fixtures.js';
import { G5_TEST_MAX_CANDIDATES, m3Governance } from '../m3-governance.js';

const KEPT = 'PLAN.PLANNER.GLOBAL_PLACEMENT_KEPT';
const APPLIED = 'PLAN.PLANNER.GLOBAL_PLACEMENT_APPLIED';
const ports = (): SportPorts => m3Ports({ composedRunning: true });
const g5 = () => m3Governance({ globalPlacement: true });
const calendar = (w: PlannedWeek) => w.requests.map((r) => `${r.requestId}@${r.status === 'planned' ? r.date : '-'}`);
const sessions = (w: PlannedWeek) => w.requests.map((r) => (r.status === 'planned' ? JSON.stringify(r.session) : r.status));
const fullBodyPairs = (w: PlannedWeek): number => {
  const d = w.requests.flatMap((r) => (r.status === 'planned' && r.intent?.archetypeId === 'str_full_body' ? [Date.parse(r.date)] : [])).sort((a, b) => a - b);
  // technical-constant: millisecondes par jour (conversion d'unité)
  return d.filter((x, i) => i > 0 && x - (d[i - 1] as number) === 86_400_000).length;
};

const CASES: readonly { readonly name: string; readonly demands: readonly SportIntent[]; readonly minutes?: readonly number[] }[] = [
  { name: 'Musculation 3× + Course 2× (semaine pleine)', demands: [D.strength(3), D.runningComposed(2)] },
  { name: 'Musculation 4× + Course 2×', demands: [D.strength(4), D.runningComposed(2)] },
  { name: 'Musculation 3× + Cross-training 2×', demands: [D.strength(3), D.ct(2)] },
  { name: 'Musculation 3× + HYROX 2×', demands: [D.strength(3), D.hyrox(2)] },
  { name: 'Course prioritaire 2× + Musculation 3×', demands: [D.runningComposed(2), D.strength(3)] },
  // technical-constant: TEST_ONLY — disponibilités (minutes) de la semaine de test
  { name: 'Musculation 3× + Course 2×, 5 jours disponibles', demands: [D.strength(3), D.runningComposed(2)], minutes: [90, 0, 90, 90, 0, 120, 120] },
];
const inputOf = (c: (typeof CASES)[number], o: Partial<PlannerInput> = {}): PlannerInput => input(c.demands, { ...(c.minutes ? { days: days(c.minutes) } : {}), ...o });

describe('G5 — paramètre absent ou illisible : résultat STRICTEMENT identique au placement V0', () => {
  for (const c of CASES) {
    it(`${c.name} : planMultisportWeek ≡ planCore (paramètre absent)`, () => {
      const inp = inputOf(c);
      expect(planMultisportWeek(inp, ports(), m3Governance(), clock)).toEqual(planCore(inp, ports(), m3Governance(), clock));
    });
  }
  it('mode PRODUCTION : paramètre TEST_ONLY non lisible ⇒ placement V0, aucune trace G5', () => {
    const inp = inputOf(CASES[0] as (typeof CASES)[number], { mode: 'PRODUCTION' });
    const w = planMultisportWeek(inp, ports(), g5(), clock);
    expect(w).toEqual(planCore(inp, ports(), g5(), clock));
    expect(w.requests.flatMap((r) => r.reasons).some((x) => x.code === KEPT || x.code === APPLIED)).toBe(false);
  });
});

describe('G5 — paramètre présent', () => {
  for (const c of CASES) {
    it(`${c.name} : aucune séance retirée ; jours changés seulement si les Full Body J/J+1 baissent ; sinon V0 motivé`, () => {
      const inp = inputOf(c);
      const v0 = planCore(inp, ports(), g5(), clock);
      const w = planMultisportWeek(inp, ports(), g5(), clock);
      expect(w.requests.map((r) => r.requestId)).toEqual(v0.requests.map((r) => r.requestId));
      expect(w.requests.filter((r) => r.status === 'planned')).toHaveLength(v0.requests.filter((r) => r.status === 'planned').length);
      const reasons = w.requests.flatMap((r) => r.reasons);
      if (fullBodyPairs(v0) === 0) {
        // Déclencheur absent : aucun second passage, aucune trace.
        expect(w).toEqual(v0);
        return;
      }
      if (reasons.some((x) => x.code === APPLIED)) {
        expect(fullBodyPairs(w)).toBeLessThan(fullBodyPairs(v0));
        return;
      }
      // Placement V0 gardé : mêmes jours, mêmes séances, motif sur les seules séances Full Body à J/J+1.
      expect(calendar(w)).toEqual(calendar(v0));
      expect(sessions(w)).toEqual(sessions(v0));
      const kept = w.requests.filter((r) => r.reasons.some((x) => x.code === KEPT));
      expect(kept.length).toBeGreaterThanOrEqual(2);
      expect(kept.every((r) => r.sport === 'strength' && r.intent?.archetypeId === 'str_full_body')).toBe(true);
      const note = kept[0]?.reasons.find((x) => x.code === KEPT);
      expect(note?.params.fullBody).toBe(fullBodyPairs(v0));
      expect(Number(note?.params.candidates)).toBeLessThanOrEqual(G5_TEST_MAX_CANDIDATES);
      expect(w.governance.some((x) => x.code === KEPT)).toBe(true);
    });
  }

  it('port Musculation sans mesure du volume par groupe : V0 gardé (cause GROUP_VOLUME_UNAVAILABLE), jamais déplacé à l’aveugle', () => {
    const p = ports();
    const { plannedGroupSets: _drop, ...strength } = p.strength as NonNullable<SportPorts['strength']>;
    const blind: SportPorts = { ...p, strength };
    const inp = inputOf(CASES[0] as (typeof CASES)[number]);
    const v0 = planCore(inp, blind, g5(), clock);
    const w = planMultisportWeek(inp, blind, g5(), clock);
    expect(fullBodyPairs(v0)).toBeGreaterThan(0);
    expect(calendar(w)).toEqual(calendar(v0));
    expect(w.requests.flatMap((r) => r.reasons).find((x) => x.code === KEPT)?.params.cause).toBe('GROUP_VOLUME_UNAVAILABLE');
  });

  it('déterministe : deux exécutions identiques', () => {
    const inp = inputOf(CASES[1] as (typeof CASES)[number]);
    expect(planMultisportWeek(inp, ports(), g5(), clock)).toEqual(planMultisportWeek(inp, ports(), g5(), clock));
  });
});
