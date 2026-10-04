/**
 * Fixtures du Global Planner. TOUTE valeur ici est une DONNÉE DE TEST (TEST_ONLY) : contenus des fixtures des moteurs,
 * gouvernances simulées (aucune signature réelle), écarts d'interférence de test. Rien n'est lu par le code de production.
 */
import { asISODateTime } from '@hybridsport/domain';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { loadRuleset } from '@hybridsport/engine';
import type { CoreProfile, LoadedRuleset } from '@hybridsport/engine';
import { StrengthEngine, findArchetype, readStrengthParams } from '@hybridsport/strength';
import type { StrengthContextInput } from '@hybridsport/strength';
import { CURRENT_RUNNING_GOVERNANCE, createRunningEngine, withProductDecisions } from '@hybridsport/running';
import type { RunningContextInput, RunningGovernance } from '@hybridsport/running';
import { CT_C2_ARCHETYPE, CT_G1_POLICIES, CURRENT_CT_GOVERNANCE, createCrossTrainingEngine } from '@hybridsport/crosstraining';
import type { CrossTrainingContextInput, CtGovernance, CtParameter } from '@hybridsport/crosstraining';
import { HR_H1_ARCHETYPE, createHyroxEngine } from '@hybridsport/hyrox';
import type { HyroxContextInput } from '@hybridsport/hyrox';
import { crossTrainingPort, hyroxPort, runningPort, strengthPort } from '../src/index.js';
import type { PlannerClock, PlannerInput, SportPort, SportPorts } from '../src/index.js';
import { runningContent, strengthContent } from '../../app-core/src/provisional-content.js';
import { STATE_FRESH } from '../../engine/tests/harness/requests.js';
import { presetEquipment } from '../../engine/tests/fixtures/context.js';
import { testCatalog, testRuleset } from '../../engine/tests/fixtures/load.js';
import { param, testRulesetDocument } from '../../engine/tests/fixtures/ruleset.js';
import { withCandidate, withParameter } from '../../crosstraining/tests/fixtures.js';
import { approvedTestOnly, hyroxCatalog, hyroxRuleset } from '../../hyrox/tests/fixtures.js';
import { STRENGTH_PRESETS } from '../../strength/tests/fixtures/catalog.js';

/** Lundi 2026-10-05 … dimanche 2026-10-11. */
export const WEEK = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'] as const;
// technical-constant: TEST_ONLY — minutes disponibles par jour (lundi → dimanche)
export const AVAILABILITY = [60, 60, 60, 60, 60, 90, 60] as const;
export const days = (minutes: readonly number[] = AVAILABILITY) => WEEK.map((date, i) => ({ date, availableMinutes: minutes[i] ?? 0 }));

/** Horloge injectée de test : séances à midi UTC (convention de l'application V0). */
export const clock: PlannerClock = { instantOf: (d) => asISODateTime(`${d}T12:00:00Z`), timezone: 'Europe/Paris' };

const fullGym = STRENGTH_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
export const PROFILE: CoreProfile = {
  athleteLevel: 'intermediate', eligibility: 'eligible', declarations: [], healthDataConsent: true, restrictions: [], excludedExercises: [],
  availableEquipment: [...new Set([...fullGym, ...presetEquipment('preset.hybrid_race_gym')])].sort(),
};

// ——— Strength (contenu provisoire de l'application, inchangé)
export function strengthBase(): StrengthContextInput {
  return {
    goal: { primary: { goal: 'strength' } }, phase: { kind: 'accumulation', weekInMesocycle: 1, mesocycleLength: 1 },
    capacities: [], tracks: [], recentExposures: [], hardSets: { d7: {} },
    week: { otherStrengthSessions: [], neighbors: [], known: true }, preferences: { liked: [], disliked: [] },
  };
}
export function strength(profile: CoreProfile = PROFILE, history: FingerprintHistoryEntry[] = []): SportPort {
  const content = strengthContent();
  const a = findArchetype(readStrengthParams(content.ruleset).values, 'str_full_body');
  if (!a) throw new Error('archétype de test absent');
  return strengthPort({
    engine: StrengthEngine as never, content, profile, state: STATE_FRESH, history, clock, baseContext: strengthBase(),
    intent: { archetypeId: 'str_full_body', stimulus: 'strength_heavy', objective: 'objective.strength_heavy', phase: 'phase.accumulation', toleranceProfile: a.toleranceProfile },
  });
}

