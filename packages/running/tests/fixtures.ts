/**
 * Fixtures des tests Running (vague 1). Les valeurs ici sont des DONNÉES DE TEST : elles ne sont jamais
 * lues par le code de production. La gouvernance « entièrement approuvée » est construite UNIQUEMENT par
 * des transitions de maturité légitimes, pour éprouver les mécanismes — elle ne représente aucun état réel.
 */
import { asISODateTime } from '@hybridsport/domain';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import type { runSportSession } from '@hybridsport/engine';
import {
  APPROVAL_PATH, APPROVER_ROLE, CURRENT_RUNNING_GOVERNANCE, EXPERT_DECISIONS, G1_POLICIES, parseRunningContext, transitionMaturity,
} from '../src/index.js';
import type { RunningContext, RunningContextInput, RunningGovernance, RunningParameter, RunningReference } from '../src/index.js';
import { coreContext } from '../../engine/tests/harness/context.js';
import { PROFILE_GYM, STATE_FRESH } from '../../engine/tests/harness/requests.js';

export const NOW = asISODateTime('2026-10-05T08:00:00Z');
export const ALL_CAPABILITIES = ['noviceEntry', 'longReturn', 'progressionBeyondHistory', 'longRunProgression', 'firstThresholdExposure', 'firstSevereExposure', 'marathon', 'performanceExtrapolation', 'taper', 'paceTargets', 'hybridPlanning'] as const;

export function ctxInput(o: Partial<RunningContextInput> = {}): RunningContextInput {
  return {
    population: { level: 'P_R2', hybrid: false },
    goal: { type: 'TEN_K' },
    returnState: { state: 'NONE', postReturnSessions: 0 },
    references: [],
    exposures: [],
    sensors: { wearable: true, heartRate: false },
    mode: 'CANDIDATE',
    capabilityRequests: [...ALL_CAPABILITIES],
    ...o,
  };
}

export function ctx(o: Partial<RunningContextInput> = {}): RunningContext {
  const r = parseRunningContext(ctxInput(o));
  if (!r.ok) throw new Error(JSON.stringify(r.reasons));
  return r.context;
}

/** Référence de test (valeurs illustratives). */
export function ref(o: Partial<RunningReference> & { referenceId: string }): RunningReference {
  return {
    type: 'RACE_RESULT',
    values: { distanceM: 10000, durationS: 3000 },
    date: asISODateTime('2026-09-20T08:00:00Z'),
    provenance: { source: 'APP_RECORDED', protocol: 'official' },
    confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL', interruptionSince: 'NONE' },
    ...o,
  };
}

// technical-constant: valeur de TEST uniquement (jamais lue par le code de production)
const TEST_ONLY_VALUE = { testOnly: true };

/** Fait passer un paramètre jusqu'à PRODUCTION_ELIGIBLE par les transitions légitimes de son chemin. */
export function approveThroughPath(p: RunningParameter): RunningParameter {
  let cur = p;
  const step = (to: RunningParameter['maturity'], value?: unknown) => {
    const r = transitionMaturity(cur, to, { role: APPROVER_ROLE[to], reference: `TEST-${to}` }, { rulesetLocked: true, ...(value !== undefined ? { value } : {}) });
    if (!r.ok) throw new Error(`${p.parameterId} → ${to} : ${String(r.reason.params.cause)}`);
    cur = r.parameter;
  };
  if (cur.maturity === 'UNRESOLVED') step('EXPERT_PROPOSED', TEST_ONLY_VALUE);
  for (const st of APPROVAL_PATH[cur.governance].slice(1)) step(st);
  step('PRODUCTION_ELIGIBLE');
  return cur;
}

/** Gouvernance SIMULÉE où tout est approuvé et verrouillé (test des mécanismes seulement). */
export function fullyApprovedGovernance(): RunningGovernance {
  return {
    ...CURRENT_RUNNING_GOVERNANCE,
    rulesetLocked: true,
    decisions: Object.fromEntries(EXPERT_DECISIONS.map((d) => [d, 'APPROVED'])) as RunningGovernance['decisions'],
    g1Policies: Object.fromEntries(G1_POLICIES.map((g) => [g, 'SIGNED'])) as RunningGovernance['g1Policies'],
    technical: { CORE_EXT_R1: 'SATISFIED', GLOBAL_PLANNER_INTEGRATION: 'SATISFIED' },
    parameters: CURRENT_RUNNING_GOVERNANCE.parameters.map(approveThroughPath),
  };
}

/** Remplace un paramètre dans une gouvernance. */
export function withParameter(g: RunningGovernance, id: string, f: (p: RunningParameter) => RunningParameter): RunningGovernance {
  return { ...g, parameters: g.parameters.map((p) => (p.parameterId === id ? f(p) : p)) };
}

/** Intention du planificateur pour un archétype Running. */
export function runIntent(archetypeId = 'running.easy') {
  return {
    id: 'intent.run.w1', discipline: 'running' as const, archetypeId, stimulus: 'stim.running.aerobic', objective: 'objective.running.base',
    priority: 'standard' as const, phase: 'phase.running.base', availableTimeS: 3600, targetDurationS: 2700, repetitionIntents: [], plannerNotes: [],
  };
}

export function runRequest(disciplineContext: unknown, archetypeId = 'running.easy'): Parameters<typeof runSportSession>[1] {
  return { intent: runIntent(archetypeId), profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext };
}

export { coreContext };
