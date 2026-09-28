/**
 * Décisions du PROPRIÉTAIRE DU PRODUIT (2026-09-28, docs/kairo/RUNNING-COMPLETION-PLAN.md §5), appliquées en
 * SURCOUCHE explicite du registre candidat : le registre expert (`running-0.2.0-candidate`) reste inchangé,
 * la surcouche est identifiable (version de ruleset propre, provenance PRODUCT_DECISION) et retirable.
 *
 * Ces valeurs sont des CANDIDATES (maturité EXPERT_PROPOSED) : elles ne servent qu'en mode CANDIDATE
 * (simulation). La PRODUCTION exige toujours les approbations expertes et les signatures G1.
 */
import type { RunningParameter } from './parameters.js';
import type { RunningGovernance } from './state.js';

export const PRODUCT_DECISIONS_RULESET_VERSION = 'running-0.3.0-candidate+pd-2026-09-28';

/** Valeurs décidées, par paramètre (identifiants du registre). */
export const PRODUCT_DECISION_VALUES: Readonly<Record<string, { readonly value: unknown; readonly decisionId: string }>> = {
  // D1 (E-PROG option C) : pas minimal significatif, après N séances tolérées du même type, une seule variable à la fois.
  'running.progression.magnitude': { decisionId: 'D1', value: { policy: 'MINIMAL_STEP', durationStepS: 60, repetitionStep: 1, toleratedSessionsBeforeStep: 2, oneVariableAtATime: true } },
  // D3 (E-LONG option A) : dernière sortie longue réalisée (V19), sans maximum produit ; marge HD non définie ⇒ LONG compté HIGH_DEMAND.
  'running.longRun.marginAndBound': { decisionId: 'D3', value: { mechanism: 'LAST_REALIZED_LONG_RUN', productMaximum: null, highDemandMargin: null } },
  // D5 : après un retour négatif plus récent, repli sur la dernière dose réussie (jamais supérieure).
  'running.dose.historyAnchorPolicy': {
    decisionId: 'D5',
    value: { anchor: 'LAST_REALIZED_DOSE', sameArchetype: true, sameStructureFamily: true, recencyBand: 'RECENT', recencyParameter: 'running.reference.recencyBands', requiresNoNegativeResponse: true, otherwise: 'FIRST_EXPOSURE_PARAMETER', afterNegativeResponse: 'LAST_SUCCESSFUL_DOSE' },
  },
};

/** Gouvernance + décisions produit (surcouche). Toute autre donnée (G1, décisions expertes, verrou) est inchangée. */
export function withProductDecisions(g: RunningGovernance): RunningGovernance {
  const parameters = g.parameters.map((p): RunningParameter => {
    const d = PRODUCT_DECISION_VALUES[p.parameterId];
    const base = { ...p, rulesetVersion: PRODUCT_DECISIONS_RULESET_VERSION };
    if (!d) return base;
    return { ...base, value: { status: 'candidate', value: d.value }, maturity: 'EXPERT_PROPOSED', approvals: [], provenanceClass: 'PRODUCT_DECISION', decisionIds: [...new Set([...p.decisionIds, d.decisionId])] };
  });
  return { ...g, rulesetVersion: PRODUCT_DECISIONS_RULESET_VERSION, parameters };
}
