# Strength (S5) — Scénario A : Strength seul, hypertrophie, 4 séances / semaine, intermédiaire, salle complète

Chemin réel : createBeta0Programme → ensureBeta0Week → Global Planner → StrengthEngine → recordSessionExecution → closeProgrammeWeekInApp.
Réalisations TEST_ONLY : comme prescrit (répétitions = borne haute, charge prescrite, RIR OBSERVÉ = RIR cible) ; charge de première exposition 40 kg (TEST_ONLY) ;
semaine 3, 4e séance : dernière série du premier exercice non réalisée (séance « modifiée »). ⚓ = ancre déclarée (exercice maintenu, progression appliquée).
Colonne « Exercice » : comparaison avec la dernière séance du même archétype ayant le même emplacement ; « critère » = critère décisif du moteur.

## Semaine 1 — 2026-10-05

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-05 | str_upper_a #1 | Développé couché | 4 × 6 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_upper_a #1 | Tractions | 3 × 8–12 | 3 | poids du corps | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-05 | str_upper_a #1 | Tirage horizontal poulie | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-05 | str_upper_a #1 | Développé épaules machine | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-05 | str_upper_a #1 | Pec deck | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-06 | str_lower_a #1 | Squat barre | 4 × 6 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-06 | str_lower_a #1 | Soulevé roumain unilatéral haltère | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-06 | str_lower_a #1 | Leg curl | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-06 | str_lower_a #1 | Squat bulgare | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-06 | str_lower_a #1 | Pallof press | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-07 | str_upper_b #1 | Développé militaire | 3 × 6 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-07 | str_upper_b #1 | Rowing machine | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-07 | str_upper_b #1 | Presse pectoraux machine | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-07 | str_upper_b #1 | Tirage vertical | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-07 | str_upper_b #1 | Élévations latérales machine | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-07 | str_upper_b #1 | Pec deck | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track suivie créée |
| 2026-10-09 | str_lower_b #1 | Soulevé de terre roumain | 3 × 6 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-09 | str_lower_b #1 | Presse à cuisses | 3 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track d’ancre créée |
| 2026-10-09 | str_lower_b #1 | Leg curl | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track suivie créée |
| 2026-10-09 | str_lower_b #1 | Squat bulgare | 2 × 8–12 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | track suivie créée |
| 2026-10-09 | str_lower_b #1 | Leg extension | 3 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-05 str_upper_a #1 — graine `strength:str_upper_a:strength_volume:1` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : arms, back, calves, chest, core, glutes, hamstrings, quads, shoulders ; au haut ou au-delà : aucun ; emplacements omis : ua.trunk (duration), ua.iso_upper (duration)
- 2026-10-06 str_lower_a #1 — graine `strength:str_lower_a:strength_volume:1` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads, shoulders ; au haut ou au-delà : aucun ; emplacements omis : la.iso_lower (duration), i.cooldown (duration), la.calves (duration)
- 2026-10-07 str_upper_b #1 — graine `strength:str_upper_b:strength_volume:1` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, hamstrings, quads, shoulders ; au haut ou au-delà : aucun ; emplacements omis : ub.trunk (volume)
- 2026-10-09 str_lower_b #1 — graine `strength:str_lower_b:strength_volume:1` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms, shoulders ; emplacements omis : lb.trunk (volume), lb.calves (duration)

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 19 | 19 | achieved |
| back | 10 | 20 | 11 | 11 | achieved |
| calves | 4 | 10 | 0 | 0 | reduced_by_constraint |
| chest | 10 | 20 | 13 | 13 | achieved |
| core | 4 | 10 | 9 | 9 | achieved |
| glutes | 6 | 14 | 17 | 17 | achieved |
| hamstrings | 8 | 14 | 13 | 13 | achieved |
| quads | 10 | 18 | 14 | 14 | achieved |
| shoulders | 8 | 16 | 16 | 16 | achieved |

Objectif de volume de la semaine : **partially_satisfied** (4/4 séances). Contraintes tracées : slot_omitted:duration (i.cooldown) ; slot_omitted:duration (la.calves) ; slot_omitted:duration (la.iso_lower) ; slot_omitted:duration (lb.calves) ; slot_omitted:duration (ua.iso_upper) ; slot_omitted:duration (ua.trunk) ; slot_omitted:volume (lb.trunk) ; slot_omitted:volume (ub.trunk).

