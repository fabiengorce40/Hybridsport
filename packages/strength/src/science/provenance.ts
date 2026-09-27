/**
 * Provenance structurée de CHAQUE paramètre sportif `strength.*` pour le ruleset scientifique V1 candidat.
 * Toutes les valeurs restent PROVISOIRES : aucune n'a de validation formelle (visa d'expert ou de sécurité).
 * Le statut d'un paramètre n'est jamais plus fort que la plus faible des revendications qui déterminent sa
 * VALEUR (contrôlé par `validateScienceRegistry`).
 */
import type { GovernanceClass } from '@hybridsport/domain';
import type { EvidenceClaim, EvidenceType, ParameterChange, ParameterProvenance, RegistryConfidence, ScientificStatus } from './types.js';
import { EVIDENCE_TYPES } from './types.js';
import { SCIENCE_SOURCES } from './sources.js';

export const SCIENCE_RULESET_VERSION = '0.4.0-strength-science-lock';
const REVIEW_DATE = '2026-09-28';

const ADULTS = 'Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée';
const DESIGN = 'Sans objet (choix de conception du moteur)';

interface P {
  readonly id: string;
  readonly status: ScientificStatus;
  readonly governance: GovernanceClass;
  readonly change: ParameterChange;
  readonly valueNote: string;
  readonly rationale: string;
  readonly uncertainty: string;
  readonly insufficient: string;
  readonly claims?: readonly EvidenceClaim[];
  readonly population?: string;
  readonly outcome?: string;
  readonly evidenceType?: EvidenceType;
  readonly confidence?: RegistryConfidence;
  readonly also?: readonly ScientificStatus[];
  readonly split?: { readonly mechanism: ScientificStatus; readonly magnitude: ScientificStatus; readonly note: string };
}

/** Type de preuve le plus fort parmi les sources citées (ordre de `EVIDENCE_TYPES`). */
function strongestType(ids: readonly string[]): EvidenceType {
  const types = ids.map((id) => SCIENCE_SOURCES.find((x) => x.id === id)?.evidenceType ?? 'none');
  return [...types].sort((a, b) => EVIDENCE_TYPES.indexOf(a) - EVIDENCE_TYPES.indexOf(b))[0] ?? 'none';
}

const c = (id: string, statement: string, status: ScientificStatus, sourceIds: readonly string[], valueDetermining: boolean): EvidenceClaim => ({ id, statement, status, sourceIds, valueDetermining });

function prov(p: P): ParameterProvenance {
  const claims = p.claims ?? [];
  const sourceIds = [...new Set(claims.flatMap((x) => x.sourceIds))].sort();
  const technical = p.status === 'TECHNICAL';
  return {
    parameterId: p.id, rulesetVersion: SCIENCE_RULESET_VERSION, status: p.status, alsoClassifiedAs: p.also ?? [], governance: p.governance,
    population: p.population ?? (sourceIds.length > 0 ? ADULTS : DESIGN),
    outcome: p.outcome ?? (technical ? 'Sans objet (paramètre technique)' : 'Sans objet (aucune mesure d’effet)'),
    sourceIds, evidenceType: p.evidenceType ?? (technical ? 'technical' : sourceIds.length > 0 ? strongestType(sourceIds) : p.status === 'PRODUCT_GUARDRAIL' ? 'product_policy' : 'expert_design'),
    confidence: p.confidence ?? (technical ? 'not_applicable' : 'very_low'),
    uncertainty: p.uncertainty, rationale: p.rationale, reviewDate: REVIEW_DATE,
    provisional: !technical, expertSignoffRequired: !technical, safetySignoffRequired: p.governance === 'G1',
    change: p.change, valueNote: p.valueNote, insufficientEvidenceBehaviour: p.insufficient, claims, signoffs: [],
    ...(p.split ? { evidenceSplit: p.split } : {}),
  };
}

const KEEP = 'Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed).';
const G1_BLOCK = 'Paramètre G1 : bloqué sans visa de sécurité ; aucune promotion possible, la valeur provisoire reste la référence prudente du cliquet G1.';

