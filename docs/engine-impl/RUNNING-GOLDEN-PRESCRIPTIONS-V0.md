# RUNNING-GOLDEN-PRESCRIPTIONS-V0 — prescriptions théoriques R1–R12

> **Relancé en 5D** : voir [`RUNNING-GOLDEN-PRESCRIPTIONS-V1-CANDIDATE.md`](RUNNING-GOLDEN-PRESCRIPTIONS-V1-CANDIDATE.md).
> - Statuts VALID_PROVISIONAL / BLOCKED_G1 ;
> - R4 modifié (restauration du long run, allure semi Riegel) ;
> - calcul du taper de R11 explicité.

> **Phase 5C : prescriptions théoriques, non exécutables.** Aucun code.
>
> - Règles : [`RUNNING-RULESET-V0.md`](RUNNING-RULESET-V0.md) (§ cités) ; valeurs : [`RUNNING-PARAMETERS-V0.md`](RUNNING-PARAMETERS-V0.md) (tags V..) ; mode **CANDIDATE**.
> - **Traçabilité** : chaque nombre renvoie soit à un **tag de paramètre**, soit à une **donnée d’entrée du scénario** (`IN:`), soit à un **calcul** (`=`).
> - Les données d’entrée (historique, références) sont **définies par le scénario** : ce ne sont pas des recommandations.
> - Les séances détaillées suivent la forme de CORE-EXT-R1 (profondeur fixe : segments `warmup` / `preparation` / `repeat` / `steady` / `cooldown`).
> - **Sélection dans les plages** : borne prudente par défaut (V20) ; le pire cas est indiqué entre crochets.

**Légende**
- Éligibilité : FULL = ELIGIBLE_FULL_TARGET ; BROAD = ELIGIBLE_BROAD_TARGET ; RPE = ELIGIBLE_RPE_ONLY ; NO = NOT_ELIGIBLE ; BLOCKED = éligible mais dose bloquée par un paramètre vide.
- Demande : HD = HIGH_DEMAND (V30).

---

## R1 — Novice sans référence, objectif général, 3 séances par semaine

- **Athlète** (`IN:`) : P-R0, aucun historique fiable, sans montre, 45 min disponibles par séance, aucune douleur, aucun critère hors périmètre.
- **Objectif / phase** : GENERAL_RUNNING / FOUNDATION.
- **Références** : aucune (`REF.NONE`). Confiance de référence : aucune. Confiance de prescription : LOW.
- **Concurrent** : aucun.

| Archétype | Décision | Raison |
|---|---|---|
| EASY_RUN (alternance course / marche) | RPE, **BLOCKED** | Dose d’entrée V33 vide (G1 NOVICE_ENTRY) |
| LONG, STEADY, THRESHOLD, VO2, SHORT, HILLS, RACE_PACE | NO | P-R0 (§G.3) ; V10 = 0 |
| STRIDES | NO | P-R0 |
| TEST_SESSION maximal | NO | G1 NOVICE_ENTRY |

- **Composition** : 3 × EASY_RUN en alternance course / marche (intention). Aucune séance HD.
- **Progression** : HOLD (`PROG.HOLD_MAGNITUDE_UNDEFINED` ; pas encore de données).
- **Charge** : aucune base ; `weeklyDistance` UNKNOWN.
- **Codes** : `REF.NONE`, `CONF.PRESCRIPTION_LOW`, `SAFETY.NOVICE_ENTRY`, `ELIG.RPE_ONLY`, `PRESCRIPTION_BLOCKED_BY_PARAMETER(V33)`, `LOAD.DIMENSION_UNKNOWN`.

**Séance détaillée S1 (structure seulement)**

```
run_structure
  warmup    : dose = BLOCKED(V33) · domaine easy_low · effort « marche active »
  repeat    : sets 1 · reps BLOCKED(V33)
              work     = BLOCKED(V33) · easy_low · RPE ≤ 3 (V02) · priorité effort
              recovery = BLOCKED(V33) · mode walk
  cooldown  : dose = BLOCKED(V33) · marche
estimates   : non calculables (doses bloquées)
```

**Résultat : `NO_VALID_RUNNING_PROPOSAL`** — `PRESCRIPTION_BLOCKED_BY_PARAMETER(V33)`. La structure est valide, la dose est absente. C’est un résultat valide.

---

## R2 — Débutant, premier 5 km, 3 séances par semaine

- **Athlète** (`IN:`) : P-R1 ; 4 dernières semaines à 3 séances ; durées hebdomadaires 90 / 100 / 105 / 110 min ; séance easy médiane 30 min ; plus longue sortie par semaine 30 / 40 / 40 / 45 min ; aucun travail intense ; déclaration « 5 km en environ 30 min » (non datée) ; téléphone GPS ; pas de FC ; 45 min disponibles en semaine, 60 min le week-end.
- **Objectif / phase** : 5K, sans date / FOUNDATION (calibration).
- **Références** : USER_DECLARED_REFERENCE (LOW). Confiance de prescription : LOW.
- **Concurrent** : aucun.

