/**
 * Drapeaux de capacité (conception 5G « RUNNING-V1-CAPABILITY-FLAGS »), approuvés comme principe par
 * le fondateur (phase 6A). Chaque capacité déclare ses dépendances ; son état effectif est TOUJOURS
 * dérivé de la gouvernance : aucun booléen configuré indépendamment.
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningMode } from './model.js';
import { RUNNING_CODES, runningReasons } from './codes.js';
import type { RunningGovernance } from './governance/state.js';
import { CAPABILITIES, CAPABILITY_IDS } from './capability-definitions.js';
import type { CapabilityId } from './capability-definitions.js';
import { resolveParameter } from './governance/parameters.js';
import { assessProductionEligibility } from './eligibility.js';
import type { ProductionEligibility } from './eligibility.js';

export interface CapabilityState {
  readonly capability: CapabilityId;
  readonly mode: RunningMode;
  readonly requested: boolean;
  readonly enabled: boolean;
  /** Mode CANDIDATE seulement : activée malgré une éligibilité de production absente (tracée). */
  readonly candidateOverride: boolean;
  readonly eligibility: ProductionEligibility;
  /** Paramètres sans valeur : la capacité ne peut pas fonctionner, dans AUCUN mode. */
  readonly missingValues: readonly string[];
  readonly reasons: readonly ReasonCode[];
}

/**
 * État effectif d'une capacité :
 * - non demandée ⇒ désactivée ;
 * - PRODUCTION ⇒ activée seulement si `RunningProductionEligibility` la déclare éligible ;
 * - CANDIDATE ⇒ activée si toutes ses valeurs existent et ses dépendances techniques sont satisfaites ;
 *   les décisions en attente et les G1 non signées sont alors TRACÉES (CANDIDATE_OVERRIDE), jamais masquées.
 * Un paramètre sans valeur (V33, V34…) rend la capacité indisponible quel que soit le mode.
 */
export function capabilityState(id: CapabilityId, governance: RunningGovernance, mode: RunningMode, requested: boolean): CapabilityState {
  const def = CAPABILITIES[id];
  const eligibility = assessProductionEligibility(id, governance);
  const missingValues = def.parameters.filter((p) => resolveParameter(governance.parameters, p, 'CANDIDATE').status === 'unresolved');
  const technicalMissing = def.technical.filter((t) => governance.technical[t] !== 'SATISFIED');
  const base = { capability: id, mode, requested, eligibility, missingValues };
  const disabled = (cause: string, extra: readonly ReasonCode[] = []): CapabilityState => ({
    ...base, enabled: false, candidateOverride: false,
    reasons: [runningReasons.emit(RUNNING_CODES.CAPABILITY_DISABLED, { capability: id, cause }), ...extra],
  });
  if (!requested) return { ...base, enabled: false, candidateOverride: false, reasons: [runningReasons.emit(RUNNING_CODES.CAPABILITY_NOT_REQUESTED, { capability: id })] };
  if (mode === 'PRODUCTION') {
    if (!eligibility.eligible) return disabled('NOT_PRODUCTION_ELIGIBLE', eligibility.reasonCodes);
    return { ...base, enabled: true, candidateOverride: false, reasons: [runningReasons.emit(RUNNING_CODES.CAPABILITY_ENABLED, { capability: id, mode })] };
  }
  if (missingValues.length > 0) {
    return disabled('PARAMETER_WITHOUT_VALUE', missingValues.flatMap((p) => resolveParameter(governance.parameters, p, 'CANDIDATE').reasons));
  }
  if (technicalMissing.length > 0) return disabled('TECHNICAL_DEPENDENCY', technicalMissing.map((t) => runningReasons.emit(RUNNING_CODES.TECHNICAL_DEPENDENCY, { dependencyId: t })));
  const override = !eligibility.eligible;
  return {
    ...base, enabled: true, candidateOverride: override,
    reasons: [
      runningReasons.emit(RUNNING_CODES.CAPABILITY_ENABLED, { capability: id, mode }),
      ...(override ? [runningReasons.emit(RUNNING_CODES.CANDIDATE_OVERRIDE, { capability: id, blockers: eligibilityBlockers(eligibility) })] : []),
    ],
  };
}

export function eligibilityBlockers(e: ProductionEligibility): string[] {
  return [...e.blockingDecisionIds, ...e.blockingParameterIds, ...e.blockingG1PolicyIds, ...e.blockingTechnicalIds, ...(e.rulesetLocked ? [] : ['RULESET_NOT_LOCKED'])];
}

/** États de toutes les capacités, dans l'ordre stable de CAPABILITY_IDS. */
export function capabilityStates(governance: RunningGovernance, mode: RunningMode, requested: readonly string[]): readonly CapabilityState[] {
  const set = new Set(requested);
  return CAPABILITY_IDS.map((id) => capabilityState(id, governance, mode, set.has(id)));
}