export const PARAMETER_PROVENANCE: readonly ParameterProvenance[] = [
  prov({ id: 'strength.needs', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'unchanged',
    valueNote: 'Table besoin → exigence de mouvement, inchangée.', rationale: 'Taxonomie de conception (patterns, régions) ; aucune question empirique directe.',
    uncertainty: 'Découpage des besoins à relire par un expert.', insufficient: KEEP }),
  prov({ id: 'strength.archetypes', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'unchanged',
    valueNote: 'Archétypes et emplacements inchangés.', rationale: 'Structure de séance (emplacements, groupes de choix) ; la fréquence est un outil de répartition du planificateur (P6).',
    uncertainty: 'Choix de conception ; la fréquence optimale dépend de l’objectif.', insufficient: KEEP,
    claims: [c('C.FREQ', 'La fréquence a un effet positif sur la force et négligeable sur l’hypertrophie à volume égal.', 'CONTEXT_DEPENDENT', ['SRC.PELLAND_2026'], false)] }),
  prov({ id: 'strength.goals', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'unchanged',
    valueNote: 'Priorités de besoins par objectif, inchangées.', rationale: 'Ordre de priorité de conception.', uncertainty: 'À relire par un expert par objectif.', insufficient: KEEP }),
  prov({ id: 'strength.stimuli', status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'unchanged',
    valueNote: 'Ordres des optionnels et répartitions énergétiques inchangés.', rationale: 'Heuristiques de programmation.', uncertainty: 'Aucune source.', insufficient: KEEP }),
  prov({ id: 'strength.session.mobility', status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'warmupS 180–300 s et cooldownS 0–180 s inchangés ; en V1 le minimum d’échauffement seul est garanti (politique `strength.session.durationPriority`).',
    rationale: 'L’échauffement général est contextuel et distinct de la montée spécifique (P12) ; le retour au calme est facultatif (P13).',
    uncertainty: 'Aucune durée démontrée ; effets d’échauffement surtout sur la puissance et le taux de développement de la force.', insufficient: KEEP,
    claims: [
      c('C.WU_RFD', 'L’échauffement musculaire améliore le taux de développement de la force et la puissance, pas la force maximale.', 'CONTEXT_DEPENDENT', ['SRC.WARMUP_FORCE_MA'], false),
      c('C.WU_DUR', 'Durées d’échauffement et de retour au calme.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.exerciseClass', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'unchanged',
    valueNote: 'Seuils de classe sur l’échelle ordinale du catalogue, inchangés.', rationale: 'Classification de conception.', uncertainty: 'Dépend des métadonnées du catalogue.', insufficient: KEEP }),
  prov({ id: 'strength.selection.criteriaOrder', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'unchanged',
    valueNote: 'Ordres lexicographiques inchangés.', rationale: 'La phase 4C a montré que le premier critère différenciant est décisif (stabilité des accessoires) : décision d’expert.',
    uncertainty: 'Préférence de fait pour la modalité la plus stable.', insufficient: KEEP }),
  prov({ id: 'strength.selection.recencyBandsDays', status: 'PROGRAMMING_HEURISTIC', governance: 'G3', change: 'unchanged',
    valueNote: '[2, 5] jours inchangés.', rationale: 'Départage par récence, sans rotation imposée.', uncertainty: 'Aucune source pour les bandes.', insufficient: KEEP,
    claims: [c('C.VAR', 'Une variation excessive et aléatoire des exercices peut compromettre les gains.', 'CONTEXT_DEPENDENT', ['SRC.KASSIANO_2022'], false)] }),
  prov({ id: 'strength.selection.axialHighMaxPerSession', status: 'PRODUCT_GUARDRAIL', governance: 'G2', change: 'reclassified',
    valueNote: '1 inchangé, reclassé garde-fou produit (P11).', rationale: 'Limite prudente de conception ; dose axiale cumulée à préparer.',
    uncertainty: 'Aucune preuve d’une limite physiologique à un exercice.', insufficient: KEEP,
    claims: [c('C.AXIAL', 'Nombre maximal d’exercices à forte charge axiale par séance.', 'INSUFFICIENT_EVIDENCE', [], true)] }),
  prov({ id: 'strength.selection.minLoadCeiling', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'unchanged',
    valueNote: 'Plafonds minimaux par niveau inchangés.', rationale: 'Faisabilité de la dose selon le niveau.', uncertainty: 'Échelle ordinale du catalogue.', insufficient: KEEP,
    claims: [c('C.HEAVY', 'Les charges élevées ou modérées favorisent davantage la force que les charges faibles.', 'SUPPORTED', ['SRC.LOPEZ_2021'], false)] }),
  prov({ id: 'strength.selection.primaryLoadRequired', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'unchanged',
    valueNote: '[strength_heavy] inchangé.', rationale: 'Le mécanisme (charge et force) est soutenu ; la liste des stimuli concernés est un choix de conception.',
    uncertainty: 'Mécanisme soutenu, valeur de conception.', insufficient: KEEP,
    claims: [
      c('C.HEAVY', 'Les charges élevées ou modérées favorisent davantage la force que les charges faibles.', 'SUPPORTED', ['SRC.LOPEZ_2021'], false),
      c('C.HEAVY_LIST', 'Stimuli dont le principal exige un exercice chargeable.', 'EXPERT_DESIGN_REVIEW', [], true),
    ] }),
  prov({ id: 'strength.selection.skillCeiling', status: 'SAFETY_SIGNOFF_REQUIRED', governance: 'G1', change: 'unchanged',
    valueNote: 'Plafonds par niveau inchangés (G1).', rationale: 'Sécurité technique par niveau.', uncertainty: 'Aucune source ; visa requis.', insufficient: G1_BLOCK,
    claims: [c('C.SKILL', 'Plafond de complexité technique par niveau.', 'SAFETY_SIGNOFF_REQUIRED', [], true)] }),
  prov({ id: 'strength.novice.technicalUnderFatigue', status: 'SAFETY_SIGNOFF_REQUIRED', governance: 'G1', change: 'unchanged',
    valueNote: 'Règle novice inchangée (G1).', rationale: 'Sécurité : exercices techniques sous fatigue chez le novice.', uncertainty: 'Aucune source ; visa requis.', insufficient: G1_BLOCK,
    claims: [c('C.NOV_TECH', 'Limite d’exercices techniques sous fatigue pour le novice.', 'SAFETY_SIGNOFF_REQUIRED', [], true)] }),
  prov({ id: 'strength.dose.base', split: { mechanism: 'SUPPORTED', magnitude: 'PROGRAMMING_HEURISTIC', note: 'Mécanismes soutenus (charges et force, large plage pour l’hypertrophie) ; nombres des cellules heuristiques.' }, status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'Table stimulus × rôle × classe inchangée ; les principes sont soutenus, les nombres exacts sont des heuristiques.',
    rationale: 'Principes P1, P2, P4 et P5 : répétitions basses pour la force, large plage pour l’hypertrophie, jamais l’échec par défaut, repos long pour le lourd.',
    uncertainty: 'Aucune cellule n’est une valeur démontrée ; RIR estimé à environ une répétition près.', insufficient: KEEP,
    population: ADULTS, outcome: 'Force (1RM), hypertrophie',
    claims: [
      c('C.HEAVY', 'Les charges élevées ou modérées favorisent davantage la force que les charges faibles.', 'SUPPORTED', ['SRC.LOPEZ_2021'], false),
      c('C.HYP_LOADS', 'L’hypertrophie ne diffère pas entre charges faibles, modérées et élevées.', 'SUPPORTED', ['SRC.LOPEZ_2021'], false),
      c('C.FAILURE', 'L’échec n’est pas supérieur à l’arrêt avant l’échec pour l’hypertrophie ; la proximité de l’échec compte.', 'CONTEXT_DEPENDENT', ['SRC.REFALO_2023', 'SRC.ROBINSON_2024'], false),
      c('C.REST', 'Hypertrophie : petit bénéfice des repos de plus de 60 s, pas de différence appréciable au-delà de 90 s, effets largement chevauchants ; aucun seuil universel (repos suffisant pour préserver la qualité des séries).', 'CONTEXT_DEPENDENT', ['SRC.SINGER_2024'], false),
      c('C.ACSM', 'L’entraînement en résistance améliore la force et l’hypertrophie sur une large gamme de modalités ; les détails de prescription comptent moins que la pratique (vue d’ensemble de 137 revues).', 'CONTEXT_DEPENDENT', ['SRC.CURRIER_2026_ACSM'], false),
      c('C.CELLS', 'Valeurs exactes des cellules (reps, séries, RIR, repos).', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.dose.modifiers', status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'Modificateurs inchangés ; décharge (rirDelta +2, setsFactor 0,6) reclassée en heuristique (P8).',
    rationale: 'Mécanismes conservés ; politique de conflit « la plus prudente » = garde-fou produit.', uncertainty: 'Aucune ampleur démontrée.', insufficient: KEEP,
    claims: [
      c('C.DELOAD', 'Ampleur de la décharge.', 'PROGRAMMING_HEURISTIC', [], true),
      c('C.CONFLICT', 'Politique de conflit la plus prudente.', 'PRODUCT_GUARDRAIL', [], true),
    ] }),
  prov({ id: 'strength.dose.nonRep', status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'unchanged',
    valueNote: 'Durées de maintien et distances de porté inchangées.', rationale: 'Heuristique.', uncertainty: 'Aucune source.', insufficient: KEEP }),
  prov({ id: 'strength.load', split: { mechanism: 'CONTEXT_DEPENDENT', magnitude: 'PROGRAMMING_HEURISTIC', note: 'Fiabilité d’un 1RM mesuré et imprécision du RIR soutenues selon le contexte ; formule d’Epley et table de conversion = repli heuristique.' }, status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'Inchangé ; la formule d’Epley (diviseur 30) et `pctByRepsToFailure` sont reclassés en REPLI d’amorçage, sous les données spécifiques récentes (V1).',
    rationale: 'Hiérarchie de référence : données spécifiques récentes > historique de l’exercice > modèle personnel (contrat) > e1RM générique > calibration prudente.',
    uncertainty: 'Formules génériques non individualisées ; RIR sous-estimé d’environ une répétition ; fenêtres de récence et tolérance de conflit heuristiques.', insufficient: KEEP,
    population: ADULTS, outcome: 'Précision des références de charge',
    claims: [
      c('C.1RM_REL', 'Un 1RM mesuré est très fiable (ICC médian 0,97 ; CV médian 4,2 %) — ce n’est pas le cas démontré d’un e1RM estimé.', 'CONTEXT_DEPENDENT', ['SRC.GRGIC_2020'], false),
      c('C.RIR_ERR', 'La prédiction des répétitions jusqu’à l’échec est imprécise (sous-estimation moyenne d’environ une répétition, hétérogénéité importante), meilleure pour les séries courtes (moins de 12 répétitions).', 'CONTEXT_DEPENDENT', ['SRC.HALPERIN_2022'], false),
      c('C.EPLEY', 'Formule et table génériques de conversion reps → % e1RM.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.load.defaultIncrements', status: 'TECHNICAL', governance: 'G4', change: 'unchanged',
    valueNote: 'Incréments matériels par défaut inchangés.', rationale: 'Donnée matérielle.', uncertainty: 'Dépend de la salle (surchargée par les incréments déclarés).', insufficient: 'Sans objet (technique).' }),
  prov({ id: 'strength.calibration', status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'targetRir 3, 2 séries inchangés ; `mediumAfterExposures` et `highAfterExposures` ne sont lus par aucun code (dette) et sont remplacés en V1 par `strength.prescriptionConfidence`.',
    rationale: 'Calibration prudente sans référence.', uncertainty: 'Aucune source pour la cible d’effort.', insufficient: KEEP,
    claims: [c('C.CAL', 'Cible d’effort et nombre de séries de calibration.', 'PROGRAMMING_HEURISTIC', [], true)] }),
  prov({ id: 'strength.rampup', split: { mechanism: 'CONTEXT_DEPENDENT', magnitude: 'PROGRAMMING_HEURISTIC', note: 'Effet de l’échauffement musculaire sur la puissance soutenu selon le contexte ; paliers heuristiques.' }, status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'Paliers inchangés, reclassés : principe conservé, paliers non optimaux (P9).',
    rationale: 'Montée spécifique prioritaire, distincte de l’échauffement général.', uncertainty: 'Paliers non démontrés.', insufficient: KEEP,
    claims: [
      c('C.WU_RFD', 'L’échauffement musculaire améliore le taux de développement de la force et la puissance, pas la force maximale.', 'CONTEXT_DEPENDENT', ['SRC.WARMUP_FORCE_MA'], false),
      c('C.RAMP_STEPS', 'Fractions et répétitions des paliers.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.progression', split: { mechanism: 'CONTEXT_DEPENDENT', magnitude: 'PROGRAMMING_HEURISTIC', note: 'Progression structurée et autorégulation soutenues selon le contexte ; fractions et compteurs heuristiques.' }, status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'Familles de modèles conservées ; cycleCapFraction 0,15, regressionFraction 0,10, regressAfterBelow 2, stagnationHolds 3 reclassés en heuristiques (P7).',
    rationale: 'Progression structurée et autorégulée favorable à la force.', uncertainty: 'Aucune fraction démontrée.', insufficient: KEEP,
    population: ADULTS, outcome: 'Force (1RM)',
    claims: [
      c('C.PERIOD', 'Programmes périodisés supérieurs aux non périodisés pour le 1RM.', 'CONTEXT_DEPENDENT', ['SRC.MOESGAARD_2022'], false),
      c('C.AUTOREG', 'L’autorégulation est une stratégie valide d’individualisation (améliorations de force similaires à la prescription en pourcentage) ; sa supériorité générale n’est pas établie.', 'CONTEXT_DEPENDENT', ['SRC.HICKMOTT_2022', 'SRC.AUTOREG_NMA_2025'], false),
      c('C.PROG_FRACTIONS', 'Fractions, seuils et compteurs de progression.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.tracks', status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'anchorMaxWeeks 12/10/8/6 inchangés ; en V1 horizon de REVUE au plus (politique `strength.tracks.horizon`).',
    rationale: 'Trois niveaux conservés ; une ancre ne change que pour une raison traçable (P10).', uncertainty: 'Aucune durée démontrée.', insufficient: KEEP,
    claims: [
      c('C.VAR', 'Une variation excessive et aléatoire des exercices peut compromettre les gains.', 'CONTEXT_DEPENDENT', ['SRC.KASSIANO_2022'], false),
      c('C.WEEKS', 'Durées d’ancre par niveau.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.volume', split: { mechanism: 'SUPPORTED', magnitude: 'PROGRAMMING_HEURISTIC', note: 'Dose–réponse à rendements décroissants soutenue ; bornes hebdomadaires heuristiques ; décompte fractionnaire soutenu selon le contexte.' }, status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'Bornes hebdomadaires et secondaryWeight 0,5 inchangés ; bornes = repères SOFT, pas des frontières (P3).',
    rationale: 'Dose–réponse à rendements décroissants ; décompte fractionnaire des muscles secondaires = approximation.',
    uncertainty: 'Réponse individuelle non modélisée ; population des sources majoritairement masculine.', insufficient: KEEP,
    population: ADULTS, outcome: 'Hypertrophie, force',
    claims: [
      c('C.DOSE', 'Relation dose–réponse du volume hebdomadaire à rendements décroissants.', 'SUPPORTED', ['SRC.PELLAND_2026'], false),
      c('C.FRACTIONAL', 'Le décompte fractionnaire (0,5) des séries indirectes est la méthode la mieux soutenue dans les méta-régressions de volume (comparaison de modèles) — base de `secondaryWeight` 0,5.', 'CONTEXT_DEPENDENT', ['SRC.PELLAND_2026'], true),
      c('C.WEEKLY', 'Bornes hebdomadaires par groupe, niveau et objectif.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.volume.sessionCap', status: 'SAFETY_SIGNOFF_REQUIRED', also: ['PRODUCT_GUARDRAIL'], governance: 'G1', change: 'reclassified',
    valueNote: 'Plafonds par niveau inchangés ; garde-fou produit et de sécurité (G1).', rationale: 'Plafond de séries par groupe et par séance.',
    uncertainty: 'Aucune source pour un plafond par séance.', insufficient: G1_BLOCK,
    claims: [c('C.CAP', 'Plafond de séries difficiles par groupe et par séance.', 'SAFETY_SIGNOFF_REQUIRED', [], true)] }),
  prov({ id: 'strength.interference', split: { mechanism: 'CONTEXT_DEPENDENT', magnitude: 'PROGRAMMING_HEURISTIC', note: 'Interférence dépendante de la modalité, de la fréquence et de la durée : mécanisme soutenu selon le contexte ; ajustements (séries, RIR, besoins retirés) heuristiques.' }, status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'reclassified',
    valueNote: 'Notes et ajustements par structure inchangés ; `neighborWindowHours` 36 h ne sert plus qu’au ruleset 0.2.0 (règle binaire historique).',
    rationale: 'L’interférence dépend de la modalité, de la fréquence et de la durée d’endurance.', uncertainty: 'Aucune fenêtre temporelle démontrée.', insufficient: KEEP,
    population: ADULTS, outcome: 'Force, hypertrophie en entraînement concurrent',
    claims: [
      c('C.CONC', 'L’interférence dépend de la modalité, de la fréquence et de la durée d’endurance.', 'CONTEXT_DEPENDENT', ['SRC.WILSON_2012'], false),
      c('C.STRUCT_DELTAS', 'Ajustements de séries et de RIR par structure, besoins retirés.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.substitution.fallbackNeeds', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'unchanged',
    valueNote: 'Replis de besoin inchangés.', rationale: 'Conception.', uncertainty: 'À relire par un expert.', insufficient: KEEP }),
  prov({ id: 'strength.topSet', status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'unchanged',
    valueNote: 'Série lourde + séries allégées (0,9) inchangées.', rationale: 'Heuristique de programmation avancée.', uncertainty: 'Aucune source.', insufficient: KEEP }),
  prov({ id: 'strength.maxEffort.threshold', status: 'SAFETY_SIGNOFF_REQUIRED', governance: 'G1', change: 'unchanged',
    valueNote: '0,9 inchangé (G1, cliquet « decrease »).', rationale: 'Seuil d’éligibilité à l’effort maximal ; aucune fausse précision revendiquée.',
    uncertainty: 'Aucune source ne justifie 0,9 plutôt qu’une valeur voisine.', insufficient: G1_BLOCK,
    claims: [c('C.MAXEFF', 'Seuil d’intensité relative de l’effort maximal.', 'INSUFFICIENT_EVIDENCE', [], true)] }),
  prov({ id: 'strength.proposals.max', status: 'TECHNICAL', governance: 'G4', change: 'unchanged',
    valueNote: '2 inchangé.', rationale: 'Nombre de propositions (technique).', uncertainty: 'Sans objet.', insufficient: 'Sans objet (technique).' }),
  // ——— Paramètres introduits par le ruleset scientifique V1 ———
  prov({ id: 'strength.science.registryVersion', status: 'TECHNICAL', governance: 'G4', change: 'new_policy',
    valueNote: 'Absent en 0.2.0 ; « 1.0.0 » en V1.', rationale: 'Version du registre tracée dans chaque séance (reproductibilité).', uncertainty: 'Sans objet.', insufficient: 'Sans objet (technique).' }),
  prov({ id: 'strength.prescriptionConfidence', split: { mechanism: 'CONTEXT_DEPENDENT', magnitude: 'PROGRAMMING_HEURISTIC', note: 'Imprécision du RIR soutenue selon le contexte ; seuils de séances et d’observations heuristiques.' }, status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'new_policy',
    valueNote: 'Absent en 0.2.0 (1 exposition avec RIR = high) ; V1 : HIGH exige ≥ 2 séances ET ≥ 4 observations, fraîches, cohérentes, RIR fiable, sans conflit ni transfert ; capacité déclarée plafonnée à MEDIUM ; RIR des novices et débutants traité comme incertain.',
    rationale: 'Confiance ordinale à facteurs tracés, sans coefficient ; deux observations ne garantissent pas HIGH.',
    uncertainty: 'Seuils de séances et d’observations heuristiques ; l’effet de l’expérience sur la précision du RIR n’est pas vérifié dans les sources lues.', insufficient: 'Règles appliquées telles quelles et tracées (DOSE.LOAD.CONFIDENCE) ; toute incertitude abaisse la confiance, jamais l’inverse.',
    population: ADULTS, outcome: 'Précision des références de charge',
    claims: [
      c('C.RIR_ERR', 'La prédiction des répétitions jusqu’à l’échec est imprécise (sous-estimation moyenne d’environ une répétition, hétérogénéité importante), meilleure pour les séries courtes (moins de 12 répétitions).', 'CONTEXT_DEPENDENT', ['SRC.HALPERIN_2022'], false),
      c('C.1RM_REL', 'Un 1RM mesuré est très fiable ; un e1RM estimé ne l’est pas démontré.', 'CONTEXT_DEPENDENT', ['SRC.GRGIC_2020'], false),
      c('C.PC_THRESH', 'Seuils de séances et d’observations pour HIGH.', 'PROGRAMMING_HEURISTIC', [], true),
      c('C.PC_LEVELS', 'Niveaux dont le RIR est traité comme incertain.', 'INSUFFICIENT_EVIDENCE', [], true),
    ] }),
  prov({ id: 'strength.load.specificObservation', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'new_policy',
    valueNote: 'Absent en 0.2.0 ; V1 : série récente (fenêtre « high ») à ± 1 répétition et ± 1 RIR de la cible, RIR requis.',
    rationale: 'Hiérarchie de référence : une donnée spécifique récente décrit l’athlète mieux qu’une formule générique.',
    uncertainty: 'Tolérances heuristiques ; aucune source ne compare directement ces hiérarchies.', insufficient: 'Sans observation spécifique : repli sur l’e1RM générique (tracé DOSE.LOAD.FROM_E1RM), puis calibration.',
    claims: [
      c('C.RIR_ERR', 'La prédiction des répétitions jusqu’à l’échec est imprécise (sous-estimation moyenne d’environ une répétition, hétérogénéité importante), meilleure pour les séries courtes (moins de 12 répétitions).', 'CONTEXT_DEPENDENT', ['SRC.HALPERIN_2022'], false),
      c('C.SPEC_TOL', 'Tolérances de répétitions et de RIR.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.interference.assessment', split: { mechanism: 'CONTEXT_DEPENDENT', magnitude: 'PROGRAMMING_HEURISTIC', note: 'MÉCANISME soutenu selon le contexte (modalité, proximité, importance) ; AMPLEUR heuristique : bins temporels 12/24/48/72 h (opérationnels, pas des frontières biologiques), deltas ordinaux, actions et RIR + 2 de MODERATE.' }, status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'new_policy',
    valueNote: 'Absent en 0.2.0 (règle binaire 36 h) ; V1 : matrice ordinale (demande + importance + bandes de proximité 12/24/48 h + impact locomoteur sur une demande déjà haute), fenêtre de recherche 72 h, actions graduées (MODERATE = RIR seulement ; HIGH = ajustement complet ; VERY_HIGH = complet + signal).',
    rationale: 'Interférence graduée selon la modalité (impact locomoteur de la course), l’importance et la proximité ; VERY_HIGH = signal au planificateur, qui décide.',
    uncertainty: 'Bornes des bandes et deltas ordinaux heuristiques ; aucune source ne fixe une fenêtre en heures.', insufficient: 'Matrice appliquée telle quelle et tracée (PLAN.INTERFERENCE_ASSESSED) ; le moteur ne déplace ni ne supprime jamais une séance.',
    population: ADULTS, outcome: 'Force, hypertrophie en entraînement concurrent',
    claims: [
      c('C.CONC', 'L’interférence dépend de la modalité, de la fréquence et de la durée d’endurance.', 'CONTEXT_DEPENDENT', ['SRC.WILSON_2012'], false),
      c('C.RUN', 'Atténuation de l’hypertrophie plus marquée avec la course qu’avec le vélo.', 'CONTEXT_DEPENDENT', ['SRC.LUNDBERG_2022'], false),
      c('C.MATRIX', 'Bandes horaires, deltas ordinaux et actions.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.rampup.estimatedPolicy', status: 'PROGRAMMING_HEURISTIC', governance: 'G2', change: 'new_policy',
    valueNote: 'Absent en 0.2.0 (charge suggérée ⇒ un seul palier de la première bande) ; V1 : bande selon l’intensité relative, paliers ≤ estimatedLastStepMax (0,7).',
    rationale: 'La confiance ordinale rend la charge suggérée (MEDIUM) plus fréquente sur le travail lourd : la montée spécifique doit rester prioritaire (P9), sans palier proche d’une charge incertaine.',
    uncertainty: 'Paliers heuristiques.', insufficient: 'Paliers existants appliqués ; aucun palier au-delà du plafond estimé.',
    claims: [
      c('C.WU_RFD', 'L’échauffement musculaire améliore le taux de développement de la force et la puissance, pas la force maximale.', 'CONTEXT_DEPENDENT', ['SRC.WARMUP_FORCE_MA'], false),
      c('C.RAMP_STEPS', 'Fractions et répétitions des paliers.', 'PROGRAMMING_HEURISTIC', [], true),
    ] }),
  prov({ id: 'strength.selection.repetitionPolicy', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'new_policy',
    valueNote: 'Absent en 0.2.0 (la récence fait tourner les exercices à égalité). 4E : novice, continuité sans exception. 4F : novice = forte continuité ; débutant = continuité préférée (rotation permise en semaine 1 de cycle) ; raisons explicites de rotation : exercice non aimé, stagnation, note « planned_variation » du planificateur.',
    rationale: 'Principe H : simplicité et répétition chez le novice ; une variation aléatoire excessive peut nuire, une variation systématique (alternance A/B des groupes de choix) reste admise.',
    uncertainty: 'Choix de conception ; rotation en début de cycle pour le débutant = heuristique.', insufficient: 'Politique appliquée et tracée (critère décisif « recency »).',
    claims: [c('C.VAR', 'Une variation excessive et aléatoire des exercices peut compromettre les gains.', 'CONTEXT_DEPENDENT', ['SRC.KASSIANO_2022'], false)] }),
  prov({ id: 'strength.session.stimulusPreservation', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'new_policy',
    valueNote: 'Absent en 0.2.0 et 4E ; 4F : « swap_lower_priority_optional » — un optionnel de plus haute priorité de stimulus omis faute de temps remplace un optionnel de plus basse priorité si, sans lui, un groupe ciblé perdrait la majorité de sa dose de séance, sans retirer la seule couverture d’un autre groupe.',
    rationale: 'Correction du contre-audit 4E (S2 : pectoraux 5 → 2 séries par simple effet d’ordre) : la politique de durée ne doit pas dégrader le stimulus prévu par l’intention (ordre de priorité du stimulus et de l’objectif, déjà déclaré dans le ruleset). Aucun quota musculaire.',
    uncertainty: 'Critère « majorité de la dose » ordinal (la contribution de l’optionnel dépasse ou égale celle de tous les autres exercices sur ce groupe) : choix de conception.',
    insufficient: 'Sans échange admissible, aucun ajout supplémentaire (le temps n’est pas forcé) ; tout échange est tracé (SELECT.STIMULUS_PRESERVED).',
    claims: [c('C.DOSE', 'Relation dose–réponse du volume hebdomadaire à rendements décroissants.', 'SUPPORTED', ['SRC.PELLAND_2026'], false), c('C.SP_RULE', 'Critère d’échange et ordre de priorité.', 'EXPERT_DESIGN_REVIEW', [], true)] }),
  prov({ id: 'strength.tracks.horizon', status: 'EXPERT_DESIGN_REVIEW', governance: 'G2', change: 'new_policy',
    valueNote: 'Absent en 0.2.0 (clôture max_weeks) ; V1 : « review » (horizon de revue, jamais une clôture automatique).',
    rationale: 'Une ancre ne change que pour une raison traçable (P10).', uncertainty: 'Choix de conception.', insufficient: 'La revue est signalée (PROGRESSION.REVIEW_DUE) ; la track reste active.',
    claims: [c('C.VAR', 'Une variation excessive et aléatoire des exercices peut compromettre les gains.', 'CONTEXT_DEPENDENT', ['SRC.KASSIANO_2022'], false)] }),
  prov({ id: 'strength.session.durationPriority', status: 'PRODUCT_GUARDRAIL', governance: 'G2', change: 'new_policy',
    valueNote: 'Absent en 0.2.0 (5 min + 3 min imposées hors contrainte ; repos du principal réduit avec les autres) ; V1 : échauffement supplémentaire et retour au calme seulement s’ils tiennent après les optionnels ; repos du principal réduit en dernier.',
    rationale: 'Ordre de priorité de la durée (4E §I) : travail principal, repos, montée spécifique, secondaires, accessoires, puis échauffement général supplémentaire et retour au calme.',
    uncertainty: 'Choix produit ; aucune durée démontrée.', insufficient: 'Politique appliquée et tracée (SELECT.SLOT_OMITTED i.warmup_extra / i.cooldown ; DOSE.MODIFIED time:primary_rest en dernier recours).',
    claims: [c('C.WU_RFD', 'L’échauffement musculaire améliore le taux de développement de la force et la puissance, pas la force maximale.', 'CONTEXT_DEPENDENT', ['SRC.WARMUP_FORCE_MA'], false)] }),
];
