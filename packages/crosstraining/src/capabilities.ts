/**
 * Capacités Cross-training (carte §7). Chaque capacité déclare ses paramètres, décisions, politiques G1 et
 * dépendances techniques ; son état effectif est TOUJOURS dérivé de la gouvernance (aucun booléen configuré).
 * Règle C1, identique dans les deux modes : activée seulement si demandée, TOUS ses paramètres résolus dans le
 * mode, ses dépendances techniques satisfaites et ses politiques G1 signées. Sinon : refus tracé, jamais un repli.
 * Le « socle » n'est pas demandable : il conditionne toute prescription.
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { CtMode } from './model.js';
import { CT_CODES, ctReasons } from './codes.js';
import { resolveParameter } from './governance/parameters.js';
import type { CtDecisionId, CtG1PolicyId, CtGovernance, CtTechnicalDependencyId } from './governance/state.js';

export interface CapabilityDefinition {
  readonly parameters: readonly string[];
  readonly decisions: readonly CtDecisionId[];
  readonly g1Policies: readonly CtG1PolicyId[];
  readonly technical: readonly CtTechnicalDependencyId[];
}

export const CT_CAPABILITY_IDS = [
  'ctReplayHold', 'ctCalibratedDose', 'ctProgression', 'ctFirstExposure', 'ctLoadedMovements',
  'ctTechnicalMovements', 'ctIntensityTargets', 'ctBenchmarks', 'ctWeeklyComposition', 'ctHybridPlanning',
] as const;
export type CtCapabilityId = (typeof CT_CAPABILITY_IDS)[number];
export const CT_FOUNDATION = 'ctFoundation';

export const CT_FOUNDATION_DEFINITION: CapabilityDefinition = {
  parameters: ['ct.stimulus.catalog', 'ct.safety.repsPerMovementCap', 'ct.safety.jumpContactsCap', 'ct.safety.novicePolicy', 'ct.return.protocol', 'ct.safety.novelEccentricVolume'],
  decisions: ['CT-D1', 'CT-D6', 'CT-G1'],
  g1Policies: ['CT-G1-PAIN', 'CT-G1-NOVICE', 'CT-G1-RETURN', 'CT-G1-EXERTIONAL'],
  technical: ['CT_CONTENT'],
};

export const CT_CAPABILITIES: Readonly<Record<CtCapabilityId, CapabilityDefinition>> = {
  ctReplayHold: {
    parameters: ['ct.stimulus.admissibleFormats', 'ct.history.anchorPolicy', 'ct.history.recencyBand', 'ct.history.negativeResponse', 'ct.history.completionCriterion'],
    decisions: ['CT-D15'], g1Policies: ['CT-G1-PAIN'], technical: ['CT_CONTENT'],
  },
  ctCalibratedDose: {
    parameters: ['ct.stimulus.admissibleFormats', 'ct.stimulus.timeDomains', 'ct.stimulus.workRestRatios', 'ct.estimation.workRates', 'ct.dose.construction', 'ct.format.timeCapMargin', 'ct.format.emomDensity'],
    decisions: ['CT-D1', 'CT-D2', 'CT-D3', 'CT-D8'], g1Policies: [], technical: ['CT_CONTENT'],
  },
  ctProgression: {
    parameters: ['ct.progression.magnitude', 'ct.progression.toleranceRule', 'ct.history.negativeResponse'],
    decisions: ['CT-D5'], g1Policies: [], technical: ['CT_CONTENT'],
  },
  ctFirstExposure: {
    parameters: ['ct.firstExposure.byStimulus', 'ct.safety.novicePolicy', 'ct.safety.novelEccentricVolume'],
    decisions: ['CT-D4', 'CT-G1'], g1Policies: ['CT-G1-NOVICE', 'CT-G1-EXERTIONAL'], technical: ['CT_CONTENT'],
  },
  ctLoadedMovements: {
    parameters: ['ct.load.implementStandards', 'ct.load.percentE1rmByStimulus'],
    decisions: ['CT-D12'], g1Policies: [], technical: ['CORE_EXT_C1', 'CT_CONTENT'],
  },
  ctTechnicalMovements: {
    parameters: ['ct.safety.technicalUnderFatigue', 'ct.scaling.rules'],
    decisions: ['CT-D7', 'CT-D13'], g1Policies: ['CT-G1-NOVICE'], technical: ['CT_CONTENT'],
  },
  ctIntensityTargets: {
    parameters: ['ct.intensity.effortTargetByStimulus', 'ct.stimulus.intensityBand'],
    decisions: ['CT-D9'], g1Policies: [], technical: ['CORE_EXT_C1'],
  },
  ctBenchmarks: {
    parameters: ['ct.benchmark.set', 'ct.benchmark.cadence', 'ct.history.completionCriterion'],
    decisions: ['CT-D14'], g1Policies: [], technical: ['CT_CONTENT'],
  },
  ctWeeklyComposition: {
    parameters: ['ct.hi.classification', 'ct.week.stimulusDistribution'],
    decisions: ['CT-D10'], g1Policies: [], technical: ['CT_CONTENT'],
  },
  ctHybridPlanning: {
    parameters: ['ct.hybrid.policy'],
    decisions: ['CT-D11'], g1Policies: [], technical: ['GLOBAL_PLANNER'],
  },
};

export interface CtCapabilityState {
  readonly capability: CtCapabilityId | typeof CT_FOUNDATION;
  readonly mode: CtMode;
  readonly requested: boolean;
  readonly enabled: boolean;
  /** Tout ce qui bloque, dans un ordre stable : paramètres, décisions, G1, dépendances techniques. */
  readonly blockers: readonly string[];
  readonly reasons: readonly ReasonCode[];
}

