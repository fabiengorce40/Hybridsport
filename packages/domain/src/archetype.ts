import { z } from 'zod';
import { DISCIPLINES, LEVELS, REVIEW_STATUSES } from './enums.js';
import { zId, zSemVer } from './ruleset.js';
import { BLOCK_KINDS, zCompressionLever } from './session.js';

/**
 * SessionArchetype (spec 06, spec 07 §1 étape 2) — SCHÉMA et invariants uniquement. Les archétypes
 * concrets sont du contenu de discipline, définis avec chaque moteur et relus par un expert ; aucun
 * n'est défini dans le CORE.
 */

export const BLOCK_FORMATS = ['sets', 'emom', 'amrap', 'for_time', 'continuous'] as const;

/** Exigence d'un emplacement : tous les critères présents doivent être satisfaits par l'exercice. */
export const zSlotRequirement = z.object({
  pattern: zId.optional(),
  region: z.enum(['lower', 'upper', 'full', 'core', 'cyclic', 'none']).optional(),
  compound: z.boolean().optional(),
  movementTypes: z.array(z.enum(['strength', 'power', 'olympic', 'gymnastic', 'monostructural', 'carry', 'mobility', 'plyometric', 'isometric'])).min(1).optional(),
}).strict();
export type SlotRequirement = z.infer<typeof zSlotRequirement>;

export const zArchetypeSlot = z.object({
  id: zId,
  requirement: zSlotRequirement,
  /** Nombre d'exercices à placer dans l'emplacement. */
  count: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).strict(),
  /** CC1 : familles distinctes exigées parmi les candidats (variété possible). */
  minFamilies: z.number().int().positive().optional(),
  /** Préférence de modalité portée par l'emplacement (spec 03 §7) : un libellé, jamais un bonus chiffré. */
  modalityPreference: z.enum(['load_ceiling', 'stability', 'specificity']).optional(),
}).strict();
export type ArchetypeSlot = z.infer<typeof zArchetypeSlot>;

export const zArchetypeBlock = z.object({
  id: zId,
  kind: z.enum(BLOCK_KINDS),
  role: z.enum(['primary', 'secondary', 'support']),
  optional: z.boolean().default(false),
  formats: z.array(z.enum(BLOCK_FORMATS)).min(1),
  minDurationS: z.number().nonnegative().optional(),
  slots: z.array(zArchetypeSlot).min(1),
  /** Leviers de compression, dans l'ordre de l'archétype (spec 07 §3.3). */
  levers: z.array(zCompressionLever).default([]),
}).strict();
export type ArchetypeBlock = z.infer<typeof zArchetypeBlock>;

export const zSessionArchetype = z.object({
  id: zId,
  version: zSemVer,
  discipline: z.enum(DISCIPLINES),
  status: z.enum(REVIEW_STATUSES),
  stimulus: zId,
  toleranceProfile: zId,
  levels: z.array(z.enum(LEVELS)).min(1),
  duration: z.object({ minS: z.number().positive(), maxS: z.number().positive() }).strict(),
  blocks: z.array(zArchetypeBlock).min(1),
  /** Faisabilité par preset : chaque preset est déclaré faisable ou infaisable, jamais implicite (CC1). */
  feasiblePresets: z.array(zId),
  declaredInfeasiblePresets: z.array(zId).default([]),
  /** CC7 : restrictions sous lesquelles l'archétype est explicitement déclaré infaisable. */
  declaredInfeasibleRestrictions: z.array(zId).default([]),
}).strict().superRefine((a, ctx) => {
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  const blockIds = a.blocks.map((b) => b.id);
  if (new Set(blockIds).size !== blockIds.length) issue('identifiants de blocs dupliqués', ['blocks']);
  const slotIds = a.blocks.flatMap((b) => b.slots.map((s) => s.id));
  if (new Set(slotIds).size !== slotIds.length) issue('identifiants d’emplacements dupliqués', ['blocks']);
  const primaries = a.blocks.filter((b) => b.role === 'primary');
  if (primaries.length === 0) issue('au moins un bloc principal', ['blocks']);
  a.blocks.forEach((b, i) => {
    if (b.role === 'primary' && b.optional) issue('un bloc principal n’est jamais optionnel', ['blocks', i, 'optional']);
    b.slots.forEach((s, j) => { if (s.count.min > s.count.max) issue('count.min ≤ count.max', ['blocks', i, 'slots', j, 'count']); });
  });
  if (a.duration.minS > a.duration.maxS) issue('duration.minS ≤ duration.maxS', ['duration']);
  const both = a.feasiblePresets.filter((p) => a.declaredInfeasiblePresets.includes(p));
  if (both.length > 0) issue(`preset à la fois faisable et infaisable : ${both.join(', ')}`, ['feasiblePresets']);
});
export type SessionArchetype = z.infer<typeof zSessionArchetype>;
export type SessionArchetypeInput = z.input<typeof zSessionArchetype>;
