/**
 * Course dans l'application (R5c) : composition §R par le moteur Course, TEST ⇒ référence TIME_TRIAL, première
 * séance de qualité après TEST (D2), rejeu puis progression (V19, D1), allure gouvernée (V18 ± V03), séances
 * manquées (§W), compatibilité des données enregistrées.
 */
import { describe, expect, it } from 'vitest';
import { canonicalStringify } from '@hybridsport/engine';
import { completeOnboarding, decodeState, emptyState, ensureCurrentWeek, finishSession, logFreeRun, recordRun, startSession, weekStartOf } from '../src/index.js';
import type { AppState, SessionLog } from '../src/index.js';
import { clock, MONDAY, profile, runner } from './fixtures.js';

const AVAIL = [60, 0, 60, 0, 60, 90, 0];
const FB = { difficulty: 'AS_EXPECTED' as const, pain: false, painAreas: [], note: '' };
const onboard = (goal: 'TEN_K' | 'FIVE_K', o = {}) => completeOnboarding(emptyState(), profile({ ...runner({ population: 'P_R3', goal, wearable: true, ...o }), availability: AVAIL }), clock(MONDAY, '05:00:00'));
const withRun = (s: AppState) => logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, distanceM: 5000 }, clock(MONDAY, '06:00:00'));
const week = (s: AppState, day: string) => (s.plans[weekStartOf(day)]?.entries ?? []).map((e) => ({ e, g: s.sessions[e.key] }));
const plan = (s: AppState, day: string) => week(s, day).map(({ e, g }) => `${e.date.slice(8)}:${e.archetypeId.replace('running.', '')}:${e.role ?? ''}:${g?.outcome.status ?? 'none'}`);
const segments = (s: AppState, key: string) => {
  const g = s.sessions[key];
  const p = g?.outcome.status === 'ok' ? g.outcome.session.blocks[0]?.items[0]?.prescription : undefined;
  return p?.type === 'run_structure' ? p.segments : [];
};
function doRun(s0: AppState, key: string, date: string, run: NonNullable<SessionLog['run']>, fb = FB): AppState {
  let s = startSession(s0, key, clock(date, '09:00:00'));
  s = recordRun(s, key, run);
  return finishSession(s, key, fb, clock(date, '10:30:00'));
}

