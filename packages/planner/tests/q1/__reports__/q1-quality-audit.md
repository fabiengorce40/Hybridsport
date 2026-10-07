# Q1 — audit de qualité des séances

> Diagnostic de LECTURE (aucune séance modifiée). Valeurs des moteurs : TEST_ONLY / provisoires. Une séance techniquement valide peut être `UNRESOLVED` : c’est le résultat honnête quand aucune règle de qualité approuvée n’existe.

## Tableau 1 — séances

| Sport | Séance | Techniquement valide | Qualité démontrée | Verdict | Pourquoi |
|---|---|---|---|---|---|
| Strength | str_full_body (full body) | oui | non | UNRESOLVED | progression_support: UNRESOLVED (TEST_ONLY) ; volume_target: UNRESOLVED (TEST_ONLY) |
| Running | running.easy | oui | non | UNRESOLVED | dose_coherence: UNRESOLVED (UNRESOLVED) |
| Cross-training | AMRAP 12:00 — SkiErg 250 m, 15 squats, 8 tractions élastique | oui | non | UNRESOLVED | density_coherence: UNRESOLVED (TEST_ONLY) ; dose_coherence: UNRESOLVED (TEST_ONLY) ; movement_balance: UNRESOLVED (UNRESOLVED) ; stimulus_coherence: UNRESOLVED (TEST_ONLY) ; technicality_under_fatigue: UNRESOLVED (TEST_ONLY) |
| HYROX | Endurance de force — 4 × (farmer 100 m @ 24 kg + fentes 50 m @ 10 kg) | oui | non | UNRESOLVED | dose_coherence: UNRESOLVED (TEST_ONLY) ; load_policy: UNRESOLVED (TEST_ONLY) ; local_accumulation: UNRESOLVED (UNRESOLVED) ; station_balance: UNRESOLVED (UNRESOLVED) ; technicality_under_fatigue: UNRESOLVED (TEST_ONLY) ; time_cap_coherence: UNRESOLVED (TEST_ONLY) |
| HYROX | rôle station_capacity | oui | non | UNRESOLVED | dose_coherence: UNRESOLVED (TEST_ONLY) ; load_policy: UNRESOLVED (TEST_ONLY) ; local_accumulation: UNRESOLVED (UNRESOLVED) ; station_balance: UNRESOLVED (UNRESOLVED) ; technicality_under_fatigue: UNRESOLVED (TEST_ONLY) ; time_cap_coherence: UNRESOLVED (TEST_ONLY) |
| HYROX | rôle strength_endurance | oui | non | UNRESOLVED | dose_coherence: UNRESOLVED (TEST_ONLY) ; load_policy: UNRESOLVED (TEST_ONLY) ; local_accumulation: UNRESOLVED (UNRESOLVED) ; station_balance: UNRESOLVED (UNRESOLVED) ; technicality_under_fatigue: UNRESOLVED (TEST_ONLY) ; time_cap_coherence: UNRESOLVED (TEST_ONLY) |
| HYROX | rôle mixed_station_conditioning | oui | non | UNRESOLVED | dose_coherence: UNRESOLVED (TEST_ONLY) ; load_policy: UNRESOLVED (TEST_ONLY) ; local_accumulation: UNRESOLVED (UNRESOLVED) ; station_balance: UNRESOLVED (UNRESOLVED) ; technicality_under_fatigue: UNRESOLVED (TEST_ONLY) ; time_cap_coherence: UNRESOLVED (TEST_ONLY) |
| HYROX | rôle compromised_running | oui | non | UNRESOLVED | dose_coherence: UNRESOLVED (TEST_ONLY) ; load_policy: UNRESOLVED (TEST_ONLY) ; local_accumulation: UNRESOLVED (UNRESOLVED) ; run_component: UNRESOLVED (UNRESOLVED) ; station_balance: UNRESOLVED (UNRESOLVED) ; technicality_under_fatigue: UNRESOLVED (TEST_ONLY) ; time_cap_coherence: UNRESOLVED (TEST_ONLY) |
| HYROX | rôle partial_simulation | oui | non | UNRESOLVED | dose_coherence: UNRESOLVED (TEST_ONLY) ; load_policy: UNRESOLVED (TEST_ONLY) ; local_accumulation: UNRESOLVED (UNRESOLVED) ; run_component: UNRESOLVED (UNRESOLVED) ; station_balance: UNRESOLVED (UNRESOLVED) ; technicality_under_fatigue: UNRESOLVED (TEST_ONLY) ; time_cap_coherence: UNRESOLVED (TEST_ONLY) |
| Cross-training | amrap (crosstraining.1) | oui | non | UNRESOLVED | density_coherence: UNRESOLVED (TEST_ONLY) ; dose_coherence: UNRESOLVED (TEST_ONLY) ; movement_balance: UNRESOLVED (UNRESOLVED) ; stimulus_coherence: UNRESOLVED (TEST_ONLY) ; technicality_under_fatigue: UNRESOLVED (TEST_ONLY) |
| Cross-training | for_time (crosstraining.2) | oui | non | UNRESOLVED | density_coherence: UNRESOLVED (TEST_ONLY) ; dose_coherence: UNRESOLVED (TEST_ONLY) ; movement_balance: UNRESOLVED (UNRESOLVED) ; stimulus_coherence: UNRESOLVED (TEST_ONLY) ; technicality_under_fatigue: UNRESOLVED (TEST_ONLY) |

