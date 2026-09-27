# STRENGTH-4F-BASELINE-DIFF — goldens S1–S7 : 0.2.0 → 4E → 4F

> Document **généré** (tests/golden/science-docs.test.ts) : chaque différence est calculée depuis les séances enregistrées et classée. Ne pas éditer à la main.

- 0.2.0 : `0.2.0-strength-test` (`__goldens__/`) · 4E : `0.3.0-strength-science-candidate` (`__goldens_v1__/`, PHASE_4E_BASELINE) · 4F : `0.4.0-strength-science-lock` (`__goldens_4f__/`).
- Classes : `UNCHANGED` (identique dans les trois versions, non listé) ; `4E_CHANGE_RETAINED` (changement 4E conservé) ; `4F_CORRECTION` (changement 4F attribué à une correction) ; `UNEXPECTED` (changement 4F sans attribution : bloque le gate).
- Éléments comparés : exercices, ordre, séries, reps, charge, RIR, repos, montée, échauffement, retour au calme, durée, volume par groupe, ancres, confiance, interférence, reason codes.

## Synthèse

| Séance | 4E_CHANGE_RETAINED | 4F_CORRECTION | UNEXPECTED |
|---|---|---|---|
| S1 | 16 | 0 | 0 |
| S2 | 7 | 17 | 0 |
| S3 | 7 | 1 | 0 |
| S4 | 6 | 1 | 0 |
| S5 | 12 | 0 | 0 |
| S6 | 7 | 0 | 0 |
| S7 | 10 | 0 | 0 |
| **Total** | 65 | 19 | **0** |

## Corrections 4F attribuées

- **C2_STIMULUS** (S2) — Préservation du stimulus (`strength.session.stimulusPreservation`) : le pec deck (isolation haut du corps, priorité de stimulus supérieure) omis faute de temps remplace le Pallof (tronc, priorité inférieure) ; sans lui, les pectoraux perdaient la majorité de leur dose (3 séries du pec deck ≥ 2 séries des autres exercices) ; le tronc reste couvert (gainage secondaire). Le temps libéré permet ensuite le retour au calme (politique de durée 4E inchangée).
- **C3_INTERFERENCE** (*) — Trace de la base de preuve de chaque ajustement d’interférence : mécanisme CONTEXT_DEPENDENT, ampleur PROGRAMMING_HEURISTIC (lues dans le registre, indépendantes des bins). Aucun changement de prescription.

## S1 — Débutant, 3 séances / semaine, 45 min, haltères + banc, objectif général

**4E_CHANGE_RETAINED** (16)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| order | séance | ex.goblet_squat → ex.db_bench_press → ex.db_row → ex.bulgarian_split_squat → ex.db_calf_raise | ex.goblet_squat → ex.db_bench_press → ex.db_row → ex.bulgarian_split_squat → ex.db_lateral_raise → ex.db_calf_raise | ex.goblet_squat → ex.db_bench_press → ex.db_row → ex.bulgarian_split_squat → ex.db_lateral_raise → ex.db_calf_raise |
| exercise | fb.iso_upper.1 | absent | ex.db_lateral_raise | ex.db_lateral_raise |
| warmup | échauffement général | 5 min | 3 min | 3 min |
| cooldown | retour au calme | 3 min | absent | absent |
| duration | p50 | 40 min | 39 min | 39 min |
| duration | p90 | 45 min | 44 min | 44 min |
| omission | i.cooldown:duration | — | omis | omis |
| omission | i.warmup_extra:duration | — | omis | omis |
| volume | shoulders | 1.5 | 4.5 | 4.5 |
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 | 1 |
| reasons | DOSE.LOAD.CALIBRATION | 5 | 6 | 6 |
| reasons | DOSE.MODIFIED | 5 | 6 | 6 |
| reasons | DOSE.VOLUME_ALLOCATED | 5 | 6 | 6 |
| reasons | SELECT.EXERCISE.CHOSEN | 7 | 8 | 8 |
| reasons | SELECT.FILTERED | 6 | 7 | 7 |
| reasons | SELECT.SLOT_OMITTED | 2 | 4 | 4 |

