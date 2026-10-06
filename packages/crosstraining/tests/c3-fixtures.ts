/**
 * Fixtures C3 — GOUVERNANCE TEST_ONLY / SIMULATION_ONLY.
 *
 * Toutes les valeurs ci-dessous sont des DONNÉES DE TEST (maturité EXPERT_PROPOSED, mode CANDIDATE + simulation),
 * jamais des décisions : elles démontrent les MÉCANISMES de composition. Les ordres de grandeur sont choisis pour être
 * plausibles et lisibles, pas sourcés. La gouvernance réelle (registre C1) reste fail-closed : voir les tests « réel ».
 */
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { archetypeIdOf, createCrossTrainingEngine, ctPrescriptionOf, runCrossTrainingC2, zRealizedCtSession } from '../src/index.js';
import type { C3Outcome, CrossTrainingContextInput, CtGovernance, CtStimulus, RealizedCtSession } from '../src/index.js';
import { coreContext, ctIntent, ctxInput } from './fixtures.js';
import { PROFILE_GYM, STATE_FRESH } from '../../engine/tests/harness/requests.js';
import type { CoreProfile, CoreState } from '../../engine/src/index.js';

export { TEST_C3, c3Governance, C3_REQUESTS } from './c3-governance.js';
export type { C3GovOptions } from './c3-governance.js';
import { C3_REQUESTS, c3Governance } from './c3-governance.js';

export interface C3Run {
  readonly stimulus?: CtStimulus;
  readonly ctx?: Partial<CrossTrainingContextInput>;
  readonly gov?: CtGovernance;
  readonly profile?: CoreProfile;
  readonly state?: CoreState;
  readonly availableTimeS?: number;
  readonly history?: FingerprintHistoryEntry[];
  readonly seed?: string;
}

export function c3Request(o: C3Run = {}) {
  const intent = { ...ctIntent(o.stimulus ?? 'mixed_modal_medium'), ...(o.availableTimeS === undefined ? {} : { availableTimeS: o.availableTimeS, targetDurationS: o.availableTimeS }) };
  return {
    intent: { ...intent, archetypeId: archetypeIdOf(o.stimulus ?? 'mixed_modal_medium') },
    profile: o.profile ?? PROFILE_GYM, state: o.state ?? STATE_FRESH, history: o.history ?? [],
    disciplineContext: ctxInput({ capabilityRequests: [...C3_REQUESTS], ...o.ctx }),
  };
}

export const c3Engine = (g: CtGovernance = c3Governance()) => createCrossTrainingEngine({ governance: g, simulation: true });

/** Pipeline CORE RÉEL (runSportSession) avec contrôle strict « séance publiée = séance proposée ». */
export function runC3(o: C3Run = {}) {
  return runCrossTrainingC2(c3Engine(o.gov), c3Request(o) as never, coreContext(o.seed ?? 'ct-c3'));
}

/** Exécution DÉTAILLÉE : pipeline CORE réel + plan C3 de l'entrée exacte que le CORE a transmise au moteur. */
export function runC3Detailed(o: C3Run = {}, ctxOverride?: Partial<ReturnType<typeof coreContext>>) {
  const engine = c3Engine(o.gov);
  let seen: Parameters<typeof engine.propose>[0] | undefined;
  const watched = { ...engine, propose: (input: Parameters<typeof engine.propose>[0]) => { seen = input; return engine.propose(input); } };
  const outcome = runCrossTrainingC2(watched, c3Request(o) as never, { ...coreContext(o.seed ?? 'ct-c3'), ...ctxOverride });
  const compose = seen ? engine.compose(seen) : undefined;
  return { outcome, compose, input: seen };
}

/** Séance réalisée (contrat CT) d'une composition : prescription LUE dans la séance CORE ; résultat TEST_ONLY cohérent. */
export function realizedFrom(c: C3Outcome | undefined, sessionId: string, completedAt: string, o: Record<string, unknown> = {}): RealizedCtSession {
  if (!c?.ok) throw new Error('composition attendue');
  const prescription = ctPrescriptionOf(c.proposal.session as never);
  // technical-constant: TEST_ONLY — résultats illustratifs (5 tours ; temps de 1 s), jamais lus comme une performance
  const result = prescription?.format === 'amrap' ? { kind: 'rounds_reps', rounds: 5, reps: 0 } : prescription?.format === 'emom' ? { kind: 'emom', minutesCompleted: prescription.minutes }
    : prescription?.format === 'for_time' ? { kind: 'time', completionS: 1 } : prescription?.format === 'intervals' ? { kind: 'intervals', intervalsCompleted: prescription.rounds } : { kind: 'total', durationS: prescription?.format === 'continuous' ? prescription.durationS : 1 };
  return zRealizedCtSession.parse({ sessionId, completedAt, stimulus: c.plan.stimulus, prescription, result, completion: 'completed_as_prescribed', pain: 'NONE', ...o });
}
