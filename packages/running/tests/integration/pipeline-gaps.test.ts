/**
 * Gate Course (mutation G2, 2e passe) — derniers survivants tuables du pipeline : chemin de première exposition
 * réservé au fractionné, capacités de progression par archétype, étapes de rejet, dose conservée sur un rejet de
 * temps, raisons de HOLD, frontière exacte du temps, précision et traces de qualité, V02 fail-closed, TEST.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, FingerprintHistoryEntry } from '@hybridsport/domain';
import { runSportSession } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { createRunningEngine, CURRENT_RUNNING_GOVERNANCE, RUNNING_CODES, withProductDecisions } from '../../src/index.js';
import type { CapabilityId, RunningContext, RunningContextInput, RunningGovernance, RunningParameter } from '../../src/index.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { coreContext, ctxInput, fullyApprovedGovernance, runIntent, withParameter } from '../fixtures.js';

const NOW = Date.parse('2026-09-28T08:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString().replace('.000Z', 'Z');
type H = NonNullable<RunningContextInput['sessionHistory']>[number];
const h = (id: string, d: number, o: Partial<H> = {}): H => ({ sessionId: id, archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: daysAgo(d), realizedDurationS: 1800, completion: 'COMPLETED', unexpectedDifficulty: 'AS_EXPECTED', ...o });
const S = { warmupS: 600, reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog' as const, cooldownS: 300 };
const sev = (id: string, d: number, o: Partial<H> = {}) => h(id, d, { archetype: 'SEVERE', structureFamily: 'INTERVALS', realizedDurationS: 2220, structure: S, ...o });
const D = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
const disc = (hist: H[], o: Partial<RunningContextInput> = {}): RunningContextInput => ({ ...ctxInput({ population: { level: 'P_R3', hybrid: false }, exposures: [...new Set(hist.map((x) => x.archetype))].map((archetype) => ({ archetype, lastAt: daysAgo(3), count: 3 })), ...o }), sessionHistory: hist });
function prep(g: RunningGovernance, d: RunningContextInput, a: string, A: number, simulation: boolean) {
  const engine = createRunningEngine({ governance: g, simulation });
  let seen: SportEngineInput<RunningContext> | undefined;
  const spy = { ...engine, propose: (i: SportEngineInput<RunningContext>) => { seen = i; return engine.propose(i); } };
  runSportSession(spy, { intent: { ...runIntent(a), availableTimeS: A, targetDurationS: A - 150 }, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: d }, coreContext('g2b'));
  if (!seen) throw new Error('entrée non transmise');
  return { engine, input: seen };
}
const run = (d: RunningContextInput, a: string, o: { g?: RunningGovernance; A?: number; simulation?: boolean } = {}) => { const x = prep(o.g ?? D, d, a, o.A ?? 5400, o.simulation ?? true); return x.engine.prescribe(x.input); };
type Out = ReturnType<typeof run>;
const codes = (rs: readonly { code: string }[] | undefined) => (rs ?? []).map((r) => r.code);
const reason = (o: Out, code: string) => o.reasons.find((r) => r.code === code)?.params;
const patchV = (id: string, f: (v: Record<string, unknown>) => unknown) => withParameter(D, id, (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: f(p.value.status === 'candidate' ? p.value.value as Record<string, unknown> : {}) } }));
const CV = RUNNING_CODES.CANDIDATE_VALUE_USED;

describe('chemin de première exposition : fractionné de qualité seulement', () => {
  it('seuil continu sans historique : rejet d’ancre seul (jamais de table de première exposition)', () => {
    const o = run(disc([h('e', 3)]), 'running.threshold');
    expect(codes(o.candidates[0]?.rejection?.reasons)).toEqual([CV, CV, RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE]);
  });
  it('EASY sans historique : rejet d’ancre seul', () => {
    const o = run(disc([]), 'running.easy');
    expect(codes(o.candidates[0]?.rejection?.reasons)).toEqual([CV, CV, RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE]);
    expect(o.candidates[0]?.rejection?.stage).toBe('FEASIBILITY');
  });
});

describe('capacité de progression par archétype', () => {
  const only = (caps: CapabilityId[]) => (hist: H[]) => ({ ...disc(hist), capabilityRequests: caps });
  it('LONG progresse avec longRunProgression (pas progressionBeyondHistory) ; EASY l’inverse', () => {
    const long = [h('a', 13, { archetype: 'LONG', realizedDurationS: 4800 }), h('b', 6, { archetype: 'LONG', realizedDurationS: 4800 })];
    expect(reason(run(only(['longRunProgression'])(long), 'running.long'), RUNNING_CODES.PROGRESSION_STEP_APPLIED)).toMatchObject({ archetype: 'LONG' });
    expect(reason(run(only(['progressionBeyondHistory'])(long), 'running.long'), RUNNING_CODES.PROGRESSION_HOLD)).toEqual({ archetype: 'LONG', cause: 'CAPABILITY_DISABLED' });
    const easy = [h('a', 6), h('b', 3)];
    expect(reason(run(only(['progressionBeyondHistory'])(easy), 'running.easy'), RUNNING_CODES.PROGRESSION_STEP_APPLIED)).toMatchObject({ archetype: 'EASY' });
    expect(reason(run(only(['longRunProgression'])(easy), 'running.easy'), RUNNING_CODES.PROGRESSION_HOLD)).toEqual({ archetype: 'EASY', cause: 'CAPABILITY_DISABLED' });
  });
});

describe('rejets : étapes, dose et intensité conservées, raisons', () => {
  it('EASY sans exercice ⇒ FEASIBILITY ; TEST refusé ⇒ FEASIBILITY ; archétype inconnu ⇒ trace ARCHETYPE_UNKNOWN', () => {
    const x = prep(D, disc([h('a', 3)]), 'running.easy', 5400, true);
    const noEx = x.engine.prescribe({ ...x.input, profile: { ...x.input.profile, excludedExercises: ['ex.easy_run'] } });
    expect(noEx.candidates[0]?.rejection?.stage).toBe('FEASIBILITY');
    expect(run(disc([h('a', 3)]), 'running.test').candidates[0]?.rejection?.stage).toBe('FEASIBILITY');
    const unknown = x.engine.prescribe({ ...x.input, intent: { ...x.input.intent, archetypeId: 'running.unknown_kind' } });
    expect(unknown.trace[0]).toMatchObject({ stage: 'ANALYSIS', subject: 'running.unknown_kind', decision: 'ARCHETYPE_UNKNOWN' });
  });

  it('temps dépassé : dose et intensité conservées sur le candidat rejeté (EASY, qualité, TEST)', () => {
    const e = run(disc([h('a', 3)]), 'running.easy', { A: 1799 });
    expect(e.candidates[0]).toMatchObject({ rejection: { stage: 'FEASIBILITY' }, dose: { kind: 'duration', durationS: 1800 }, intensity: { domain: 'EASY_LOW' }, exerciseId: 'ex.easy_run' });
    const q = run(disc([sev('a', 5)]), 'running.severe', { A: 2219 });
    expect(q.candidates[0]).toMatchObject({ rejection: { stage: 'FEASIBILITY' }, dose: { kind: 'structure' }, intensity: { domain: 'SEVERE' }, exerciseId: 'ex.easy_run' });
    const t = run(disc([h('m', 4, { distanceM: 5000 })]), 'running.test', { A: 4499 });
    expect(t.candidates[0]).toMatchObject({ rejection: { stage: 'FEASIBILITY' }, dose: { kind: 'test' }, intensity: { domain: 'TEST' }, exerciseId: 'ex.easy_run' });
  });

  it('HOLD de tolérance conservé (jamais remplacé par TIME_AVAILABLE) quand la dose tenue dépasse aussi le temps', () => {
    const e = run(disc([h('b', 3)]), 'running.easy', { A: 1799 });
    expect(e.candidates[0]?.reasons.filter((r) => r.code === RUNNING_CODES.PROGRESSION_HOLD).map((r) => r.params.cause)).toEqual(['TOLERANCE_NOT_DEMONSTRATED']);
    const q = run(disc([sev('b', 5)]), 'running.severe', { A: 2219 });
    expect(q.candidates[0]?.reasons.filter((r) => r.code === RUNNING_CODES.PROGRESSION_HOLD).map((r) => r.params.cause)).toEqual(['TOLERANCE_NOT_DEMONSTRATED']);
  });

  it('EASY : le pas qui tient exactement dans le temps disponible est appliqué', () => {
    const o = run(disc([h('a', 6), h('b', 3)]), 'running.easy', { A: 1860 });
    expect(o.status === 'selected' && o.selection.candidate.dose).toMatchObject({ durationS: 1860 });
  });
});

describe('précision, raisons et traces', () => {
  it('raison de précision réduite émise une seule fois (EASY, qualité)', () => {
    for (const [d, a] of [[disc([h('a', 3)]), 'running.easy'], [disc([sev('a', 5)]), 'running.severe']] as const) {
      const o = run(d, a);
      expect(o.reasons.filter((r) => r.code === RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED)).toHaveLength(1);
    }
  });

  it('qualité à l’effort : trace PRECISION avec la raison, dégradation avec la cause de la vague 3, aucune référence, V02 tracé', () => {
    const o = run(disc([sev('a', 5)]), 'running.severe');
    expect(o.trace.find((t) => t.stage === 'PRECISION')?.reasons.map((r) => r.params.cause)).toEqual(['REFERENCE_MISSING,ANCHOR_REFERENCE_MISSING,QUALITY_PACE_NOT_PRESCRIBED']);
    expect(o.candidates[0]?.degradations.find((x) => x.effect === 'PRECISION_REDUCED')?.reason.params.cause).toBe('REFERENCE_MISSING,ANCHOR_REFERENCE_MISSING,QUALITY_PACE_NOT_PRESCRIBED');
    expect(o.candidates[0]?.references).toEqual([]);
    expect(o.reasons.filter((r) => r.code === CV).map((r) => r.params.parameterId)).toContain('running.target.rpeByDomain');
  });

  it('pas sur un fractionné : travail total et progression tracés dans la dose', () => {
    const o = run(disc([sev('a', 9), sev('b', 5)]), 'running.severe');
    expect(o.status === 'selected' && o.selection.candidate.dose).toMatchObject({ kind: 'structure', workS: 1200, progression: { variable: 'reps', from: 4, to: 5, parameterId: 'running.progression.magnitude' } });
  });

  it('V02 de qualité : EASY_LOW absent ou plafond non numérique ⇒ refus (jamais d’exception)', () => {
    for (const f of [(v: Record<string, unknown>) => { const { EASY_LOW: _, ...rest } = v; return rest; }, (v: Record<string, unknown>) => ({ ...v, EASY_LOW: { max: '3' } })]) {
      expect(run(disc([sev('a', 5)]), 'running.severe', { g: patchV('running.target.rpeByDomain', f) }).candidates[0]?.rejection?.stage).toBe('PRECISION');
      expect(run(disc([h('m', 4, { distanceM: 5000 })]), 'running.test', { g: patchV('running.target.rpeByDomain', f) }).candidates[0]?.rejection?.stage).toBe('PRECISION');
    }
  });

  it('reprise : raisons du protocole de reprise tracées', () => {
    const o = run(disc([h('a', 9), h('b', 3)], { returnState: { state: 'SHORT', postReturnSessions: 1 }, recentLoad: { returnStartedAt: daysAgo(5), dimensions: [] } }), 'running.easy');
    expect(o.reasons.filter((r) => r.code === CV).map((r) => r.params.parameterId)).toContain('running.return.protocol');
  });

  it('§K : seule la confiance de la référence de SEUIL compte (une observation d’entraînement ne suffit pas)', () => {
    const obs = { referenceId: 'obs', type: 'TRAINING_OBSERVATION' as const, values: { durationS: 1800, paceSecPerKm: 300 }, date: daysAgo(3), provenance: { source: 'APP_RECORDED' as const }, confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL' as const, interruptionSince: 'NONE' as const } };
    const cont = h('c', 5, { archetype: 'THRESHOLD', realizedDurationS: 2100, structure: { warmupS: 600, reps: 1, workS: 1200, cooldownS: 300 } });
    const o = run(disc([cont], { population: { level: 'P_R2', hybrid: false }, references: [obs] }), 'running.threshold');
    expect(reason(o, RUNNING_CODES.QUALITY_GUARD_FAILED)).toEqual({ archetype: 'THRESHOLD', rule: 'K_CONTINUOUS_LEVEL', detail: 'P_R2/NONE' });
  });

  it('TEST : précision EFFORT_ONLY sur le candidat', () => {
    const o = run(disc([h('m', 4, { distanceM: 5000 })]), 'running.test');
    expect(o.status === 'selected' && o.selection.candidate.precision).toBe('EFFORT_ONLY');
  });

  it('production approuvée (simulée) : séance de qualité sans marque de simulation', () => {
    const o = run(disc([sev('a', 5)], { mode: 'PRODUCTION' }), 'running.severe', { g: fullyApprovedGovernance(), simulation: false });
    expect(o.status).toBe('selected');
    expect(codes(o.reasons)).not.toContain(RUNNING_CODES.SIMULATED_PROPOSAL);
  });

  it('exercices ambigus : identifiants triés quel que soit l’ordre du catalogue', () => {
    const x = prep(D, disc([h('a', 3)]), 'running.easy', 5400, true);
    const base = x.input.catalog.exercise('ex.easy_run') as Exercise;
    const catalog = Object.assign(Object.create(Object.getPrototypeOf(x.input.catalog) as object) as typeof x.input.catalog, x.input.catalog, { activeExercises: () => [base, { ...base, id: 'ex.a_run' } as Exercise, ...x.input.catalog.activeExercises().filter((e) => e.id !== 'ex.easy_run')] });
    expect(reason(x.engine.prescribe({ ...x.input, catalog }), RUNNING_CODES.EXERCISE_UNAVAILABLE)).toEqual({ cause: 'AMBIGUOUS', candidates: ['ex.a_run', 'ex.easy_run'] });
  });
});
