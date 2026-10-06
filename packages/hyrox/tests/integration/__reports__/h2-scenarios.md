# HYROX H2 — scénarios A à G (séances composées)

> Gouvernance TEST_ONLY (draft, provisoire) : aucune valeur n’est une décision, une norme de compétition ni l’ordre officiel de l’épreuve.

## Scénario A — station_capacity (60 min)

HYROX seul, intermédiaire, matériel complet, historique vide.

**Rôle** : `station_capacity` (SPECIFIC) — **structure** : `station_repeats` — **for time** 5 tour(s), time cap 1725 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1091 s, lente 1500 s ; transitions : 4, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.burpee_broad_jump | 40 distance_m | — | — |

**Profil de demande CORE** : lower_knee=low, lower_hip=low, upper_push=none, upper_pull=none, axial=low, locomotor_impact=low, high_intensity_systemic=low, grip=low

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=station_repeats ; criteria=[admitted_for_role, governed_order]
- `H2_STATION_SELECTED` — structure=station_repeats ; position=1 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:farmers_carry]
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario A — strength_endurance (60 min)

HYROX seul, intermédiaire, matériel complet, historique vide.

**Rôle** : `strength_endurance` (SPECIFIC) — **structure** : `station_circuit` — **for time** 4 tour(s), time cap 1702 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1093 s, lente 1480 s ; transitions : 7, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 2 | station | ex.sandbag_lunge | 50 distance_m | 10 kg | — |

**Profil de demande CORE** : lower_knee=low, lower_hip=low, upper_push=none, upper_pull=low, axial=moderate, locomotor_impact=none, high_intensity_systemic=moderate, grip=moderate

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=station_circuit ; criteria=[admitted_for_role, governed_order]
- `H2_STRUCTURE_REJECTED` — structure=station_circuit@4x3 ; causes=[STATIONS_UNFILLED:2/3]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=1 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:sandbag_lunge]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=2 ; stationId=sandbag_lunge ; exerciseId=ex.sandbag_lunge ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:sled_pull]
- `H2_CANDIDATES_REJECTED` — structure=station_circuit ; rejected=[burpee_broad_jump:ROLE_REQUIRES_LOADED_STATION, row:ROLE_REQUIRES_LOADED_STATION, skierg:ROLE_REQUIRES_LOADED_STATION]
- `H2_CANDIDATES_REJECTED` — structure=station_circuit ; rejected=[p3:sled_pull:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p3:sled_push:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p3:wall_ball:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee]
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario A — mixed_station_conditioning (60 min)

HYROX seul, intermédiaire, matériel complet, historique vide.

**Rôle** : `mixed_station_conditioning` (SPECIFIC) — **structure** : `station_circuit` — **for time** 4 tour(s), time cap 1932 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1216 s, lente 1680 s ; transitions : 7, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.burpee_broad_jump | 40 distance_m | — | — |
| 2 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |

**Profil de demande CORE** : lower_knee=low, lower_hip=low, upper_push=none, upper_pull=low, axial=low, locomotor_impact=low, high_intensity_systemic=moderate, grip=moderate

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=station_circuit ; criteria=[admitted_for_role, governed_order]
- `H2_STRUCTURE_REJECTED` — structure=station_circuit@4x3 ; causes=[STATIONS_UNFILLED:2/3]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=1 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:farmers_carry]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=2 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:skierg]
- `H2_CANDIDATES_REJECTED` — structure=station_circuit ; rejected=[p2:row:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p2:sandbag_lunge:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p2:sled_pull:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p2:sled_push:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p2:wall_ball:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee]
- `H2_CANDIDATES_REJECTED` — structure=station_circuit ; rejected=[p3:row:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p3:sandbag_lunge:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p3:skierg:SHARED_DOMINANT_LOCAL_STRUCTURE:upper_pull, p3:sled_pull:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p3:sled_push:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p3:wall_ball:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee]
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario A — compromised_running (60 min)

HYROX seul, intermédiaire, matériel complet, historique vide.

**Rôle** : `compromised_running` (RACE_SPECIFIC) — **structure** : `run_station_alternation` — **for time** 2 tour(s), time cap 2265 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 2352 s, lente 2954 s ; transitions : 7, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.burpee_broad_jump | 40 distance_m | — | — |
| 2 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 3 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 4 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |

**Profil de demande CORE** : lower_knee=high, lower_hip=high, upper_push=none, upper_pull=low, axial=low, locomotor_impact=high, high_intensity_systemic=high, grip=moderate

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=run_station_alternation ; criteria=[admitted_for_role, governed_order]
- `H2_STRUCTURE_REJECTED` — structure=run_station_alternation@3x2 ; causes=[EXCEEDS_AVAILABLE_TIME]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=1 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:farmers_carry]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=2 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:row]
- `H2_RUN_COMPONENT` — exerciseId=ex.easy_run ; distanceM=800 ; contexts=[after_station] ; pace=BLOCKED:RUNNING_ENGINE_DELEGATION
- `H2_ACCUMULATION` — role=compromised_running ; sharedStructures=[lower_hip, lower_knee] ; status=INTENDED_BY_ROLE
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario A — partial_simulation (60 min)

