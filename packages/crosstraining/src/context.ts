/**
 * CrossTrainingContext : concepts propres au Cross-training, absents de SportEngineInput. Validé à la frontière
 * par `parseCrossTrainingContext` (schéma strict, fail-closed : toute anomalie ⇒ refus, jamais une correction).
 *
 * Contrat de SÉANCE RÉALISÉE : la PRESCRIPTION reçue (ce qui a été demandé) et le RÉSULTAT (ce qui a été mesuré)
 * sont deux objets distincts. Aucun débit d'estimation n'y figure : l'estimation de durée n'est jamais une donnée
 * de l'athlète. Le type de résultat découle de la DÉFINITION du format (un AMRAP se mesure en rounds + reps, un
 * « for time » terminé en temps) : c'est une contrainte de cohérence, pas une valeur sportive.
 */
import { z } from 'zod';
import { LEVELS, PAIN_LEVELS, isISODateTime } from '@hybridsport/domain';
import { createCoreRegistry } from '@hybridsport/engine';
import type { ContextParse } from '@hybridsport/engine';
import { CT_GOALS, CT_MODES, CT_RETURN_STATES, CT_STIMULI } from './model.js';
import type { CtFormat } from './model.js';
import { CT_CAPABILITY_IDS } from './capabilities.js';

const core = createCoreRegistry();
const instant = z.string().refine(isISODateTime, 'instant ISO attendu');
const exerciseId = z.string().min(1);
// zod 4 refuse nativement les nombres non finis (Infinity, NaN).
const positive = z.number().positive();
const count = z.number().int().nonnegative();
// technical-constant: borne haute de l'échelle CR10 modifiée 0–10 utilisée pour le sRPE (Foster 2001) : définition de l'échelle, pas une cible
const CR10_MAX = 10;

/** Quantité PRESCRITE d'un mouvement (ce que l'athlète doit faire). */
export const zPrescribedQuantity = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reps'), value: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal('calories'), value: positive }).strict(),
  z.object({ kind: z.literal('distance_m'), value: positive }).strict(),
  z.object({ kind: z.literal('duration_s'), value: positive }).strict(),
]);

/** Charge externe PRESCRITE (absente = mouvement au poids du corps ou non chargé). */
export const zPrescribedLoad = z.object({ kind: z.literal('external_kg'), value: positive }).strict();

export const zPrescribedItem = z.object({
  exerciseId,
  quantity: zPrescribedQuantity,
  load: zPrescribedLoad.optional(),
  /** Variante réellement prescrite (scaling), identifiant de catalogue ; absente = mouvement standard. */
  variantOf: exerciseId.optional(),
}).strict();
export type CtPrescribedItem = z.infer<typeof zPrescribedItem>;

/** Structure PRESCRITE, par format. Aucune valeur par défaut : chaque champ est fourni par l'enregistrement. */
export const zCtPrescription = z.discriminatedUnion('format', [
  z.object({ format: z.literal('for_time'), rounds: z.number().int().positive(), timeCapS: positive.optional(), items: z.array(zPrescribedItem).min(1) }).strict(),
  z.object({ format: z.literal('amrap'), durationS: positive, items: z.array(zPrescribedItem).min(1) }).strict(),
  z.object({ format: z.literal('emom'), minutes: z.number().int().positive(), items: z.array(zPrescribedItem).min(1) }).strict(),
  z.object({ format: z.literal('intervals'), rounds: z.number().int().positive(), workS: positive, restS: positive, items: z.array(zPrescribedItem).min(1) }).strict(),
  z.object({ format: z.literal('continuous'), durationS: positive, items: z.array(zPrescribedItem).min(1) }).strict(),
]);
export type CtPrescription = z.infer<typeof zCtPrescription>;

/** RÉSULTAT mesuré (performance), séparé de la prescription. */
export const zCtResult = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('time'), completionS: positive }).strict(),
  z.object({ kind: z.literal('capped'), repsCompleted: count }).strict(),
  z.object({ kind: z.literal('rounds_reps'), rounds: count, reps: count }).strict(),
  z.object({ kind: z.literal('emom'), minutesCompleted: count }).strict(),
  z.object({ kind: z.literal('intervals'), intervalsCompleted: count }).strict(),
  /** Continu : au moins une mesure. `durationS` = durée de travail RÉALISÉE (mesure, pas une métrique physiologique). */
  z.object({ kind: z.literal('total'), durationS: positive.optional(), calories: positive.optional(), distanceM: positive.optional() }).strict(),
  z.object({ kind: z.literal('abandoned') }).strict(),
]);
export type CtResult = z.infer<typeof zCtResult>;

/** Types de résultat compatibles avec la définition de chaque format. */
export const RESULT_KINDS_BY_FORMAT: Readonly<Record<CtFormat, readonly CtResult['kind'][]>> = {
  for_time: ['time', 'capped', 'abandoned'],
  amrap: ['rounds_reps', 'abandoned'],
  emom: ['emom', 'abandoned'],
  intervals: ['intervals', 'abandoned'],
  continuous: ['total', 'abandoned'],
};

/** Incohérences DÉFINITIONNELLES prescription ↔ résultat (vide = cohérent). */
export function resultIssues(p: CtPrescription, r: CtResult): string[] {
  const out: string[] = [];
  if (!RESULT_KINDS_BY_FORMAT[p.format].includes(r.kind)) out.push(`résultat ${r.kind} incompatible avec le format ${p.format}`);
  if (p.format === 'for_time' && r.kind === 'time' && p.timeCapS !== undefined && r.completionS > p.timeCapS) out.push('temps supérieur au time cap : le résultat est « capped »');
  if (p.format === 'for_time' && r.kind === 'capped' && p.timeCapS === undefined) out.push('résultat « capped » sans time cap prescrit');
  if (p.format === 'emom' && r.kind === 'emom' && r.minutesCompleted > p.minutes) out.push('plus de minutes réalisées que prescrites');
  if (p.format === 'intervals' && r.kind === 'intervals' && r.intervalsCompleted > p.rounds) out.push('plus d’intervalles réalisés que prescrits');
  if (r.kind === 'total' && r.calories === undefined && r.distanceM === undefined && r.durationS === undefined) out.push('total sans mesure');
  return out;
}