## Tableau 2 — décisions et provenance

| Décision | Source actuelle | Gouvernance | Suffisant ? | Dette |
|---|---|---|---|---|
| HYROX rôle → structure | hybrid_race.h2.roleStructures + taxonomie H2 (définitions) | TEST_ONLY + DERIVED | cohérence seulement | règle de qualité par rôle |
| HYROX stations / nombre | stationPool, structureVolume (TEST_ONLY), classement (non récent, voisines, pertinence) | TEST_ONLY | non | équilibre des stations, diversité des patterns |
| HYROX doses / charges | hybrid_race.h2.stationDoses | TEST_ONLY | non | doses et charges par rôle et niveau, sources |
| HYROX tours | hybrid_race.h2.structureVolume | TEST_ONLY | non | volume par rôle |
| HYROX time cap | estimation lente (workRates TEST_ONLY) × (1 + timeCapMargin) | TEST_ONLY | non | débits validés, transitions |
| HYROX course / allure | runSegment (TEST_ONLY), allure BLOCKED (Running) | TEST_ONLY / BLOCKED | non | délégation Running |
| CT format | ct.stimulus.admissibleFormats + ordre / variété | TEST_ONLY (EXPERT_PROPOSED) | non | adéquation format ↔ stimulus |
| CT mouvements | movementPool / movementRoles (TEST_ONLY) + classement | TEST_ONLY + catalogue | non | équilibre des patterns par stimulus |
| CT doses / durée | ct.dose.construction | TEST_ONLY | non | doses par format, stimulus, niveau |
| CT densité / plafonds | workRates, emomDensity, repsPerMovementCap, jumpContactsCap | TEST_ONLY | non | densité validée |
| Strength volume / progression | strength.volume, strength.progression (draft, internal_hypothesis) | PROVISIONAL / TEST_ONLY | non | approbation des règles S1–S5 |
| Running doses | gouvernance Running (38 EXPERT_PROPOSED, 10 UNRESOLVED) | EXPERT / candidate | non | approbation Running |
| Intégrité, durée p90 ≤ disponible | CORE (schéma, DurationEngine) | DERIVED | oui (cohérence technique) | — |
| Rotation BALANCED | programme.rotation.* | TEST_ONLY | aucune preuve de qualité (par définition) | politique de programmation |

## A — Strength réelle