| Archétype | Décision | Raison |
|---|---|---|
| EASY_RUN | RPE | Plafond RPE 3 |
| TEST_SESSION (contre-la-montre 5 km) | **Éligible, sélectionnée** | P-R1 ; calibration demandée (déclaration seule) |
| STRIDES | Éligible (régularité 4 semaines) ; **non placé** cette semaine | Pas automatique (§O) ; semaine de test |
| SHORT_INTERVALS | BLOCKED | Pas d’historique sévère (V36) ; densité occupée par le test |
| LONG_RUN (désignée) | Éligible mais **non désignée** | V10 P-R1 = 1 séance HD, déjà prise par le test ; une LONG_RUN désignée serait HD (défaut conservateur V30 / V32) ⇒ la sortie de 40 min reste une EASY |
| THRESHOLD, VO2, STEADY, RACE_PACE, HILLS | NO | P-R1 |

**Composition** (bande habituelle V21 : `weeklyDuration` 90–110, médiane 102,5 ; `highIntensityExposure` 0–0) :

| Séance | Archétype | Contenu | Durée | Traçabilité |
|---|---|---|---|---|
| S1 | EASY_RUN | Continu, RPE ≤ 3 | **25 min** | Médiane 30 (`IN:`), **raccourcie** par la règle de rééquilibrage (`week.rebalanceRule`) |
| S2 | TEST_SESSION (HD) | Échauffement 10 + contre-la-montre 5 km (~30, estimation de durée seulement, LOW) + retour au calme 5 | **45 min** [55] | V06, V07, V20 ; 30 = déclaration (`IN:`) |
| S3 | EASY_RUN | Continu, RPE ≤ 3 | **40 min** | Médiane des plus longues sorties (`IN:`, V19) |
| **Total** | | | **110 min** [120] | = |

**Contrôle de charge (LCA)**
- Sans rééquilibrage : 30 + 45 + 40 = 115 > 110 (bande) **et** hausse d’intensité (test) ⇒ MULTI_DIMENSION_INCREASE, refusé.
- Après rééquilibrage : S1 raccourcie à 25 ⇒ `weeklyDuration` = 110, WITHIN_HABITUAL (borne haute de la bande).
- Le pire cas (120) dépasse la bande : les bornes prudentes sont **fixées** (`LOAD.WORST_CASE_ABOVE_BAND` ⇒ V20 impose les bornes basses).
- `highIntensityExposure` : INCREASE_UNCLASSIFIED sur une seule dimension, admise parce qu’un test est demandé.

- **Progression** : HOLD (`PROG.HOLD_LOW_CONFIDENCE` : calibration en cours).
- **Codes** : `REF.DECLARED_ONLY`, `REF.CALIBRATION_REQUIRED`, `ELIG.TEST_SELECTED`, `DEMAND.DEFAULT_CONSERVATIVE` (LONG_RUN non désignée), `LOAD.WEEK_REBALANCED_TO_HABITUAL_BAND`, `LOAD.INCREASE_UNCLASSIFIED_TEST`, `TID.PER_SESSION`.

**Séance détaillée S2 — contre-la-montre 5 km**

```
run_structure
  warmup   : 10 min (V06, V20) · easy_low · RPE ≤ 3
  steady   : 5 000 m (IN: protocole) · test maximal · RPE 9–10 (V02) · priorité effort
  cooldown : 5 min (V07, V20) · easy_low
estimates: work ≈ 30 min (IN: déclaration, LOW) ; total ≈ 45 min [55]
```

| Actif | Récupération | Échauffement | Retour au calme | Total estimé |
|---|---|---|---|---|
| ≈ 30 min (incertain) | 0 | 10 | 5 | **≈ 45 min** [55] |

**Résultat : `VALID_RUNNING_PROPOSAL`.**

---

## R3 — Intermédiaire, 10 km, référence récente fiable, 3 séances par semaine

- **Athlète** (`IN:`) :
  - P-R3 ; 10 km en 50:00 il y a 3 semaines (route plate, conditions normales) ⇒ 300 s/km ;
  - semaines 150 / 160 / 165 / 170 min ; easy médiane 45 ; plus longue sortie médiane 65 ;
  - dernier THRESHOLD : 3 × 8 min, récupération 2 min, réalisé à RPE 6 ; exposition THRESHOLD_LIKE hebdomadaire 0 / 24 / 24 / 24 min ;
  - montre GPS sans référence FC ; épreuve dans 10 semaines.
- **Objectif / phase** : 10K / DEVELOPMENT.
- **Références** : RECENT_RACE_RESULT (RECENT, V12) ⇒ HIGH pour l’allure 10K. Frontière 2 non estimable depuis un 10K seul (Q-THR-3).
- **Concurrent** : aucun.

| Archétype | Décision | Cible |
|---|---|---|
| EASY_RUN | RPE | Plafond RPE 3 (V02) |
| LONG_RUN | RPE | Plafond RPE 3 |
| THRESHOLD (INTERVALS) | **BROAD** | RPE 5–6 (V02) + plafond « pas plus vite que 300 s/km » (V05) |
| RACE_PACE (10K) | FULL (non sélectionné cette semaine) | 300 ± 3 % = 291–309 s/km (V03) |
| VO2 / SHORT | BLOCKED | Pas d’historique sévère (V36) |
| STRIDES | Éligible, non placé | — |

