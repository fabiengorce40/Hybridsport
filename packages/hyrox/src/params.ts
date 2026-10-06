/**
 * Paramètres GOUVERNÉS de HYROX H1, lus dans le ruleset du CORE (mécanisme générique : statut de revue, approbations
 * par rôle imposées par le chargeur, version tracée dans `parametersUsed`). Aucune valeur par défaut :
 * - absent ou illisible ⇒ refus ;
 * - PRODUCTION ⇒ exige `status = approved` et `provisional = false` (le chargeur impose l'approbation du rôle requis) ;
 * - CANDIDATE ⇒ valeur utilisable, tracée DATA.HYROX.CANDIDATE_VALUE_USED (moteur en SIMULATION uniquement).
 */
import { z } from 'zod';
import { DEMAND_LEVELS, LEVELS } from '@hybridsport/domain';
import type { ReasonCode } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { HR_CODES, hrReasons } from './codes.js';
import type { HrMode } from './model.js';
import { HR_H2_ROLES, HR_SESSION_BLOCK_KINDS, HR_STRUCTURES } from './h2/taxonomy.js';

/** Dose gouvernée d'une station : mouvement du catalogue × UNE dose (mesure + valeur) × charge si le mouvement en exige. */
export const zStationDose = z.object({
  stationId: z.string().min(1),
  exerciseId: z.string().min(1),
  dose: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('distance_m'), value: z.number().positive() }).strict(),
    z.object({ kind: z.literal('reps'), value: z.number().int().positive() }).strict(),
    z.object({ kind: z.literal('calories'), value: z.number().positive() }).strict(),
    z.object({ kind: z.literal('duration_s'), value: z.number().positive() }).strict(),
  ]),
  /** Charge externe (kg) ; obligatoire si le mouvement est chargé (voir h1.ts), interdite s'il ne l'est pas. */
  loadKg: z.number().positive().optional(),
  /** Référence de la revue (source, expert) de cette entrée. */
  reviewRef: z.string().min(1),
}).strict();
export type StationDose = z.infer<typeof zStationDose>;

const positive = z.number().positive();
const positiveInt = z.number().int().positive();
const perLevel = <T extends z.ZodType>(t: T) => z.partialRecord(z.enum(LEVELS), t);
const role = z.enum(HR_H2_ROLES);
const structure = z.enum(HR_STRUCTURES);

/** H2 — dose d'une station dans l'unité NATIVE de son mouvement (aucune conversion), charge si le mouvement en exige. */
export const zH2StationDose = z.object({ dose: zStationDose.shape.dose, loadKg: positive.optional() }).strict();
export type H2StationDose = z.infer<typeof zH2StationDose>;
/** H2 — volume d'une structure : tours × nombre de stations distinctes. Options dans l'ordre GOUVERNÉ (la première qui tient). */
export const zH2Volume = z.object({ rounds: positiveInt, stations: positiveInt }).strict();
export type H2Volume = z.infer<typeof zH2Volume>;
/** H2 — débit d'ESTIMATION par minute (rapide ≥ typique ≥ lent), par mouvement et niveau ; jamais une prescription ni un débit du catalogue. */
export const zH2WorkRates = z.record(z.string().min(1), z.object({
  unit: z.enum(['distance_m', 'reps', 'calories']),
  rate: perLevel(z.object({ fast: positive, typical: positive, slow: positive }).strict().refine((r) => r.fast >= r.typical && r.typical >= r.slow, 'fast ≥ typical ≥ slow')),
}).strict());
export type H2WorkRates = z.infer<typeof zH2WorkRates>;
const negativeAction = z.enum(['refuse', 'exclude_stations']);