| critère | statut | base | faits | raisons |
|---|---|---|---|---|
| duration_coherence | PASS | DERIVED | availableTimeS=3600 ; targetDurationS=3240 ; estimatedP50S=3017 ; estimatedP90S=3519 | p90_within_available_time |
| prescription_integrity | PASS | DERIVED | blocks=4 ; mainBlocks=3 ; items=4 | schema_valid, main_content_present |
| progression_support | UNRESOLVED | TEST_ONLY | declaredAnchors=[] ; blocked=[periodization, split_beyond_candidate, same_discipline_recovery, load_conversion_between_exercises, planned_exercise_rotation, priority_interference_policy, exact_success_progression, bodyweight_overload_method] | value_source:TEST_ONLY, no_approved_quality_range, progression_source:strength.progression |
| volume_target | UNRESOLVED | TEST_ONLY | belowFloor=NaN ; atOrAboveHigh=0 ; noTarget=0 ; weeklySessions=1 | value_source:TEST_ONLY, no_approved_quality_range, volume_source:strength.volume |

## B — Running réelle

| critère | statut | base | faits | raisons |
|---|---|---|---|---|
| dose_coherence | UNRESOLVED | UNRESOLVED | archetypeId=running.easy ; targetDurationS=3450 | value_source:UNRESOLVED, no_approved_quality_range, dose_source:running_governance |
| duration_coherence | PASS | DERIVED | availableTimeS=3600 ; targetDurationS=3450 ; estimatedP50S=1815 ; estimatedP90S=1815 | p90_within_available_time |
| prescription_integrity | PASS | DERIVED | blocks=1 ; mainBlocks=1 ; items=1 | schema_valid, main_content_present |

## C — Cross-training réel observé

Reproduction : stimulus `mixed_modal_medium`, niveau intermédiaire, rameur utilisé il y a 3 jours (sinon le rameur, pertinence catalogue 3, est préféré au SkiErg, pertinence 0).

### Pourquoi ces choix (décisions persistées du moteur)

- `C3_FORMAT_CHOSEN` {"format":"amrap","durationKind":"prescribed","criteria":["admissible_for_stimulus","not_used_in_window"]}
- `C3_MOVEMENT_SELECTED` {"format":"amrap","role":"monostructural","exerciseId":"ex.skierg","criteria":["not_used_recently","technical_cost:1","relevance:0"]}
- `C3_MOVEMENT_SELECTED` {"format":"amrap","role":"lower_body","exerciseId":"ex.air_squat","criteria":["not_used_recently","technical_cost:1","relevance:2"]}
- `C3_MOVEMENT_SELECTED` {"format":"amrap","role":"upper_pull","exerciseId":"ex.band_assisted_pull_up","criteria":["not_used_recently","technical_cost:1","relevance:0"]}
- `C3_DOSE` {"exerciseId":"ex.skierg","quantity":"250 distance_m","load":"none"}
- `C3_DOSE` {"exerciseId":"ex.air_squat","quantity":"15 reps","load":"none"}
- `C3_DOSE` {"exerciseId":"ex.band_assisted_pull_up","quantity":"8 reps","load":"none"}
- `C3_DURATION` {"format":"amrap","kind":"prescribed","prescribedS":720,"estimatedTypicalS":0,"estimatedSlowS":0}

### Provenance

