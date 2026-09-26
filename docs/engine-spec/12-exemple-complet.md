# 12 — Exemple complet : musculation + HYROX + course, 5 séances par semaine

> Toutes les valeurs numériques de cet exemple proviennent de **paramètres provisoires** du ruleset. Elles illustrent le raisonnement ; ce ne sont pas des prescriptions validées. Les reason codes sont montrés sous leur forme interne.

## 0. Profil (entrées)

**Athlète A**, 34 ans, 78 kg, sans restriction, questionnaire d'aptitude sans drapeau.

| Élément | Valeur |
|---------|--------|
| Disciplines actives | musculation, HYROX, course |
| Expérience | Musculation : 3 ans, marqueurs « 10 tractions strictes », intermédiaire. Course : 18 mois, 3 sorties/sem ces 4 dernières semaines (≈ 95 min/sem, ≈ 18 km/sem, journalisées). HYROX : aucune compétition |
| Références | 10 km officiel en **49:40**, il y a 5 semaines. Squat 5RM **100 kg** et développé couché 5RM **80 kg**, *déclarés*, il y a 10 semaines. Aucune référence de station |
| Objectifs | **G1** (priorité 1) : HYROX Open dans **16 semaines**, cible « sous 1 h 25 ». **G2** (priorité 2) : force (soutien, maintien/progression). **G3** (priorité 3) : 10 km, sans date |
| Disponibilités | Lun 60 min · Mar 45 min (soir) · Mer 60 · **Jeu indisponible** · Ven 60 · Sam 90 (matin) · Dim 60. Maximum 5 séances, pas de double séance |
| Matériel | Salle commerciale : barre, disques (paires de 1,25 à 20 kg), rack, banc, haltères 2–36 kg, KB 8–24 kg, poulie, rameur, assault bike, tapis de course, wall balls 6 et 9 kg. **Pas de sled, pas de SkiErg, pas de sandbag** |
| Dernière séance réalisée | Dimanche précédent : sortie facile de 60 min |

## 1. [S1] Normalisation des entrées

| Constat | Traitement | Reason code |
|---------|-----------|-------------|
| Charges de la division HYROX : catégorie nécessaire | Catégorie déclarée à l'onboarding ; table officielle de la saison (données) | — |
| Stations sans matériel (sled push/pull, SkiErg, sandbag) | Substitutions à prévoir, avertissement anticipé | `EQUIPMENT.HYBRID_RACE_STATIONS_MISSING(sled,skierg,sandbag)` |
| Aucun RPE historique | Lecture de l'état **`unknown`** ; comportement par défaut identique à `normal` (`unknownPolicy = as_normal`), l'incertitude restant visible | `DATA.READINESS_UNKNOWN` |
| Cible « sous 1 h 25 » | **Aucune estimation possible** sans données de station : la cible est conservée, réévaluée après les benchmarks de la semaine 2 | `GOAL.TARGET_UNASSESSABLE_YET` |

Le moteur n'invente pas de temps HYROX « estimé » pour juger la cible.

## 2. [S2] AthleteState

| Élément | Valeur | Confiance | Justification |
|---------|--------|-----------|---------------|
| Allures de course (depuis le 10 km en 49:40) | seuil ≈ 4:58–5:06 /km ; facile ≈ 5:50–6:25 /km (modèle d’équivalence provisoire) | **high** | Course officielle, 5 semaines (< 6 : pas de pénalité), distance pertinente |
| e1RM squat | ≈ 113 kg | **low** | 5RM déclaré (source faible) + 10 semaines (−1 cran) |
| e1RM développé couché | ≈ 90 kg | **low** | Idem |
| Stations HYROX | aucune | **none** | Benchmarks à planifier |
| Exposition de course (E3) | 28 j : ≈ 95 min/sem en moyenne ; dernière sortie longue : 60 min dimanche | measured | Journal |
| Fraîcheur | `locomotor_impact` : dernière demande `high` dimanche (sortie de 60 min) ; autres structures fraîches | — | |
| Lecture de l'état | **`unknown`** (programmation par défaut comme `normal`) | — | `DATA.READINESS_UNKNOWN` |
| Statut d'entraînement | musculation : intermédiaire (medium) ; course : intermédiaire (high) ; HYROX : débutant spécifique (low) | | |

