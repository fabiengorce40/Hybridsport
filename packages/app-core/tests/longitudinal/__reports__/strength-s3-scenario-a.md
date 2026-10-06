# Strength S3 — Scénario A : Strength seul, hypertrophie, 4 séances / semaine, intermédiaire, salle complète

Chemin réel : createBeta0Programme → ensureBeta0Week → Global Planner → StrengthEngine → recordSessionExecution → closeProgrammeWeekInApp.
Réalisations TEST_ONLY : comme prescrit (répétitions = borne haute, charge prescrite, RIR cible) ; charge de première exposition 40 kg (TEST_ONLY) ;
semaine 3, 4e séance : dernière série du premier exercice non réalisée (séance « modifiée »). ⚓ = ancre déclarée (exercice maintenu, progression appliquée).
Colonne « Exercice » : comparaison avec la dernière séance du même archétype ayant le même emplacement ; « critère » = critère décisif du moteur.

## Semaine 1 — 2026-10-05

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-05 | str_upper #1 | Développé couché | 4 × 6 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_upper #1 | Tractions | 3 × 8–12 | 3 | poids du corps | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_upper #1 | Rowing machine | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-05 | str_upper #1 | Développé épaules machine | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-05 | str_upper #1 | Élévations latérales machine | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-06 | str_lower #1 | Squat barre | 4 × 6 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-06 | str_lower #1 | Soulevé de terre roumain | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-06 | str_lower #1 | Leg extension | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-06 | str_lower #1 | Squat bulgare | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-06 | str_lower #1 | Leg curl | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | **changé** (était Leg extension ; critère : variant) | aucune track (accessoire non suivi) |
| 2026-10-07 | str_upper #2 | Développé couché | 3 × 6 | 3 | à l’effort (calibration) | calibration | conservé | aucune track (accessoire non suivi) |
| 2026-10-07 | str_upper #2 | Tirage vertical | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | **changé** (était Tractions ; critère : recency) | aucune track (accessoire non suivi) |
| 2026-10-07 | str_upper #2 | Tirage horizontal poulie | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | **changé** (était Rowing machine ; critère : recency) | aucune track (accessoire non suivi) |
| 2026-10-07 | str_upper #2 | Développé épaules machine | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | conservé | track suivie créée |
| 2026-10-07 | str_upper #2 | Pec deck | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | **changé** (était Élévations latérales machine ; critère : volume_fit) | aucune track (accessoire non suivi) |
| 2026-10-07 | str_upper #2 | Pallof press | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-09 | str_lower #2 | Squat barre | 3 × 6 | 3 | à l’effort (calibration) | calibration | conservé | aucune track (accessoire non suivi) |
| 2026-10-09 | str_lower #2 | Soulevé roumain unilatéral haltère | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | **changé** (était Soulevé de terre roumain ; critère : recency) | aucune track (accessoire non suivi) |
| 2026-10-09 | str_lower #2 | Leg curl | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | conservé | track suivie créée |
| 2026-10-09 | str_lower #2 | Squat bulgare | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | conservé | track suivie créée |
| 2026-10-09 | str_lower #2 | Mollets machine | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | **changé** (était Leg curl ; critère : variant) | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-05 str_upper #1 — graine `strength:str_upper:strength_volume:1` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : arms, back, calves, chest, core, glutes, hamstrings, quads, shoulders ; au haut ou au-delà : aucun ; emplacements omis : up.trunk (duration), up.iso_upper (duration)
- 2026-10-06 str_lower #1 — graine `strength:str_lower:strength_volume:1` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; emplacements omis : lo.trunk (stimulus_preservation), i.cooldown (duration)
- 2026-10-07 str_upper #2 — graine `strength:str_upper:strength_volume:2` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, hamstrings ; au haut ou au-delà : aucun ; emplacements omis : up.iso_upper (volume)
- 2026-10-09 str_lower #2 — graine `strength:str_lower:strength_volume:2` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)

