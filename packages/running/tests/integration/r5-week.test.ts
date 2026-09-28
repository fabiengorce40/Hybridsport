/**
 * Vague R5b — composition hebdomadaire Course (§R) et séances manquées (§W), avec le MOTEUR RÉEL comme sonde
 * (décisions produit, simulation). Aucune dose n'est calculée par la composition : elle choisit des archétypes.
 */
import { describe, expect, it } from 'vitest';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { canonicalStringify, runSportSession } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { ARCHETYPE_INTENT_IDS, composeRunningWeek, createRunningEngine, CURRENT_RUNNING_GOVERNANCE, parseRunningContext, replanMissed, RUNNING_CODES, withProductDecisions } from '../../src/index.js';
import type { Probe, RunningContext, RunningContextInput, RunningSessionArchetype, WeekDay } from '../../src/index.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { coreContext, ctxInput, runIntent } from '../fixtures.js';

const WEEK = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'] as const;
const CORE_NOW = Date.parse('2026-09-28T08:00:00Z');
const daysAgo = (d: number) => new Date(CORE_NOW - d * 86_400_000).toISOString().replace('.000Z', 'Z');
type HistoryIn = NonNullable<RunningContextInput['sessionHistory']>[number];
const run = (id: string, d: number, o: Partial<HistoryIn> = {}): HistoryIn => ({
  sessionId: id, archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: daysAgo(d), realizedDurationS: 1800, completion: 'COMPLETED', unexpectedDifficulty: 'AS_EXPECTED', ...o,
});
const THR = { warmupS: 600, reps: 4, workS: 300, recoveryS: 60, recoveryMode: 'jog' as const, cooldownS: 300 };
const thr = (id = 't', d = 6) => run(id, d, { archetype: 'THRESHOLD', structureFamily: 'INTERVALS', realizedDurationS: 2340, structure: THR });
const long = (id = 'l', d = 7, s = 5400) => run(id, d, { archetype: 'LONG', realizedDurationS: s });
const disc = (history: HistoryIn[], o: Partial<RunningContextInput> = {}): RunningContextInput => ({
  ...ctxInput({ population: { level: 'P_R3', hybrid: false }, exposures: [...new Set(history.map((h) => h.archetype))].map((archetype) => ({ archetype, lastAt: daysAgo(3), count: 3 })), ...o }),
  sessionHistory: history,
});
const parsed = (d: RunningContextInput): RunningContext => {
  const r = parseRunningContext(d);
  if (!r.ok) throw new Error('contexte invalide');
  return r.context;
};
const engine = createRunningEngine({ governance: withProductDecisions(CURRENT_RUNNING_GOVERNANCE), simulation: true });
const governance = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);

/** Sonde RÉELLE : pipeline Running à la date, puis validation CORE. */
function realProbe(d: RunningContextInput, availableS: (date: string) => number): Probe {
  return (a: RunningSessionArchetype, date: string) => {
    let seen: SportEngineInput<RunningContext> | undefined;
    const spy = { ...engine, propose: (input: SportEngineInput<RunningContext>) => { seen = input; return engine.propose(input); } };
    const A = availableS(date);
    const req = { intent: { ...runIntent(ARCHETYPE_INTENT_IDS[a]), availableTimeS: A, targetDurationS: A - 150 }, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: d };
    const core = runSportSession(spy, req, { ...coreContext(`probe:${a}:${date}`), now: `${date}T08:00:00Z` as never });
    if (!seen) return { ok: false, reasons: [] };
    const o = engine.prescribe(seen);
    return { ok: o.status === 'selected' && core.result.status === 'ok', reasons: o.reasons.map((r) => ({ code: r.code, params: r.params })) };
  };
}
const days = (dates: readonly string[], availableS: number | ((date: string) => number) = 3600): WeekDay[] =>
  dates.map((date) => ({ date, availableS: typeof availableS === 'number' ? availableS : availableS(date) }));