// ——— Running (gouvernance candidate + décisions produit ; GLOBAL_PLANNER_INTEGRATION SATISFAIT : TEST_ONLY)
export function runningGovernance(plannerIntegrated = true): RunningGovernance {
  const g = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
  return plannerIntegrated ? { ...g, technical: { ...g.technical, GLOBAL_PLANNER_INTEGRATION: 'SATISFIED' } } : g;
}
// technical-constant: TEST_ONLY — course libre réalisée (ancre d'historique, secondes)
const FREE_RUN_S = 1800;
export function runningBase(): RunningContextInput {
  return {
    population: { level: 'P_R2', hybrid: false }, goal: { type: 'GENERAL_RUNNING' }, returnState: { state: 'NONE', postReturnSessions: 0 },
    references: [], exposures: [], sensors: { wearable: false, heartRate: false }, terrain: { hills: false }, mode: 'CANDIDATE',
    sessionHistory: [{
      sessionId: 'free:2026-10-01', archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: asISODateTime('2026-10-01T12:00:00Z'), realizedDurationS: FREE_RUN_S,
      completion: 'COMPLETED', unexpectedDifficulty: 'AS_EXPECTED', intoleranceOrPainSignal: false, readinessOrToleranceDegraded: false,
    }],
    capabilityRequests: ['progressionBeyondHistory', 'longRunProgression', 'paceTargets', 'hybridPlanning'],
  };
}
export function running(o: { governance?: RunningGovernance; profile?: CoreProfile } = {}): SportPort {
  return runningPort({
    engine: createRunningEngine({ governance: o.governance ?? runningGovernance(), simulation: true }) as never, content: runningContent(),
    profile: o.profile ?? PROFILE, state: STATE_FRESH, history: [], clock, baseContext: runningBase(),
    intent: { archetypeId: 'running.easy', stimulus: 'stim.running.aerobic', objective: 'objective.running.base', phase: 'phase.running.base', toleranceProfile: 'fixed_time' },
  });
}

// ——— Cross-training C2 (gouvernance TEST_ONLY du lot C2 + capacité multisport ctHybridPlanning)
// technical-constant: TEST_ONLY — durée d'amorçage de test (s)
const CT_TEST_DURATION_S = 600;
const TEST_APPROVAL = { role: 'TEST', reference: 'TEST-ONLY' };
export function ctGovernance(o: { hybrid?: boolean } = {}): CtGovernance {
  let g: CtGovernance = {
    ...CURRENT_CT_GOVERNANCE,
    g1Policies: Object.fromEntries(CT_G1_POLICIES.map((p) => [p, 'SIGNED'])) as CtGovernance['g1Policies'],
    technical: { ...CURRENT_CT_GOVERNANCE.technical, CT_CONTENT: 'SATISFIED', ...(o.hybrid === false ? {} : { GLOBAL_PLANNER: 'SATISFIED' as const }) },
  };
  for (const id of ['ct.safety.novicePolicy', 'ct.return.protocol', 'ct.safety.novelEccentricVolume', 'ct.history.anchorPolicy', 'ct.history.negativeResponse', 'ct.history.completionCriterion']) g = withParameter(g, id, (p: CtParameter) => withCandidate(p));
  g = withParameter(g, 'ct.bootstrap.movementAllowlist', (p: CtParameter) => withCandidate(p, [{ movementId: 'ex.air_squat', status: 'APPROVED', approvedBootstrapDurationS: CT_TEST_DURATION_S, durationApproval: TEST_APPROVAL, eligibility: { contentReviewRef: 'TEST-ONLY' } }]));
  if (o.hybrid !== false) g = withParameter(g, 'ct.hybrid.policy', (p: CtParameter) => withCandidate(p));
  return g;
}
export function ctBase(): CrossTrainingContextInput {
  return {
    population: { level: 'intermediate', hybrid: false }, goal: { type: 'GENERAL_FITNESS' }, returnState: { state: 'NONE' }, declaredSkills: [],
    sessionHistory: [], benchmarks: [], mode: 'CANDIDATE', capabilityRequests: ['ctBootstrapExposure', 'ctReplayHold', 'ctHybridPlanning'],
  };
}
export function crosstraining(o: { governance?: CtGovernance; profile?: CoreProfile } = {}): SportPort {
  return crossTrainingPort({
    engine: createCrossTrainingEngine({ governance: o.governance ?? ctGovernance(), simulation: true }), content: { ruleset: testRuleset(), catalog: testCatalog() },
    profile: o.profile ?? PROFILE, state: STATE_FRESH, history: [], clock, baseContext: ctBase(),
    intent: { archetypeId: CT_C2_ARCHETYPE, stimulus: 'stim.crosstraining.metcon', objective: 'objective.crosstraining.general', phase: 'phase.crosstraining.base', toleranceProfile: 'fixed_time' },
  });
}

