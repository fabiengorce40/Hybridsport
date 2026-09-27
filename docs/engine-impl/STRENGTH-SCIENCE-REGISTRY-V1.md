# STRENGTH-SCIENCE-REGISTRY-V1 — registre scientifique du StrengthEngine

> Document **généré** depuis `packages/strength/src/science/` par `tests/golden/science-docs.test.ts` : ne pas éditer à la main.

- Version du registre : **1.1.0** · ruleset : **0.4.0-strength-science-lock**
- Gate STRENGTH_SCIENTIFIC_V1_GATE calculé : **PASS_PROVISIONAL** (anomalies : 0 ; blocages PRODUCTION : 57)
- Vérification des sources (2026-09-27, complétée le 2026-09-28) : **identité** par recherche web (PMID, titre, auteurs, revue, DOI).
- **Niveaux de vérification du contenu** : `IDENTITY_ONLY` (aucun résultat extrait) < `SEARCH_SUMMARY` (résultats connus par des résumés de moteur de recherche, y compris secondaires) < `ABSTRACT_VERIFIED` (résumé officiel lu) < `FULL_TEXT_VERIFIED`.
  - PubMed, E-utilities, Europe PMC et les sites des éditeurs restent bloqués par la politique réseau de l’environnement d’exécution (vérifié à nouveau en 4F) : **aucun résumé officiel ni texte intégral n’a été lu**, aucune source ne dépasse `SEARCH_SUMMARY`.
  - Aucune précision absente des résumés consultés n’a été ajoutée ; chaque source porte la liste des points à confirmer lors de la revue humaine (§6).
- Répartition : IDENTITY_ONLY 6 · SEARCH_SUMMARY 15 · ABSTRACT_VERIFIED 0 · FULL_TEXT_VERIFIED 0

## 1. Statuts scientifiques

| Statut | Sens |
|---|---|
| `SUPPORTED` | soutenu par des synthèses vérifiées ET valeur non provisoire |
| `SUPPORTED_WITH_RANGE` | valeur dans une plage soutenue par une synthèse confirmée |
| `CONTEXT_DEPENDENT` | soutenu selon le contexte (population, modalité, objectif) |
| `PROGRAMMING_HEURISTIC` | heuristique de programmation (aucune valeur démontrée) |
| `PRODUCT_GUARDRAIL` | garde-fou produit |
| `EXPERT_DESIGN_REVIEW` | choix de conception soumis à revue d’expert |
| `SAFETY_SIGNOFF_REQUIRED` | visa de sécurité requis (G1) |
| `INSUFFICIENT_EVIDENCE` | preuve insuffisante |
| `TECHNICAL` | paramètre technique |

Règle de non-fausse précision (contrôlée par `validateScienceRegistry`) : le statut d’un paramètre n’est jamais plus fort que la plus faible des revendications qui déterminent sa **valeur** ; un mécanisme soutenu ne rend pas la valeur soutenue.

## 2. Sources → principes → paramètres

| Source | PMID | Type | Identité | Contenu | Principes | Paramètres |
|---|---|---|---|---|---|---|
| `SRC.CURRIER_2026_ACSM` | 41843416 | position_stand | CONFIRMED | SEARCH_SUMMARY | P2.HYPERTROPHIE, P3.VOLUME | `strength.dose.base` |
| `SRC.CURRIER_2023_NMA` | 37414459 | network_meta_analysis | CONFIRMED | IDENTITY_ONLY | — | — |
| `SRC.LOPEZ_2021` | 33433148 | network_meta_analysis | CONFIRMED | SEARCH_SUMMARY | P1.FORCE, P2.HYPERTROPHIE | `strength.selection.minLoadCeiling`, `strength.selection.primaryLoadRequired`, `strength.dose.base` |
| `SRC.ROBINSON_2024` | 38970765 | meta_analysis | CONFIRMED | SEARCH_SUMMARY | P2.HYPERTROPHIE, P4.RIR | `strength.dose.base` |
| `SRC.REFALO_2023` | 36334240 | meta_analysis | CONFIRMED | SEARCH_SUMMARY | P4.RIR | `strength.dose.base` |
| `SRC.PELLAND_2026` | 41343037 | meta_analysis | CONFIRMED | SEARCH_SUMMARY | P3.VOLUME, P6.FREQUENCE | `strength.archetypes`, `strength.volume`, `strength.session.stimulusPreservation` |
| `SRC.SINGER_2024` | 39205815 | meta_analysis | CONFIRMED | SEARCH_SUMMARY | P5.REPOS | `strength.dose.base` |
| `SRC.GRGIC_2018` | 28933024 | systematic_review | CONFIRMED | IDENTITY_ONLY | — | — |
| `SRC.HALPERIN_2022` | 34542869 | scoping_review | PARTIAL | SEARCH_SUMMARY | P4.RIR | `strength.load`, `strength.prescriptionConfidence`, `strength.load.specificObservation` |
| `SRC.HUGHES_2020` | 33337690 | experimental_study | CONFIRMED | IDENTITY_ONLY | — | — |
| `SRC.WILSON_2012` | 22002517 | meta_analysis | CONFIRMED | SEARCH_SUMMARY | — | `strength.interference`, `strength.interference.assessment` |
| `SRC.LUNDBERG_2022` | 35476184 | meta_analysis | CONFIRMED | SEARCH_SUMMARY | — | `strength.interference.assessment` |
| `SRC.CHEN_2024` | 38187085 | network_meta_analysis | PARTIAL | IDENTITY_ONLY | — | — |
| `SRC.KASSIANO_2022` | 35438660 | systematic_review | CONFIRMED | SEARCH_SUMMARY | P10.ANCRES | `strength.selection.recencyBandsDays`, `strength.tracks`, `strength.selection.repetitionPolicy`, `strength.tracks.horizon` |
| `SRC.GRGIC_2020` | 32681399 | systematic_review | CONFIRMED | SEARCH_SUMMARY | — | `strength.load`, `strength.prescriptionConfidence` |
| `SRC.HICKMOTT_2022` | 35038063 | meta_analysis | CONFIRMED | SEARCH_SUMMARY | P7.PROGRESSION | `strength.progression` |
| `SRC.AUTOREG_NMA_2025` | 40791980 | network_meta_analysis | PARTIAL | SEARCH_SUMMARY | P7.PROGRESSION | `strength.progression` |
| `SRC.MOESGAARD_2022` | 35044672 | meta_analysis | CONFIRMED | SEARCH_SUMMARY | P7.PROGRESSION | `strength.progression` |
| `SRC.FRADKIN_2010` | 19996770 | meta_analysis | CONFIRMED | IDENTITY_ONLY | — | — |
| `SRC.WARMUP_FORCE_MA` | 39864808 | meta_analysis | PARTIAL | SEARCH_SUMMARY | P9.MONTEE, P12.ECHAUFFEMENT | `strength.session.mobility`, `strength.rampup`, `strength.rampup.estimatedPolicy`, `strength.session.durationPriority` |
| `SRC.WARMUP_HIGHLOAD` | 39593476 | experimental_study | PARTIAL | IDENTITY_ONLY | — | — |

