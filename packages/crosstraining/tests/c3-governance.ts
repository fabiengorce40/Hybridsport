/**
 * Gouvernance C3 TEST_ONLY / SIMULATION_ONLY — SOURCE UNIQUE des valeurs de démonstration de la composition C3.
 *
 * Toutes les valeurs sont des DONNÉES DE TEST (maturité EXPERT_PROPOSED, mode CANDIDATE + simulation), jamais des
 * décisions. Utilisées par les tests C3 et, explicitement étiquetées SIMULATION_ONLY, par l'environnement Beta 0
 * expérimental (via le planificateur). En PRODUCTION, aucune n'est résolue (jamais PRODUCTION_ELIGIBLE) : fail-closed.
 * Module autonome : il ne dépend que des sources du paquet (aucun harnais de test).
 */
import { CT_G1_POLICIES, CURRENT_CT_GOVERNANCE } from '../src/index.js';
import type { CtGovernance, CtParameter } from '../src/index.js';

/** Valeur candidate de test (EXPERT_PROPOSED, aucune approbation). */
const candidate = (p: CtParameter, value: unknown = { testOnly: true }): CtParameter => ({ ...p, value: { status: 'candidate', value: value as never }, maturity: 'EXPERT_PROPOSED', evidenceStatus: 'DECISION' });
const withParameter = (g: CtGovernance, id: string, f: (p: CtParameter) => CtParameter): CtGovernance => ({ ...g, parameters: g.parameters.map((p) => (p.parameterId === id ? f(p) : p)) });

/* technical-constant: TEST_ONLY — tout le bloc de valeurs ci-dessous (aucune n'est approuvée) */
const LEVEL_FACTORS = { novice: 0.6, beginner: 0.75, intermediate: 1, advanced: 1.2 } as const;
const rate = (fast: number, typical: number, slow: number) => Object.fromEntries(Object.entries(LEVEL_FACTORS).map(([l, f]) => [l, { fast: fast * f, typical: typical * f, slow: slow * f }]));
const reps = (value: number) => ({ kind: 'reps' as const, value });
const meters = (value: number) => ({ kind: 'distance_m' as const, value });

