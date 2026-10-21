# Banc qualité Musculation (RC4.6 L0) — référence

Chemin réel de l'application, 6 semaines, 8 profils. Définitions : voir `tests/rc46/quality-bench.ts`. Valeurs par semaine (moyenne) sauf mention.

## Synthèse

| Profil | Séances | Poussée / tirage (séries) | Rapport | Groupes sous plancher (sem.) | Au-dessus borne haute (sem.) | Allégées | Divergences R-A | Durée moy. / max (min) | Dépassements |
|---|---|---|---|---|---|---|---|---|---|
| P1 | 18 | 18.3 / 9.2 | 1.99 | quads 5, hamstrings 2, calves 4, back 5 | arms 6 | 12 | 0 | 50 / 63 | 0 |
| P1b | 24 | 19.5 / 10.2 | 1.91 | quads 1, hamstrings 1, calves 1 | arms 6, core 2 | 24 | 0 | 44 / 60 | 0 |
| P2 | 18 | 18.3 / 9.3 | 1.97 | quads 3, calves 1, back 4 | glutes 6, arms 6 | 0 | 0 | 56 / 64 | 0 |
| P3 | 18 | 17.8 / 9 | 1.98 | quads 4, hamstrings 1, calves 5, chest 1, back 5 | glutes 1, arms 6 | 6 | 0 | 51 / 63 | 0 |
| P4 | 0 | 0 / 0 | — | — | — | 0 | 0 | — / — | 0 |
| P5 | 18 | 18.3 / 9.3 | 1.97 | quads 5, hamstrings 5, calves 5, back 4 | arms 6 | 18 | 0 | 46 / 70 | 0 |
| S3 | 18 | 18 / 9.5 | 1.89 | quads 3, calves 4, back 3 | glutes 6, arms 6 | 0 | 0 | 53 / 63 | 0 |
| S4 | 24 | 19.5 / 10.2 | 1.91 | calves 6 | glutes 6, arms 6 | 0 | 0 | 48 / 60 | 0 |

## P1 — Musculation 3× (masse) + Course 2× (10 km)

| Groupe | Direct | Indirect | Total | Plancher – borne |
|---|---|---|---|---|
| quads | 7.5 | 0 | 7.5 | 10 – 18 |
| hamstrings | 8.5 | 0 | 8.5 | 8 – 14 |
| glutes | 11.8 | 0 | 11.8 | 6 – 14 |
| calves | 1.3 | 0 | 1.3 | 4 – 10 |
| chest | 13.7 | 0 | 13.7 | 10 – 20 |
| back | 9.2 | 0 | 9.2 | 10 – 20 |
| shoulders | 4.7 | 8.9 | 13.6 | 8 – 16 |
| arms | 14.2 | 2.1 | 16.3 | 6 – 14 |
| core | 3.5 | 4.3 | 7.8 | 4 – 10 |

| Archétype | Séances | Exercices distincts | Compositions distinctes | Identiques à la précédente | Similarité moyenne | Principaux distincts |
|---|---|---|---|---|---|---|
| str_full_body | 18 | 14 | 10 | 0 | 0.17 | 2 |

Continuité : 88 transitions, exercice changé 5, retour en calibration 0, baisse de charge 0, baisse de répétitions à charge égale 0 ; items chargés 66, poids du corps 9, à l'effort 24.
Emplacements toujours « à l'effort » (≥ 3 expositions) : str_full_body/fb.trunk:cable_pallof_press×7.
Allègements : 12 séances, 37 réductions {"full":16,"full_and_signal":3,"rir_only":18} ; arbitrages {"moved/strength":1}.
Reproductibilité (R-A, à la planification de chaque semaine) : {"identical":18,"progression_since_planning":0,"history_since_planning":0,"planner_divergence":0,"not_regenerable":0}.
Durées : moyenne 50 min, maximum 63 min, dépassements du temps disponible 0.