**Composition** (V10 P-R3 = 2 HD) — bande `weeklyDuration` 150–170, bande THRESHOLD_LIKE 0–24 :

| Séance | Archétype | Contenu | Durée | Traçabilité |
|---|---|---|---|---|
| S1 | EASY_RUN | RPE ≤ 3 | 45 | Médiane (`IN:`, V19) |
| S2 | THRESHOLD INTERVALS (HD, KEY) | 3 × 8 min / récupération 2 min | **43** [53] | Historique (V19) ; V06, V07, V20 |
| S3 | LONG_RUN (HD, défaut conservateur) | RPE ≤ 3 | 65 | Médiane des plus longues (`IN:`, V19) |
| **Total** | | | **153** [163] | WITHIN_HABITUAL |

- **Charge** : THRESHOLD_LIKE 24 min = borne haute de la bande ⇒ WITHIN. HD = 2, non consécutives (V11 : placement par le GlobalPlanner).
- **Progression** : variable dominante candidate `intervalVolume` ⇒ **HOLD** (`PROG.HOLD_MAGNITUDE_UNDEFINED`, V23 vide).
- **Codes** : `REF.RECENT_SPECIFIC`, `PERF.THRESHOLD_NOT_ESTIMABLE_FROM_10K`, `TARGET.CEILING_FROM_10K`, `ELIG.BROAD`, `PROG.HOLD_MAGNITUDE_UNDEFINED`, `TID.EMERGENT`.

**Séance détaillée S2 — THRESHOLD INTERVALS**

```
run_structure
  warmup   : 10 min (V06, V20) · easy_low · RPE ≤ 3
  repeat id=b1 : sets 1 · reps 3 (IN: historique)
                 work     = 8 min (IN: historique) · threshold_like
                            target { effort RPE 5–6 (V02) ; pace ceiling ≥ 300 s/km (V05) ; priority effort }
                 recovery = 2 min · jog (IN: historique ; ratio 0,25 ∈ V08)
  cooldown : 5 min (V07, V20) · easy_low
estimates: work 24 min ; total 43 min [53]
```

| Actif | Récupération | Échauffement | Retour au calme | Total |
|---|---|---|---|---|
| 24 (3 × 8) | 4 (2 × 2) | 10 [15] | 5 [10] | **43 min** [53] |

**Résultat : `VALID_RUNNING_PROPOSAL`.**

---

## R4 — Intermédiaire, semi-marathon, 4 séances par semaine

- **Athlète** (`IN:`) :
  - P-R3 ; 10 km en 48:00 il y a 6 semaines (288 s/km, RECENT) ; semi en 1:50:00 il y a 14 mois (STALE) ;
  - semaines 200 / 210 / 215 / 225 min ; easy 40–45 (médiane 45) ; plus longue sortie médiane 80 ;
  - dernier THRESHOLD : 2 × 12 min, récupération 3 min ; exposition THRESHOLD_LIKE 24 / 24 / 0 / 24 ;
  - montre GPS ; épreuve dans 12 semaines.
- **Objectif / phase** : HALF_MARATHON / DEVELOPMENT.
- **Références** : 10K RECENT (HIGH pour ses usages) ; semi STALE (LOW, `REF.STALE_REVIEW`). Allure semi : distance non encadrée et V38 vide ⇒ **pas d’allure** (`PERF.EXTRAPOLATION_MODEL_UNDEFINED`).
- **Concurrent** : aucun.

| Archétype | Décision | Cible |
|---|---|---|
| EASY, LONG | RPE | Plafond RPE 3 |
| THRESHOLD | BROAD | RPE 5–6 + plafond 288 s/km (V05) |
| STEADY | RPE | RPE 4–5 (frontière 1 inconnue) |
| RACE_PACE (semi) | RPE (allure bloquée par V38) ; non sélectionné | — |
| VO2 / SHORT | BLOCKED (V36) | — |

**Composition** (V10 = 2 HD) — bande 200–225 :

| Séance | Archétype | Contenu | Durée | Traçabilité |
|---|---|---|---|---|
| S1 | EASY | RPE ≤ 3 | 45 | `IN:`, V19 |
| S2 | THRESHOLD INTERVALS (HD, KEY) | 2 × 12 / récupération 3 | **42** [52] | V19 ; V06, V07 |
| S3 | EASY | RPE ≤ 3 | 40 | Borne basse de la plage easy (`IN:`) |
| S4 | LONG_RUN (HD) | RPE ≤ 3 | 80 | `IN:`, V19 |
| **Total** | | | **207** [217] | WITHIN |

- **Progression** : variable dominante candidate `longRunDuration` (écart à l’objectif semi) ⇒ **HOLD** (`PROG.HOLD_MAGNITUDE_UNDEFINED`).
- **Calibration** : contre-la-montre ou course de préparation proposé dans les semaines suivantes (pas cette semaine : densité 2 atteinte).
- **Codes** : `REF.RECENT_NONSPECIFIC`, `REF.STALE_REVIEW`, `PERF.EXTRAPOLATION_MODEL_UNDEFINED`, `REF.CALIBRATION_REQUIRED`, `PROG.HOLD_MAGNITUDE_UNDEFINED`.

**Séance détaillée S4 — LONG_RUN**

