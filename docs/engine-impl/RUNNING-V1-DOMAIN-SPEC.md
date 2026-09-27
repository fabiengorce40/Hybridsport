# RUNNING-V1-DOMAIN-SPEC — spécification métier du futur RunningEngine

> **Phase 5A, documentation seulement.** *Corrections 5B intégrées : voir [`RUNNING-5B-SCIENTIFIC-ARBITRATION.md`](RUNNING-5B-SCIENTIFIC-ARBITRATION.md) (archétypes §J, charge §Q, progression §R).* Aucun code RunningEngine n’est créé. CORE, StrengthEngine, rulesets Strength, registre scientifique Strength, G1 Strength et CORE-EXT-5 sont inchangés.
>
> Documents associés :
> - [`RUNNING-V1-REFERENCE-MODEL.md`](RUNNING-V1-REFERENCE-MODEL.md) : références, confiance, cibles ;
> - [`RUNNING-V1-SESSION-TAXONOMY.md`](RUNNING-V1-SESSION-TAXONOMY.md) : archétypes, fractionné, easy, long run, haute intensité ;
> - [`RUNNING-V1-LOAD-PROGRESSION-SPEC.md`](RUNNING-V1-LOAD-PROGRESSION-SPEC.md) : TID, charge, sécurité, reprise, taper, progression, retours ;
> - [`RUNNING-V1-CONCURRENT-INTERFERENCE-SPEC.md`](RUNNING-V1-CONCURRENT-INTERFERENCE-SPEC.md) : entraînement concurrent, contrat avec le GlobalPlanner ;
> - [`RUNNING-EVIDENCE-REVIEW-PACK.md`](RUNNING-EVIDENCE-REVIEW-PACK.md) et [`RUNNING-SCIENCE-REGISTRY-DRAFT.md`](RUNNING-SCIENCE-REGISTRY-DRAFT.md) : preuves ;
> - [`RUNNING-V1-GOLDEN-SCENARIOS.md`](RUNNING-V1-GOLDEN-SCENARIOS.md) : R1–R12 ;
> - [`RUNNING-5A-REPORT.md`](RUNNING-5A-REPORT.md) : gate et rapport.

**Niveau de preuve.** Toutes les sources citées sont vérifiées au mieux au niveau **SEARCH_SUMMARY**. PubMed, E-utilities et EuropePMC sont bloqués depuis l’environnement ; aucun résumé ni texte intégral n’a été lu directement. Aucune affirmation de ce dossier ne repose sur un niveau supérieur.

---

## A. État du dépôt au début de la phase

| Élément | État |
|---|---|
| Branche | `claude/fitness-app-architecture-81fs92` |
| HEAD de départ | `386e414` (fin de la phase 4G), arbre propre |
| Tests | 630 verts (CORE 370, strength 260) |
| Typecheck, lint, architecture | verts |
| STRENGTH_ENGINE_V1_FINAL_TECHNICAL_LOCK | **LOCKED** |
| STRENGTH_SCIENTIFIC_LOCK_V1 | LOCKED_PROVISIONAL (inchangé) |
| RunningEngine | **NOT IMPLEMENTED** |

### A.1 Inventaire de l’existant lié à la course (lecture seule, rien n’est modifié)

Aucun paquet `packages/running` n’existe. Les points d’accroche présents dans le CORE et le domaine :

| Élément | Emplacement | Rôle actuel | Suffisant pour Running V1 ? |
|---|---|---|---|
| `DISCIPLINES` contient `running` | `packages/domain` | Discipline déclarable | Oui |
| `BLOCK_KINDS` contient `running` | `packages/domain` | Type de bloc de séance | Oui |
| Prescription `distance` `{distanceM, paceSecPerKm?: {min, max}}` | `packages/domain/src/session.ts` | Course continue à la distance | Partiel : l’allure est déjà une plage, mais il n’existe ni cible d’effort, ni cible de FC, ni domaine *(corrigé en 5B : la 5A indiquait à tort « une allure unique »)* |
| Prescription `timed` | idem | Effort à la durée | Partiel |
| Prescription `intervals` `{reps, work:{timeS}\|{distanceM}, recoveryS, paceSecPerKm?}` | idem | Fractionné simple | **Non** : pas de séries, ni de récupération entre séries, ni de mode de récupération, ni de plage de cible, ni de priorité de cible |
| Levier `reduce_run_volume` | CORE (leviers de durée) | Réduction de volume course | Oui (sémantique à préciser) |
| Couverture catalogue CC9 (exercices locomoteurs de course) | `packages/engine/src/catalog/coverage.ts` | Contrôle de catalogue | Oui |
| Contrat `SportEngine` (`parseContext`, `propose`, `checks`, `validateIntent` CORE-EXT-4) | `packages/engine` | Frontière moteur / CORE | Oui |

