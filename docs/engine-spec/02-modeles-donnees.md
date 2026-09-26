# 02 — Modèles de données du moteur

Ces types forment le **contrat d'entrée et de sortie** du moteur (`packages/domain`). Ils complètent le modèle de persistance de la phase 1 (doc 02) sans le contredire. La couche applicative convertit les données persistées vers ces types.

Conventions :
- Unités canoniques : kg, m, s, s/km.
- Identifiants : chaînes stables.
- Les champs optionnels sont réellement optionnels : **aucune valeur par défaut n'est inventée dans le type**. Les défauts relèvent du ruleset et sont tracés.
- Les **unions discriminées** remplacent les objets remplis de `null`.

## 1. UserTrainingProfile

```ts
interface UserTrainingProfile {
  userId: ID;
  profileVersion: number;

  // IDENTITÉ SPORTIVE
  activeDisciplines: Discipline[];                  // 1..4 — 'strength' | 'running' | 'crosstraining' | 'hybrid_race'
  primaryDiscipline?: Discipline;                   // facultatif : sinon déduit de l'objectif de priorité 1
  experience: Partial<Record<Discipline, DisciplineExperience>>;
  currentFrequency: Partial<Record<Discipline, number>>;   // séances/semaine réalisées ces dernières semaines (déclaré, puis mesuré)

  // DONNÉES PERSONNELLES UTILES (toutes optionnelles)
  birthYear?: number;
  sex?: 'female' | 'male';                          // utile seulement pour les standards (divisions HYROX, normes) ; jamais requis
  bodyMassKg?: number;

  // SÉCURITÉ
  restrictions: Restriction[];                      // déclarées, sans diagnostic
  activePainReports: PainReport[];                  // signalements récents non résolus (doc 09 §7)
  readinessScreening: { completedAt: ISODate; flagged: boolean };   // questionnaire d'aptitude (type PAR-Q)

  // PRÉFÉRENCES
  preferences: TrainingPreferences;
}

interface DisciplineExperience {
  trainingAgeMonths?: number;
  selfRatedLevel?: 'novice' | 'beginner' | 'intermediate' | 'advanced';
  factualMarkers: Record<string, boolean | number>;  // ex. 'strict_pullups_max': 6, 'can_run_30min_continuous': true
  derivedLevel?: { level: Level; confidence: Confidence; reasons: ReasonCode[] };   // calculé par le moteur
}

type Level = 'novice' | 'beginner' | 'intermediate' | 'advanced';
type Confidence = 'high' | 'medium' | 'low' | 'none';

interface Restriction {                             // alignées sur les contraindicationTags du catalogue
  tag: 'no_impact' | 'no_overhead' | 'no_loaded_spinal_flexion' | 'no_deep_knee_flexion' | 'no_running'
     | 'no_jumping' | 'no_grip_intensive' | 'upper_body_only' | 'lower_body_only' | string;
  scope: 'permanent' | { until: ISODate };
  source: 'user_declared' | 'pain_report';
}

interface TrainingPreferences {
  excludedExercises: ExerciseId[];                  // HARD (choix explicite de l'utilisateur)
  dislikedExercises: ExerciseId[];                  // SOFT
  favoriteExercises: ExerciseId[];                  // TARGET
  preferredFormats?: Partial<Record<WodFormat, 'like' | 'dislike'>>;
  preferLongRunOn?: Weekday;
  prescriptionStyle?: 'load' | 'rpe' | 'rir';       // affichage souhaité ; le moteur garde les deux
}
```

## 2. Objectifs

```ts
interface Goal {
  id: ID;
  discipline: Discipline;
  type: GoalType;
  priority: 1 | 2 | 3;                              // 1 = principal (un seul), 2 = secondaire, 3 = maintien
  deadline?: ISODate;                               // compétition, course
  event?: { kind: 'race' | 'hybrid_race' | 'test'; distanceM?: number; division?: string; date: ISODate };
  current?: PerformanceValue;                       // performance actuelle connue (sinon inconnue ⇒ test ou estimation à faible confiance)
  target?: PerformanceValue;                        // performance cible
  status: 'active' | 'achieved' | 'abandoned' | 'paused';
}

type GoalType =
  | 'strength_max' | 'hypertrophy' | 'general_fitness' | 'body_recomposition_support'
  | 'run_5k' | 'run_10k' | 'run_half' | 'run_marathon' | 'run_general'
  | 'hybrid_race_finish' | 'hybrid_race_performance'
  | 'crosstraining_general' | 'crosstraining_competition';

type PerformanceValue =
  | { kind: 'time'; distanceM: number; timeS: number }            // 10 km en 50:00
  | { kind: 'load'; exerciseId: ExerciseId; reps: number; loadKg: number }
  | { kind: 'race_time'; timeS: number }                          // HYROX
  | { kind: 'benchmark'; benchmarkId: string; score: number; scoreType: ScoreType };
```

