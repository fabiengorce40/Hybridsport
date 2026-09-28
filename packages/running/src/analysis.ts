/**
 * Analyse de vague 1 : infrastructure de DÉCISION (gouvernance, capacités, références, précision,
 * dégradations, trace), sans AUCUN algorithme de prescription. Pure et déterministe : mêmes contexte,
 * gouvernance et instant ⇒ même résultat, même trace.
 *
 * Distinction centrale : `eligibility` (la séance peut-elle être proposée ?) est calculée SÉPARÉMENT de
 * `precision` (avec quelle autorité de cible ?). Une précision réduite ne rend jamais une séance inéligible.
 */
import type { ISODateTime, ReasonCode } from '@hybridsport/domain';
import { POST_V1_ARCHETYPES, RUNNING_SESSION_ARCHETYPES } from './model.js';
import type { PostV1Archetype, RunningGoal, RunningSessionArchetype } from './model.js';
import { RUNNING_CODES, runningReasons } from './codes.js';
import type { RunningGovernance } from './governance/state.js';
import { capabilityStates } from './capabilities.js';
import type { CapabilityState } from './capabilities.js';
import { CAPABILITIES } from './capability-definitions.js';
import type { CapabilityId } from './capability-definitions.js';
import { assessProductionEligibility } from './eligibility.js';
import type { ProductionEligibility } from './eligibility.js';
import { selectReference } from './references.js';
import type { ReferenceDecision, ReferenceSelection } from './references.js';
import { prescriptionConfidence, targetPrecision } from './precision.js';
import type { PrescriptionConfidence, TargetPrecision } from './precision.js';
import { sortDegradations } from './degradation.js';
import type { Degradation } from './degradation.js';
import { estimateVariability } from './variability.js';
import type { RunningPerformanceVariabilityEstimate } from './variability.js';
import { selectPerformanceModel } from './performance-model.js';
import type { ModelSelection } from './performance-model.js';
import { recentLoadContext } from './recent-load.js';
import type { RecentLoadContext } from './recent-load.js';
import type { RunningContext } from './context.js';

/** Distances officielles des objectifs de course (définitions, pas des paramètres de programmation). */
export const GOAL_DISTANCE_M: Readonly<Record<RunningGoal, number | undefined>> = {
  GENERAL_RUNNING: undefined,
  // technical-constant: distance officielle de l'épreuve (définition)
  FIVE_K: 5000,
  // technical-constant: distance officielle de l'épreuve (définition)
  TEN_K: 10000,
  // technical-constant: distance officielle de l'épreuve (définition)
  HALF_MARATHON: 21097.5,
  // technical-constant: distance officielle de l'épreuve (définition)
  MARATHON: 42195,
};

/** Clé d'a priori de variabilité (V42) par objectif. */
const VARIABILITY_PRIOR_KEY: Readonly<Record<RunningGoal, string | undefined>> = {
  GENERAL_RUNNING: undefined, FIVE_K: 'SHORT_OR_ROAD_FASTEST', TEN_K: 'SHORT_OR_ROAD_FASTEST', HALF_MARATHON: 'HALF_MARATHON', MARATHON: 'MARATHON',
};

/** Décision de référence servant la cible d'intensité de chaque archétype. */
export const ARCHETYPE_REFERENCE_DECISION: Readonly<Record<RunningSessionArchetype, ReferenceDecision>> = {
  EASY: 'INTENSITY_TARGETING', LONG: 'INTENSITY_TARGETING', THRESHOLD: 'THRESHOLD_BOUNDARY', SEVERE: 'SEVERE_DOMAIN',
  SHORT_INTERVAL: 'SEVERE_DOMAIN', HILLS: 'SEVERE_DOMAIN', RACE_PACE: 'RACE_SPECIFIC_PACE', TEST: 'INTENSITY_TARGETING', STRIDES: 'INTENSITY_TARGETING',
};

/** Première exposition : capacité requise, par archétype (5G). */
const FIRST_EXPOSURE_CAPABILITY: Partial<Record<RunningSessionArchetype, CapabilityId>> = {
  THRESHOLD: 'firstThresholdExposure', SEVERE: 'firstSevereExposure', SHORT_INTERVAL: 'firstSevereExposure', HILLS: 'firstSevereExposure',
};

export interface SessionEligibility {
  readonly status: 'ELIGIBLE' | 'UNAVAILABLE';
  readonly blocking: readonly (CapabilityId | 'foundation' | 'post_v1' | 'goal')[];
  readonly reasons: readonly ReasonCode[];
}