describe('semaine Course composée par le moteur Course', () => {
  it('10K sans test : le TEST de 10 km remplace la séance de seuil, sur le jour assez long ; tracé', () => {
    const s = withRun(onboard('TEN_K'));
    expect(plan(s, MONDAY)).toEqual(['05:easy:EASY:ok', '07:easy:EASY:ok', '10:test:TEST:ok']);
    expect(s.plans[MONDAY]?.notices).toEqual([{ code: 'PLAN.RUNNING.WEEK_TEST_REPLACES_KEY', params: { cause: 'FIRST_EXPOSURE:THRESHOLD' } }]);
    const test = segments(s, '2026-10-10:running').find((x) => x.id === 'test');
    expect(test).toMatchObject({ kind: 'steady', dose: { distanceM: 10000 }, target: { effort: { rpe: { min: 9, max: 10 } }, priority: 'effort', pace: { provenance: { source: 'observed_athlete_range' } } } });
  });

  it('sans course réalisée avec distance : aucun TEST (allure observée absente), jamais une séance inventée', () => {
    const s = logFreeRun(onboard('TEN_K'), { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false }, clock(MONDAY, '06:00:00'));
    expect(plan(s, MONDAY).every((x) => x.includes(':easy:'))).toBe(true);
  });

  it('TEST terminé ⇒ référence TIME_TRIAL (10 km, temps du test seul) ; semaine suivante : première séance de seuil (D2)', () => {
    let s = withRun(onboard('TEN_K'));
    s = doRun(s, '2026-10-10:running', '2026-10-10', { realizedDurationS: 4200, completion: 'COMPLETED', testTimeS: 2700 });
    expect(s.running.references).toEqual([expect.objectContaining({ type: 'TIME_TRIAL', values: { distanceM: 10000, durationS: 2700 }, provenance: { source: 'APP_RECORDED', protocol: 'KAIRO_TEST_TT' } })]);
    expect(s.running.realized.at(-1)).toMatchObject({ archetype: 'TEST', structureFamily: 'CONTINUOUS' });
    expect(s.running.realized.at(-1)?.distanceM).toBeUndefined();
    const next = '2026-10-12';
    s = ensureCurrentWeek(s, clock(next, '07:00:00'));
    expect(plan(s, next)).toEqual(['12:easy:EASY:ok', '14:easy:EASY:ok', '17:threshold:KEY:ok']);
    expect(segments(s, '2026-10-17:running').find((x) => x.id === 'work')).toMatchObject({ kind: 'repeat', reps: 4, work: { durationS: 300 }, recovery: { dose: { durationS: 60 }, mode: 'jog' } });
  });

  it('séance de seuil faite comme prévu ⇒ structure réalisée enregistrée ; rejeu (V19) puis +1 répétition après 2 séances tolérées (D1)', () => {
    let s = withRun(onboard('TEN_K'));
    s = doRun(s, '2026-10-10:running', '2026-10-10', { realizedDurationS: 4200, completion: 'COMPLETED', testTimeS: 2700 });
    s = ensureCurrentWeek(s, clock('2026-10-12', '07:00:00'));
    s = doRun(s, '2026-10-17:running', '2026-10-17', { realizedDurationS: 2300, completion: 'COMPLETED' });
    expect(s.running.realized.at(-1)).toMatchObject({ archetype: 'THRESHOLD', structureFamily: 'INTERVALS', structure: { warmupS: 600, reps: 4, workS: 300, recoveryS: 60, recoveryMode: 'jog', cooldownS: 300 } });
    s = ensureCurrentWeek(s, clock('2026-10-19', '07:00:00'));
    const w3 = week(s, '2026-10-19').find(({ e }) => e.role === 'KEY');
    expect(w3?.e.archetypeId).toBe('running.threshold');
    expect(segments(s, w3?.e.key ?? '').find((x) => x.id === 'work')).toMatchObject({ reps: 4 });
    s = doRun(s, w3?.e.key ?? '', w3?.e.date ?? '', { realizedDurationS: 2300, completion: 'COMPLETED' });
    s = ensureCurrentWeek(s, clock('2026-10-26', '07:00:00'));
    const w4 = week(s, '2026-10-26').find(({ e }) => e.role === 'KEY');
    expect(segments(s, w4?.e.key ?? '').find((x) => x.id === 'work')).toMatchObject({ reps: 5 });
  });

  it('5K : TEST de 5 km ⇒ première séance sévère avec allure gouvernée (ancre 5 km ± 3 %)', () => {
    let s = withRun(onboard('FIVE_K'));
    expect(week(s, MONDAY).find(({ e }) => e.role === 'TEST')?.e.date).toBe('2026-10-10');
    s = doRun(s, '2026-10-10:running', '2026-10-10', { realizedDurationS: 2400, completion: 'COMPLETED', testTimeS: 1200 });
    s = ensureCurrentWeek(s, clock('2026-10-12', '07:00:00'));
    const key = week(s, '2026-10-12').find(({ e }) => e.role === 'KEY');
    expect(key?.e.archetypeId).toBe('running.severe');
    expect(segments(s, key?.e.key ?? '').find((x) => x.id === 'work')?.target).toMatchObject({ priority: 'pace', pace: { secPerKm: { min: 240 * 0.97, max: 240 * 1.03 }, provenance: { source: 'reference_derived', sourceId: 'test:2026-10-10:running' } } });
  });

  it('TEST douloureux ou interrompu : aucune référence enregistrée', () => {
    let s = withRun(onboard('TEN_K'));
    s = doRun(s, '2026-10-10:running', '2026-10-10', { realizedDurationS: 3000, completion: 'PARTIAL', testTimeS: 2000 });
    expect(s.running.references).toEqual([]);
    let t = withRun(onboard('TEN_K'));
    t = doRun(t, '2026-10-10:running', '2026-10-10', { realizedDurationS: 4200, completion: 'COMPLETED', testTimeS: 2700 }, { ...FB, pain: true });
    expect(t.running.references).toEqual([]);
  });

  it('déterminisme : même parcours ⇒ même état', () => {
    const a = canonicalStringify(withRun(onboard('TEN_K')));
    expect(canonicalStringify(withRun(onboard('TEN_K')))).toBe(a);
  });
});

