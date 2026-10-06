# Cross-training C3 — scénarios A, D, E, F

> Généré par les tests (TEST_ONLY / SIMULATION_ONLY). Aucune valeur n’est approuvée.

## Scénario A — Cross-training seul (intermédiaire, 60 min, matériel complet)

Stimulus `mixed_modal_medium`, historique vide.

- **Intention** : stimulus `mixed_modal_medium`, niveau intermediate, temps disponible 3600 s, priorité [] (rang 0), voisines 0
- **Structure** : warmup, conditioning · warmup non généré (ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED)
- **Voisines / priorité** : connues=absent, [], interprétation=none, priorité=blocked:priority_interference_policy
- **Historique** : 0 séance(s) du même stimulus dans la fenêtre, dernier format none, mouvements récents []
- **Format** : `amrap` (admissible_for_stimulus, governed_order)
- **Durée** : PRESCRITE 720 s · tour estimé 144 s (rapide 114.3, lent 193.6) · CORE : p50 795 s · p90 795 s
- **Densité** : self_paced (self_paced)

| Rôle | Mouvement | Dose | Charge | Raisons |
|---|---|---|---|---|
| monostructural | ex.row_erg | 250 distance_m | — | not_used_recently, technical_cost:1, relevance:3 |
| lower_body | ex.air_squat | 15 reps | — | not_used_recently, technical_cost:1, relevance:2 |
| upper_pull | ex.band_assisted_pull_up | 8 reps | — | not_used_recently, technical_cost:1, relevance:0 |

- Candidats écartés (lower_body) : ex.wall_ball:LOAD_POLICY_UNGOVERNED, ex.kb_swing:LOAD_POLICY_UNGOVERNED
- **Profil de demande (CORE)** : lower_knee=moderate, lower_hip=low, upper_pull=moderate, high_intensity_systemic=moderate, grip=low
- **Résultat CORE** : séance publiée, identique à la proposition
- **Provenance** : 15 paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ct.composition.movementPool, ct.composition.movementRoles, ct.composition.sessionStructure, ct.dose.construction, ct.estimation.workRates, ct.history.negativeResponse, ct.history.recencyBand, ct.return.protocol, ct.safety.novelEccentricVolume, ct.safety.novicePolicy, ct.safety.repsPerMovementCap, ct.safety.technicalUnderFatigue, ct.stimulus.admissibleFormats, ct.stimulus.catalog, ct.stimulus.timeDomains

## Aperçu par stimulus (intermédiaire, 60 min, matériel complet)

| Stimulus | Résultat | Format | Mouvements | Durée |
|---|---|---|---|---|
| strength_plus_conditioning | refus | — | — | C3_STRUCTURE_UNAVAILABLE STRENGTH_ENGINE_DELEGATION_UNAVAILABLE |
| aerobic_capacity | composé | continuous | ex.row_erg | prescribed 1800 s |
| threshold | composé | intervals | ex.row_erg | prescribed 1320 s |
| anaerobic_intervals | composé | intervals | ex.row_erg | prescribed 840 s |
| mixed_modal_medium | composé | amrap | ex.row_erg, ex.air_squat, ex.band_assisted_pull_up | prescribed 720 s |
| muscular_endurance | composé | emom | ex.air_squat, ex.push_up, ex.band_assisted_pull_up | prescribed 900 s |
| skill_plus_conditioning | refus | — | — | C3_STRUCTURE_UNAVAILABLE SKILL_ACQUISITION_UNMODELLED |
| long_chipper | refus | — | — | C3_STIMULUS_OUT_OF_SCOPE CHIPPER_LEVEL_POLICY_UNGOVERNED |
| benchmark | refus | — | — | C3_STIMULUS_OUT_OF_SCOPE BENCHMARK_OUT_OF_SCOPE |

## Scénario D — 30 min (intermédiaire)

Stimulus `mixed_modal_medium`, 30 min disponibles.