<details><summary>Séance 4F (rendu lisible)</summary>

```text
# Débutant, 3 séances / semaine, 45 min, haltères + banc, objectif général
contexte : niveau beginner · objectif {"primary":{"goal":"general"}} · archétype str_full_body · stimulus strength_general · phase accumulation
temps : disponible 45 min · cible 39 min · matériel : dumbbells, bench
semaine : connue · voisines : aucune
historique : 0 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : FITS · p50 39 min · p90 44 min
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
  [strength · primary]
    ex.goblet_squat  (fb.main_knee · rôle primary · ancre:candidate · calibration) — choix : role_fit
      2 × 6 · RIR 4 · repos 120 s
      1 × 6 · RIR 3 · repos 120 s
  [strength · secondary]
    ex.db_bench_press  (fb.push_h · rôle secondary · ancre:candidate · calibration) — choix : goal_relevance
      2 × 8 · RIR 4 · repos 105 s
      1 × 8 · RIR 3 · repos 105 s
    ex.db_row  (fb.pull_h · rôle secondary · ancre:candidate · calibration) — choix : only_candidate
      2 × 8 · RIR 4 · repos 105 s
      1 × 8 · RIR 3 · repos 105 s
  [accessory · support]
    ex.bulgarian_split_squat  (fb.single_leg · rôle accessory · calibration) — choix : variant
      2 × 8–12 · RIR 4 · repos 75 s
    ex.db_lateral_raise  (fb.iso_upper · rôle accessory · calibration) — choix : volume_fit
      2 × 12–15 · RIR 4 · repos 60 s
      1 × 12–15 · RIR 3 · repos 60 s
    ex.db_calf_raise  (fb.iso_lower · rôle accessory · calibration) — choix : only_candidate
      2 × 12–15 · RIR 4 · repos 60 s
exposition musculaire (séries difficiles E1, secondaire × 0.5) : arms 4.5 · back 3 · calves 2 · chest 3 · core 1.5 · glutes 5 · quads 5 · shoulders 4.5
omissions / adaptations : 
  - SELECT.SLOT_OMITTED slot=fb.trunk cause=duration
  - SELECT.SLOT_OMITTED slot=fb.iso_upper cause=duration
  - SELECT.SLOT_OMITTED slot=i.warmup_extra cause=duration
  - SELECT.SLOT_OMITTED slot=i.cooldown cause=duration
```

</details>

## S2 — Intermédiaire, 4 séances / semaine, 60 min, salle complète, hypertrophie (séance haut du corps)

**4F_CORRECTION** (17)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| order | séance | ex.barbell_ohp → ex.seated_cable_row → ex.bench_press → ex.lat_pulldown → ex.machine_lateral_raise → ex.pec_deck | ex.barbell_ohp → ex.seated_cable_row → ex.bench_press → ex.lat_pulldown → ex.machine_lateral_raise → ex.cable_pallof_press | ex.barbell_ohp → ex.seated_cable_row → ex.bench_press → ex.lat_pulldown → ex.machine_lateral_raise → ex.pec_deck |
| exercise | up.iso_upper.2 | ex.pec_deck | absent | ex.pec_deck |
| exercise | up.trunk.1 | absent | ex.cable_pallof_press | absent |
| cooldown | retour au calme | 3 min | absent | 3 min |
| duration | p50 | 51 min | 48 min | 51 min |
| duration | p90 | 59 min | 57 min | 59 min |
| duration | décision | FITS | SHORTER_ACCEPTED | FITS |
| omission | i.cooldown:duration | — | omis | — |
| omission | up.iso_upper:duration | — | omis | — |
| omission | up.trunk:stimulus_preservation | — | — | omis |
| volume | chest | 5 | 2 | 5 |
| volume | core | 1.5 | 5.5 | 1.5 |
| volume | shoulders | 10 | 8.5 | 10 |
| reasons | DURATION.SHORTER_ACCEPTED | 0 | 1 | 0 |
| reasons | SELECT.EXERCISE.CHOSEN | 7 | 7 | 8 |
| reasons | SELECT.SLOT_OMITTED | 1 | 2 | 1 |
| reasons | SELECT.STIMULUS_PRESERVED | 0 | 0 | 1 |

