/**
 * Strength S2 — alternatives d'une vraie semaine Beta 0 (profil → programme → planificateur → Strength → session_record) :
 * chaque alternative persistée est un substitut DIRECT du catalogue (contrat du moteur Strength), jamais un exercice
 * apparenté du même emplacement. Pec deck (aucune substitution déclarée) : aucune alternative.
 */
import { describe, expect, it } from 'vitest';
import { directSubstitutes } from '@hybridsport/strength';
import { createBeta0Programme, emptyState, strengthContent } from '../src/index.js';
import { clock, profile } from './fixtures.js';
import { plannedSession } from './executions.js';

const week = (goal: 'hypertrophy' | 'general', n: number) => createBeta0Programme(emptyState(), profile({
  priorities: ['strength', 'running'], strength: { enabled: true, goal, sessionsPerWeek: n },
  running: { enabled: true, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' }, availability: [60, 60, 60, 60, 60, 0, 60],
}), clock('2026-10-05'), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });

describe('alternatives persistées d’une vraie semaine Beta 0', () => {
  it.each([['hypertrophy', 4], ['general', 2]] as const)('%s ×%i : chaque alternative ∈ substituts directs ; pec deck sans alternative ; développé couché → haltères / machine', (goal, n) => {
    const s = week(goal, n);
    const catalog = strengthContent().catalog;
    const items = Object.values(s.planner.weeks).flatMap((w) => w.requests).filter((r) => r.sport === 'strength' && r.status === 'planned')
      .flatMap((r) => plannedSession(s, r.requestId).blocks.flatMap((b) => b.items));
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      const direct = directSubstitutes(catalog.exercise(it.exerciseId) as never, catalog).map((t) => t.id);
      for (const a of it.alternatives ?? []) expect(direct, `${it.exerciseId} → ${a}`).toContain(a);
    }
    expect(items.filter((it) => it.exerciseId === 'ex.pec_deck').every((it) => it.alternatives === undefined)).toBe(true);
    for (const it of items.filter((x) => x.exerciseId === 'ex.bench_press')) expect(it.alternatives).toEqual(['ex.db_bench_press', 'ex.machine_chest_press']);
  });
});