### SRC.CURRIER_2026_ACSM (PMID 41843416, 2026)

- Référence : Currier et al. (président du groupe : Phillips). American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. Med Sci Sports Exerc. 2026;58(4):851–872. DOI 10.1249/MSS.0000000000003897.
- Population : Adultes en bonne santé (vue d’ensemble de 137 revues systématiques, plus de 30 000 participants)
- Critères : force musculaire, hypertrophie, endurance musculaire, puissance, performance fonctionnelle
- Résultats rapportés : Vue d’ensemble de 137 revues systématiques (plus de 30 000 adultes), évaluée avec un cadre de type GRADE. Message général : la plupart des formes d’entraînement en résistance améliorent la fonction musculaire ; les détails de prescription comptent moins que le fait de s’entraîner. Rapporté par des résumés secondaires (communiqué ACSM, articles de vulgarisation) : hypertrophie portée surtout par le volume hebdomadaire avec rendements décroissants ; force maximale favorisée par des charges élevées.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-28)
- Limites : Recommandations chiffrées (séries hebdomadaires, % 1RM, fréquence) connues par des résumés secondaires seulement : AUCUNE valeur du moteur n’en est tirée.

### SRC.CURRIER_2023_NMA (PMID 37414459, 2023)

- Référence : Currier BS, McLeod JC, Banfield L et al. [Prescription de l’entraînement en résistance : méta-analyse en réseau bayésienne]. Br J Sports Med. 2023.
- Population : Adultes en bonne santé
- Critères : force musculaire, hypertrophie
- Résultats rapportés : *aucun (contenu inconnu)*
- Vérification : identité CONFIRMED, contenu IDENTITY_ONLY (2026-09-27)
- Limites : Aucune estimation extraite : non utilisée.

### SRC.LOPEZ_2021 (PMID 33433148, 2021)

- Référence : Lopez P, Radaelli R, Taaffe DR et al. Resistance Training Load Effects on Muscle Hypertrophy and Strength Gain: Systematic Review and Network Meta-analysis. Med Sci Sports Exerc. 2021;53(6):1206–1216. DOI 10.1249/MSS.0000000000002585.
- Population : Adultes (28 études, 747 participants)
- Critères : hypertrophie, force (1RM)
- Résultats rapportés : Aucune différence d’hypertrophie entre charges faibles, modérées et élevées. Gains de force supérieurs avec des charges élevées ou modérées qu’avec des charges faibles.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-27)
- Limites : Catégories de charge de la source non transposables en pourcentages exacts sans lecture intégrale.

### SRC.ROBINSON_2024 (PMID 38970765, 2024)

- Référence : Robinson ZP, Pelland JC, Remmert JF et al. Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. Sports Med. 2024;54(9):2209–2231.
- Population : Méta-régressions : 55 études (hypertrophie) et 67 études (force)
- Critères : hypertrophie, force
- Résultats rapportés : Proximité de l’échec quantifiée en RIR ESTIMÉ. L’hypertrophie augmente à mesure que les séries se rapprochent de l’échec. Différences négligeables de gains de force selon la proximité de l’échec.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-28)
- Limites : RIR estimé a posteriori, non mesuré ; pentes et intervalles non extraits : relation à interpréter avec incertitude, aucune cible de RIR n’en est tirée.

### SRC.REFALO_2023 (PMID 36334240, 2022/2023)

- Référence : Refalo, Helms, Trexler, Hamilton, Fyfe. [Proximité de l’échec et hypertrophie : revue systématique et méta-analyse]. 2022/2023 (revue non vérifiée).
- Population : Adultes (15 études)
- Critères : hypertrophie
- Résultats rapportés : L’entraînement jusqu’à l’échec n’est pas supérieur à l’arrêt avant l’échec pour l’hypertrophie (ES 0,12 ; p = 0,343).
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-27)
- Limites : Hétérogénéité des définitions de l’échec.

### SRC.PELLAND_2026 (PMID 41343037, 2026)

- Référence : Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains. Sports Med. 2026 (en ligne le 2025-12-04). DOI 10.1007/s40279-025-02344-w.
- Population : 67 études, 2 058 participants (79,1 % d’hommes), âge moyen environ 25 ans
- Critères : hypertrophie, force
- Résultats rapportés : Relation dose–réponse du volume hebdomadaire avec rendements décroissants. Fréquence : effet positif sur la force, négligeable sur l’hypertrophie. Séries indirectes décomptées de trois façons (totale = 1, fractionnaire = 0,5, directe = 0) : la méthode FRACTIONNAIRE donne la preuve la plus forte.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-28)
- Limites : Population majoritairement masculine et jeune ; « preuve la plus forte » = comparaison de modèles, pas une démonstration du coefficient 0,5 pour chaque muscle.

### SRC.SINGER_2024 (PMID 39205815, 2024)