Les documents d’architecture (`docs/architecture/02`, `04`, `07`, `08`) décrivent déjà `RunActivity`, `RunLap`, `RunningExposure`, `runningContribution()`, `CapacityEstimate` (`vdot`, `critical_speed`) et `DailyLoad`. Plusieurs de leurs hypothèses sont revues en §AG.

### A.2 Extension CORE probablement nécessaire (documentée, non implémentée)

La prescription `intervals` du CORE ne peut pas porter la structure décrite en §J de la taxonomie. Running V1 nécessitera très probablement une extension **CORE-EXT-R1**, qui sera à ouvrir en RFC en phase 5B. Son contenu candidat :

- séance structurée : échauffement, préparation (gammes, lignes droites), bloc principal, retour au calme ;
- bloc de répétitions : nombre de répétitions, durée **ou** distance de travail, durée **ou** distance de récupération, mode de récupération (arrêt, marche, trot), nombre de séries, récupération entre séries ;
- cible sous forme de **plages** (`targetPaceRange`, `targetEffortRange`, `targetHRRange`), avec une **priorité** de cible explicite ;
- distinction entre durée de travail et durée de séance.

Cette extension n’est pas écrite en 5A. Elle ne modifie pas CORE-EXT-5.

---

## B. Principe fondateur : une chaîne de raisonnement, pas un calculateur d’allures

RunningEngine n’est pas un « calculateur d’allures + générateur de séances ». Chaque décision doit pouvoir être rattachée à un maillon de la chaîne suivante, et la trace doit le montrer.

| # | Maillon | Question traitée | Sortie | Propriétaire |
|---|---|---|---|---|
| 1 | ATHLETE | Qui est l’athlète (population, contraintes, disponibilité) ? | `RunningAthleteState` | Profil (CORE) |
| 2 | GOAL | Quel objectif, pour quand ? | `RunningGoal` | Utilisateur / GlobalPlanner |
| 3 | RUNNING HISTORY | Que court-il réellement, depuis quand, avec quelle régularité ? | `RunningLoadHistory` | Historique |
| 4 | REFERENCE MODEL | Quelles références de performance existent ? | `RunningReferenceSet` | RunningEngine |
| 5 | REFERENCE CONFIDENCE | Quelle confiance leur accorder, **pour quelle décision** ? | `RunningReferenceConfidence` | RunningEngine |
| 6 | CURRENT LOAD / TOLERANCE | Quelle charge est tolérée actuellement ? | `RunningLoadAssessment` | RunningEngine + état |
| 7 | PROGRAM PHASE | Où en est-on dans le programme ? | `RunningProgramPhase` | GlobalPlanner / RunningEngine |
| 8 | WEEK INTENT | Quelle intention pour la semaine (reçue du GlobalPlanner) ? | intention | GlobalPlanner |
| 9 | SESSION ARCHETYPE | Quel type de séance sert l’intention ? | `RunningSessionArchetype` | RunningEngine |
| 10 | SESSION STIMULUS | Quel stimulus principal et secondaire ? | stimulus | RunningEngine |
| 11 | INTENSITY DOMAIN | Dans quel domaine d’intensité ? | `RunningIntensityDomain` | RunningEngine |
| 12 | DURATION / DISTANCE | Quelle dose ? | durée ou distance | RunningEngine + DurationEngine |
| 13 | INTERVAL STRUCTURE | Quelle structure (si fractionné) ? | `RunningIntervalStructure` | RunningEngine |
| 14 | RECOVERY | Quelles récupérations intra- et inter-séances ? | récupérations, `recoveryDemand` | RunningEngine |
| 15 | CONCURRENT LOAD | Quelles autres charges pèsent (musculation, HYROX, cross-training) ? | contraintes de placement | InterferenceManager / GlobalPlanner |
| 16 | VALIDATION | La proposition est-elle valide ? | verdict | CORE (le moteur ne s’auto-valide jamais) |
| 17 | PROGRESSION / REPLAN | Que change-t-on ensuite ? | `RunningReplanContext` | ProgressionEngine / AdaptationEngine |

