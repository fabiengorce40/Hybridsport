# RC2 bis — optimisation globale de la semaine : résultats bruts

> Étude hors production. `beta0Environment()` inchangé ; organisations imposées par la capacité d’étude `studyPins` (inerte par défaut), M3 en détection seule. Aucune valeur n’est une recommandation ni un seuil approuvé.

## 1. Règle de proximité Musculation : matrice actuelle et variantes exploratoires

Niveau et action retenus sur la structure **genou** (`lower_knee`) d’une séance de Musculation, selon la séance voisine et l’écart. Lecture directe de `assessNeighborStructure` (moteur Strength) ; **aucune variante n’est approuvée**.

### V0 — matrice actuelle (ruleset verrouillé provisoire)

| voisine | 0 h | 12 h | 24 h | 36 h | 48 h | 72 h |
|---|---|---|---|---|---|---|
| course « clé » (rôle KEY ; seule distinction disponible pour qualité / longue) | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | HIGH → full | HIGH → full | MODERATE → rir_only |
| course facile (rôle EASY, importance standard) | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | HIGH → full | MODERATE → rir_only | MODERATE → rir_only | LOW → trace |
| course facile sans impact élevé (hypothèse : demande dérivée plus fine, non disponible) | MODERATE → rir_only | MODERATE → rir_only | LOW → trace | NONE → none | NONE → none | NONE → none |
| Cross-training force + conditionnement (importance inconnue → standard) | HIGH → full | HIGH → full | MODERATE → rir_only | LOW → trace | LOW → trace | NONE → none |

### V1 — voisine STANDARD (course facile) allégée : importance standard −2 au lieu de −1

| voisine | 0 h | 12 h | 24 h | 36 h | 48 h | 72 h |
|---|---|---|---|---|---|---|
| course « clé » (rôle KEY ; seule distinction disponible pour qualité / longue) | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | HIGH → full | HIGH → full | MODERATE → rir_only |
| course facile (rôle EASY, importance standard) | HIGH → full | HIGH → full | MODERATE → rir_only | LOW → trace | LOW → trace | NONE → none |
| course facile sans impact élevé (hypothèse : demande dérivée plus fine, non disponible) | LOW → trace | LOW → trace | NONE → none | NONE → none | NONE → none | NONE → none |
| Cross-training force + conditionnement (importance inconnue → standard) | MODERATE → rir_only | MODERATE → rir_only | LOW → trace | NONE → none | NONE → none | NONE → none |

### V2 — sans majoration d’impact locomoteur

| voisine | 0 h | 12 h | 24 h | 36 h | 48 h | 72 h |
|---|---|---|---|---|---|---|
| course « clé » (rôle KEY ; seule distinction disponible pour qualité / longue) | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | HIGH → full | MODERATE → rir_only | MODERATE → rir_only | LOW → trace |
| course facile (rôle EASY, importance standard) | HIGH → full | HIGH → full | MODERATE → rir_only | LOW → trace | LOW → trace | NONE → none |
| course facile sans impact élevé (hypothèse : demande dérivée plus fine, non disponible) | MODERATE → rir_only | MODERATE → rir_only | LOW → trace | NONE → none | NONE → none | NONE → none |
| Cross-training force + conditionnement (importance inconnue → standard) | HIGH → full | HIGH → full | MODERATE → rir_only | LOW → trace | LOW → trace | NONE → none |

### V3 — proximité resserrée à 36 h (≤ 12 h +1 ; ≤ 36 h 0 ; au-delà −2)

| voisine | 0 h | 12 h | 24 h | 36 h | 48 h | 72 h |
|---|---|---|---|---|---|---|
| course « clé » (rôle KEY ; seule distinction disponible pour qualité / longue) | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | MODERATE → rir_only | MODERATE → rir_only |
| course facile (rôle EASY, importance standard) | VERY_HIGH → full_and_signal | VERY_HIGH → full_and_signal | HIGH → full | HIGH → full | LOW → trace | LOW → trace |
| course facile sans impact élevé (hypothèse : demande dérivée plus fine, non disponible) | MODERATE → rir_only | MODERATE → rir_only | LOW → trace | LOW → trace | NONE → none | NONE → none |
| Cross-training force + conditionnement (importance inconnue → standard) | HIGH → full | HIGH → full | MODERATE → rir_only | MODERATE → rir_only | NONE → none | NONE → none |

## 2. Organisations hebdomadaires entières (matrice actuelle V0)

Chaque organisation énumérée est planifiée par le chemin réel (M3 en détection seule). Journée double : course 35 min + l’autre séance sur le reste, ordre supposé course le matin / force le soir (le planificateur ne connaît pas l’heure : écart 0 h). Pré-fatigue = course placée le lendemain d’une séance de force à demande élevée genou ou hanche. ✓ = domine RC1 (au moins aussi bonne sur tous les critères, strictement meilleure sur un).

### A. Prise de masse prioritaire (salle commerciale) — 5 jours disponibles (mer. et dim. off)