- Référence : Singer A et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. Front Sports Act Living. 2024;6. DOI 10.3389/fspor.2024.1429789.
- Population : Adultes en bonne santé ; 19 mesures issues de 9 études randomisées
- Critères : hypertrophie
- Résultats rapportés : Petit bénéfice hypertrophique des repos de plus de 60 s, peut-être par un volume de charge mieux préservé. Pas de différence appréciable au-delà de 90 s. Chevauchement important des effets ; incertitude élevée.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-28)
- Limites : Faible nombre d’études ; hypertrophie seulement ; aucun seuil universel n’en est tiré (les bornes de 60 et 90 s décrivent les comparaisons de la source).

### SRC.GRGIC_2018 (PMID 28933024, 2018)

- Référence : Grgic et al. [Durée du repos entre séries et force : revue systématique]. Sports Med. 2018;48(1):137–151.
- Population : 23 études, 491 participants
- Critères : force musculaire
- Résultats rapportés : *aucun (contenu inconnu)*
- Vérification : identité CONFIRMED, contenu IDENTITY_ONLY (2026-09-27)
- Limites : Conclusions non extraites : aucune revendication ne s’y appuie.

### SRC.HALPERIN_2022 (PMID 34542869, 2022)

- Référence : Halperin et al. Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise: A Scoping Review and Exploratory Meta-analysis. Sports Med. 2022.
- Population : 12 études, 414 participants
- Critères : précision de la prédiction des répétitions jusqu’à l’échec
- Résultats rapportés : Sous-estimation moyenne d’environ 0,95 répétition. Précision meilleure pour des séries plus courtes (moins de 12 répétitions, charges au-delà d’environ 70 % 1RM) ; moins bonne et plus variable pour des séries longues. Hétérogénéité importante.
- Vérification : identité PARTIAL, contenu SEARCH_SUMMARY (2026-09-28)
- Limites : Méta-analyse exploratoire ; hétérogénéité importante.

### SRC.HUGHES_2020 (PMID 33337690, 2020)

- Référence : Hughes, Peiffer, Scott. [Estimation du RIR sur quatre exercices]. J Strength Cond Res. 2020.
- Population : 21 hommes entraînés
- Critères : précision de l’estimation du RIR (65, 75 et 85 % 1RM)
- Résultats rapportés : *aucun (contenu inconnu)*
- Vérification : identité CONFIRMED, contenu IDENTITY_ONLY (2026-09-27)
- Limites : Résultats non extraits : aucune revendication ne s’y appuie.

### SRC.WILSON_2012 (PMID 22002517, 2012)

- Référence : Wilson et al. [Entraînement concurrent : méta-analyse de l’interférence]. J Strength Cond Res. 2012;26(8):2293–2307.
- Population : 21 études
- Critères : force, hypertrophie, puissance
- Résultats rapportés : L’interférence dépend de la modalité d’endurance, de sa fréquence et de sa durée.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-27)
- Limites : Méta-analyse ancienne ; aucune fenêtre temporelle chiffrée n’en est tirée.

### SRC.LUNDBERG_2022 (PMID 35476184, 2022)

- Référence : Lundberg, Feuerbacher, Sünkeler, Schumann. [Entraînement concurrent et hypertrophie des fibres : revue systématique et méta-analyse]. Sports Med. 2022.
- Population : Adultes
- Critères : hypertrophie des fibres musculaires
- Résultats rapportés : Atténuation faible de l’hypertrophie des fibres par l’entraînement concurrent. Atténuation plus marquée avec la course qu’avec le vélo, au moins pour les fibres de type I.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-27)
- Limites : Hypertrophie des fibres seulement ; ampleur non extraite.

### SRC.CHEN_2024 (PMID 38187085, 2024)

- Référence : Chen, Feng, Huang, Wang, Mi. [Types d’entraînement concurrent, force des membres inférieurs et section musculaire : méta-analyse en réseau]. J Exerc Sci Fit. 2024.
- Population : 40 études, 841 participants
- Critères : force des membres inférieurs, surface de section musculaire
- Résultats rapportés : *aucun (contenu inconnu)*
- Vérification : identité PARTIAL, contenu IDENTITY_ONLY (2026-09-27)
- Limites : Titre exact et résultats non vérifiés : non utilisée.

### SRC.KASSIANO_2022 (PMID 35438660, 2022)

- Référence : Kassiano W, Nunes JP, Costa B, Ribeiro AS, Schoenfeld BJ, Cyrino ES. Does Varying Resistance Exercises Promote Superior Muscle Hypertrophy and Strength Gains? A Systematic Review. J Strength Cond Res. 2022.
- Population : 8 études (jeunes hommes)
- Critères : hypertrophie, force
- Résultats rapportés : Une variation systématique des exercices peut être bénéfique. Une variation excessive et aléatoire peut compromettre les gains. Conclusion nuancée : effet selon la manière d’appliquer la variation.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-28)
- Limites : Petit corpus ; AUCUNE durée d’ancre n’en est tirée.

### SRC.GRGIC_2020 (PMID 32681399, 2020)

- Référence : Grgic, Lazinica, Schoenfeld, Pedisic. [Fiabilité test–retest du 1RM : revue systématique]. 2020 (revue non vérifiée).
- Population : 32 études
- Critères : fiabilité test–retest du 1RM
- Résultats rapportés : ICC médian 0,97 ; coefficient de variation médian 4,2 %.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-27)
- Limites : Fiabilité d’un 1RM MESURÉ, pas d’un e1RM estimé.

### SRC.HICKMOTT_2022 (PMID 35038063, 2022)