**4E_CHANGE_RETAINED** (7)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| load | up.pull_2v.1 ex.lat_pulldown | 2 × 55 kg prescrite | 2 × 55 kg suggérée | 2 × 55 kg suggérée |
| load | up.push_2h.1 ex.bench_press | 2 × 70 kg prescrite | 2 × 70 kg suggérée | 2 × 70 kg suggérée |
| omission | up.trunk:duration | omis | — | — |
| confidence | ex.bench_press | high | medium | medium |
| confidence | ex.lat_pulldown | high | medium | medium |
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 | 1 |
| reasons | DOSE.LOAD.CONFIDENCE | 0 | 2 | 2 |

<details><summary>Séance 4F (rendu lisible)</summary>

```text
# Intermédiaire, 4 séances / semaine, 60 min, salle complète, hypertrophie (séance haut du corps)
contexte : niveau intermediate · objectif {"primary":{"goal":"hypertrophy"}} · archétype str_upper · stimulus strength_volume · phase accumulation
temps : disponible 60 min · cible 54 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball, hack_squat, leg_extension_machine, calf_machine, hip_thrust_machine, shoulder_press_machine, pec_deck, lateral_raise_machine
semaine : connue · voisines : aucune
historique : 3 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : FITS · p50 51 min · p90 59 min
  [warmup · support]
    ex.shoulder_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.barbell_ohp  (up.main_push_v · rôle primary · ancre:candidate · calibration) — choix : role_fit
      montée : 8 @ RPE 3 → 5 @ RPE 5 → 3 @ RPE 7
      2 × 6 · RIR 3 · repos 150 s
      1 × 6 · RIR 2 · repos 150 s
  [strength · secondary]
    ex.seated_cable_row  (up.pull_h · rôle secondary · ancre:candidate · calibration) — choix : seed_tiebreak
      2 × 8–12 · RIR 3 · repos 105 s
      1 × 8–12 · RIR 2 · repos 105 s
  [accessory · support]
    ex.bench_press  (up.push_2h · rôle accessory · history) — choix : variant
      2 × 8–12 · 70 kg (suggérée) · RIR 2 · repos 90 s
    ex.lat_pulldown  (up.pull_2v · rôle accessory · history) — choix : role_fit
      2 × 8–12 · 55 kg (suggérée) · RIR 2 · repos 90 s
    ex.machine_lateral_raise  (up.iso_upper · rôle accessory · calibration) — choix : seed_tiebreak
      2 × 12–20 · RIR 3 · repos 60 s
      1 × 12–20 · RIR 1 · repos 60 s
    ex.pec_deck  (up.iso_upper · rôle accessory · calibration) — choix : volume_fit
      2 × 12–20 · RIR 3 · repos 60 s
      1 × 12–20 · RIR 1 · repos 60 s
  [cooldown · support]
    ex.shoulder_mobility_flow  (mobility) — mobilité 3 min
exposition musculaire (séries difficiles E1, secondaire × 0.5) : arms 8.5 · back 5 · chest 5 · core 1.5 · shoulders 10
omissions / adaptations : 
  - SELECT.SLOT_OMITTED slot=up.trunk cause=stimulus_preservation
```

</details>

## S3 — Intermédiaire, 3 musculation + 3 course (10 km) : soutien course, séance clé d’intervalles 20 h après

**4F_CORRECTION** (1)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| reasons | PLAN.INTERFERENCE_BASIS | 0 | 0 | 2 |

**4E_CHANGE_RETAINED** (7)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| effort | sp.main_hip.1 ex.db_rdl | 2 × RIR 3 | 2 × RIR 5 | 2 × RIR 5 |
| interference | RIR seulement ex.db_rdl | aucun | +2 (interference_rir:lower_hip:neighbor:running:run_intervals_vo2) | +2 (interference_rir:lower_hip:neighbor:running:run_intervals_vo2) |
| interference | signal lower_knee | aucun | VERY_HIGH (omitted_slot) | VERY_HIGH (omitted_slot) |
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 | 1 |
| reasons | DOSE.MODIFIED | 0 | 1 | 1 |
| reasons | PLAN.INTERFERENCE_ASSESSED | 0 | 2 | 2 |
| reasons | PLAN.INTERFERENCE_SIGNAL | 0 | 1 | 1 |