Priorité déclarée (programme) : strength ; reçue par Strength : rang 1 ; voisines : aucune ; politique : blocked:priority_interference_policy.

## Semaine 2 — 2026-10-12

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-12 | str_upper_b #1 | Développé militaire ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-12 | str_upper_b #1 | Rowing machine ⚓ | 4 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-12 | str_upper_b #1 | Presse pectoraux machine | 2 × 8–12 | 2 | à l’effort (calibration) | historique | conservé | track suivie créée |
| 2026-10-12 | str_upper_b #1 | Tirage vertical | 2 × 8–12 | 2 | à l’effort (calibration) | historique | conservé | track suivie créée |
| 2026-10-12 | str_upper_b #1 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-13 | str_lower_b #1 | Soulevé de terre roumain ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-13 | str_lower_b #1 | Presse à cuisses ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-13 | str_lower_b #1 | Leg curl | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-13 | str_lower_b #1 | Squat bulgare | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-13 | str_lower_b #1 | Gainage | hold | — | — | profil de base | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-13 | str_lower_b #1 | Leg extension | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-14 | str_upper_a #1 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-14 | str_upper_a #1 | Tractions ⚓ | 3 × 8–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-14 | str_upper_a #1 | Tirage horizontal poulie | 2 × 8–12 | 2 | à l’effort (calibration) | historique | conservé | track suivie créée |
| 2026-10-14 | str_upper_a #1 | Développé épaules machine | 2 × 8–12 | 2 | à l’effort (calibration) | historique | conservé | track suivie créée |
| 2026-10-14 | str_upper_a #1 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-14 | str_upper_a #1 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-14 | str_upper_a #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | ajouté (instance supplémentaire de l’emplacement ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-16 | str_lower_a #1 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-16 | str_lower_a #1 | Soulevé roumain unilatéral haltère ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-16 | str_lower_a #1 | Leg curl | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-16 | str_lower_a #1 | Squat bulgare | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-16 | str_lower_a #1 | Leg extension | 3 × 12–20 | 1 | à l’effort (calibration) | historique | ajouté (instance supplémentaire de l’emplacement ; critère : track) | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-12 str_upper_b #1 — graine `strength:str_upper_b:strength_volume:1` ; ancres déclarées : Développé militaire, Rowing machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest ; au haut ou au-delà : glutes ; emplacements omis : ub.trunk (volume), ub.iso_upper (volume)
- 2026-10-13 str_lower_b #1 — graine `strength:str_lower_b:strength_volume:1` ; ancres déclarées : Soulevé de terre roumain, Presse à cuisses ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lb.calves (duration)
- 2026-10-14 str_upper_a #1 — graine `strength:str_upper_a:strength_volume:1` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, shoulders ; au haut ou au-delà : glutes ; emplacements omis : i.cooldown (duration)
- 2026-10-16 str_lower_a #1 — graine `strength:str_lower_a:strength_volume:1` ; ancres déclarées : Squat barre, Soulevé roumain unilatéral haltère ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : la.trunk (volume), la.calves (duration)

Exercices principaux (ancres) :

| Jour | Exercice | Prescription | RIR cible | RIR observé | Preuve | Réussites exactes consécutives | e1RM (nature) | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-12 | Développé militaire | 3 × 6 @ 40 kg | 2 | 2 | exact_effort_known | 1 | 52 (observed) | maintien (evidence) | 3 × 6 @ 40 kg · RIR 2 |
| 2026-10-12 | Rowing machine | 4 × 8–12 @ 40 kg | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 9–12 @ 40 kg · RIR 2 |
| 2026-10-13 | Soulevé de terre roumain | 3 × 6 @ 40 kg | 2 | 2 | exact_effort_known | 1 | 52 (observed) | maintien (evidence) | 3 × 6 @ 40 kg · RIR 2 |
| 2026-10-13 | Presse à cuisses | 3 × 8–12 @ 40 kg | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 9–12 @ 40 kg · RIR 2 |
| 2026-10-14 | Développé couché | 3 × 6 @ 40 kg | 2 | 2 | exact_effort_known | 1 | 51.3 (observed) | maintien (evidence) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-14 | Tractions | 3 × 8–12 @ PDC | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 9–12 · RIR 2 |
| 2026-10-16 | Squat barre | 3 × 6 @ 40 kg | 2 | 2 | exact_effort_known | 1 | 51.3 (observed) | maintien (evidence) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-16 | Soulevé roumain unilatéral haltère | 3 × 8–12 @ 40 kg | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 9–12 @ 40 kg · RIR 2 |

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 18 | 18 | achieved |
| back | 10 | 20 | 11 | 11 | achieved |
| calves | 4 | 10 | 0 | 0 | reduced_by_constraint |
| chest | 10 | 20 | 11 | 11 | achieved |
| core | 4 | 10 | 7.5 | 7.5 | achieved |
| glutes | 6 | 14 | 16 | 16 | achieved |
| hamstrings | 8 | 14 | 12 | 12 | achieved |
| quads | 10 | 18 | 16 | 16 | achieved |
| shoulders | 8 | 16 | 14.5 | 14.5 | achieved |

