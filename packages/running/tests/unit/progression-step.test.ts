/**
 * Gate Course (mutation G4) — pas minimal D1 (`progressionStep`), testé directement : chaque cause de HOLD,
 * toute valeur V23 illisible refusée (fail-closed), chaque condition de tolérance, frontières temporelles, pas exacts.
 */
import { describe, expect, it } from 'vitest';
import { CURRENT_RUNNING_GOVERNANCE, progressionStep, RUNNING_CODES, V23, withProductDecisions, zRealizedSession } from '../../src/index.js';
import type { RealizedSession, RunningParameter, StepInput } from '../../src/index.js';
import { withParameter } from '../fixtures.js';

const NOW = '2026-09-28T08:00:00Z';
const at = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString().replace('.000Z', 'Z');
const G = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
const s = (id: string, d: number, o: Record<string, unknown> = {}): RealizedSession => zRealizedSession.parse({
  sessionId: id, archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: at(d), realizedDurationS: 1800, completion: 'COMPLETED', unexpectedDifficulty: 'AS_EXPECTED', ...o,
});
const input = (history: RealizedSession[], o: Partial<StepInput> = {}): StepInput => ({
  archetype: 'EASY', family: 'CONTINUOUS', anchor: history[history.length - 1] as RealizedSession, afterNegativeFallback: false, history, now: NOW,
  capabilityEnabled: true, returnLifted: true, parameters: G.parameters, mode: 'CANDIDATE', ...o,
});
const v23 = (value: unknown): readonly RunningParameter[] => withParameter(G, V23, (p): RunningParameter => ({ ...p, value: { status: 'candidate', value } })).parameters;
const BASE = { policy: 'MINIMAL_STEP', durationStepS: 60, repetitionStep: 1, toleratedSessionsBeforeStep: 2, oneVariableAtATime: true };
const cause = (r: ReturnType<typeof progressionStep>) => (r.kind === 'hold' ? r.cause : 'STEP');
const OK = [s('a', 6), s('b', 3)];

describe('HOLD : causes, raisons et paramètres', () => {
  it('capacité, repli D5, reprise, V23 : ordre et trace exacts', () => {
    const h = progressionStep(input(OK, { capabilityEnabled: false }));
    expect(h).toEqual({ kind: 'hold', cause: 'CAPABILITY_DISABLED', reasons: [expect.objectContaining({ code: RUNNING_CODES.PROGRESSION_HOLD, params: { archetype: 'EASY', cause: 'CAPABILITY_DISABLED' } })], parameterIds: [] });
    expect(cause(progressionStep(input(OK, { capabilityEnabled: false, afterNegativeFallback: true })))).toBe('CAPABILITY_DISABLED');
    expect(cause(progressionStep(input(OK, { afterNegativeFallback: true, returnLifted: false })))).toBe('AFTER_NEGATIVE_RESPONSE');
    expect(cause(progressionStep(input(OK, { returnLifted: false })))).toBe('RETURN_REQUIREMENTS');
    const without = G.parameters.filter((p) => p.parameterId !== V23);
    const u = progressionStep(input(OK, { parameters: without }));
    expect(cause(u)).toBe('MAGNITUDE_UNDEFINED');
    expect(u.parameterIds).toEqual([]);
    expect(u.reasons.map((r) => r.code)).toContain(RUNNING_CODES.UNRESOLVED_PARAMETER);
    expect(cause(progressionStep(input(OK, { parameters: CURRENT_RUNNING_GOVERNANCE.parameters })))).toBe('MAGNITUDE_UNDEFINED');
  });

  it.each([
    null, 'MINIMAL_STEP', 3,
    { ...BASE, policy: 'RANGE' }, { ...BASE, oneVariableAtATime: false }, { ...BASE, oneVariableAtATime: 'true' },
    { ...BASE, durationStepS: 0 }, { ...BASE, durationStepS: -60 }, { ...BASE, durationStepS: '60' },
    { ...BASE, repetitionStep: 0 }, { ...BASE, repetitionStep: 1.5 }, { ...BASE, repetitionStep: '1' },
    { ...BASE, toleratedSessionsBeforeStep: 0 }, { ...BASE, toleratedSessionsBeforeStep: 1.5 }, { ...BASE, toleratedSessionsBeforeStep: '2' },
  ])('V23 illisible %j ⇒ MAGNITUDE_UNDEFINED (jamais interprété)', (value) => {
    expect(cause(progressionStep(input(OK, { parameters: v23(value) })))).toBe('MAGNITUDE_UNDEFINED');
  });

  it('V23 valide aux bornes : pas de durée fractionnaire accepté, N = 1', () => {
    const r = progressionStep(input([s('b', 3)], { parameters: v23({ ...BASE, durationStepS: 0.5, toleratedSessionsBeforeStep: 1 }) }));
    expect(r).toMatchObject({ kind: 'step', variable: 'durationS', from: 1800, to: 1800.5, durationS: 1800.5 });
  });
});

