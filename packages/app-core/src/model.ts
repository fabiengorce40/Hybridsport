/**
 * Modèle de données de KAIRO V0 (état persisté, versionné). Schémas stricts : une donnée persistée
 * invalide n'est jamais « réparée » en silence (voir store.ts).
 *
 * Les schémas des moteurs (séance du CORE, tracks et expositions Strength, séances réalisées Running)
 * sont RÉUTILISÉS tels quels : l'application ne redéfinit aucune donnée sportive.
 */
import { z } from 'zod';
import { isISODateTime, LEVELS, zFingerprintHistoryEntry, zSerializedEnvelope, zSessionDraft } from '@hybridsport/domain';
import { INTENT_FIELDS, PLANNER_MODES, REQUEST_CATEGORIES } from '@hybridsport/planner';
import { zProgrammeState } from '@hybridsport/programme';
import { zExerciseExposure, zStrengthTrack } from '@hybridsport/strength';
import { RETURN_STATES, RUNNING_GOALS, RUNNING_LEVELS, zRealizedSession, zRunningReference } from '@hybridsport/running';

export const SPORTS = ['strength', 'running', 'crosstraining', 'hyrox'] as const;
export type Sport = (typeof SPORTS)[number];
/** Sports pour lesquels un moteur existe dans le dépôt. Cross-training et HYROX : aucun moteur, aucune règle validée. */
export const ENGINE_SPORTS = ['strength', 'running'] as const satisfies readonly Sport[];
export type EngineSport = (typeof ENGINE_SPORTS)[number];

export const STRENGTH_GOALS = ['strength', 'hypertrophy', 'general'] as const;
export type StrengthGoal = (typeof STRENGTH_GOALS)[number];

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date AAAA-MM-JJ attendue');
const instant = z.string().refine(isISODateTime, 'instant ISO attendu');
// technical-constant: jours par semaine (calendrier)
const DAYS_PER_WEEK = 7;
const sessionsPerWeek = z.number().int().min(1).max(DAYS_PER_WEEK);

export const zProfile = z.object({
  // technical-constant: longueur maximale d’un nom affiché (saisie)
  displayName: z.string().max(40).default(''),
  /** Niveau CORE (athleteLevel). */
  level: z.enum(LEVELS),
  /** Ordre de priorité des sports activés (sélection déterministe du planificateur). */
  priorities: z.array(z.enum(SPORTS)),
  strength: z.object({ enabled: z.boolean(), goal: z.enum(STRENGTH_GOALS), sessionsPerWeek }).strict(),
  running: z.object({
    enabled: z.boolean(),
    population: z.enum(RUNNING_LEVELS),
    goal: z.enum(RUNNING_GOALS),
    wearable: z.boolean(),
    sessionsPerWeek,
    /** État de reprise DÉCLARÉ (jamais déduit) et début de la reprise. */
    returnState: z.enum(RETURN_STATES),
    returnStartedAt: date.optional(),
    /** Côte praticable déclarée (§N : jamais de séance de côtes sans terrain déclaré). */
    hills: z.boolean().default(false),
  }).strict(),
  /**
   * Cross-training (C3.5) : DÉCLARATIONS de l'utilisateur, exigées quand le sport est activé en Beta 0 — séances par
   * semaine, intention (archétype de stimulus C3 parmi `CT_INTENT_LABELS`), coupure récente déclarée. Champs additifs.
   */
  crosstraining: z.object({
    enabled: z.boolean(),
    sessionsPerWeek: sessionsPerWeek.optional(),
    intent: z.string().min(1).optional(),
    returnState: z.enum(RETURN_STATES).optional(),
  }).strict(),
  hyrox: z.object({ enabled: z.boolean() }).strict(),
  equipment: z.object({ presetId: z.string().min(1), items: z.array(z.string().min(1)) }).strict(),
  /** Minutes disponibles par jour, du lundi (0) au dimanche (6) ; 0 = indisponible. */
  // technical-constant: minutes dans une journée (borne de saisie)
  availability: z.array(z.number().int().min(0).max(24 * 60)).length(DAYS_PER_WEEK),
  excludedExercises: z.array(z.string().min(1)).default([]),
  /** Acceptation explicite du caractère provisoire / simulé des séances (date ISO). */
  acceptedProvisionalAt: instant,
}).strict();
export type Profile = z.infer<typeof zProfile>;
export type ProfileInput = z.input<typeof zProfile>;

