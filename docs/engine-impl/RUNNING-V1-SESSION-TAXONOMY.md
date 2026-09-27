# RUNNING-V1-SESSION-TAXONOMY — archétypes de séance et structure

> **Phase 5A, spécification seulement** (aucun code). Sections couvertes : I (archétypes), J (fractionné), M (easy), N (long run), P (haute intensité). Les domaines d’intensité sont ceux de [`RUNNING-V1-DOMAIN-SPEC.md`](RUNNING-V1-DOMAIN-SPEC.md) §H. **Aucune durée, distance ni allure universelle n’est donnée** : toutes les doses seront des paramètres de ruleset avec statut et provenance.
>
> **Arbitrage 5B** ([`RUNNING-5B-SCIENTIFIC-ARBITRATION.md`](RUNNING-5B-SCIENTIFIC-ARBITRATION.md) §J–§N) :
> - RECOVERY_RUN est fusionné dans EASY_RUN (variante `LOW_DOSE_RECOVERY`) ;
> - THRESHOLD_INTERVALS et CONTINUOUS_THRESHOLD sont fusionnés en THRESHOLD (`structureMode` CONTINUOUS ou INTERVALS ; coût dérivé de la structure) ;
> - STRIDES devient un module ;
> - PROGRESSION_RUN est conservé comme PROGRAMMING_HEURISTIC.
>
> Les fiches ci-dessous restent la trace 5A.

**Conventions**

- Exigences (ordinales) : LOW, MODERATE, HIGH.
  - `mechanicalDemand` : contrainte tissulaire et articulaire (impact, vitesse, pente descendante, durée cumulée).
  - `locomotorDemand` : charge sur la chaîne locomotrice, partagée avec la musculation des jambes, l’HYROX et le cross-training.
  - `recoveryDemand` : besoin de récupération avant une nouvelle séance exigeante.
- Niveaux éligibles : populations P-R0 à P-R4 (domain spec §C).
- Les valeurs d’exigence sont des **hypothèses de conception** (`EXPERT_DESIGN_REVIEW`). La dose réelle module l’exigence : une sortie longue courte est moins exigeante qu’une longue.

---

## I. Archétypes V1

### I.1 Vue d’ensemble

| Archétype | Stimulus principal | Domaine | Méca. | Locom. | Récup. | Niveaux |
|---|---|---|---|---|---|---|
| EASY_RUN | Développement aérobie, volume toléré | EASY_LOW (plafond) | LOW–MOD | MOD | LOW | P-R0 à P-R4 |
| RECOVERY_RUN | Maintien de fréquence, faible coût | EASY_LOW (plafond bas) | LOW | LOW | LOW | P-R2 à P-R4 |
| LONG_RUN | Endurance prolongée, tolérance à la durée | MODERATE (± portions spécifiques) | MOD–HIGH | HIGH | MOD–HIGH | P-R1 à P-R4 |
| STEADY_RUN | Endurance soutenue | haut MODERATE / bas HEAVY | MOD | MOD | MOD | P-R2 à P-R4 |
| THRESHOLD_INTERVALS | Travail près de la frontière 2, fractionné | THRESHOLD_LIKE | MOD | MOD | MOD–HIGH | P-R2 à P-R4 |
| CONTINUOUS_THRESHOLD | Travail près de la frontière 2, continu | THRESHOLD_LIKE (ou juste sous) | MOD | MOD | MOD–HIGH | P-R3 à P-R4 |
| VO2_INTERVALS | Capacité aérobie maximale | SEVERE | MOD–HIGH | HIGH | HIGH | P-R2 à P-R4 |
| SHORT_INTERVALS | Travail sévère intermittent court | SEVERE (intermittent) | MOD–HIGH | MOD–HIGH | MOD–HIGH | P-R2 à P-R4 |
| STRIDES | Qualité neuromusculaire, économie | SPRINT_NEUROMUSCULAR (sous-maximal) | LOW–MOD | LOW | LOW | P-R1 à P-R4 |
| HILL_REPETITIONS | Force spécifique, puissance, aérobie selon la durée | SEVERE ou SPRINT_NEUROMUSCULAR selon la durée | MOD (montée) ; HIGH si descente rapide | HIGH | MOD–HIGH | P-R2 à P-R4 |
| RACE_PACE_SESSION | Spécificité de l’objectif | Selon l’objectif (SEVERE pour 5K… MODERATE / HEAVY pour marathon) | Selon l’objectif | MOD–HIGH | MOD–HIGH | P-R2 à P-R4 avec objectif de course |
| PROGRESSION_RUN | Transition d’intensité dans une séance | MODERATE → HEAVY (voire THRESHOLD_LIKE) | MOD | MOD | MOD | P-R2 à P-R4 |
| TEST_SESSION | Mesure d’une référence | Maximal ou sous-maximal selon le protocole | Selon le protocole | MOD–HIGH | HIGH si maximal | P-R1 à P-R4 (maximal : jamais P-R0 d’emblée) |