- **Intention** : stimulus `mixed_modal_medium`, niveau intermediate, temps disponible 1800 s, priorité [] (rang 0), voisines 0
- **Structure** : warmup, conditioning · warmup non généré (ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED)
- **Voisines / priorité** : connues=absent, [], interprétation=none, priorité=blocked:priority_interference_policy
- **Historique** : 0 séance(s) du même stimulus dans la fenêtre, dernier format none, mouvements récents []
- **Format** : `amrap` (admissible_for_stimulus, governed_order)
- **Durée** : PRESCRITE 720 s · tour estimé 144 s (rapide 114.3, lent 193.6) · CORE : p50 795 s · p90 795 s
- **Densité** : self_paced (self_paced)

| Rôle | Mouvement | Dose | Charge | Raisons |
|---|---|---|---|---|
| monostructural | ex.row_erg | 250 distance_m | — | not_used_recently, technical_cost:1, relevance:3 |
| lower_body | ex.air_squat | 15 reps | — | not_used_recently, technical_cost:1, relevance:2 |
| upper_pull | ex.band_assisted_pull_up | 8 reps | — | not_used_recently, technical_cost:1, relevance:0 |

- Candidats écartés (lower_body) : ex.wall_ball:LOAD_POLICY_UNGOVERNED, ex.kb_swing:LOAD_POLICY_UNGOVERNED
- **Profil de demande (CORE)** : lower_knee=moderate, lower_hip=low, upper_pull=moderate, high_intensity_systemic=moderate, grip=low
- **Résultat CORE** : séance publiée, identique à la proposition
- **Provenance** : 15 paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ct.composition.movementPool, ct.composition.movementRoles, ct.composition.sessionStructure, ct.dose.construction, ct.estimation.workRates, ct.history.negativeResponse, ct.history.recencyBand, ct.return.protocol, ct.safety.novelEccentricVolume, ct.safety.novicePolicy, ct.safety.repsPerMovementCap, ct.safety.technicalUnderFatigue, ct.stimulus.admissibleFormats, ct.stimulus.catalog, ct.stimulus.timeDomains

## Scénario D bis — 20 min en capacité aérobie

Stimulus `aerobic_capacity`, 20 min : toutes les doses TEST_ONLY dépassent le temps.

- Format écarté `continuous` : EXCEEDS_AVAILABLE_TIME
- Format écarté `intervals` : EXCEEDS_AVAILABLE_TIME
- Format écarté `emom` : EXCEEDS_AVAILABLE_TIME
- **Refus** : PLAN.CROSSTRAINING.C3_NO_FORMAT {"stimulus":"aerobic_capacity","tried":["continuous:EXCEEDS_AVAILABLE_TIME","intervals:EXCEEDS_AVAILABLE_TIME","emom:EXCEEDS_AVAILABLE_TIME"]}
- **Profil de demande (CORE)** : —
- **Résultat CORE** : refus NO_VALID_SOLUTION
- **Provenance** : 4 paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ct.estimation.workRates, ct.format.emomDensity, ct.safety.repsPerMovementCap, ct.stimulus.workRestRatios

## Scénario E — matériel limité

Barre de traction et élastiques seulement.

- **Intention** : stimulus `mixed_modal_medium`, niveau intermediate, temps disponible 3600 s, priorité [] (rang 0), voisines 0
- **Structure** : warmup, conditioning · warmup non généré (ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED)
- **Voisines / priorité** : connues=absent, [], interprétation=none, priorité=blocked:priority_interference_policy
- **Historique** : 0 séance(s) du même stimulus dans la fenêtre, dernier format none, mouvements récents []
- Format écarté `amrap` : ROLE_UNFILLED:monostructural
- Format écarté `for_time` : ROLE_UNFILLED:monostructural
- **Format** : `emom` (admissible_for_stimulus, governed_order, after_rejected:amrap|for_time)
- **Durée** : PRESCRITE 720 s · tour estimé 26.4 s (rapide 21.6, lent 40) · CORE : p50 735 s · p90 735 s
- **Densité** : estimated (work_per_minute_slow=40s/max=45s)

| Rôle | Mouvement | Dose | Charge | Raisons |
|---|---|---|---|---|
| lower_body | ex.air_squat | 6 reps | — | not_used_recently, technical_cost:1, relevance:2 |
| upper_push | ex.push_up | 4 reps | — | not_used_recently, technical_cost:1, relevance:3 |

