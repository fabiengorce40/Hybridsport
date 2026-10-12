# Consolidation PR #2 + #3 — 4 semaines multisport (chemin réel de l’application)

> Beta 0 (`beta0Environment`) : règles TEST_ONLY / SIMULATION_ONLY existantes, aucune nouvelle. Profil : intermédiaire, prise de masse 3×/sem., Running 2×/sem. (P_R2), Cross-training 1×/sem. « force + conditionnement », disponibilités lun 75 · mar 60 · mer 75 · jeu 60 · ven 75 · sam 90 · dim 0 min, **salle commerciale** (matériel du préréglage). Charges et résultats saisis illustratifs.

Contrôle pré-séance scénarisé : S1 normal (+ matériel indisponible sur un accessoire) ; S2 récupération mauvaise / fatigue élevée / « Passer » ; S3 genou P2 déclaré puis « Passer » (douleur connue) ; S4 « Non » (genou résolu), épaule P1 ×2, une course manquée.

| sem. | jour | sport | séance | cible / estimée (min) | reproductible | contrôle | décision | changements | raisons clés | exécution |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 10-05 | strength | str_full_body A | 69 / 56 | oui | Non · fatigue faible · bonne récup. | unchanged | matériel indisponible cable_lateral_raise → refus (no_declared_substitute) | — | réalisée |
| 1 | 10-06 | strength | str_full_body B | 54 / 41 | non | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 1 | 10-07 | crosstraining | amrap + bloc force | 73 / 49 | oui | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 1 | 10-08 | running | running.easy | 58 / 30 | oui | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 1 | 10-09 | strength | str_full_body C | 69 / 34 | non | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 1 | 10-10 | running | running.easy | 88 / 30 | oui | Non · fatigue faible · bonne récup. | unchanged | — | — | réalisée |
| 2 | 10-12 | strength | str_full_body A | 69 / 38 | non | Passer (état inconnu) | unchanged | — | — | réalisée |
| 2 | 10-13 | strength | str_full_body B | 54 / 45 | non | Non · récupération mauvaise | unchanged | — | ADAPTATION_NOT_APPLIED | réalisée |
| 2 | 10-14 | crosstraining | amrap + bloc force | 73 / 51 | oui | Non · fatigue élevée | unchanged | — | — | réalisée |
| 2 | 10-15 | running | running.easy | 58 / 30 | oui | Passer (état inconnu) | unchanged | — | — | réalisée |
| 2 | 10-16 | strength | str_full_body A | 69 / 38 | non | Passer (état inconnu) | unchanged | — | — | réalisée |
| 2 | 10-17 | running | running.easy | 88 / 30 | oui | Passer (état inconnu) | unchanged | — | — | réalisée |
| 3 | 10-19 | strength | str_full_body A | 69 / 36 | non | Oui · genou P2 | adapted | removed:back_squat, added:romanian_deadlift | SESSION_RECOMPOSED | réalisée |
| 3 | 10-20 | strength | str_full_body B | 54 / 44 | non | Passer (genou P2 connu) | unchanged | — | KNOWN_PAIN_KEPT, ADAPTATION_NOT_APPLIED | réalisée |
| 3 | 10-21 | crosstraining | amrap + bloc force | 73 / 48 | oui | Passer (genou P2 connu) | adapted | removed:back_squat, removed:air_squat, added:barbell_ohp | KNOWN_PAIN_KEPT | réalisée |
| 3 | 10-22 | running | running.easy | 58 / 30 | oui | Passer (genou P2 connu) | adapted | removed:easy_run, added:row_erg | KNOWN_PAIN_KEPT | réalisée |
| 3 | 10-23 | strength | str_full_body C | 69 / 39 | non | Passer (genou P2 connu) | unchanged | — | KNOWN_PAIN_KEPT, ADAPTATION_NOT_APPLIED | réalisée |
| 3 | 10-24 | running | running.easy | 88 / 30 | oui | Passer (genou P2 connu) | adapted | removed:easy_run, added:row_erg | KNOWN_PAIN_KEPT | réalisée |
| 4 | 10-26 | strength | str_full_body A | 69 / 39 | non | Non (genou résolu) | unchanged | — | — | réalisée |
| 4 | 10-27 | strength | str_full_body B | 54 / 33 | oui | Oui · épaule P1 | unchanged | — | — | réalisée |
| 4 | 10-28 | crosstraining | amrap + bloc force | 73 / 48 | oui | Non | unchanged | — | — | réalisée |
| 4 | 10-29 | running | running.easy | 58 / 30 | oui | Non | unchanged | — | — | réalisée |
| 4 | 10-30 | strength | str_full_body C | 69 / 44 | non | Oui · épaule P1 | postponed | — | PAIN_ESCALATED, SESSION_NOT_ADAPTABLE, BLOCKING_NEED | non démarrée (report) |
| 4 | 10-31 | running | running.easy | 88 / 30 | oui | Non | unchanged | — | — | réalisée |

