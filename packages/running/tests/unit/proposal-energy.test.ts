/**
 * Gate Course (mutation G3) — correspondance candidat → proposition CORE : répartition E5 par parts de temps,
 * format, marqueurs de prescription, raisons, et refus d'un candidat sans dose.
 */
import { describe, expect, it } from 'vitest';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { runSportSession } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { createRunningEngine, CURRENT_RUNNING_GOVERNANCE, energyOf, toCoreProposal, withProductDecisions } from '../../src/index.js';
import type { RunningContext, RunningContextInput, Wave2Selection } from '../../src/index.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { coreContext, ctxInput, runIntent } from '../fixtures.js';

type Cand = Wave2Selection['candidate'];
const cand = (o: Record<string, unknown>): Cand => o as unknown as Cand;
const S = { warmupS: 600, reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog' as const, cooldownS: 300 };

describe('énergie E5 (parts de temps)', () => {
  it('sévère fractionné : high = travail / total ; low = le reste (échauffement, 3 récupérations, retour au calme)', () => {
    const e = energyOf(cand({ dose: { kind: 'structure', structure: S, workS: 960 }, intensity: { domain: 'SEVERE' } }));
    const total = 600 + 300 + 3 * 120 + 960;
    expect(e.high).toBeCloseTo(960 / total, 12);
    expect(e.low).toBeCloseTo(1 - 960 / total, 12);
    expect(e.moderate).toBe(0);
  });

  it('seuil : moderate = part de travail ; continu (1 répétition) : aucune récupération comptée', () => {
    const cont = { warmupS: 600, reps: 1, workS: 1200, cooldownS: 300 };
    const e = energyOf(cand({ dose: { kind: 'structure', structure: cont, workS: 1200 }, intensity: { domain: 'THRESHOLD_LIKE' } }));
    expect(e.moderate).toBeCloseTo(1200 / 2100, 12);
    expect(e.low).toBeCloseTo(900 / 2100, 12);
    expect(e.high).toBe(0);
  });

  it('course continue, EASY_LOW ou sans dose : tout en low', () => {
    expect(energyOf(cand({ dose: { kind: 'duration', durationS: 1800 }, intensity: { domain: 'EASY_LOW' } }))).toEqual({ low: 1, moderate: 0, high: 0 });
    expect(energyOf(cand({ dose: { kind: 'structure', structure: S, workS: 960 }, intensity: { domain: 'EASY_LOW' } }))).toEqual({ low: 1, moderate: 0, high: 0 });
    expect(energyOf(cand({}))).toEqual({ low: 1, moderate: 0, high: 0 });
  });

  it('TEST : part de travail = maximum estimé du CORE ; sans estimation : tout en high', () => {
    const test = cand({ dose: { kind: 'test', distanceM: 5000 }, intensity: { domain: 'TEST' } });
    expect(energyOf(test)).toEqual({ low: 0, moderate: 0, high: 1 });
    const e = energyOf(test, { method: 'core.run_structure.pace_bounds', methodVersion: 1, unit: 's', workS: { min: 1500, max: 1800 }, totalS: { min: 2400, max: 2700 } });
    expect(e.high).toBeCloseTo(1800 / 2700, 12);
    expect(e.low).toBeCloseTo(900 / 2700, 12);
  });
});

describe('proposition CORE', () => {
  const engine = createRunningEngine({ governance: withProductDecisions(CURRENT_RUNNING_GOVERNANCE), simulation: true });
  const NOW = Date.parse('2026-09-28T08:00:00Z');
  const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString().replace('.000Z', 'Z');
  function input(d: RunningContextInput, archetypeId: string): SportEngineInput<RunningContext> {
    let seen: SportEngineInput<RunningContext> | undefined;
    const spy = { ...engine, propose: (i: SportEngineInput<RunningContext>) => { seen = i; return engine.propose(i); } };
    runSportSession(spy, { intent: { ...runIntent(archetypeId), availableTimeS: 7200, targetDurationS: 7050 }, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: d }, coreContext('prop'));
    if (!seen) throw new Error('entrée non transmise');
    return seen;
  }
  const hist = (o: Record<string, unknown>) => ({ sessionId: 'h', structureFamily: 'CONTINUOUS', completedAt: daysAgo(5), realizedDurationS: 1800, completion: 'COMPLETED', ...o }) as NonNullable<RunningContextInput['sessionHistory']>[number];
  const disc = (h: ReturnType<typeof hist>[]): RunningContextInput => ({ ...ctxInput({ population: { level: 'P_R3', hybrid: false }, exposures: h.map((x) => ({ archetype: x.archetype, lastAt: daysAgo(5), count: 3 })) }), sessionHistory: h });
  const propose = (d: RunningContextInput, a: string) => {
    const i = input(d, a);
    const o = engine.prescribe(i);
    if (o.status !== 'selected') throw new Error('attendu : sélection');
    return { i, o, p: toCoreProposal(i, o.selection, { id: engine.id, version: engine.version }) };
  };

  it('fractionné ⇒ format intervals, marqueurs travail et répétitions ; continu ⇒ continuous', () => {
    const sev = propose(disc([hist({ archetype: 'SEVERE', structureFamily: 'INTERVALS', realizedDurationS: 2220, structure: S })]), 'running.severe').p.fingerprintInputs as { format: string; prescriptionMarkers: Record<string, number>; volumeByItem: Record<string, number> };
    expect(sev.format).toBe('intervals');
    expect(sev.prescriptionMarkers).toEqual({ 'SEVERE.workS': 960, 'SEVERE.reps': 4 });
    const thr = propose(disc([hist({ archetype: 'THRESHOLD', realizedDurationS: 2100, structure: { warmupS: 600, reps: 1, workS: 1200, cooldownS: 300 } })]), 'running.threshold').p.fingerprintInputs as { format: string; prescriptionMarkers: Record<string, number> };
    expect(thr.format).toBe('continuous');
    expect(thr.prescriptionMarkers).toEqual({ 'THRESHOLD.workS': 1200, 'THRESHOLD.reps': 1 });
  });

  it('TEST ⇒ marqueur de distance, volume = distance', () => {
    const t = propose(disc([hist({ archetype: 'EASY', distanceM: 5000 })]), 'running.test').p.fingerprintInputs as { format: string; prescriptionMarkers: Record<string, number>; volumeByItem: Record<string, number> };
    expect(t.format).toBe('continuous');
    expect(t.prescriptionMarkers).toEqual({ 'TEST.distanceM': 10000 });
    expect(Object.values(t.volumeByItem)).toEqual([10000]);
  });

  it('raisons : références de règle conservées ; candidat sans dose ⇒ erreur de programmation explicite', () => {
    const { i, o, p } = propose(disc([hist({ archetype: 'EASY' })]), 'running.easy');
    expect(p.reasons.map((r) => r.ruleRefs)).toEqual(o.selection.candidate.reasons.filter((r, k, all) => all.findIndex((x) => JSON.stringify([x.code, x.params]) === JSON.stringify([r.code, r.params])) === k).map((r) => [...r.ruleRefs]));
    const noDose = { ...o.selection, candidate: { ...o.selection.candidate, dose: undefined } } as unknown as Wave2Selection;
    expect(() => toCoreProposal(i, noDose, { id: engine.id, version: engine.version })).toThrow(`candidat retenu sans dose : ${o.selection.candidate.candidateId}`);
  });

  it('gouvernance invalide : toutes les anomalies listées, séparées par « ; »', () => {
    const broken = { ...CURRENT_RUNNING_GOVERNANCE, rulesetVersion: 'autre', parameters: [...CURRENT_RUNNING_GOVERNANCE.parameters, CURRENT_RUNNING_GOVERNANCE.parameters[0]!] };
    expect(() => createRunningEngine({ governance: broken })).toThrow(/Gouvernance Running invalide : .+ ; .+/);
  });
});