// ——— HYROX H1 (paramètres TEST_ONLY du lot H1 + multisport admis par paramètre G1 de test)
export function hyroxContent(o: { hybridAllowed?: boolean | null } = {}) {
  const base = hyroxRuleset();
  const doc = base.document;
  const extra = o.hybridAllowed === null ? [] : [param('hybrid_race.h1.hybridPlanning', o.hybridAllowed ?? true, 'G1')];
  const r = loadRuleset({ ...doc, parameters: [...doc.parameters, ...extra] } as never);
  if (!r.ok) throw new Error('ruleset HYROX de test invalide');
  return { ruleset: r.ruleset, catalog: hyroxCatalog() };
}
export function hyrox(o: { hybridAllowed?: boolean | null; station?: string | null; profile?: CoreProfile } = {}): SportPort {
  const baseContext: HyroxContextInput = { population: { level: 'intermediate', hybrid: false }, mode: 'CANDIDATE', returnState: { state: 'NONE' }, ...(o.station === null ? {} : { requestedStation: o.station ?? 'skierg' }) };
  return hyroxPort({
    engine: createHyroxEngine({ simulation: true }), content: hyroxContent(o), profile: o.profile ?? PROFILE, state: STATE_FRESH, history: [], clock, baseContext,
    intent: { archetypeId: HR_H1_ARCHETYPE, stimulus: 'stim.hybrid_race.station', objective: 'objective.hybrid_race.station', phase: 'phase.hybrid_race.base', toleranceProfile: 'mixed' },
  });
}

// ——— Gouvernance du planificateur (TEST_ONLY)
// technical-constant: TEST_ONLY — écart inter-disciplines de test par structure (heures)
export const TEST_WINDOW_H = 24;
export const STRUCTURE_IDS = ['lower_knee', 'lower_hip', 'upper_push', 'upper_pull', 'axial', 'locomotor_impact', 'high_intensity_systemic', 'grip'] as const;
export function plannerGovernance(windows: Record<string, number> | null = Object.fromEntries(STRUCTURE_IDS.map((s) => [s, TEST_WINDOW_H])), extra: Record<string, unknown> = {}): LoadedRuleset {
  const doc = testRulesetDocument();
  return testRuleset({ ...doc, parameters: [...doc.parameters, ...(windows === null ? [] : [param('planner.interference.structureWindows', windows, 'G2', extra)])] });
}
export { approvedTestOnly };

export const ALL_PORTS = (): SportPorts => ({ strength: strength(), running: running(), crosstraining: crosstraining(), hyrox: hyrox() });

export function input(demands: PlannerInput['demands'], o: Partial<PlannerInput> = {}): PlannerInput {
  return { weekStart: WEEK[0], days: days(), demands, mode: 'CANDIDATE', recent: [], ...o };
}