| Groupe | Plancher | Haut | Prévu (séries dures E1) | Réalisé |
|---|---|---|---|---|
| arms | 6 | 14 | 19.5 | 19.5 |
| back | 10 | 20 | 11 | 11 |
| calves | 4 | 10 | 4 | 4 |
| chest | 10 | 20 | 10 | 10 |
| core | 4 | 10 | 8 | 8 |
| glutes | 6 | 14 | 17 | 17 |
| hamstrings | 8 | 14 | 13 | 13 |
| quads | 10 | 18 | 15 | 15 |
| shoulders | 8 | 16 | 14 | 14 |

## Semaine 2 — 2026-10-12

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-12 | str_upper #1 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (estimate) |
| 2026-10-12 | str_upper #1 | Tractions ⚓ | 3 × 8–12 | 2 | poids du corps | track | **changé** (était Tirage vertical ; critère : anchor) | exposition on_target ; **progression répétitions** |
| 2026-10-12 | str_upper #1 | Rowing machine | 2 × 8–12 | 2 | à l’effort (calibration) | historique | **changé** (était Tirage horizontal poulie ; critère : recency) | track suivie créée |
| 2026-10-12 | str_upper #1 | Développé épaules machine | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-12 | str_upper #1 | Pec deck | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | track suivie créée |
| 2026-10-12 | str_upper #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Pec deck ; critère : volume_fit) | aucune track (accessoire non suivi) |
| 2026-10-13 | str_lower #1 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (estimate) |
| 2026-10-13 | str_lower #1 | Soulevé de terre roumain ⚓ | 3 × 8–12 | 2 | 40 kg | track | **changé** (était Soulevé roumain unilatéral haltère ; critère : anchor) | exposition on_target ; **progression répétitions** |
| 2026-10-13 | str_lower #1 | Mollets machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-13 | str_lower #1 | Squat bulgare | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-13 | str_lower #1 | Leg curl | 3 × 12–20 | 1 | 40 kg | track | **changé** (était Mollets machine ; critère : variant) | exposition on_target ; **progression répétitions** |
| 2026-10-14 | str_upper #2 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-14 | str_upper #2 | Tractions ⚓ | 3 × 8–12 | 2 | poids du corps | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-14 | str_upper #2 | Tirage horizontal poulie | 2 × 8–12 | 2 | à l’effort (calibration) | historique | **changé** (était Rowing machine ; critère : recency) | aucune track (accessoire non suivi) |
| 2026-10-14 | str_upper #2 | Développé épaules machine | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-14 | str_upper #2 | Pec deck | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Élévations latérales machine ; critère : volume_fit) | aucune track (accessoire non suivi) |
| 2026-10-14 | str_upper #2 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-16 | str_lower #2 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-16 | str_lower #2 | Soulevé de terre roumain ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-16 | str_lower #2 | Leg extension | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Leg curl ; critère : variant) | aucune track (accessoire non suivi) |
| 2026-10-16 | str_lower #2 | Squat bulgare | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-16 | str_lower #2 | Leg curl | 3 × 12–20 | 1 | 40 kg | track | **changé** (était Leg extension ; critère : variant) | exposition on_target ; **progression répétitions** |

Séances Strength :

- 2026-10-12 str_upper #1 — graine `strength:str_upper:strength_volume:1` ; ancres déclarées : Tractions, Développé couché ; sous le plancher (prévu + réalisé avant la séance) : back, chest, shoulders ; au haut ou au-delà : glutes ; emplacements omis : up.trunk (volume)
- 2026-10-13 str_lower #1 — graine `strength:str_lower:strength_volume:1` ; ancres déclarées : Soulevé de terre roumain, Squat barre ; sous le plancher (prévu + réalisé avant la séance) : hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)
- 2026-10-14 str_upper #2 — graine `strength:str_upper:strength_volume:2` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, chest ; au haut ou au-delà : glutes ; emplacements omis : up.iso_upper (volume)
- 2026-10-16 str_lower #2 — graine `strength:str_lower:strength_volume:2` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)

