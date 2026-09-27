# RUNNING-V1-CAPABILITY-MATRIX — matrice des capacités cibles (périmètre C)

> **Classification de l’état cible**, pas de la disponibilité actuelle en production.
>
> **Socle commun** : 4 politiques G1 + E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD + CORE-EXT-R1 approuvée et implémentée. Une cellule « activée » l’est **une fois ce socle acquis**. Les verrous au-delà du socle sont indiqués.

## 1. Populations × objectifs

**Légende** :
- EN = TARGET_ENABLED ;
- EN-D = TARGET_ENABLED_DEGRADED ;
- G-EXP = TARGET_GATED_PENDING_EXPERT ;
- G-G1 = TARGET_GATED_PENDING_G1 ;
- G-TECH = TARGET_GATED_PENDING_TECHNICAL ;
- OOM = OUT_OF_SUPPORTED_MODEL.

| Population | GENERAL | 5K | 10K | HALF | MARATHON |
|---|---|---|---|---|---|
| P-R0 | **G-G1** (G1-NOVICE + V33) | **G-G1** : phase d’entrée, puis reclassement en P-R1 ; + G-EXP (E-LOAD, E-PROG) | OOM tant que P-R0 : objectif accessible après reclassement | OOM (idem) | OOM (idem) |
| P-R1 | EN-D (sans E-LOAD : HOLD ou restauration) | EN-D (EASY, TEST, STRIDES ; qualité en première exposition : G-EXP E-FIRST) | EN-D (idem) | G-EXP (E-LONG, E-TAPER ; fréquence et confiance souvent faibles) | OOM (pas de base de long run dans le modèle V1 pour P-R1) |
| P-R2 | EN-D (complet avec E-PACE, E-FIRST, E-PROG) | EN-D | EN-D | EN-D (allure par calibration ; taper en dernière semaine) → EN avec E-MODEL + E-TAPER | G-EXP (E-LONG, E-TAPER ; allure par calibration seulement) |
| P-R3 | EN-D | EN-D | EN-D | EN-D → EN avec E-MODEL + E-TAPER | G-EXP (idem) |
| P-R4 | EN-D | EN-D | EN-D | EN-D → EN | G-EXP (idem) |
| P-HYBRID | G-TECH (intégration GlobalPlanner / InterferenceManager), puis même classement que le niveau de course | G-TECH | G-TECH | G-TECH | G-TECH + G-EXP |

**Reprise après interruption** (transverse) :
- séances post-retour ≤ réalisé : EN-D ;
- **première prescription après LONG sans donnée post-retour : G-G1** (G1-RETURN + V24 + V34) ;
- UNKNOWN : EN-D (structure prudente + demande d’information), NO_VALID sans séance post-retour.

**Pourquoi « EN-D » et pas « EN »** : sans E-PACE, E-FIRST et E-PROG, les cibles sont en RPE seul, il n’y a pas de première exposition, et la progression se limite à la restauration. Ces capacités deviennent EN une fois ces décisions approuvées.

## 2. Fonctions

**Légende** :
- T = TARGET ;
- T-D = TARGET_WITH_DEGRADATION ;
- G-EXP = GATED_EXPERT ;
- G-G1 = GATED_G1 ;
- G-TECH = GATED_TECHNICAL ;
- POST = POST_V1.

| Fonction | Classe | Détail |
|---|---|---|
| EASY | T | Socle |
| LONG | T-D | HOLD ou restauration ; progression et marathon : G-EXP (E-LONG, E-PROG) |
| THRESHOLD | T-D | Historique ; première exposition : G-EXP (E-FIRST) ; allure : G-EXP (E-PACE) |
| VO2 / SEVERE | T-D | idem |
| SHORT_INTERVALS | T-D | idem |
| HILLS | T-D | idem (RPE par conception) |
| RACE_PACE | T-D | Allure : G-EXP (E-PACE, E-MODEL) ; marathon : allure par calibration seulement |
| TEST | T | Jamais maximal pour P-R0 |
| STRIDES | T | Module |
| PROGRESSION_RUN | POST | Au catalogue, non sélectionné (aucun rôle défini) |
| TAPER | G-EXP (E-TAPER) | Dégradation d’ici là : dernière semaine, intervalle de réduction, sélection par l’utilisateur ou le planificateur |
| PERFORMANCE_EXTRAPOLATION | G-EXP (E-MODEL) | Dégradation : calibration ; marathon exclu par la preuve |
| REFERENCE_CALIBRATION | T | Socle |
| RETURN_PROGRAMMING | T-D + **G-G1** (premier départ : V34) | |
| NOVICE_ENTRY | **G-G1** (G1-NOVICE + V33) | |

**Toutes les séances structurées** (séries, cibles RPE et FC) : **G-TECH jusqu’à CORE-EXT-R1**.

Aucune fonction n’est retirée à cause d’un paramètre non résolu.
