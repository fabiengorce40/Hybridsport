# Strength (S5) — Scénario A SANS RIR : même programme, même réalisation, aucun effort saisi

Identique au scénario A, mais l’utilisateur ne renseigne AUCUN RIR (cas réel de Beta 0 avant S5).
Invariant S5 : effort inconnu ≠ RIR 0 — la preuve dit « effort inconnu », l’e1RM est une borne inférieure, aucune hausse inventée.

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
| 2026-10-06 | str_lower #1 | Leg curl | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | première exposition de l’emplacement | aucune track (accessoire non suivi) |
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
| 2026-10-09 | str_lower #2 | Mollets machine | 4 × 12–20 | 3 | à l’effort (calibration) | calibration | **changé** (était Leg extension ; critère : variant) | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-05 str_upper #1 — graine `strength:str_upper:strength_volume:1` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : arms, back, calves, chest, core, glutes, hamstrings, quads, shoulders ; au haut ou au-delà : aucun ; emplacements omis : up.trunk (duration), up.iso_upper (duration)
- 2026-10-06 str_lower #1 — graine `strength:str_lower:strength_volume:1` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, glutes, hamstrings, quads ; au haut ou au-delà : aucun ; emplacements omis : lo.trunk (stimulus_preservation), i.cooldown (duration)
- 2026-10-07 str_upper #2 — graine `strength:str_upper:strength_volume:2` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : back, calves, chest, core, hamstrings ; au haut ou au-delà : aucun ; emplacements omis : up.iso_upper (volume)
- 2026-10-09 str_lower #2 — graine `strength:str_lower:strength_volume:2` ; ancres déclarées : aucune ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)

Exercices principaux (ancres) :

| Jour | Exercice | Prescription | RIR cible | RIR observé | Preuve | Réussites exactes consécutives | e1RM (nature) | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-07 | Développé couché | 3 × 6 @ — | 3 | inconnu | exact_effort_unknown | 1 | 48 (lower_bound) | maintien (evidence) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-09 | Squat barre | 3 × 6 @ — | 3 | inconnu | exact_effort_unknown | 1 | 48 (lower_bound) | maintien (evidence) | 4 × 6 @ 40 kg · RIR 2 |

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 19.5 | 19.5 | achieved |
| back | 10 | 20 | 11 | 11 | achieved |
| calves | 4 | 10 | 4 | 4 | achieved |
| chest | 10 | 20 | 10 | 10 | achieved |
| core | 4 | 10 | 8 | 8 | achieved |
| glutes | 6 | 14 | 17 | 17 | achieved |
| hamstrings | 8 | 14 | 13 | 13 | achieved |
| quads | 10 | 18 | 15 | 15 | achieved |
| shoulders | 8 | 16 | 14 | 14 | achieved |

Objectif de volume de la semaine : **satisfied** (4/4 séances). Contraintes tracées : slot_omitted:duration (i.cooldown) ; slot_omitted:duration (up.iso_upper) ; slot_omitted:duration (up.trunk) ; slot_omitted:stimulus_preservation (lo.trunk) ; slot_omitted:volume (lo.trunk) ; slot_omitted:volume (up.iso_upper).

Priorité déclarée (programme) : strength ; reçue par Strength : rang 1 ; voisines : aucune ; politique : blocked:priority_interference_policy.

