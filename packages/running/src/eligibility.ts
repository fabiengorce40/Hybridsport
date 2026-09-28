/**
 * `RunningProductionEligibility` (conception 5G §2), approuvée comme principe par le fondateur.
 *
 * eligible = true SI ET SEULEMENT SI :
 * 1. le socle est éligible (sauf pour le socle lui-même, évalué directement) ;
 * 2. toutes les décisions requises sont APPROVED ;
 * 3. chaque paramètre utilisé est à son état requis (ou PRODUCTION_ELIGIBLE) ;
 * 4. les politiques G1 requises sont SIGNED ;
 * 5. le ruleset est verrouillé ;
 * 6. les dépendances techniques sont satisfaites.
 * Toute dépendance inconnue ou non résolue échoue fermée. Résultat déterministe (listes triées).
 */
import type { ReasonCode } from '@hybridsport/domain';
import { RUNNING_CODES, runningReasons } from './codes.js';
import type { RunningGovernance } from './governance/state.js';
import { meetsRequiredMaturity } from './governance/parameters.js';
import { CAPABILITIES, FOUNDATION } from './capability-definitions.js';
import type { CapabilityDefinition, CapabilityOrFoundation } from './capability-definitions.js';

export interface ProductionEligibility {
  readonly capability: CapabilityOrFoundation;
  readonly eligible: boolean;
  readonly blockingDecisionIds: readonly string[];
  readonly blockingParameterIds: readonly string[];
  readonly blockingG1PolicyIds: readonly string[];
  readonly blockingTechnicalIds: readonly string[];
  readonly rulesetLocked: boolean;
  readonly reasonCodes: readonly ReasonCode[];
}

const sorted = (xs: readonly string[]): string[] => [...new Set(xs)].sort();

function blockersOf(def: CapabilityDefinition, g: RunningGovernance) {
  return {
    decisions: def.decisions.filter((d) => g.decisions[d] !== 'APPROVED'),
    parameters: def.parameters.filter((id) => { const p = g.parameters.find((x) => x.parameterId === id); return p === undefined || !meetsRequiredMaturity(p); }),
    g1: def.g1Policies.filter((p) => g.g1Policies[p] !== 'SIGNED'),
    technical: def.technical.filter((t) => g.technical[t] !== 'SATISFIED'),
  };
}

export function assessProductionEligibility(capability: CapabilityOrFoundation, g: RunningGovernance): ProductionEligibility {
  const own = blockersOf(capability === 'foundation' ? FOUNDATION : CAPABILITIES[capability], g);
  const foundation = capability === 'foundation' ? { decisions: [], parameters: [], g1: [], technical: [] } : blockersOf(FOUNDATION, g);
  const decisions = sorted([...foundation.decisions, ...own.decisions]);
  const parameters = sorted([...foundation.parameters, ...own.parameters]);
  const g1 = sorted([...foundation.g1, ...own.g1]);
  const technical = sorted([...foundation.technical, ...own.technical]);
  const reasonCodes: ReasonCode[] = [
    ...g1.map((policyId) => runningReasons.emit(RUNNING_CODES.G1_POLICY_UNSIGNED, { policyId })),
    ...decisions.map((decisionId) => runningReasons.emit(RUNNING_CODES.DECISION_PENDING, { decisionId })),
    ...parameters.map((parameterId) => runningReasons.emit(RUNNING_CODES.UNRESOLVED_PARAMETER, { parameterId, cause: 'MATURITY_INSUFFICIENT', mode: 'PRODUCTION' })),
    ...technical.map((dependencyId) => runningReasons.emit(RUNNING_CODES.TECHNICAL_DEPENDENCY, { dependencyId })),
    ...(g.rulesetLocked ? [] : [runningReasons.emit(RUNNING_CODES.RULESET_NOT_LOCKED, { rulesetVersion: g.rulesetVersion })]),
  ];
  const eligible = decisions.length === 0 && parameters.length === 0 && g1.length === 0 && technical.length === 0 && g.rulesetLocked;
  return { capability, eligible, blockingDecisionIds: decisions, blockingParameterIds: parameters, blockingG1PolicyIds: g1, blockingTechnicalIds: technical, rulesetLocked: g.rulesetLocked, reasonCodes };
}
