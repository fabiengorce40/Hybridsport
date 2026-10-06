# Cross-training C3 — scénarios multisport B et C

> Généré par les tests (TEST_ONLY / SIMULATION_ONLY). Aucune valeur n’est approuvée.

## Scénario B — Cross-training (priorité 1) + Strength

Programme : CT puis Strength (ordre déclaré). Voisines interprétées via `ct.hybrid.policy` (TEST_ONLY : éviter les structures `high` des voisines).

Autres séances : strength planned le 2026-10-11. CT : planned le 2026-10-05.

- **Intention** : stimulus `mixed_modal_medium`, niveau intermediate, temps disponible 3600 s, priorité [crosstraining, strength] (rang 1), voisines 1
- **Structure** : warmup, conditioning · warmup non généré (ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED)
- **Voisines / priorité** : connues=true, [strength@144h], interprétation=ct.hybrid.policy, priorité=blocked:priority_interference_policy
- **Historique** : 0 séance(s) du même stimulus dans la fenêtre, dernier format none, mouvements récents []
- **Format** : `amrap` (admissible_for_stimulus, governed_order)
- **Durée** : PRESCRITE 720 s · tour estimé 144 s (rapide 114.3, lent 193.6) · CORE : non tracée
- **Densité** : self_paced (self_paced)

| Rôle | Mouvement | Dose | Charge | Raisons |
|---|---|---|---|---|
| monostructural | ex.row_erg | 250 distance_m | — | not_used_recently, neighbour_structure_conflicts:4, technical_cost:1, relevance:3 |
| lower_body | ex.air_squat | 15 reps | — | not_used_recently, neighbour_structure_conflicts:2, technical_cost:1, relevance:2 |
| upper_pull | ex.band_assisted_pull_up | 8 reps | — | not_used_recently, neighbour_structure_conflicts:2, technical_cost:1, relevance:0 |

- Candidats écartés (lower_body) : ex.wall_ball:LOAD_POLICY_UNGOVERNED, ex.kb_swing:LOAD_POLICY_UNGOVERNED
- **Profil de demande (CORE)** : lower_knee=moderate, lower_hip=low, upper_pull=moderate, high_intensity_systemic=moderate, grip=low
- **Résultat CORE** : séance publiée, identique à la proposition
- **Provenance** : 16 paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ct.composition.movementPool, ct.composition.movementRoles, ct.composition.sessionStructure, ct.dose.construction, ct.estimation.workRates, ct.history.negativeResponse, ct.history.recencyBand, ct.hybrid.policy, ct.return.protocol, ct.safety.novelEccentricVolume, ct.safety.novicePolicy, ct.safety.repsPerMovementCap, ct.safety.technicalUnderFatigue, ct.stimulus.admissibleFormats, ct.stimulus.catalog, ct.stimulus.timeDomains

## Scénario B bis — Strength (priorité 1) + Cross-training (priorité 2)

Même semaine, ordre de priorité inversé : aucune politique de priorité gouvernée.

Autres séances : strength planned le 2026-10-05. CT : planned le 2026-10-11.

- **Intention** : stimulus `mixed_modal_medium`, niveau intermediate, temps disponible 3600 s, priorité [strength, crosstraining] (rang 2), voisines 1
- **Structure** : warmup, conditioning · warmup non généré (ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED)
- **Voisines / priorité** : connues=true, [strength@-144h], interprétation=ct.hybrid.policy, priorité=blocked:priority_interference_policy
- **Historique** : 0 séance(s) du même stimulus dans la fenêtre, dernier format none, mouvements récents []
- **Format** : `amrap` (admissible_for_stimulus, governed_order)
- **Durée** : PRESCRITE 720 s · tour estimé 149.2 s (rapide 117.9, lent 201.9) · CORE : non tracée
- **Densité** : self_paced (self_paced)

