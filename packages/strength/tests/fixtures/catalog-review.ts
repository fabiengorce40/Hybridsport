/**
 * Configuration de REVUE du catalogue de test (attentes de relecture, provisoires, non biomécaniques :
 * elles déclenchent une relecture, jamais une correction automatique).
 */
import type { CatalogReviewConfig } from '../../src/index.js';
import { STRENGTH_TEST_VALUES } from './ruleset.js';

export const TEST_CATALOG_REVIEW: CatalogReviewConfig = {
  maxPrimaryMuscles: 3,
  isolationMaxPrimaryGroups: 1,
  expectedSecondary: {
    pull_vertical: ['biceps'], pull_horizontal: ['biceps'],
    push_horizontal: ['triceps'], push_vertical: ['triceps'],
  },
  stabilityByEquipmentClass: { machine: { min: 2, max: 3 }, cable: { min: 1, max: 3 }, barbell: { min: 1, max: 2 }, dumbbell: { min: 0, max: 2 }, kettlebell: { min: 0, max: 2 } },
  isolationMaxLoadCeiling: 1,
  progressionFamilyMovementTypes: ['strength', 'gymnastic'],
  incrementByLoadModel: STRENGTH_TEST_VALUES['strength.load.defaultIncrements'] as Record<string, number>,
  muscleGroups: (STRENGTH_TEST_VALUES['strength.volume'] as { muscleGroups: Record<string, string[]> }).muscleGroups,
  acknowledged: [],
};