## 3. [S3] Arbitrage des objectifs

- G1 (HYROX, 16 semaines) : faisable, horizon suffisant pour une séquence complète.
- G2 (force) : rôle `development` en phase générale, puis `maintenance`.
- G3 (10 km) : **pas de bloc dédié** ; le travail de course sert G1 et entretient G3. Une réévaluation est proposée après l'événement (`GOAL.SECONDARY_ABSORBED(G3→G1)`).
- Faisabilité globale : 5 séances × durées ≥ minimums des archétypes ⇒ OK.

## 4. [S4] Cycle (macro / méso)

| Semaines | Phase | Rôles (HYROX / course / muscu) | Particularités |
|----------|-------|---------------------------------|----------------|
| 1–4 | Générale | development / development / development | S1–S2 : **benchmarks de stations** (sur substituts) ; S4 allégée |
| 5–8 | Développement | development / development / maintenance | S8 allégée + **simulation partielle** (test) + retest 5 km |
| 9–14 | Spécifique | development (spécificité élevée) / development (race pace) / maintenance | S10 et S13 : simulations partielles ; **S11 : simulation complète** (`fullSimPolicy` : premier HYROX, niveau intermédiaire ⇒ une seule simulation complète dans le cycle, hors fenêtre finale) ; S12 : décharge **partielle** (HYROX et course allégés, musculation en maintien inchangée) |
| 15–16 | Affûtage | volume ↓, spécificité maintenue / volume ↓ / léger | Aucune simulation complète ; course en fin de S16 |

Reason codes : `PLAN.MACRO.PHASES(general=4,development=4,specific=6,taper=2)`, `PLAN.MACRO.DELOAD(w4=global, w8=global+test, w12=partial[hybrid_race,running])`, `PLAN.MACRO.FULL_SIM_SCHEDULED(w11)`.

## 5. [S5] Semaine 1

### 5a. Quotas
N = 5. Minimums efficaces des rôles `development` (ruleset) : musculation 2, course 2, HYROX 1 ⇒ total 5. Pas de reste à répartir.
`PLAN.QUOTA.ALLOCATED(strength=2, running=2, hybrid_race=1)`.

### 5b. Demandes des moteurs

| Id | Moteur | Priorité | Variantes (de la plus spécifique à la plus compatible) | Préférences de placement |
|----|--------|----------|-------------------------------------------------------|--------------------------|
| R1 | Course | standard | `run_long` 65′ → `run_long` 60′ → `run_easy` 45′ | jour le plus long |
| R2 | Course | **key** | `run_threshold_cruise` (3 × 8′ au seuil) → `run_tempo` 20′ → `run_progression` | structures du bas du corps (`lower_knee`, `lower_hip`) fraîches |
| S1 | Muscu | standard | `strength_lower_heavy` → `strength_full_moderate` → `strength_upper_focus` | loin des séances clés de course |
| S2 | Muscu | standard | `strength_upper_plus_carry` → `strength_full_light` | — |
| H1 | HYROX | **key** | `hr_technique_plus_benchmarks` → `hr_technique` | — |

Profils de demande (extraits) :
- `run_long` : `locomotor_impact = high`, `lower_knee = moderate` ;
- `run_threshold_cruise` : `high_intensity_systemic = high`, `locomotor_impact = moderate`, `lower_knee = moderate` ;
- `strength_lower_heavy` : `lower_knee = high`, `lower_hip = high`, `axial = high` ;
- `hr_technique_plus_benchmarks` : `high_intensity_systemic = high` (test au rameur), `lower_knee = moderate`, `upper_pull = moderate`, `locomotor_impact = low`.

### 5c. Placement et 5d. interférences : ce que le solveur rejette et pourquoi

| Tentative (partielle) | Verdict | Règle |
|-----------------------|---------|-------|
| R1 `run_long` 65′ **samedi** (seul jour ≥ 65 min) + S1 `lower_heavy` **vendredi** soir | ❌ HARD : sortie longue 14 h après une demande « bas du corps » = `high` | I1 |
| S1 lundi + R2 mardi soir | ⚠️ faisable (24 h exactement) mais pénalité SOFT forte (I2) : la séance clé serait dégradée | I2 |
| H1 samedi + R1 `run_long` 60′ dimanche | ✔ faisable, mais score de spécificité plus faible (sortie longue raccourcie) | TARGET |
| **Solution retenue** (ci-dessous) | ✔ toutes les HARD ; meilleur score | — |