### I.2 Fiches détaillées

#### EASY_RUN
- **primaryStimulus** : développement aérobie ; volume et régularité.
- **secondaryStimulus** : tolérance mécanique, récupération active relative.
- **intensityDomain** : EASY_LOW, défini comme **plafond** (§M).
- **typicalStructure** : continu ; lignes droites facultatives en fin de séance (STRIDES comme bloc secondaire).
- **eligibleGoals** : tous.
- **eligibleLevels** : P-R0 à P-R4. Pour P-R0, une alternance course / marche est possible (bloc intermittent à faible intensité, représentable par la structure §J).
- **fatigueProfile** : faible par séance, cumulatif en volume.
- **mechanicalDemand** : LOW à MODERATE selon la durée ; **locomotorDemand** : MODERATE ; **recoveryDemand** : LOW.
- **progressionVariables** : durée, fréquence (dans la semaine).
- **contraindications / limites** : aucune spécifique. Une douleur déclarée déclenche la gouvernance de sécurité (spec charge §R).

#### RECOVERY_RUN
- **primaryStimulus** : maintien de la fréquence à coût minimal.
- **secondaryStimulus** : aucun visé.
- **intensityDomain** : EASY_LOW, plafond plus bas que l’EASY_RUN.
- **typicalStructure** : continu, court.
- **eligibleGoals** : tous ; surtout utile en fréquence élevée.
- **eligibleLevels** : P-R2 à P-R4. Pour P-R0 et P-R1, un jour de repos est préféré (hypothèse `EXPERT_DESIGN_REVIEW`).
- **fatigueProfile** : très faible.
- **mechanicalDemand** : LOW ; **locomotorDemand** : LOW ; **recoveryDemand** : LOW.
- **progressionVariables** : aucune (n’est pas un levier de progression).
- **contraindications / limites** : la séance est retirée si le repos complet est préférable (readiness basse, douleur).

#### LONG_RUN
- **primaryStimulus** : endurance prolongée ; tolérance mécanique et métabolique à la durée.
- **secondaryStimulus** : spécificité de l’objectif (portions à allure cible en SPECIFIC, pour semi et marathon).
- **intensityDomain** : MODERATE par défaut ; portions HEAVY ou à allure spécifique selon la phase.
- **typicalStructure** : continu ; variantes avec fin progressive ou blocs spécifiques.
- **eligibleGoals** : tous ; central pour MARATHON et HALF_MARATHON.
- **eligibleLevels** : P-R1 à P-R4 (P-R0 : pas de sortie « longue » distincte avant une base de régularité ; hypothèse).
- **fatigueProfile** : élevé en fin de séance ; fatigue mécanique retardée.
- **mechanicalDemand** : MODERATE à HIGH ; **locomotorDemand** : HIGH ; **recoveryDemand** : MODERATE à HIGH.
- **progressionVariables** : durée (préférée à la distance), part spécifique.
- **contraindications / limites** : voir §N ; pas le lendemain d’une séance de jambes lourde sans décision de l’InterferenceManager.

#### STEADY_RUN
- **primaryStimulus** : endurance soutenue, au-dessus de l’easy.
- **secondaryStimulus** : allure spécifique marathon (pour certains niveaux).
- **intensityDomain** : haut MODERATE / bas HEAVY. La frontière 1 est connue avec incertitude, d’où une plage.
- **typicalStructure** : continu, précédé d’un échauffement.
- **eligibleGoals** : HALF_MARATHON, MARATHON, GENERAL_RUNNING (P-R3 et plus).
- **eligibleLevels** : P-R2 à P-R4.
- **fatigueProfile** : modéré.
- **mechanicalDemand** : MODERATE ; **locomotorDemand** : MODERATE ; **recoveryDemand** : MODERATE.
- **progressionVariables** : durée du bloc soutenu.
- **contraindications / limites** : ne pas le compter comme séance « facile » dans la distribution d’intensité.

