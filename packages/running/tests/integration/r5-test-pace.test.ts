/**
 * Vague R5a — séance TEST (§Q, protocole `running.test.protocol` de la surcouche) et cibles d'allure gouvernées des
 * séances sévères (V18 ± V03). Frontières, refus explicites, acceptation par le CORE et déterminisme.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { canonicalStringify, runSportSession } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { createRunningEngine, CURRENT_RUNNING_GOVERNANCE, energyOf, registryIssues, RUNNING_CODES, withProductDecisions, zRealizedSession } from '../../src/index.js';
import type { RunningContext, RunningContextInput, RunningEngine } from '../../src/index.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { coreContext, ctxInput, runIntent } from '../fixtures.js';

const CORE_NOW = Date.parse('2026-09-28T08:00:00Z');
const daysAgo = (d: number) => new Date(CORE_NOW - d * 86_400_000).toISOString().replace('.000Z', 'Z');
type HistoryIn = NonNullable<RunningContextInput['sessionHistory']>[number];
type RefIn = NonNullable<RunningContextInput['references']>[number];
const run = (id: string, d: number, o: Partial<HistoryIn> = {}): HistoryIn => ({
  sessionId: id, archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: daysAgo(d), realizedDurationS: 1800, completion: 'COMPLETED', unexpectedDifficulty: 'AS_EXPECTED', ...o,
});
/** Course facile de 5 km en 30 min : allure observée 360 s/km. */
const measured = (id = 'm1', d = 4, o: Partial<HistoryIn> = {}) => run(id, d, { distanceM: 5000, ...o });
const perf = (o: { id?: string; type?: 'RACE_RESULT' | 'TIME_TRIAL'; distanceM?: number; durationS?: number; d?: number } = {}): RefIn => ({
  referenceId: o.id ?? 'r5', type: o.type ?? 'RACE_RESULT', values: { distanceM: o.distanceM ?? 5000, durationS: o.durationS ?? 1200 }, date: daysAgo(o.d ?? 5),
  provenance: { source: 'APP_RECORDED', protocol: 'official' }, confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL', interruptionSince: 'NONE' },
});
const disc = (history: HistoryIn[], o: Partial<RunningContextInput> = {}): RunningContextInput => ({
  ...ctxInput({ exposures: [...new Set(history.map((h) => h.archetype))].map((archetype) => ({ archetype, lastAt: daysAgo(3), count: 3 })), ...o }),
  sessionHistory: history,
});
const decided = () => createRunningEngine({ governance: withProductDecisions(CURRENT_RUNNING_GOVERNANCE), simulation: true });
const request = (d: RunningContextInput, archetypeId: string, availableTimeS: number): Parameters<typeof runSportSession>[1] => ({
  intent: { ...runIntent(archetypeId), availableTimeS, targetDurationS: availableTimeS - 150 }, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: d,
});
function captured(engine: RunningEngine, d: RunningContextInput, archetypeId: string, availableTimeS: number): SportEngineInput<RunningContext> {
  let seen: SportEngineInput<RunningContext> | undefined;
  const spy = { ...engine, propose: (input: SportEngineInput<RunningContext>) => { seen = input; return engine.propose(input); } };
  runSportSession(spy, request(d, archetypeId, availableTimeS), coreContext('r5'));
  if (!seen) throw new Error('entrée non transmise');
  return seen;
}
const outcome = (d: RunningContextInput, archetypeId = 'running.test', engine = decided(), availableTimeS = 5400) => engine.prescribe(captured(engine, d, archetypeId, availableTimeS));
const code = (o: ReturnType<typeof outcome>, c: string) => o.reasons.find((r) => r.code === c)?.params;
const testRefusal = (o: ReturnType<typeof outcome>) => code(o, RUNNING_CODES.TEST_REFUSED)?.cause;
/** Règle de garde (le seuil génère aussi un candidat continu, refusé en P-R2 par §K : on retient l'autre règle). */
const guardRule = (o: ReturnType<typeof outcome>) => {
  const rules = o.reasons.filter((r) => r.code === RUNNING_CODES.QUALITY_GUARD_FAILED).map((r) => r.params.rule);
  return rules.find((r) => r !== 'K_CONTINUOUS_LEVEL') ?? rules[0];
};

