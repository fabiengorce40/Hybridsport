/**
 * Cross-training C3 pour l'environnement Beta 0 EXPÉRIMENTAL (SIMULATION_ONLY), source unique côté planificateur :
 *   - moteur Cross-training en mode simulation, gouvernance C3 TEST_ONLY (`c3-governance.ts`, valeurs EXPERT_PROPOSED,
 *     jamais PRODUCTION_ELIGIBLE) avec multisport admis (planificateur global déclaré satisfait, `ct.hybrid.policy` de
 *     test) et SANS politique de charge (mouvements chargés inéligibles) ;
 *   - contenu : ruleset de test du CORE AVEC les paramètres d'anti-doublon (comme Running : sans eux, toute génération
 *     qui reçoit un historique d'empreintes échoue) + normalisation des doses Cross-training (mètres, calories) TEST_ONLY.
 * Rien n'est promu : en PRODUCTION chaque paramètre est non résolu et la composition refuse (fail-closed).
 * L'application n'importe jamais le paquet Cross-training : elle passe par ce module du planificateur.
 */
import { createCrossTrainingEngine } from '@hybridsport/crosstraining';
import type { CrossTrainingEngine, CtGovernance } from '@hybridsport/crosstraining';
import type { LoadedCatalog, LoadedRuleset } from '@hybridsport/engine';
import { testCatalog, testRuleset } from '../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../engine/tests/fixtures/ruleset.js';
import { c3Governance } from '../../crosstraining/tests/c3-governance.js';
import { TEST_DOSE_NORMALIZATION, withDemand } from './simulation.js';

/** Identifiants SIMULATION_ONLY tracés dans chaque semaine Beta 0 qui contient une séance Cross-training. */
export const CT_BETA0_SIMULATION = ['crosstraining.c3.testGovernance', 'crosstraining.engine.simulation', 'demand.doseNormalization.crosstraining'] as const;

// technical-constant: TEST_ONLY — normalisation des mètres / calories Cross-training (profil de demande), comme les rapports C3
export const CT_DOSE_NORMALIZATION = { ...TEST_DOSE_NORMALIZATION, crosstraining: { ...TEST_DOSE_NORMALIZATION.crosstraining, meter: { perUnit: 0.01, intensityBand: 'high' }, calorie: { perUnit: 0.2, intensityBand: 'high' } } };

export interface CtBeta0 {
  readonly engine: CrossTrainingEngine;
  readonly content: { readonly ruleset: LoadedRuleset; readonly catalog: LoadedCatalog };
  readonly simulation: readonly string[];
  /** Q1 — gouvernance lue par le diagnostic de qualité (base des valeurs). */
  readonly governance: CtGovernance;
}

/** Moteur + contenu Cross-training de la Beta 0 expérimentale (marque SIMULATION_ONLY portée par la normalisation). */
export function ctBeta0(mark: Record<string, unknown> = {}): CtBeta0 {
  const governance = c3Governance({ hybrid: true });
  return {
    governance,
    engine: createCrossTrainingEngine({ governance, simulation: true }),
    content: withDemand({ ruleset: testRuleset(testRulesetDocumentWithDuplicate()), catalog: testCatalog() }, CT_DOSE_NORMALIZATION, mark),
    simulation: [...CT_BETA0_SIMULATION],
  };
}