export const TEST_C3 = {
  'ct.stimulus.catalog': ['aerobic_capacity', 'threshold', 'anaerobic_intervals', 'mixed_modal_medium', 'muscular_endurance', 'strength_plus_conditioning', 'skill_plus_conditioning', 'long_chipper', 'benchmark'],
  'ct.stimulus.admissibleFormats': {
    aerobic_capacity: ['continuous', 'intervals', 'emom'], threshold: ['intervals'], anaerobic_intervals: ['intervals'],
    mixed_modal_medium: ['amrap', 'for_time', 'emom'], muscular_endurance: ['emom', 'amrap'], strength_plus_conditioning: ['for_time', 'amrap'], skill_plus_conditioning: ['emom'],
  },
  'ct.stimulus.timeDomains': {
    aerobic_capacity: { minS: 1200, maxS: 2400 }, threshold: { minS: 480, maxS: 1500 }, anaerobic_intervals: { minS: 360, maxS: 900 },
    mixed_modal_medium: { minS: 480, maxS: 900 }, muscular_endurance: { minS: 600, maxS: 1200 }, strength_plus_conditioning: { minS: 360, maxS: 720 },
  },
  'ct.stimulus.workRestRatios': { aerobic_capacity: { min: 2, max: 6 }, threshold: { min: 1, max: 4 }, anaerobic_intervals: { min: 0.3, max: 1 } },
  'ct.composition.sessionStructure': {
    aerobic_capacity: ['warmup', 'conditioning'], threshold: ['warmup', 'conditioning'], anaerobic_intervals: ['warmup', 'conditioning'],
    mixed_modal_medium: ['warmup', 'conditioning'], muscular_endurance: ['warmup', 'conditioning'],
    strength_plus_conditioning: ['warmup', 'strength', 'conditioning'], skill_plus_conditioning: ['warmup', 'skill', 'conditioning'],
  },
  'ct.composition.movementPool': ['ex.row_erg', 'ex.skierg', 'ex.air_squat', 'ex.reverse_lunge_bw', 'ex.box_jump', 'ex.wall_ball', 'ex.kb_swing', 'ex.push_up', 'ex.incline_push_up', 'ex.pull_up', 'ex.band_assisted_pull_up']
    .map((movementId) => ({ movementId, contentReviewRef: 'TEST-ONLY' })),
  'ct.composition.movementRoles': {
    aerobic_capacity: { continuous: ['monostructural'], intervals: ['monostructural'], emom: ['monostructural', 'lower_body'] },
    threshold: { intervals: ['monostructural'] }, anaerobic_intervals: { intervals: ['monostructural'] },
    mixed_modal_medium: { amrap: ['monostructural', 'lower_body', 'upper_pull'], for_time: ['monostructural', 'lower_body', 'upper_push'], emom: ['lower_body', 'upper_push'] },
    muscular_endurance: { emom: ['lower_body', 'upper_push', 'upper_pull'], amrap: ['lower_body', 'lower_body', 'upper_push'] },
  },
  'ct.dose.construction': {
    aerobic_capacity: {
      beginner: { continuous: { workS: 1200 }, intervals: { workS: 240, restS: 60, rounds: 5 }, emom: { minutes: 20, quantities: { monostructural: meters(40), lower_body: reps(4) } } },
      intermediate: { continuous: { workS: 1800 }, intervals: { workS: 300, restS: 60, rounds: 5 }, emom: { minutes: 24, quantities: { monostructural: meters(60), lower_body: reps(6) } } },
    },
    threshold: { beginner: { intervals: { workS: 180, restS: 120, rounds: 4 } }, intermediate: { intervals: { workS: 240, restS: 120, rounds: 4 } } },
    anaerobic_intervals: { beginner: { intervals: { workS: 30, restS: 90, rounds: 6 } }, intermediate: { intervals: { workS: 30, restS: 60, rounds: 10 } } },
    mixed_modal_medium: {
      novice: { amrap: { timeCapS: 480, quantities: { monostructural: meters(150), lower_body: reps(8), upper_pull: reps(4), upper_push: reps(5) } }, emom: { minutes: 10, quantities: { lower_body: reps(6), upper_push: reps(4) } } },
      beginner: {
        amrap: { timeCapS: 600, quantities: { monostructural: meters(200), lower_body: reps(10), upper_pull: reps(5), upper_push: reps(6) } },
        for_time: { rounds: 4, quantities: { monostructural: meters(200), lower_body: reps(10), upper_push: reps(6) } },
        emom: { minutes: 10, quantities: { lower_body: reps(5), upper_push: reps(3) } },
      },
      intermediate: {
        amrap: { timeCapS: 720, quantities: { monostructural: meters(250), lower_body: reps(15), upper_pull: reps(8), upper_push: reps(10) } },
        for_time: { rounds: 5, quantities: { monostructural: meters(250), lower_body: reps(15), upper_push: reps(10) } },
        emom: { minutes: 12, quantities: { lower_body: reps(6), upper_push: reps(4) } },
      },
    },
    muscular_endurance: {
      intermediate: {
        emom: { minutes: 15, quantities: { lower_body: reps(4), upper_push: reps(2), upper_pull: reps(2) } },
        amrap: { timeCapS: 900, quantities: { lower_body: reps(12), upper_push: reps(10) } },
      },
    },
    strength_plus_conditioning: { intermediate: { amrap: { timeCapS: 600, quantities: { monostructural: meters(200), lower_body: reps(10), upper_pull: reps(6) } } } },
  },
  'ct.estimation.workRates': {
    'ex.air_squat': { unit: 'reps', rate: rate(30, 25, 18) }, 'ex.reverse_lunge_bw': { unit: 'reps', rate: rate(24, 20, 14) }, 'ex.box_jump': { unit: 'reps', rate: rate(18, 15, 10) },
    'ex.wall_ball': { unit: 'reps', rate: rate(22, 18, 13) }, 'ex.kb_swing': { unit: 'reps', rate: rate(25, 20, 15) }, 'ex.push_up': { unit: 'reps', rate: rate(25, 20, 12) },
    'ex.incline_push_up': { unit: 'reps', rate: rate(28, 22, 15) }, 'ex.pull_up': { unit: 'reps', rate: rate(14, 10, 6) }, 'ex.band_assisted_pull_up': { unit: 'reps', rate: rate(14, 10, 7) },
    'ex.row_erg': { unit: 'distance_m', rate: rate(300, 250, 200) }, 'ex.skierg': { unit: 'distance_m', rate: rate(280, 230, 180) },
  },
  'ct.format.timeCapMargin': 0.2,
  'ct.format.emomDensity': { novice: 35, beginner: 40, intermediate: 45, advanced: 45 },
  'ct.safety.repsPerMovementCap': { novice: 60, beginner: 100, intermediate: 150, advanced: 200 },
  'ct.safety.jumpContactsCap': { novice: 20, beginner: 40, intermediate: 60, advanced: 80 },
  'ct.safety.technicalUnderFatigue': { maxTechnicalCost: { novice: 1, beginner: 1, intermediate: 2, advanced: 3 }, declaredSkillsAdmitted: true },
  'ct.safety.novicePolicy': { excludedStimuli: { novice: ['anaerobic_intervals'] } },
  'ct.history.recencyBand': 14,
  'ct.history.negativeResponse': { abandoned: 'exclude_movements', poorly_tolerated: 'exclude_movements', pain: 'refuse' },
  'ct.hybrid.policy': { avoidNeighbourLevels: ['high'] },
  'ct.load.implementStandards': { 'ex.kb_swing': { beginner: 12, intermediate: 16 }, 'ex.wall_ball': { beginner: 4, intermediate: 6 } },
  'ct.load.percentE1rmByStimulus': { testOnly: true },
} as const;
/* fin du bloc TEST_ONLY */