| décision | source | gouvernance | scientifique ? |
|---|---|---|---|
| AMRAP | ct.stimulus.admissibleFormats + ordre gouverné / format le moins récemment utilisé | ct.stimulus.admissibleFormats : EXPERT (maturité EXPERT_PROPOSED) ⇒ TEST_ONLY dans ce diagnostic | non (produit / test) |
| 12 min | ct.dose.construction[mixed_modal_medium][intermediate].amrap.timeCapS = 720 | ct.dose.construction : EXPERT (maturité EXPERT_PROPOSED) ⇒ TEST_ONLY dans ce diagnostic | non (TEST_ONLY) |
| SkiErg | rôle `monostructural` (ct.composition.movementRoles) ; classement : non récent > coût technique > pertinence catalogue > identifiant | TEST_ONLY (réservoir, rôles) + catalogue | non (classement produit) |
| 250 m | ct.dose.construction quantities.monostructural | TEST_ONLY | non |
| squat 15 reps | rôle `lower_body` ; coût technique 1 ; quantité ct.dose.construction | TEST_ONLY | non |
| traction élastique 8 reps | rôle `upper_pull` ; traction stricte écartée ou classée après (coût technique, pertinence) ; quantité TEST_ONLY | TEST_ONLY | non |

| critère | statut | base | faits | raisons |
|---|---|---|---|---|
| density_coherence | UNRESOLVED | TEST_ONLY | format=amrap ; density=self_paced | value_source:TEST_ONLY, no_approved_quality_range |
| dose_coherence | UNRESOLVED | TEST_ONLY | quantities=[ex.skierg:250distance_m, ex.air_squat:15reps, ex.band_assisted_pull_up:8reps] ; estimatedRoundsSlowToFast=3.6-6.1 ; estimatedRoundS=118-202 | value_source:TEST_ONLY, no_approved_quality_range, dose_source:ct.dose.construction |
| duration_coherence | PASS | DERIVED | availableTimeS=3600 ; targetDurationS=3450 ; estimatedP50S=785 ; estimatedP90S=785 | p90_within_available_time |
| excessive_repetition | PASS | DERIVED | identicalToLast=false | not_identical_to_last_session, variety_is_not_quality |
| movement_balance | UNRESOLVED | UNRESOLVED | movements=[ex.skierg, ex.air_squat, ex.band_assisted_pull_up] ; primaryPatterns=[skiing, squat, pull_vertical] ; movementTypes=[monostructural, strength, gymnastic] ; redundant=[] | no_redundancy, no_governed_balance_rule |
| prescription_integrity | PASS | DERIVED | blocks=1 ; mainBlocks=1 ; items=3 | schema_valid, main_content_present |
| stimulus_coherence | UNRESOLVED | TEST_ONLY | stimulus=mixed_modal_medium ; format=amrap ; blockS=720 ; timeDomain=480-900s | value_source:TEST_ONLY, no_approved_quality_range, format_source:ct.stimulus.admissibleFormats, duration_source:ct.dose.construction |
| technicality_under_fatigue | UNRESOLVED | TEST_ONLY | maxTechnicalCost=1 | value_source:TEST_ONLY, no_approved_quality_range |

## D — HYROX réel observé : Endurance de force

| calcul | valeur |
|---|---|
| distance totale farmer walk | 4 × 100 m = 400 m @ 24 kg |
| distance totale fentes sandbag | 4 × 50 m = 200 m @ 10 kg |
| passages de station | 2 stations × 4 tours = 8 |
| durée estimée (débits TEST_ONLY) | typique 1093 s, lente 1480 s ; time cap = lente × 1,15 = 1702 s ; transitions (7) non chiffrées |
| profil de demande CORE | lower_knee=high, lower_hip=high, upper_push=none, upper_pull=high, axial=high, locomotor_impact=none, high_intensity_systemic=high, grip=high |
| patterns / répétition locale | {"accumulationIntendedByRole":false,"passesPerPattern":["carry:4","lunge:4"]} |
| diversité | {"distinctStations":2,"stations":["farmers_carry","sandbag_lunge"],"rounds":4,"stationPasses":8,"primaryPatterns":["carry","lunge"],"distinctPrimaryPatterns":2,"repeatedFamilies":[]} |
| provenance des charges | hybrid_race.h2.stationDoses : statut draft, provisoire true, source internal_hypothesis ⇒ TEST_ONLY |
| provenance des distances | hybrid_race.h2.stationDoses : statut draft, provisoire true, source internal_hypothesis ⇒ TEST_ONLY |
| provenance des tours | hybrid_race.h2.structureVolume : statut draft, provisoire true, source internal_hypothesis ⇒ TEST_ONLY |
| options de volume (trace) | station_circuit@4x3 écartée (STATIONS_UNFILLED:2/3) |
| choix des stations (trace) | farmers_carry [not_used_recently, relevance:3, tie_broken_by_id_over:sandbag_lunge] ; sandbag_lunge [not_used_recently, relevance:3, tie_broken_by_id_over:sled_pull] |

