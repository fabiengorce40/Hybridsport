import { z } from 'zod';
import { DISCIPLINES, LEVELS } from './enums.js';
import { zId } from './ruleset.js';

/**
 * Modèle de séance du CORE (spec 02 §5, forme générique). AUCUN champ de structure de planification :
 * les structures sont toujours DÉRIVÉES (spec 04 §6). Les schémas sont stricts (champ inconnu refusé).
 */
const positive = z.number().positive();
const nonNeg = z.number().nonnegative();
const zPaceRange = z.object({ min: positive, max: positive }).strict();

export const zSetPrescription = z.object({
  kind: z.enum(['rampup', 'working', 'backoff', 'amrap', 'top_set']),
  reps: z.number().int().positive(),
  restAfterS: nonNeg,
  rir: z.number().nonnegative().optional(),
}).strict();

export const zPrescription = z.discriminatedUnion('type', [
  z.object({ type: z.literal('sets'), sets: z.array(zSetPrescription).min(1) }).strict(),
  z.object({ type: z.literal('timed'), workS: positive, rounds: z.number().int().positive().default(1), restS: nonNeg.default(0) }).strict(),
  z.object({ type: z.literal('distance'), distanceM: positive, paceSecPerKm: zPaceRange.optional() }).strict(),
  z.object({ type: z.literal('calories'), calories: positive }).strict(),
  z.object({ type: z.literal('reps'), reps: z.number().int().positive() }).strict(),
  z.object({ type: z.literal('hold'), seconds: positive, sets: z.number().int().positive().default(1), restS: nonNeg.default(0) }).strict(),
  z.object({ type: z.literal('mobility'), seconds: positive, sides: z.number().int().positive().default(1) }).strict(),
  z.object({
    type: z.literal('intervals'), reps: z.number().int().positive(),
    work: z.union([z.object({ timeS: positive }).strict(), z.object({ distanceM: positive }).strict()]),
    recoveryS: nonNeg, paceSecPerKm: zPaceRange.optional(),
  }).strict(),
]);
export type Prescription = z.infer<typeof zPrescription>;

export const zItem = z.object({ id: zId, exerciseId: zId, prescription: zPrescription }).strict();
export type SessionItem = z.infer<typeof zItem>;

/** Leviers de compression (spec 07 §3.3), déclarés par bloc et appliqués par ordre de priorité. */
export const zCompressionLever = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('drop_optional_block') }).strict(),
  z.object({ kind: z.literal('reduce_sets'), min: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal('superset_accessories') }).strict(),
  z.object({ kind: z.literal('reduce_rest'), floorS: nonNeg }).strict(),
  z.object({ kind: z.literal('drop_accessory'), keepAtLeast: z.number().int().nonnegative() }).strict(),
  z.object({ kind: z.literal('shorten_conditioning'), minS: positive }).strict(),
  z.object({ kind: z.literal('reduce_run_volume'), minS: positive.optional(), minM: positive.optional() }).strict(),
  z.object({ kind: z.literal('reduce_main_volume'), min: z.number().int().positive() }).strict(),
]);
export type CompressionLever = z.infer<typeof zCompressionLever>;

export const BLOCK_KINDS = ['warmup', 'activation', 'skill', 'strength', 'accessory', 'conditioning', 'running', 'hybrid_station_work', 'finisher', 'cooldown'] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

const blockCommon = {
  id: zId,
  kind: z.enum(BLOCK_KINDS),
  role: z.enum(['primary', 'secondary', 'support']),
  optional: z.boolean().default(false),
  /** Plancher incompressible (échauffement, retour au calme). */
  minDurationS: nonNeg.optional(),
  items: z.array(zItem).min(1),
  levers: z.array(zCompressionLever).default([]),
};

/** Formats de bloc : union discriminée (chaque format ne porte que ses propres champs). */
export const zBlock = z.discriminatedUnion('format', [
  z.object({ ...blockCommon, format: z.literal('sets'), grouping: z.enum(['straight', 'superset', 'circuit']), restBetweenRoundsS: nonNeg.optional() }).strict(),
  z.object({ ...blockCommon, format: z.literal('emom'), minutes: z.number().int().positive() }).strict(),
  z.object({ ...blockCommon, format: z.literal('amrap'), timeCapS: positive }).strict(),
  z.object({ ...blockCommon, format: z.literal('for_time'), rounds: z.number().int().positive(), timeCapS: positive }).strict(),
  z.object({ ...blockCommon, format: z.literal('continuous') }).strict(),
]);
export type SessionBlock = z.infer<typeof zBlock>;

export const zSessionDraft = z.object({
  id: zId,
  discipline: z.enum(DISCIPLINES),
  athleteLevel: z.enum(LEVELS),
  /** Temps réellement disponible A (s) — contrainte HARD : p90 ≤ A (spec 07 §3.1). */
  availableTimeS: positive,
  /** Durée cible T (s) — T ≤ A − marge. */
  targetDurationS: positive,
  /** Profil de tolérance (identifiant de données du ruleset). */
  toleranceProfile: zId,
  blocks: z.array(zBlock).min(1),
}).strict();
export type SessionDraft = z.infer<typeof zSessionDraft>;
export type SessionDraftInput = z.input<typeof zSessionDraft>;
