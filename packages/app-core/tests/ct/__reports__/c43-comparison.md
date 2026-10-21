# C4.3 — comparaison C4.2 → C4.3 (Beta 0, gouvernance TEST_ONLY)

> Chemin app-core réel, matrice identique à C4.2 (intention × niveau × matériel ; chaque cellule cumule 45 / 60 / 75 min, 3 séances, semaine 1). Référence C4.2 figée avant les changements (`c42-baseline.json`). Durées en minutes, estimation du CORE. Aucune valeur n’est validée scientifiquement.

## Synthèse des statuts (5 intentions C4.2)

| Périmètre | C4.2 | C4.3 |
|---|---|---|
| tout | BLOCKED 171 · FULL_SESSION 97 · MAIN_BLOCK_ONLY 2 | BLOCKED 108 · FULL_SESSION 159 · MAIN_BLOCK_ONLY 3 |
| avec ergomètre | BLOCKED 54 · FULL_SESSION 79 · MAIN_BLOCK_ONLY 2 | BLOCKED 54 · FULL_SESSION 79 · MAIN_BLOCK_ONLY 2 |
| sans ergomètre | BLOCKED 117 · FULL_SESSION 18 | BLOCKED 54 · FULL_SESSION 80 · MAIN_BLOCK_ONLY 1 |
| débutant | BLOCKED 54 · FULL_SESSION 36 | BLOCKED 18 · FULL_SESSION 72 |
| intermédiaire | BLOCKED 27 · FULL_SESSION 61 · MAIN_BLOCK_ONLY 2 | FULL_SESSION 87 · MAIN_BLOCK_ONLY 3 |
| avancé | BLOCKED 90 | BLOCKED 90 |

## Formats du bloc principal (séances planifiées)

| Périmètre | C4.2 | C4.3 |
|---|---|---|
| avec ergomètre | amrap 9 · continuous 6 · emom 18 · for_time 6 · intervals 42 | amrap 9 · continuous 6 · emom 18 · for_time 6 · intervals 42 |
| sans ergomètre | amrap 3 · emom 15 | amrap 12 · continuous 12 · emom 15 · intervals 42 |

## Détail par profil

