# Strength S5 — Scénario C : preuves longitudinales

Chaque exposition réalise la prescription courante de la track (charge prescrite) ; seuls varient les répétitions et le RIR saisis (TEST_ONLY).
Ruleset : e1RM = charge × (1 + (reps + RIR) / 30) ; lissage = médiane (estimation de la track, mesure) ; charge suivante = arrondi inférieur au pas de 2.5 kg de e1RM × pctByRepsToFailure[reps + RIR], au plus +1 pas ; preuves requises (autorégulé) = 2.

## A — Réussite exacte, RIR connu (= cible)

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 1 | maintien (evidence) | 6 @ 40 kg |
| 2 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 2 | maintien (estimate) ; BLOCKED exact_success | 6 @ 40 kg |
| 3 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 3 | maintien (evidence) | 6 @ 40 kg |
| 4 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 4 | maintien (estimate) ; BLOCKED exact_success | 6 @ 40 kg |
| 5 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 5 | maintien (evidence) | 6 @ 40 kg |
| 6 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 6 | maintien (estimate) ; BLOCKED exact_success | 6 @ 40 kg |
| 7 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 7 | maintien (evidence) | 6 @ 40 kg |
| 8 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 8 | maintien (estimate) ; BLOCKED exact_success | 6 @ 40 kg |

## B — Réussite exacte, RIR inconnu

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 48 (lower_bound) | 1 | maintien (evidence) | 6 @ 40 kg |
| 2 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 48 (lower_bound) | 2 | maintien (estimate) ; BLOCKED exact_success_effort_unknown | 6 @ 40 kg |
| 3 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 48 (lower_bound) | 3 | maintien (evidence) | 6 @ 40 kg |
| 4 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 48 (lower_bound) | 4 | maintien (estimate) ; BLOCKED exact_success_effort_unknown | 6 @ 40 kg |
| 5 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 48 (lower_bound) | 5 | maintien (evidence) | 6 @ 40 kg |
| 6 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 48 (lower_bound) | 6 | maintien (estimate) ; BLOCKED exact_success_effort_unknown | 6 @ 40 kg |
| 7 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 48 (lower_bound) | 7 | maintien (evidence) | 6 @ 40 kg |
| 8 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 48 (lower_bound) | 8 | maintien (estimate) ; BLOCKED exact_success_effort_unknown | 6 @ 40 kg |

## C1 — Meilleur RIR que prévu (+1 : RIR 3)

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 50.67 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 2 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 51.33 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |
| 3 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 51.33 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 4 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 51.67 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |
| 5 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 51.67 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 6 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 51.83 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |
| 7 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 51.83 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 8 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 51.92 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |

## C2 — Meilleur RIR que prévu (+2 : RIR 4)

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 50.67 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 2 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 52 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |
| 3 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 52 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 4 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 52.67 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |
| 5 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 52.67 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 6 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 53 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |
| 7 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 53 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 8 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 53.17 (observed) | 0 | **+charge** | 6 @ 42.5 kg |

## D1 — Plus de répétitions que prévu (8 au lieu de 6), RIR inconnu

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 6 @ 40 kg · RIR 2 | 8 reps · RIR inconnu | on_target | 50.67 (—) | 0 | maintien (evidence) | 6 @ 40 kg |
| 2 | 6 @ 40 kg · RIR 2 | 8 reps · RIR inconnu | on_target | 50.67 (—) | 0 | maintien (estimate) | 6 @ 40 kg |
| 3 | 6 @ 40 kg · RIR 2 | 8 reps · RIR inconnu | on_target | 50.67 (—) | 0 | maintien (evidence) | 6 @ 40 kg |
| 4 | 6 @ 40 kg · RIR 2 | 8 reps · RIR inconnu | on_target | 50.67 (—) | 0 | maintien (estimate) | 6 @ 40 kg |
| 5 | 6 @ 40 kg · RIR 2 | 8 reps · RIR inconnu | on_target | 50.67 (—) | 0 | maintien (evidence) | 6 @ 40 kg |
| 6 | 6 @ 40 kg · RIR 2 | 8 reps · RIR inconnu | on_target | 50.67 (—) | 0 | maintien (estimate) | 6 @ 40 kg |
| 7 | 6 @ 40 kg · RIR 2 | 8 reps · RIR inconnu | on_target | 50.67 (—) | 0 | maintien (evidence) | 6 @ 40 kg |
| 8 | 6 @ 40 kg · RIR 2 | 8 reps · RIR inconnu | on_target | 50.67 (—) | 0 | maintien (estimate) | 6 @ 40 kg |

