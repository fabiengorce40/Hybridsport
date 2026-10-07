/**
 * Q1 — fixtures de l'audit de qualité : ports RÉELS des quatre moteurs avec l'environnement de diagnostic DÉCLARÉ
 * `TEST_ONLY` (les valeurs non approuvées des fixtures sont étiquetées comme telles) et la gouvernance C3 transmise au
 * diagnostic. Séances réelles observées sur téléphone reproduites. Aucune valeur nouvelle ici.
 */
import { asISODateTime } from '@hybridsport/domain';
import { createCrossTrainingEngine } from '@hybridsport/crosstraining';
import { createHyroxEngine } from '@hybridsport/hyrox';
import { createRunningEngine } from '@hybridsport/running';
import { StrengthEngine } from '@hybridsport/strength';
import { crossTrainingPort, hyroxPort, planMultisportWeek, runningPort, strengthPort } from '../../src/index.js';
import type { PlannedWeek, RequestResult, SportIntent, SportPort, SportPorts } from '../../src/index.js';
import type { CoreProfile } from '@hybridsport/engine';
import { PROFILE, clock, days, input, plannerGovernance, runningBase, runningGovernance, strengthBase, withDemand } from '../fixtures.js';
import { CT_DOSE_NORMALIZATION } from '../ct-beta0.js';
import { hrBeta0 } from '../hr-beta0.js';
import { D } from '../m3-fixtures.js';
import { m3Governance } from '../m3-governance.js';
import { runningContent, strengthContent } from '../../../app-core/src/provisional-content.js';
import { C3_REQUESTS, c3Governance } from '../../../crosstraining/tests/c3-fixtures.js';
import { ctxInput } from '../../../crosstraining/tests/fixtures.js';
import { testCatalog, testRuleset } from '../../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';

export { D };
const ENV = { qualityEnv: 'TEST_ONLY' as const };
export const CT_GOV = c3Governance({ hybrid: true });

/** Séance CT RÉALISÉE récemment avec le rameur : reproduit le choix SkiErg observé (rameur « récent »). */
const ROW_RECENT = [{
  sessionId: 'ct.prev', completedAt: asISODateTime('2026-10-02T12:00:00Z'), stimulus: 'mixed_modal_medium' as const, completion: 'completed_as_prescribed' as const,
  prescription: { format: 'for_time' as const, rounds: 5, timeCapS: 1186, items: [{ exerciseId: 'ex.row_erg', quantity: { kind: 'distance_m' as const, value: 250 } }, { exerciseId: 'ex.reverse_lunge_bw', quantity: { kind: 'reps' as const, value: 15 } }, { exerciseId: 'ex.push_up', quantity: { kind: 'reps' as const, value: 10 } }] },
  result: { kind: 'time' as const, completionS: 1100 },
}];

export function ctPort(o: { rowRecent?: boolean; profile?: CoreProfile; env?: 'TEST_ONLY' | undefined; governance?: boolean } = {}): SportPort {
  return crossTrainingPort({
    ...(o.env === undefined && 'env' in o ? {} : ENV), ...(o.governance === false ? {} : { qualityGovernance: CT_GOV }),
    engine: createCrossTrainingEngine({ governance: CT_GOV, simulation: true }), content: withDemand({ ruleset: testRuleset(testRulesetDocumentWithDuplicate()), catalog: testCatalog() }, CT_DOSE_NORMALIZATION),
    profile: o.profile ?? PROFILE, state: STATE_FRESH, history: [], clock, baseContext: ctxInput({ capabilityRequests: [...C3_REQUESTS], ...(o.rowRecent ? { sessionHistory: ROW_RECENT } : {}) }), transportNeighbours: true,
  });
}
export function hrPort(o: { profile?: CoreProfile; level?: 'beginner' | 'intermediate'; mode?: 'CANDIDATE' | 'PRODUCTION' } = {}): SportPort {
  return hyroxPort({
    ...ENV, engine: createHyroxEngine({ simulation: true }), content: hrBeta0().content, profile: o.profile ?? PROFILE, state: STATE_FRESH, history: [], clock,
    baseContext: { population: { level: o.level ?? 'intermediate', hybrid: false }, mode: o.mode ?? 'CANDIDATE', returnState: { state: 'NONE' }, goal: { type: 'RACE_PREPARATION' }, compositionHistory: [] },
    transportNeighbours: true,
  });
}
export function strPort(): SportPort {
  return strengthPort({ ...ENV, engine: StrengthEngine as never, content: withDemand(strengthContent()), profile: PROFILE, state: STATE_FRESH, history: [], clock, baseContext: strengthBase() });
}
export function runPort(): SportPort {
  return runningPort({ ...ENV, engine: createRunningEngine({ governance: runningGovernance(), simulation: true }) as never, content: withDemand(runningContent()), profile: PROFILE, state: STATE_FRESH, history: [], clock, baseContext: runningBase() });
}
export const q1Ports = (): SportPorts => ({ strength: strPort(), running: runPort(), crosstraining: ctPort(), hyrox: hrPort() });

export const plan = (demands: readonly SportIntent[], ports: SportPorts, o: { minutes?: readonly number[]; m3?: boolean } = {}): PlannedWeek =>
  planMultisportWeek(input(demands, { days: days(o.minutes) }), ports, o.m3 ? m3Governance() : plannerGovernance(), clock);
export const first = (w: PlannedWeek, sport?: string): Extract<RequestResult, { status: 'planned' }> => {
  const r = w.requests.find((x) => x.status === 'planned' && (sport === undefined || x.sport === sport));
  if (!r || r.status !== 'planned') throw new Error(`aucune séance planifiée (${sport ?? '*'})`);
  return r;
};
/** Séances réelles observées sur téléphone (reproduites par les ports réels et les fixtures TEST_ONLY). */
export const realHyrox = () => first(plan([D.hyrox(1, 'strength_endurance')], { hyrox: hrPort() }), 'hyrox');
export const realCt = () => first(plan([D.ct(1)], { crosstraining: ctPort({ rowRecent: true }) }), 'crosstraining');
