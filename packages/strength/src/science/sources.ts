/**
 * Sources du registre scientifique (version 1.1.0, phase 4F). Vérifications des 2026-09-27 (4E) et
 * 2026-09-28 (4F) :
 * - IDENTITÉ : recherche web (PMID, titre, auteurs, revue, DOI) ; `PARTIAL` dès qu'un élément manque ;
 * - CONTENU : PubMed, E-utilities, Europe PMC et les sites des éditeurs restent inaccessibles depuis
 *   l'environnement d'exécution (politique réseau, vérifié à nouveau en 4F). AUCUN résumé officiel ni texte
 *   intégral n'a été lu : le niveau maximal atteint est `SEARCH_SUMMARY` (résultats connus par des résumés de
 *   moteur de recherche, qui citent souvent le résumé officiel ou des sources secondaires). Une source sans
 *   résultat extrait reste `IDENTITY_ONLY`. `pendingHumanReview` liste ce qu'un relecteur doit confirmer.
 */
import type { ScienceSource } from './types.js';

const V4E = '2026-09-27';
const V4F = '2026-09-28';
const ABSTRACT = 'Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture.';
const FULLTEXT = 'Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).';

export const SCIENCE_SOURCES: readonly ScienceSource[] = [
  {
    id: 'SRC.CURRIER_2026_ACSM', pmid: '41843416', doi: '10.1249/MSS.0000000000003897', year: '2026', evidenceType: 'position_stand',
    citation: 'Currier et al. (président du groupe : Phillips). American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. Med Sci Sports Exerc. 2026;58(4):851–872.',
    population: 'Adultes en bonne santé (vue d’ensemble de 137 revues systématiques, plus de 30 000 participants)',
    outcomes: ['force musculaire', 'hypertrophie', 'endurance musculaire', 'puissance', 'performance fonctionnelle'],
    findings: [
      'Vue d’ensemble de 137 revues systématiques (plus de 30 000 adultes), évaluée avec un cadre de type GRADE.',
      'Message général : la plupart des formes d’entraînement en résistance améliorent la fonction musculaire ; les détails de prescription comptent moins que le fait de s’entraîner.',
      'Rapporté par des résumés secondaires (communiqué ACSM, articles de vulgarisation) : hypertrophie portée surtout par le volume hebdomadaire avec rendements décroissants ; force maximale favorisée par des charges élevées.',
    ],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4F,
    limitations: 'Recommandations chiffrées (séries hebdomadaires, % 1RM, fréquence) connues par des résumés secondaires seulement : AUCUNE valeur du moteur n’en est tirée.',
    pendingHumanReview: [ABSTRACT, 'Confirmer les recommandations chiffrées rapportées (volume hebdomadaire, charge pour la force, séries, fréquence) et leur niveau GRADE.', 'Confronter au ruleset : profils de charge « heavy » et bornes hebdomadaires.', FULLTEXT],
  },
  {
    id: 'SRC.CURRIER_2023_NMA', pmid: '37414459', year: '2023', evidenceType: 'network_meta_analysis',
    citation: 'Currier BS, McLeod JC, Banfield L et al. [Prescription de l’entraînement en résistance : méta-analyse en réseau bayésienne]. Br J Sports Med. 2023.',
    population: 'Adultes en bonne santé', outcomes: ['force musculaire', 'hypertrophie'],
    findings: [],
    identityVerification: 'CONFIRMED', verificationLevel: 'IDENTITY_ONLY', verifiedOn: V4E,
    limitations: 'Aucune estimation extraite : non utilisée.',
    pendingHumanReview: [ABSTRACT, 'Extraire les classements de prescriptions pour la force et l’hypertrophie.'],
  },
  {
    id: 'SRC.LOPEZ_2021', pmid: '33433148', doi: '10.1249/MSS.0000000000002585', year: '2021', evidenceType: 'network_meta_analysis',
    citation: 'Lopez P, Radaelli R, Taaffe DR et al. Resistance Training Load Effects on Muscle Hypertrophy and Strength Gain: Systematic Review and Network Meta-analysis. Med Sci Sports Exerc. 2021;53(6):1206–1216.',
    population: 'Adultes (28 études, 747 participants)', outcomes: ['hypertrophie', 'force (1RM)'],
    findings: ['Aucune différence d’hypertrophie entre charges faibles, modérées et élevées.', 'Gains de force supérieurs avec des charges élevées ou modérées qu’avec des charges faibles.'],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4E,
    limitations: 'Catégories de charge de la source non transposables en pourcentages exacts sans lecture intégrale.',
    pendingHumanReview: [ABSTRACT, 'Relever les définitions des catégories de charge.', FULLTEXT],
  },
  {
    id: 'SRC.ROBINSON_2024', pmid: '38970765', year: '2024', evidenceType: 'meta_analysis',
    citation: 'Robinson ZP, Pelland JC, Remmert JF et al. Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. Sports Med. 2024;54(9):2209–2231.',
    population: 'Méta-régressions : 55 études (hypertrophie) et 67 études (force)', outcomes: ['hypertrophie', 'force'],
    findings: [
      'Proximité de l’échec quantifiée en RIR ESTIMÉ.',
      'L’hypertrophie augmente à mesure que les séries se rapprochent de l’échec.',
      'Différences négligeables de gains de force selon la proximité de l’échec.',
    ],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4F,
    limitations: 'RIR estimé a posteriori, non mesuré ; pentes et intervalles non extraits : relation à interpréter avec incertitude, aucune cible de RIR n’en est tirée.',
    pendingHumanReview: [ABSTRACT, 'Relever les pentes et leur incertitude (hypertrophie et force).', FULLTEXT],
  },
  {
    id: 'SRC.REFALO_2023', pmid: '36334240', year: '2022/2023', evidenceType: 'meta_analysis',
    citation: 'Refalo, Helms, Trexler, Hamilton, Fyfe. [Proximité de l’échec et hypertrophie : revue systématique et méta-analyse]. 2022/2023 (revue non vérifiée).',
    population: 'Adultes (15 études)', outcomes: ['hypertrophie'],
    findings: ['L’entraînement jusqu’à l’échec n’est pas supérieur à l’arrêt avant l’échec pour l’hypertrophie (ES 0,12 ; p = 0,343).'],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4E,
    limitations: 'Hétérogénéité des définitions de l’échec.',
    pendingHumanReview: [ABSTRACT, FULLTEXT],
  },
  {
    id: 'SRC.PELLAND_2026', pmid: '41343037', doi: '10.1007/s40279-025-02344-w', year: '2026', evidenceType: 'meta_analysis',
    citation: 'Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains. Sports Med. 2026 (en ligne le 2025-12-04).',
    population: '67 études, 2 058 participants (79,1 % d’hommes), âge moyen environ 25 ans', outcomes: ['hypertrophie', 'force'],
    findings: [
      'Relation dose–réponse du volume hebdomadaire avec rendements décroissants.',
      'Fréquence : effet positif sur la force, négligeable sur l’hypertrophie.',
      'Séries indirectes décomptées de trois façons (totale = 1, fractionnaire = 0,5, directe = 0) : la méthode FRACTIONNAIRE donne la preuve la plus forte.',
    ],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4F,
    limitations: 'Population majoritairement masculine et jeune ; « preuve la plus forte » = comparaison de modèles, pas une démonstration du coefficient 0,5 pour chaque muscle.',
    pendingHumanReview: [ABSTRACT, 'Confirmer la comparaison des méthodes de décompte (critère de comparaison des modèles).', FULLTEXT],
  },
  {
    id: 'SRC.SINGER_2024', pmid: '39205815', doi: '10.3389/fspor.2024.1429789', year: '2024', evidenceType: 'meta_analysis',
    citation: 'Singer A et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. Front Sports Act Living. 2024;6.',
    population: 'Adultes en bonne santé ; 19 mesures issues de 9 études randomisées', outcomes: ['hypertrophie'],
    findings: [
      'Petit bénéfice hypertrophique des repos de plus de 60 s, peut-être par un volume de charge mieux préservé.',
      'Pas de différence appréciable au-delà de 90 s.',
      'Chevauchement important des effets ; incertitude élevée.',
    ],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4F,
    limitations: 'Faible nombre d’études ; hypertrophie seulement ; aucun seuil universel n’en est tiré (les bornes de 60 et 90 s décrivent les comparaisons de la source).',
    pendingHumanReview: [ABSTRACT, 'Confronter aux repos des accessoires du ruleset (plages 45–75 s).', FULLTEXT],
  },
  {
    id: 'SRC.GRGIC_2018', pmid: '28933024', year: '2018', evidenceType: 'systematic_review',
    citation: 'Grgic et al. [Durée du repos entre séries et force : revue systématique]. Sports Med. 2018;48(1):137–151.',
    population: '23 études, 491 participants', outcomes: ['force musculaire'],
    findings: [],
    identityVerification: 'CONFIRMED', verificationLevel: 'IDENTITY_ONLY', verifiedOn: V4E,
    limitations: 'Conclusions non extraites : aucune revendication ne s’y appuie.',
    pendingHumanReview: [ABSTRACT, 'Extraire le sens de l’effet du repos sur la force selon le niveau d’entraînement.'],
  },
  {
    id: 'SRC.HALPERIN_2022', pmid: '34542869', year: '2022', evidenceType: 'scoping_review',
    citation: 'Halperin et al. Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise: A Scoping Review and Exploratory Meta-analysis. Sports Med. 2022.',
    population: '12 études, 414 participants', outcomes: ['précision de la prédiction des répétitions jusqu’à l’échec'],
    findings: [
      'Sous-estimation moyenne d’environ 0,95 répétition.',
      'Précision meilleure pour des séries plus courtes (moins de 12 répétitions, charges au-delà d’environ 70 % 1RM) ; moins bonne et plus variable pour des séries longues.',
      'Hétérogénéité importante.',
    ],
    identityVerification: 'PARTIAL', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4F,
    limitations: 'Méta-analyse exploratoire ; hétérogénéité importante.',
    pendingHumanReview: [ABSTRACT, 'Confirmer l’effet du nombre de répétitions et de la proximité de l’échec sur la précision.', FULLTEXT],
  },
  {
    id: 'SRC.HUGHES_2020', pmid: '33337690', year: '2020', evidenceType: 'experimental_study',
    citation: 'Hughes, Peiffer, Scott. [Estimation du RIR sur quatre exercices]. J Strength Cond Res. 2020.',
    population: '21 hommes entraînés', outcomes: ['précision de l’estimation du RIR (65, 75 et 85 % 1RM)'],
    findings: [],
    identityVerification: 'CONFIRMED', verificationLevel: 'IDENTITY_ONLY', verifiedOn: V4E,
    limitations: 'Résultats non extraits : aucune revendication ne s’y appuie.',
    pendingHumanReview: [ABSTRACT],
  },
  {
    id: 'SRC.WILSON_2012', pmid: '22002517', year: '2012', evidenceType: 'meta_analysis',
    citation: 'Wilson et al. [Entraînement concurrent : méta-analyse de l’interférence]. J Strength Cond Res. 2012;26(8):2293–2307.',
    population: '21 études', outcomes: ['force', 'hypertrophie', 'puissance'],
    findings: ['L’interférence dépend de la modalité d’endurance, de sa fréquence et de sa durée.'],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4E,
    limitations: 'Méta-analyse ancienne ; aucune fenêtre temporelle chiffrée n’en est tirée.',
    pendingHumanReview: [ABSTRACT, FULLTEXT],
  },
  {
    id: 'SRC.LUNDBERG_2022', pmid: '35476184', year: '2022', evidenceType: 'meta_analysis',
    citation: 'Lundberg, Feuerbacher, Sünkeler, Schumann. [Entraînement concurrent et hypertrophie des fibres : revue systématique et méta-analyse]. Sports Med. 2022.',
    population: 'Adultes', outcomes: ['hypertrophie des fibres musculaires'],
    findings: ['Atténuation faible de l’hypertrophie des fibres par l’entraînement concurrent.', 'Atténuation plus marquée avec la course qu’avec le vélo, au moins pour les fibres de type I.'],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4E,
    limitations: 'Hypertrophie des fibres seulement ; ampleur non extraite.',
    pendingHumanReview: [ABSTRACT, FULLTEXT],
  },
  {
    id: 'SRC.CHEN_2024', pmid: '38187085', year: '2024', evidenceType: 'network_meta_analysis',
    citation: 'Chen, Feng, Huang, Wang, Mi. [Types d’entraînement concurrent, force des membres inférieurs et section musculaire : méta-analyse en réseau]. J Exerc Sci Fit. 2024.',
    population: '40 études, 841 participants', outcomes: ['force des membres inférieurs', 'surface de section musculaire'],
    findings: [],
    identityVerification: 'PARTIAL', verificationLevel: 'IDENTITY_ONLY', verifiedOn: V4E,
    limitations: 'Titre exact et résultats non vérifiés : non utilisée.',
    pendingHumanReview: [ABSTRACT],
  },
  {
    id: 'SRC.KASSIANO_2022', pmid: '35438660', year: '2022', evidenceType: 'systematic_review',
    citation: 'Kassiano W, Nunes JP, Costa B, Ribeiro AS, Schoenfeld BJ, Cyrino ES. Does Varying Resistance Exercises Promote Superior Muscle Hypertrophy and Strength Gains? A Systematic Review. J Strength Cond Res. 2022.',
    population: '8 études (jeunes hommes)', outcomes: ['hypertrophie', 'force'],
    findings: ['Une variation systématique des exercices peut être bénéfique.', 'Une variation excessive et aléatoire peut compromettre les gains.', 'Conclusion nuancée : effet selon la manière d’appliquer la variation.'],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4F,
    limitations: 'Petit corpus ; AUCUNE durée d’ancre n’en est tirée.',
    pendingHumanReview: [ABSTRACT, FULLTEXT],
  },
  {
    id: 'SRC.GRGIC_2020', pmid: '32681399', year: '2020', evidenceType: 'systematic_review',
    citation: 'Grgic, Lazinica, Schoenfeld, Pedisic. [Fiabilité test–retest du 1RM : revue systématique]. 2020 (revue non vérifiée).',
    population: '32 études', outcomes: ['fiabilité test–retest du 1RM'],
    findings: ['ICC médian 0,97 ; coefficient de variation médian 4,2 %.'],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4E,
    limitations: 'Fiabilité d’un 1RM MESURÉ, pas d’un e1RM estimé.',
    pendingHumanReview: [ABSTRACT, FULLTEXT],
  },
  {
    id: 'SRC.HICKMOTT_2022', pmid: '35038063', doi: '10.1186/s40798-021-00404-9', year: '2022', evidenceType: 'meta_analysis',
    citation: 'Hickmott LM, Chilibeck PD, Shaw KA, Butcher SJ. The Effect of Load and Volume Autoregulation on Muscular Strength and Hypertrophy: A Systematic Review and Meta-Analysis. Sports Med Open. 2022.',
    population: 'Pratiquants entraînés (15 études : 6 autorégulation de la charge, 9 autorégulation du volume)', outcomes: ['force (1RM)', 'hypertrophie (section)'],
    findings: [
      'Autorégulation de la charge (RIR/RPE, vitesse) et prescription standardisée en pourcentage : améliorations de force SIMILAIRES.',
      'Autorégulation du volume : seuils de perte de vitesse bas plutôt favorables à la force, plus élevés plutôt favorables à l’hypertrophie (séries et intensité égalisées).',
    ],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4F,
    limitations: 'Petit nombre d’études par comparaison ; pratiquants entraînés.',
    pendingHumanReview: [ABSTRACT, FULLTEXT],
  },
  {
    id: 'SRC.AUTOREG_NMA_2025', pmid: '40791980', year: '2025', evidenceType: 'network_meta_analysis',
    citation: 'Autoregulated resistance training for maximal strength: systematic review and network meta-analysis (2025) — auteurs et revue non vérifiés.',
    population: 'Adultes (méta-analyse en réseau)', outcomes: ['force maximale'],
    findings: ['Classement favorable des méthodes autorégulées (APRE, RPE, vitesse) face au pourcentage (SUCRA APRE 93 %).'],
    identityVerification: 'PARTIAL', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4E,
    limitations: 'Auteurs et revue non vérifiés ; un classement SUCRA n’est pas une taille d’effet ; ne démontre pas une supériorité générale.',
    pendingHumanReview: [ABSTRACT, 'Compléter l’identité (auteurs, revue).'],
  },
  {
    id: 'SRC.MOESGAARD_2022', pmid: '35044672', year: '2022', evidenceType: 'meta_analysis',
    citation: 'Moesgaard, Beck, Christiansen, Aagaard, Lundbye-Jensen. [Périodisation à volume égal, force et hypertrophie : revue systématique et méta-analyse]. 2022 (revue non vérifiée).',
    population: 'Adultes (programmes à volume égal)', outcomes: ['force (1RM)', 'hypertrophie'],
    findings: ['Programmes périodisés supérieurs aux non périodisés pour le 1RM.', 'Ondulatoire supérieur au linéaire seulement chez les entraînés.', 'Aucune différence d’hypertrophie.'],
    identityVerification: 'CONFIRMED', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4E,
    limitations: 'Aucune durée de cycle ni fraction de progression n’en est tirée.',
    pendingHumanReview: [ABSTRACT, FULLTEXT],
  },
  {
    id: 'SRC.FRADKIN_2010', pmid: '19996770', year: '2010', evidenceType: 'meta_analysis',
    citation: 'Fradkin, Zazryn, Smoliga. [Échauffement et performance physique : revue systématique et méta-analyse]. J Strength Cond Res. 2010;24(1):140–148.',
    population: 'Études sur l’échauffement et la performance physique', outcomes: ['performance physique'],
    findings: [],
    identityVerification: 'CONFIRMED', verificationLevel: 'IDENTITY_ONLY', verifiedOn: V4E,
    limitations: 'Résultats non extraits : aucune revendication ne s’y appuie.',
    pendingHumanReview: [ABSTRACT],
  },
  {
    id: 'SRC.WARMUP_FORCE_MA', pmid: '39864808', year: '2025', evidenceType: 'meta_analysis',
    citation: 'The effect of muscle warm-up on voluntary and evoked force-time parameters: a systematic review and meta-analysis with meta-regression — auteurs et revue non vérifiés.',
    population: 'Études d’échauffement musculaire (paramètres force–temps)', outcomes: ['taux de développement de la force', 'puissance', 'force maximale'],
    findings: ['Amélioration du taux de développement de la force et de la puissance, pas de la force maximale.', 'Échauffement actif non supérieur au passif.'],
    identityVerification: 'PARTIAL', verificationLevel: 'SEARCH_SUMMARY', verifiedOn: V4E,
    limitations: 'Auteurs, revue et année exacte non vérifiés.',
    pendingHumanReview: [ABSTRACT, 'Compléter l’identité (auteurs, revue).'],
  },
  {
    id: 'SRC.WARMUP_HIGHLOAD', pmid: '39593476', year: 'non vérifiée', evidenceType: 'experimental_study',
    citation: 'Titre commençant par « High-load and low-volume warm-up increases… » — auteurs, revue et contenu non vérifiés.',
    population: 'Non vérifiée', outcomes: ['non vérifiés'],
    findings: [],
    identityVerification: 'PARTIAL', verificationLevel: 'IDENTITY_ONLY', verifiedOn: V4E,
    limitations: 'Identité partielle, contenu inconnu : AUCUNE revendication ne s’appuie sur cette source.',
    pendingHumanReview: [ABSTRACT, 'Compléter l’identité.'],
  },
];
