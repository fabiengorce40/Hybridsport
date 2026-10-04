/**
 * Paramètres GOUVERNÉS de HYROX H1, lus dans le ruleset du CORE (mécanisme générique : statut de revue, approbations
 * par rôle imposées par le chargeur, version tracée dans `parametersUsed`). Aucune valeur par défaut :
 * - absent ou illisible ⇒ refus ;
 * - PRODUCTION ⇒ exige `status = approved` et `provisional = false` (le chargeur impose l'approbation du rôle requis) ;
 * - CANDIDATE ⇒ valeur utilisable, tracée DATA.HYROX.CANDIDATE_VALUE_USED (moteur en SIMULATION uniquement).
 */
import { z } from 'zod';
import { LEVELS } from '@hybridsport/domain';
import type { ReasonCode } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { HR_CODES, hrReasons } from './codes.js';
import type { HrMode } from './model.js';

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

export const HR_PARAMETERS = {
  /** G1 : doses (et charges) de station pour H1, une entrée par station au plus. */
  'hybrid_race.h1.stationDoses': { governance: 'G1', schema: z.array(zStationDose) },
  /** G1 : niveaux déclarés admis en H1 (aucun niveau n'est admis par défaut). */
  'hybrid_race.h1.eligibleLevels': { governance: 'G1', schema: z.array(z.enum(LEVELS)) },
  /** G3 : profil de tolérance de durée du ruleset appliqué à la séance H1 (identifiant). */
  'hybrid_race.h1.toleranceProfile': { governance: 'G3', schema: z.string().min(1) },
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
