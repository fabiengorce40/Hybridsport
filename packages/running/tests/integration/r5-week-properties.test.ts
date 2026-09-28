/**
 * Gate Course — propriétés adverses de la composition (§R) et des séances manquées (§W), sonde aléatoire :
 * quelles que soient la semaine, l'historique et les refus du moteur, les invariants de sécurité tiennent.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { composeRunningWeek, CURRENT_RUNNING_GOVERNANCE, HIGH_DEMAND_ARCHETYPES, parseRunningContext, replanMissed, RUNNING_GOALS, RUNNING_SESSION_ARCHETYPES, withProductDecisions } from '../../src/index.js';
import type { Probe, RunningContext, RunningContextInput, RunningSessionArchetype } from '../../src/index.js';
import { ctxInput } from '../fixtures.js';

const DAY = 86_400_000;
const WEEK0 = Date.parse('2026-09-28T00:00:00Z');
const dateOf = (i: number) => new Date(WEEK0 + i * DAY).toISOString().slice(0, 10);
const dayNum = (iso: string) => Math.floor(Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso) / DAY);
const params = withProductDecisions(CURRENT_RUNNING_GOVERNANCE).parameters;
/** V10 et V11 du registre (lus dans les données, jamais réécrits). */
const v10 = params.find((p) => p.parameterId === 'running.hi.densityPolicy');
const density = (v10?.value.status === 'candidate' ? v10.value.value : {}) as Record<string, number>;
const isHd = (a: RunningSessionArchetype) => HIGH_DEMAND_ARCHETYPES.includes(a);
const LEVELS = ['P_R1', 'P_R2', 'P_R3', 'P_R4'] as const;

const arbWeek = fc.record({
  level: fc.constantFrom(...LEVELS),
  goal: fc.constantFrom(...RUNNING_GOALS),
  days: fc.uniqueArray(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 }),
  minutes: fc.array(fc.integer({ min: 20, max: 150 }), { minLength: 7, maxLength: 7 }),
  lockedAt: fc.option(fc.record({ day: fc.integer({ min: 0, max: 6 }), archetype: fc.constantFrom(...RUNNING_SESSION_ARCHETYPES) }), { nil: undefined }),
  history: fc.array(fc.record({ daysBefore: fc.integer({ min: 0, max: 20 }), archetype: fc.constantFrom(...RUNNING_SESSION_ARCHETYPES) }), { maxLength: 6 }),
  refusals: fc.array(fc.tuple(fc.constantFrom(...RUNNING_SESSION_ARCHETYPES), fc.integer({ min: 0, max: 6 })), { maxLength: 30 }),
  testRequired: fc.boolean(),
});

function ctxOf(level: typeof LEVELS[number], goal: typeof RUNNING_GOALS[number], history: { daysBefore: number; archetype: RunningSessionArchetype }[]): RunningContext {
  const input: RunningContextInput = {
    ...ctxInput({ population: { level, hybrid: false }, goal: { type: goal } }),
    sessionHistory: history.map((h, i) => ({
      sessionId: `h${String(i)}`, archetype: h.archetype, structureFamily: 'CONTINUOUS', completedAt: new Date(WEEK0 - h.daysBefore * DAY + 8 * 3600_000).toISOString().replace('.000Z', 'Z'),
      realizedDurationS: 1800, completion: 'COMPLETED',
    })),
  };
  const r = parseRunningContext(input);
  if (!r.ok) throw new Error('contexte invalide');
  return r.context;
}

const probeOf = (refusals: [RunningSessionArchetype, number][], testRequired: boolean): Probe => (a, date) => {
  const refused = refusals.some(([x, d]) => x === a && dateOf(d) === date);
  return { ok: !refused && !(testRequired && a !== 'TEST' && a !== 'EASY' && a !== 'LONG'), reasons: testRequired && a !== 'TEST' ? [{ code: 'DOSE.RUNNING.FIRST_EXPOSURE_REFUSED', params: { cause: 'RECENT_TEST_REQUIRED' } }] : [] };
};

