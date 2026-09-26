import { describe, expect, it } from 'vitest';
import { evaluateCoverage, isCatalogCompleteForV1 } from '../../src/index.js';
import type { CoverageReport } from '../../src/index.js';
import { testCatalogDocument } from '../fixtures/catalog.js';
import { param, testRulesetDocument } from '../fixtures/ruleset.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';

const status = (r: CoverageReport, id: string) => r.criteria.find((c) => c.id === id)?.status;
const details = (r: CoverageReport, id: string) => r.criteria.find((c) => c.id === id)?.details ?? [];

const COVERAGE_CONFIG = [
  param('coverage.cc1.minCandidates', 2, 'G5'),
  param('coverage.cc2.patternClasses', { squat: ['barbell', 'machine', 'bodyweight'], push_horizontal: ['barbell', 'dumbbell', 'machine'] }, 'G5'),
  param('coverage.cc5.unilateralPatterns', ['lunge', 'hinge'], 'G5'),
  param('coverage.cc6.presetId', 'preset.commercial_gym', 'G5'),
  param('coverage.cc6.mainMuscles', ['chest', 'lats', 'hamstrings'], 'G5'),
  param('coverage.cc11.requiredPresets', ['preset.commercial_gym', 'preset.box', 'preset.hybrid_race_gym', 'preset.home_equipped', 'preset.dumbbells_only', 'preset.bodyweight'], 'G5'),
];

function rulesetWithCoverage() {
  const base = testRulesetDocument();
  return testRuleset({ ...base, parameters: [...base.parameters, ...COVERAGE_CONFIG] });
}

const ARCHETYPE = {
  id: 'arch.test_upper', discipline: 'strength' as const,
  slots: [{ id: 'main_push', pattern: 'push_horizontal' }, { id: 'pull', pattern: 'pull_vertical' }],
  feasiblePresets: ['preset.commercial_gym'],
};