**Validation des objectifs (S3)** : un seul objectif de priorité 1, compatibilité avec les disciplines actives, échéance future, cible réaliste. Une cible irréaliste n'est pas refusée : elle est **signalée** avec une plage réaliste estimée et un niveau de confiance (`GOAL.TARGET_AMBITIOUS`). Le moteur ne remplace jamais l'objectif sans l'accord de l'utilisateur.

## 3. Disponibilités

```ts
interface Availability {
  weekly: DayAvailability[];                       // 7 entrées
  maxSessionsPerWeek: number;
  desiredSessionsPerWeek?: number;
  perDisciplineRequest?: Partial<Record<Discipline, number>>;  // « courir 3×, muscu 2× »
  allowDoubleSessions: boolean;
  minHoursBetweenDoubleSessions?: number;
  blackoutDates: { from: ISODate; to: ISODate; reason?: 'travel' | 'holiday' | 'other' }[];   // jours impossibles
  recurringConstraints: RecurringConstraint[];
  validFrom: ISODate;
}

interface DayAvailability {
  weekday: Weekday;
  available: boolean;
  maxMinutes?: number;                              // temps TOTAL disponible (échauffement et retour au calme compris)
  windows?: { slot: 'morning' | 'midday' | 'evening'; maxMinutes: number }[];   // si deux séances possibles
}

type RecurringConstraint =
  | { kind: 'no_hard_session_before'; weekday: Weekday }          // ex. match le samedi
  | { kind: 'fixed_session'; weekday: Weekday; discipline: Discipline; externalLabel: string; load: DemandProfile } // club de course du mardi (activité externe prise en compte)
  | { kind: 'max_minutes_every'; weekday: Weekday; minutes: number };
```

Toute modification de `Availability` produit un événement `availability_changed` → `AdaptationEngine` (doc 08).

## 4. EquipmentProfile

```ts
interface EquipmentProfile {
  id: ID; name: string;                            // « Salle », « Maison », « Vacances »
  items: EquipmentItem[];
  environment?: { runningSurface?: ('road' | 'track' | 'trail' | 'treadmill')[]; spaceForSled?: boolean; ceilingOkForWallBall?: boolean };
}

type EquipmentItem =
  | { type: 'bodyweight' }
  | { type: 'barbell'; barKg: number }
  | { type: 'plates'; availableKg: number[]; maxTotalKg?: number }           // paires disponibles ⇒ plus petit incrément réel
  | { type: 'rack' | 'bench' | 'adjustable_bench' | 'pullup_bar' | 'rings' | 'box' | 'jump_rope' | 'bands' | 'ghd' | 'landmine' }
  | { type: 'dumbbells'; kg: number[] }                                       // liste exacte ou plage + pas
  | { type: 'kettlebells'; kg: number[] }
  | { type: 'cable'; maxKg?: number }
  | { type: 'machine'; machineId: string }                                    // leg press, leg curl...
  | { type: 'rower' | 'skierg' | 'bike' | 'assault_bike' | 'treadmill' | 'unpowered_treadmill' }
  | { type: 'sled'; mode: 'push' | 'pull' | 'both'; maxLoadKg?: number; surface?: 'turf' | 'other' }
  | { type: 'wall_ball'; kg: number[] }
  | { type: 'sandbag'; kg: number[] }
  | { type: 'medicine_ball'; kg: number[] };
```

**Règles dérivées (FEASIBILITY, HARD)** :
- Un exercice n'est candidat que si **toutes** ses exigences de matériel sont satisfaites, y compris les caractéristiques : charge maximale disponible, incréments, espace.
- Une charge prescrite doit être **réalisable** avec le matériel : combinaisons de disques ou haltères disponibles. Arrondi au réalisable le plus proche en respectant l'intention ; si l'écart dépasse la tolérance, on change de schéma de répétitions ou d'exercice.
- Charge nécessaire supérieure à la charge maximale disponible ⇒ ajuster les répétitions, le tempo ou l'exercice (`EQUIPMENT.LOAD_CAP_REACHED`).

## 5. Session : modèle générique pour les quatre disciplines