describe('§R — invariants de la composition (propriétés)', () => {
  it('une séance par jour, séances verrouillées intactes, V11 (jamais deux jours consécutifs), V10 (fenêtre glissante), au plus une KEY / TEST, déterminisme', () => {
    fc.assert(fc.property(arbWeek, (w) => {
      const ctx = ctxOf(w.level, w.goal, w.history);
      const days = [...w.days].sort().map((i) => ({
        date: dateOf(i), availableS: (w.minutes[i] ?? 60) * 60,
        ...(w.lockedAt && w.lockedAt.day === i ? { locked: w.lockedAt.archetype } : {}),
      }));
      const run = (ds: typeof days) => composeRunningWeek({ ctx, days: ds, parameters: params, mode: 'CANDIDATE', probe: probeOf(w.refusals, w.testRequired) });
      const c = run(days);
      expect(c.slots.map((s) => s.date)).toEqual(days.map((d) => d.date));
      for (const d of days) if (d.locked) expect(c.slots.find((s) => s.date === d.date)).toEqual({ date: d.date, archetype: d.locked, role: 'LOCKED' });
      const realized = ctx.sessionHistory.filter((s) => isHd(s.archetype)).map((s) => dayNum(s.completedAt));
      const proposedHd = c.slots.filter((s) => s.role !== 'LOCKED' && isHd(s.archetype)).map((s) => dayNum(s.date));
      const lockedHd = c.slots.filter((s) => s.role === 'LOCKED' && isHd(s.archetype)).map((s) => dayNum(s.date));
      const all = [...new Set([...realized, ...lockedHd])];
      for (const d of proposedHd) {
        const others = [...all, ...proposedHd.filter((x) => x !== d)];
        expect(others.some((x) => Math.abs(x - d) <= 1)).toBe(false);
        expect(others.filter((x) => x <= d && d - x < (density.perDays ?? 7)).length + 1).toBeLessThanOrEqual(density[w.level] ?? 0);
      }
      expect(c.slots.filter((s) => s.role === 'KEY' || s.role === 'TEST').length).toBeLessThanOrEqual(1);
      if (c.mode === 'MAINTENANCE') expect(c.slots.every((s) => s.role === 'LOCKED' || s.archetype === 'EASY')).toBe(true);
      expect(JSON.stringify(run([...days].reverse()))).toBe(JSON.stringify(c));
    }), { numRuns: 300, seed: 9_1001 });
  });

  it('jamais une séance que la sonde (le moteur) a refusée ce jour-là, hors EASY de complément', () => {
    fc.assert(fc.property(arbWeek, (w) => {
      const ctx = ctxOf(w.level, w.goal, w.history);
      const days = [...w.days].sort().map((i) => ({ date: dateOf(i), availableS: (w.minutes[i] ?? 60) * 60 }));
      const probe = probeOf(w.refusals, w.testRequired);
      const c = composeRunningWeek({ ctx, days, parameters: params, mode: 'CANDIDATE', probe });
      for (const s of c.slots) if (s.role !== 'EASY') expect(probe(s.archetype, s.date).ok).toBe(true);
    }), { numRuns: 300, seed: 9_1002 });
  });
});

describe('§W — invariants des séances manquées (propriétés)', () => {
  it('EASY toujours abandonnée ; déplacement : jour libre, hors zone gelée, jamais deux fois le même, jamais adjacent à une forte demande, accepté par la sonde', () => {
    fc.assert(fc.property(arbWeek, fc.integer({ min: 0, max: 4 }), fc.uniqueArray(fc.integer({ min: 0, max: 6 }), { maxLength: 5 }), (w, todayIdx, freeIdx) => {
      const ctx = ctxOf(w.level, w.goal, w.history);
      const today = dateOf(todayIdx);
      const missed = w.days.filter((i) => i < todayIdx).map((i) => ({ date: dateOf(i), archetype: RUNNING_SESSION_ARCHETYPES[i % RUNNING_SESSION_ARCHETYPES.length] as RunningSessionArchetype }));
      const planned = w.days.filter((i) => i >= todayIdx).map((i) => ({ date: dateOf(i), archetype: (i % 2 === 0 ? 'THRESHOLD' : 'EASY') as RunningSessionArchetype }));
      const freeDays = freeIdx.filter((i) => !w.days.includes(i)).map((i) => ({ date: dateOf(i), availableS: 3600 }));
      const probe = probeOf(w.refusals, false);
      const r = replanMissed({ ctx, today, missed, planned, freeDays, parameters: params, mode: 'CANDIDATE', probe });
      expect(r.decisions).toHaveLength(missed.length);
      const targets = r.decisions.flatMap((d) => (d.decision === 'MOVE' ? [d] : []));
      expect(new Set(targets.map((t) => t.to)).size).toBe(targets.length);
      for (const d of r.decisions) if (d.archetype === 'EASY' || d.archetype === 'STRIDES') expect(d.decision).toBe('DROP');
      const realized = ctx.sessionHistory.filter((s) => isHd(s.archetype)).map((s) => dayNum(s.completedAt));
      const hd = [...realized, ...planned.filter((p) => isHd(p.archetype)).map((p) => dayNum(p.date))];
      for (const t of targets) {
        expect(freeDays.some((f) => f.date === t.to)).toBe(true);
        expect(dayNum(t.to) - dayNum(today)).toBeGreaterThanOrEqual(2);
        expect(probe(t.archetype, t.to).ok).toBe(true);
        if (isHd(t.archetype)) expect([...hd, ...targets.filter((x) => x !== t && isHd(x.archetype)).map((x) => dayNum(x.to))].some((x) => Math.abs(x - dayNum(t.to)) <= 1)).toBe(false);
      }
    }), { numRuns: 300, seed: 9_1003 });
  });
});