- Référence : Hickmott LM, Chilibeck PD, Shaw KA, Butcher SJ. The Effect of Load and Volume Autoregulation on Muscular Strength and Hypertrophy: A Systematic Review and Meta-Analysis. Sports Med Open. 2022. DOI 10.1186/s40798-021-00404-9.
- Population : Pratiquants entraînés (15 études : 6 autorégulation de la charge, 9 autorégulation du volume)
- Critères : force (1RM), hypertrophie (section)
- Résultats rapportés : Autorégulation de la charge (RIR/RPE, vitesse) et prescription standardisée en pourcentage : améliorations de force SIMILAIRES. Autorégulation du volume : seuils de perte de vitesse bas plutôt favorables à la force, plus élevés plutôt favorables à l’hypertrophie (séries et intensité égalisées).
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-28)
- Limites : Petit nombre d’études par comparaison ; pratiquants entraînés.

### SRC.AUTOREG_NMA_2025 (PMID 40791980, 2025)

- Référence : Autoregulated resistance training for maximal strength: systematic review and network meta-analysis (2025) — auteurs et revue non vérifiés.
- Population : Adultes (méta-analyse en réseau)
- Critères : force maximale
- Résultats rapportés : Classement favorable des méthodes autorégulées (APRE, RPE, vitesse) face au pourcentage (SUCRA APRE 93 %).
- Vérification : identité PARTIAL, contenu SEARCH_SUMMARY (2026-09-27)
- Limites : Auteurs et revue non vérifiés ; un classement SUCRA n’est pas une taille d’effet ; ne démontre pas une supériorité générale.

### SRC.MOESGAARD_2022 (PMID 35044672, 2022)

- Référence : Moesgaard, Beck, Christiansen, Aagaard, Lundbye-Jensen. [Périodisation à volume égal, force et hypertrophie : revue systématique et méta-analyse]. 2022 (revue non vérifiée).
- Population : Adultes (programmes à volume égal)
- Critères : force (1RM), hypertrophie
- Résultats rapportés : Programmes périodisés supérieurs aux non périodisés pour le 1RM. Ondulatoire supérieur au linéaire seulement chez les entraînés. Aucune différence d’hypertrophie.
- Vérification : identité CONFIRMED, contenu SEARCH_SUMMARY (2026-09-27)
- Limites : Aucune durée de cycle ni fraction de progression n’en est tirée.

### SRC.FRADKIN_2010 (PMID 19996770, 2010)

- Référence : Fradkin, Zazryn, Smoliga. [Échauffement et performance physique : revue systématique et méta-analyse]. J Strength Cond Res. 2010;24(1):140–148.
- Population : Études sur l’échauffement et la performance physique
- Critères : performance physique
- Résultats rapportés : *aucun (contenu inconnu)*
- Vérification : identité CONFIRMED, contenu IDENTITY_ONLY (2026-09-27)
- Limites : Résultats non extraits : aucune revendication ne s’y appuie.

### SRC.WARMUP_FORCE_MA (PMID 39864808, 2025)

- Référence : The effect of muscle warm-up on voluntary and evoked force-time parameters: a systematic review and meta-analysis with meta-regression — auteurs et revue non vérifiés.
- Population : Études d’échauffement musculaire (paramètres force–temps)
- Critères : taux de développement de la force, puissance, force maximale
- Résultats rapportés : Amélioration du taux de développement de la force et de la puissance, pas de la force maximale. Échauffement actif non supérieur au passif.
- Vérification : identité PARTIAL, contenu SEARCH_SUMMARY (2026-09-27)
- Limites : Auteurs, revue et année exacte non vérifiés.

### SRC.WARMUP_HIGHLOAD (PMID 39593476, non vérifiée)

- Référence : Titre commençant par « High-load and low-volume warm-up increases… » — auteurs, revue et contenu non vérifiés.
- Population : Non vérifiée
- Critères : non vérifiés
- Résultats rapportés : *aucun (contenu inconnu)*
- Vérification : identité PARTIAL, contenu IDENTITY_ONLY (2026-09-27)
- Limites : Identité partielle, contenu inconnu : AUCUNE revendication ne s’appuie sur cette source.

## 3. Principes de programmation 1–13

### P1.FORCE — Force maximale et charges (`SUPPORTED`)

- Énoncé : Les charges élevées ou modérées favorisent davantage les gains de force maximale que les charges faibles.
- Sources : `SRC.LOPEZ_2021`
- Paramètres : `strength.dose.base`, `strength.selection.primaryLoadRequired`, `strength.selection.minLoadCeiling`
- Comportement du moteur : Le profil « heavy » du principal utilise des répétitions basses ; le principal d’un stimulus lourd doit être chargeable (F10).
- Non revendiqué : Aucune règle « tout au-dessus de 80 % du 1RM » ; les plages de répétitions exactes du profil restent des heuristiques.

### P2.HYPERTROPHIE — Hypertrophie sur une large plage de charges (`SUPPORTED`)

- Énoncé : L’hypertrophie est obtenue sur une large plage de charges ; volume, proximité de l’échec, progression, faisabilité et récupération comptent davantage que la charge seule.
- Sources : `SRC.LOPEZ_2021`, `SRC.ROBINSON_2024`, `SRC.CURRIER_2026_ACSM`
- Paramètres : `strength.dose.base`, `strength.volume`
- Comportement du moteur : Profils « volume » et « general » à répétitions plus hautes ; aucune exigence de charge élevée hors stimulus lourd.
- Non revendiqué : Aucune plage de répétitions « optimale » pour l’hypertrophie.

### P3.VOLUME — Volume : dose–réponse à rendements décroissants (`SUPPORTED`)

- Énoncé : Le volume hebdomadaire suit une relation dose–réponse à rendements décroissants ; « 10–20 séries » n’est pas une frontière ; le décompte fractionnaire des séries indirectes est la méthode la mieux soutenue.
- Sources : `SRC.PELLAND_2026`, `SRC.CURRIER_2026_ACSM`
- Paramètres : `strength.volume`, `strength.volume.sessionCap`
- Comportement du moteur : Plancher et haut SOFT par groupe ; `secondaryWeight` 0,5 conservé comme approximation fractionnaire ; réponse individuelle préparée (future donnée de contexte).
- Non revendiqué : Les bornes hebdomadaires et le poids 0,5 ne sont pas des valeurs démontrées.

