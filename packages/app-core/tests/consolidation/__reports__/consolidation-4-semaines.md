# Consolidation PR #2 + #3 — 4 semaines multisport (chemin réel de l’application)

> Beta 0 (`beta0Environment`) : règles TEST_ONLY / SIMULATION_ONLY existantes, aucune nouvelle. Profil : intermédiaire, prise de masse 3×/sem., Running 2×/sem. (P_R2), Cross-training 1×/sem. « force + conditionnement », disponibilités lun 75 · mar 60 · mer 75 · jeu 60 · ven 75 · sam 90 · dim 0 min, **salle commerciale** (matériel du préréglage). Charges et résultats saisis illustratifs.

Contrôle pré-séance scénarisé : S1 normal (+ matériel indisponible sur un accessoire) ; S2 récupération mauvaise / fatigue élevée / « Passer » ; S3 genou P2 déclaré puis « Passer » (douleur connue) ; S4 « Non » (genou résolu), épaule P1 ×2, une course manquée.

| sem. | jour | sport | séance | cible / estimée (min) | reproductible | contrôle | décision | changements | raisons clés | exécution |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 10-05 | strength | str_full_body A | 69 / 59 | oui | Non · fatigue faible · bonne récup. | unchanged | matériel indisponible cable_lateral_raise → refus (no_declared_substitute) | — | réalisée |
| 1 | 10-06 | strength | str_full_body B | 54 / 49 | non | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 1 | 10-07 | crosstraining | amrap + bloc force | 73 / 49 | oui | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 1 | 10-08 | running | running.easy | 58 / 30 | oui | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 1 | 10-09 | strength | str_full_body C | 69 / 39 | non | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 1 | 10-10 | running | running.easy | 88 / 30 | oui | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 2 | 10-12 | strength | str_full_body A | 69 / 58 | oui | Passer (état inconnu) | unchanged | — | — | réalisée |
| 2 | 10-13 | strength | str_full_body B | 54 / 48 | oui | Non · récupération mauvaise | adapted | rir:seated_cable_row:2>3, rir:db_shoulder_press:2>3, rir:cable_lateral_raise:1>2 | — | réalisée |
| 2 | 10-14 | crosstraining | amrap + bloc force | 73 / 51 | oui | Non · fatigue élevée | unchanged | — | — | réalisée |
| 2 | 10-15 | running | running.easy | 58 / 30 | oui | Passer (état inconnu) | unchanged | — | — | réalisée |
| 2 | 10-16 | strength | str_full_body A | 69 / 42 | oui | Passer (état inconnu) | unchanged | — | — | réalisée |
| 2 | 10-17 | running | running.easy | 88 / 30 | oui | Passer (état inconnu) | unchanged | — | — | réalisée |
| 3 | 10-19 | strength | str_full_body A | 69 / 60 | oui | Oui · genou P2 | adapted | removed:back_squat, removed:leg_curl, removed:walking_lunge_db, added:romanian_deadlift | — | réalisée |
| 3 | 10-20 | strength | str_full_body B | 54 / 52 | oui | Passer (genou P2 connu) | adapted | removed:leg_curl, removed:walking_lunge_db | KNOWN_PAIN_KEPT | réalisée |
| 3 | 10-21 | crosstraining | amrap + bloc force | 73 / 48 | oui | Passer (genou P2 connu) | adapted | removed:back_squat, removed:air_squat, added:barbell_ohp | KNOWN_PAIN_KEPT | réalisée |
| 3 | 10-22 | running | running.easy | 58 / 30 | oui | Passer (genou P2 connu) | adapted | removed:easy_run, added:row_erg | KNOWN_PAIN_KEPT | réalisée |
| 3 | 10-23 | strength | str_full_body C | 69 / 37 | oui | Passer (genou P2 connu) | unchanged | — | KNOWN_PAIN_KEPT | réalisée |
| 3 | 10-24 | running | running.easy | 88 / 30 | oui | Passer (genou P2 connu) | adapted | removed:easy_run, added:row_erg | KNOWN_PAIN_KEPT | réalisée |
| 4 | 10-26 | strength | str_full_body A | 69 / 58 | oui | Non (genou résolu) | unchanged | — | — | réalisée |
| 4 | 10-27 | strength | str_full_body B | 54 / 47 | oui | Oui · épaule P1 | unchanged | — | — | réalisée |
| 4 | 10-28 | crosstraining | amrap + bloc force | 73 / 48 | oui | Non | unchanged | — | — | réalisée |
| 4 | 10-29 | running | running.easy | 58 / 30 | oui | Non | unchanged | — | — | réalisée |
| 4 | 10-30 | strength | str_full_body C | 69 / 43 | oui | Oui · épaule P1 | postponed | — | PAIN_ESCALATED, SESSION_NOT_ADAPTABLE, BLOCKING_NEED | non démarrée (report) |
| 4 | 10-31 | running | running.easy | 88 / 30 | oui | Non | unchanged | — | — | réalisée |

