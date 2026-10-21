# R1 / R2 — comparaison avant / après sur 4 semaines

> Même simulation (`sim4.ts`), même profil (prise de masse 3×/sem., Running 2×, Cross-training 1× « force + conditionnement », salle commerciale), mêmes réponses au contrôle pré-séance. **Avant** : `88cf5da` (consolidation). **Après** : R1 (demande composite, TEST_ONLY) + R2 (fidélité de régénération, adaptation de la séance persistée). Valeurs sportives inchangées.

## 1. Séances (avant → après)

| sem. | jour | sport | séance (après) | reproductible | contrôle | décision | adaptation | changements (après) | durée cible / estimée prévue / estimée exécutée (min) | exécution |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 10-05 | strength | str_full_body A | oui | Non · fatigue faible · bonne récup. | unchanged | — | matériel indisponible cable_lateral_raise → refus (no_declared_substitute) | 69 / 56 → **59** / 56 → **59** | réalisée |
| 1 | 10-06 | strength | str_full_body B | non | Non · fatigue faible · bonne récup. | unchanged | — | — | 54 / 41 → **49** / 41 → **49** | réalisée |
| 1 | 10-07 | crosstraining | amrap + bloc force | oui | Non · fatigue faible · bonne récup. | unchanged | — | — | 73 / 49 / 49 | réalisée |
| 1 | 10-08 | running | running.easy | oui | Non · fatigue faible · bonne récup. | unchanged | — | — | 58 / 30 / 30 | réalisée |
| 1 | 10-09 | strength | str_full_body C | non | Non · fatigue faible · bonne récup. | unchanged | — | — | 69 / 34 / 34 | réalisée |
| 1 | 10-10 | running | running.easy | oui | Non · fatigue faible · bonne récup. | unchanged | — | — | 88 / 30 / 30 | réalisée |
| 2 | 10-12 | strength | str_full_body A | non → **oui** | Passer (état inconnu) | unchanged | — | — | 69 / 38 → **58** / 38 → **58** | réalisée |
| 2 | 10-13 | strength | str_full_body B | non → **oui** | Non · récupération mauvaise | unchanged → **adapted** | — → **régénérée (reproductible)** | rir:seated_cable_row:2>3, rir:db_shoulder_press:2>3, rir:cable_lateral_raise:1>2 | 54 / 45 → **48** / 45 → **48** | réalisée |
| 2 | 10-14 | crosstraining | amrap + bloc force | oui | Non · fatigue élevée | unchanged | — | — | 73 / 51 / 51 | réalisée |
| 2 | 10-15 | running | running.easy | oui | Passer (état inconnu) | unchanged | — | — | 58 / 30 / 30 | réalisée |
| 2 | 10-16 | strength | str_full_body A | non → **oui** | Passer (état inconnu) | unchanged | — | — | 69 / 38 / 38 | réalisée |
| 2 | 10-17 | running | running.easy | oui | Passer (état inconnu) | unchanged | — | — | 88 / 30 / 30 | réalisée |
| 3 | 10-19 | strength | str_full_body A | non → **oui** | Oui · genou P2 | adapted | recomposée (signalée) → **régénérée (reproductible)** | removed:back_squat, removed:leg_curl, removed:walking_lunge_db, added:romanian_deadlift | 69 / 36 → **63** / 36 → **53** | réalisée |
| 3 | 10-20 | strength | str_full_body B | non → **oui** | Passer (genou P2 connu) | unchanged → **adapted** | — → **régénérée (reproductible)** | removed:leg_curl, removed:walking_lunge_db | 54 / 44 → **52** / 44 → **42** | réalisée |
| 3 | 10-21 | crosstraining | amrap + bloc force | oui | Passer (genou P2 connu) | adapted | régénérée (reproductible) | removed:back_squat, removed:air_squat, added:barbell_ohp | 73 / 48 / 46 | réalisée |
| 3 | 10-22 | running | running.easy | oui | Passer (genou P2 connu) | adapted | régénérée (reproductible) | removed:easy_run, added:row_erg | 58 / 30 / 31 | réalisée |
| 3 | 10-23 | strength | str_full_body C | non → **oui** | Passer (genou P2 connu) | unchanged | — | — | 69 / 39 → **33** / 39 → **33** | réalisée |
| 3 | 10-24 | running | running.easy | oui | Passer (genou P2 connu) | adapted | régénérée (reproductible) | removed:easy_run, added:row_erg | 88 / 30 / 31 | réalisée |
| 4 | 10-26 | strength | str_full_body A | non → **oui** | Non (genou résolu) | unchanged | — | — | 69 / 39 → **58** / 39 → **58** | réalisée |
| 4 | 10-27 | strength | str_full_body B | oui | Oui · épaule P1 | unchanged | — | — | 54 / 33 → **47** / 33 → **47** | réalisée |
| 4 | 10-28 | crosstraining | amrap + bloc force | oui | Non | unchanged | — | — | 73 / 48 / 48 | réalisée |
| 4 | 10-29 | running | running.easy | oui | Non | unchanged | — | — | 58 / 30 / 30 | réalisée |
| 4 | 10-30 | strength | str_full_body C | non → **oui** | Oui · épaule P1 | postponed | — | — | 69 / 44 → **39** / — | non démarrée (report) |
| 4 | 10-31 | running | running.easy | oui | Non | unchanged | — | — | 88 / 30 / 30 | réalisée |

