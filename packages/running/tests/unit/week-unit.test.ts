/**
 * Gate Course (mutation G5) — composition §R et séances manquées §W avec une sonde CONTRÔLÉE : table KEY exacte,
 * déclencheur du TEST, règles illisibles, fenêtres V10 / V11, séances verrouillées, ordre, traces exactes.
 */
import { describe, expect, it } from 'vitest';
import { composeRunningWeek, CURRENT_RUNNING_GOVERNANCE, KEY_PREFERENCES, parseRunningContext, replanMissed, RUNNING_CODES, withProductDecisions } from '../../src/index.js';
import type { Probe, RunningContext, RunningContextInput, RunningParameter, RunningSessionArchetype, WeekDay } from '../../src/index.js';
import { ctxInput, withParameter } from '../fixtures.js';

const G = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
const D = (i: number) => new Date(Date.parse('2026-09-28T00:00:00Z') + i * 86_400_000).toISOString().slice(0, 10);
const at = (i: number) => `${D(i)}T08:00:00Z`;
const patch = (id: string, v: unknown) => withParameter(G, id, (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: v } })).parameters;
const drop = (id: string) => G.parameters.filter((p) => p.parameterId !== id);
type H = NonNullable<RunningContextInput['sessionHistory']>[number];
const h = (id: string, day: number, archetype: RunningSessionArchetype, o: Partial<H> = {}): H => ({ sessionId: id, archetype, structureFamily: 'CONTINUOUS', completedAt: at(day), realizedDurationS: 2400, completion: 'COMPLETED', ...o });
const ctx = (o: Partial<RunningContextInput> = {}, history: H[] = []): RunningContext => {
  const r = parseRunningContext({ ...ctxInput({ population: { level: 'P_R3', hybrid: false }, ...o }), sessionHistory: history });
  if (!r.ok) throw new Error('contexte invalide');
  return r.context;
};
const OK: Probe = () => ({ ok: true, reasons: [] });
const refuse = (refused: RunningSessionArchetype[], reasons: { code: string; params: Record<string, unknown> }[] = []): Probe => (a) => ({ ok: !refused.includes(a), reasons: refused.includes(a) ? reasons : [] });
const days = (idx: number[], minutes: (i: number) => number = () => 60): WeekDay[] => idx.map((i) => ({ date: D(i), availableS: minutes(i) * 60 }));
const compose = (o: { ctx?: RunningContext; days?: WeekDay[]; probe?: Probe; parameters?: readonly RunningParameter[]; weekly?: number } = {}) =>
  composeRunningWeek({ ctx: o.ctx ?? ctx(), days: o.days ?? days([0, 2, 4]), parameters: o.parameters ?? G.parameters, mode: 'CANDIDATE', probe: o.probe ?? OK, ...(o.weekly !== undefined ? { weeklySessions: o.weekly } : {}) });
const plan = (c: ReturnType<typeof compose>) => c.slots.map((s) => `${String(Number(s.date.slice(8)))}:${s.archetype}:${s.role}`);
const codes = (c: { reasons: readonly { code: string }[] }) => c.reasons.map((r) => r.code);
const params = (c: { reasons: readonly { code: string; params: unknown }[] }, code: string) => c.reasons.filter((r) => r.code === code).map((r) => r.params);
const NEEDS_TEST = [{ code: RUNNING_CODES.FIRST_EXPOSURE_REFUSED, params: { cause: 'RECENT_TEST_REQUIRED' } }];

