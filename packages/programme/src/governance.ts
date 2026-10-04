/**
 * Paramètres GOUVERNÉS du Programme Engine (ruleset du CORE : statut, approbations, version). Aucune valeur par
 * défaut : absent, illisible ou non approuvé en production ⇒ la décision qui en dépend est BLOCKED / non disponible.
 */
import { z } from 'zod';
import type { ReasonCode } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { PLANNER_SPORTS } from '@hybridsport/planner';
import type { PlannerMode } from '@hybridsport/planner';
import { PG_CODES, pgReasons } from './codes.js';
import { ASSESSMENT_STATUSES } from './model.js';

const ADAPTIVE = ['HOLD', 'PROGRESS', 'REGRESS', 'REASSESS'] as const;
/** Conditions sur les FAITS descriptifs (aucun seuil ici : toutes les valeurs viennent de la politique gouvernée). */
export const zPolicyCondition = z.object({
  painReported: z.boolean().optional(),
  missedAtLeast: z.number().int().nonnegative().optional(),
  abandonedAtLeast: z.number().int().nonnegative().optional(),
  modifiedAtLeast: z.number().int().nonnegative().optional(),
  notPlannedAtLeast: z.number().int().nonnegative().optional(),
  completedAsPrescribedAtLeast: z.number().int().nonnegative().optional(),
  asPrescribedShareAtLeast: z.number().min(0).max(1).optional(),
  asPrescribedShareBelow: z.number().min(0).max(1).optional(),
  assessment: z.enum(['none', ...ASSESSMENT_STATUSES]).optional(),
}).strict();
export type PolicyCondition = z.infer<typeof zPolicyCondition>;

export const PG_PARAMETERS = {
  /** G2 : règles ordonnées (première qui s'applique) : sport ou « * », conditions, décision. Sans règle applicable ⇒ BLOCKED. */
  'programme.adaptation.decisionPolicy': {
    governance: 'G2',
    schema: z.object({ rules: z.array(z.object({ sport: z.enum([...PLANNER_SPORTS, '*']), when: zPolicyCondition, decision: z.enum(ADAPTIVE) }).strict()) }).strict(),
  },
  /** G2 : nombre de semaines APRÈS la semaine courante planifiables à l'avance (horizon glissant). Absent ⇒ semaine courante seule. */
  'programme.planning.horizonWeeks': { governance: 'G2', schema: z.number().int().nonnegative() },
} as const;
export type PgParamId = keyof typeof PG_PARAMETERS;
export type PgParamValue<K extends PgParamId> = z.infer<(typeof PG_PARAMETERS)[K]['schema']>;

export type PgParamRead<K extends PgParamId> =
  | { readonly ok: true; readonly value: PgParamValue<K>; readonly version: string; readonly status: string; readonly reasons: readonly ReasonCode[] }
  | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

export function readProgrammeParam<K extends PgParamId>(ruleset: LoadedRuleset | undefined, id: K, mode: PlannerMode): PgParamRead<K> {
  const fail = (cause: string): PgParamRead<K> => ({ ok: false, reasons: [pgReasons.emit(PG_CODES.PARAMETER_UNAVAILABLE, { parameterId: id, cause, mode })] });
  const meta = ruleset?.parameter(id);
  if (!meta || meta.status === 'deprecated') return fail('MISSING');
  if (meta.governance !== PG_PARAMETERS[id].governance) return fail('GOVERNANCE_MISMATCH');
  const parsed = (PG_PARAMETERS[id].schema as unknown as z.ZodType<PgParamValue<K>>).safeParse(meta.value);
  if (!parsed.success) return fail('UNREADABLE');
  const productionReady = meta.status === 'approved' && !meta.provisional;
  if (mode === 'PRODUCTION' && !productionReady) return fail('NOT_PRODUCTION_READY');
  return { ok: true, value: parsed.data, version: meta.version, status: meta.status, reasons: productionReady ? [] : [pgReasons.emit(PG_CODES.CANDIDATE_VALUE_USED, { parameterId: id, status: meta.status })] };
}