## 2. Audit douleur exercice par exercice (séances avec zone exclue, après)

Zones exclues recalculées par les règles G1 du CORE à partir du contrôle (douleurs déclarées + connues reportées) ; zones de chaque exercice lues dans le catalogue de la discipline de la séance, tous blocs (échauffement, force, accessoires, conditionnement, retour au calme).

- **2026-10-19 strength** (Oui · genou P2) — zones exclues : knee — réalisée — violations : aucune
  - lower_mobility_flow [warmup] (—) · romanian_deadlift [strength] (lower_back/hip_groin) · seated_cable_row [strength] (shoulder) · db_shoulder_press [strength] (shoulder/elbow) · cable_pallof_press [accessory] (—) · db_calf_raise [accessory] (—) · lower_mobility_flow [cooldown] (—)
- **2026-10-20 strength** (Passer (genou P2 connu)) — zones exclues : knee — réalisée — violations : aucune
  - lower_mobility_flow [warmup] (—) · romanian_deadlift [strength] (lower_back/hip_groin) · machine_chest_press [strength] (shoulder) · pull_up [strength] (shoulder/elbow) · cable_lateral_raise [accessory] (—) · lower_mobility_flow [cooldown] (—)
- **2026-10-21 crosstraining** (Passer (genou P2 connu)) — zones exclues : knee — réalisée — violations : aucune
  - row_erg [warmup] (lower_back) · barbell_ohp [strength] (shoulder/lower_back) · band_assisted_pull_up [warmup] (shoulder) · row_erg [warmup] (lower_back) · row_erg [conditioning] (lower_back) · band_assisted_pull_up [conditioning] (shoulder) · row_erg [cooldown] (lower_back) · shoulder_mobility_flow [cooldown] (—)
- **2026-10-22 running** (Passer (genou P2 connu)) — zones exclues : knee — réalisée — violations : aucune
  - row_erg [running] (lower_back)
- **2026-10-23 strength** (Passer (genou P2 connu)) — zones exclues : knee — réalisée — violations : aucune
  - lower_mobility_flow [warmup] (—) · romanian_deadlift [strength] (lower_back/hip_groin) · seated_cable_row [strength] (shoulder) · db_shoulder_press [strength] (shoulder/elbow) · lower_mobility_flow [cooldown] (—)
- **2026-10-24 running** (Passer (genou P2 connu)) — zones exclues : knee — réalisée — violations : aucune
  - row_erg [running] (lower_back)
- **2026-10-30 strength** (Oui · épaule P1) — zones exclues : shoulder — non démarrée (report) — violations : aucune

Avant comme après : **0 violation**.

## 3. Volumes par groupe (séries de travail) — planifié (bilan Strength) et exécuté (Musculation + blocs CT)

### Semaine 1

| groupe | cible / haut | planifié avant → après | exécuté avant → après |
|---|---|---|---|
| arms | 6 / 14 | 20.5 → **17.5** (achieved) | 20.5 → **17.5** |
| back | 10 / 20 | 9 → **9** (reduced_by_constraint) | 9 → **9** |
| calves | 4 / 10 | 0 → **0** (reduced_by_constraint) | 0 → **0** |
| chest | 10 / 20 | 7 → **7** (reduced_by_constraint) | 7 → **7** |
| core | 4 / 10 | 9 → **10** (achieved) | 9.5 → **10.5** |
| glutes | 6 / 14 | 6 → **12** (achieved) | 7 → **13** |
| hamstrings | 8 / 14 | 2 → **9** (achieved) | 2 → **9** |
| quads | 10 / 18 | 4 → **9** (reduced_by_constraint) | 5 → **10** |
| shoulders | 8 / 16 | 12 → **12** (achieved) | 12 → **12** |