```
run_structure
  steady : 80 min (IN: historique, V19) · easy_low · RPE ≤ 3 (V02) · priority effort
estimates: work 80 ; total 80
```

| Actif | Récupération | Échauffement | Retour au calme | Total |
|---|---|---|---|---|
| 80 | 0 | 0 | 0 | **80 min** |

**Résultat : `VALID_RUNNING_PROPOSAL`.** L’allure spécifique semi est absente et tracée : ce n’est pas une séance invalide.

---

## R5 — Avancé, 10 km, 5 séances par semaine, plusieurs références cohérentes

- **Athlète** (`IN:`) :
  - P-R4 ; références : 5 km en 19:00 il y a 4 semaines (228 s/km) ; 10 km en 39:30 il y a 3 semaines (237 s/km) ; semi en 1:29:30 il y a 7 semaines (≈ 254 s/km) ; toutes RECENT ;
  - semaines 290 / 300 / 305 / 310 ; easy médiane 50 ; plus longue sortie médiane 90 ;
  - derniers VO2 : 5 × 3 min, récupération 2 min ; derniers THRESHOLD : 3 × 10 min, récupération 3 min ;
  - montre GPS ; épreuve dans 8 semaines.
- **CS** (calcul, 2 essais = les courses de 5 et 10 km) : CS = 5000 m / (2370 − 1140) s = 4,065 m/s ⇒ **246 s/km** ; D’ ≈ 366 m (informative, non utilisée). 2 essais ⇒ MEDIUM (V16). Corroborée (V17) : 246 est plus lent que 228 et 237, plus rapide que 254 ⇒ `REF.CS_CORROBORATED`.
- **Objectif / phase** : 10K / DEVELOPMENT.
- **Concurrent** : aucun.

| Archétype | Décision | Cible |
|---|---|---|
| EASY, LONG | RPE | Plafond RPE 3 |
| THRESHOLD | **BROAD** (MEDIUM) | 100–105 % × 246 = **246–258 s/km** (V04) + RPE 5–6 ; plafond V05 (237) respecté |
| VO2_INTERVALS | **FULL** (HIGH) | Ancre 5 km (V18) : 228 ± 3 % = **221–235 s/km** (V03) + RPE 7–8 |
| RACE_PACE (10K) | FULL (non sélectionné) | 237 ± 3 % = 230–244 s/km |
| STRIDES | Éligible | V09 |

**Composition** (V10 P-R4 = 3 HD ; jours proposés au planificateur) — bande 290–310 :

| Séance | Jour proposé | Archétype | Contenu | Durée | Traçabilité |
|---|---|---|---|---|---|
| S1 | Lun | EASY | RPE ≤ 3 | 50 | V19 |
| S2 | Mar | VO2_INTERVALS (HD, KEY) | Préparation 4 lignes droites + 5 × 3 / récupération 2 | **42** [59] | V19, V06, V07, V09 |
| S3 | Jeu | THRESHOLD INTERVALS (HD) | 3 × 10 / récupération 3 | **51** [61] | V19, V06, V07 |
| S4 | Ven | EASY + STRIDES | 45 + 4 lignes droites | **49** [56] | V19, V09 |
| S5 | Dim | LONG_RUN (HD) | RPE ≤ 3 | 90 | V19 |
| **Total** | | | | **282** [316] | = |

**Contrôle de charge**
- **Proposition** (282) : sous la bande (BELOW_HABITUAL, accepté ; une baisse n’est pas une hausse).
- **Pire cas** (316) : dépasse la bande ⇒ les bornes prudentes sont fixées.
- HD = 3 : Mar, Jeu, Dim, jamais sur deux jours consécutifs (V11 ✓).

- **Progression** : HOLD (`PROG.HOLD_MAGNITUDE_UNDEFINED`) ; intensité possible comme variable dominante (confiance HIGH pour le sévère), mais aucune magnitude n’est définie.
- **Codes** : `REF.MULTIPLE_COHERENT`, `REF.CS_CORROBORATED`, `CONF.CS_CAPPED_TWO_TRIALS`, `ELIG.FULL` (VO2), `ELIG.BROAD` (THRESHOLD), `LOAD.BELOW_HABITUAL_ACCEPTED`, `PROG.HOLD_MAGNITUDE_UNDEFINED`, `TID.EMERGENT`.

**Séance détaillée S2 — VO2_INTERVALS**

```
run_structure
  warmup      : 10 min (V06, V20) · easy_low · RPE ≤ 3
  preparation : reps 4 (V09, V20) · 15 s · sprint_neuromuscular · descripteur (V02)
                recovery 45 s · walk (V09, V20)
  repeat id=b1 : sets 1 · reps 5 (IN: historique)
                 work     = 3 min (IN: historique) · severe
                            target { pace 221–235 s/km (V18, V03) ; effort RPE 7–8 (V02) ; priority pace }
                 recovery = 2 min · jog (IN: historique ; ratio 0,67 ∈ V08)
  cooldown    : 5 min (V07, V20) · easy_low
estimates: work 15 min ; total 42 min [59]
```

| Actif | Récupération | Échauffement (dont lignes droites) | Retour au calme | Total |
|---|---|---|---|---|
| 15 (5 × 3) | 8 (4 × 2) | 10 + 4 (4 × 1 min) | 5 | **42 min** [59] |

