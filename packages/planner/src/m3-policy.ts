/**
 * M3 — lecture fail-closed de la politique d'arbitrage dans la gouvernance du planificateur. Séparation stricte :
 * DÉTECTION (règles de paires, d'accumulation), DISTANCE (fenêtre d'interférence des voisines), ARBITRAGE (qui cède),
 * ACTIONS autorisées, IMPORTANCE de séance, HISTORIQUE admis, borne de passes. Aucune valeur par défaut : un paramètre
 * requis absent ⇒ arbitrage indisponible (tracé), jamais « ça devrait aller ».
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { readPlannerParam } from './governance.js';
import type { GpParamValue } from './governance.js';
import type { PlannerMode } from './model.js';
import type { AccumulationRule, PairRule } from './m3-analysis.js';

export interface M3Policy {
  readonly pairRules: readonly PairRule[];
  readonly accumulationRules: readonly AccumulationRule[];
  readonly actions: GpParamValue<'planner.m3.actions'>;
  readonly yieldOrder: GpParamValue<'planner.m3.yieldPolicy'>['order'];
  readonly protectPriority: boolean;
  /** Table d'importance (absente ⇒ toute séance `unknown`, tracé). */
  readonly importance: GpParamValue<'planner.m3.sessionImportance'> | null;
  readonly historyStatuses: GpParamValue<'planner.m3.historyStatuses'>;
  readonly maxPasses: number;
  readonly version: string;
}

const REQUIRED = ['planner.m3.pairRules', 'planner.m3.accumulationRules', 'planner.m3.actions', 'planner.m3.yieldPolicy', 'planner.m3.historyStatuses', 'planner.m3.maxPasses'] as const;

export function readM3Policy(ruleset: LoadedRuleset | undefined, mode: PlannerMode): { readonly ok: true; readonly policy: M3Policy; readonly reasons: readonly ReasonCode[] } | { readonly ok: false; readonly reasons: readonly ReasonCode[] } {
  const pair = readPlannerParam(ruleset, 'planner.m3.pairRules', mode);
  const acc = readPlannerParam(ruleset, 'planner.m3.accumulationRules', mode);
  const actions = readPlannerParam(ruleset, 'planner.m3.actions', mode);
  const yieldPolicy = readPlannerParam(ruleset, 'planner.m3.yieldPolicy', mode);
  const history = readPlannerParam(ruleset, 'planner.m3.historyStatuses', mode);
  const passes = readPlannerParam(ruleset, 'planner.m3.maxPasses', mode);
  const importance = readPlannerParam(ruleset, 'planner.m3.sessionImportance', mode);
  const reads = [pair, acc, actions, yieldPolicy, history, passes];
  const failed = reads.flatMap((r) => (r.ok ? [] : r.reasons));
  if (!pair.ok || !acc.ok || !actions.ok || !yieldPolicy.ok || !history.ok || !passes.ok) return { ok: false, reasons: failed };
  const trace = [...reads.flatMap((r) => (r.ok ? r.reasons : [])), ...(importance.ok ? importance.reasons : importance.reasons)];
  return {
    ok: true,
    policy: {
      pairRules: pair.value, accumulationRules: acc.value, actions: actions.value, yieldOrder: yieldPolicy.value.order, protectPriority: yieldPolicy.value.protectPriority,
      importance: importance.ok ? importance.value : null, historyStatuses: history.value, maxPasses: passes.value,
      version: [pair.version, acc.version, actions.version, yieldPolicy.version, history.version, passes.version].join('/'),
    },
    reasons: trace,
  };
}

/** Fenêtre d'INTERFÉRENCE des voisines (heures), si gouvernée ; distincte de toute fenêtre d'historique. */
export function readNeighbourWindow(ruleset: LoadedRuleset | undefined, mode: PlannerMode): { readonly hours: number | undefined; readonly reasons: readonly ReasonCode[] } {
  const r = readPlannerParam(ruleset, 'planner.m3.neighbourWindowHours', mode);
  return r.ok ? { hours: r.value, reasons: r.reasons } : { hours: undefined, reasons: [] };
}

export const M3_REQUIRED_PARAMETERS = REQUIRED;
