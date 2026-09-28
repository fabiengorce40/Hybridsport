/**
 * Décisions produit du 2026-09-28 (surcouche `withProductDecisions`, simulation) :
 * D1 progression par pas minimal ; D3 LONG sur la dernière sortie longue ; D5 repli après une séance interrompue.
 * Le registre expert seul (sans surcouche) conserve le comportement antérieur (HOLD, refus après retour négatif).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { canonicalStringify, runSportSession } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { createRunningEngine, CURRENT_RUNNING_GOVERNANCE, PRODUCT_DECISIONS_RULESET_VERSION, RUNNING_CODES, withProductDecisions } from '../../src/index.js';
import type { RunningContext, RunningContextInput, RunningEngine } from '../../src/index.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { coreContext, ctxInput, runIntent } from '../fixtures.js';

const CORE_NOW = Date.parse('2026-09-28T08:00:00Z');
const daysAgo = (d: number) => new Date(CORE_NOW - d * 86_400_000).toISOString().replace('.000Z', 'Z');
type HistoryIn = NonNullable<RunningContextInput['sessionHistory']>[number];
const run = (id: string, d: number, o: Partial<HistoryIn> = {}): HistoryIn => ({
  sessionId: id, archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: daysAgo(d), realizedDurationS: 1800, completion: 'COMPLETED', unexpectedDifficulty: 'AS_EXPECTED', ...o,
});
const PROGRESSION = ['progressionBeyondHistory', 'longRunProgression'] as const;
const disc = (history: HistoryIn[], o: Partial<RunningContextInput> = {}): RunningContextInput => ({
  ...ctxInput({ capabilityRequests: [...PROGRESSION], exposures: [...new Set(history.map((h) => h.archetype))].map((archetype) => ({ archetype, lastAt: daysAgo(3), count: 3 })), ...o }),
  sessionHistory: history,
});
const decided = () => createRunningEngine({ governance: withProductDecisions(CURRENT_RUNNING_GOVERNANCE), simulation: true });
const expertOnly = () => createRunningEngine({ simulation: true });
function captured(engine: RunningEngine, d: RunningContextInput, archetypeId: string, availableTimeS = 5400): SportEngineInput<RunningContext> {
  let seen: SportEngineInput<RunningContext> | undefined;
  const spy = { ...engine, propose: (input: SportEngineInput<RunningContext>) => { seen = input; return engine.propose(input); } };
  runSportSession(spy, { intent: { ...runIntent(archetypeId), availableTimeS, targetDurationS: availableTimeS - 150 }, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: d }, coreContext('pd'));
  if (!seen) throw new Error('entrée non transmise');
  return seen;
}
const outcome = (d: RunningContextInput, archetypeId = 'running.easy', engine = decided(), availableTimeS = 5400) => engine.prescribe(captured(engine, d, archetypeId, availableTimeS));
const doseS = (o: ReturnType<typeof outcome>) => (o.status === 'selected' && o.selection.candidate.dose?.kind === 'duration' ? o.selection.candidate.dose.durationS : undefined);
const holdCause = (o: ReturnType<typeof outcome>) => o.reasons.find((r) => r.code === RUNNING_CODES.PROGRESSION_HOLD)?.params.cause;

describe('surcouche de décisions produit', () => {
  it('version de ruleset propre, provenance PRODUCT_DECISION, registre expert inchangé', () => {
    const g = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
    expect(g.rulesetVersion).toBe(PRODUCT_DECISIONS_RULESET_VERSION);
    const v23 = g.parameters.find((p) => p.parameterId === 'running.progression.magnitude');
    expect(v23).toMatchObject({ maturity: 'EXPERT_PROPOSED', provenanceClass: 'PRODUCT_DECISION', approvals: [] });
    expect(CURRENT_RUNNING_GOVERNANCE.parameters.find((p) => p.parameterId === 'running.progression.magnitude')?.value.status).toBe('unresolved');
    expect(g.g1Policies).toEqual(CURRENT_RUNNING_GOVERNANCE.g1Policies);
    expect(g.decisions).toEqual(CURRENT_RUNNING_GOVERNANCE.decisions);
  });

  it('PRODUCTION : la surcouche n’ouvre rien (socle non signé)', () => {
    const o = outcome(disc([run('a', 5), run('b', 3)], { mode: 'PRODUCTION' }), 'running.easy', createRunningEngine({ governance: withProductDecisions(CURRENT_RUNNING_GOVERNANCE) }));
    expect(o.status).toBe('no_valid');
  });
});

describe('D1 — progression par pas minimal', () => {
  it('2 séances consécutives tolérées à la dose ancrée ⇒ +1 min (une seule variable), tracé', () => {
    const o = outcome(disc([run('a', 6), run('b', 3)]));
    expect(doseS(o)).toBe(1860);
    expect(o.status === 'selected' && o.selection.candidate.dose).toMatchObject({ progression: { variable: 'durationS', from: 1800, to: 1860, parameterId: 'running.progression.magnitude' } });
    expect(o.reasons.find((r) => r.code === RUNNING_CODES.PROGRESSION_STEP_APPLIED)?.params).toEqual({ archetype: 'EASY', variable: 'durationS', from: 1800, to: 1860, parameterId: 'running.progression.magnitude' });
    // Valeur candidate V23 tracée dans la proposition ; capacité activée malgré l'absence d'approbation : tracée dans l'analyse.
    expect(o.reasons.filter((r) => r.code === RUNNING_CODES.CANDIDATE_VALUE_USED).map((r) => r.params.parameterId)).toContain('running.progression.magnitude');
    const engine = decided();
    const cap = engine.analyze(captured(engine, disc([run('a', 6), run('b', 3)]), 'running.easy')).capabilities.find((c) => c.capability === 'progressionBeyondHistory');
    expect(cap).toMatchObject({ enabled: true, candidateOverride: true });
    expect(cap?.reasons.map((r) => r.code)).toContain(RUNNING_CODES.CANDIDATE_OVERRIDE);
  });

  it('HOLD tracé : une seule séance, ressenti inconnu, plus dur que prévu, doses différentes', () => {
    expect(holdCause(outcome(disc([run('b', 3)])))).toBe('TOLERANCE_NOT_DEMONSTRATED');
    expect(holdCause(outcome(disc([run('a', 6, { unexpectedDifficulty: 'UNKNOWN' }), run('b', 3)])))).toBe('TOLERANCE_NOT_DEMONSTRATED');
    expect(holdCause(outcome(disc([run('a', 6), run('b', 3, { unexpectedDifficulty: 'HARDER' })])))).toBe('TOLERANCE_NOT_DEMONSTRATED');
    const differentDoses = outcome(disc([run('a', 6, { realizedDurationS: 1740 }), run('b', 3)]));
    expect(doseS(differentDoses)).toBe(1800);
    expect(holdCause(differentDoses)).toBe('TOLERANCE_NOT_DEMONSTRATED');
  });

  it('capacité non demandée, ou registre expert seul (V23 vide) ⇒ HOLD, jamais de hausse', () => {
    expect(holdCause(outcome(disc([run('a', 6), run('b', 3)], { capabilityRequests: [] })))).toBe('CAPABILITY_DISABLED');
    const expert = outcome(disc([run('a', 6), run('b', 3)]), 'running.easy', expertOnly());
    expect(doseS(expert)).toBe(1800);
    expect(holdCause(expert)).toBe('CAPABILITY_DISABLED');
  });

  it('le pas ne tient pas dans le temps disponible ⇒ HOLD (TIME_AVAILABLE), jamais une dose tronquée', () => {
    const o = outcome(disc([run('a', 6), run('b', 3)]), 'running.easy', decided(), 1830);
    expect(doseS(o)).toBe(1800);
    expect(holdCause(o)).toBe('TIME_AVAILABLE');
  });

  it('fractionné : +1 répétition ; seuil continu : +1 min de travail ; structure sinon inchangée', () => {
    const intervals = { warmupS: 900, reps: 4, workS: 360, recoveryS: 90, recoveryMode: 'jog' as const, cooldownS: 600 };
    const thr = (id: string, d: number, structure: HistoryIn['structure'], family: HistoryIn['structureFamily'] = 'INTERVALS') => run(id, d, { archetype: 'THRESHOLD', structureFamily: family, realizedDurationS: 3000, structure });
    // P-R4 : densité 3 / 7 jours (deux séances de seuil dans la fenêtre).
    const p4 = { population: { level: 'P_R4' as const, hybrid: false } };
    const o = outcome(disc([thr('t1', 6, intervals), thr('t2', 3, intervals)], p4), 'running.threshold');
    expect(o.status === 'selected' && o.selection.candidate.dose?.kind === 'structure' && o.selection.candidate.dose.structure).toEqual({ ...intervals, reps: 5 });
    const cont = { warmupS: 900, reps: 1, workS: 1200, cooldownS: 600 };
    const c = outcome(disc([thr('c1', 6, cont, 'CONTINUOUS'), thr('c2', 3, cont, 'CONTINUOUS')], p4), 'running.threshold');
    expect(c.status === 'selected' && c.selection.candidate.dose?.kind === 'structure' && c.selection.candidate.dose.structure).toEqual({ ...cont, workS: 1260 });
  });

  it('propriété : la dose proposée n’excède jamais la dernière dose réalisée de plus d’un pas', () => {
    fc.assert(fc.property(fc.array(fc.record({ d: fc.integer({ min: 2, max: 50 }), s: fc.integer({ min: 900, max: 3600 }), diff: fc.constantFrom('AS_EXPECTED', 'EASIER', 'HARDER', 'UNKNOWN') }), { minLength: 1, maxLength: 6 }), (xs) => {
      const history = xs.map((x, i) => run(`r${String(i)}`, x.d, { realizedDurationS: x.s, unexpectedDifficulty: x.diff as HistoryIn['unexpectedDifficulty'] }));
      const o = outcome(disc(history));
      const dose = doseS(o);
      if (dose === undefined) return true;
      const recentMax = Math.max(...history.map((h) => h.realizedDurationS));
      return dose <= recentMax + 60;
    }), { numRuns: 40, seed: 6_501 });
  });

  it('séance progressée acceptée, validée et retenue par le CORE ; déterministe', () => {
    const r = runSportSession(decided(), { intent: { ...runIntent('running.easy'), availableTimeS: 3600, targetDurationS: 3450 }, profile: PROFILE_GYM, state: STATE_FRESH, history: [], disciplineContext: disc([run('a', 6), run('b', 3)]) }, coreContext('pd-core'));
    expect(r.result.status).toBe('ok');
    expect(canonicalStringify(outcome(disc([run('a', 6), run('b', 3)])))).toBe(canonicalStringify(outcome(disc([run('b', 3), run('a', 6)]))));
  });
});

describe('D5 — séance interrompue', () => {
  it('repli sur la dernière dose réussie (jamais supérieure), tracé ; aucune hausse juste après', () => {
    const o = outcome(disc([run('a', 8), run('b', 6), run('p', 3, { completion: 'PARTIAL', realizedDurationS: 900 })]));
    expect(doseS(o)).toBe(1800);
    expect(o.reasons.find((r) => r.code === RUNNING_CODES.DOSE_ANCHOR_FALLBACK)?.params).toEqual({ archetype: 'EASY', sessionId: 'b', negativeSessionIds: ['p'] });
    expect(holdCause(o)).toBe('AFTER_NEGATIVE_RESPONSE');
  });

  it('registre expert seul : refus inchangé (LATER_NEGATIVE_RESPONSE)', () => {
    const o = outcome(disc([run('b', 6), run('p', 3, { completion: 'PARTIAL' })]), 'running.easy', expertOnly());
    expect(o.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE, params: { cause: 'LATER_NEGATIVE_RESPONSE' } });
  });
});

describe('D3 — sortie longue', () => {
  const long = (id: string, d: number, o: Partial<HistoryIn> = {}) => run(id, d, { archetype: 'LONG', realizedDurationS: 5400, ...o });

  it('dernière sortie longue réalisée, plafond EASY_LOW, comptée à forte demande (V32 sans marge) ; +1 min après 2 sorties tolérées', () => {
    const hold = outcome(disc([long('l1', 9)]), 'running.long', decided(), 7200);
    expect(doseS(hold)).toBe(5400);
    expect(hold.status === 'selected' && hold.selection.structure.segments[0]?.target).toMatchObject({ domain: 'easy_low', effort: { rpe: { min: 3, max: 3 } } });
    expect(hold.reasons.map((r) => r.code)).toContain(RUNNING_CODES.HIGH_DEMAND_DEFAULT_CONSERVATIVE);
    expect(doseS(outcome(disc([long('l1', 16), long('l2', 9)]), 'running.long', decided(), 7200))).toBe(5460);
  });

  it('gardes : P-R0 refusé ; P-R1 accepté ; densité et veille à forte demande appliquées ; reprise LONG ⇒ refus', () => {
    expect(outcome(disc([long('l1', 9)], { population: { level: 'P_R0', hybrid: false } }), 'running.long', decided(), 7200).status).toBe('no_valid');
    expect(outcome(disc([long('l1', 9)], { population: { level: 'P_R1', hybrid: false } }), 'running.long', decided(), 7200).status).toBe('selected');
    const yesterday = outcome(disc([long('l1', 1)]), 'running.long', decided(), 7200);
    expect(yesterday.reasons.find((r) => r.code === RUNNING_CODES.QUALITY_GUARD_FAILED)?.params.rule).toBe('V11_CONSECUTIVE');
    const ret = outcome(disc([long('l1', 9)], { returnState: { state: 'LONG', postReturnSessions: 1 }, recentLoad: { returnStartedAt: daysAgo(12), dimensions: [] } }), 'running.long', decided(), 7200);
    expect(ret.status).toBe('no_valid');
  });

  it('sans sortie longue réalisée : aucune dose (jamais déduite d’une course facile)', () => {
    const o = outcome(disc([run('e', 3, { realizedDurationS: 4000 })]), 'running.long', decided(), 7200);
    expect(o.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE, params: { archetype: 'LONG', cause: 'NO_REALIZED_SESSION' } });
  });
});