| Intention · niveau · matériel | Statuts C4.2 | Statuts C4.3 | Formats C4.2 | Formats C4.3 | Estimée C4.2 | Estimée C4.3 |
|---|---|---|---|---|---|---|
| mixed_modal_medium · beginner · full | FULL_SESSION 9 | FULL_SESSION 9 | amrap 3 · emom 3 · for_time 3 | amrap 3 · emom 3 · for_time 3 | 40.0 | 40.0 |
| mixed_modal_medium · beginner · no_erg | BLOCKED 9 | FULL_SESSION 9 | — | amrap 9 | — | 38.2 |
| mixed_modal_medium · intermediate · full | FULL_SESSION 9 | FULL_SESSION 9 | amrap 3 · emom 3 · for_time 3 | amrap 3 · emom 3 · for_time 3 | 43.3 | 43.3 |
| mixed_modal_medium · intermediate · no_erg | FULL_SESSION 9 | FULL_SESSION 9 | emom 9 | emom 9 | 38.7 | 38.7 |
| mixed_modal_medium · advanced · full | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| mixed_modal_medium · advanced · no_erg | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| aerobic_capacity · beginner · full | FULL_SESSION 9 | FULL_SESSION 9 | continuous 3 · emom 3 · intervals 3 | continuous 3 · emom 3 · intervals 3 | 44.4 | 44.4 |
| aerobic_capacity · beginner · no_erg | BLOCKED 9 | FULL_SESSION 9 | — | continuous 6 · intervals 3 | — | 41.7 |
| aerobic_capacity · intermediate · full | FULL_SESSION 7 · MAIN_BLOCK_ONLY 2 | FULL_SESSION 7 · MAIN_BLOCK_ONLY 2 | continuous 3 · emom 3 · intervals 3 | continuous 3 · emom 3 · intervals 3 | 50.2 | 50.2 |
| aerobic_capacity · intermediate · no_erg | BLOCKED 9 | FULL_SESSION 8 · MAIN_BLOCK_ONLY 1 | — | continuous 6 · intervals 3 | — | 49.0 |
| aerobic_capacity · advanced · full | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| aerobic_capacity · advanced · no_erg | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| threshold · beginner · full | FULL_SESSION 9 | FULL_SESSION 9 | intervals 9 | intervals 9 | 41.7 | 41.7 |
| threshold · beginner · no_erg | BLOCKED 9 | FULL_SESSION 9 | — | intervals 9 | — | 42.1 |
| threshold · intermediate · full | FULL_SESSION 9 | FULL_SESSION 9 | intervals 9 | intervals 9 | 45.7 | 45.7 |
| threshold · intermediate · no_erg | BLOCKED 9 | FULL_SESSION 9 | — | intervals 9 | — | 43.7 |
| threshold · advanced · full | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| threshold · advanced · no_erg | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| anaerobic_intervals · beginner · full | FULL_SESSION 9 | FULL_SESSION 9 | intervals 9 | intervals 9 | 36.7 | 36.7 |
| anaerobic_intervals · beginner · no_erg | BLOCKED 9 | FULL_SESSION 9 | — | intervals 9 | — | 34.7 |
| anaerobic_intervals · intermediate · full | FULL_SESSION 9 | FULL_SESSION 9 | intervals 9 | intervals 9 | 40.4 | 40.4 |
| anaerobic_intervals · intermediate · no_erg | BLOCKED 9 | FULL_SESSION 9 | — | intervals 9 | — | 38.4 |
| anaerobic_intervals · advanced · full | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| anaerobic_intervals · advanced · no_erg | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| muscular_endurance · beginner · full | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| muscular_endurance · beginner · no_erg | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| muscular_endurance · intermediate · full | FULL_SESSION 9 | FULL_SESSION 9 | amrap 3 · emom 6 | amrap 3 · emom 6 | 43.9 | 43.9 |
| muscular_endurance · intermediate · no_erg | FULL_SESSION 9 | FULL_SESSION 9 | amrap 3 · emom 6 | amrap 3 · emom 6 | 43.9 | 43.9 |
| muscular_endurance · advanced · full | BLOCKED 9 | BLOCKED 9 | — | — | — | — |
| muscular_endurance · advanced · no_erg | BLOCKED 9 | BLOCKED 9 | — | — | — | — |

## Force + conditionnement (nouvelle en C4.3 ; C4.2 : intention non proposée, `CT_INTENT_UNKNOWN`)

| Niveau · matériel | Statuts C4.3 | Formats | Estimée | Bloc de force (moy.) | Principal (moy.) |
|---|---|---|---|---|---|
| beginner · full | BLOCKED 9 | — | — | — | — |
| beginner · no_erg | BLOCKED 9 | — | — | — | — |
| intermediate · full | BLOCKED 3 · FULL_SESSION 6 | amrap 6 | 51.9 | 10.7 | 10.0 |
| intermediate · no_erg | FULL_SESSION 9 | amrap 9 | 45.8 | 10.7 | 10.0 |
| advanced · full | BLOCKED 9 | — | — | — | — |
| advanced · no_erg | BLOCKED 9 | — | — | — | — |

| Matériel déclaré (préréglage) | Statuts | Formats | Estimée |
|---|---|---|---|
| preset.commercial_gym (intermédiaire) | BLOCKED 3 · FULL_SESSION 6 | amrap 6 | 52.2 |
| preset.box (intermédiaire) | BLOCKED 3 · FULL_SESSION 6 | amrap 6 | 52.0 |
| preset.hybrid_race_gym (intermédiaire) | BLOCKED 3 · FULL_SESSION 6 | amrap 6 | 52.6 |
| preset.home_equipped (intermédiaire) | FULL_SESSION 9 | amrap 9 | 46.2 |
| preset.dumbbells_only (intermédiaire) | BLOCKED 9 | — | — |
| preset.bodyweight (intermédiaire) | BLOCKED 9 | — | — |
| preset.full_gym (intermédiaire) | BLOCKED 3 · FULL_SESSION 6 | amrap 6 | 51.9 |