**Résultat : `VALID_RUNNING_PROPOSAL`.**

---

## R6 — Marathon, historique long, 5 séances par semaine

- **Athlète** (`IN:`) :
  - P-R4 ; semi en 1:35:00 il y a 6 semaines (≈ 270 s/km, RECENT) ;
  - plus longue sortie médiane 120 min, avec **20 dernières minutes en STEADY** lors des 3 dernières sorties longues ;
  - semaines 300 / 310 / 320 / 330 ; easy médiane 45 ; dernier THRESHOLD : 2 × 15 min, récupération 3 min ;
  - montre GPS ; épreuve dans 14 semaines.
- **Objectif / phase** : MARATHON / DEVELOPMENT.
- **Références** : semi RECENT (HIGH pour le semi). Allure marathon : V38 vide ⇒ **pas d’allure**. Frontière 2 : semi seul ⇒ **aucune borne dérivée** (Q-THR-2).
- **Confiance de prescription** : long run MEDIUM à HIGH (historique) ; allure marathon non prescrite.

| Archétype | Décision | Cible |
|---|---|---|
| EASY, LONG | RPE | Plafond RPE 3 ; portion STEADY RPE 4–5 (historique, V39) |
| THRESHOLD | **RPE** | RPE 5–6 (aucune borne d’allure) |
| RACE_PACE (marathon) | RPE (allure bloquée par V38) ; non sélectionné | — |
| STRIDES | Éligible | V09 |

**Composition** (V10 = 3 ; 2 HD utilisées) — bande 300–330 :

| Séance | Archétype | Contenu | Durée | Traçabilité |
|---|---|---|---|---|
| S1 | EASY | RPE ≤ 3 | 45 | V19 |
| S2 | THRESHOLD INTERVALS (HD) | 2 × 15 / récupération 3 | **48** [58] | V19, V06, V07 |
| S3 | EASY | RPE ≤ 3 | 45 | V19 |
| S4 | EASY + STRIDES | 40 + 4 lignes droites | **44** [51] | `IN:` easy 40, V09 |
| S5 | LONG_RUN (HD, KEY) | 100 easy + 20 STEADY | **120** | V19, V39 (historique) |
| **Total** | | | **302** [319] | WITHIN |

- **Progression** : variable dominante candidate `longRunDuration` ⇒ HOLD (`PROG.HOLD_MAGNITUDE_UNDEFINED`).
- **Taper** : pas encore (14 semaines).
- **Codes** : `REF.RECENT_NONSPECIFIC`, `PERF.EXTRAPOLATION_MODEL_UNDEFINED`, `ELIG.RPE_ONLY` (THRESHOLD), `LONGRUN.HISTORY_ANCHORED`, `PROG.HOLD_MAGNITUDE_UNDEFINED`.

**Séance détaillée S5 — LONG_RUN avec portion STEADY**

```
run_structure
  steady : 100 min (= 120 − 20) · easy_low · RPE ≤ 3 (V02) · priority effort
  steady : 20 min (IN: historique, V39) · heavy (bas) · RPE 4–5 (V02) · priority effort
estimates: work 120 ; total 120
```

| Actif | Récupération | Échauffement | Retour au calme | Total |
|---|---|---|---|---|
| 120 (dont 20 en STEADY) | 0 | 0 | 0 | **120 min** |

**Résultat : `VALID_RUNNING_PROPOSAL`.**

---

## R7 — Athlète hybride, 3 courses + musculation / cross-training

- **Athlète** (`IN:`) :
  - P-R2 + P-HYBRID ; 10 km en 55:00 il y a 5 semaines (330 s/km, RECENT) ;
  - course : semaines 135 / 140 / 145 / 150 ; easy médiane 40 ; plus longue sortie médiane 60 ; dernier THRESHOLD : 4 × 6 min, récupération 1,5 min ;
  - concurrent : musculation jambes lourde (lundi), haut du corps (jeudi), **nouvelle** séance HYROX le samedi (charge concurrente en hausse).
- **Objectif / phase** : 10K / DEVELOPMENT ; le GlobalPlanner fixe la priorité hebdomadaire (course = SUPPORT cette semaine).
- **Références** : 10K RECENT ⇒ HIGH (10K).

| Archétype | Décision | Cible |
|---|---|---|
| EASY, LONG | RPE | Plafond RPE 3 |
| THRESHOLD | BROAD | RPE 5–6 + plafond 330 s/km (V05) |
| HILLS | NO | Charge concurrente jambes élevée (avis de l’InterferenceManager) ; pas d’historique (V37) |

**Composition** (V10 P-R2 = 2 HD course ; le planificateur compte aussi les autres disciplines) — bande 135–150 :

| Séance | Archétype | Contenu | Durée | Demandes (§Z) | Contraintes |
|---|---|---|---|---|---|
| S1 | EASY | RPE ≤ 3 | 40 | LOW / LOW / MOD / LOW | FLEXIBLE |
| S2 | THRESHOLD INTERVALS (HD) | 4 × 6 / récupération 1,5 | **43,5** [53,5] | MOD / HIGH / MOD / MOD | PREFER_BEFORE_HEAVY_LOWER ; AVOID_ADJACENT_KEY_SAME_DIMENSION |
| S3 | LONG_RUN (HD) | RPE ≤ 3 | 60 | MOD / MOD / HIGH / HIGH | NOT_AFTER_HIGH_LOCOMOTOR (pas le lendemain de l’HYROX) ; PREFER_LONGEST_SLOT |
| **Total** | | | **143,5** [153,5] | | WITHIN (pire cas au-dessus ⇒ bornes prudentes) |