HYROX seul, intermédiaire, matériel complet, historique vide.

**Rôle** : `partial_simulation` (RACE_SPECIFIC) — **structure** : `partial_sequence` — **for time** 1 tour(s), time cap 2242 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1576 s, lente 1949 s ; transitions : 7, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | run | ex.easy_run | 800 distance_m | — | fresh, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 2 | station | ex.burpee_broad_jump | 40 distance_m | — | — |
| 3 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 4 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 5 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 6 | station | ex.row_erg | 500 distance_m | — | — |
| 7 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 8 | station | ex.sandbag_lunge | 50 distance_m | 10 kg | — |

**Profil de demande CORE** : lower_knee=high, lower_hip=high, upper_push=none, upper_pull=high, axial=moderate, locomotor_impact=high, high_intensity_systemic=high, grip=high

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=partial_sequence ; criteria=[admitted_for_role, governed_order]
- `H2_STATION_SELECTED` — structure=partial_sequence ; position=1 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[race_sequence_segment_start:0, fresh_stations_in_segment:4/4]
- `H2_STATION_SELECTED` — structure=partial_sequence ; position=2 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[race_sequence_segment_start:0, fresh_stations_in_segment:4/4]
- `H2_STATION_SELECTED` — structure=partial_sequence ; position=3 ; stationId=row ; exerciseId=ex.row_erg ; criteria=[race_sequence_segment_start:0, fresh_stations_in_segment:4/4]
- `H2_STATION_SELECTED` — structure=partial_sequence ; position=4 ; stationId=sandbag_lunge ; exerciseId=ex.sandbag_lunge ; criteria=[race_sequence_segment_start:0, fresh_stations_in_segment:4/4]
- `H2_RUN_COMPONENT` — exerciseId=ex.easy_run ; distanceM=800 ; contexts=[fresh, after_station] ; pace=BLOCKED:RUNNING_ENGINE_DELEGATION
- `H2_ACCUMULATION` — role=partial_simulation ; sharedStructures=[lower_hip, lower_knee, upper_pull] ; status=INTENDED_BY_ROLE
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario B — station_capacity

Rôle orienté station : une station, répétée (volume gouverné TEST_ONLY).

**Rôle** : `station_capacity` (SPECIFIC) — **structure** : `station_repeats` — **for time** 5 tour(s), time cap 1725 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1091 s, lente 1500 s ; transitions : 4, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.burpee_broad_jump | 40 distance_m | — | — |

**Profil de demande CORE** : lower_knee=low, lower_hip=low, upper_push=none, upper_pull=none, axial=low, locomotor_impact=low, high_intensity_systemic=low, grip=low

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=station_repeats ; criteria=[admitted_for_role, governed_order]
- `H2_STATION_SELECTED` — structure=station_repeats ; position=1 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:farmers_carry]
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario B — strength_endurance

Stations chargées enchaînées (endurance de force spécifique ; la force maximale reste à Strength).

**Rôle** : `strength_endurance` (SPECIFIC) — **structure** : `station_circuit` — **for time** 4 tour(s), time cap 1702 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1093 s, lente 1480 s ; transitions : 7, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 2 | station | ex.sandbag_lunge | 50 distance_m | 10 kg | — |

**Profil de demande CORE** : lower_knee=low, lower_hip=low, upper_push=none, upper_pull=low, axial=moderate, locomotor_impact=none, high_intensity_systemic=moderate, grip=moderate

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=station_circuit ; criteria=[admitted_for_role, governed_order]
- `H2_STRUCTURE_REJECTED` — structure=station_circuit@4x3 ; causes=[STATIONS_UNFILLED:2/3]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=1 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:sandbag_lunge]
- `H2_STATION_SELECTED` — structure=station_circuit ; position=2 ; stationId=sandbag_lunge ; exerciseId=ex.sandbag_lunge ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:sled_pull]
- `H2_CANDIDATES_REJECTED` — structure=station_circuit ; rejected=[burpee_broad_jump:ROLE_REQUIRES_LOADED_STATION, row:ROLE_REQUIRES_LOADED_STATION, skierg:ROLE_REQUIRES_LOADED_STATION]
- `H2_CANDIDATES_REJECTED` — structure=station_circuit ; rejected=[p3:sled_pull:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p3:sled_push:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee, p3:wall_ball:SHARED_DOMINANT_LOCAL_STRUCTURE:lower_knee]
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario C — compromised_running (60 min)

