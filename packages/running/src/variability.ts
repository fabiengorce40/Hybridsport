/**
 * `RunningPerformanceVariabilityEstimate` (correction 5E de V42) : estimation CONTEXTUELLE, jamais une
 * constante universelle.
 * - PERSONAL : performances répétées comparables de l'athlète (nombre minimal : DECISION_REQUIRED) ;
 * - CONTEXT_PRIOR : a priori par distance (V42), seulement si E-VARIABILITY est approuvée ;
 * - UNKNOWN sinon, avec ses raisons. Aucun repli universel (le repli produit 2 / 3 / 4 % n'est pas approuvé).
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { ConfidenceLevel, RunningMode } from './model.js';
import { RUNNING_CODES, runningReasons } from './codes.js';
import { resolveParameter } from './governance/parameters.js';
import type { RunningGovernance } from './governance/state.js';
import type { RunningReference } from './references.js';
import { performancePace } from './references.js';

export const VARIABILITY_KINDS = ['PERSONAL', 'CONTEXT_PRIOR', 'UNKNOWN'] as const;

export type RunningPerformanceVariabilityEstimate =
  | { readonly kind: 'PERSONAL'; readonly coefficientOfVariation: number; readonly sampleSize: number; readonly distanceM: number; readonly confidence: ConfidenceLevel; readonly provenance: string; readonly reasons: readonly ReasonCode[] }
  | { readonly kind: 'CONTEXT_PRIOR'; readonly range: { readonly min: number; readonly max: number }; readonly priorKey: string; readonly confidence: ConfidenceLevel; readonly provenance: string; readonly reasons: readonly ReasonCode[] }
  | { readonly kind: 'UNKNOWN'; readonly confidence: 'NONE'; readonly reasons: readonly ReasonCode[] };

/** Coefficient de variation (écart type d'échantillon / moyenne) : statistique descriptive, pas un paramètre. */
export function coefficientOfVariation(xs: readonly number[]): number {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, x) => a + (x - mean) * (x - mean), 0) / (xs.length - 1);
  return Math.sqrt(variance) / mean;
}

export function estimateVariability(input: { readonly references: readonly RunningReference[]; readonly distanceM: number; readonly priorKey?: string; readonly governance: RunningGovernance; readonly mode: RunningMode }): RunningPerformanceVariabilityEstimate {
  const { governance: g, mode } = input;
  const reasons: ReasonCode[] = [];
  const decisionOk = g.decisions['E-VARIABILITY'] === 'APPROVED' || mode === 'CANDIDATE';
  // 1. Estimation personnelle : exige un nombre minimal de performances comparables (non résolu aujourd'hui).
  const minCount = resolveParameter(g.parameters, 'running.reference.variabilityMinComparablePerformances', mode);
  reasons.push(...minCount.reasons);
  const comparable = input.references.filter((r) => (r.type === 'RACE_RESULT' || r.type === 'TIME_TRIAL') && r.values.distanceM === input.distanceM);
  const paces = comparable.map(performancePace).filter((p): p is number => p !== undefined);
  if (minCount.status === 'resolved' && typeof minCount.value === 'number' && Number.isInteger(minCount.value) && minCount.value > 1 && paces.length >= minCount.value) {
    return { kind: 'PERSONAL', coefficientOfVariation: coefficientOfVariation(paces), sampleSize: paces.length, distanceM: input.distanceM, confidence: minCount.candidate ? 'LOW' : 'MEDIUM', provenance: 'personal-repeated-performances', reasons };
  }
  // 2. A priori contextuel (V42) : seulement si E-VARIABILITY est approuvée (ou valeur candidate tracée en CANDIDATE).
  if (input.priorKey !== undefined) {
    if (g.decisions['E-VARIABILITY'] !== 'APPROVED') reasons.push(runningReasons.emit(RUNNING_CODES.DECISION_PENDING, { decisionId: 'E-VARIABILITY' }));
    const prior = resolveParameter(g.parameters, 'running.reference.performanceVariabilityEstimate', mode);
    reasons.push(...prior.reasons);
    if (decisionOk && prior.status === 'resolved') {
      const range = ((prior.value as { prior?: Record<string, unknown> }).prior ?? {})[input.priorKey] as { min?: unknown; max?: unknown } | undefined;
      if (range && typeof range.min === 'number' && typeof range.max === 'number') {
        return { kind: 'CONTEXT_PRIOR', range: { min: range.min, max: range.max }, priorKey: input.priorKey, confidence: 'LOW', provenance: 'RS-HOPKINS-2001-VAR (a priori, non personnel)', reasons };
      }
    }
  }
  reasons.push(runningReasons.emit(RUNNING_CODES.VARIABILITY_UNKNOWN, { cause: paces.length === 0 ? 'NO_COMPARABLE_PERFORMANCE' : 'PERSONAL_OR_PRIOR_UNAVAILABLE' }));
  return { kind: 'UNKNOWN', confidence: 'NONE', reasons };
}
