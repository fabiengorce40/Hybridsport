/**
 * Fixtures des tests Cross-training C1. Toute valeur ici est une DONNÉE DE TEST, jamais lue par le code de
 * production. Les gouvernances « valorisées » servent à prouver qu'AUCUNE valeur injectée ne rend une séance
 * générable en C1 : elles ne représentent aucun état réel ni aucune décision.
 */
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import type { runSportSession } from '@hybridsport/engine';
import { CT_DECISIONS, CT_G1_POLICIES, CT_TECHNICAL_DEPENDENCIES, CURRENT_CT_GOVERNANCE, archetypeIdOf, parseCrossTrainingContext } from '../src/index.js';
import type { CrossTrainingContext, CrossTrainingContextInput, CtGovernance, CtParameter, CtStimulus } from '../src/index.js';
import { coreContext } from '../../engine/tests/harness/context.js';
import { PROFILE_GYM, STATE_FRESH } from '../../engine/tests/harness/requests.js';

export const ALL_CT_CAPABILITIES = [
  'ctReplayHold', 'ctCalibratedDose', 'ctProgression', 'ctFirstExposure', 'ctLoadedMovements',
  'ctTechnicalMovements', 'ctIntensityTargets', 'ctBenchmarks', 'ctWeeklyComposition', 'ctHybridPlanning',
] as const;

export function ctxInput(o: Partial<CrossTrainingContextInput> = {}): CrossTrainingContextInput {
  return {
    population: { level: 'intermediate', hybrid: false },
    goal: { type: 'GENERAL_FITNESS' },
    returnState: { state: 'NONE' },
    declaredSkills: [],
    sessionHistory: [],
    benchmarks: [],
    mode: 'CANDIDATE',
    capabilityRequests: [...ALL_CT_CAPABILITIES],
    ...o,
  };
}

export function ctx(o: Partial<CrossTrainingContextInput> = {}): CrossTrainingContext {
  const r = parseCrossTrainingContext(ctxInput(o));
  if (!r.ok) throw new Error(JSON.stringify(r.reasons));
  return r.context;
}

/** Séance réalisée de test (valeurs illustratives, jamais une dose). */
export function realized(o: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sessionId: 's1', completedAt: '2026-09-20T08:00:00Z', stimulus: 'mixed_modal_medium',
    prescription: { format: 'amrap', durationS: 600, items: [{ exerciseId: 'ex.air_squat', quantity: { kind: 'reps', value: 15 } }] },
    result: { kind: 'rounds_reps', rounds: 5, reps: 3 },
    ...o,
  };
}

// technical-constant: valeur de TEST uniquement (jamais lue par le code de production)
const TEST_ONLY_VALUE = { testOnly: true };

/** Paramètre avec une valeur candidate de test, maturité EXPERT_PROPOSED (aucune approbation). */
export function withCandidate(p: CtParameter, value: unknown = TEST_ONLY_VALUE): CtParameter {
  return { ...p, value: { status: 'candidate', value }, maturity: 'EXPERT_PROPOSED', evidenceStatus: 'DECISION' };
}

/** Paramètre porté jusqu'à PRODUCTION_ELIGIBLE avec une approbation de TEST tracée. */
export function productionEligible(p: CtParameter, value: unknown = TEST_ONLY_VALUE): CtParameter {
  return { ...withCandidate(p, value), maturity: 'PRODUCTION_ELIGIBLE', approvals: [{ state: 'PRODUCTION_ELIGIBLE', role: 'TEST', reference: 'TEST-ONLY' }] };
}

/** Gouvernance SIMULÉE où tout est décidé, signé, satisfait, verrouillé et éligible (mécanismes seulement). */
export function fullyValuedGovernance(): CtGovernance {
  return {
    ...CURRENT_CT_GOVERNANCE,
    rulesetLocked: true,
    decisions: Object.fromEntries(CT_DECISIONS.map((d) => [d, 'APPROVED'])) as CtGovernance['decisions'],
    g1Policies: Object.fromEntries(CT_G1_POLICIES.map((g) => [g, 'SIGNED'])) as CtGovernance['g1Policies'],
    technical: Object.fromEntries(CT_TECHNICAL_DEPENDENCIES.map((t) => [t, 'SATISFIED'])) as CtGovernance['technical'],
    parameters: CURRENT_CT_GOVERNANCE.parameters.map((p) => productionEligible(p)),
  };
}

export function withParameter(g: CtGovernance, id: string, f: (p: CtParameter) => CtParameter): CtGovernance {
  return { ...g, parameters: g.parameters.map((p) => (p.parameterId === id ? f(p) : p)) };
}

export function ctIntent(stimulus: CtStimulus | string) {
  const archetypeId = stimulus.includes('.') ? stimulus : archetypeIdOf(stimulus as CtStimulus);
  return {
    id: 'intent.ct.c1', discipline: 'crosstraining' as const, archetypeId, stimulus: 'stim.crosstraining.metcon', objective: 'objective.crosstraining.general',
    priority: 'standard' as const, phase: 'phase.crosstraining.base', availableTimeS: 3600, targetDurationS: 2700, repetitionIntents: [], plannerNotes: [],
  };
}

export function ctRequest(disciplineContext: unknown, stimulus: CtStimulus | string = 'mixed_modal_medium'): Parameters<typeof runSportSession>[1] {
  return { intent: ctIntent(stimulus), profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext };
}

export { coreContext };
