/**
 * CATALOGUE DE TEST de la musculation : le mini catalogue du CORE + des variantes machine / poulie /
 * haltères et de l'isolation. Métadonnées plausibles, NON relues (draft) : elles servent à exercer le
 * moteur, jamais à la production.
 */
import type { CatalogDocumentInput, ExerciseInput } from '@hybridsport/domain';
import { EQUIPMENT, EXERCISES, PRESETS, testCatalogDocument } from '../../../engine/tests/fixtures/catalog.js';

const bodyweight = { allOf: [], anyOf: [] };

function sx(id: string, e: Partial<ExerciseInput> & Pick<ExerciseInput, 'patterns' | 'muscles' | 'equipment' | 'family' | 'equivalenceClass'>): ExerciseInput {
  return {
    id, canonicalName: { fr: id }, status: 'active', disciplines: ['strength'], compound: true, laterality: 'bilateral', movementType: 'strength',
    loadable: true, loadModel: 'machine_stack',
    cost: { localMuscular: 2, systemic: 1, cardiovascular: 0, technical: 0, impact: 0, axialLoad: 0, grip: 0 },
    skillLevel: 1, stability: 3, loadCeiling: 2,
    timing: { secondsPerRep: { min: 2, typical: 3, max: 4 }, setupS: 30, loadChangeS: 10, transitionClass: 'machine' },
    measurableMetrics: ['reps', 'load'], defaultPrescriptionType: 'sets', contraindicationTags: [], painSensitiveAreas: [], substitutions: [],
    relevance: { strength: 2 }, meta: { version: 1, modifiedAt: '2026-09-26', reviewStatus: 'draft' },
    ...e,
  };
}

const iso = { compound: false, loadCeiling: 1, cost: { localMuscular: 2, systemic: 0, cardiovascular: 0, technical: 0, impact: 0, axialLoad: 0, grip: 0 } } as const;
const cableTiming = { secondsPerRep: { min: 2, typical: 3, max: 4 }, setupS: 20, loadChangeS: 10, transitionClass: 'machine' } as const;
const dbTiming = { secondsPerRep: { min: 2, typical: 3, max: 4 }, setupS: 20, loadChangeS: 15, transitionClass: 'portable' } as const;

export const EXTRA_EQUIPMENT: CatalogDocumentInput['taxonomy']['equipment'] = [
  { id: 'hack_squat', class: 'machine' }, { id: 'leg_extension_machine', class: 'machine' }, { id: 'calf_machine', class: 'machine' },
  { id: 'hip_thrust_machine', class: 'machine' }, { id: 'shoulder_press_machine', class: 'machine' }, { id: 'pec_deck', class: 'machine' },
  { id: 'lateral_raise_machine', class: 'machine' },
];