#### THRESHOLD_INTERVALS
- **primaryStimulus** : développement de la fraction soutenable, près de la frontière 2.
- **secondaryStimulus** : spécificité 10K et semi.
- **intensityDomain** : THRESHOLD_LIKE (sous ou au voisinage de la plage de frontière 2 ; domain spec §O).
- **typicalStructure** : échauffement ; répétitions moyennes à longues avec récupérations courtes relativement au travail ; retour au calme.
- **eligibleGoals** : 5K, 10K, HALF_MARATHON, MARATHON, GENERAL_RUNNING (P-R3 et plus).
- **eligibleLevels** : P-R2 à P-R4.
- **fatigueProfile** : modéré à élevé, surtout métabolique.
- **mechanicalDemand** : MODERATE ; **locomotorDemand** : MODERATE ; **recoveryDemand** : MODERATE à HIGH.
- **progressionVariables** : volume de travail total, durée des répétitions, puis réduction des récupérations (une seule variable à la fois, spec charge §X).
- **contraindications / limites** : exige une référence (ou un effort bien étalonné) pour la frontière 2 ; si la confiance est LOW, la cible est l’effort et la séance est « près du seuil par effort ».

#### CONTINUOUS_THRESHOLD
- **primaryStimulus** : comme THRESHOLD_INTERVALS, en continu.
- **secondaryStimulus** : spécificité semi.
- **intensityDomain** : THRESHOLD_LIKE ou juste sous.
- **typicalStructure** : échauffement ; bloc continu ; retour au calme.
- **eligibleGoals** : 10K, HALF_MARATHON, MARATHON.
- **eligibleLevels** : P-R3 à P-R4 ; pour P-R2, la version fractionnée est préférée (hypothèse `EXPERT_DESIGN_REVIEW`).
- **fatigueProfile** : modéré à élevé.
- **mechanicalDemand** : MODERATE ; **locomotorDemand** : MODERATE ; **recoveryDemand** : MODERATE à HIGH.
- **progressionVariables** : durée du bloc.
- **contraindications / limites** : risque de glisser dans le domaine sévère si la référence est surestimée ; la priorité EFFORT est donc préférable en confiance MEDIUM ou LOW.

#### VO2_INTERVALS
- **primaryStimulus** : capacité aérobie maximale (temps passé près de VO2max).
- **secondaryStimulus** : tolérance au domaine sévère ; spécificité 5K.
- **intensityDomain** : SEVERE.
- **typicalStructure** : échauffement complet ; répétitions de durée intermédiaire ; récupérations actives ou passives ; retour au calme.
- **eligibleGoals** : 5K, 10K ; complémentaire pour HALF_MARATHON et MARATHON.
- **eligibleLevels** : P-R2 à P-R4.
- **fatigueProfile** : élevé.
- **mechanicalDemand** : MODERATE à HIGH ; **locomotorDemand** : HIGH ; **recoveryDemand** : HIGH.
- **progressionVariables** : nombre de répétitions (volume de travail), durée des répétitions.
- **contraindications / limites** : pas en RETURN tant que la base n’est pas rétablie ; pas deux jours de suite ; pas empilée pour « rattraper » (spec charge §S).

#### SHORT_INTERVALS
- **primaryStimulus** : travail sévère intermittent court (répétitions brèves, récupérations brèves).
- **secondaryStimulus** : vitesse, économie à allure rapide.
- **intensityDomain** : SEVERE (intermittent).
- **typicalStructure** : séries de répétitions courtes avec récupérations courtes ; récupération entre séries.
- **eligibleGoals** : 5K, 10K, GENERAL_RUNNING (P-R2 et plus).
- **eligibleLevels** : P-R2 à P-R4.
- **fatigueProfile** : modéré à élevé.
- **mechanicalDemand** : MODERATE à HIGH (vitesse) ; **locomotorDemand** : MODERATE à HIGH ; **recoveryDemand** : MODERATE à HIGH.
- **progressionVariables** : nombre de répétitions, nombre de séries.
- **contraindications / limites** : vitesse élevée ⇒ exigence mécanique ; prudence en reprise.

