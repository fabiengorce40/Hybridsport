# Strength (S4) — Scénario B : Strength (3 / semaine, hypertrophie) + Running (3 / semaine, semi-marathon), priorité Strength

Chemin réel : createBeta0Programme (dernière course déclarée TEST_ONLY) → ensureBeta0Week → Global Planner (deux passes, voisines) → StrengthEngine + RunningEngine.
Réalisations TEST_ONLY : Strength comme prescrit ; Running durée prescrite, 6 000 m. ⚓ = ancre déclarée.

## Semaine 1 — 2026-10-05

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-05 | str_full_body #1 | Squat barre | 3 × 6 | 5 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_full_body #1 | Presse pectoraux machine | 4 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_full_body #1 | Tractions | 3 × 8–12 | 3 | poids du corps | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_full_body #1 | Élévations latérales machine | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-05 | str_full_body #1 | Pec deck | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-06 | running.easy (EASY) | 43 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-07 | str_full_body #2 | Soulevé de terre roumain | 2 × 6 | 5 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-07 | str_full_body #2 | Tirage horizontal poulie | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-07 | str_full_body #2 | Développé épaules haltères | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-07 | str_full_body #2 | Pec deck | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | conservé | track suivie créée |
| 2026-10-07 | str_full_body #2 | Pallof press | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-08 | str_full_body #3 | Squat barre | 2 × 6 | 5 | à l’effort (calibration) | calibration | conservé | aucune track (accessoire non suivi) |
| 2026-10-08 | str_full_body #3 | Développé couché | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | **changé** (était Presse pectoraux machine ; critère : seed_tiebreak) | aucune track (accessoire non suivi) |
| 2026-10-08 | str_full_body #3 | Tirage vertical | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | **changé** (était Tractions ; critère : recency) | aucune track (accessoire non suivi) |
| 2026-10-08 | str_full_body #3 | Pec deck | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | conservé | aucune track (accessoire non suivi) |
| 2026-10-09 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-11 | running.test (TEST) | 73 min | — | — | — | — | — | réalisée (TEST_ONLY) |

Séances Strength :

- 2026-10-05 str_full_body #1 — graine `strength:str_full_body:strength_volume:1` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : arms, back, calves, chest, core, glutes, hamstrings, quads, shoulders ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (stimulus_preservation), i.warmup_extra (duration), i.cooldown (duration)
- 2026-10-07 str_full_body #2 — graine `strength:str_full_body:strength_volume:2` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.iso_upper (volume)
- 2026-10-08 str_full_body #3 — graine `strength:str_full_body:strength_volume:3` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : back, calves, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (duration), fb.iso_upper (volume), i.cooldown (duration)

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 17.5 | 17.5 | achieved |
| back | 10 | 20 | 9 | 9 | reduced_by_constraint |
| calves | 4 | 10 | 0 | 0 | reduced_by_constraint |
| chest | 10 | 20 | 17 | 17 | achieved |
| core | 4 | 10 | 6.5 | 6.5 | achieved |
| glutes | 6 | 14 | 7 | 7 | achieved |
| hamstrings | 8 | 14 | 2 | 2 | reduced_by_constraint |
| quads | 10 | 18 | 5 | 5 | reduced_by_constraint |
| shoulders | 8 | 16 | 17 | 17 | achieved |

Objectif de volume de la semaine : **partially_satisfied** (3/3 séances). Contraintes tracées : interference (lower_hip (neighbor:running:stim.running.aerobic)) ; interference (lower_knee (neighbor:running:stim.running.aerobic)) ; slot_omitted:duration (fb.trunk) ; slot_omitted:duration (i.cooldown) ; slot_omitted:duration (i.warmup_extra) ; slot_omitted:interference (fb.iso_lower) ; slot_omitted:interference (fb.single_leg) ; slot_omitted:stimulus_preservation (fb.trunk) ; slot_omitted:volume (fb.iso_upper).

