# 01 — Périmètre, entrées, sorties, pipeline

## 1. Périmètre (scope)

### 1.1 Objectifs V1 supportés

Un objectif musculation = un **profil d'objectif** (`strengthGoal`). Il ne détermine pas la structure de la séance (c'est l'archétype) mais le **dosage**, la **priorité des besoins** et le **modèle de progression**.

| `strengthGoal` | Intention | Ce qui le distingue réellement | Modèle de séance unique ? |
|----------------|-----------|--------------------------------|---------------------------|
| `strength` | Augmenter la force maximale sur des mouvements polyarticulaires | Emplacement principal à fort `loadCeiling`, reps basses, repos longs, montées en charge, progression de charge sur des ancres stables | Non |
| `hypertrophy` | Augmenter la masse musculaire | Volume hebdomadaire par groupe (E1, L5) au centre des décisions, plus d'accessoires et d'isolation, proximité de l'échec plus grande sur les exercices stables, double progression et progression de séries | Non |
| `general` | Développement musculaire général, santé, forme | Couverture équilibrée des patterns, volume modéré, faible complexité, progression simple | Non |
| `support` + `supportFor = running` | Complément à la course | Faible volume bas du corps, priorité à l'unilatéral, à la chaîne postérieure, aux mollets et au tronc ; excentrique lourd éloigné des séances de qualité ; aucun objectif d'hypertrophie des jambes | Non |
| `support` + `supportFor = hybrid_race` | Complément au HYROX | Poussées, tirages, fentes, portés, tolérance du grip ; **la spécificité des stations appartient au moteur HybridRace** : ici, force de base et robustesse | Non |
| `support` + `supportFor = crosstraining` | Complément au cross-training | Force de base (squat, hinge, développés) et tirage (préparation gymnique) ; **l'haltérophilie et les WOD appartiennent au moteur CrossTraining** | Non |

Les trois objectifs de soutien partagent un mécanisme : **un seul profil `support`**, avec une table d'accents par discipline soutenue (paramètre G2 `strength.support.emphasis`). Cela évite trois moteurs presque identiques, tout en empêchant le même modèle de séance pour tous : ce sont l'accent, le volume et les contraintes d'interférence qui changent.

Un athlète peut avoir un objectif principal et un objectif secondaire, par exemple `strength` principal et `hypertrophy` secondaire (profil S5). Les deux ont chacun leur rôle dans la couche B (B1 et B4). Le StrengthEngine ne décide pas de cet arbitrage : il le reçoit dans le contexte d'objectif.

### 1.2 Hors périmètre V1

| Sujet | Raison | Traitement |
|-------|--------|------------|
| Affûtage pour une compétition de force (powerlifting) | Programmation de pic très spécialisée | `SCOPE.OUT_OF_SCOPE` au niveau de l'objectif |
| Préparation de compétition de culturisme | Enjeux nutritionnels et de santé hors produit | Hors périmètre |
| Haltérophilie technique (arraché, épaulé-jeté) | Appartient au moteur CrossTraining ou à un produit dédié | Exercices `olympic` exclus des archétypes musculation V1 |
| Progressions de street workout avancé (planche, front lever) | Système de compétences spécifique | Les tractions et les dips restent des exercices ; pas de progression de compétence |
| Tests de 1RM réels | Risque et intérêt faibles en V1 ; éligibilité G1 | Remplacés par des séries de référence sous-maximales (RIR connu) |
| Techniques avancées (rest-pause, dégressives, clusters, entraînement basé sur la vitesse) | Complexité non nécessaire en V1 | Hors périmètre ; le schéma « série lourde + séries allégées » (`top_set` / `backoff`) reste disponible pour l'avancé |
| Périodisation ondulée quotidienne comme modèle distinct | Réalisée par l'alternance des stimulus de séance décidée par le planificateur (§4) | Pas de modèle dédié |
| Rééducation, travail à amplitude réduite pour douleur | Relève de G1 et d'un professionnel | Le CORE applique les restrictions (P1–P4) ; le moteur ne prescrit jamais d'amplitude thérapeutique |
| Plus de 4 séances de musculation par semaine | Pas nécessaire aux profils V1 | Plafond de fréquence (paramètre) ; au-delà ⇒ `PLAN.QUOTA.USER_REQUEST_INFEASIBLE` côté planificateur |

## 2. Entrées (inputs)