## Semaine 2 — 2026-10-12

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-12 | str_upper #1 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (estimate) ; réussite exacte : hausse non gouvernée (BLOCKED) |
| 2026-10-12 | str_upper #1 | Tractions ⚓ | 3 × 8–12 | 2 | poids du corps | track | **changé** (était Tirage vertical ; critère : anchor) | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-12 | str_upper #1 | Tirage horizontal poulie | 2 × 8–12 | 2 | 40 kg | historique | conservé | track suivie créée |
| 2026-10-12 | str_upper #1 | Développé épaules machine | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-12 | str_upper #1 | Pec deck | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | track suivie créée |
| 2026-10-12 | str_upper #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | ajouté (instance supplémentaire de l’emplacement ; critère : volume_fit) | aucune track (accessoire non suivi) |
| 2026-10-13 | str_lower #1 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (estimate) ; réussite exacte : hausse non gouvernée (BLOCKED) |
| 2026-10-13 | str_lower #1 | Soulevé de terre roumain ⚓ | 3 × 8–12 | 2 | 40 kg | track | **changé** (était Soulevé roumain unilatéral haltère ; critère : anchor) | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-13 | str_lower #1 | Leg curl | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-13 | str_lower #1 | Squat bulgare | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-13 | str_lower #1 | Mollets machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-14 | str_upper #2 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-14 | str_upper #2 | Tractions ⚓ | 3 × 8–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-14 | str_upper #2 | Tirage horizontal poulie | 2 × 8–12 | 2 | 40 kg | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-14 | str_upper #2 | Développé épaules machine | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-14 | str_upper #2 | Pec deck | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-14 | str_upper #2 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-16 | str_lower #2 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-16 | str_lower #2 | Soulevé de terre roumain ⚓ | 3 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-16 | str_lower #2 | Leg curl | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-16 | str_lower #2 | Squat bulgare | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-16 | str_lower #2 | Mollets machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-12 str_upper #1 — graine `strength:str_upper:strength_volume:1` ; ancres déclarées : Tractions, Développé couché ; sous le plancher (prévu + réalisé avant la séance) : back, chest, shoulders ; au haut ou au-delà : glutes ; emplacements omis : up.trunk (volume)
- 2026-10-13 str_lower #1 — graine `strength:str_lower:strength_volume:1` ; ancres déclarées : Soulevé de terre roumain, Squat barre ; sous le plancher (prévu + réalisé avant la séance) : hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)
- 2026-10-14 str_upper #2 — graine `strength:str_upper:strength_volume:2` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, chest ; au haut ou au-delà : glutes ; emplacements omis : up.iso_upper (volume)
- 2026-10-16 str_lower #2 — graine `strength:str_lower:strength_volume:2` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)

Exercices principaux (ancres) :

| Jour | Exercice | Prescription | RIR cible | RIR observé | Preuve | Réussites exactes consécutives | e1RM (nature) | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-12 | Développé couché | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 2 | 48 (lower_bound) | maintien (estimate) ; BLOCKED (réussite exacte) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-12 | Tractions | 3 × 8–12 @ PDC | 2 | inconnu | exact_effort_unknown | 0 | — | **+reps** | 3 × 9–12 · RIR 2 |
| 2026-10-13 | Squat barre | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 2 | 48 (lower_bound) | maintien (estimate) ; BLOCKED (réussite exacte) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-13 | Soulevé de terre roumain | 3 × 8–12 @ 40 kg | 2 | inconnu | exact_effort_unknown | 0 | 56 (lower_bound) | **+reps** | 3 × 9–12 @ 40 kg · RIR 2 |
| 2026-10-14 | Développé couché | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 3 | 48 (lower_bound) | maintien (evidence) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-14 | Tractions | 3 × 8–12 @ PDC | 2 | inconnu | exact_effort_unknown | 0 | — | **+reps** | 3 × 10–12 · RIR 2 |
| 2026-10-16 | Squat barre | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 3 | 48 (lower_bound) | maintien (evidence) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-16 | Soulevé de terre roumain | 3 × 8–12 @ 40 kg | 2 | inconnu | exact_effort_unknown | 0 | 56 (lower_bound) | **+reps** | 3 × 10–12 @ 40 kg · RIR 2 |

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 18 | 18 | achieved |
| back | 10 | 20 | 10 | 10 | achieved |
| calves | 4 | 10 | 6 | 6 | achieved |
| chest | 10 | 20 | 12 | 12 | achieved |
| core | 4 | 10 | 9 | 9 | achieved |
| glutes | 6 | 14 | 16 | 16 | achieved |
| hamstrings | 8 | 14 | 12 | 12 | achieved |
| quads | 10 | 18 | 10 | 10 | achieved |
| shoulders | 8 | 16 | 15 | 15 | achieved |

Objectif de volume de la semaine : **satisfied** (4/4 séances). Contraintes tracées : slot_omitted:volume (lo.trunk) ; slot_omitted:volume (up.iso_upper) ; slot_omitted:volume (up.trunk).

