/**
 * Gouvernance H2 TEST_ONLY / SIMULATION_ONLY — SOURCE UNIQUE des valeurs de démonstration de la composition HYROX H2.
 *
 * Toutes les valeurs sont des DONNÉES DE TEST (statut `draft`, provisoires, aucune approbation), jamais des décisions :
 * ni doses d'entraînement validées, ni normes de compétition, ni ordre officiel de l'épreuve (l'ordre ci-dessous est
 * ARBITRAIRE : alphabétique). En PRODUCTION, aucune n'est utilisable (fail-closed). Module autonome : il ne dépend que
 * des sources du paquet et du domaine (aucun harnais de test), pour être réutilisable par le planificateur.
 */
import type { ParameterValue, RulesetDocumentInput } from '@hybridsport/domain';
import type { HrParamId } from '../src/index.js';

type ParamInput = RulesetDocumentInput['parameters'][number];

/* technical-constant: TEST_ONLY — tout le bloc de valeurs ci-dessous (aucune n'est approuvée ni sourcée) */
const m = (value: number) => ({ kind: 'distance_m' as const, value });
const reps = (value: number) => ({ kind: 'reps' as const, value });
const rate = (fast: number, typical: number, slow: number) => ({ intermediate: { fast, typical, slow }, advanced: { fast: fast * 1.15, typical: typical * 1.15, slow: slow * 1.15 } });
export const TEST_H2_STATIONS = ['burpee_broad_jump', 'farmers_carry', 'row', 'sandbag_lunge', 'skierg', 'sled_pull', 'sled_push', 'wall_ball'] as const;
const EXERCISE_OF: Readonly<Record<(typeof TEST_H2_STATIONS)[number], string>> = {
  burpee_broad_jump: 'ex.burpee_broad_jump', farmers_carry: 'ex.farmers_carry', row: 'ex.row_erg', sandbag_lunge: 'ex.sandbag_lunge',
  skierg: 'ex.skierg', sled_pull: 'ex.sled_pull', sled_push: 'ex.sled_push', wall_ball: 'ex.wall_ball',
};
const SPECIFIC_STRUCTURE = ['warmup', 'main', 'cooldown'];

export const TEST_H2: { readonly [K in HrParamId]?: unknown } = {
  'hybrid_race.h2.roles': ['station_capacity', 'strength_endurance', 'mixed_station_conditioning', 'compromised_running', 'partial_simulation'],
  'hybrid_race.h2.roleStructures': {
    station_capacity: ['station_repeats'], strength_endurance: ['station_circuit', 'station_repeats'], mixed_station_conditioning: ['station_circuit'],
    compromised_running: ['run_station_alternation'], partial_simulation: ['partial_sequence'],
  },
  'hybrid_race.h2.sessionStructure': {
    station_capacity: SPECIFIC_STRUCTURE, strength_endurance: SPECIFIC_STRUCTURE, mixed_station_conditioning: SPECIFIC_STRUCTURE,
    compromised_running: SPECIFIC_STRUCTURE, partial_simulation: SPECIFIC_STRUCTURE,
  },
  'hybrid_race.h2.stationPool': TEST_H2_STATIONS.map((stationId) => ({ stationId, exerciseId: EXERCISE_OF[stationId], reviewRef: 'TEST-ONLY' })),
  'hybrid_race.h2.stationDoses': {
    burpee_broad_jump: { intermediate: { dose: m(40) }, advanced: { dose: m(60) } },
    farmers_carry: { intermediate: { dose: m(100), loadKg: 24 }, advanced: { dose: m(150), loadKg: 32 } },
    row: { intermediate: { dose: m(500) }, advanced: { dose: m(750) } },
    sandbag_lunge: { intermediate: { dose: m(50), loadKg: 10 }, advanced: { dose: m(75), loadKg: 20 } },
    skierg: { intermediate: { dose: m(500) }, advanced: { dose: m(750) } },
    sled_pull: { intermediate: { dose: m(25), loadKg: 60 }, advanced: { dose: m(40), loadKg: 80 } },
    sled_push: { intermediate: { dose: m(25), loadKg: 80 }, advanced: { dose: m(40), loadKg: 100 } },
    wall_ball: { intermediate: { dose: reps(30), loadKg: 4 }, advanced: { dose: reps(50), loadKg: 6 } },
  },
  'hybrid_race.h2.runSegment': { intermediate: { distanceM: 800 }, advanced: { distanceM: 1000 } },
  'hybrid_race.h2.runExercise': 'ex.easy_run',
  'hybrid_race.h2.structureVolume': {
    station_repeats: { intermediate: [{ rounds: 5, stations: 1 }, { rounds: 3, stations: 1 }], advanced: [{ rounds: 6, stations: 1 }] },
    station_circuit: { intermediate: [{ rounds: 4, stations: 3 }, { rounds: 4, stations: 2 }, { rounds: 2, stations: 2 }], advanced: [{ rounds: 5, stations: 3 }] },
    run_station_alternation: { intermediate: [{ rounds: 3, stations: 2 }, { rounds: 2, stations: 2 }, { rounds: 1, stations: 2 }], advanced: [{ rounds: 4, stations: 2 }] },
    partial_sequence: { intermediate: [{ rounds: 1, stations: 4 }, { rounds: 1, stations: 2 }], advanced: [{ rounds: 1, stations: 4 }] },
  },
  'hybrid_race.h2.workRates': {
    'ex.burpee_broad_jump': { unit: 'distance_m', rate: rate(14, 11, 8) },
    'ex.farmers_carry': { unit: 'distance_m', rate: rate(90, 70, 50) },
    'ex.row_erg': { unit: 'distance_m', rate: rate(280, 240, 200) },
    'ex.sandbag_lunge': { unit: 'distance_m', rate: rate(22, 16, 12) },
    'ex.skierg': { unit: 'distance_m', rate: rate(260, 225, 190) },
    'ex.sled_pull': { unit: 'distance_m', rate: rate(20, 14, 9) },
    'ex.sled_push': { unit: 'distance_m', rate: rate(22, 15, 10) },
    'ex.wall_ball': { unit: 'reps', rate: rate(24, 18, 13) },
    'ex.easy_run': { unit: 'distance_m', rate: rate(230, 200, 170) },
  },
  'hybrid_race.h2.timeCapMargin': 0.15,
  'hybrid_race.h2.timeDomains': {
    station_capacity: { minS: 300, maxS: 1800 }, strength_endurance: { minS: 480, maxS: 2100 }, mixed_station_conditioning: { minS: 480, maxS: 2100 },
    compromised_running: { minS: 600, maxS: 2700 }, partial_simulation: { minS: 600, maxS: 2700 },
  },
  'hybrid_race.h2.toleranceProfile': 'for_time',
  'hybrid_race.h2.eligibleLevels': ['intermediate', 'advanced'],
  'hybrid_race.h2.technicalUnderFatigue': { maxTechnicalCost: { intermediate: 1, advanced: 2 } },
  // ARBITRAIRE (ordre alphabétique des identifiants de test) : ce n'est PAS l'ordre officiel de l'épreuve.
  'hybrid_race.h2.raceSequence': [...TEST_H2_STATIONS],
  'hybrid_race.h2.historyPolicy': { recencyDays: 7, abandoned: 'exclude_stations', poorly_tolerated: 'exclude_stations', pain: 'refuse' },
  'hybrid_race.h2.neighbourPolicy': { avoidNeighbourLevels: ['high'] },
  'hybrid_race.h2.hybridPlanning': true,
};