<details><summary>Séance 4F (rendu lisible)</summary>

```text
# Intermédiaire, 3 musculation + 3 course (10 km) : soutien course, séance clé d’intervalles 20 h après
contexte : niveau intermediate · objectif {"primary":{"goal":"support","supportFor":"running"}} · archétype str_support · stimulus strength_support · phase accumulation
temps : disponible 45 min · cible 39 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball
semaine : connue · voisines : running/run_intervals_vo2 key à 20 h {"lower_knee":"high","lower_hip":"moderate","locomotor_impact":"high"}
historique : 0 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : SHORTER_ACCEPTED · p50 28 min · p90 31 min
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.db_rdl  (sp.main_hip · rôle primary · ancre:candidate · calibration) — choix : role_fit
      2 × 5 · RIR 5 · repos 150 s
  [strength · secondary]
    ex.seated_cable_row  (sp.row · rôle secondary · ancre:candidate · calibration) — choix : seed_tiebreak
      2 × 6–10 · RIR 3 · repos 105 s
      1 × 6–10 · RIR 2 · repos 105 s
  [accessory · support]
    ex.cable_pallof_press  (sp.trunk · rôle accessory · calibration) — choix : load_adequacy
      2 × 10–15 · RIR 3 · repos 60 s
    ex.farmers_carry  (sp.carry) — 2 × 30 m · repos 60 s
  [cooldown · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
exposition musculaire (séries difficiles E1, secondaire × 0.5) : arms 1.5 · back 5 · core 4 · glutes 3 · hamstrings 2 · shoulders 1.5
omissions / adaptations : 
  - PLAN.STRUCTURE_LOWERED structure=lower_knee cause=neighbor:running:run_intervals_vo2
  - SELECT.SLOT_OMITTED slot=sp.single_leg cause=interference
  - SELECT.SLOT_OMITTED slot=sp.iso_lower cause=interference
```

</details>

## S4 — Intermédiaire, 2 musculation + HYROX : soutien HYROX, séance sled/farmers (grip élevé) 18 h après

**4F_CORRECTION** (1)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| reasons | PLAN.INTERFERENCE_BASIS | 0 | 0 | 2 |

**4E_CHANGE_RETAINED** (6)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| effort | sp.main_single.1 ex.walking_lunge_db | 2 × RIR 3 | 2 × RIR 5 | 2 × RIR 5 |
| interference | RIR seulement ex.sandbag_lunge | aucun | +2 (interference_rir:lower_knee:neighbor:hybrid_race:hr_station_strength) | +2 (interference_rir:lower_knee:neighbor:hybrid_race:hr_station_strength) |
| interference | RIR seulement ex.walking_lunge_db | aucun | +2 (interference_rir:lower_knee:neighbor:hybrid_race:hr_station_strength) | +2 (interference_rir:lower_knee:neighbor:hybrid_race:hr_station_strength) |
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 | 1 |
| reasons | DOSE.MODIFIED | 0 | 2 | 2 |
| reasons | PLAN.INTERFERENCE_ASSESSED | 0 | 2 | 2 |

<details><summary>Séance 4F (rendu lisible)</summary>