### B.1 Séparation du modèle de performance et de la prescription

| | PERFORMANCE MODEL | TRAINING PRESCRIPTION |
|---|---|---|
| Question | « Que peut courir l’athlète aujourd’hui ? » | « Que doit-il courir dans cette séance ? » |
| Entrées | références, observations | performance estimée, objectif, phase, charge, tolérance, contexte concurrent, confiance |
| Sortie | estimations avec incertitude (vitesse à une distance, CS, seuils…) | archétype, dose, structure, cibles en plage |
| Confiance | `REFERENCE_CONFIDENCE` | `RUNNING_PRESCRIPTION_CONFIDENCE` |

**Règle structurante (non négociable) : une estimation de performance ne devient jamais automatiquement une prescription.** Entre les deux, il faut toujours une décision de prescription explicite et tracée. Cette décision tient compte de la charge, de la phase, de la tolérance, de la confiance et de l’objectif. Exemple : un temps prédit au marathon n’implique ni une allure marathon à prescrire, ni une sortie longue à cette allure.

---

## C. Populations

### C.1 Définitions V1

La classification repose sur l’**historique observable** (régularité, volume récent, expérience de séances structurées, références disponibles), jamais sur l’âge ou le sexe. Les frontières entre populations sont des **paramètres de ruleset** (`PROGRAMMING_HEURISTIC`), sans valeur fixée en 5A.

| Population | Description | Hypothèses de travail | Référence de performance typique |
|---|---|---|---|
| **P-R0** | Débutant course, peu d’historique fiable | Tolérance mécanique inconnue ; pas de référence ; allure non prescriptible | Aucune. Effort perçu seulement. |
| **P-R1** | Coureur loisir débutant | Pratique récente et irrégulière ; séances structurées rares | Déclarée ou test simple ; confiance faible |
| **P-R2** | Coureur loisir entraîné | Pratique régulière ; quelques séances de qualité | Course ou test récent possible |
| **P-R3** | Coureur intermédiaire | Pratique régulière et structurée ; plusieurs distances courues | Plusieurs références possibles |
| **P-R4** | Coureur avancé non élite | Volume et fréquence élevés ; historique long ; compétitions régulières | Plusieurs références cohérentes et récentes |
| **P-HYBRID** | Course + musculation / HYROX / cross-training | La course partage la charge locomotrice avec d’autres disciplines | Variable ; la charge concurrente est une entrée obligatoire |

P-HYBRID n’est pas un niveau : c’est un **contexte** qui s’ajoute à un niveau de P-R0 à P-R4. Exemple : un athlète peut être P-R2 et P-HYBRID.

**Hors périmètre V1** : élite, grossesse et post-partum, pathologie déclarée, retour de blessure sous suivi médical, moins de 18 ans. Ces cas sont signalés comme situations hors périmètre (§R de la spec charge-progression).

### C.2 Ce que la littérature permet ou non d’extrapoler

