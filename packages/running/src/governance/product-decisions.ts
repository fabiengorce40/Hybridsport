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
  // D6 (revue RUNNING-D2-D6-REVIEW §3) : convention CR-10 unique alignée sur Seiler & Kjerland 2006 (VT1 entre 4 et 5,
  // VT2 entre 6 et 7) ; 9–10 réservé au TEST / à l'effort maximal ; seul chevauchement : 5 (STEADY / THRESHOLD, frontière VT1).
  'running.target.rpeByDomain': {
    decisionId: 'D6',
    value: { EASY_LOW: { max: 3 }, STEADY: { min: 4, max: 5 }, THRESHOLD_LIKE: { min: 5, max: 6 }, SEVERE: { min: 7, max: 8 }, TEST: { min: 9, max: 10 }, SPRINT_NEUROMUSCULAR: 'DESCRIPTOR', overlapsIntended: 'VT1_BOUNDARY_ONLY', sources: ['RS-SEILER-KJERLAND-2006', 'RS-SCHERR-2013-RPE', 'RS-FOSTER-2001-SRPE'] },
  },
  // D2 (revue RUNNING-D2-D6-REVIEW §2) : premières structures après un TEST récent ; DI = décision d'implémentation (non sourcée).
  'running.firstExposure.threshold': {
    decisionId: 'D2',
    value: {
      requires: { referenceType: 'TIME_TRIAL', distancesM: [5000, 10000], recencyBand: 'RECENT' },
      byLevel: {
        P_R2: { warmupS: 600, reps: 3, workS: 300, recoveryS: 60, recoveryMode: 'jog', cooldownS: 300 },
        P_R3: { warmupS: 600, reps: 4, workS: 300, recoveryS: 60, recoveryMode: 'jog', cooldownS: 300 },
        P_R4: { warmupS: 600, reps: 4, workS: 360, recoveryS: 75, recoveryMode: 'jog', cooldownS: 300 },
      },
      sources: ['RS-DANIELS-CRUISE', 'RS-HELGERUD-2007-4X4'],
      implementationDecisions: ['P_R2 : 3 répétitions (réduction de première exposition)', 'P_R3 / P_R4 : bornes de l’exemple 4 × 5–6 min', 'échauffement / retour au calme : Helgerud 2007 et planchers V06 / V07'],
      confidence: 'LOW_TO_MEDIUM',
    },
  },
  'running.firstExposure.severe': {
    decisionId: 'D2',
    value: {
      requires: { referenceType: 'TIME_TRIAL', distancesM: [5000, 10000], recencyBand: 'RECENT' },
      byArchetype: {
        SEVERE: { byLevel: {
          P_R2: { warmupS: 600, reps: 3, workS: 240, recoveryS: 180, recoveryMode: 'jog', cooldownS: 300 },
          P_R3: { warmupS: 600, reps: 4, workS: 240, recoveryS: 180, recoveryMode: 'jog', cooldownS: 300 },
          P_R4: { warmupS: 600, reps: 4, workS: 240, recoveryS: 120, recoveryMode: 'jog', cooldownS: 300 },
        } },
        SHORT_INTERVAL: { byLevel: {
          P_R2: { warmupS: 600, reps: 10, workS: 30, recoveryS: 30, recoveryMode: 'jog', cooldownS: 300 },
          P_R3: { warmupS: 600, reps: 12, workS: 30, recoveryS: 30, recoveryMode: 'jog', cooldownS: 300 },
          P_R4: { warmupS: 600, reps: 15, workS: 30, recoveryS: 30, recoveryMode: 'jog', cooldownS: 300 },
        } },
      },
      sources: ['RS-HELGERUD-2007-4X4', 'RS-SEILER-2005-REST', 'RS-BILLAT-2000-3030', 'RS-BUCHHEIT-LAURSEN-2013'],
      implementationDecisions: ['SEVERE P_R2 : 3 répétitions au lieu de 4', 'SEVERE P_R4 : 4 × 4 min avec 2 min (Helgerud + Seiler)', 'SHORT : nombres de répétitions 10 / 12 / 15 (aucune source)', 'SHORT : récupération trottinée (Billat : passive)'],
      confidence: 'LOW_TO_MEDIUM',
    },
  },
  // D2 §2.4 : HILLS — première exposition BLOQUÉE par décision (protocoles Barnes 2013 / Ferley 2013 non lus, §N : aucune pente universelle).
  'running.firstExposure.hills': { decisionId: 'D2', value: { policy: 'BLOCKED_PENDING_SOURCES', sources: ['RS-BARNES-2013-HILLS', 'RS-FERLEY-2013-HILLS'] } },
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