### Semaine 2

| groupe | cible / haut | planifié avant → après | exécuté avant → après |
|---|---|---|---|
| arms | 6 / 14 | 16.5 → **16.5** (achieved) | 16.5 → **16.5** |
| back | 10 / 20 | 9 → **9** (reduced_by_constraint) | 9 → **9** |
| calves | 4 / 10 | 0 → **4** (achieved) | 0 → **4** |
| chest | 10 / 20 | 6 → **6** (reduced_by_constraint) | 6 → **6** |
| core | 4 / 10 | 9 → **7** (achieved) | 9 → **7** |
| glutes | 6 / 14 | 6 → **12** (achieved) | 7 → **13** |
| hamstrings | 8 / 14 | 4 → **11** (achieved) | 4.5 → **11.5** |
| quads | 10 / 18 | 2 → **7** (reduced_by_constraint) | 2 → **7** |
| shoulders | 8 / 16 | 13.5 → **13.5** (achieved) | 13.5 → **13.5** |

### Semaine 3

| groupe | cible / haut | planifié avant → après | exécuté avant → après |
|---|---|---|---|
| arms | 6 / 14 | 15.5 → **15.5** (achieved) | 17.5 → **17.5** |
| back | 10 / 20 | 10 → **10** (achieved) | 10 → **10** |
| calves | 4 / 10 | 0 → **4** (achieved) | 0 → **4** |
| chest | 10 / 20 | 3 → **3** (reduced_by_constraint) | 3 → **3** |
| core | 4 / 10 | 9 → **7** (achieved) | 10 → **8** |
| glutes | 6 / 14 | 6 → **12** (achieved) | 6 → **8** |
| hamstrings | 8 / 14 | 4 → **11** (achieved) | 6 → **8** |
| quads | 10 / 18 | 2 → **7** (reduced_by_constraint) | 0 → **0** |
| shoulders | 8 / 16 | 14 → **14** (achieved) | 16 → **16** |

### Semaine 4

| groupe | cible / haut | planifié avant → après | exécuté avant → après |
|---|---|---|---|
| arms | 6 / 14 | 16.5 → **16.5** (achieved) | 10.5 → **10.5** |
| back | 10 / 20 | 9 → **9** (reduced_by_constraint) | 6 → **6** |
| calves | 4 / 10 | 0 → **0** (reduced_by_constraint) | 0 → **0** |
| chest | 10 / 20 | 6 → **6** (reduced_by_constraint) | 3 → **3** |
| core | 4 / 10 | 6 → **7** (achieved) | 2.5 → **6.5** |
| glutes | 6 / 14 | 6 → **12** (achieved) | 5 → **11** |
| hamstrings | 8 / 14 | 4 → **11** (achieved) | 2 → **9** |
| quads | 10 / 18 | 2 → **7** (reduced_by_constraint) | 3 → **8** |
| shoulders | 8 / 16 | 13.5 → **13.5** (achieved) | 9 → **9** |

## 4. Durées estimées (somme hebdomadaire, min)

| semaine | prévue avant → après | exécutée avant → après |
|---|---|---|
| 1 | 240 → 251 | 240 → 251 |
| 2 | 232 → 255 | 232 → 255 |
| 3 | 227 → 256 | 227 → 236 |
| 4 | 224 → 252 | 180 → 213 |

## 5. Conflits, refus, adaptations

| indicateur | avant | après |
|---|---|---|
| séances Musculation reproductibles au démarrage | 2 / 12 | 10 / 12 |
| adaptations par régénération (reproductible) | 3 | 6 |
| adaptations de la séance persistée (CORE) | 0 | 0 |
| recompositions signalées | 1 | 0 |
| ajustement d’état non appliqué | 3 | 0 |
| séances reportées (refus) | 1 | 1 |
| signaux de récupération (J+1, non résolus) | 8 | 8 |
| arbitrage M3 (statut par semaine) | BLOCKED / BLOCKED / BLOCKED / BLOCKED | PARTIAL (1 résidu) / ADMISSIBLE / PARTIAL (1 résidu) / PARTIAL (1 résidu) |

