/**
 * Gate Course (mutation G4) — allure gouvernée (`severePace`), protocole TEST (`testSession`) et structures CORE
 * (`buildQualityStructure`, `buildTestStructure`) testés directement : causes exactes, valeurs de registre
 * illisibles refusées, bornes.
 */
import { describe, expect, it } from 'vitest';
import { buildQualityStructure, buildTestStructure, CURRENT_RUNNING_GOVERNANCE, parseRunningContext, RUNNING_CODES, severePace, testSession, withProductDecisions } from '../../src/index.js';
import type { RunningContext, RunningContextInput, RunningParameter } from '../../src/index.js';
import { ctxInput, withParameter } from '../fixtures.js';

const NOW = '2026-09-28T08:00:00Z';
const at = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString().replace('.000Z', 'Z');
const G = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
const patch = (id: string, v: unknown) => withParameter(G, id, (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: v } })).parameters;
const drop = (id: string) => G.parameters.filter((p) => p.parameterId !== id);
type Ref = NonNullable<RunningContextInput['references']>[number];
const perf = (o: Partial<Ref> = {}): Ref => ({ referenceId: 'r5', type: 'RACE_RESULT', values: { distanceM: 5000, durationS: 1200 }, date: at(5), provenance: { source: 'APP_RECORDED' }, confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL', interruptionSince: 'NONE' }, ...o });
const ctx = (o: Partial<RunningContextInput> = {}): RunningContext => {
  const r = parseRunningContext({ ...ctxInput({ population: { level: 'P_R3', hybrid: false } }), ...o });
  if (!r.ok) throw new Error('contexte invalide');
  return r.context;
};

describe('severePace', () => {
  const pace = (o: { archetype?: 'SEVERE' | 'SHORT_INTERVAL' | 'THRESHOLD' | 'HILLS'; refs?: Ref[]; wearable?: boolean; enabled?: boolean; parameters?: readonly RunningParameter[] } = {}) =>
    severePace({ archetype: o.archetype ?? 'SEVERE', ctx: ctx({ references: o.refs ?? [perf()], sensors: { wearable: o.wearable ?? true, heartRate: false } }), now: NOW, paceTargetsEnabled: o.enabled ?? true, parameters: o.parameters ?? G.parameters, mode: 'CANDIDATE' });
  const causes = (r: ReturnType<typeof pace>) => (r.status === 'effort' ? r.causes : 'PACE');

  it('seuil et côtes : jamais d’allure, sans raison', () => {
    for (const a of ['THRESHOLD', 'HILLS'] as const) expect(pace({ archetype: a })).toEqual({ status: 'effort', causes: ['NOT_PACED_BY_RULE'], reasons: [] });
  });

  it('allure : plage ± V03, référence, confiance, paramètres, raison', () => {
    const r = pace({ archetype: 'SHORT_INTERVAL' });
    expect(r).toMatchObject({ status: 'pace', secPerKm: { min: 240 * 0.97, max: 240 * 1.03 }, referenceId: 'r5', confidence: 'HIGH', parameterIds: ['running.severe.paceAnchor', 'running.target.paceRangeWidthByConfidence'] });
    expect(r.reasons.find((x) => x.code === RUNNING_CODES.PACE_TARGET_APPLIED)?.params).toEqual({ archetype: 'SHORT_INTERVAL', referenceId: 'r5', confidence: 'HIGH', parameterId: 'running.severe.paceAnchor' });
  });

  it('capacité et montre : causes exactes, même avec une ancre valide (effort, jamais d’allure)', () => {
    expect(pace({ enabled: false })).toMatchObject({ status: 'effort', causes: ['PACE_TARGETS_DISABLED'] });
    expect(pace({ wearable: false })).toMatchObject({ status: 'effort', causes: ['NO_WEARABLE'] });
    expect(causes(pace({ enabled: false, wearable: false }))).toEqual(['PACE_TARGETS_DISABLED', 'NO_WEARABLE']);
    // Les raisons des paramètres lus restent tracées, même quand l'allure est refusée.
    expect(pace({ enabled: false }).reasons.map((x) => x.params.parameterId)).toEqual(['running.severe.paceAnchor', 'running.target.paceRangeWidthByConfidence']);
  });

  it('V18 absent ou illisible ⇒ ANCHOR_UNRESOLVED (causes cumulées)', () => {
    for (const ps of [drop('running.severe.paceAnchor'), patch('running.severe.paceAnchor', { anchor: 'RACE_10K', widthParameter: 'running.target.paceRangeWidthByConfidence' }), patch('running.severe.paceAnchor', { anchor: 5, widthParameter: 'running.target.paceRangeWidthByConfidence' }), patch('running.severe.paceAnchor', { anchor: 'RACE_3K_TO_5K', widthParameter: 'x' }), patch('running.severe.paceAnchor', null)]) {
      expect(pace({ parameters: ps })).toMatchObject({ status: 'effort', causes: ['ANCHOR_UNRESOLVED'] });
    }
    expect(causes(pace({ enabled: false, parameters: drop('running.severe.paceAnchor') }))).toEqual(['PACE_TARGETS_DISABLED', 'ANCHOR_UNRESOLVED']);
  });

  it('références non éligibles (type, distance absente) ⇒ ANCHOR_REFERENCE_MISSING', () => {
    expect(pace({ refs: [perf({ type: 'VMA_TEST', values: { distanceM: 4000, speedMps: 5 } })] })).toMatchObject({ status: 'effort', causes: ['ANCHOR_REFERENCE_MISSING'] });
    expect(causes(pace({ wearable: false, refs: [] }))).toEqual(['NO_WEARABLE', 'ANCHOR_REFERENCE_MISSING']);
  });

  it('V03 : absent ⇒ WIDTH_UNRESOLVED ; largeur hors [0, 1[ ou illisible ⇒ REFERENCE_CONFIDENCE_INSUFFICIENT ; 0 accepté', () => {
    expect(pace({ parameters: drop('running.target.paceRangeWidthByConfidence') })).toMatchObject({ status: 'effort', causes: ['WIDTH_UNRESOLVED'] });
    for (const w of [-0.01, 1, 1.5, '0.03', null]) expect(pace({ parameters: patch('running.target.paceRangeWidthByConfidence', { HIGH: { relativeHalfWidth: w } }) })).toMatchObject({ status: 'effort', causes: ['REFERENCE_CONFIDENCE_INSUFFICIENT'] });
    expect(pace({ parameters: patch('running.target.paceRangeWidthByConfidence', { HIGH: null }) })).toMatchObject({ status: 'effort', causes: ['REFERENCE_CONFIDENCE_INSUFFICIENT'] });
    expect(pace({ parameters: patch('running.target.paceRangeWidthByConfidence', { HIGH: { relativeHalfWidth: 0 } }) })).toMatchObject({ status: 'pace', secPerKm: { min: 240, max: 240 } });
    expect(pace({ parameters: patch('running.target.paceRangeWidthByConfidence', { HIGH: { relativeHalfWidth: 0.5 } }) })).toMatchObject({ status: 'pace', secPerKm: { min: 120, max: 360 } });
    expect(causes(pace({ enabled: false, parameters: drop('running.target.paceRangeWidthByConfidence') }))).toEqual(['PACE_TARGETS_DISABLED', 'WIDTH_UNRESOLVED']);
    expect(causes(pace({ enabled: false, refs: [perf({ date: at(200) })] }))).toEqual(['PACE_TARGETS_DISABLED', 'REFERENCE_CONFIDENCE_INSUFFICIENT']);
  });
});

describe('testSession', () => {
  type H = NonNullable<RunningContextInput['sessionHistory']>[number];
  const run = (id: string, d: number, o: Partial<H> = {}): H => ({ sessionId: id, archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: at(d), realizedDurationS: 1800, completion: 'COMPLETED', distanceM: 5000, ...o });
  const t = (history: H[] = [run('m', 4)], o: Partial<RunningContextInput> = {}, parameters: readonly RunningParameter[] = G.parameters) =>
    testSession({ ctx: ctx({ sessionHistory: history, ...o }), now: NOW, parameters, mode: 'CANDIDATE' });
  const cause = (r: ReturnType<typeof t>) => (r.status === 'refused' ? r.reasons.find((x) => x.code === RUNNING_CODES.TEST_REFUSED)?.params.cause : 'APPLIED');
  const P = (() => { const p = G.parameters.find((x) => x.parameterId === 'running.test.protocol'); return (p?.value.status === 'candidate' ? p.value.value : {}) as Record<string, unknown>; })();

  it('appliqué : plan exact, statut, paramètres, raison', () => {
    const r = t([run('b', 4), run('a', 6, { realizedDurationS: 1500 })]);
    expect(r).toMatchObject({ status: 'applied', parameterIds: ['running.test.protocol', 'running.reference.recencyBands'], plan: { distanceM: 10000, warmupS: 600, cooldownS: 300, referenceType: 'TIME_TRIAL', observedPace: { min: 300, max: 360 }, observedSessionIds: ['a', 'b'] } });
    expect(r.reasons.filter((x) => x.code === RUNNING_CODES.CANDIDATE_VALUE_USED)).toHaveLength(2);
  });

  it('distance selon l’objectif, sinon OTHER ; absente ⇒ illisible', () => {
    expect(t([run('m', 4)], { goal: { type: 'MARATHON' } })).toMatchObject({ plan: { distanceM: 5000 } });
    expect(cause(t([run('m', 4)], { goal: { type: 'MARATHON' } }, patch('running.test.protocol', { ...P, distanceMByGoal: { TEN_K: 10000 } })))).toBe('VALUE_UNREADABLE');
    expect(t([run('m', 4)], {}, patch('running.test.protocol', { ...P, distanceMByGoal: { OTHER: 5000 } }))).toMatchObject({ plan: { distanceM: 5000 } });
  });

  it.each([
    null, { ...P, distanceMByGoal: undefined }, { ...P, distanceMByGoal: { TEN_K: -1, OTHER: 5000 } }, { ...P, distanceMByGoal: { TEN_K: '10000' } },
    { ...P, warmupS: 0 }, { ...P, warmupS: '600' }, { ...P, warmupS: undefined }, { ...P, cooldownS: 0 }, { ...P, cooldownS: -300 }, { ...P, referenceType: 3 },
    { ...P, observedPace: undefined }, { ...P, observedPace: { ...(P.observedPace as object), recencyBand: 'AGING' } }, { ...P, observedPace: { ...(P.observedPace as object), use: 'TARGET' } },
  ])('protocole illisible %j ⇒ VALUE_UNREADABLE', (v) => {
    expect(cause(t([run('m', 4)], {}, patch('running.test.protocol', v)))).toBe('VALUE_UNREADABLE');
  });

  it('paramètre ou récence non résolus : causes et raisons conservées', () => {
    const u = t([run('m', 4)], {}, CURRENT_RUNNING_GOVERNANCE.parameters);
    expect(u).toMatchObject({ status: 'refused' });
    expect(u.reasons.map((x) => x.code)).toEqual([RUNNING_CODES.UNRESOLVED_PARAMETER, RUNNING_CODES.TEST_REFUSED]);
    const r = t([run('m', 4)], {}, drop('running.reference.recencyBands'));
    expect(cause(r)).toBe('RECENCY_UNRESOLVED');
    expect(r.reasons.map((x) => x.code)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.UNRESOLVED_PARAMETER, RUNNING_CODES.TEST_REFUSED]);
    for (const w of [0, '8']) expect(cause(t([run('m', 4)], {}, patch('running.reference.recencyBands', { recentMaxWeeks: w })))).toBe('RECENCY_UNRESOLVED');
    const none = t([]);
    expect(none.reasons.map((x) => x.code)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.TEST_REFUSED]);
  });

  it('fenêtre observée : instant présent inclus ; reprise : début inclus, antérieur exclu ; sans reprise, la date de début est ignorée', () => {
    expect(cause(t([run('m', 0)]))).toBe('APPLIED');
    const since = { recentLoad: { returnStartedAt: at(4), dimensions: [] } };
    expect(cause(t([run('m', 4)], { returnState: { state: 'SHORT', postReturnSessions: 1 }, ...since }))).toBe('APPLIED');
    expect(cause(t([run('m', 5)], { returnState: { state: 'SHORT', postReturnSessions: 1 }, ...since }))).toBe('OBSERVED_PACE_UNAVAILABLE');
    expect(cause(t([run('m', 5)], since))).toBe('APPLIED');
    // Reprise déclarée sans date de début : aucune exclusion (et jamais d'erreur).
    expect(cause(t([run('m', 5)], { returnState: { state: 'SHORT', postReturnSessions: 1 } }))).toBe('APPLIED');
  });
});

