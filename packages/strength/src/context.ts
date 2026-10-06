/**
 * StrengthContext (addendum V1.1 §1.2) : UNIQUEMENT ce qui est propre à la musculation et absent de
 * SportEngineInput (niveau, matériel, exclusions, restrictions, douleur, lecture de l'état, stimulus,
 * temps, intentions de répétition, notes du planificateur, empreintes : déjà transmis par le CORE).
 * Validé à la frontière par `parseStrengthContext` (schéma strict).
 */
import { z } from 'zod';
import { DEMAND_LEVELS, DISCIPLINES, isISODateTime, zRepTarget } from '@hybridsport/domain';
import { createCoreRegistry } from '@hybridsport/engine';
import type { ContextParse } from '@hybridsport/engine';
import { PHASE_KINDS, PROGRESSION_MODELS } from './params.js';

const id = z.string().min(1);
const instant = z.string().refine(isISODateTime, 'instant ISO attendu');
const nonNeg = z.number().nonnegative();

const zGoalRef = z.discriminatedUnion('goal', [
  z.object({ goal: z.literal('strength') }).strict(),
  z.object({ goal: z.literal('hypertrophy') }).strict(),
  z.object({ goal: z.literal('general') }).strict(),
  z.object({ goal: z.literal('support'), supportFor: z.enum(['running', 'hybrid_race', 'crosstraining']) }).strict(),
]);
export type StrengthGoalRef = z.infer<typeof zGoalRef>;

/** Source d'une référence de charge (hiérarchie R1–R5, spec strength 04 §10.1). */
export const CAPACITY_SOURCES = ['app_sets_with_rir', 'app_sets_without_rir', 'declared_1rm', 'declared_recent_loads'] as const;

export const zStrengthCapacity = z.object({
  exerciseId: id,
  /** Salle / profil de matériel (D-S6) : une charge de machine n'est jamais transférée hors de ce contexte. */
  contextKey: id.optional(),
  source: z.enum(CAPACITY_SOURCES),
  asOf: instant,
  e1rmKg: z.number().positive().optional(),
  loadKg: z.number().positive().optional(),
  reps: z.number().int().positive().optional(),
  rir: nonNeg.optional(),
}).strict().refine((c) => c.e1rmKg !== undefined || (c.loadKg !== undefined && c.reps !== undefined), 'e1rmKg, ou loadKg + reps');
export type StrengthCapacity = z.infer<typeof zStrengthCapacity>;

/** Prochaine prescription d'une track (fixée par le ProgressionEngine). */
export const zNextPrescription = z.object({
  sets: z.number().int().positive(),
  reps: zRepTarget,
  loadKg: z.number().positive().optional(),
  rir: nonNeg.optional(),
}).strict();
export type NextPrescription = z.infer<typeof zNextPrescription>;

export const zStrengthTrack = z.object({
  trackId: id,
  tier: z.enum(['anchor', 'tracked']),
  exerciseId: id,
  archetypeId: id,
  slotId: id,
  model: z.enum(PROGRESSION_MODELS),
  status: z.enum(['active', 'suspended', 'closed']),
  openedAt: instant,
  /** Capacité au début du mésocycle (plafond de gain par cycle). */
  cycleStartLoadKg: z.number().positive().optional(),
  /** Plage de répétitions du modèle (double progression). */
  repRange: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).strict().optional(),
  /** e1RM lissé suivi par le modèle autorégulé. */
  e1rmKg: z.number().positive().optional(),
  consecutiveSuccess: z.number().int().nonnegative(),
  consecutiveBelow: z.number().int().nonnegative(),
  consecutiveHolds: z.number().int().nonnegative(),
  nextPrescription: zNextPrescription.optional(),
}).strict();
export type StrengthTrack = z.infer<typeof zStrengthTrack>;

export const zPerformedSet = z.object({ reps: z.number().int().nonnegative(), loadKg: z.number().nonnegative().optional(), rir: nonNeg.optional() }).strict();