Objectif de volume de la semaine : **partially_satisfied** (4/4 séances). Contraintes tracées : slot_omitted:duration (i.cooldown) ; slot_omitted:duration (la.calves) ; slot_omitted:duration (lb.calves) ; slot_omitted:volume (la.trunk) ; slot_omitted:volume (ub.iso_upper) ; slot_omitted:volume (ub.trunk).

Priorité déclarée (programme) : strength ; reçue par Strength : rang 1 ; voisines : aucune ; politique : blocked:priority_interference_policy.

## Semaine 3 — 2026-10-19

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-19 | str_upper_a #1 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-19 | str_upper_a #1 | Tractions ⚓ | 3 × 9–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_upper_a #1 | Tirage horizontal poulie | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_upper_a #1 | Développé épaules machine | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_upper_a #1 | Pec deck | 3 × 14–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_upper_a #1 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-20 | str_lower_a #1 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-20 | str_lower_a #1 | Soulevé roumain unilatéral haltère ⚓ | 3 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-20 | str_lower_a #1 | Leg curl | 3 × 14–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-20 | str_lower_a #1 | Squat bulgare | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-20 | str_lower_a #1 | Leg extension | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-21 | str_upper_b #1 | Développé militaire ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-21 | str_upper_b #1 | Rowing machine ⚓ | 3 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-21 | str_upper_b #1 | Presse pectoraux machine | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-21 | str_upper_b #1 | Tirage vertical | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-21 | str_upper_b #1 | Pec deck | 3 × 14–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-21 | str_upper_b #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | ajouté (instance supplémentaire de l’emplacement ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-23 | str_lower_b #1 | Soulevé de terre roumain ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition partial ; maintien (partial) |
| 2026-10-23 | str_lower_b #1 | Presse à cuisses ⚓ | 3 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-23 | str_lower_b #1 | Leg curl | 3 × 14–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-23 | str_lower_b #1 | Squat bulgare | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-23 | str_lower_b #1 | Leg extension | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-19 str_upper_a #1 — graine `strength:str_upper_a:strength_volume:1` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest ; au haut ou au-delà : glutes ; emplacements omis : ua.iso_upper (volume)
- 2026-10-20 str_lower_a #1 — graine `strength:str_lower_a:strength_volume:1` ; ancres déclarées : Squat barre, Soulevé roumain unilatéral haltère ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : la.trunk (volume), la.calves (duration)
- 2026-10-21 str_upper_b #1 — graine `strength:str_upper_b:strength_volume:1` ; ancres déclarées : Développé militaire, Rowing machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, shoulders ; au haut ou au-delà : glutes ; emplacements omis : ub.trunk (volume)
- 2026-10-23 str_lower_b #1 — graine `strength:str_lower_b:strength_volume:1` ; ancres déclarées : Soulevé de terre roumain, Presse à cuisses ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lb.trunk (volume), lb.calves (duration) ; **réalisation : last_set_missed**

Exercices principaux (ancres) :

