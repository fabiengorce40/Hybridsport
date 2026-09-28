/** Planificateur structurel V0 : filtres durs, sélection déterministe, anti-doublon, signalements. */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { asISODateTime } from '@hybridsport/domain';
import { entryKey, planWeek, STRENGTH_ARCHETYPE, zProfile } from '../src/index.js';
import type { PlanEntry } from '../src/index.js';
import { MONDAY, profile, runner } from './fixtures.js';

const at = asISODateTime('2026-10-05T07:00:00Z');
const plan = (o = {}, locked: PlanEntry[] = []) => planWeek({ profile: zProfile.parse(profile(o)), weekStart: MONDAY, locked, plannedAt: at });

describe('filtres', () => {
  it('seuls les jours disponibles, au plus une séance par jour, archétype du ruleset', () => {
    const p = plan();
    expect(p.entries.map((e) => [e.date, e.sport, e.archetypeId])).toEqual([
      ['2026-10-05', 'strength', STRENGTH_ARCHETYPE], ['2026-10-07', 'strength', STRENGTH_ARCHETYPE], ['2026-10-10', 'strength', STRENGTH_ARCHETYPE],
    ]);
    expect(new Set(p.entries.map((e) => e.date)).size).toBe(p.entries.length);
    expect(p.unplaced).toEqual([]);
  });

  it('durée minimale de l’archétype lue dans le ruleset (25 min) : un jour de 20 min n’est jamais utilisé', () => {
    const p = plan({ availability: [20, 20, 20, 30, 0, 0, 0] });
    expect(p.entries.map((e) => e.date)).toEqual(['2026-10-08']);
    expect(p.unplaced).toEqual([{ sport: 'strength', count: 2, reason: 'NOT_ENOUGH_DAYS' }]);
    expect(plan({ availability: [20, 20, 0, 0, 0, 0, 0] }).unplaced).toEqual([{ sport: 'strength', count: 3, reason: 'NO_DAY_LONG_ENOUGH' }]);
  });

  it('demande supérieure aux jours disponibles : jamais de double séance, demande non placée expliquée', () => {
    const p = plan({ strength: { enabled: true, goal: 'general', sessionsPerWeek: 5 }, availability: [60, 60, 0, 0, 0, 0, 0] });
    expect(p.entries).toHaveLength(2);
    expect(p.unplaced).toEqual([{ sport: 'strength', count: 3, reason: 'NOT_ENOUGH_DAYS' }]);
  });

  it('aucun jour disponible : aucune séance, raison exposée', () => {
    const p = plan({ availability: [0, 0, 0, 0, 0, 0, 0] });
    expect(p.entries).toEqual([]);
    expect(p.unplaced[0]?.reason).toBe('NO_DAY_LONG_ENOUGH');
  });

  it('cross-training et HYROX : jamais placés (aucun moteur), signalés', () => {
    const p = plan({ crosstraining: { enabled: true }, hyrox: { enabled: true }, priorities: ['hyrox', 'crosstraining', 'strength'] });
    expect(p.entries.every((e) => e.sport === 'strength')).toBe(true);
    expect(p.notices.filter((n) => n.code === 'PLAN.ENGINE_UNAVAILABLE').map((n) => n.params.sport)).toEqual(['hyrox', 'crosstraining']);
  });

  it('sport désactivé : jamais planifié', () => {
    expect(plan({ ...runner(), availability: [60, 60, 60, 60, 60, 60, 60] }).entries.every((e) => e.sport === 'running')).toBe(true);
  });
});

describe('sélection et multisport', () => {
  it('priorité déclarée en tour de rôle, espacement maximal, déterministe', () => {
    const o = { running: { ...runner().running!, sessionsPerWeek: 2 }, strength: { enabled: true, goal: 'strength' as const, sessionsPerWeek: 2 }, availability: [60, 60, 60, 60, 60, 60, 60], priorities: ['running', 'strength'] as const };
    const p = plan({ ...o, priorities: [...o.priorities] });
    expect(p.entries.map((e) => `${e.date.slice(8)}:${e.sport}`)).toEqual(['05:running', '06:strength', '08:running', '11:strength']);
    expect(plan({ ...o, priorities: [...o.priorities] })).toEqual(p);
  });

  it('jours consécutifs : signalés (règle de récupération non gouvernée), jamais bloqués', () => {
    const p = plan({ availability: [60, 60, 60, 0, 0, 0, 0] });
    expect(p.entries).toHaveLength(3);
    expect(p.notices.filter((n) => n.code === 'PLAN.RECOVERY_RULE_UNGOVERNED')).toHaveLength(2);
  });
});

describe('anti-doublon et séances verrouillées', () => {
  it('une séance commencée est conservée à sa date ; son jour n’est jamais réutilisé ; le quota en tient compte', () => {
    const locked: PlanEntry = { key: entryKey('2026-10-06', 'strength'), date: '2026-10-06', sport: 'strength', archetypeId: STRENGTH_ARCHETYPE, availableMinutes: 45 };
    const p = plan({ availability: [60, 0, 60, 0, 60, 90, 0] }, [locked]);
    expect(p.entries.filter((e) => e.date === '2026-10-06')).toEqual([locked]);
    expect(p.entries.filter((e) => e.sport === 'strength')).toHaveLength(3);
  });

  it('propriété : clés uniques, un jour au plus une séance, uniquement des jours disponibles et assez longs', () => {
    fc.assert(fc.property(fc.array(fc.constantFrom(0, 20, 30, 45, 60, 120), { minLength: 7, maxLength: 7 }), fc.integer({ min: 1, max: 7 }), fc.integer({ min: 1, max: 7 }), fc.boolean(),
      (availability, s, r, both) => {
        const p = plan({ availability, strength: { enabled: true, goal: 'general', sessionsPerWeek: s }, running: { ...runner().running!, enabled: both, sessionsPerWeek: r } });
        const dates = p.entries.map((e) => e.date);
        const minutes = (d: string) => availability[(Date.parse(`${d}T00:00:00Z`) - Date.parse(`${MONDAY}T00:00:00Z`)) / 86_400_000] ?? 0;
        return new Set(dates).size === dates.length && new Set(p.entries.map((e) => e.key)).size === dates.length
          && p.entries.every((e) => minutes(e.date) > 0 && (e.sport !== 'strength' || minutes(e.date) >= 25))
          && p.entries.filter((e) => e.sport === 'strength').length <= s;
      }), { numRuns: 200, seed: 20_261_005 });
  });
});