Reports (après) :
- 2026-10-30 strength : PAIN_ESCALATED, SESSION_NOT_ADAPTABLE, BLOCKING_NEED

## 6. Récupération : séances de force exécutées à ≤ 72 h partageant des groupes (après, descriptif)

Séries de travail par groupe de chaque séance ; aucune règle appliquée (`same_discipline_recovery` NON RÉSOLU).

| séance A | séance B | écart (h) | groupes partagés (séries A / B) |
|---|---|---|---|
| 2026-10-05 Musculation | 2026-10-06 Musculation | 24 | arms 7/4.5, back 3/3, core 4.5/4.5, glutes 5/5, hamstrings 3/6, quads 5/2, shoulders 6/4.5 |
| 2026-10-05 Musculation | 2026-10-07 bloc force CT | 48 | core 4.5/0.5, glutes 5/1, quads 5/1 |
| 2026-10-06 Musculation | 2026-10-07 bloc force CT | 24 | core 4.5/0.5, glutes 5/1, quads 2/1 |
| 2026-10-06 Musculation | 2026-10-09 Musculation | 72 | arms 4.5/6, back 3/3, core 4.5/1, glutes 5/2, quads 2/2, shoulders 4.5/1.5 |
| 2026-10-07 bloc force CT | 2026-10-09 Musculation | 48 | core 0.5/1, glutes 1/2, quads 1/2 |
| 2026-10-09 Musculation | 2026-10-12 Musculation | 72 | arms 6/6, back 3/3, chest 3/3, core 1/1.5, glutes 2/5, quads 2/2, shoulders 1.5/4.5 |
| 2026-10-12 Musculation | 2026-10-13 Musculation | 24 | arms 6/4.5, back 3/3, core 1.5/1.5, glutes 5/5, hamstrings 6/3, quads 2/5, shoulders 4.5/7.5 |
| 2026-10-12 Musculation | 2026-10-14 bloc force CT | 48 | glutes 5/1, hamstrings 6/0.5 |
| 2026-10-13 Musculation | 2026-10-14 bloc force CT | 24 | glutes 5/1, hamstrings 3/0.5 |
| 2026-10-13 Musculation | 2026-10-16 Musculation | 72 | arms 4.5/6, back 3/3, core 1.5/4, glutes 5/2, hamstrings 3/2, shoulders 7.5/1.5 |
| 2026-10-14 bloc force CT | 2026-10-16 Musculation | 48 | glutes 1/2, hamstrings 0.5/2 |
| 2026-10-16 Musculation | 2026-10-19 Musculation | 72 | arms 6/5, back 3/4, core 4/4.5, glutes 2/3, hamstrings 2/3, shoulders 1.5/5 |
| 2026-10-19 Musculation | 2026-10-20 Musculation | 24 | arms 5/6, back 4/3, core 4.5/1.5, glutes 3/3, hamstrings 3/3, shoulders 5/4.5 |
| 2026-10-19 Musculation | 2026-10-21 bloc force CT | 48 | arms 5/2, core 4.5/1, shoulders 5/2 |
| 2026-10-20 Musculation | 2026-10-21 bloc force CT | 24 | arms 6/2, core 1.5/1, shoulders 4.5/2 |
| 2026-10-20 Musculation | 2026-10-23 Musculation | 72 | arms 6/4.5, back 3/3, core 1.5/1, glutes 3/2, hamstrings 3/2, shoulders 4.5/4.5 |
| 2026-10-21 bloc force CT | 2026-10-23 Musculation | 48 | arms 2/4.5, core 1/1, shoulders 2/4.5 |
| 2026-10-23 Musculation | 2026-10-26 Musculation | 72 | arms 4.5/6, back 3/3, core 1/4.5, glutes 2/5, hamstrings 2/3, shoulders 4.5/4.5 |
| 2026-10-26 Musculation | 2026-10-27 Musculation | 24 | arms 6/4.5, back 3/3, core 4.5/1.5, glutes 5/5, hamstrings 3/6, quads 5/2, shoulders 4.5/4.5 |
| 2026-10-26 Musculation | 2026-10-28 bloc force CT | 48 | core 4.5/0.5, glutes 5/1, quads 5/1 |
| 2026-10-27 Musculation | 2026-10-28 bloc force CT | 24 | core 1.5/0.5, glutes 5/1, quads 2/1 |