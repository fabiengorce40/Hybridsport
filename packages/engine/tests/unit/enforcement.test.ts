import { describe, expect, it } from 'vitest';
import type { EnforcementPolicyDocument, RulesetDocumentInput } from '@hybridsport/domain';
import {
  loadRuleset, resolveEnforcement, EnforcementPolicyError, checkSafetyRatchet, checkRatchetTransition, evaluateGovernanceGate, comparePermissiveness,
} from '../../src/index.js';
import type { LoadedRuleset } from '../../src/index.js';
import { param, rule, testRulesetDocument } from '../fixtures/ruleset.js';

type PolicyInput = Partial<EnforcementPolicyDocument> & { ruleId: string };

function policy(p: PolicyInput): EnforcementPolicyDocument {
  return { allowInactive: false, overrides: [], default: { level: 'hard', thresholdParam: 'test.g1.minGapHours' }, thresholdUnit: 'h', thresholdSafeDirection: 'increase', ...p };
}

function rulesetWith(policies: EnforcementPolicyDocument[], extra: Partial<RulesetDocumentInput> = {}): ReturnType<typeof loadRuleset> {
  const base = testRulesetDocument();
  return loadRuleset({ ...base, rules: [...base.rules, rule('test.L1', { category: 'recovery', nature: 'PROGRAMMING_HEURISTIC', governance: 'G2' })], policies, ...extra });
}

function ok(r: ReturnType<typeof loadRuleset>): LoadedRuleset {
  if (!r.ok) throw new Error(r.issues.map((i) => String(i.params.problem)).join(' | '));
  return r.ruleset;
}

const L1 = policy({
  ruleId: 'test.L1',
  overrides: [
    { when: { athleteLevel: ['advanced'] }, set: { level: 'soft', penaltyWeight: 3 } },
    { when: { athleteLevel: ['advanced'], keySessionProximity: ['before_key'] }, set: { level: 'hard' } },
    { when: { dataQuality: ['none'] }, set: { threshold: 72 } },
  ],
});

