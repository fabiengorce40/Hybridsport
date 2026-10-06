# HYROX H2 — multisport (planificateur réel)

> Gouvernance TEST_ONLY (draft, provisoire) : aucune valeur n’est une décision, une norme de compétition ni l’ordre officiel de l’épreuve.

## HYROX (compromised_running) + Running

Programme : HYROX puis Running. La course HYROX reste une distance (allure BLOCKED) ; la séance Running reste au moteur Running.

**Rôle** : `compromised_running` (RACE_SPECIFIC) — **structure** : `run_station_alternation` — **for time** 3 tour(s), time cap 2907 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 2097 s, lente 2528 s ; transitions : 11, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.skierg | 500 distance_m | — | — |
| 2 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 3 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 4 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |

**Profil de demande CORE** : lower_knee=high, lower_hip=high, upper_push=high, upper_pull=high, axial=high, locomotor_impact=high, high_intensity_systemic=high, grip=high

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=run_station_alternation ; criteria=[admitted_for_role, governed_order]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=1 ; stationId=skierg ; exerciseId=ex.skierg ; criteria=[not_used_recently, neighbour_structure_conflicts:1, relevance:3]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=2 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, neighbour_structure_conflicts:2, relevance:3]
- `H2_RUN_COMPONENT` — exerciseId=ex.easy_run ; distanceM=800 ; contexts=[after_station] ; pace=BLOCKED:RUNNING_ENGINE_DELEGATION
- `H2_ACCUMULATION` — role=compromised_running ; sharedStructures=[lower_hip, upper_pull] ; status=INTENDED_BY_ROLE
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=true ; neighbours=[running@144h] ; policy=hybrid_race.h2.neighbourPolicy ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=RACE_PREPARATION ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Strength (×2) + HYROX (strength_endurance)

Strength prioritaire. HYROX ne prescrit ni séries ni force maximale.

**Rôle** : `strength_endurance` (SPECIFIC) — **structure** : `station_circuit` — **for time** 4 tour(s), time cap 1702 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1093 s, lente 1480 s ; transitions : 7, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 2 | station | ex.sandbag_lunge | 50 distance_m | 10 kg | — |

**Profil de demande CORE** : lower_knee=high, lower_hip=high, upper_push=none, upper_pull=high, axial=high, locomotor_impact=none, high_intensity_systemic=high, grip=high

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=station_circuit ; criteria=[admitted_for_role, governed_order]
- `H2_STRUCTURE_REJECTED` — structure=station_circuit@4x3 ; causes=[STATIONS_UNFILLED:2/3]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=1 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, neighbour_structure_conflicts:5, relevance:3, tie_broken_by_id_over:sandbag_lunge]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=2 ; stationId=sandbag_lunge ; exerciseId=ex.sandbag_lunge ; criteria=[not_used_recently, neighbour_structure_conflicts:5, relevance:3, tie_broken_by_id_over:sled_push]
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=true ; neighbours=[strength@-144h, strength@-72h] ; policy=hybrid_race.h2.neighbourPolicy ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=RACE_PREPARATION ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## HYROX (mixed_station_conditioning) + Cross-training

Deux sports à stations : aucune fusion, voisine transportée.

**Rôle** : `mixed_station_conditioning` (SPECIFIC) — **structure** : `station_circuit` — **for time** 4 tour(s), time cap 2107 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1406 s, lente 1832 s ; transitions : 7, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.skierg | 500 distance_m | — | — |
| 2 | station | ex.burpee_broad_jump | 40 distance_m | — | — |

**Profil de demande CORE** : lower_knee=moderate, lower_hip=moderate, upper_push=high, upper_pull=high, axial=low, locomotor_impact=low, high_intensity_systemic=high, grip=high

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=station_circuit ; criteria=[admitted_for_role, governed_order]
- `H2_STRUCTURE_REJECTED` — structure=station_circuit@4x3 ; causes=[STATIONS_UNFILLED:2/3]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=1 ; stationId=skierg ; exerciseId=ex.skierg ; criteria=[not_used_recently, neighbour_structure_conflicts:1, relevance:3]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=2 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[not_used_recently, neighbour_structure_conflicts:3, relevance:3, tie_broken_by_id_over:row]
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=true ; neighbours=[crosstraining@144h] ; policy=hybrid_race.h2.neighbourPolicy ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=RACE_PREPARATION ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Semaine à quatre sports

Placement : strength planned le 2026-10-05 ; running planned le 2026-10-11 ; crosstraining planned le 2026-10-08 ; hyrox planned le 2026-10-06 ; strength planned le 2026-10-07 ; running planned le 2026-10-09 ; hyrox planned le 2026-10-10.

Le planificateur ne lit aucune station : la demande HYROX ne porte qu’un archétype de rôle.

## Semaine à quatre sports — HYROX n°1

compromised_running (2 séances déclarées).

