/**
 * Interface des futurs modèles de performance entre distances (5B §F). Vague 1 : INTERFACE seulement.
 * - aucun modèle n'est autoritaire ; la famille type Riegel est un CANDIDAT (V38), exposant NON verrouillé ;
 * - aucun modèle n'a d'autorité pour le marathon ;
 * - aucune formule de prédiction n'est implémentée ; sans modèle éligible : MODEL_UNAVAILABLE.
 * Une `PerformanceEstimate` ne devient JAMAIS automatiquement une cible (5A §B.1).
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningGoal, RunningMode } from './model.js';
import { RUNNING_CODES, runningReasons } from './codes.js';
import type { RunningGovernance } from './governance/state.js';
import type { RunningReference } from './references.js';
import { capabilityState } from './capabilities.js';

export interface PerformanceModelDescriptor {
  readonly modelId: string;
  readonly version: string;
  /** Objectifs couverts (le marathon n'est couvert par aucun modèle en V1). */
  readonly supportedGoals: readonly RunningGoal[];
  readonly inputRequirements: readonly string[];
  /** Nature de l'incertitude produite (toujours une plage). */
  readonly uncertainty: 'RANGE_REQUIRED';
  /** Paramètres gouvernés nécessaires (exposant, largeur d'incertitude…). */
  readonly parameterIds: readonly string[];
  readonly provenance: string;
  readonly authoritative: false;
  /** Vague 1 : aucune formule. */
  readonly implementation: 'NOT_IMPLEMENTED';
}

export interface PerformanceEstimate {
  readonly modelId: string;
  readonly targetGoal: RunningGoal;
  readonly range: { readonly minS: number; readonly maxS: number };
  readonly referenceBasis: readonly string[];
  readonly reasons: readonly ReasonCode[];
}

/** Modèles connus : la famille candidate type Riegel (V38), non autoritaire, non implémentée. */
export const PERFORMANCE_MODELS: readonly PerformanceModelDescriptor[] = [
  {
    modelId: 'riegel-type-candidate', version: '0.0.0', supportedGoals: ['FIVE_K', 'TEN_K', 'HALF_MARATHON'],
    inputRequirements: ['one recent race or time trial (distance, duration)'], uncertainty: 'RANGE_REQUIRED',
    parameterIds: ['running.performance.extrapolationModelFamily', 'running.performance.extrapolationExponent', 'running.performance.predictionUncertaintyWidth'],
    provenance: 'RS-VICKERS-2016-PRED (famille candidate ; exposant non verrouillé)', authoritative: false, implementation: 'NOT_IMPLEMENTED',
  },
];

export type ModelSelection =
  | { readonly status: 'available'; readonly model: PerformanceModelDescriptor; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'unavailable'; readonly cause: string; readonly reasons: readonly ReasonCode[] };

/**
 * Sélection d'un modèle pour un objectif. Refus explicite (MODEL_UNAVAILABLE) si : objectif non couvert
 * (marathon, course générale), capacité `performanceExtrapolation` indisponible, aucun modèle implémenté.
 */
export function selectPerformanceModel(goal: RunningGoal, input: { readonly governance: RunningGovernance; readonly mode: RunningMode; readonly requested: boolean; readonly references: readonly RunningReference[] }): ModelSelection {
  const unavailable = (cause: string, extra: readonly ReasonCode[] = []): ModelSelection => ({
    status: 'unavailable', cause, reasons: [...extra, runningReasons.emit(RUNNING_CODES.MODEL_UNAVAILABLE, { goal, cause })],
  });
  const candidates = PERFORMANCE_MODELS.filter((m) => m.supportedGoals.includes(goal));
  if (candidates.length === 0) return unavailable(goal === 'MARATHON' ? 'MARATHON_NO_AUTHORITATIVE_MODEL' : 'GOAL_NOT_COVERED');
  const cap = capabilityState('performanceExtrapolation', input.governance, input.mode, input.requested);
  if (!cap.enabled) return unavailable('CAPABILITY_UNAVAILABLE', cap.reasons);
  const implemented = candidates.filter((m) => (m.implementation as string) !== 'NOT_IMPLEMENTED');
  if (implemented.length === 0) return unavailable('NO_IMPLEMENTED_MODEL');
  if (!input.references.some((r) => r.type === 'RACE_RESULT' || r.type === 'TIME_TRIAL')) return unavailable('INPUT_REQUIREMENTS_UNMET');
  const [model] = implemented;
  return model ? { status: 'available', model, reasons: [] } : unavailable('NO_IMPLEMENTED_MODEL');
}
