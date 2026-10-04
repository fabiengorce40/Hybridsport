/**
 * Registre Cross-training C1 : DONNÉES de gouvernance. Chaque paramètre est NON RÉSOLU (aucune valeur, maturité
 * UNRESOLVED, statut de preuve UNRESOLVED). Aucune hypothèse de spec, aucune valeur de fixture, aucun défaut.
 * La revue de preuve (docs/kairo/CROSSTRAINING-EVIDENCE-PACK.md) classe chaque paramètre en (a) soutenu,
 * (b) dérivé, (c) décision experte / produit, (d) non résolu ; seule une décision tracée peut changer une entrée.
 *
 * Trois concepts SÉPARÉS, jamais partagés par un même paramètre :
 * - ESTIMATION : débit d'un mouvement, sert uniquement à estimer une durée (`ct.estimation.*`) ;
 * - PRESCRIPTION : ce que l'athlète reçoit (reps, calories, mètres, durée, charge, effort) (`ct.dose.*`, `ct.format.*`…) ;
 * - RESULT : la mesure d'une performance réalisée ; le format de résultat est un CONTRAT (context.ts), et seule la
 *   règle de comparaison / complétion utilisée par le rejeu est un paramètre (`ct.history.completionCriterion`).
 */
import type { CtParameter, GovernanceClass, ParameterCategory } from './parameters.js';

export const CT_RULESET_VERSION = 'crosstraining-c1-unresolved';
const REVIEW = 'docs/kairo/CROSSTRAINING-EVIDENCE-PACK.md';

function unresolved(parameterId: string, decisionId: string, category: ParameterCategory, unit: string, governance: GovernanceClass, reason: string): CtParameter {
  return {
    parameterId, decisionId, category, unit, governance, reviewRef: `${REVIEW}#${decisionId.toLowerCase()}`,
    value: { status: 'unresolved', reason }, maturity: 'UNRESOLVED', evidenceStatus: 'UNRESOLVED', approvals: [], rulesetVersion: CT_RULESET_VERSION,
  };
}