```text
# Intermédiaire, 2 musculation + HYROX : soutien HYROX, séance sled/farmers (grip élevé) 18 h après
contexte : niveau intermediate · objectif {"primary":{"goal":"support","supportFor":"hybrid_race"}} · archétype str_support · stimulus strength_support · phase accumulation
temps : disponible 50 min · cible 44 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball, hack_squat, leg_extension_machine, calf_machine, hip_thrust_machine, shoulder_press_machine, pec_deck, lateral_raise_machine
semaine : connue · voisines : hybrid_race/hr_station_strength key à 18 h {"grip":"high","lower_knee":"moderate"}
historique : 0 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : SHORTER_ACCEPTED · p50 34 min · p90 38 min
  [warmup · support]
    ex.hip_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.walking_lunge_db  (sp.main_single · rôle primary · ancre:candidate · calibration) — choix : seed_tiebreak
      2 × 5 · RIR 5 · repos 150 s
  [strength · secondary]
    ex.db_row  (sp.row · rôle secondary · ancre:candidate · calibration) — choix : fatigue_fit
      2 × 6–10 · RIR 3 · repos 105 s
      1 × 6–10 · RIR 2 · repos 105 s
  [accessory · support]
    ex.db_calf_raise  (sp.iso_lower · rôle accessory · calibration) — choix : seed_tiebreak
      2 × 10–15 · RIR 3 · repos 60 s
    ex.cable_pallof_press  (sp.trunk · rôle accessory · calibration) — choix : load_adequacy
      2 × 10–15 · RIR 3 · repos 60 s
    ex.sandbag_lunge  (sp.single_leg) — 2 × 30 m · repos 60 s
  [cooldown · support]
    ex.hip_mobility_flow  (mobility) — mobilité 3 min
exposition musculaire (séries difficiles E1, secondaire × 0.5) : arms 1.5 · back 3 · calves 2 · core 3 · glutes 4 · quads 4
omissions / adaptations : 
  - PLAN.STRUCTURE_LOWERED structure=grip cause=neighbor:hybrid_race:hr_station_strength
  - SELECT.SLOT_OMITTED slot=sp.carry cause=interference
```

</details>

## S5 — Avancé, 4 séances / semaine, 75 min, force + hypertrophie (séance bas du corps lourde)

**4E_CHANGE_RETAINED** (12)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| load | lo.iso_lower.2 ex.leg_curl | 2 × 50 kg prescrite | 2 × 50 kg suggérée | 2 × 50 kg suggérée |
| load | lo.sec_hip.1 ex.romanian_deadlift | 3 × 120 kg (75 % e1RM) | 3 × 120 kg suggérée | 3 × 120 kg suggérée |
| rampup | lo.sec_hip.1 ex.romanian_deadlift | 8 @ 47.5 kg prescrite → 5 @ 70 kg prescrite → 3 @ 95 kg prescrite | 8 @ 40 % de la charge de travail → 5 @ 60 % de la charge de travail | 8 @ 40 % de la charge de travail → 5 @ 60 % de la charge de travail |
| source | lo.sec_hip.1 ex.romanian_deadlift | base_profile | history | history |
| duration | p50 | 59 min | 57 min | 57 min |
| duration | p90 | 67 min | 66 min | 66 min |
| confidence | ex.leg_curl | high | medium | medium |
| confidence | ex.romanian_deadlift | high | medium | medium |
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 | 1 |
| reasons | DOSE.LOAD.CONFIDENCE | 0 | 3 | 3 |
| reasons | DOSE.LOAD.FROM_E1RM | 2 | 1 | 1 |
| reasons | DOSE.LOAD.FROM_SPECIFIC | 0 | 1 | 1 |

<details><summary>Séance 4F (rendu lisible)</summary>