#### STRIDES
- **primaryStimulus** : qualité neuromusculaire, relâchement, économie.
- **secondaryStimulus** : préparation à une séance rapide.
- **intensityDomain** : SPRINT_NEUROMUSCULAR (vite mais **sous-maximal**, relâché).
- **typicalStructure** : quelques accélérations courtes avec récupération complète, en fin d’EASY_RUN ou dans l’échauffement. Généralement un **bloc**, pas une séance entière.
- **eligibleGoals** : tous.
- **eligibleLevels** : P-R1 à P-R4 ; pour P-R0, après une base de régularité (hypothèse).
- **fatigueProfile** : faible.
- **mechanicalDemand** : LOW à MODERATE ; **locomotorDemand** : LOW ; **recoveryDemand** : LOW.
- **progressionVariables** : nombre de répétitions (limité).
- **contraindications / limites** : récupération complète entre les répétitions ; qualité avant quantité.

#### HILL_REPETITIONS
- **primaryStimulus** : dépend de la durée des répétitions. Courtes : force spécifique et puissance (neuromusculaire). Plus longues : aérobie sévère.
- **secondaryStimulus** : économie (hypothèse), moindre vitesse à intensité égale.
- **intensityDomain** : SPRINT_NEUROMUSCULAR (courtes) ou SEVERE (longues).
- **typicalStructure** : montée à l’effort ; récupération en descente au trot ou à la marche.
- **eligibleGoals** : tous, P-R2 et plus.
- **eligibleLevels** : P-R2 à P-R4.
- **fatigueProfile** : modéré à élevé.
- **mechanicalDemand** : MODERATE en montée ; la descente rapide ajoute une charge excentrique ; **locomotorDemand** : HIGH (chaîne postérieure, mollets) ; **recoveryDemand** : MODERATE à HIGH.
- **progressionVariables** : nombre de répétitions, durée des répétitions.
- **contraindications / limites** : cible EFFORT obligatoire (K.2) ; interaction forte avec la musculation des jambes (spec concurrente) ; dépend de la disponibilité d’une côte (contexte déclaré).

#### RACE_PACE_SESSION
- **primaryStimulus** : spécificité de l’allure objectif.
- **secondaryStimulus** : confiance, gestion d’allure.
- **intensityDomain** : dérivé de l’objectif (SEVERE pour 5K, frontière heavy / severe pour 10K, HEAVY pour semi, MODERATE / HEAVY pour marathon ; dépend du niveau).
- **typicalStructure** : blocs à l’allure cible, fractionnés ou continus, intégrés éventuellement au LONG_RUN (semi, marathon).
- **eligibleGoals** : 5K, 10K, HALF_MARATHON, MARATHON.
- **eligibleLevels** : P-R2 à P-R4.
- **fatigueProfile** : selon l’objectif.
- **mechanicalDemand** : selon l’objectif ; **locomotorDemand** : MODERATE à HIGH ; **recoveryDemand** : MODERATE à HIGH.
- **progressionVariables** : durée totale à l’allure spécifique, puis continuité (moins de récupération).
- **contraindications / limites** : l’allure cible vient de la **performance visée validée par une référence**, pas d’un souhait ; sans référence fiable, elle est remplacée par un effort spécifique (Règle 1 du modèle de références). **L’allure objectif n’est pas une référence de performance.**

#### PROGRESSION_RUN
- **primaryStimulus** : transition d’intensité ; endurance soutenue sous fatigue relative.
- **secondaryStimulus** : spécificité (fin à allure cible).
- **intensityDomain** : MODERATE → HEAVY (fin éventuellement THRESHOLD_LIKE).
- **typicalStructure** : continu, par paliers de plus en plus soutenus.
- **eligibleGoals** : 10K, HALF_MARATHON, MARATHON, GENERAL_RUNNING (P-R3 et plus).
- **eligibleLevels** : P-R2 à P-R4.
- **fatigueProfile** : modéré.
- **mechanicalDemand** : MODERATE ; **locomotorDemand** : MODERATE ; **recoveryDemand** : MODERATE.
- **progressionVariables** : durée de la partie soutenue.
- **contraindications / limites** : compte comme une séance de qualité (pas « facile »).

