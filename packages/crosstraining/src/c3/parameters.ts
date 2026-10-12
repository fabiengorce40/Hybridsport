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
const span = z.object({ min: positive, max: positive }).strict().refine((d) => d.min <= d.max, 'min ≤ max');
/** Blocs d'une séance complète C4 (plan) ; seuls certains sont composables en C4 v1. */
export const C4_BLOCKS = ['warmup_general', 'warmup_specific', 'skill', 'strength', 'conditioning', 'accessory', 'cooldown'] as const;
export type C4Block = (typeof C4_BLOCKS)[number];

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
  /**
   * `fallbackOnly` (C4.3) : mouvement retenu pour un rôle SEULEMENT si aucun autre mouvement du réservoir n'y est
   * éligible (ex. course quand aucun ergomètre n'est disponible) ; les séances avec ergomètre sont inchangées.
   */
  'ct.composition.movementPool': z.array(z.object({ movementId: z.string().min(1), contentReviewRef: z.string().min(1), fallbackOnly: z.boolean().optional() }).strict()),
  /**
   * C4.3 (CT-D24) — rôles FACULTATIFS par stimulus et format : un tel rôle, impossible à remplir (aucun mouvement
   * éligible : matériel, douleur, restriction…), est retiré du bloc (tracé) au lieu de rejeter le format ; les doses
   * des autres rôles sont inchangées. Absent / non résolu : tous les rôles restent obligatoires (comportement C3).
   */
  'ct.composition.optionalRoles': z.partialRecord(stimulus, z.partialRecord(format, z.array(role).min(1))),
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
  /** C4 — blocs REQUIS / FACULTATIFS d'une séance complète, par stimulus (hypothèse experte). */
  'ct.c4.sessionPlan': z.partialRecord(stimulus, z.object({ required: z.array(z.enum(C4_BLOCKS)), optional: z.array(z.enum(C4_BLOCKS)) }).strict()),
  /** C4 — échauffement : durée générale (bornes), tours et fraction des répétitions du bloc principal pour l'échauffement spécifique. */
  'ct.c4.warmup': perLevel(z.object({
    generalS: span,
    /** C4.2 — échauffement spécifique PROGRESSIF : une fraction des répétitions du bloc principal par tour (rampe). */
    specificRamp: z.array(z.number().positive().max(1)).min(1),
    /** Tours supplémentaires si un mouvement à répétitions du bloc principal atteint le coût technique `technicalThreshold`. */
    technicalRamp: z.array(z.number().positive().max(1)),
    technicalThreshold: z.number().int().nonnegative(),
    /**
     * C4.2 — accélérations PROGRESSIVES sur l'ergomètre du bloc principal (tours, travail, récupération), seulement si le
     * bloc principal n'est pas continu ; aucune allure chiffrée (consigne « progressif »).
     */
    buildups: z.object({ rounds: z.object({ min: positiveInt, max: positiveInt }).strict().refine((d) => d.min <= d.max, 'min ≤ max'), workS: positiveInt, restS: z.number().int().nonnegative() }).strict(),
  }).strict()),
  /** C4.2 (CT-D22) — échauffement général SANS ergomètre : réservoir de mouvements au poids du corps et rôle de chacun. */
  'ct.c4.generalWarmupPool': z.array(z.object({ movementId: z.string().min(1), role: z.enum(['pulse_raise', 'dynamic_prep']), regions: z.array(z.enum(['lower', 'upper', 'core', 'full'])).min(1) }).strict()).min(1),
  /** C4.2 (CT-D22) — circuit au poids du corps : durée de chaque intervalle, impact maximal admis, préparations dynamiques maximales. */
  'ct.c4.generalWarmupCircuit': perLevel(z.object({ intervalS: positiveInt, maxImpact: z.number().int().nonnegative(), maxDynamicPrep: positiveInt }).strict()),
  /** C4.2 (CT-D23) — mobilité de retour au calme : mouvements et régions couvertes (sélection par régions du bloc principal). */
  'ct.c4.mobilityPool': z.array(z.object({ movementId: z.string().min(1), regions: z.array(z.enum(['lower', 'upper', 'core'])).min(1) }).strict()).min(1),
  /** C4 — retour au calme : allure facile (bornes), mobilité (bornes). */
  'ct.c4.cooldown': perLevel(z.object({
    easyS: span,
    /** C4.2 — durée PAR mouvement de mobilité ; nombre maximal de mouvements (un par région sollicitée). */
    mobilityPerMovementS: span,
    maxMobilityMovements: positiveInt,
    /** C4.2 (S7) — plafond du retour au calme en part de l'échauffement planifié (il ne compense jamais un échauffement court). */
    maxShareOfWarmup: z.number().positive(),
  }).strict()),
  /** C4 — cible de durée d'une séance complète (décision produit) : jamais une obligation de remplissage. */
  /**
   * C4.3 (CT-D25) — BESOIN de force exprimé par stimulus (jamais systématique : seuls les stimulus listés) : budget de
   * temps du bloc délégué à Strength via le planificateur ; aucune prescription de force côté Cross-training.
   */
  'ct.c4.strengthNeed': z.partialRecord(stimulus, z.object({ budgetS: span, purpose: z.enum(['strength_before_conditioning']) }).strict()),
  'ct.c4.sessionDurationTarget': z.object({ minS: positive, maxS: positive }).strict().refine((d) => d.minS <= d.maxS, 'minS ≤ maxS'),
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