### P4.RIR — RIR : central mais inexact (`CONTEXT_DEPENDENT`)

- Énoncé : La proximité de l’échec est une variable centrale de l’hypertrophie, mais l’échec n’est pas supérieur à l’arrêt avant l’échec ; l’estimation du RIR est imprécise.
- Sources : `SRC.ROBINSON_2024`, `SRC.REFALO_2023`, `SRC.HALPERIN_2022`
- Paramètres : `strength.dose.base`, `strength.dose.modifiers`, `strength.prescriptionConfidence`
- Comportement du moteur : RIR ≥ 1 par défaut (jamais l’échec) ; l’isolation peut aller plus près de l’échec (RIR 1) ; un RIR incertain abaisse la PrescriptionConfidence. Plages de RIR : extension CORE-EXT-5 documentée, non implémentée.
- Non revendiqué : Aucune précision de RIR au-delà d’une répétition environ n’est supposée.

### P5.REPOS — Repos : préserver la qualité (`CONTEXT_DEPENDENT`)

- Énoncé : Le repos sert la qualité des séries : long pour le travail lourd principal, intermédiaire pour le secondaire, plus court pour les accessoires. Pour l’hypertrophie, petit bénéfice au-delà d’environ 60 s et aucune différence appréciable au-delà d’environ 90 s selon une méta-analyse bayésienne ; aucun seuil universel.
- Sources : `SRC.SINGER_2024`
- Paramètres : `strength.dose.base`, `strength.dose.modifiers`, `strength.session.durationPriority`
- Comportement du moteur : Le CORE interdit reduce_rest sur le principal ; un optionnel n’est ajouté que s’il tient sans réduire un repos ; ruleset V1 : sous contrainte, le repos du principal est réduit en dernier.
- Non revendiqué : Aucune durée de repos exacte n’est présentée comme démontrée.

### P6.FREQUENCE — Fréquence : outil de répartition (`CONTEXT_DEPENDENT`)

- Énoncé : La fréquence répartit le volume : effet positif sur la force, négligeable sur l’hypertrophie à volume égal.
- Sources : `SRC.PELLAND_2026`
- Paramètres : `strength.archetypes`
- Comportement du moteur : Le moteur n’impose aucune fréquence : la répartition hebdomadaire appartient au planificateur.
- Non revendiqué : Aucun « exactement 2 × par semaine ».

### P7.PROGRESSION — Progression (`CONTEXT_DEPENDENT`)

- Énoncé : Une progression structurée est favorable à la force ; l’autorégulation est une stratégie valide d’individualisation, sans supériorité générale établie ; les fractions de progression exactes sont des heuristiques.
- Sources : `SRC.MOESGAARD_2022`, `SRC.HICKMOTT_2022`, `SRC.AUTOREG_NMA_2025`
- Paramètres : `strength.progression`
- Comportement du moteur : Familles de modèles conservées ; cycleCapFraction 0,15, regressionFraction 0,10, regressAfterBelow 2, stagnationHolds 3 reclassés en heuristiques.
- Non revendiqué : Aucune fraction de progression n’est démontrée.

### P8.DECHARGE — Décharge (`PROGRAMMING_HEURISTIC`)

- Énoncé : La décharge est un mécanisme utile mais non universel ; son déclenchement doit devenir contextuel.
- Sources : aucune
- Paramètres : `strength.dose.modifiers`
- Comportement du moteur : Mécanisme conservé (phase « deload » décidée par le planificateur) ; valeurs reclassées en heuristiques.
- Non revendiqué : Aucune fréquence ni ampleur de décharge démontrée.

### P9.MONTEE — Montée en charge spécifique (`CONTEXT_DEPENDENT`)

- Énoncé : Une montée spécifique précède le travail lourd ; l’échauffement musculaire améliore le taux de développement de la force et la puissance, pas la force maximale.
- Sources : `SRC.WARMUP_FORCE_MA`
- Paramètres : `strength.rampup`, `strength.rampup.estimatedPolicy`
- Comportement du moteur : Montée conservée et prioritaire (jamais réduite sous contrainte de temps) ; paliers exacts reclassés en heuristiques.
- Non revendiqué : Les paliers (fractions, répétitions) ne sont pas optimaux ni démontrés ; la source 39593476 (identité partielle) n’est pas utilisée.

### P10.ANCRES — Ancres et tracks (`CONTEXT_DEPENDENT`)

- Énoncé : Une variation systématique peut aider, une variation aléatoire excessive peut nuire : l’ancre ne change que pour une raison traçable ; continuité forte chez le novice, préférée chez le débutant, variation contrôlée ensuite. Aucune durée d’ancre universelle n’en découle.
- Sources : `SRC.KASSIANO_2022`
- Paramètres : `strength.tracks`, `strength.tracks.horizon`, `strength.selection.recencyBandsDays`, `strength.selection.repetitionPolicy`
- Comportement du moteur : Trois niveaux conservés ; 12/10/8/6 semaines deviennent un horizon de REVUE (PROGRESSION.REVIEW_DUE), jamais une clôture à elles seules.
- Non revendiqué : Aucune durée de vie d’ancre démontrée.

### P11.AXIAL — Charge axiale (`PRODUCT_GUARDRAIL`)

- Énoncé : Limiter les exercices à forte charge axiale par séance est un garde-fou produit ; une dose axiale cumulée est à préparer.
- Sources : aucune
- Paramètres : `strength.selection.axialHighMaxPerSession`
- Comportement du moteur : `axialHighMaxPerSession` = 1 conservé, reclassé garde-fou produit.
- Non revendiqué : Aucune preuve qu’un seul exercice axial par séance soit une limite physiologique.

### P12.ECHAUFFEMENT — Échauffement général et montée spécifique (`CONTEXT_DEPENDENT`)