describe('contrats R5a', () => {
  it('distance réalisée : positive et finie, facultative', () => {
    const base = { ...run('a', 3), completedAt: daysAgo(3) };
    expect(zRealizedSession.safeParse({ ...base, distanceM: 5000 }).success).toBe(true);
    expect(zRealizedSession.safeParse(base).success).toBe(true);
    for (const distanceM of [0, -1, Number.POSITIVE_INFINITY, Number.NaN]) expect(zRealizedSession.safeParse({ ...base, distanceM }).success).toBe(false);
  });

  it('surcouche : protocole TEST ajouté (candidat, PRODUCT_DECISION, sans approbation), registre intègre, registre expert inchangé', () => {
    const g = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
    expect(registryIssues(g.parameters)).toEqual([]);
    expect(g.parameters.find((p) => p.parameterId === 'running.test.protocol')).toMatchObject({ maturity: 'EXPERT_PROPOSED', provenanceClass: 'PRODUCT_DECISION', approvals: [], provisional: true });
    expect(CURRENT_RUNNING_GOVERNANCE.parameters.some((p) => p.parameterId === 'running.test.protocol')).toBe(false);
    expect(withProductDecisions(g).parameters.filter((p) => p.parameterId === 'running.test.protocol')).toHaveLength(1);
  });

  it('PRODUCTION : TEST refusé (socle non signé, protocole candidat)', () => {
    const o = outcome(disc([measured()], { mode: 'PRODUCTION' }), 'running.test', createRunningEngine({ governance: withProductDecisions(CURRENT_RUNNING_GOVERNANCE) }));
    expect(o.status).toBe('no_valid');
  });
});

