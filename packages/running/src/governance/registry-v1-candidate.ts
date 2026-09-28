/**
 * DONNÉES du registre Running V1 CANDIDAT (phase 6B). Seul fichier du paquet autorisé à porter des
 * valeurs numériques de programmation : ce sont des VALEURS CANDIDATES, gouvernées, jamais des
 * constantes d'algorithme. Sources : RUNNING-PARAMETERS-V1-CANDIDATE (5D, corrections 5E),
 * RUNNING-5E-G1-SAFETY-PACK, RUNNING-5B-SCIENTIFIC-ARBITRATION §E.
 *
 * État au moment de la phase 6B : AUCUN paramètre n'est approuvé (aucune approbation experte, produit,
 * technique ou sécurité n'a été donnée). Les valeurs non résolues de la phase 5 (V23, V28 hors
 * marathon, V31–V37, V39–V41, exposant de V38, nombre minimal de V42) restent SANS valeur.
 */
import type { RunningParameter } from './parameters.js';

export const RUNNING_RULESET_VERSION = 'running-0.1.0-candidate';

type Entry = Omit<RunningParameter, 'rulesetVersion' | 'approvals' | 'provisional' | 'maturity' | 'value'> & { readonly candidate?: unknown; readonly unresolvedReason?: string };

function build(e: Entry): RunningParameter {
  const { candidate, unresolvedReason, ...rest } = e;
  return {
    ...rest,
    value: candidate === undefined ? { status: 'unresolved', reason: unresolvedReason ?? 'aucune valeur défendable (phase 5)' } : { status: 'candidate', value: candidate },
    maturity: candidate === undefined ? 'UNRESOLVED' : 'EXPERT_PROPOSED',
    approvals: [],
    rulesetVersion: RUNNING_RULESET_VERSION,
    provisional: true,
  };
}