## D2 — Plus de répétitions que prévu (10 au lieu de 6), RIR inconnu

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 6 @ 40 kg · RIR 2 | 10 reps · RIR inconnu | on_target | 50.67 (—) | 0 | maintien (evidence) | 6 @ 40 kg |
| 2 | 6 @ 40 kg · RIR 2 | 10 reps · RIR inconnu | on_target | 53.33 (lower_bound) | 0 | **+charge** | 6 @ 42.5 kg |
| 3 | 6 @ 42.5 kg · RIR 2 | 10 reps · RIR inconnu | on_target | 53.33 (lower_bound) | 0 | maintien (evidence) | 6 @ 42.5 kg |
| 4 | 6 @ 42.5 kg · RIR 2 | 10 reps · RIR inconnu | on_target | 56.67 (lower_bound) | 0 | **+charge** | 6 @ 45 kg |
| 5 | 6 @ 45 kg · RIR 2 | 10 reps · RIR inconnu | on_target | 56.67 (lower_bound) | 0 | maintien (evidence) | 6 @ 45 kg |
| 6 | 6 @ 45 kg · RIR 2 | 10 reps · RIR inconnu | on_target | 56.67 (lower_bound) | 0 | CAP_REACHED | 6 @ 45 kg |
| 7 | 6 @ 45 kg · RIR 2 | 10 reps · RIR inconnu | on_target | 56.67 (lower_bound) | 0 | maintien (evidence) | 6 @ 45 kg |
| 8 | 6 @ 45 kg · RIR 2 | 10 reps · RIR inconnu | on_target | 56.67 (lower_bound) | 0 | CAP_REACHED | 6 @ 45 kg |

## E — Amélioration progressive sous le pas de charge (RIR 2 → 3 → 3 → 4 → 4…)

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 1 | maintien (evidence) | 6 @ 40 kg |
| 2 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 51.33 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |
| 3 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 3 | above | 51.33 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 4 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 52.33 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |
| 5 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 52.33 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 6 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 52.83 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |
| 7 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 52.83 (observed) | 0 | maintien (evidence) | 6 @ 40 kg |
| 8 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 4 | above | 53.08 (observed) | 0 | maintien (estimate) | 6 @ 40 kg |

## H — Effort observé une séance sur deux (RIR 2 saisi, puis rien)

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 1 | maintien (evidence) | 6 @ 40 kg |
| 2 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 50.67 (observed) | 2 | maintien (estimate) ; BLOCKED exact_success_effort_unknown | 6 @ 40 kg |
| 3 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 3 | maintien (evidence) | 6 @ 40 kg |
| 4 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 50.67 (observed) | 4 | maintien (estimate) ; BLOCKED exact_success_effort_unknown | 6 @ 40 kg |
| 5 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 5 | maintien (evidence) | 6 @ 40 kg |
| 6 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 50.67 (observed) | 6 | maintien (estimate) ; BLOCKED exact_success_effort_unknown | 6 @ 40 kg |
| 7 | 6 @ 40 kg · RIR 2 | 6 reps · RIR 2 | on_target | 50.67 (observed) | 7 | maintien (evidence) | 6 @ 40 kg |
| 8 | 6 @ 40 kg · RIR 2 | 6 reps · RIR inconnu | on_target | 50.67 (observed) | 8 | maintien (estimate) ; BLOCKED exact_success_effort_unknown | 6 @ 40 kg |

## F1 — Double progression (accessoire), réussite exacte RIR connu

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 10–15 @ 40 kg · RIR 1 | 15 reps · RIR 1 | on_target | — | 0 | **+reps** | 11–15 @ 40 kg |
| 2 | 11–15 @ 40 kg · RIR 1 | 15 reps · RIR 1 | on_target | — | 0 | **+reps** | 12–15 @ 40 kg |
| 3 | 12–15 @ 40 kg · RIR 1 | 15 reps · RIR 1 | on_target | — | 0 | **+reps** | 13–15 @ 40 kg |
| 4 | 13–15 @ 40 kg · RIR 1 | 15 reps · RIR 1 | on_target | — | 0 | **+reps** | 14–15 @ 40 kg |
| 5 | 14–15 @ 40 kg · RIR 1 | 15 reps · RIR 1 | on_target | — | 0 | **+reps** | 15–15 @ 40 kg |
| 6 | 15–15 @ 40 kg · RIR 1 | 15 reps · RIR 1 | on_target | — | 0 | **+charge** | 10–15 @ 45 kg |
| 7 | 10–15 @ 45 kg · RIR 1 | 15 reps · RIR 1 | on_target | — | 0 | **+reps** | 11–15 @ 45 kg |
| 8 | 11–15 @ 45 kg · RIR 1 | 15 reps · RIR 1 | on_target | — | 0 | **+reps** | 12–15 @ 45 kg |

## F2 — Double progression (accessoire), réussite exacte RIR inconnu

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 10–15 @ 40 kg · RIR 1 | 15 reps · RIR inconnu | on_target | — | 0 | **+reps** | 11–15 @ 40 kg |
| 2 | 11–15 @ 40 kg · RIR 1 | 15 reps · RIR inconnu | on_target | — | 0 | **+reps** | 12–15 @ 40 kg |
| 3 | 12–15 @ 40 kg · RIR 1 | 15 reps · RIR inconnu | on_target | — | 0 | **+reps** | 13–15 @ 40 kg |
| 4 | 13–15 @ 40 kg · RIR 1 | 15 reps · RIR inconnu | on_target | — | 0 | **+reps** | 14–15 @ 40 kg |
| 5 | 14–15 @ 40 kg · RIR 1 | 15 reps · RIR inconnu | on_target | — | 0 | **+reps** | 15–15 @ 40 kg |
| 6 | 15–15 @ 40 kg · RIR 1 | 15 reps · RIR inconnu | on_target | — | 0 | **+charge** | 10–15 @ 45 kg |
| 7 | 10–15 @ 45 kg · RIR 1 | 15 reps · RIR inconnu | on_target | — | 0 | **+reps** | 11–15 @ 45 kg |
| 8 | 11–15 @ 45 kg · RIR 1 | 15 reps · RIR inconnu | on_target | — | 0 | **+reps** | 12–15 @ 45 kg |

