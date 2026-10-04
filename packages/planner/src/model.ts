/**
 * Global Planner V1 — contrats d'entrée et de sortie. Le planificateur décide UNIQUEMENT : discipline, jour, ordre,
 * disponibilité, compatibilité structurelle inter-disciplines, moteur à appeler. Le contenu (exercices, allures,
 * mouvements, stations, charges, doses, progression) reste aux moteurs.
 */
import { z } from 'zod';
import type { ISODateTime, ReasonCode, SessionDraft, SessionFingerprint } from '@hybridsport/domain';

export const PLANNER_SPORTS = ['strength', 'running', 'crosstraining', 'hyrox'] as const;
export type PlannerSport = (typeof PLANNER_SPORTS)[number];
export const PLANNER_MODES = ['CANDIDATE', 'PRODUCTION'] as const;
export type PlannerMode = (typeof PLANNER_MODES)[number];

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date AAAA-MM-JJ attendue');

export const zPlannerInput = z.object({
  weekStart: date,
  /** Jours de la semaine et minutes disponibles déclarées (0 = indisponible). Ordre chronologique strict. */
  days: z.array(z.object({ date, availableMinutes: z.number().int().nonnegative() }).strict()).min(1)
    .refine((ds) => ds.every((d, i) => i === 0 || (ds[i - 1]?.date ?? '') < d.date), 'jours distincts, ordre chronologique'),
  /**
   * Demandes par sport, dans l'ORDRE DE PRIORITÉ DÉCLARÉ (intention explicite de l'utilisateur ou du programme) :
   * le planificateur n'infère aucune priorité. Un sport au plus une fois.
   */
  demands: z.array(z.object({ sport: z.enum(PLANNER_SPORTS), sessions: z.number().int().positive() }).strict())
    .refine((ds) => new Set(ds.map((d) => d.sport)).size === ds.length, 'un sport au plus une fois'),
  mode: z.enum(PLANNER_MODES),
  /** Séances antérieures à la semaine (historique) : prises en compte pour l'interférence, jamais modifiées. */
  recent: z.array(z.object({ date, sport: z.enum(PLANNER_SPORTS), session: z.custom<SessionDraft>((v) => v !== null && typeof v === 'object') }).strict()).default([]),
}).strict();
export type PlannerInput = z.input<typeof zPlannerInput>;
export type ParsedPlannerInput = z.infer<typeof zPlannerInput>;

/** Horloge injectée : instant de séance d'une date civile (aucune horloge système, aucune heure inventée ici). */
export interface PlannerClock {
  readonly instantOf: (date: string) => ISODateTime;
  readonly timezone: string;
}

export type DayResult =
  | { readonly date: string; readonly availableMinutes: number; readonly status: 'planned'; readonly sport: PlannerSport; readonly requestId: string }
  | { readonly date: string; readonly availableMinutes: number; readonly status: 'empty'; readonly reason: ReasonCode };

export type RequestResult =
  | { readonly requestId: string; readonly sport: PlannerSport; readonly status: 'planned'; readonly date: string; readonly session: SessionDraft; readonly fingerprint?: SessionFingerprint; readonly reasons: readonly ReasonCode[] }
  | { readonly requestId: string; readonly sport: PlannerSport; readonly status: 'refused'; readonly date: string; readonly reasons: readonly ReasonCode[] }
  | { readonly requestId: string; readonly sport: PlannerSport; readonly status: 'unplaced'; readonly reasons: readonly ReasonCode[] };

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
