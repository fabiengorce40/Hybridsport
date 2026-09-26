import type { OptimizationLevel, ReasonCode } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { RulesetParameterError } from '../rules/errors.js';
import type { EvaluatedCandidate } from './admissibility.js';
import { compareOptimization, fromArray } from './optimization.js';
import type { Tolerances } from './optimization.js';

const reasons = createCoreRegistry();

/** Niveaux sur lesquels un gain peut justifier un changement de plan (spec 01 §5, couche C). */
export const STABILITY_LEVELS = ['B1', 'B2', 'B3'] as const satisfies readonly OptimizationLevel[];
export type StabilityLevel = (typeof STABILITY_LEVELS)[number];
export type HysteresisThresholds = Readonly<Record<StabilityLevel, number>>;

/**
 * Seuils d'hystérésis lus dans le ruleset (`core.stability.hysteresis`). Contrainte : seuil ≥ ε au même
 * niveau — c'est ce qui garantit l'absence d'oscillation (si B remplace A, A ne peut pas remplacer B).
 */
export function readHysteresis(ruleset: LoadedRuleset, eps: Tolerances): HysteresisThresholds {
  const rec = ruleset.numberRecord('core.stability.hysteresis');
  for (const l of STABILITY_LEVELS) {
    const v = rec[l];
    if (v === undefined || v < eps[l]) throw new RulesetParameterError('core.stability.hysteresis', 'type', `seuil ${l} ≥ ε(${l})`);
  }
  return rec as HysteresisThresholds;
}

export interface ReplacementDecision {
  readonly decision: 'KEEP' | 'CHANGE' | 'NO_ADMISSIBLE';
  readonly reason: ReasonCode;
}

/**
 * Couche C — stabilité de replanification : le plan actuel n'est remplacé que s'il viole la couche A,
 * ou si la proposition l'améliore de PLUS que le seuil d'hystérésis sur B1, B2 ou B3.
 */
export function decideReplacement(current: EvaluatedCandidate, proposal: EvaluatedCandidate, eps: Tolerances, hyst: HysteresisThresholds): ReplacementDecision {
  if (!current.admissibility.admissible) {
    return proposal.admissibility.admissible
      ? { decision: 'CHANGE', reason: reasons.emit('ADAPT.CHANGED', { cause: 'current_inadmissible' }) }
      : { decision: 'NO_ADMISSIBLE', reason: reasons.emit('SELECT.NO_ADMISSIBLE_CANDIDATE', { candidates: [current, proposal].length }) };
  }
  if (!proposal.admissibility.admissible) {
    return { decision: 'KEEP', reason: reasons.emit('ADAPT.KEPT_STABILITY', { gain: 0, threshold: 0 }) };
  }
  const cmp = compareOptimization(fromArray(proposal.optimization), fromArray(current.optimization), eps);
  const level = cmp.decidingLevel;
  if (cmp.winner !== 'a' || level === undefined || !(STABILITY_LEVELS as readonly string[]).includes(level)) {
    return { decision: 'KEEP', reason: reasons.emit('ADAPT.KEPT_STABILITY', { gain: cmp.winner === 'a' ? cmp.gap ?? 0 : 0, threshold: 0, ...(level ? { level } : {}) }) };
  }
  const threshold = hyst[level as StabilityLevel];
  const gain = cmp.gap ?? 0;
  return gain > threshold
    ? { decision: 'CHANGE', reason: reasons.emit('ADAPT.CHANGED', { cause: 'significant_gain', level, gain }) }
    : { decision: 'KEEP', reason: reasons.emit('ADAPT.KEPT_STABILITY', { level, gain, threshold }) };
}