const E: Entry[] = [
  // ——— Cibles d'intensité ———
  { parameterId: 'running.target.rpeScale', tag: 'V01', candidate: { scale: 'CR10_MODIFIED', min: 0, max: 10 }, unit: 'rpe', provenanceClass: 'TECHNICAL', evidenceReferenceIds: ['RS-FOSTER-2001-SRPE'], sensitivity: 'LOW', governance: 'TECHNICAL', statusClass: 'TECHNICAL', decisionIds: [] },
  { parameterId: 'running.target.rpeByDomain', tag: 'V02', candidate: { EASY_LOW: { max: 3 }, STEADY: { min: 3, max: 5 }, THRESHOLD_LIKE: { min: 5, max: 7 }, SEVERE: { min: 7, max: 9 }, TEST: { min: 9, max: 10 }, SPRINT_NEUROMUSCULAR: 'DESCRIPTOR', overlapsIntended: true }, unit: 'rpe', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: ['RS-FOSTER-2001-SRPE', 'RS-REED-TALKTEST'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-RPE'] },
  { parameterId: 'running.target.paceRangeWidthByConfidence', tag: 'V03', candidate: { HIGH: { relativeHalfWidth: 0.03 }, MEDIUM: { relativeHalfWidth: 0.06 }, LOW: null }, unit: 'ratio', provenanceClass: 'SOURCE_INFORMED', evidenceReferenceIds: ['RS-HOPKINS-2001-VAR'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-PACE'] },
  { parameterId: 'running.threshold.likeMargin', tag: 'V04', candidate: { ofBoundary2Pace: { min: 1.0, max: 1.05 } }, unit: 'ratio', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: ['RS-CSD-SCOPING-2026'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-PACE'] },
  { parameterId: 'running.target.easyCeilingPaceMargin', tag: 'V40', unit: 'ratio', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'UNKNOWN', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-PACE'], unresolvedReason: 'frontière 1 rarement mesurée' },
  // ——— Structures ———
  { parameterId: 'running.interval.warmupDuration', tag: 'V06', candidate: { minS: 600, maxS: 900, floorS: 600 }, unit: 's', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'MEDIUM', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-QUALITY'] },
  { parameterId: 'running.interval.cooldownDuration', tag: 'V07', candidate: { minS: 300, maxS: 600 }, unit: 's', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'LOW', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-QUALITY'] },
  { parameterId: 'running.interval.recoveryRatio', tag: 'V08', candidate: { THRESHOLD: { min: 0.2, max: 0.35 }, SEVERE: { min: 0.5, max: 1 }, SHORT_INTERVAL: { min: 0.5, max: 1 } }, unit: 'ratio', provenanceClass: 'SOURCE_INFORMED', evidenceReferenceIds: ['RS-HIIT-METAREG', 'RS-HIIT-SHORTLONG'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-RECOVERY'] },
  { parameterId: 'running.strides.module', tag: 'V09', candidate: { reps: { min: 4, max: 6 }, workS: { min: 15, max: 20 }, recoveryS: { min: 45, max: 90 } }, unit: 'mixed', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'LOW', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-QUALITY'] },
  { parameterId: 'running.quality.minimumDose', tag: 'V31', unit: 'mixed', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-QUALITY'], unresolvedReason: 'aucun minimum universel' },
  { parameterId: 'running.severe.paceAnchor', tag: 'V18', candidate: { anchor: 'RACE_3K_TO_5K', widthParameter: 'running.target.paceRangeWidthByConfidence' }, unit: 'reference', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'MEDIUM', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-PACE'] },
  { parameterId: 'running.severe.defaultRepDuration', tag: 'V41', unit: 's', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'UNKNOWN', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-QUALITY'] },
  // ——— Densité et placement ———
  { parameterId: 'running.hi.densityPolicy', tag: 'V10', candidate: { perDays: 7, P_R0: 0, P_R1: 1, P_R2: 2, P_R3: 2, P_R4: 3 }, unit: 'sessions', provenanceClass: 'PRODUCT_GUARDRAIL', evidenceReferenceIds: ['RS-GARCIAPINILLOS-2017-HIIT'], sensitivity: 'HIGH', governance: 'PRODUCT_GUARDRAIL_AND_EXPERT', statusClass: 'PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW', decisionIds: ['E-DENSITY'] },
  { parameterId: 'running.placement.strongDefaultSeparation', tag: 'V11', candidate: { default: 'NO_CONSECUTIVE_HIGH_DEMAND_DAYS', exception: 'GLOBAL_PLANNER_REQUEST_P_R3_PLUS' }, unit: 'rule', provenanceClass: 'PRODUCT_GUARDRAIL', evidenceReferenceIds: [], sensitivity: 'MEDIUM', governance: 'PRODUCT_GUARDRAIL_AND_EXPERT', statusClass: 'PRODUCT_GUARDRAIL / PROGRAMMING_HEURISTIC', decisionIds: ['E-DENSITY'] },
  { parameterId: 'running.frequency.minimumPlannerRunningFrequency', tag: 'V26', candidate: { sessionsPerWeek: 2 }, unit: 'sessions', provenanceClass: 'PRODUCT_GUARDRAIL', evidenceReferenceIds: [], sensitivity: 'MEDIUM', governance: 'PRODUCT_GUARDRAIL', statusClass: 'PRODUCT_GUARDRAIL', decisionIds: [] },
  // ——— Références ———
  { parameterId: 'running.reference.recencyBands', tag: 'V12', candidate: { recentMaxWeeks: 8, agingMaxWeeks: 16, confidenceCapByBand: { RECENT: 'HIGH', AGING: 'MEDIUM', STALE: 'LOW' } }, unit: 'weeks', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: ['RS-MUJIKA-2000-DETRAIN'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'PROGRAMMING_HEURISTIC', decisionIds: ['E-RECENCY'] },
  { parameterId: 'running.reference.coherentTrainingEvidence', tag: 'V15', candidate: { observations: 3, windowWeeks: 2, qualitativeCoherenceRequired: true }, unit: 'mixed', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'MEDIUM', governance: 'EXPERT', statusClass: 'PROGRAMMING_HEURISTIC', decisionIds: ['E-RECENCY'] },
  { parameterId: 'running.cs.minTrialsPolicy', tag: 'V16', candidate: { minTrialsAboveMedium: 3 }, unit: 'trials', provenanceClass: 'TECHNICAL', evidenceReferenceIds: ['RS-CSD-SCOPING-2026'], sensitivity: 'LOW', governance: 'TECHNICAL', statusClass: 'TECHNICAL', decisionIds: [] },
  {
    parameterId: 'running.reference.typeConfidenceCaps', unit: 'confidence',
    // 5B §E : plafonds ORDINAUX par type de référence et décision (aucun nombre).
    candidate: { USER_DECLARED: 'LOW', TRAINING_OBSERVATION: 'MEDIUM', FIELD_THRESHOLD: 'MEDIUM', RPE_BASED: 'LOW', CALIBRATION_RESULT: 'MEDIUM', VO2MAX_TEST: { pace: 'LOW', default: 'MEDIUM' }, RACE_RESULT: 'HIGH', TIME_TRIAL: 'HIGH', CRITICAL_SPEED_TEST: 'HIGH', LAB_THRESHOLD: 'HIGH', VMA_TEST: 'HIGH' },
    provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: ['5B-E-REFERENCE-ARBITRATION', 'RS-JAMNICK-2020'], sensitivity: 'MEDIUM', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-RECENCY'],
  },
  {
    parameterId: 'running.reference.performanceVariabilityEstimate', tag: 'V42',
    candidate: { prior: { SHORT_OR_ROAD_FASTEST: { min: 0.012, max: 0.019 }, HALF_MARATHON: { min: 0.027, max: 0.042 }, MARATHON: { min: 0.026, max: 0.026 } }, slowerRunnerCvRatio: { min: 1, max: 2.3 }, sexUsed: false, ageUsed: false },
    unit: 'coefficient_of_variation', provenanceClass: 'SOURCE_INFORMED', evidenceReferenceIds: ['RS-HOPKINS-2001-VAR'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-VARIABILITY'],
  },
  { parameterId: 'running.reference.variabilityMinComparablePerformances', unit: 'performances', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'DECISION_REQUIRED', decisionIds: ['E-VARIABILITY'], unresolvedReason: 'nombre minimal DECISION_REQUIRED (5E)' },
  { parameterId: 'running.reference.conflictSeverity', tag: 'V43', candidate: { NONE: { maxMultiple: 1 }, MINOR: { minMultiple: 1, maxMultiple: 2 }, MAJOR: { minMultipleExclusive: 2 } }, unit: 'multiple_of_variability', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: ['RS-HOPKINS-2001-VAR'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'PROGRAMMING_HEURISTIC', decisionIds: ['E-VARIABILITY'] },
  // ——— Modèle de performance (V38 : famille candidate, exposant NON verrouillé) ———
  { parameterId: 'running.performance.extrapolationModelFamily', tag: 'V38', candidate: { family: 'RIEGEL_TYPE', authoritative: false, maxTargetGoal: 'HALF_MARATHON', marathonAuthority: false }, unit: 'model', provenanceClass: 'SOURCE_INFORMED', evidenceReferenceIds: ['RS-VICKERS-2016-PRED'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-MODEL'] },
  { parameterId: 'running.performance.extrapolationExponent', unit: 'dimensionless', provenanceClass: 'NONE', evidenceReferenceIds: ['RS-VICKERS-2016-PRED'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'DECISION_REQUIRED', decisionIds: ['E-MODEL'], unresolvedReason: 'exposant non verrouillé ; provenance de la valeur usuelle non vérifiée' },
  { parameterId: 'running.performance.predictionUncertaintyWidth', unit: 'ratio', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'DECISION_REQUIRED', decisionIds: ['E-MODEL'], unresolvedReason: 'largeur relevant d’E-MODEL ; V03 non réutilisé par défaut' },
  // ——— Charge et progression ———
  { parameterId: 'running.load.recentLoadContext', tag: 'V21', candidate: { windowWeeks: 4, typicalLevel: 'MEDIAN', bestTolerated: 'MAX_WITHOUT_NEGATIVE_RESPONSE', minKnownWeeks: 2, outlierFlagMultipleOfMedian: 2 }, unit: 'mixed', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: ['RS-IMPELLIZZERI-2020-ACWR'], sensitivity: 'MEDIUM', governance: 'EXPERT', statusClass: 'PROGRAMMING_HEURISTIC', decisionIds: ['E-RECENTLOAD'] },
  { parameterId: 'running.load.changeCategoryBounds', tag: 'V22', candidate: { populations: ['P_R0', 'P_R1'], ratioOver: 1.3, windowWeeks: 2, effect: 'PROPOSAL_CAPPED' }, unit: 'ratio', provenanceClass: 'PRODUCT_GUARDRAIL', evidenceReferenceIds: ['RS-NIELSEN-2014-DANORUN'], sensitivity: 'HIGH', governance: 'PRODUCT_GUARDRAIL_AND_EXPERT', statusClass: 'PRODUCT_GUARDRAIL', decisionIds: ['E-LOAD'] },
  { parameterId: 'running.progression.magnitude', tag: 'V23', unit: 'mixed', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-PROG'], unresolvedReason: 'aucune magnitude universelle' },
  { parameterId: 'running.longRun.marginAndBound', tag: 'V32', unit: 'mixed', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-LONG'], unresolvedReason: 'aucune borne défendable' },
  { parameterId: 'running.specific.portionWithoutHistory', tag: 'V39', unit: 'mixed', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'UNKNOWN', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-QUALITY'] },
  // ——— Premières expositions ———
  { parameterId: 'running.firstExposure.threshold', tag: 'V35', unit: 'mixed', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-FIRST'], unresolvedReason: 'aucune preuve' },
  { parameterId: 'running.firstExposure.severe', tag: 'V36', unit: 'mixed', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-FIRST'], unresolvedReason: 'aucune preuve' },
  { parameterId: 'running.firstExposure.hills', tag: 'V37', unit: 'mixed', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'EXPERT_DESIGN_REVIEW', decisionIds: ['E-FIRST'], unresolvedReason: 'aucune preuve (pente comprise)' },
  // ——— Taper ———
  { parameterId: 'running.taper.volumeReduction', tag: 'V27', candidate: { reduction: { min: 0.41, max: 0.6 }, imposedOnAllEvents: false }, unit: 'ratio', provenanceClass: 'SOURCE_DERIVED', evidenceReferenceIds: ['RS-WANG-2023-TAPER', 'RS-BOSQUET-2007-TAPER'], sensitivity: 'HIGH', governance: 'EXPERT', statusClass: 'SUPPORTED_WITH_RANGE / CONTEXT_DEPENDENT', decisionIds: ['E-TAPER'] },
  { parameterId: 'running.taper.durationByEvent', tag: 'V28', unit: 'weeks', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'MEDIUM', governance: 'EXPERT', statusClass: 'CONTEXT_DEPENDENT', decisionIds: ['E-TAPER'], unresolvedReason: 'aucune preuve propre à l’épreuve (5K, 10K, semi)' },
  { parameterId: 'running.taper.durationMarathon', tag: 'V28m', candidate: { weeks: { min: 2, max: 3 }, observational: true }, unit: 'weeks', provenanceClass: 'SOURCE_INFORMED', evidenceReferenceIds: ['RS-SMYTH-2021-TAPER', 'RS-BOSQUET-2007-TAPER', 'RS-WANG-2023-TAPER'], sensitivity: 'MEDIUM', governance: 'EXPERT', statusClass: 'CONTEXT_DEPENDENT', decisionIds: ['E-TAPER'] },
  // ——— Reprise et novice (G1) ———
  { parameterId: 'running.return.stateBoundaries', tag: 'V24', candidate: { SHORT: { maxDays: 7 }, MODERATE: { minDays: 8, maxDays: 27 }, LONG: { minDays: 28 }, unknownNeverConverted: true }, unit: 'days', provenanceClass: 'SOURCE_INFORMED', evidenceReferenceIds: ['RS-MUJIKA-2000-DETRAIN'], sensitivity: 'HIGH', governance: 'G1_POLICY', g1PolicyId: 'G1-RETURN', statusClass: 'SAFETY_SIGNOFF_REQUIRED', decisionIds: [] },
  { parameterId: 'running.return.resumeCondition', tag: 'V25', candidate: { postReturnSessionsWithoutSignal: 2 }, unit: 'sessions', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'MEDIUM', governance: 'EXPERT', statusClass: 'PROGRAMMING_HEURISTIC', decisionIds: [] },
  { parameterId: 'running.return.protocol', candidate: { LONG: 'EASY_ONLY', doseCap: 'AT_MOST_REALIZED_POST_RETURN', firstExposureDose: 'running.return.firstExposureDose' }, unit: 'policy', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'G1_POLICY', g1PolicyId: 'G1-RETURN', statusClass: 'SAFETY_SIGNOFF_REQUIRED', decisionIds: [] },
  { parameterId: 'running.return.unknownStateHandling', candidate: { unknownIsNeverNormal: true, action: 'INFORMATION_REQUEST' }, unit: 'policy', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'G1_POLICY', g1PolicyId: 'G1-RETURN', statusClass: 'SAFETY_SIGNOFF_REQUIRED', decisionIds: [] },
  { parameterId: 'running.return.firstExposureDose', tag: 'V34', unit: 'mixed', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'G1_DOSE', g1PolicyId: 'G1-RETURN', statusClass: 'G1', decisionIds: [], unresolvedReason: 'aucune dose défendable (première exposition après une longue coupure)' },
  { parameterId: 'running.safety.noviceEntryProtocol', candidate: { noMaximalTest: true, noHighDemandSession: true, target: 'RPE_CEILING_OR_TALK_TEST', eligibilityQuestions: 'G1-SCOPE' }, unit: 'policy', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'G1_POLICY', g1PolicyId: 'G1-NOVICE', statusClass: 'SAFETY_SIGNOFF_REQUIRED', decisionIds: [] },
  { parameterId: 'running.novice.entryDose', tag: 'V33', unit: 'mixed', provenanceClass: 'NONE', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'G1_DOSE', g1PolicyId: 'G1-NOVICE', statusClass: 'G1', decisionIds: [], unresolvedReason: 'aucune dose d’entrée novice validée' },
  { parameterId: 'running.safety.painActionPolicy', candidate: { policyId: 'R-G1-PAIN-STOP', diagnosis: false }, unit: 'policy', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'G1_POLICY', g1PolicyId: 'G1-PAIN', statusClass: 'SAFETY_SIGNOFF_REQUIRED', decisionIds: [] },
  { parameterId: 'running.safety.painWording', candidate: { neutralProductLanguage: true, diagnosis: false }, unit: 'policy', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'MEDIUM', governance: 'G1_POLICY', g1PolicyId: 'G1-PAIN', statusClass: 'SAFETY_SIGNOFF_REQUIRED', decisionIds: [] },
  { parameterId: 'running.safety.outOfScopeTriggers', candidate: { policyId: 'R-G1-OUT-OF-SCOPE', triggers: ['ELITE', 'PREGNANCY_POSTPARTUM', 'DECLARED_PATHOLOGY', 'MEDICALLY_SUPERVISED_RETURN', 'UNDER_18'] }, unit: 'policy', provenanceClass: 'EXPERT_PROPOSED', evidenceReferenceIds: [], sensitivity: 'HIGH', governance: 'G1_POLICY', g1PolicyId: 'G1-SCOPE', statusClass: 'SAFETY_SIGNOFF_REQUIRED', decisionIds: [] },
];

/** Registre V1 candidat : aucun paramètre approuvé ; les paramètres non résolus sont SANS valeur. */
export const RUNNING_PARAMETER_REGISTRY_V1_CANDIDATE: readonly RunningParameter[] = E.map(build);