export const zExerciseExposure = z.object({
  exerciseId: id,
  at: instant,
  slotId: id.optional(),
  sets: z.array(zPerformedSet),
}).strict();
export type ExerciseExposure = z.infer<typeof zExerciseExposure>;

export const zStrengthContext = z.object({
  goal: z.object({ primary: zGoalRef, secondary: zGoalRef.optional() }).strict(),
  phase: z.object({ kind: z.enum(PHASE_KINDS), weekInMesocycle: z.number().int().positive(), mesocycleLength: z.number().int().positive() }).strict()
    .refine((p) => p.weekInMesocycle <= p.mesocycleLength, 'weekInMesocycle ≤ mesocycleLength'),
  capacities: z.array(zStrengthCapacity),
  tracks: z.array(zStrengthTrack),
  recentExposures: z.array(zExerciseExposure),
  /** E1 réalisé sur 7 jours, par groupe musculaire (identifiants de données du ruleset). */
  hardSets: z.object({ d7: z.record(id, nonNeg) }).strict(),
  week: z.object({
    otherStrengthSessions: z.array(z.object({ intentId: id, archetypeId: id, plannedHardSets: z.record(id, nonNeg), done: z.boolean() }).strict()),
    neighbors: z.array(z.object({
      discipline: z.enum(DISCIPLINES), stimulus: id, priority: z.enum(['key', 'standard', 'optional']),
      hoursFromThisSession: z.number(), demand: z.record(id, z.enum(DEMAND_LEVELS)),
    }).strict()),
    /** Contexte de semaine connu du planificateur (sinon hypothèse prudente, DATA.WEEK_CONTEXT_UNKNOWN). */
    known: z.boolean(),
  }).strict(),
  preferences: z.object({ liked: z.array(id), disliked: z.array(id) }).strict(),
  /** Incréments réalisables déclarés, par équipement : pas et charge maximale éventuelle. */
  equipmentIncrements: z.record(id, z.object({ stepKg: z.number().positive(), maxKg: z.number().positive().optional() }).strict()).optional(),
  /** Salle / profil de matériel courant (D-S6) : une référence de machine n'est valable que dans son contexte. */
  currentContextKey: id.optional(),
  /**
   * Strength S4 — politique de CONTINUITÉ déclarée par le programme (décision produit, jamais une valeur sportive) :
   * `keep_incumbent` ⇒ l'exercice EN PLACE d'un emplacement (dernière exposition réalisée de cet emplacement) est
   * conservé tant qu'il reste admissible (filtres F1–F10), que l'emplacement n'a ni ancre déclarée ni accessoire suivi
   * différent et qu'aucune raison de rotation du ruleset (non aimé, stagnation) ne s'applique. Absente : comportement
   * antérieur (classement seul).
   */
  continuity: z.enum(['keep_incumbent']).optional(),
  /**
   * Strength S4 — priorité DÉCLARÉE des sports du programme (ordre), transportée par le planificateur sans
   * interprétation. Tracée par le moteur ; aucune politique d'interférence ne la lit (capacité BLOQUÉE).
   */
  sportPriority: z.object({ order: z.array(z.enum(DISCIPLINES)).min(1) }).strict().optional(),
}).strict();
export type StrengthContext = z.infer<typeof zStrengthContext>;
export type StrengthContextInput = z.input<typeof zStrengthContext>;

const registry = createCoreRegistry();

/** Parseur fourni au CORE (CORE-EXT-2) : rien ne franchit la frontière sans validation stricte. */
export function parseStrengthContext(raw: unknown): ContextParse<StrengthContext> {
  const r = zStrengthContext.safeParse(raw);
  if (r.success) return { ok: true, context: r.data };
  return { ok: false, reasons: r.error.issues.map((i) => registry.emit('TECHNICAL.SCHEMA_INVALID', { path: `strengthContext.${i.path.join('.')}`, problem: i.message })) };
}