Priorité déclarée (programme) : strength > running ; reçue par Strength : rang 1 ; voisines : running:2 ; politique : blocked:priority_interference_policy.

## Semaine 2 — 2026-10-12

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-12 | str_full_body #1 | Soulevé de terre roumain ⚓ | 2 × 6 | 4 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-12 | str_full_body #1 | Presse pectoraux machine ⚓ | 3 × 8–12 | 2 | 40 kg | track | **changé** (était Développé couché ; critère : anchor) | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-12 | str_full_body #1 | Tractions ⚓ | 3 × 8–12 | 2 | poids du corps | track | **changé** (était Tirage vertical ; critère : anchor) | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-12 | str_full_body #1 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-12 | str_full_body #1 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-12 | str_full_body #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | ajouté (instance supplémentaire de l’emplacement ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-13 | str_full_body #2 | Squat barre ⚓ | 2 × 6 | 4 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-13 | str_full_body #2 | Tirage horizontal poulie ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-13 | str_full_body #2 | Développé épaules haltères ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-13 | str_full_body #2 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-14 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-15 | str_full_body #3 | Soulevé de terre roumain ⚓ | 2 × 6 | 4 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-15 | str_full_body #3 | Presse pectoraux machine ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-15 | str_full_body #3 | Tractions ⚓ | 3 × 8–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-15 | str_full_body #3 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-15 | str_full_body #3 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-16 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-18 | running.threshold (KEY) | 73 min | — | — | — | — | — | réalisée (TEST_ONLY) |

Séances Strength :

- 2026-10-12 str_full_body #1 — graine `strength:str_full_body:strength_volume:1` ; ancres déclarées : Tractions, Presse pectoraux machine, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:history), lower_knee (neighbor:running:history) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference)
- 2026-10-13 str_full_body #2 — graine `strength:str_full_body:strength_volume:2` ; ancres déclarées : Tirage horizontal poulie, Développé épaules haltères, Squat barre ; sous le plancher (prévu + réalisé avant la séance) : back, calves, hamstrings, quads ; au haut ou au-delà : arms ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (volume), fb.iso_upper (volume), i.cooldown (duration)
- 2026-10-15 str_full_body #3 — graine `strength:str_full_body:strength_volume:3` ; ancres déclarées : Soulevé de terre roumain, Tractions, Presse pectoraux machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.iso_upper (volume), i.warmup_extra (duration), i.cooldown (duration)

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 16.5 | 16.5 | achieved |
| back | 10 | 20 | 9 | 9 | reduced_by_constraint |
| calves | 4 | 10 | 0 | 0 | reduced_by_constraint |
| chest | 10 | 20 | 15 | 15 | achieved |
| core | 4 | 10 | 9 | 9 | achieved |
| glutes | 6 | 14 | 6 | 6 | achieved |
| hamstrings | 8 | 14 | 4 | 4 | reduced_by_constraint |
| quads | 10 | 18 | 2 | 2 | reduced_by_constraint |
| shoulders | 8 | 16 | 15 | 15 | achieved |

Objectif de volume de la semaine : **partially_satisfied** (3/3 séances). Contraintes tracées : interference (lower_hip (neighbor:running:history)) ; interference (lower_hip (neighbor:running:stim.running.aerobic)) ; interference (lower_knee (neighbor:running:history)) ; interference (lower_knee (neighbor:running:stim.running.aerobic)) ; slot_omitted:duration (i.cooldown) ; slot_omitted:duration (i.warmup_extra) ; slot_omitted:interference (fb.iso_lower) ; slot_omitted:interference (fb.single_leg) ; slot_omitted:volume (fb.iso_upper) ; slot_omitted:volume (fb.trunk).

Priorité déclarée (programme) : strength > running ; reçue par Strength : rang 1 ; voisines : running:2 ; politique : blocked:priority_interference_policy.