```ts
interface Session {
  id: ID;
  discipline: Discipline;
  intent: SessionIntent;                            // pourquoi cette séance existe (doc 05, 07)
  objectives: ReasonCode[];                         // objectifs affichables (« développer le seuil », « force du bas du corps »)
  date: ISODate; slot?: 'morning' | 'midday' | 'evening';
  targetDurationS: number;
  estimatedDuration: DurationEstimate;
  blocks: Block[];
  demand: DemandProfile;                            // profil de demande prévu (doc 04, 05)
  fingerprint: SessionFingerprint;                  // doc 07
  validation: ValidationReport;
  provenance: { engineVersion: string; rulesetVersion: string; catalogVersion: string; seed: string; traceId: ID };
}

interface SessionIntent {
  archetypeId: string;                              // 'strength_lower_heavy', 'run_threshold_cruise', 'ct_mixed_modal_medium', 'hr_compromised_run'
  stimulus: StimulusId;                             // ce qui doit être développé
  priority: 'key' | 'standard' | 'optional';
  targetMinutes: { min: number; target: number; max: number };
  repetitionIntent?: RepetitionIntent;              // doc 07 §4 — répétition prévue
  constraintsFromPlanner: PlannerNote[];            // ex. 'avoid_high_lower_body' (voisinage d'intervalles)
}

type Block =
  | { kind: 'warmup'; items: Item[]; minDurationS: number }
  | { kind: 'activation'; items: Item[] }
  | { kind: 'skill'; items: Item[]; practiceTimeS: number }
  | { kind: 'strength'; items: Item[]; grouping: 'straight' | 'superset' | 'triset' | 'cluster' }
  | { kind: 'conditioning'; format: WodFormat; spec: ConditioningSpec }
  | { kind: 'running'; segments: RunSegment[] }
  | { kind: 'hybrid_station_work'; spec: HybridSpec }
  | { kind: 'accessory'; items: Item[]; grouping: 'straight' | 'superset' | 'circuit' }
  | { kind: 'finisher'; format: WodFormat; spec: ConditioningSpec; optional: true }
  | { kind: 'cooldown'; items: Item[]; minDurationS: number };

// Chaque bloc partage des métadonnées communes :
interface BlockMeta { id: ID; index: number; role: 'primary' | 'secondary' | 'support'; compressibility: CompressionLever[]; estimatedDurationS: number; }

interface Item { id: ID; exerciseId: ExerciseId; prescription: Prescription; restAfterS?: number; alternatives: ExerciseId[]; notes?: ReasonCode[]; progressionTrackId?: ID; }

type Prescription =
  | { type: 'sets'; sets: SetPrescription[] }                                   // musculation
  | { type: 'timed'; workS: number; restS?: number; rounds?: number; target?: Intensity }
  | { type: 'distance'; distanceM: number; target?: Intensity }
  | { type: 'calories'; calories: number; target?: Intensity }
  | { type: 'reps'; reps: number; load?: LoadTarget }                          // dans un WOD
  | { type: 'hold'; seconds: number }
  | { type: 'mobility'; seconds: number; sides?: 1 | 2 };

interface SetPrescription {
  kind: 'rampup' | 'working' | 'backoff' | 'amrap' | 'top_set';
  reps: number | { min: number; max: number };
  load?: LoadTarget;
  effort?: { rir?: number; rpe?: number };
  tempo?: string;                                   // '3-1-1-0'
  restAfterS: number;
}

type LoadTarget =
  | { kind: 'absolute'; kg: number; confidence: Confidence }               // charge calculée (e1RM connu)
  | { kind: 'percent_e1rm'; pct: number; resolvedKg?: number }
  | { kind: 'rpe_based'; rir: number; suggestedKg?: number }               // pas de référence fiable ⇒ l'effort guide, la charge est indicative
  | { kind: 'bodyweight' }
  | { kind: 'fixed_implement'; kg: number };                               // wall ball 6 kg, KB 16 kg

type Intensity =
  | { kind: 'pace'; secPerKm: { min: number; max: number }; zone: RunZone; confidence: Confidence }
  | { kind: 'zone'; zone: RunZone }                                        // quand l'allure n'est pas fiable
  | { kind: 'rpe'; value: number; descriptor: ReasonCode }                 // « facile, conversation possible »
  | { kind: 'erg_pace'; secPer500m?: number; watts?: number }
  | { kind: 'hr'; bpm: { min: number; max: number } };                     // réservé (pas en V1)

type RunSegment =
  | { kind: 'continuous'; by: 'time' | 'distance'; timeS?: number; distanceM?: number; intensity: Intensity; role: 'warmup' | 'main' | 'cooldown' }
  | { kind: 'intervals'; reps: number; work: { timeS?: number; distanceM?: number; intensity: Intensity }; recovery: { timeS: number; type: 'jog' | 'walk' | 'standing' }; sets?: { count: number; restS: number } }
  | { kind: 'progression'; timeS: number; from: Intensity; to: Intensity }
  | { kind: 'strides'; reps: number; timeS: number; recoveryS: number };

interface ConditioningSpec {                         // formats de cross-training (doc 06 §3)
  timeCapS?: number; rounds?: number; minutes?: number;
  items: Item[];
  scoreType?: 'time' | 'rounds_reps' | 'load' | 'calories' | 'none';
  expectedCompletionS?: { p50: number; p90: number };  // calculé par le DurationEngine
  scaling: { itemId: ID; options: ExerciseId[] }[];
}

interface HybridSpec {                               // HYROX
  structure: 'station_repeats' | 'run_station_alternation' | 'partial_sim' | 'full_sim';
  sequence: ({ run: RunSegment } | { station: Item })[];
  transitionsS: number;
}
```

