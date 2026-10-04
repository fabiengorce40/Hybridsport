/**
 * Paramètres GOUVERNÉS du planificateur, lus dans un ruleset du CORE (statut, approbations par rôle, version).
 * Aucune valeur par défaut : absent ou illisible ⇒ la décision concernée est fail-closed.
 * - PRODUCTION ⇒ `approved` et non provisoire ;
 * - CANDIDATE ⇒ valeur utilisable, tracée DATA.PLANNER.CANDIDATE_VALUE_USED.
 */
import { z } from 'zod';
import type { ReasonCode } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { GP_CODES, gpReasons } from './codes.js';
import type { PlannerMode } from './model.js';

export const GP_PARAMETERS = {
  /**
   * G2 : écart minimal (heures) entre deux séances de DISCIPLINES DIFFÉRENTES sollicitant la même structure de
   * planification (identifiants du catalogue). Une structure absente de la table n'est pas gouvernée : un
   * recouvrement sur elle est un conflit (fail-closed).
   */
  'planner.interference.structureWindows': { governance: 'G2', schema: z.record(z.string().min(1), z.number().nonnegative()) },
} as const;
export type GpParamId = keyof typeof GP_PARAMETERS;
export type GpParamValue<K extends GpParamId> = z.infer<(typeof GP_PARAMETERS)[K]['schema']>;

export type GpParamRead<K extends GpParamId> =
  | { readonly ok: true; readonly value: GpParamValue<K>; readonly version: string; readonly reasons: readonly ReasonCode[] }
  | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

export function readPlannerParam<K extends GpParamId>(ruleset: LoadedRuleset | undefined, id: K, mode: PlannerMode): GpParamRead<K> {
  const fail = (cause: string): GpParamRead<K> => ({ ok: false, reasons: [gpReasons.emit(GP_CODES.PARAMETER_UNAVAILABLE, { parameterId: id, cause, mode })] });
  const meta = ruleset?.parameter(id);
  if (!meta || meta.status === 'deprecated') return fail('MISSING');
  if (meta.governance !== GP_PARAMETERS[id].governance) return fail('GOVERNANCE_MISMATCH');
  const parsed = (GP_PARAMETERS[id].schema as unknown as z.ZodType<GpParamValue<K>>).safeParse(meta.value);
  if (!parsed.success) return fail('UNREADABLE');
  const productionReady = meta.status === 'approved' && !meta.provisional;
  if (mode === 'PRODUCTION' && !productionReady) return fail('NOT_PRODUCTION_READY');
  return { ok: true, value: parsed.data, version: meta.version, reasons: productionReady ? [] : [gpReasons.emit(GP_CODES.CANDIDATE_VALUE_USED, { parameterId: id, status: meta.status })] };
}