## Semaine 3 — 2026-10-19

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-19 | str_full_body #1 | Squat barre ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-19 | str_full_body #1 | Tirage horizontal poulie ⚓ | 4 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_full_body #1 | Développé épaules haltères ⚓ | 3 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_full_body #1 | Pec deck | 3 × 15–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_full_body #1 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-20 | str_full_body #2 | Soulevé de terre roumain ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-20 | str_full_body #2 | Presse pectoraux machine ⚓ | 3 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-20 | str_full_body #2 | Tractions ⚓ | 3 × 10–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-20 | str_full_body #2 | Pec deck | 3 × 15–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-21 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-22 | str_full_body #3 | Squat barre ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (estimate) ; réussite exacte : hausse non gouvernée (BLOCKED) |
| 2026-10-22 | str_full_body #3 | Tirage horizontal poulie ⚓ | 3 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-22 | str_full_body #3 | Développé épaules haltères ⚓ | 3 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-22 | str_full_body #3 | Pec deck | 3 × 15–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-23 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-25 | running.threshold (KEY) | 73 min | — | — | — | — | — | réalisée (TEST_ONLY) |

Séances Strength :

- 2026-10-19 str_full_body #1 — graine `strength:str_full_body:strength_volume:1` ; ancres déclarées : Squat barre, Tirage horizontal poulie, Développé épaules haltères ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_knee (neighbor:running:history) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.iso_upper (volume)
- 2026-10-20 str_full_body #2 — graine `strength:str_full_body:strength_volume:2` ; ancres déclarées : Soulevé de terre roumain, Tractions, Presse pectoraux machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (volume), fb.iso_upper (duration), i.cooldown (duration)
- 2026-10-22 str_full_body #3 — graine `strength:str_full_body:strength_volume:3` ; ancres déclarées : Squat barre, Tirage horizontal poulie, Développé épaules haltères ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (duration), fb.iso_upper (volume), i.cooldown (duration)

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 15.5 | 15.5 | achieved |
| back | 10 | 20 | 10 | 10 | achieved |
| calves | 4 | 10 | 0 | 0 | reduced_by_constraint |
| chest | 10 | 20 | 12 | 12 | achieved |
| core | 4 | 10 | 6 | 6 | achieved |
| glutes | 6 | 14 | 6 | 6 | achieved |
| hamstrings | 8 | 14 | 2 | 2 | reduced_by_constraint |
| quads | 10 | 18 | 4 | 4 | reduced_by_constraint |
| shoulders | 8 | 16 | 15.5 | 15.5 | achieved |

Objectif de volume de la semaine : **partially_satisfied** (3/3 séances). Contraintes tracées : interference (lower_hip (neighbor:running:stim.running.aerobic)) ; interference (lower_knee (neighbor:running:history)) ; interference (lower_knee (neighbor:running:stim.running.aerobic)) ; slot_omitted:duration (fb.iso_upper) ; slot_omitted:duration (fb.trunk) ; slot_omitted:duration (i.cooldown) ; slot_omitted:interference (fb.iso_lower) ; slot_omitted:interference (fb.single_leg) ; slot_omitted:volume (fb.iso_upper) ; slot_omitted:volume (fb.trunk).

Priorité déclarée (programme) : strength > running ; reçue par Strength : rang 1 ; voisines : running:2 ; politique : blocked:priority_interference_policy.

Décisions bloquées (après réalisation) : réussite exacte sans marge (autoregulated, RIR reported) : hausse non gouvernée.