## Variété sur 4 semaines (séances terminées « adaptées »)

| Profil | Formats | WOD distincts / séances | Blocs de force (exercices) | Statuts |
|---|---|---|---|---|
| mixte intermédiaire sans ergomètre | emom | 2 / 12 | — | FULL_SESSION 12 |
| mixte débutant sans ergomètre | amrap | 1 / 12 | — | FULL_SESSION 12 |
| force + conditionnement, salle complète | amrap | 2 / 12 | hack_squat, romanian_deadlift, romanian_deadlift, barbell_ohp, bench_press, bench_press, hack_squat, romanian_deadlift, romanian_deadlift, barbell_ohp, bench_press, bench_press | FULL_SESSION 12 |

## Audit de séances concrètes

| Séance | Objectif | Échauffement | Bloc de force | WOD | Retour au calme | Durée CORE | Charge / interférence | Justification | Signalements | Statut |
|---|---|---|---|---|---|---|---|---|---|---|
| A. force+cond. intermédiaire, salle complète, 60 min · S1 2026-10-05 | Force + conditionnement | warmup_general : row_erg 480 s → warmup_specific : air_squat 3/5/7, band_assisted_pull_up 2/3/4 → warmup_buildups : row_erg 3×20 s | hack_squat : 3 montées + 2×6 RIR 3, repos 120 s | amrap · row_erg 200 m, air_squat 10, band_assisted_pull_up 6 | row_erg 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 50.8 min estimées (39.5 planifiées) / 60 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, governed_order) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | aucun | FULL_SESSION |
| A. force+cond. intermédiaire, salle complète, 60 min · S1 2026-10-07 | Force + conditionnement | warmup_general : row_erg 480 s → warmup_specific : air_squat 3/5/7, band_assisted_pull_up 2/3/4 → warmup_buildups : row_erg 3×20 s | romanian_deadlift : 3 montées + 2×6 RIR 3, repos 120 s | amrap · row_erg 200 m, air_squat 10, band_assisted_pull_up 6 | row_erg 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 51.8 min estimées (40.5 planifiées) / 60 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |
| A. force+cond. intermédiaire, salle complète, 60 min · S1 2026-10-09 | Force + conditionnement | warmup_general : row_erg 480 s → warmup_specific : reverse_lunge_bw 3/5/7/8, pull_up 2/3/4/5 → warmup_buildups : row_erg 3×20 s | romanian_deadlift : 3 montées + 2×6 RIR 3, repos 120 s | amrap · row_erg 200 m, reverse_lunge_bw 10, pull_up 6 | row_erg 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 53.0 min estimées (42.3 planifiées) / 60 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | force identique à la précédente | FULL_SESSION |
| A. force+cond. intermédiaire, salle complète, 60 min · S2 2026-10-12 | Force + conditionnement | warmup_general : row_erg 480 s → warmup_specific : air_squat 3/5/7, band_assisted_pull_up 2/3/4 → warmup_buildups : row_erg 3×20 s | barbell_ohp : 3 montées + 2×6 RIR 3, repos 120 s | amrap · row_erg 200 m, air_squat 10, band_assisted_pull_up 6 | row_erg 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 51.8 min estimées (40.5 planifiées) / 60 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | aucun | FULL_SESSION |
| A. force+cond. intermédiaire, salle complète, 60 min · S2 2026-10-14 | Force + conditionnement | warmup_general : row_erg 480 s → warmup_specific : air_squat 3/5/7, band_assisted_pull_up 2/3/4 → warmup_buildups : row_erg 3×20 s | bench_press : 3 montées + 2×6 RIR 3, repos 120 s | amrap · row_erg 200 m, air_squat 10, band_assisted_pull_up 6 | row_erg 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 51.8 min estimées (40.5 planifiées) / 60 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |
| A. force+cond. intermédiaire, salle complète, 60 min · S2 2026-10-16 | Force + conditionnement | warmup_general : row_erg 480 s → warmup_specific : air_squat 3/5/7, band_assisted_pull_up 2/3/4 → warmup_buildups : row_erg 3×20 s | bench_press : 3 montées + 2×6 RIR 3, repos 120 s | amrap · row_erg 200 m, air_squat 10, band_assisted_pull_up 6 | row_erg 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 51.8 min estimées (40.5 planifiées) / 60 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | répétitive (même format et mêmes mouvements que la précédente) ; force identique à la précédente | FULL_SESSION |
| B. force+cond. intermédiaire, maison équipée, 45 min · S1 2026-10-05 | Force + conditionnement | warmup_general : jumping_jack 2×40 s, inchworm 2×40 s, arm_circles 2×40 s → warmup_specific : air_squat 3/5/7, band_assisted_pull_up 2/3/4 | back_squat : 3 montées + 2×6 RIR 3, repos 120 s | amrap · air_squat 10, band_assisted_pull_up 6 | march_in_place 120 s, hip_mobility_flow 60 s, shoulder_mobility_flow 60 s | 41.1 min estimées (31.1 planifiées) / 45 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, governed_order) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | courte (< 45 min estimées) | FULL_SESSION |
| B. force+cond. intermédiaire, maison équipée, 45 min · S1 2026-10-07 | Force + conditionnement | warmup_general : jumping_jack 2×40 s, inchworm 2×40 s, arm_circles 2×40 s → warmup_specific : air_squat 3/5/7, band_assisted_pull_up 2/3/4 | romanian_deadlift : 3 montées + 2×6 RIR 3, repos 120 s | amrap · air_squat 10, band_assisted_pull_up 6 | march_in_place 120 s, hip_mobility_flow 60 s, shoulder_mobility_flow 60 s | 41.1 min estimées (31.1 planifiées) / 45 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | courte (< 45 min estimées) ; répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |
| B. force+cond. intermédiaire, maison équipée, 45 min · S1 2026-10-09 | Force + conditionnement | warmup_general : jumping_jack 2×40 s, inchworm 2×40 s, arm_circles 2×40 s → warmup_specific : reverse_lunge_bw 3/5/7/8, pull_up 2/3/4/5 | romanian_deadlift : 3 montées + 2×6 RIR 3, repos 120 s | amrap · reverse_lunge_bw 10, pull_up 6 | march_in_place 120 s, hip_mobility_flow 60 s, shoulder_mobility_flow 60 s | 42.3 min estimées (33.0 planifiées) / 45 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | courte (< 45 min estimées) ; force identique à la précédente | FULL_SESSION |
| C. force+cond. intermédiaire, salle complète, 75 min + Musculation 2/sem. · S1 2026-10-06 | Force + conditionnement | warmup_general : row_erg 480 s → warmup_specific : reverse_lunge_bw 3/5/7/8, pull_up 2/3/4/5 → warmup_buildups : row_erg 3×20 s | hip_thrust_machine : 3 montées + 1×6 RIR 5, repos 120 s | amrap · row_erg 200 m, reverse_lunge_bw 10, pull_up 6 | row_erg 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 49.5 min estimées (38.2 planifiées) / 75 dispo | force 1 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | aucun | FULL_SESSION |
| C. force+cond. intermédiaire, salle complète, 75 min + Musculation 2/sem. · S1 2026-10-08 | Force + conditionnement | warmup_general : row_erg 480 s → warmup_specific : air_squat 3/5/7, band_assisted_pull_up 2/3/4 → warmup_buildups : row_erg 3×20 s | hack_squat : 3 montées + 2×6 RIR 5, repos 120 s | amrap · row_erg 200 m, air_squat 10, band_assisted_pull_up 6 | row_erg 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 50.8 min estimées (39.5 planifiées) / 75 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | aucun | FULL_SESSION |
| C. force+cond. intermédiaire, salle complète, 75 min + Musculation 2/sem. · S1 2026-10-09 | Force + conditionnement | warmup_general : row_erg 480 s → warmup_specific : air_squat 3/5/7, band_assisted_pull_up 2/3/4 → warmup_buildups : row_erg 3×20 s | bench_press : 3 montées + 2×6 RIR 3, repos 120 s | amrap · row_erg 200 m, air_squat 10, band_assisted_pull_up 6 | row_erg 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 51.8 min estimées (40.5 planifiées) / 75 dispo | force 2 séries de travail ; structures protégées : aucune | format amrap (admissible_for_stimulus, same_as_last_only_option_left) ; force déléguée : str_ct_block / règle planner.intraSessionInterference.test-0 | répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |
| D. force+cond. débutant, salle complète · S1  | Force + conditionnement | — | — | — | — | — | — | — | délégation non résolue : HOST_REFUSED_WITH_BLOCK ; DELEGATED_STRENGTH_REQUIRES_FULL_SESSION:CORE_REFUSED_FULL_SESSION | REFUSÉE |
| D. force+cond. débutant, salle complète · S1  | Force + conditionnement | — | — | — | — | — | — | — | délégation non résolue : HOST_REFUSED_WITH_BLOCK ; DELEGATED_STRENGTH_REQUIRES_FULL_SESSION:CORE_REFUSED_FULL_SESSION | REFUSÉE |
| D. force+cond. débutant, salle complète · S1  | Force + conditionnement | — | — | — | — | — | — | — | délégation non résolue : HOST_REFUSED_WITH_BLOCK ; DELEGATED_STRENGTH_REQUIRES_FULL_SESSION:CORE_REFUSED_FULL_SESSION | REFUSÉE |
| E. force+cond. poids du corps · S1  | Force + conditionnement | — | — | — | — | — | — | — | délégation non résolue : STRENGTH_BLOCK_WITHOUT_EXTERNAL_LOAD | REFUSÉE |
| E. force+cond. poids du corps · S1  | Force + conditionnement | — | — | — | — | — | — | — | délégation non résolue : STRENGTH_BLOCK_WITHOUT_EXTERNAL_LOAD | REFUSÉE |
| E. force+cond. poids du corps · S1  | Force + conditionnement | — | — | — | — | — | — | — | délégation non résolue : STRENGTH_BLOCK_WITHOUT_EXTERNAL_LOAD | REFUSÉE |
| F. mixte intermédiaire sans ergomètre, 60 min · S1 2026-10-05 | Mixte | warmup_general : jumping_jack 4×40 s, inchworm 4×40 s, arm_circles 4×40 s → warmup_specific : air_squat 2/3/4, push_up 1/2/3 | — | emom · air_squat 6, push_up 4 | march_in_place 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 38.5 min estimées (28.0 planifiées) / 60 dispo | pas de bloc de force | format emom (admissible_for_stimulus, governed_order) | courte (< 45 min estimées) | FULL_SESSION |
| F. mixte intermédiaire sans ergomètre, 60 min · S1 2026-10-07 | Mixte | warmup_general : jumping_jack 4×40 s, inchworm 4×40 s, arm_circles 4×40 s → warmup_specific : air_squat 2/3/4, push_up 1/2/3 | — | emom · air_squat 6, push_up 4 | march_in_place 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 38.5 min estimées (28.0 planifiées) / 60 dispo | pas de bloc de force | format emom (admissible_for_stimulus, same_as_last_only_option_left) | courte (< 45 min estimées) ; répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |
| F. mixte intermédiaire sans ergomètre, 60 min · S1 2026-10-09 | Mixte | warmup_general : jumping_jack 4×40 s, inchworm 4×40 s, arm_circles 4×40 s → warmup_specific : reverse_lunge_bw 2/3/4, incline_push_up 1/2/3 | — | emom · reverse_lunge_bw 6, incline_push_up 4 | march_in_place 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 39.0 min estimées (28.1 planifiées) / 60 dispo | pas de bloc de force | format emom (admissible_for_stimulus, same_as_last_only_option_left) | courte (< 45 min estimées) | FULL_SESSION |
| G. mixte débutant sans ergomètre, 45 min · S1 2026-10-05 | Mixte | warmup_general : march_in_place 4×40 s, inchworm 4×40 s, arm_circles 4×40 s → warmup_specific : reverse_lunge_bw 3/5/7, band_assisted_pull_up 2/3/4 | — | amrap · reverse_lunge_bw 10, band_assisted_pull_up 5 | march_in_place 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 38.2 min estimées (28.1 planifiées) / 45 dispo | pas de bloc de force | format amrap (admissible_for_stimulus, governed_order) | courte (< 45 min estimées) | FULL_SESSION |
| G. mixte débutant sans ergomètre, 45 min · S1 2026-10-07 | Mixte | warmup_general : march_in_place 4×40 s, inchworm 4×40 s, arm_circles 4×40 s → warmup_specific : reverse_lunge_bw 3/5/7, band_assisted_pull_up 2/3/4 | — | amrap · reverse_lunge_bw 10, band_assisted_pull_up 5 | march_in_place 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 38.2 min estimées (28.1 planifiées) / 45 dispo | pas de bloc de force | format amrap (admissible_for_stimulus, same_as_last_only_option_left) | courte (< 45 min estimées) ; répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |
| G. mixte débutant sans ergomètre, 45 min · S1 2026-10-09 | Mixte | warmup_general : march_in_place 4×40 s, inchworm 4×40 s, arm_circles 4×40 s → warmup_specific : reverse_lunge_bw 3/5/7, band_assisted_pull_up 2/3/4 | — | amrap · reverse_lunge_bw 10, band_assisted_pull_up 5 | march_in_place 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 38.2 min estimées (28.1 planifiées) / 45 dispo | pas de bloc de force | format amrap (admissible_for_stimulus, same_as_last_only_option_left) | courte (< 45 min estimées) ; répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |
| H. aérobie intermédiaire sans ergomètre, 75 min · S1 2026-10-05 | Capacité aérobie | warmup_general : easy_run 480 s | — | continuous · easy_run 1800 s | easy_run 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 49.8 min estimées (45.0 planifiées) / 75 dispo | pas de bloc de force | format continuous (admissible_for_stimulus, governed_order) | aucun | FULL_SESSION |
| H. aérobie intermédiaire sans ergomètre, 75 min · S1 2026-10-07 | Capacité aérobie | warmup_general : easy_run 480 s | — | continuous · easy_run 1800 s | easy_run 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 49.8 min estimées (45.0 planifiées) / 75 dispo | pas de bloc de force | format continuous (admissible_for_stimulus, least_recently_used_format) | répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |
| H. aérobie intermédiaire sans ergomètre, 75 min · S1 2026-10-09 | Capacité aérobie | warmup_general : easy_run 480 s → warmup_specific : easy_run 3×20 s | — | intervals · easy_run 300 s | easy_run 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 52.9 min estimées (46.3 planifiées) / 75 dispo | pas de bloc de force | format intervals (admissible_for_stimulus, not_used_in_window) | aucun | FULL_SESSION |
| I. endurance musculaire intermédiaire, salle complète, 45 min · S1 2026-10-05 | Endurance musculaire | warmup_general : row_erg 480 s → warmup_specific : air_squat 1/2/3, push_up 1/1/1, band_assisted_pull_up 1/1/1 | — | emom · air_squat 4, push_up 2, band_assisted_pull_up 2 | row_erg 240 s, shoulder_mobility_flow 90 s, hip_mobility_flow 90 s | 44.5 min estimées (31.0 planifiées) / 45 dispo | pas de bloc de force | format emom (admissible_for_stimulus, governed_order) | courte (< 45 min estimées) | FULL_SESSION |
| I. endurance musculaire intermédiaire, salle complète, 45 min · S1 2026-10-07 | Endurance musculaire | warmup_general : row_erg 300 s → warmup_specific : air_squat 1/2/3/3, push_up 1/1/1/2, pull_up 1/1/1/2 | — | emom · air_squat 4, push_up 2, pull_up 2 | row_erg 120 s, shoulder_mobility_flow 60 s, hip_mobility_flow 60 s | 40.0 min estimées (25.8 planifiées) / 45 dispo | pas de bloc de force | format emom (admissible_for_stimulus, least_recently_used_format) | courte (< 45 min estimées) | FULL_SESSION |
| I. endurance musculaire intermédiaire, salle complète, 45 min · S1 2026-10-09 | Endurance musculaire | warmup_general : row_erg 300 s → warmup_specific : reverse_lunge_bw 4/6/8, air_squat 4/6/8, incline_push_up 3/5/7 | — | amrap · reverse_lunge_bw 12, air_squat 12, incline_push_up 10 | row_erg 120 s, hip_mobility_flow 60 s, shoulder_mobility_flow 60 s | 39.3 min estimées (27.3 planifiées) / 45 dispo | pas de bloc de force | format amrap (admissible_for_stimulus, not_used_in_window) | courte (< 45 min estimées) | FULL_SESSION |
| J. seuil débutant sans ergomètre, 60 min · S1 2026-10-05 | Seuil | warmup_general : easy_run 480 s → warmup_specific : easy_run 3×20 s | — | intervals · easy_run 180 s | easy_run 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 42.1 min estimées (35.3 planifiées) / 60 dispo | pas de bloc de force | format intervals (admissible_for_stimulus, governed_order) | courte (< 45 min estimées) | FULL_SESSION |
| J. seuil débutant sans ergomètre, 60 min · S1 2026-10-07 | Seuil | warmup_general : easy_run 480 s → warmup_specific : easy_run 3×20 s | — | intervals · easy_run 180 s | easy_run 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 42.1 min estimées (35.3 planifiées) / 60 dispo | pas de bloc de force | format intervals (admissible_for_stimulus, same_as_last_only_option_left) | courte (< 45 min estimées) ; répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |
| J. seuil débutant sans ergomètre, 60 min · S1 2026-10-09 | Seuil | warmup_general : easy_run 480 s → warmup_specific : easy_run 3×20 s | — | intervals · easy_run 180 s | easy_run 240 s, hip_mobility_flow 90 s, shoulder_mobility_flow 90 s | 42.1 min estimées (35.3 planifiées) / 60 dispo | pas de bloc de force | format intervals (admissible_for_stimulus, same_as_last_only_option_left) | courte (< 45 min estimées) ; répétitive (même format et mêmes mouvements que la précédente) | FULL_SESSION |