| Axe | Ce qui est soutenu (niveau SEARCH_SUMMARY) | Conséquence V1 |
|---|---|---|
| Hommes / femmes | Méta-analyse concurrente (Huiberts 2024, 59 études, 1346 participants) : la force du bas du corps est atténuée chez les hommes, pas chez les femmes ; aucune différence de sexe sur la force du haut du corps, la puissance ou le VO2max. Rien n’a été trouvé qui justifie une correction d’allure ou de volume par sexe pour la course. | **Aucune correction démographique par sexe.** Le sexe peut être une variable de contexte pour l’interférence (spec concurrente), jamais un multiplicateur. |
| Débutants / entraînés | Oliveira 2024 : l’avantage du polarisé sur le VO2peak est surtout observé chez les athlètes très entraînés. Huiberts 2024 : les non-entraînés montrent un gain de VO2max plus faible en concurrent. Mujika & Padilla 2000 : désentraînement rapide chez les très entraînés. | La population module les **priorités** (TID, progression, reprise), pas une formule. Un résultat obtenu chez les très entraînés ne s’extrapole pas aux débutants. |
| Jeunes adultes / masters | Aucune source vérifiée en 5A ne fournit de correction d’âge pour la prescription de course. | **Aucune correction par âge.** Question ouverte (Q-BEG / Q-REC dans le review pack). L’âge peut apparaître comme contexte de revue experte seulement. |
| Spécialisés / hybrides | Huiberts 2024 : les effets du concurrent dépendent du sexe, du statut d’entraînement et de l’outcome. Blagrove 2018 : la musculation peut améliorer l’économie de course, avec une ampleur dépendant de la méthode. | Pas de règle universelle « course + musculation = mauvais ». L’interférence est évaluée au cas par cas par l’InterferenceManager (spec concurrente). |

---

## D. Objectifs

Objectifs V1 : `GENERAL_RUNNING`, `5K`, `10K`, `HALF_MARATHON`, `MARATHON`.

`HYBRID_RUNNING_SUPPORT` est prévu dans l’architecture seulement : c’est un objectif où la course **sert** une autre discipline (HYROX, cross-training). Son pilotage vient du GlobalPlanner, et il n’existe pas de moteur HYROX en V1.

Les descriptions ci-dessous sont **qualitatives et relatives**. Aucun pourcentage fixe n’est fixé en 5A. Les termes « plus », « moins » et « central » sont des hypothèses de travail (`EXPERT_DESIGN_REVIEW`), à confirmer en contre-audit.

| Dimension | GENERAL_RUNNING | 5K | 10K | HALF_MARATHON | MARATHON |
|---|---|---|---|---|---|
| Déterminants principaux (cadre classique : capacité aérobie maximale, fraction soutenable, économie) | Régularité, tolérance, capacité aérobie de base | Capacité aérobie maximale et tolérance au domaine sévère ; économie | Fraction soutenable proche de la frontière heavy/severe ; capacité aérobie maximale | Fraction soutenable dans le domaine heavy ; économie ; endurance | Endurance prolongée, économie, fraction soutenable plus basse, tolérance mécanique à la durée |
| Endurance / intensité (relatif) | Endurance dominante | Part d’intensité relativement la plus haute des objectifs V1 | Intermédiaire | Endurance plus marquée | Endurance la plus marquée |
| Spécificité | Faible | Travail au domaine sévère et proche de l’allure cible | Travail proche de la frontière heavy/severe | Travail dans le haut du domaine heavy et à l’allure cible | Durée, allure cible sur des portions prolongées |
| Long run | Optionnel, rôle de développement aérobie | Utile, rôle secondaire | Utile | Important | Central (durée, tolérance mécanique, spécificité) |
| Travail autour du seuil | Optionnel selon le niveau | Complémentaire | Central | Central | Important |
| Haute intensité | Faible, optionnel | Central | Important | Complémentaire | Complémentaire |
| Économie de course | Secondaire | Importante | Importante | Importante | Très importante (durée) |
| Besoin de taper | Nul | Existe | Existe | Existe | Existe (voir §T : amplitude selon contexte) |
| Importance du volume récent | Base de tolérance | Moyenne | Moyenne à forte | Forte | Très forte : historique long requis pour une confiance élevée |

**Points à contre-auditer** : aucune de ces cases ne provient d’une méta-analyse comparant des objectifs entre eux. Elles traduisent le cadre physiologique usuel et doivent être classées `EXPERT_DESIGN_REVIEW` dans le registre (voir `R-GOAL-PROFILE`).

---

## H. Modèle interne des domaines d’intensité

### H.1 Choix : modèle hybride, fondé sur les domaines physiologiques