| Groupe | Plancher | Haut | Prévu (séries dures E1) | Réalisé |
|---|---|---|---|---|
| arms | 6 | 14 | 18 | 18 |
| back | 10 | 20 | 10 | 10 |
| calves | 4 | 10 | 3 | 3 |
| chest | 10 | 20 | 12 | 12 |
| core | 4 | 10 | 9 | 9 |
| glutes | 6 | 14 | 16 | 16 |
| hamstrings | 8 | 14 | 12 | 12 |
| quads | 10 | 18 | 13 | 13 |
| shoulders | 8 | 16 | 14 | 14 |

## Semaine 3 — 2026-10-19

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-19 | str_upper #1 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (estimate) |
| 2026-10-19 | str_upper #1 | Tractions ⚓ | 3 × 10–12 | 2 | poids du corps | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-19 | str_upper #1 | Rowing machine | 2 × 8–12 | 2 | 40 kg | track | **changé** (était Tirage horizontal poulie ; critère : track) | exposition on_target ; **progression répétitions** |
| 2026-10-19 | str_upper #1 | Développé épaules machine | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-19 | str_upper #1 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-19 | str_upper #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Pec deck ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-20 | str_lower #1 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (estimate) |
| 2026-10-20 | str_lower #1 | Soulevé de terre roumain ⚓ | 3 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-20 | str_lower #1 | Leg extension | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Leg curl ; critère : variant) | aucune track (accessoire non suivi) |
| 2026-10-20 | str_lower #1 | Squat bulgare | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-20 | str_lower #1 | Leg curl | 3 × 14–20 | 1 | 40 kg | track | **changé** (était Leg extension ; critère : variant) | exposition on_target ; **progression répétitions** |
| 2026-10-21 | str_upper #2 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-21 | str_upper #2 | Tractions ⚓ | 3 × 10–12 | 2 | poids du corps | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-21 | str_upper #2 | Rowing machine | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-21 | str_upper #2 | Développé épaules machine | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-21 | str_upper #2 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | **changé** (était Élévations latérales machine ; critère : track) | exposition on_target ; **progression répétitions** |
| 2026-10-21 | str_upper #2 | Gainage | hold | — | — | profil de base | **changé** (était Pallof press ; critère : variant) | aucune track (accessoire non suivi) |
| 2026-10-21 | str_upper #2 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Pec deck ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-23 | str_lower #2 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition partial ; maintien (partial) |
| 2026-10-23 | str_lower #2 | Soulevé de terre roumain ⚓ | 3 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-23 | str_lower #2 | Leg curl | 3 × 14–20 | 1 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-23 | str_lower #2 | Squat bulgare | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-23 | str_lower #2 | Gainage | hold | — | — | profil de base | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-23 | str_lower #2 | Mollets machine | 4 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Leg curl ; critère : track) | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-19 str_upper #1 — graine `strength:str_upper:strength_volume:1` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, shoulders ; au haut ou au-delà : glutes ; emplacements omis : up.trunk (volume)
- 2026-10-20 str_lower #1 — graine `strength:str_lower:strength_volume:1` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)
- 2026-10-21 str_upper #2 — graine `strength:str_upper:strength_volume:2` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest ; au haut ou au-delà : glutes ; emplacements omis : i.cooldown (duration)
- 2026-10-23 str_lower #2 — graine `strength:str_lower:strength_volume:2` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : calves, core, hamstrings, quads ; au haut ou au-delà : arms, shoulders ; emplacements omis : i.cooldown (duration) ; **réalisation : last_set_missed**

| Groupe | Plancher | Haut | Prévu (séries dures E1) | Réalisé |
|---|---|---|---|---|
| arms | 6 | 14 | 18 | 18 |
| back | 10 | 20 | 10 | 10 |
| calves | 4 | 10 | 4 | 4 |
| chest | 10 | 20 | 12 | 12 |
| core | 4 | 10 | 6 | 5.5 |
| glutes | 6 | 14 | 16 | 15 |
| hamstrings | 8 | 14 | 12 | 12 |
| quads | 10 | 18 | 13 | 12 |
| shoulders | 8 | 16 | 16 | 16 |