**Constat** : les deux stations ont la même pertinence catalogue (3) que d’autres stations chargées ; le choix final est un DÉPARTAGE PAR IDENTIFIANT (ordre alphabétique), et la troisième station du circuit 4×3 n’a pas pu être remplie (incompatibilités de redondance / structure locale). Rien ne relie ce choix à un objectif « endurance de force HYROX ».

**Qu’est-ce qui prouve que cette séance est adaptée au rôle Endurance de force HYROX ?** Seulement sa cohérence DÉFINITIONNELLE : structure `station_circuit` admise pour le rôle, deux stations CHARGÉES (exigence du rôle), aucune course. Les distances, charges, nombre de tours, nombre de stations et la durée viennent UNIQUEMENT de paramètres `hybrid_race.h2.*` TEST_ONLY (draft, provisoires, hypothèse interne) : le diagnostic les classe UNRESOLVED (`no_approved_quality_range`). Aucune preuve sportive n’existe.

| critère | statut | base | faits | raisons |
|---|---|---|---|---|
| dose_coherence | UNRESOLVED | TEST_ONLY | perStationTotal=[farmers_carry:400distance_m@24kg, sandbag_lunge:200distance_m@10kg] ; rounds=4 ; runDistanceTotalM=0 | value_source:TEST_ONLY, no_approved_quality_range, dose_source:hybrid_race.h2.stationDoses, rounds_source:hybrid_race.h2.structureVolume |
| duration_coherence | PASS | DERIVED | availableTimeS=3600 ; targetDurationS=3300 ; estimatedP50S=1015 ; estimatedP90S=1392 | p90_within_available_time |
| load_policy | UNRESOLVED | TEST_ONLY | loads=[ex.farmers_carry@24kg, ex.sandbag_lunge@10kg] | value_source:TEST_ONLY, no_approved_quality_range, load_source:hybrid_race.h2.stationDoses |
| local_accumulation | UNRESOLVED | UNRESOLVED | accumulationIntendedByRole=false ; passesPerPattern=[carry:4, lunge:4] | no_governed_local_volume_limit |
| prescription_integrity | PASS | DERIVED | blocks=1 ; mainBlocks=1 ; items=2 | schema_valid, main_content_present |
| role_specificity | PASS | DERIVED | role=strength_endurance ; specificity=SPECIFIC ; structure=station_circuit ; stationsRequired=loaded ; allStationsLoaded=true | structure_fits_role_definition, station_load_requirement_met, role_definition_is_vocabulary_not_dose_evidence |
| station_balance | UNRESOLVED | UNRESOLVED | distinctStations=2 ; stations=[farmers_carry, sandbag_lunge] ; rounds=4 ; stationPasses=8 ; primaryPatterns=[carry, lunge] ; distinctPrimaryPatterns=2 ; repeatedFamilies=[] | no_governed_station_count_rule, no_governed_pattern_balance_rule |
| technicality_under_fatigue | UNRESOLVED | TEST_ONLY | maxTechnicalCost=1 ; stationsAfterFirstPosition=7 | value_source:TEST_ONLY, no_approved_quality_range |
| time_cap_coherence | UNRESOLVED | TEST_ONLY | timeCapS=1702 ; estimatedTypicalS=1093 ; estimatedSlowS=1480 ; transitions=7 ; transitionDuration=unknown | value_source:TEST_ONLY, no_approved_quality_range, estimate_source:hybrid_race.h2.workRates, transitions_excluded_from_estimate |