Course APRÈS station, répétée. Distance de course TEST_ONLY, aucune allure (moteur Running).

**Rôle** : `compromised_running` (RACE_SPECIFIC) — **structure** : `run_station_alternation` — **for time** 2 tour(s), time cap 2265 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 2352 s, lente 2954 s ; transitions : 7, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.burpee_broad_jump | 40 distance_m | — | — |
| 2 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 3 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 4 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |

**Profil de demande CORE** : lower_knee=high, lower_hip=high, upper_push=none, upper_pull=low, axial=low, locomotor_impact=high, high_intensity_systemic=high, grip=moderate

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=run_station_alternation ; criteria=[admitted_for_role, governed_order]
- `H2_STRUCTURE_REJECTED` — structure=run_station_alternation@3x2 ; causes=[EXCEEDS_AVAILABLE_TIME]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=1 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:farmers_carry]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=2 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:row]
- `H2_RUN_COMPONENT` — exerciseId=ex.easy_run ; distanceM=800 ; contexts=[after_station] ; pace=BLOCKED:RUNNING_ENGINE_DELEGATION
- `H2_ACCUMULATION` — role=compromised_running ; sharedStructures=[lower_hip, lower_knee] ; status=INTENDED_BY_ROLE
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario D — partial_simulation (60 min)

Segment contigu de l’ordre d’épreuve GOUVERNÉ (ici TEST_ONLY, arbitraire : alphabétique).

**Rôle** : `partial_simulation` (RACE_SPECIFIC) — **structure** : `partial_sequence` — **for time** 1 tour(s), time cap 2242 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1576 s, lente 1949 s ; transitions : 7, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | run | ex.easy_run | 800 distance_m | — | fresh, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 2 | station | ex.burpee_broad_jump | 40 distance_m | — | — |
| 3 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 4 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 5 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 6 | station | ex.row_erg | 500 distance_m | — | — |
| 7 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 8 | station | ex.sandbag_lunge | 50 distance_m | 10 kg | — |

**Profil de demande CORE** : lower_knee=high, lower_hip=high, upper_push=none, upper_pull=high, axial=moderate, locomotor_impact=high, high_intensity_systemic=high, grip=high

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=partial_sequence ; criteria=[admitted_for_role, governed_order]
- `H2_STATION_SELECTED` — structure=partial_sequence ; position=1 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[race_sequence_segment_start:0, fresh_stations_in_segment:4/4]
- `H2_STATION_SELECTED` — structure=partial_sequence ; position=2 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[race_sequence_segment_start:0, fresh_stations_in_segment:4/4]
- `H2_STATION_SELECTED` — structure=partial_sequence ; position=3 ; stationId=row ; exerciseId=ex.row_erg ; criteria=[race_sequence_segment_start:0, fresh_stations_in_segment:4/4]
- `H2_STATION_SELECTED` — structure=partial_sequence ; position=4 ; stationId=sandbag_lunge ; exerciseId=ex.sandbag_lunge ; criteria=[race_sequence_segment_start:0, fresh_stations_in_segment:4/4]
- `H2_RUN_COMPONENT` — exerciseId=ex.easy_run ; distanceM=800 ; contexts=[fresh, after_station] ; pace=BLOCKED:RUNNING_ENGINE_DELEGATION
- `H2_ACCUMULATION` — role=partial_simulation ; sharedStructures=[lower_hip, lower_knee, upper_pull] ; status=INTENDED_BY_ROLE
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario D bis — ordre d’épreuve absent

Paramètre `hybrid_race.h2.raceSequence` absent.

**Résultat : REFUS explicite**

- `PLAN.HYROX.H2_BLOCK_NOT_GENERATED` — kind=cooldown ; cause=ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED
- `PLAN.HYROX.H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `PLAN.HYROX.H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `RULE.HYROX.PARAMETER_UNAVAILABLE` — parameterId=hybrid_race.h2.raceSequence ; cause=MISSING ; mode=CANDIDATE
- `PLAN.HYROX.H2_STRUCTURE_REJECTED` — structure=partial_sequence ; causes=[RACE_SEQUENCE_UNGOVERNED]
- `PLAN.HYROX.H2_NO_STRUCTURE` — role=partial_simulation ; tried=[partial_sequence:RACE_SEQUENCE_UNGOVERNED]

## Scénario E — compromised_running (30 min)

Même rôle, 30 min : première option de volume écartée (time cap au-delà du temps utilisable).

**Rôle** : `compromised_running` (RACE_SPECIFIC) — **structure** : `run_station_alternation` — **for time** 1 tour(s), time cap 1133 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 2352 s, lente 2954 s ; transitions : 3, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.burpee_broad_jump | 40 distance_m | — | — |
| 2 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |
| 3 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |
| 4 | run | ex.easy_run | 800 distance_m | — | after_station, allure BLOCKED:RUNNING_ENGINE_DELEGATION |