function assess(capability: CtCapabilityState['capability'], def: CapabilityDefinition, governance: CtGovernance, mode: CtMode, requested: boolean): CtCapabilityState {
  if (!requested) {
    return { capability, mode, requested, enabled: false, blockers: ['NOT_REQUESTED'], reasons: [ctReasons.emit(CT_CODES.CAPABILITY_DISABLED, { capability, cause: 'NOT_REQUESTED', blockers: [] })] };
  }
  const resolutions = def.parameters.map((p) => ({ id: p, r: resolveParameter(governance.parameters, p, mode) }));
  const unresolvedParams = resolutions.filter((x) => x.r.status === 'unresolved');
  const pending = mode === 'PRODUCTION' ? def.decisions.filter((d) => governance.decisions[d] !== 'APPROVED') : [];
  const unsigned = def.g1Policies.filter((g) => governance.g1Policies[g] !== 'SIGNED');
  const technical = def.technical.filter((t) => governance.technical[t] !== 'SATISFIED');
  const lock = mode === 'PRODUCTION' && !governance.rulesetLocked ? ['RULESET_NOT_LOCKED'] : [];
  const blockers = [...unresolvedParams.map((x) => x.id), ...pending, ...unsigned, ...technical, ...lock];
  const trace = resolutions.flatMap((x) => x.r.reasons);
  if (blockers.length === 0) return { capability, mode, requested, enabled: true, blockers, reasons: trace };
  const cause = unresolvedParams.length > 0 ? 'PARAMETER_UNRESOLVED' : pending.length > 0 ? 'DECISION_PENDING' : unsigned.length > 0 ? 'G1_UNSIGNED' : technical.length > 0 ? 'TECHNICAL_DEPENDENCY' : 'RULESET_NOT_LOCKED';
  return {
    capability, mode, requested, enabled: false, blockers,
    reasons: [
      ctReasons.emit(CT_CODES.CAPABILITY_DISABLED, { capability, cause, blockers }),
      ...trace,
      ...unsigned.map((g) => ctReasons.emit(CT_CODES.G1_POLICY_UNSIGNED, { policyId: g })),
      ...technical.map((t) => ctReasons.emit(CT_CODES.TECHNICAL_DEPENDENCY, { dependencyId: t })),
    ],
  };
}

export function capabilityState(id: CtCapabilityId, governance: CtGovernance, mode: CtMode, requested: boolean): CtCapabilityState {
  return assess(id, CT_CAPABILITIES[id], governance, mode, requested);
}

/** Le socle est toujours évalué (jamais « non demandé ») : sans lui, aucune prescription. */
export function foundationState(governance: CtGovernance, mode: CtMode): CtCapabilityState {
  return assess(CT_FOUNDATION, CT_FOUNDATION_DEFINITION, governance, mode, true);
}

/** États de toutes les capacités, dans l'ordre stable de CT_CAPABILITY_IDS. */
export function capabilityStates(governance: CtGovernance, mode: CtMode, requested: readonly string[]): readonly CtCapabilityState[] {
  const set = new Set(requested);
  return CT_CAPABILITY_IDS.map((id) => capabilityState(id, governance, mode, set.has(id)));
}
