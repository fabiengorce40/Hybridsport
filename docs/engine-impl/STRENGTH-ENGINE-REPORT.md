# Phase 4B — StrengthEngine : rapport d'implémentation

Toutes les valeurs sportives utilisées sont des **hypothèses provisoires de test** (ruleset et catalogue de fixtures). Aucune n'est validée ni destinée à la production.

## 1. Extensions CORE réellement faites

| Extension | Contenu | Commit |
|---|---|---|
| CORE-EXT-1 | Séries typées : `zRepTarget` (entier ou plage), `zEffort` (RIR/RPE), `zSetIntensity` (load / percent_of_reference / effort / relative_to_working [montée seulement] / bodyweight), tempo, `optional`. Références d'item `refs` (slotId, progressionTrackId, anchor declared/candidate, prescriptionSource, substitutedFrom), `alternatives` ≤ 3. DurationEngine : plages de reps (min, milieu, max) et séries facultatives (p90 seulement). `reduce_sets` retire d'abord une série facultative. Refus d'une ancre déclarée absente de l'intention. | `5fdcdab` |
| CORE-EXT-2 | `SportEngine<TContext>` avec `parseContext` ; `SportEngineInput.discipline` typé, validé à la frontière. | `5fdcdab` |
| CORE-EXT-3 | `ProposeResult` = `proposals` ou `no_valid_proposal` (schéma strict), transformé en `NO_VALID_SOLUTION` explicable (`SELECT.BLOCKING_NEED`, `DATA.MISSING_FOR_PROPOSAL`). | `5fdcdab` |
| `SportEngine.checks` | Contrôles de discipline exécutés par le validateur du CORE (le moteur ne s'auto-valide jamais). | `ec90501` |
| Traçage des raisons | Les reason codes d'une proposition sont inscrits dans la trace du CORE, rattachés à la séance candidate. | `6ea0a3b` |

STRENGTH_CORE_EXTENSION_GATE = PASS : 365 tests, dont les 335 anciens, sont verts, et les goldens CORE sont inchangés. Aucune autre modification du CORE.

## 2. Migrations

`session_record` v2 → v3, migration identité : les séries typées sont des ajouts compatibles. Un lecteur v2 refuse une donnée v3 (`migrateToCurrent` avec `known`). Aucune autre migration.

## 3. Fichiers du StrengthEngine (`packages/strength/src`, ≈ 2 150 lignes)

| Fichier | Rôle |
|---|---|
| `params.ts` | Schémas zod et gouvernance (G1–G4) des 30 paramètres `strength.*` ; lecture tracée (id + version) |
| `context.ts` | `StrengthContext` minimal, validé à la frontière (`parseStrengthContext`) |
| `codes.ts` | Registre des reason codes strength |
| `archetypes.ts` | Archétypes lus dans le ruleset ; résolution des emplacements (ancre déclarée > membre faisable > récence > priorité de l'objectif) ; couverture strength des groupes de choix |
| `model.ts` | Environnement de décision (ancres déclarées actives, tracks, structures, récence des familles) |
| `candidates.ts` | Filtres éliminatoires F1–F10 |
| `selection.ts` | Classement lexicographique ordinal (anchor, track, load_adequacy, role_fit, volume_fit, goal_relevance, fatigue_fit, recency, preference, logistics), départage par graine |
| `load.ts` | Hiérarchie de charge et confiance (none/low/medium/high), transferts limités, borne inférieure d'e1RM |
| `dose.ts` | Profil de base × modificateurs, politique de conflit tracée, calibration |
| `rampup.ts` | Montée en charge selon 4 états de connaissance |
| `models.ts` | Choix du modèle de progression (pas grossier ⇒ double progression) |
| `progression.ts` | ProgressionEngine : classification, mise à jour, création, suspension, reprise, nouveau cycle, clôture |
| `volume.ts` | E1, cibles hebdomadaires, projection, partage du reste, adéquation au volume |
| `interference.ts` | Contexte multisport consommé (structures abaissées) |
| `checks.ts` | Contrôles STR-V2 à V7 exécutés par le CORE |
| `engine.ts` | `StrengthEngine` : construction sous budget de durée, prescriptions, alternatives, `no_valid_proposal` |

## 4. Règles

| Règle | Couche | Nature / gouvernance | Objet |
|---|---|---|---|
| `strength.v2.session_cap` | A1 | SAFETY / G1 | Plafond de séries difficiles par groupe et par séance |
| `strength.v3.intensity_coherence` | A4 | TECHNICAL / G4 | Cohérence entre % d'e1RM et reps + RIR |
| `strength.v4.rampup_placement` | A3 | HEURISTIC / G2 | Montée avant le travail, sous la charge de travail, jamais sur l'isolation |
| `strength.v5.load_mode` | A4 | TECHNICAL / G4 | Pas de charge sur un exercice non chargeable |
| `strength.v6.novice_technical` | A1 | SAFETY / G1 | Novice/débutant : au plus 1 exercice technique, en principal seulement |
| `strength.v7.max_effort` | A1 | SAFETY / G1 | Effort maximal réservé aux exercices et niveaux éligibles |

- STR-V1 (couverture des emplacements requis) est garanti par construction et par test. Le CORE ne voit pas l'archétype.
- STR-V8 est sans objet en V1 : aucune série de référence maximale n'est prescrite.

## 5. Paramètres réellement consommés

Chaque proposition déclare les paramètres ci-dessous (id et version ; classe de gouvernance à droite, `CORE` pour les paramètres du CORE lus par le moteur). Les valeurs n'existent que dans `packages/strength/tests/fixtures/ruleset.ts`.

```
demand.derivationTable                       v0.1.0  CORE
duration.blockTransitionS                    v0.1.0  CORE
duration.briefingS                           v0.1.0  CORE
duration.defaultTiming                       v0.1.0  CORE
duration.toleranceProfiles                   v0.1.0  CORE
duration.transitionTable                     v0.1.0  CORE
duration.uncertaintyCorrelation              v0.1.0  CORE
strength.archetypes                          v0.1.0  G2
strength.calibration                         v0.1.0  G2
strength.dose.base                           v0.1.0  G2
strength.dose.modifiers                      v0.1.0  G2
strength.dose.nonRep                         v0.1.0  G2
strength.exerciseClass                       v0.1.0  G2
strength.goals                               v0.1.0  G2
strength.interference                        v0.1.0  G2
strength.load                                v0.1.0  G2
strength.load.defaultIncrements              v0.1.0  G4
strength.maxEffort.threshold                 v0.1.0  G1
strength.needs                               v0.1.0  G2
strength.novice.technicalUnderFatigue        v0.1.0  G1
strength.progression                         v0.1.0  G2
strength.proposals.max                       v0.1.0  G4
strength.rampup                              v0.1.0  G2
strength.selection.axialHighMaxPerSession    v0.1.0  G2
strength.selection.criteriaOrder             v0.1.0  G2
strength.selection.minLoadCeiling            v0.1.0  G2
strength.selection.primaryLoadRequired       v0.1.0  G2
strength.selection.recencyBandsDays          v0.1.0  G3
strength.selection.skillCeiling              v0.1.0  G1
strength.session.mobility                    v0.1.0  G2
strength.stimuli                             v0.1.0  G2
strength.substitution.fallbackNeeds          v0.1.0  G2
strength.topSet                              v0.1.0  G2
strength.tracks                              v0.1.0  G2
strength.volume                              v0.1.0  G2
strength.volume.sessionCap                   v0.1.0  G1
```

## 6. Tests

| Suite | Tests | Objet |
|---|---|---|
| `architecture/strength-architecture` | 10 | Dépendances à sens unique (le CORE n'importe jamais strength), pureté (horloge, hasard, réseau), aucune constante sportive, aucun paramètre mort, invariant anti-biais de `selection.ts`, `engine.ts` n'importe pas le ProgressionEngine |
| `architecture/parameters` | 2 | Paramètres consommés, G1 déclarés |
| `unit/archetypes-selection` | 17 | 4 archétypes valides pour le CORE, 11 besoins, **propriété « requis indépendants du stimulus »**, groupes de choix (ancre, faisabilité, récence), filtres F2–F9, déterminisme, graine, load_adequacy, préférences, **anti-biais métamorphique** |
| `unit/load-dose-rampup` | 20 | Aucun 1RM inventé, pas de transfert de machine (D-S5), contexte de salle (D-S6), modes de prescription par confiance, plafond matériel, dosage et conflits, calibration, absence de RIR universel, montée (4 cas, exclusions, même pattern) |
| `unit/progression` | 15 | 9 classes d'exposition (douleur et pause ≠ échec), 4 modèles, preuves, régression bornée, rotation, granularité, reprise, nouveau cycle |
| `unit/checks` | 7 | STR-V2 à V7 : silencieux sur les goldens, détection prouvée |
| `integration/engine` | 16 | NO_VALID_PROPOSAL (archétype, objectif, besoin bloquant, **régression D-S4**, durée, stimulus lourd sans charge), ancres et tracks, substitutions, multisport, durée |
| `golden/goldens` | 15 | S1–S7 enregistrés (JSON et rendu lisible) et revue structurelle d'entraîneur |
| `golden/anti-bias` | 6 | S7 et 4 contrefactuels, distribution des modalités |
| `property/fuzz-metamorphic` | 6 | Fuzz sur 120 scénarios, déterminisme, 4 relations métamorphiques |
| `longitudinal/simulation` | 5 | 5 profils × 52 semaines (horizons 12, 26 et 52) |

- Total monorepo : **45 fichiers, 486 tests verts** (CORE 367, strength 119).
- Typecheck, lint et architecture : verts.

## 7. Couverture (v8)

- `packages/strength/src` : instructions 95,81 %, branches 85,27 %, fonctions 96,02 %, lignes 99,46 %.
- Monorepo : instructions 94,61 %, branches 85,71 %, fonctions 97,04 %, lignes 98,12 %.
- Mutation (Stryker) : **non exécutée** sur strength (voir dette).

## 8. Bogues trouvés et corrigés pendant la phase

Revue humaine des goldens :

1. Les raisons du moteur étaient perdues dans la trace du CORE → correctif du CORE (`6ea0a3b`).
2. La calibration plafonnait toutes les séries → elle ne porte plus que sur les N premières.
3. Montées en charge sur les tractions et les poulies → paramètres `loadModels` et `maxWorkingReps`.
4. Biais technique de `role_fit` : un hip thrust machine choisi en principal de force → corrigé.
5. Besoins en double dans une séance → règle `usedNeeds` et groupes de choix optionnels.
6. % d'e1RM prescrit sur l'isolation → réservé aux polyarticulaires principaux et secondaires.
7. Repos de 52,5 s → arrondi au pas du ruleset.
8. Superset mêlant séries et maintien (STRUCTURE_INVALID) → superset limité aux séries.
9. Séance de 30 min trop longue → plages de mobilité.
10. Poids du corps plafonné (fente sans charge) prescrit à un avancé → critère ordinal `load_adequacy`.
11. Ancres déclarées ignorées dans les groupes de choix → ancre déclarée prioritaire.
12. Séance haut du corps sans poussée horizontale → ordre des optionnels du ruleset de test.
13. La dernière exposition brute primait sur l'e1RM lissé de la track → l'e1RM de la track fait foi.

Tests unitaires et de régression :

14. Un groupe de choix pouvait retenir un membre sans candidat (tirage vertical sans barre) → membres faisables d'abord.
15. Le critère B1 était calculé sur d'autres emplacements que ceux de la séance → emplacements réels.

Simulations longitudinales : défauts réels, le moteur n'a pas été recalibré pour « passer ».

16. Les modificateurs s'appliquaient deux fois aux tracks. Le RIR dérivait (3 → 5 → 6), entraînant une régression en boucle et une stagnation. Nouveau contrat : la track porte charge et reps ; séries et RIR sont recalculés.
17. RIR de référence d'une track = RIR de calibration → RIR du profil de base.
18. Rotation à chaque fin de mésocycle pour tous les niveaux → rotation par niveau (les débutants gardent leurs ancres).
19. Une track suspendue pour douleur ne reprenait jamais → `resumeTrack`.
20. Le plafond de gain du premier cycle bloquait l'ancre pour toujours → `startCycle`.
21. Plafond de cycle inférieur à un pas réalisable (12 kg × 1,15 < 14 kg) → au moins un pas.
22. Progression linéaire sur un pas grossier (haltères) : 16–27 % de séries impossibles → double progression.
23. Saut de charge de +50 % en double progression sur l'isolation légère → refusé s'il serait prévisiblement « en dessous ».
24. Une première exposition trop légère ne mettait jamais la confiance à jour (calibration en boucle) → borne inférieure d'e1RM.
25. Plage de répétitions dégénérée (6–6) après changement de modèle → plage du profil.
26. Haut hebdomadaire du volume ignoré (bras à 24 séries contre un haut de 14) et partage du reste divisé par toutes les séances (pectoraux sous le plancher) → critère `volume_fit`, garde sur les optionnels, partage corrigé.
27. Alternance des groupes de choix par nombre d'expositions (saturé) → par date.
28. Niveau compté deux fois sur les séries allouées (novice sous le plancher) → corrigé.
29. Une ancre déclarée inapplicable (deux ancres dans un même groupe) était ignorée en silence → `PROGRESSION.ANCHOR_NOT_APPLICABLE`.
30. Stimulus lourd sans exercice chargeable (air squat « lourd ») → filtre F10, refus explicable.
31. Paramètres du CORE lus par le moteur mais non déclarés → déclarés dans chaque proposition.

## 9. Écarts à la spécification (V1.1), à valider

1. **Contrat track / dosage** : la track porte la charge et les répétitions (variables de ses modèles). Les séries viennent du volume, le RIR du stimulus et des modificateurs. `nextPrescription.sets` et `nextPrescription.rir` sont informatifs.
2. **Critères ordinaux ajoutés** :
   - `load_adequacy` : plafond de charge minimal par niveau, lu sur `loadCeiling`, jamais sur la classe d'équipement ;
   - `volume_fit` : ne pas dépasser le haut hebdomadaire, servir d'abord les groupes sous le plancher.
3. **Filtre F10** (principal chargeable pour les stimuli listés, G2) et **F2b** (V1 : séries, maintien et porté en distance seulement ; le gainage est prescrit en `hold`, le porté en `intervals` sur distance).
4. **Modèle de progression** : double progression quand le pas dépasse une fraction de la charge (`coarseStepFraction`, G2).
5. **Cycle de vie** : `resumeTrack` et `startCycle` ajoutés. `rotateAtMesocycleEnd` devient par niveau.
6. **Groupes de choix** : couverture strength (un membre faisable suffit ; seuls les emplacements requis doivent être couverts), car le CC1 du CORE raisonne emplacement par emplacement.
7. **Contrat planificateur** (hors moteur, appliqué dans le simulateur) : au plus une ancre déclarée par groupe de choix et par séance, en alternance. Une exposition d'une ancre non déclarée reste une donnée d'apprentissage pour le ProgressionEngine.

## 10. Résultats longitudinaux (5 profils, 52 semaines)

Aucun détecteur **critique** sur aucun profil ni horizon. Les critiques testés sont :

- séance invalide ;
- durée hors du temps disponible ;
- douleur traitée comme un échec ;
- ancre déclarée ignorée ;
- plus de 10 % de séries impossibles ;
- décharge sans effet ;
- volume superflu ajouté par des isolations optionnelles.

Avertissements et faiblesses conceptuelles, **non calibrés** :

**P1 débutant, salle complète, général, 3 × corps entier 45 min (douleur semaine 6)**

- 12 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 6.2 vs accumulation 9.7
  - [warning] anchor_stagnation — str_full_body/fb.pull_h : 9 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.pull_v : 8 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.push_v : 8 expositions sans hausse
  - [warning] volume_bounds — groupes-semaines : 77 contrôlés, 0 < 50 % du plancher ; > 125 % du haut : 0 par isolations optionnelles superflues {}, 8 par polyarticulaires optionnels (comptabilité E1), 9 par les seuls emplacements requis
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 11.8 % sur 15 exercices
- 26 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 6.2 vs accumulation 9.6
  - [warning] anchor_stagnation — str_full_body/fb.pull_h : 14 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.pull_v : 15 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.push_v : 15 expositions sans hausse
  - [warning] volume_bounds — groupes-semaines : 170 contrôlés, 0 < 50 % du plancher ; > 125 % du haut : 0 par isolations optionnelles superflues {}, 19 par polyarticulaires optionnels (comptabilité E1), 20 par les seuls emplacements requis
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 11.8 % sur 15 exercices
- 52 semaines :
  - [info] impossible_prescriptions — 0.7 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 6.3 vs accumulation 9.4
  - [warning] anchor_stagnation — str_full_body/fb.pull_h : 14 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.pull_v : 16 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.push_v : 15 expositions sans hausse
  - [warning] volume_bounds — groupes-semaines : 332 contrôlés, 4 < 50 % du plancher ; > 125 % du haut : 0 par isolations optionnelles superflues {}, 38 par polyarticulaires optionnels (comptabilité E1), 39 par les seuls emplacements requis
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 11.8 % sur 15 exercices

**P2 intermédiaire, salle complète, hypertrophie, 4 × haut / bas 60 min (banc indisponible semaines 10–11)**

- 12 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 5.7 vs accumulation 13.0
  - [warning] anchor_stagnation — str_upper/up.main_push_h : 6 expositions sans hausse
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 4.8 % sur 22 exercices
- 26 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 5.9 vs accumulation 13.2
  - [warning] anchor_stagnation — str_upper/up.main_push_h : 8 expositions sans hausse
  - [warning] anchor_stagnation — str_upper/up.main_push_v : 11 expositions sans hausse
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 4.8 % sur 22 exercices
- 52 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 6.0 vs accumulation 13.2
  - [warning] anchor_stagnation — str_upper/up.main_push_h : 8 expositions sans hausse
  - [warning] anchor_stagnation — str_upper/up.main_push_v : 18 expositions sans hausse
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 4.8 % sur 22 exercices

**P3 avancé, salle complète, force, 4 × haut / bas lourd 75 min (2 séances manquées semaine 20)**

- 12 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 5.0 vs accumulation 12.5
  - [warning] volume_bounds — groupes-semaines : 81 contrôlés, 0 < 50 % du plancher ; > 125 % du haut : 0 par isolations optionnelles superflues {}, 13 par polyarticulaires optionnels (comptabilité E1), 2 par les seuls emplacements requis
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 0.9 % sur 21 exercices
- 26 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 4.9 vs accumulation 12.6
  - [warning] anchor_stagnation — str_upper/up.main_push_h : 11 expositions sans hausse
  - [warning] anchor_stagnation — str_upper/up.main_push_v : 11 expositions sans hausse
  - [warning] volume_bounds — groupes-semaines : 175 contrôlés, 0 < 50 % du plancher ; > 125 % du haut : 0 par isolations optionnelles superflues {}, 32 par polyarticulaires optionnels (comptabilité E1), 2 par les seuls emplacements requis
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 0.9 % sur 21 exercices
- 52 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 4.9 vs accumulation 12.5
  - [warning] anchor_stagnation — str_upper/up.main_push_h : 21 expositions sans hausse
  - [warning] anchor_stagnation — str_upper/up.main_push_v : 25 expositions sans hausse
  - [warning] volume_bounds — groupes-semaines : 346 contrôlés, 0 < 50 % du plancher ; > 125 % du haut : 0 par isolations optionnelles superflues {}, 66 par polyarticulaires optionnels (comptabilité E1), 2 par les seuls emplacements requis
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 0.9 % sur 21 exercices

**P4 coureur intermédiaire (10 km), salle commerciale, soutien course, 2 × 45 min, intervalles clés le lendemain de la 1re**

- 12 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 3.0 vs accumulation 6.1
  - [warning] anchor_stagnation — str_support/sp.main_hip : 7 expositions sans hausse
  - [warning] anchor_stagnation — str_support/sp.main_single : 7 expositions sans hausse
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 1.7 % sur 12 exercices
- 26 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 3.0 vs accumulation 6.2
  - [warning] anchor_stagnation — str_support/sp.main_hip : 10 expositions sans hausse
  - [warning] anchor_stagnation — str_support/sp.row : 8 expositions sans hausse
  - [warning] anchor_stagnation — str_support/sp.main_single : 14 expositions sans hausse
  - [warning] anchor_stagnation — str_support/sp.push : 7 expositions sans hausse
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 1.7 % sur 12 exercices
- 52 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 3.0 vs accumulation 6.2
  - [warning] anchor_stagnation — str_support/sp.main_hip : 19 expositions sans hausse
  - [warning] anchor_stagnation — str_support/sp.row : 8 expositions sans hausse
  - [warning] anchor_stagnation — str_support/sp.main_single : 19 expositions sans hausse
  - [warning] anchor_stagnation — str_support/sp.push : 7 expositions sans hausse
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 1.7 % sur 12 exercices

**P5 novice, haltères + banc à domicile, général, 2 × corps entier 40 min**

- 12 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 5.7 vs accumulation 9.4
  - [warning] volume_bounds — groupes-semaines : 80 contrôlés, 0 < 50 % du plancher ; > 125 % du haut : 0 par isolations optionnelles superflues {}, 3 par polyarticulaires optionnels (comptabilité E1), 7 par les seuls emplacements requis
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 8.8 % sur 11 exercices
- 26 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 5.5 vs accumulation 9.8
  - [warning] anchor_stagnation — str_full_body/fb.main_knee : 12 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.push_h : 12 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.main_hip : 12 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.push_v : 12 expositions sans hausse
  - [warning] volume_bounds — groupes-semaines : 179 contrôlés, 0 < 50 % du plancher ; > 125 % du haut : 0 par isolations optionnelles superflues {}, 7 par polyarticulaires optionnels (comptabilité E1), 14 par les seuls emplacements requis
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 8.8 % sur 11 exercices
- 52 semaines :
  - [info] impossible_prescriptions — 0.0 % des séries prescrites au-delà de la capacité réelle
  - [info] deload_effect — séries/séance : décharge 5.5 vs accumulation 9.8
  - [warning] anchor_stagnation — str_full_body/fb.main_knee : 12 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.push_h : 12 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.main_hip : 12 expositions sans hausse
  - [warning] anchor_stagnation — str_full_body/fb.push_v : 12 expositions sans hausse
  - [warning] volume_bounds — groupes-semaines : 348 contrôlés, 0 < 50 % du plancher ; > 125 % du haut : 0 par isolations optionnelles superflues {}, 13 par polyarticulaires optionnels (comptabilité E1), 27 par les seuls emplacements requis
  - [info] true_strength_gain — [simulation complète] gain moyen de capacité réelle 8.8 % sur 11 exercices

Lecture :

- **Stagnation d'ancre (avertissement).** Surtout chez l'avancé, où le gain simulé est de 0,9 %/an, et sur les développés verticaux. C'est cohérent avec un athlète simulé à gains lents : la stagnation déclenche rotation et clôture.
- **Dépassements du haut hebdomadaire.** Ils viennent des emplacements requis ou de polyarticulaires utiles à d'autres groupes, jamais d'isolations superflues. La cause est la comptabilité E1 du catalogue de test (biceps et triceps en muscles PRIMAIRES de tous les tirages et développés) et des hauts de ruleset très bas pour les petits groupes chez le débutant (bras 3–7). C'est un signal pour la revue scientifique du ruleset et du catalogue, pas pour le moteur.
- **Soutien course (P4).** 21 groupes-semaines sous 50 % du plancher : volume volontairement bas, deux séances et interférence de la séance clé.
- **Modèle d'athlète** (test uniquement) : gains décroissants, fatigue intra-séance, bruit borné, séries stimulantes à RIR ≤ 4. Il n'est pas validé et ne sert qu'à révéler des défauts de logique.

## 11. Anti-biais

- **Invariant architectural** : `selection.ts` ne lit jamais la classe d'équipement, le modèle de charge ni `loadable` ; aucun score, bonus ni poids.
- **Contrefactuel 1** : permuter la classe d'équipement de tout le catalogue ne change aucun exercice choisi (S2, S6, S7).
- **Contrefactuel 2** : à propriétés égales, machine et haltère gagnent chacun selon la graine.
- **Contrefactuels 3 et 4** : récence des familles et préférences agissent symétriquement, dans les deux sens.
- **Distribution** (salle complète, 3 niveaux × 3 archétypes × 4 graines) :

```
primary    free_weight=36
secondary  bodyweight=12  cable=16  free_weight=12  machine=8
support    bodyweight=9  cable=17  free_weight=24  machine=58
```

**Faiblesse conceptuelle documentée** : en salle complète, les accessoires sont surtout des machines et poulies (≈ 70 %), et les principaux sont toujours des charges libres. Les contrefactuels 1 et 2 montrent que ce n'est pas un biais de classe : c'est l'effet du critère `role_fit = stability` placé en tête pour les accessoires. Or, dans le catalogue de test, la stabilité 3 n'est attribuée qu'aux machines et poulies. C'est réglable par le ruleset (ordre des critères, `modalityPreference`) et par les métadonnées du catalogue.

## 12. Séances S1–S7 (lecture humaine)

Colonnes : exercice (emplacement · ancre · source de prescription) — critère décisif de sélection ; puis séries × reps · charge / RIR / RPE · repos.

### S1
```
# Débutant, 3 séances / semaine, 45 min, haltères + banc, objectif général
résultat : ok · validation : VALID · durée : FITS
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.goblet_squat  (fb.main_knee · ancre:candidate · calibration) — choix : role_fit
      2 × 6 · RIR 4 · repos 120 s
      1 × 6 · RIR 3 · repos 120 s
  [strength · secondary]
    ex.db_bench_press  (fb.push_h · ancre:candidate · calibration) — choix : goal_relevance
      2 × 8 · RIR 4 · repos 105 s
      1 × 8 · RIR 3 · repos 105 s
    ex.db_row  (fb.pull_h · ancre:candidate · calibration) — choix : only_candidate
      2 × 8 · RIR 4 · repos 105 s
      1 × 8 · RIR 3 · repos 105 s
  [accessory · support]
    ex.bulgarian_split_squat  (fb.single_leg · calibration) — choix : variant
      2 × 8–12 · RIR 4 · repos 75 s
    ex.db_calf_raise  (fb.iso_lower · calibration) — choix : only_candidate
      2 × 12–15 · RIR 4 · repos 60 s
  [cooldown · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
  Durée estimée (p50) : 40 min
```
Revue :

- débutant, haltères et banc, général ; calibration à l'effort et aucune charge inventée ;
- RIR 3–4, 3 séries par polyarticulaire, 40 min pour 45 ;
- pas de charnière dans cette séance : alternance genou/hanche d'une séance à l'autre.

### S2
```
# Intermédiaire, 4 séances / semaine, 60 min, salle complète, hypertrophie (séance haut du corps)
résultat : ok · validation : VALID · durée : FITS
  [warmup · support]
    ex.shoulder_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.barbell_ohp  (up.main_push_v · ancre:candidate · calibration) — choix : role_fit
      montée : 8 @ RPE 3 → 5 @ RPE 5 → 3 @ RPE 7
      2 × 6 · RIR 3 · repos 150 s
      1 × 6 · RIR 2 · repos 150 s
  [strength · secondary]
    ex.seated_cable_row  (up.pull_h · ancre:candidate · calibration) — choix : seed_tiebreak
      2 × 8–12 · RIR 3 · repos 105 s
      1 × 8–12 · RIR 2 · repos 105 s
  [accessory · support]
    ex.bench_press  (up.push_2h · history) — choix : variant
      2 × 8–12 · 70 kg · RIR 2 · repos 90 s
    ex.lat_pulldown  (up.pull_2v · history) — choix : role_fit
      2 × 8–12 · 55 kg · RIR 2 · repos 90 s
    ex.machine_lateral_raise  (up.iso_upper · calibration) — choix : seed_tiebreak
      2 × 12–20 · RIR 3 · repos 60 s
      1 × 12–20 · RIR 1 · repos 60 s
    ex.pec_deck  (up.iso_upper · calibration) — choix : volume_fit
      2 × 12–20 · RIR 3 · repos 60 s
      1 × 12–20 · RIR 1 · repos 60 s
  [cooldown · support]
    ex.shoulder_mobility_flow  (mobility) — mobilité 3 min
  Durée estimée (p50) : 51 min
```
Revue :

- haut du corps en hypertrophie, équilibré : développé militaire, rowing, développé couché, tirage vertical, élévations latérales et pec deck ;
- le pec deck est choisi par `volume_fit` (pectoraux sous le plancher hebdomadaire) ;
- charges reprises de l'historique (70 kg, 55 kg).

### S3
```
# Intermédiaire, 3 musculation + 3 course (10 km) : soutien course, séance clé d’intervalles 20 h après
résultat : ok · validation : VALID · durée : SHORTER_ACCEPTED
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.db_rdl  (sp.main_hip · ancre:candidate · calibration) — choix : role_fit
      2 × 5 · RIR 3 · repos 150 s
  [strength · secondary]
    ex.seated_cable_row  (sp.row · ancre:candidate · calibration) — choix : seed_tiebreak
      2 × 6–10 · RIR 3 · repos 105 s
      1 × 6–10 · RIR 2 · repos 105 s
  [accessory · support]
    ex.cable_pallof_press  (sp.trunk · calibration) — choix : load_adequacy
      2 × 10–15 · RIR 3 · repos 60 s
    ex.farmers_carry  (sp.carry) — 2 × 30 m · repos 60 s
  [cooldown · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
  Durée estimée (p50) : 28 min
```
Revue :

- soutien course, séance clé d'intervalles 20 h après : aucun exercice à dominante genou, ni unilatéral ni isolation jambes (omis par interférence, tracé) ;
- 28 min pour 45, durée plus courte acceptée et tracée.

### S4
```
# Intermédiaire, 2 musculation + HYROX : soutien HYROX, séance sled/farmers (grip élevé) 18 h après
résultat : ok · validation : VALID · durée : SHORTER_ACCEPTED
  [warmup · support]
    ex.hip_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.walking_lunge_db  (sp.main_single · ancre:candidate · calibration) — choix : seed_tiebreak
      2 × 5 · RIR 3 · repos 150 s
  [strength · secondary]
    ex.db_row  (sp.row · ancre:candidate · calibration) — choix : fatigue_fit
      2 × 6–10 · RIR 3 · repos 105 s
      1 × 6–10 · RIR 2 · repos 105 s
  [accessory · support]
    ex.db_calf_raise  (sp.iso_lower · calibration) — choix : seed_tiebreak
      2 × 10–15 · RIR 3 · repos 60 s
    ex.cable_pallof_press  (sp.trunk · calibration) — choix : load_adequacy
      2 × 10–15 · RIR 3 · repos 60 s
    ex.sandbag_lunge  (sp.single_leg) — 2 × 30 m · repos 60 s
  [cooldown · support]
    ex.hip_mobility_flow  (mobility) — mobilité 3 min
  Durée estimée (p50) : 34 min
```
Revue :

- soutien HYROX avec grip abaissé : pas de porté ;
- fentes spécifiques (principal et accessoire en distance), mollets, anti-rotation.

### S5
```
# Avancé, 4 séances / semaine, 75 min, force + hypertrophie (séance bas du corps lourde)
résultat : ok · validation : VALID · durée : SHORTER_ACCEPTED
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.back_squat  (lo.main_knee · ancre:declared · base_profile) — choix : anchor
      montée : 8 @ 55 kg → 5 @ 77.5 kg → 3 @ 97.5 kg → 1 @ 120 kg
      1 × top_set 3 · 142.5 kg (87 % e1RM) · RIR 2 · repos 195 s
      2 × backoff 3 · 127.5 kg · RIR 2 · repos 195 s
  [strength · secondary]
    ex.romanian_deadlift  (lo.sec_hip · ancre:declared · base_profile) — choix : anchor
      montée : 8 @ 47.5 kg → 5 @ 70 kg → 3 @ 95 kg
      3 × 5–8 · 120 kg (75 % e1RM) · RIR 2 · repos 150 s
  [accessory · support]
    ex.bulgarian_split_squat  (lo.single_leg · calibration) — choix : goal_relevance
      2 × 6–10 · RIR 3 · repos 105 s
    ex.machine_calf_raise  (lo.iso_lower · calibration) — choix : volume_fit
      2 × 10–15 · RIR 3 · repos 60 s
      1 × 10–15 · RIR 1 · repos 60 s
    ex.cable_pallof_press  (lo.trunk · calibration) — choix : load_adequacy
      2 × 10–15 · RIR 3 · repos 60 s
      1 × 10–15 · RIR 1 · repos 60 s
    ex.leg_curl  (lo.iso_lower · history) — choix : goal_relevance
      2 × 10–15 · 50 kg · RIR 1 · repos 60 s
  [cooldown · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
  Durée estimée (p50) : 59 min
```
Revue :

- avancé, force : ancres déclarées appliquées (squat, puis RDL) ;
- série lourde 3 × 142,5 kg (e1RM lissé 165 kg), 2 séries allégées, montée en charge en kg ;
- accessoires cohérents.

### S6
```
# 30 minutes seulement, salle complète, intermédiaire, objectif général
résultat : ok · validation : VALID · durée : FITS
  [warmup · support]
    ex.lower_mobility_flow  (mobility) — mobilité 3 min
  [strength · primary]
    ex.back_squat  (fb.main_knee · ancre:candidate · calibration) — choix : goal_relevance
      montée : 8 @ RPE 3 → 5 @ RPE 5 → 3 @ RPE 7
      2 × 6 · RIR 3 · repos 90 s
      1 × 6 · RIR 2 · repos 90 s
  [strength · secondary]
    ex.machine_chest_press  (fb.push_h · ancre:candidate · calibration) — choix : logistics
      2 × 8–12 · RIR 3 · repos 90 s
    ex.seated_cable_row  (fb.pull_h · ancre:candidate · calibration) — choix : seed_tiebreak
      2 × 8–12 · RIR 3 · repos 90 s
  Durée estimée (p50) : 23 min
```
Revue :

- 30 min : noyau complet (squat, poussée, tirage) ; optionnels omis pour la durée (tracé) ; 23 min.

### S7
```
# Machines + poulies + charges libres disponibles, historique biaisé vers les charges libres (hypertrophie, haut du corps)
résultat : ok · validation : VALID · durée : FITS
  [warmup · support]
    ex.shoulder_mobility_flow  (mobility) — mobilité 5 min
  [strength · primary]
    ex.bench_press  (up.main_push_h · ancre:candidate · base_profile) — choix : role_fit
      montée : 8 @ 32.5 kg → 5 @ 50 kg → 3 @ 67.5 kg
      4 × 6 · 85 kg (80 % e1RM) · RIR 2 · repos 150 s
  [strength · secondary]
    ex.pull_up  (up.pull_v · ancre:candidate · calibration) — choix : logistics
      2 × 8–12 · poids du corps · RIR 3 · repos 105 s
      1 × 8–12 · poids du corps · RIR 2 · repos 105 s
  [accessory · support]
    ex.machine_row  (up.pull_2h · calibration) — choix : variant
      2 × 8–12 · RIR 3 · repos 90 s
      1 × 8–12 · RIR 2 · repos 90 s
    ex.machine_shoulder_press  (up.push_2v · calibration) — choix : role_fit
      2 × 8–12 · RIR 3 · repos 90 s
    ex.pec_deck  (up.iso_upper · calibration) — choix : seed_tiebreak
      2 × 12–20 · RIR 3 · repos 60 s
      2 × 12–20 · RIR 1 · repos 60 s
  [cooldown · support]
    ex.shoulder_mobility_flow  (mobility) — mobilité 3 min
  Durée estimée (p50) : 51 min
```
Revue :

- matériel complet, historique biaisé charges libres : principal développé couché 4 × 6 à 85 kg (80 % de l'e1RM mesuré) ;
- accessoires machines, par stabilité (voir § 11) ;
- équilibre poussée / tirage.

## 13. Dette technique

- **Mutation** : Stryker non exécuté sur `packages/strength` (runner `command` lent, voir phase 3.5).
- **Préréglages** : le moteur ne connaît que le matériel, pas l'identifiant de préréglage. Un archétype déclaré infaisable pour un préréglage n'est refusé que via les filtres (F10 pour le lourd), pas explicitement.
- **Contrat planificateur** (une ancre par groupe de choix et par séance, alternance) : spécifié et simulé, pas implémenté (hors périmètre).
- **Catalogue et ruleset de test** : comptabilité E1 des petits groupes, stabilité réservée aux machines, hauts hebdomadaires bas des petits groupes. À revoir scientifiquement.
- **Simulateur** : modèle d'athlète simplifié, sans transfert entre exercices d'une même famille ni fatigue inter-séances.
- **Rendu lisible** des séances : outil de test seulement (aucune UI).
- **`progressionModelFor` sans track** : repose sur la dernière charge connue. Sans historique, le modèle du ruleset s'applique jusqu'à la création de la track.

## 14. Commits de la phase 4B

`5fdcdab`, `ec90501`, `6ea0a3b`, `a888cc4`, `dac6f4d`, `9802fa1`, `f25d565`, `0db8512`, `81780f5`, `bf8069d`, `8583b39`, `687e305`, puis le commit de ce rapport.

## 15. Verdict

**STRENGTH_ENGINE_GATE = PASS**

| Critère | Statut |
|---|---|
| Gate d'extension du CORE | PASS |
| Anciens tests du CORE | Verts |
| Nouveaux tests | Verts |
| Typecheck / lint / architecture | Verts |
| Déterminisme | Oui |
| Constantes sportives cachées | Aucune |
| Biais global de modalité | Aucun (contrefactuels) ; effet de stabilité documenté |
| Auto-validation | Aucune |
| NO_VALID_PROPOSAL | Fonctionnel (dont D-S4) |
| Ancres et tracks | Conformes V1.1 et écarts listés |
| Progression, montée en charge, durée, substitutions, multisport | Fonctionnels |
| S1–S7 | Générés, enregistrés, relus : cohérents |
| Longitudinal | Exécuté, aucun critique |
| Défauts critiques connus | Aucun non documenté |

STOP : RunningEngine non commencé.
