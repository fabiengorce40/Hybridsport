/**
 * RULESET DE TEST du StrengthEngine. TOUTES les valeurs sont des HYPOTHÈSES PROVISOIRES (statut draft,
 * confiance provisional) servant à exercer les mécanismes. Elles ne sont ni validées ni destinées à la
 * production, et vivent dans les tests uniquement. Point de départ : hypothèses de la spec V1.2 doc 06
 * §1 (elles-mêmes provisoires).
 */
import type { GovernanceClass, Level, ParameterValue, RulesetDocumentInput } from '@hybridsport/domain';
import { STRENGTH_PARAMETER_SCHEMAS, STRENGTH_RULES } from '../../src/index.js';
import type { StrengthParamId } from '../../src/index.js';
import { param, rule, testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';
import { ALL_PRESET_IDS } from './catalog.js';

const LEVELS: Level[] = ['novice', 'beginner', 'intermediate', 'advanced'];
const byLevel = <T>(f: (l: Level) => T): Record<Level, T> => Object.fromEntries(LEVELS.map((l) => [l, f(l)])) as Record<Level, T>;

type Cell = { reps: { min: number; max: number }; rir: number; sets: { min: number; max: number }; restS: { min: number; max: number } };
const c = (rMin: number, rMax: number, rir: number, sMin: number, sMax: number, restMin: number, restMax: number): Cell => ({ reps: { min: rMin, max: rMax }, rir, sets: { min: sMin, max: sMax }, restS: { min: restMin, max: restMax } });
const profile = (p: Record<'primary' | 'secondary' | 'accessory', [Cell, Cell, Cell, Cell]>) =>
  Object.fromEntries(Object.entries(p).map(([role, [hl, other, isoC, bw]]) => [role, { compound_high_load: hl, compound_other: other, isolation: isoC, bodyweight_capped: bw }]));

const strengthModel = (l: Level) => {
  const early = l === 'novice' || l === 'beginner';
  const main = early ? 'linear_load' : 'autoregulated';
  return {
    primary: { compound_high_load: main, compound_other: early ? 'linear_load' : 'double_progression', isolation: 'double_progression', bodyweight_capped: 'double_progression' },
    secondary: { compound_high_load: early ? 'linear_load' : 'double_progression', compound_other: 'double_progression', isolation: 'double_progression', bodyweight_capped: 'double_progression' },
    accessory: { compound_high_load: 'double_progression', compound_other: 'double_progression', isolation: 'double_progression', bodyweight_capped: 'double_progression' },
  };
};

const HYPERTROPHY_INTERMEDIATE: Record<string, [number, number]> = {
  chest: [10, 20], back: [10, 20], shoulders: [8, 16], arms: [6, 14], quads: [10, 18], hamstrings: [8, 14], glutes: [6, 14], calves: [4, 10], core: [4, 10],
};
const LEVEL_SCALE: Record<Level, number> = { novice: 0.6, beginner: 0.8, intermediate: 1, advanced: 1.2 };
const GOAL_SCALE: Record<string, number> = { hypertrophy: 1, strength: 0.7, general: 0.6, 'support:running': 0.35, 'support:hybrid_race': 0.35, 'support:crosstraining': 0.35 };
const weekly = () => Object.fromEntries(Object.keys(GOAL_SCALE).map((g) => [g, byLevel((l) => Object.fromEntries(Object.entries(HYPERTROPHY_INTERMEDIATE).map(([grp, [lo, hi]]) => {
  const k = (GOAL_SCALE[g] ?? 1) * LEVEL_SCALE[l];
  return [grp, { floor: Math.round(lo * k), high: Math.round(hi * k) }];
})))]));

const block = (id: string, kind: 'strength' | 'accessory', role: 'primary' | 'secondary' | 'support', levers: unknown[], grouping: 'straight' | 'superset' = 'straight') => ({ id, kind, role, grouping, levers });
const slot = (id: string, blockId: string, need: string, role: 'primary' | 'secondary' | 'accessory', status: 'required' | 'optional', o: Record<string, unknown> = {}) =>
  ({ id, blockId, need, role, status, count: { min: 1, max: 1 }, anchorable: role !== 'accessory', trackable: role === 'accessory', ...o });
const presets = (infeasible: string[]) => ({ feasiblePresets: ALL_PRESET_IDS.filter((p) => !infeasible.includes(p)), declaredInfeasiblePresets: infeasible, declaredInfeasibleRestrictions: [] });
const MAIN_LEVERS = [{ kind: 'reduce_main_volume', min: 2 }];
const SEC_LEVERS = [{ kind: 'reduce_sets', min: 2 }];
const ACC_LEVERS = [{ kind: 'superset_accessories' }, { kind: 'reduce_sets', min: 1 }, { kind: 'drop_accessory', keepAtLeast: 1 }];
const ALL_GOALS = Object.keys(GOAL_SCALE);

export const TEST_ARCHETYPES = [
  {
    id: 'str_full_body', version: '0.1.0', status: 'draft', levels: LEVELS, goals: ALL_GOALS, toleranceProfile: 'strength_sets', duration: { min: 1500, max: 4500 },
    ...presets(['preset.bodyweight']),
    blocks: [block('b.main', 'strength', 'primary', MAIN_LEVERS), block('b.secondary', 'strength', 'secondary', SEC_LEVERS), block('b.accessory', 'accessory', 'support', ACC_LEVERS)],
    slots: [
      slot('fb.main_knee', 'b.main', 'knee_dominant', 'primary', 'required', { choiceGroup: 'main', modalityPreference: 'load_ceiling' }),
      slot('fb.main_hip', 'b.main', 'hip_dominant', 'primary', 'required', { choiceGroup: 'main', modalityPreference: 'load_ceiling' }),
      slot('fb.push_h', 'b.secondary', 'push_horizontal', 'secondary', 'required', { choiceGroup: 'push' }),
      slot('fb.push_v', 'b.secondary', 'push_vertical', 'secondary', 'required', { choiceGroup: 'push' }),
      slot('fb.pull_v', 'b.secondary', 'pull_vertical', 'secondary', 'required', { choiceGroup: 'pull' }),
      slot('fb.pull_h', 'b.secondary', 'pull_horizontal', 'secondary', 'required', { choiceGroup: 'pull' }),
      slot('fb.single_leg', 'b.accessory', 'single_leg', 'accessory', 'optional', { modalityPreference: 'stability' }),
      slot('fb.iso_upper', 'b.accessory', 'isolation_upper', 'accessory', 'optional', { modalityPreference: 'stability', count: { min: 1, max: 2 } }),
      slot('fb.iso_lower', 'b.accessory', 'isolation_lower', 'accessory', 'optional', { modalityPreference: 'stability' }),
      slot('fb.trunk', 'b.accessory', 'trunk', 'accessory', 'optional', { trackable: false }),
    ],
  },
  {
    id: 'str_upper', version: '0.1.0', status: 'draft', levels: LEVELS, goals: ['strength', 'hypertrophy', 'general', 'support:crosstraining'], toleranceProfile: 'strength_sets', duration: { min: 2100, max: 4800 },
    ...presets(['preset.bodyweight']),
    blocks: [block('b.main', 'strength', 'primary', MAIN_LEVERS), block('b.secondary', 'strength', 'secondary', SEC_LEVERS), block('b.accessory', 'accessory', 'support', ACC_LEVERS)],
    slots: [
      slot('up.main_push_h', 'b.main', 'push_horizontal', 'primary', 'required', { choiceGroup: 'main', modalityPreference: 'load_ceiling' }),
      slot('up.main_push_v', 'b.main', 'push_vertical', 'primary', 'required', { choiceGroup: 'main', modalityPreference: 'load_ceiling' }),
      slot('up.pull_v', 'b.secondary', 'pull_vertical', 'secondary', 'required', { choiceGroup: 'pull' }),
      slot('up.pull_h', 'b.secondary', 'pull_horizontal', 'secondary', 'required', { choiceGroup: 'pull' }),
      slot('up.push_2h', 'b.accessory', 'push_horizontal', 'accessory', 'optional', { choiceGroup: 'push_2', modalityPreference: 'stability' }),
      slot('up.push_2v', 'b.accessory', 'push_vertical', 'accessory', 'optional', { choiceGroup: 'push_2', modalityPreference: 'stability' }),
      slot('up.pull_2h', 'b.accessory', 'pull_horizontal', 'accessory', 'optional', { choiceGroup: 'pull_2', modalityPreference: 'stability' }),
      slot('up.pull_2v', 'b.accessory', 'pull_vertical', 'accessory', 'optional', { choiceGroup: 'pull_2', modalityPreference: 'stability' }),
      slot('up.iso_upper', 'b.accessory', 'isolation_upper', 'accessory', 'optional', { modalityPreference: 'stability', count: { min: 1, max: 2 } }),
      slot('up.trunk', 'b.accessory', 'trunk', 'accessory', 'optional', { trackable: false }),
    ],
  },
  {
    id: 'str_lower', version: '0.1.0', status: 'draft', levels: LEVELS, goals: ['strength', 'hypertrophy', 'general'], toleranceProfile: 'strength_sets', duration: { min: 2400, max: 4800 },
    ...presets(['preset.bodyweight']),
    blocks: [block('b.main', 'strength', 'primary', MAIN_LEVERS), block('b.secondary', 'strength', 'secondary', SEC_LEVERS), block('b.accessory', 'accessory', 'support', ACC_LEVERS)],
    slots: [
      slot('lo.main_knee', 'b.main', 'knee_dominant', 'primary', 'required', { choiceGroup: 'main', modalityPreference: 'load_ceiling' }),
      slot('lo.main_hip', 'b.main', 'hip_dominant', 'primary', 'required', { choiceGroup: 'main', modalityPreference: 'load_ceiling' }),
      slot('lo.sec_hip', 'b.secondary', 'hip_dominant', 'secondary', 'required', { choiceGroup: 'secondary' }),
      slot('lo.sec_knee', 'b.secondary', 'knee_dominant', 'secondary', 'required', { choiceGroup: 'secondary' }),
      slot('lo.single_leg', 'b.accessory', 'single_leg', 'accessory', 'optional', { modalityPreference: 'stability' }),
      slot('lo.iso_lower', 'b.accessory', 'isolation_lower', 'accessory', 'optional', { modalityPreference: 'stability', count: { min: 1, max: 2 } }),
      slot('lo.trunk', 'b.accessory', 'trunk', 'accessory', 'optional', { trackable: false }),
    ],
  },
  {
    id: 'str_support', version: '0.1.0', status: 'draft', levels: LEVELS, goals: ['support:running', 'support:hybrid_race', 'support:crosstraining', 'general'], toleranceProfile: 'strength_sets', duration: { min: 1200, max: 3000 },
    ...presets([]),
    blocks: [block('b.main', 'strength', 'primary', MAIN_LEVERS), block('b.secondary', 'strength', 'secondary', SEC_LEVERS), block('b.accessory', 'accessory', 'support', ACC_LEVERS, 'superset')],
    slots: [
      slot('sp.main_hip', 'b.main', 'hip_dominant', 'primary', 'required', { choiceGroup: 'main', modalityPreference: 'specificity' }),
      slot('sp.main_single', 'b.main', 'single_leg', 'primary', 'required', { choiceGroup: 'main', modalityPreference: 'specificity' }),
      slot('sp.main_knee', 'b.main', 'knee_dominant', 'primary', 'required', { choiceGroup: 'main', modalityPreference: 'specificity' }),
      slot('sp.pull', 'b.secondary', 'pull_vertical', 'secondary', 'required', { choiceGroup: 'upper' }),
      slot('sp.row', 'b.secondary', 'pull_horizontal', 'secondary', 'required', { choiceGroup: 'upper' }),
      slot('sp.push', 'b.secondary', 'push_horizontal', 'secondary', 'required', { choiceGroup: 'upper' }),
      slot('sp.single_leg', 'b.accessory', 'single_leg', 'accessory', 'optional', { modalityPreference: 'specificity' }),
      slot('sp.trunk', 'b.accessory', 'trunk', 'accessory', 'optional', { trackable: false }),
      slot('sp.carry', 'b.accessory', 'carry', 'accessory', 'optional', { modalityPreference: 'specificity', trackable: false }),
      slot('sp.iso_lower', 'b.accessory', 'isolation_lower', 'accessory', 'optional', { modalityPreference: 'specificity' }),
    ],
  },
];

/** Valeurs de test (provisoires) de chaque paramètre `strength.*`. */
export const STRENGTH_TEST_VALUES: Record<StrengthParamId, unknown> = {
  'strength.needs': {
    knee_dominant: { requirement: { pattern: 'squat', compound: true } },
    hip_dominant: { requirement: { pattern: 'hinge', compound: true } },
    single_leg: { requirement: { pattern: 'lunge' } },
    push_horizontal: { requirement: { pattern: 'push_horizontal' } },
    push_vertical: { requirement: { pattern: 'push_vertical' } },
    pull_horizontal: { requirement: { pattern: 'pull_horizontal' } },
    pull_vertical: { requirement: { pattern: 'pull_vertical' } },
    trunk: { requirement: { region: 'core', movementTypes: ['strength', 'isometric'] } },
    carry: { requirement: { pattern: 'carry' } },
    isolation_upper: { requirement: { pattern: 'isolation_upper' } },
    isolation_lower: { requirement: { pattern: 'isolation_lower' } },
  },
  'strength.archetypes': TEST_ARCHETYPES,
  'strength.goals': {
    strength: { needPriority: ['knee_dominant', 'hip_dominant', 'push_horizontal', 'pull_vertical', 'push_vertical', 'pull_horizontal', 'single_leg', 'trunk', 'isolation_upper', 'isolation_lower', 'carry'] },
    hypertrophy: { needPriority: ['push_horizontal', 'pull_vertical', 'knee_dominant', 'hip_dominant', 'pull_horizontal', 'push_vertical', 'isolation_upper', 'isolation_lower', 'single_leg', 'trunk', 'carry'] },
    general: { needPriority: ['knee_dominant', 'push_horizontal', 'pull_horizontal', 'hip_dominant', 'pull_vertical', 'push_vertical', 'single_leg', 'trunk', 'isolation_upper', 'isolation_lower', 'carry'] },
    'support:running': { needPriority: ['hip_dominant', 'single_leg', 'pull_horizontal', 'trunk', 'isolation_lower', 'pull_vertical', 'push_horizontal'] },
    'support:hybrid_race': { needPriority: ['single_leg', 'knee_dominant', 'hip_dominant', 'pull_horizontal', 'push_horizontal', 'carry', 'trunk', 'pull_vertical'] },
    'support:crosstraining': { needPriority: ['knee_dominant', 'hip_dominant', 'pull_vertical', 'push_vertical', 'push_horizontal', 'trunk', 'single_leg'] },
  },
  'strength.stimuli': {
    strength_heavy: { doseProfile: 'heavy', optionalOrder: ['single_leg', 'push_horizontal', 'pull_horizontal', 'push_vertical', 'pull_vertical', 'isolation_lower', 'isolation_upper', 'trunk', 'carry'], energy: { low: 0.2, moderate: 0.5, high: 0.3 }, format: 'straight_sets' },
    strength_volume: { doseProfile: 'volume', optionalOrder: ['push_horizontal', 'pull_horizontal', 'push_vertical', 'pull_vertical', 'isolation_upper', 'isolation_lower', 'single_leg', 'trunk', 'carry'], energy: { low: 0.2, moderate: 0.6, high: 0.2 }, format: 'straight_sets' },
    strength_general: { doseProfile: 'general', optionalOrder: ['single_leg', 'push_horizontal', 'pull_horizontal', 'isolation_upper', 'isolation_lower', 'trunk', 'push_vertical', 'pull_vertical', 'carry'], energy: { low: 0.3, moderate: 0.6, high: 0.1 }, format: 'straight_sets' },
    strength_support: { doseProfile: 'support', optionalOrder: ['single_leg', 'isolation_lower', 'trunk', 'carry', 'isolation_upper'], energy: { low: 0.3, moderate: 0.6, high: 0.1 }, format: 'straight_sets' },
  },
  'strength.session.mobility': { warmupS: { min: 180, max: 300 }, cooldownS: { min: 0, max: 180 } },
  'strength.exerciseClass': { highLoadCeilingMin: 2, cappedLoadCeilingMax: 0 },
  'strength.selection.criteriaOrder': {
    primary: ['anchor', 'load_adequacy', 'role_fit', 'goal_relevance', 'fatigue_fit', 'volume_fit', 'preference', 'recency', 'logistics'],
    secondary: ['anchor', 'load_adequacy', 'goal_relevance', 'role_fit', 'fatigue_fit', 'volume_fit', 'recency', 'preference', 'logistics'],
    accessory: ['track', 'load_adequacy', 'role_fit', 'volume_fit', 'goal_relevance', 'fatigue_fit', 'recency', 'preference', 'logistics'],
  },
  'strength.selection.recencyBandsDays': [2, 5],
  'strength.selection.axialHighMaxPerSession': 1,
  'strength.selection.minLoadCeiling': { novice: 0, beginner: 0, intermediate: 1, advanced: 1 },
  'strength.selection.skillCeiling': { novice: 2, beginner: 3, intermediate: 4, advanced: 5 },
  'strength.novice.technicalUnderFatigue': { levels: ['novice', 'beginner'], minTechnical: 2, maxPerSession: 1, allowedRoles: ['primary'] },
  'strength.dose.base': {
    heavy: profile({ primary: [c(3, 6, 2, 3, 5, 150, 240), c(5, 8, 2, 3, 4, 120, 180), c(8, 12, 2, 2, 3, 60, 90), c(6, 12, 2, 3, 4, 90, 120)], secondary: [c(5, 8, 2, 3, 4, 120, 180), c(6, 10, 2, 3, 3, 90, 150), c(8, 12, 2, 2, 3, 60, 90), c(8, 12, 2, 3, 3, 60, 90)], accessory: [c(6, 10, 2, 2, 3, 90, 120), c(8, 12, 2, 2, 3, 60, 90), c(10, 15, 1, 2, 3, 45, 75), c(8, 15, 2, 2, 3, 45, 75)] }),
    volume: profile({ primary: [c(6, 10, 2, 3, 4, 120, 180), c(8, 12, 2, 3, 4, 90, 120), c(10, 15, 1, 3, 4, 60, 90), c(10, 15, 1, 3, 3, 60, 90)], secondary: [c(8, 12, 2, 3, 4, 90, 120), c(8, 12, 2, 3, 4, 90, 120), c(10, 15, 1, 3, 4, 60, 90), c(10, 15, 1, 3, 3, 60, 90)], accessory: [c(8, 12, 2, 2, 3, 75, 105), c(10, 15, 1, 2, 3, 60, 90), c(12, 20, 1, 3, 4, 45, 75), c(10, 20, 1, 2, 3, 45, 75)] }),
    general: profile({ primary: [c(6, 10, 2, 2, 3, 90, 150), c(8, 12, 2, 2, 3, 90, 120), c(10, 15, 2, 2, 3, 60, 90), c(8, 15, 2, 2, 3, 60, 90)], secondary: [c(8, 12, 2, 2, 3, 90, 120), c(8, 12, 2, 2, 3, 75, 105), c(10, 15, 2, 2, 3, 60, 90), c(8, 15, 2, 2, 3, 60, 90)], accessory: [c(8, 12, 2, 2, 2, 60, 90), c(10, 15, 2, 2, 2, 60, 90), c(12, 15, 2, 2, 3, 45, 60), c(10, 15, 2, 2, 2, 45, 60)] }),
    support: profile({ primary: [c(5, 8, 3, 2, 3, 120, 180), c(6, 8, 3, 2, 3, 90, 120), c(8, 12, 2, 2, 2, 60, 90), c(6, 10, 3, 2, 3, 60, 90)], secondary: [c(6, 10, 2, 2, 3, 90, 120), c(6, 10, 2, 2, 3, 75, 105), c(8, 12, 2, 2, 2, 60, 90), c(8, 12, 2, 2, 2, 60, 90)], accessory: [c(8, 12, 2, 2, 2, 45, 60), c(8, 12, 2, 2, 2, 45, 60), c(10, 15, 2, 2, 2, 45, 60), c(8, 12, 2, 2, 2, 45, 60)] }),
  },
  'strength.dose.modifiers': {
    level: { novice: { setsDelta: -1, rirDelta: 1 }, beginner: { setsDelta: 0, rirDelta: 1 }, intermediate: { setsDelta: 0, rirDelta: 0 }, advanced: { setsDelta: 0, rirDelta: 0 } },
    phase: { accumulation: { setsDelta: 0, rirDelta: 0 }, intensification: { setsDelta: 0, rirDelta: 0 }, deload: { setsDelta: 0, rirDelta: 2, setsFactor: 0.6 }, maintenance: { setsDelta: -1, rirDelta: 0 }, transition: { setsDelta: -1, rirDelta: 1 } },
    readiness: { caution: { setsDelta: 0, rirDelta: 1 }, reduce: { setsDelta: -1, rirDelta: 1 } },
    unknownReadiness: 'as_normal', conflictPolicy: 'most_conservative', repChoice: 'low', restChoice: 'mid', restRoundingS: 15,
  },
  'strength.dose.nonRep': { holdSeconds: { min: 30, max: 45 }, carryMeters: { min: 30, max: 40 } },
  'strength.load': {
    e1rmDivisor: 30, validRepRange: { min: 1, max: 12 },
    pctByRepsToFailure: { 1: 1, 2: 0.95, 3: 0.93, 4: 0.9, 5: 0.87, 6: 0.85, 7: 0.83, 8: 0.8, 9: 0.77, 10: 0.75, 11: 0.72, 12: 0.7, 13: 0.68, 14: 0.66, 15: 0.64, 16: 0.62, 17: 0.6 },
    referenceWindowsDays: { high: 42, medium: 112, low: 365 }, assumedRirWhenUnknown: 0, equivalenceTransferPenalty: 1,
    transferableLoadModels: ['barbell', 'dumbbell_pair', 'dumbbell_single', 'kettlebell'], conflictTolerance: 0.15, smoothingWindow: 3, indicativeSpread: 0.1,
  },
  'strength.load.defaultIncrements': { barbell: 2.5, dumbbell_pair: 2, dumbbell_single: 2, kettlebell: 4, machine_stack: 5, plate_loaded: 5, bodyweight_plus: 2.5, implement_fixed: 1 },
  'strength.calibration': { targetRir: 3, sets: 2, intraSessionProgression: true, stopCriterion: 'target_effort_reached', mediumAfterExposures: 1, highAfterExposures: 2 },
  'strength.rampup': {
    roles: ['primary', 'secondary'], exerciseClasses: ['compound_high_load'], loadModels: ['barbell', 'plate_loaded', 'machine_stack'], maxWorkingReps: 8, samePatternMax: 1,
    known: [
      { minRelative: 0.5, steps: [{ fraction: 0.5, reps: 8 }] },
      { minRelative: 0.7, steps: [{ fraction: 0.4, reps: 8 }, { fraction: 0.6, reps: 5 }, { fraction: 0.8, reps: 3 }] },
      { minRelative: 0.85, steps: [{ fraction: 0.4, reps: 8 }, { fraction: 0.55, reps: 5 }, { fraction: 0.7, reps: 3 }, { fraction: 0.85, reps: 1 }] },
    ],
    estimatedLastStepMax: 0.7,
    effortSteps: [{ rpe: 4, reps: 8 }, { rpe: 6, reps: 5 }],
    unknownSteps: [{ rpe: 3, reps: 8 }, { rpe: 5, reps: 5 }, { rpe: 7, reps: 3 }], unknownStopCriterion: 'target_effort_reached',
    restS: 60,
  },
  'strength.progression': {
    modelFor: byLevel(strengthModel), loadStepIncrements: 1, aboveRirMargin: 1, belowRirMargin: 2, partialMaxMissedSets: 1,
    evidenceRequired: { linear_load: 1, double_progression: 1, autoregulated: 2, set_progression: 1 },
    cycleCapFraction: 0.15, regressionFraction: 0.1, regressAfterBelow: 2, stagnationHolds: 3, coarseStepFraction: 0.1,
  },
  'strength.tracks': { anchorMaxWeeks: { novice: 12, beginner: 10, intermediate: 8, advanced: 6 }, tier2AutoCreateAfter: 2, rotateAtMesocycleEnd: { novice: false, beginner: false, intermediate: false, advanced: true } },
  'strength.volume': {
    muscleGroups: { chest: ['chest'], back: ['lats', 'upper_back_traps'], shoulders: ['front_delts', 'side_delts', 'rear_delts'], arms: ['biceps', 'triceps'], quads: ['quadriceps'], hamstrings: ['hamstrings'], glutes: ['glutes'], calves: ['calves'], core: ['abs_obliques', 'lower_back'] },
    secondaryWeight: 0.5, weeklyRange: weekly(), pm4SetsPerWeek: 1,
  },
  'strength.volume.sessionCap': { novice: 10, beginner: 12, intermediate: 14, advanced: 16 },
  'strength.interference': {
    notes: { avoid_high_lower_body: ['lower_knee', 'lower_hip'], avoid_grip_high: ['grip'], avoid_axial_high: ['axial'], week_unknown: ['lower_knee', 'lower_hip'] },
    neighborWindowHours: 36, touchThreshold: 2,
    perStructure: {
      lower_knee: { setsDelta: -1, rirDelta: 2, dropOptionalNeeds: ['isolation_lower', 'single_leg'] },
      lower_hip: { setsDelta: -1, rirDelta: 2, dropOptionalNeeds: ['isolation_lower', 'single_leg'] },
      grip: { excludeContributionAtLeast: 3, setsDelta: -1, rirDelta: 1, dropOptionalNeeds: ['carry'] },
      axial: { excludeContributionAtLeast: 3, setsDelta: 0, rirDelta: 1, dropOptionalNeeds: [] },
    },
  },
  'strength.substitution.fallbackNeeds': {
    hip_dominant: ['single_leg'], knee_dominant: ['single_leg'], single_leg: ['knee_dominant'], pull_vertical: ['pull_horizontal'], pull_horizontal: ['pull_vertical'],
    push_horizontal: ['push_vertical'], push_vertical: ['push_horizontal'], trunk: [], carry: [], isolation_upper: [], isolation_lower: [],
  },
  'strength.topSet': { stimuli: ['strength_heavy'], levels: ['advanced'], backoffSets: 3, backoffLoadFraction: 0.9 },
  'strength.maxEffort.threshold': 0.9,
  'strength.proposals.max': 2,
};

export function strengthParameters(overrides: Partial<Record<StrengthParamId, unknown>> = {}) {
  // Cliquet G1 (spec 09 §6) : un seuil numérique G1 déclare son sens prudent et sa référence approuvée.
  // Seuil d'effort maximal : plus BAS = plus de séries soumises à l'éligibilité = plus prudent.
  const ratchet: Partial<Record<StrengthParamId, { safeDirection: 'increase' | 'decrease'; approvedBaseline: number }>> = {
    'strength.maxEffort.threshold': { safeDirection: 'decrease', approvedBaseline: 0.9 },
  };
  return (Object.keys(STRENGTH_PARAMETER_SCHEMAS) as StrengthParamId[]).map((pid) => param(pid, (overrides[pid] ?? STRENGTH_TEST_VALUES[pid]) as ParameterValue, STRENGTH_PARAMETER_SCHEMAS[pid].governance as GovernanceClass, ratchet[pid] ?? {}));
}

export function strengthRules() {
  const g1 = { nature: 'SAFETY' as const, governance: 'G1' as const, category: 'safety' as const };
  return [
    rule(STRENGTH_RULES.sessionCap.id, g1),
    rule(STRENGTH_RULES.intensity.id, { nature: 'TECHNICAL', governance: 'G4', category: 'intensity' }),
    rule(STRENGTH_RULES.rampup.id, { nature: 'PROGRAMMING_HEURISTIC', governance: 'G2', category: 'structure' }),
    rule(STRENGTH_RULES.loadMode.id, { nature: 'TECHNICAL', governance: 'G4', category: 'technical' }),
    rule(STRENGTH_RULES.noviceTechnical.id, g1),
    rule(STRENGTH_RULES.maxEffort.id, { ...g1, category: 'eligibility' }),
  ];
}

export function strengthRulesetDocument(overrides: Partial<Record<StrengthParamId, unknown>> = {}): RulesetDocumentInput {
  const base = testRulesetDocumentWithDuplicate();
  return { ...base, rulesetVersion: '0.2.0-strength-test', parameters: [...base.parameters, ...strengthParameters(overrides)], rules: [...base.rules, ...strengthRules()] };
}
