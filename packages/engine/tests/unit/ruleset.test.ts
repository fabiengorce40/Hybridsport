import { describe, expect, it } from 'vitest';
import type { RulesetDocument } from '@hybridsport/domain';
import {
  loadRuleset, RulesetParameterError, preflightCoreParameters, CORE_PARAMETERS, RuleRegistry, diffRulesets, versioningIssues,
} from '../../src/index.js';
import type { LoadedRuleset } from '../../src/index.js';
import { param, rule, testRulesetDocument } from '../fixtures/ruleset.js';

function load(doc = testRulesetDocument()): LoadedRuleset {
  const r = loadRuleset(doc);
  if (!r.ok) throw new Error(JSON.stringify(r.issues.map((i) => i.params)));
  return r.ruleset;
}

function problems(doc: unknown): string[] {
  const r = loadRuleset(doc);
  return r.ok ? [] : r.issues.map((i) => String(i.params.problem));
}

const approval = (role: 'sports_expert' | 'product' | 'engineering' | 'medical_advisor', version = '0.1.0') =>
  ({ role, name: 'Expert Test', date: '2026-09-26', verdict: 'approved' as const, version });

describe('chargement du ruleset', () => {
  it('charge le ruleset de test et expose ses paramètres par identifiant', () => {
    const rs = load();
    expect(rs.version).toBe('0.1.0-test');
    expect(rs.number('core.repair.maxAttemptsPerSession')).toBe(3);
    expect(rs.parameter('test.g1.minGapHours')?.safeDirection).toBe('increase');
  });

  it('paramètre absent ou mal typé ⇒ RulesetParameterError (TECHNICAL, jamais une valeur par défaut)', () => {
    const rs = load();
    expect(() => rs.number('inconnu')).toThrow(RulesetParameterError);
    expect(() => rs.boolean('core.repair.maxAttemptsPerSession')).toThrow(/boolean/);
    expect(() => rs.stringList('core.repair.maxAttemptsPerSession')).toThrow(RulesetParameterError);
  });

  it('un paramètre déprécié n’est plus lisible', () => {
    const rs = load(testRulesetDocument({ parameters: [param('x.dep', 1, 'G3', { status: 'deprecated' })] }));
    expect(() => rs.number('x.dep')).toThrow(/absent/);
  });

  it('erreur de schéma ⇒ issues TECHNICAL.RULESET_INVALID, sans exception', () => {
    const r = loadRuleset({ schemaVersion: '1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.every((i) => i.code === 'TECHNICAL.RULESET_INVALID' && i.category === 'technical')).toBe(true);
    expect(loadRuleset(null).ok).toBe(false);
  });
});

describe('cohérence sémantique du ruleset', () => {
  it('détecte les doublons, le faux « non provisoire » et les approbations invalides', () => {
    expect(problems(testRulesetDocument({ parameters: [param('a', 1, 'G3'), param('a', 2, 'G3')] }))).toContain('identifiant de paramètre dupliqué');
    expect(problems(testRulesetDocument({ parameters: [param('a', 1, 'G3', { provisional: false })] }))[0]).toMatch(/provisoire/);
    expect(problems(testRulesetDocument({ parameters: [param('a', 1, 'G2', { status: 'approved', provisional: false })] }))[0]).toMatch(/sans approbation/);
    // Mauvais rôle : un avis produit ne suffit pas pour G2.
    expect(problems(testRulesetDocument({ parameters: [param('a', 1, 'G2', { status: 'approved', approvals: [approval('product')] })] }))[0]).toMatch(/sans approbation/);
    // Approbation d'une autre version.
    expect(problems(testRulesetDocument({ parameters: [param('a', 1, 'G2', { status: 'approved', approvals: [approval('sports_expert', '0.0.9')] })] }))[0]).toMatch(/sans approbation/);
    expect(problems(testRulesetDocument({ parameters: [param('a', 1, 'G2', { status: 'approved', approvals: [approval('sports_expert')] })] }))).toEqual([]);
  });

  it('G1 numérique sans safeDirection, baseline mal typée, plage incohérente', () => {
    expect(problems(testRulesetDocument({ parameters: [param('g1', 48, 'G1')] }))[0]).toMatch(/safeDirection/);
    expect(problems(testRulesetDocument({ parameters: [param('g1', 48, 'G1', { safeDirection: 'increase', approvedBaseline: '48' })] }))[0]).toMatch(/approvedBaseline/);
    expect(problems(testRulesetDocument({ parameters: [param('g2', 5, 'G2', { approvedRange: { min: 9, max: 3 } })] }))[0]).toMatch(/min > max/);
    expect(problems(testRulesetDocument({ parameters: [param('g2', 30, 'G2', { status: 'approved', approvals: [approval('sports_expert')], approvedRange: { min: 10, max: 25 } })] }))[0]).toMatch(/hors de sa plage/);
  });

  it('nature et gouvernance cohérentes ; changelog jamais en avance', () => {
    expect(problems(testRulesetDocument({ rules: [rule('r', { nature: 'SAFETY', governance: 'G2' })] }))[0]).toMatch(/G1/);
    expect(problems(testRulesetDocument({ rules: [rule('r', { nature: 'TECHNICAL', governance: 'G2' })] }))[0]).toMatch(/G4/);
    expect(problems(testRulesetDocument({ rules: [rule('r', { changelog: [{ version: '9.0.0', date: '2026-09-26', change: 'x', author: 'y' }] })] }))[0]).toMatch(/avance/);
  });
});

describe('paramètres du CORE', () => {
  it('le ruleset de test fournit tous les paramètres déclarés du CORE', () => {
    expect(preflightCoreParameters(load())).toEqual([]);
  });
  it('détecte un paramètre absent ou de mauvaise classe', () => {
    const rs = load(testRulesetDocument({ parameters: [param('core.repair.maxAttemptsPerSession', 3, 'G2')] }));
    expect(preflightCoreParameters(rs)).toContainEqual({ id: 'core.repair.maxAttemptsPerSession', problem: 'classe G2 au lieu de G4' });
    expect(preflightCoreParameters(load(testRulesetDocument({ parameters: [] })), CORE_PARAMETERS)[0]?.problem).toBe('absent');
  });
});

describe('registre de règles', () => {
  const def = { id: 'core.test.rule', version: '1.0.0', evaluate: () => true };
  it('exige une fiche au même numéro de version pour chaque règle du code', () => {
    expect(RuleRegistry.create([def], load()).ok).toBe(true);
    const missing = RuleRegistry.create([{ ...def, id: 'core.sans.fiche' }], load());
    expect(missing.ok).toBe(false);
    const mismatch = RuleRegistry.create([{ ...def, version: '2.0.0' }], load());
    expect(!mismatch.ok && mismatch.issues[0]?.reason.params.problem).toMatch(/version/);
    const dep = RuleRegistry.create([def], load(testRulesetDocument({ rules: [rule('core.test.rule', { review: { status: 'deprecated', approvals: [] } })] })));
    expect(dep.ok).toBe(false);
  });
  it('fournit la référence de traçabilité id@version', () => {
    const r = RuleRegistry.create([def], load());
    expect(r.ok && r.registry.ref('core.test.rule')).toBe('core.test.rule@1.0.0');
  });
});

describe('historique et versionnement', () => {
  const base = load().document;
  it('liste les changements et exige les montées de version', () => {
    const next: RulesetDocument = { ...base, parameters: base.parameters.map((p) => (p.id === 'test.g2.volumeCeiling' ? { ...p, value: 22 } : p)) };
    expect(diffRulesets(base, next)).toEqual([{ kind: 'modified', entity: 'parameter', id: 'test.g2.volumeCeiling', fields: ['value'], versionBumped: false }]);
    expect(versioningIssues(base, next)).toHaveLength(2);
    const bumped: RulesetDocument = { ...next, rulesetVersion: '0.1.1-test', parameters: next.parameters.map((p) => (p.id === 'test.g2.volumeCeiling' ? { ...p, version: '0.1.1' } : p)) };
    expect(versioningIssues(base, bumped)).toEqual([]);
  });
});
