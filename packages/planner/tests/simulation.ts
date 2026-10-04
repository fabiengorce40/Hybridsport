/**
 * Valeurs de SIMULATION du planificateur (TEST_ONLY), source UNIQUE : écarts d'interférence par structure et
 * normalisation des doses (profil de demande standard). Aucune n'est approuvée : statut `draft`, provisoires ; une
 * lecture PRODUCTION les refuse (NOT_PRODUCTION_READY). Utilisées par les tests du planificateur et, explicitement
 * étiquetées SIMULATION_ONLY, par l'environnement expérimental Beta 0 d'app-core (jamais en production).
 */
import { loadRuleset } from '@hybridsport/engine';
import type { LoadedCatalog, LoadedRuleset } from '@hybridsport/engine';
import { testRuleset } from '../../engine/tests/fixtures/load.js';
import { param, testRulesetDocument } from '../../engine/tests/fixtures/ruleset.js';

// technical-constant: TEST_ONLY — normalisation des doses (profil de demande standard) ; aucune valeur approuvée
export const TEST_DOSE_NORMALIZATION = {
  strength: { working_set: { perUnit: 2, intensityBand: 'high' }, second: { perUnit: 0.05, intensityBand: 'moderate' } },
  running: { run_structure_work_second: { perUnit: 0.01, intensityBand: 'moderate' }, second: { perUnit: 0.01, intensityBand: 'moderate' }, meter: { perUnit: 0.004, intensityBand: 'moderate' } },
  crosstraining: { second: { perUnit: 0.03, intensityBand: 'high' }, rep: { perUnit: 0.2, intensityBand: 'high' } },
  hybrid_race: { meter: { perUnit: 0.03, intensityBand: 'high' }, rep: { perUnit: 0.5, intensityBand: 'high' }, second: { perUnit: 0.1, intensityBand: 'high' }, calorie: { perUnit: 0.5, intensityBand: 'high' } },
} as const;

/** Contenu + normalisation des doses TEST_ONLY (`null` ⇒ contenu inchangé : profil non dérivable). */
export function withDemand(content: { ruleset: LoadedRuleset; catalog: LoadedCatalog }, normalization: unknown = TEST_DOSE_NORMALIZATION, extra: Record<string, unknown> = {}) {
  if (normalization === null) return content;
  const doc = content.ruleset.document;
  const r = loadRuleset({ ...doc, parameters: [...doc.parameters.filter((p) => p.id !== 'demand.doseNormalization'), param('demand.doseNormalization', normalization as never, 'G2', extra)] } as never);
  if (!r.ok) throw new Error(`ruleset de test invalide : ${JSON.stringify(r.issues)}`);
  return { ruleset: r.ruleset, catalog: content.catalog };
}

// technical-constant: TEST_ONLY — écart inter-disciplines de test par structure (heures)
export const TEST_WINDOW_H = 24;
export const STRUCTURE_IDS = ['lower_knee', 'lower_hip', 'upper_push', 'upper_pull', 'axial', 'locomotor_impact', 'high_intensity_systemic', 'grip'] as const;
export function plannerGovernance(windows: Record<string, number> | null = Object.fromEntries(STRUCTURE_IDS.map((s) => [s, TEST_WINDOW_H])), extra: Record<string, unknown> = {}): LoadedRuleset {
  const doc = testRulesetDocument();
  return testRuleset({ ...doc, parameters: [...doc.parameters, ...(windows === null ? [] : [param('planner.interference.structureWindows', windows, 'G2', extra)])] });
}