describe('§W — séances de course manquées', () => {
  it('EASY manquée ⇒ abandonnée (tracée), jamais compensée ; idempotent', () => {
    const s0 = withRun(onboard('TEN_K'));
    const s = ensureCurrentWeek(s0, clock('2026-10-07', '07:00:00'));
    expect(s.plans[MONDAY]?.dropped).toEqual([{ date: MONDAY, archetypeId: 'running.easy', code: 'REPLAN.DROP_EASY' }]);
    expect(s.plans[MONDAY]?.entries.some((e) => e.date === MONDAY)).toBe(false);
    expect(s.sessions[`${MONDAY}:running`]).toBeUndefined();
    expect(ensureCurrentWeek(s, clock('2026-10-07', '08:00:00')).plans[MONDAY]).toEqual(s.plans[MONDAY]);
  });

  it('TEST manqué sans créneau hors zone gelée ⇒ abandonné (DROP_NO_VALID_SLOT)', () => {
    const s = ensureCurrentWeek(withRun(onboard('TEN_K')), clock('2026-10-11', '07:00:00'));
    expect(s.plans[MONDAY]?.dropped.find((d) => d.archetypeId === 'running.test')?.code).toBe('REPLAN.DROP_NO_VALID_SLOT');
  });

  it('séance clé manquée avec un jour libre conforme ⇒ déplacée (MOVE), régénérée', () => {
    let s = completeOnboarding(emptyState(), profile({ ...runner({ population: 'P_R3', goal: 'TEN_K', wearable: true, sessionsPerWeek: 2 }), availability: [90, 0, 60, 0, 90, 60, 0] }), clock(MONDAY, '05:00:00'));
    s = withRun(s);
    const test = week(s, MONDAY).find(({ e }) => e.role === 'TEST');
    expect(test?.e.date).toBe(MONDAY);
    s = ensureCurrentWeek(s, clock('2026-10-06', '07:00:00'));
    const moved = week(s, MONDAY).find(({ e }) => e.archetypeId === 'running.test');
    expect(moved?.e.date).toBe('2026-10-09');
    expect(moved?.g?.outcome.status).toBe('ok');
    expect(s.plans[MONDAY]?.notices.some((n) => n.code === 'PLAN.RUNNING.WEEK_MISSED_DECISION' && n.params.code === 'REPLAN.MOVE_KEY')).toBe(true);
  });
});

describe('compatibilité des données', () => {
  it('un état V0 enregistré avant R5 (sans références, côtes, séances abandonnées) se relit sans perte', () => {
    const s = withRun(onboard('TEN_K'));
    type Loose = Record<string, unknown>;
    const legacy = JSON.parse(JSON.stringify(s)) as { running: Loose; profile: { running: Loose }; plans: Record<string, Loose> };
    delete legacy.running.references;
    delete legacy.profile.running.hills;
    for (const p of Object.values(legacy.plans)) { delete p.dropped; delete p.runningRevision; }
    const d = decodeState(JSON.stringify(legacy));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.state.running.references).toEqual([]);
    expect(d.state.profile?.running.hills).toBe(false);
    expect(d.state.running.realized).toEqual(s.running.realized);
  });
});