const GOVERNANCE: Readonly<Record<string, 'G1' | 'G2' | 'G3'>> = {
  'hybrid_race.h2.roles': 'G2', 'hybrid_race.h2.roleStructures': 'G2', 'hybrid_race.h2.sessionStructure': 'G2', 'hybrid_race.h2.stationPool': 'G1',
  'hybrid_race.h2.stationDoses': 'G1', 'hybrid_race.h2.runSegment': 'G1', 'hybrid_race.h2.runExercise': 'G2', 'hybrid_race.h2.structureVolume': 'G2',
  'hybrid_race.h2.workRates': 'G2', 'hybrid_race.h2.timeCapMargin': 'G2', 'hybrid_race.h2.timeDomains': 'G2', 'hybrid_race.h2.toleranceProfile': 'G3',
  'hybrid_race.h2.eligibleLevels': 'G1', 'hybrid_race.h2.technicalUnderFatigue': 'G1', 'hybrid_race.h2.raceSequence': 'G1', 'hybrid_race.h2.historyPolicy': 'G2',
  'hybrid_race.h2.neighbourPolicy': 'G2', 'hybrid_race.h2.hybridPlanning': 'G1',
};

/** Paramètres H2 TEST_ONLY (draft, provisoires). `overrides[id] = null` ⇒ paramètre ABSENT ; autre valeur ⇒ remplacée. */
export function h2Parameters(overrides: { readonly [K in HrParamId]?: unknown } = {}, extra: Partial<ParamInput> = {}): ParamInput[] {
  const values: Record<string, unknown> = { ...TEST_H2, ...overrides };
  return Object.entries(values).flatMap(([id, value]) => (value === null || value === undefined || !(id in GOVERNANCE) ? [] : [{
    id, value: value as ParameterValue, governance: GOVERNANCE[id] as 'G1' | 'G2' | 'G3',
    version: '0.1.0', modifiedAt: '2026-10-06', status: 'draft' as const, confidence: 'provisional' as const, provisional: true,
    source: { kind: 'internal_hypothesis' as const }, justification: 'TEST-ONLY : valeur de démonstration H2, aucune décision.',
    ...extra,
  }]));
}

/** Marques SIMULATION_ONLY à tracer quand ces valeurs servent hors des tests unitaires (simulation de semaines). */
export const H2_TEST_GOVERNANCE_MARK = 'hybrid_race.h2.testGovernance';