## P1b — Musculation 4× (masse) + Course 2× (10 km)

| Groupe | Direct | Indirect | Total | Plancher – borne |
|---|---|---|---|---|
| quads | 9.2 | 0 | 9.2 | 10 – 18 |
| hamstrings | 8.2 | 0 | 8.2 | 8 – 14 |
| glutes | 12.3 | 0 | 12.3 | 6 – 14 |
| calves | 3.3 | 0 | 3.3 | 4 – 10 |
| chest | 12.3 | 0 | 12.3 | 10 – 20 |
| back | 10.2 | 0 | 10.2 | 10 – 20 |
| shoulders | 7.2 | 8 | 15.2 | 8 – 16 |
| arms | 16.2 | 2.1 | 18.3 | 6 – 14 |
| core | 4.2 | 5.2 | 9.4 | 4 – 10 |

| Archétype | Séances | Exercices distincts | Compositions distinctes | Identiques à la précédente | Similarité moyenne | Principaux distincts |
|---|---|---|---|---|---|---|
| str_upper | 12 | 9 | 5 | 0 | 0.69 | 1 |
| str_lower | 12 | 7 | 3 | 0 | 0.33 | 1 |

Continuité : 107 transitions, exercice changé 25, retour en calibration 0, baisse de charge 0, baisse de répétitions à charge égale 0 ; items chargés 70, poids du corps 11, à l'effort 37.
Emplacements toujours « à l'effort » (≥ 3 expositions) : str_upper/up.iso_upper:machine_lateral_raise×6 ; str_upper/up.trunk:cable_pallof_press×8 ; str_lower/lo.iso_lower:leg_curl×5.
Allègements : 24 séances, 62 réductions {"full":19,"full_and_signal":12,"rir_only":31} ; arbitrages {"conflict/running":2,"conflict/strength":2}.
Reproductibilité (R-A, à la planification de chaque semaine) : {"identical":24,"progression_since_planning":0,"history_since_planning":0,"planner_divergence":0,"not_regenerable":0}.
Durées : moyenne 44 min, maximum 60 min, dépassements du temps disponible 0.

## P2 — Musculation 3× (masse) + Cross-training 2×

| Groupe | Direct | Indirect | Total | Plancher – borne |
|---|---|---|---|---|
| quads | 10.7 | 0 | 10.7 | 10 – 18 |
| hamstrings | 11.7 | 0 | 11.7 | 8 – 14 |
| glutes | 15.2 | 0 | 15.2 | 6 – 14 |
| calves | 3.3 | 0 | 3.3 | 4 – 10 |
| chest | 13.7 | 0 | 13.7 | 10 – 20 |
| back | 9.3 | 0 | 9.3 | 10 – 20 |
| shoulders | 4.7 | 9 | 13.7 | 8 – 16 |
| arms | 14.2 | 2.2 | 16.4 | 6 – 14 |
| core | 3 | 4.6 | 7.6 | 4 – 10 |

| Archétype | Séances | Exercices distincts | Compositions distinctes | Identiques à la précédente | Similarité moyenne | Principaux distincts |
|---|---|---|---|---|---|---|
| str_full_body | 18 | 14 | 12 | 0 | 0.24 | 2 |

Continuité : 104 transitions, exercice changé 5, retour en calibration 0, baisse de charge 0, baisse de répétitions à charge égale 0 ; items chargés 81, poids du corps 9, à l'effort 25.
Emplacements toujours « à l'effort » (≥ 3 expositions) : str_full_body/fb.trunk:cable_pallof_press×6.
Allègements : 0 séances, 0 réductions {} ; arbitrages {"moved/strength":6}.
Reproductibilité (R-A, à la planification de chaque semaine) : {"identical":18,"progression_since_planning":0,"history_since_planning":0,"planner_divergence":0,"not_regenerable":0}.
Durées : moyenne 56 min, maximum 64 min, dépassements du temps disponible 0.