export const HR_PARAMETERS = {
  /** G1 : doses (et charges) de station pour H1, une entrée par station au plus. */
  'hybrid_race.h1.stationDoses': { governance: 'G1', schema: z.array(zStationDose) },
  /** G1 : niveaux déclarés admis en H1 (aucun niveau n'est admis par défaut). */
  'hybrid_race.h1.eligibleLevels': { governance: 'G1', schema: z.array(z.enum(LEVELS)) },
  /**
   * G1 : H1 admis dans une semaine MULTISPORT orchestrée par le planificateur global (`true` ⇒ admis). Décision de
   * gouvernance, pas une valeur sportive : l'interférence reste au planificateur. Absent ⇒ multisport refusé.
   */
  'hybrid_race.h1.hybridPlanning': { governance: 'G1', schema: z.boolean() },
  /** G3 : profil de tolérance de durée du ruleset appliqué à la séance H1 (identifiant). */
  'hybrid_race.h1.toleranceProfile': { governance: 'G3', schema: z.string().min(1) },

  // ——— H2 : composition de séance (TOUS absents des rulesets réels ⇒ H2 fermé) ———
  /** G2 : rôles de séance HYROX décidés (taxonomie retenue, provisoire tant que non décidée). */
  'hybrid_race.h2.roles': { governance: 'G2', schema: z.array(role) },
  /** G2 : structures admises par rôle, dans l'ordre de préférence décidé. */
  'hybrid_race.h2.roleStructures': { governance: 'G2', schema: z.partialRecord(role, z.array(structure).min(1)) },
  /** G2 : structure de SÉANCE (rôles de blocs) par rôle ; seul `main` est généré par HYROX. */
  'hybrid_race.h2.sessionStructure': { governance: 'G2', schema: z.partialRecord(role, z.array(z.enum(HR_SESSION_BLOCK_KINDS)).min(1)) },
  /** G1 : réservoir de stations entraînables (station du catalogue × mouvement × revue). */
  'hybrid_race.h2.stationPool': { governance: 'G1', schema: z.array(z.object({ stationId: z.string().min(1), exerciseId: z.string().min(1), reviewRef: z.string().min(1) }).strict()) },
  /** G1 : dose d'ENTRAÎNEMENT par station et par niveau (jamais une norme de compétition). */
  'hybrid_race.h2.stationDoses': { governance: 'G1', schema: z.record(z.string().min(1), perLevel(zH2StationDose)) },
  /** G1 : distance d'un segment couru d'ENTRAÎNEMENT par niveau (aucune allure : moteur Running). */
  'hybrid_race.h2.runSegment': { governance: 'G1', schema: perLevel(z.object({ distanceM: positive }).strict()) },
  /** G2 : mouvement du catalogue représentant le segment couru. */
  'hybrid_race.h2.runExercise': { governance: 'G2', schema: z.string().min(1) },
  /** G2 : volumes admis par structure et niveau (options ordonnées). */
  'hybrid_race.h2.structureVolume': { governance: 'G2', schema: z.partialRecord(structure, perLevel(z.array(zH2Volume).min(1))) },
  /** G2 : débits d'estimation (stations et course). */
  'hybrid_race.h2.workRates': { governance: 'G2', schema: zH2WorkRates },
  /** G2 : marge du time cap sur l'estimation lente (fraction). */
  'hybrid_race.h2.timeCapMargin': { governance: 'G2', schema: z.number().nonnegative() },
  /** G2 : domaine temporel du bloc principal par rôle (estimation typique). */
  'hybrid_race.h2.timeDomains': { governance: 'G2', schema: z.partialRecord(role, z.object({ minS: positive, maxS: positive }).strict().refine((d) => d.minS <= d.maxS, 'minS ≤ maxS')) },
  /** G3 : profil de tolérance de durée du ruleset (identifiant). */
  'hybrid_race.h2.toleranceProfile': { governance: 'G3', schema: z.string().min(1) },
  /** G1 : niveaux admis en H2. */
  'hybrid_race.h2.eligibleLevels': { governance: 'G1', schema: z.array(z.enum(LEVELS)) },
  /** G1 : technicité maximale (ordinal du catalogue) admise SOUS FATIGUE, par niveau. */
  'hybrid_race.h2.technicalUnderFatigue': { governance: 'G1', schema: z.object({ maxTechnicalCost: perLevel(z.number().int().nonnegative()) }).strict() },
  /** G1 : ordre OFFICIEL des stations de l'épreuve (source sourcée). Absent ⇒ simulation partielle BLOCKED. */
  'hybrid_race.h2.raceSequence': { governance: 'G1', schema: z.array(z.string().min(1)).min(1) },
  /** G2 : mémoire : fenêtre de récence (jours) et réponse à une séance négative. */
  'hybrid_race.h2.historyPolicy': { governance: 'G2', schema: z.object({ recencyDays: positive, abandoned: negativeAction, poorly_tolerated: negativeAction, pain: negativeAction }).strict() },
  /** G2 : interprétation des voisines transportées (niveaux de demande qui font ÉVITER une station). */
  'hybrid_race.h2.neighbourPolicy': { governance: 'G2', schema: z.object({ avoidNeighbourLevels: z.array(z.enum(DEMAND_LEVELS)) }).strict() },
  /** G1 : H2 admis dans une semaine multisport orchestrée. */
  'hybrid_race.h2.hybridPlanning': { governance: 'G1', schema: z.boolean() },
} as const;
export type HrParamId = keyof typeof HR_PARAMETERS;
export type HrParamValue<K extends HrParamId> = z.infer<(typeof HR_PARAMETERS)[K]['schema']>;

export type HrParamRead<K extends HrParamId> =
  | { readonly ok: true; readonly value: HrParamValue<K>; readonly version: string; readonly reasons: readonly ReasonCode[] }
  | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

export function readHrParam<K extends HrParamId>(ruleset: LoadedRuleset, id: K, mode: HrMode): HrParamRead<K> {
  const fail = (cause: string): HrParamRead<K> => ({ ok: false, reasons: [hrReasons.emit(HR_CODES.PARAMETER_UNAVAILABLE, { parameterId: id, cause, mode })] });
  const meta = ruleset.parameter(id);
  if (!meta || meta.status === 'deprecated') return fail('MISSING');
  if (meta.governance !== HR_PARAMETERS[id].governance) return fail('GOVERNANCE_MISMATCH');
  const parsed = (HR_PARAMETERS[id].schema as unknown as z.ZodType<HrParamValue<K>>).safeParse(meta.value);
  if (!parsed.success) return fail('UNREADABLE');
  const productionReady = meta.status === 'approved' && !meta.provisional;
  if (mode === 'PRODUCTION' && !productionReady) return fail('NOT_PRODUCTION_READY');
  const reasons = productionReady ? [] : [hrReasons.emit(HR_CODES.CANDIDATE_VALUE_USED, { parameterId: id, status: meta.status })];
  return { ok: true, value: parsed.data, version: meta.version, reasons };
}