Pourquoi cette forme : chaque type de bloc ne porte que ses champs pertinents. Le lecteur de séance (UI) affiche un rendu par type. Le validateur et le DurationEngine gèrent chaque cas de façon exhaustive (vérification d'exhaustivité par le compilateur TypeScript).

## 6. Historique : prévu vs réalisé

```ts
interface SessionRecord {
  plannedSessionId?: ID;                           // absent = séance libre
  planned?: Session;                               // copie figée (révision) de ce qui était prévu
  actual?: SessionExecution;                       // ce qui a été fait
  outcome: 'completed' | 'partial' | 'abandoned' | 'missed' | 'skipped_by_user' | 'replaced';
}

interface SessionExecution {
  startedAt: ISODateTime; endedAt?: ISODateTime;
  activeDurationS: number; pausedDurationS: number;
  blocks: BlockExecution[];
  sessionRpe?: number;                             // 1..10
  pain?: PainReport[];
  userComment?: string;                            // jamais analysé automatiquement en V1
  source: 'guided' | 'manual' | 'imported';
}

interface BlockExecution { blockId: ID; status: 'done' | 'partial' | 'skipped'; items: ItemExecution[]; actualDurationS?: number; }

interface ItemExecution {
  itemId: ID; exerciseId: ExerciseId;
  substitutedFrom?: ExerciseId;
  sets?: { reps?: number; loadKg?: number; rir?: number; rpe?: number; completed: boolean; restTakenS?: number; ts?: ISODateTime }[];
  intervals?: { index: number; timeS?: number; distanceM?: number; completed: boolean }[];
  wodScore?: { type: ScoreType; value: number; rx: boolean; scalingUsed?: ExerciseId[] };
  skipped?: boolean; skipReason?: 'time' | 'equipment' | 'pain' | 'fatigue' | 'other';
}
```

Principe : **le moteur apprend de l'exécution réelle**. `StateBuilder` n'utilise jamais `planned` pour mesurer une exposition. Il utilise `actual`, et `planned` sert seulement à comparer (écart prévu/réalisé).

- Une séance `missed` n'a produit aucune exposition.
- Une séance `partial` ne compte que pour les blocs et séries effectivement faits.
- Une série sans charge saisie mais cochée compte comme réalisée « telle que prescrite », avec une confiance réduite (`DATA.ASSUMED_AS_PRESCRIBED`), et le cas est tracé.

Rétention utile au moteur : 52 semaines de détail + agrégats au-delà (doc 04).

## 7. WorkoutResult (entrée de `processWorkoutResult`)

```ts
interface WorkoutResult { sessionRecord: SessionRecord; feedback: PostSessionFeedback; }

interface PostSessionFeedback {                     // doc 08 §2 — minimal
  completed: boolean;                               // déduit automatiquement si possible
  sessionRpe?: number;
  difficultyVsExpected?: 'easier' | 'as_expected' | 'harder';
  pain?: PainReport;                                // uniquement si l'utilisateur signale quelque chose
}

interface PainReport {
  bodyArea: BodyArea;                               // liste fermée : épaule, coude, poignet, dos bas, hanche, genou, cheville/pied, ...
  severity: 'mild' | 'moderate' | 'severe';
  timing: 'during' | 'after' | 'persistent';
  reportedAt: ISODateTime;
  resolvedAt?: ISODateTime;
}
```
