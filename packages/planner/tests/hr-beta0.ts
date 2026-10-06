/**
 * HYROX H2 pour l'environnement Beta 0 EXPÉRIMENTAL (SIMULATION_ONLY), source unique côté planificateur (comme
 * `ct-beta0.ts`) :
 *   - moteur HYROX en mode simulation (CANDIDATE) ;
 *   - contenu : ruleset de test du CORE avec anti-doublon + paramètres H2 TEST_ONLY (`h2-governance.ts` : draft,
 *     provisoires, ordre d'épreuve ARBITRAIRE) + normalisation des doses de test ; catalogue HYROX de test (clones
 *     TEST_ONLY du sled pull et du burpee broad jump).
 * Rien n'est promu : en PRODUCTION chaque paramètre H2 est refusé (NOT_PRODUCTION_READY) — fail-closed.
 * L'application n'importe jamais le paquet HYROX : elle passe par ce module et par la façade du planificateur.
 */
import { createHyroxEngine } from '@hybridsport/hyrox';
import type { HyroxEngine } from '@hybridsport/hyrox';
import type { LoadedCatalog, LoadedRuleset } from '@hybridsport/engine';
import { testRuleset } from '../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../engine/tests/fixtures/ruleset.js';
import { h2Parameters } from '../../hyrox/tests/h2-governance.js';
import { hyroxCatalog } from '../../hyrox/tests/fixtures.js';
import { TEST_DOSE_NORMALIZATION, withDemand } from './simulation.js';

/** Identifiants SIMULATION_ONLY tracés dans chaque semaine Beta 0 qui contient une séance HYROX. */
export const HR_BETA0_SIMULATION = ['hybrid_race.h2.testGovernance', 'hybrid_race.engine.simulation', 'demand.doseNormalization.hybrid_race'] as const;

export interface HrBeta0 {
  readonly engine: HyroxEngine;
  readonly content: { readonly ruleset: LoadedRuleset; readonly catalog: LoadedCatalog };
  readonly simulation: readonly string[];
}

/** Moteur + contenu HYROX H2 de la Beta 0 expérimentale (marque SIMULATION_ONLY portée par la normalisation). */
export function hrBeta0(mark: Record<string, unknown> = {}): HrBeta0 {
  const doc = testRulesetDocumentWithDuplicate();
  return {
    engine: createHyroxEngine({ simulation: true }),
    content: withDemand({ ruleset: testRuleset({ ...doc, parameters: [...doc.parameters, ...h2Parameters()] }), catalog: hyroxCatalog() }, TEST_DOSE_NORMALIZATION, mark),
    simulation: [...HR_BETA0_SIMULATION],
  };
}