Le moteur utilise en interne **trois domaines physiologiques** (moderate, heavy, severe), délimités par deux frontières, auxquels il ajoute **deux catégories d’usage** :

| Domaine interne | Définition physiologique | Frontière basse | Frontière haute | Remarque |
|---|---|---|---|---|
| `EASY_LOW` | Bas du domaine modéré | — | Plafond d’effort « easy » (voir taxonomie §M) | **Catégorie d’usage**, sous-ensemble de MODERATE : c’est une limite supérieure, pas une cible |
| `MODERATE` | Sous la première frontière (LT1 / VT1 / GET) | — | Frontière 1 | Domaine physiologique |
| `HEAVY` | Entre les deux frontières | Frontière 1 | Frontière 2 (état stable métabolique maximal ; CS/MLSS en sont des estimations) | Domaine physiologique |
| `THRESHOLD_LIKE` | Haut du domaine heavy, **au voisinage** de la frontière 2 | proche frontière 2 | frontière 2 | **Catégorie d’usage** : la frontière 2 n’est connue qu’avec incertitude (voir §O) |
| `SEVERE` | Au-dessus de la frontière 2 | Frontière 2 | Domaine extrême | Domaine physiologique ; VO2 tend vers le maximum si l’effort dure assez |
| `SPRINT_NEUROMUSCULAR` | Efforts très courts, maximal ou quasi maximal, à dominante neuromusculaire | — | — | **Catégorie d’usage** (lignes droites, sprints courts) ; mal décrite par les domaines métaboliques |

**Justification**

- Jamnick 2020 (SEARCH_SUMMARY) : il n’existe pas de cadre consensuel sur la validité des méthodes de prescription de l’intensité, et ces méthodes sont évaluées **par rapport aux domaines** moderate, heavy et severe. Le domaine est donc la référence physiologique la plus défendable.
- Un modèle « 5 zones » à pourcentages fixes n’a pas de fondement physiologique propre. PMID 40225831 (SEARCH_SUMMARY) : une zone « 2 » définie en % FCmax fixe présente de larges écarts individuels par rapport à VT1, avec un coefficient de variation de 6 à 29 %.
- Les catégories d’usage répondent à des besoins de prescription (plafond easy, travail « au seuil », lignes droites) sans créer de fausses frontières physiologiques.

### H.2 Interface utilisateur

L’interface peut afficher une échelle simplifiée : 5 niveaux, mots (« facile », « soutenu », « difficile »), couleurs `intensity.z1…z5` du design system. La correspondance entre l’échelle affichée et les domaines internes est une **table de présentation** (`TECHNICAL`). Elle n’est pas une loi physiologique.

### H.3 Interdits

- Pas de « zone 2 = X % FCmax » ni de « seuil = X % VMA » universels.
- Un domaine ne se déduit pas d’un seul pourcentage d’une seule référence. Il se déduit des références disponibles, avec leur confiance (voir le modèle de références).
- Sans référence suffisante, le domaine est prescrit par l’effort perçu (et la FC si elle est disponible et étalonnée), **jamais par une allure fabriquée**.

---

## O. Seuil : désambiguïsation

Le mot « seuil » recouvre des objets différents, que le moteur ne confond jamais.