/** Autorité d'une séance : jamais `production` en V0. */
export const AUTHORITIES = ['provisional', 'simulation'] as const;
export type Authority = (typeof AUTHORITIES)[number];

export const zReason = z.object({ code: z.string(), params: z.record(z.string(), z.unknown()).default({}) }).strict();
export type Reason = z.infer<typeof zReason>;

export const zPlanEntry = z.object({
  key: z.string().min(1),
  date,
  sport: z.enum(ENGINE_SPORTS),
  archetypeId: z.string().min(1),
  availableMinutes: z.number().int().positive(),
  /** Course : rôle dans la semaine (composition §R du moteur Course). */
  role: z.enum(['KEY', 'TEST', 'LONG', 'EASY', 'LOCKED']).optional(),
}).strict();
export type PlanEntry = z.infer<typeof zPlanEntry>;

export const zPlanNotice = z.object({ code: z.string(), params: z.record(z.string(), z.union([z.string(), z.number()])).default({}) }).strict();
export type PlanNotice = z.infer<typeof zPlanNotice>;

export const zWeekPlan = z.object({
  weekStart: date,
  entries: z.array(zPlanEntry),
  /** Demandes non placées, avec la raison (jamais modifiées en silence). */
  unplaced: z.array(z.object({ sport: z.enum(SPORTS), count: z.number().int().positive(), reason: z.string() }).strict()),
  notices: z.array(zPlanNotice),
  plannedAt: instant,
  /** Séances de course manquées puis abandonnées (§W : jamais compensées). */
  dropped: z.array(z.object({ date, archetypeId: z.string().min(1), code: z.string() }).strict()).default([]),
  /** Révision de l'historique ayant servi à la dernière composition Course (§R) des jours restants. */
  runningRevision: z.number().int().nonnegative().optional(),
}).strict();
export type WeekPlan = z.infer<typeof zWeekPlan>;

export const zGeneratedSession = z.object({
  /**
   * Stockage LEGACY explicite (v2) : séance V0 conservée en `SessionDraft` brut, hors `session_record` (la provenance
   * complète — version de catalogue, graine, trace — n'a jamais été stockée en V0 et n'est pas reconstituée).
   * Le format canonique est le `session_record` des semaines planifiées (`planner.weeks`). Chemin V0 voué à disparaître.
   */
  storage: z.literal('legacy_v0'),
  key: z.string().min(1),
  date,
  sport: z.enum(ENGINE_SPORTS),
  archetypeId: z.string().min(1),
  authority: z.enum(AUTHORITIES),
  generatedAt: instant,
  /** Révision de l'historique ayant servi à la génération (régénération si l'historique a changé avant le début). */
  basedOnRevision: z.number().int().nonnegative(),
  contentOrigin: z.string(),
  rulesetVersion: z.string(),
  outcome: z.discriminatedUnion('status', [
    z.object({
      status: z.literal('ok'), session: zSessionDraft, fingerprint: z.unknown().optional(),
      /** Estimation de durée du CORE (DURATION.ESTIMATED de la trace, séance retenue). */
      estimate: z.object({ p50S: z.number().nonnegative(), p90S: z.number().nonnegative() }).strict().optional(),
    }).strict(),
    z.object({ status: z.literal('unavailable'), reasons: z.array(zReason) }).strict(),
  ]),
}).strict();
export type GeneratedSession = z.infer<typeof zGeneratedSession>;

export const zSetLog = z.object({
  itemId: z.string(),
  setIndex: z.number().int().nonnegative(),
  done: z.boolean(),
  reps: z.number().int().nonnegative().optional(),
  loadKg: z.number().nonnegative().optional(),
  rir: z.number().nonnegative().optional(),
}).strict();
export type SetLog = z.infer<typeof zSetLog>;

export const DIFFICULTIES = ['EASIER', 'AS_EXPECTED', 'HARDER', 'MUCH_HARDER'] as const;

export const zFeedback = z.object({
  difficulty: z.enum(DIFFICULTIES),
  /** Douleur signalée : suspend toutes les séances jusqu'à levée explicite (aucune règle G1 validée). */
  pain: z.boolean(),
  painAreas: z.array(z.string()).default([]),
  // technical-constant: longueur maximale d’une note (saisie)
  note: z.string().max(500).default(''),
}).strict();
export type Feedback = z.infer<typeof zFeedback>;