## P3 — Musculation 3× (masse) + HYROX 2×

| Groupe | Direct | Indirect | Total | Plancher – borne |
|---|---|---|---|---|
| quads | 9.2 | 0 | 9.2 | 10 – 18 |
| hamstrings | 9.8 | 0 | 9.8 | 8 – 14 |
| glutes | 12.8 | 0 | 12.8 | 6 – 14 |
| calves | 0.7 | 0 | 0.7 | 4 – 10 |
| chest | 13.2 | 0 | 13.2 | 10 – 20 |
| back | 9 | 0 | 9 | 10 – 20 |
| shoulders | 4.7 | 8.8 | 13.5 | 8 – 16 |
| arms | 13.8 | 2.2 | 16 | 6 – 14 |
| core | 3.5 | 4.3 | 7.8 | 4 – 10 |

| Archétype | Séances | Exercices distincts | Compositions distinctes | Identiques à la précédente | Similarité moyenne | Principaux distincts |
|---|---|---|---|---|---|---|
| str_full_body | 18 | 15 | 14 | 0 | 0.18 | 3 |

Continuité : 93 transitions, exercice changé 7, retour en calibration 0, baisse de charge 0, baisse de répétitions à charge égale 0 ; items chargés 69, poids du corps 9, à l'effort 26.
Emplacements toujours « à l'effort » (≥ 3 expositions) : str_full_body/fb.trunk:cable_pallof_press×7.
Allègements : 6 séances, 17 réductions {"full":8,"full_and_signal":4,"rir_only":5} ; arbitrages {"moved/strength":5,"recomposed":2}.
Reproductibilité (R-A, à la planification de chaque semaine) : {"identical":18,"progression_since_planning":0,"history_since_planning":0,"planner_divergence":0,"not_regenerable":0}.
Durées : moyenne 51 min, maximum 63 min, dépassements du temps disponible 0.

## P4 — Course 3× (semi) + HYROX 2×

Aucune séance de musculation.

## P5 — Quatre sports : Musculation 3×, Course 2×, Cross-training 1×, HYROX 1×

| Groupe | Direct | Indirect | Total | Plancher – borne |
|---|---|---|---|---|
| quads | 4.3 | 0 | 4.3 | 10 – 18 |
| hamstrings | 4.3 | 0 | 4.3 | 8 – 14 |
| glutes | 7.5 | 0 | 7.5 | 6 – 14 |
| calves | 0.7 | 0 | 0.7 | 4 – 10 |
| chest | 13.2 | 0 | 13.2 | 10 – 20 |
| back | 9.3 | 0 | 9.3 | 10 – 20 |
| shoulders | 5.2 | 9.1 | 14.3 | 8 – 16 |
| arms | 13.5 | 2.5 | 16 | 6 – 14 |
| core | 5.7 | 3.4 | 9.1 | 4 – 10 |

| Archétype | Séances | Exercices distincts | Compositions distinctes | Identiques à la précédente | Similarité moyenne | Principaux distincts |
|---|---|---|---|---|---|---|
| str_full_body | 18 | 13 | 11 | 0 | 0.16 | 3 |

Continuité : 77 transitions, exercice changé 3, retour en calibration 0, baisse de charge 0, baisse de répétitions à charge égale 0 ; items chargés 52, poids du corps 9, à l'effort 27.
Emplacements toujours « à l'effort » (≥ 3 expositions) : str_full_body/fb.trunk:cable_pallof_press×11.
Allègements : 18 séances, 79 réductions {"full":35,"full_and_signal":11,"rir_only":33} ; arbitrages {"conflict/crosstraining":3,"conflict/hyrox":8,"conflict/running":2,"conflict/strength":6,"recomposed/strength":1}.
Reproductibilité (R-A, à la planification de chaque semaine) : {"identical":18,"progression_since_planning":0,"history_since_planning":0,"planner_divergence":0,"not_regenerable":0}.
Durées : moyenne 46 min, maximum 70 min, dépassements du temps disponible 0.

