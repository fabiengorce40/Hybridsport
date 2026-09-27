/**
 * Paramètres du StrengthEngine (spec strength V1 07 §1, addendum V1.1 §9). AUCUNE valeur sportive
 * dans le code : tout est lu dans le ruleset, validé par un schéma strict, et tracé
 * (`parametersUsed`). Paramètre absent ou mal formé ⇒ RulesetParameterError (erreur explicite).
 */
import { z } from 'zod';
import { LEVELS, zCompressionLever, zSlotRequirement } from '@hybridsport/domain';
import type { GovernanceClass } from '@hybridsport/domain';
import { RulesetParameterError } from '@hybridsport/engine';
import type { CoreParameterSpec, LoadedRuleset } from '@hybridsport/engine';

export const ROLES = ['primary', 'secondary', 'accessory'] as const;
export type SlotRole = (typeof ROLES)[number];
export const EXERCISE_CLASSES = ['compound_high_load', 'compound_other', 'isolation', 'bodyweight_capped'] as const;
export type ExerciseClass = (typeof EXERCISE_CLASSES)[number];
export const PROGRESSION_MODELS = ['linear_load', 'double_progression', 'autoregulated', 'set_progression'] as const;
export type ProgressionModel = (typeof PROGRESSION_MODELS)[number];
export const CRITERIA = ['anchor', 'track', 'load_adequacy', 'role_fit', 'goal_relevance', 'fatigue_fit', 'recency', 'preference', 'logistics'] as const;
export type Criterion = (typeof CRITERIA)[number];
export const PHASE_KINDS = ['accumulation', 'intensification', 'deload', 'maintenance', 'transition'] as const;
export const LOAD_MODELS = ['barbell', 'dumbbell_pair', 'dumbbell_single', 'kettlebell', 'machine_stack', 'plate_loaded', 'bodyweight_plus', 'implement_fixed'] as const;

const id = z.string().min(1);
const nonNeg = z.number().nonnegative();
const pos = z.number().positive();
const int = z.number().int();
const fraction = z.number().positive().max(1);
// technical-constant: échelle ordinale 0–3 du catalogue (contrat de schéma)
const ordinal = z.number().int().min(0).max(3);
const range = (t: z.ZodNumber) => z.object({ min: t, max: t }).strict().refine((r) => r.min <= r.max, 'min ≤ max');
const byLevel = <T extends z.ZodType>(t: T) => z.record(z.enum(LEVELS), t);
const delta = z.object({ setsDelta: int, rirDelta: z.number() }).strict();

export const zNeeds = z.record(id, z.object({ requirement: zSlotRequirement }).strict());

export const zStrengthArchetype = z.object({
  id, version: id, status: z.enum(['draft', 'reviewed', 'approved', 'deprecated']),
  levels: z.array(z.enum(LEVELS)).min(1),
  goals: z.array(id).min(1),
  toleranceProfile: id,
  duration: range(pos),
  feasiblePresets: z.array(id), declaredInfeasiblePresets: z.array(id), declaredInfeasibleRestrictions: z.array(id),
  blocks: z.array(z.object({
    id, kind: z.enum(['strength', 'accessory']), role: z.enum(['primary', 'secondary', 'support']),
    grouping: z.enum(['straight', 'superset']), levers: z.array(zCompressionLever),
  }).strict()).min(1),
  slots: z.array(z.object({
    id, blockId: id, need: id, role: z.enum(ROLES), status: z.enum(['required', 'optional']),
    choiceGroup: id.optional(), count: range(int.positive()), minFamilies: int.positive().optional(),
    modalityPreference: z.enum(['load_ceiling', 'stability', 'specificity']).optional(),
    anchorable: z.boolean(), trackable: z.boolean(),
  }).strict()).min(1),
}).strict();
export type StrengthArchetype = z.infer<typeof zStrengthArchetype>;
export type ArchetypeSlotDef = StrengthArchetype['slots'][number];

const zDoseCell = z.object({ reps: range(int.positive()), rir: nonNeg, sets: range(int.positive()), restS: range(nonNeg) }).strict();
export type DoseCell = z.infer<typeof zDoseCell>;

const zRampStep = z.object({ fraction, reps: int.positive() }).strict();
const zEffortStep = z.object({ rpe: pos, reps: int.positive() }).strict();

