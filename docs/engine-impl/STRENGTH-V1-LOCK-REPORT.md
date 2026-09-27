# Phase 4C — STRENGTH V1 LOCK : rapport de validation finale

> Le gate signifie « **moteur techniquement verrouillable** », et non « programmation scientifiquement validée pour la production ». Toutes les valeurs sportives restent des **paramètres provisoires de test**.

## 1. Changements

| Domaine | Changement |
|---|---|
| CORE | **CORE-EXT-4** : hook optionnel `SportEngine.validateIntent`, exécuté par le CORE après `parseContext` et avant `propose`. Toute violation ⇒ `INVALID_INPUT` déterministe (étape `intent_contract`). C'est la seule modification du CORE ; elle est justifiée par une impossibilité réelle : aucun composant ne voyait à la fois l'intention et le contexte validé. |
| Contrat planificateur | `intent-contract.ts` : une seule ancre déclarée par groupe de choix (ou par emplacement) et par séance ; ancre inconnue, inactive, d'un autre archétype ou non-ancre refusée ; défense en profondeur dans `proposeStrength`. |
| Trois autorités | Plage de reps de la track honorée (bug S5, voir §4) ; tests dédiés ; test d'architecture « le dosage ne relit jamais séries ni RIR de la track ». |
| Traçabilité des charges | `DOSE.LOAD.FROM_E1RM{e1rmKg, reference, unroundedKg, stepKg}` ; `DOSE.TOP_SET{topKg, backoffFraction, backoffUnroundedKg, backoffKg, backoffSets}` ; source `track` quand l'e1RM lissé de la track est utilisé. |
| Catalogue | `catalog-review.ts` : 8 contrôles configurables, acquittements de relecture, constats bloquants = erreurs non acquittées. |
| Documentation normative | Spec strength **doc 10 (addendum V1.2)**, prioritaire. Passages amendés annotés dans les docs 01, 03, 05, 06, 07, 08, 09 ; README (ordre de précédence) ; frontière SportEngine/CORE (CORE-EXT-4). |
| Rendu des goldens | Contexte, rôle, track, exposition musculaire, p50/p90, omissions et adaptations. |
| Documents | `STRENGTH-V1-PARAMETERS.md` (inventaire), `STRENGTH-EVIDENCE-REVIEW-PACK.md`, ce rapport. |
| Mutation | `stryker.strength.config.json` et `vitest.mutation.strength.config.ts` (runner `command` validé en phase 3.5). |

## 2. Décisions

1. **Les 7 écarts sont validés et formalisés** (doc 10 §1–§7) : règle, justification, tests de régression, règles antérieures remplacées. Aucune règle contradictoire ne reste active (doc 10 §11, contrôles automatiques).
2. **Trois autorités** :
   - TRACK → charge, répétitions, état de progression ;
   - VOLUME → séries ;
   - STIMULUS + MODIFICATEURS → RIR et repos.
   Aucune ne rejoue la décision d'une autre.