- Énoncé : L’échauffement général est contextuel ; la montée spécifique est distincte et prioritaire.
- Sources : `SRC.WARMUP_FORCE_MA`
- Paramètres : `strength.session.mobility`, `strength.session.durationPriority`, `strength.rampup`
- Comportement du moteur : Ruleset V1 : échauffement général au minimum, sa part supplémentaire seulement si elle tient après les optionnels ; plus de 5 min + 3 min imposées.
- Non revendiqué : Aucune durée d’échauffement général démontrée.

### P13.RETOUR_AU_CALME — Retour au calme facultatif (`PRODUCT_GUARDRAIL`)

- Énoncé : Le retour au calme est facultatif : il ne sacrifie jamais les séries principales, les repos nécessaires ni la montée spécifique.
- Sources : aucune
- Paramètres : `strength.session.mobility`, `strength.session.durationPriority`
- Comportement du moteur : Ruleset V1 : ajouté en dernier, seulement s’il tient ; sinon SELECT.SLOT_OMITTED (cause duration).
- Non revendiqué : Aucun bénéfice physiologique du retour au calme n’est revendiqué.

## 4. Revendications (claims)

| Revendication | Énoncé | Statut | Détermine la valeur | Sources | Paramètres |
|---|---|---|---|---|---|
| `C.1RM_REL` | Un 1RM mesuré est très fiable (ICC médian 0,97 ; CV médian 4,2 %) — ce n’est pas le cas démontré d’un e1RM estimé. | CONTEXT_DEPENDENT | non | SRC.GRGIC_2020 | `strength.load`, `strength.prescriptionConfidence` |
| `C.ACSM` | L’entraînement en résistance améliore la force et l’hypertrophie sur une large gamme de modalités ; les détails de prescription comptent moins que la pratique (vue d’ensemble de 137 revues). | CONTEXT_DEPENDENT | non | SRC.CURRIER_2026_ACSM | `strength.dose.base` |
| `C.AUTOREG` | L’autorégulation est une stratégie valide d’individualisation (améliorations de force similaires à la prescription en pourcentage) ; sa supériorité générale n’est pas établie. | CONTEXT_DEPENDENT | non | SRC.HICKMOTT_2022, SRC.AUTOREG_NMA_2025 | `strength.progression` |
| `C.AXIAL` | Nombre maximal d’exercices à forte charge axiale par séance. | INSUFFICIENT_EVIDENCE | oui | — | `strength.selection.axialHighMaxPerSession` |
| `C.CAL` | Cible d’effort et nombre de séries de calibration. | PROGRAMMING_HEURISTIC | oui | — | `strength.calibration` |
| `C.CAP` | Plafond de séries difficiles par groupe et par séance. | SAFETY_SIGNOFF_REQUIRED | oui | — | `strength.volume.sessionCap` |
| `C.CELLS` | Valeurs exactes des cellules (reps, séries, RIR, repos). | PROGRAMMING_HEURISTIC | oui | — | `strength.dose.base` |
| `C.CONC` | L’interférence dépend de la modalité, de la fréquence et de la durée d’endurance. | CONTEXT_DEPENDENT | non | SRC.WILSON_2012 | `strength.interference`, `strength.interference.assessment` |
| `C.CONFLICT` | Politique de conflit la plus prudente. | PRODUCT_GUARDRAIL | oui | — | `strength.dose.modifiers` |
| `C.DELOAD` | Ampleur de la décharge. | PROGRAMMING_HEURISTIC | oui | — | `strength.dose.modifiers` |
| `C.DOSE` | Relation dose–réponse du volume hebdomadaire à rendements décroissants. | SUPPORTED | non | SRC.PELLAND_2026 | `strength.volume`, `strength.session.stimulusPreservation` |
| `C.EPLEY` | Formule et table génériques de conversion reps → % e1RM. | PROGRAMMING_HEURISTIC | oui | — | `strength.load` |
| `C.FAILURE` | L’échec n’est pas supérieur à l’arrêt avant l’échec pour l’hypertrophie ; la proximité de l’échec compte. | CONTEXT_DEPENDENT | non | SRC.REFALO_2023, SRC.ROBINSON_2024 | `strength.dose.base` |
| `C.FRACTIONAL` | Le décompte fractionnaire (0,5) des séries indirectes est la méthode la mieux soutenue dans les méta-régressions de volume (comparaison de modèles) — base de `secondaryWeight` 0,5. | CONTEXT_DEPENDENT | oui | SRC.PELLAND_2026 | `strength.volume` |
| `C.FREQ` | La fréquence a un effet positif sur la force et négligeable sur l’hypertrophie à volume égal. | CONTEXT_DEPENDENT | non | SRC.PELLAND_2026 | `strength.archetypes` |
| `C.HEAVY` | Les charges élevées ou modérées favorisent davantage la force que les charges faibles. | SUPPORTED | non | SRC.LOPEZ_2021 | `strength.selection.minLoadCeiling`, `strength.selection.primaryLoadRequired`, `strength.dose.base` |
| `C.HEAVY_LIST` | Stimuli dont le principal exige un exercice chargeable. | EXPERT_DESIGN_REVIEW | oui | — | `strength.selection.primaryLoadRequired` |
| `C.HYP_LOADS` | L’hypertrophie ne diffère pas entre charges faibles, modérées et élevées. | SUPPORTED | non | SRC.LOPEZ_2021 | `strength.dose.base` |
| `C.MATRIX` | Bandes horaires, deltas ordinaux et actions. | PROGRAMMING_HEURISTIC | oui | — | `strength.interference.assessment` |
| `C.MAXEFF` | Seuil d’intensité relative de l’effort maximal. | INSUFFICIENT_EVIDENCE | oui | — | `strength.maxEffort.threshold` |
| `C.NOV_TECH` | Limite d’exercices techniques sous fatigue pour le novice. | SAFETY_SIGNOFF_REQUIRED | oui | — | `strength.novice.technicalUnderFatigue` |
| `C.PC_LEVELS` | Niveaux dont le RIR est traité comme incertain. | INSUFFICIENT_EVIDENCE | oui | — | `strength.prescriptionConfidence` |
| `C.PC_THRESH` | Seuils de séances et d’observations pour HIGH. | PROGRAMMING_HEURISTIC | oui | — | `strength.prescriptionConfidence` |
| `C.PERIOD` | Programmes périodisés supérieurs aux non périodisés pour le 1RM. | CONTEXT_DEPENDENT | non | SRC.MOESGAARD_2022 | `strength.progression` |
| `C.PROG_FRACTIONS` | Fractions, seuils et compteurs de progression. | PROGRAMMING_HEURISTIC | oui | — | `strength.progression` |
| `C.RAMP_STEPS` | Fractions et répétitions des paliers. | PROGRAMMING_HEURISTIC | oui | — | `strength.rampup`, `strength.rampup.estimatedPolicy` |
| `C.REST` | Hypertrophie : petit bénéfice des repos de plus de 60 s, pas de différence appréciable au-delà de 90 s, effets largement chevauchants ; aucun seuil universel (repos suffisant pour préserver la qualité des séries). | CONTEXT_DEPENDENT | non | SRC.SINGER_2024 | `strength.dose.base` |
| `C.RIR_ERR` | La prédiction des répétitions jusqu’à l’échec est imprécise (sous-estimation moyenne d’environ une répétition, hétérogénéité importante), meilleure pour les séries courtes (moins de 12 répétitions). | CONTEXT_DEPENDENT | non | SRC.HALPERIN_2022 | `strength.load`, `strength.prescriptionConfidence`, `strength.load.specificObservation` |
| `C.RUN` | Atténuation de l’hypertrophie plus marquée avec la course qu’avec le vélo. | CONTEXT_DEPENDENT | non | SRC.LUNDBERG_2022 | `strength.interference.assessment` |
| `C.SKILL` | Plafond de complexité technique par niveau. | SAFETY_SIGNOFF_REQUIRED | oui | — | `strength.selection.skillCeiling` |
| `C.SPEC_TOL` | Tolérances de répétitions et de RIR. | PROGRAMMING_HEURISTIC | oui | — | `strength.load.specificObservation` |
| `C.SP_RULE` | Critère d’échange et ordre de priorité. | EXPERT_DESIGN_REVIEW | oui | — | `strength.session.stimulusPreservation` |
| `C.STRUCT_DELTAS` | Ajustements de séries et de RIR par structure, besoins retirés. | PROGRAMMING_HEURISTIC | oui | — | `strength.interference` |
| `C.VAR` | Une variation excessive et aléatoire des exercices peut compromettre les gains. | CONTEXT_DEPENDENT | non | SRC.KASSIANO_2022 | `strength.selection.recencyBandsDays`, `strength.tracks`, `strength.selection.repetitionPolicy`, `strength.tracks.horizon` |
| `C.WEEKLY` | Bornes hebdomadaires par groupe, niveau et objectif. | PROGRAMMING_HEURISTIC | oui | — | `strength.volume` |
| `C.WEEKS` | Durées d’ancre par niveau. | PROGRAMMING_HEURISTIC | oui | — | `strength.tracks` |
| `C.WU_DUR` | Durées d’échauffement et de retour au calme. | PROGRAMMING_HEURISTIC | oui | — | `strength.session.mobility` |
| `C.WU_RFD` | L’échauffement musculaire améliore le taux de développement de la force et la puissance, pas la force maximale. | CONTEXT_DEPENDENT | non | SRC.WARMUP_FORCE_MA | `strength.session.mobility`, `strength.rampup`, `strength.rampup.estimatedPolicy`, `strength.session.durationPriority` |