export interface SessionAssessment {
  readonly archetype: RunningSessionArchetype | PostV1Archetype;
  readonly eligibility: SessionEligibility;
  readonly precision: TargetPrecision;
  readonly prescriptionConfidence?: PrescriptionConfidence;
  readonly degradations: readonly Degradation[];
}

export interface TraceEntry {
  readonly step: 'governance' | 'capability' | 'reference' | 'variability' | 'model' | 'recent_load' | 'session' | 'degradation';
  readonly subject: string;
  readonly decision: string;
  readonly reasons: readonly ReasonCode[];
}

export interface RunningWave1Analysis {
  readonly rulesetVersion: string;
  readonly mode: RunningContext['mode'];
  readonly foundation: ProductionEligibility;
  readonly capabilities: readonly CapabilityState[];
  readonly references: readonly ReferenceSelection[];
  readonly variability: RunningPerformanceVariabilityEstimate;
  readonly performanceModel: ModelSelection;
  readonly recentLoad: readonly RecentLoadContext[];
  readonly sessions: readonly SessionAssessment[];
  /** Dégradations globales (indépendantes d'un archétype). */
  readonly degradations: readonly Degradation[];
  readonly trace: readonly TraceEntry[];
}

function capOf(states: readonly CapabilityState[], id: CapabilityId): CapabilityState {
  const found = states.find((s) => s.capability === id);
  if (!found) throw new TypeError(`capacité absente de l’état calculé : ${id}`);
  return found;
}

