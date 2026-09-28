/**
 * Modèle de données de KAIRO V0 (état persisté, versionné). Schémas stricts : une donnée persistée
 * invalide n'est jamais « réparée » en silence (voir store.ts).
 *
 * Les schémas des moteurs (séance du CORE, tracks et expositions Strength, séances réalisées Running)
 * sont RÉUTILISÉS tels quels : l'application ne redéfinit aucune donnée sportive.
 */
import { z } from 'zod';
import { isISODateTime, LEVELS, zFingerprintHistoryEntry, zSessionDraft } from '@hybridsport/domain';
import { zExerciseExposure, zStrengthTrack } from '@hybridsport/strength';
import { RETURN_STATES, RUNNING_GOALS, RUNNING_LEVELS, zRealizedSession } from '@hybridsport/running';

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
  }).strict(),
  crosstraining: z.object({ enabled: z.boolean() }).strict(),
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
}).strict();
export type WeekPlan = z.infer<typeof zWeekPlan>;

export const zGeneratedSession = z.object({
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
  }).strict().optional(),
  finishedAt: instant.optional(),
  feedback: zFeedback.optional(),
}).strict();
export type SessionLog = z.infer<typeof zSessionLog>;

export const zAppState = z.object({
  schemaVersion: z.literal(1),
  profile: zProfile.nullable(),
  plans: z.record(date, zWeekPlan),
  sessions: z.record(z.string(), zGeneratedSession),
  logs: z.record(z.string(), zSessionLog),
  strength: z.object({ tracks: z.array(zStrengthTrack), exposures: z.array(zExerciseExposure), accessoryCounts: z.record(z.string(), z.number().int().nonnegative()) }).strict(),
  running: z.object({ realized: z.array(zRealizedSession) }).strict(),
  fingerprints: z.object({ strength: z.array(zFingerprintHistoryEntry), running: z.array(zFingerprintHistoryEntry) }).strict(),
  safety: z.object({ activePain: z.object({ reportedAt: instant, areas: z.array(z.string()), sessionKey: z.string().optional() }).strict().nullable() }).strict(),
  /** Incrémentée à chaque séance terminée ou course enregistrée (l'historique a changé). */
  revision: z.number().int().nonnegative(),
}).strict();
export type AppState = z.infer<typeof zAppState>;

export const CURRENT_SCHEMA_VERSION = 1;

export function emptyState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION, profile: null, plans: {}, sessions: {}, logs: {},
    strength: { tracks: [], exposures: [], accessoryCounts: {} }, running: { realized: [] },
    fingerprints: { strength: [], running: [] }, safety: { activePain: null }, revision: 0,
  };
}
