import { z } from 'zod';
import { DISCIPLINES, LEVELS, REVIEW_STATUSES } from './enums.js';
import { zId, zISODate, zSemVer } from './ruleset.js';

/**
 * Catalogue (spec 03) : taxonomie en 4 couches — patterns, muscles, zones fonctionnelles,
 * structures de planification (DÉRIVÉES, jamais saisies dans une séance).
 */
// technical-constant: échelle ordinale 0–3 fixée par le schéma (spec 03 §2), pas une valeur sportive
const ordinal03 = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export type Ordinal03 = z.infer<typeof ordinal03>;

export const EQUIPMENT_CLASSES = ['barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'bodyweight', 'band', 'erg', 'implement', 'station', 'support'] as const;
export type EquipmentClass = (typeof EQUIPMENT_CLASSES)[number];

export const zTaxonomy = z.object({
  patterns: z.array(z.object({
    id: zId,
    region: z.enum(['lower', 'upper', 'full', 'core', 'cyclic', 'none']),
    isLocomotor: z.boolean(),
    excludedFromSimilarity: z.boolean().default(false),
  }).strict()).min(1),
  muscles: z.array(z.object({ id: zId, region: z.enum(['lower', 'upper', 'core']) }).strict()).min(1),
  bodyAreas: z.array(z.object({ id: zId }).strict()).min(1),
  structures: z.array(z.object({ id: zId }).strict()).min(1),
  /** Alias de structures (ex. « bas du corps » = max des membres) — spec 04 §6. */
  structureGroups: z.array(z.object({ id: zId, members: z.array(zId).min(1) }).strict()).default([]),
  equipment: z.array(z.object({ id: zId, class: z.enum(EQUIPMENT_CLASSES) }).strict()).min(1),
  restrictionTags: z.array(zId),
  movementTags: z.array(zId),
}).strict();
export type Taxonomy = z.infer<typeof zTaxonomy>;

const zLevelRate = z.object({ p50: z.number().positive(), p90Slow: z.number().positive() }).strict();

export const zExercise = z.object({
  id: zId,
  canonicalName: z.record(z.string(), z.string().min(1)),
  aliases: z.array(z.record(z.string(), z.string())).default([]),
  status: z.enum(['active', 'deprecated']),
  replacedBy: zId.optional(),
  disciplines: z.array(z.enum(DISCIPLINES)).min(1),
  // technical-constant: au plus 2 patterns secondaires (contrat de schéma, spec 03 §2 bis)
  patterns: z.object({ primary: zId, secondary: z.array(zId).max(2) }).strict(),
  family: zId,
  equivalenceClass: zId,
  progressionFamily: z.object({ familyId: zId, rank: z.number().int().positive() }).strict().optional(),
  compound: z.boolean(),
  laterality: z.enum(['bilateral', 'unilateral', 'alternating']),
  movementType: z.enum(['strength', 'power', 'olympic', 'gymnastic', 'monostructural', 'carry', 'mobility', 'plyometric', 'isometric']),
  muscles: z.object({ primary: z.array(zId).min(1), secondary: z.array(zId) }).strict(),
  equipment: z.object({ allOf: z.array(zId), anyOf: z.array(zId) }).strict(),
  loadable: z.boolean(),
  loadModel: z.enum(['barbell', 'dumbbell_pair', 'dumbbell_single', 'kettlebell', 'machine_stack', 'plate_loaded', 'bodyweight_plus', 'implement_fixed']).optional(),
  cost: z.object({
    localMuscular: ordinal03, systemic: ordinal03, cardiovascular: ordinal03, technical: ordinal03,
    impact: ordinal03, axialLoad: ordinal03, grip: ordinal03,
  }).strict(),
  // technical-constant: échelle 1–5 définie par le schéma (spec 03 §2)
  skillLevel: z.number().int().min(1).max(5),
  stability: ordinal03,
  loadCeiling: ordinal03,
  timing: z.object({
    secondsPerRep: z.object({ min: z.number().positive(), typical: z.number().positive(), max: z.number().positive() }).strict().optional(),
    setupS: z.number().nonnegative(),
    loadChangeS: z.number().nonnegative().optional(),
    transitionClass: z.enum(['station_fixed', 'portable', 'floor', 'machine', 'outdoor']),
  }).strict(),
  workRate: z.object({
    unit: z.enum(['reps_per_min', 'm_per_min', 'cal_per_min']),
    byLevel: z.object(Object.fromEntries(LEVELS.map((l) => [l, zLevelRate])) as Record<(typeof LEVELS)[number], typeof zLevelRate>).strict(),
  }).strict().optional(),
  measurableMetrics: z.array(z.enum(['reps', 'load', 'time', 'distance', 'calories', 'rounds', 'height'])).min(1),
  defaultPrescriptionType: z.enum(['sets', 'timed', 'distance', 'calories', 'reps', 'hold', 'mobility']),
  contraindicationTags: z.array(zId),
  painSensitiveAreas: z.array(zId),
  movementTags: z.array(zId).default([]),
  maxEffortEligibility: z.object({ minLevel: z.enum(LEVELS) }).strict().optional(),
  substitutions: z.array(z.object({
    exerciseId: zId, fidelity: z.enum(['high', 'medium', 'low']),
    context: z.enum(['equipment', 'restriction', 'skill']).optional(), note: z.string().optional(),
  }).strict()),
  relevance: z.object({
    hybrid_race: ordinal03.optional(), crosstraining: ordinal03.optional(), running_support: ordinal03.optional(), strength: ordinal03.optional(),
  }).strict(),
  hybridRaceStation: zId.optional(),
  meta: z.object({ version: z.number().int().positive(), modifiedAt: zISODate, reviewStatus: z.enum(REVIEW_STATUSES), reviewedBy: z.array(z.string()).default([]) }).strict(),
}).strict();
export type Exercise = z.infer<typeof zExercise>;
export type ExerciseInput = z.input<typeof zExercise>;

export const zPreset = z.object({
  id: zId,
  name: z.string().min(1),
  equipment: z.array(zId),
  /** Point de départ modifiable par l'utilisateur (CC11). */
  editable: z.boolean(),
}).strict();
export type Preset = z.infer<typeof zPreset>;

/** Archétype (contenu des moteurs de discipline, à venir) : seul le minimum requis par CC1 est modélisé. */
export const zArchetypeCoverageSpec = z.object({
  id: zId,
  discipline: z.enum(DISCIPLINES),
  slots: z.array(z.object({
    id: zId,
    pattern: zId.optional(),
    movementTypes: z.array(z.string()).optional(),
    minFamilies: z.number().int().positive().optional(),
  }).strict()).min(1),
  feasiblePresets: z.array(zId),
  declaredInfeasiblePresets: z.array(zId).default([]),
}).strict();
export type ArchetypeCoverageSpec = z.infer<typeof zArchetypeCoverageSpec>;

export const zCatalogDocument = z.object({
  schemaVersion: z.literal('1'),
  catalogVersion: zSemVer,
  modifiedAt: zISODate,
  taxonomy: zTaxonomy,
  exercises: z.array(zExercise),
  presets: z.array(zPreset).default([]),
  archetypes: z.array(zArchetypeCoverageSpec).default([]),
}).strict();
export type CatalogDocument = z.infer<typeof zCatalogDocument>;
export type CatalogDocumentInput = z.input<typeof zCatalogDocument>;
