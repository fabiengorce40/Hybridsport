/**
 * Cross-training C3 pour l'environnement Beta 0 EXPÉRIMENTAL (SIMULATION_ONLY), source unique côté planificateur :
 *   - moteur Cross-training en mode simulation, gouvernance C3 + C4 (séance complète) TEST_ONLY (`c3-governance.ts`, valeurs EXPERT_PROPOSED,
 *     jamais PRODUCTION_ELIGIBLE) avec multisport admis (planificateur global déclaré satisfait, `ct.hybrid.policy` de
 *     test) et SANS politique de charge (mouvements chargés inéligibles) ;
 *   - contenu : catalogue de test du CORE + extension Cross-training C4.2 (`c4-catalog.ts`, propre à ce port) ; ruleset de test du CORE AVEC les paramètres d'anti-doublon (comme Running : sans eux, toute génération
 *     qui reçoit un historique d'empreintes échoue) + normalisation des doses Cross-training (mètres, calories) TEST_ONLY.
 * Rien n'est promu : en PRODUCTION chaque paramètre est non résolu et la composition refuse (fail-closed).
 * L'application n'importe jamais le paquet Cross-training : elle passe par ce module du planificateur.
 */
import { createCrossTrainingEngine } from '@hybridsport/crosstraining';
import type { CrossTrainingEngine, CtGovernance } from '@hybridsport/crosstraining';
import type { StrengthBlockRule } from '../src/index.js';
import type { LoadedCatalog, LoadedRuleset } from '@hybridsport/engine';
import { testCatalog, testRuleset } from '../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../engine/tests/fixtures/ruleset.js';
import { c3Governance } from '../../crosstraining/tests/c3-governance.js';
import { ctCatalogDocument } from '../../crosstraining/tests/c4-catalog.js';
import { TEST_DOSE_NORMALIZATION, withDemand } from './simulation.js';

/** Identifiants SIMULATION_ONLY tracés dans chaque semaine Beta 0 qui contient une séance Cross-training. */
export const CT_BETA0_SIMULATION = ['crosstraining.c3.testGovernance', 'crosstraining.engine.simulation', 'demand.doseNormalization.crosstraining'] as const;

// technical-constant: TEST_ONLY — normalisation des mètres / calories Cross-training (profil de demande), comme les rapports C3
export const CT_DOSE_NORMALIZATION = { ...TEST_DOSE_NORMALIZATION, crosstraining: { ...TEST_DOSE_NORMALIZATION.crosstraining, meter: { perUnit: 0.01, intensityBand: 'high' }, calorie: { perUnit: 0.2, intensityBand: 'high' } } };

/**
 * C4.3 — règle de DÉLÉGATION d'un bloc de force par le planificateur (TEST_ONLY, SIMULATION_ONLY) : intention Strength
 * du bloc (archétype de bloc `str_ct_block`, stimulus général, objectif support:crosstraining fourni par le contexte),
 * et structures sollicitées au niveau `high` par le bloc EXCLUES du conditionnement de la même séance. Jamais approuvée.
 */
export const CT_STRENGTH_BLOCK_RULE: StrengthBlockRule = {
  ruleId: 'planner.intraSessionInterference.test-0', status: 'TEST_ONLY', mode: 'CANDIDATE', excludeConditioningAtLevels: ['high'], requireExternalLoad: true, noRepeatInConditioning: true,
  intent: { archetypeId: 'str_ct_block', stimulus: 'strength_general', objective: 'objective.strength_general', phase: 'phase.accumulation', toleranceProfile: 'strength_sets' },
};

export interface CtBeta0 {
  readonly engine: CrossTrainingEngine;
  readonly content: { readonly ruleset: LoadedRuleset; readonly catalog: LoadedCatalog };
  readonly simulation: readonly string[];
  /** Q1 — gouvernance lue par le diagnostic de qualité (base des valeurs). */
  readonly governance: CtGovernance;
  /** C4.3 — règle de délégation de force (TEST_ONLY). */
  readonly strengthBlockRule: StrengthBlockRule;
}

/** Moteur + contenu Cross-training de la Beta 0 expérimentale (marque SIMULATION_ONLY portée par la normalisation). */
export function ctBeta0(mark: Record<string, unknown> = {}): CtBeta0 {
  const governance = c3Governance({ hybrid: true, c4: true });
  return {
    governance,
    strengthBlockRule: CT_STRENGTH_BLOCK_RULE,
    engine: createCrossTrainingEngine({ governance, simulation: true }),
    content: withDemand({ ruleset: testRuleset(testRulesetDocumentWithDuplicate()), catalog: testCatalog(ctCatalogDocument()) }, CT_DOSE_NORMALIZATION, mark),
    simulation: [...CT_BETA0_SIMULATION],
  };
}