3. **Contrat planificateur au niveau du CORE** (hook générique) et de la Musculation (règles d'ancres). Le refus est une **entrée invalide** (défaut du planificateur), pas une issue métier.
4. **Préréglage : décision B.** L'équipement réel est l'autorité ; aucun identifiant de préréglage n'entre dans la génération. La faisabilité est calculée (NO_CANDIDATE_FOR_SLOT, F10). Aucune décision de programmation ne nécessite le nom du préréglage (doc 10 §9).
5. **Revue du catalogue** : un audit configurable, jamais une vérité biomécanique codée. Les constats `review` et `warning` demandent une relecture ; seules les erreurs non acquittées bloquent.

## 3. Tests

| Suite | Tests | Nouveau en 4C |
|---|---|---|
| CORE | 370 (dont 367 anciens, tous verts) | `sport-engine-boundary` : 3 tests CORE-EXT-4 |
| `strength/architecture` | 15 | Aucune relecture de séries ou RIR de la track ; génération sans préréglage ; paramètre absent ⇒ refus |
| `strength/unit` | 85 | `authorities` (4), `catalog-review` (3), `mutation-hardening` (19) |
| `strength/integration` | 22 | Contrat planificateur (4), préréglage (2) |
| `strength/golden` | 22 | Sensibilité de la stabilité (7 catalogues) |
| `strength/property` et `longitudinal` | 11 | — |
| **Total** | **525 tests, 49 fichiers, verts** | Typecheck, lint et architecture verts |

## 4. Bogues découverts

1. **La plage de reps de la track était ignorée** sans prescription suivante : le RDL de S5 affichait 5–8 (profil) au lieu de 6–8 (track). Corrigé, testé (autorité TRACK).
2. **Traçabilité** : la source de la charge du squat de S5 était `base_profile` alors que l'e1RM venait de la track. Corrigé (`track`, e1RM de référence, valeur avant arrondi, pas).
3. **Deux ancres incompatibles pouvaient atteindre le moteur**, qui en ignorait une silencieusement. Corrigé par le contrat CORE-EXT-4.
4. **Contradictions de spécification** encore actives dans le texte : `nextPrescription` appliquée telle quelle, `ARCHETYPE_NOT_APPLICABLE{preset}`, modèle choisi seulement par `modelFor`. Amendées (doc 10) et contrôlées par des tests d'architecture.
5. **Écart spec/implémentation non déclaré** : la passe d'amélioration locale (doc 03 §7.2) n'est pas implémentée. Documenté (doc 10 §10).
6. **Couverture de test trompeuse** : la 1re passe de mutation montrait que 38 % seulement des mutants de la sélection étaient tués par les tests rapides. Les goldens seuls protégeaient les critères. Durci (86 %).
7. **Catalogue** : 11 muscles primaires suspects, 35 familles de progression absentes (constats de la revue, données de test).
8. **Schéma** : les séries n'indiquent pas « par côté » pour l'unilatéral (S4). En dette.

## 5. Séances S1–S7 (versions finales, pour validation humaine)

Chaque fiche donne :

- contexte, objectif, durée disponible et cible, matériel, voisines, historique, tracks et ancres ;
- pour chaque exercice : emplacement, rôle, ancre ou track, source de prescription et critère décisif de sélection ; montée en charge ; séries × reps · charge / % / RIR / RPE · repos ;
- exposition musculaire (E1), p50/p90, omissions et adaptations avec leur cause.

**Aucune séance n'a été modifiée automatiquement pour cette revue.**

### S1

```
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

Revue : calibration à l'effort, aucune charge inventée ; RIR 3–4 prudent pour un débutant ; p90 = 45 min (exactement le temps disponible) ; isolation haut et gainage omis pour la durée.

### S2

```
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

Revue : équilibre poussée / tirage ; pec deck choisi par `volume_fit` (pectoraux sous le plancher) ; charges reprises de l'historique ; gainage omis pour la durée.

### S3

```
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

Revue : séance clé d'intervalles 20 h après ⇒ genou abaissé, unilatéral et isolation jambes omis (tracé) ; séance courte (28 min) acceptée.

### S4

```
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

Revue : grip abaissé ⇒ porté omis. **À valider** : « 2 × 5 » de fente marchée sans mention « par jambe » (dette de schéma).

### S5

```
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

Audit détaillé au §6.

### S6

```
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

Revue : 30 min ⇒ noyau complet (squat, poussée, tirage), tous les optionnels omis pour la durée (tracé).

### S7

```
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

Revue : principal développé couché à 80 % de l'e1RM mesuré ; accessoires machines par stabilité (voir §7) ; variante retenue par le CORE sur le rowing.

## 6. Audit S5 — force avancé, séance bas du corps lourde

**Entrées**

- Avancé, objectif force (hypertrophie en secondaire), archétype `str_lower`, stimulus `strength_heavy`.
- Phase : intensification, semaine 2 sur 4.
- Durée : 75 min disponibles, cible 69 min.
- Ancres déclarées : `track.squat` (squat sur `lo.main_knee`, autorégulé, e1RM lissé 165 kg) et `track.rdl` (RDL sur `lo.sec_hip`, double progression, plage 6–8).
- Historique :
  - squat 140 × 5 (RIR 2/2/1) puis 142,5 × 5/5/4 (RIR 2/1/0) ;
  - RDL 120 × 8 × 2 (RIR 2) ;
  - leg curl 50 × 12/11 (RIR 1).
- Réalisé sur 7 jours : quadriceps 6, ischios 4, fessiers 5.

**Pourquoi chaque exercice, et pourquoi sa prescription**

| Exercice | Pourquoi il est là (trace) | Prescription et origine |
|---|---|---|
| **Squat** (principal) | Emplacement requis `lo.main_knee`. Dans le groupe de choix « main » (genou OU hanche), le membre qui porte l'ancre déclarée est prioritaire. Critère décisif : `anchor`. L'air squat est éliminé par F10 (principal lourd non chargeable, visible dans la trace). | Profil `heavy/primary/compound_high_load` : reps 3–6 → 3 (`repChoice` low) ; RIR 2 (modificateurs de niveau avancé et d'intensification nuls) ; séries 3–5 → 3 (allocation quadriceps/fessiers). Série lourde + séries allégées car `topSet` = stimulus lourd × avancé × squat éligible à l'effort maximal. Repos 150–240 → 195 s (milieu, arrondi à 15 s). |
| **RDL** (secondaire) | Emplacement requis du groupe « secondary » (hanche OU genou). L'ancre déclarée est sur `lo.sec_hip`, ce qui complète un principal genou. Critère : `anchor`. | Profil `heavy/secondary/compound_high_load` : RIR 2, repos 120–180 → 150 s, 3 séries (allocation ischios/fessiers). **Reps 6–8 = plage de la track** (corrigé en 4C : la séance affichait 5–8, la plage du profil). |
| **Fente bulgare** (accessoire) | Premier optionnel de l'ordre du stimulus lourd (`single_leg`). `load_adequacy` écarte la fente au poids du corps (plafond 0 < 1 pour un avancé) ; `goal_relevance` 3 contre 2 départage face à la fente marchée haltères. Rôle : force et hypertrophie unilatérales, complément du bilatéral. | Profil `heavy/accessory/compound_high_load` : 6–10 reps, 2 séries (quadriceps et fessiers déjà servis). **Première exposition** : 2 séries de calibration à RIR 3, à l'effort, sans aucune charge inventée. |
| **Mollets machine** (accessoire) | Emplacement `lo.iso_lower` (au plus 2). Choisi par `volume_fit` : mollets sous le plancher hebdomadaire (0 fait sur 7 jours). | Profil isolation : 10–15 reps, RIR 1 ; 3 séries (allocation mollets) dont les 2 premières en calibration à RIR 3. Repos 60 s. |
| **Pallof** (accessoire) | Emplacement `lo.trunk` (anti-rotation). `load_adequacy` : poulie chargeable (plafond 1) plutôt que gainage ou dead bug (0) pour un avancé. | Profil isolation : 10–15 reps ; 3 séries (allocation tronc), calibration. |
| **Leg curl** (accessoire) | 2ᵉ exercice de `lo.iso_lower`. `goal_relevance` 3 contre 2 pour le leg extension. Rôle : ischios en flexion du genou, complément du RDL (extension de hanche). | Charge = dernière charge réelle **50 kg** (historique, accessoire : jamais de % d'e1RM) ; RIR 1 (profil isolation) ; 2 séries (ischios en partie servis par le RDL). |

Exposition de la séance (E1) : fessiers 8, quadriceps 5, ischios 5, tronc 6, mollets 3.

Durée : p50 59 min, p90 67 min pour 75 disponibles ; séance plus courte acceptée. Aucune omission.

**Traçabilité des charges (trace de S5, sans constante cachée)**

| Valeur | Calcul | Source |
|---|---|---|
| e1RM de référence | 165 kg | e1RM **lissé de la track** (`reference: track_smoothed`, confiance high par les séries mesurées avec RIR) |
| Fraction | reps 3 + RIR 2 = 5 reps jusqu'à l'échec → 0,87 | `strength.load.pctByRepsToFailure["5"]` |
| Série lourde | 165 × 0,87 = **143,55** → arrondi **inférieur** au pas de 2,5 kg → **142,5 kg** | `unroundedKg: 143.55`, `stepKg: 2.5` ; pas `strength.load.defaultIncrements.barbell` ; `roundDownToStep`, règle d'arrondi unique du moteur (toujours vers le bas, prudent) |
| Séries allégées | 142,5 × 0,9 = **128,25** → arrondi inférieur → **127,5 kg** × 2 séries | `backoffFraction: 0.9`, `backoffSets: 2` (= min(3 prévues, 3 séries − 1)) ; `strength.topSet` |
| Montée | bande ≥ 0,85 (intensité 0,87) : 0,40 / 0,55 / 0,70 / 0,85 × 142,5 = 57 / 78,4 / 99,8 / 121,1 → 55 / 77,5 / 97,5 / 120 kg × 8 / 5 / 3 / 1 | `strength.rampup.known[2]`, même arrondi |
| RDL | e1RM **mesuré** 120 × (1 + (8 + 2) / 30) = 160 ; reps max 8 + RIR 2 = 10 → 0,75 ; 160 × 0,75 = **120 kg** | `reference: measured` |

Contrôles :

- STR-V3 : 0,87 ≤ table[3 + 2] = 0,87 ✓.
- STR-V7 : série lourde sur un exercice éligible pour un avancé ✓.
- Cohérence avec l'historique : 142,5 × 3 à RIR 2 est plus prudent que le dernier 142,5 × 5 ; cohérent avec l'intensification (reps en baisse, charge maintenue). L'e1RM brut récent (171 kg) n'est pas utilisé : la track lissée fait foi.
- Aucune valeur numérique n'est écrite dans le code : scanner de littéraux vert, et toutes les valeurs ci-dessus viennent du ruleset de test.

**Points soumis à la validation humaine (non modifiés)**

- L'arrondi toujours vers le bas écarte la série lourde de 1 kg de la valeur théorique (143,55 → 142,5). C'est cohérent et prudent, mais c'est un choix à confirmer (G2).
- Deux séries de fente bulgare, toutes deux en calibration, pour un avancé : c'est le comportement de première exposition. La deuxième séance utilisera la charge mesurée.

## 7. Analyse machines / poulies / charges libres

**Question.** La « stabilité » est-elle devenue un bonus quasi absolu de modalité ?

**Méthode** (`tests/golden/stability-sensitivity.test.ts`) :

- 7 catalogues fictifs où **seule** la stabilité change (et, pour V6, le coût technique) ;
- mêmes 36 scénarios : 3 niveaux × 3 archétypes × 4 graines, salle complète ;
- mesure de la répartition des **accessoires**.

```
variante                               libres  machines  poulies  poids-corps
V0 référence                            22 %   50 %     19 %     9 %
V1 haltères stabilité 2                 22 %   50 %     19 %     9 %
V2 haltères stabilité 3                 45 %   34 %      9 %    11 %
V3 machines stabilité 2                 22 %   46 %     24 %     7 %
V4 machines stabilité 1                 26 %   43 %     24 %     7 %
V5 inversé (haltères 3, machines 1)     78 %    4 %     10 %     8 %
V6 = V4 + coût technique des haltères à 0  37 %   31 %     24 %     7 %
```

Lecture :

1. **La sélection suit la propriété, dans les deux sens.**
   - Haltères stables (V2) : charges libres de 22 % à 45 %.
   - Propriétés inversées (V5) : 78 % de charges libres contre 4 % de machines.
   - Le contrefactuel de la phase 4B tient toujours : permuter la classe d'équipement de tout le catalogue ne change aucun choix.
   - **Aucune modalité n'est favorisée pour elle-même.**
2. **Le reliquat de machines en V4** (stabilité égale) s'explique par d'autres propriétés, identifiées dans la trace :
   - coût technique : 0 pour les machines du catalogue de test, contre 1 pour certains haltères ; aligné (V6), les machines passent de 43 % à 31 % ;
   - pertinence : leg curl à 3 ;
   - couverture du catalogue : aucune alternative libre pour les ischios en isolation ;
   - variantes retenues par le CORE.
3. **Faiblesse conceptuelle confirmée, non corrigée** : dans un classement lexicographique, le premier critère différenciant est **décisif, même à un point** (V1 = V0 : passer les haltères de 1 à 2 ne change rien tant que les machines sont à 3).
   - La stabilité en tête des accessoires se comporte donc comme une préférence **absolue** pour l'exercice le plus stable du catalogue.
   - Ce n'est pas un biais de classe, mais le catalogue et l'ordre des critères (G2) en sont les leviers.
   - Options à arbitrer par l'expert, sans les implémenter maintenant :
     - placer `volume_fit` et `goal_relevance` avant `role_fit` pour certains emplacements ;
     - utiliser des bandes de stabilité (« suffisante » ≥ 2) plutôt que la valeur brute ;
     - revoir les métadonnées de stabilité du catalogue.

## 8. Audit du catalogue

**Système** (`src/catalog-review.ts`) : 8 contrôles pilotés par une configuration de revue (attentes de relecture, pas des vérités) :

- trop de muscles primaires ;
- isolation multi-groupes ;
- muscle primaire « attendu secondaire » pour un pattern ;
- région du pattern contre région des muscles (taxonomie) ;
- stabilité hors plage attendue par classe d'équipement ;
- plafond de charge incohérent ;
- famille de progression absente ;
- chargeable sans progression de charge possible.

Chaque constat a une sévérité (`error`, `warning`, `review`) et peut être **acquitté** par un relecteur avec une justification. Seules les erreurs non acquittées sont bloquantes.

Tests (`tests/unit/catalog-review.test.ts`) :

- chaque contrôle détecte une anomalie synthétique ;
- l'acquittement rend le constat non bloquant sans le masquer ;
- la revue est déterministe.

**Revue du catalogue de test** (enregistrée dans `tests/architecture/__reports__/catalog-review.txt`) :

- 45 exercices relus, **0 constat bloquant** ;
- **11 `suspicious_primary`** : biceps en primaire sur tous les tirages, triceps sur tous les développés. C'est l'anomalie révélée par la simulation longitudinale, désormais détectée automatiquement ;
- **35 `progression_family_missing`** : 35 exercices de force ou de gymnastique du catalogue de test n'ont pas de famille de progression.

Ces constats sont des données de test à corriger dans le futur catalogue réel ; le catalogue du CORE n'est pas modifié (aucune régression du CORE).

## 9. Inventaire des paramètres

Tableau complet dans [`STRENGTH-V1-PARAMETERS.md`](STRENGTH-V1-PARAMETERS.md) : 29 paramètres `strength.*` plus 7 paramètres du CORE lus par le moteur.

Chaque paramètre a une fiche : ID, gouvernance, valeur de TEST, unité, rôle, lieu d'intervention, comportement si absent (refus `INVALID_INPUT`, jamais de défaut, testé), confiance, provisional, statut de preuve, risques si trop bas ou trop haut.

Gouvernance :

- 4 G1 (`skillCeiling`, `novice.technicalUnderFatigue`, `volume.sessionCap`, `maxEffort.threshold`) ;
- 22 G2 ;
- 1 G3 ;
- 2 G4.

Statut de preuve :

- 15 `EVIDENCE_REVIEW_REQUIRED` ;
- 4 `SAFETY_SIGNOFF_REQUIRED` (dont 2 aussi en revue de preuve) ;
- 9 `EXPERT_DESIGN_REVIEW` ;
- 2 `TECHNICAL` ;
- 1 `PRODUCT_DECISION`.

Toutes les valeurs sont `draft` / `provisional`. **Passer les simulations ne valide aucune valeur.**

## 10. Evidence Review Pack

[`STRENGTH-EVIDENCE-REVIEW-PACK.md`](STRENGTH-EVIDENCE-REVIEW-PACK.md) : **57 questions en 15 thèmes** :

- volume, intensité, répétitions, proximité de l'échec ;
- repos, fréquence, progression, décharge, montée en charge ;
- novice, avancé ;
- entraînement concurrent / interférence ;
- autorégulation, e1RM ;
- séries maximales / sécurité.

Chaque question précise la règle, la décision à prendre, les paramètres, la population cible et le type de source souhaité (MA, RS, PS/consensus, ECR, littérature de coaching). **Aucune source n'est citée ni inventée** ; aucune valeur n'est modifiée.

## 11. Mutation (Stryker, modules critiques)

- Configuration : `stryker.strength.config.json`, runner `command` validé en phase 3.5.
- Tests exécutés par mutant : unitaires et intégration strength. Goldens, fuzz et simulations sont exclus pour tenir le time-box ; ils protègent aussi ces modules, mais ne sont pas comptés ici.

| Module | Passe 1 | Passe 2 (après durcissement) | Survivants passe 2 |
|---|---|---|---|
| `selection.ts` | 38,8 % | **86,1 %** | 29 |
| `dose.ts` | 65,3 % | **86,7 %** | 20 |
| `progression.ts` | 65,1 % | **73,3 %** | 167 |
| `load.ts` | 58,9 % | **70,7 %** | 159 |
| **Total** (1 527 mutants) | 59,3 % | **75,4 %** | 375 |

Analyse des 375 survivants de la passe 2 :

- **Sans effet sportif, 96** : 41 textes (paramètres de raisons, messages d'erreur) et 55 constructions de raisons de trace (surtout `progression.ts`). Ils changent l'explication, jamais la prescription. Ils sont couverts par les goldens JSON, exclus de la mutation.
- **Équivalents documentés, 21 et plus** :
  - replis `?? []` jamais atteints ;
  - chaînages optionnels sur des valeurs garanties par le schéma du ruleset ;
  - `i < order.length` contre `<=` (lecture hors borne → `[]`, comparaison neutre) ;
  - `tied.length > 1` contre `>= 1` (le départage d'un seul élément le rend inchangé) ;
  - `if (winner)` toujours vrai sur une liste non vide ;
  - tri par identifiant `<` contre `<=` (identifiants uniques) ;
  - `.sort()` des équipements quand un seul incrément déclaré correspond ;
  - gardes « profil de dosage absent » (garanti par le schéma).
- **Logique, 258**, dont les cas pouvant modifier une prescription, listés comme prochaines cibles :
  - `load.ts` : confiance des déclarations par source (`declared_1rm` / `app_sets_without_rir`), borne exacte de la tolérance de conflit (`>` contre `>=`), branche accessoire « dernière charge » contre % quand les deux coïncident dans les données de test, fenêtres d'âge d'une référence déclarée ;
  - `progression.ts` : mise à jour de l'e1RM quand la track n'en a pas, borne de rotation après régression, gardes de création (`dpRange`, `cycleStartLoadKg`) ;
  - `dose.ts` : politique `sum` sur les séries (cas multi-modificateurs), borne exacte du seuil de sollicitation.

Le time-box est respecté ; les survivants restants sont listés dans le rapport JSON. Aucun mutant survivant ne révèle un défaut du moteur : ce sont des **lacunes de tests**, pas des erreurs de prescription constatées.

## 12. Dette restante

| Dette | Portée | Suite |
|---|---|---|
| Valeurs G1/G2 toutes `provisional` | Programmation | Recherche via l'Evidence Review Pack, puis revue d'expert et visas G1 |
| Stabilité en tête des accessoires : préférence de fait pour la modalité la plus stable | Sélection (G2) | Décision d'expert : ordre des critères, bandes de stabilité ou métadonnées (§7) |
| Catalogue de test : 11 muscles primaires suspects, 35 familles de progression absentes | Données | Corriger dans le catalogue réel ; la revue les détecte |
| Exercices unilatéraux : « 2 × 5 » sans indication « par côté » (S4, fente marchée) | Schéma des séries (CORE-EXT-1) | Ajouter `perSide` aux séries : extension du CORE à arbitrer |
| Passe d'amélioration locale (doc 03 §7.2) non implémentée | Sélection | Variantes et couche B du CORE en V1 ; à réévaluer |
| Mutants survivants restants (§11) | Tests | Hors time-box ; la liste est dans `reports/mutation/strength-mutation.json` |
| Planificateur réel (alternance des groupes de choix, déclaration des ancres) | Hors périmètre | Le contrat existe et est vérifié par le CORE ; le planificateur reste à écrire |
| Simulateur : modèle d'athlète simplifié | Tests | Suffisant pour révéler les défauts logiques ; non prédictif |
| Rendu lisible des séances | Tests seulement | Aucune UI (hors périmètre) |

## 13. Commits de la phase 4C

- `044d989` : contrat planificateur (CORE-EXT-4), trois autorités, traçabilité des charges ;
- `164b3da` : addendum V1.2, préréglage, sensibilité, revue du catalogue, inventaire, Evidence Review Pack ;
- `1c12618` : mutation ciblée et durcissement des tests ;
- puis le commit de ce rapport.

## 14. STRENGTH_V1_LOCK_GATE

| Critère | Statut | Preuve |
|---|---|---|
| 7 écarts documentés et couverts | ✅ | Spec doc 10 §1–§7 : règles, justifications, tests de régression, règles remplacées annotées |
| Contrat planificateur réellement implémenté | ✅ | CORE-EXT-4 + `intent-contract.ts` ; refus `INVALID_INPUT` déterministe ; 7 tests |
| Dette préréglage arbitrée | ✅ | Décision B (doc 10 §9) ; 2 tests d'intégration et 1 test d'architecture |
| Anciens tests verts | ✅ | 367 tests CORE historiques verts, goldens CORE inchangés |
| Nouveaux tests verts | ✅ | 525 / 525 |
| Typecheck / lint | ✅ | Verts |
| S1–S7 relus | ✅ | §5 (versions finales complètes) |
| S5 traçable | ✅ | §6 : 142,5 = ⌊165 × 0,87⌋ au pas de 2,5 ; 127,5 = ⌊142,5 × 0,9⌋ au pas de 2,5 ; tout est dans la trace |
| Analyse de sensibilité anti-biais | ✅ | §7 : 7 catalogues, réponse monotone et symétrique à la propriété |
| Catalogue Strength auditable | ✅ | §8 : 8 contrôles, acquittements, 0 constat bloquant |
| Inventaire G1/G2 complet | ✅ | `STRENGTH-V1-PARAMETERS.md` (29 + 7) |
| Evidence Review Pack produit | ✅ | `STRENGTH-EVIDENCE-REVIEW-PACK.md` (57 questions, aucune source inventée) |
| Aucune constante sportive cachée | ✅ | Scanner de littéraux vert ; tous les paramètres déclarés sont consommés |
| Aucune régression du CORE | ✅ | Seul ajout : hook optionnel CORE-EXT-4, rétrocompatible |

**STRENGTH_V1_LOCK_GATE = PASS**

Sens : le moteur Musculation V1 est **techniquement verrouillable**. La programmation n'est **pas** validée scientifiquement pour la production : toutes les valeurs G1/G2 restent `PROVISIONAL` jusqu'à la recherche (Evidence Review Pack), la revue d'expert et les visas G1.

STOP : RunningEngine non commencé.