| Terme | Nature | Mesure | Relation aux domaines | Usage dans le moteur |
|---|---|---|---|---|
| **LT1 / VT1 / GET** | Première frontière (lactate, ventilation, échanges gazeux) | Laboratoire ; estimations de terrain | Frontière moderate / heavy | Borne haute de MODERATE ; aide à fixer le plafond easy (avec d’autres signaux) |
| **LT2 / VT2 / RCP** | Seconde frontière, définie selon la méthode (plusieurs définitions de LT2 existent) | Laboratoire ; terrain | Proche de la frontière heavy / severe, sans être équivalent (Galán-Rioja 2020 : CP, MLSS, VT2 et RCP ne sont pas synonymes) | Estimation de la frontière 2 ; confiance selon la méthode |
| **MLSS** | Plus haute intensité avec lactatémie stable | Protocole de laboratoire en plusieurs jours | Estimation de la frontière 2 | Référence rare (LAB_THRESHOLD) |
| **CS (critical speed)** | Asymptote de la relation vitesse–durée | Plusieurs essais (voir modèle de références §G) | Jones 2019 : proposée comme meilleur indice de l’état stable métabolique maximal ; position débattue | Un signal parmi d’autres pour la frontière 2, jamais la vérité |
| **Allure 10K** | Performance de course | Course ou contre-la-montre | Pour beaucoup de coureurs, dans le domaine sévère ou à sa limite ; dépend de la durée de course, donc du niveau | Référence de performance et allure spécifique 10K ; **n’est pas** « le seuil » |
| **Allure semi-marathon** | Performance de course | Course | Généralement dans le domaine heavy ; dépend du niveau | Référence et allure spécifique semi ; **n’est pas** « le seuil » |
| **« Tempo »** | Terme de coaching, sans définition physiologique unique | — | Variable selon les sources | **Libellé d’interface uniquement.** Il correspond en interne à un archétype et à un domaine précis (STEADY_RUN, CONTINUOUS_THRESHOLD…) |

**Définition interne.** Le moteur appelle *threshold* la **frontière 2 estimée** (frontière heavy / severe). Il la représente comme une **plage d’incertitude**, construite à partir des références disponibles (CS, LAB_THRESHOLD, FIELD_THRESHOLD, performances), avec la méthode d’origine tracée. Les archétypes « seuil » (THRESHOLD_INTERVALS, CONTINUOUS_THRESHOLD) visent le domaine `THRESHOLD_LIKE`, c’est-à-dire **sous** ou **au voisinage** de cette plage. Leur marge exacte est un paramètre `EXPERT_DESIGN_REVIEW` à définir en 5B.

---

## V. Architecture de semaine : ce que RunningEngine produit

RunningEngine **reçoit une intention** du GlobalPlanner (objectif, phase, nombre de séances course, disponibilité, contraintes). Il ne décide pas seul du calendrier multisport. Il ne crée pas de second planner.

Pour chaque séance candidate, il produit une **demande de séance** :

| Champ | Contenu |
|---|---|
| `sessionType` | Archétype (taxonomie §I) |
| `priority` | `KEY` / `SUPPORT` / `OPTIONAL` : importance de la séance pour l’objectif de la semaine |
| `stimulus` | Stimulus principal et secondaire, domaine d’intensité |
| `estimatedDuration` | Durée de séance estimée (plage), distincte de la durée de travail |
| `estimatedLoad` | Charge estimée multidimensionnelle (spec charge §Q), pas un scalaire unique |
| `mechanicalDemand` | Exigence mécanique (ordinal : LOW / MODERATE / HIGH), déclarée par l’archétype et modulée par la dose |
| `recoveryDemand` | Besoin de récupération avant la prochaine séance exigeante (ordinal) |
| `placementConstraints` | Contraintes **déclaratives** : « pas la veille d’une séance KEY de même dimension », « préférer le jour le plus long », « pas après une séance de jambes lourde », etc. Aucune durée d’espacement fixe inventée ; les valeurs sont des paramètres du GlobalPlanner. |

**Le GlobalPlanner décide du placement final.** S’il ne peut pas placer une séance, il renvoie un refus motivé, et RunningEngine propose une alternative (archétype de moindre demande, séance plus courte) ou accepte la suppression d’une séance `OPTIONAL`.

---

## W. Phases de programme

Phases représentables : `FOUNDATION`, `DEVELOPMENT`, `SPECIFIC`, `PEAK`, `TAPER`, `RECOVERY`, `RETURN`.

**Principe.** Une phase modifie les **priorités** (quels stimulus, quels archétypes éligibles, quelle variable progresse, quelles contraintes de sécurité dominent). Elle n’applique pas de multiplicateur arbitraire au volume ou à l’intensité. La périodisation traditionnelle n’est pas imposée : un programme `GENERAL_RUNNING` peut rester en FOUNDATION / DEVELOPMENT sans jamais atteindre SPECIFIC.

