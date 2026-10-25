/**
 * RC5.3 — CONTENU PROVISOIRE versionné de la progression individualisée, en SURCOUCHES successives du contenu RC5.1
 * (qui reste inchangé et reproductible à l'identique : registre de contenu versionné d'app-core). Un lot = une version.
 *
 * Lot R4 (`0.9.0-strength-rc53-r4`) — séances modifiées, variante SOUPLE validée le 2026-10-25 :
 * paramètre facultatif `strength.progression.policy.modifiedExposure` = `{ mode: 'soft', recalculateLoad: false }`.
 * - une exposition à prescription modifiée (interférence, état du jour, temps, adaptation au démarrage) est classée
 *   contre son RIR de RÉFÉRENCE, jamais contre le RIR relevé ;
 * - elle ne provoque jamais de régression du seul fait de la modification ;
 * - elle fournit un signal de capacité seulement si l'effort déclaré est exploitable (réussite, RIR saisi) ;
 * - aucune hausse de charge ni validation d'essai n'en découle seule ;
 * - R4.4 (recalcul de la charge quand le RIR est relevé) : NON activé (`recalculateLoad: false`).
 * Catalogue : inchangé (F6). Composition, archétypes, volumes : inchangés.
 */
import type { GovernanceClass, ParameterValue, RulesetDocumentInput } from '@hybridsport/domain';
import { param } from '../../../engine/tests/fixtures/ruleset.js';
import { STRENGTH_OPTIONAL_PARAMETER_SCHEMAS } from '../../src/index.js';
import { RC51_RULESET_VERSION, strengthRc51RulesetDocument } from './rc51.js';

export const RC53_R4_RULESET_VERSION = '0.9.0-strength-rc53-r4';

/** Politique R4 du lot (variante souple, recalcul R4.4 désactivé) ; `recalculateLoad` modifiable pour l'étude R4.4. */
export function rc53R4Policy(recalculateLoad = false): ParameterValue {
  return { modifiedExposure: { mode: 'soft', recalculateLoad } } as unknown as ParameterValue;
}

export function strengthRc53R4RulesetDocument(o: { readonly recalculateLoad?: boolean } = {}): RulesetDocumentInput {
  const base = strengthRc51RulesetDocument();
  const pid = 'strength.progression.policy';
  return {
    ...base,
    rulesetVersion: RC53_R4_RULESET_VERSION,
    parameters: [...base.parameters, param(pid, rc53R4Policy(o.recalculateLoad === true), STRENGTH_OPTIONAL_PARAMETER_SCHEMAS[pid].governance as GovernanceClass, {
      version: '0.9.0', modifiedAt: '2026-10-25', justification: `RC5.3 R4 — séances modifiées, lecture souple (décision du 2026-10-25) ; surcouche de ${RC51_RULESET_VERSION}.`,
    })],
  };
}
