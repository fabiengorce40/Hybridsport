# Strength S3 — Scénario B : Strength (3 / semaine, hypertrophie) + Running (3 / semaine, semi-marathon), priorité Strength

Chemin réel : createBeta0Programme (dernière course déclarée TEST_ONLY) → ensureBeta0Week → Global Planner (deux passes, voisines) → StrengthEngine + RunningEngine.
Réalisations TEST_ONLY : Strength comme prescrit ; Running durée prescrite, 6 000 m. ⚓ = ancre déclarée.

## Semaine 1 — 2026-10-05

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-05 | str_full_body #1 | Squat barre | 3 × 6 | 5 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_full_body #1 | Presse pectoraux machine | 4 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_full_body #1 | Tractions | 3 × 8–12 | 3 | poids du corps | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_full_body #1 | Élévations latérales machine | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-05 | str_full_body #1 | Pec deck | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | **changé** (était Élévations latérales machine ; critère : variant) | aucune track (accessoire non suivi) |
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

| Groupe | Plancher | Haut | Prévu (séries dures E1) | Réalisé |
|---|---|---|---|---|
| arms | 6 | 14 | 17.5 | 17.5 |
| back | 10 | 20 | 9 | 9 |
| calves | 4 | 10 | 0 | 0 |
| chest | 10 | 20 | 17 | 17 |
| core | 4 | 10 | 6.5 | 6.5 |
| glutes | 6 | 14 | 7 | 7 |
| hamstrings | 8 | 14 | 2 | 2 |
| quads | 10 | 18 | 5 | 5 |
| shoulders | 8 | 16 | 17 | 17 |

## Semaine 2 — 2026-10-12

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-12 | str_full_body #1 | Soulevé de terre roumain ⚓ | 2 × 6 | 4 | 40 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-12 | str_full_body #1 | Presse pectoraux machine ⚓ | 3 × 8–12 | 2 | 40 kg | track | **changé** (était Développé couché ; critère : anchor) | exposition on_target ; **progression répétitions** |
| 2026-10-12 | str_full_body #1 | Tractions ⚓ | 3 × 8–12 | 2 | poids du corps | track | **changé** (était Tirage vertical ; critère : anchor) | exposition on_target ; **progression répétitions** |
| 2026-10-12 | str_full_body #1 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-12 | str_full_body #1 | Gainage | hold | — | — | profil de base | **changé** (était Pallof press ; critère : variant) | aucune track (accessoire non suivi) |
| 2026-10-12 | str_full_body #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Pec deck ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-13 | str_full_body #2 | Squat barre ⚓ | 2 × 6 | 4 | 40 kg | track | conservé | exposition on_target ; **progression charge** |
| 2026-10-13 | str_full_body #2 | Tirage horizontal poulie ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-13 | str_full_body #2 | Développé épaules haltères ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-13 | str_full_body #2 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | **changé** (était Élévations latérales machine ; critère : track) | exposition on_target ; **progression répétitions** |
| 2026-10-14 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-15 | str_full_body #3 | Soulevé de terre roumain ⚓ | 2 × 6 | 4 | 40 kg | track | conservé | exposition on_target ; **progression charge** |
| 2026-10-15 | str_full_body #3 | Presse pectoraux machine ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-15 | str_full_body #3 | Tractions ⚓ | 3 × 8–12 | 2 | poids du corps | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-15 | str_full_body #3 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-15 | str_full_body #3 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Gainage ; critère : load_adequacy) | aucune track (accessoire non suivi) |
| 2026-10-16 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-18 | running.threshold (KEY) | 73 min | — | — | — | — | — | réalisée (TEST_ONLY) |

Séances Strength :

- 2026-10-12 str_full_body #1 — graine `strength:str_full_body:strength_volume:1` ; ancres déclarées : Tractions, Presse pectoraux machine, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:history), lower_knee (neighbor:running:history) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference)
- 2026-10-13 str_full_body #2 — graine `strength:str_full_body:strength_volume:2` ; ancres déclarées : Tirage horizontal poulie, Développé épaules haltères, Squat barre ; sous le plancher (prévu + réalisé avant la séance) : back, calves, hamstrings, quads ; au haut ou au-delà : arms ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (volume), fb.iso_upper (volume), i.cooldown (duration)
- 2026-10-15 str_full_body #3 — graine `strength:str_full_body:strength_volume:3` ; ancres déclarées : Soulevé de terre roumain, Tractions, Presse pectoraux machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.iso_upper (volume), i.warmup_extra (duration), i.cooldown (duration)

| Groupe | Plancher | Haut | Prévu (séries dures E1) | Réalisé |
|---|---|---|---|---|
| arms | 6 | 14 | 16.5 | 16.5 |
| back | 10 | 20 | 9 | 9 |
| calves | 4 | 10 | 0 | 0 |
| chest | 10 | 20 | 15 | 15 |
| core | 4 | 10 | 6 | 6 |
| glutes | 6 | 14 | 6 | 6 |
| hamstrings | 8 | 14 | 4 | 4 |
| quads | 10 | 18 | 2 | 2 |
| shoulders | 8 | 16 | 15 | 15 |