| Jour | Séance | A (dispo) | Justification (reason codes) |
|------|--------|-----------|------------------------------|
| Lun | **S2** `strength_upper_plus_carry` | 60 | `PLAN.SESSION.PLACED.LOW_LOWER_DEMAND_AFTER_LONG_RUN` (dimanche : `locomotor_impact = high`) |
| Mar | **R2** `run_threshold_cruise` (clé) | 45 | `PLAN.SESSION.SELECTED.THRESHOLD_EXPOSURE_REQUIRED{weekThreshold:0}` ; structures du bas du corps fraîches (lundi : haut du corps) |
| Mer | **S1** `strength_lower_heavy` | 60 | 24 h après le seuil (`lower_knee` moderate → high : L1 respecté) ; 72 h avant la sortie longue |
| Jeu | — (indisponible) | — | |
| Ven | **H1** `hr_technique_plus_benchmarks` (clé) | 60 | 48 h après S1 (high → moderate : L1 OK) ; `locomotor_impact = low` ⇒ compatible avec la sortie longue du lendemain |
| Sam | **R1** `run_long` 65′ | 90 | `PLAN.SESSION.PLACED.LONGEST_DAY` ; demande « bas du corps » de la veille = moderate (I1 ne concerne que `high`) |
| Dim | Repos | — | `PLAN.REST_DAY.PLACED` |

Contrôles de la semaine :
- **L2** : 2 séances à haute intensité (R2, H1) ≤ 3 (intermédiaire), non consécutives.
- **L3** : course prévue ≈ 42′ (R2, échauffement compris) + 65′ (R1) = 107′, contre une base de 95′ ⇒ **+13 %**, sous la zone de prudence (hypothèse : +20 %).
- Jonction avec la semaine précédente (dimanche, sortie de 60′) : OK.

## 6. [S6] Intentions figées (durées cibles)

| Séance | Profil de tolérance | A | Marge | T | Plage de p50 |
|--------|---------------------|---|-------|---|--------------|
| S2 lundi | `strength_sets` | 60 | 6 | 54 | 48,6–56,7 |
| R2 mardi | `fixed_time` | 45 | 3 | 42 | 39,9–43,3 |
| S1 mercredi | `strength_sets` | 60 | 6 | 54 | 48,6–56,7 |
| H1 vendredi | `mixed` | 60 | 5 | 55 | 49,5–57,8 |
| R1 samedi | `fixed_time` (sortie au temps) | 90 | — | 65 (volume) + 10 (échauffement et retour au calme) | ≤ 90 |

## 7. [S7 → S11] Génération détaillée de la séance du lundi (S2)

**Squelette** `strength_upper_plus_carry` : échauffement → principal `push_horizontal` → secondaire `pull_vertical` → accessoires (superset `pull_horizontal` + `push_vertical`) → soutien HYROX `carry` (+ gainage anti-rotation en superset) → retour au calme.

**Filtrage et sélection (extraits de trace)** :

| Emplacement | Candidats admissibles | Choisi | Raisons |
|-------------|----------------------|--------|---------|
| `push_horizontal` (principal) | développé couché barre, développé haltères, pompes lestées… | **Développé couché barre** | `SELECT.EXERCISE.CHOSEN{anchor_candidate, equipment_ok, reference_available}` : devient l'**ancre** du mésocycle (répétition prévue `progression_anchor`) |
| `pull_vertical` | tractions, tirage poulie | **Tractions** | marqueur « 10 tractions strictes » ; pertinence grip / HYROX |
| `pull_horizontal` | rowing haltère, rowing poulie assis | **Rowing haltère unilatéral** | même station que le développé militaire haltères (logistique) |
| `push_vertical` | développé militaire haltères, barre | **Développé militaire haltères** | superset possible sans changement de station |
| `carry` | farmers haltères, farmers KB | **Farmers carry haltères** | `relevance.hybrid_race = 3` (station), charges suffisantes (36 kg max) |
| gainage | Pallof press poulie, planche | **Pallof press** | anti-rotation, complète le porté |