#### TEST_SESSION
- **primaryStimulus** : aucun visé ; c’est une **mesure** (référence).
- **secondaryStimulus** : stimulus de la séance selon le protocole (maximal ⇒ proche d’une séance VO2 / course).
- **intensityDomain** : maximal (contre-la-montre, essais CS) ou sous-maximal (test d’effort étalonné).
- **typicalStructure** : échauffement standardisé ; protocole déclaré (modèle de références §E, §G) ; retour au calme.
- **eligibleGoals** : tous.
- **eligibleLevels** : P-R1 à P-R4 pour un test maximal ; P-R0 : pas de test maximal d’emblée, d’abord des séances à l’effort (`PRODUCT_GUARDRAIL`, G1 candidat).
- **fatigueProfile** : élevé si maximal.
- **mechanicalDemand** : selon le protocole ; **locomotorDemand** : MODERATE à HIGH ; **recoveryDemand** : HIGH si maximal.
- **progressionVariables** : aucune.
- **contraindications / limites** : pas en RETURN précoce ; pas la veille ou le lendemain d’une séance KEY ; remplace une séance de qualité, ne s’ajoute pas.

### I.3 Hors taxonomie V1
Fartlek libre (représentable comme PROGRESSION_RUN ou SHORT_INTERVALS par effort), trail, séances de piste de demi-fond, doubles séances quotidiennes (P-R4 élite, hors V1).

---

## J. Structure d’une séance fractionnée

### J.1 Modèle conceptuel

Une séance fractionnée n’est pas stockée comme « 6 × 800 m ». Structure :

```
Session
├─ warmup                  durée (ou distance) + domaine (EASY_LOW)
├─ preparation?            gammes / lignes droites (STRIDES) si pertinent
├─ mainSet[]               1..n blocs
│   └─ Block
│       ├─ sets            nombre de séries (≥ 1)
│       ├─ repetitions     nombre de répétitions par série
│       ├─ rep             repDuration OU repDistance (exclusifs)
│       ├─ target          RunningTarget (plages + priorité, modèle de références §K)
│       ├─ targetIntensity RunningIntensityDomain
│       ├─ recovery        recoveryDuration OU recoveryDistance (exclusifs)
│       ├─ recoveryMode    STANDING | WALK | JOG
│       └─ betweenSetRecovery  durée + mode (si sets > 1)
├─ strides/drills?         si pertinent (en fin de séance)
└─ cooldown                durée (ou distance) + domaine (EASY_LOW)
```

Exclusivités :
- `repDuration` XOR `repDistance` ;
- `recoveryDuration` XOR `recoveryDistance`.

Une répétition « à la distance » avec une plage d’allure donne une durée **estimée** (plage). Une répétition « à la durée » donne une distance estimée. Le choix durée / distance est une décision de prescription : la durée est préférable quand la priorité est EFFORT ou que la référence est incertaine (hypothèse `EXPERT_DESIGN_REVIEW`).

### J.2 Durée de travail et durée de séance

| Grandeur | Définition | Usage |
|---|---|---|
| **WORK DURATION** | Somme des durées de répétition dans le domaine visé | Dose du stimulus, progression, distribution d’intensité (temps dans le domaine) |
| **SESSION DURATION** | Échauffement + préparation + travail + récupérations + retour au calme | Placement dans la journée (GlobalPlanner, DurationEngine), `estimatedDuration` |

Le levier CORE `reduce_run_volume` doit préciser sur quoi il agit : réduire **d’abord** l’échauffement et le retour au calme au-dessus d’un plancher, **puis** le travail. Ce point est à trancher en 5B, avec un plancher d’échauffement en `PRODUCT_GUARDRAIL`. Ainsi, une contrainte de temps ne supprime pas silencieusement le stimulus principal (même esprit que la préservation du stimulus en Strength).

### J.3 Compatibilité CORE
Voir la domain spec §A.2 : la prescription `intervals` actuelle ne porte ni séries, ni récupération entre séries, ni mode de récupération, ni plages, ni priorité. D’où l’extension CORE-EXT-R1, à proposer en 5B.

---

## M. Easy run : définition

### M.1 Définition
« Easy » est un **plafond d’intensité** dans le domaine modéré : la séance ne doit pas dépasser une intensité donnée. Ce n’est pas une allure fixe à atteindre. Courir plus lentement que la borne n’est pas un échec.

### M.2 Signaux (plusieurs, le plus conservateur l’emporte)

