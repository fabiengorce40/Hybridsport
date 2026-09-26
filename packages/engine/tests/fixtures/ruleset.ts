/**
 * Ruleset de TEST. Toutes les valeurs sont des HYPOTHÈSES PROVISOIRES servant uniquement à exercer
 * les mécanismes du CORE : elles ne sont ni validées ni destinées à la production. Elles vivent
 * dans les tests, jamais dans le code source du CORE.
 */
import type { GovernanceClass, ParameterValue, RulesetDocumentInput } from '@hybridsport/domain';

type ParamInput = RulesetDocumentInput['parameters'][number];
type RuleInput = RulesetDocumentInput['rules'][number];

export function param(id: string, value: ParameterValue, governance: GovernanceClass, extra: Partial<ParamInput> = {}): ParamInput {
  return {
    id, value, governance,
    version: '0.1.0', modifiedAt: '2026-09-26', status: 'draft', confidence: 'provisional', provisional: true,
    source: { kind: 'internal_hypothesis' }, justification: 'Valeur de test provisoire (Phase 3, CORE).',
    ...extra,
  };
}

export function rule(id: string, extra: Partial<RuleInput> = {}): RuleInput {
  return {
    id, title: id, description: `Règle de test ${id}`, category: 'technical', nature: 'TECHNICAL', level: 'hard',
    scope: 'session', rationale: 'Mécanisme du CORE.', references: [], confidence: 'provisional',
    version: '1.0.0', modifiedAt: '2026-09-26', changelog: [], review: { status: 'draft', approvals: [] }, governance: 'G4',
    ...extra,
  };
}

/** Paramètres minimaux requis par le CORE (complétés lot par lot). */
export function coreTestParameters(): ParamInput[] {
  return [
    param('core.repair.maxAttemptsPerSession', 3, 'G4'),
  ];
}

export function testRulesetDocument(overrides: Partial<RulesetDocumentInput> = {}): RulesetDocumentInput {
  return {
    schemaVersion: '1',
    rulesetVersion: '0.1.0-test',
    modifiedAt: '2026-09-26',
    parameters: [
      ...coreTestParameters(),
      param('test.g1.minGapHours', 48, 'G1', { safeDirection: 'increase', approvedBaseline: 48, unit: 'h' }),
      param('test.g2.volumeCeiling', 20, 'G2', { approvedRange: { min: 10, max: 25 } }),
    ],
    rules: [rule('core.test.rule')],
    policies: [],
    history: [{ version: '0.1.0-test', date: '2026-09-26', change: 'Ruleset de test initial', author: 'phase3' }],
    ...overrides,
  };
}
