# RUNNING-PARAMETER-SENSITIVITY-V0 — sensibilité des paramètres chiffrés

> **Phase 5C, analyse conceptuelle.** Pour chaque paramètre chiffré de [`RUNNING-PARAMETERS-V0.md`](RUNNING-PARAMETERS-V0.md) : effet d’une borne basse, de la valeur candidate et d’une borne haute sur les goldens R1–R12.
>
> Les bornes testées sont des **hypothèses de test**, pas des propositions.
>
> **Dimensions touchées** : éligibilité (E), composition hebdomadaire (W), charge totale (L), intensité (I), long run (LR), taper (T), reprise (R).

| Tag | Paramètre | Borne basse testée | Candidate | Borne haute testée | Effet observé sur les goldens | Dimensions | Sensibilité |
|---|---|---|---|---|---|---|---|
| V02 | RPE par domaine : plafond easy | 2 | 3 | 4 | Plafond 4 : l’easy peut atteindre « un peu difficile », chevauche STEADY et fait disparaître la distinction EASY / STEADY | I, W | **HIGH_SENSITIVITY** |
| V02 | RPE THRESHOLD_LIKE | 4–5 | 5–6 | 6–7 | 6–7 chevauche SEVERE (7) : risque de dérive vers le sévère en RPE_ONLY (R6, R9) | I | **HIGH_SENSITIVITY** |
| V03 | Largeur de plage HIGH / MEDIUM | 2 % / 4 % | 3 % / 6 % | 4 % / 8 % | Modifie V13 et V14 (dérivés) : à 4 %, le conflit R9 (≈ 11 %) reste détecté ; à 2 %, conflits beaucoup plus fréquents (calibrations) ; plages VO2 R5 de 223–233 à 219–237 s/km | I, E (via conflits) | **HIGH_SENSITIVITY** |
| V04 | Marge THRESHOLD_LIKE | 0–2 % | 0–5 % | 0–8 % | R5 : 246–251 (étroit, dérive sévère possible), 246–258, 246–266 (glissement vers STEADY) | I | **HIGH_SENSITIVITY** |
| V06 | Échauffement | 5–10 | 10–15 | 15–20 | Durées de qualité ±5 min ; A15 : un plancher à 15 rend la qualité impossible en 30 min plus souvent | L, W | MED |
| V07 | Retour au calme | 0–5 | 5–10 | 10–15 | ±5 min ; faible | L | LOW |
| V08 | Ratios de récupération | THRESHOLD 0,1–0,2 ; VO2 0,3–0,5 | 0,20–0,35 ; 0,5–1,0 | 0,4–0,6 ; 1,0–1,5 | Récupérations courtes : THRESHOLD qui bascule en sévère ; longues : stimulus fragmenté. Les goldens utilisent l’historique (V19), l’impact est donc limité aux premières expositions et au taper (R11) | I | **HIGH_SENSITIVITY** |
| V09 | Module STRIDES | 2–4 × 10–15 s | 4–6 × 15–20 s | 6–10 × 20–30 s | ±5 min (R5, R6, R11) ; faible | L | LOW |
| V10 | Densité HD | P-R1 0 ; P-R2 / P-R3 1 ; P-R4 2 | 1 ; 2 ; 2 ; 3 | 2 ; 3 ; 3 ; 4 | À 1 pour P-R3 : R3 perd sa LONG_RUN désignée (défaut V32) ; à 2 pour P-R1 : R2 garde une LONG_RUN désignée en plus du test | E, W | **HIGH_SENSITIVITY** |
| V12 | Bandes de récence | 4 / 8 sem. | 8 / 16 sem. | 12 / 24 sem. | R4 : le 10K à 6 semaines devient AGING à 4 semaines ; C7 inchangé ; calibrations plus ou moins fréquentes | E (cible), W (tests) | **HIGH_SENSITIVITY** |
| V13 | Tolérance de conflit | (dérivée de V03) | 6 % | (dérivée) | Suit V03 | E | MED |
| V14 | Borne de hausse substantielle | (dérivée) | 3 % | (dérivée) | Suit V03 | E | MED |
| V15 | Preuve d’entraînement cohérente | 2 obs. / 1 sem. | 3 / 2 | 5 / 3 | Assouplie : hausses sur des fluctuations ; durcie : capacité rarement reconnue sans test (A04, A14) | I | MED |
| V16 | Essais CS | 2 | 3 | 4 | À 2 : CS de R5 pourrait devenir HIGH, avec une plage THRESHOLD plus étroite | I | LOW |
| V18 | Ancre sévère | 3 km | 3–5 km | 3–10 km | Jusqu’à 10 km, l’ancre peut tomber sur l’allure 10K (frontière) ⇒ VO2 sous-dosé | I | MED |
| V21 | Fenêtre de bande | 2 sem. | 4 sem. | 8 sem. | 2 semaines : bande instable (R2 : 105–110) ; 8 semaines : peu réactive | L, W | MED |
| V22 | Garde-fou LARGE (P-R0–1) | 115 % | 130 % | 150 % | R2 : la semaine prévue (110) contre celle de deux semaines plus tôt (105) = 105 % ⇒ WITHIN aux trois bornes ; les semaines de progression futures seraient fortement touchées | L | **HIGH_SENSITIVITY** |
| V24 | Frontières de reprise | SHORT ≤ 3 j ; LONG ≥ 14 j | ≤ 7 ; ≥ 28 | ≤ 10 ; ≥ 42 | R8 (35 j) : LONG aux deux premières bornes, MODERATE à 42 ⇒ dose non bloquée et références −1 bande seulement | R, E | **HIGH_SENSITIVITY** |
| V25 | Condition de reprise | 1 séance | 2 | 4 | Délai de sortie du HOLD après une reprise | R | MED |
| V26 | Fréquence minimale pratique | 1 | 2 | 3 | À 3 : R2 à 2 séances (cas variante) passerait en mode maintien | E, W | MED |
| V27 | Réduction de volume du taper | 41 % | plage 41–60 % | 60 % | R11 : 142 ou 96 min ; composition inchangée ; la plage elle-même vient des preuves | T | **HIGH_SENSITIVITY** |

## Paramètres vides à forte influence (sensibilité structurelle)

| Tag | Paramètre | Effet de son absence | Priorité de revue |
|---|---|---|---|
| V23 | Bornes de magnitude | **Toutes les semaines en HOLD** : aucune progression chiffrée n’est possible | **Critique** |
| V32 | Marge de demande du long run | LONG_RUN toujours HD : la densité est consommée (R2 perd sa LONG_RUN désignée) | Élevée |
| V31 | Dose minimale de qualité | Toute quantité de travail compte comme HD ; A15 ne peut pas juger une séance réduite | Élevée |
| V33 / V34 | Doses d’entrée et de reprise (G1) | R1 et R8 : NO_VALID | Élevée (G1) |
| V38 | Famille d’extrapolation | Pas d’allure semi ou marathon depuis une autre distance | Élevée |
| V35 / V36 / V37 | Premières expositions | THRESHOLD, VO2 et HILLS impossibles sans historique (R12, R9) | Moyenne |

**Priorités de revue experte (HIGH_SENSITIVITY)** :
- chiffrés : V02, V03, V04, V08, V10, V12, V22, V24, V27 ;
- vides à influence critique : V23, V32, V31.