describe('moteur de couverture CC1–CC11', () => {
  it('sans configuration ni archétypes : NOT_READY explicite, jamais un faux PASS', () => {
    const r = evaluateCoverage(testCatalog(), testRuleset(), 'local');
    expect(r.criteria.map((c) => c.id)).toEqual(['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9', 'CC10', 'CC11']);
    for (const id of ['CC1', 'CC2', 'CC5', 'CC6', 'CC7', 'CC8', 'CC11']) expect(status(r, id)).toBe('NOT_READY');
    expect(r.overall).not.toBe('PASS');
    expect(isCatalogCompleteForV1(r)).toBe(false);
  });

  it('catalogue vide : aucun critère ne passe', () => {
    const r = evaluateCoverage(testCatalog(testCatalogDocument({ exercises: [] })), rulesetWithCoverage(), 'local');
    // Seul CC11 (presets, indépendants des exercices) peut passer avec un catalogue vide.
    expect(r.criteria.filter((c) => c.status === 'PASS').map((c) => c.id)).toEqual(['CC11']);
    expect(status(r, 'CC3')).toBe('NOT_READY');
    expect(status(r, 'CC9')).toBe('NOT_READY');
    expect(status(r, 'CC10')).toBe('NOT_READY');
    expect(r.overall).not.toBe('PASS');
  });

  it('CC1 : candidats par emplacement d’archétype, avec seuil lu dans le ruleset', () => {
    const catalog = testCatalog(testCatalogDocument({ archetypes: [ARCHETYPE] }));
    expect(status(evaluateCoverage(catalog, rulesetWithCoverage(), 'local'), 'CC1')).toBe('PASS');
    const strict = testCatalog(testCatalogDocument({ archetypes: [{ ...ARCHETYPE, slots: [{ id: 'main_push', pattern: 'push_horizontal', minFamilies: 9 }] }] }));
    expect(details(evaluateCoverage(strict, rulesetWithCoverage(), 'local'), 'CC1')[0]).toMatch(/famille/);
  });

  it('CC2 : détecte une classe de matériel manquante pour un pattern', () => {
    const r = evaluateCoverage(testCatalog(), rulesetWithCoverage(), 'local');
    expect(status(r, 'CC2')).toBe('PASS');
    const base = testRulesetDocument();
    const rs = testRuleset({ ...base, parameters: [...base.parameters, param('coverage.cc2.patternClasses', { squat: ['band'] }, 'G5')] });
    expect(details(evaluateCoverage(testCatalog(), rs, 'local'), 'CC2')).toEqual(['squat × band']);
  });

  it('CC3 : rang de progression manquant détecté', () => {
    const doc = testCatalogDocument();
    const gap = { ...doc, exercises: doc.exercises.map((e) => (e.id === 'ex.air_squat' ? { ...e, progressionFamily: { familyId: 'prog.squat', rank: 3 } } : e)) };
    expect(details(evaluateCoverage(testCatalog(gap), rulesetWithCoverage(), 'local'), 'CC3')).toContain('prog.squat : rang 1 manquant');
    expect(details(evaluateCoverage(testCatalog(), rulesetWithCoverage(), 'local'), 'CC3').some((d) => d.startsWith('prog.'))).toBe(false);
  });

  it('CC4 : une station non faisable est couverte par un substitut faisable du preset', () => {
    const r = evaluateCoverage(testCatalog(), rulesetWithCoverage(), 'local');
    // Haltères seuls : le sled est absent mais le substitut (fentes lestées) est faisable.
    expect(details(r, 'CC4')).not.toContain('station ex.sled_push : ni faisable ni substituable @ preset.dumbbells_only');
    // Poids du corps : vrai trou de contenu, signalé.
    expect(details(r, 'CC4')).toContain('station ex.sled_push : ni faisable ni substituable @ preset.bodyweight');
    const doc = testCatalogDocument();
    const noSub = { ...doc, exercises: doc.exercises.map((e) => (e.id === 'ex.sled_push' ? { ...e, substitutions: [] } : e)) };
    expect(details(evaluateCoverage(testCatalog(noSub), rulesetWithCoverage(), 'local'), 'CC4')).toContain('station ex.sled_push : ni faisable ni substituable @ preset.commercial_gym');
  });

  it('CC5 et CC6 : unilatéral par preset, machine ET poulie par muscle principal', () => {
    const r = evaluateCoverage(testCatalog(), rulesetWithCoverage(), 'local');
    expect(details(r, 'CC5')).toContain('hinge unilatéral @ preset.bodyweight');
    expect(details(r, 'CC5')).not.toContain('lunge unilatéral @ preset.bodyweight');
    expect(details(r, 'CC6')).toEqual(['hamstrings : aucune option cable']);
  });

  it('CC7 : alternative sous restriction, sauf infaisabilité déclarée', () => {
    const arch = { ...ARCHETYPE, slots: [{ id: 'jump', pattern: 'jumping' }] };
    const r = evaluateCoverage(testCatalog(testCatalogDocument({ archetypes: [arch] })), rulesetWithCoverage(), 'local');
    expect(details(r, 'CC7')).toEqual(expect.arrayContaining(['arch.test_upper/jump @ preset.commercial_gym sous no_impact : aucune alternative']));
    const declared = { ...arch, declaredInfeasibleRestrictions: ['no_impact', 'no_jumping'] };
    expect(status(evaluateCoverage(testCatalog(testCatalogDocument({ archetypes: [declared] })), rulesetWithCoverage(), 'local'), 'CC7')).toBe('PASS');
  });

  it('CC8, CC9, CC11 : échauffement par pattern utilisé, course complète, presets V1', () => {
    const r = evaluateCoverage(testCatalog(testCatalogDocument({ archetypes: [ARCHETYPE] })), rulesetWithCoverage(), 'local');
    expect(details(r, 'CC8')).toEqual(['pull_vertical : aucun échauffement spécifique', 'push_horizontal : aucun échauffement spécifique']);
    expect(status(r, 'CC9')).toBe('PASS');
    expect(status(r, 'CC11')).toBe('PASS');
  });

  it('CC10 : le statut de relecture exigé dépend de l’environnement', () => {
    const cat = testCatalog();
    expect(details(evaluateCoverage(cat, rulesetWithCoverage(), 'local'), 'CC10').some((d) => d.includes('non relu'))).toBe(false);
    expect(details(evaluateCoverage(cat, rulesetWithCoverage(), 'beta_closed'), 'CC10').some((d) => d.includes('non relu (bêta)'))).toBe(true);
    expect(details(evaluateCoverage(cat, rulesetWithCoverage(), 'production'), 'CC10').some((d) => d.includes('non approuvé G5'))).toBe(true);
  });

  it('indépendance au nombre d’exercices : dupliquer le catalogue ne change aucun statut', () => {
    const doc = testCatalogDocument({ archetypes: [ARCHETYPE] });
    const clones = doc.exercises.map((e) => ({ ...e, id: `${e.id}.clone`, substitutions: e.substitutions.map((s) => ({ ...s, exerciseId: `${s.exerciseId}.clone` })) }));
    const a = evaluateCoverage(testCatalog(doc), rulesetWithCoverage(), 'local');
    const b = evaluateCoverage(testCatalog({ ...doc, exercises: [...doc.exercises, ...clones] }), rulesetWithCoverage(), 'local');
    expect(b.criteria.map((c) => c.status)).toEqual(a.criteria.map((c) => c.status));
  });
});