## Semaine 4 — 2026-10-26

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-26 | str_upper #1 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (estimate) |
| 2026-10-26 | str_upper #1 | Tractions ⚓ | 3 × 12 | 2 | poids du corps | track | conservé | exposition on_target ; plafond atteint |
| 2026-10-26 | str_upper #1 | Rowing machine | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-26 | str_upper #1 | Développé épaules machine | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression charge** |
| 2026-10-26 | str_upper #1 | Pec deck | 3 × 14–20 | 1 | 40 kg | track | **changé** (était Élévations latérales machine ; critère : track) | exposition on_target ; **progression répétitions** |
| 2026-10-26 | str_upper #1 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Gainage ; critère : load_adequacy) | aucune track (accessoire non suivi) |
| 2026-10-26 | str_upper #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Pec deck ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-27 | str_lower #1 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-27 | str_lower #1 | Soulevé de terre roumain ⚓ | 3 × 12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression charge** |
| 2026-10-27 | str_lower #1 | Mollets machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-27 | str_lower #1 | Squat bulgare | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression charge** |
| 2026-10-27 | str_lower #1 | Leg curl | 3 × 16–20 | 1 | 40 kg | track | **changé** (était Mollets machine ; critère : variant) | exposition on_target ; **progression répétitions** |
| 2026-10-28 | str_upper #2 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (evidence) |
| 2026-10-28 | str_upper #2 | Tractions ⚓ | 3 × 12 | 2 | poids du corps | track | conservé | exposition on_target ; plafond atteint |
| 2026-10-28 | str_upper #2 | Rowing machine | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-28 | str_upper #2 | Développé épaules machine | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-28 | str_upper #2 | Pec deck | 3 × 14–20 | 1 | 40 kg | track | **changé** (était Élévations latérales machine ; critère : track) | exposition on_target ; **progression répétitions** |
| 2026-10-28 | str_upper #2 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Pec deck ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-30 | str_lower #2 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target ; maintien (estimate) |
| 2026-10-30 | str_lower #2 | Soulevé de terre roumain ⚓ | 3 × 12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-30 | str_lower #2 | Leg extension | 3 × 12–20 | 1 | à l’effort (calibration) | historique | **changé** (était Leg curl ; critère : variant) | aucune track (accessoire non suivi) |
| 2026-10-30 | str_lower #2 | Squat bulgare | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target ; **progression répétitions** |
| 2026-10-30 | str_lower #2 | Leg curl | 3 × 16–20 | 1 | 40 kg | track | **changé** (était Leg extension ; critère : variant) | exposition on_target ; **progression répétitions** |

Séances Strength :

- 2026-10-26 str_upper #1 — graine `strength:str_upper:strength_volume:1` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, chest ; au haut ou au-delà : glutes ; emplacements omis : i.warmup_extra (duration), i.cooldown (duration)
- 2026-10-27 str_lower #1 — graine `strength:str_lower:strength_volume:1` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : hamstrings, quads ; au haut ou au-delà : arms, shoulders ; emplacements omis : lo.trunk (volume)
- 2026-10-28 str_upper #2 — graine `strength:str_upper:strength_volume:2` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, chest, quads ; au haut ou au-delà : glutes ; emplacements omis : up.trunk (volume)
- 2026-10-30 str_lower #2 — graine `strength:str_lower:strength_volume:2` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms, shoulders ; emplacements omis : lo.trunk (volume)

| Groupe | Plancher | Haut | Prévu (séries dures E1) | Réalisé |
|---|---|---|---|---|
| arms | 6 | 14 | 18 | 18 |
| back | 10 | 20 | 10 | 10 |
| calves | 4 | 10 | 3 | 3 |
| chest | 10 | 20 | 12 | 12 |
| core | 4 | 10 | 9 | 9 |
| glutes | 6 | 14 | 16 | 16 |
| hamstrings | 8 | 14 | 12 | 12 |
| quads | 10 | 18 | 13 | 13 |
| shoulders | 8 | 16 | 16 | 16 |

