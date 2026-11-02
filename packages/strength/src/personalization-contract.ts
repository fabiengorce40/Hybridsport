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
  /**
   * Reprise RC5 lot 4.1 — répartition du budget hebdomadaire de séries d'un exercice. Absent (politique V1, semaines V2.x) :
   * minimum des parts de TOUS les groupes touchés (comportement historique, conservé à l'identique). `primary_need` : le
   * besoin vient des groupes PRINCIPAUX de l'exercice (au moins un sous sa cible), le haut hebdomadaire de CHAQUE groupe
   * touché (pondéré) reste une borne stricte. Corrige le veto d'un groupe déjà satisfait, souvent indirect, sur un muscle
   * principal sous sa cible (lot 4.1, § 2).
   */
  allocation: z.enum(['primary_need']).optional(),
  /**
   * Reprise RC5 lot 4.2 (Q4) — PROPOSITION, absente de toute politique publiée (1.0, 1.1) : départage du critère de
   * sélection `volume_fit` par le DÉFICIT RELATIF le plus grand parmi les groupes principaux encore sous leur cible
   * (aujourd'hui : seul le NOMBRE de ces groupes compte, l'égalité tombe sur des critères sans rapport avec le volume).
   * Activation : décision (document 09, Q4).
   */
  volumeFitTieBreak: z.enum(['relative_deficit']).optional(),
  /**
   * Reprise RC5 lot 4.2 (Q2) — PROPOSITION, absente de toute politique publiée : la borne HAUTE hebdomadaire est aussi
   * vérifiée sur 7 jours glissants (`calendar_and_rolling` : le plus contraignant des deux), la CIBLE restant comptée sur la
   * semaine civile (aucun double comptage de la cible). Garde-fou contre l'accumulation aux frontières de semaine.
   * Activation : décision (document 09, Q2).
   */
  highWindow: z.enum(['calendar_and_rolling']).optional(),
  /**
   * Reprise RC5 lot 4.4 (chantier C) — PROPOSITION, absente de toute politique publiée : la part de cible et de borne
   * haute d'une séance se calcule sur les séances de la région RÉELLEMENT placées (`week.placedSessionsByRegion`) et non
   * sur les séances demandées : le volume d'une séance non placée est redistribué aux séances réalisables, toujours
   * plafonné par la borne haute hebdomadaire et le budget de durée. Activation : décision (document 11, § 6).
   */
  redistributeUnplaced: z.literal(true).optional(),
  /**
   * Reprise RC5 lot 4.5 (chantier D) — PROPOSITIONS, absentes de toute politique publiée, lues seulement avec
   * `redistributeUnplaced` :
   * - `redistributeScope: 'deficit'` : la part redistribuée ne sert que la CIBLE des groupes sous leur plancher ; la part de
   *   borne haute d'une séance reste calculée sur les séances demandées (redistribution plus prudente) ;
   * - `redistributeGuard: 'keep_residual'` : une séance qui perdrait un emplacement à temps résiduel (mollets, tronc…)
   *   conservé sans redistribution est générée SANS redistribution (stimulation minimale préservée, raison tracée).
   */
  redistributeScope: z.enum(['deficit', 'priority']).optional(),
  redistributeGuard: z.literal('keep_residual').optional(),
  /**
   * Reprise RC5 lot 4.4 (chantier D) — PROPOSITION, absente de toute politique publiée : réévaluation contrôlée d'une
   * ISOLATION en place (rôle `accessory`, continuité S4). L'isolation en place est remplacée seulement si ses groupes
   * principaux ont atteint leur cible de la semaine ET qu'un autre candidat, au moins aussi adapté (charge, rôle) et sans
   * dépassement supplémentaire, sert un groupe encore sous sa cible. Principaux et secondaires jamais réévalués.
   * Activation : décision (document 11, § 7).
   */
  isolationReview: z.literal('volume_fit').optional(),
}).strict();