| Jour | Exercice | Prescription | RIR cible | RIR observé | Preuve | Réussites exactes consécutives | e1RM (nature) | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-19 | Développé couché | 3 × 6 @ 40 kg | 2 | 2 | exact_effort_known | 0 | 51 (observed) | **+charge** | 4 × 6 @ 42.5 kg · RIR 2 |
| 2026-10-19 | Tractions | 3 × 9–12 @ PDC | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 10–12 · RIR 2 |
| 2026-10-20 | Squat barre | 3 × 6 @ 40 kg | 2 | 2 | exact_effort_known | 0 | 51 (observed) | **+charge** | 4 × 6 @ 42.5 kg · RIR 2 |
| 2026-10-20 | Soulevé roumain unilatéral haltère | 3 × 9–12 @ 40 kg | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 10–12 @ 40 kg · RIR 2 |
| 2026-10-21 | Développé militaire | 3 × 6 @ 40 kg | 2 | 2 | exact_effort_known | 0 | 51.3 (observed) | **+charge** | 3 × 6 @ 42.5 kg · RIR 2 |
| 2026-10-21 | Rowing machine | 3 × 9–12 @ 40 kg | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 10–12 @ 40 kg · RIR 2 |
| 2026-10-23 | Soulevé de terre roumain | 3 × 6 @ 40 kg | 2 | 2 | partial_sets | 0 | 52 (observed) | maintien (partial) | 3 × 6 @ 40 kg · RIR 2 |
| 2026-10-23 | Presse à cuisses | 3 × 9–12 @ 40 kg | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 10–12 @ 40 kg · RIR 2 |

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 17.5 | 17.5 | achieved |
| back | 10 | 20 | 10 | 10 | achieved |
| calves | 4 | 10 | 0 | 0 | reduced_by_constraint |
| chest | 10 | 20 | 11 | 11 | achieved |
| core | 4 | 10 | 7.5 | 7 | achieved |
| glutes | 6 | 14 | 16 | 15 | achieved |
| hamstrings | 8 | 14 | 12 | 11 | achieved |
| quads | 10 | 18 | 16 | 16 | achieved |
| shoulders | 8 | 16 | 14.5 | 14.5 | achieved |

Objectif de volume de la semaine : **partially_satisfied** (4/4 séances). Contraintes tracées : slot_omitted:duration (la.calves) ; slot_omitted:duration (lb.calves) ; slot_omitted:volume (la.trunk) ; slot_omitted:volume (lb.trunk) ; slot_omitted:volume (ua.iso_upper) ; slot_omitted:volume (ub.trunk).

Priorité déclarée (programme) : strength ; reçue par Strength : rang 1 ; voisines : aucune ; politique : blocked:priority_interference_policy.

## Semaine 4 — 2026-10-26

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-26 | str_upper_b #1 | Développé militaire ⚓ | 3 × 6 | 2 | 42.5 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-26 | str_upper_b #1 | Rowing machine ⚓ | 4 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-26 | str_upper_b #1 | Presse pectoraux machine | 2 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-26 | str_upper_b #1 | Tirage vertical | 2 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-26 | str_upper_b #1 | Pec deck | 3 × 16–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-26 | str_upper_b #1 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | première exposition de l’emplacement | aucune track (accessoire non suivi) |
| 2026-10-27 | str_lower_b #1 | Soulevé de terre roumain ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-27 | str_lower_b #1 | Presse à cuisses ⚓ | 3 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-27 | str_lower_b #1 | Leg curl | 3 × 16–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-27 | str_lower_b #1 | Squat bulgare | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-27 | str_lower_b #1 | Leg extension | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-28 | str_upper_a #1 | Développé couché ⚓ | 3 × 6 | 2 | 42.5 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-28 | str_upper_a #1 | Tractions ⚓ | 3 × 10–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-28 | str_upper_a #1 | Tirage horizontal poulie | 2 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-28 | str_upper_a #1 | Développé épaules machine | 2 × 9–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-28 | str_upper_a #1 | Pec deck | 3 × 16–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-28 | str_upper_a #1 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-30 | str_lower_a #1 | Squat barre ⚓ | 3 × 6 | 2 | 42.5 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-30 | str_lower_a #1 | Soulevé roumain unilatéral haltère ⚓ | 3 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-30 | str_lower_a #1 | Leg curl | 3 × 16–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-30 | str_lower_a #1 | Squat bulgare | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-30 | str_lower_a #1 | Leg extension | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-26 str_upper_b #1 — graine `strength:str_upper_b:strength_volume:1` ; ancres déclarées : Développé militaire, Rowing machine ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest ; au haut ou au-delà : glutes ; emplacements omis : ub.iso_upper (volume), i.cooldown (duration)
- 2026-10-27 str_lower_b #1 — graine `strength:str_lower_b:strength_volume:1` ; ancres déclarées : Soulevé de terre roumain, Presse à cuisses ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lb.trunk (volume), lb.calves (duration)
- 2026-10-28 str_upper_a #1 — graine `strength:str_upper_a:strength_volume:1` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, shoulders ; au haut ou au-delà : glutes ; emplacements omis : ua.iso_upper (volume)
- 2026-10-30 str_lower_a #1 — graine `strength:str_lower_a:strength_volume:1` ; ancres déclarées : Squat barre, Soulevé roumain unilatéral haltère ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : la.trunk (volume), la.calves (duration)

