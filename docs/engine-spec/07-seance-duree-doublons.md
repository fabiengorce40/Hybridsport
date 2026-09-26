# 07 — Génération de séance, DurationEngine, DuplicateDetectionEngine

## 1. Pipeline de génération d'une séance (commun aux 4 moteurs)

Le pipeline est implémenté une seule fois dans `session/`. Les moteurs de discipline fournissent les **stratégies** de chaque étape : squelette, score, tables de paramétrage.

```
SessionRequest (intention placée par le planificateur)
  → [1] SessionIntent
  → [2] SessionSkeleton
  → [3] ExerciseCandidates
  → [4] ConstraintFiltering
  → [5] ExerciseSelection
  → [6] Parameterization
  → [7] DurationEstimation (+ ajustement)
  → [8] RecoveryCheck
  → [9] DuplicateCheck
  → [10] SessionValidation ──INVALID──► RepairEngine ──► [10] (≤ N)
  → [11] FinalSession
```

| # | Étape | Entrée | Traitement | Sortie | Reason codes typiques |
|---|-------|--------|-----------|--------|-----------------------|
| 1 | **SessionIntent** | Intention placée + `WeekContext` | Fige l'archétype, le stimulus, la priorité, la durée cible, les notes du planificateur (ex. `avoid_high_lower_body`), l'intention de répétition éventuelle | `SessionIntent` | `PLAN.SESSION.SELECTED.*` |
| 2 | **SessionSkeleton** | Archétype | Blocs ordonnés, rôle de chaque bloc (principal, secondaire, support), **emplacements** avec leurs exigences (pattern, région, polyarticulaire, modalité), leviers de compression | `Skeleton` | `SESSION.SKELETON.*` |
| 3 | **ExerciseCandidates** | Emplacements + catalogue | Requêtes indexées (pattern × modalité) ; inclut les exercices « ancres » des progressions en cours | Candidats par emplacement | — |
| 4 | **ConstraintFiltering** | Candidats | Retrait (HARD) : matériel et caractéristiques, restrictions, zones douloureuses actives, exclusions de l'utilisateur, niveau technique, éligibilité à l'effort maximal, statut `deprecated`. Chaque rejet est tracé de façon agrégée (compteurs par raison) | Candidats admissibles | `SELECT.FILTERED.EQUIPMENT`, `.RESTRICTION`, `.SKILL` |
| 5 | **ExerciseSelection** | Candidats admissibles + contexte cumulatif | Score par niveau de priorité (doc 01 §4) : continuité de progression, spécificité, fatigue (notes du planificateur, fraîcheur), anti-doublon (pénalité de similarité **hors répétition prévue**), préférences, logistique. Sélection **gloutonne emplacement par emplacement** dans l'ordre d'importance, avec un contexte cumulatif (ce qui est déjà choisi influence la suite : pas deux exercices de la même famille dans la séance sauf intention), puis **une passe d'amélioration locale** (échange d'un candidat si le score global s'améliore). Départage par graine | Exercices choisis + alternatives pré-validées (2–3 par emplacement) | `SELECT.EXERCISE.CHOSEN(reasons…)` |
| 6 | **Parameterization** | Exercices + capacités + tables | Séries, reps, charge ou effort, repos, tempo, allures, intervalles, time cap, schéma de WOD calibré (doc 06). Arrondi au réalisable | Prescriptions | `DOSE.*` |
| 7 | **DurationEstimation** | Séance paramétrée + profil de timing de l'athlète | Estimation p50/p90 (§2) ; si hors tolérance ⇒ **ajustement** par leviers (§3) puis nouvelle estimation | `DurationEstimate` | `DURATION.*` |
| 8 | **RecoveryCheck** | Séance + semaine projetée + `freshness` | Recalcule le `DemandProfile` **réel** de la séance générée (il peut différer de celui de la variante) et revérifie L1, L2 et les règles I* avec les séances voisines | Conforme / violations | `RECOVERY.*` |
| 9 | **DuplicateCheck** | Empreinte + historique 28 j + intentions de répétition | Similarités (§4) ; distingue répétition prévue et accidentelle | Constat / violations | `DUPLICATE.*` |
| 10 | **SessionValidation** | Séance complète | SessionValidator (doc 09) | `VALID` / `VALID_WITH_WARNINGS` / `INVALID` | — |
| 11 | **FinalSession** | Séance validée | Ajout de la provenance (versions, graine), de l'empreinte et des objectifs affichables | `Session` | — |