Priorité déclarée (programme) : strength ; reçue par Strength : rang 1 ; voisines : aucune ; politique : blocked:priority_interference_policy.

Décisions bloquées (après réalisation) : réussite exacte sans marge (autoregulated, RIR not_collected) : hausse non gouvernée ; réussite exacte sans marge (autoregulated, RIR not_collected) : hausse non gouvernée.

## Semaine 3 — 2026-10-19

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-19 | str_upper #1 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (estimate) ; réussite exacte : hausse non gouvernée (BLOCKED) |
| 2026-10-19 | str_upper #1 | Tractions ⚓ | 3 × 10–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_upper #1 | Tirage horizontal poulie | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_upper #1 | Développé épaules machine | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_upper #1 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-19 | str_upper #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | ajouté (instance supplémentaire de l’emplacement ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-20 | str_lower #1 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (estimate) ; réussite exacte : hausse non gouvernée (BLOCKED) |
| 2026-10-20 | str_lower #1 | Soulevé de terre roumain ⚓ | 3 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-20 | str_lower #1 | Leg curl | 3 × 14–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-20 | str_lower #1 | Squat bulgare | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-20 | str_lower #1 | Mollets machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-21 | str_upper #2 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-21 | str_upper #2 | Tractions ⚓ | 3 × 10–12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-21 | str_upper #2 | Tirage horizontal poulie | 2 × 8–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-21 | str_upper #2 | Développé épaules machine | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-21 | str_upper #2 | Pec deck | 3 × 12–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-21 | str_upper #2 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-23 | str_lower #2 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition partial ; maintien (partial) |
| 2026-10-23 | str_lower #2 | Soulevé de terre roumain ⚓ | 3 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-23 | str_lower #2 | Leg curl | 3 × 14–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-23 | str_lower #2 | Squat bulgare | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-23 | str_lower #2 | Mollets machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-19 str_upper #1 — graine `strength:str_upper:strength_volume:1` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, chest, shoulders ; au haut ou au-delà : glutes ; emplacements omis : up.trunk (volume)
- 2026-10-20 str_lower #1 — graine `strength:str_lower:strength_volume:1` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)
- 2026-10-21 str_upper #2 — graine `strength:str_upper:strength_volume:2` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, chest ; au haut ou au-delà : glutes ; emplacements omis : up.iso_upper (volume)
- 2026-10-23 str_lower #2 — graine `strength:str_lower:strength_volume:2` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume) ; **réalisation : last_set_missed**

Exercices principaux (ancres) :

| Jour | Exercice | Prescription | RIR cible | RIR observé | Preuve | Réussites exactes consécutives | e1RM (nature) | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-19 | Développé couché | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 4 | 48 (lower_bound) | maintien (estimate) ; BLOCKED (réussite exacte) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-19 | Tractions | 3 × 10–12 @ PDC | 2 | inconnu | exact_effort_unknown | 0 | — | **+reps** | 3 × 11–12 · RIR 2 |
| 2026-10-20 | Squat barre | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 4 | 48 (lower_bound) | maintien (estimate) ; BLOCKED (réussite exacte) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-20 | Soulevé de terre roumain | 3 × 10–12 @ 40 kg | 2 | inconnu | exact_effort_unknown | 0 | 56 (lower_bound) | **+reps** | 3 × 11–12 @ 40 kg · RIR 2 |
| 2026-10-21 | Développé couché | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 5 | 48 (lower_bound) | maintien (evidence) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-21 | Tractions | 3 × 10–12 @ PDC | 2 | inconnu | exact_effort_unknown | 0 | — | **+reps** | 3 × 12 · RIR 2 |
| 2026-10-23 | Squat barre | 3 × 6 @ 40 kg | 2 | inconnu | partial_sets | 0 | 48 (lower_bound) | maintien (partial) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-23 | Soulevé de terre roumain | 3 × 10–12 @ 40 kg | 2 | inconnu | exact_effort_unknown | 0 | 56 (lower_bound) | **+reps** | 3 × 12 @ 40 kg · RIR 2 |

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 18 | 18 | achieved |
| back | 10 | 20 | 10 | 10 | achieved |
| calves | 4 | 10 | 6 | 6 | achieved |
| chest | 10 | 20 | 12 | 12 | achieved |
| core | 4 | 10 | 9 | 8.5 | achieved |
| glutes | 6 | 14 | 16 | 15 | achieved |
| hamstrings | 8 | 14 | 12 | 12 | achieved |
| quads | 10 | 18 | 10 | 9 | achieved |
| shoulders | 8 | 16 | 15 | 15 | achieved |