## Semaine 3 — 2026-10-19

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-19 | str_full_body #1 | Squat barre ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-19 | str_full_body #1 | Tirage horizontal poulie ⚓ | 4 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-19 | str_full_body #1 | Développé épaules haltères ⚓ | 3 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-19 | str_full_body #1 | Pec deck | 3 × 15–20 | 1 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-19 | str_full_body #1 | Gainage | hold | — | — | profil de base | **changé** (était Pallof press ; critère : variant) | aucune track (accessoire non suivi) |
| 2026-10-20 | str_full_body #2 | Soulevé de terre roumain ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-20 | str_full_body #2 | Presse pectoraux machine ⚓ | 3 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-20 | str_full_body #2 | Tractions ⚓ | 3 × 10–12 | 2 | poids du corps | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-20 | str_full_body #2 | Pec deck | 3 × 15–20 | 1 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-21 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-22 | str_full_body #3 | Squat barre ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target ; maintien (estimate) |
| 2026-10-22 | str_full_body #3 | Tirage horizontal poulie ⚓ | 3 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-22 | str_full_body #3 | Développé épaules haltères ⚓ | 3 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-22 | str_full_body #3 | Pec deck | 3 × 15–20 | 1 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-23 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-25 | running.threshold (KEY) | 73 min | — | — | — | — | — | réalisée (TEST_ONLY) |

Séances Strength :

- 2026-10-19 str_full_body #1 — graine `strength:str_full_body:strength_volume:1` ; ancres déclarées : Squat barre, Tirage horizontal poulie, Développé épaules haltères ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_knee (neighbor:running:history) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.iso_upper (volume)
- 2026-10-20 str_full_body #2 — graine `strength:str_full_body:strength_volume:2` ; ancres déclarées : Soulevé de terre roumain, Tractions, Presse pectoraux machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (duration), fb.iso_upper (duration), i.cooldown (duration)
- 2026-10-22 str_full_body #3 — graine `strength:str_full_body:strength_volume:3` ; ancres déclarées : Squat barre, Tirage horizontal poulie, Développé épaules haltères ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (duration), fb.iso_upper (volume), i.cooldown (duration)

| Groupe | Plancher | Haut | Prévu (séries dures E1) | Réalisé |
|---|---|---|---|---|
| arms | 6 | 14 | 15.5 | 15.5 |
| back | 10 | 20 | 10 | 10 |
| calves | 4 | 10 | 0 | 0 |
| chest | 10 | 20 | 12 | 12 |
| core | 4 | 10 | 3 | 3 |
| glutes | 6 | 14 | 6 | 6 |
| hamstrings | 8 | 14 | 2 | 2 |
| quads | 10 | 18 | 4 | 4 |
| shoulders | 8 | 16 | 15.5 | 15.5 |

## Semaine 4 — 2026-10-26

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-26 | str_full_body #1 | Soulevé de terre roumain ⚓ | 3 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target ; maintien (estimate) |
| 2026-10-26 | str_full_body #1 | Presse pectoraux machine ⚓ | 3 × 11–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-26 | str_full_body #1 | Tractions ⚓ | 3 × 11–12 | 2 | poids du corps | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-26 | str_full_body #1 | Pec deck | 3 × 18–20 | 1 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-26 | str_full_body #1 | Gainage | hold | — | — | profil de base | conservé | aucune track (accessoire non suivi) |
| 2026-10-26 | str_full_body #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Pec deck ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-27 | str_full_body #2 | Squat barre ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-27 | str_full_body #2 | Tirage horizontal poulie ⚓ | 3 × 11–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-27 | str_full_body #2 | Développé épaules haltères ⚓ | 3 × 11–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-27 | str_full_body #2 | Pec deck | 3 × 18–20 | 1 | 40 kg | track | **changé** (était Élévations latérales machine ; critère : track) | exposition on_target ; **progression répétitions** |
| 2026-10-28 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-10-29 | str_full_body #3 | Soulevé de terre roumain ⚓ | 2 × 6 | 4 | 42.5 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-29 | str_full_body #3 | Presse pectoraux machine ⚓ | 3 × 11–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression charge** |
| 2026-10-29 | str_full_body #3 | Tractions ⚓ | 3 × 11–12 | 2 | poids du corps | track | conservé | exposition on_target ; plafond atteint |
| 2026-10-29 | str_full_body #3 | Pec deck | 3 × 18–20 | 1 | 40 kg | track | conservé | exposition on_target ; **progression charge** |
| 2026-10-30 | running.easy (EASY) | 58 min | — | — | — | — | — | réalisée (TEST_ONLY) |
| 2026-11-01 | running.threshold (KEY) | 73 min | — | — | — | — | — | réalisée (TEST_ONLY) |

Séances Strength :

- 2026-10-26 str_full_body #1 — graine `strength:str_full_body:strength_volume:1` ; ancres déclarées : Soulevé de terre roumain, Tractions, Presse pectoraux machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_knee (neighbor:running:history) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), i.cooldown (duration)
- 2026-10-27 str_full_body #2 — graine `strength:str_full_body:strength_volume:2` ; ancres déclarées : Squat barre, Tirage horizontal poulie, Développé épaules haltères ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (duration), fb.iso_upper (volume), i.cooldown (duration)
- 2026-10-29 str_full_body #3 — graine `strength:str_full_body:strength_volume:3` ; ancres déclarées : Soulevé de terre roumain, Tractions, Presse pectoraux machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; structures abaissées : lower_hip (neighbor:running:stim.running.aerobic), lower_knee (neighbor:running:stim.running.aerobic) ; emplacements omis : fb.iso_lower (interference), fb.single_leg (interference), fb.trunk (duration), fb.iso_upper (volume), i.cooldown (duration)

| Groupe | Plancher | Haut | Prévu (séries dures E1) | Réalisé |
|---|---|---|---|---|
| arms | 6 | 14 | 16.5 | 16.5 |
| back | 10 | 20 | 9 | 9 |
| calves | 4 | 10 | 0 | 0 |
| chest | 10 | 20 | 15 | 15 |
| core | 4 | 10 | 3.5 | 3.5 |
| glutes | 6 | 14 | 7 | 7 |
| hamstrings | 8 | 14 | 5 | 5 |
| quads | 10 | 18 | 2 | 2 |
| shoulders | 8 | 16 | 15 | 15 |

