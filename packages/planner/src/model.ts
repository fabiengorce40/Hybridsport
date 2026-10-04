/**
 * Global Planner — contrats d'entrée et de sortie. Le planificateur décide UNIQUEMENT : discipline, jour, ordre,
 * disponibilité, compatibilité structurelle inter-disciplines, moteur à appeler, contexte voisin. Le contenu
 * (exercices, allures, mouvements, prescription d'une station, charges, doses, progression) reste aux moteurs.
 */
import { z } from 'zod';
import type { DemandLevel, ISODateTime, ReasonCode, SessionDraft, SessionFingerprint, SessionRecord } from '@hybridsport/domain';

export const PLANNER_SPORTS = ['strength', 'running', 'crosstraining', 'hyrox'] as const;
export type PlannerSport = (typeof PLANNER_SPORTS)[number];
export const PLANNER_MODES = ['CANDIDATE', 'PRODUCTION'] as const;
export type PlannerMode = (typeof PLANNER_MODES)[number];

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date AAAA-MM-JJ attendue');

/** Champs d'intention de séance que le PROGRAMME doit fournir (aucun n'a de valeur par défaut). */
export const INTENT_FIELDS = ['archetypeId', 'stimulus', 'objective', 'phase', 'toleranceProfile'] as const;
export type DeclaredIntent = { readonly [K in (typeof INTENT_FIELDS)[number]]: string };

/**
 * Intention de programme pour UN sport : nombre de séances, intention de séance du moteur et, pour HYROX, station
 * (propriété du programme ; une surcharge manuelle utilisateur relèvera du programme, pas du planificateur).
 * Une intention incomplète n'est pas rejetée en bloc : la demande correspondante est non placée, raison à l'appui.
 */
export const zSportIntent = z.object({
  sport: z.enum(PLANNER_SPORTS),
  sessions: z.number().int().positive(),
  intent: z.object(Object.fromEntries(INTENT_FIELDS.map((k) => [k, z.string().min(1).optional()])) as { [K in (typeof INTENT_FIELDS)[number]]: z.ZodOptional<z.ZodString> }).strict().default({}),
  station: z.string().min(1).optional(),
  /**
   * Intention de séance SURCHARGÉE pour la k-ième séance du sport (1-based), complète : par exemple une évaluation
   * demandée par le programme. Le planificateur l'exécute telle quelle, sans l'interpréter.
   */
  overrides: z.array(z.object({ index: z.number().int().positive(), intent: z.object(Object.fromEntries(INTENT_FIELDS.map((k) => [k, z.string().min(1)])) as { [K in (typeof INTENT_FIELDS)[number]]: z.ZodString }).strict() }).strict()).default([]),
}).strict();
export type SportIntent = z.input<typeof zSportIntent>;

export const zPlannerInput = z.object({
  weekStart: date,
  /** Jours de la semaine et minutes disponibles déclarées (0 = indisponible). Ordre chronologique strict. */
  days: z.array(z.object({ date, availableMinutes: z.number().int().nonnegative() }).strict()).min(1)
    .refine((ds) => ds.every((d, i) => i === 0 || (ds[i - 1]?.date ?? '') < d.date), 'jours distincts, ordre chronologique'),
  /**
   * Intention de programme, dans l'ORDRE DE PRIORITÉ DÉCLARÉ (utilisateur ou programme) : le planificateur n'infère ni
   * composition hebdomadaire ni priorité. Un sport au plus une fois.
   */
  demands: z.array(zSportIntent).refine((ds) => new Set(ds.map((d) => d.sport)).size === ds.length, 'un sport au plus une fois'),
  mode: z.enum(PLANNER_MODES),
  /** Séances antérieures à la semaine (historique) : interférence et contexte voisin, jamais modifiées. */
  recent: z.array(z.object({ date, sport: z.enum(PLANNER_SPORTS), session: z.custom<SessionDraft>((v) => v !== null && typeof v === 'object') }).strict()).default([]),
}).strict();
export type PlannerInput = z.input<typeof zPlannerInput>;
export type ParsedPlannerInput = z.infer<typeof zPlannerInput>;

/** Horloge injectée : instant de séance d'une date civile (aucune horloge système, aucune heure inventée ici). */
export interface PlannerClock {
  readonly instantOf: (date: string) => ISODateTime;
  readonly timezone: string;
}

/** Séance voisine vue par un moteur consommateur : profil de demande DÉRIVÉ (jamais estimé par le planificateur). */
export interface NeighbourDemand {
  readonly sport: PlannerSport;
  readonly discipline: string;
  readonly stimulus: string;
  readonly hoursFromThisSession: number;
  readonly demand: Readonly<Record<string, DemandLevel>>;
}
/** Contexte voisin : `known` seulement si TOUTES les voisines d'autres disciplines ont un profil dérivable. */
export interface NeighbourContext { readonly known: boolean; readonly neighbours: readonly NeighbourDemand[] }

/** Catégorie applicative d'une demande (auditable, jamais « planning failed »). */
export const REQUEST_CATEGORIES = [
  'planned', 'engine_refused', 'governance_blocked', 'interference_conflict', 'slot_unavailable', 'engine_unavailable', 'programme_intent_incomplete',
] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export type DemandOutcome =
  | { readonly status: 'derived'; readonly levels: Readonly<Record<string, DemandLevel>> }
  | { readonly status: 'unavailable'; readonly reasons: readonly ReasonCode[] };

export type DayResult =
  | { readonly date: string; readonly availableMinutes: number; readonly status: 'planned'; readonly sport: PlannerSport; readonly requestId: string }
  | { readonly date: string; readonly availableMinutes: number; readonly status: 'empty'; readonly reason: ReasonCode };

interface RequestBase { readonly requestId: string; readonly sport: PlannerSport; readonly category: RequestCategory; readonly reasons: readonly ReasonCode[] }
export type RequestResult =
  | (RequestBase & {
    readonly status: 'planned'; readonly date: string; readonly session: SessionDraft; readonly fingerprint?: SessionFingerprint;
    /** Record persistable (session_record courant) : séance, provenance, empreinte, estimation de durée du CORE. */
    readonly record: SessionRecord; readonly demand: DemandOutcome; readonly neighbourContext?: NeighbourContext;
  })
  | (RequestBase & { readonly status: 'refused'; readonly date: string })
  | (RequestBase & { readonly status: 'unplaced' });

export interface PlannedWeek {
  readonly weekStart: string;
  readonly mode: PlannerMode;
  /** Athlète multisport (au moins deux sports demandés) : transmis tel quel aux moteurs. */
  readonly hybrid: boolean;
  readonly days: readonly DayResult[];
  readonly requests: readonly RequestResult[];
  /** Conflits d'interférence évalués (y compris ceux résolus en changeant de jour). */
  readonly conflicts: readonly ReasonCode[];
  /** Traces de gouvernance du planificateur (paramètres indisponibles ou candidats). */
  readonly governance: readonly ReasonCode[];
}