| Phase | Priorité dominante | Archétypes favorisés | Variable progressable dominante (candidate) | Statut |
|---|---|---|---|---|
| FOUNDATION | Régularité, tolérance, base aérobie | EASY_RUN, LONG_RUN (court), STRIDES | Fréquence, puis durée hebdomadaire | EXPERT_DESIGN_REVIEW |
| DEVELOPMENT | Capacités générales (seuil, aérobie maximale) | + THRESHOLD_*, VO2_INTERVALS, HILL_REPETITIONS | Volume de travail de qualité | EXPERT_DESIGN_REVIEW |
| SPECIFIC | Spécificité de l’objectif | RACE_PACE_SESSION, LONG_RUN spécifique | Spécificité | EXPERT_DESIGN_REVIEW |
| PEAK | Consolidation, fraîcheur relative | Séances spécifiques courtes | — (pas de progression de charge) | EXPERT_DESIGN_REVIEW |
| TAPER | Réduction de volume, maintien d’intensité et de fréquence | Séances courtes de rappel | Volume à la baisse (§T) | Principe SUPPORTED ; amplitude SUPPORTED_WITH_RANGE / CONTEXT_DEPENDENT |
| RECOVERY | Récupération après course ou bloc | RECOVERY_RUN, EASY_RUN | — | PROGRAMMING_HEURISTIC |
| RETURN | Reprise après interruption | EASY_RUN, TEST_SESSION différé | Fréquence, puis durée | PROGRAMMING_HEURISTIC + G1 candidat |

La durée des phases et leur enchaînement sont des paramètres de ruleset, sans valeur fixée en 5A.

---

## AE. Types de domaine (spécification, sans TypeScript)

| Objet | Rôle | Champs principaux (conceptuels) |
|---|---|---|
| `RunningReference` | Une référence de performance ou de physiologie | type, value, unit, distance, duration, date, protocol, source, specificity, reliability, confidence, conditions (voir le modèle de références §E) |
| `RunningReferenceSet` | Ensemble des références d’un athlète | références, conflits détectés, dernière mise à jour |
| `RunningReferenceConfidence` | Confiance dans une référence **pour une décision donnée** | niveau LOW / MEDIUM / HIGH, décision visée, raisons (récence, spécificité, protocole, accord) |
| `RunningPrescriptionConfidence` | Confiance dans une prescription | niveau LOW / MEDIUM / HIGH, facteurs limitants, conséquence (plages élargies, effort prioritaire, test proposé) |
| `RunningGoal` | Objectif | type (GENERAL_RUNNING…MARATHON, HYBRID_RUNNING_SUPPORT), date cible éventuelle, performance visée éventuelle (non utilisée comme référence) |
| `RunningAthleteState` | État courant | population, contexte hybride, disponibilité, readiness / tolérance déclarées, statut de reprise |
| `RunningLoadHistory` | Historique | activités (manuelles ou importées), fréquence, durées, distances, séances de qualité, long runs, interruptions |
| `RunningSessionArchetype` | Type de séance | voir taxonomie §I |
| `RunningIntensityDomain` | Domaine interne | EASY_LOW, MODERATE, HEAVY, THRESHOLD_LIKE, SEVERE, SPRINT_NEUROMUSCULAR |
| `RunningIntervalStructure` | Structure d’une séance fractionnée | voir taxonomie §J |
| `RunningTarget` | Cible d’intensité | `targetPaceRange?`, `targetEffortRange?`, `targetHRRange?`, priorité, raison de la priorité |
| `RunningProgramPhase` | Phase | FOUNDATION … RETURN, priorités de la phase |
| `RunningLoadAssessment` | Évaluation du changement de charge | voir spec charge §Q (LOAD CHANGE ASSESSMENT) |
| `RunningFeedback` | Retour post-séance | voir spec charge §Y |
| `RunningReplanContext` | Contexte de replanification | cas (MISSED_ONE_SESSION…POST_RACE_RECOVERY), séances concernées, contraintes, décision minimale |
| `RunningSessionRequest` | Demande de séance au GlobalPlanner | voir §V |
| `RunningPerformanceEstimate` | Sortie du modèle de performance | grandeur estimée, plage, références sources, méthode ; **jamais** consommée directement comme cible |

---

## AF. Non-objectifs V1