Les étapes 5 et 7 intègrent déjà une partie de l'anti-doublon et de la durée. Les étapes 8 et 9 servent de **contrôles de sécurité** : en fonctionnement normal, elles ne trouvent rien. Un taux de violation élevé à ces étapes est un signal d'observabilité (doc 10).

## 2. DurationEngine : estimation

### INPUTS
Séance paramétrée, `AthleteTimingProfile` (facteurs personnels calibrés : dépassement des repos, transitions, débit de travail), catalogue (`timing`, `workRate`), ruleset (valeurs par défaut).

### DECISION PROCESS : modèle par composant

| Composant | Calcul (p50) | Incertitude |
|-----------|-------------|-------------|
| Série de musculation | `reps × secondsPerRep.typical` (plage selon le tempo) | faible |
| Repos entre séries | `restAfterS × restOverrunFactor` (≥ 1, calibré) | moyenne |
| Montée en charge | Σ (reps × s/rep + repos court + changement de charge) | faible |
| Installation d'un exercice | `setupS` | faible |
| Changement de charge | `loadChangeS × nombre de changements` | faible |
| Transition entre exercices | coût selon les classes de transition (même station : ~0 ; station fixe → autre station fixe : élevé) | moyenne |
| Superset / circuit | `rounds × (Σ travail + transitions internes) + (rounds − 1) × repos entre tours` | moyenne |
| EMOM / AMRAP / intervalles au temps | durée exacte | nulle |
| For Time / rounds / chipper | Σ (volume / débit(niveau)) + transitions, **plafonné par le time cap** ; p90 depuis `workRate.p90Slow` | élevée (p90 = time cap) |
| Course au temps | durée exacte | nulle |
| Course à la distance | distance × allure prévue (p90 : allure lente de la plage) | moyenne |
| Station HYROX | distance ou reps / débit de station | moyenne à élevée |
| Échauffement / retour au calme | durée prescrite (minimum incompressible de l'archétype) | faible |
| Transition entre blocs + lecture des consignes | constantes par bloc (ruleset) | faible |

Propagation : p50 = somme des p50 des blocs ; incertitude combinée par bloc (hypothèse d'indépendance partielle, documentée) ⇒ p10 / p90.

### OUTPUTS
```ts
interface DurationEstimate { p10: number; p50: number; p90: number; byBlock: { blockId: ID; p50: number; p90: number }[]; confidence: Confidence; assumptions: ReasonCode[]; }
```
La durée affichée est le **p50 arrondi à la minute** (arrondi à 5 min en aperçu).

### Calibration
- Pour chaque séance réalisée, on compare la durée réelle par bloc à l'estimation.
- Les facteurs personnels (`restOverrunFactor`, `transitionFactor`, débits de travail par mouvement) sont mis à jour par **lissage borné**, après un minimum de 3 séances comparables (paramètre).
- Globalement, l'erreur médiane par archétype sert à corriger les valeurs par défaut du ruleset (nouvelle version).

## 3. DurationEngine : tolérance et ajustement

### 3.1 Trois notions distinctes (C8)

| Notion | Définition | Nature |
|--------|-----------|--------|
| **Temps disponible** `A` | Ce que l'utilisateur a déclaré pour ce jour ou ce créneau (ou « je n'ai que X min ») | Contrainte **HARD** : `p90 ≤ A` |
| **Durée cible** `T` | Durée visée par le planificateur, `T ≤ A − marge`. La marge dépend de l'incertitude de l'archétype | TARGET |
| **Tolérance** | Plage acceptable de p50 autour de T, par profil de séance | SOFT (hors plage ⇒ ajustement) |

### 3.2 Profils de tolérance (hypothèses de départ, `provisional`)

| Profil | Archétypes | Plage de p50 | Marge `A − T` |
|--------|-----------|-------------|---------------|
| `fixed_time` | EMOM, AMRAP, intervalles et course au temps | `[T − 5 %, T + 3 %]` | faible (≈ 2–3 min) |
| `strength_sets` | Musculation | `[T − 10 %, T + 5 %]` | moyenne (≈ 5–8 min) |
| `distance_based` | Course à la distance | `[T − 10 %, T + 5 %]` | selon l'incertitude sur l'allure |
| `for_time` | WOD For Time, simulation HYROX | `[T − 15 %, T + 5 %]` | time cap inclus dans le calcul de p90 |
| `mixed` | HYROX spécifique, force + metcon | `[T − 10 %, T + 5 %]` | calculée |

L'**asymétrie** est volontaire : finir 5 minutes plus tôt est acceptable, dépasser le temps disponible ne l'est pas.

**Exemple : « 60 minutes disponibles », séance de musculation**
- `A = 60 min` ⇒ contrainte : p90 ≤ 60.
- Marge `strength_sets` de ≈ 6 min ⇒ `T = 54 min`.
- Plage de p50 acceptée : `[48,6 ; 56,7]`, donc environ 49–57 min.
- Affichage : « 55 min ». Dans 9 cas sur 10, la séance tient dans les 60 minutes.
- Si l'utilisateur a seulement dit « séance de 60 minutes » sans contrainte stricte, `A` = 60 + tolérance déclarée ; le **comportement par défaut** reste « 60 = temps disponible total » (décision à valider n° 21).

### 3.3 Stratégie d'ajustement (réduction ou augmentation)

Chaque bloc déclare des **leviers de compression**, ordonnés par l'archétype, qui préservent l'intention :

```ts
type CompressionLever =
  | { kind: 'drop_optional_block' }                          // finisher
  | { kind: 'reduce_sets'; min: number }                     // plancher par exercice
  | { kind: 'superset_accessories' }                         // gain de temps sans perte de volume
  | { kind: 'reduce_rest'; floorS: number }                  // jamais sous le minimum du stimulus
  | { kind: 'drop_accessory'; keepAtLeast: number }
  | { kind: 'shorten_conditioning'; minS: number }           // rounds, time cap
  | { kind: 'reduce_run_volume'; minS: number }
  | { kind: 'reduce_main_volume'; min: number };             // dernier recours ⇒ reason code visible
```

**Hiérarchie de réduction par défaut** (chaque discipline peut la surcharger ; elle est relue par l'expert) :
1. Préserver le **stimulus principal** : le bloc de rôle `primary` n'est touché qu'en dernier.
2. Préserver les **exercices prioritaires** : ancres de progression, spécificité.
3. Retirer le finisher optionnel.
4. Passer les accessoires en supersets.
5. Réduire les séries d'accessoires jusqu'au plancher.
6. Raccourcir les blocs secondaires.
7. Réduire les repos **non critiques** (accessoires) ; jamais les repos du travail lourd ou de qualité.
8. Retirer un accessoire (en gardant le minimum de l'archétype).
9. En dernier recours, réduire le volume principal (`DURATION.MAIN_VOLUME_REDUCED`, visible pour l'utilisateur).
10. Si `T` reste inférieur au **minimum de l'archétype** ⇒ changer d'archétype, ou `NO_VALID_SOLUTION` + alternatives.

Jamais : supprimer l'échauffement ou le descendre sous son minimum.

**Augmentation** (séance trop courte) : on ajoute dans l'ordre inverse, **seulement si c'est pertinent** (plage L5 non atteinte, pattern sous-exposé, finisher cohérent avec le stimulus) et sans dépasser L4 ni la demande prévue par le planificateur. Sinon, la séance reste plus courte et affiche sa vraie durée : on ne remplit pas pour remplir.

**Algorithme** : on applique les leviers dans l'ordre, un pas à la fois, en réestimant à chaque pas (O(leviers × blocs)), jusqu'à ce que p50 soit dans la plage et p90 ≤ A. Le nombre de pas est borné.

**Exemple : 60 → 45 min (musculation, accent bas du corps)**

Nouveau temps disponible : `A = 45` ⇒ `T ≈ 40` (marge ≈ 5 min) ⇒ plage de p50 `[36 ; 42]` et contrainte `p90 ≤ 45`.

| Étape | Action (levier) | p50 | p90 | Conforme ? |
|-------|-----------------|-----|-----|------------|
| Initial | Squat 4×5 (+ montée en charge), RDL 3×8, fentes 3×10, leg curl 3×12, gainage 3×, finisher 6 min | 55 | 60 | non |
| 1 | Retrait du finisher optionnel | 51 | 56 | non |
| 2 | Leg curl + gainage en superset | 48 | 52 | non |
| 3 | Fentes 3 → 2 séries (plancher 2) | 45,5 | 49 | non |
| 4 | Repos des accessoires 90 → 60 s (repos du squat et du RDL inchangés) | 43,5 | 46,5 | non (p90) |
| 5 | Leg curl 3 → 2 séries | 41,5 | 44,5 | **oui** |

Le squat 4×5 et le RDL 3×8 (stimulus principal) sont **intacts**. Reason codes : `DURATION.ADJUSTED(levers=[drop_optional, superset, reduce_sets×2, reduce_rest_accessory])`.

## 4. DuplicateDetectionEngine

### INPUTS
Empreinte de la séance candidate, empreintes de l'historique (réalisées sur 28 j + prévues de la semaine), `RepetitionIntent` déclarés, ruleset (poids, seuils).

### Empreinte

```ts
interface SessionFingerprint {
  discipline: Discipline; archetypeId: string; stimulus: StimulusId; format?: WodFormat;
  exercises: ExerciseId[]; families: FamilyId[]; equivalences: EquivalenceId[];
  patterns: Record<PatternId, number>;            // volume normalisé
  muscles: Record<MuscleId, number>;              // séries difficiles normalisées
  structure: { kind: Block['kind']; format?: string; minutes: number }[];
  energy: { low: number; moderate: number; high: number };   // parts E5 prévues
  timeDomain?: 'short' | 'medium' | 'long';
  repScheme?: string;                              // '21-15-9', '5x5'…
}
```

### DECISION PROCESS : similarité multidimensionnelle

| Composante | Mesure | Plage |
|------------|--------|-------|
| `exercise_similarity` | Jaccard pondéré sur exercices (1), classes d'équivalence (0,8), familles (0,6) | 0–1 |
| `movement_similarity` | Cosinus des vecteurs de patterns | 0–1 |
| `muscle_similarity` | Cosinus des vecteurs de muscles | 0–1 |
| `structure_similarity` | Alignement de la séquence de blocs (type, format, durées) | 0–1 |
| `stimulus_similarity` | Égalité du stimulus (1) ou stimulus voisin (table) | 0–1 |
| `energy_system_similarity` | 1 − distance entre les répartitions d'intensité | 0–1 |
| `session_format_similarity` | Format + domaine de temps + schéma de reps | 0–1 |

`SimilarityScore = Σ wᵢ · composanteᵢ` avec des poids **par discipline** (ruleset). Le détail par composante (`SimilarityBreakdown`) est **toujours conservé** : le score seul ne suffit pas pour expliquer.

### Répétition prévue ou accidentelle

```ts
type RepetitionIntent =
  | { kind: 'progression_anchor'; trackId: ID }         // même exercice principal sur tout le mésocycle
  | { kind: 'progression_series'; seriesId: ID; index: number }   // même séance-type qui progresse (ex. seuil 4×8' → 4×9' → 3×12')
  | { kind: 'benchmark_retest'; benchmarkId: string }
  | { kind: 'recurring_slot'; slotKey: string }          // « la sortie longue du dimanche »
  | { kind: 'deload_mirror'; ofSessionId: ID };          // la décharge reprend la séance allégée
```

- L'intention est **déclarée au moment de la planification** par le moteur qui la crée (GlobalPlanner, moteur de discipline ou ProgressionEngine). Elle n'est jamais inférée *a posteriori* pour « excuser » une similarité.
- **Répétition prévue** : la similarité est attendue sur les composantes couvertes par l'intention (ex. `exercise_similarity` pour une ancre). Elle est **exemptée de pénalité sur ces composantes seulement** ; les autres composantes restent évaluées. Contrôle supplémentaire : une répétition prévue doit présenter une **évolution de prescription** (charge, reps, volume, densité…) ou une justification (décharge, retest). Sinon `DUPLICATE.PLANNED_BUT_STAGNANT` (avertissement). C'est le détecteur de stagnation artificielle.
- **Répétition accidentelle** : similarité au-dessus d'un seuil sur des composantes **non couvertes** par une intention.

### Décision (le score ne remplace jamais automatiquement une séance)

| Situation | Effet |
|-----------|-------|
| Accidentelle, au-dessus du seuil `warn` | Pénalité SOFT (déjà appliquée en sélection) + avertissement |
| Accidentelle, au-dessus du seuil `hard` (ex. même WOD, similarité ≥ 0,9, dans une fenêtre de 21 j) | HARD ⇒ RepairEngine (remplacement ciblé d'exercices ou de format) |
| Prévue, avec évolution | Aucune pénalité |
| Prévue, sans évolution | Avertissement « stagnation » ⇒ ProgressionEngine |
| Matériel très limité (toutes les alternatives sont similaires) | Relâchement tracé `DUPLICATE.RELAXED_EQUIPMENT_LIMITED` : on varie le dosage, le tempo ou le format plutôt que d'inventer |

### OUTPUTS
`DuplicateReport { breakdown per comparison, maxSimilarity, classification: 'none' | 'planned' | 'accidental_warn' | 'accidental_hard', stagnationFlags }`.

### FAILURE MODES
Catalogue trop pauvre pour un profil de matériel ⇒ relâchement tracé + alerte de couverture catalogue (observabilité) ; historique absent ⇒ pas de contrôle (rien à comparer), aucune erreur.
