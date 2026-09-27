/**
 * Banc de test du ruleset scientifique V1 candidat : ruleset chargé, scénarios convertis.
 */
import type { LoadedRuleset } from '@hybridsport/engine';
import { strengthRuleset } from './harness.js';
import type { Scenario } from './harness.js';
import { strengthScientificRulesetDocument } from './ruleset.js';

export const CANDIDATE_RULESET: LoadedRuleset = strengthRuleset(strengthScientificRulesetDocument());

export function candidateScenario(s: Scenario, ruleset: LoadedRuleset = CANDIDATE_RULESET): Scenario {
  return { ...s, ruleset };
}
