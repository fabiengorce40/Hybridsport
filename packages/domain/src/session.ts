import { z } from 'zod';
import { DISCIPLINES, LEVELS } from './enums.js';
import { zId } from './ruleset.js';
import { addStructureIssues, sessionStructureIssues, zRunStructure } from './run-structure.js';

/**
 * Modèle de séance du CORE (spec 02 §5, forme générique). AUCUN champ de structure de planification :
 * les structures sont toujours DÉRIVÉES (spec 04 §6). Les schémas sont stricts (champ inconnu refusé).
 */
const positive = z.number().positive();
const nonNeg = z.number().nonnegative();
const zPaceRange = z.object({ min: positive, max: positive }).strict();

/** Cible de répétitions : exacte (forme historique) ou plage (CORE-EXT-1). */
export const zRepTarget = z.union([
  z.number().int().positive(),
  z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).strict().refine((r) => r.min <= r.max, 'min ≤ max'),
]);
export type RepTarget = z.infer<typeof zRepTarget>;

/** Effort cible : RIR OU RPE, jamais les deux (même échelle, deux conventions). */
export const zEffort = z.union([
  z.object({ rir: z.number().nonnegative() }).strict(),
  z.object({ rpe: z.number().positive() }).strict(),
]);
export type Effort = z.infer<typeof zEffort>;

/**
 * Intensité d'une série (CORE-EXT-1) : union discriminée qui rend impossibles les combinaisons
 * incohérentes (charge absolue ET effort pur, montée relative sur une série de travail…).
 */
export const zSetIntensity = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('load'), kg: positive, certainty: z.enum(['prescribed', 'suggested']), effort: zEffort.optional() }).strict(),
  z.object({ mode: z.literal('percent_of_reference'), fraction: positive, reference: z.literal('e1rm'), kgRounded: positive, effort: zEffort.optional() }).strict(),
  z.object({ mode: z.literal('effort'), effort: zEffort, indicativeKg: zPaceRange.refine((r) => r.min <= r.max, 'min ≤ max').optional() }).strict(),
  z.object({ mode: z.literal('relative_to_working'), fraction: positive.max(1) }).strict(),
  z.object({ mode: z.literal('bodyweight'), addedKg: nonNeg.optional(), effort: zEffort.optional() }).strict(),
]);
export type SetIntensity = z.infer<typeof zSetIntensity>;

/** Tempo en secondes : excentrique, pause basse, concentrique, pause haute (null = libre). */
export const zTempo = z.tuple([nonNeg.nullable(), nonNeg.nullable(), nonNeg.nullable(), nonNeg.nullable()]);

export const zSetPrescription = z.object({
  kind: z.enum(['rampup', 'working', 'backoff', 'amrap', 'top_set']),
  reps: zRepTarget,
  restAfterS: nonNeg,
  /** Forme historique de l'effort ; exclusive de `intensity`. */
  rir: z.number().nonnegative().optional(),
  intensity: zSetIntensity.optional(),
  tempo: zTempo.optional(),
  /** Série facultative (jamais une montée en charge ni une série lourde). */
  optional: z.boolean().optional(),
}).strict().superRefine((s, ctx) => {
  if (s.rir !== undefined && s.intensity !== undefined) ctx.addIssue({ code: 'custom', message: 'rir (forme historique) et intensity sont exclusifs', path: ['intensity'] });
  if (s.intensity?.mode === 'relative_to_working' && s.kind !== 'rampup') ctx.addIssue({ code: 'custom', message: 'relative_to_working réservé aux montées en charge', path: ['intensity'] });
  if (s.optional === true && (s.kind === 'rampup' || s.kind === 'top_set')) ctx.addIssue({ code: 'custom', message: 'une montée en charge ou une série lourde n’est jamais facultative', path: ['optional'] });
});
export type SetPrescription = z.infer<typeof zSetPrescription>;

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
  // CORE-EXT-R1 : séance structurée à profondeur fixe (voir run-structure.ts).
  zRunStructure,
]);
export type Prescription = z.infer<typeof zPrescription>;

/** Références d'un exercice vers l'emplacement, la track, l'ancre et la provenance (CORE-EXT-1). */
export const zItemRefs = z.object({
  slotId: zId.optional(),
  progressionTrackId: zId.optional(),
  /** declared ⇒ progression_anchor déclaré par l'intention ; candidate ⇒ proposition d'ancre (aucune exemption). */
  anchor: z.enum(['declared', 'candidate']).optional(),
  prescriptionSource: z.enum(['track', 'base_profile', 'calibration', 'substitution', 'history']).optional(),
  substitutedFrom: zId.optional(),
}).strict().refine((r) => r.anchor !== 'declared' || r.progressionTrackId !== undefined, 'une ancre déclarée porte son progressionTrackId');
export type ItemRefs = z.infer<typeof zItemRefs>;

// technical-constant: au plus 3 alternatives prévalidées par exercice (contrat de schéma, spec strength V1.1 §1.1)
const MAX_ALTERNATIVES = 3;
export const zItem = z.object({
  id: zId, exerciseId: zId, prescription: zPrescription,
  refs: zItemRefs.optional(),
  alternatives: z.array(zId).max(MAX_ALTERNATIVES).optional(),
}).strict();
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
}).strict().superRefine((s, ctx) => { addStructureIssues(ctx, sessionStructureIssues(s)); });
export type SessionDraft = z.infer<typeof zSessionDraft>;
export type SessionDraftInput = z.input<typeof zSessionDraft>;