**Profil de demande CORE** : lower_knee=high, lower_hip=high, upper_push=none, upper_pull=low, axial=low, locomotor_impact=high, high_intensity_systemic=high, grip=moderate

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=run_station_alternation ; criteria=[admitted_for_role, governed_order]
- `H2_STRUCTURE_REJECTED` — structure=run_station_alternation@3x2 ; causes=[EXCEEDS_AVAILABLE_TIME]
- `H2_STRUCTURE_REJECTED` — structure=run_station_alternation@2x2 ; causes=[EXCEEDS_AVAILABLE_TIME]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=1 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:farmers_carry]
- `H2_STATION_SELECTED` — structure=run_station_alternation ; position=2 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:row]
- `H2_RUN_COMPONENT` — exerciseId=ex.easy_run ; distanceM=800 ; contexts=[after_station] ; pace=BLOCKED:RUNNING_ENGINE_DELEGATION
- `H2_ACCUMULATION` — role=compromised_running ; sharedStructures=[lower_hip, lower_knee] ; status=INTENDED_BY_ROLE
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario F — matériel incomplet (sans traîneau, SkiErg, rameur)

station_capacity, 60 min.

**Rôle** : `station_capacity` (SPECIFIC) — **structure** : `station_repeats` — **for time** 5 tour(s), time cap 1725 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 1091 s, lente 1500 s ; transitions : 4, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.burpee_broad_jump | 40 distance_m | — | — |

**Profil de demande CORE** : lower_knee=low, lower_hip=low, upper_push=none, upper_pull=none, axial=low, locomotor_impact=low, high_intensity_systemic=low, grip=low

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=station_repeats ; criteria=[admitted_for_role, governed_order]
- `H2_STATION_SELECTED` — structure=station_repeats ; position=1 ; stationId=burpee_broad_jump ; exerciseId=ex.burpee_broad_jump ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:farmers_carry]
- `H2_CANDIDATES_REJECTED` — structure=station_repeats ; rejected=[row:EQUIPMENT_MISSING, skierg:EQUIPMENT_MISSING, sled_pull:EQUIPMENT_MISSING, sled_push:EQUIPMENT_MISSING]
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario G — douleur genou (P2), station_capacity

Zones sensibles écartées par HYROX AVANT proposition (aucune substitution du CORE).

**Rôle** : `station_capacity` (SPECIFIC) — **structure** : `station_repeats` — **for time** 5 tour(s), time cap 690 s (prescrit, plafond)
**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique 429 s, lente 600 s ; transitions : 4, durée inconnue

| # | Composante | Mouvement | Dose (unité native) | Charge | Course |
|---|---|---|---|---|---|
| 1 | station | ex.farmers_carry | 100 distance_m | 24 kg | — |

**Profil de demande CORE** : lower_knee=none, lower_hip=low, upper_push=none, upper_pull=low, axial=low, locomotor_impact=none, high_intensity_systemic=low, grip=moderate

**Décisions**

- `H2_STRUCTURE_CHOSEN` — structure=station_repeats ; criteria=[admitted_for_role, governed_order]
- `H2_STATION_SELECTED` — structure=station_repeats ; position=1 ; stationId=farmers_carry ; exerciseId=ex.farmers_carry ; criteria=[not_used_recently, relevance:3, tie_broken_by_id_over:row]
- `H2_CANDIDATES_REJECTED` — structure=station_repeats ; rejected=[burpee_broad_jump:PAIN_AREA, sandbag_lunge:PAIN_AREA, sled_pull:PAIN_AREA, sled_push:PAIN_AREA, wall_ball:PAIN_AREA]
- `H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `H2_GOAL_TRANSPORTED` — goal=GENERAL ; targetTime=absent ; interpretation=NOT_INTERPRETED:no_governed_target_time_model

## Scénario G bis — douleur genou, compromised_running

Course incompatible : refus explicite.

**Résultat : REFUS explicite**

- `PLAN.HYROX.H2_BLOCK_NOT_GENERATED` — kind=warmup ; cause=ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED
- `PLAN.HYROX.H2_BLOCK_NOT_GENERATED` — kind=cooldown ; cause=ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED
- `PLAN.HYROX.H2_HISTORY` — sameRole=0 ; planned=0 ; recentStations=[] ; lastStructure=none
- `PLAN.HYROX.H2_NEIGHBOURS` — known=absent ; neighbours=[] ; policy=none ; priorityPolicy=blocked:priority_interference_policy
- `PLAN.HYROX.H2_STRUCTURE_REJECTED` — structure=run_station_alternation ; causes=[RUN_COMPONENT:PAIN_AREA]
- `PLAN.HYROX.H2_NO_STRUCTURE` — role=compromised_running ; tried=[run_station_alternation:RUN_COMPONENT:PAIN_AREA]
