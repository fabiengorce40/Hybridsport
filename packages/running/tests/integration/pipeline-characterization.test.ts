/**
 * Gate Course (mutation G2) — caractérisation EXACTE du pipeline Course (vague 2 / 3 / R5) : trace d'audit
 * (étape, sujet, décision), étape de rejet de chaque refus, candidats (précision, références, paramètres et
 * drapeau candidat, dégradations), bandes V02 illisibles, exercice, repli sur le temps disponible, §K, reprise.
 * Chaque trace attendue a été relue (revue du gate Course) avant d'être figée.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, FingerprintHistoryEntry } from '@hybridsport/domain';
import { runSportSession } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { createRunningEngine, CURRENT_RUNNING_GOVERNANCE, RUNNING_CODES, withProductDecisions } from '../../src/index.js';
import type { RunningContext, RunningContextInput, RunningGovernance, RunningParameter } from '../../src/index.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { coreContext, ctxInput, fullyApprovedGovernance, runIntent, withParameter } from '../fixtures.js';

const NOW = Date.parse('2026-09-28T08:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString().replace('.000Z', 'Z');
type H = NonNullable<RunningContextInput['sessionHistory']>[number];
const h = (id: string, d: number, o: Partial<H> = {}): H => ({ sessionId: id, archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: daysAgo(d), realizedDurationS: 1800, completion: 'COMPLETED', unexpectedDifficulty: 'AS_EXPECTED', ...o });
const S = { warmupS: 600, reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog' as const, cooldownS: 300 };
const sev = (id: string, d: number, o: Partial<H> = {}) => h(id, d, { archetype: 'SEVERE', structureFamily: 'INTERVALS', realizedDurationS: 2220, structure: S, ...o });
const tt = (d = 3) => ({ referenceId: 'tt', type: 'TIME_TRIAL' as const, values: { distanceM: 5000, durationS: 1200 }, date: daysAgo(d), provenance: { source: 'APP_RECORDED' as const }, confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL' as const, interruptionSince: 'NONE' as const } });
const D = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
const disc = (hist: H[], o: Partial<RunningContextInput> = {}): RunningContextInput => ({ ...ctxInput({ population: { level: 'P_R3', hybrid: false }, exposures: [...new Set(hist.map((x) => x.archetype))].map((archetype) => ({ archetype, lastAt: daysAgo(3), count: 3 })), ...o }), sessionHistory: hist });

function input(g: RunningGovernance, d: RunningContextInput, a: string, A = 5400, simulation = true): { engine: ReturnType<typeof createRunningEngine>; input: SportEngineInput<RunningContext> } {
  const engine = createRunningEngine({ governance: g, simulation });
  let seen: SportEngineInput<RunningContext> | undefined;
  const spy = { ...engine, propose: (i: SportEngineInput<RunningContext>) => { seen = i; return engine.propose(i); } };
  runSportSession(spy, { intent: { ...runIntent(a), availableTimeS: A, targetDurationS: A - 150 }, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: d }, coreContext('g2'));
  if (!seen) throw new Error('entrée non transmise');
  return { engine, input: seen };
}
const run = (d: RunningContextInput, a: string, o: { g?: RunningGovernance; A?: number; simulation?: boolean } = {}) => { const x = input(o.g ?? D, d, a, o.A, o.simulation); return x.engine.prescribe(x.input); };
type Out = ReturnType<typeof run>;
const trace = (o: Out) => o.trace.map((t) => `${t.stage}|${t.subject}|${t.decision}`);
const rej = (o: Out) => o.candidates.map((c) => c.rejection?.stage ?? 'NONE');
const params = (o: Out, i = 0) => o.candidates[i]?.parameters.map((p) => `${p.parameterId}${p.candidate ? '*' : ''}`);
const reason = (o: Out, code: string) => o.reasons.find((r) => r.code === code)?.params;
const patchV = (id: string, f: (v: Record<string, unknown>) => unknown) => withParameter(D, id, (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: f(p.value.status === 'candidate' ? p.value.value as Record<string, unknown> : {}) } }));
const ID = (a: string, f = 'CONTINUOUS') => `intent.run.w1.${a}.${f}`;

describe('traces exactes (relues)', () => {
  it('EASY avec pas D1', () => {
    const o = run(disc([h('a', 6), h('b', 3)]), 'running.easy');
    expect(trace(o)).toEqual([
      'ANALYSIS|running.easy|ELIGIBLE/EFFORT_ONLY', `ELIGIBILITY|${ID('EASY')}|ELIGIBLE`, `SAFETY_G1|${ID('EASY')}|PASSED_SIMULATION`, `FEASIBILITY|${ID('EASY')}|ANCHORED:b`,
      `PRECISION|${ID('EASY')}|EFFORT_ONLY`, 'GENERATION|EASY|GENERATED:1', `SELECTION|${ID('EASY')}|SELECTED:SINGLE_CANDIDATE`,
    ]);
    expect(o.trace.map((t) => t.reasons.map((r) => r.code))).toEqual([
      [RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED], [], [], [RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.DOSE_ANCHOR_SELECTED], [RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED], [], [],
    ]);
    expect(params(o)).toEqual(['running.dose.historyAnchorPolicy*', 'running.reference.recencyBands*', 'running.target.rpeByDomain*', 'running.progression.magnitude*']);
    expect(o.candidates[0]?.degradations.map((x) => `${x.effect}:${x.subject}:${x.capability}:${x.parameterIds.join('+')}`)).toEqual([
      'PRECISION_REDUCED:EASY:paceTargets:running.target.paceRangeWidthByConfidence+running.target.easyCeilingPaceMargin',
      'CALIBRATION_REQUIRED:GOAL:TEN_K:performanceExtrapolation:running.performance.extrapolationExponent',
    ]);
    expect(o.candidates[0]?.capabilities).toContainEqual({ capability: 'progressionBeyondHistory', enabled: true });
    expect(o.candidates[0]?.provenance).toEqual({ rulesetVersion: 'running-0.3.0-candidate+pd-2026-09-28', mode: 'CANDIDATE', simulation: true });
  });

  it('SEVERE rejoué avec pas et allure', () => {
    const o = run(disc([sev('a', 9), sev('b', 5)], { references: [tt()] }), 'running.severe');
    expect(trace(o)).toEqual([
      'ANALYSIS|running.severe|ELIGIBLE/PACE_RANGE', `ELIGIBILITY|${ID('SEVERE', 'INTERVALS')}|ELIGIBLE`, `SAFETY_G1|${ID('SEVERE', 'INTERVALS')}|PASSED_SIMULATION`, `FEASIBILITY|${ID('SEVERE', 'INTERVALS')}|ANCHORED:b`,
      `PRECISION|${ID('SEVERE', 'INTERVALS')}|PACE_RANGE`, 'GENERATION|SEVERE|GENERATED:1', `SELECTION|${ID('SEVERE', 'INTERVALS')}|SELECTED:SINGLE_CANDIDATE`,
    ]);
    expect(o.trace[4]?.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.PACE_TARGET_APPLIED]);
    expect(params(o)).toEqual(['running.hi.densityPolicy*', 'running.placement.strongDefaultSeparation*', 'running.dose.historyAnchorPolicy*', 'running.reference.recencyBands*', 'running.target.rpeByDomain*', 'running.severe.paceAnchor*', 'running.target.paceRangeWidthByConfidence*', 'running.progression.magnitude*']);
    expect(o.candidates[0]?.references).toEqual(['tt']);
    expect(o.candidates[0]?.degradations.map((x) => x.effect)).toEqual(['CALIBRATION_REQUIRED']);
    expect(o.reasons.map((r) => r.code)).not.toContain(RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED);
  });

  it('THRESHOLD première exposition : continu rejeté, fractionné retenu', () => {
    const o = run(disc([h('e', 3)], { references: [tt()] }), 'running.threshold');
    expect(trace(o)).toEqual([
      'ANALYSIS|running.threshold|ELIGIBLE/PACE_RANGE',
      `ELIGIBILITY|${ID('THRESHOLD')}|ELIGIBLE`, `SAFETY_G1|${ID('THRESHOLD')}|PASSED_SIMULATION`, `FEASIBILITY|${ID('THRESHOLD')}|REJECTED`,
      `ELIGIBILITY|${ID('THRESHOLD', 'INTERVALS')}|ELIGIBLE`, `SAFETY_G1|${ID('THRESHOLD', 'INTERVALS')}|PASSED_SIMULATION`, `FEASIBILITY|${ID('THRESHOLD', 'INTERVALS')}|ANCHORED:first-exposure:tt`,
      `PRECISION|${ID('THRESHOLD', 'INTERVALS')}|EFFORT_ONLY`, 'GENERATION|THRESHOLD|GENERATED:2', `SELECTION|${ID('THRESHOLD', 'INTERVALS')}|SELECTED:SINGLE_CANDIDATE`,
    ]);
    expect(rej(o)).toEqual(['FEASIBILITY', 'NONE']);
    expect(params(o, 1)).toEqual(['running.hi.densityPolicy*', 'running.placement.strongDefaultSeparation*', 'running.firstExposure.threshold*', 'running.reference.recencyBands*', 'running.target.rpeByDomain*']);
    expect(o.trace[6]?.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.FIRST_EXPOSURE_APPLIED]);
    expect(reason(o, RUNNING_CODES.PROGRESSION_HOLD)).toEqual({ archetype: 'THRESHOLD', cause: 'FIRST_EXPOSURE' });
    expect(reason(o, RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED)).toEqual({ archetype: 'THRESHOLD', precision: 'EFFORT_ONLY', cause: 'QUALITY_PACE_NOT_PRESCRIBED' });
    expect(reason(o, RUNNING_CODES.HIGH_DEMAND_DEFAULT_CONSERVATIVE)).toEqual({ archetype: 'THRESHOLD', parameterId: 'running.quality.minimumDose' });
    expect(o.candidates[1]?.degradations.map((x) => `${x.effect}:${x.subject}:${x.capability}:${x.parameterIds.join('+')}`)).toEqual([
      'CALIBRATION_REQUIRED:GOAL:TEN_K:performanceExtrapolation:running.performance.extrapolationExponent', 'PRECISION_REDUCED:THRESHOLD:paceTargets:running.target.paceRangeWidthByConfidence',
    ]);
  });

  it('TEST', () => {
    const o = run(disc([h('m', 4, { distanceM: 5000 })]), 'running.test');
    expect(trace(o)).toEqual([
      'ANALYSIS|running.test|ELIGIBLE/EFFORT_ONLY', `ELIGIBILITY|${ID('TEST')}|ELIGIBLE`, `SAFETY_G1|${ID('TEST')}|PASSED_SIMULATION`, `FEASIBILITY|${ID('TEST')}|TEST_PROTOCOL`,
      `PRECISION|${ID('TEST')}|EFFORT_ONLY`, 'GENERATION|TEST|GENERATED:1', `SELECTION|${ID('TEST')}|SELECTED:SINGLE_CANDIDATE`,
    ]);
    expect(o.trace[3]?.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.TEST_PROTOCOL_APPLIED]);
    expect(o.trace[4]?.reasons).toEqual([]);
    expect(params(o)).toEqual(['running.hi.densityPolicy*', 'running.placement.strongDefaultSeparation*', 'running.test.protocol*', 'running.reference.recencyBands*', 'running.target.rpeByDomain*']);
    expect(o.candidates[0]?.degradations.map((x) => x.effect)).toEqual(['CALIBRATION_REQUIRED']);
    expect(o.reasons.map((r) => r.code)).toEqual([
      RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.TEST_PROTOCOL_APPLIED,
      RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.SIMULATED_PROPOSAL, RUNNING_CODES.CALIBRATION_REQUIRED,
    ]);
  });

  it('hors vague : aucune génération, trace et raisons exactes', () => {
    const o = run(disc([h('a', 3)]), 'running.strides');
    expect(trace(o)).toEqual(['ANALYSIS|running.strides|ELIGIBLE/EFFORT_ONLY', 'GENERATION|running.strides|NOT_GENERATED']);
    expect(o.trace[1]?.reasons.map((r) => r.code)[0]).toBe(RUNNING_CODES.PRESCRIPTION_NOT_IMPLEMENTED);
    expect(o.candidates).toEqual([]);
  });
});

describe('étape de rejet de chaque refus', () => {
  it('SAFETY_G1 : novice, reprise longue sans séance, garde, simulation requise', () => {
    const approved = fullyApprovedGovernance();
    const r0 = run(disc([h('a', 3)], { population: { level: 'P_R0', hybrid: false } }), 'running.easy', { g: approved });
    expect(rej(r0)).toEqual(['SAFETY_G1']);
    expect(reason(r0, RUNNING_CODES.NOVICE_ENTRY_UNRESOLVED)).toEqual({ population: 'P_R0' });
    const ret = run(disc([h('a', 3)], { returnState: { state: 'LONG', postReturnSessions: 0 } }), 'running.easy', { g: approved });
    expect(rej(ret)).toEqual(['SAFETY_G1']);
    expect(reason(ret, RUNNING_CODES.RETURN_PROTOCOL_UNRESOLVED)).toEqual({ returnState: 'LONG' });
    const guard = run(disc([sev('a', 1)]), 'running.severe');
    expect(rej(guard)).toEqual(['SAFETY_G1']);
    expect(trace(guard)).toContain(`SAFETY_G1|${ID('SEVERE', 'INTERVALS')}|REJECTED`);
    const cand = run(disc([h('a', 3)]), 'running.easy', { simulation: false });
    expect(rej(cand)).toEqual(['SAFETY_G1']);
  });

  it('FEASIBILITY : première exposition refusée, structure non enregistrée ; PRECISION : V02 illisible', () => {
    expect(rej(run(disc([h('e', 3)]), 'running.severe'))).toEqual(['FEASIBILITY']);
    const noStruct = run(disc([sev('a', 5, { structure: undefined })]), 'running.severe');
    expect(rej(noStruct)).toEqual(['FEASIBILITY']);
    expect(reason(noStruct, RUNNING_CODES.STRUCTURE_UNAVAILABLE)).toEqual({ archetype: 'SEVERE', sessionId: 'a', cause: 'NOT_RECORDED' });
    const easy = run(disc([h('a', 3)]), 'running.easy', { g: patchV('running.target.rpeByDomain', (v) => ({ ...v, EASY_LOW: { max: 0 } })) });
    expect(rej(easy)).toEqual(['PRECISION']);
    expect(easy.candidates[0]?.rejection?.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED]);
    expect(easy.candidates[0]).toMatchObject({ dose: { kind: 'duration', durationS: 1800 }, exerciseId: 'ex.easy_run' });
    expect(easy.reasons).toEqual(easy.candidates[0]?.rejection?.reasons);
  });

  it('V02 des séances de qualité : bande du domaine et plafond facile exigés, bornes', () => {
    const q = (f: (v: Record<string, unknown>) => unknown) => run(disc([sev('a', 5)]), 'running.severe', { g: patchV('running.target.rpeByDomain', f) });
    for (const f of [(v: Record<string, unknown>) => { const { SEVERE: _, ...rest } = v; return rest; }, (v: Record<string, unknown>) => ({ ...v, SEVERE: { min: 0, max: 8 } }), (v: Record<string, unknown>) => ({ ...v, SEVERE: { min: 8, max: 7 } }), (v: Record<string, unknown>) => ({ ...v, SEVERE: { min: '7', max: 8 } }), (v: Record<string, unknown>) => ({ ...v, SEVERE: { min: 7, max: '8' } }), (v: Record<string, unknown>) => ({ ...v, EASY_LOW: { max: 0 } }), (v: Record<string, unknown>) => ({ ...v, EASY_LOW: {} })]) {
      const o = q(f);
      expect(rej(o)).toEqual(['PRECISION']);
      expect(o.candidates[0]).toMatchObject({ dose: { kind: 'structure' }, exerciseId: 'ex.easy_run' });
      expect(o.candidates[0]?.rejection?.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED]);
    }
    expect(q((v) => ({ ...v, SEVERE: { min: 7, max: 7 } })).status).toBe('selected');
  });

  it('V02 du TEST : bande TEST et plafond facile exigés, bornes', () => {
    const t = (f: (v: Record<string, unknown>) => unknown) => run(disc([h('m', 4, { distanceM: 5000 })]), 'running.test', { g: patchV('running.target.rpeByDomain', f) });
    for (const f of [(v: Record<string, unknown>) => { const { TEST: _, ...rest } = v; return rest; }, (v: Record<string, unknown>) => ({ ...v, TEST: { min: 0, max: 10 } }), (v: Record<string, unknown>) => ({ ...v, TEST: { min: 10, max: 9 } }), (v: Record<string, unknown>) => ({ ...v, TEST: { min: '9', max: 10 } }), (v: Record<string, unknown>) => ({ ...v, TEST: { min: 9, max: '10' } }), (v: Record<string, unknown>) => ({ ...v, EASY_LOW: { max: 0 } }), (v: Record<string, unknown>) => ({ ...v, EASY_LOW: { max: '3' } })]) {
      const o = t(f);
      expect(rej(o)).toEqual(['PRECISION']);
      expect(o.candidates[0]).toMatchObject({ dose: { kind: 'test', distanceM: 10000 }, exerciseId: 'ex.easy_run' });
      expect(o.candidates[0]?.rejection?.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED]);
      expect(trace(o)).toContain(`PRECISION|${ID('TEST')}|REJECTED`);
    }
    expect(t((v) => ({ ...v, TEST: { min: 10, max: 10 } })).status).toBe('selected');
  });
});

describe('exercice : filtre du catalogue et ambiguïté (qualité, TEST)', () => {
  const withCatalog = (d: RunningContextInput, a: string, extra: (base: Exercise) => Exercise[]) => {
    const x = input(D, d, a);
    const base = x.input.catalog.exercise('ex.easy_run') as Exercise;
    const catalog = Object.assign(Object.create(Object.getPrototypeOf(x.input.catalog) as object) as typeof x.input.catalog, x.input.catalog, { activeExercises: () => [...extra(base), ...x.input.catalog.activeExercises()] });
    return x.engine.prescribe({ ...x.input, catalog });
  };
  it('exercices non admissibles ignorés : autre discipline, motif non « running », mouvement non monostructurel', () => {
    for (const mk of [(b: Exercise) => ({ ...b, id: 'ex.z1', disciplines: ['strength'] }), (b: Exercise) => ({ ...b, id: 'ex.z2', patterns: { ...b.patterns, primary: 'squat' } }), (b: Exercise) => ({ ...b, id: 'ex.z3', movementType: 'compound' })]) {
      expect(withCatalog(disc([sev('a', 5)]), 'running.severe', (b) => [mk(b) as Exercise]).status).toBe('selected');
    }
  });
  it('deux exercices admissibles ⇒ AMBIGUOUS, identifiants triés, dose conservée (qualité et TEST)', () => {
    const twin = (b: Exercise) => [{ ...b, id: 'ex.a_run' } as Exercise];
    const q = withCatalog(disc([sev('a', 5)]), 'running.severe', twin);
    expect(rej(q)).toEqual(['FEASIBILITY']);
    expect(reason(q, RUNNING_CODES.EXERCISE_UNAVAILABLE)).toEqual({ cause: 'AMBIGUOUS', candidates: ['ex.a_run', 'ex.easy_run'] });
    expect(q.candidates[0]?.dose?.kind).toBe('structure');
    const t = withCatalog(disc([h('m', 4, { distanceM: 5000 })]), 'running.test', twin);
    expect(rej(t)).toEqual(['FEASIBILITY']);
    expect(reason(t, RUNNING_CODES.EXERCISE_UNAVAILABLE)).toEqual({ cause: 'AMBIGUOUS', candidates: ['ex.a_run', 'ex.easy_run'] });
    expect(t.candidates[0]?.dose?.kind).toBe('test');
  });
  it('aucun exercice (exclu) ⇒ NONE (qualité et TEST)', () => {
    for (const [d, a] of [[disc([sev('a', 5)]), 'running.severe'], [disc([h('m', 4, { distanceM: 5000 })]), 'running.test']] as const) {
      const x = input(D, d, a);
      const o = x.engine.prescribe({ ...x.input, profile: { ...x.input.profile, excludedExercises: ['ex.easy_run'] } });
      expect(reason(o, RUNNING_CODES.EXERCISE_UNAVAILABLE)).toEqual({ cause: 'NONE', candidates: [] });
      expect(rej(o)).toEqual(['FEASIBILITY']);
    }
  });
});

describe('temps disponible, §K, reprise, production', () => {
  it('qualité : le pas ne tient pas ⇒ HOLD TIME_AVAILABLE, dose tenue, V23 non déclaré ; la dose tenue non plus ⇒ TIME_EXCEEDED', () => {
    // 600 + 4×240 + 3×120 + 300 = 2220 s ; avec le pas : 2580 s.
    const o = run(disc([sev('a', 9), sev('b', 5)]), 'running.severe', { A: 2300 });
    expect(o.status).toBe('selected');
    expect(reason(o, RUNNING_CODES.PROGRESSION_HOLD)).toEqual({ archetype: 'SEVERE', cause: 'TIME_AVAILABLE' });
    expect(o.status === 'selected' && o.selection.candidate.dose).toMatchObject({ kind: 'structure', structure: S, workS: 960 });
    expect(o.status === 'selected' && o.selection.candidate.dose?.kind === 'structure' && o.selection.candidate.dose.progression).toBeUndefined();
    expect(params(o)).not.toContain('running.progression.magnitude*');
    expect(run(disc([sev('a', 9), sev('b', 5)]), 'running.severe', { A: 2580 }).reasons.map((r) => r.code)).toContain(RUNNING_CODES.PROGRESSION_STEP_APPLIED);
    const over = run(disc([sev('a', 9), sev('b', 5)]), 'running.severe', { A: 2219 });
    expect(reason(over, RUNNING_CODES.TIME_EXCEEDED)).toEqual({ archetype: 'SEVERE', availableTimeS: 2219, estimatedMaxS: 2220 });
  });

  it('LONG : défaut conservateur tracé avec le paramètre V32 ; EASY : jamais', () => {
    expect(reason(run(disc([h('l', 6, { archetype: 'LONG', realizedDurationS: 4800 })]), 'running.long'), RUNNING_CODES.HIGH_DEMAND_DEFAULT_CONSERVATIVE)).toEqual({ archetype: 'LONG', parameterId: 'running.longRun.marginAndBound' });
    expect(reason(run(disc([h('a', 3)]), 'running.easy'), RUNNING_CODES.HIGH_DEMAND_DEFAULT_CONSERVATIVE)).toBeUndefined();
  });

  it('§K : seuil continu en P-R2 selon la confiance de la référence de seuil (analyse de vague 1)', () => {
    const cont = h('c', 5, { archetype: 'THRESHOLD', realizedDurationS: 2100, structure: { warmupS: 600, reps: 1, workS: 1200, cooldownS: 300 } });
    const p2 = (refs: ReturnType<typeof tt>[]) => run(disc([cont], { population: { level: 'P_R2', hybrid: false }, references: refs }), 'running.threshold');
    expect(p2([tt(3)]).status).toBe('selected');
    expect(reason(p2([]), RUNNING_CODES.QUALITY_GUARD_FAILED)).toEqual({ archetype: 'THRESHOLD', rule: 'K_CONTINUOUS_LEVEL', detail: 'P_R2/NONE' });
    expect(reason(p2([tt(200)]), RUNNING_CODES.QUALITY_GUARD_FAILED)).toEqual({ archetype: 'THRESHOLD', rule: 'K_CONTINUOUS_LEVEL', detail: 'P_R2/LOW' });
  });

  it('reprise : la progression ne compte que les séances post-retour (début transmis)', () => {
    const g = patchV('running.return.resumeCondition', () => ({ postReturnSessionsWithoutSignal: 1 }));
    const o = run(disc([h('a', 9), h('b', 3)], { returnState: { state: 'SHORT', postReturnSessions: 1 }, recentLoad: { returnStartedAt: daysAgo(5), dimensions: [] } }), 'running.easy', { g });
    expect(reason(o, RUNNING_CODES.PROGRESSION_HOLD)).toEqual({ archetype: 'EASY', cause: 'TOLERANCE_NOT_DEMONSTRATED' });
    const none = run(disc([h('a', 9), h('b', 3)], { recentLoad: { returnStartedAt: daysAgo(5), dimensions: [] } }), 'running.easy', { g });
    expect(none.reasons.map((r) => r.code)).toContain(RUNNING_CODES.PROGRESSION_STEP_APPLIED);
  });

  it('précision réduite : causes de la vague 1 conservées (sans montre)', () => {
    const o = run(disc([sev('a', 5)], { sensors: { wearable: false, heartRate: false } }), 'running.severe');
    expect(reason(o, RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED)).toEqual({ archetype: 'SEVERE', precision: 'EFFORT_ONLY', cause: 'NO_WEARABLE,REFERENCE_MISSING,ANCHOR_REFERENCE_MISSING,QUALITY_PACE_NOT_PRESCRIBED' });
    const withRef = run(disc([sev('a', 5)], { references: [tt()] }), 'running.severe', { g: patchV('running.target.paceRangeWidthByConfidence', () => ({ HIGH: null })) });
    expect(reason(withRef, RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED)).toEqual({ archetype: 'SEVERE', precision: 'EFFORT_ONLY', cause: 'REFERENCE_CONFIDENCE_INSUFFICIENT,QUALITY_PACE_NOT_PRESCRIBED' });
  });

  it('production entièrement approuvée (simulée) : paramètres non candidats, aucune proposition marquée simulée', () => {
    const o = run(disc([h('a', 3)], { mode: 'PRODUCTION' }), 'running.easy', { g: fullyApprovedGovernance(), simulation: false });
    expect(o.status).toBe('selected');
    expect(o.candidates[0]?.parameters.every((p) => !p.candidate)).toBe(true);
    expect(o.reasons.map((r) => r.code)).not.toContain(RUNNING_CODES.SIMULATED_PROPOSAL);
    expect(trace(o)).toContain(`SAFETY_G1|${ID('EASY')}|PASSED`);
  });

  it('aucun candidat : raisons = rejets concaténés ; ambiguïté de famille : candidats conservés', () => {
    const none = run(disc([h('e', 3)]), 'running.threshold');
    expect(none.status).toBe('no_valid');
    expect(none.reasons).toEqual(none.candidates.flatMap((c) => c.rejection?.reasons ?? []));
    const at = daysAgo(5);
    const amb = run(disc([h('c', 5, { archetype: 'THRESHOLD', completedAt: at, structure: { warmupS: 600, reps: 1, workS: 1200, cooldownS: 300 } }), h('i', 5, { archetype: 'THRESHOLD', structureFamily: 'INTERVALS', completedAt: at, structure: { reps: 4, workS: 300, recoveryS: 60, recoveryMode: 'jog' } })], { population: { level: 'P_R4', hybrid: false } }), 'running.threshold');
    expect(reason(amb, RUNNING_CODES.FAMILY_AMBIGUOUS)).toEqual({ archetype: 'THRESHOLD', families: ['CONTINUOUS', 'INTERVALS'] });
    expect(amb.candidates.map((c) => c.candidateId)).toEqual([ID('THRESHOLD'), ID('THRESHOLD', 'INTERVALS')]);
    expect(trace(amb).at(-1)).toBe('SELECTION|THRESHOLD|NO_CANDIDATE');
  });
});