/** Schémas de tous les paramètres `strength.*`, avec leur classe de gouvernance. */
export const STRENGTH_PARAMETER_SCHEMAS = {
  'strength.needs': { governance: 'G2', schema: zNeeds },
  'strength.archetypes': { governance: 'G2', schema: z.array(zStrengthArchetype).min(1) },
  'strength.goals': { governance: 'G2', schema: z.record(id, z.object({ needPriority: z.array(id).min(1) }).strict()) },
  'strength.stimuli': { governance: 'G2', schema: z.record(id, z.object({ doseProfile: id, optionalOrder: z.array(id), energy: z.object({ low: nonNeg, moderate: nonNeg, high: nonNeg }).strict(), format: id }).strict()) },
  'strength.session.mobility': { governance: 'G2', schema: z.object({ warmupS: range(nonNeg), cooldownS: range(nonNeg) }).strict() },
  'strength.exerciseClass': { governance: 'G2', schema: z.object({ highLoadCeilingMin: ordinal, cappedLoadCeilingMax: ordinal }).strict() },
  'strength.selection.criteriaOrder': { governance: 'G2', schema: z.record(z.enum(ROLES), z.array(z.enum(CRITERIA)).min(1)) },
  'strength.selection.recencyBandsDays': { governance: 'G3', schema: z.array(nonNeg).min(1) },
  'strength.selection.axialHighMaxPerSession': { governance: 'G2', schema: int.nonnegative() },
  /** Plafond de charge minimal (échelle ordinale 0–3 du catalogue) pour qu'un exercice puisse porter la dose, par niveau. */
  'strength.selection.minLoadCeiling': { governance: 'G2', schema: byLevel(int.nonnegative()) },
  'strength.selection.skillCeiling': { governance: 'G1', schema: byLevel(int.positive()) },
  'strength.novice.technicalUnderFatigue': { governance: 'G1', schema: z.object({ levels: z.array(z.enum(LEVELS)), minTechnical: ordinal, maxPerSession: int.nonnegative(), allowedRoles: z.array(z.enum(ROLES)) }).strict() },
  'strength.dose.base': { governance: 'G2', schema: z.record(id, z.record(z.enum(ROLES), z.record(z.enum(EXERCISE_CLASSES), zDoseCell))) },
  'strength.dose.modifiers': { governance: 'G2', schema: z.object({
    level: byLevel(delta),
    phase: z.record(z.enum(PHASE_KINDS), delta.extend({ setsFactor: fraction.optional() })),
    readiness: z.object({ caution: delta, reduce: delta }).strict(),
    unknownReadiness: z.enum(['as_normal', 'as_caution']),
    conflictPolicy: z.enum(['most_conservative', 'sum']),
    repChoice: z.enum(['low', 'high']),
    restChoice: z.enum(['low', 'mid', 'high']),
    restRoundingS: pos,
  }).strict() },
  'strength.dose.nonRep': { governance: 'G2', schema: z.object({ holdSeconds: range(pos), carryMeters: range(pos) }).strict() },
  'strength.load': { governance: 'G2', schema: z.object({
    e1rmDivisor: pos, validRepRange: range(int.positive()),
    pctByRepsToFailure: z.record(z.string().regex(/^\d+$/), fraction),
    referenceWindowsDays: z.object({ high: pos, medium: pos, low: pos }).strict(),
    assumedRirWhenUnknown: nonNeg, equivalenceTransferPenalty: int.nonnegative(),
    transferableLoadModels: z.array(z.enum(LOAD_MODELS)), conflictTolerance: fraction,
    smoothingWindow: int.positive(), indicativeSpread: fraction,
  }).strict() },
  'strength.load.defaultIncrements': { governance: 'G4', schema: z.record(z.enum(LOAD_MODELS), pos) },
  'strength.calibration': { governance: 'G2', schema: z.object({ targetRir: nonNeg, sets: int.positive(), intraSessionProgression: z.boolean(), stopCriterion: id, mediumAfterExposures: int.positive(), highAfterExposures: int.positive() }).strict() },
  'strength.rampup': { governance: 'G2', schema: z.object({
    roles: z.array(z.enum(ROLES)), exerciseClasses: z.array(z.enum(EXERCISE_CLASSES)), loadModels: z.array(z.enum(LOAD_MODELS)), maxWorkingReps: int.positive(), samePatternMax: int.nonnegative(),
    known: z.array(z.object({ minRelative: fraction, steps: z.array(zRampStep).min(1) }).strict()).min(1),
    estimatedLastStepMax: fraction,
    effortSteps: z.array(zEffortStep).min(1),
    unknownSteps: z.array(zEffortStep).min(1), unknownStopCriterion: id,
    restS: nonNeg,
  }).strict() },
  'strength.progression': { governance: 'G2', schema: z.object({
    modelFor: byLevel(z.record(z.enum(ROLES), z.record(z.enum(EXERCISE_CLASSES), z.enum(PROGRESSION_MODELS)))),
    loadStepIncrements: int.positive(),
    aboveRirMargin: nonNeg, belowRirMargin: nonNeg, partialMaxMissedSets: int.nonnegative(),
    evidenceRequired: z.record(z.enum(PROGRESSION_MODELS), int.positive()),
    cycleCapFraction: fraction, regressionFraction: fraction, regressAfterBelow: int.positive(), stagnationHolds: int.positive(),
  }).strict() },
  'strength.tracks': { governance: 'G2', schema: z.object({ anchorMaxWeeks: byLevel(int.positive()), tier2AutoCreateAfter: int.positive(), rotateAtMesocycleEnd: z.boolean() }).strict() },
  'strength.volume': { governance: 'G2', schema: z.object({
    muscleGroups: z.record(id, z.array(id).min(1)), secondaryWeight: nonNeg,
    weeklyRange: z.record(id, byLevel(z.record(id, z.object({ floor: nonNeg, high: nonNeg }).strict().refine((r) => r.floor <= r.high, 'floor ≤ high')))),
    pm4SetsPerWeek: nonNeg,
  }).strict() },
  'strength.volume.sessionCap': { governance: 'G1', schema: byLevel(pos) },
  'strength.interference': { governance: 'G2', schema: z.object({
    notes: z.record(id, z.array(id)), neighborWindowHours: pos, touchThreshold: pos,
    perStructure: z.record(id, z.object({ excludeContributionAtLeast: pos.optional(), setsDelta: int, rirDelta: z.number(), dropOptionalNeeds: z.array(id) }).strict()),
  }).strict() },
  'strength.substitution.fallbackNeeds': { governance: 'G2', schema: z.record(id, z.array(id)) },
  'strength.topSet': { governance: 'G2', schema: z.object({ stimuli: z.array(id), levels: z.array(z.enum(LEVELS)), backoffSets: int.nonnegative(), backoffLoadFraction: fraction }).strict() },
  'strength.maxEffort.threshold': { governance: 'G1', schema: fraction },
  'strength.proposals.max': { governance: 'G4', schema: int.positive() },
} as const satisfies Record<string, { governance: GovernanceClass; schema: z.ZodType }>;

