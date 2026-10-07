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
  /**
   * `engine` : la composition hebdomadaire (archétype de chaque séance) appartient au MOTEUR du sport, appelé sur les
   * jours placés ; l'intention déclarée n'en fournit que le cadre (stimulus, objectif, phase, tolérance). `declared` :
   * intention exécutée telle quelle.
   */
  composition: z.enum(['declared', 'engine']).default('declared'),
}).strict().refine((d) => d.composition !== 'engine' || d.intent.archetypeId === undefined, { message: 'composition par le moteur : archétype non déclaré par le programme', path: ['intent', 'archetypeId'] });
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
  recent: z.array(z.object({
    date, sport: z.enum(PLANNER_SPORTS), session: z.custom<SessionDraft>((v) => v !== null && typeof v === 'object'),
    /**
     * M3 — statut CONNU de la séance antérieure : réalisée, abandonnée, manquée, ou seulement prévue (absent ⇒ prévue).
     * Une séance prévue n'est jamais une observation ; la politique gouvernée décide lesquelles comptent.
     */
    status: z.enum(['executed', 'abandoned', 'missed', 'planned']).optional(),
  }).strict()).default([]),
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
  /** M3 — importance de la voisine (rôle du moteur → table gouvernée), sinon `unknown`. */
  readonly importance?: 'key' | 'standard' | 'unknown';
}
/** Contexte voisin : `known` seulement si TOUTES les voisines d'autres disciplines ont un profil dérivable. */
export interface NeighbourContext { readonly known: boolean; readonly neighbours: readonly NeighbourDemand[] }

/** Catégorie applicative d'une demande (auditable, jamais « planning failed »). */
export const REQUEST_CATEGORIES = [
  'planned', 'engine_refused', 'governance_blocked', 'safety_blocked', 'invalid_intent', 'interference_conflict', 'slot_unavailable', 'engine_unavailable', 'programme_intent_incomplete',
] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export type DemandOutcome =
  | { readonly status: 'derived'; readonly levels: Readonly<Record<string, DemandLevel>> }
  | { readonly status: 'unavailable'; readonly reasons: readonly ReasonCode[] };

export type DayResult =
  | { readonly date: string; readonly availableMinutes: number; readonly status: 'planned'; readonly sport: PlannerSport; readonly requestId: string }
  | { readonly date: string; readonly availableMinutes: number; readonly status: 'empty'; readonly reason: ReasonCode };

/** Composition appliquée à une séance : autorité de la règle du moteur et rôle dans la semaine. */
export interface AppliedComposition { readonly authority: 'approved' | 'provisional'; readonly role: string }
interface RequestBase {
  readonly requestId: string; readonly sport: PlannerSport; readonly category: RequestCategory; readonly reasons: readonly ReasonCode[];
  /** Intention RÉELLEMENT utilisée (déclarée, surchargée ou composée par le moteur). */
  readonly intent?: DeclaredIntent;
  readonly composition?: AppliedComposition;
}
export type RequestResult =
  | (RequestBase & {
    readonly status: 'planned'; readonly date: string; readonly session: SessionDraft; readonly fingerprint?: SessionFingerprint;
    /** Record persistable (session_record courant) : séance, provenance, empreinte, estimation de durée du CORE. */
    readonly record: SessionRecord; readonly demand: DemandOutcome; readonly neighbourContext?: NeighbourContext;
  })
  | (RequestBase & { readonly status: 'refused'; readonly date: string })
  | (RequestBase & {
    readonly status: 'unplaced';
    /**
     * M3.1 — séance COMPOSÉE MAIS NON PLACÉE : le moteur a produit une prescription valide (validée par le CORE) mais
     * aucun jour ne lui a été attribué (créneaux insuffisants, interférence). Absent : aucune prescription exécutable.
     * `referenceDate` / `availableMinutes` : créneau de RÉFÉRENCE de la composition, jamais un placement.
     */
    readonly composed?: UnplacedComposition;
  });

/** Prescription d'une demande non placée (même forme que la partie « séance » d'une demande planifiée). */
export interface UnplacedComposition {
  readonly referenceDate: string;
  readonly availableMinutes: number;
  readonly session: SessionDraft;
  readonly fingerprint?: SessionFingerprint;
  readonly record: SessionRecord;
  readonly demand: DemandOutcome;
}

/**
 * Placement d'une demande (lecture du contrat, jamais du texte) : PLANNED (prescription + jour),
 * COMPOSED_BUT_UNPLACED (prescription valide, aucun jour), BLOCKED (aucune prescription exécutable).
 */
export type Placement = 'PLANNED' | 'COMPOSED_BUT_UNPLACED' | 'BLOCKED';
export const placementOf = (r: RequestResult): Placement => (r.status === 'planned' ? 'PLANNED' : r.status === 'unplaced' && r.composed ? 'COMPOSED_BUT_UNPLACED' : 'BLOCKED');

/**
 * M3 — ARBITRAGE de la semaine (compact, persistable) : statut, passes, décisions APPLIQUÉES, conflits RÉSIDUELS. Le
 * diagnostic complet (tous les conflits évalués) est recalculable et n'est pas stocké.
 */
export interface M3Arbitration {
  readonly status: 'NOT_APPLICABLE' | 'POLICY_UNAVAILABLE' | 'BLOCKED' | 'ADMISSIBLE' | 'RESOLVED' | 'PARTIAL';
  readonly passes: number;
  readonly policyVersion: string | null;
  /** Conflits détectés avant toute action (identifiants compacts `règle|structure|membres`). */
  readonly initial: readonly string[];
  /** Décisions appliquées ; SWAP : `partner` = séance dont le jour a été échangé (régénérée par son moteur). */
  readonly decisions: readonly { readonly action: 'MOVE' | 'SWAP' | 'RECOMPOSE'; readonly requestId: string; readonly from: string; readonly to: string; readonly partner?: string; readonly conflict: string; readonly why: readonly string[] }[];
  readonly residual: readonly { readonly conflict: string; readonly cause: string; readonly tried: readonly string[] }[];
  readonly reasons: readonly ReasonCode[];
}

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
  /** M3 — arbitrage multisport de la semaine (multisport seulement). */
  readonly arbitration?: M3Arbitration;
}