describe('composition §R', () => {
  it('table KEY par objectif (§R), exacte', () => {
    expect(KEY_PREFERENCES).toEqual({
      FIVE_K: ['SEVERE', 'SHORT_INTERVAL', 'RACE_PACE', 'THRESHOLD'], TEN_K: ['THRESHOLD', 'SEVERE', 'RACE_PACE'], HALF_MARATHON: ['THRESHOLD', 'LONG', 'RACE_PACE'],
      MARATHON: ['LONG', 'THRESHOLD'], GENERAL_RUNNING: ['EASY', 'STRIDES', 'THRESHOLD'],
    });
  });

  it('trace exacte d’une semaine simple ; créneaux dans l’ordre des dates quel que soit l’ordre d’entrée', () => {
    const c = compose({ days: days([4, 0, 2]) });
    expect(plan(c)).toEqual(['28:THRESHOLD:KEY', '30:EASY:EASY', '2:EASY:EASY']);
    expect(codes(c)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.WEEK_SLOT_SELECTED]);
    expect(params(c, RUNNING_CODES.WEEK_SLOT_SELECTED)).toEqual([{ archetype: 'THRESHOLD', role: 'KEY', date: D(0) }]);
  });

  it('départage : temps disponible décroissant, puis date croissante', () => {
    expect(plan(compose({ days: days([0, 2, 4], (i) => (i === 2 ? 90 : 60)) }))[1]).toBe('30:THRESHOLD:KEY');
    expect(plan(compose({ days: days([2, 4, 6]) }))[0]).toBe('30:THRESHOLD:KEY');
  });

  it('le TEST ne remplace la KEY que sur « premier exposition : test récent requis » (code ET cause)', () => {
    expect(plan(compose({ probe: refuse(['THRESHOLD'], NEEDS_TEST) }))[0]).toBe('28:TEST:TEST');
    expect(params(compose({ probe: refuse(['THRESHOLD'], NEEDS_TEST) }), RUNNING_CODES.WEEK_TEST_REPLACES_KEY)).toEqual([{ cause: 'FIRST_EXPOSURE:THRESHOLD' }]);
    for (const reasons of [[], [{ code: 'X', params: { cause: 'RECENT_TEST_REQUIRED' } }], [{ code: RUNNING_CODES.FIRST_EXPOSURE_REFUSED, params: { cause: 'VALUE_UNREADABLE' } }]]) {
      const c = compose({ probe: refuse(['THRESHOLD'], reasons) });
      expect(plan(c)[0]).toBe('28:SEVERE:KEY');
      expect(params(c, RUNNING_CODES.WEEK_KEY_FALLBACK)).toEqual([{ archetype: 'THRESHOLD', cause: 'ENGINE_REFUSED_OR_NO_ADMISSIBLE_DAY' }]);
    }
  });

  it('TEST exigé mais refusé : repli tracé avec la cause, puis préférence suivante', () => {
    const c = compose({ probe: refuse(['THRESHOLD', 'TEST'], NEEDS_TEST) });
    expect(plan(c)[0]).toBe('28:SEVERE:KEY');
    expect(params(c, RUNNING_CODES.WEEK_KEY_FALLBACK)).toEqual([{ archetype: 'THRESHOLD', cause: 'RECENT_TEST_REQUIRED' }]);
    const none = compose({ probe: refuse(['THRESHOLD', 'SEVERE', 'RACE_PACE']) });
    expect(params(none, RUNNING_CODES.WEEK_KEY_FALLBACK).map((p) => (p as { archetype: string }).archetype)).toEqual(['THRESHOLD', 'SEVERE', 'RACE_PACE', 'NONE']);
    expect(params(none, RUNNING_CODES.WEEK_KEY_FALLBACK).at(-1)).toEqual({ archetype: 'NONE', cause: 'NO_KEY_SESSION' });
  });

  it('conflit de références : TEST d’abord ; TEST impossible ⇒ repli tracé, puis préférences', () => {
    const r = (id: string, durationS: number) => ({ referenceId: id, type: 'RACE_RESULT' as const, values: { distanceM: 10000, durationS }, date: at(-10), provenance: { source: 'APP_RECORDED' as const }, confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL' as const, interruptionSince: 'NONE' as const } });
    const conflicted = ctx({ references: [r('a', 2700), r('b', 3000)] });
    expect(plan(compose({ ctx: conflicted }))[0]).toBe('28:TEST:TEST');
    const c = compose({ ctx: conflicted, probe: refuse(['TEST']) });
    expect(plan(c)[0]).toBe('28:THRESHOLD:KEY');
    expect(params(c, RUNNING_CODES.WEEK_KEY_FALLBACK)).toEqual([{ archetype: 'TEST', cause: 'NO_ADMISSIBLE_DAY' }]);
  });

  it('V26 : absent ⇒ maintien (V26_UNRESOLVED) ; fréquence hebdomadaire transmise prime sur le nombre de jours', () => {
    expect(params(compose({ parameters: drop('running.frequency.minimumPlannerRunningFrequency') }), RUNNING_CODES.WEEK_MAINTENANCE_MODE)).toEqual([{ sessions: 3, cause: 'V26_UNRESOLVED' }]);
    expect(compose({ parameters: patch('running.frequency.minimumPlannerRunningFrequency', { sessionsPerWeek: '2' }) }).mode).toBe('MAINTENANCE');
    expect(compose({ days: days([4]), weekly: 3 }).mode).toBe('NORMAL');
    expect(params(compose({ days: days([0, 2, 4]), weekly: 1 }), RUNNING_CODES.WEEK_MAINTENANCE_MODE)).toEqual([{ sessions: 1, cause: 'BELOW_MINIMUM_FREQUENCY' }]);
  });

  it('V10 / V11 illisibles ⇒ maintien (HIGH_DEMAND_RULES_UNRESOLVED) ; plafond 0 ⇒ semaine normale sans forte demande', () => {
    for (const ps of [drop('running.hi.densityPolicy'), drop('running.placement.strongDefaultSeparation'), patch('running.hi.densityPolicy', { perDays: 0, P_R3: 2 }), patch('running.hi.densityPolicy', { perDays: '7', P_R3: 2 }),
      patch('running.hi.densityPolicy', { perDays: 7 }), patch('running.hi.densityPolicy', { perDays: 7, P_R3: -1 }), patch('running.hi.densityPolicy', { perDays: 7, P_R3: '2' }), patch('running.placement.strongDefaultSeparation', { default: 'ALLOW' })]) {
      const c = compose({ parameters: ps });
      expect(c.mode).toBe('MAINTENANCE');
      expect(params(c, RUNNING_CODES.WEEK_MAINTENANCE_MODE)).toEqual([{ sessions: 3, cause: 'HIGH_DEMAND_RULES_UNRESOLVED' }]);
      expect(c.slots.every((s) => s.archetype === 'EASY')).toBe(true);
    }
    const zero = compose({ parameters: patch('running.hi.densityPolicy', { perDays: 7, P_R3: 0 }) });
    expect(zero.mode).toBe('NORMAL');
    expect(zero.slots.every((s) => s.archetype === 'EASY')).toBe(true);
  });

  it('historique : forte demande réalisée la veille bloque ; SKIPPED et EASY non ; fenêtre V10 : J-7 hors fenêtre, J-6 dedans', () => {
    expect(plan(compose({ ctx: ctx({}, [h('t', -1, 'THRESHOLD')]) }))[0]).toBe('28:EASY:EASY');
    expect(plan(compose({ ctx: ctx({}, [h('t', -1, 'THRESHOLD', { completion: 'SKIPPED', skipReason: 'TIME' })]) }))[0]).toBe('28:THRESHOLD:KEY');
    expect(plan(compose({ ctx: ctx({}, [h('t', -1, 'EASY')]) }))[0]).toBe('28:THRESHOLD:KEY');
    const p1 = (hist: H[]) => plan(compose({ ctx: ctx({ population: { level: 'P_R1', hybrid: false }, goal: { type: 'HALF_MARATHON' } }, hist), days: days([4, 5, 6], (i) => (i === 6 ? 120 : 60)) }));
    expect(p1([h('l', -1, 'LONG')])).toContain('4:LONG:LONG');
    expect(p1([h('l', 0, 'LONG')])).not.toContain('4:LONG:LONG');
  });

  it('verrouillées : séance facile adjacente ne bloque rien ; LONG faite ⇒ aucune nouvelle LONG, aucun avis ; TEST fait ⇒ KEY prise', () => {
    const lock = (i: number, a: RunningSessionArchetype, idx = [0, 1, 3]) => days(idx).map((d) => (d.date === D(i) ? { ...d, locked: a } : d));
    expect(plan(compose({ days: lock(0, 'EASY') }))).toEqual(['28:EASY:LOCKED', '29:THRESHOLD:KEY', '1:EASY:EASY']);
    const half = ctx({ goal: { type: 'HALF_MARATHON' } });
    const c = compose({ ctx: half, days: lock(0, 'LONG', [0, 2, 4]) });
    expect(c.slots.filter((s) => s.archetype === 'LONG')).toHaveLength(1);
    expect(codes(c)).not.toContain(RUNNING_CODES.WEEK_LONG_NOT_PLACED);
    expect(plan(compose({ days: lock(0, 'TEST') })).filter((x) => x.endsWith(':KEY'))).toEqual([]);
    const general = compose({ ctx: ctx({ goal: { type: 'GENERAL_RUNNING' } }), days: lock(0, 'EASY', [0, 2, 4]) });
    expect(general.slots.filter((s) => s.role === 'KEY')).toHaveLength(1);
    expect(plan(compose({ ctx: ctx({ goal: { type: 'MARATHON' } }), days: lock(0, 'LONG', [0, 2, 4]) })).filter((x) => x.endsWith(':KEY'))).toEqual([]);
    expect(plan(compose({ days: lock(0, 'LONG', [0, 2, 4]) })).filter((x) => x.endsWith(':KEY'))).toEqual(['30:THRESHOLD:KEY']);
  });

  it('régression : sortie longue déjà faite (semi) ⇒ la KEY reste le seuil ; seuil refusé ⇒ jamais une seconde sortie longue', () => {
    const half = ctx({ goal: { type: 'HALF_MARATHON' } });
    const lockedLong = days([0, 2, 4]).map((d) => (d.date === D(0) ? { ...d, locked: 'LONG' as const } : d));
    expect(plan(compose({ ctx: half, days: lockedLong }))).toEqual(['28:LONG:LOCKED', '30:THRESHOLD:KEY', '2:EASY:EASY']);
    const refused = compose({ ctx: half, days: lockedLong, probe: refuse(['THRESHOLD', 'RACE_PACE']) });
    expect(refused.slots.filter((s) => s.archetype === 'LONG')).toHaveLength(1);
    expect(params(refused, RUNNING_CODES.WEEK_KEY_FALLBACK).map((p) => (p as { archetype: string }).archetype)).toEqual(['THRESHOLD', 'RACE_PACE', 'NONE']);
  });

  it('TEST placé ⇒ la recherche de KEY s’arrête (plan complet)', () => {
    const c = compose({ probe: refuse(['THRESHOLD'], NEEDS_TEST) });
    expect(plan(c)).toEqual(['28:TEST:TEST', '30:EASY:EASY', '2:EASY:EASY']);
    expect(codes(c)).not.toContain(RUNNING_CODES.WEEK_KEY_FALLBACK);
  });

  it('données incohérentes : une forte demande « réalisée » après le jour évalué n’est pas comptée', () => {
    const p1 = ctx({ population: { level: 'P_R1', hybrid: false }, goal: { type: 'HALF_MARATHON' } }, [h('f', 8, 'LONG')]);
    expect(plan(compose({ ctx: p1, days: days([2, 4, 5], (i) => (i === 5 ? 120 : 60)) }))).toContain('3:LONG:LONG');
  });

  it('LONG : avis exacts ; objectifs sans LONG : aucun avis ; LONG jamais retentée comme KEY', () => {
    const half = ctx({ goal: { type: 'HALF_MARATHON' } });
    const ok = compose({ ctx: half, days: days([0, 2, 5], (i) => (i === 5 ? 120 : 60)) });
    expect(params(ok, RUNNING_CODES.WEEK_SLOT_SELECTED)[0]).toEqual({ archetype: 'LONG', role: 'LONG', date: D(5) });
    const refused = compose({ ctx: half, probe: refuse(['LONG', 'THRESHOLD', 'RACE_PACE']) });
    expect(params(refused, RUNNING_CODES.WEEK_LONG_NOT_PLACED)).toEqual([{ cause: 'NO_ADMISSIBLE_DAY' }]);
    expect(params(refused, RUNNING_CODES.WEEK_KEY_FALLBACK).map((p) => (p as { archetype: string }).archetype)).toEqual(['THRESHOLD', 'RACE_PACE', 'NONE']);
    const two = compose({ ctx: half, days: days([0, 3]), probe: refuse(['THRESHOLD']) });
    expect(params(two, RUNNING_CODES.WEEK_LONG_NOT_PLACED)).toEqual([{ cause: 'FREQUENCY_BELOW_THREE' }]);
    expect(params(two, RUNNING_CODES.WEEK_KEY_FALLBACK).map((p) => (p as { archetype: string }).archetype)).toEqual(['THRESHOLD']);
    expect(two.slots.some((s) => s.archetype === 'LONG')).toBe(false);
    expect(plan(compose({ ctx: ctx({ goal: { type: 'MARATHON' } }), days: days([0, 3]) }))).toEqual(['28:THRESHOLD:KEY', '1:EASY:EASY']);
    const mara = compose({ ctx: ctx({ goal: { type: 'MARATHON' } }), days: days([0, 2, 5], (i) => (i === 5 ? 120 : 60)) });
    expect(params(mara, RUNNING_CODES.WEEK_SLOT_SELECTED)).toEqual([{ archetype: 'LONG', role: 'KEY', date: D(5) }]);
    for (const goal of ['TEN_K', 'FIVE_K', 'GENERAL_RUNNING'] as const) expect(codes(compose({ ctx: ctx({ goal: { type: goal } }), days: days([0, 3]) }))).not.toContain(RUNNING_CODES.WEEK_LONG_NOT_PLACED);
    // Préférences 5K et course générale.
    expect(plan(compose({ ctx: ctx({ goal: { type: 'FIVE_K' } }), probe: refuse(['SEVERE']) }))[0]).toBe('28:SHORT_INTERVAL:KEY');
    expect(plan(compose({ ctx: ctx({ goal: { type: 'FIVE_K' } }), probe: refuse(['SEVERE', 'SHORT_INTERVAL', 'RACE_PACE']) }))[0]).toBe('28:THRESHOLD:KEY');
    expect(plan(compose({ ctx: ctx({ goal: { type: 'GENERAL_RUNNING' } }), probe: refuse(['EASY', 'STRIDES']) }))[0]).toBe('28:THRESHOLD:KEY');
    expect(plan(compose({ ctx: ctx({ goal: { type: 'GENERAL_RUNNING' } }), probe: refuse(['EASY']) }))[0]).toBe('28:STRIDES:KEY');
  });
});

describe('séances manquées §W', () => {
  const TODAY = D(2);
  const run = (o: { missed: { date: string; archetype: RunningSessionArchetype }[]; planned?: { date: string; archetype: RunningSessionArchetype }[]; free?: WeekDay[]; ctx?: RunningContext; parameters?: readonly RunningParameter[]; probe?: Probe }) =>
    replanMissed({ ctx: o.ctx ?? ctx({ population: { level: 'P_R4', hybrid: false } }), today: TODAY, missed: o.missed, planned: o.planned ?? [], freeDays: o.free ?? days([4, 6]), parameters: o.parameters ?? G.parameters, mode: 'CANDIDATE', probe: o.probe ?? OK });

  it('trace exacte : paramètres, décision (to vide pour DROP), pas de replanification pour une seule séance', () => {
    const r = run({ missed: [{ date: D(0), archetype: 'EASY' }] });
    expect(codes(r)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.WEEK_MISSED_DECISION]);
    expect(params(r, RUNNING_CODES.WEEK_MISSED_DECISION)).toEqual([{ archetype: 'EASY', date: D(0), decision: 'DROP', code: 'REPLAN.DROP_EASY', to: '' }]);
    const m = run({ missed: [{ date: D(0), archetype: 'LONG' }] });
    expect(m.decisions).toEqual([{ date: D(0), archetype: 'LONG', decision: 'MOVE', to: D(4), code: 'REPLAN.MOVE_LONG' }]);
    expect(params(m, RUNNING_CODES.WEEK_MISSED_DECISION)).toEqual([{ archetype: 'LONG', date: D(0), decision: 'MOVE', code: 'REPLAN.MOVE_LONG', to: D(4) }]);
    expect(run({ missed: [{ date: D(0), archetype: 'STRIDES' }] }).decisions[0]).toMatchObject({ decision: 'DROP', code: 'REPLAN.DROP_EASY' });
  });

  it('ordre : la séance manquée la plus ancienne choisit d’abord ; jours libres par date ; jamais deux forte demande adjacentes', () => {
    const r = run({ missed: [{ date: D(1), archetype: 'SEVERE' }, { date: D(0), archetype: 'THRESHOLD' }], free: [...days([6, 4])] });
    expect(r.decisions.map((d) => [d.archetype, d.decision === 'MOVE' ? d.to : 'DROP'])).toEqual([['THRESHOLD', D(4)], ['SEVERE', D(6)]]);
    const adj = run({ missed: [{ date: D(0), archetype: 'THRESHOLD' }, { date: D(1), archetype: 'SEVERE' }], free: days([4, 5]) });
    expect(adj.decisions.map((d) => d.decision)).toEqual(['MOVE', 'DROP']);
    expect(params(adj, RUNNING_CODES.WEEK_REPLANNED)).toEqual([{ missed: 2, progression: 'HOLD_LOW_ADHERENCE' }]);
  });

  it('ordre par date AVANT l’archétype (entrée déjà triée par date, archétypes en ordre inverse)', () => {
    const r = run({ missed: [{ date: D(0), archetype: 'THRESHOLD' }, { date: D(1), archetype: 'SEVERE' }], free: days([4, 6]) });
    expect(r.decisions.map((d) => [d.archetype, d.decision === 'MOVE' ? d.to : 'DROP'])).toEqual([['THRESHOLD', D(4)], ['SEVERE', D(6)]]);
  });

  it('données incohérentes : une forte demande « réalisée » après le jour cible n’est pas comptée', () => {
    const r = run({ ctx: ctx({ population: { level: 'P_R1', hybrid: false } }, [h('f', 8, 'LONG')]), missed: [{ date: D(0), archetype: 'LONG' }], free: days([4]) });
    expect(r.decisions[0]).toMatchObject({ decision: 'MOVE', to: D(4) });
  });

  it('même date : départage par archétype', () => {
    const r = run({ missed: [{ date: D(0), archetype: 'THRESHOLD' }, { date: D(0), archetype: 'LONG' }], free: days([4, 6]) });
    expect(r.decisions.map((d) => d.archetype)).toEqual(['LONG', 'THRESHOLD']);
  });

  it('jour sans temps disponible ignoré ; séance facile planifiée adjacente ne bloque pas ; forte demande planifiée adjacente bloque', () => {
    expect(run({ missed: [{ date: D(0), archetype: 'SEVERE' }], free: [{ date: D(4), availableS: 0 }, ...days([6])] }).decisions[0]).toMatchObject({ to: D(6) });
    expect(run({ missed: [{ date: D(0), archetype: 'SEVERE' }], planned: [{ date: D(5), archetype: 'EASY' }], free: days([4]) }).decisions[0]).toMatchObject({ to: D(4) });
    expect(run({ missed: [{ date: D(0), archetype: 'SEVERE' }], planned: [{ date: D(5), archetype: 'LONG' }], free: days([4]) }).decisions[0]).toMatchObject({ decision: 'DROP' });
  });

  it('V10 : réalisé dans la fenêtre compté (SKIPPED et facile non) ; fenêtre stricte (J+7 hors fenêtre)', () => {
    const p1 = (hist: H[], free = days([4])) => run({ ctx: ctx({ population: { level: 'P_R1', hybrid: false } }, hist), missed: [{ date: D(0), archetype: 'LONG' }], free }).decisions[0]?.decision;
    expect(p1([h('l', -1, 'LONG')])).toBe('DROP');
    expect(p1([h('l', -1, 'LONG', { completion: 'SKIPPED', skipReason: 'TIME' })])).toBe('MOVE');
    expect(p1([h('l', -1, 'EASY')])).toBe('MOVE');
    expect(p1([h('l', -3, 'LONG')], days([4]))).toBe('MOVE');
    expect(p1([h('l', -2, 'LONG')], days([4]))).toBe('DROP');
  });

  it('règles illisibles ⇒ aucune forte demande déplacée (DROP)', () => {
    for (const ps of [drop('running.hi.densityPolicy'), drop('running.placement.strongDefaultSeparation'), patch('running.hi.densityPolicy', { perDays: 0, P_R4: 3 }), patch('running.hi.densityPolicy', { perDays: '7', P_R4: 3 }),
      patch('running.hi.densityPolicy', { perDays: 7 }), patch('running.hi.densityPolicy', { perDays: 7, P_R4: -1 }), patch('running.hi.densityPolicy', { perDays: 7, P_R4: '3' }), patch('running.hi.densityPolicy', { perDays: 7, P_R4: 0 }), patch('running.placement.strongDefaultSeparation', { default: 'ALLOW' })]) {
      expect(run({ missed: [{ date: D(0), archetype: 'THRESHOLD' }], parameters: ps }).decisions[0]).toMatchObject({ decision: 'DROP', code: 'REPLAN.DROP_NO_VALID_SLOT' });
    }
  });
});