## G1 — Tractions en haut de plage, RIR 4 (réserve)

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 12–12 PDC · RIR 2 | 12 reps · RIR 4 | above | — | 0 | BLOCKED méthode PDC (effort reserve_above_target) | 12–12 PDC |
| 2 | 12–12 PDC · RIR 2 | 12 reps · RIR 4 | above | — | 0 | BLOCKED méthode PDC (effort reserve_above_target) | 12–12 PDC |
| 3 | 12–12 PDC · RIR 2 | 12 reps · RIR 4 | above | — | 0 | BLOCKED méthode PDC (effort reserve_above_target) | 12–12 PDC |
| 4 | 12–12 PDC · RIR 2 | 12 reps · RIR 4 | above | — | 0 | BLOCKED méthode PDC (effort reserve_above_target) | 12–12 PDC |
| 5 | 12–12 PDC · RIR 2 | 12 reps · RIR 4 | above | — | 0 | BLOCKED méthode PDC (effort reserve_above_target) | 12–12 PDC |
| 6 | 12–12 PDC · RIR 2 | 12 reps · RIR 4 | above | — | 0 | BLOCKED méthode PDC (effort reserve_above_target) | 12–12 PDC |
| 7 | 12–12 PDC · RIR 2 | 12 reps · RIR 4 | above | — | 0 | BLOCKED méthode PDC (effort reserve_above_target) | 12–12 PDC |
| 8 | 12–12 PDC · RIR 2 | 12 reps · RIR 4 | above | — | 0 | BLOCKED méthode PDC (effort reserve_above_target) | 12–12 PDC |

## G2 — Tractions en haut de plage, RIR 0 (à l’échec)

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 12–12 PDC · RIR 2 | 12 reps · RIR 0 | below | — | 0 | maintien (below) | 12–12 PDC |
| 2 | 12–12 PDC · RIR 2 | 12 reps · RIR 0 | below | — | 0 | maintien (below) | 12–12 PDC |
| 3 | 12–12 PDC · RIR 2 | 12 reps · RIR 0 | below | — | 0 | maintien (below) | 12–12 PDC |
| 4 | 12–12 PDC · RIR 2 | 12 reps · RIR 0 | below | — | 0 | maintien (below) | 12–12 PDC |
| 5 | 12–12 PDC · RIR 2 | 12 reps · RIR 0 | below | — | 0 | maintien (below) | 12–12 PDC |
| 6 | 12–12 PDC · RIR 2 | 12 reps · RIR 0 | below | — | 0 | maintien (below) | 12–12 PDC |
| 7 | 12–12 PDC · RIR 2 | 12 reps · RIR 0 | below | — | 0 | maintien (below) | 12–12 PDC |
| 8 | 12–12 PDC · RIR 2 | 12 reps · RIR 0 | below | — | 0 | maintien (below) | 12–12 PDC |

## G3 — Tractions en haut de plage, RIR inconnu

| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |
|---|---|---|---|---|---|---|---|
| 1 | 12–12 PDC · RIR 2 | 12 reps · RIR inconnu | on_target | — | 1 | BLOCKED méthode PDC (effort unknown) | 12–12 PDC |
| 2 | 12–12 PDC · RIR 2 | 12 reps · RIR inconnu | on_target | — | 2 | BLOCKED méthode PDC (effort unknown) | 12–12 PDC |
| 3 | 12–12 PDC · RIR 2 | 12 reps · RIR inconnu | on_target | — | 3 | BLOCKED méthode PDC (effort unknown) | 12–12 PDC |
| 4 | 12–12 PDC · RIR 2 | 12 reps · RIR inconnu | on_target | — | 4 | BLOCKED méthode PDC (effort unknown) | 12–12 PDC |
| 5 | 12–12 PDC · RIR 2 | 12 reps · RIR inconnu | on_target | — | 5 | BLOCKED méthode PDC (effort unknown) | 12–12 PDC |
| 6 | 12–12 PDC · RIR 2 | 12 reps · RIR inconnu | on_target | — | 6 | BLOCKED méthode PDC (effort unknown) | 12–12 PDC |
| 7 | 12–12 PDC · RIR 2 | 12 reps · RIR inconnu | on_target | — | 7 | BLOCKED méthode PDC (effort unknown) | 12–12 PDC |
| 8 | 12–12 PDC · RIR 2 | 12 reps · RIR inconnu | on_target | — | 8 | BLOCKED méthode PDC (effort unknown) | 12–12 PDC |

