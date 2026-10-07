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
import { DEMAND_LEVELS } from '@hybridsport/domain';

const hours = z.number().positive();
const levels = z.array(z.enum(DEMAND_LEVELS)).min(1);

export const GP_PARAMETERS = {
  /**
   * G2 : écart minimal (heures) entre deux séances de DISCIPLINES DIFFÉRENTES sollicitant la même structure de
   * planification (identifiants du catalogue). Une structure absente de la table n'est pas gouvernée : un
   * recouvrement sur elle est un conflit (fail-closed).
   */
  'planner.interference.structureWindows': { governance: 'G2', schema: z.record(z.string().min(1), z.number().nonnegative()) },

  // ——— M3 : arbitrage multisport (TOUS absents des rulesets réels ⇒ arbitrage indisponible, tracé) ———
  /**
   * G2 — DÉTECTION par paires : deux séances de sports DIFFÉRENTS dont le niveau de demande (profil CORE) sur une
   * structure appartient à `levels` à moins de `withinHours` l'une de l'autre sont en conflit. Le niveau DÉCRIT ; seule
   * cette règle gouvernée en fait un conflit (aucun délai déduit du niveau).
   */
  'planner.m3.pairRules': { governance: 'G2', schema: z.array(z.object({ id: z.string().min(1), structures: z.array(z.string().min(1)).min(1), levels, withinHours: hours }).strict()) },
  /** G2 — DÉTECTION par accumulation : plus de `maxSessions` séances à `levels` sur `structure` dans `withinHours`. */
  'planner.m3.accumulationRules': { governance: 'G2', schema: z.array(z.object({ id: z.string().min(1), structure: z.string().min(1), levels, withinHours: hours, maxSessions: z.number().int().positive() }).strict()) },
  /** G2 — DISTANCE : fenêtre d'INTERFÉRENCE au-delà de laquelle une voisine n'est plus transmise aux moteurs. */
  'planner.m3.neighbourWindowHours': { governance: 'G2', schema: hours },
  /**
   * G2 — ACTIONS autorisées, dans l'ordre d'essai : MOVE (jour libre), SWAP (échange de jours avec une autre séance),
   * RECOMPOSE (le moteur recompose). Supprimer une séance n'est PAS une action disponible.
   */
  'planner.m3.actions': { governance: 'G2', schema: z.array(z.enum(['MOVE', 'SWAP', 'RECOMPOSE'])) },
  /**
   * G2 — QUI S'ADAPTE : `importance` (séance clé avant séance standard), puis `rank` (sport le moins prioritaire) ;
   * liste vide ⇒ aucune séance ne cède (conflit non résolu, tracé). `protectPriority` : une séance d'un sport PLUS
   * prioritaire, ou une séance clé, n'est jamais déplacée par un SWAP (protection du sport prioritaire).
   */
  'planner.m3.yieldPolicy': { governance: 'G2', schema: z.object({ order: z.array(z.enum(['importance', 'rank'])), protectPriority: z.boolean() }).strict() },
  /** G2 — IMPORTANCE d'une séance, par sport : rôle de composition du moteur (ou archétype déclaré) → `key` | `standard`. */
  'planner.m3.sessionImportance': { governance: 'G2', schema: z.record(z.string().min(1), z.record(z.string().min(1), z.enum(['key', 'standard']))) },
  /** G2 — HISTORIQUE : statuts des séances antérieures comptés comme expositions réelles pour l'interférence. */
  'planner.m3.historyStatuses': { governance: 'G2', schema: z.array(z.enum(['executed', 'abandoned', 'planned', 'missed'])) },
  /** G3 — borne technique du nombre de passes d'arbitrage (arrêt garanti). */
  'planner.m3.maxPasses': { governance: 'G3', schema: z.number().int().positive() },
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