- **Progression** : **HOLD** (`PROG.HOLD_CONCURRENT_LOAD`, l’HYROX est nouveau).
- **Charge** : `concurrentLocomotorLoad` ESTIMATED (HYROX), jamais 0.
- **Placement** : décidé par le GlobalPlanner ; RunningEngine ne fixe aucun horaire.
- **Codes** : `CONC.DEMAND_DECLARED`, `CONC.PLACEMENT_BY_PLANNER`, `LOAD.CONCURRENT_ESTIMATED`, `PROG.HOLD_CONCURRENT_LOAD`, `TID.CONCURRENT_INCLUDED`.

**Séance détaillée S2**

```
run_structure
  warmup   : 10 min (V06, V20) · easy_low
  repeat   : sets 1 · reps 4 (IN:) · work 6 min (IN:) · threshold_like
             target { RPE 5–6 (V02) ; pace ceiling ≥ 330 s/km (V05) ; priority effort }
             recovery 1,5 min · jog (IN: ; ratio 0,25 ∈ V08)
  cooldown : 5 min (V07, V20)
estimates: work 24 ; total 43,5 [53,5]
```

| Actif | Récupération | Échauffement | Retour au calme | Total |
|---|---|---|---|---|
| 24 | 4,5 (3 × 1,5) | 10 | 5 | **43,5 min** [53,5] |

**Résultat : `VALID_RUNNING_PROPOSAL`** (sous réserve du placement par le planificateur).

---

## R8 — Retour après interruption LONG (premier jour de reprise)

- **Athlète** (`IN:`) : P-R3 ; interruption de **35 jours** (voyage, aucune douleur) ⇒ **LONG** (V24 : ≥ 28) ; avant l’interruption : 4 séances, easy médiane 45, 10 km en 46:00 trois mois avant ; **aucune séance depuis le retour**.
- **Références** : 10K ⇒ STALE (V12 : interruption LONG) ⇒ LOW.
- **Éligibilité** : EASY seulement (RPE) ; tous les archétypes HD : NO (§X) ; TEST : NO avant V25.
- **Dose** : aucune séance post-retour ⇒ **V34 vide (G1 RETURN_PROTOCOL) ⇒ BLOCKED**. La fréquence de départ fait aussi partie du protocole G1 ⇒ BLOCKED (≤ 4, fréquence d’avant l’interruption, comme borne seulement).
- **Codes** : `RETURN.STATE_LONG`, `REF.DEGRADED_AFTER_BREAK`, `SAFETY.RETURN_PROTOCOL`, `PRESCRIPTION_BLOCKED_BY_PARAMETER(V34)`, `PROG.HOLD_RETURN_REQUIREMENTS`.

**Séance détaillée S1 (structure seulement)**

```
run_structure
  steady : dose = BLOCKED(V34) · easy_low · RPE ≤ 3 (V02) · priority effort
estimates: non calculables
```

**Résultat : `NO_VALID_RUNNING_PROPOSAL`** — `PRESCRIPTION_BLOCKED_BY_PARAMETER(V34)`. Après deux séances réalisées sans signal (V25), la dose suivra le réalisé (§X), toujours sous G1.

---

## R9 — Objectif 10 km, références anciennes et en conflit

- **Athlète** (`IN:`) :
  - P-R2 ; 10 km en 45:00 il y a 10 mois (270 s/km, STALE) ; 5 km en 25:00 il y a 3 semaines (300 s/km, RECENT) ;
  - dernier THRESHOLD : 3 × 8 min, récupération 2 min ; semaines 135 / 140 / 145 / 150 ; easy médiane 40 ; plus longue sortie médiane 60 ; montre GPS.
- **Conflit** (V13) : le 10 km ancien implique une allure 5K plus rapide que 270 s/km ; le 5 km récent donne 300 s/km. Écart > 6 % ⇒ `REF.CONFLICT`. La prescription retient **la plus prudente** (le 5K récent) ; confiance −1 ⇒ MEDIUM ; `PERF.UPDATE_DOWN` de l’estimation 10K ; `REF.CALIBRATION_REQUIRED` (contre-la-montre 10 km proposé les semaines suivantes).

| Archétype | Décision | Cible |
|---|---|---|
| THRESHOLD | **RPE** | RPE 5–6 ; aucun 10K RECENT ⇒ pas de plafond V05 |
| VO2 | BLOCKED (V36, pas d’historique) | (le cas échéant : ancre 5K 300 ± 6 % = 282–318 s/km, MEDIUM) |
| EASY, LONG | RPE | Plafond RPE 3 |

**Composition** (V10 = 2) — bande 135–150 :

| Séance | Archétype | Durée | Traçabilité |
|---|---|---|---|
| S1 | EASY | 40 | V19 |
| S2 | THRESHOLD INTERVALS (HD) | **43** [53] | V19, V06, V07 |
| S3 | LONG_RUN (HD) | 60 | V19 |
| **Total** | | **143** [153] | WITHIN |