describe('TEST (§Q) — protocole du registre, effort maximal, allure observée comme seule borne', () => {
  it('objectif 10K : 10 km ; échauffement et retour au calme du registre ; RPE 9–10 ; aucune allure cible', () => {
    const o = outcome(disc([measured()]));
    expect(o.status).toBe('selected');
    if (o.status !== 'selected') return;
    expect(o.selection.structure.segments).toEqual([
      { kind: 'warmup', id: 'warmup', dose: { durationS: 600 }, target: { domain: 'easy_low', effort: { rpe: { min: 3, max: 3 } }, priority: 'effort' } },
      { kind: 'steady', id: 'test', dose: { distanceM: 10000 }, target: { domain: 'severe', effort: { rpe: { min: 9, max: 10 } }, priority: 'effort', pace: { secPerKm: { min: 360, max: 360 }, provenance: { source: 'observed_athlete_range', sourceId: 'running.observedPace.recent' } } } },
      { kind: 'cooldown', id: 'cooldown', dose: { durationS: 300 }, target: { domain: 'easy_low', effort: { rpe: { min: 3, max: 3 } }, priority: 'effort' } },
    ]);
    expect(o.selection.structure.estimate.totalS).toEqual({ min: 4500, max: 4500 });
    expect(o.selection.candidate.intensity).toEqual({ domain: 'TEST', rpe: { min: 9, max: 10 }, easyCeiling: 3, source: { parameterId: 'running.target.rpeByDomain' } });
    expect(o.selection.candidate.dose).toEqual({ kind: 'test', distanceM: 10000, warmupS: 600, cooldownS: 300, observedPace: { min: 360, max: 360 }, source: { parameterId: 'running.test.protocol', observedSessionIds: ['m1'] } });
    expect(o.selection.candidate.references).toEqual([]);
    expect(code(o, RUNNING_CODES.TEST_PROTOCOL_APPLIED)).toEqual({ distanceM: 10000, parameterId: 'running.test.protocol', observedSessionIds: ['m1'] });
    // Effort par nature : aucune précision « réduite ».
    expect(o.reasons.map((r) => r.code)).not.toContain(RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED);
  });

  it.each([['FIVE_K', 5000], ['GENERAL_RUNNING', 5000], ['HALF_MARATHON', 5000], ['TEN_K', 10000]] as const)('objectif %s ⇒ %i m', (goal, distanceM) => {
    const o = outcome(disc([measured()], { goal: { type: goal } }));
    expect(o.status === 'selected' && o.selection.candidate.dose?.kind === 'test' && o.selection.candidate.dose.distanceM).toBe(distanceM);
  });

  it('plage observée : la plus rapide et la plus lente des séances continues terminées, récentes, avec distance', () => {
    const o = outcome(disc([measured('a', 10), measured('b', 6, { realizedDurationS: 1500 }), measured('c', 3, { realizedDurationS: 2100 })]));
    expect(o.status === 'selected' && o.selection.candidate.dose?.kind === 'test' && o.selection.candidate.dose.observedPace).toEqual({ min: 300, max: 420 });
  });

  it('frontières de l’allure observée : 56 jours ⇒ retenue ; 57 jours, futur, PARTIAL, fractionné, sans distance ⇒ ignorées', () => {
    expect(outcome(disc([measured('a', 56)])).status).toBe('selected');
    for (const h of [measured('a', 57), measured('a', -1), measured('a', 3, { completion: 'PARTIAL' }), measured('a', 3, { structureFamily: 'INTERVALS', archetype: 'SEVERE', structure: { reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog' } }), run('a', 3)]) {
      expect(testRefusal(outcome(disc([h])))).toBe('OBSERVED_PACE_UNAVAILABLE');
    }
  });

  it('jamais sans allure observée ; jamais avec le registre expert seul (protocole absent)', () => {
    expect(testRefusal(outcome(disc([run('e', 3)])))).toBe('OBSERVED_PACE_UNAVAILABLE');
    const expert = outcome(disc([measured()]), 'running.test', createRunningEngine({ simulation: true }));
    expect(expert.status).toBe('no_valid');
    expect(testRefusal(expert)).toBe('PARAMETER_UNRESOLVED');
  });

  it('§Q : P-R1 accepté, P-R0 jamais ; RETURN non levé (SHORT compris) refusé', () => {
    expect(outcome(disc([measured()], { population: { level: 'P_R1', hybrid: false } })).status).toBe('selected');
    expect(outcome(disc([measured()], { population: { level: 'P_R0', hybrid: false } })).status).toBe('no_valid');
    const short = outcome(disc([measured()], { returnState: { state: 'SHORT', postReturnSessions: 1 }, recentLoad: { returnStartedAt: daysAgo(10), dimensions: [] } }));
    expect(guardRule(short)).toBe('X_RETURN_NOT_LIFTED');
    const lifted = outcome(disc([measured('a', 8), measured('b', 4)], { returnState: { state: 'SHORT', postReturnSessions: 2 }, recentLoad: { returnStartedAt: daysAgo(10), dimensions: [] } }));
    expect(lifted.status).toBe('selected');
  });

  it('§Q / §S : compte comme HIGH_DEMAND (V11 la veille, V10 densité) dans les deux sens', () => {
    const hd = run('thr', 1, { archetype: 'THRESHOLD', structureFamily: 'INTERVALS', realizedDurationS: 2400, structure: { reps: 4, workS: 300, recoveryS: 60, recoveryMode: 'jog' } });
    expect(guardRule(outcome(disc([measured(), hd])))).toBe('V11_CONSECUTIVE');
    const testDone = run('t', 1, { archetype: 'TEST', distanceM: 5000, realizedDurationS: 1300 });
    const thr = run('thr', 8, { archetype: 'THRESHOLD', structureFamily: 'INTERVALS', realizedDurationS: 2400, structure: { reps: 4, workS: 300, recoveryS: 60, recoveryMode: 'jog' } });
    expect(guardRule(outcome(disc([thr, testDone]), 'running.threshold'))).toBe('V11_CONSECUTIVE');
    expect(guardRule(outcome(disc([measured(), run('t2', 3, { archetype: 'TEST', distanceM: 5000, realizedDurationS: 1300 })], { population: { level: 'P_R1', hybrid: false } })))).toBe('V10_DENSITY');
  });

  it('temps disponible : estimation maximale 4 500 s ⇒ 4 500 accepté, 4 499 refusé (jamais un test tronqué)', () => {
    expect(outcome(disc([measured()]), 'running.test', decided(), 4500).status).toBe('selected');
    const o = outcome(disc([measured()]), 'running.test', decided(), 4499);
    expect(code(o, RUNNING_CODES.TIME_EXCEEDED)).toEqual({ archetype: 'TEST', availableTimeS: 4499, estimatedMaxS: 4500 });
  });

  it('accepté, validé et retenu par le CORE ; empreinte : part de test = travail estimé maximal / total', () => {
    const r = runSportSession(decided(), request(disc([measured()]), 'running.test', 5400), coreContext('r5-core'));
    expect(r.result.status).toBe('ok');
    const o = outcome(disc([measured()]));
    if (o.status !== 'selected') throw new Error('attendu : sélection');
    const e = energyOf(o.selection.candidate, o.selection.structure.estimate);
    expect(e.high).toBeCloseTo(3600 / 4500, 12);
    expect(e.low).toBeCloseTo(900 / 4500, 12);
    expect(e.moderate).toBe(0);
  });

  it('le TEST ne dépend jamais de l’allure observée pour sa distance ni sa cible (propriété)', () => {
    const shape = (o: ReturnType<typeof outcome>) => (o.status === 'selected' ? o.selection.structure.segments.map((s) => ('dose' in s ? [s.dose, s.target.effort, s.target.priority] : [])) : undefined);
    const ref = canonicalStringify(shape(outcome(disc([measured()]))));
    fc.assert(fc.property(fc.integer({ min: 1200, max: 2700 }), (realizedDurationS) => canonicalStringify(shape(outcome(disc([measured('m1', 4, { realizedDurationS })]), 'running.test', decided(), 7200))) === ref), { numRuns: 20, seed: 7_501 });
  });

  it('déterminisme : même entrée ⇒ même sortie ; ordre de l’historique sans effet', () => {
    const h = [measured('a', 10), measured('b', 6, { realizedDurationS: 1500 }), measured('c', 3, { realizedDurationS: 2100 })];
    const a = canonicalStringify(outcome(disc(h)));
    expect(canonicalStringify(outcome(disc(h)))).toBe(a);
    expect(canonicalStringify(outcome(disc([...h].reverse())))).toBe(a);
  });
});

describe('allure gouvernée des séances sévères (V18 ± V03)', () => {
  const SEVERE = { warmupS: 600, reps: 4, workS: 240, recoveryS: 180, recoveryMode: 'jog' as const, cooldownS: 300 };
  const sev = (id = 's1', d = 5, archetype: 'SEVERE' | 'SHORT_INTERVAL' | 'HILLS' = 'SEVERE') =>
    run(id, d, { archetype, structureFamily: 'INTERVALS', realizedDurationS: 2340, structure: archetype === 'SHORT_INTERVAL' ? { warmupS: 600, reps: 10, workS: 30, recoveryS: 30, recoveryMode: 'jog', cooldownS: 300 } : SEVERE });
  const paced = (refs: RefIn[], o: Partial<RunningContextInput> = {}, archetype: 'SEVERE' | 'SHORT_INTERVAL' | 'HILLS' = 'SEVERE') => outcome(disc([sev('s1', 5, archetype)], { references: refs, terrain: { hills: true }, ...o }), `running.${archetype.toLowerCase()}`);
  const paceOf = (o: ReturnType<typeof outcome>) => (o.status === 'selected' && o.selection.candidate.intensity && 'pace' in o.selection.candidate.intensity ? o.selection.candidate.intensity.pace : undefined);
  const reduced = (o: ReturnType<typeof outcome>) => code(o, RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED)?.cause;

  it('5 km en 20 min (240 s/km), confiance HIGH ⇒ ±3 % ; priorité à l’allure, effort secondaire ; référence tracée', () => {
    const o = paced([perf()]);
    expect(o.status).toBe('selected');
    if (o.status !== 'selected') return;
    expect(o.selection.candidate.precision).toBe('PACE_RANGE');
    expect(paceOf(o)).toEqual({ secPerKm: { min: 240 * 0.97, max: 240 * 1.03 }, referenceId: 'r5', parameterId: 'running.severe.paceAnchor' });
    expect(o.selection.candidate.references).toEqual(['r5']);
    const work = o.selection.structure.segments.find((s) => s.id === 'work');
    expect(work?.target).toEqual({ domain: 'severe', pace: { secPerKm: { min: 240 * 0.97, max: 240 * 1.03 }, provenance: { source: 'reference_derived', sourceId: 'r5' } }, effort: { rpe: { min: 7, max: 8 } }, priority: 'pace' });
    // Échauffement, récupération et retour au calme : jamais d'allure.
    expect(o.selection.structure.segments.filter((s) => s.id !== 'work').every((s) => !('pace' in s.target))).toBe(true);
    expect(code(o, RUNNING_CODES.PACE_TARGET_APPLIED)).toEqual({ archetype: 'SEVERE', referenceId: 'r5', confidence: 'HIGH', parameterId: 'running.severe.paceAnchor' });
    expect(o.selection.parametersUsed.map((p) => p.parameterId)).toEqual(expect.arrayContaining(['running.severe.paceAnchor', 'running.target.paceRangeWidthByConfidence']));
    expect(o.reasons.map((r) => r.code)).not.toContain(RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED);
  });

  it('confiance MEDIUM (référence vieillissante) ⇒ ±6 % ; LOW (périmée) ⇒ effort seul', () => {
    expect(paceOf(paced([perf({ d: 70 })]))?.secPerKm).toEqual({ min: 240 * 0.94, max: 240 * 1.06 });
    const stale = paced([perf({ d: 120 })]);
    expect(paceOf(stale)).toBeUndefined();
    expect(reduced(stale)).toContain('REFERENCE_CONFIDENCE_INSUFFICIENT');
  });

  it('frontières de l’ancre : 3 000 et 5 000 m retenus ; 2 999, 5 001 et 10 000 m refusés', () => {
    expect(paceOf(paced([perf({ distanceM: 3000, durationS: 690 })]))?.secPerKm).toEqual({ min: 230 * 0.97, max: 230 * 1.03 });
    expect(paceOf(paced([perf({ distanceM: 5000 })]))).toBeDefined();
    for (const distanceM of [2999, 5001, 10000]) {
      const o = paced([perf({ distanceM, durationS: distanceM * 0.24 })]);
      expect(paceOf(o)).toBeUndefined();
      expect(reduced(o)).toContain('ANCHOR_REFERENCE_MISSING');
    }
  });

  it('contre-la-montre de 5 km (TEST enregistré) : ancre valide', () => {
    expect(paceOf(paced([perf({ id: 'tt', type: 'TIME_TRIAL' })]))?.referenceId).toBe('tt');
  });

  it('deux performances discordantes ⇒ confiance LOW (conflit) ⇒ effort seul, jamais une moyenne', () => {
    const o = paced([perf({ id: 'a' }), perf({ id: 'b', durationS: 1260 })]);
    expect(paceOf(o)).toBeUndefined();
    expect(reduced(o)).toContain('REFERENCE_CONFIDENCE_INSUFFICIENT');
  });

  it('sans montre, ou capacité non demandée ⇒ effort seul avec la cause', () => {
    const noWatch = paced([perf()], { sensors: { wearable: false, heartRate: false } });
    expect(paceOf(noWatch)).toBeUndefined();
    expect(reduced(noWatch)).toContain('NO_WEARABLE');
    const notRequested = paced([perf()], { capabilityRequests: ['progressionBeyondHistory'] });
    expect(paceOf(notRequested)).toBeUndefined();
    expect(reduced(notRequested)).toContain('PACE_TARGETS_DISABLED');
  });

  it('SHORT_INTERVAL : même ancre ; HILLS et THRESHOLD : jamais d’allure', () => {
    expect(paceOf(paced([perf()], {}, 'SHORT_INTERVAL'))?.referenceId).toBe('r5');
    const hills = paced([perf()], {}, 'HILLS');
    expect(hills.status).toBe('selected');
    expect(paceOf(hills)).toBeUndefined();
    const thr = outcome(disc([run('t', 5, { archetype: 'THRESHOLD', structureFamily: 'INTERVALS', realizedDurationS: 2400, structure: { reps: 4, workS: 300, recoveryS: 60, recoveryMode: 'jog' } })], { references: [perf()] }), 'running.threshold');
    expect(thr.status).toBe('selected');
    expect(paceOf(thr)).toBeUndefined();
  });

  it('séance à l’allure acceptée, validée et retenue par le CORE', () => {
    const r = runSportSession(decided(), request(disc([sev()], { references: [perf()] }), 'running.severe', 5400), coreContext('r5-pace'));
    expect(r.result.status).toBe('ok');
  });

  it('déterminisme : ordre des références sans effet', () => {
    const refs = [perf({ id: 'a', d: 20 }), perf({ id: 'b', distanceM: 3000, durationS: 690, d: 10 })];
    const a = canonicalStringify(paced(refs));
    expect(canonicalStringify(paced([...refs].reverse()))).toBe(a);
  });
});