Le StrengthEngine reçoit le `SportEngineInput` du CORE (intention, profil, état, contraintes dérivées, catalogue, ruleset, historique d'empreintes, contexte) **et** un contexte propre à la discipline, `StrengthContext` (nécessite CORE-EXT-2, voir 07 §4).

```ts
/** Contexte propre à la musculation : fourni par l'application et le planificateur, validé par le moteur (schéma strict). */
interface StrengthContext {
  goal: { primary: StrengthGoalRef; secondary?: StrengthGoalRef };      // StrengthGoalRef = { goal, supportFor? }
  phase: { kind: 'accumulation' | 'intensification' | 'deload' | 'maintenance' | 'transition'; weekInMesocycle: number; mesocycleLength: number };
  level: Level;                                    // statut d'entraînement musculation (S6)
  levelConfidence: Confidence;
  capacities: StrengthCapacity[];                  // par exercice ou par classe d'équivalence (§10, doc 04)
  tracks: ProgressionTrackState[];                 // ancres et séries de progression actives (§8)
  recentExecutions: ExerciseExecutionSummary[];    // N dernières expositions par exercice (fenêtre paramétrée)
  exposures: { hardSetsD7: Record<MuscleId, number>; hardSetsD28: Record<MuscleId, number> };   // E1 (doc 04)
  week: WeekContext;                               // autres séances de la semaine (§14)
  preferences: { disliked: ExerciseId[]; liked: ExerciseId[]; weakModalityPreference?: EquipmentClass[] };
  equipmentIncrements?: Record<string, number[]>;  // incréments réalisables déclarés (kg), par équipement
}

interface WeekContext {
  strengthSessionsThisWeek: { intentId: ID; archetypeId: string; plannedHardSets?: Record<MuscleId, number>; done: boolean }[];
  neighbors: { discipline: Discipline; stimulus: string; priority: 'key' | 'standard' | 'optional';
               hoursFromThisSession: number; demand: Partial<Record<Structure, DemandLevel>> }[];
}
```

| Entrée | Source | Si absente |
|--------|--------|------------|
| Intention (archétype, stimulus, objectif, phase, temps, intentions de répétition, notes du planificateur) | GlobalPlanner, via le CORE | Refus de l'intention par le CORE |
| Contraintes dérivées (matériel, restrictions, zones de douleur, exclusions, `suspendHighIntensity`) | CORE | Impossible : fournies par le CORE |
| Capacités | Historique | Prescription RIR/RPE seule, calibration (§10) |
| Tracks | ProgressionEngine | Aucune ancre : première occurrence (§8) |
| E1 | Constructeur de l'AthleteState | Départ en bas de la plage L5 du niveau (doc 04 §3.1) |
| Contexte de semaine | GlobalPlanner | Hypothèse prudente : voisins inconnus traités comme `moderate` sur les structures du bas du corps, et `DATA.WEEK_CONTEXT_UNKNOWN` |
| Préférences | Profil | Aucune préférence |

**Données contradictoires** (ex. un 1RM déclaré incompatible avec les séries récentes) : `STATE.REFERENCE_CONFLICT`, confiance abaissée d'un cran (doc 04 §7), et les séries mesurées l'emportent sur la déclaration.

## 3. Sorties (outputs)

De 1 à 3 `SportEngineProposal` (contrat CORE), **ou** aucune proposition accompagnée de ses raisons (`NO_VALID_PROPOSAL`, nécessite CORE-EXT-3).

| Champ | Contenu pour la musculation |
|-------|-----------------------------|
| `session` | `SessionDraft` : blocs `warmup` / `strength` (principal, secondaire) / `accessory` / `cooldown`, prescriptions `sets` avec montées en charge (`rampup`), séries de travail, charge, RIR ou RPE (CORE-EXT-1), repos, leviers de l'archétype |
| `optimization` | B1 : couverture des besoins prioritaires de l'objectif. B2 : continuité des ancres et respect de la progression. B3 : préférences et adhérence. B4 : objectif secondaire. B5 : adéquation à la durée cible et au volume hebdomadaire. B6 : variété faible (le CORE y ajoute la pénalité anti-doublon) |
| `fingerprintInputs` | Stimulus (celui de l'intention), répartition énergétique du stimulus (table G2), format (`straight_sets`, `supersets`), volume par item = séries de travail, marqueurs de prescription par ancre (`<exercice>:load`, `:reps`, `:sets`) |
| `repetitionIntents` | Sous-ensemble des intentions de l'intention de séance (ancres, retests) |
| `reasons` | Décisions tracées (§21) |
| `parametersUsed` | Tous les paramètres `strength.*` lus |

**Plusieurs propositions** : la proposition principale, plus au maximum deux alternatives qui ne diffèrent **que** sur des emplacements non ancrés (autre modalité, autre accessoire). Le CORE choisit entre elles par la couche B et l'anti-doublon. Pourquoi : sans alternative, la pénalité anti-doublon du CORE ne peut rien changer. Nombre maximal : paramètre G4 `strength.proposals.max`.

## 4. Pipeline

Chaque étape est une fonction pure ; la graine est celle transmise par le CORE, et chaque étape en dérive une sous-graine par `fork(label)`.

| # | Étape | Entrée | Décision | Sortie | Validation | Échec |
|---|-------|--------|----------|--------|------------|-------|
| P1 | Contexte | `SportEngineInput` + `StrengthContext` | Validation stricte du contexte ; résolution de l'objectif, du niveau, de la phase et de la confiance des données | `ResolvedContext` | Schéma ; cohérence de l'intention (discipline `strength`) | `TECHNICAL.SCHEMA_INVALID` ⇒ aucune proposition |
| P2 | Archétype | Intention (`archetypeId`, `stimulus`) | Chargement de l'archétype ; vérification de sa compatibilité avec le niveau, l'objectif et le preset (faisabilité déclarée) | Archétype | `archetypeIssues` du CORE ; niveau admis | `PLAN.ARCHETYPE_NOT_APPLICABLE` |
| P3 | Besoins de mouvement | Archétype + objectif + notes du planificateur + contexte de semaine | Priorité de chaque besoin (requis / optionnel / exclu par le contexte) | Liste ordonnée de besoins | Au moins un besoin principal non exclu | `PLAN.CONTEXT_INCOMPATIBLE` |
| P4 | Emplacements | Besoins + rôles | Exigences de chaque emplacement (pattern, polyarticulaire, types de mouvement), préférence de modalité, nombre d'exercices | Emplacements instanciés | Schéma `SessionArchetype` | — |
| P5 | Candidats | Emplacements + catalogue + contraintes | Filtres HARD (§7.1) | Candidats par emplacement | `slotAccepts`, faisabilité matérielle | Emplacement requis sans candidat ⇒ repli (§17), sinon `SELECT.NO_CANDIDATE_FOR_SLOT` |
| P6 | Sélection | Candidats + ancres + historique + contexte | Tri lexicographique par rôle (§7.2), sélection gloutonne par ordre d'importance avec contexte cumulatif, puis passe d'amélioration locale | Exercices choisis + 2 à 3 alternatives prévalidées | Aucun exercice hors exigences ; pas deux fois la même famille sans intention | — |
| P7 | Dosage | Exercice + rôle + objectif + phase + niveau + lecture de l'état + contexte | Séries, reps, effort, repos (§9) | Prescriptions de travail | Bornes du ruleset ; L4 | — |
| P8 | Charge | Dosage + capacités | Mode de charge selon la confiance (§10) ; arrondi au matériel | Charge ou effort | Aucune charge NaN, ≤ 0 ou irréalisable | Charge maximale atteinte ⇒ `DOSE.LOAD.CAP_REACHED` (autre variable) |
| P9 | Montée en charge | Charge de travail + exercice + position dans la séance | Nombre de paliers, reps, charges, repos (§11) | Séries `rampup` | Elles ne comptent pas dans E1 | — |
| P10 | Repos et ordre | Prescriptions | Repos par rôle et par intensité ; ordre des exercices ; supersets autorisés sur les accessoires | Séance ordonnée | Minimum de repos du stimulus protégé | — |
| P11 | Budget de durée | Séance + DurationEngine du CORE | Construction dans le budget (§15) : ajout des emplacements optionnels tant que p50 ≤ borne haute ; séries vers le bas de la plage si le temps est serré | `SessionDraft` proche de la cible | p50 dans la tolérance avant le CORE (objectif, pas garantie) | Emplacement requis impossible dans le temps ⇒ `DURATION.TARGET_BELOW_ARCHETYPE_MIN` |
| P12 | Assemblage | Tout | Leviers de l'archétype, empreinte, marqueurs, reason codes, paramètres utilisés | 1 à 3 propositions | Contrôles propres (STR-V*, §20) exécutés en auto-contrôle ; le CORE les réexécute | — |
| → CORE | Acceptation, durée, empreinte, anti-doublon, validation, sélection, réparation | | | Résultat final | | |

> **Amendé par l'addendum V1.2** (doc 10 §9 : la compatibilité avec le matériel est calculée depuis l'équipement réel, jamais depuis le nom du préréglage).

**Contrôles propres de la discipline** (`extraChecks` du validateur CORE, exécutés par le CORE et non par le moteur) : STR-V1 à STR-V8 (06 §20). Le moteur les appelle aussi en auto-contrôle avant de proposer : c'est une aide, jamais une autorité.
