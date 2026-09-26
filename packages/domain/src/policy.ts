import { z } from 'zod';
import { zId } from './ruleset.js';

/** Facteurs de contexte d'une politique d'application (spec 04 §4.1). Valeurs = identifiants de données. */
export const ENFORCEMENT_CONTEXT_KEYS = ['stimulus', 'structure', 'athleteLevel', 'phase', 'keySessionProximity', 'dataQuality'] as const;
export type EnforcementContextKey = (typeof ENFORCEMENT_CONTEXT_KEYS)[number];
export type EnforcementContext = Readonly<Partial<Record<EnforcementContextKey, string>>>;

const zOutcome = z.object({
  level: z.enum(['hard', 'soft', 'inactive']).optional(),
  threshold: z.number().optional(),
  /** Seuil lu dans un paramètre numérique du ruleset (évite de dupliquer la valeur). */
  thresholdParam: zId.optional(),
  penaltyWeight: z.number().nonnegative().optional(),
}).strict();

export const zEnforcementPolicy = z.object({
  ruleId: zId,
  thresholdUnit: z.string().optional(),
  /** Sens dans lequel le seuil devient plus PRUDENT (sert au contrôle de monotonie). */
  thresholdSafeDirection: z.enum(['increase', 'decrease']).optional(),
  /** `inactive` n'est permis que si la politique l'autorise explicitement. */
  allowInactive: z.boolean().default(false),
  default: zOutcome.extend({ level: z.enum(['hard', 'soft', 'inactive']) }),
  overrides: z.array(z.object({
    when: z.partialRecord(z.enum(ENFORCEMENT_CONTEXT_KEYS), z.array(z.string()).min(1)),
    set: zOutcome,
  }).strict()).default([]),
}).strict();
export type EnforcementPolicyDocument = z.infer<typeof zEnforcementPolicy>;
