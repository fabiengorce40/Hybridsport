# 02 — C. Modèle de données

Principes :

- **Identifiants stables** (UUID v7, triables par date) générés côté client pour permettre la création hors-ligne.
- **Catalogue ≠ données utilisateur** : le catalogue est un référentiel versionné, livré en lecture seule ; les données utilisateur référencent des IDs de catalogue stables (jamais de noms).
- **Passé immuable** : un `SessionLog` n'est jamais modifié par le moteur. Le plan futur évolue par **révisions**.
- **Unités canoniques** en base : kg, mètres, secondes, secondes/km. Conversion uniquement en présentation.
- **Traçabilité** : tout plan généré porte `engineVersion`, `rulesetVersion`, `catalogVersion`, `seed`.
- Types exprimés ci-dessous en TypeScript (source de vérité dans `packages/domain`, validés à l'exécution avec Zod, reflétés en SQL par migrations).

## 1. Catalogue (référentiel)

```ts
type Discipline = 'strength' | 'crosstraining' | 'hybrid_race' | 'running';

interface MovementPattern {            // ~20 entrées
  id: string;                          // 'squat', 'hinge', 'lunge', 'push_h', 'push_v', 'pull_h', 'pull_v',
                                       // 'carry', 'core_antiext', 'core_rot', 'jump', 'olympic', 'monostructural_run',
                                       // 'monostructural_row', 'monostructural_ski', 'monostructural_bike', 'sled_push', ...
  family: 'lower' | 'upper' | 'full' | 'core' | 'cyclic';
}

interface MuscleGroup { id: string; region: 'lower' | 'upper' | 'core'; }   // quadriceps, ischios, fessiers, dorsaux...

interface Exercise {
  id: string;                          // stable, ex. 'ex_back_squat'
  name: I18nText;
  disciplines: Discipline[];
  patterns: string[];                  // pattern principal en premier
  muscles: { muscleId: string; role: 'primary' | 'secondary'; weight: number }[]; // weight 0..1
  equipment: EquipmentRequirement[];   // ET/OU logiques (ex. barre + rack)
  equivalenceGroupId: string;          // ex. 'eq_squat_bilateral_loaded'
  skillLevel: 1 | 2 | 3 | 4 | 5;       // complexité technique
  loadType: 'external' | 'bodyweight' | 'assisted' | 'distance' | 'calories' | 'time';
  laterality: 'bilateral' | 'unilateral' | 'alternating';
  impact: 'none' | 'low' | 'high';     // pour limitations « éviter l'impact »
  axialLoad: 0 | 1 | 2 | 3;            // charge sur la colonne
  overhead: boolean;
  fatigueCost: { local: number; systemic: number; neural: number }; // 0..1, pour le modèle de fatigue
  timing: { secondsPerRep: number; setupSeconds: number; transitionSeconds: number }; // calcul de durée
  loadIncrementKg?: number;            // pas de progression minimal réaliste
  progressionOf?: string;              // exercice plus facile
  regressionOf?: string;               // exercice plus difficile
  contraindicationTags: string[];      // 'no_overhead', 'no_impact', 'no_spinal_flexion_loaded'...
  // Aucun média ni texte pédagogique ici : voir ExerciseContent ci-dessous.
  // Un exercice est complet et utilisable par le moteur SANS contenu associé.
  status: 'active' | 'deprecated';     // jamais supprimé (historique)
}

// Contenu pédagogique : entité SÉPARÉE, optionnelle, versionnée indépendamment du catalogue sportif.
// Le moteur ne lit jamais cette entité ; le catalogue ne dépend pas de sa disponibilité.
interface ExerciseContent {
  exerciseId: string;
  locale: string;                      // contenu par langue
  instructions?: I18nText[];           // étapes d'exécution
  commonMistakes?: I18nText[];         // erreurs fréquentes
  techniqueTips?: I18nText[];          // conseils techniques
  media: ExerciseMedia[];              // 0..n — vide autorisé
  contentVersion: number;
  status: 'missing' | 'draft' | 'published';
}

interface ExerciseMedia {
  id: string; kind: 'video' | 'thumbnail' | 'image' | 'animation';
  storageKey: string;                  // chemin dans le stockage objet / CDN, jamais une URL figée
  durationS?: number; width?: number; height?: number;
  angle?: 'front' | 'side' | 'back'; variant?: 'default' | 'loopable';
  checksum: string; publishedAt: ISODate;
}
// UI : si aucun média, la fiche exercice affiche un état dédié (nom, patterns, consignes disponibles) — jamais d'écran cassé.

interface Equipment { id: string; category: string; } // barbell, dumbbell, kettlebell, rower, skierg, sled, wall_ball, pullup_bar...

interface BenchmarkWorkout {           // WODs de référence, protocoles de test, stations HYROX
  id: string; discipline: Discipline; format: WodFormat; definition: SessionBlockTemplate; purpose: 'test' | 'training';
}

interface CatalogVersion { version: string; publishedAt: string; checksum: string; }
```

## 2. Utilisateur & profil athlète

```ts
interface User { id: UUID; createdAt: ISODate; locale: string; units: 'metric' | 'imperial'; deletedAt?: ISODate; }

interface Consent { userId: UUID; kind: 'terms' | 'privacy' | 'health_data' | 'analytics' | 'marketing'; version: string; grantedAt: ISODate; revokedAt?: ISODate; }

interface AthleteProfile {
  userId: UUID;
  birthYear?: number;                  // âge : utile (récupération), optionnel
  sex?: 'female' | 'male' | 'undisclosed';     // utile pour normes HYROX / charges de référence, optionnel
  bodyMassKg?: number;
  trainingAgeMonths: Partial<Record<Discipline, number>>;
  levels: Partial<Record<Discipline, Level>>;  // dérivé des réponses factuelles + références, pas seulement déclaratif
  skills: Record<string, boolean>;     // 'strict_pullup', 'toes_to_bar', 'double_under', 'hspu'...
  limitations: string[];               // tags alignés sur contraindicationTags — aucune donnée médicale libre
  profileVersion: number;              // incrémenté à chaque modification (déclenche adaptation)
}

interface Goal {
  id: UUID; userId: UUID;
  discipline: Discipline;
  priority: 'primary' | 'secondary' | 'maintenance';
  kind: 'event' | 'performance' | 'general';
  target?: { metric: 'time' | 'distance' | 'load' | 'reps'; value: number; exerciseId?: string; distanceM?: number };
  eventDate?: ISODate;                 // course / HYROX
  raceDivision?: 'open' | 'pro' | 'doubles' | 'relay';
  status: 'active' | 'achieved' | 'abandoned';
}

interface Availability {
  userId: UUID;
  weekdays: { day: 1 | 2 | 3 | 4 | 5 | 6 | 7; maxMinutes: number; allowTwoSessions: boolean }[];
  targetSessionsPerWeek: number;
  perDisciplineSessions?: Partial<Record<Discipline, number>>; // « courir 3×, muscu 2× »
  validFrom: ISODate;
}

interface EquipmentProfile { id: UUID; userId: UUID; name: string; equipment: { equipmentId: string; details?: { maxLoadKg?: number; incrementsKg?: number[] } }[]; isDefault: boolean; }

interface ReferencePerformance {
  id: UUID; userId: UUID;
  kind: 'run_time' | 'lift_rm' | 'benchmark' | 'hybrid_race_result' | 'hybrid_race_station' | 'erg_time';
  exerciseId?: string; distanceM?: number; reps?: number; loadKg?: number; timeS?: number;
  source: 'declared' | 'test' | 'derived_from_log' | 'race' | 'imported';
  measuredAt: ISODate;
  confidence: number;                  // 0..1 : une valeur déclarée ancienne vaut moins qu'un test récent
}
```

## 3. Plan (sortie du moteur, persistée)

Hiérarchie : `Program → Phase (mésocycle) → Week (microcycle) → PlannedSession → Block → PlannedExercise → Prescription (série / intervalle)`.

```ts
interface Program {
  id: UUID; userId: UUID;
  goals: UUID[];
  startDate: ISODate; endDate?: ISODate;
  status: 'active' | 'completed' | 'archived';
  currentRevisionId: UUID;
  engineVersion: string; rulesetVersion: string; catalogVersion: string;
}

interface Phase { id: UUID; programId: UUID; index: number; kind: 'base' | 'build' | 'peak' | 'taper' | 'deload' | 'transition' | 'test';
  startDate: ISODate; weeks: number; intents: Partial<Record<Discipline, string>>; }

interface PlannedWeek { id: UUID; phaseId: UUID; index: number; startDate: ISODate;
  loadEnvelope: WeeklyLoadEnvelope;    // bornes hebdo PAR dimension de charge (voir doc 04 §3.2) — pas de score unique
}

interface PlannedSession {
  id: UUID; weekId: UUID; userId: UUID;
  date: ISODate; slot: 'am' | 'pm' | 'any';
  discipline: Discipline; archetype: string;     // ex. 'run_threshold_intervals', 'strength_lower_heavy', 'hybrid_race_compromised_run'
  priority: 'key' | 'standard' | 'optional';    // les séances clés sont protégées lors des adaptations
  intent: I18nText;                               // l'objectif en une phrase affiché à l'utilisateur
  targetDurationS: number;
  estimatedDuration: { p50: number; p10: number; p90: number };
  expectedLoad: LoadProfile;          // profil de charge multidimensionnel prévu (doc 04 §3.2)
  fingerprint: SessionFingerprint;                // anti-doublon (doc 05)
  blocks: Block[];
  state: 'planned' | 'in_progress' | 'completed' | 'partially_completed' | 'missed' | 'skipped' | 'superseded';
  createdInRevisionId: UUID;
}

interface Block {
  id: UUID; index: number;
  kind: 'warmup' | 'activation' | 'main' | 'secondary' | 'accessory' | 'conditioning' | 'finisher' | 'cooldown';
  format: 'straight_sets' | 'superset' | 'circuit' | 'emom' | 'amrap' | 'for_time' | 'intervals' | 'continuous' | 'rounds';
  timeCapS?: number; rounds?: number;
  items: PlannedExercise[];
  estimatedDurationS: number;
  optional: boolean;                  // finisher coupé en priorité si temps insuffisant
}

interface PlannedExercise {
  id: UUID; exerciseId: string; index: number;
  prescriptions: Prescription[];      // une par série / intervalle (ramp-up inclus, marqués)
  restS?: number;
  alternatives: string[];             // exerciseIds équivalents pré-validés
  notes?: I18nText;
  progressionTrackId?: UUID;          // lien vers la progression suivie
}

type Prescription =
  | { kind: 'set'; setType: 'rampup' | 'working' | 'backoff' | 'amrap'; reps?: number; repsRange?: [number, number];
      loadKg?: number; percent1RM?: number; rpe?: number; rir?: number; tempo?: string }
  | { kind: 'interval'; workDistanceM?: number; workTimeS?: number; pace?: PaceTarget; zone?: IntensityZone; recoveryS?: number; recoveryType?: 'jog' | 'walk' | 'rest' }
  | { kind: 'wod_item'; reps?: number; calories?: number; distanceM?: number; loadKg?: number; scaled?: string }
  | { kind: 'continuous'; distanceM?: number; timeS?: number; pace?: PaceTarget; zone?: IntensityZone };

interface PlanRevision {
  id: UUID; programId: UUID; parentRevisionId?: UUID;
  createdAt: ISODate;
  trigger: AdaptationEventType;       // 'initial', 'session_missed', 'availability_changed', ...
  scope: 'session' | 'week' | 'phase' | 'program';
  diff: PlanDiff;                     // séances ajoutées / modifiées / supprimées
  explanation: I18nText[];            // lisible par l'utilisateur
  trace: DecisionTraceRef;            // trace moteur détaillée (debug / support)
  acceptedByUser: boolean;
  engineVersion: string;
}
```

## 4. Exécution (source de vérité de ce qui a réellement été fait)

```ts
interface SessionLog {
  id: UUID; userId: UUID; plannedSessionId?: UUID;  // nullable : séance libre possible plus tard
  startedAt: ISODate; endedAt?: ISODate;
  activeDurationS: number; pausedDurationS: number;
  sessionRpe?: number;                // 1..10
  feeling?: 1 | 2 | 3 | 4 | 5;
  soreness?: Partial<Record<string, 0 | 1 | 2 | 3>>;
  notes?: string;
  completion: number;                 // 0..1 calculé
  source: 'app' | 'manual' | 'imported';
  clientUpdatedAt: ISODate;           // synchronisation
}

interface SetLog {
  id: UUID; sessionLogId: UUID; plannedExerciseId?: UUID; exerciseId: string; setIndex: number;
  reps?: number; loadKg?: number; rpe?: number; rir?: number; timeS?: number; distanceM?: number; calories?: number;
  completed: boolean; substitutedFrom?: string;
  completedAt: ISODate;
}

// Activité de course normalisée — point d'entrée UNIQUE du moteur Running pour les données réalisées,
// quelle que soit la source. Ajouter le GPS natif plus tard = ajouter une source + des échantillons,
// sans modifier le domaine Running.
interface RunActivity {
  id: UUID; userId: UUID; sessionLogId?: UUID;   // liée à une séance planifiée ou libre
  source: 'guided_session' | 'manual' | 'health_import' | 'third_party_import' | 'native_gps';
                                                // V1 : 'guided_session' | 'manual' ; les autres sont réservées
  sourceRef?: { provider: 'apple_health' | 'health_connect' | 'strava' | 'garmin' | 'app_gps'; externalId: string };
  startedAt: ISODate; durationS: number; movingTimeS?: number;
  distanceM?: number; elevationGainM?: number;
  laps: RunLap[];                                // segments / intervalles réalisés
  avgHr?: number; maxHr?: number;
  samplesRef?: string;                           // RÉSERVÉ : pointeur vers une série temporelle (GPS, FC) stockée à part
  dataQuality: 'measured' | 'estimated' | 'declared';
}
interface RunLap { index: number; distanceM?: number; timeS: number; avgPaceSPerKm?: number; avgHr?: number; kind?: 'work' | 'recovery' | 'warmup' | 'cooldown'; }

// Exposition de course typée (dont les km courus en HYROX / Cross-Training) — doc 04 §3.4 bis.
// Dérivée des logs réalisés ; conserve le contexte, ne se résume jamais à un nombre de km.
interface RunningExposure {
  id: UUID; userId: UUID; sourceSessionLogId: UUID; sourceDiscipline: Discipline;
  context: 'fresh' | 'compromised' | 'interval' | 'continuous' | 'wod_embedded';
  distanceM: number; durationS: number; segmentCount: number; recoveryBetweenS?: number;
  intensity: { zone?: string; rpe?: number; paceSPerKm?: number };
  precededByExerciseIds?: string[];
  computedContribution?: { volume: number; locomotor: number; specificity: number; rulesetVersion: string }; // calculée par le moteur, recalculable
}

interface IntervalLog { id: UUID; sessionLogId: UUID; index: number; distanceM?: number; timeS: number; avgPaceSPerKm?: number; avgHr?: number; completed: boolean; }

interface WodResult { id: UUID; sessionLogId: UUID; blockId: UUID; scoreType: 'time' | 'rounds_reps' | 'load' | 'calories'; value: number; rx: boolean; scalingNotes?: string; }
```

## 5. États dérivés (recalculables à partir des logs)

Ces tables sont des **caches** ; elles peuvent toujours être recalculées à partir des logs par les fonctions pures du moteur. Cela protège contre les bugs de calcul (on corrige la fonction, on recalcule).

```ts
interface ProgressionTrack { id: UUID; userId: UUID; exerciseId: string; model: ProgressionModel; state: Record<string, number>; updatedAt: ISODate; }
interface CapacityEstimate { userId: UUID; key: string /* 'e1rm:ex_back_squat', 'vdot', 'critical_speed', 'hybrid_race_station:sled_push' */; value: number; confidence: number; asOf: ISODate; }
interface DailyLoad {                 // une entrée par jour, dimensions séparées (doc 04 §3.2) — aucun total unique faisant foi
  userId: UUID; date: ISODate;
  muscular: Record<string, number>;    // séries difficiles pondérées par groupe
  patterns: Record<string, number>;
  volume: Record<Discipline, Record<string, number>>;   // unités natives par discipline
  intensity: Record<string, number>;   // temps / séries par zone
  locomotor: { rawKm: number; contribution: number; jumps: number };
  cardio: Record<string, number>;      // minutes par zone
  internalScore?: number;              // heuristique interne éventuelle, jamais utilisée seule pour décider
  rulesetVersion: string;
}
interface ExerciseExposure { userId: UUID; exerciseId: string; lastDoneAt: ISODate; count28d: number; }  // anti-doublon
```

## 6. Abonnements, conformité, technique

```ts
// Abonnements : découplés du moteur. Le moteur ne lit aucune de ces entités.
interface Entitlement {
  userId: UUID; key: string;           // 'premium' en V1 ; extensible
  status: 'active' | 'trial' | 'grace_period' | 'expired' | 'revoked';
  productId?: string;                  // ex. 'premium_monthly', 'premium_yearly'
  period?: 'monthly' | 'yearly';
  activeUntil?: ISODate; source: 'app_store' | 'play_store' | 'promo'; updatedAt: ISODate;
}
// Correspondance fonctionnalité → droit : configuration (feature flag), PAS du code métier.
interface FeatureGate { feature: string; requiredEntitlement?: string; freeQuota?: number; }  // valeurs à définir plus tard
interface SubscriptionEvent { id: UUID; userId: UUID; provider: 'revenuecat'; type: string; payload: JSON; receivedAt: ISODate; } // idempotence par id
interface DeletionRequest { userId: UUID; requestedAt: ISODate; completedAt?: ISODate; }
interface SyncMeta { table: string; rowId: UUID; version: number; updatedAt: ISODate; deleted: boolean; } // selon solution de sync
```

## 7. Données sensibles (RGPD)

- Données potentiellement « de santé » (art. 9 RGPD) : limitations, poids, courbatures, fréquence cardiaque importée. ⇒ **consentement explicite dédié**, minimisation, chiffrement au repos (natif Postgres managé), accès par RLS strict (`user_id = auth.uid()`).
- Aucune donnée de santé dans les analytics produit.
- Suppression de compte : suppression effective (ou anonymisation irréversible) sous 30 jours, y compris sauvegardes selon politique de rétention documentée.
- Export : JSON complet des données utilisateur (droit à la portabilité).

## 8. Migrations & versioning

- Migrations SQL versionnées (outil : migrations Supabase / `dbmate`), exécutées en CI sur staging avant production.
- Schéma local SQLite versionné avec migrations côté app (une app ancienne doit pouvoir migrer vers le schéma récent).
- Évolution **additive** par défaut (ajout de colonnes nullable), suppression en deux temps (déprécier → retirer après N versions d'app).
- Le catalogue ne supprime jamais un exercice : statut `deprecated` + remplaçant.
