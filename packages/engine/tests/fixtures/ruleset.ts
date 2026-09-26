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

/** Fiches des contrôles intégrés du CORE (nature et gouvernance cohérentes). */
export function coreTestRules(): RuleInput[] {
  const g1 = { nature: 'SAFETY' as const, governance: 'G1' as const, category: 'safety' as const };
  const feas = { nature: 'FEASIBILITY' as const, governance: 'G4' as const, category: 'equipment' as const };
  return [
    rule('core.safety.program_status', { ...g1, category: 'eligibility' }),
    rule('core.safety.restriction', g1),
    rule('core.safety.pain_area', g1),
    rule('core.safety.pain_movement', g1),
    rule('core.feasibility.equipment', feas),
    rule('core.feasibility.exercise_status', feas),
    rule('core.feasibility.day', { ...feas, category: 'scheduling' }),
    rule('core.feasibility.duration', { ...feas, category: 'duration' }),
    rule('core.feasibility.user_exclusion', { nature: 'PREFERENCE', governance: 'G3', category: 'equipment' }),
    rule('core.recovery.min_gap', { nature: 'PROGRAMMING_HEURISTIC', governance: 'G2', category: 'recovery' }),
    rule('core.integrity.structure', { category: 'structure' }),
  ];
}

/** Politique de test de la récupération minimale : HARD par défaut, SOFT pour un avancé aux données suffisantes. */
export function coreTestPolicies(): RulesetDocumentInput['policies'] {
  return [{
    ruleId: 'core.recovery.min_gap', allowInactive: false, thresholdUnit: 'h', thresholdSafeDirection: 'increase',
    default: { level: 'hard' },
    overrides: [{ when: { athleteLevel: ['advanced'], dataQuality: ['adequate'] }, set: { level: 'soft', penaltyWeight: 2 } }],
  }];
}

/** Paramètres minimaux requis par le CORE (complétés lot par lot). */
export function coreTestParameters(): ParamInput[] {
  return [
    param('core.repair.maxAttemptsPerSession', 3, 'G4'),
    param('core.optimization.epsilon', { B1: 0.05, B2: 0.05, B3: 0.05, B4: 0.05, B5: 0.05, B6: 0 }, 'G2'),
    param('core.stability.hysteresis', { B1: 0.1, B2: 0.1, B3: 0.15 }, 'G2'),
    param('core.duration.maxLeverSteps', 200, 'G4'),
    param('duration.defaultTiming', { restOverrunFactor: 1.1, restP90Factor: 1.25, transitionFactor: 1 }, 'G2'),
    param('duration.transitionTable', { default: 60, 'station_fixed>station_fixed': 90, 'machine>machine': 45, 'portable>portable': 20 }, 'G2'),
    param('duration.blockTransitionS', 60, 'G2', { unit: 's' }),
    param('duration.briefingS', 15, 'G2', { unit: 's' }),
    param('duration.uncertaintyCorrelation', 0.3, 'G2'),
    param('duration.toleranceProfiles', {
      strength_sets: { lowerPct: 0.1, upperPct: 0.05, marginS: 360 },
      fixed_time: { lowerPct: 0.05, upperPct: 0.03, marginS: 150 },
      for_time: { lowerPct: 0.15, upperPct: 0.05, marginS: 300 },
      mixed: { lowerPct: 0.1, upperPct: 0.05, marginS: 300 },
    }, 'G2'),
    param('duration.leverSteps', { reduceRestS: 15, shortenConditioningS: 60, reduceRunS: 120, reduceRunM: 400 }, 'G2'),
    param('recovery.minGapMatrix', { high: { high: 48, moderate: 24 }, moderate: { high: 24 } }, 'G2', { unit: 'h' }),
    // Contenus G1 FICTIFS pour exercer les mécanismes : ni symptômes, ni seuils, ni textes médicaux réels.
    param('safety.pain.levelActions', {
      P1: { areaAction: 'reduce', movementAction: 'none', suspendHighIntensity: false, interruptSession: false, pauseProgram: 'never' },
      P2: { areaAction: 'exclude', movementAction: 'exclude', suspendHighIntensity: false, interruptSession: false, pauseProgram: 'never' },
      P3: { areaAction: 'exclude', movementAction: 'exclude', suspendHighIntensity: true, interruptSession: false, pauseProgram: 'rule' },
      P4: { areaAction: 'none', movementAction: 'none', suspendHighIntensity: true, interruptSession: true, pauseProgram: 'always' },
    }, 'G1'),
    param('safety.pain.pauseRule', { centralAreas: ['lower_back', 'hip_groin'], minAreas: 2 }, 'G1'),
    param('safety.pain.recurrence', { fromLevel: 'P1', toLevel: 'P2', windowHours: 336, minReports: 2 }, 'G1'),
    param('safety.p4.messageKey', 'safety.p4.test_message', 'G1'),
    param('safety.eligibility.acceptedDeclarations', ['test.professional_clearance'], 'G1'),
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
    rules: [rule('core.test.rule'), ...coreTestRules()],
    policies: coreTestPolicies(),
    history: [{ version: '0.1.0-test', date: '2026-09-26', change: 'Ruleset de test initial', author: 'phase3' }],
    ...overrides,
  };
}
