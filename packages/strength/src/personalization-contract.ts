/** Contrat V2.1 optionnel : son absence conserve strictement les programmes historiques. */
import { z } from 'zod';
export const STRENGTH_OUTCOMES = ['muscle', 'silhouette', 'fat_loss', 'fitness', 'strength', 'performance', 'mobility', 'recomposition'] as const;
export const STRENGTH_ZONES = ['glutes', 'thighs', 'calves', 'abs', 'back', 'shoulders', 'chest', 'arms'] as const;
export const ZONE_INTENTIONS = ['volume', 'appearance', 'strengthen', 'endurance_control'] as const;
const id = z.string().min(1);
// technical-constant: limites de saisie du contrat, indépendantes de la prescription sportive
const MAX_PRIORITIES = 3;
export const zStrengthPersonalization = z.object({
  version: z.literal(1), completed: z.boolean(), outcome: z.enum(STRENGTH_OUTCOMES),
  priorities: z.array(z.object({ zone: z.enum(STRENGTH_ZONES), intention: z.enum(ZONE_INTENTIONS) }).strict()).max(MAX_PRIORITIES)
    .refine(xs => new Set(xs.map(x => x.zone)).size === xs.length, 'Une zone ne peut être sélectionnée deux fois'),
  experience: z.object({ months: z.number().int().nonnegative(), regularSessions: z.number().int().nonnegative(), technique: z.enum(['learning', 'confident', 'advanced']) }).strict(),
  sessionMinutes: z.number().int().positive(),
  // technical-constant: indices des sept jours du calendrier
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(xs => new Set(xs).size === xs.length, 'Jours dupliqués'),
  recovery: z.enum(['normal', 'limited']),
  avoidAreas: z.array(id), avoidExercises: z.array(id), likedExercises: z.array(id),
  painNow: z.boolean(),
}).strict();
export type StrengthPersonalization = z.infer<typeof zStrengthPersonalization>;
export type StrengthOutcome = StrengthPersonalization['outcome'];
export type StrengthZone = StrengthPersonalization['priorities'][number]['zone'];
export const zPersonalizationPolicy = z.object({
  version: id, status: z.literal('candidate'),
  noviceMonths: z.number().nonnegative(), beginnerMonths: z.number().positive(), advancedMonths: z.number().positive(), regularMinimum: z.number().positive(),
  priorityFraction: z.number().min(0).max(1), limitedFactor: z.number().positive().max(1), hybridFactor: z.number().positive().max(1),
  recoveryHours: z.number().positive(), noviceSetsMax: z.number().int().positive(), cautiousRir: z.number().nonnegative(),
  zones: z.record(id, z.object({ muscles: z.array(id), groups: z.array(id), region: z.enum(['upper', 'lower', 'core']), needs: z.array(id) }).strict()),
  intentions: z.record(z.enum(ZONE_INTENTIONS), z.object({ reps: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).strict(), rir: z.number().nonnegative(), restMinS: z.number().nonnegative() }).strict()),
  goals: z.record(z.enum(STRENGTH_OUTCOMES), z.object({ method: z.enum(['hypertrophy', 'strength', 'general']), strategy: id, volumeFactor: z.number().positive().max(1) }).strict()),
}).strict();