describe('structures CORE', () => {
  const T = { domain: 'SEVERE' as const, rpe: { min: 7, max: 8 }, easyCeiling: 3 };
  it('sans montre : noWearable sur toutes les cibles ; avec montre : clé absente', () => {
    const w = buildQualityStructure({ warmupS: 600, reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog', cooldownS: 300 }, { ...T, noWearable: true });
    expect(w?.segments.every((s) => s.target.noWearable === true)).toBe(true);
    const x = buildQualityStructure({ warmupS: 600, reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog', cooldownS: 300 }, { ...T, noWearable: false });
    expect(x?.segments.every((s) => !('noWearable' in s.target))).toBe(true);
  });

  it('répétition sans récupération complète ⇒ bloc continu « work » ; échauffement / retour au calme absents ⇒ aucun segment', () => {
    for (const st of [{ reps: 4, workS: 240 }, { reps: 4, workS: 240, recoveryS: 120 }, { reps: 4, workS: 240, recoveryMode: 'jog' as const }, { reps: 1, workS: 1200, recoveryS: 60, recoveryMode: 'jog' as const }]) {
      expect(buildQualityStructure(st, { ...T, noWearable: false })?.segments).toEqual([{ kind: 'steady', id: 'work', dose: { durationS: st.workS }, target: { domain: 'severe', effort: { rpe: { min: 7, max: 8 } }, priority: 'effort' } }]);
    }
  });

  it('TEST : trois segments exacts, allure observée en borne (priorité effort)', () => {
    expect(buildTestStructure({ distanceM: 5000, warmupS: 600, cooldownS: 300, rpe: { min: 9, max: 10 }, easyCeiling: 3, observedPace: { min: 300, max: 360 }, observedSourceId: 'src' })?.segments).toEqual([
      { kind: 'warmup', id: 'warmup', dose: { durationS: 600 }, target: { domain: 'easy_low', effort: { rpe: { min: 3, max: 3 } }, priority: 'effort' } },
      { kind: 'steady', id: 'test', dose: { distanceM: 5000 }, target: { domain: 'severe', effort: { rpe: { min: 9, max: 10 } }, priority: 'effort', pace: { secPerKm: { min: 300, max: 360 }, provenance: { source: 'observed_athlete_range', sourceId: 'src' } } } },
      { kind: 'cooldown', id: 'cooldown', dose: { durationS: 300 }, target: { domain: 'easy_low', effort: { rpe: { min: 3, max: 3 } }, priority: 'effort' } },
    ]);
  });
});