| Rôle | Mouvement | Dose | Charge | Raisons |
|---|---|---|---|---|
| monostructural | ex.skierg | 250 distance_m | — | not_used_recently, neighbour_structure_conflicts:4, technical_cost:1, relevance:0 |
| lower_body | ex.air_squat | 15 reps | — | not_used_recently, neighbour_structure_conflicts:3, technical_cost:1, relevance:2 |
| upper_pull | ex.band_assisted_pull_up | 8 reps | — | not_used_recently, neighbour_structure_conflicts:2, technical_cost:1, relevance:0 |

- Candidats écartés (lower_body) : ex.wall_ball:LOAD_POLICY_UNGOVERNED, ex.kb_swing:LOAD_POLICY_UNGOVERNED
- **Profil de demande (CORE)** : lower_knee=moderate, lower_hip=low, upper_push=low, upper_pull=moderate, high_intensity_systemic=moderate, grip=low
- **Résultat CORE** : séance publiée, identique à la proposition
- **Provenance** : 16 paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ct.composition.movementPool, ct.composition.movementRoles, ct.composition.sessionStructure, ct.dose.construction, ct.estimation.workRates, ct.history.negativeResponse, ct.history.recencyBand, ct.hybrid.policy, ct.return.protocol, ct.safety.novelEccentricVolume, ct.safety.novicePolicy, ct.safety.repsPerMovementCap, ct.safety.technicalUnderFatigue, ct.stimulus.admissibleFormats, ct.stimulus.catalog, ct.stimulus.timeDomains

## Scénario C — Cross-training + Running

Politique TEST_ONLY : éviter toute structure sollicitée par une voisine (low, moderate, high).

Autres séances : running planned le 2026-10-11. CT : planned le 2026-10-05.

- **Intention** : stimulus `mixed_modal_medium`, niveau intermediate, temps disponible 3600 s, priorité [crosstraining, running] (rang 1), voisines 1
- **Structure** : warmup, conditioning · warmup non généré (ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED)
- **Voisines / priorité** : connues=true, [running@144h], interprétation=ct.hybrid.policy, priorité=blocked:priority_interference_policy
- **Historique** : 0 séance(s) du même stimulus dans la fenêtre, dernier format none, mouvements récents []
- **Format** : `amrap` (admissible_for_stimulus, governed_order)
- **Durée** : PRESCRITE 720 s · tour estimé 149.2 s (rapide 117.9, lent 201.9) · CORE : non tracée
- **Densité** : self_paced (self_paced)

| Rôle | Mouvement | Dose | Charge | Raisons |
|---|---|---|---|---|
| monostructural | ex.skierg | 250 distance_m | — | not_used_recently, neighbour_structure_conflicts:1, technical_cost:1, relevance:0 |
| lower_body | ex.air_squat | 15 reps | — | not_used_recently, neighbour_structure_conflicts:3, technical_cost:1, relevance:2 |
| upper_pull | ex.band_assisted_pull_up | 8 reps | — | not_used_recently, neighbour_structure_conflicts:1, technical_cost:1, relevance:0 |

- Candidats écartés (lower_body) : ex.wall_ball:LOAD_POLICY_UNGOVERNED, ex.kb_swing:LOAD_POLICY_UNGOVERNED
- **Profil de demande (CORE)** : lower_knee=moderate, lower_hip=low, upper_push=low, upper_pull=moderate, high_intensity_systemic=moderate, grip=low
- **Résultat CORE** : séance publiée, identique à la proposition
- **Provenance** : 16 paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ct.composition.movementPool, ct.composition.movementRoles, ct.composition.sessionStructure, ct.dose.construction, ct.estimation.workRates, ct.history.negativeResponse, ct.history.recencyBand, ct.hybrid.policy, ct.return.protocol, ct.safety.novelEccentricVolume, ct.safety.novicePolicy, ct.safety.repsPerMovementCap, ct.safety.technicalUnderFatigue, ct.stimulus.admissibleFormats, ct.stimulus.catalog, ct.stimulus.timeDomains
