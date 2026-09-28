/**
 * Gate Course — propriété adverse des cibles d'allure : quels que soient références, historique, capteurs et
 * archétype, une allure n'est une CIBLE que pour SEVERE / SHORT_INTERVAL, avec montre, capacité demandée et
 * une performance de 3 000 à 5 000 m ; le TEST et les autres archétypes ne sont jamais pilotés à l'allure.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { runSportSession } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { ARCHETYPE_INTENT_IDS, createRunningEngine, CURRENT_RUNNING_GOVERNANCE, withProductDecisions } from '../../src/index.js';
import type { RunningContext, RunningContextInput } from '../../src/index.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { coreContext, ctxInput, runIntent } from '../fixtures.js';

const CORE_NOW = Date.parse('2026-09-28T08:00:00Z');
const daysAgo = (d: number) => new Date(CORE_NOW - d * 86_400_000).toISOString().replace('.000Z', 'Z');
const engine = createRunningEngine({ governance: withProductDecisions(CURRENT_RUNNING_GOVERNANCE), simulation: true });
const ARCHS = ['EASY', 'LONG', 'THRESHOLD', 'SEVERE', 'SHORT_INTERVAL', 'HILLS', 'TEST'] as const;
const STRUCT = { warmupS: 600, reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog' as const, cooldownS: 300 };

describe('allure : jamais une cible hors règle (propriété)', () => {
  it('SEVERE / SHORT_INTERVAL seulement, montre, capacité, ancre 3–5 km ; TEST jamais à l’allure', () => {
    let paced = 0;
    let selected = 0;
    fc.assert(fc.property(
      fc.constantFrom(...ARCHS, 'SEVERE', 'SHORT_INTERVAL', 'SEVERE', 'SHORT_INTERVAL'),
      fc.array(fc.record({ type: fc.constantFrom('RACE_RESULT', 'TIME_TRIAL', 'VMA_TEST'), distanceM: fc.oneof(fc.constantFrom(2999, 3000, 4000, 5000, 5001, 10000), fc.integer({ min: 1000, max: 21097 })), paceS: fc.integer({ min: 180, max: 480 }), d: fc.integer({ min: -3, max: 200 }) }), { maxLength: 3 }),
      fc.boolean(), fc.boolean(), fc.constantFrom('P_R2', 'P_R3', 'P_R4'),
      (a, refs, wearable, requested, level) => {
        const history: NonNullable<RunningContextInput['sessionHistory']> = [
          { sessionId: 'm', archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: daysAgo(4), realizedDurationS: 1800, completion: 'COMPLETED', distanceM: 5000 },
          ...(a === 'EASY' || a === 'LONG' || a === 'TEST' ? [{ sessionId: 'x', archetype: a === 'TEST' ? 'EASY' as const : a, structureFamily: 'CONTINUOUS' as const, completedAt: daysAgo(9), realizedDurationS: 2400, completion: 'COMPLETED' as const }]
            : [{ sessionId: 'x', archetype: a, structureFamily: 'INTERVALS' as const, completedAt: daysAgo(9), realizedDurationS: 2400, completion: 'COMPLETED' as const, structure: a === 'SHORT_INTERVAL' ? { ...STRUCT, reps: 10, workS: 30, recoveryS: 30 } : STRUCT }]),
        ];
        const d: RunningContextInput = {
          ...ctxInput({ population: { level, hybrid: false }, goal: { type: 'FIVE_K' }, sensors: { wearable, heartRate: false }, terrain: { hills: true },
            capabilityRequests: requested ? ['progressionBeyondHistory', 'longRunProgression', 'paceTargets'] : ['progressionBeyondHistory', 'longRunProgression'],
            exposures: [{ archetype: a === 'TEST' ? 'EASY' : a, lastAt: daysAgo(9), count: 3 }] }),
          references: refs.map((r, i) => ({ referenceId: `r${String(i)}`, type: r.type, values: r.type === 'VMA_TEST' ? { speedMps: 1000 / r.paceS } : { distanceM: r.distanceM, durationS: (r.distanceM / 1000) * r.paceS }, date: daysAgo(r.d), provenance: { source: 'APP_RECORDED' as const }, confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL' as const, interruptionSince: 'NONE' as const } })),
          sessionHistory: history,
        };
        let seen: SportEngineInput<RunningContext> | undefined;
        const spy = { ...engine, propose: (input: SportEngineInput<RunningContext>) => { seen = input; return engine.propose(input); } };
        runSportSession(spy, { intent: { ...runIntent(ARCHETYPE_INTENT_IDS[a]), availableTimeS: 7200, targetDurationS: 7050 }, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: d }, coreContext('pace-prop'));
        if (!seen) return;
        const o = engine.prescribe(seen);
        if (o.status !== 'selected') return;
        selected++;
        const pacedSegs = o.selection.structure.segments.filter((s) => s.target.priority === 'pace');
        if (pacedSegs.length === 0) return;
        paced++;
        expect(['SEVERE', 'SHORT_INTERVAL']).toContain(a);
        expect(wearable && requested).toBe(true);
        const refId = pacedSegs[0]?.target.pace?.provenance?.sourceId;
        const ref = d.references?.find((r) => r.referenceId === refId);
        expect(ref?.type === 'RACE_RESULT' || ref?.type === 'TIME_TRIAL').toBe(true);
        expect(ref?.values.distanceM).toBeGreaterThanOrEqual(3000);
        expect(ref?.values.distanceM).toBeLessThanOrEqual(5000);
        expect(pacedSegs.every((s) => s.id === 'work')).toBe(true);
      },
    ), { numRuns: 400, seed: 9_2001 });
    // La propriété n'est pas vide : des séances sont retenues, dont certaines à l'allure.
    expect(selected).toBeGreaterThan(50);
    expect(paced).toBeGreaterThan(3);
  });
});