Organisations énumérées : 60 ; non dominées : 15 (10 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **4**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 0.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mar M · jeu X · ven C · sam C | 5 | 2 | 1 | 27 | 20.5 | 26.5 | 0 | 2 | 4 | strength:slot_unavailable |
| RC2 A·P1 | 5 | 2 | 1 | 27 | 20.5 | 26.5 | 0 | 6 | 4 | strength:slot_unavailable |
| RC2 D0 | 5 | 2 | 1 | 27 | 20.5 | 26.5 | 0 | 3 | 4 | strength:slot_unavailable |
| RC2 DB·P1 | 5 | 2 | 1 | 27 | 20.5 | 26.5 | 0 | 7 | 4 | strength:slot_unavailable |
| **meilleure valeur atteinte** | 5 | 2 | 0 | 40 | 28 | 0 | 0 | 0 | | |
| ✓ lun M · mar M · jeu M · ven C · sam C (+2 équivalentes) | 5 | 2 | 0 | 34 | 28 | 24 | 0 | 0 | 3 | crosstraining:slot_unavailable |
| lun C · mar C · jeu M · ven M · sam M | 5 | 2 | 0 | 39 | 28 | 41.5 | 0 | 1 | 3 | crosstraining:slot_unavailable |
| lun C · mar C · jeu M · ven X · sam M | 5 | 2 | 0 | 27 | 16.5 | 6 | 0 | 3 | 5 | strength:slot_unavailable |
| lun C · mar M · jeu C · ven M · sam M | 5 | 2 | 0 | 23 | 28 | 14 | 0 | 1 | 5 | crosstraining:slot_unavailable |
| lun M · mar C · jeu C · ven X · sam M (+1 équivalente) | 5 | 2 | 0 | 18 | 20.5 | 2.5 | 0 | 0 | 4 | strength:slot_unavailable |
| lun C · mar M · jeu M · ven C · sam M | 5 | 2 | 0 | 14 | 28 | 0 | 0 | 1 | 5 | crosstraining:slot_unavailable |
| lun M · mar C · jeu X · ven C · sam M (+1 équivalente) | 5 | 2 | 0 | 8 | 20.5 | 0 | 0 | 0 | 6 | strength:slot_unavailable |
| lun M · mar M · jeu M · ven X · sam C | 5 | 1 | 0 | 40 | 28 | 28 | 0 | 0 | 2 | running:slot_unavailable |
| lun M · mar C · jeu M · ven X · sam M (+1 équivalente) | 5 | 1 | 0 | 31 | 28 | 10 | 0 | 1 | 4 | running:slot_unavailable |
| lun M · mar X · jeu M · ven C · sam M | 5 | 1 | 0 | 21 | 28 | 3 | 0 | 1 | 5 | running:slot_unavailable |

Séances non placées sur l’ensemble des organisations : strength:slot_unavailable (30/60), running:slot_unavailable (20/60), crosstraining:slot_unavailable (10/60).

### A. Prise de masse prioritaire (salle commerciale) — 6 jours disponibles (profil RC1)

Organisations énumérées : 60 ; non dominées : 8 (8 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **1**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 0.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mar M · mer X · jeu C · ven M · sam C | 6 | 2 | 1 | 31 | 28 | 29 | 0 | 1 | 4 | — |
| RC2 A·P1 | 6 | 2 | 1 | 31 | 28 | 29 | 0 | 5 | 4 | — |
| RC2 D0 | 6 | 2 | 0 | 12 | 28 | 13.5 | 0 | 0 | 5 | — |
| RC2 DB·P1 | 6 | 2 | 0 | 12 | 28 | 4 | 0 | 0 | 5 | — |
| **meilleure valeur atteinte** | 6 | 2 | 0 | 40 | 28 | 1.5 | 0 | 0 | | |
| ✓ lun C · mar M · mer C · jeu X · ven M · sam M | 6 | 2 | 0 | 31 | 28 | 23 | 0 | 0 | 4 | — |
| lun M · mar M · mer M · jeu X · ven C · sam C | 6 | 2 | 0 | 40 | 28 | 48.5 | 0 | 1 | 2 | — |
| lun C · mar C · mer X · jeu M · ven M · sam M | 6 | 2 | 0 | 37 | 28 | 44.5 | 0 | 5 | 2 | — |
| lun M · mar X · mer M · jeu M · ven C · sam C | 6 | 2 | 0 | 31 | 28 | 20 | 0 | 3 | 4 | — |
| lun M · mar C · mer M · jeu C · ven X · sam M | 6 | 2 | 0 | 21 | 28 | 2.5 | 0 | 3 | 5 | — |
| lun M · mar C · mer C · jeu M · ven X · sam M | 6 | 2 | 0 | 21 | 28 | 4 | 0 | 1 | 5 | — |
| lun M · mar X · mer C · jeu M · ven M · sam C | 6 | 2 | 0 | 21 | 28 | 13.5 | 0 | 0 | 5 | — |
| lun M · mar X · mer C · jeu M · ven C · sam M | 6 | 2 | 0 | 12 | 28 | 1.5 | 0 | 0 | 5 | — |

Séances non placées sur l’ensemble des organisations : aucune.

### A. Prise de masse prioritaire (salle commerciale) — 6 jours + journées doubles explicites mer. et sam. (course 35 min + autre séance), règle G4 actuelle

Organisations énumérées : 244 ; non dominées : 16 (16 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **1**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 184.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mar M · mer X · jeu C · ven M · sam C | 6 | 2 | 1 | 31 | 28 | 29 | 0 | 1 | 4 | — |
| RC2 A·P1 | 6 | 2 | 1 | 31 | 28 | 29 | 0 | 5 | 4 | — |
| RC2 D0 | 6 | 2 | 0 | 12 | 28 | 13.5 | 0 | 0 | 5 | — |
| RC2 DB·P1 | 6 | 2 | 0 | 12 | 28 | 4 | 0 | 0 | 5 | — |
| **meilleure valeur atteinte** | 6 | 2 | 0 | 40 | 28 | 0 | 0 | 0 | | |
| ✓ lun C · mar M · mer C · jeu X · ven M · sam M | 6 | 2 | 0 | 31 | 28 | 23 | 0 | 0 | 4 | — |
| lun M · mar M · mer M · jeu X · ven C · sam C | 6 | 2 | 0 | 40 | 28 | 48.5 | 0 | 1 | 2 | — |
| lun C · mar C · mer X · jeu M · ven M · sam M | 6 | 2 | 0 | 37 | 28 | 44.5 | 0 | 5 | 2 | — |
| lun M · mar X · mer M · jeu M · ven C · sam C | 6 | 2 | 0 | 31 | 28 | 20 | 0 | 3 | 4 | — |
| lun M · mar C · mer M · jeu C · ven X · sam M | 6 | 2 | 0 | 21 | 28 | 2.5 | 0 | 3 | 5 | — |
| lun M · mar C · mer C · jeu M · ven X · sam M | 6 | 2 | 0 | 21 | 28 | 4 | 0 | 1 | 5 | — |
| lun M · mar X · mer C · jeu M · ven M · sam C | 6 | 2 | 0 | 21 | 28 | 13.5 | 0 | 0 | 5 | — |
| lun M · mar X · mer C · jeu M · ven C · sam M | 6 | 2 | 0 | 12 | 28 | 1.5 | 0 | 0 | 5 | — |
| lun M · mar C · mer C+X · ven M · sam M | 5 | 2 | 1 | 33 | 28 | 20.5 | 0 | 2 | 3 | crosstraining:engine_refused |
| lun C · mer C+X · jeu M · ven M · sam M | 5 | 2 | 0 | 33 | 28 | 42 | 0 | 1 | 3 | crosstraining:engine_refused |
| lun M · mer C+X · jeu M · ven C · sam M | 5 | 2 | 0 | 24 | 28 | 0 | 0 | 0 | 5 | crosstraining:engine_refused |
| lun M · mar M · mer M · ven C · sam C+X | 5 | 1 | 0 | 40 | 28 | 47 | 0 | 1 | 2 | running:interference_conflict |
| … 4 autres profils non dominés (JSON) |  |  |  |  |  |  |  |  | | |

Séances non placées sur l’ensemble des organisations : strength:interference_conflict (119/244), running:interference_conflict (63/244), crosstraining:engine_refused (26/244).

### A. Prise de masse prioritaire (salle commerciale) — 6 jours + journées doubles explicites mer. et sam., G4 EXPLORATOIRE « même jour admis »

Organisations énumérées : 244 ; non dominées : 11 (10 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **3**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 26.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mar M · mer X · jeu C · ven M · sam C | 6 | 2 | 1 | 31 | 28 | 29 | 0 | 1 | 4 | — |
| RC2 A·P1 | 6 | 2 | 1 | 31 | 28 | 29 | 0 | 5 | 4 | — |
| RC2 D0 | 6 | 2 | 0 | 12 | 28 | 13.5 | 0 | 0 | 5 | — |
| RC2 DB·P1 | 6 | 2 | 0 | 12 | 28 | 4 | 0 | 0 | 5 | — |
| **meilleure valeur atteinte** | 6 | 2 | 0 | 40 | 28 | 0 | 0 | 0 | | |
| ✓ lun C · mar M · mer C · jeu X · ven M · sam M | 6 | 2 | 0 | 31 | 28 | 23 | 0 | 0 | 4 | — |
| lun M · mar M · mer M · jeu X · ven C · sam C | 6 | 2 | 0 | 40 | 28 | 48.5 | 0 | 1 | 2 | — |
| lun C · mar C · mer X · jeu M · ven M · sam M | 6 | 2 | 0 | 37 | 28 | 44.5 | 0 | 5 | 2 | — |
| lun M · mar X · mer M · jeu M · ven C · sam C | 6 | 2 | 0 | 31 | 28 | 20 | 0 | 3 | 4 | — |
| lun X · mar C · mer C+M · ven M · sam M | 6 | 2 | 1 | 31 | 24 | 20.5 | 0 | 2 | 4 | — |
| lun C · mar M · mer X · jeu M · sam C+M | 6 | 2 | 0 | 22 | 28 | 4 | 0 | 0 | 4 | — |
| lun M · mer M · jeu C · ven M · sam C+X (+1 équivalente) | 6 | 2 | 0 | 21 | 28 | 1 | 0 | 0 | 5 | — |
| lun M · mar C · mer C+X · ven M · sam M | 5 | 2 | 1 | 33 | 28 | 20.5 | 0 | 2 | 3 | crosstraining:engine_refused |
| lun C · mer C+X · jeu M · ven M · sam M | 5 | 2 | 0 | 33 | 28 | 42 | 0 | 1 | 3 | crosstraining:engine_refused |
| lun M · mer C+X · jeu M · ven C · sam M | 5 | 2 | 0 | 24 | 28 | 0 | 0 | 0 | 5 | crosstraining:engine_refused |

Séances non placées sur l’ensemble des organisations : crosstraining:engine_refused (26/244).

### A. Prise de masse prioritaire (salle commerciale) — disponibilité irrégulière (45 · 0 · 90 · 30 · 0 · 120 · 60)

Organisations énumérées : 60 ; non dominées : 19 (8 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **15**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 60.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mer C · dim C | 3 | 2 | 0 | 6 | 9 | 0 | 0 | 0 | 8 | crosstraining:engine_refused, strength:engine_refused, strength:engine_refused |
| RC2 A·P1 | 3 | 2 | 0 | 6 | 9 | 0 | 0 | 0 | 8 | crosstraining:engine_refused, strength:engine_refused, strength:engine_refused |
| RC2 D0 | 4 | 1 | 1 | 24 | 16.5 | 0 | 0 | 1 | 5 | running:slot_unavailable, strength:engine_refused |
| RC2 DB·P1 | 4 | 1 | 1 | 24 | 16.5 | 0 | 0 | 1 | 5 | running:slot_unavailable, strength:engine_refused |
| **meilleure valeur atteinte** | 4 | 2 | 0 | 43 | 28 | 0 | 0 | 0 | | |
| ✓ lun M · mer M · jeu M · sam C · dim C (+1 équivalente) | 4 | 2 | 0 | 22 | 16.5 | 0 | 0 | 0 | 5 | crosstraining:slot_unavailable, strength:engine_refused |
| ✓ lun C · mer M · jeu M · sam M · dim C (+3 équivalentes) | 4 | 2 | 0 | 20 | 20.5 | 0 | 0 | 0 | 5 | crosstraining:slot_unavailable, strength:engine_refused |
| lun C · mer C · jeu M · sam M · dim M (+1 équivalente) | 4 | 2 | 0 | 30 | 20.5 | 23.5 | 0 | 0 | 4 | crosstraining:slot_unavailable, strength:engine_refused |
| lun C · mer M · jeu C · sam M · dim M (+1 équivalente) | 4 | 1 | 0 | 43 | 28 | 20.5 | 0 | 0 | 2 | crosstraining:slot_unavailable, running:slot_unavailable |
| lun C · mer M · jeu M · sam M · dim X (+1 équivalente) | 4 | 1 | 0 | 27 | 20.5 | 5 | 0 | 0 | 4 | running:slot_unavailable, strength:engine_refused |
| lun C · mer M · jeu M · sam X · dim M (+1 équivalente) | 4 | 1 | 0 | 27 | 20.5 | 3 | 0 | 1 | 4 | running:slot_unavailable, strength:engine_refused |
| lun M · mer M · jeu C · sam M · dim C (+3 équivalentes) | 4 | 1 | 0 | 26 | 24 | 0 | 0 | 0 | 4 | crosstraining:slot_unavailable, running:slot_unavailable |
| lun M · mer M · jeu C · sam M · dim X | 4 | 0 | 0 | 37 | 24 | 3 | 0 | 1 | 3 | running:slot_unavailable, running:slot_unavailable |

Séances non placées sur l’ensemble des organisations : running:slot_unavailable (40/60), strength:engine_refused (30/60), strength:slot_unavailable (30/60), crosstraining:engine_refused (19/60), crosstraining:slot_unavailable (10/60).

### B. Profil hybride (Course 3×, Musculation 2×, CT 1×) — 5 jours disponibles (mer. et dim. off)

Organisations énumérées : 60 ; non dominées : 22 (12 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **0**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 0.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun C · mar C · jeu X · ven M · sam M | 5 | 2 | 0 | 28 | 20.5 | 31.5 | 0 | 1 | 4 | running:slot_unavailable |
| RC2 A·P1 | 5 | 2 | 0 | 28 | 20.5 | 31.5 | 0 | 6 | 4 | running:slot_unavailable |
| RC2 D0 | 5 | 2 | 0 | 18 | 20.5 | 20 | 0 | 1 | 4 | running:slot_unavailable |
| RC2 DB·P1 | 5 | 2 | 0 | 18 | 20.5 | 20 | 0 | 3 | 4 | running:slot_unavailable |
| **meilleure valeur atteinte** | 5 | 3 | 0 | 30 | 20.5 | 0 | 0 | 0 | | |
| lun M · mar M · jeu C · ven C · sam C | 5 | 3 | 0 | 30 | 20.5 | 24 | 0 | 3 | 4 | crosstraining:slot_unavailable |
| lun C · mar C · jeu C · ven M · sam M | 5 | 3 | 0 | 20 | 20.5 | 21.5 | 0 | 1 | 4 | crosstraining:slot_unavailable |
| lun C · mar C · jeu C · ven X · sam M | 5 | 3 | 0 | 14 | 13 | 2.5 | 0 | 3 | 7 | strength:slot_unavailable |
| lun C · mar M · jeu M · ven C · sam C (+2 équivalentes) | 5 | 3 | 0 | 10 | 20.5 | 0 | 0 | 1 | 6 | crosstraining:slot_unavailable |
| lun C · mar C · jeu M · ven M · sam C | 5 | 3 | 0 | 10 | 20.5 | 15 | 0 | 0 | 6 | crosstraining:slot_unavailable |
| lun M · mar C · jeu C · ven C · sam X (+6 équivalentes) | 5 | 3 | 0 | 4 | 13 | 0 | 0 | 0 | 7 | strength:slot_unavailable |
| lun C · mar C · jeu X · ven M · sam M | 5 | 2 | 0 | 28 | 20.5 | 31.5 | 0 | 1 | 4 | running:slot_unavailable |
| lun M · mar M · jeu C · ven C · sam X | 5 | 2 | 0 | 27 | 20.5 | 26.5 | 0 | 2 | 4 | running:slot_unavailable |
| lun C · mar C · jeu M · ven M · sam X | 5 | 2 | 0 | 27 | 16.5 | 26 | 0 | 0 | 5 | running:slot_unavailable |
| lun C · mar C · jeu M · ven X · sam M | 5 | 2 | 0 | 27 | 16.5 | 6 | 0 | 3 | 5 | running:slot_unavailable |
| lun M · mar C · jeu C · ven X · sam M (+1 équivalente) | 5 | 2 | 0 | 18 | 20.5 | 2.5 | 0 | 0 | 4 | running:slot_unavailable |
| lun M · mar C · jeu X · ven C · sam M (+1 équivalente) | 5 | 2 | 0 | 8 | 20.5 | 0 | 0 | 0 | 6 | running:slot_unavailable |

Séances non placées sur l’ensemble des organisations : running:slot_unavailable (30/60), strength:slot_unavailable (20/60), crosstraining:slot_unavailable (10/60).

### B. Profil hybride (Course 3×, Musculation 2×, CT 1×) — 6 jours disponibles (profil RC1)

Organisations énumérées : 60 ; non dominées : 10 (5 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **19**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 0.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun C · mar C · mer X · jeu M · ven C · sam M | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 2 | 6 | — |
| RC2 A·P1 | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 2 | 6 | — |
| RC2 D0 | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 1 | 6 | — |
| RC2 DB·P1 | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 1 | 6 | — |
| **meilleure valeur atteinte** | 6 | 3 | 0 | 28 | 20.5 | 0 | 0 | 0 | | |
| ✓ lun C · mar M · mer C · jeu C · ven X · sam M (+1 équivalente) | 6 | 3 | 0 | 18 | 20.5 | 2.5 | 0 | 0 | 4 | — |
| ✓ lun M · mar X · mer C · jeu M · ven C · sam C (+1 équivalente) | 6 | 3 | 0 | 17 | 20.5 | 1.5 | 0 | 0 | 5 | — |
| ✓ lun M · mar C · mer C · jeu X · ven C · sam M (+3 équivalentes) | 6 | 3 | 0 | 8 | 20.5 | 0 | 0 | 0 | 6 | — |
| lun C · mar C · mer C · jeu X · ven M · sam M | 6 | 3 | 0 | 28 | 20.5 | 29 | 0 | 7 | 4 | — |
| lun M · mar M · mer X · jeu C · ven C · sam C | 6 | 3 | 1 | 27 | 20.5 | 29 | 0 | 5 | 4 | — |

Séances non placées sur l’ensemble des organisations : aucune.

### B. Profil hybride (Course 3×, Musculation 2×, CT 1×) — 6 jours + journées doubles explicites mer. et sam. (course 35 min + autre séance), règle G4 actuelle

Organisations énumérées : 276 ; non dominées : 20 (13 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **19**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 216.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun C · mar C · mer X · jeu M · ven C · sam M | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 2 | 6 | — |
| RC2 A·P1 | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 2 | 6 | — |
| RC2 D0 | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 1 | 6 | — |
| RC2 DB·P1 | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 1 | 6 | — |
| **meilleure valeur atteinte** | 6 | 3 | 0 | 30 | 20.5 | 0 | 0 | 0 | | |
| ✓ lun C · mar M · mer C · jeu C · ven X · sam M (+1 équivalente) | 6 | 3 | 0 | 18 | 20.5 | 2.5 | 0 | 0 | 4 | — |
| ✓ lun M · mar X · mer C · jeu M · ven C · sam C (+1 équivalente) | 6 | 3 | 0 | 17 | 20.5 | 1.5 | 0 | 0 | 5 | — |
| ✓ lun M · mar C · mer C · jeu X · ven C · sam M (+3 équivalentes) | 6 | 3 | 0 | 8 | 20.5 | 0 | 0 | 0 | 6 | — |
| lun C · mar C · mer C · jeu X · ven M · sam M | 6 | 3 | 0 | 28 | 20.5 | 29 | 0 | 7 | 4 | — |
| lun M · mar M · mer X · jeu C · ven C · sam C | 6 | 3 | 1 | 27 | 20.5 | 29 | 0 | 5 | 4 | — |
| lun C · mar C · mer C+X · ven M · sam M | 5 | 3 | 0 | 30 | 20.5 | 24 | 0 | 3 | 4 | crosstraining:engine_refused |
| lun M · mer C+X · jeu M · ven C · sam C (+1 équivalente) | 5 | 3 | 0 | 20 | 20.5 | 0 | 0 | 0 | 5 | crosstraining:engine_refused |
| lun C · mar C · jeu X · ven M · sam C+M | 5 | 2 | 0 | 28 | 20.5 | 28.5 | 0 | 1 | 4 | running:interference_conflict |
| lun C · mar C · mer X · ven M · sam C+M | 5 | 2 | 0 | 28 | 20.5 | 23.5 | 0 | 2 | 4 | running:interference_conflict |
| lun C · mar C · jeu M · ven M · sam C+X | 5 | 2 | 0 | 27 | 16.5 | 26 | 0 | 0 | 5 | running:interference_conflict |
| lun C · mar C · jeu M · ven X · sam C+M | 5 | 2 | 0 | 27 | 16.5 | 6 | 0 | 3 | 6 | running:interference_conflict |
| lun C · mar C · mer X · jeu M · sam C+M | 5 | 2 | 0 | 24 | 20.5 | 2.5 | 0 | 4 | 5 | running:interference_conflict |
| … 1 autres profils non dominés (JSON) |  |  |  |  |  |  |  |  | | |

Séances non placées sur l’ensemble des organisations : running:interference_conflict (166/276), strength:interference_conflict (44/276), crosstraining:engine_refused (42/276).

### B. Profil hybride (Course 3×, Musculation 2×, CT 1×) — 6 jours + journées doubles explicites mer. et sam., G4 EXPLORATOIRE « même jour admis »

Organisations énumérées : 276 ; non dominées : 28 (11 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **66**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 42.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun C · mar C · mer X · jeu M · ven C · sam M | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 2 | 6 | — |
| RC2 A·P1 | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 2 | 6 | — |
| RC2 D0 | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 1 | 6 | — |
| RC2 DB·P1 | 6 | 3 | 0 | 8 | 20.5 | 2.5 | 0 | 1 | 6 | — |
| **meilleure valeur atteinte** | 6 | 3 | 0 | 30 | 20.5 | 0 | 0 | 0 | | |
| ✓ lun C · mar M · mer C · jeu C · ven X · sam M (+1 équivalente) | 6 | 3 | 0 | 18 | 20.5 | 2.5 | 0 | 0 | 4 | — |
| ✓ lun M · mer C+M · jeu C · sam C+X | 6 | 3 | 0 | 17 | 20.5 | 0 | 0 | 2 | 5 | — |
| ✓ lun M · mar X · mer C · jeu M · ven C · sam C (+1 équivalente) | 6 | 3 | 0 | 17 | 20.5 | 1.5 | 0 | 0 | 5 | — |
| ✓ mar M · mer C · jeu X · ven C · sam C+M (+12 équivalentes) | 6 | 3 | 0 | 8 | 20.5 | 0 | 0 | 0 | 6 | — |
| lun C · mar C · mer C · jeu X · ven M · sam M | 6 | 3 | 0 | 28 | 20.5 | 29 | 0 | 7 | 4 | — |
| lun M · mar M · jeu C · ven C · sam C+X | 6 | 3 | 0 | 27 | 20.5 | 26.5 | 0 | 6 | 4 | — |
| lun M · mar M · mer X · jeu C · ven C · sam C | 6 | 3 | 1 | 27 | 20.5 | 29 | 0 | 5 | 4 | — |
| lun C · mar C · mer C+M · jeu X · sam M | 6 | 3 | 0 | 18 | 16.5 | 1.5 | 0 | 3 | 5 | — |
| lun X · mar C · mer C+M · jeu C · sam M | 6 | 3 | 1 | 18 | 16.5 | 0 | 0 | 5 | 5 | — |
| lun C · mar C · mer C+X · ven M · sam M | 5 | 3 | 0 | 30 | 20.5 | 24 | 0 | 3 | 4 | crosstraining:engine_refused |
| lun M · mer C+X · ven C · sam C+M (+3 équivalentes) | 5 | 3 | 0 | 20 | 20.5 | 0 | 0 | 0 | 5 | crosstraining:engine_refused |

Séances non placées sur l’ensemble des organisations : crosstraining:engine_refused (42/276).

### B. Profil hybride (Course 3×, Musculation 2×, CT 1×) — disponibilité irrégulière (45 · 0 · 90 · 30 · 0 · 120 · 60)

Organisations énumérées : 60 ; non dominées : 13 (7 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **2**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 60.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun C · mer C · sam C · dim M | 4 | 3 | 0 | 6 | 13 | 0 | 0 | 1 | 7 | crosstraining:engine_refused, strength:engine_refused |
| RC2 A·P1 | 4 | 3 | 0 | 6 | 13 | 0 | 0 | 1 | 7 | crosstraining:engine_refused, strength:engine_refused |
| RC2 D0 | 4 | 2 | 0 | 4 | 13 | 0 | 0 | 0 | 7 | running:slot_unavailable, strength:engine_refused |
| RC2 DB·P1 | 4 | 2 | 0 | 4 | 13 | 0 | 0 | 0 | 7 | running:slot_unavailable, strength:engine_refused |
| **meilleure valeur atteinte** | 4 | 3 | 0 | 30 | 20.5 | 0 | 0 | 0 | | |
| ✓ lun C · mer M · jeu M · sam C · dim C (+1 équivalente) | 4 | 3 | 0 | 16 | 13 | 0 | 0 | 0 | 6 | crosstraining:slot_unavailable, strength:engine_refused |
| lun C · mer C · jeu C · sam M · dim M (+1 équivalente) | 4 | 2 | 0 | 30 | 20.5 | 23.5 | 0 | 0 | 4 | crosstraining:slot_unavailable, running:slot_unavailable |
| lun M · mer M · jeu C · sam C · dim C (+1 équivalente) | 4 | 2 | 0 | 22 | 16.5 | 0 | 0 | 0 | 5 | crosstraining:slot_unavailable, running:slot_unavailable |
| lun C · mer M · jeu C · sam M · dim C (+3 équivalentes) | 4 | 2 | 0 | 20 | 20.5 | 0 | 0 | 0 | 5 | crosstraining:slot_unavailable, running:slot_unavailable |
| lun C · mer M · jeu C · sam M · dim X | 4 | 1 | 0 | 27 | 20.5 | 5 | 0 | 0 | 4 | running:slot_unavailable, running:slot_unavailable |
| lun C · mer M · jeu C · sam X · dim M | 4 | 1 | 0 | 27 | 20.5 | 3 | 0 | 1 | 4 | running:slot_unavailable, running:slot_unavailable |
| lun M · mer M · jeu C · sam C · dim X | 4 | 1 | 0 | 24 | 16.5 | 0 | 0 | 1 | 5 | running:slot_unavailable, running:slot_unavailable |

Séances non placées sur l’ensemble des organisations : running:slot_unavailable (60/60), strength:engine_refused (20/60), strength:slot_unavailable (20/60), crosstraining:engine_refused (18/60), crosstraining:slot_unavailable (10/60).

### C. Salle complète — 5 jours disponibles (mer. et dim. off)

Organisations énumérées : 60 ; non dominées : 20 (15 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **4**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 0.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mar M · jeu X · ven C · sam C | 5 | 2 | 1 | 26 | 31 | 28 | 0 | 2 | 4 | strength:slot_unavailable |
| RC2 A·P1 | 5 | 2 | 1 | 26 | 31 | 28 | 0 | 6 | 4 | strength:slot_unavailable |
| RC2 D0 | 5 | 2 | 1 | 26 | 31 | 28 | 0 | 3 | 4 | strength:slot_unavailable |
| RC2 DB·P1 | 5 | 2 | 1 | 26 | 31 | 28 | 0 | 7 | 4 | strength:slot_unavailable |
| **meilleure valeur atteinte** | 5 | 2 | 0 | 40 | 46 | 0 | 0 | 0 | | |
| ✓ lun M · mar M · jeu M · ven C · sam C (+2 équivalentes) | 5 | 2 | 0 | 29 | 43 | 28 | 0 | 0 | 3 | crosstraining:slot_unavailable |
| lun C · mar C · jeu M · ven M · sam M | 5 | 2 | 0 | 39 | 40 | 50.5 | 0 | 1 | 2 | crosstraining:slot_unavailable |
| lun M · mar C · jeu C · ven M · sam M | 5 | 2 | 1 | 23 | 46 | 19 | 0 | 1 | 4 | crosstraining:slot_unavailable |
| lun C · mar M · jeu C · ven M · sam M | 5 | 2 | 0 | 23 | 46 | 21.5 | 0 | 1 | 4 | crosstraining:slot_unavailable |
| lun C · mar C · jeu M · ven X · sam M | 5 | 2 | 0 | 22 | 28 | 6 | 0 | 3 | 4 | strength:slot_unavailable |
| lun M · mar C · jeu C · ven X · sam M (+1 équivalente) | 5 | 2 | 0 | 17 | 34 | 2.5 | 0 | 0 | 4 | strength:slot_unavailable |
| lun C · mar M · jeu M · ven C · sam M | 5 | 2 | 0 | 14 | 43 | 0 | 0 | 1 | 4 | crosstraining:slot_unavailable |
| lun M · mar C · jeu X · ven C · sam M (+1 équivalente) | 5 | 2 | 0 | 8 | 34 | 0 | 0 | 0 | 5 | strength:slot_unavailable |
| lun M · mar M · jeu M · ven X · sam C | 5 | 1 | 0 | 40 | 38.5 | 29 | 0 | 0 | 1 | running:slot_unavailable |
| lun M · mar M · jeu C · ven X · sam M | 5 | 1 | 0 | 40 | 43 | 30 | 0 | 3 | 1 | running:slot_unavailable |
| lun C · mar X · jeu M · ven M · sam M | 5 | 1 | 0 | 36 | 40 | 49 | 0 | 2 | 2 | running:slot_unavailable |
| lun M · mar M · jeu M · ven C · sam X | 5 | 1 | 0 | 30 | 43 | 28 | 0 | 0 | 3 | running:slot_unavailable |
| … 3 autres profils non dominés (JSON) |  |  |  |  |  |  |  |  | | |

Séances non placées sur l’ensemble des organisations : strength:slot_unavailable (30/60), running:slot_unavailable (20/60), crosstraining:slot_unavailable (10/60).

### C. Salle complète — 6 jours disponibles (profil RC1)

Organisations énumérées : 60 ; non dominées : 13 (11 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **2**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 0.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mar M · mer X · jeu C · ven M · sam C | 6 | 2 | 1 | 30 | 43 | 30 | 0 | 1 | 3 | — |
| RC2 A·P1 | 6 | 2 | 1 | 30 | 43 | 30 | 0 | 5 | 3 | — |
| RC2 D0 | 6 | 2 | 0 | 12 | 46 | 18 | 0 | 0 | 4 | — |
| RC2 DB·P1 | 6 | 2 | 0 | 12 | 46 | 3 | 0 | 0 | 4 | — |
| **meilleure valeur atteinte** | 6 | 2 | 0 | 40 | 46 | 1 | 0 | 0 | | |
| ✓ lun C · mar M · mer C · jeu X · ven M · sam M | 6 | 2 | 0 | 30 | 43 | 27.5 | 0 | 0 | 3 | — |
| lun M · mar M · mer M · jeu X · ven C · sam C | 6 | 2 | 0 | 40 | 43 | 51 | 0 | 1 | 1 | — |
| lun C · mar X · mer C · jeu M · ven M · sam M | 6 | 2 | 1 | 31 | 43 | 49.5 | 0 | 3 | 3 | — |
| lun M · mar X · mer M · jeu M · ven C · sam C | 6 | 2 | 0 | 30 | 43 | 24.5 | 0 | 3 | 3 | — |
| lun M · mar C · mer M · jeu C · ven X · sam M | 6 | 2 | 0 | 21 | 46 | 2 | 0 | 3 | 4 | — |
| lun M · mar C · mer C · jeu M · ven X · sam M | 6 | 2 | 0 | 21 | 43 | 3 | 0 | 1 | 4 | — |
| lun M · mar C · mer X · jeu C · ven M · sam M | 6 | 2 | 0 | 21 | 46 | 19 | 0 | 0 | 4 | — |
| lun M · mar X · mer M · jeu C · ven M · sam C (+1 équivalente) | 6 | 2 | 0 | 21 | 46 | 6 | 0 | 1 | 4 | — |
| lun M · mar C · mer M · jeu C · ven M · sam X (+1 équivalente) | 6 | 2 | 0 | 12 | 46 | 3 | 0 | 0 | 4 | — |
| lun M · mar C · mer M · jeu X · ven C · sam M | 6 | 2 | 1 | 12 | 46 | 1 | 0 | 1 | 4 | — |
| lun M · mar X · mer C · jeu M · ven C · sam M | 6 | 2 | 0 | 12 | 43 | 1.5 | 0 | 0 | 4 | — |

Séances non placées sur l’ensemble des organisations : aucune.

### C. Salle complète — 6 jours + journées doubles explicites mer. et sam. (course 35 min + autre séance), règle G4 actuelle

Organisations énumérées : 244 ; non dominées : 29 (27 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **2**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 184.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mar M · mer X · jeu C · ven M · sam C | 6 | 2 | 1 | 30 | 43 | 30 | 0 | 1 | 3 | — |
| RC2 A·P1 | 6 | 2 | 1 | 30 | 43 | 30 | 0 | 5 | 3 | — |
| RC2 D0 | 6 | 2 | 0 | 12 | 46 | 18 | 0 | 0 | 4 | — |
| RC2 DB·P1 | 6 | 2 | 0 | 12 | 46 | 3 | 0 | 0 | 4 | — |
| **meilleure valeur atteinte** | 6 | 2 | 0 | 40 | 46 | 0 | 0 | 0 | | |
| ✓ lun C · mar M · mer C · jeu X · ven M · sam M | 6 | 2 | 0 | 30 | 43 | 27.5 | 0 | 0 | 3 | — |
| lun M · mar M · mer M · jeu X · ven C · sam C | 6 | 2 | 0 | 40 | 43 | 51 | 0 | 1 | 1 | — |
| lun C · mar X · mer C · jeu M · ven M · sam M | 6 | 2 | 1 | 31 | 43 | 49.5 | 0 | 3 | 3 | — |
| lun M · mar X · mer M · jeu M · ven C · sam C | 6 | 2 | 0 | 30 | 43 | 24.5 | 0 | 3 | 3 | — |
| lun M · mar C · mer M · jeu C · ven X · sam M | 6 | 2 | 0 | 21 | 46 | 2 | 0 | 3 | 4 | — |
| lun M · mar C · mer C · jeu M · ven X · sam M | 6 | 2 | 0 | 21 | 43 | 3 | 0 | 1 | 4 | — |
| lun M · mar C · mer X · jeu C · ven M · sam M | 6 | 2 | 0 | 21 | 46 | 19 | 0 | 0 | 4 | — |
| lun M · mar X · mer M · jeu C · ven M · sam C (+1 équivalente) | 6 | 2 | 0 | 21 | 46 | 6 | 0 | 1 | 4 | — |
| lun M · mar C · mer M · jeu C · ven M · sam X (+1 équivalente) | 6 | 2 | 0 | 12 | 46 | 3 | 0 | 0 | 4 | — |
| lun M · mar C · mer M · jeu X · ven C · sam M | 6 | 2 | 1 | 12 | 46 | 1 | 0 | 1 | 4 | — |
| lun M · mar X · mer C · jeu M · ven C · sam M | 6 | 2 | 0 | 12 | 43 | 1.5 | 0 | 0 | 4 | — |
| lun M · mar C · mer C+X · ven M · sam M | 5 | 2 | 1 | 33 | 43 | 25 | 0 | 2 | 2 | crosstraining:engine_refused |
| … 15 autres profils non dominés (JSON) |  |  |  |  |  |  |  |  | | |

Séances non placées sur l’ensemble des organisations : strength:interference_conflict (119/244), running:interference_conflict (63/244), crosstraining:engine_refused (26/244).

### C. Salle complète — 6 jours + journées doubles explicites mer. et sam., G4 EXPLORATOIRE « même jour admis »

Organisations énumérées : 244 ; non dominées : 11 (11 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **4**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 26.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mar M · mer X · jeu C · ven M · sam C | 6 | 2 | 1 | 30 | 43 | 30 | 0 | 1 | 3 | — |
| RC2 A·P1 | 6 | 2 | 1 | 30 | 43 | 30 | 0 | 5 | 3 | — |
| RC2 D0 | 6 | 2 | 0 | 12 | 46 | 18 | 0 | 0 | 4 | — |
| RC2 DB·P1 | 6 | 2 | 0 | 12 | 46 | 3 | 0 | 0 | 4 | — |
| **meilleure valeur atteinte** | 6 | 2 | 0 | 40 | 46 | 0 | 0 | 0 | | |
| ✓ lun C · mar M · mer C · jeu X · ven M · sam M | 6 | 2 | 0 | 30 | 43 | 27.5 | 0 | 0 | 3 | — |
| lun M · mar M · mer M · jeu X · ven C · sam C | 6 | 2 | 0 | 40 | 43 | 51 | 0 | 1 | 1 | — |
| lun C · mar X · mer C · jeu M · ven M · sam M | 6 | 2 | 1 | 31 | 43 | 49.5 | 0 | 3 | 3 | — |
| lun X · mar C · mer C+M · ven M · sam M | 6 | 2 | 1 | 31 | 39 | 31 | 0 | 2 | 3 | — |
| lun M · mar X · mer M · jeu M · ven C · sam C | 6 | 2 | 0 | 30 | 43 | 24.5 | 0 | 3 | 3 | — |
| lun C · mar X · mer M · jeu M · sam C+M | 6 | 2 | 0 | 22 | 43 | 24 | 0 | 1 | 4 | — |
| lun M · mer M · jeu C · ven M · sam C+X | 6 | 2 | 0 | 21 | 46 | 1 | 0 | 0 | 4 | — |
| lun M · mar C · mer C+X · ven M · sam M | 5 | 2 | 1 | 33 | 43 | 25 | 0 | 2 | 2 | crosstraining:engine_refused |
| lun C · mer C+X · jeu M · ven M · sam M | 5 | 2 | 0 | 33 | 43 | 48 | 0 | 1 | 2 | crosstraining:engine_refused |
| lun M · mar C · mer C+X · jeu M · sam M | 5 | 2 | 1 | 23 | 43 | 0 | 0 | 2 | 4 | crosstraining:engine_refused |
| lun M · mer C+X · jeu M · ven C · sam M | 5 | 2 | 0 | 20 | 43 | 0 | 0 | 0 | 4 | crosstraining:engine_refused |

Séances non placées sur l’ensemble des organisations : crosstraining:engine_refused (26/244).

### C. Salle complète — disponibilité irrégulière (45 · 0 · 90 · 30 · 0 · 120 · 60)

Organisations énumérées : 60 ; non dominées : 15 (6 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **15**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 60.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mer C · dim C | 3 | 2 | 0 | 6 | 9 | 0 | 0 | 0 | 8 | crosstraining:engine_refused, strength:engine_refused, strength:engine_refused |
| RC2 A·P1 | 3 | 2 | 0 | 6 | 9 | 0 | 0 | 0 | 8 | crosstraining:engine_refused, strength:engine_refused, strength:engine_refused |
| RC2 D0 | 4 | 1 | 1 | 23 | 24 | 0 | 0 | 1 | 5 | running:slot_unavailable, strength:engine_refused |
| RC2 DB·P1 | 4 | 1 | 1 | 23 | 24 | 0 | 0 | 1 | 5 | running:slot_unavailable, strength:engine_refused |
| **meilleure valeur atteinte** | 4 | 2 | 0 | 43 | 46 | 0 | 0 | 0 | | |
| ✓ lun M · mer M · jeu M · sam C · dim C (+1 équivalente) | 4 | 2 | 0 | 22 | 24 | 0 | 0 | 0 | 5 | crosstraining:slot_unavailable, strength:engine_refused |
| ✓ lun C · mer M · jeu M · sam M · dim C (+3 équivalentes) | 4 | 2 | 0 | 20 | 34 | 0 | 0 | 0 | 4 | crosstraining:slot_unavailable, strength:engine_refused |
| lun C · mer C · jeu M · sam M · dim M (+1 équivalente) | 4 | 2 | 0 | 29 | 31 | 29 | 0 | 0 | 3 | crosstraining:slot_unavailable, strength:engine_refused |
| lun C · mer M · jeu C · sam M · dim M (+1 équivalente) | 4 | 1 | 0 | 43 | 46 | 22 | 0 | 0 | 1 | crosstraining:slot_unavailable, running:slot_unavailable |
| lun M · mer M · jeu C · sam M · dim C (+3 équivalentes) | 4 | 1 | 0 | 26 | 39 | 0 | 0 | 0 | 4 | crosstraining:slot_unavailable, running:slot_unavailable |
| lun M · mer M · jeu C · sam M · dim X | 4 | 0 | 0 | 36 | 39 | 3 | 0 | 1 | 2 | running:slot_unavailable, running:slot_unavailable |

Séances non placées sur l’ensemble des organisations : running:slot_unavailable (40/60), strength:engine_refused (30/60), strength:slot_unavailable (30/60), crosstraining:engine_refused (19/60), crosstraining:slot_unavailable (10/60).

### D. Matériel limité (haltères seulement) — 5 jours disponibles (mer. et dim. off)

Organisations énumérées : 60 ; non dominées : 15 (10 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **5**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 50.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mar C · jeu M · ven M · sam C | 5 | 2 | 1 | 14 | 30.5 | 11 | 0 | 1 | 4 | crosstraining:engine_refused |
| RC2 A·P1 | 5 | 2 | 1 | 14 | 30.5 | 11 | 0 | 3 | 4 | crosstraining:engine_refused |
| RC2 D0 | 5 | 2 | 1 | 14 | 30.5 | 11 | 0 | 1 | 4 | crosstraining:engine_refused |
| RC2 DB·P1 | 5 | 2 | 1 | 14 | 30.5 | 11 | 0 | 3 | 4 | crosstraining:engine_refused |
| **meilleure valeur atteinte** | 5 | 2 | 0 | 42 | 30.5 | 0 | 0 | 0 | | |
| ✓ lun C · mar M · jeu C · ven M · sam M | 5 | 2 | 0 | 24 | 30.5 | 11 | 0 | 1 | 4 | crosstraining:slot_unavailable |
| ✓ lun C · mar M · jeu M · ven C · sam M | 5 | 2 | 0 | 14 | 30.5 | 0 | 0 | 1 | 4 | crosstraining:slot_unavailable |
| lun C · mar C · jeu M · ven M · sam M | 5 | 2 | 0 | 38 | 29.5 | 40.5 | 0 | 0 | 3 | crosstraining:slot_unavailable |
| lun M · mar M · jeu M · ven C · sam C (+2 équivalentes) | 5 | 2 | 0 | 33 | 30.5 | 22 | 0 | 0 | 3 | crosstraining:slot_unavailable |
| lun C · mar C · jeu M · ven X · sam M | 4 | 2 | 0 | 25 | 19 | 0 | 0 | 0 | 5 | crosstraining:engine_refused, strength:slot_unavailable |
| lun M · mar X · jeu M · ven C · sam C (+2 équivalentes) | 4 | 2 | 0 | 20 | 23 | 0 | 0 | 0 | 5 | crosstraining:engine_refused, strength:slot_unavailable |
| lun M · mar M · jeu M · ven X · sam C (+1 équivalente) | 4 | 1 | 0 | 42 | 30.5 | 22 | 0 | 0 | 3 | crosstraining:engine_refused, running:slot_unavailable |
| lun M · mar X · jeu C · ven M · sam M | 4 | 1 | 0 | 33 | 30.5 | 11 | 0 | 0 | 3 | crosstraining:engine_refused, running:slot_unavailable |
| lun C · mar M · jeu M · ven X · sam M | 4 | 1 | 0 | 33 | 30.5 | 0 | 0 | 1 | 3 | crosstraining:engine_refused, running:slot_unavailable |
| lun M · mar X · jeu M · ven C · sam M | 4 | 1 | 0 | 24 | 30.5 | 0 | 0 | 0 | 3 | crosstraining:engine_refused, running:slot_unavailable |

Séances non placées sur l’ensemble des organisations : crosstraining:engine_refused (50/60), strength:slot_unavailable (30/60), running:slot_unavailable (20/60), crosstraining:slot_unavailable (10/60).

### D. Matériel limité (haltères seulement) — 6 jours disponibles (profil RC1)

Organisations énumérées : 60 ; non dominées : 5 (4 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **0**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 60.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mer M · jeu M · ven C · sam C | 5 | 2 | 0 | 33 | 30.5 | 13 | 0 | 0 | 2 | crosstraining:engine_refused |
| RC2 A·P1 | 5 | 2 | 0 | 33 | 30.5 | 13 | 0 | 2 | 2 | crosstraining:engine_refused |
| RC2 D0 | 5 | 2 | 0 | 24 | 30.5 | 17 | 0 | 0 | 3 | crosstraining:engine_refused |
| RC2 DB·P1 | 5 | 2 | 0 | 24 | 30.5 | 17 | 0 | 2 | 3 | crosstraining:engine_refused |
| **meilleure valeur atteinte** | 5 | 2 | 0 | 42 | 30.5 | 0 | 0 | 0 | | |
| lun M · mar M · mer M · jeu X · ven C · sam C | 5 | 2 | 0 | 42 | 30.5 | 42.5 | 0 | 1 | 3 | crosstraining:engine_refused |
| lun C · mar C · mer X · jeu M · ven M · sam M | 5 | 2 | 0 | 38 | 29.5 | 40.5 | 0 | 0 | 3 | crosstraining:engine_refused |
| lun M · mar X · mer M · jeu M · ven C · sam C | 5 | 2 | 0 | 33 | 30.5 | 13 | 0 | 0 | 2 | crosstraining:engine_refused |
| lun M · mar X · mer M · jeu C · ven M · sam C (+1 équivalente) | 5 | 2 | 0 | 24 | 30.5 | 0 | 0 | 0 | 3 | crosstraining:engine_refused |

Séances non placées sur l’ensemble des organisations : crosstraining:engine_refused (60/60).

### D. Matériel limité (haltères seulement) — 6 jours + journées doubles explicites mer. et sam. (course 35 min + autre séance), règle G4 actuelle

Organisations énumérées : 244 ; non dominées : 11 (6 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **0**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 244.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mer M · jeu M · ven C · sam C | 5 | 2 | 0 | 33 | 30.5 | 13 | 0 | 0 | 2 | crosstraining:engine_refused |
| RC2 A·P1 | 5 | 2 | 0 | 33 | 30.5 | 13 | 0 | 2 | 2 | crosstraining:engine_refused |
| RC2 D0 | 5 | 2 | 0 | 24 | 30.5 | 17 | 0 | 0 | 3 | crosstraining:engine_refused |
| RC2 DB·P1 | 5 | 2 | 0 | 24 | 30.5 | 17 | 0 | 2 | 3 | crosstraining:engine_refused |
| **meilleure valeur atteinte** | 5 | 2 | 0 | 42 | 30.5 | 0 | 0 | 0 | | |
| lun M · mar M · mer M · jeu X · ven C · sam C | 5 | 2 | 0 | 42 | 30.5 | 42.5 | 0 | 1 | 3 | crosstraining:engine_refused |
| lun C · mar C · mer X · jeu M · ven M · sam M | 5 | 2 | 0 | 38 | 29.5 | 40.5 | 0 | 0 | 3 | crosstraining:engine_refused |
| lun M · mar X · mer M · jeu M · ven C · sam C | 5 | 2 | 0 | 33 | 30.5 | 13 | 0 | 0 | 2 | crosstraining:engine_refused |
| lun M · mer M · jeu C · ven M · sam C+X (+3 équivalentes) | 5 | 2 | 0 | 24 | 30.5 | 0 | 0 | 0 | 3 | crosstraining:engine_refused |
| lun C · mer C+M · jeu M · ven X · sam M (+1 équivalente) | 4 | 1 | 0 | 39 | 24 | 16 | 0 | 0 | 4 | crosstraining:engine_refused, running:interference_conflict |
| lun C · mer C+M · jeu X · ven M · sam M (+1 équivalente) | 4 | 1 | 0 | 39 | 27 | 22 | 0 | 0 | 4 | crosstraining:engine_refused, running:interference_conflict |

Séances non placées sur l’ensemble des organisations : crosstraining:engine_refused (244/244), strength:interference_conflict (119/244), running:interference_conflict (37/244).

### D. Matériel limité (haltères seulement) — 6 jours + journées doubles explicites mer. et sam., G4 EXPLORATOIRE « même jour admis »

Organisations énumérées : 244 ; non dominées : 21 (4 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **0**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 244.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mer M · jeu M · ven C · sam C | 5 | 2 | 0 | 33 | 30.5 | 13 | 0 | 0 | 2 | crosstraining:engine_refused |
| RC2 A·P1 | 5 | 2 | 0 | 33 | 30.5 | 13 | 0 | 2 | 2 | crosstraining:engine_refused |
| RC2 D0 | 5 | 2 | 0 | 24 | 30.5 | 17 | 0 | 0 | 3 | crosstraining:engine_refused |
| RC2 DB·P1 | 5 | 2 | 0 | 24 | 30.5 | 17 | 0 | 2 | 3 | crosstraining:engine_refused |
| **meilleure valeur atteinte** | 5 | 2 | 0 | 42 | 30.5 | 0 | 0 | 0 | | |
| lun M · mar M · mer M · jeu X · ven C · sam C | 5 | 2 | 0 | 42 | 30.5 | 42.5 | 0 | 1 | 3 | crosstraining:engine_refused |
| lun C · mar C · mer X · jeu M · ven M · sam M | 5 | 2 | 0 | 38 | 29.5 | 40.5 | 0 | 0 | 3 | crosstraining:engine_refused |
| lun M · mar X · mer M · jeu M · ven C · sam C | 5 | 2 | 0 | 33 | 30.5 | 13 | 0 | 0 | 2 | crosstraining:engine_refused |
| lun M · mer M · jeu C · ven M · sam C+X (+17 équivalentes) | 5 | 2 | 0 | 24 | 30.5 | 0 | 0 | 0 | 3 | crosstraining:engine_refused |

Séances non placées sur l’ensemble des organisations : crosstraining:engine_refused (244/244).

### D. Matériel limité (haltères seulement) — disponibilité irrégulière (45 · 0 · 90 · 30 · 0 · 120 · 60)

Organisations énumérées : 60 ; non dominées : 21 (13 profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **non**. Organisations qui dominent RC1 : **1**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : 54.

| organisation | séances conservées (↑) | courses conservées (↑) | courses pré-fatiguées (force bas du corps la veille) (↓) | séries bas du corps (↑) | séries haut du corps (↑) | séries partagées à J+1 (↓) | séances au-delà du temps alloué (↓) | conflits M3 résiduels (↓) | groupes sous plancher | non placées |
|---|---|---|---|---|---|---|---|---|---|---|
| RC1 (référence) — lun M · mer C · jeu M · sam M · dim C | 5 | 2 | 0 | 14 | 26.5 | 0 | 0 | 0 | 4 | crosstraining:engine_refused |
| RC2 A·P1 | 5 | 2 | 0 | 14 | 26.5 | 0 | 0 | 0 | 4 | crosstraining:engine_refused |
| RC2 D0 | 5 | 2 | 0 | 14 | 26.5 | 0 | 0 | 0 | 4 | crosstraining:engine_refused |
| RC2 DB·P1 | 5 | 2 | 0 | 14 | 26.5 | 0 | 0 | 0 | 4 | crosstraining:engine_refused |
| **meilleure valeur atteinte** | 5 | 2 | 0 | 42 | 30.5 | 0 | 0 | 0 | | |
| ✓ lun M · mer C · jeu M · sam C · dim M | 5 | 2 | 0 | 16 | 26.5 | 0 | 0 | 0 | 5 | crosstraining:slot_unavailable |
| lun C · mer C · jeu M · sam M · dim M | 5 | 2 | 0 | 33 | 27 | 22 | 0 | 1 | 4 | crosstraining:slot_unavailable |
| lun M · mer M · jeu M · sam C · dim C | 5 | 2 | 0 | 26 | 26.5 | 13 | 0 | 0 | 4 | crosstraining:slot_unavailable |
| lun C · mer M · jeu M · sam M · dim C | 5 | 2 | 0 | 26 | 30.5 | 13.5 | 0 | 0 | 4 | crosstraining:slot_unavailable |
| lun C · mer M · jeu M · sam C · dim M | 5 | 2 | 0 | 24 | 30.5 | 12.5 | 0 | 0 | 4 | crosstraining:slot_unavailable |
| lun C · mer C · jeu X · sam M · dim M | 4 | 2 | 0 | 29 | 23 | 23.5 | 0 | 0 | 5 | crosstraining:engine_refused, strength:slot_unavailable |
| lun M · mer M · jeu X · sam C · dim C | 4 | 2 | 0 | 22 | 19 | 0 | 0 | 0 | 5 | crosstraining:engine_refused, strength:slot_unavailable |
| lun C · mer M · jeu X · sam M · dim C (+1 équivalente) | 4 | 2 | 0 | 20 | 23 | 0 | 0 | 0 | 5 | crosstraining:engine_refused, strength:slot_unavailable |
| lun C · mer M · jeu C · sam M · dim M (+1 équivalente) | 4 | 1 | 0 | 42 | 30.5 | 19 | 0 | 0 | 3 | crosstraining:slot_unavailable, running:slot_unavailable |
| lun C · mer M · jeu M · sam M · dim X (+1 équivalente) | 4 | 1 | 0 | 35 | 30.5 | 13.5 | 0 | 0 | 3 | crosstraining:engine_refused, running:slot_unavailable |
| lun M · mer M · jeu C · sam M · dim C (+3 équivalentes) | 4 | 1 | 0 | 26 | 29.5 | 0 | 0 | 0 | 4 | crosstraining:slot_unavailable, running:slot_unavailable |
| lun C · mer M · jeu C · sam M · dim X (+1 équivalente) | 3 | 1 | 0 | 29 | 23 | 0 | 0 | 0 | 5 | crosstraining:engine_refused, running:slot_unavailable, strength:slot_unavailable |
| … 1 autres profils non dominés (JSON) |  |  |  |  |  |  |  |  | | |

Séances non placées sur l’ensemble des organisations : crosstraining:engine_refused (50/60), running:slot_unavailable (40/60), strength:slot_unavailable (30/60), crosstraining:slot_unavailable (10/60), strength:engine_refused (2/60).

## 3. Variantes exploratoires de la règle de proximité sur les organisations

Pour chaque variante : RC1 recalculé avec la variante, puis meilleures valeurs atteignables parmi les organisations qui CONSERVENT toutes les séances et toutes les courses. Aucune variante n’est approuvée ni activée.

| cas | variante | RC1 bas / haut / partagées J+1 / pré-fatigue | meilleur bas du corps (toutes séances conservées) | min. séries partagées J+1 (idem) | non dominées | dominent RC1-V0 |
|---|---|---|---|---|---|---|
| A · S6 | V0 | 31 / 28 / 29 / 1 | 40 (haut 28, partagées 48.5, pré-fatigue 0) — lun M · mar M · mer M · jeu X · ven C · sam C | 1.5 (bas 12, pré-fatigue 1) — lun M · mar C · mer M · jeu X · ven C · sam M | 8 | 1 |
| A · S6 | V1 | 31 / 28 / 31.5 / 1 | 40 (haut 28, partagées 47, pré-fatigue 1) — lun M · mar M · mer M · jeu C · ven X · sam C | 1.5 (bas 21, pré-fatigue 2) — lun M · mar C · mer M · jeu X · ven C · sam M | 12 | 0 |
| A · S6 | V2 | 31 / 28 / 31.5 / 1 | 41 (haut 28, partagées 29, pré-fatigue 1) — lun C · mar X · mer M · jeu M · ven C · sam M | 1.5 (bas 31, pré-fatigue 0) — lun M · mar X · mer C · jeu M · ven C · sam M | 6 | 0 |
| A · S6 | V3 | 31 / 28 / 29 / 1 | 40 (haut 28, partagées 48.5, pré-fatigue 0) — lun M · mar M · mer M · jeu X · ven C · sam C | 1.5 (bas 21, pré-fatigue 0) — lun M · mar X · mer C · jeu M · ven C · sam M | 5 | 3 |
| A · S6Dx | V0 | 31 / 28 / 29 / 1 | 40 (haut 28, partagées 48.5, pré-fatigue 0) — lun M · mar M · mer M · jeu X · ven C · sam C | 1 (bas 21, pré-fatigue 0) — lun M · mer M · jeu C · ven M · sam C+X | 11 | 3 |
| A · S6Dx | V1 | 31 / 28 / 31.5 / 1 | 40 (haut 28, partagées 47, pré-fatigue 1) — lun M · mar M · mer M · jeu C · ven X · sam C | 1 (bas 21, pré-fatigue 0) — lun M · mer M · jeu C · ven M · sam C+X | 20 | 2 |
| A · S6Dx | V2 | 31 / 28 / 31.5 / 1 | 41 (haut 28, partagées 29, pré-fatigue 1) — lun C · mar X · mer M · jeu M · ven C · sam M | 1 (bas 31, pré-fatigue 1) — lun M · mer C+M · ven M · sam C+X | 16 | 5 |
| A · S6Dx | V3 | 31 / 28 / 29 / 1 | 40 (haut 28, partagées 47, pré-fatigue 0) — lun M · mar M · mer M · ven C · sam C+X | 1 (bas 21, pré-fatigue 0) — lun M · mer M · jeu C · ven M · sam C+X | 12 | 7 |
| B · S6 | V0 | 8 / 20.5 / 2.5 / 0 | 28 (haut 20.5, partagées 29, pré-fatigue 0) — lun C · mar C · mer C · jeu X · ven M · sam M | 0 (bas 8, pré-fatigue 0) — lun M · mar C · mer M · jeu C · ven C · sam X | 10 | 19 |
| B · S6 | V1 | 8 / 20.5 / 2.5 / 0 | 28 (haut 20.5, partagées 31.5, pré-fatigue 0) — lun C · mar C · mer C · jeu X · ven M · sam M | 0 (bas 27, pré-fatigue 3) — lun M · mar C · mer M · jeu C · ven X · sam C | 13 | 3 |
| B · S6 | V2 | 8 / 20.5 / 5 / 0 | 28 (haut 20.5, partagées 31.5, pré-fatigue 0) — lun C · mar C · mer C · jeu X · ven M · sam M | 0 (bas 27, pré-fatigue 2) — lun M · mar C · mer M · jeu C · ven C · sam X | 8 | 0 |
| B · S6 | V3 | 8 / 20.5 / 2.5 / 0 | 28 (haut 20.5, partagées 29, pré-fatigue 0) — lun C · mar C · mer C · jeu X · ven M · sam M | 0 (bas 8, pré-fatigue 0) — lun M · mar C · mer M · jeu C · ven C · sam X | 10 | 19 |
| B · S6Dx | V0 | 8 / 20.5 / 2.5 / 0 | 28 (haut 20.5, partagées 29, pré-fatigue 0) — lun C · mar C · mer C · jeu X · ven M · sam M | 0 (bas 18, pré-fatigue 1) — lun X · mar C · mer C+M · jeu C · sam M | 28 | 66 |
| B · S6Dx | V1 | 8 / 20.5 / 2.5 / 0 | 28 (haut 20.5, partagées 31.5, pré-fatigue 0) — lun C · mar C · mer C · jeu X · ven M · sam M | 0 (bas 27, pré-fatigue 3) — lun M · mar C · mer M · jeu C · ven X · sam C | 25 | 30 |
| B · S6Dx | V2 | 8 / 20.5 / 5 / 0 | 28 (haut 20.5, partagées 31.5, pré-fatigue 0) — lun C · mar C · mer C · jeu X · ven M · sam M | 0 (bas 27, pré-fatigue 1) — lun M · mer M · jeu C · ven C · sam C+X | 16 | 12 |
| B · S6Dx | V3 | 8 / 20.5 / 2.5 / 0 | 28 (haut 20.5, partagées 29, pré-fatigue 0) — lun C · mar C · mer C · jeu X · ven M · sam M | 0 (bas 18, pré-fatigue 1) — lun X · mar C · mer C+M · jeu C · sam M | 13 | 61 |

## 4. Représentants du front sur 4 semaines (contrôles scénarisés RC1, exécution réelle)

Représentants choisis SANS score : RC1 ; organisation non dominée qui conserve tout et maximise le bas du corps ; idem minimisant les séries partagées à J+1 ; idem minimisant la pré-fatigue des courses (départage : bas du corps). E = planification de A, récupération dégradée à chaque contrôle.

| cas | représentant | séances réalisées | reportées | course réalisée (séances / min) | bas du corps (plan./sem.) | haut du corps | sous plancher | paires J+1 | séries partagées J+1 | résidus M3 | violations |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A · S6 | RC1 | 23 | 1 | 8 / 242 | 30.3 | 28 | back, chest, hamstrings, quads | 8 | 107.5 | 3 | 0 |
| A · S6 | max bas du corps — lun M · mar M · mer M · jeu X · ven C · sam C | 22 | 1 | 7 / 212 | 37.8 | 28 | back, calves, chest | 10 | 169 | 8 | 0 |
| A · S6 | min séries partagées — lun M · mar X · mer C · jeu M · ven C · sam M | 22 | 1 | 7 / 212 | 12 | 28.4 | back, calves, chest, hamstrings, quads | 4 | 9.5 | 2 | 0 |
| A · S6Dx | RC1 | 23 | 1 | 8 / 242 | 30.3 | 28 | back, chest, hamstrings, quads | 8 | 107.5 | 3 | 0 |
| A · S6Dx | max bas du corps — lun M · mar M · mer M · jeu X · ven C · sam C | 22 | 1 | 7 / 212 | 37.8 | 28 | back, calves, chest | 10 | 169 | 8 | 0 |
| A · S6Dx | min séries partagées — lun M · mer M · jeu C · ven M · sam C+X | 23 | 1 | 8 / 242 | 21 | 28 | back, calves, chest, hamstrings, quads | 3 | 5.5 | 5 | 0 |
| B · S6 | RC1 | 22 | 1 | 11 / 333 | 8 | 20.9 | back, calves, chest, glutes, hamstrings, quads | 4 | 7 | 6 | 0 |
| B · S6 | max bas du corps — lun C · mar C · mer C · jeu X · ven M · sam M | 23 | 1 | 12 / 363 | 26.5 | 20.9 | back, chest, hamstrings, quads | 7 | 87.5 | 20 | 0 |
| B · S6 | min séries partagées — lun M · mar C · mer C · jeu X · ven C · sam M | 23 | 0 | 11 / 333 | 8 | 20.9 | back, calves, chest, glutes, hamstrings, quads | 0 | 0 | 4 | 0 |
| B · S6Dx | RC1 | 22 | 1 | 11 / 333 | 8 | 20.9 | back, calves, chest, glutes, hamstrings, quads | 4 | 7 | 6 | 0 |
| B · S6Dx | max bas du corps — lun C · mar C · mer C · jeu X · ven M · sam M | 23 | 1 | 12 / 363 | 26.5 | 20.9 | back, chest, hamstrings, quads | 7 | 87.5 | 20 | 0 |
| B · S6Dx | min séries partagées — lun X · mar C · mer C+M · jeu C · sam M | 22 | 1 | 11 / 333 | 18 | 19.9 | back, chest, hamstrings, quads | 0 | 0 | 18 | 0 |
| C · S6 | RC1 | 23 | 1 | 8 / 242 | 30 | 39.6 | back, calves, quads | 8 | 114 | 3 | 0 |
| C · S6 | max bas du corps — lun M · mar M · mer M · jeu X · ven C · sam C | 22 | 1 | 7 / 212 | 38.5 | 38.1 | back, calves | 10 | 186 | 6 | 0 |
| C · S6 | min séries partagées — lun M · mar C · mer M · jeu X · ven C · sam M | 22 | 1 | 7 / 212 | 12 | 36.6 | back, calves, hamstrings, quads | 4 | 6 | 3 | 0 |
| C · S6Dx | RC1 | 23 | 1 | 8 / 242 | 30 | 39.6 | back, calves, quads | 8 | 114 | 3 | 0 |
| C · S6Dx | max bas du corps — lun M · mar M · mer M · jeu X · ven C · sam C | 22 | 1 | 7 / 212 | 38.5 | 38.1 | back, calves | 10 | 186 | 6 | 0 |
| C · S6Dx | min séries partagées — lun M · mer M · jeu C · ven M · sam C+X | 23 | 1 | 8 / 242 | 21 | 34.8 | back, calves, hamstrings, quads | 3 | 3.5 | 3 | 0 |
| D · S6 | RC1 | 16 | 3 | 5 / 150 | 17.3 | 28.6 | calves, chest, hamstrings, quads | 3 | 45.5 | 0 | 0 |
| D · S6Dx | RC1 | 16 | 3 | 5 / 150 | 17.3 | 28.6 | calves, chest, hamstrings, quads | 3 | 45.5 | 0 | 0 |
| E · S6 | RC1 | 24 | 0 | 8 / 240 | 30.3 | 28 | back, chest, hamstrings, quads | 8 | 106 | 3 | 0 |
| E · S6 | max bas du corps — lun M · mar M · mer M · jeu X · ven C · sam C | 24 | 0 | 8 / 240 | 37 | 28 | back, calves, chest, quads | 12 | 194.5 | 10 | 0 |
| E · S6 | min séries partagées — lun M · mar X · mer C · jeu M · ven C · sam M | 24 | 0 | 8 / 240 | 12 | 28.4 | back, calves, chest, hamstrings, quads | 4 | 6 | 3 | 0 |
| E · S6Dx | RC1 | 24 | 0 | 8 / 240 | 30.3 | 28 | back, chest, hamstrings, quads | 8 | 106 | 3 | 0 |
| E · S6Dx | max bas du corps — lun M · mar M · mer M · jeu X · ven C · sam C | 24 | 0 | 8 / 240 | 37 | 28 | back, calves, chest, quads | 12 | 194.5 | 10 | 0 |
| E · S6Dx | min séries partagées — lun M · mer M · jeu C · ven M · sam C+X | 24 | 0 | 8 / 240 | 21 | 28 | back, calves, chest, hamstrings, quads | 4 | 5.5 | 6 | 0 |