Filtrés (agrégés) : `SELECT.FILTERED.EQUIPMENT{landmine:1}`.

**Paramétrage** :
- Développé couché : e1RM ≈ 90 kg, **confiance faible** ⇒ `rpe_based` : 4 × 6, **RIR 2**, charge suggérée = 90 × ~0,79 ≈ 71 ⇒ **70 kg** (réalisable avec des paires de 1,25 kg sur une barre de 20 kg). Montée en charge : barre × 8, 40 × 5, 55 × 3, 62,5 × 1. Repos 150 s.
  `DOSE.LOAD.RPE_BASED_LOW_CONFIDENCE{suggested:70}`.
- Tractions 4 × 6–8, RIR 2, repos 120 s.
- Superset rowing haltère 3 × 10/côté + militaire haltères 3 × 10, RIR 2, repos 75 s.
- Farmers 4 × 50 m (2 × 32 kg) + Pallof 4 × 10/côté, repos 60 s.

**Calcul de durée (p50)** :

| Bloc | Détail | Durée |
|------|--------|-------|
| Échauffement | rameur 3′ + mobilité épaules 4′ | 7′00 |
| Développé couché | installation 90 s + montée (17 reps × 3 s + 3 × 60 s + 3 changements × 30 s = 321 s) + travail (4 × 6 × 3,5 s = 84 s + 3 × 150 s × 1,1 = 495 s) | 16′30 |
| Transition | station fixe → barre de traction | 1′30 |
| Tractions | 30 s + 4 × 7 × 3 s + 3 × 120 s × 1,1 | 8′30 |
| Transition | | 1′30 |
| Superset haltères | 60 s + 3 × (rowing 50 s + militaire 30 s + 20 s) + 2 × 75 s × 1,1 | 8′45 |
| Transition | | 1′00 |
| Farmers + Pallof | 30 s + 4 × (40 s + 40 s + 15 s) + 3 × 60 s | 9′50 |
| Retour au calme | | 4′00 |
| **Total** | | **p50 ≈ 58,6′**, p90 ≈ 64′ |

⇒ **Hors tolérance** (p50 > 56,7, et p90 > A = 60). Ajustement (doc 07 §3.3) :