/**
 * Complétion DÉCLARÉE de la séance réalisée (CT-D15.d) :
 * - `completed_as_prescribed` : réalisée intégralement telle que prescrite (seule source possible d'un rejeu strict) ;
 * - `completed` : terminée, mais modifiée (scaling, réduction, autre mouvement…) ;
 * - `abandoned` : arrêtée avant la fin (abandon, interruption, arrêt anticipé).
 */
export const CT_COMPLETIONS = ['completed_as_prescribed', 'completed', 'abandoned'] as const;
export type CtCompletion = (typeof CT_COMPLETIONS)[number];

/** Incohérences DÉFINITIONNELLES complétion ↔ prescription ↔ résultat (vide = cohérent). Aucun seuil. */
export function completionIssues(p: CtPrescription, r: CtResult, completion: CtCompletion): string[] {
  const out: string[] = [];
  if ((completion === 'abandoned') !== (r.kind === 'abandoned')) out.push('complétion « abandoned » ⇔ résultat « abandoned »');
  if (completion === 'completed_as_prescribed') {
    if (r.kind === 'capped') out.push('résultat « capped » : la séance n’a pas été réalisée telle que prescrite');
    if (p.format === 'emom' && r.kind === 'emom' && r.minutesCompleted < p.minutes) out.push('minutes réalisées inférieures aux minutes prescrites');
    if (p.format === 'intervals' && r.kind === 'intervals' && r.intervalsCompleted < p.rounds) out.push('intervalles réalisés inférieurs aux intervalles prescrits');
    if (p.format === 'continuous' && r.kind === 'total' && r.durationS !== undefined && r.durationS < p.durationS) out.push('durée réalisée inférieure à la durée prescrite');
    if (p.format === 'continuous' && r.kind === 'total' && r.durationS === undefined) out.push('continu « tel que prescrit » : durée réalisée requise');
  }
  return out;
}

export const zRealizedCtSession = z.object({
  sessionId: z.string().min(1),
  completedAt: instant,
  stimulus: z.enum(CT_STIMULI),
  prescription: zCtPrescription,
  result: zCtResult,
  /** Complétion DÉCLARÉE (obligatoire : une omission n'est jamais lue comme « tel que prescrit »). */
  completion: z.enum(CT_COMPLETIONS),
  /** Effort perçu de séance (CR10) DÉCLARÉ ; absent = inconnu, jamais une valeur par défaut. Aucun seuil sRPE en C2. */
  sessionRpe: z.number().min(0).max(CR10_MAX).optional(),
  /** Douleur déclarée pendant ou après la séance ; absente = inconnue. */
  pain: z.enum(['NONE', ...PAIN_LEVELS]).optional(),
  /** Tolérance déclarée : `poorly_tolerated` = séance explicitement mal tolérée ; absente = non déclarée. */
  tolerance: z.enum(['tolerated', 'poorly_tolerated']).optional(),
}).strict().superRefine((s, ctx) => {
  for (const problem of resultIssues(s.prescription, s.result)) ctx.addIssue({ code: 'custom', path: ['result'], message: problem });
  for (const problem of completionIssues(s.prescription, s.result, s.completion)) ctx.addIssue({ code: 'custom', path: ['completion'], message: problem });
});
export type RealizedCtSession = z.infer<typeof zRealizedCtSession>;

export const zCrossTrainingContext = z.object({
  population: z.object({ level: z.enum(LEVELS), hybrid: z.boolean() }).strict(),
  goal: z.object({ type: z.enum(CT_GOALS) }).strict(),
  /** État de reprise DÉCLARÉ ; UNKNOWN n'est jamais NONE. */
  returnState: z.object({ state: z.enum(CT_RETURN_STATES) }).strict(),
  /** Mouvements techniques DÉCLARÉS maîtrisés (identifiants du catalogue) ; aucune compétence n'est déduite. */
  declaredSkills: z.array(exerciseId),
  sessionHistory: z.array(zRealizedCtSession),
  /** Benchmarks réalisés : des repères de PERFORMANCE, jamais une dose. */
  benchmarks: z.array(z.object({ benchmarkId: z.string().min(1), at: instant, prescription: zCtPrescription, result: zCtResult }).strict().superRefine((b, ctx) => {
    for (const problem of resultIssues(b.prescription, b.result)) ctx.addIssue({ code: 'custom', path: ['result'], message: problem });
  })),
  mode: z.enum(CT_MODES),
  capabilityRequests: z.array(z.enum(CT_CAPABILITY_IDS)),
}).strict();
export type CrossTrainingContext = z.infer<typeof zCrossTrainingContext>;
export type CrossTrainingContextInput = z.input<typeof zCrossTrainingContext>;

/** Validation stricte : toute anomalie ⇒ TECHNICAL.SCHEMA_INVALID (aucun champ complété, aucun défaut). */
export function parseCrossTrainingContext(raw: unknown): ContextParse<CrossTrainingContext> {
  const parsed = zCrossTrainingContext.safeParse(raw);
  if (parsed.success) return { ok: true, context: parsed.data };
  return { ok: false, reasons: parsed.error.issues.map((i) => core.emit('TECHNICAL.SCHEMA_INVALID', { path: `disciplineContext.${i.path.join('.')}`, problem: i.message })) };
}