```text
# Avancé, 4 séances / semaine, 75 min, force + hypertrophie (séance bas du corps lourde)
contexte : niveau advanced · objectif {"primary":{"goal":"strength"},"secondary":{"goal":"hypertrophy"}} · archétype str_lower · stimulus strength_heavy · phase intensification
temps : disponible 75 min · cible 69 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball, hack_squat, leg_extension_machine, calf_machine, hip_thrust_machine, shoulder_press_machine, pec_deck, lateral_raise_machine
semaine : connue · voisines : aucune
historique : 4 exposition(s) · tracks : track.squat=ex.back_squat@lo.main_knee, track.rdl=ex.romanian_deadlift@lo.sec_hip · ancres déclarées : track.squat, track.rdl
résultat : ok · validation : VALID · durée : SHORTER_ACCEPTED · p50 57 min · p90 66 min
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.back_squat  (lo.main_knee · rôle primary · ancre:declared · track track.squat · track) — choix : anchor
      montée : 8 @ 55 kg → 5 @ 77.5 kg → 3 @ 97.5 kg → 1 @ 120 kg
      1 × top_set 3 · 142.5 kg (87 % e1RM) · RIR 2 · repos 195 s
      2 × backoff 3 · 127.5 kg · RIR 2 · repos 195 s
  [strength · secondary]
    ex.romanian_deadlift  (lo.sec_hip · rôle secondary · ancre:declared · track track.rdl · history) — choix : anchor
      montée : 8 @ 40 % de la charge de travail → 5 @ 60 % de la charge de travail
      3 × 6–8 · 120 kg (suggérée) · RIR 2 · repos 150 s
  [accessory · support]
    ex.bulgarian_split_squat  (lo.single_leg · rôle accessory · calibration) — choix : goal_relevance
      2 × 6–10 · RIR 3 · repos 105 s
    ex.machine_calf_raise  (lo.iso_lower · rôle accessory · calibration) — choix : volume_fit
      2 × 10–15 · RIR 3 · repos 60 s
      1 × 10–15 · RIR 1 · repos 60 s
    ex.cable_pallof_press  (lo.trunk · rôle accessory · calibration) — choix : load_adequacy
      2 × 10–15 · RIR 3 · repos 60 s
      1 × 10–15 · RIR 1 · repos 60 s
    ex.leg_curl  (lo.iso_lower · rôle accessory · history) — choix : goal_relevance
      2 × 10–15 · 50 kg (suggérée) · RIR 1 · repos 60 s
  [cooldown · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
exposition musculaire (séries difficiles E1, secondaire × 0.5) : calves 3 · core 6 · glutes 8 · hamstrings 5 · quads 5
omissions / adaptations : aucune
```

</details>

## S6 — 30 minutes seulement, salle complète, intermédiaire, objectif général

**4E_CHANGE_RETAINED** (7)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| rest | fb.main_knee.1 ex.back_squat | 3 × 90 s | 3 × 120 s | 3 × 120 s |
| duration | p50 | 23 min | 24 min | 24 min |
| duration | p90 | 26 min | 27 min | 27 min |
| omission | i.cooldown:duration | — | omis | omis |
| omission | i.warmup_extra:duration | — | omis | omis |
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 | 1 |
| reasons | SELECT.SLOT_OMITTED | 4 | 6 | 6 |

<details><summary>Séance 4F (rendu lisible)</summary>

```text
# 30 minutes seulement, salle complète, intermédiaire, objectif général
contexte : niveau intermediate · objectif {"primary":{"goal":"general"}} · archétype str_full_body · stimulus strength_general · phase accumulation
temps : disponible 30 min · cible 24 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball, hack_squat, leg_extension_machine, calf_machine, hip_thrust_machine, shoulder_press_machine, pec_deck, lateral_raise_machine
semaine : connue · voisines : aucune
historique : 0 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : FITS · p50 24 min · p90 27 min
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
  [strength · primary]
    ex.back_squat  (fb.main_knee · rôle primary · ancre:candidate · calibration) — choix : goal_relevance
      montée : 8 @ RPE 3 → 5 @ RPE 5 → 3 @ RPE 7
      2 × 6 · RIR 3 · repos 120 s
      1 × 6 · RIR 2 · repos 120 s
  [strength · secondary]
    ex.machine_chest_press  (fb.push_h · rôle secondary · ancre:candidate · calibration) — choix : logistics
      2 × 8–12 · RIR 3 · repos 90 s
    ex.seated_cable_row  (fb.pull_h · rôle secondary · ancre:candidate · calibration) — choix : seed_tiebreak
      2 × 8–12 · RIR 3 · repos 90 s
exposition musculaire (séries difficiles E1, secondaire × 0.5) : arms 3 · back 2 · chest 2 · core 1.5 · glutes 3 · quads 3 · shoulders 2
omissions / adaptations : 
  - SELECT.SLOT_OMITTED slot=fb.single_leg cause=duration
  - SELECT.SLOT_OMITTED slot=fb.iso_upper cause=duration
  - SELECT.SLOT_OMITTED slot=fb.iso_lower cause=duration
  - SELECT.SLOT_OMITTED slot=fb.trunk cause=duration
  - SELECT.SLOT_OMITTED slot=i.warmup_extra cause=duration
  - SELECT.SLOT_OMITTED slot=i.cooldown cause=duration
```

