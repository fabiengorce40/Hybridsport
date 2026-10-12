/**
 * C4.2 — EXTENSION DE CATALOGUE CROSS-TRAINING (TEST_ONLY, statut draft, non relue par un expert).
 *
 * Mouvements d'échauffement au poids du corps et de mobilité (épaules, thoracique, hanches) ajoutés au SEUL catalogue du
 * port Cross-training : le catalogue du CORE (`testCatalogDocument`) et celui de Strength ne sont PAS modifiés, donc
 * aucune prescription Strength / HYROX ne peut changer. `disciplines: ['crosstraining']` : marqueur respecté par Strength
 * (A2) si les catalogues venaient à être unifiés. Métadonnées plausibles, choisies pour exercer les critères
 * d'éligibilité (matériel, impact, zones sensibles, restrictions) — jamais des valeurs validées.
 */
import type { CatalogDocumentInput, ExerciseInput } from '@hybridsport/domain';
import { testCatalogDocument } from '../../engine/tests/fixtures/catalog.js';

const bodyweight = { allOf: [], anyOf: [] };
const ZERO: ExerciseInput['cost'] = { localMuscular: 0, systemic: 0, cardiovascular: 0, technical: 0, impact: 0, axialLoad: 0, grip: 0 };

function cx(id: string, e: Partial<ExerciseInput> & Pick<ExerciseInput, 'patterns' | 'muscles' | 'family' | 'equivalenceClass' | 'movementType'>): ExerciseInput {
  return {
    id, canonicalName: { fr: id }, status: 'active', disciplines: ['crosstraining'], compound: false, laterality: 'bilateral',
    loadable: false, equipment: bodyweight, cost: ZERO, skillLevel: 1, stability: 1, loadCeiling: 0,
    timing: { setupS: 0, transitionClass: 'floor' }, measurableMetrics: ['time'], defaultPrescriptionType: 'mobility',
    contraindicationTags: [], painSensitiveAreas: [], substitutions: [], relevance: { crosstraining: 1 },
    meta: { version: 1, modifiedAt: '2026-10-12', reviewStatus: 'draft' },
    ...e,
  };
}

export const C4_CATALOG_EXERCISES: ExerciseInput[] = [
  // Élévation de la température, sans impact (préférée aux niveaux où l'impact est plafonné).
  cx('ex.march_in_place', { patterns: { primary: 'locomotion', secondary: [] }, muscles: { primary: ['hip_flexors', 'calves'], secondary: [] }, family: 'fam.warmup_march', equivalenceClass: 'eq.warmup_march', movementType: 'monostructural', cost: { ...ZERO, cardiovascular: 1 }, defaultPrescriptionType: 'timed' }),
  // Élévation de la température AVEC impact : zones sensibles genou / cheville, restrictions sauts et impact.
  cx('ex.jumping_jack', { patterns: { primary: 'jumping', secondary: [] }, muscles: { primary: ['calves'], secondary: ['side_delts'] }, family: 'fam.warmup_jack', equivalenceClass: 'eq.warmup_jack', movementType: 'plyometric', cost: { ...ZERO, cardiovascular: 2, impact: 2, localMuscular: 1 }, defaultPrescriptionType: 'timed', painSensitiveAreas: ['knee', 'ankle_foot'], contraindicationTags: ['no_impact', 'no_jumping'], movementTags: ['jumping'] }),
  // Préparation dynamique bas du corps (hanches).
  cx('ex.leg_swings', { patterns: { primary: 'mobility', secondary: ['lunge', 'hinge'] }, muscles: { primary: ['hip_flexors', 'hamstrings'], secondary: ['adductors'] }, family: 'fam.warmup_leg_swing', equivalenceClass: 'eq.warmup_leg_swing', movementType: 'mobility', painSensitiveAreas: ['hip_groin'] }),
  // Préparation dynamique chaîne postérieure + appui des mains (poignets, épaules, bas du dos).
  cx('ex.inchworm', { patterns: { primary: 'hinge', secondary: ['push_horizontal', 'anti_extension'] }, muscles: { primary: ['hamstrings'], secondary: ['chest', 'abs_obliques', 'front_delts'] }, family: 'fam.warmup_inchworm', equivalenceClass: 'eq.warmup_inchworm', movementType: 'gymnastic', cost: { ...ZERO, localMuscular: 1, technical: 1 }, defaultPrescriptionType: 'timed', painSensitiveAreas: ['wrist_hand', 'shoulder', 'lower_back'], movementTags: ['bending'] }),
  // Préparation dynamique épaules.
  cx('ex.arm_circles', { patterns: { primary: 'mobility', secondary: ['push_vertical', 'pull_vertical'] }, muscles: { primary: ['side_delts', 'rear_delts'], secondary: ['front_delts'] }, family: 'fam.warmup_arm_circles', equivalenceClass: 'eq.warmup_arm_circles', movementType: 'mobility', painSensitiveAreas: ['shoulder'] }),
  // Mobilité de retour au calme : épaules, région thoracique.
  cx('ex.shoulder_mobility_flow', { patterns: { primary: 'mobility', secondary: ['push_vertical', 'pull_horizontal'] }, muscles: { primary: ['rear_delts'], secondary: ['upper_back_traps', 'chest'] }, family: 'fam.mobility_shoulder', equivalenceClass: 'eq.mobility_shoulder', movementType: 'mobility', painSensitiveAreas: ['shoulder'] }),
  cx('ex.thoracic_mobility_flow', { patterns: { primary: 'mobility', secondary: ['rotation', 'pull_horizontal'] }, muscles: { primary: ['upper_back_traps'], secondary: ['lats', 'abs_obliques'] }, family: 'fam.mobility_thoracic', equivalenceClass: 'eq.mobility_thoracic', movementType: 'mobility', painSensitiveAreas: ['upper_back'] }),
];

/** Catalogue du port Cross-training : catalogue de test du CORE + extension C4.2 (version SemVer distincte : 0.1.1-test, traçable dans la provenance des séances). */
export function ctCatalogDocument(): CatalogDocumentInput {
  const base = testCatalogDocument();
  return { ...base, catalogVersion: '0.1.1-test', exercises: [...base.exercises, ...C4_CATALOG_EXERCISES] };
}