export interface C3GovOptions {
  /** Paramètres à laisser NON RÉSOLUS (valeur réelle du registre). */
  readonly unresolved?: readonly string[];
  /** Valeurs remplacées (TEST_ONLY). */
  readonly override?: Readonly<Record<string, unknown>>;
  /** Charges : CORE_EXT_C1 déclaré satisfait + standards d'implément (TEST_ONLY). */
  readonly loads?: boolean;
  /** Multisport : planificateur global déclaré satisfait + `ct.hybrid.policy` (TEST_ONLY). */
  readonly hybrid?: boolean;
}

/** Gouvernance TEST_ONLY C3 (voir en-tête). */
export function c3Governance(o: C3GovOptions = {}): CtGovernance {
  let g: CtGovernance = {
    ...CURRENT_CT_GOVERNANCE,
    g1Policies: Object.fromEntries(CT_G1_POLICIES.map((p) => [p, 'SIGNED'])) as CtGovernance['g1Policies'],
    technical: { ...CURRENT_CT_GOVERNANCE.technical, CT_CONTENT: 'SATISFIED', ...(o.loads ? { CORE_EXT_C1: 'SATISFIED' as const } : {}), ...(o.hybrid === false ? {} : { GLOBAL_PLANNER: 'SATISFIED' as const }) },
  };
  for (const id of ['ct.return.protocol', 'ct.safety.novelEccentricVolume', 'ct.history.anchorPolicy', 'ct.history.completionCriterion']) g = withParameter(g, id, (p: CtParameter) => candidate(p));
  const values: Record<string, unknown> = { ...TEST_C3, ...(o.override ?? {}) };
  for (const [id, v] of Object.entries(values)) {
    if (o.unresolved?.includes(id)) continue;
    if (!o.loads && id.startsWith('ct.load.')) continue;
    if (o.hybrid === false && id === 'ct.hybrid.policy') continue;
    g = withParameter(g, id, (p: CtParameter) => candidate(p, v));
  }
  return g;
}

export const C3_REQUESTS = ['ctSessionComposition', 'ctHybridPlanning', 'ctLoadedMovements'] as const;