## 5. Mécanisme soutenu, ampleur heuristique

| Paramètre | Statut affiché | Mécanisme | Ampleur | Lecture |
|---|---|---|---|---|
| `strength.dose.base` | PROGRAMMING_HEURISTIC | SUPPORTED | PROGRAMMING_HEURISTIC | Mécanismes soutenus (charges et force, large plage pour l’hypertrophie) ; nombres des cellules heuristiques. |
| `strength.load` | PROGRAMMING_HEURISTIC | CONTEXT_DEPENDENT | PROGRAMMING_HEURISTIC | Fiabilité d’un 1RM mesuré et imprécision du RIR soutenues selon le contexte ; formule d’Epley et table de conversion = repli heuristique. |
| `strength.rampup` | PROGRAMMING_HEURISTIC | CONTEXT_DEPENDENT | PROGRAMMING_HEURISTIC | Effet de l’échauffement musculaire sur la puissance soutenu selon le contexte ; paliers heuristiques. |
| `strength.progression` | PROGRAMMING_HEURISTIC | CONTEXT_DEPENDENT | PROGRAMMING_HEURISTIC | Progression structurée et autorégulation soutenues selon le contexte ; fractions et compteurs heuristiques. |
| `strength.volume` | PROGRAMMING_HEURISTIC | SUPPORTED | PROGRAMMING_HEURISTIC | Dose–réponse à rendements décroissants soutenue ; bornes hebdomadaires heuristiques ; décompte fractionnaire soutenu selon le contexte. |
| `strength.interference` | PROGRAMMING_HEURISTIC | CONTEXT_DEPENDENT | PROGRAMMING_HEURISTIC | Interférence dépendante de la modalité, de la fréquence et de la durée : mécanisme soutenu selon le contexte ; ajustements (séries, RIR, besoins retirés) heuristiques. |
| `strength.prescriptionConfidence` | PROGRAMMING_HEURISTIC | CONTEXT_DEPENDENT | PROGRAMMING_HEURISTIC | Imprécision du RIR soutenue selon le contexte ; seuils de séances et d’observations heuristiques. |
| `strength.interference.assessment` | PROGRAMMING_HEURISTIC | CONTEXT_DEPENDENT | PROGRAMMING_HEURISTIC | MÉCANISME soutenu selon le contexte (modalité, proximité, importance) ; AMPLEUR heuristique : bins temporels 12/24/48/72 h (opérationnels, pas des frontières biologiques), deltas ordinaux, actions et RIR + 2 de MODERATE. |