function compose(d: RunningContextInput, week: WeekDay[]) {
  const byDate = new Map(week.map((w) => [w.date, w.availableS]));
  return composeRunningWeek({ ctx: parsed(d), days: week, parameters: governance.parameters, mode: 'CANDIDATE', probe: realProbe(d, (x) => byDate.get(x) ?? 0) });
}
const plan = (c: ReturnType<typeof compose>) => c.slots.map((s) => `${s.date.slice(8)}:${s.archetype}:${s.role}`);
const measured = run('m', 4, { distanceM: 5000 });
const FIRST = ['progressionBeyondHistory', 'longRunProgression', 'firstThresholdExposure', 'firstSevereExposure', 'paceTargets'] as const;

describe('§R — composition hebdomadaire', () => {
  it('10K, 4 séances : KEY = THRESHOLD (préférence 1), jour le plus long, puis EASY', () => {
    const c = compose(disc([thr(), run('e', 3)]), days([WEEK[0], WEEK[2], WEEK[4], WEEK[6]], (x) => (x === WEEK[4] ? 4200 : 3600)));
    expect(c.mode).toBe('NORMAL');
    expect(plan(c)).toEqual(['28:EASY:EASY', '30:EASY:EASY', '02:THRESHOLD:KEY', '04:EASY:EASY']);
    expect(c.reasons.find((r) => r.code === RUNNING_CODES.WEEK_SLOT_SELECTED)?.params).toEqual({ archetype: 'THRESHOLD', role: 'KEY', date: WEEK[4] });
  });

  it('première exposition exigeant un test récent ⇒ le TEST remplace la KEY (D2, §Q)', () => {
    const c = compose({ ...disc([measured, run('e', 3)]), capabilityRequests: [...FIRST] }, days([WEEK[0], WEEK[2], WEEK[4]], 5400));
    expect(plan(c)).toEqual(['28:TEST:TEST', '30:EASY:EASY', '02:EASY:EASY']);
    expect(c.reasons.find((r) => r.code === RUNNING_CODES.WEEK_TEST_REPLACES_KEY)?.params).toEqual({ cause: 'FIRST_EXPOSURE:THRESHOLD' });
  });

  it('TEST de 10 km trop long pour les jours disponibles (4 500 s estimées > 3 600 s) ⇒ refusé par le moteur, jamais tronqué', () => {
    const c = compose({ ...disc([measured, run('e', 3)]), capabilityRequests: [...FIRST] }, days([WEEK[0], WEEK[2], WEEK[4]]));
    expect(c.slots.map((s) => s.archetype)).toEqual(['EASY', 'EASY', 'EASY']);
  });

  it('TEST récent disponible ⇒ première séance de seuil (plus de TEST)', () => {
    const tt = { referenceId: 'tt5', type: 'TIME_TRIAL' as const, values: { distanceM: 5000, durationS: 1500 }, date: daysAgo(5), provenance: { source: 'APP_RECORDED' as const, protocol: 'KAIRO_TEST_TT' }, confidenceInputs: { protocolDeclared: true, maximalEffortDeclared: true, conditions: 'NORMAL' as const, interruptionSince: 'NONE' as const } };
    const c = compose({ ...disc([measured, run('e', 3)], { references: [tt] }), capabilityRequests: [...FIRST] }, days([WEEK[0], WEEK[2], WEEK[4]]));
    expect(plan(c)).toEqual(['28:THRESHOLD:KEY', '30:EASY:EASY', '02:EASY:EASY']);
  });

  it('aucune KEY possible (ni historique, ni test, ni distance) ⇒ tout EASY, replis tracés', () => {
    const c = compose({ ...disc([run('e', 3)]), capabilityRequests: [...FIRST] }, days([WEEK[0], WEEK[2], WEEK[4]]));
    expect(plan(c)).toEqual(['28:EASY:EASY', '30:EASY:EASY', '02:EASY:EASY']);
    expect(c.reasons.filter((r) => r.code === RUNNING_CODES.WEEK_KEY_FALLBACK).map((r) => r.params.archetype)).toEqual(['THRESHOLD', 'SEVERE', 'RACE_PACE', 'NONE']);
  });

  it('conflit de références ⇒ TEST d’abord (calibration §F)', () => {
    const r = (id: string, durationS: number) => ({ referenceId: id, type: 'RACE_RESULT' as const, values: { distanceM: 10000, durationS }, date: daysAgo(10), provenance: { source: 'APP_RECORDED' as const }, confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL' as const, interruptionSince: 'NONE' as const } });
    const c = compose(disc([thr(), measured], { references: [r('a', 2700), r('b', 3000)] }), days([WEEK[0], WEEK[2], WEEK[4]], 5400));
    expect(plan(c)).toEqual(['28:TEST:TEST', '30:EASY:EASY', '02:EASY:EASY']);
    expect(c.reasons.find((x) => x.code === RUNNING_CODES.WEEK_TEST_REPLACES_KEY)?.params).toEqual({ cause: 'REFERENCE_CONFLICT' });
  });

  it('marathon, 4 séances : la sortie longue EST la KEY, sur le jour le plus long', () => {
    const c = compose(disc([long(), run('e', 3)], { goal: { type: 'MARATHON' } }), days([WEEK[1], WEEK[3], WEEK[5], WEEK[6]], (x) => (x === WEEK[6] ? 7200 : 3600)));
    expect(plan(c)).toEqual(['29:EASY:EASY', '01:EASY:EASY', '03:EASY:EASY', '04:LONG:KEY']);
  });

  it('marathon, 2 séances : pas de sortie longue distincte (§R 4), KEY suivante (THRESHOLD)', () => {
    const c = compose(disc([long(), thr(), run('e', 3)], { goal: { type: 'MARATHON' } }), days([WEEK[1], WEEK[4]]));
    expect(plan(c)).toEqual(['29:THRESHOLD:KEY', '02:EASY:EASY']);
    expect(c.reasons.find((r) => r.code === RUNNING_CODES.WEEK_LONG_NOT_PLACED)?.params).toEqual({ cause: 'FREQUENCY_BELOW_THREE' });
  });

  it('semi, 3 jours consécutifs : LONG sur le plus long, THRESHOLD jamais adjacent (V11)', () => {
    const c = compose(disc([long(), thr(), run('e', 3)], { goal: { type: 'HALF_MARATHON' } }), days([WEEK[4], WEEK[5], WEEK[6]], (x) => (x === WEEK[6] ? 7200 : 3600)));
    expect(plan(c)).toEqual(['02:THRESHOLD:KEY', '03:EASY:EASY', '04:LONG:LONG']);
  });

  it('V11 : forte demande réalisée la veille du premier jour ⇒ jamais ce jour-là', () => {
    const c = compose(disc([thr('t', 1), run('e', 3)]), days([WEEK[0], WEEK[2]]));
    expect(plan(c)).toEqual(['28:EASY:EASY', '30:THRESHOLD:KEY']);
  });

  it('V10 : P-R1 (1 par 7 jours) ; semi : LONG seulement (le seuil est de toute façon hors niveau)', () => {
    const c = compose(disc([long(), run('e', 3)], { goal: { type: 'HALF_MARATHON' }, population: { level: 'P_R1', hybrid: false } }), days([WEEK[0], WEEK[2], WEEK[5]], (x) => (x === WEEK[5] ? 7200 : 3600)));
    expect(plan(c)).toEqual(['28:EASY:EASY', '30:EASY:EASY', '03:LONG:LONG']);
  });

  it('fréquence < V26 ⇒ mode MAINTIEN, EASY seulement', () => {
    const c = compose(disc([thr(), run('e', 3)]), days([WEEK[2]]));
    expect(c.mode).toBe('MAINTENANCE');
    expect(plan(c)).toEqual(['30:EASY:EASY']);
    expect(c.reasons.find((r) => r.code === RUNNING_CODES.WEEK_MAINTENANCE_MODE)?.params).toEqual({ sessions: 1, cause: 'BELOW_MINIMUM_FREQUENCY' });
  });

  it('course générale : KEY = EASY (première préférence §R), aucune forte demande', () => {
    const c = compose(disc([thr(), run('e', 3)], { goal: { type: 'GENERAL_RUNNING' } }), days([WEEK[0], WEEK[2], WEEK[4]]));
    expect(c.slots.map((s) => s.archetype)).toEqual(['EASY', 'EASY', 'EASY']);
    expect(c.slots.filter((s) => s.role === 'KEY')).toHaveLength(1);
  });

  it('séance clé déjà faite cette semaine (verrouillée) ⇒ aucune seconde KEY', () => {
    const week = days([WEEK[0], WEEK[1], WEEK[3]]).map((d) => (d.date === WEEK[0] ? { ...d, locked: 'SEVERE' as const } : d));
    const c = compose(disc([thr(), run('e', 3)]), week);
    expect(plan(c)).toEqual(['28:SEVERE:LOCKED', '29:EASY:EASY', '01:EASY:EASY']);
  });

  it('forte demande verrouillée hors KEY (sortie longue, 10K) : compte pour V11, la KEY évite le lendemain', () => {
    const week = days([WEEK[0], WEEK[1], WEEK[3]]).map((d) => (d.date === WEEK[0] ? { ...d, locked: 'LONG' as const } : d));
    const c = compose(disc([thr(), run('e', 3)]), week);
    expect(plan(c)).toEqual(['28:LONG:LOCKED', '29:EASY:EASY', '01:THRESHOLD:KEY']);
  });

  it('régression : une séance intense faite cette semaine (réalisée ET verrouillée) n’est comptée qu’une fois pour V10', () => {
    const d = disc([long('l', 8), thr('t', 0), run('e', 3)], { goal: { type: 'HALF_MARATHON' } });
    const week = days([WEEK[0], WEEK[2], WEEK[5]], (x) => (x === WEEK[5] ? 7200 : 3600)).map((w) => (w.date === WEEK[0] ? { ...w, locked: 'THRESHOLD' as const } : w));
    expect(plan(compose(d, week))).toEqual(['28:THRESHOLD:LOCKED', '30:EASY:EASY', '03:LONG:LONG']);
  });

  it('recomposition partielle : fréquence hebdomadaire conservée (V26), jours restants seulement', () => {
    const c = composeRunningWeek({ ctx: parsed(disc([thr(), run('e', 3)])), days: days([WEEK[4]]), weeklySessions: 3, parameters: governance.parameters, mode: 'CANDIDATE', probe: realProbe(disc([thr(), run('e', 3)]), () => 3600) });
    expect(c.mode).toBe('NORMAL');
    expect(plan(c)).toEqual(['02:THRESHOLD:KEY']);
  });

  it('chaque séance composée est acceptée par le CORE ; déterminisme (ordre des jours sans effet)', () => {
    const d = disc([long(), thr(), run('e', 3)], { goal: { type: 'HALF_MARATHON' } });
    const week = days([WEEK[0], WEEK[2], WEEK[4], WEEK[6]], (x) => (x === WEEK[6] ? 7200 : 3600));
    const c = compose(d, week);
    const probe = realProbe(d, (x) => week.find((w) => w.date === x)?.availableS ?? 0);
    for (const s of c.slots) expect(probe(s.archetype, s.date).ok).toBe(true);
    expect(canonicalStringify(compose(d, [...week].reverse()))).toBe(canonicalStringify(c));
  });
});

describe('§W — séances manquées', () => {
  const ok: Probe = () => ({ ok: true, reasons: [] });
  const missed = (d: RunningContextInput, m: { date: string; archetype: RunningSessionArchetype }[], planned: { date: string; archetype: RunningSessionArchetype }[], free: string[], probe: Probe = ok, today: string = WEEK[2]) =>
    replanMissed({ ctx: parsed(d), today, missed: m, planned, freeDays: free.map((date) => ({ date, availableS: 3600 })), parameters: governance.parameters, mode: 'CANDIDATE', probe });

  it('EASY manquée ⇒ DROP (aucune compensation)', () => {
    expect(missed(disc([]), [{ date: WEEK[1], archetype: 'EASY' }], [], [WEEK[5]]).decisions).toEqual([{ date: WEEK[1], archetype: 'EASY', decision: 'DROP', code: 'REPLAN.DROP_EASY' }]);
  });

  it('KEY manquée ⇒ MOVE au premier jour libre conforme, jamais dans la zone gelée ni adjacent à une forte demande', () => {
    const r = missed(disc([]), [{ date: WEEK[1], archetype: 'THRESHOLD' }], [{ date: WEEK[6], archetype: 'LONG' }], [WEEK[3], WEEK[4], WEEK[5]]);
    // 01 = surlendemain d'aujourd'hui (30) ⇒ admissible ; 03 serait adjacent à la LONG du 04.
    expect(r.decisions).toEqual([{ date: WEEK[1], archetype: 'THRESHOLD', decision: 'MOVE', to: WEEK[4], code: 'REPLAN.MOVE_KEY' }]);
  });

  it('zone gelée : seul le lendemain est libre ⇒ DROP_NO_VALID_SLOT', () => {
    expect(missed(disc([]), [{ date: WEEK[1], archetype: 'SEVERE' }], [], [WEEK[3]]).decisions[0]).toMatchObject({ decision: 'DROP', code: 'REPLAN.DROP_NO_VALID_SLOT' });
  });

  it('LONG manquée sans créneau ⇒ DROP_LONG (aucune EASY allongée : bande habituelle non gouvernée)', () => {
    expect(missed(disc([]), [{ date: WEEK[1], archetype: 'LONG' }], [], []).decisions[0]).toMatchObject({ decision: 'DROP', code: 'REPLAN.DROP_LONG' });
  });

  it('refus du moteur sur le créneau (temps, gardes) ⇒ créneau suivant ou DROP', () => {
    const d = disc([thr('t', 9)]);
    const r = missed(d, [{ date: WEEK[1], archetype: 'THRESHOLD' }], [], [WEEK[4], WEEK[6]], realProbe(d, (x) => (x === WEEK[4] ? 600 : 3600)));
    expect(r.decisions[0]).toMatchObject({ decision: 'MOVE', to: WEEK[6] });
  });

  it('régression : séance planifiée déjà réalisée comptée une fois (V10)', () => {
    // P-R3 : 2 par 7 jours. Seuil réalisé aujourd'hui ET encore listé comme planifié ; la KEY manquée doit pouvoir être déplacée.
    const d = disc([run('t', -2, { archetype: 'THRESHOLD', structureFamily: 'INTERVALS', realizedDurationS: 2340, structure: THR })]);
    const r = missed(d, [{ date: WEEK[1], archetype: 'SEVERE' }], [{ date: WEEK[2], archetype: 'THRESHOLD' }], [WEEK[4]]);
    expect(r.decisions[0]).toMatchObject({ decision: 'MOVE', to: WEEK[4] });
  });

  it('plusieurs séances manquées ⇒ semaine replanifiée, progression en HOLD, tracé', () => {
    const r = missed(disc([]), [{ date: WEEK[0], archetype: 'EASY' }, { date: WEEK[1], archetype: 'THRESHOLD' }], [], [WEEK[5]]);
    expect(r.reasons.find((x) => x.code === RUNNING_CODES.WEEK_REPLANNED)?.params).toEqual({ missed: 2, progression: 'HOLD_LOW_ADHERENCE' });
    expect(r.decisions.map((x) => x.code)).toEqual(['REPLAN.DROP_EASY', 'REPLAN.MOVE_KEY']);
  });
});
