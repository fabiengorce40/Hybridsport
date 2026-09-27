# STRENGTH-4E-BASELINE-DIFF — goldens S1–S7 : ruleset 0.2.0 (BASE) → ruleset scientifique V1 (CANDIDAT)

> Document **généré** : chaque différence est calculée depuis les séances enregistrées, et chacune est attribuée (test « aucun changement sportif inexpliqué »). Ne pas éditer à la main.

- BASE : `0.2.0-strength-test`, goldens `packages/strength/tests/golden/__goldens__/` (inchangés).
- CANDIDAT : `0.3.0-strength-science-candidate`, goldens `packages/strength/tests/golden/__goldens_v1__/`.
- Causes admises : `evidence` = preuve (mécanisme soutenu par le registre) ; `conservative_range` = plage prudente ; `heuristic_reclassification` = reclassement d’heuristique ; `bug_fix` = correction de défaut ; `product_safety_policy` = politique produit / sécurité.
- **Aucune différence n’est attribuée à une preuve directe** : les sources soutiennent des mécanismes, jamais les valeurs exactes. Les changements de séance viennent de politiques prudentes, de reclassements d’heuristiques et de politiques produit, toutes versionnées.

## Synthèse

| Séance | p50 avant → après | p90 avant → après | Différences | Par cause |
|---|---|---|---|---|
| S1 | 40 → 39 min | 45 → 44 min | 16 | product_safety_policy 16 |
| S2 | 51 → 48 min | 59 → 57 min | 21 | conservative_range 5 · product_safety_policy 16 |
| S3 | 28 → 28 min | 31 → 31 min | 7 | conservative_range 3 · product_safety_policy 4 |
| S4 | 34 → 34 min | 38 → 38 min | 6 | conservative_range 4 · product_safety_policy 2 |
| S5 | 59 → 57 min | 67 → 66 min | 12 | conservative_range 4 · heuristic_reclassification 5 · product_safety_policy 3 |
| S6 | 23 → 24 min | 26 → 27 min | 7 | product_safety_policy 7 |
| S7 | 51 → 50 min | 59 → 58 min | 10 | conservative_range 7 · product_safety_policy 3 |

## S1 — Débutant, 3 séances / semaine, 45 min, haltères + banc, objectif général

**politique produit / sécurité** — Version du registre scientifique tracée dans chaque séance (reproductibilité, 4E §L).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 |

**politique produit / sécurité** — Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| warmup | échauffement général | 5 min | 3 min |

**politique produit / sécurité** — Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| cooldown | retour au calme | 3 min | absent |

**politique produit / sécurité** — Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| omission | i.cooldown:duration | — | omis |
| omission | i.warmup_extra:duration | — | omis |

**politique produit / sécurité** — Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels. Le temps libéré accueille le premier optionnel suivant de l’ordre existant (élévations latérales, calibration à l’effort).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| order | séance | ex.goblet_squat → ex.db_bench_press → ex.db_row → ex.bulgarian_split_squat → ex.db_calf_raise | ex.goblet_squat → ex.db_bench_press → ex.db_row → ex.bulgarian_split_squat → ex.db_lateral_raise → ex.db_calf_raise |
| exercise | fb.iso_upper.1 | absent | ex.db_lateral_raise |
| volume | shoulders | 1.5 | 4.5 |
| reasons | DOSE.LOAD.CALIBRATION | 5 | 6 |
| reasons | DOSE.MODIFIED | 5 | 6 |
| reasons | DOSE.VOLUME_ALLOCATED | 5 | 6 |
| reasons | SELECT.EXERCISE.CHOSEN | 7 | 8 |
| reasons | SELECT.FILTERED | 6 | 7 |
| reasons | SELECT.SLOT_OMITTED | 2 | 4 |

**politique produit / sécurité** — Conséquence des changements ci-dessus sur l’estimation du CORE (aucune règle de durée modifiée).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| duration | p50 | 40 min | 39 min |
| duration | p90 | 45 min | 44 min |

<details><summary>Séance avant / après (rendu lisible)</summary>