export const EXTRA_EXERCISES: ExerciseInput[] = [
  sx('ex.hack_squat', { patterns: { primary: 'squat', secondary: [] }, muscles: { primary: ['quadriceps', 'glutes'], secondary: ['adductors'] }, equipment: { allOf: ['hack_squat'], anyOf: [] }, family: 'fam.hack_squat', equivalenceClass: 'eq.hack_squat', loadModel: 'plate_loaded', loadCeiling: 3, cost: { localMuscular: 3, systemic: 2, cardiovascular: 1, technical: 0, impact: 0, axialLoad: 1, grip: 0 }, painSensitiveAreas: ['knee'], contraindicationTags: ['no_deep_knee_flexion'], maxEffortEligibility: { minLevel: 'intermediate' } }),
  sx('ex.leg_extension', { patterns: { primary: 'isolation_lower', secondary: [] }, muscles: { primary: ['quadriceps'], secondary: [] }, equipment: { allOf: ['leg_extension_machine'], anyOf: [] }, family: 'fam.leg_extension', equivalenceClass: 'eq.leg_extension', ...iso, painSensitiveAreas: ['knee'] }),
  sx('ex.machine_calf_raise', { patterns: { primary: 'isolation_lower', secondary: [] }, muscles: { primary: ['calves'], secondary: [] }, equipment: { allOf: ['calf_machine'], anyOf: [] }, family: 'fam.calf_raise', equivalenceClass: 'eq.calf_machine', ...iso, relevance: { strength: 2, running_support: 3 } }),
  sx('ex.db_calf_raise', { patterns: { primary: 'isolation_lower', secondary: [] }, muscles: { primary: ['calves'], secondary: [] }, equipment: { allOf: ['dumbbells'], anyOf: [] }, family: 'fam.calf_raise_free', equivalenceClass: 'eq.calf_db', ...iso, loadModel: 'dumbbell_pair', stability: 1, timing: dbTiming, relevance: { strength: 2, running_support: 3 } }),
  sx('ex.hip_thrust_barbell', { patterns: { primary: 'hinge', secondary: [] }, muscles: { primary: ['glutes'], secondary: ['hamstrings'] }, equipment: { allOf: ['barbell', 'plates', 'bench'], anyOf: [] }, family: 'fam.hip_thrust', equivalenceClass: 'eq.hip_thrust_barbell', loadModel: 'barbell', stability: 2, loadCeiling: 3, cost: { localMuscular: 2, systemic: 1, cardiovascular: 0, technical: 1, impact: 0, axialLoad: 0, grip: 0 }, timing: { secondsPerRep: { min: 2, typical: 3, max: 4 }, setupS: 60, loadChangeS: 20, transitionClass: 'station_fixed' }, relevance: { strength: 2, running_support: 2, hybrid_race: 2 } }),
  sx('ex.hip_thrust_machine', { patterns: { primary: 'hinge', secondary: [] }, muscles: { primary: ['glutes'], secondary: ['hamstrings'] }, equipment: { allOf: ['hip_thrust_machine'], anyOf: [] }, family: 'fam.hip_thrust_machine', equivalenceClass: 'eq.hip_thrust_machine', loadCeiling: 3, relevance: { strength: 2, running_support: 2 } }),
  sx('ex.barbell_ohp', { patterns: { primary: 'push_vertical', secondary: [] }, muscles: { primary: ['front_delts', 'triceps'], secondary: ['side_delts', 'abs_obliques'] }, equipment: { allOf: ['barbell', 'plates', 'rack'], anyOf: [] }, family: 'fam.ohp', equivalenceClass: 'eq.ohp_barbell', loadModel: 'barbell', stability: 1, loadCeiling: 3, skillLevel: 2, cost: { localMuscular: 2, systemic: 2, cardiovascular: 1, technical: 2, impact: 0, axialLoad: 2, grip: 1 }, timing: { secondsPerRep: { min: 2, typical: 3, max: 4 }, setupS: 60, loadChangeS: 20, transitionClass: 'station_fixed' }, contraindicationTags: ['no_overhead'], movementTags: ['overhead'], painSensitiveAreas: ['shoulder', 'lower_back'], maxEffortEligibility: { minLevel: 'intermediate' }, relevance: { strength: 3, crosstraining: 2 } }),
  sx('ex.machine_shoulder_press', { patterns: { primary: 'push_vertical', secondary: [] }, muscles: { primary: ['front_delts', 'triceps'], secondary: ['side_delts'] }, equipment: { allOf: ['shoulder_press_machine'], anyOf: [] }, family: 'fam.shoulder_press_machine', equivalenceClass: 'eq.shoulder_press_machine', contraindicationTags: ['no_overhead'], movementTags: ['overhead'], painSensitiveAreas: ['shoulder'] }),
  sx('ex.db_curl', { patterns: { primary: 'isolation_upper', secondary: [] }, muscles: { primary: ['biceps'], secondary: ['forearms_grip'] }, equipment: { allOf: ['dumbbells'], anyOf: [] }, family: 'fam.curl', equivalenceClass: 'eq.curl_db', ...iso, loadModel: 'dumbbell_pair', stability: 1, timing: dbTiming }),
  sx('ex.cable_curl', { patterns: { primary: 'isolation_upper', secondary: [] }, muscles: { primary: ['biceps'], secondary: ['forearms_grip'] }, equipment: { allOf: ['cable'], anyOf: [] }, family: 'fam.curl_cable', equivalenceClass: 'eq.curl_cable', ...iso, stability: 2, timing: cableTiming }),
  sx('ex.cable_triceps_pushdown', { patterns: { primary: 'isolation_upper', secondary: [] }, muscles: { primary: ['triceps'], secondary: [] }, equipment: { allOf: ['cable'], anyOf: [] }, family: 'fam.triceps_extension', equivalenceClass: 'eq.pushdown', ...iso, stability: 3, timing: cableTiming }),
  sx('ex.db_lateral_raise', { patterns: { primary: 'isolation_upper', secondary: [] }, muscles: { primary: ['side_delts'], secondary: [] }, equipment: { allOf: ['dumbbells'], anyOf: [] }, family: 'fam.lateral_raise', equivalenceClass: 'eq.lateral_raise_db', ...iso, loadModel: 'dumbbell_pair', stability: 1, timing: dbTiming }),
  sx('ex.cable_lateral_raise', { patterns: { primary: 'isolation_upper', secondary: [] }, muscles: { primary: ['side_delts'], secondary: [] }, equipment: { allOf: ['cable'], anyOf: [] }, family: 'fam.lateral_raise_cable', equivalenceClass: 'eq.lateral_raise_cable', ...iso, stability: 2, timing: cableTiming }),
  sx('ex.machine_lateral_raise', { patterns: { primary: 'isolation_upper', secondary: [] }, muscles: { primary: ['side_delts'], secondary: [] }, equipment: { allOf: ['lateral_raise_machine'], anyOf: [] }, family: 'fam.lateral_raise_machine', equivalenceClass: 'eq.lateral_raise_machine', ...iso, stability: 3 }),
  sx('ex.pec_deck', { patterns: { primary: 'isolation_upper', secondary: [] }, muscles: { primary: ['chest'], secondary: ['front_delts'] }, equipment: { allOf: ['pec_deck'], anyOf: [] }, family: 'fam.fly_machine', equivalenceClass: 'eq.pec_deck', ...iso, stability: 3 }),
  sx('ex.cable_pallof_press', { patterns: { primary: 'anti_rotation', secondary: [] }, muscles: { primary: ['abs_obliques'], secondary: [] }, equipment: { allOf: ['cable'], anyOf: [] }, family: 'fam.pallof', equivalenceClass: 'eq.pallof_cable', movementType: 'isometric', ...iso, stability: 2, timing: cableTiming, relevance: { strength: 2, hybrid_race: 2, running_support: 2 } }),
  sx('ex.dead_bug', { patterns: { primary: 'anti_extension', secondary: [] }, muscles: { primary: ['abs_obliques'], secondary: [] }, equipment: bodyweight, family: 'fam.dead_bug', equivalenceClass: 'eq.dead_bug', compound: false, loadable: false, loadModel: undefined, loadCeiling: 0, stability: 2, timing: { secondsPerRep: { min: 2, typical: 3, max: 4 }, setupS: 0, transitionClass: 'floor' }, relevance: { strength: 1, running_support: 2 } }),
  sx('ex.db_rdl', { patterns: { primary: 'hinge', secondary: [] }, muscles: { primary: ['hamstrings', 'glutes'], secondary: ['lower_back', 'forearms_grip'] }, equipment: { allOf: ['dumbbells'], anyOf: [] }, family: 'fam.hinge_bilateral', equivalenceClass: 'eq.rdl_db', loadModel: 'dumbbell_pair', stability: 1, loadCeiling: 2, cost: { localMuscular: 2, systemic: 2, cardiovascular: 1, technical: 1, impact: 0, axialLoad: 1, grip: 2 }, timing: dbTiming, painSensitiveAreas: ['lower_back'], relevance: { strength: 2, running_support: 3, hybrid_race: 2 } }),
  sx('ex.walking_lunge_db', { patterns: { primary: 'lunge', secondary: [] }, muscles: { primary: ['quadriceps', 'glutes'], secondary: ['adductors', 'forearms_grip'] }, equipment: { allOf: ['dumbbells'], anyOf: [] }, family: 'fam.lunge_walking', equivalenceClass: 'eq.lunge_db', laterality: 'alternating', loadModel: 'dumbbell_pair', stability: 1, loadCeiling: 2, cost: { localMuscular: 2, systemic: 2, cardiovascular: 1, technical: 1, impact: 0, axialLoad: 1, grip: 1 }, timing: dbTiming, painSensitiveAreas: ['knee'], relevance: { strength: 2, running_support: 3, hybrid_race: 3 } }),
  sx('ex.shoulder_mobility_flow', { patterns: { primary: 'mobility', secondary: ['push_horizontal', 'push_vertical'] }, muscles: { primary: ['rear_delts'], secondary: ['upper_back_traps'] }, equipment: bodyweight, family: 'fam.mobility_shoulder', equivalenceClass: 'eq.mobility_shoulder', compound: false, loadable: false, loadModel: undefined, movementType: 'mobility', loadCeiling: 0, stability: 3, cost: { localMuscular: 0, systemic: 0, cardiovascular: 0, technical: 0, impact: 0, axialLoad: 0, grip: 0 }, timing: { setupS: 0, transitionClass: 'floor' }, measurableMetrics: ['time'], defaultPrescriptionType: 'mobility', relevance: {} }),
  sx('ex.lower_mobility_flow', { patterns: { primary: 'mobility', secondary: ['squat', 'hinge'] }, muscles: { primary: ['hip_flexors'], secondary: ['hamstrings'] }, equipment: bodyweight, family: 'fam.mobility_lower', equivalenceClass: 'eq.mobility_lower', compound: false, loadable: false, loadModel: undefined, movementType: 'mobility', loadCeiling: 0, stability: 3, cost: { localMuscular: 0, systemic: 0, cardiovascular: 0, technical: 0, impact: 0, axialLoad: 0, grip: 0 }, timing: { setupS: 0, transitionClass: 'floor' }, measurableMetrics: ['time'], defaultPrescriptionType: 'mobility', relevance: {} }),
];

const FULL_GYM = [...(PRESETS?.find((p) => p.id === 'preset.commercial_gym')?.equipment ?? []), ...EXTRA_EQUIPMENT.map((e) => e.id)];

export const STRENGTH_PRESETS: NonNullable<CatalogDocumentInput['presets']> = [
  ...(PRESETS ?? []),
  { id: 'preset.full_gym', name: 'Salle complète (charges libres, machines, poulies)', editable: true, equipment: FULL_GYM },
];

export const ALL_PRESET_IDS = STRENGTH_PRESETS.map((p) => p.id);

export function strengthCatalogDocument(): CatalogDocumentInput {
  const base = testCatalogDocument();
  return { ...base, catalogVersion: '0.2.0-strength-test', taxonomy: { ...base.taxonomy, equipment: [...EQUIPMENT, ...EXTRA_EQUIPMENT] }, exercises: [...EXERCISES, ...EXTRA_EXERCISES], presets: STRENGTH_PRESETS };
}

export function presetEquipment(id: string): string[] {
  return [...(STRENGTH_PRESETS.find((p) => p.id === id)?.equipment ?? [])];
}