export const CT_PARAMETER_REGISTRY_C1: readonly CtParameter[] = [
  // CT-D1 — stimuli, formats, domaines de temps, rapports travail / repos
  unresolved('ct.stimulus.catalog', 'CT-D1', 'CLASSIFICATION', 'stimulus-definition', 'EXPERT', 'définition des stimuli non décidée'),
  unresolved('ct.stimulus.admissibleFormats', 'CT-D1', 'CLASSIFICATION', 'format-set-per-stimulus', 'EXPERT', 'formats admissibles par stimulus non décidés'),
  unresolved('ct.stimulus.timeDomains', 'CT-D1', 'PRESCRIPTION', 's', 'EXPERT', 'domaines de temps par stimulus non décidés'),
  unresolved('ct.stimulus.intensityBand', 'CT-D1', 'CLASSIFICATION', 'E5-band', 'EXPERT', 'bande d’intensité par stimulus non décidée'),
  unresolved('ct.stimulus.workRestRatios', 'CT-D1', 'PRESCRIPTION', 'work:rest', 'EXPERT', 'rapports travail / repos non décidés'),
  // CT-D2 — estimation (débit) et construction de dose : DEUX paramètres distincts
  unresolved('ct.estimation.workRates', 'CT-D2', 'ESTIMATION', 'unit-per-min-per-level', 'EXPERT', 'débits de mouvement non mesurés ni décidés (fixtures du catalogue de test exclues)'),
  unresolved('ct.dose.construction', 'CT-D2', 'PRESCRIPTION', 'rule', 'EXPERT', 'règle de construction d’une dose prescrite non décidée'),
  // CT-D3 — time cap
  unresolved('ct.format.timeCapMargin', 'CT-D3', 'PRESCRIPTION', 'ratio-over-slow-estimate', 'EXPERT', 'marge du time cap non décidée'),
  // CT-D4 — première exposition
  unresolved('ct.firstExposure.byStimulus', 'CT-D4', 'PRESCRIPTION', 'dose-per-stimulus-per-level', 'G1_DOSE', 'dose d’entrée non décidée'),
  // CT-D4 (bootstrap C2) — mouvements d'amorçage × durée fixe approuvée PAR MOUVEMENT ; indépendant de toute taxonomie
  unresolved('ct.bootstrap.movementAllowlist', 'CT-D4', 'PRESCRIPTION', 'movement-fixed-duration-s', 'G1_DOSE', 'aucun mouvement ni aucune durée d’amorçage approuvés'),
  // CT-D5 — progression
  unresolved('ct.progression.magnitude', 'CT-D5', 'PRESCRIPTION', 'step-per-variable', 'EXPERT', 'pas de progression non décidé'),
  unresolved('ct.progression.toleranceRule', 'CT-D5', 'HISTORY', 'rule', 'EXPERT', 'conditions de progression non décidées'),
  // CT-D6 — plafonds par séance
  unresolved('ct.safety.repsPerMovementCap', 'CT-D6', 'SAFETY', 'reps-per-movement-per-session', 'G1_DOSE', 'plafond de répétitions non décidé'),
  unresolved('ct.safety.jumpContactsCap', 'CT-D6', 'SAFETY', 'contacts-per-session', 'G1_DOSE', 'plafond de contacts de sauts non décidé'),
  // CT-D7 — technique sous fatigue
  unresolved('ct.safety.technicalUnderFatigue', 'CT-D7', 'SAFETY', 'rule', 'G1_POLICY', 'seuil « haut volume » d’un mouvement technique non décidé'),
  // CT-D8 — densité EMOM
  unresolved('ct.format.emomDensity', 'CT-D8', 'PRESCRIPTION', 's-work-per-min', 'EXPERT', 'densité EMOM non décidée'),
  // CT-D9 — cibles d'effort
  unresolved('ct.intensity.effortTargetByStimulus', 'CT-D9', 'PRESCRIPTION', 'CR10', 'EXPERT', 'cible d’effort par stimulus non décidée'),
  // CT-D10 — haute intensité, semaine
  unresolved('ct.hi.classification', 'CT-D10', 'CLASSIFICATION', 'stimulus-set', 'EXPERT', 'stimuli comptés « haute intensité » non décidés'),
  unresolved('ct.week.stimulusDistribution', 'CT-D10', 'PLANNING', 'distribution-per-14-days', 'EXPERT', 'répartition hebdomadaire non décidée'),
  // CT-D11 — multisport : le planificateur global décide, jamais le moteur Cross-training
  unresolved('ct.hybrid.policy', 'CT-D11', 'PLANNING', 'policy', 'PRODUCT', 'politique multisport à définir par le planificateur global'),
  // CT-D12 — charges
  unresolved('ct.load.implementStandards', 'CT-D12', 'PRESCRIPTION', 'kg-per-implement', 'EXPERT', 'standards d’implément non décidés'),
  unresolved('ct.load.percentE1rmByStimulus', 'CT-D12', 'PRESCRIPTION', 'percent-e1rm', 'EXPERT', 'charges relatives non décidées'),
  // CT-D13 — scaling
  unresolved('ct.scaling.rules', 'CT-D13', 'PRESCRIPTION', 'rule-table', 'EXPERT', 'règles de scaling non décidées'),
  // CT-D14 — benchmarks
  unresolved('ct.benchmark.set', 'CT-D14', 'PLANNING', 'benchmark-set', 'EXPERT', 'benchmarks non décidés'),
  unresolved('ct.benchmark.cadence', 'CT-D14', 'PLANNING', 'days', 'EXPERT', 'cadence des benchmarks non décidée'),
  // CT-D15 — rejeu de l'historique réalisé
  unresolved('ct.history.anchorPolicy', 'CT-D15', 'HISTORY', 'rule', 'PRODUCT_AND_EXPERT', 'politique de rejeu non décidée'),
  unresolved('ct.history.recencyBand', 'CT-D15', 'HISTORY', 'days', 'EXPERT', 'fenêtre de récence non décidée'),
  unresolved('ct.history.negativeResponse', 'CT-D15', 'HISTORY', 'rule', 'EXPERT', 'définition du retour négatif non décidée'),
  unresolved('ct.history.completionCriterion', 'CT-D15', 'RESULT', 'rule', 'PRODUCT_AND_EXPERT', 'critère « séance terminée comme prescrite » non décidé'),
  // CT-G1 — politiques de sécurité
  unresolved('ct.safety.novicePolicy', 'CT-G1', 'SAFETY', 'rule', 'G1_POLICY', 'exclusions novice non signées'),
  unresolved('ct.return.protocol', 'CT-G1', 'SAFETY', 'rule', 'G1_POLICY', 'protocole de reprise non signé'),
  unresolved('ct.safety.novelEccentricVolume', 'CT-G1', 'SAFETY', 'rule', 'G1_POLICY', 'limite de volume excentrique sur un mouvement nouveau non signée'),
];