```text
# Débutant, 3 séances / semaine, 45 min, haltères + banc, objectif général
contexte : niveau beginner · objectif {"primary":{"goal":"general"}} · archétype str_full_body · stimulus strength_general · phase accumulation
temps : disponible 45 min · cible 39 min · matériel : dumbbells, bench
semaine : connue · voisines : aucune
historique : 0 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : FITS · p50 40 min · p90 45 min
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 5 min
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
    ex.db_calf_raise  (fb.iso_lower · rôle accessory · calibration) — choix : only_candidate
      2 × 12–15 · RIR 4 · repos 60 s
  [cooldown · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
exposition musculaire (séries difficiles E1, secondaire × 0.5) : arms 4.5 · back 3 · calves 2 · chest 3 · core 1.5 · glutes 5 · quads 5 · shoulders 1.5
omissions / adaptations : 
  - SELECT.SLOT_OMITTED slot=fb.iso_upper cause=duration
  - SELECT.SLOT_OMITTED slot=fb.trunk cause=duration
```

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

**politique produit / sécurité** — Version du registre scientifique tracée dans chaque séance (reproductibilité, 4E §L).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 |

**politique produit / sécurité** — Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| cooldown | retour au calme | 3 min | absent |

**politique produit / sécurité** — Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| omission | i.cooldown:duration | — | omis |

**politique produit / sécurité** — Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels. Le temps libéré sert d’abord l’emplacement optionnel « tronc » (étape 2, ordre existant), avant le 2ᵉ exercice d’isolation (étape 3) : le pec deck sort, le Pallof entre. Point de revue : l’ordre des étapes décide ici du volume pectoraux (5 → 2).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| order | séance | ex.barbell_ohp → ex.seated_cable_row → ex.bench_press → ex.lat_pulldown → ex.machine_lateral_raise → ex.pec_deck | ex.barbell_ohp → ex.seated_cable_row → ex.bench_press → ex.lat_pulldown → ex.machine_lateral_raise → ex.cable_pallof_press |
| exercise | up.iso_upper.2 | ex.pec_deck | absent |
| exercise | up.trunk.1 | absent | ex.cable_pallof_press |
| omission | up.iso_upper:duration | — | omis |
| omission | up.trunk:duration | omis | — |
| volume | chest | 5 | 2 |
| volume | core | 1.5 | 5.5 |
| volume | shoulders | 10 | 8.5 |
| reasons | DURATION.SHORTER_ACCEPTED | 0 | 1 |
| reasons | SELECT.SLOT_OMITTED | 1 | 2 |

**plage prudente** — PrescriptionConfidence ordinale (`strength.prescriptionConfidence`) : une seule séance observée ne suffit plus pour HIGH (règle « 1 exposition avec RIR = high » abandonnée ; RIR imprécis d’environ une répétition, Halperin 2022). La charge ne change pas, seule sa certitude baisse.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| confidence | ex.bench_press | high | medium |
| confidence | ex.lat_pulldown | high | medium |

**plage prudente** — Facteurs de la PrescriptionConfidence tracés (récence, observations, séances, cohérence, RIR, conflit, transfert).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DOSE.LOAD.CONFIDENCE | 0 | 2 |

**plage prudente** — PrescriptionConfidence ordinale (`strength.prescriptionConfidence`) : une seule séance observée ne suffit plus pour HIGH (règle « 1 exposition avec RIR = high » abandonnée ; RIR imprécis d’environ une répétition, Halperin 2022). La charge ne change pas, seule sa certitude baisse.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| load | up.pull_2v.1 ex.lat_pulldown | 2 × 55 kg prescrite | 2 × 55 kg suggérée |
| load | up.push_2h.1 ex.bench_press | 2 × 70 kg prescrite | 2 × 70 kg suggérée |

**politique produit / sécurité** — Conséquence des changements ci-dessus sur l’estimation du CORE (aucune règle de durée modifiée).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| duration | p50 | 51 min | 48 min |
| duration | p90 | 59 min | 57 min |
| duration | décision | FITS | SHORTER_ACCEPTED |

PrescriptionConfidence (candidat) :

- ex.bench_press : medium (exerciseId=ex.bench_press level=medium rules=pc-1.0.0 source=measured recency=fresh observations=3 sessions=1 consistency=consistent rir=reliable conflict=false transfer=false)
- ex.lat_pulldown : medium (exerciseId=ex.lat_pulldown level=medium rules=pc-1.0.0 source=measured recency=fresh observations=2 sessions=1 consistency=consistent rir=reliable conflict=false transfer=false)

