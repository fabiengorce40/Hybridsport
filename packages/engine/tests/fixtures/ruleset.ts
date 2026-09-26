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
    param('demand.derivationTable', {
      roleFactors: { primary: 1, secondary: 0.5 },
      structures: {
        lower_knee: { muscles: { quadriceps: 3 }, patterns: { squat: 3, lunge: 3, sled_push: 3 } },
        lower_hip: { muscles: { hamstrings: 3, glutes: 2 }, patterns: { hinge: 3 } },
        upper_push: { muscles: { chest: 3, triceps: 2, front_delts: 2 }, patterns: { push_horizontal: 3, push_vertical: 3 } },
        upper_pull: { muscles: { lats: 3, upper_back_traps: 2, biceps: 1 }, patterns: { pull_vertical: 3, pull_horizontal: 3, skiing: 2, sled_pull: 3 } },
        axial: { costs: { axialLoad: 1 } },
        locomotor_impact: { costs: { impact: 1 } },
        high_intensity_systemic: { costs: { cardiovascular: 1 } },
        grip: { costs: { grip: 1 } },
      },
    }, 'G2'),
    param('demand.levelThresholds', { default: { low: 1, moderate: 9, high: 18 } }, 'G2'),
    param('demand.intensityMultipliers', { low: 0.5, moderate: 0.75, high: 1, default: 0.75 }, 'G2'),
    param('demand.eccentricLevelBump', 1, 'G2'),
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