| Levier | Effet | p50 | p90 |
|--------|-------|-----|-----|
| Superset haltères 3 → 2 tours (plancher de l'archétype : 2) | −3′02 | 55,6 | 60,8 |
| Farmers + Pallof 4 → 3 tours | −2′35 | **53,0** | **57,5** |

Résultat : p50 = 53′ ∈ [48,6 ; 56,7] ✔, p90 = 57,5′ ≤ 60 ✔. Développé couché et tractions intacts.
`DURATION.ADJUSTED{levers:[reduce_sets(superset_db), reduce_sets(carry)]}`.

**RecoveryCheck** : demande réelle `upper_push = high`, `upper_pull = high`, `grip = moderate`, `axial = moderate` (farmers), bas du corps = `low` ⇒ compatible avec le seuil du mardi (I1 non concerné) ✔.
**DuplicateCheck** : historique 28 j sans séance de musculation similaire ⇒ `none` ✔.

**Rapport de validation** :
```json
{
  "status": "VALID_WITH_WARNINGS",
  "errors": [],
  "warnings": [],
  "infos": [
    { "code": "DOSE.LOAD.RPE_BASED_LOW_CONFIDENCE", "params": { "exercise": "ex.barbell_bench_press", "suggestedKg": 70 } },
    { "code": "DATA.READINESS_UNKNOWN" }
  ],
  "optimization": { "B1": 0.82, "B2": 0.9, "B5": 0.93 },
  "rulesetVersion": "0.1.0-provisional", "engineVersion": "0.1.0", "catalogVersion": "0.1.0"
}
```
(Les éléments d'information peuvent alimenter `warnings` avec une sévérité `info` : choix d'implémentation.)

**Ce que voit l'utilisateur** :

```
AUJOURD'HUI
HAUT DU CORPS + PORTÉS · 53 min

Développé couché
4 × 6 · 70 kg · garde 2 reps en réserve · Repos 2:30
☐ Série 1   ☐ Série 2   ☐ Série 3   ☐ Série 4
(échauffement : barre ×8 · 40 ×5 · 55 ×3 · 62,5 ×1)
```

## 8. Aperçu des autres séances de la semaine 1

| Séance | Contenu | p50 / A | Remarques |
|--------|---------|---------|-----------|
| R2 mar. — Seuil | Échauffement 10′ (facile + 4 accélérations) · 3 × 8′ à **4:58–5:06 /km** (ou « difficile mais contrôlé ») · récup 2′ trot · retour au calme 4′ (10 + 24 + 4 + 4) | 42′ / 45 | Allures `high` confiance ; `run_threshold_cruise` ouvre une **série de progression** (répétition prévue) |
| S1 mer. — Bas du corps lourd | Squat 4 × 5 RIR 2 (**charge suggérée** ≈ 113 × ~0,81 ≈ 90 kg, confiance faible) · RDL 3 × 8 · fentes haltères 3 × 10 · leg curl + gainage en superset | 54′ / 60 | Squat = ancre ; fentes = soutien HYROX (préparent la station sandbag) |
| H1 ven. — Technique HYROX + benchmarks | Échauffement 10′ · technique wall ball (EMOM 8′, 9 kg) · burpee broad jump (technique, 3 × 5) · **benchmark rameur 1000 m** · poussée : fentes marchées lourdes + sprint assault bike (**substitut sled push, fidélité faible**) · retour au calme | 53′ / 60 | `SELECT.SUBSTITUTION_LOW_FIDELITY(sled_push)` ; `STATE.BENCHMARK_SCHEDULED(row_1000)` ; pas de SkiErg ⇒ benchmark SkiErg remplacé, avec avertissement |
| R1 sam. — Sortie longue | 65′ en zone facile (5:50–6:25 /km, conversation possible) | 65′ / 90 | Hausse de la sortie longue bornée (+5′ par rapport à la précédente) |

**Validation de la semaine** : `VALID_WITH_WARNINGS` (substitution de faible fidélité, lecture de l'état inconnue). Aucune erreur.

## 9. Évolution : aperçu de la semaine 11 (spécifique, simulation complète)

Quotas : HYROX 2, course 2, musculation 1 (maintien).

| Jour | Séance | Pourquoi |
|------|--------|----------|
| Lun | Muscu `strength_full_moderate` (maintien, faible volume du bas du corps) | Maintien de G2 sans nuire à la simulation |
| Mar | Course `run_race_pace` (segments de 1 km à l'allure cible HYROX) | Spécificité ; > 72 h avant la simulation |
| Mer | HYROX `hr_compromised_run` court | Dernière séance spécifique ; ensuite structures du bas du corps libres jusqu'à samedi (I5) |
| Jeu | — | |
| Ven | Course `run_easy` 30′ | Veille de séance clé : demande faible uniquement (I5) |
| Sam | **HYROX `hr_full_sim`** (seule simulation complète du cycle selon `fullSimPolicy`) | `PLAN.MACRO.FULL_SIM_SCHEDULED` ; substitutions pour les stations sans matériel, signalées |
| Dim | Repos | Récupération après la simulation |

Les résultats de la simulation alimentent l'estimation du temps de course et, **pour la première fois avec des données suffisantes**, l'évaluation de la cible « sous 1 h 25 ». Le moteur propose de la conserver ou de l'ajuster ; il ne la modifie pas seul.

## 10. Ce que l'exemple démontre

1. La semaine n'est pas un template : elle résulte des quotas, des variantes, des contraintes (I1 a exclu la combinaison « jambes le vendredi, sortie longue le samedi ») et du score.
2. Les données peu fiables (e1RM déclarés) ne produisent pas de fausse précision : RIR prioritaire, charge suggérée, calibration.
3. La durée affichée est calculée, puis **ajustée** pour tenir dans le temps disponible, sans toucher au stimulus principal.
4. Les manques de matériel sont traités par des substitutions à fidélité explicite et des avertissements, jamais par une séance fictive.
5. Chaque décision est traçable par des reason codes.