export const zSessionLog = z.object({
  key: z.string().min(1),
  sport: z.enum(ENGINE_SPORTS),
  startedAt: instant,
  sets: z.array(zSetLog),
  /** Exercices signalés douloureux pendant la séance (identifiants d'item). */
  painItems: z.array(z.string()).default([]),
  /** Course : durée RÉALISÉE déclarée (s) et statut de réalisation. */
  run: z.object({
    realizedDurationS: z.number().positive().finite(),
    completion: z.enum(['COMPLETED', 'PARTIAL', 'SKIPPED']),
    /** Distance réalisée (m), facultative : sert l'allure OBSERVÉE (borne d'estimation d'un TEST). */
    distanceM: z.number().positive().finite().optional(),
    /** TEST : temps du contre-la-montre seul (s) ; devient une référence TIME_TRIAL. */
    testTimeS: z.number().positive().finite().optional(),
  }).strict().optional(),
  finishedAt: instant.optional(),
  feedback: zFeedback.optional(),
}).strict();
export type SessionLog = z.infer<typeof zSessionLog>;

/**
 * Intention de PROGRAMME (multisport) : composition hebdomadaire DÉCLARÉE, dans l'ordre de priorité, avec l'intention
 * de séance de chaque moteur, la station HYROX (propriété du programme) et les déclarations propres au sport
 * (contrat du moteur : niveau, objectif, état de reprise…). Aucune valeur par défaut : l'application n'invente rien.
 */
export const zProgrammeSport = z.object({
  sport: z.enum(SPORTS),
  sessions: z.number().int().positive().max(DAYS_PER_WEEK),
  intent: z.object(Object.fromEntries(INTENT_FIELDS.map((k) => [k, z.string().min(1).optional()])) as { [K in (typeof INTENT_FIELDS)[number]]: z.ZodOptional<z.ZodString> }).strict(),
  station: z.string().min(1).optional(),
  /** Déclarations de l'utilisateur propres au moteur (contrat de contexte du moteur), validées par le moteur. */
  declarations: z.record(z.string(), z.unknown()).default({}),
}).strict();
export const zProgrammeIntent = z.object({
  sports: z.array(zProgrammeSport).refine((xs) => new Set(xs.map((x) => x.sport)).size === xs.length, 'un sport au plus une fois'),
  /** Origine de l'intention (programme, utilisateur, données de démonstration TEST_ONLY). */
  origin: z.string().min(1),
}).strict();
export type ProgrammeIntent = z.infer<typeof zProgrammeIntent>;
export type ProgrammeIntentInput = z.input<typeof zProgrammeIntent>;

const zDemandOutcome = z.discriminatedUnion('status', [
  z.object({ status: z.literal('derived'), levels: z.record(z.string(), z.enum(['none', 'low', 'moderate', 'high'])) }).strict(),
  z.object({ status: z.literal('unavailable'), reasons: z.array(zReason) }).strict(),
]);

/**
 * Autorité de l'environnement d'orchestration (explicite, jamais un booléen global) :
 * - `production` : mode PRODUCTION, valeurs approuvées seulement, aucune valeur SIMULATION_ONLY ;
 * - `beta0_experimental` : mode CANDIDATE, valeurs SIMULATION_ONLY déclarées (fixtures existantes), interne ;
 * - `test_only` : environnements construits par les tests.
 * `unknown` : semaine persistée avant l'introduction de ce champ (aucune autorité reconstituée).
 */
export const ENVIRONMENT_AUTHORITIES = ['production', 'beta0_experimental', 'test_only'] as const;
export type EnvironmentAuthority = (typeof ENVIRONMENT_AUTHORITIES)[number];