<details><summary>Séance avant / après (rendu lisible)</summary>

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
      2 × 8–12 · 70 kg · RIR 2 · repos 90 s
    ex.lat_pulldown  (up.pull_2v · rôle accessory · history) — choix : role_fit
      2 × 8–12 · 55 kg · RIR 2 · repos 90 s
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
  - SELECT.SLOT_OMITTED slot=up.trunk cause=duration
```

```text
# Intermédiaire, 4 séances / semaine, 60 min, salle complète, hypertrophie (séance haut du corps)
contexte : niveau intermediate · objectif {"primary":{"goal":"hypertrophy"}} · archétype str_upper · stimulus strength_volume · phase accumulation
temps : disponible 60 min · cible 54 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball, hack_squat, leg_extension_machine, calf_machine, hip_thrust_machine, shoulder_press_machine, pec_deck, lateral_raise_machine
semaine : connue · voisines : aucune
historique : 3 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : SHORTER_ACCEPTED · p50 48 min · p90 57 min
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
    ex.cable_pallof_press  (up.trunk · rôle accessory · calibration) — choix : load_adequacy
      2 × 12–20 · RIR 3 · repos 60 s
      2 × 12–20 · RIR 1 · repos 60 s
exposition musculaire (séries difficiles E1, secondaire × 0.5) : arms 8.5 · back 5 · chest 2 · core 5.5 · shoulders 8.5
omissions / adaptations : 
  - SELECT.SLOT_OMITTED slot=up.iso_upper cause=duration
  - SELECT.SLOT_OMITTED slot=i.cooldown cause=duration