## Semaine 1

- Séances non placées : aucune
- Volume Musculation PLANIFIÉ (bilan Strength, séries de travail / cible) : arms 20.5/6 (achieved) · back 9/10 (reduced_by_constraint) · calves 0/4 (reduced_by_constraint) · chest 7/10 (reduced_by_constraint) · core 9/4 (achieved) · glutes 6/6 (achieved) · hamstrings 2/8 (reduced_by_constraint) · quads 4/10 (reduced_by_constraint) · shoulders 12/8 (achieved)
- Volume de force EXÉCUTÉ (Musculation + blocs de force CT, séances réellement faites, adaptées comprises) : arms 20.5 · back 9 · chest 7 · core 9.5 · glutes 7 · hamstrings 2 · quads 5 · shoulders 12
- Conflits de récupération signalés (`same_discipline_recovery`, NON RÉSOLU, jamais appliqué) : 
  - 2026-10-05 Musculation ↔ 2026-10-06 Musculation : arms, back, core, glutes, shoulders
  - 2026-10-06 Musculation ↔ 2026-10-07 bloc force CT : core, glutes

## Semaine 2

- Séances non placées : aucune
- Volume Musculation PLANIFIÉ (bilan Strength, séries de travail / cible) : arms 16.5/6 (achieved) · back 9/10 (reduced_by_constraint) · calves 0/4 (reduced_by_constraint) · chest 6/10 (reduced_by_constraint) · core 9/4 (achieved) · glutes 6/6 (achieved) · hamstrings 4/8 (reduced_by_constraint) · quads 2/10 (reduced_by_constraint) · shoulders 13.5/8 (achieved)
- Volume de force EXÉCUTÉ (Musculation + blocs de force CT, séances réellement faites, adaptées comprises) : arms 16.5 · back 9 · chest 6 · core 9 · glutes 7 · hamstrings 4.5 · quads 2 · shoulders 13.5
- Conflits de récupération signalés (`same_discipline_recovery`, NON RÉSOLU, jamais appliqué) : 
  - 2026-10-12 Musculation ↔ 2026-10-13 Musculation : arms, back, core, glutes, shoulders
  - 2026-10-13 Musculation ↔ 2026-10-14 bloc force CT : glutes

## Semaine 3

- Séances non placées : aucune
- Volume Musculation PLANIFIÉ (bilan Strength, séries de travail / cible) : arms 15.5/6 (achieved) · back 10/10 (achieved) · calves 0/4 (reduced_by_constraint) · chest 3/10 (reduced_by_constraint) · core 9/4 (achieved) · glutes 6/6 (achieved) · hamstrings 4/8 (reduced_by_constraint) · quads 2/10 (reduced_by_constraint) · shoulders 14/8 (achieved)
- Volume de force EXÉCUTÉ (Musculation + blocs de force CT, séances réellement faites, adaptées comprises) : arms 17.5 · back 10 · chest 3 · core 10 · glutes 6 · hamstrings 6 · shoulders 16
- Conflits de récupération signalés (`same_discipline_recovery`, NON RÉSOLU, jamais appliqué) : 
  - 2026-10-19 Musculation ↔ 2026-10-20 Musculation : arms, back, core, glutes, shoulders
  - 2026-10-20 Musculation ↔ 2026-10-21 bloc force CT : core, glutes

## Semaine 4

- Séances non placées : aucune
- Volume Musculation PLANIFIÉ (bilan Strength, séries de travail / cible) : arms 16.5/6 (achieved) · back 9/10 (reduced_by_constraint) · calves 0/4 (reduced_by_constraint) · chest 6/10 (reduced_by_constraint) · core 6/4 (achieved) · glutes 6/6 (achieved) · hamstrings 4/8 (reduced_by_constraint) · quads 2/10 (reduced_by_constraint) · shoulders 13.5/8 (achieved)
- Volume de force EXÉCUTÉ (Musculation + blocs de force CT, séances réellement faites, adaptées comprises) : arms 10.5 · back 6 · chest 3 · core 2.5 · glutes 5 · hamstrings 2 · quads 3 · shoulders 9
- Conflits de récupération signalés (`same_discipline_recovery`, NON RÉSOLU, jamais appliqué) : 
  - 2026-10-26 Musculation ↔ 2026-10-27 Musculation : arms, back, core, glutes, shoulders
  - 2026-10-27 Musculation ↔ 2026-10-28 bloc force CT : core, glutes