/** Semaine planifiée par le planificateur global, PERSISTÉE : séances en session_record (enveloppe versionnée). */
export const zPersistedWeek = z.object({
  weekStart: date,
  /** Propriétaire UNIQUE de la semaine (v2) : seul ce chemin peut la replanifier (voir weeks.ts). */
  owner: z.enum(['programme', 'multisport']),
  /** Autorité de l'environnement qui a planifié la semaine (champ additif ; absent ⇒ `unknown`). */
  authority: z.enum([...ENVIRONMENT_AUTHORITIES, 'unknown']).default('unknown'),
  /** Valeurs SIMULATION_ONLY utilisées par l'environnement (identifiants), vide hors Beta 0 expérimental. */
  simulation: z.array(z.string().min(1)).default([]),
  plannedAt: instant,
  mode: z.enum(PLANNER_MODES),
  hybrid: z.boolean(),
  programmeOrigin: z.string().min(1),
  /**
   * Version du chemin de planification qui a produit la semaine (compositeurs des moteurs). Absente : semaine planifiée
   * avant le versionnement (Beta 0 antérieure à Strength S1). Sert à identifier une semaine OBSOLÈTE (beta0-app.ts).
   */
  planningVersion: z.string().min(1).optional(),
  days: z.array(z.object({ date, availableMinutes: z.number().int().nonnegative(), status: z.enum(['planned', 'empty']), sport: z.enum(SPORTS).optional(), requestId: z.string().optional(), reason: zReason.optional() }).strict()),
  requests: z.array(z.object({
    requestId: z.string().min(1), sport: z.enum(SPORTS), status: z.enum(['planned', 'refused', 'unplaced']), category: z.enum(REQUEST_CATEGORIES),
    date: date.optional(),
    /** Intention RÉELLEMENT utilisée (déclarée, surchargée ou composée par le moteur). */
    intent: z.object(Object.fromEntries(INTENT_FIELDS.map((k) => [k, z.string().min(1)])) as { [K in (typeof INTENT_FIELDS)[number]]: z.ZodString }).strict().optional(),
    /** Composition du moteur appliquée : autorité de sa règle et rôle de la séance dans la semaine. */
    composition: z.object({ authority: z.enum(['approved', 'provisional']), role: z.string().min(1) }).strict().optional(),
    /** Séance planifiée : session_record courant (relu par la migration du CORE). */
    record: zSerializedEnvelope.optional(),
    demand: zDemandOutcome.optional(),
    neighbourContext: z.object({ known: z.boolean(), neighbours: z.array(z.object({ sport: z.enum(SPORTS), discipline: z.string(), stimulus: z.string(), hoursFromThisSession: z.number(), demand: z.record(z.string(), z.string()) }).strict()) }).strict().optional(),
    reasons: z.array(zReason),
  }).strict()),
  conflicts: z.array(zReason),
  governance: z.array(zReason),
}).strict();
export type PersistedWeek = z.infer<typeof zPersistedWeek>;

/** Chrono de repos d'une séance en cours : échéance horodatée (jamais un compteur), pause = reste figé. */
export const zRest = z.object({
  endsAt: instant,
  totalS: z.number().nonnegative(),
  /** Exercice dont la série vient d'être validée (identifiant du catalogue). */
  exerciseId: z.string().min(1),
  /** En pause : secondes restantes figées. */
  pausedRemainingS: z.number().nonnegative().optional(),
}).strict();
export type Rest = z.infer<typeof zRest>;

/**
 * C3.5 — exécution Cross-training EN COURS : chrono HORODATÉ (jamais un compteur écrit chaque seconde) et compteurs
 * saisis par l'athlète (tours, répétitions du tour en cours). `runningSince` null = en pause ; temps écoulé =
 * `accumulatedS` + (maintenant − `runningSince`). Écrit seulement sur une commande (pause, reprise, +1 tour…).
 */
export const zCtRuntime = z.object({
  runningSince: instant.nullable(),
  accumulatedS: z.number().nonnegative(),
  rounds: z.number().int().nonnegative(),
  partialReps: z.number().int().nonnegative(),
}).strict();
export type CtRuntime = z.infer<typeof zCtRuntime>;

/** Séance du programme commencée dans l'application. */
export const zProgrammeLog = z.object({
  requestId: z.string().min(1),
  sport: z.enum([...ENGINE_SPORTS, 'crosstraining']),
  startedAt: instant,
  sets: z.array(zSetLog),
  painItems: z.array(z.string()).default([]),
  rest: zRest.nullable().default(null),
  /** Cross-training : chrono et compteurs (absent pour les autres sports). */
  ct: zCtRuntime.optional(),
  finishedAt: instant.optional(),
  /** Issue enregistrée (copie de la saisie transmise à recordSessionExecution). */
  outcome: z.object({
    completion: z.enum(['completed_as_prescribed', 'modified', 'abandoned']),
    pain: z.boolean(),
    run: z.object({ realizedDurationS: z.number().positive().finite(), distanceM: z.number().positive().finite().optional(), testTimeS: z.number().positive().finite().optional() }).strict().optional(),
    /** Cross-training : résultat STRUCTURÉ transmis au moteur (contrat de résultat CT) et temps chronométré. */
    ct: z.object({ result: z.record(z.string(), z.unknown()).nullable(), elapsedS: z.number().nonnegative(), performedLoads: z.array(z.object({ exerciseId: z.string().min(1), kg: z.number().positive().finite() }).strict()).default([]) }).strict().optional(),
  }).strict().optional(),
}).strict();
export type ProgrammeLog = z.infer<typeof zProgrammeLog>;

