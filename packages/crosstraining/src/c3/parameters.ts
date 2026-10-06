/**
 * C3 — FORME attendue des paramètres gouvernés lus par la composition, et leur lecture fail-closed.
 *
 * Le code ne contient AUCUNE valeur : il déclare seulement la forme qu'une décision experte devra prendre. Paramètre
 * non résolu (registre réel : tous) ⇒ refus tracé ; valeur résolue mais d'une autre forme ⇒ refus
 * C3_PARAMETER_UNREADABLE (jamais une interprétation partielle, jamais un défaut).
 */
import { z } from 'zod';
import { DEMAND_LEVELS, LEVELS } from '@hybridsport/domain';
import type { ReasonCode } from '@hybridsport/domain';
import { CT_FORMATS, CT_STIMULI } from '../model.js';
import type { CtMode } from '../model.js';
import { CT_CODES, ctReasons } from '../codes.js';
import { resolveParameter } from '../governance/parameters.js';
import type { CtGovernance } from '../governance/state.js';
import { CT_MOVEMENT_ROLES, CT_SESSION_BLOCK_KINDS } from './taxonomy.js';

// technical-constant: une minute = 60 s (définition du format EMOM, pas une valeur sportive)
export const SECONDS_PER_MINUTE = 60;

const positive = z.number().positive();
const positiveInt = z.number().int().positive();
const level = z.enum(LEVELS);
const stimulus = z.enum(CT_STIMULI);
const format = z.enum(CT_FORMATS);
const role = z.enum(CT_MOVEMENT_ROLES);
const perLevel = <T extends z.ZodType>(t: T) => z.partialRecord(level, t);

/** Quantité par rôle (ce que l'athlète reçoit), dans l'unité NATIVE du mouvement ; aucune conversion. */
export const zRoleQuantity = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reps'), value: positiveInt }).strict(),
  z.object({ kind: z.literal('calories'), value: positive }).strict(),
  z.object({ kind: z.literal('distance_m'), value: positive }).strict(),
]);
export type RoleQuantity = z.infer<typeof zRoleQuantity>;
const quantities = z.partialRecord(role, zRoleQuantity);

/** `ct.dose.construction` (CT-D2) : table d'entrée stimulus → format → niveau → dose du bloc. */
export const zFormatDose = z.object({
  continuous: z.object({ workS: positive }).strict().optional(),
  intervals: z.object({ workS: positive, restS: positive, rounds: positiveInt }).strict().optional(),
  emom: z.object({ minutes: positiveInt, quantities }).strict().optional(),
  amrap: z.object({ timeCapS: positive, quantities }).strict().optional(),
  for_time: z.object({ rounds: positiveInt, quantities }).strict().optional(),
}).strict();
export const zDoseConstruction = z.partialRecord(stimulus, z.partialRecord(level, zFormatDose));
export type FormatDoseTable = z.infer<typeof zFormatDose>;

/** `ct.estimation.workRates` (CT-D2, ESTIMATION) : débit par minute, rapide / typique / lent, par niveau. Jamais une prescription. */
export const zWorkRates = z.record(z.string().min(1), z.object({
  unit: z.enum(['reps', 'calories', 'distance_m']),
  rate: perLevel(z.object({ fast: positive, typical: positive, slow: positive }).strict().refine((r) => r.fast >= r.typical && r.typical >= r.slow, 'fast ≥ typical ≥ slow')),
}).strict());
export type WorkRates = z.infer<typeof zWorkRates>;