- **Progression** : HOLD (`PROG.HOLD_LOW_CONFIDENCE` pour l’intensité ; `PROG.HOLD_MAGNITUDE_UNDEFINED`).
- **Codes** : `REF.CONFLICT`, `PERF.CONFLICT_CONSERVATIVE`, `PERF.UPDATE_DOWN`, `REF.CALIBRATION_REQUIRED`, `ELIG.RPE_ONLY`.

**Séance détaillée S2** : identique en structure à R3 S2 (3 × 8 min / récupération 2), cible **RPE 5–6 seule** (priorité effort, aucune allure).

| Actif | Récupération | Échauffement | Retour au calme | Total |
|---|---|---|---|---|
| 24 | 4 | 10 | 5 | **43 min** [53] |

**Résultat : `VALID_RUNNING_PROPOSAL`.** La confiance est réduite, mais la séance reste éligible : la précision baisse avant l’éligibilité (B3).

---

## R10 — Séance KEY manquée dans la semaine (semaine R5)

- **Contexte** : semaine R5 ; **S2 VO2 (mardi) manquée**, raison `TIME`.
- **Options examinées** (V11 : pas de HD sur deux jours consécutifs) :

| Créneau | Voisins | Décision |
|---|---|---|
| Mer | Jeu = THRESHOLD (HD) | ✗ |
| Ven (à la place de l’EASY) | Jeu = THRESHOLD (HD) | ✗ |
| Sam | Dim = LONG (HD) | ✗ |

⇒ **DROP** (`REPLAN.DROP_NO_VALID_SLOT`). Aucune compensation ; les autres séances sont inchangées ; zone gelée respectée.

- **Semaine résultante** : 282 − 42 = **240 min** ; `highIntensityExposure` (sévère) = 0, sous la bande (accepté).
- **Semaine suivante** : VO2 à la **même dose** (5 × 3 / 2), sans hausse (`PROG.HOLD_LOW_ADHERENCE` n’est pas déclenché pour une seule séance ; `PROG.HOLD_MAGNITUDE_UNDEFINED`).
- **Codes** : `REPLAN.MISSED_KEY`, `REPLAN.DROP_NO_VALID_SLOT`, `REPLAN.NO_MAKE_UP`, `REPLAN.FROZEN_ZONE_RESPECTED`.

**Séance détaillée S3 — THRESHOLD (inchangée)**

```
run_structure
  warmup   : 10 min (V06, V20)
  repeat   : sets 1 · reps 3 (IN:) · work 10 min (IN:) · threshold_like
             target { pace 246–258 s/km (V04 sur CS 246) ; RPE 5–6 ; priority pace }
             recovery 3 min · jog (IN: ; ratio 0,30 ∈ V08)
  cooldown : 5 min (V07, V20)
estimates: work 30 ; total 51 [61]
```

| Actif | Récupération | Échauffement | Retour au calme | Total |
|---|---|---|---|---|
| 30 | 6 | 10 | 5 | **51 min** [61] |

**Résultat : `VALID_RUNNING_PROPOSAL`** (semaine replanifiée).

---

## R11 — Taper : dernière semaine avant un semi

- **Athlète** (`IN:`) :
  - P-R3 ; semi le dimanche ; avant le taper : 4 séances, semaines 230 / 240 / 240 / 250 (médiane **240**) ;
  - 10 km en 47:00 il y a 4 semaines (282 s/km) ; dernier THRESHOLD : 2 × 12 min, récupération 3 min ; easy médiane 45.
- **Taper** :
  - V28 vide ⇒ seule la **dernière semaine** est traitée (incluse dans toute durée candidate) ;
  - volume hors course = 240 × (1 − [0,41 ; 0,60]) = **96–142 min** (V27, plage de signal, non imposée) ;
  - fréquence maintenue : 3 séances + la course = 4 ;
  - intensité maintenue : séance THRESHOLD courte, travail réduit dans la même plage : 24 × [0,40 ; 0,59] = 9,6–14,2 ⇒ 2 × 5 à 2 × 7 min.

| Séance | Archétype | Contenu | Durée | Traçabilité |
|---|---|---|---|---|
| S1 (mar) | EASY | RPE ≤ 3 | 35–45 | ≤ médiane easy (`IN:`) ; plage V27 |
| S2 (mer) | THRESHOLD INTERVALS (HD) | 2 × 5 / récupération 1,75 | **27** [41] | V27, V08 (borne haute 0,35 × 5), V06, V07 |
| S3 (ven) | EASY + STRIDES | 30–40 + 4 lignes droites | 34 [51] | V09 |
| Course (dim) | — | Non prescrite | — | — |
| **Total hors course** | | | **96** [≤ 142, pire cas des séances plafonné à la plage] | = |

- **Cible S2** : RPE 5–6 + plafond 282 s/km (V05 : 10K RECENT) ⇒ BROAD.
- **Progression** : direction DOWN (volume) ; `PROG.HOLD_EVENT_PROXIMITY` pour toute hausse.
- **Codes** : `TAPER.PRINCIPLE_SUPPORTED`, `TAPER.MAGNITUDE_RANGE`, `TAPER.DURATION_UNDEFINED_FINAL_WEEK_ONLY`, `TAPER.INTENSITY_MAINTAINED`, `TAPER.FREQUENCY_MAINTAINED`.