Objectif de volume de la semaine : **satisfied** (4/4 séances). Contraintes tracées : slot_omitted:volume (lo.trunk) ; slot_omitted:volume (up.iso_upper) ; slot_omitted:volume (up.trunk).

Priorité déclarée (programme) : strength ; reçue par Strength : rang 1 ; voisines : aucune ; politique : blocked:priority_interference_policy.

Décisions bloquées (après réalisation) : réussite exacte sans marge (autoregulated, RIR not_collected) : hausse non gouvernée ; réussite exacte sans marge (autoregulated, RIR not_collected) : hausse non gouvernée.

## Semaine 4 — 2026-10-26

| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |
|---|---|---|---|---|---|---|---|---|
| 2026-10-26 | str_upper #1 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (estimate) ; réussite exacte : hausse non gouvernée (BLOCKED) |
| 2026-10-26 | str_upper #1 | Tractions ⚓ | 3 × 12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; haut de plage au poids du corps : méthode non gouvernée (BLOCKED) |
| 2026-10-26 | str_upper #1 | Tirage horizontal poulie | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-26 | str_upper #1 | Développé épaules machine | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (granularity_effort_unknown) |
| 2026-10-26 | str_upper #1 | Pec deck | 3 × 14–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-26 | str_upper #1 | Élévations latérales machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | ajouté (instance supplémentaire de l’emplacement ; critère : track) | aucune track (accessoire non suivi) |
| 2026-10-27 | str_lower #1 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-27 | str_lower #1 | Soulevé de terre roumain ⚓ | 3 × 12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-27 | str_lower #1 | Leg curl | 3 × 16–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-27 | str_lower #1 | Squat bulgare | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression charge** |
| 2026-10-27 | str_lower #1 | Mollets machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-28 | str_upper #2 | Développé couché ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (evidence) |
| 2026-10-28 | str_upper #2 | Tractions ⚓ | 3 × 12 | 2 | poids du corps | track | conservé | exposition on_target (réussite exacte) ; haut de plage au poids du corps : méthode non gouvernée (BLOCKED) |
| 2026-10-28 | str_upper #2 | Tirage horizontal poulie | 2 × 10–12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-28 | str_upper #2 | Développé épaules machine | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (granularity_effort_unknown) |
| 2026-10-28 | str_upper #2 | Pec deck | 3 × 14–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-28 | str_upper #2 | Pallof press | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |
| 2026-10-30 | str_lower #2 | Squat barre ⚓ | 3 × 6 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; maintien (estimate) ; réussite exacte : hausse non gouvernée (BLOCKED) |
| 2026-10-30 | str_lower #2 | Soulevé de terre roumain ⚓ | 3 × 12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-30 | str_lower #2 | Leg curl | 3 × 16–20 | 1 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-30 | str_lower #2 | Squat bulgare | 2 × 12 | 2 | 40 kg | track | conservé | exposition on_target (réussite exacte) ; **progression répétitions** |
| 2026-10-30 | str_lower #2 | Mollets machine | 3 × 12–20 | 1 | à l’effort (calibration) | historique | conservé | aucune track (accessoire non suivi) |

Séances Strength :

- 2026-10-26 str_upper #1 — graine `strength:str_upper:strength_volume:1` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, chest, quads, shoulders ; au haut ou au-delà : glutes ; emplacements omis : up.trunk (volume)
- 2026-10-27 str_lower #1 — graine `strength:str_lower:strength_volume:1` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)
- 2026-10-28 str_upper #2 — graine `strength:str_upper:strength_volume:2` ; ancres déclarées : Développé couché, Tractions ; sous le plancher (prévu + réalisé avant la séance) : back, chest, quads ; au haut ou au-delà : glutes ; emplacements omis : up.iso_upper (volume)
- 2026-10-30 str_lower #2 — graine `strength:str_lower:strength_volume:2` ; ancres déclarées : Squat barre, Soulevé de terre roumain ; sous le plancher (prévu + réalisé avant la séance) : calves, hamstrings, quads ; au haut ou au-delà : arms ; emplacements omis : lo.trunk (volume)

