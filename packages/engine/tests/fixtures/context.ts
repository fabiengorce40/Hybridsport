import type { ValidationContext, ValidatorDeps } from '../../src/index.js';
import { ENGINE_VERSION } from '../../src/index.js';
import { PRESETS } from './catalog.js';
import { testCatalog, testRuleset } from './load.js';

export function presetEquipment(id: string): string[] {
  return [...(PRESETS?.find((p) => p.id === id)?.equipment ?? [])];
}

export function baseContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return {
    programStatus: 'active', eligibility: 'eligible', athleteLevel: 'intermediate',
    availableEquipment: presetEquipment('preset.commercial_gym'),
    restrictions: [], areaRestrictions: [], restrictedMovements: [], excludedExercises: [], dayAvailable: true,
    ...overrides,
  };
}

export function deps(): ValidatorDeps {
  return { catalog: testCatalog(), ruleset: testRuleset(), engineVersion: ENGINE_VERSION };
}

export function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object') { Object.values(v).forEach(deepFreeze); Object.freeze(v); }
  return v;
}