- Candidats écartés (lower_body) : ex.box_jump:EQUIPMENT_MISSING, ex.wall_ball:EQUIPMENT_MISSING+LOAD_POLICY_UNGOVERNED, ex.kb_swing:EQUIPMENT_MISSING+LOAD_POLICY_UNGOVERNED
- Candidats écartés (upper_push) : ex.incline_push_up:EQUIPMENT_MISSING
- **Profil de demande (CORE)** : lower_knee=low, lower_hip=low, upper_push=low, high_intensity_systemic=low
- **Résultat CORE** : séance publiée, identique à la proposition
- **Provenance** : 16 paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ct.composition.movementPool, ct.composition.movementRoles, ct.composition.sessionStructure, ct.dose.construction, ct.estimation.workRates, ct.format.emomDensity, ct.history.negativeResponse, ct.history.recencyBand, ct.return.protocol, ct.safety.novelEccentricVolume, ct.safety.novicePolicy, ct.safety.repsPerMovementCap, ct.safety.technicalUnderFatigue, ct.stimulus.admissibleFormats, ct.stimulus.catalog, ct.stimulus.timeDomains

## Scénario F — douleur (genou) et exclusion (push-up), sans politique de charge

Douleur P2 genou déclarée ; push-up exclu par l’utilisateur ; `ct.load.*` non résolus.

- Format écarté `amrap` : ROLE_UNFILLED:lower_body
- Format écarté `for_time` : ROLE_UNFILLED:lower_body
- Format écarté `emom` : ROLE_UNFILLED:lower_body
- **Refus** : PLAN.CROSSTRAINING.C3_NO_FORMAT {"stimulus":"mixed_modal_medium","tried":["amrap:ROLE_UNFILLED:lower_body","for_time:ROLE_UNFILLED:lower_body","emom:ROLE_UNFILLED:lower_body"]}
- **Profil de demande (CORE)** : —
- **Résultat CORE** : refus NO_VALID_SOLUTION
- **Provenance** : 1 paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ct.estimation.workRates

## Scénario F bis — même douleur, charges TEST_ONLY (CORE_EXT_C1 + standards d’implément)

Politique de charge injectée (TEST_ONLY) : le swing (charnière, non sensible au genou) devient admissible.

- **Intention** : stimulus `mixed_modal_medium`, niveau intermediate, temps disponible 3600 s, priorité [] (rang 0), voisines 0
- **Structure** : warmup, conditioning · warmup non généré (ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED)
- **Voisines / priorité** : connues=absent, [], interprétation=none, priorité=blocked:priority_interference_policy
- **Historique** : 0 séance(s) du même stimulus dans la fenêtre, dernier format none, mouvements récents []
- **Format** : `amrap` (admissible_for_stimulus, governed_order)
- **Durée** : PRESCRITE 720 s · tour estimé 153 s (rapide 120.3, lent 203.6) · CORE : p50 855 s · p90 855 s
- **Densité** : self_paced (self_paced)

| Rôle | Mouvement | Dose | Charge | Raisons |
|---|---|---|---|---|
| monostructural | ex.row_erg | 250 distance_m | — | not_used_recently, technical_cost:1, relevance:3 |
| lower_body | ex.kb_swing | 15 reps | 16 kg | not_used_recently, technical_cost:2, relevance:3 |
| upper_pull | ex.band_assisted_pull_up | 8 reps | — | not_used_recently, technical_cost:1, relevance:0 |

- Candidats écartés (lower_body) : ex.air_squat:PAIN_AREA, ex.reverse_lunge_bw:PAIN_AREA, ex.box_jump:PAIN_AREA, ex.wall_ball:PAIN_AREA
- **Profil de demande (CORE)** : lower_knee=low, lower_hip=moderate, upper_pull=moderate, axial=low, high_intensity_systemic=moderate, grip=low
- **Résultat CORE** : séance publiée, identique à la proposition
- **Provenance** : 16 paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ct.composition.movementPool, ct.composition.movementRoles, ct.composition.sessionStructure, ct.dose.construction, ct.estimation.workRates, ct.history.negativeResponse, ct.history.recencyBand, ct.load.implementStandards, ct.return.protocol, ct.safety.novelEccentricVolume, ct.safety.novicePolicy, ct.safety.repsPerMovementCap, ct.safety.technicalUnderFatigue, ct.stimulus.admissibleFormats, ct.stimulus.catalog, ct.stimulus.timeDomains