| Signal | Rôle | Remarque |
|---|---|---|
| RPE | Toujours disponible ; plafond d’effort perçu | Ancrage verbal : « conversation possible » |
| Test de la parole (talk test) | Plafond qualitatif | Reed & Pipe (SEARCH_SUMMARY) : parole confortable sous VT/LT ; preuve surtout en populations cardiaques (PMID 39076925) ⇒ **CONTEXT_DEPENDENT** pour des coureurs sains |
| FC | Plafond si une référence FC individuelle existe | Pas de « zone 2 = X % FCmax » (PMID 40225831 : forte variabilité individuelle) |
| Allure | Borne **indicative** dérivée des références | Jamais la seule borne ; dégradée par le contexte (chaleur, dénivelé, fatigue) |
| Relation aux références | Le plafond easy est placé sous la frontière 1 estimée, avec marge (paramètre `EXPERT_DESIGN_REVIEW`) | La frontière 1 est rarement mesurée ; incertitude élevée |

**Règle** : quand plusieurs signaux sont disponibles et divergent, le plafond effectif est le **plus bas** (le plus conservateur). C’est un principe `PROGRAMMING_HEURISTIC`.

### M.3 Intérêt de la limite supérieure
- Robuste à l’incertitude de la référence et aux conditions.
- Évite de transformer l’easy en séance modérément dure, un risque souvent évoqué dans le coaching mais **non chiffré** par les sources vérifiées en 5A (question Q-EASY).

---

## N. Long run

| Aspect | Spécification |
|---|---|
| Rôle | Endurance prolongée, tolérance à la durée ; spécificité pour semi et marathon |
| Progression | Par **durée** en priorité (robuste à l’allure incertaine) ; variable dominante distincte de la durée hebdomadaire (spec charge §X) |
| Durée / distance | Paramètres par objectif et niveau, statut `PROGRAMMING_HEURISTIC` ; **aucune valeur universelle** en 5A |
| Relation au volume hebdomadaire | **Pas de part fixe** (« long run = X % du kilométrage hebdo » n’est pas retenu). Le long run est évalué dans la LOAD CHANGE ASSESSMENT comme une dimension à part (`long-run change`). Une éventuelle borne relative au volume est un `PRODUCT_GUARDRAIL` à signer (G1 candidat `R-G1-LONGRUN-BOUND`), pas une vérité physiologique. |
| Spécificité selon l’objectif | GENERAL, 5K, 10K : développement aérobie ; semi et marathon : portions spécifiques en phase SPECIFIC |
| Fatigue mécanique | Croît avec la durée ; Fredette 2022 (SEARCH_SUMMARY) : association entre distances plus longues et blessures, avec des preuves contradictoires sur les paramètres d’entraînement ⇒ `mechanicalDemand` HIGH pour les sorties longues |
| Interaction avec une séance intense | Pas le lendemain d’une séance KEY de même dimension sans décision explicite (contrainte de placement) |
| Interaction avec la musculation des jambes | Transmise à l’InterferenceManager (spec concurrente) ; aucune durée d’espacement fixe |

---

## P. Haute intensité et fractionné

| Type | Domaine | Remarque |
|---|---|---|
| Intervalles orientés VO2 (VO2_INTERVALS) | SEVERE | Durée des répétitions suffisante pour approcher VO2max |
| Intervalles du domaine sévère (tous) | SEVERE | Couvre VO2_INTERVALS, SHORT_INTERVALS, RACE_PACE 5K |
| Intervalles courts (SHORT_INTERVALS) | SEVERE intermittent | Récupérations courtes ; vitesse élevée |
| Côtes (HILL_REPETITIONS) | SEVERE ou SPRINT_NEUROMUSCULAR | Effort prioritaire |
| Lignes droites (STRIDES) | SPRINT_NEUROMUSCULAR | Sous-maximal, relâché |

**Preuve (SEARCH_SUMMARY)**
- García-Pinillos 2017 (coureurs loisirs) : 2 à 3 séances HIIT par semaine **combinées** au continu améliorent le VO2max et l’économie. Le continu et l’intermittent sont **complémentaires**, pas opposés.
- Gonzalez-Mohino 2020 (coût en O2, fractionné vs continu, coureurs loisirs) : identité **partielle** (PMID 31606879 non confirmé explicitement) ; résultats non extraits ⇒ aucune conclusion tirée en 5A.
- Oliveira 2024, Rosenblat 2019 : les avantages observés du polarisé sont modestes et dépendent du contexte (spec charge §L).

**Conclusions interdites**
- « HIIT = toujours supérieur » : **non**.
- Une fréquence HIIT tirée d’une étude (2 à 3 par semaine) ne devient pas une constante. C’est un contexte de population (loisirs, en combinaison avec le continu), à classer `CONTEXT_DEPENDENT`.
