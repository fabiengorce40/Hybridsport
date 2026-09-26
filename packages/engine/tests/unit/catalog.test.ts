import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { DEMAND_LEVELS as DEMAND_LEVELS_FOR_TESTS } from '@hybridsport/domain';
import { loadCatalog, deriveExerciseStructures, deriveDemandProfile, groupLevel, isDerivationTable } from '../../src/index.js';
import type { DemandInputItem } from '../../src/index.js';
import { testCatalogDocument, EXERCISES } from '../fixtures/catalog.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';

const catalog = testCatalog();
const ruleset = testRuleset();
const table = ruleset.table('demand.derivationTable', isDerivationTable, 'DerivationTable');

function problems(mutate: (doc: ReturnType<typeof testCatalogDocument>) => void): string[] {
  const doc = structuredClone(testCatalogDocument());
  mutate(doc);
  const r = loadCatalog(doc);
  return r.ok ? [] : r.issues.map((i) => String(i.params.problem));
}

describe('schéma et intégrité du catalogue', () => {
  it('charge le mini catalogue (taxonomie en 4 couches, 8 structures)', () => {
    expect(catalog.version).toBe('0.1.0-test');
    expect(catalog.structureIds()).toEqual(['lower_knee', 'lower_hip', 'upper_push', 'upper_pull', 'axial', 'locomotor_impact', 'high_intensity_systemic', 'grip']);
    expect(catalog.activeExercises().length).toBe(EXERCISES.length);
    expect(catalog.structureMembers('lower_body')).toEqual(['lower_knee', 'lower_hip']);
  });

  it('isLocomotor est porté par le pattern primaire', () => {
    expect(catalog.isLocomotor(catalog.exercise('ex.easy_run')!)).toBe(true);
    expect(catalog.isLocomotor(catalog.exercise('ex.sled_push')!)).toBe(true);
    expect(catalog.isLocomotor(catalog.exercise('ex.back_squat')!)).toBe(false);
  });

  it('classes de matériel et faisabilité (allOf / anyOf)', () => {
    expect(catalog.equipmentClassesOf(catalog.exercise('ex.leg_press')!)).toEqual(['machine']);
    expect(catalog.equipmentClassesOf(catalog.exercise('ex.push_up')!)).toEqual(['bodyweight']);
    const dbOnly = new Set(catalog.preset('preset.dumbbells_only')!.equipment);
    expect(catalog.isFeasibleWith(catalog.exercise('ex.goblet_squat')!, dbOnly)).toBe(true);
    expect(catalog.missingEquipment(catalog.exercise('ex.back_squat')!, dbOnly)).toEqual(['barbell', 'plates', 'rack']);
    expect(catalog.missingEquipment(catalog.exercise('ex.farmers_carry')!, new Set())).toEqual(['anyOf(dumbbells|kettlebells)']);
  });

  it('détecte les références inconnues et incohérences', () => {
    expect(problems((d) => { d.exercises[0]!.patterns.primary = 'inconnu'; })).toContain('pattern inconnu : inconnu');
    expect(problems((d) => { d.exercises[0]!.muscles.secondary = ['quadriceps']; })).toContain('muscle à la fois primaire et secondaire');
    expect(problems((d) => { d.exercises[0]!.painSensitiveAreas = ['coeur']; })).toContain('zone fonctionnelle inconnue : coeur');
    expect(problems((d) => { d.exercises[0]!.substitutions = [{ exerciseId: 'ex.leg_press', fidelity: 'high' }]; })[0]).toMatch(/fidélité élevée hors classe/);
    expect(problems((d) => { d.exercises[0]!.status = 'deprecated'; })).toContain('exercice déprécié sans remplaçant');
    expect(problems((d) => { d.exercises[1]!.loadModel = undefined; })).toContain('exercice chargeable sans loadModel');
    expect(problems((d) => { d.exercises.push(structuredClone(d.exercises[0]!)); })[0]).toMatch(/dupliqué/);
    expect(problems((d) => { d.taxonomy.structureGroups = [{ id: 'g', members: ['inconnue'] }]; })[0]).toMatch(/structure inconnue/);
    expect(problems((d) => { d.presets![0]!.equipment.push('laser'); })[0]).toMatch(/matériel inconnu/);
  });

  it('refuse un document mal formé sans lever d’exception', () => {
    const r = loadCatalog({ schemaVersion: '1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.category).toBe('technical');
  });
});

describe('structures de planification DÉRIVÉES', () => {
  const s = (id: string) => deriveExerciseStructures(catalog.exercise(id)!, table);

  it('dérive depuis muscles, patterns et coûts (jamais saisies)', () => {
    expect(Object.keys(s('ex.bench_press')).sort()).toEqual(['high_intensity_systemic', 'upper_push']);
    expect(Object.keys(s('ex.pull_up'))).toEqual(expect.arrayContaining(['upper_pull', 'grip']));
    expect(Object.keys(s('ex.back_squat'))).toEqual(expect.arrayContaining(['lower_knee', 'lower_hip', 'axial']));
    expect(Object.keys(s('ex.easy_run'))).toContain('locomotor_impact');
    expect(Object.keys(s('ex.wall_ball'))).toEqual(expect.arrayContaining(['lower_knee', 'upper_push', 'high_intensity_systemic']));
    expect(s('ex.hip_mobility_flow')).toEqual({});
  });

  it('poussée et tirage sont séparés : une séance de poussée lourde ne charge pas le tirage', () => {
    const push: DemandInputItem[] = [{ exerciseId: 'ex.bench_press', doseUnits: 5, intensityBand: 'high' }, { exerciseId: 'ex.db_bench_press', doseUnits: 3, intensityBand: 'high' }];
    const p = deriveDemandProfile(push, catalog, ruleset);
    expect(p.levels.upper_push).toBe('high');
    expect(p.levels.upper_pull).toBe('none');
  });

  it('alias « bas du corps » = max des membres ; excentrique = modificateur de niveau', () => {
    const hinge = deriveDemandProfile([{ exerciseId: 'ex.romanian_deadlift', doseUnits: 4, intensityBand: 'high' }], catalog, ruleset);
    expect(hinge.levels.lower_hip).toBe('moderate');
    expect(groupLevel(hinge, 'lower_body', catalog)).toBe(hinge.levels.lower_hip);
    const ecc = deriveDemandProfile([{ exerciseId: 'ex.romanian_deadlift', doseUnits: 4, intensityBand: 'high', eccentricBias: true }], catalog, ruleset);
    expect(ecc.levels.lower_hip).toBe('high');
  });

  it('toutes les structures du catalogue ont un niveau ; exercice inconnu ignoré (contrôlé ailleurs)', () => {
    const p = deriveDemandProfile([{ exerciseId: 'ex.inconnu', doseUnits: 3, intensityBand: 'high' }], catalog, ruleset);
    expect(Object.values(p.levels).every((l) => l === 'none')).toBe(true);
    expect(Object.keys(p.levels)).toHaveLength(8);
  });

  it('propriétés : indépendance à l’ordre et monotonie de la dose', () => {
    const ids = catalog.activeExercises().map((e) => e.id);
    const item = fc.record({ exerciseId: fc.constantFrom(...ids), doseUnits: fc.integer({ min: 0, max: 10 }), intensityBand: fc.constantFrom('low', 'moderate', 'high') });
    fc.assert(fc.property(fc.array(item, { maxLength: 8 }), (items) => {
      const a = deriveDemandProfile(items, catalog, ruleset);
      const b = deriveDemandProfile([...items].reverse(), catalog, ruleset);
      expect(b.levels).toEqual(a.levels);
      const more = deriveDemandProfile(items.map((i) => ({ ...i, doseUnits: i.doseUnits + 1 })), catalog, ruleset);
      for (const s2 of Object.keys(a.levels)) {
        expect(DEMAND_LEVELS_FOR_TESTS.indexOf(more.levels[s2]!)).toBeGreaterThanOrEqual(DEMAND_LEVELS_FOR_TESTS.indexOf(a.levels[s2]!));
      }
    }), { numRuns: 200 });
  });
});