**Séance détaillée S2**

```
run_structure
  warmup   : 10 min (V06, V20)
  repeat   : sets 1 · reps 2 · work 5 min (= 24 × 0,40 / 2, arrondi à la minute)
             threshold_like · target { RPE 5–6 (V02) ; pace ceiling ≥ 282 s/km (V05) ; priority effort }
             recovery 1 min 45 s · jog (V08, borne prudente 0,35)
  cooldown : 5 min (V07, V20)
estimates: work 10 ; total ≈ 27 [41]
```

| Actif | Récupération | Échauffement | Retour au calme | Total |
|---|---|---|---|---|
| 10 | 1,75 | 10 | 5 | **≈ 27 min** [41] |

**Résultat : `VALID_RUNNING_PROPOSAL`** pour la dernière semaine. Le début du taper est `PRESCRIPTION_BLOCKED_BY_PARAMETER(V28)`, qui porte sur les semaines antérieures.

---

## R12 — Référence déclarée uniquement

- **Athlète** (`IN:`) : P-R2 ; déclaration « 10 km en 48 min » (non datée) ; 4 semaines easy seulement : 120 / 125 / 135 / 140 ; easy médiane 40 ; plus longue sortie médiane 55 ; aucun historique de qualité ; pas de FC ; montre GPS.
- **Références** : USER_DECLARED_REFERENCE ⇒ LOW.

| Archétype | Décision | Raison |
|---|---|---|
| THRESHOLD | **BLOCKED** | Pas d’historique ; V35 vide |
| VO2 / SHORT | BLOCKED | V36 |
| TEST (contre-la-montre 5 km) | **Sélectionné** | Calibration (déclaration seule) |
| EASY, LONG | RPE | — |

**Composition** (V10 = 2 HD : test + long) — bande 120–140 :

| Séance | Archétype | Durée | Traçabilité |
|---|---|---|---|
| S1 | EASY | 40 | V19 |
| S2 | TEST 5 km (HD) | **39** [49] | V06, V07 ; ~24 = estimation **haute** de durée à partir de l’allure 10K déclarée (288 s/km × 5 km ; un 5 km est plus rapide qu’un 10 km, donc ≤ 24), LOW |
| S3 | LONG_RUN (HD) | 55 | V19 |
| **Total** | | **134** [144] | WITHIN (pire cas au-dessus ⇒ bornes prudentes) |

- **Progression** : HOLD (`PROG.HOLD_LOW_CONFIDENCE`).
- **Codes** : `REF.DECLARED_ONLY`, `REF.CALIBRATION_REQUIRED`, `PRESCRIPTION_BLOCKED_BY_PARAMETER(V35)` (THRESHOLD), `ELIG.TEST_SELECTED`, `LOAD.INCREASE_UNCLASSIFIED_TEST`.

**Séance détaillée S2**

```
run_structure
  warmup   : 10 min (V06, V20)
  steady   : 5 000 m · test maximal · RPE 9–10 (V02)
  cooldown : 5 min (V07, V20)
estimates: work ≤ 24 min (LOW) ; total ≤ 39 min [49]
```

| Actif | Récupération | Échauffement | Retour au calme | Total |
|---|---|---|---|---|
| ≤ 24 | 0 | 10 | 5 | **≤ 39 min** [49] |

**Résultat : `VALID_RUNNING_PROPOSAL`** (sans séance de seuil : BLOCKED et tracée).

---

## Bilan

| Scénario | Résultat | Blocages tracés |
|---|---|---|
| R1 | **NO_VALID** (dose bloquée) | V33 (G1 NOVICE_ENTRY) |
| R2 | VALID | — (LONG_RUN non désignée : densité et V32) |
| R3 | VALID | Progression : V23 |
| R4 | VALID | Allure semi : V38 ; progression : V23 |
| R5 | VALID | Progression : V23 |
| R6 | VALID | Allure marathon : V38 ; progression : V23 |
| R7 | VALID (placement par le planificateur) | Progression : HOLD concurrent |
| R8 | **NO_VALID** (dose bloquée) | V34 (G1 RETURN_PROTOCOL) |
| R9 | VALID | VO2 : V36 |
| R10 | VALID (replanifiée) | — |
| R11 | VALID (dernière semaine) | Début du taper : V28 |
| R12 | VALID | THRESHOLD : V35 |

- **Semaines entièrement bloquées** : **2** sur 12 (R1, R8).
- **Composants bloqués dans des semaines valides** : 6 types distincts :
  - allure semi (R4, V38) ;
  - allure marathon (R6, V38) ;
  - VO2 (R9, V36) ;
  - THRESHOLD (R12, V35) ;
  - début du taper (R11, V28) ;
  - amplitude de progression (toutes les semaines, V23).
- **Au moins une séance détaillée par scénario** : 12 sur 12 (R1 et R8 en structure seulement, doses bloquées).
- **Durées** : toutes calculées à partir du contenu (I17) ; aucune durée de séance n’est posée arbitrairement.