/** Analyse complète de vague 1 pour un contexte donné. */
export function analyzeRunning(ctx: RunningContext, governance: RunningGovernance, now: ISODateTime): RunningWave1Analysis {
  const mode = ctx.mode;
  const trace: TraceEntry[] = [];
  const foundation = assessProductionEligibility('foundation', governance);
  trace.push({ step: 'governance', subject: 'foundation', decision: foundation.eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE', reasons: foundation.reasonCodes });
  const capabilities = capabilityStates(governance, mode, ctx.capabilityRequests);
  for (const c of capabilities) trace.push({ step: 'capability', subject: c.capability, decision: c.enabled ? (c.candidateOverride ? 'ENABLED_CANDIDATE_OVERRIDE' : 'ENABLED') : 'DISABLED', reasons: c.reasons });
  const cap = (id: CapabilityId) => capOf(capabilities, id);

  const goalDistance = GOAL_DISTANCE_M[ctx.goal.type];
  const confCtx = { now, mode, parameters: governance.parameters, ...(goalDistance !== undefined ? { targetDistanceM: goalDistance } : {}) };
  const decisions = [...new Set(RUNNING_SESSION_ARCHETYPES.map((a) => ARCHETYPE_REFERENCE_DECISION[a]))];
  const references = decisions.map((d) => selectReference(ctx.references, d, confCtx));
  for (const r of references) trace.push({ step: 'reference', subject: r.decision, decision: r.selected ? `SELECTED:${r.selected.referenceId}:${r.confidence}` : 'NONE', reasons: r.reasons });
  const refFor = (d: ReferenceDecision): ReferenceSelection => {
    const found = references.find((r) => r.decision === d);
    if (!found) throw new TypeError(`décision de référence non évaluée : ${d}`);
    return found;
  };

  const priorKey = VARIABILITY_PRIOR_KEY[ctx.goal.type];
  const variability = goalDistance === undefined
    ? { kind: 'UNKNOWN' as const, confidence: 'NONE' as const, reasons: [runningReasons.emit(RUNNING_CODES.VARIABILITY_UNKNOWN, { cause: 'NO_RACE_GOAL' })] }
    : estimateVariability({ references: ctx.references, distanceM: goalDistance, ...(priorKey !== undefined ? { priorKey } : {}), governance, mode });
  trace.push({ step: 'variability', subject: ctx.goal.type, decision: variability.kind, reasons: variability.reasons });

  const performanceModel = selectPerformanceModel(ctx.goal.type, { governance, mode, requested: ctx.capabilityRequests.includes('performanceExtrapolation'), references: ctx.references });
  trace.push({ step: 'model', subject: ctx.goal.type, decision: performanceModel.status === 'available' ? `AVAILABLE:${performanceModel.model.modelId}` : `UNAVAILABLE:${performanceModel.cause}`, reasons: performanceModel.reasons });

  const recentLoad = (ctx.recentLoad?.dimensions ?? []).map((d) => recentLoadContext(d.dimension, d.weeks, { ...(ctx.recentLoad?.returnStartedAt !== undefined ? { returnStartedAt: ctx.recentLoad.returnStartedAt } : {}), mode, parameters: governance.parameters }));
  for (const r of recentLoad) trace.push({ step: 'recent_load', subject: r.dimension, decision: r.status, reasons: r.reasons });

  // Dégradations globales.
  const global: Degradation[] = [];
  const pbh = cap('progressionBeyondHistory');
  if (!pbh.enabled) global.push({ effect: 'HOLD_OR_RESTORE_ONLY', subject: 'PROGRESSION', capability: 'progressionBeyondHistory', parameterIds: ['running.progression.magnitude'], reason: runningReasons.emit(RUNNING_CODES.PROGRESSION_UNRESOLVED, { capability: 'progressionBeyondHistory' }) });
  if (ctx.goal.type === 'MARATHON' && !cap('marathon').enabled && !ctx.goal.strict) {
    global.push({ effect: 'GENERAL_PROGRAM_WITHOUT_GOAL_CLAIM', subject: 'GOAL:MARATHON', capability: 'marathon', parameterIds: ['running.longRun.marginAndBound', 'running.taper.durationMarathon'], reason: runningReasons.emit(RUNNING_CODES.MARATHON_RULE_UNRESOLVED, { strict: false }) });
  }
  if (performanceModel.status === 'unavailable' && goalDistance !== undefined && !refFor('RACE_SPECIFIC_PACE').selected) {
    global.push({ effect: 'CALIBRATION_REQUIRED', subject: `GOAL:${ctx.goal.type}`, capability: 'performanceExtrapolation', parameterIds: ['running.performance.extrapolationExponent'], reason: runningReasons.emit(RUNNING_CODES.CALIBRATION_REQUIRED, { cause: `MODEL_UNAVAILABLE:${performanceModel.cause}` }) });
  }
  const degradations = sortDegradations(global);
  for (const d of degradations) trace.push({ step: 'degradation', subject: d.subject, decision: d.effect, reasons: [d.reason] });

  const sessions = [...RUNNING_SESSION_ARCHETYPES, ...POST_V1_ARCHETYPES].map((a) => assessSession(a, { ctx, capabilities, foundation, refFor, variability, performanceModel, governance }));
  for (const s of sessions) trace.push({ step: 'session', subject: s.archetype, decision: `${s.eligibility.status}/${s.precision.level}`, reasons: [...s.eligibility.reasons, ...s.precision.reasons, ...s.degradations.map((d) => d.reason)] });

  return { rulesetVersion: governance.rulesetVersion, mode, foundation, capabilities, references, variability, performanceModel, recentLoad, sessions, degradations, trace };
}

interface SessionInputs {
  readonly ctx: RunningContext;
  readonly capabilities: readonly CapabilityState[];
  readonly foundation: ProductionEligibility;
  readonly refFor: (d: ReferenceDecision) => ReferenceSelection;
  readonly variability: RunningPerformanceVariabilityEstimate;
  readonly performanceModel: ModelSelection;
  readonly governance: RunningGovernance;
}

/** Éligibilité (capacités, gouvernance, périmètre) PUIS précision (références, allure) : deux décisions séparées. */
export function assessSession(archetype: RunningSessionArchetype | PostV1Archetype, s: SessionInputs): SessionAssessment {
  const { ctx } = s;
  const cap = (id: CapabilityId) => capOf(s.capabilities, id);
  const blocking: SessionEligibility['blocking'][number][] = [];
  const reasons: ReasonCode[] = [];
  const degradations: Degradation[] = [];
  const block = (b: SessionEligibility['blocking'][number], rs: readonly ReasonCode[], degr?: Degradation) => { blocking.push(b); reasons.push(...rs); if (degr) degradations.push(degr); };
  const unavailableCap = (id: CapabilityId, reason: ReasonCode, effect: Degradation['effect']) =>
    block(id, [reason], { effect, subject: archetype, capability: id, parameterIds: cap(id).missingValues.length > 0 ? cap(id).missingValues : CAPABILITIES[id].parameters, reason });

  if ((POST_V1_ARCHETYPES as readonly string[]).includes(archetype)) {
    block('post_v1', [runningReasons.emit(RUNNING_CODES.ARCHETYPE_POST_V1, { archetype })]);
  } else {
    const a = archetype as RunningSessionArchetype;
    if (ctx.mode === 'PRODUCTION' && !s.foundation.eligible) block('foundation', s.foundation.reasonCodes);
    if (ctx.population.level === 'P_R0' && !cap('noviceEntry').enabled) unavailableCap('noviceEntry', runningReasons.emit(RUNNING_CODES.NOVICE_ENTRY_UNRESOLVED, { population: 'P_R0' }), 'NO_VALID');
    if ((ctx.returnState.state === 'LONG' || ctx.returnState.state === 'UNKNOWN') && ctx.returnState.postReturnSessions === 0 && !cap('longReturn').enabled) {
      unavailableCap('longReturn', runningReasons.emit(RUNNING_CODES.RETURN_PROTOCOL_UNRESOLVED, { returnState: ctx.returnState.state }), 'NO_VALID');
    }
    if (ctx.population.hybrid && !cap('hybridPlanning').enabled) unavailableCap('hybridPlanning', runningReasons.emit(RUNNING_CODES.HYBRID_PLANNER_UNAVAILABLE, { capability: 'hybridPlanning' }), 'NO_VALID');
    if (ctx.goal.type === 'MARATHON' && !cap('marathon').enabled && (ctx.goal.strict || a === 'RACE_PACE')) {
      unavailableCap('marathon', runningReasons.emit(RUNNING_CODES.MARATHON_RULE_UNRESOLVED, { strict: true }), 'NO_VALID');
    }
    const first = FIRST_EXPOSURE_CAPABILITY[a];
    if (first !== undefined && !ctx.exposures.some((e) => e.archetype === a) && !cap(first).enabled) {
      unavailableCap(first, runningReasons.emit(RUNNING_CODES.FIRST_EXPOSURE_UNRESOLVED, { archetype: a, capability: first }), 'COMPONENT_UNAVAILABLE');
    }
    if (a === 'RACE_PACE' && ctx.goal.type === 'GENERAL_RUNNING') block('goal', [runningReasons.emit(RUNNING_CODES.GOAL_UNSUPPORTED, { goal: 'GENERAL_RUNNING' })]);
    if (a === 'LONG' && !cap('longRunProgression').enabled) {
      degradations.push({ effect: 'HOLD_OR_RESTORE_ONLY', subject: 'LONG', capability: 'longRunProgression', parameterIds: ['running.longRun.marginAndBound'], reason: runningReasons.emit(RUNNING_CODES.HOLD_OR_RESTORE_ONLY, { capability: 'longRunProgression' }) });
    }
  }
  const eligibility: SessionEligibility = { status: blocking.length === 0 ? 'ELIGIBLE' : 'UNAVAILABLE', blocking: [...new Set(blocking)], reasons };
  if ((POST_V1_ARCHETYPES as readonly string[]).includes(archetype)) {
    return { archetype, eligibility, precision: { level: 'NOT_APPLICABLE', causes: ['SESSION_UNAVAILABLE'], effortMapping: { parameterId: 'running.target.rpeByDomain', status: 'unresolved' }, reasons: [] }, degradations: sortDegradations(degradations) };
  }
  const a = archetype as RunningSessionArchetype;
  const ref = s.refFor(ARCHETYPE_REFERENCE_DECISION[a]);
  const precision = targetPrecision({
    archetype: a, sessionAvailable: eligibility.status === 'ELIGIBLE', paceTargetsEnabled: cap('paceTargets').enabled,
    wearable: ctx.sensors.wearable, referenceConfidence: ref.confidence, mode: ctx.mode, parameters: s.governance.parameters,
  });
  if (precision.level === 'EFFORT_ONLY' && !precision.causes.includes('EFFORT_BY_NATURE')) {
    degradations.push({ effect: 'PRECISION_REDUCED', subject: a, capability: 'paceTargets', parameterIds: ['running.target.paceRangeWidthByConfidence'], reason: precision.reasons.find((r) => r.code === RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED) ?? runningReasons.emit(RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED, { archetype: a, precision: precision.level, cause: precision.causes.join(',') }) });
  }
  return {
    archetype, eligibility, precision,
    ...(eligibility.status === 'ELIGIBLE' ? { prescriptionConfidence: prescriptionConfidence({ referenceConfidence: ref.confidence, precision, variabilityKnown: s.variability.kind !== 'UNKNOWN' }) } : {}),
    degradations: sortDegradations(degradations),
  };
}