## F — Composée mais non placée (2026-10-05.running.2)

Même calcul que pour une séance placée (port du sport, prescription persistée). Verdict : UNRESOLVED.

## G — Semaine quatre sports après M3

Statut M3 : PARTIAL ; décisions : aucune.

| séance | verdict | non démontrés |
|---|---|---|
| 2026-10-05.hyrox.1 (hybrid_race.h2.compromised_running) | UNRESOLVED | dose_coherence, load_policy, local_accumulation, run_component, station_balance, technicality_under_fatigue, time_cap_coherence |
| 2026-10-05.running.1 (running.easy) | UNRESOLVED | dose_coherence |
| 2026-10-05.strength.1 (str_full_body) | UNRESOLVED | progression_support, volume_target |
| 2026-10-05.crosstraining.1 (crosstraining.mixed_modal_medium) | UNRESOLVED | density_coherence, dose_coherence, movement_balance, stimulus_coherence, technicality_under_fatigue |
| 2026-10-05.hyrox.2 (hybrid_race.h2.compromised_running) | UNRESOLVED | dose_coherence, load_policy, local_accumulation, run_component, station_balance, technicality_under_fatigue, time_cap_coherence |
| 2026-10-05.running.2 (running.easy) | UNRESOLVED | dose_coherence |
| 2026-10-05.strength.2 (str_full_body) | UNRESOLVED | progression_support, volume_target |

## J — Matériel limité (Cross-training sans ergomètre)

séance emom : ex.air_squat, ex.push_up — verdict UNRESOLVED

## Audit des cinq rôles H2

BALANCED n’est PAS une preuve de qualité : il fait seulement tourner ces rôles (voir app-core, scénario E).

| rôle H2 | structure | stations | tours | time cap | verdict | non démontrés |
|---|---|---|---|---|---|---|
| station_capacity | station_repeats | burpee_broad_jump 40 m | 5 | 1725 s | UNRESOLVED | dose_coherence, load_policy, local_accumulation, station_balance, technicality_under_fatigue, time_cap_coherence |
| strength_endurance | station_circuit | farmers_carry 100 m @ 24 kg + sandbag_lunge 50 m @ 10 kg | 4 | 1702 s | UNRESOLVED | dose_coherence, load_policy, local_accumulation, station_balance, technicality_under_fatigue, time_cap_coherence |
| mixed_station_conditioning | station_circuit | burpee_broad_jump 40 m + farmers_carry 100 m @ 24 kg | 4 | 1932 s | UNRESOLVED | dose_coherence, load_policy, local_accumulation, station_balance, technicality_under_fatigue, time_cap_coherence |
| compromised_running | run_station_alternation | burpee_broad_jump 40 m + farmers_carry 100 m @ 24 kg | 2 | 2265 s | UNRESOLVED | dose_coherence, load_policy, local_accumulation, run_component, station_balance, technicality_under_fatigue, time_cap_coherence |
| partial_simulation | partial_sequence | burpee_broad_jump 40 m + farmers_carry 100 m @ 24 kg + row_erg 500 m + sandbag_lunge 50 m @ 10 kg | 1 | 2242 s | UNRESOLVED | dose_coherence, load_policy, local_accumulation, run_component, station_balance, technicality_under_fatigue, time_cap_coherence |

## Audit des formats C3 (semaine à deux séances)

VARIÉTÉ (formats et mouvements différents) ≠ COHÉRENCE ≠ QUALITÉ.

| séance C3 | format | mouvements | verdict |
|---|---|---|---|
| 2026-10-05.crosstraining.1 | amrap | row_erg, air_squat, band_assisted_pull_up | UNRESOLVED |
| 2026-10-05.crosstraining.2 | for_time | skierg, reverse_lunge_bw, push_up | UNRESOLVED |
