import { z } from 'zod';
import { PAIN_LEVELS, SKIP_REASONS } from './enums.js';
import { zId } from './ruleset.js';
import { isISODateTime } from './time.js';

const zInstant = z.string().refine(isISODateTime, 'instant ISO attendu');

/**
 * Signalement de douleur (spec 02 §7, 09 §7) : CHOIX FERMÉS uniquement (niveau, zones fonctionnelles,
 * mouvements cochés). Aucun texte libre, aucune interprétation médicale. Les descriptions présentées à
 * l'utilisateur et les comportements associés sont des contenus G1 du ruleset.
 */
export const zPainReport = z.object({
  id: zId,
  level: z.enum(PAIN_LEVELS),
  bodyAreas: z.array(zId),
  affectedMovements: z.array(zId).default([]),
  context: z.enum(['during_session', 'after_session', 'check_in']),
  reportedAt: zInstant,
  resolution: z.object({ declaredAt: zInstant, kind: z.enum(['resolved', 'professional_evaluated']) }).strict().optional(),
  /** false si l'utilisateur n'a pas consenti à la conservation des données de santé. */
  persisted: z.boolean(),
  rulesetRef: z.string().min(1),
}).strict().refine((r) => r.level === 'P4' || r.bodyAreas.length > 0, 'P1–P3 : au moins une zone fonctionnelle');
export type PainReport = z.infer<typeof zPainReport>;
export type PainReportInput = z.input<typeof zPainReport>;

/** Déclaration de l'utilisateur (ex. reprise autorisée par un professionnel) — jamais une autorisation inventée. */
export const zUserDeclaration = z.object({ kind: zId, declaredAt: zInstant, rulesetRef: z.string().min(1) }).strict();
export type UserDeclaration = z.infer<typeof zUserDeclaration>;

/** Exécution minimale vue par les mécanismes de performance. */
export const zExecutionRecord = z.object({
  id: zId,
  completed: z.boolean(),
  skipReason: z.enum(SKIP_REASONS).optional(),
}).strict();
export type ExecutionRecord = z.infer<typeof zExecutionRecord>;