## Semaine 4 — 2026-10-26

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-26 | str_full_body #1 | Soulevé de terre roumain ⚓ | 3 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (estimate) ; réussite exacte : hausse non gouvernée (BLOCKED) |
| 2026-10-26 | str_full_body #1 | Presse pectoraux machine ⚓ | 3 × 11–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-26 | str_full_body #1 | Tractions ⚓ | 3 × 11–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-26 | str_full_body #1 | Pec deck | 3 × 18–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-26 | str_full_body #1 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-27 | str_full_body #2 | Squat barre ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-27 | str_full_body #2 | Tirage horizontal poulie ⚓ | 3 × 11–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-27 | str_full_body #2 | Développé épaules haltères ⚓ | 3 × 11–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-27 | str_full_body #2 | Pec deck | 3 × 18–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-28 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-29 | str_full_body #3 | Soulevé de terre roumain ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-29 | str_full_body #3 | Presse pectoraux machine ⚓ | 3 × 11–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-29 | str_full_body #3 | Tractions ⚓ | 3 × 11–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; haut de plage au poids du corps : méthode non gouvernée (BLOCKED) |
| 2026-10-29 | str_full_body #3 | Pec deck | 3 × 18–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-30 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-11-01 | running.threshold (KEY) | 73 min | — | — | — | — | — | réalisée (TEST_ONLY) |

Séances Strength :

- 2026-10-26 str_full_body #1 — graine `strength:str_full_body:strength_volume:1` ; ancres déclarées : Soulevé de terre roumain, Tractions, Presse pectoraux machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_knee (neighbor:running:history) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.iso_upper (volume)
- 2026-10-27 str_full_body #2 — graine `strength:str_full_body:strength_volume:2` ; ancres déclarées : Squat barre, Tirage horizontal poulie, Développé épaules haltères ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (duration), fb.iso_upper (volume), i.cooldown (duration)
- 2026-10-29 str_full_body #3 — graine `strength:str_full_body:strength_volume:3` ; ancres déclarées : Soulevé de terre roumain, Tractions, Presse pectoraux machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (duration), fb.iso_upper (duration), i.cooldown (duration)

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 16.5 | 16.5 | achieved |
| back | 10 | 20 | 9 | 9 | reduced_by_constraint |
| calves | 4 | 10 | 0 | 0 | reduced_by_constraint |
| chest | 10 | 20 | 15 | 15 | achieved |
| core | 4 | 10 | 6.5 | 6.5 | achieved |
| glutes | 6 | 14 | 7 | 7 | achieved |
| hamstrings | 8 | 14 | 5 | 5 | reduced_by_constraint |
| quads | 10 | 18 | 2 | 2 | reduced_by_constraint |
| shoulders | 8 | 16 | 12 | 12 | achieved |

Objectif de volume de la semaine : **partially_satisfied** (3/3 séances). Contraintes tracées : interference (lower_hip (neighbor:running:stim.running.aerobic)) ; interference (lower_knee (neighbor:running:history)) ; interference (lower_knee (neighbor:running:stim.running.aerobic)) ; slot_omitted:duration (fb.iso_upper) ; slot_omitted:duration (fb.trunk) ; slot_omitted:duration (i.cooldown) ; slot_omitted:interference (fb.iso_lower) ; slot_omitted:interference (fb.single_leg) ; slot_omitted:volume (fb.iso_upper).

Priorité déclarée (programme) : strength > running ; reçue par Strength : rang 1 ; voisines : running:2 ; politique : blocked:priority_interference_policy.

Décisions bloquées (après réalisation) : réussite exacte sans marge (autoregulated, RIR reported) : hausse non gouvernée ; poids du corps en haut de plage (Tractions) : méthodes possibles added_load, harder_variant, new_rep_range, hold, aucune gouvernée.

## Récapitulatif

- Continuité : 13 exercices en place conservés par la continuité déclarée (hors ancres déclarées), 4 remplacés (declared_anchor ×4).
- Progression : répétitions ×24, charge ×4, maintiens ×8, régressions ×0.
- Preuves : réussites exactes ×37, dépassements ×0, sans preuve ×0.
- Décisions bloquées : réussite exacte ×2, poids du corps ×1.
- État persisté (JSON compact, saveState) après 4 semaines : 295 Ko.