</details>

## S7 — Machines + poulies + charges libres disponibles, historique biaisé vers les charges libres (hypertrophie, haut du corps)

**4E_CHANGE_RETAINED** (10)

| Élément | Objet | 0.2.0 | 4E | 4F |
|---|---|---|---|---|
| load | up.main_push_h.1 ex.bench_press | 4 × 85 kg (80 % e1RM) | 4 × 85 kg suggérée | 4 × 85 kg suggérée |
| rampup | up.main_push_h.1 ex.bench_press | 8 @ 32.5 kg prescrite → 5 @ 50 kg prescrite → 3 @ 67.5 kg prescrite | 8 @ 40 % de la charge de travail → 5 @ 60 % de la charge de travail | 8 @ 40 % de la charge de travail → 5 @ 60 % de la charge de travail |
| source | up.main_push_h.1 ex.bench_press | base_profile | history | history |
| duration | p50 | 51 min | 50 min | 50 min |
| duration | p90 | 59 min | 58 min | 58 min |
| confidence | ex.bench_press | high | medium | medium |
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 | 1 |
| reasons | DOSE.LOAD.CONFIDENCE | 0 | 1 | 1 |
| reasons | DOSE.LOAD.FROM_E1RM | 1 | 0 | 0 |
| reasons | DOSE.LOAD.FROM_HISTORY | 0 | 1 | 1 |

<details><summary>Séance 4F (rendu lisible)</summary>

```text
# Machines + poulies + charges libres disponibles, historique biaisé vers les charges libres (hypertrophie, haut du corps)
contexte : niveau intermediate · objectif {"primary":{"goal":"hypertrophy"}} · archétype str_upper · stimulus strength_volume · phase accumulation
temps : disponible 60 min · cible 54 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball, hack_squat, leg_extension_machine, calf_machine, hip_thrust_machine, shoulder_press_machine, pec_deck, lateral_raise_machine
semaine : connue · voisines : aucune
historique : 6 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : FITS · p50 50 min · p90 58 min
  [warmup · support]
    ex.shoulder_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.bench_press  (up.main_push_h · rôle primary · ancre:candidate · history) — choix : role_fit
      montée : 8 @ 40 % de la charge de travail → 5 @ 60 % de la charge de travail
      4 × 6 · 85 kg (suggérée) · RIR 2 · repos 150 s
  [strength · secondary]
    ex.pull_up  (up.pull_v · rôle secondary · ancre:candidate · calibration) — choix : logistics
      2 × 8–12 · poids du corps · RIR 3 · repos 105 s
      1 × 8–12 · poids du corps · RIR 2 · repos 105 s
  [accessory · support]
    ex.machine_row  (up.pull_2h · rôle accessory · calibration) — choix : variant
      2 × 8–12 · RIR 3 · repos 90 s
      1 × 8–12 · RIR 2 · repos 90 s
    ex.machine_shoulder_press  (up.push_2v · rôle accessory · calibration) — choix : role_fit
      2 × 8–12 · RIR 3 · repos 90 s
    ex.pec_deck  (up.iso_upper · rôle accessory · calibration) — choix : seed_tiebreak
      2 × 12–20 · RIR 3 · repos 60 s
      2 × 12–20 · RIR 1 · repos 60 s
  [cooldown · support]
    ex.shoulder_mobility_flow  (mobility) — mobilité 3 min
exposition musculaire (séries difficiles E1, secondaire × 0.5) : arms 10.5 · back 6 · chest 8 · shoulders 6
omissions / adaptations : 
  - SELECT.SLOT_OMITTED slot=up.trunk cause=duration
  - SELECT.SLOT_OMITTED slot=up.iso_upper cause=duration
```

</details>