Séances auditées : 33 (dont 27 planifiées, 6 refusées avec cause). Signalements : incohérentes 0, courtes 15, répétitives 11, force identique à la précédente 3.

## Cohérence multisport (Musculation 2/sem. + force + conditionnement 3/sem., semaine 1)

| Date | Sport | Exercices de force (séance Musculation ou bloc délégué) | Séries de travail | Conditionnement |
|---|---|---|---|---|
| 2026-10-05 | strength | back_squat, machine_chest_press, machine_row, walking_lunge_db, machine_lateral_raise, leg_curl, cable_pallof_press, machine_calf_raise, seated_cable_row | 19 | — |
| 2026-10-06 | crosstraining | hip_thrust_machine | 1 | amrap · row_erg, reverse_lunge_bw, pull_up |
| 2026-10-07 | strength | romanian_deadlift, pull_up, db_shoulder_press, bulgarian_split_squat, pec_deck, leg_curl, cable_pallof_press | 14 | — |
| 2026-10-08 | crosstraining | hack_squat | 2 | amrap · row_erg, air_squat, band_assisted_pull_up |
| 2026-10-09 | crosstraining | bench_press | 2 | amrap · row_erg, air_squat, band_assisted_pull_up |

Même exercice de force à J+1 entre Musculation et bloc délégué : aucun — aucune règle gouvernée n'interdit ce cas (M3 ne le signale pas, Strength ne compte que les expositions passées) : **NON RÉSOLU**, décision demandée.

Les séances Musculation sont composées par le moteur Strength avec les blocs délégués de la semaine dans leur historique planifié (volume et alternance, `strength.weeklyVolumeAccounting`) ; à la réalisation, seules les séries réellement faites du bloc délégué alimentent les expositions Strength, jamais la progression (tracks).