## 6. Revue humaine à préparer (par source)

- `SRC.CURRIER_2026_ACSM` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Confirmer les recommandations chiffrées rapportées (volume hebdomadaire, charge pour la force, séries, fréquence) et leur niveau GRADE. ; Confronter au ruleset : profils de charge « heavy » et bornes hebdomadaires. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.CURRIER_2023_NMA` (IDENTITY_ONLY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Extraire les classements de prescriptions pour la force et l’hypertrophie.
- `SRC.LOPEZ_2021` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Relever les définitions des catégories de charge. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.ROBINSON_2024` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Relever les pentes et leur incertitude (hypertrophie et force). ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.REFALO_2023` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.PELLAND_2026` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Confirmer la comparaison des méthodes de décompte (critère de comparaison des modèles). ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.SINGER_2024` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Confronter aux repos des accessoires du ruleset (plages 45–75 s). ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.GRGIC_2018` (IDENTITY_ONLY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Extraire le sens de l’effet du repos sur la force selon le niveau d’entraînement.
- `SRC.HALPERIN_2022` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Confirmer l’effet du nombre de répétitions et de la proximité de l’échec sur la précision. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.HUGHES_2020` (IDENTITY_ONLY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture.
- `SRC.WILSON_2012` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.LUNDBERG_2022` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.CHEN_2024` (IDENTITY_ONLY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture.
- `SRC.KASSIANO_2022` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.GRGIC_2020` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.HICKMOTT_2022` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.AUTOREG_NMA_2025` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Compléter l’identité (auteurs, revue).
- `SRC.MOESGAARD_2022` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Lire le texte intégral avant tout usage PRODUCTION (FULL_TEXT_VERIFIED).
- `SRC.FRADKIN_2010` (IDENTITY_ONLY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture.
- `SRC.WARMUP_FORCE_MA` (SEARCH_SUMMARY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Compléter l’identité (auteurs, revue).
- `SRC.WARMUP_HIGHLOAD` (IDENTITY_ONLY) : Lire le résumé officiel (PubMed) et confirmer chaque résultat listé ; passer à ABSTRACT_VERIFIED seulement après lecture. ; Compléter l’identité.

## 7. Blocages PRODUCTION

| Code | Objet | Détail |
|---|---|---|
| PROVISIONAL_VALUE | `strength.needs` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.archetypes` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.goals` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.stimuli` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.session.mobility` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.exerciseClass` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.selection.criteriaOrder` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.selection.recencyBandsDays` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.selection.axialHighMaxPerSession` | PRODUCT_GUARDRAIL |
| PROVISIONAL_VALUE | `strength.selection.minLoadCeiling` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.selection.primaryLoadRequired` | EXPERT_DESIGN_REVIEW |
| G1_SIGNOFF_MISSING | `strength.selection.skillCeiling` | visa de sécurité formel requis |
| PROVISIONAL_VALUE | `strength.selection.skillCeiling` | SAFETY_SIGNOFF_REQUIRED |
| G1_SIGNOFF_MISSING | `strength.novice.technicalUnderFatigue` | visa de sécurité formel requis |
| PROVISIONAL_VALUE | `strength.novice.technicalUnderFatigue` | SAFETY_SIGNOFF_REQUIRED |
| PROVISIONAL_VALUE | `strength.dose.base` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.dose.modifiers` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.dose.nonRep` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.load` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.calibration` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.rampup` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.progression` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.tracks` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.volume` | PROGRAMMING_HEURISTIC |
| G1_SIGNOFF_MISSING | `strength.volume.sessionCap` | visa de sécurité formel requis |
| PROVISIONAL_VALUE | `strength.volume.sessionCap` | SAFETY_SIGNOFF_REQUIRED |
| PROVISIONAL_VALUE | `strength.interference` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.substitution.fallbackNeeds` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.topSet` | PROGRAMMING_HEURISTIC |
| G1_SIGNOFF_MISSING | `strength.maxEffort.threshold` | visa de sécurité formel requis |
| PROVISIONAL_VALUE | `strength.maxEffort.threshold` | SAFETY_SIGNOFF_REQUIRED |
| PROVISIONAL_VALUE | `strength.prescriptionConfidence` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.load.specificObservation` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.interference.assessment` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.rampup.estimatedPolicy` | PROGRAMMING_HEURISTIC |
| PROVISIONAL_VALUE | `strength.selection.repetitionPolicy` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.session.stimulusPreservation` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.tracks.horizon` | EXPERT_DESIGN_REVIEW |
| PROVISIONAL_VALUE | `strength.session.durationPriority` | PRODUCT_GUARDRAIL |
| SOURCE_NOT_FULL_TEXT | `SRC.CURRIER_2026_ACSM` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.LOPEZ_2021` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.ROBINSON_2024` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.REFALO_2023` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.PELLAND_2026` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.SINGER_2024` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.HALPERIN_2022` | SEARCH_SUMMARY |
| SOURCE_IDENTITY_PARTIAL | `SRC.HALPERIN_2022` | identité partiellement vérifiée |
| SOURCE_NOT_FULL_TEXT | `SRC.WILSON_2012` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.LUNDBERG_2022` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.KASSIANO_2022` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.GRGIC_2020` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.HICKMOTT_2022` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.AUTOREG_NMA_2025` | SEARCH_SUMMARY |
| SOURCE_IDENTITY_PARTIAL | `SRC.AUTOREG_NMA_2025` | identité partiellement vérifiée |
| SOURCE_NOT_FULL_TEXT | `SRC.MOESGAARD_2022` | SEARCH_SUMMARY |
| SOURCE_NOT_FULL_TEXT | `SRC.WARMUP_FORCE_MA` | SEARCH_SUMMARY |
| SOURCE_IDENTITY_PARTIAL | `SRC.WARMUP_FORCE_MA` | identité partiellement vérifiée |