export type StrengthParamId = keyof typeof STRENGTH_PARAMETER_SCHEMAS;
export type StrengthParams = { readonly [K in StrengthParamId]: z.infer<(typeof STRENGTH_PARAMETER_SCHEMAS)[K]['schema']> };

/** Spécifications des paramètres pour le contrôle préalable du CORE (`preflightCoreParameters`). */
export const STRENGTH_PARAMETERS: readonly CoreParameterSpec[] = (Object.keys(STRENGTH_PARAMETER_SCHEMAS) as StrengthParamId[]).map((pid) => ({
  id: pid, type: 'table', governance: STRENGTH_PARAMETER_SCHEMAS[pid].governance, usedBy: 'strength',
}));

export interface LoadedStrengthParams {
  readonly values: StrengthParams;
  readonly used: readonly { readonly id: string; readonly version: string }[];
}

/** Lit et valide tous les paramètres `strength.*` (erreur explicite au premier paramètre invalide). */
export function readStrengthParams(ruleset: LoadedRuleset): LoadedStrengthParams {
  const values: Record<string, unknown> = {};
  const used: { id: string; version: string }[] = [];
  for (const pid of Object.keys(STRENGTH_PARAMETER_SCHEMAS).sort() as StrengthParamId[]) {
    const { schema, governance } = STRENGTH_PARAMETER_SCHEMAS[pid];
    const meta = ruleset.parameter(pid);
    if (!meta || meta.status === 'deprecated') throw new RulesetParameterError(pid, 'missing');
    if (meta.governance !== governance) throw new RulesetParameterError(pid, 'type', `gouvernance ${governance}`);
    const parsed = (schema as z.ZodType).safeParse(meta.value);
    if (!parsed.success) throw new RulesetParameterError(pid, 'type', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' ; '));
    values[pid] = parsed.data;
    used.push({ id: pid, version: meta.version });
  }
  return { values: values as StrengthParams, used };
}

/** Lecture d'UN paramètre `strength.*` (utilisée par les contrôles exécutés dans le CORE). */
export function readStrengthParam<K extends StrengthParamId>(ruleset: LoadedRuleset, pid: K): StrengthParams[K] {
  const { schema } = STRENGTH_PARAMETER_SCHEMAS[pid];
  const meta = ruleset.parameter(pid);
  if (!meta || meta.status === 'deprecated') throw new RulesetParameterError(pid, 'missing');
  const parsed = (schema as z.ZodType).safeParse(meta.value);
  if (!parsed.success) throw new RulesetParameterError(pid, 'type', 'schéma strength');
  return parsed.data as StrengthParams[K];
}