**Rôle** : `compromised_running` (RACE_SPECIFIC) — **structure** : `run_station_alternation` — **for time** 3 tour(s), time cap 2907 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 2097 s, lente 2528 s ; transitions : 11, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.skierg | 500 distance_m | — | — |
| 2 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 3 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 4 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |

**Profil de demande CORE** : lower_knee=high, lower_hip=high, upper_push=high, upper_pull=high, axial=high, locomotor_impact=high, high_intensity_systemic=high, grip=high

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=run_station_alternation ; criteria=[admitted_for_role, same_as_last_only_option_left]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=1 ; stationId=skierg ; exerciseId=ex.skierg ; criteria=[not_used_recently, neighbour_structure_conflicts:4, relevance:3]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=2 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, neighbour_structure_conflicts:5, relevance:3, tie_broken_by_id_over:wall_ball]
- `H2_RUN_COMPONENT` — exerciseId=ex.easy_run ; distanceM=800 ; contexts=[after_station] ; pace=BLOCKED:RUNNING_ENGINE_DELEGATION
- `H2_ACCUMULATION` — role=compromised_running ; sharedStructures=[lower_hip, upper_pull] ; status=INTENDED_BY_ROLE
- `H2_HISTORY` — sameRole=1 ; planned=1 ; recentStations=[row, sandbag_lunge] ; lastStructure=run_station_alternation
- `H2_NEIGHBOURS` — known=true ; neighbours=[strength@-24h, running@120h, crosstraining@48h, strength@24h, running@72h] ; policy=hybrid_race.h2.neighbourPolicy ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=RACE_PREPARATION ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Semaine à quatre sports — HYROX n°2

compromised_running (2 séances déclarées).

**Rôle** : `compromised_running` (RACE_SPECIFIC) — **structure** : `run_station_alternation` — **for time** 3 tour(s), time cap 3329 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 2378 s, lente 2894 s ; transitions : 11, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.row_erg | 500 distance_m | — | — |
| 2 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 3 | station | ex.sandbag_lunge | 50 distance_m | 10 kg | — |
| 4 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |

**Profil de demande CORE** : lower_knee=high, lower_hip=high, upper_push=none, upper_pull=high, axial=moderate, locomotor_impact=high, high_intensity_systemic=high, grip=high

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=run_station_alternation ; criteria=[admitted_for_role, same_as_last_only_option_left]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=1 ; stationId=row ; exerciseId=ex.row_erg ; criteria=[not_used_recently, neighbour_structure_conflicts:5, relevance:3, tie_broken_by_id_over:sandbag_lunge]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=2 ; stationId=sandbag_lunge ; exerciseId=ex.sandbag_lunge ; criteria=[not_used_recently, neighbour_structure_conflicts:5, relevance:3, tie_broken_by_id_over:wall_ball]
- `H2_RUN_COMPONENT` — exerciseId=ex.easy_run ; distanceM=800 ; contexts=[after_station] ; pace=BLOCKED:RUNNING_ENGINE_DELEGATION
- `H2_ACCUMULATION` — role=compromised_running ; sharedStructures=[lower_hip, lower_knee] ; status=INTENDED_BY_ROLE
- `H2_HISTORY` — sameRole=1 ; planned=1 ; recentStations=[farmers_carry, skierg] ; lastStructure=run_station_alternation
- `H2_NEIGHBOURS` — known=true ; neighbours=[strength@-120h, running@24h, crosstraining@-48h, strength@-72h, running@-24h] ; policy=hybrid_race.h2.neighbourPolicy ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=RACE_PREPARATION ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Simulation 4 semaines — HYROX (compromised_running + station_capacity) + Running

| Semaine | Séance | Rôle | Structure | Composantes | Réalisation déclarée |
|---|---|---|---|---|---|
| 1 | 2026-10-05 | compromised_running | run_station_alternation | ex.skierg → ex.easy_run → ex.farmers_carry → ex.easy_run | completed_as_prescribed |
| 1 | 2026-10-08 | station_capacity | station_repeats | ex.row_erg | completed_as_prescribed |
| 2 | 2026-10-12 | compromised_running | run_station_alternation | ex.sandbag_lunge → ex.easy_run → ex.wall_ball → ex.easy_run | abandoned |
| 2 | 2026-10-15 | station_capacity | station_repeats | ex.skierg | completed_as_prescribed |
| 3 | 2026-10-19 | compromised_running | run_station_alternation | ex.farmers_carry → ex.easy_run → ex.burpee_broad_jump → ex.easy_run | completed_as_prescribed |
| 3 | 2026-10-22 | station_capacity | station_repeats | ex.row_erg | completed_as_prescribed |
| 4 | 2026-10-26 | compromised_running | run_station_alternation | ex.skierg → ex.easy_run → ex.sandbag_lunge → ex.easy_run | completed_as_prescribed |
| 4 | 2026-10-29 | station_capacity | station_repeats | ex.farmers_carry | completed_as_prescribed |

Aucune dose ne change d’une semaine à l’autre (aucune progression gouvernée) ; seules la variété et la mémoire négative agissent.
