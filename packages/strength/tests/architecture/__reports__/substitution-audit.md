# Audit des substitutions Strength — contrat strength-substitution-1.0.0, catalogue 0.2.0-strength-test

- Exercices Strength actifs : 48
- Couples AVANT (même besoin d'emplacement, hors contexte) : 174
- Couples APRÈS (substituts directs) : 8
- Couples AVANT supprimés : 166
- Substitutions déclarées : 30 (refusées par le contrat : 22)
- Couples compatibles par métadonnées mais NON déclarés (données manquantes, non proposés) : 38
- Exercices sans aucun substitut direct : 42

| Exercice | Besoin(s) | Avant | Déclarées (verdict) | Après | Compatibles non déclarés |
|---|---|---|---|---|---|
| ex.air_squat | knee_dominant | ex.back_squat, ex.goblet_squat, ex.hack_squat, ex.leg_press | ex.goblet_squat (low) : refusée — loadable, low_fidelity | — | — |
| ex.back_squat | knee_dominant | ex.air_squat, ex.goblet_squat, ex.hack_squat, ex.leg_press | ex.goblet_squat (medium) : DIRECT ; ex.leg_press (medium) : DIRECT | ex.goblet_squat, ex.leg_press | ex.hack_squat |
| ex.band_assisted_pull_up | pull_vertical | ex.lat_pulldown, ex.pull_up | ex.lat_pulldown (medium) : refusée — movement_type, loadable | — | — |
| ex.barbell_ohp | push_vertical | ex.db_shoulder_press, ex.machine_shoulder_press | — | — | ex.db_shoulder_press, ex.machine_shoulder_press |
| ex.bench_press | push_horizontal | ex.db_bench_press, ex.incline_push_up, ex.machine_chest_press, ex.push_up | ex.db_bench_press (medium) : DIRECT ; ex.machine_chest_press (medium) : DIRECT | ex.db_bench_press, ex.machine_chest_press | — |
| ex.bulgarian_split_squat | single_leg | ex.reverse_lunge_bw, ex.sandbag_lunge, ex.walking_lunge_db | ex.reverse_lunge_bw (medium) : refusée — laterality, loadable | — | — |
| ex.cable_curl | isolation_upper | ex.cable_fly, ex.cable_lateral_raise, ex.cable_triceps_pushdown, ex.db_curl, ex.db_lateral_raise, ex.machine_lateral_raise, ex.pec_deck | — | — | ex.db_curl |
| ex.cable_fly | isolation_upper | ex.cable_curl, ex.cable_lateral_raise, ex.cable_triceps_pushdown, ex.db_curl, ex.db_lateral_raise, ex.machine_lateral_raise, ex.pec_deck | ex.db_bench_press (low) : refusée — pattern, primary_muscles, compound, low_fidelity | — | ex.pec_deck |
| ex.cable_lateral_raise | isolation_upper | ex.cable_curl, ex.cable_fly, ex.cable_triceps_pushdown, ex.db_curl, ex.db_lateral_raise, ex.machine_lateral_raise, ex.pec_deck | — | — | ex.db_lateral_raise, ex.machine_lateral_raise |
| ex.cable_pallof_press | trunk | ex.dead_bug, ex.plank | — | — | — |
| ex.cable_triceps_pushdown | isolation_upper | ex.cable_curl, ex.cable_fly, ex.cable_lateral_raise, ex.db_curl, ex.db_lateral_raise, ex.machine_lateral_raise, ex.pec_deck | — | — | — |
| ex.db_bench_press | push_horizontal | ex.bench_press, ex.incline_push_up, ex.machine_chest_press, ex.push_up | ex.push_up (medium) : refusée — loadable | — | ex.bench_press, ex.machine_chest_press |
| ex.db_calf_raise | isolation_lower | ex.leg_curl, ex.leg_extension, ex.machine_calf_raise | — | — | ex.machine_calf_raise |
| ex.db_curl | isolation_upper | ex.cable_curl, ex.cable_fly, ex.cable_lateral_raise, ex.cable_triceps_pushdown, ex.db_lateral_raise, ex.machine_lateral_raise, ex.pec_deck | — | — | ex.cable_curl |
| ex.db_lateral_raise | isolation_upper | ex.cable_curl, ex.cable_fly, ex.cable_lateral_raise, ex.cable_triceps_pushdown, ex.db_curl, ex.machine_lateral_raise, ex.pec_deck | — | — | ex.cable_lateral_raise, ex.machine_lateral_raise |
| ex.db_rdl | hip_dominant | ex.hip_thrust_barbell, ex.hip_thrust_machine, ex.kb_swing, ex.romanian_deadlift, ex.single_leg_rdl_db | — | — | ex.romanian_deadlift |
| ex.db_row | pull_horizontal | ex.machine_row, ex.seated_cable_row | ex.seated_cable_row (medium) : refusée — laterality | — | — |
| ex.db_shoulder_press | push_vertical | ex.barbell_ohp, ex.machine_shoulder_press | ex.push_up (low) : refusée — pattern, primary_muscles, loadable, low_fidelity | — | ex.barbell_ohp, ex.machine_shoulder_press |
| ex.dead_bug | trunk | ex.cable_pallof_press, ex.plank | — | — | — |
| ex.farmers_carry | carry | — | ex.sandbag_lunge (low) : refusée — pattern, primary_muscles, movement_type, laterality, low_fidelity | — | — |
| ex.goblet_squat | knee_dominant | ex.air_squat, ex.back_squat, ex.hack_squat, ex.leg_press | ex.air_squat (low) : refusée — loadable, low_fidelity | — | ex.back_squat, ex.hack_squat, ex.leg_press |
| ex.hack_squat | knee_dominant | ex.air_squat, ex.back_squat, ex.goblet_squat, ex.leg_press | — | — | ex.back_squat, ex.goblet_squat, ex.leg_press |
| ex.hip_mobility_flow | — | — | — | — | ex.lower_mobility_flow |
| ex.hip_thrust_barbell | hip_dominant | ex.db_rdl, ex.hip_thrust_machine, ex.kb_swing, ex.romanian_deadlift, ex.single_leg_rdl_db | — | — | ex.hip_thrust_machine |
| ex.hip_thrust_machine | hip_dominant | ex.db_rdl, ex.hip_thrust_barbell, ex.kb_swing, ex.romanian_deadlift, ex.single_leg_rdl_db | — | — | ex.hip_thrust_barbell |
| ex.incline_push_up | push_horizontal | ex.bench_press, ex.db_bench_press, ex.machine_chest_press, ex.push_up | ex.push_up (medium) : DIRECT | ex.push_up | — |
| ex.kb_swing | hip_dominant | ex.db_rdl, ex.hip_thrust_barbell, ex.hip_thrust_machine, ex.romanian_deadlift, ex.single_leg_rdl_db | ex.romanian_deadlift (low) : refusée — movement_type, low_fidelity | — | — |
| ex.lat_pulldown | pull_vertical | ex.band_assisted_pull_up, ex.pull_up | ex.band_assisted_pull_up (medium) : refusée — movement_type, loadable | — | — |
| ex.leg_curl | isolation_lower | ex.db_calf_raise, ex.leg_extension, ex.machine_calf_raise | ex.single_leg_rdl_db (low) : refusée — pattern, primary_muscles, compound, laterality, low_fidelity | — | — |
| ex.leg_extension | isolation_lower | ex.db_calf_raise, ex.leg_curl, ex.machine_calf_raise | — | — | — |
| ex.leg_press | knee_dominant | ex.air_squat, ex.back_squat, ex.goblet_squat, ex.hack_squat | ex.goblet_squat (medium) : DIRECT | ex.goblet_squat | ex.back_squat, ex.hack_squat |
| ex.lower_mobility_flow | — | — | — | — | ex.hip_mobility_flow |
| ex.machine_calf_raise | isolation_lower | ex.db_calf_raise, ex.leg_curl, ex.leg_extension | — | — | ex.db_calf_raise |
| ex.machine_chest_press | push_horizontal | ex.bench_press, ex.db_bench_press, ex.incline_push_up, ex.push_up | ex.db_bench_press (medium) : DIRECT | ex.db_bench_press | ex.bench_press |
| ex.machine_lateral_raise | isolation_upper | ex.cable_curl, ex.cable_fly, ex.cable_lateral_raise, ex.cable_triceps_pushdown, ex.db_curl, ex.db_lateral_raise, ex.pec_deck | — | — | ex.cable_lateral_raise, ex.db_lateral_raise |
| ex.machine_row | pull_horizontal | ex.db_row, ex.seated_cable_row | ex.seated_cable_row (medium) : DIRECT | ex.seated_cable_row | — |
| ex.machine_shoulder_press | push_vertical | ex.barbell_ohp, ex.db_shoulder_press | — | — | ex.barbell_ohp, ex.db_shoulder_press |
| ex.pec_deck | isolation_upper | ex.cable_curl, ex.cable_fly, ex.cable_lateral_raise, ex.cable_triceps_pushdown, ex.db_curl, ex.db_lateral_raise, ex.machine_lateral_raise | — | — | ex.cable_fly |
| ex.plank | trunk | ex.cable_pallof_press, ex.dead_bug | ex.push_up (low) : refusée — pattern, primary_muscles, compound, movement_type, prescription_type, low_fidelity | — | — |
| ex.pull_up | pull_vertical | ex.band_assisted_pull_up, ex.lat_pulldown | ex.band_assisted_pull_up (medium) : refusée — loadable ; ex.lat_pulldown (medium) : refusée — movement_type | — | — |
| ex.push_up | push_horizontal | ex.bench_press, ex.db_bench_press, ex.incline_push_up, ex.machine_chest_press | ex.db_bench_press (medium) : refusée — loadable | — | ex.incline_push_up |
| ex.reverse_lunge_bw | single_leg | ex.bulgarian_split_squat, ex.sandbag_lunge, ex.walking_lunge_db | ex.bulgarian_split_squat (medium) : refusée — laterality, loadable | — | — |
| ex.romanian_deadlift | hip_dominant | ex.db_rdl, ex.hip_thrust_barbell, ex.hip_thrust_machine, ex.kb_swing, ex.single_leg_rdl_db | ex.single_leg_rdl_db (medium) : refusée — laterality ; ex.kb_swing (low) : refusée — movement_type, low_fidelity | — | ex.db_rdl |
| ex.sandbag_lunge | single_leg | ex.bulgarian_split_squat, ex.reverse_lunge_bw, ex.walking_lunge_db | ex.reverse_lunge_bw (low) : refusée — prescription_type, loadable, low_fidelity | — | — |
| ex.seated_cable_row | pull_horizontal | ex.db_row, ex.machine_row | ex.db_row (medium) : refusée — laterality | — | ex.machine_row |
| ex.shoulder_mobility_flow | — | — | — | — | — |
| ex.single_leg_rdl_db | hip_dominant | ex.db_rdl, ex.hip_thrust_barbell, ex.hip_thrust_machine, ex.kb_swing, ex.romanian_deadlift | ex.romanian_deadlift (medium) : refusée — laterality | — | — |
| ex.walking_lunge_db | single_leg | ex.bulgarian_split_squat, ex.reverse_lunge_bw, ex.sandbag_lunge | — | — | — |