## S3 — Musculation 3× seule

| Groupe | Direct | Indirect | Total | Plancher – borne |
|---|---|---|---|---|
| quads | 10.7 | 0 | 10.7 | 10 – 18 |
| hamstrings | 11.7 | 0 | 11.7 | 8 – 14 |
| glutes | 15.2 | 0 | 15.2 | 6 – 14 |
| calves | 1.3 | 0 | 1.3 | 4 – 10 |
| chest | 12.8 | 0 | 12.8 | 10 – 20 |
| back | 9.5 | 0 | 9.5 | 10 – 20 |
| shoulders | 5.2 | 8.9 | 14.1 | 8 – 16 |
| arms | 13.7 | 2.5 | 16.2 | 6 – 14 |
| core | 2.5 | 4.6 | 7.1 | 4 – 10 |

| Archétype | Séances | Exercices distincts | Compositions distinctes | Identiques à la précédente | Similarité moyenne | Principaux distincts |
|---|---|---|---|---|---|---|
| str_full_body | 18 | 12 | 9 | 0 | 0.24 | 2 |

Continuité : 99 transitions, exercice changé 1, retour en calibration 0, baisse de charge 0, baisse de répétitions à charge égale 0 ; items chargés 76, poids du corps 9, à l'effort 25.
Emplacements toujours « à l'effort » (≥ 3 expositions) : str_full_body/fb.trunk:cable_pallof_press×5.
Allègements : 0 séances, 0 réductions {} ; arbitrages {}.
Reproductibilité (R-A, à la planification de chaque semaine) : {"identical":18,"progression_since_planning":0,"history_since_planning":0,"planner_divergence":0,"not_regenerable":0}.
Durées : moyenne 53 min, maximum 63 min, dépassements du temps disponible 0.

## S4 — Musculation 4× seule

| Groupe | Direct | Indirect | Total | Plancher – borne |
|---|---|---|---|---|
| quads | 16.3 | 0 | 16.3 | 10 – 18 |
| hamstrings | 12.2 | 0 | 12.2 | 8 – 14 |
| glutes | 16.2 | 0 | 16.2 | 6 – 14 |
| calves | 0 | 0 | 0 | 4 – 10 |
| chest | 12.3 | 0 | 12.3 | 10 – 20 |
| back | 10.2 | 0 | 10.2 | 10 – 20 |
| shoulders | 7.2 | 8 | 15.2 | 8 – 16 |
| arms | 16.2 | 2.1 | 18.3 | 6 – 14 |
| core | 3.2 | 5.8 | 9 | 4 – 10 |

| Archétype | Séances | Exercices distincts | Compositions distinctes | Identiques à la précédente | Similarité moyenne | Principaux distincts |
|---|---|---|---|---|---|---|
| str_upper | 12 | 9 | 4 | 0 | 0.66 | 1 |
| str_lower | 12 | 6 | 2 | 9 | 0.94 | 1 |

Continuité : 122 transitions, exercice changé 39, retour en calibration 0, baisse de charge 0, baisse de répétitions à charge égale 0 ; items chargés 80, poids du corps 11, à l'effort 41.
Emplacements toujours « à l'effort » (≥ 3 expositions) : str_upper/up.iso_upper:machine_lateral_raise×6 ; str_upper/up.trunk:cable_pallof_press×6 ; str_lower/lo.iso_lower:leg_curl×12.
Allègements : 0 séances, 0 réductions {} ; arbitrages {}.
Reproductibilité (R-A, à la planification de chaque semaine) : {"identical":24,"progression_since_planning":0,"history_since_planning":0,"planner_divergence":0,"not_regenerable":0}.
Durées : moyenne 48 min, maximum 60 min, dépassements du temps disponible 0.