## Semaine 1

- Séances non placées : aucune
- Volume Musculation PLANIFIÉ (bilan Strength, séries de travail / cible) : arms 18.5/6 (achieved) · back 11/10 (achieved) · calves 0/4 (reduced_by_constraint) · chest 7/10 (reduced_by_constraint) · core 10/4 (achieved) · glutes 12/6 (achieved) · hamstrings 9/8 (achieved) · quads 9/10 (reduced_by_constraint) · shoulders 12/8 (achieved)
- Volume de force EXÉCUTÉ (Musculation + blocs de force CT, séances réellement faites, adaptées comprises) : arms 18.5 · back 11 · chest 7 · core 10.5 · glutes 13 · hamstrings 9 · quads 10 · shoulders 12
- Conflits de récupération signalés (`same_discipline_recovery`, NON RÉSOLU, jamais appliqué) : 
  - 2026-10-05 Musculation ↔ 2026-10-06 Musculation : arms, back, core, glutes, hamstrings, quads, shoulders
  - 2026-10-06 Musculation ↔ 2026-10-07 bloc force CT : core, glutes, quads

## Semaine 2

- Séances non placées : aucune
- Volume Musculation PLANIFIÉ (bilan Strength, séries de travail / cible) : arms 17.5/6 (achieved) · back 11/10 (achieved) · calves 4/4 (achieved) · chest 6/10 (reduced_by_constraint) · core 7/4 (achieved) · glutes 12/6 (achieved) · hamstrings 11/8 (achieved) · quads 7/10 (reduced_by_constraint) · shoulders 13.5/8 (achieved)
- Volume de force EXÉCUTÉ (Musculation + blocs de force CT, séances réellement faites, adaptées comprises) : arms 17.5 · back 11 · calves 4 · chest 6 · core 7 · glutes 13 · hamstrings 11.5 · quads 7 · shoulders 13.5
- Conflits de récupération signalés (`same_discipline_recovery`, NON RÉSOLU, jamais appliqué) : 
  - 2026-10-12 Musculation ↔ 2026-10-13 Musculation : arms, back, core, glutes, hamstrings, quads, shoulders
  - 2026-10-13 Musculation ↔ 2026-10-14 bloc force CT : glutes, hamstrings

## Semaine 3

- Séances non placées : aucune
- Volume Musculation PLANIFIÉ (bilan Strength, séries de travail / cible) : arms 16/6 (achieved) · back 11/10 (achieved) · calves 4/4 (achieved) · chest 3/10 (reduced_by_constraint) · core 7/4 (achieved) · glutes 12/6 (achieved) · hamstrings 11/8 (achieved) · quads 7/10 (reduced_by_constraint) · shoulders 13.5/8 (achieved)
- Volume de force EXÉCUTÉ (Musculation + blocs de force CT, séances réellement faites, adaptées comprises) : arms 18 · back 11 · calves 4 · chest 3 · core 8 · glutes 8 · hamstrings 8 · shoulders 15.5
- Conflits de récupération signalés (`same_discipline_recovery`, NON RÉSOLU, jamais appliqué) : 
  - 2026-10-19 Musculation ↔ 2026-10-20 Musculation : arms, back, core, glutes, hamstrings, quads, shoulders
  - 2026-10-20 Musculation ↔ 2026-10-21 bloc force CT : core, glutes, quads

## Semaine 4

- Séances non placées : aucune
- Volume Musculation PLANIFIÉ (bilan Strength, séries de travail / cible) : arms 17.5/6 (achieved) · back 11/10 (achieved) · calves 0/4 (reduced_by_constraint) · chest 6/10 (reduced_by_constraint) · core 7/4 (achieved) · glutes 12/6 (achieved) · hamstrings 11/8 (achieved) · quads 7/10 (reduced_by_constraint) · shoulders 13.5/8 (achieved)
- Volume de force EXÉCUTÉ (Musculation + blocs de force CT, séances réellement faites, adaptées comprises) : arms 10.5 · back 6 · chest 3 · core 6.5 · glutes 11 · hamstrings 9 · quads 8 · shoulders 9
- Conflits de récupération signalés (`same_discipline_recovery`, NON RÉSOLU, jamais appliqué) : 
  - 2026-10-26 Musculation ↔ 2026-10-27 Musculation : arms, back, core, glutes, hamstrings, quads, shoulders
  - 2026-10-27 Musculation ↔ 2026-10-28 bloc force CT : core, glutes, quads