Exercices principaux (ancres) :

| Jour | Exercice | Prescription | RIR cible | RIR observé | Preuve | Réussites exactes consécutives | e1RM (nature) | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-26 | Développé couché | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 6 | 48 (lower_bound) | maintien (estimate) ; BLOCKED (réussite exacte) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-26 | Tractions | 3 × 12 @ PDC | 2 | inconnu | exact_effort_unknown | 1 | — | BLOCKED (méthode PDC, effort unknown) | 3 × 12 · RIR 2 |
| 2026-10-27 | Squat barre | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 1 | 48 (lower_bound) | maintien (evidence) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-27 | Soulevé de terre roumain | 3 × 12 @ 40 kg | 2 | inconnu | exact_effort_unknown | 0 | 56 (lower_bound) | **+charge** | 3 × 8–12 @ 42.5 kg · RIR 2 |
| 2026-10-28 | Développé couché | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 7 | 48 (lower_bound) | maintien (evidence) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-28 | Tractions | 3 × 12 @ PDC | 2 | inconnu | exact_effort_unknown | 2 | — | BLOCKED (méthode PDC, effort unknown) | 3 × 12 · RIR 2 |
| 2026-10-30 | Squat barre | 3 × 6 @ 40 kg | 2 | inconnu | exact_effort_unknown | 2 | 48 (lower_bound) | maintien (estimate) ; BLOCKED (réussite exacte) | 4 × 6 @ 40 kg · RIR 2 |
| 2026-10-30 | Soulevé de terre roumain | 3 × 12 @ 40 kg | 2 | inconnu | exact_effort_unknown | 0 | 56 (lower_bound) | **+reps** | 3 × 9–12 @ 42.5 kg · RIR 2 |

| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |
|---|---|---|---|---|---|
| arms | 6 | 14 | 18 | 18 | achieved |
| back | 10 | 20 | 10 | 10 | achieved |
| calves | 4 | 10 | 6 | 6 | achieved |
| chest | 10 | 20 | 12 | 12 | achieved |
| core | 4 | 10 | 9 | 9 | achieved |
| glutes | 6 | 14 | 16 | 16 | achieved |
| hamstrings | 8 | 14 | 12 | 12 | achieved |
| quads | 10 | 18 | 10 | 10 | achieved |
| shoulders | 8 | 16 | 15 | 15 | achieved |

Objectif de volume de la semaine : **satisfied** (4/4 séances). Contraintes tracées : slot_omitted:volume (lo.trunk) ; slot_omitted:volume (up.iso_upper) ; slot_omitted:volume (up.trunk).

Priorité déclarée (programme) : strength ; reçue par Strength : rang 1 ; voisines : aucune ; politique : blocked:priority_interference_policy.

Décisions bloquées (après réalisation) : réussite exacte sans marge (autoregulated, RIR not_collected) : hausse non gouvernée ; poids du corps en haut de plage (Tractions) : méthodes possibles added_load, harder_variant, new_rep_range, hold, aucune gouvernée ; réussite exacte sans marge (autoregulated, RIR not_collected) : hausse non gouvernée.

## Récapitulatif

- Continuité : 39 exercices en place conservés par la continuité déclarée (hors ancres déclarées), 4 remplacés (declared_anchor ×4).
- Progression : répétitions ×32, charge ×2, maintiens ×16, régressions ×0.
- Preuves : réussites exactes ×51, dépassements ×0, sans preuve ×1.
- Décisions bloquées : réussite exacte ×6 (effort observé ×0, effort inconnu ×6), poids du corps ×2.
- Effort : expositions avec effort observé ×0, effort inconnu ×52.
- État persisté (JSON compact, saveState) après 4 semaines : 279 Ko.

