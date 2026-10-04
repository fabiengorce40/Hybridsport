/**
 * Fixtures du Programme Engine. TOUTE valeur est TEST_ONLY : définitions de programme de démonstration, politique de
 * décision et horizon glissant de test (aucune approbation réelle, aucune recommandation scientifique).
 */
import type { LoadedRuleset } from '@hybridsport/engine';
import type { ProgrammeDefinitionInput } from '../src/index.js';
import { testRuleset } from '../../engine/tests/fixtures/load.js';
import { param, testRulesetDocument } from '../../engine/tests/fixtures/ruleset.js';
import { CT_INTENT, HYROX_INTENT, RUNNING_INTENT, STRENGTH_INTENT } from '../../planner/tests/fixtures.js';

export const START = '2026-10-05';

export function definition(o: Partial<ProgrammeDefinitionInput> = {}): ProgrammeDefinitionInput {
  return {
    programmeId: 'prog.test', origin: 'TEST_ONLY:programme', startWeek: START,
    // technical-constant: TEST_ONLY — horizon déclaré du programme de test (semaines)
    horizonWeeks: 8,
    goals: [{ goalId: 'g.str', sport: 'strength', goal: 'strength' }, { goalId: 'g.run', sport: 'running', goal: 'TEN_K', targetDate: '2026-11-29' }],
    priorities: ['strength', 'running'],
    sports: [
      { sport: 'strength', sessionsPerWeek: 2, intent: { ...STRENGTH_INTENT } },
      { sport: 'running', sessionsPerWeek: 2, intent: { ...RUNNING_INTENT } },
    ],
    ...o,
  };
}

export const FOUR_SPORTS: Partial<ProgrammeDefinitionInput> = {
  priorities: ['strength', 'running', 'crosstraining', 'hyrox'],
  goals: [{ goalId: 'g.str', sport: 'strength', goal: 'strength' }, { goalId: 'g.run', sport: 'running', goal: 'TEN_K' }, { goalId: 'g.ct', sport: 'crosstraining', goal: 'GENERAL_FITNESS' }, { goalId: 'g.hr', sport: 'hyrox', goal: 'RACE_PREPARATION' }],
  sports: [
    { sport: 'strength', sessionsPerWeek: 2, intent: { ...STRENGTH_INTENT } },
    { sport: 'running', sessionsPerWeek: 2, intent: { ...RUNNING_INTENT } },
    { sport: 'crosstraining', sessionsPerWeek: 1, intent: { ...CT_INTENT } },
    { sport: 'hyrox', sessionsPerWeek: 1, intent: { ...HYROX_INTENT }, station: 'skierg' },
  ],
};

/** Politique de décision TEST_ONLY (ordre = priorité des règles). Ne constitue AUCUNE recommandation. */
// technical-constant: TEST_ONLY — seuils de démonstration des règles (aucune valeur approuvée)
export const TEST_POLICY = {
  rules: [
    { sport: '*', when: { painReported: true }, decision: 'REGRESS' },
    { sport: '*', when: { missedAtLeast: 1 }, decision: 'HOLD' },
    { sport: '*', when: { abandonedAtLeast: 1 }, decision: 'REGRESS' },
    { sport: 'running', when: { assessment: 'none', asPrescribedShareAtLeast: 1 }, decision: 'REASSESS' },
    { sport: '*', when: { asPrescribedShareAtLeast: 1 }, decision: 'PROGRESS' },
  ],
};

export function programmeGovernance(o: { policy?: unknown; horizon?: number; extra?: Record<string, unknown> } = {}): LoadedRuleset {
  const doc = testRulesetDocument();
  return testRuleset({
    ...doc,
    parameters: [
      ...doc.parameters,
      ...(o.policy === null ? [] : [param('programme.adaptation.decisionPolicy', (o.policy ?? TEST_POLICY) as never, 'G2', o.extra ?? {})]),
      ...(o.horizon === undefined ? [] : [param('programme.planning.horizonWeeks', o.horizon, 'G2')]),
    ],
  });
}