export const zAppState = z.object({
  // technical-constant: version du schéma persistant de l'état applicatif (contrat de format)
  schemaVersion: z.literal(2),
  profile: zProfile.nullable(),
  plans: z.record(date, zWeekPlan),
  sessions: z.record(z.string(), zGeneratedSession),
  logs: z.record(z.string(), zSessionLog),
  strength: z.object({ tracks: z.array(zStrengthTrack), exposures: z.array(zExerciseExposure), accessoryCounts: z.record(z.string(), z.number().int().nonnegative()) }).strict(),
  running: z.object({
    realized: z.array(zRealizedSession),
    /** Références de performance enregistrées par l'application (TEST réalisés). */
    references: z.array(zRunningReference).default([]),
  }).strict(),
  /**
   * Cross-training (C2) : séances réalisées, conservées TELLES QUELLES (complétion déclarée comprise). Leur contrat est
   * celui du paquet Cross-training, validé strictement à la frontière du moteur (`parseCrossTrainingContext`) : app-core
   * ne dépend pas de ce paquet (règle d'architecture). Absent d'un état antérieur ⇒ vide (champ additif).
   */
  crosstraining: z.object({ realized: z.array(z.record(z.string(), z.unknown())) }).strict().default({ realized: [] }),
  /**
   * HYROX (H1) : stations RÉALISÉES (contrat de réalisation du moteur HYROX, validé à la réalisation et à la frontière
   * du moteur) ; app-core ne dépend pas de ce paquet. Absent d'un état antérieur ⇒ vide (champ additif).
   */
  hyrox: z.object({ realized: z.array(z.record(z.string(), z.unknown())) }).strict().default({ realized: [] }),
  fingerprints: z.object({ strength: z.array(zFingerprintHistoryEntry), running: z.array(zFingerprintHistoryEntry), crosstraining: z.array(zFingerprintHistoryEntry).default([]) }).strict(),
  safety: z.object({ activePain: z.object({ reportedAt: instant, areas: z.array(z.string()), sessionKey: z.string().optional() }).strict().nullable() }).strict(),
  /** Intention de programme multisport (absente d'un état antérieur ⇒ null : champ additif). */
  programme: zProgrammeIntent.nullable().default(null),
  /** Programme longitudinal (Programme Engine) : contrat versionné du paquet programme ; absent ⇒ null (champ additif). */
  programmeState: zProgrammeState.nullable().default(null),
  /**
   * Séances du programme commencées dans l'application (Beta 0) : saisies en cours (séries réellement faites, douleur
   * par exercice), chrono de repos (échéance horodatée) et issue une fois terminées. Champ additif (absent ⇒ vide).
   */
  programmeLogs: z.record(z.string(), zProgrammeLog).default({}),
  /** Semaines planifiées par le planificateur global (absent d'un état antérieur ⇒ vide : champ additif). */
  planner: z.object({ weeks: z.record(date, zPersistedWeek) }).strict().default({ weeks: {} }),
  /** Incrémentée à chaque séance terminée ou course enregistrée (l'historique a changé). */
  revision: z.number().int().nonnegative(),
}).strict();
export type AppState = z.infer<typeof zAppState>;

// technical-constant: version du schéma persistant de l'état applicatif (contrat de format)
export const CURRENT_SCHEMA_VERSION = 2;

export function emptyState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION, profile: null, plans: {}, sessions: {}, logs: {},
    strength: { tracks: [], exposures: [], accessoryCounts: {} }, running: { realized: [], references: [] }, crosstraining: { realized: [] }, hyrox: { realized: [] },
    fingerprints: { strength: [], running: [], crosstraining: [] }, safety: { activePain: null }, programme: null, programmeState: null, programmeLogs: {}, planner: { weeks: {} }, revision: 0,
  };
}
