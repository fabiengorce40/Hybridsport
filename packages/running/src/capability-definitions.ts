/**
 * Définitions des capacités (5G) : identifiants, socle et dépendances. Données de structure seulement.
 */
import { RUNNING_CODES } from './codes.js';
import type { RunningCode } from './codes.js';
import type { ExpertDecisionId, G1PolicyId, TechnicalDependencyId } from './governance/state.js';

export const CAPABILITY_IDS = [
  'noviceEntry', 'longReturn', 'progressionBeyondHistory', 'longRunProgression', 'firstThresholdExposure',
  'firstSevereExposure', 'marathon', 'performanceExtrapolation', 'taper', 'paceTargets', 'hybridPlanning',
] as const;
export type CapabilityId = (typeof CAPABILITY_IDS)[number];
export type CapabilityOrFoundation = CapabilityId | 'foundation';

export interface CapabilityDefinition {
  readonly id: CapabilityOrFoundation;
  /** Clé de configuration 5G (`running.<id>.enabled`). */
  readonly flagKey: string;
  readonly decisions: readonly ExpertDecisionId[];
  readonly parameters: readonly string[];
  readonly g1Policies: readonly G1PolicyId[];
  readonly technical: readonly TechnicalDependencyId[];
  /** Code émis quand la capacité est indisponible (comportement désactivé 5G). */
  readonly disabledCode: RunningCode;
}

/**
 * Socle (5G) : sans lui, AUCUNE production n'est possible. Il n'a pas de drapeau.
 * Paramètres : les 7 paramètres des politiques G1 et ceux des décisions du socle.
 */
export const FOUNDATION: CapabilityDefinition = {
  id: 'foundation', flagKey: 'running.foundation',
  decisions: ['E-RPE', 'E-DENSITY', 'E-RECENCY', 'E-RECENTLOAD'],
  g1Policies: ['G1-PAIN', 'G1-SCOPE', 'G1-NOVICE', 'G1-RETURN'],
  technical: ['CORE_EXT_R1'],
  parameters: [
    'running.safety.painActionPolicy', 'running.safety.painWording', 'running.safety.outOfScopeTriggers', 'running.safety.noviceEntryProtocol',
    'running.return.stateBoundaries', 'running.return.protocol', 'running.return.unknownStateHandling',
    'running.target.rpeScale', 'running.target.rpeByDomain', 'running.hi.densityPolicy', 'running.placement.strongDefaultSeparation',
    'running.reference.recencyBands', 'running.reference.coherentTrainingEvidence', 'running.reference.typeConfidenceCaps', 'running.load.recentLoadContext',
  ],
  disabledCode: RUNNING_CODES.G1_POLICY_UNSIGNED,
};

/** Les 11 drapeaux du périmètre C (5G), avec leurs dépendances logiques (graphe 5G §3). */
export const CAPABILITIES: Readonly<Record<CapabilityId, CapabilityDefinition>> = {
  noviceEntry: { id: 'noviceEntry', flagKey: 'running.noviceEntry.enabled', decisions: [], g1Policies: ['G1-SCOPE', 'G1-NOVICE'], technical: [], parameters: ['running.safety.noviceEntryProtocol', 'running.novice.entryDose'], disabledCode: RUNNING_CODES.NOVICE_ENTRY_UNRESOLVED },
  longReturn: { id: 'longReturn', flagKey: 'running.longReturn.enabled', decisions: [], g1Policies: ['G1-RETURN'], technical: [], parameters: ['running.return.stateBoundaries', 'running.return.protocol', 'running.return.unknownStateHandling', 'running.return.firstExposureDose'], disabledCode: RUNNING_CODES.RETURN_PROTOCOL_UNRESOLVED },
  progressionBeyondHistory: { id: 'progressionBeyondHistory', flagKey: 'running.progressionBeyondHistory.enabled', decisions: ['E-RECENTLOAD', 'E-PROG'], g1Policies: [], technical: [], parameters: ['running.load.recentLoadContext', 'running.progression.magnitude'], disabledCode: RUNNING_CODES.PROGRESSION_UNRESOLVED },
  longRunProgression: { id: 'longRunProgression', flagKey: 'running.longRunProgression.enabled', decisions: ['E-LONG', 'E-PROG'], g1Policies: [], technical: [], parameters: ['running.longRun.marginAndBound', 'running.progression.magnitude'], disabledCode: RUNNING_CODES.PROGRESSION_UNRESOLVED },
  firstThresholdExposure: { id: 'firstThresholdExposure', flagKey: 'running.firstThresholdExposure.enabled', decisions: ['E-FIRST', 'E-RECOVERY'], g1Policies: [], technical: [], parameters: ['running.firstExposure.threshold', 'running.interval.recoveryRatio'], disabledCode: RUNNING_CODES.FIRST_EXPOSURE_UNRESOLVED },
  firstSevereExposure: { id: 'firstSevereExposure', flagKey: 'running.firstSevereExposure.enabled', decisions: ['E-FIRST', 'E-RECOVERY'], g1Policies: [], technical: [], parameters: ['running.firstExposure.severe', 'running.firstExposure.hills', 'running.interval.recoveryRatio'], disabledCode: RUNNING_CODES.FIRST_EXPOSURE_UNRESOLVED },
  marathon: { id: 'marathon', flagKey: 'running.marathon.enabled', decisions: ['E-LONG', 'E-TAPER'], g1Policies: [], technical: [], parameters: ['running.longRun.marginAndBound', 'running.taper.durationMarathon'], disabledCode: RUNNING_CODES.MARATHON_RULE_UNRESOLVED },
  performanceExtrapolation: { id: 'performanceExtrapolation', flagKey: 'running.performanceExtrapolation.enabled', decisions: ['E-MODEL', 'E-VARIABILITY'], g1Policies: [], technical: [], parameters: ['running.performance.extrapolationModelFamily', 'running.performance.extrapolationExponent', 'running.performance.predictionUncertaintyWidth', 'running.reference.performanceVariabilityEstimate'], disabledCode: RUNNING_CODES.MODEL_UNAVAILABLE },
  taper: { id: 'taper', flagKey: 'running.taper.enabled', decisions: ['E-TAPER'], g1Policies: [], technical: [], parameters: ['running.taper.volumeReduction', 'running.taper.durationByEvent'], disabledCode: RUNNING_CODES.CAPABILITY_DISABLED },
  paceTargets: { id: 'paceTargets', flagKey: 'running.paceTargets.enabled', decisions: ['E-PACE'], g1Policies: [], technical: [], parameters: ['running.target.paceRangeWidthByConfidence', 'running.threshold.likeMargin'], disabledCode: RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED },
  hybridPlanning: { id: 'hybridPlanning', flagKey: 'running.hybridPlanning.enabled', decisions: [], g1Policies: [], technical: ['GLOBAL_PLANNER_INTEGRATION'], parameters: [], disabledCode: RUNNING_CODES.HYBRID_PLANNER_UNAVAILABLE },
};