export const PARAMETER_SCHEMAS = {
  'ct.stimulus.catalog': z.array(stimulus),
  'ct.stimulus.admissibleFormats': z.partialRecord(stimulus, z.array(format)),
  'ct.stimulus.timeDomains': z.partialRecord(stimulus, z.object({ minS: positive, maxS: positive }).strict().refine((d) => d.minS <= d.maxS, 'minS ≤ maxS')),
  'ct.stimulus.workRestRatios': z.partialRecord(stimulus, z.object({ min: positive, max: positive }).strict().refine((d) => d.min <= d.max, 'min ≤ max')),
  'ct.composition.sessionStructure': z.partialRecord(stimulus, z.array(z.enum(CT_SESSION_BLOCK_KINDS)).min(1)),
  'ct.composition.movementPool': z.array(z.object({ movementId: z.string().min(1), contentReviewRef: z.string().min(1) }).strict()),
  'ct.composition.movementRoles': z.partialRecord(stimulus, z.partialRecord(format, z.array(role).min(1))),
  'ct.dose.construction': zDoseConstruction,
  'ct.estimation.workRates': zWorkRates,
  'ct.format.timeCapMargin': z.number().nonnegative(),
  'ct.format.emomDensity': perLevel(z.number().positive().max(SECONDS_PER_MINUTE)),
  'ct.safety.repsPerMovementCap': perLevel(positiveInt),
  'ct.safety.jumpContactsCap': perLevel(positiveInt),
  /** Technicité maximale (ordinal du catalogue) admise sous fatigue, par niveau ; compétences déclarées admises ou non. */
  'ct.safety.technicalUnderFatigue': z.object({ maxTechnicalCost: perLevel(z.number().int().nonnegative()), declaredSkillsAdmitted: z.boolean() }).strict(),
  /** Stimuli exclus par niveau (CT-G1-NOVICE). */
  'ct.safety.novicePolicy': z.object({ excludedStimuli: perLevel(z.array(stimulus)) }).strict(),
  'ct.history.recencyBand': positive,
  /** Réponse à une séance précédente négative : refuser, ou écarter ses mouvements. */
  'ct.history.negativeResponse': z.object({
    abandoned: z.enum(['refuse', 'exclude_movements']), poorly_tolerated: z.enum(['refuse', 'exclude_movements']), pain: z.enum(['refuse', 'exclude_movements']),
  }).strict(),
  /** Interprétation des voisines transportées : niveaux de demande d'une voisine qui font ÉVITER (jamais exclure) un mouvement. */
  'ct.hybrid.policy': z.object({ avoidNeighbourLevels: z.array(z.enum(DEMAND_LEVELS)) }).strict(),
  /** Charge d'implément par mouvement et par niveau (kg). */
  'ct.load.implementStandards': z.record(z.string().min(1), perLevel(positive)),
} as const;
export type C3ParameterId = keyof typeof PARAMETER_SCHEMAS;
export type C3Value<K extends C3ParameterId> = z.infer<(typeof PARAMETER_SCHEMAS)[K]>;

export type Read<T> = { readonly ok: true; readonly value: T; readonly reasons: readonly ReasonCode[] } | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

/** Lecture fail-closed d'un paramètre C3 : résolu dans le mode ET conforme à la forme déclarée. */
export function readC3<K extends C3ParameterId>(governance: CtGovernance, id: K, mode: CtMode): Read<C3Value<K>> {
  const r = resolveParameter(governance.parameters, id, mode);
  if (r.status === 'unresolved') return { ok: false, reasons: r.reasons };
  const parsed = PARAMETER_SCHEMAS[id].safeParse(r.value);
  if (!parsed.success) return { ok: false, reasons: [...r.reasons, ctReasons.emit(CT_CODES.C3_PARAMETER_UNREADABLE, { parameterId: id, detail: parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(' ; ') })] };
  return { ok: true, value: parsed.data as C3Value<K>, reasons: r.reasons };
}

/** Lit plusieurs paramètres ; le premier échec est rendu (ordre stable), les traces des succès sont conservées. */
export function readAll<K extends C3ParameterId>(governance: CtGovernance, ids: readonly K[], mode: CtMode): { readonly ok: true; readonly values: { [P in K]: C3Value<P> }; readonly reasons: readonly ReasonCode[] } | { readonly ok: false; readonly missing: readonly K[]; readonly reasons: readonly ReasonCode[] } {
  const values: Partial<{ [P in K]: C3Value<P> }> = {};
  const reasons: ReasonCode[] = [];
  const missing: K[] = [];
  for (const id of ids) {
    const r = readC3(governance, id, mode);
    reasons.push(...r.reasons);
    if (r.ok) values[id] = r.value; else missing.push(id);
  }
  if (missing.length > 0) return { ok: false, missing, reasons };
  return { ok: true, values: values as { [P in K]: C3Value<P> }, reasons };
}