Exercices principaux (ancres) :

| Jour | Exercice | Prescription | RIR cible | RIR observé | Preuve | Réussites exactes consécutives | e1RM (nature) | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-26 | Développé militaire | 3 × 6 @ 42.5 kg | 2 | 2 | exact_effort_known | 1 | 51.3 (observed) | maintien (evidence) | 3 × 6 @ 42.5 kg · RIR 2 |
| 2026-10-26 | Rowing machine | 4 × 10–12 @ 40 kg | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 11–12 @ 40 kg · RIR 2 |
| 2026-10-27 | Soulevé de terre roumain | 3 × 6 @ 40 kg | 2 | 2 | exact_effort_known | 1 | 52 (observed) | maintien (evidence) | 3 × 6 @ 40 kg · RIR 2 |
| 2026-10-27 | Presse à cuisses | 3 × 10–12 @ 40 kg | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 11–12 @ 40 kg · RIR 2 |
| 2026-10-28 | Développé couché | 3 × 6 @ 42.5 kg | 2 | 2 | exact_effort_known | 1 | 51 (observed) | maintien (evidence) | 4 × 6 @ 42.5 kg · RIR 2 |
| 2026-10-28 | Tractions | 3 × 10–12 @ PDC | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 11–12 · RIR 2 |
| 2026-10-30 | Squat barre | 3 × 6 @ 42.5 kg | 2 | 2 | exact_effort_known | 1 | 51 (observed) | maintien (evidence) | 4 × 6 @ 42.5 kg · RIR 2 |
| 2026-10-30 | Soulevé roumain unilatéral haltère | 3 × 10–12 @ 40 kg | 2 | 2 | exact_effort_known | 0 | — | **+reps** | 3 × 11–12 @ 40 kg · RIR 2 |

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 18 | 18 | achieved |
| back | 10 | 20 | 11 | 11 | achieved |
| calves | 4 | 10 | 0 | 0 | reduced_by_constraint |
| chest | 10 | 20 | 11 | 11 | achieved |
| core | 4 | 10 | 10.5 | 10.5 | achieved |
| glutes | 6 | 14 | 16 | 16 | achieved |
| hamstrings | 8 | 14 | 12 | 12 | achieved |
| quads | 10 | 18 | 16 | 16 | achieved |
| shoulders | 8 | 16 | 11.5 | 11.5 | achieved |

Objectif de volume de la semaine : **partially_satisfied** (4/4 séances). Contraintes tracées : slot_omitted:duration (i.cooldown) ; slot_omitted:duration (la.calves) ; slot_omitted:duration (lb.calves) ; slot_omitted:volume (la.trunk) ; slot_omitted:volume (lb.trunk) ; slot_omitted:volume (ua.iso_upper) ; slot_omitted:volume (ub.iso_upper).

Priorité déclarée (programme) : strength ; reçue par Strength : rang 1 ; voisines : aucune ; politique : blocked:priority_interference_policy.

## Récapitulatif

- Continuité : 37 exercices en place conservés par la continuité déclarée (hors ancres déclarées), 0 remplacés (—).
- Progression : répétitions ×37, charge ×4, maintiens ×9, régressions ×0.
- Preuves : réussites exactes ×49, dépassements ×0, sans preuve ×1.
- Décisions bloquées : réussite exacte ×0 (effort observé ×0, effort inconnu ×0), poids du corps ×0.
- Effort : expositions avec effort observé ×50, effort inconnu ×0.
- État persisté (JSON compact, saveState) après 4 semaines : 289 Ko.