| Hors V1 | Raison |
|---|---|
| Suivi GPS natif | Le moteur doit fonctionner en saisie manuelle ; l’import éventuel est un sujet produit distinct |
| Coaching d’allure en direct | Hors périmètre de la génération de programme |
| API météo | Le modèle de cible prévoit la priorité à l’effort (§K du modèle de références), sans données météo |
| Correction d’altitude | Aucune source vérifiée ; hors V1 |
| Détection automatique du terrain | Hors V1 ; le terrain peut être déclaré |
| Biomécanique avancée | Hors V1 |
| Diagnostic médical ou de blessure | Hors périmètre produit ; le moteur signale et réoriente |
| Recommandation de chaussures | Hors périmètre |
| Prédiction de performance par apprentissage automatique | Hors V1 ; le modèle de performance reste explicable et tracé |
| Moteur HYROX | Architecture prévue (`HYBRID_RUNNING_SUPPORT`), pas de moteur |
| Trail, ultra, piste de demi-fond (800 m – 1500 m) | Hors objectifs V1 |
| Estimation automatique de VO2max par la FC au repos ou par montre | Fiabilité non établie dans ce dossier |

---

## AG. Divergences avec les documents d’architecture existants

Les documents `docs/architecture/*` sont antérieurs à cette revue. Leurs hypothèses ci-dessous sont **requalifiées** ; elles restent à corriger dans ces documents après contre-audit (hors 5A, qui ne crée que la documentation 5A).

| Hypothèse existante | Emplacement | Requalification 5A |
|---|---|---|
| « Zones d’intensité (5 zones) » | `04-moteur-entrainement.md` l. 245 | Modèle interne hybride à trois domaines (§H) ; 5 niveaux possibles **à l’affichage** seulement |
| « Répartition majoritairement facile (type 80/20) » | `04` l. 246 | TID `CONTEXT_DEPENDENT` (spec charge §L) ; « 80/20 » n’est pas codé |
| « Sortie longue (part du volume hebdo plafonnée) » | `04` l. 247 ; `07-progression.md` l. 41 | Aucune part fixe (taxonomie §N) ; une éventuelle borne est un `PRODUCT_GUARDRAIL` à valider, pas une règle physiologique |
| « Modèle type VDOT/Daniels ou vitesse critique » | `04` l. 244 ; `07` l. 15 | Le modèle de performance est **multi-référence** ; ni VDOT ni CS n’est la vérité ; le choix du modèle d’équivalence entre distances est `EXPERT_DESIGN_REVIEW` (Q-REF) |
| « ≥ 24 h entre jambes lourdes et séance course clé » (contrainte dure) | `04` l. 192 | Aucune durée universelle (spec concurrente §U) ; l’espacement est une contrainte de placement de l’InterferenceManager, avec une valeur `PROGRAMMING_HEURISTIC` à signer |
| « Hausse hebdo bornée ET ratio aigu/chronique locomoteur sous un seuil » (contrainte dure) | `04` l. 195 ; `04` l. 84 (ACWR) | Remplacé par LOAD CHANGE ASSESSMENT (spec charge §Q) ; ACWR non utilisé comme prédicteur de blessure (Impellizzeri 2020) ; pas de règle des 10 % |
| « Allures : mise à jour prudente (hausse plafonnée par cycle) » | `07` l. 15, l. 67 | Conservé comme principe produit (`PRODUCT_GUARDRAIL`), sans valeur fixée ; *(5B, correction B1)* une hausse **substantielle** d’une référence exige une nouvelle preuve suffisamment fiable : compétition, test standardisé, contre-la-montre ou plusieurs observations d’entraînement cohérentes (arbitrage 5B §F.4) |
| « Semaine de décharge toutes les 3–4 semaines » | `07` l. 38 | `PROGRAMMING_HEURISTIC`, sans preuve vérifiée en 5A ; déclenchement préférablement conditionnel (charge, retours) — question Q-PROG |
| « Sans référence : effort perçu + test planifié en semaine 1–2 » | `04` l. 244 | Conservé et renforcé : aucune allure fabriquée ; le test n’est proposé que si la tolérance le permet (P-R0 : pas de test maximal d’emblée) |