```

</details>

## S3 — Intermédiaire, 3 musculation + 3 course (10 km) : soutien course, séance clé d’intervalles 20 h après

**politique produit / sécurité** — Version du registre scientifique tracée dans chaque séance (reproductibilité, 4E §L).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 |

**plage prudente** — InterferenceAssessment : intervalles clés à 20 h, demande MODÉRÉE sur la hanche ⇒ MODERATE ⇒ effort seulement (RIR + 2 existant de la structure), sans série retirée. En 0.2.0, seule une demande HAUTE comptait.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| effort | sp.main_hip.1 ex.db_rdl | 2 × RIR 3 | 2 × RIR 5 |
| interference | RIR seulement ex.db_rdl | aucun | +2 (interference_rir:lower_hip:neighbor:running:run_intervals_vo2) |
| reasons | DOSE.MODIFIED | 0 | 1 |

**politique produit / sécurité** — Demande HAUTE sur le genou + impact locomoteur haut à 20 h d’une séance clé ⇒ VERY_HIGH : signal structuré au planificateur (recouvrement : optionnels retirés), qui reste seul à décider (frontière GlobalPlanner).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| interference | signal lower_knee | aucun | VERY_HIGH (omitted_slot) |
| reasons | PLAN.INTERFERENCE_SIGNAL | 0 | 1 |

**politique produit / sécurité** — Évaluation de chaque couple (voisine, structure) tracée : matrice transparente.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | PLAN.INTERFERENCE_ASSESSED | 0 | 2 |

InterferenceAssessment (candidat) :

- PLAN.INTERFERENCE_ASSESSED structure=lower_hip level=MODERATE action=rir_only source=neighbor:running:run_intervals_vo2 hours=20 priority=key demand=moderate
- PLAN.INTERFERENCE_ASSESSED structure=lower_knee level=VERY_HIGH action=full_and_signal source=neighbor:running:run_intervals_vo2 hours=20 priority=key demand=high
- PLAN.INTERFERENCE_SIGNAL structure=lower_knee level=VERY_HIGH source=neighbor:running:run_intervals_vo2 overlap=omitted_slot

<details><summary>Séance avant / après (rendu lisible)</summary>

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
      2 × 5 · RIR 3 · repos 150 s
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

**politique produit / sécurité** — Version du registre scientifique tracée dans chaque séance (reproductibilité, 4E §L).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 |

**plage prudente** — InterferenceAssessment : séance HYROX clé à 18 h, demande MODÉRÉE sur le genou ⇒ MODERATE ⇒ effort seulement (RIR + 2), sans retrait. En 0.2.0, seule la demande HAUTE (préhension) comptait.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| effort | sp.main_single.1 ex.walking_lunge_db | 2 × RIR 3 | 2 × RIR 5 |
| interference | RIR seulement ex.sandbag_lunge | aucun | +2 (interference_rir:lower_knee:neighbor:hybrid_race:hr_station_strength) |
| interference | RIR seulement ex.walking_lunge_db | aucun | +2 (interference_rir:lower_knee:neighbor:hybrid_race:hr_station_strength) |
| reasons | DOSE.MODIFIED | 0 | 2 |

**politique produit / sécurité** — Évaluation de chaque couple (voisine, structure) tracée : matrice transparente.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | PLAN.INTERFERENCE_ASSESSED | 0 | 2 |

InterferenceAssessment (candidat) :

- PLAN.INTERFERENCE_ASSESSED structure=grip level=HIGH action=full source=neighbor:hybrid_race:hr_station_strength hours=18 priority=key demand=high
- PLAN.INTERFERENCE_ASSESSED structure=lower_knee level=MODERATE action=rir_only source=neighbor:hybrid_race:hr_station_strength hours=18 priority=key demand=moderate

<details><summary>Séance avant / après (rendu lisible)</summary>

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
      2 × 5 · RIR 3 · repos 150 s
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

**politique produit / sécurité** — Version du registre scientifique tracée dans chaque séance (reproductibilité, 4E §L).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 |

**plage prudente** — PrescriptionConfidence ordinale (`strength.prescriptionConfidence`) : une seule séance observée ne suffit plus pour HIGH (règle « 1 exposition avec RIR = high » abandonnée ; RIR imprécis d’environ une répétition, Halperin 2022). La charge ne change pas, seule sa certitude baisse.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| confidence | ex.leg_curl | high | medium |
| confidence | ex.romanian_deadlift | high | medium |

**plage prudente** — Facteurs de la PrescriptionConfidence tracés (récence, observations, séances, cohérence, RIR, conflit, transfert).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DOSE.LOAD.CONFIDENCE | 0 | 3 |

**plage prudente** — PrescriptionConfidence ordinale (`strength.prescriptionConfidence`) : une seule séance observée ne suffit plus pour HIGH (règle « 1 exposition avec RIR = high » abandonnée ; RIR imprécis d’environ une répétition, Halperin 2022). La charge ne change pas, seule sa certitude baisse.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| load | lo.iso_lower.2 ex.leg_curl | 2 × 50 kg prescrite | 2 × 50 kg suggérée |

**reclassement d’heuristique** — Epley et `pctByRepsToFailure` reclassés en repli : l’observation récente spécifique (120 kg × 8 à RIR 2, cible 6–8 à RIR 2) fait foi (`strength.load.specificObservation`) ; même charge, certitude « suggérée » (confiance MEDIUM, une séance) ; montée spécifique conservée en relatif (`strength.rampup.estimatedPolicy`, P9).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| load | lo.sec_hip.1 ex.romanian_deadlift | 3 × 120 kg (75 % e1RM) | 3 × 120 kg suggérée |
| rampup | lo.sec_hip.1 ex.romanian_deadlift | 8 @ 47.5 kg prescrite → 5 @ 70 kg prescrite → 3 @ 95 kg prescrite | 8 @ 40 % de la charge de travail → 5 @ 60 % de la charge de travail |
| source | lo.sec_hip.1 ex.romanian_deadlift | base_profile | history |
| reasons | DOSE.LOAD.FROM_E1RM | 2 | 1 |
| reasons | DOSE.LOAD.FROM_SPECIFIC | 0 | 1 |

**politique produit / sécurité** — Conséquence des changements ci-dessus sur l’estimation du CORE (aucune règle de durée modifiée).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| duration | p50 | 59 min | 57 min |
| duration | p90 | 67 min | 66 min |

PrescriptionConfidence (candidat) :

- ex.back_squat : high (exerciseId=ex.back_squat level=high rules=pc-1.0.0 source=measured recency=fresh observations=6 sessions=2 consistency=consistent rir=reliable conflict=false transfer=false)
- ex.romanian_deadlift : medium (exerciseId=ex.romanian_deadlift level=medium rules=pc-1.0.0 source=measured recency=fresh observations=2 sessions=1 consistency=consistent rir=reliable conflict=false transfer=false)
- ex.leg_curl : medium (exerciseId=ex.leg_curl level=medium rules=pc-1.0.0 source=measured recency=fresh observations=1 sessions=1 consistency=consistent rir=reliable conflict=false transfer=false)

<details><summary>Séance avant / après (rendu lisible)</summary>

```text
# Avancé, 4 séances / semaine, 75 min, force + hypertrophie (séance bas du corps lourde)
contexte : niveau advanced · objectif {"primary":{"goal":"strength"},"secondary":{"goal":"hypertrophy"}} · archétype str_lower · stimulus strength_heavy · phase intensification
temps : disponible 75 min · cible 69 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball, hack_squat, leg_extension_machine, calf_machine, hip_thrust_machine, shoulder_press_machine, pec_deck, lateral_raise_machine
semaine : connue · voisines : aucune
historique : 4 exposition(s) · tracks : track.squat=ex.back_squat@lo.main_knee, track.rdl=ex.romanian_deadlift@lo.sec_hip · ancres déclarées : track.squat, track.rdl
résultat : ok · validation : VALID · durée : SHORTER_ACCEPTED · p50 59 min · p90 67 min
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.back_squat  (lo.main_knee · rôle primary · ancre:declared · track track.squat · track) — choix : anchor
      montée : 8 @ 55 kg → 5 @ 77.5 kg → 3 @ 97.5 kg → 1 @ 120 kg
      1 × top_set 3 · 142.5 kg (87 % e1RM) · RIR 2 · repos 195 s
      2 × backoff 3 · 127.5 kg · RIR 2 · repos 195 s
  [strength · secondary]
    ex.romanian_deadlift  (lo.sec_hip · rôle secondary · ancre:declared · track track.rdl · base_profile) — choix : anchor
      montée : 8 @ 47.5 kg → 5 @ 70 kg → 3 @ 95 kg
      3 × 6–8 · 120 kg (75 % e1RM) · RIR 2 · repos 150 s
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
      2 × 10–15 · 50 kg · RIR 1 · repos 60 s
  [cooldown · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
exposition musculaire (séries difficiles E1, secondaire × 0.5) : calves 3 · core 6 · glutes 8 · hamstrings 5 · quads 5
omissions / adaptations : aucune
```

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

**politique produit / sécurité** — Version du registre scientifique tracée dans chaque séance (reproductibilité, 4E §L).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 |

**politique produit / sécurité** — Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| omission | i.cooldown:duration | — | omis |
| omission | i.warmup_extra:duration | — | omis |

**politique produit / sécurité** — Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | SELECT.SLOT_OMITTED | 4 | 6 |

**politique produit / sécurité** — Ordre de priorité 4E §I (repos du travail principal = priorité 2) : sous contrainte de temps, le repos du principal n’est plus réduit tant que la séance tient autrement (`primaryRest: reduce_last`, principe P5).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| rest | fb.main_knee.1 ex.back_squat | 3 × 90 s | 3 × 120 s |

**politique produit / sécurité** — Conséquence des changements ci-dessus sur l’estimation du CORE (aucune règle de durée modifiée).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| duration | p50 | 23 min | 24 min |
| duration | p90 | 26 min | 27 min |

<details><summary>Séance avant / après (rendu lisible)</summary>

```text
# 30 minutes seulement, salle complète, intermédiaire, objectif général
contexte : niveau intermediate · objectif {"primary":{"goal":"general"}} · archétype str_full_body · stimulus strength_general · phase accumulation
temps : disponible 30 min · cible 24 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball, hack_squat, leg_extension_machine, calf_machine, hip_thrust_machine, shoulder_press_machine, pec_deck, lateral_raise_machine
semaine : connue · voisines : aucune
historique : 0 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : FITS · p50 23 min · p90 26 min
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
  [strength · primary]
    ex.back_squat  (fb.main_knee · rôle primary · ancre:candidate · calibration) — choix : goal_relevance
      montée : 8 @ RPE 3 → 5 @ RPE 5 → 3 @ RPE 7
      2 × 6 · RIR 3 · repos 90 s
      1 × 6 · RIR 2 · repos 90 s
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
```

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

**politique produit / sécurité** — Version du registre scientifique tracée dans chaque séance (reproductibilité, 4E §L).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DATA.SCIENCE_REGISTRY | 0 | 1 |

**plage prudente** — PrescriptionConfidence ordinale (`strength.prescriptionConfidence`) : une seule séance observée ne suffit plus pour HIGH (règle « 1 exposition avec RIR = high » abandonnée ; RIR imprécis d’environ une répétition, Halperin 2022). La charge ne change pas, seule sa certitude baisse.

| Élément | Objet | Avant | Après |
|---|---|---|---|
| confidence | ex.bench_press | high | medium |

**plage prudente** — Facteurs de la PrescriptionConfidence tracés (récence, observations, séances, cohérence, RIR, conflit, transfert).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| reasons | DOSE.LOAD.CONFIDENCE | 0 | 1 |

**plage prudente** — PrescriptionConfidence ordinale (`strength.prescriptionConfidence`) : une seule séance observée ne suffit plus pour HIGH (règle « 1 exposition avec RIR = high » abandonnée ; RIR imprécis d’environ une répétition, Halperin 2022). La charge ne change pas, seule sa certitude baisse. Aucune observation spécifique (8 répétitions observées pour une cible de 6) : l’e1RM générique reste le repli, en charge suggérée ; montée spécifique conservée en relatif (P9).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| load | up.main_push_h.1 ex.bench_press | 4 × 85 kg (80 % e1RM) | 4 × 85 kg suggérée |
| rampup | up.main_push_h.1 ex.bench_press | 8 @ 32.5 kg prescrite → 5 @ 50 kg prescrite → 3 @ 67.5 kg prescrite | 8 @ 40 % de la charge de travail → 5 @ 60 % de la charge de travail |
| source | up.main_push_h.1 ex.bench_press | base_profile | history |
| reasons | DOSE.LOAD.FROM_E1RM | 1 | 0 |
| reasons | DOSE.LOAD.FROM_HISTORY | 0 | 1 |

**politique produit / sécurité** — Conséquence des changements ci-dessus sur l’estimation du CORE (aucune règle de durée modifiée).

| Élément | Objet | Avant | Après |
|---|---|---|---|
| duration | p50 | 51 min | 50 min |
| duration | p90 | 59 min | 58 min |

PrescriptionConfidence (candidat) :

- ex.bench_press : medium (exerciseId=ex.bench_press level=medium rules=pc-1.0.0 source=measured recency=fresh observations=2 sessions=1 consistency=consistent rir=reliable conflict=false transfer=false)

<details><summary>Séance avant / après (rendu lisible)</summary>

```text
# Machines + poulies + charges libres disponibles, historique biaisé vers les charges libres (hypertrophie, haut du corps)
contexte : niveau intermediate · objectif {"primary":{"goal":"hypertrophy"}} · archétype str_upper · stimulus strength_volume · phase accumulation
temps : disponible 60 min · cible 54 min · matériel : barbell, plates, rack, bench, dumbbells, kettlebells, cable, leg_press, chest_press_machine, leg_curl_machine, row_machine, pullup_bar, bands, box, rower, assault_bike, treadmill, wall_ball, hack_squat, leg_extension_machine, calf_machine, hip_thrust_machine, shoulder_press_machine, pec_deck, lateral_raise_machine
semaine : connue · voisines : aucune
historique : 6 exposition(s) · tracks : aucune · ancres déclarées : aucune
résultat : ok · validation : VALID · durée : FITS · p50 51 min · p90 59 min
  [warmup · support]
    ex.shoulder_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.bench_press  (up.main_push_h · rôle primary · ancre:candidate · base_profile) — choix : role_fit
      montée : 8 @ 32.5 kg → 5 @ 50 kg → 3 @ 67.5 kg
      4 × 6 · 85 kg (80 % e1RM) · RIR 2 · repos 150 s
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