describe('politique d’application contextuelle', () => {
  const rs = ok(rulesetWith([L1]));

  it('applique la valeur par défaut (seuil lu dans un paramètre, jamais dans le code)', () => {
    const d = resolveEnforcement(rs, 'test.L1', { athleteLevel: 'beginner', dataQuality: 'adequate' });
    expect(d).toMatchObject({ level: 'hard', threshold: 48, unit: 'h', factors: [] });
    expect(d.reason).toMatchObject({ code: 'RULE.ENFORCEMENT', category: 'business_hard', ruleRefs: ['test.L1@1.0.0'] });
  });

  it('le niveau dépend du contexte (niveau, proximité d’une séance clé)', () => {
    const soft = resolveEnforcement(rs, 'test.L1', { athleteLevel: 'advanced', dataQuality: 'adequate' });
    expect(soft).toMatchObject({ level: 'soft', penaltyWeight: 3, factors: ['athleteLevel'] });
    expect(soft.reason.category).toBe('business_soft');
    // La surcharge la plus spécifique gagne, quel que soit l'ordre de déclaration.
    const hard = resolveEnforcement(rs, 'test.L1', { athleteLevel: 'advanced', keySessionProximity: 'before_key' });
    expect(hard).toMatchObject({ level: 'hard', factors: ['athleteLevel', 'keySessionProximity'] });
  });

  it('des données absentes rendent la règle plus prudente', () => {
    expect(resolveEnforcement(rs, 'test.L1', { dataQuality: 'none' }).threshold).toBe(72);
  });

  it('politique absente ⇒ erreur explicite (jamais une interprétation par défaut)', () => {
    expect(() => resolveEnforcement(rs, 'test.inconnue', {})).toThrow(EnforcementPolicyError);
  });

  it('« inactive » refusé sans allowInactive, accepté sinon', () => {
    const bad = rulesetWith([policy({ ruleId: 'test.L1', overrides: [{ when: { phase: ['taper'] }, set: { level: 'inactive' } }] })]);
    expect(bad.ok).toBe(false);
    const good = ok(rulesetWith([policy({ ruleId: 'test.L1', allowInactive: true, overrides: [{ when: { phase: ['taper'] }, set: { level: 'inactive' } }] })]));
    const d = resolveEnforcement(good, 'test.L1', { phase: 'taper' });
    expect(d.level).toBe('inactive');
    expect(d.reason.category).toBe('information');
  });

  it('refuse une politique où des données plus pauvres seraient plus permissives', () => {
    const r = rulesetWith([policy({ ruleId: 'test.L1', overrides: [{ when: { dataQuality: ['none'] }, set: { level: 'soft' } }] })]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(String(r.issues[0]?.params.problem)).toMatch(/plus permissif/);
    const r2 = rulesetWith([policy({ ruleId: 'test.L1', overrides: [{ when: { dataQuality: ['sparse'] }, set: { threshold: 24 } }] })]);
    expect(r2.ok).toBe(false);
  });

  it('refuse les politiques dupliquées, sans fiche ou au seuil introuvable', () => {
    expect(rulesetWith([L1, L1]).ok).toBe(false);
    expect(rulesetWith([policy({ ruleId: 'sans.fiche' })]).ok).toBe(false);
    expect(rulesetWith([policy({ ruleId: 'test.L1', default: { level: 'hard', thresholdParam: 'absent' } })]).ok).toBe(false);
  });

  it('comparePermissiveness ordonne niveaux puis seuils selon le sens prudent', () => {
    expect(comparePermissiveness({ level: 'soft' }, { level: 'hard' }, undefined)).toBeGreaterThan(0);
    expect(comparePermissiveness({ level: 'hard', threshold: 24 }, { level: 'hard', threshold: 48 }, 'increase')).toBeGreaterThan(0);
    expect(comparePermissiveness({ level: 'hard', threshold: 24 }, { level: 'hard', threshold: 48 }, 'decrease')).toBeLessThan(0);
  });
});

describe('cliquet de sécurité G1', () => {
  const withG1 = (extra: Partial<ReturnType<typeof param>>) => ok(loadRuleset(testRulesetDocument({
    parameters: [param('core.repair.maxAttemptsPerSession', 3, 'G4'), param('safety.minGap', 48, 'G1', { safeDirection: 'increase', approvedBaseline: 48, ...extra })],
  })));

  it('durcir est permis, assouplir sans approbation est détecté', () => {
    expect(checkSafetyRatchet(withG1({ value: 72 }))).toEqual([]);
    const v = checkSafetyRatchet(withG1({ value: 24 }));
    expect(v).toHaveLength(1);
    expect(v[0]?.reason).toMatchObject({ code: 'SAFETY.RATCHET_LOOSENED', category: 'safety' });
  });

  it('assouplir avec une approbation experte de la version courante est accepté', () => {
    const expert = { role: 'sports_expert' as const, name: 'Expert', date: '2026-09-26', verdict: 'approved' as const, version: '0.1.0' };
    expect(checkSafetyRatchet(withG1({ value: 24, approvals: [expert] }))).toEqual([]);
    expect(checkSafetyRatchet(withG1({ value: 24, approvals: [{ ...expert, role: 'product' }] }))).toHaveLength(1);
  });

  it('la référence elle-même ne peut être abaissée ni retirée entre deux versions sans approbation', () => {
    const prev = withG1({});
    expect(checkRatchetTransition(prev, withG1({ value: 24, approvedBaseline: 24 }))).toHaveLength(1);
    expect(checkRatchetTransition(prev, withG1({ value: 60, approvedBaseline: 60 }))).toEqual([]);
    const removed = ok(loadRuleset(testRulesetDocument({ parameters: [param('core.repair.maxAttemptsPerSession', 3, 'G4')] })));
    expect(checkRatchetTransition(prev, removed)).toHaveLength(1);
  });
});

describe('porte de gouvernance par environnement (décision 4)', () => {
  const rs = ok(loadRuleset(testRulesetDocument({
    parameters: [param('core.repair.maxAttemptsPerSession', 3, 'G4'), param('safety.minGap', 24, 'G1', { safeDirection: 'increase', approvedBaseline: 48 }), param('g2.x', 5, 'G2')],
  })));

  it('local : rien de bloquant ; CI : le cliquet bloque', () => {
    expect(evaluateGovernanceGate(rs, 'local').blocking).toEqual([]);
    expect(evaluateGovernanceGate(rs, 'ci').blocking.some((b) => b.includes('cliquet'))).toBe(true);
  });

  it('bêta fermée : G1 doit être au moins relu ; production : G1 approuvé et G2 suffisant', () => {
    expect(evaluateGovernanceGate(rs, 'beta_closed').blocking.some((b) => b.startsWith('G1 non relu'))).toBe(true);
    const prod = evaluateGovernanceGate(rs, 'production');
    expect(prod.blocking.some((b) => b.startsWith('G1 non approuvé'))).toBe(true);
    expect(prod.blocking.some((b) => b.startsWith('G2 insuffisant'))).toBe(true);
  });

  it('staging : G2 non approuvé reste un avertissement', () => {
    const g = evaluateGovernanceGate(rs, 'staging');
    expect(g.warnings.some((w) => w.includes('g2.x'))).toBe(true);
    expect(g.blocking.some((b) => b.includes('g2.x'))).toBe(false);
  });
});