describe('tolérance démontrée (N séances consécutives à la dose ancrée)', () => {
  it('pas appliqué : trace exacte', () => {
    const r = progressionStep(input(OK));
    expect(r).toEqual({ kind: 'step', variable: 'durationS', from: 1800, to: 1860, durationS: 1860, parameterIds: [V23], reasons: expect.arrayContaining([expect.objectContaining({ code: RUNNING_CODES.PROGRESSION_STEP_APPLIED, params: { archetype: 'EASY', variable: 'durationS', from: 1800, to: 1860, parameterId: V23 } })]) });
  });

  it('HOLD si : trop peu de séances, la plus récente n’est pas l’ancre, dose ou structure différente', () => {
    const t = (h: RealizedSession[], o: Partial<StepInput> = {}) => { const r = progressionStep(input(h, o)); return [cause(r), r.parameterIds]; };
    expect(t([s('b', 3)])).toEqual(['TOLERANCE_NOT_DEMONSTRATED', [V23]]);
    expect(t(OK, { anchor: s('a', 6) })).toEqual(['TOLERANCE_NOT_DEMONSTRATED', [V23]]);
    expect(t([s('a', 6, { realizedDurationS: 1799 }), s('b', 3)])).toEqual(['TOLERANCE_NOT_DEMONSTRATED', [V23]]);
    const st = { reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog' };
    const sv = (id: string, d: number, o: Record<string, unknown> = {}) => s(id, d, { archetype: 'SEVERE', structureFamily: 'INTERVALS', structure: st, ...o });
    expect(cause(progressionStep(input([sv('a', 6, { structure: { ...st, recoveryS: 90 } }), sv('b', 3)], { archetype: 'SEVERE', family: 'INTERVALS' })))).toBe('TOLERANCE_NOT_DEMONSTRATED');
  });

  it.each([
    [{ completion: 'PARTIAL' }], [{ unexpectedDifficulty: 'HARDER' }], [{ unexpectedDifficulty: 'MUCH_HARDER' }], [{ unexpectedDifficulty: 'UNKNOWN' }],
    [{ intoleranceOrPainSignal: true }], [{ readinessOrToleranceDegraded: true }],
  ])('séance non tolérée %j (la plus ancienne des deux) ⇒ HOLD', (o) => {
    expect(cause(progressionStep(input([s('a', 6, o), s('b', 3)])))).toBe('TOLERANCE_NOT_DEMONSTRATED');
  });

  it('EASIER est toléré', () => {
    expect(cause(progressionStep(input([s('a', 6, { unexpectedDifficulty: 'EASIER' }), s('b', 3, { unexpectedDifficulty: 'EASIER' })])))).toBe('STEP');
  });

  it('seules comptent les séances du même archétype et de la même famille, non futures, post-retour', () => {
    expect(cause(progressionStep(input([s('a', 6, { archetype: 'LONG' }), s('b', 3)])))).toBe('TOLERANCE_NOT_DEMONSTRATED');
    expect(cause(progressionStep(input([s('x', 4, { archetype: 'LONG', unexpectedDifficulty: 'MUCH_HARDER' }), ...OK])))).toBe('STEP');
    expect(cause(progressionStep(input([s('x', 4, { structureFamily: 'INTERVALS', archetype: 'EASY' }), ...OK])))).toBe('STEP');
    // Une séance future (non réalisée à l'instant présent) ne s'intercale pas.
    expect(cause(progressionStep(input([...OK, s('f', -1, { completion: 'PARTIAL' })], { anchor: OK[1] })))).toBe('STEP');
    // Borne : séance exactement à l'instant présent retenue.
    expect(cause(progressionStep(input([s('a', 6), s('b', 0)])))).toBe('STEP');
    // Reprise : la séance antérieure au retour ne compte pas ; à l'instant du retour : compte.
    expect(cause(progressionStep(input(OK, { returnStartedAt: at(5) })))).toBe('TOLERANCE_NOT_DEMONSTRATED');
    expect(cause(progressionStep(input(OK, { returnStartedAt: at(6) })))).toBe('STEP');
  });

  it('séances simultanées : départage par identifiant (la plus petite est « la plus récente »), indépendant de l’ordre', () => {
    for (const h of [[s('c', 3), s('b', 3)], [s('b', 3), s('c', 3)]]) {
      expect(cause(progressionStep(input(h, { anchor: s('b', 3) })))).toBe('STEP');
      expect(cause(progressionStep(input(h, { anchor: s('c', 3) })))).toBe('TOLERANCE_NOT_DEMONSTRATED');
    }
  });

  it('N lu dans V23 : N = 3 exige trois séances', () => {
    expect(cause(progressionStep(input(OK, { parameters: v23({ ...BASE, toleratedSessionsBeforeStep: 3 }) })))).toBe('TOLERANCE_NOT_DEMONSTRATED');
    expect(cause(progressionStep(input([s('z', 9), ...OK], { parameters: v23({ ...BASE, toleratedSessionsBeforeStep: 3 }) })))).toBe('STEP');
  });
});

describe('variable du pas (une seule, §T)', () => {
  it('fractionné : +répétitions (valeur de V23) ; continu structuré : +travail ; course simple : +durée', () => {
    const st = { warmupS: 600, reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog', cooldownS: 300 };
    const sv = (id: string, d: number) => s(id, d, { archetype: 'SEVERE', structureFamily: 'INTERVALS', structure: st });
    expect(progressionStep(input([sv('a', 6), sv('b', 3)], { archetype: 'SEVERE', family: 'INTERVALS', parameters: v23({ ...BASE, repetitionStep: 2 }) }))).toMatchObject({ kind: 'step', variable: 'reps', from: 4, to: 6, structure: { ...st, reps: 6 } });
    const ct = { warmupS: 600, reps: 1, workS: 1200, cooldownS: 300 };
    const th = (id: string, d: number) => s(id, d, { archetype: 'THRESHOLD', structure: ct });
    const r = progressionStep(input([th('a', 6), th('b', 3)], { archetype: 'THRESHOLD', parameters: v23({ ...BASE, durationStepS: 90 }) }));
    expect(r).toMatchObject({ kind: 'step', variable: 'workS', from: 1200, to: 1290, structure: { ...ct, workS: 1290 } });
    expect(r.kind === 'step' && r.durationS).toBeUndefined();
  });
});
