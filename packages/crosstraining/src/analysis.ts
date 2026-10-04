/**
 * Analyse C1 : ce qui bloque une prescription Cross-training, dans un ordre stable. Aucune dose n'est calculée.
 * Les trois SOURCES de dose possibles (carte §4) sont le rejeu d'une séance réalisée, le calibrage et la première
 * exposition ; chacune est une capacité gouvernée. Aucune source active ⇒ refus DOSE_SOURCE_UNAVAILABLE.
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { CtStimulus } from './model.js';
import { CT_CODES, ctReasons } from './codes.js';
import type { CrossTrainingContext } from './context.js';
import { capabilityState, capabilityStates, foundationState } from './capabilities.js';
import type { CtCapabilityId, CtCapabilityState } from './capabilities.js';
import type { CtGovernance } from './governance/state.js';

export const DOSE_SOURCE_CAPABILITIES: readonly CtCapabilityId[] = ['ctReplayHold', 'ctBootstrapExposure', 'ctCalibratedDose', 'ctFirstExposure'];

export interface CtAnalysis {
  readonly stimulus: CtStimulus;
  readonly foundation: CtCapabilityState;
  readonly capabilities: readonly CtCapabilityState[];
  readonly doseSources: readonly CtCapabilityState[];
  readonly hybridBlocked: boolean;
  /** Raisons de blocage, ordre stable : multisport, socle, sources de dose. */
  readonly blockingReasons: readonly ReasonCode[];
}

export function analyzeCrossTraining(stimulus: CtStimulus, context: CrossTrainingContext, governance: CtGovernance): CtAnalysis {
  const mode = context.mode;
  const requested = new Set<string>(context.capabilityRequests);
  const foundation = foundationState(governance, mode);
  const doseSources = DOSE_SOURCE_CAPABILITIES.map((id) => capabilityState(id, governance, mode, requested.has(id)));
  const out: ReasonCode[] = [];
  // Multisport : refus tant que le planificateur global n'existe pas. L'interférence n'est JAMAIS résolue ici.
  const hybridBlocked = context.population.hybrid;
  if (hybridBlocked) {
    out.push(ctReasons.emit(CT_CODES.HYBRID_PLANNER_UNAVAILABLE, { cause: 'GLOBAL_PLANNER_REQUIRED' }));
    out.push(...capabilityState('ctHybridPlanning', governance, mode, true).reasons);
  }
  if (!foundation.enabled) out.push(...foundation.reasons);
  if (!doseSources.some((s) => s.enabled)) {
    out.push(ctReasons.emit(CT_CODES.DOSE_SOURCE_UNAVAILABLE, { stimulus, capabilities: [...DOSE_SOURCE_CAPABILITIES] }));
    for (const s of doseSources) out.push(...s.reasons);
  }
  return { stimulus, foundation, capabilities: capabilityStates(governance, mode, context.capabilityRequests), doseSources, hybridBlocked, blockingReasons: out };
}
