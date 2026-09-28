/**
 * Vague 2 — pipeline de prescription :
 * RunningContext → Analyse (vague 1) → Génération → Éligibilité → Sécurité/G1 → Faisabilité
 * → Résolution de précision → Sélection déterministe → Proposition (contrat SportEngine du CORE).
 *
 * Règles :
 * - un archétype hors vague 2 n'est jamais généré (PRESCRIPTION_NOT_IMPLEMENTED) ;
 * - `eligibility = UNAVAILABLE` rejette le candidat, jamais une séance dégradée ;
 * - PRODUCTION : socle éligible et paramètres PRODUCTION_ELIGIBLE exigés (resolveParameter) ;
 * - CANDIDATE : seulement si le moteur est construit en SIMULATION (tests), proposition marquée ;
 * - dose = ancre V19 (HOLD strict, aucune hausse) ; intensité = plafond RPE V02 ; allure jamais pour EASY
 *   (V40 non résolu, aucun algorithme de plafond d'allure gouverné) ;
 * - aucune durée calculée ici : l'estimation vient du CORE (`withDerivedEstimate`).
 */
import type { Exercise, ISODateTime, ReasonCode, RunSegment, RunStructure } from '@hybridsport/domain';
import { withDerivedEstimate } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { archetypeFromIntentId, CORE_RUN_DOMAIN } from '../model.js';
import type { RunningSessionArchetype } from '../model.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';
import { resolveParameter } from '../governance/parameters.js';
import type { RunningParameter } from '../governance/parameters.js';
import { G1_POLICIES } from '../governance/state.js';
import type { RunningGovernance } from '../governance/state.js';
import { sortDegradations } from '../degradation.js';
import type { Degradation } from '../degradation.js';
import type { RunningWave1Analysis, SessionAssessment } from '../analysis.js';
import type { RunningContext } from '../context.js';
import { historyAnchor } from './history.js';
import type { StructureFamily } from './history.js';
import { WAVE2_ARCHETYPES, WAVE2_STRUCTURE_FAMILIES } from './candidate.js';
import type { CandidateRejection, ParameterUse, PipelineStage, RunningCandidate } from './candidate.js';

export interface Wave2Options {
  /** Mode simulation (tests) : autorise la prescription en mode CANDIDATE, propositions marquées. */
  readonly simulation: boolean;
  readonly wave: string;
}

export interface PipelineTraceEntry {
  readonly stage: PipelineStage;
  readonly subject: string;
  readonly decision: string;
  readonly reasons: readonly ReasonCode[];
}

export interface Wave2Selection {
  readonly candidate: RunningCandidate;
  readonly structure: RunStructure;
  readonly exercise: Exercise;
  readonly parametersUsed: readonly ParameterUse[];
}

export type Wave2Outcome =
  | { readonly status: 'selected'; readonly selection: Wave2Selection; readonly candidates: readonly RunningCandidate[]; readonly reasons: readonly ReasonCode[]; readonly trace: readonly PipelineTraceEntry[] }
  | { readonly status: 'no_valid'; readonly candidates: readonly RunningCandidate[]; readonly reasons: readonly ReasonCode[]; readonly trace: readonly PipelineTraceEntry[] };

const V02 = 'running.target.rpeByDomain';
const V40 = 'running.target.easyCeilingPaceMargin';
const RETURN_PROTOCOL = 'running.return.protocol';

const EASY_CEILING_PACE_UNGOVERNED = 'EASY_CEILING_PACE_UNGOVERNED';

function paramUse(params: readonly RunningParameter[], parameterId: string): ParameterUse {
  const p = params.find((x) => x.parameterId === parameterId);
  if (!p) throw new TypeError(`paramètre utilisé absent du registre : ${parameterId}`);
  return { parameterId, maturity: p.maturity, candidate: p.maturity !== 'PRODUCTION_ELIGIBLE' };
}

/** Exercices de course admissibles du catalogue (discipline, schéma, matériel, exclusions, contre-indications). */
function runExercises(input: SportEngineInput<RunningContext>): Exercise[] {
  const equipment = new Set(input.profile.availableEquipment);
  return input.catalog.activeExercises()
    .filter((e) => e.disciplines.includes(input.intent.discipline) && e.patterns.primary === 'running' && e.movementType === 'monostructural')
    .filter((e) => input.catalog.isFeasibleWith(e, equipment) && !input.profile.excludedExercises.includes(e.id))
    .filter((e) => !e.contraindicationTags.some((t) => input.profile.restrictions.includes(t)))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function sessionReasons(s: SessionAssessment | undefined): ReasonCode[] {
  return s ? [...s.eligibility.reasons, ...s.degradations.map((d) => d.reason)] : [];
}

/** Pipeline complet pour une intention. Pur et déterministe (instant et graine injectés par le CORE). */
export function runWave2(input: SportEngineInput<RunningContext>, analysis: RunningWave1Analysis, governance: RunningGovernance, opts: Wave2Options): Wave2Outcome {
  const trace: PipelineTraceEntry[] = [];
  const archetype = archetypeFromIntentId(input.intent.archetypeId);
  const assessment = analysis.sessions.find((s) => s.archetype === archetype);
  trace.push({ stage: 'ANALYSIS', subject: input.intent.archetypeId, decision: assessment ? `${assessment.eligibility.status}/${assessment.precision.level}` : 'ARCHETYPE_UNKNOWN', reasons: sessionReasons(assessment) });

  if (archetype === undefined || !(WAVE2_ARCHETYPES as readonly string[]).includes(archetype)) {
    const reasons = [
      runningReasons.emit(RUNNING_CODES.PRESCRIPTION_NOT_IMPLEMENTED, { archetype: archetype ?? input.intent.archetypeId, wave: opts.wave }),
      ...(assessment ? sessionReasons(assessment) : [runningReasons.emit(RUNNING_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId })]),
    ];
    trace.push({ stage: 'GENERATION', subject: input.intent.archetypeId, decision: 'NOT_GENERATED', reasons });
    return { status: 'no_valid', candidates: [], reasons, trace };
  }
  const a = archetype as RunningSessionArchetype;
  const families = WAVE2_STRUCTURE_FAMILIES[a] ?? [];
  const candidates = families.map((family) => evaluate(a, family, { input, analysis, governance, opts, assessment, trace }));
  trace.push({ stage: 'GENERATION', subject: a, decision: `GENERATED:${String(candidates.length)}`, reasons: [] });

  // Sélection déterministe : un candidat par famille de structure (EASY : une seule famille) ; aucun score.
  const survivors = candidates.filter((c) => c.built !== undefined);
  const chosen = survivors[0];
  if (chosen?.built === undefined || survivors.length !== 1) {
    const reasons = candidates.flatMap((c) => c.candidate.rejection?.reasons ?? []);
    trace.push({ stage: 'SELECTION', subject: a, decision: 'NO_CANDIDATE', reasons });
    return { status: 'no_valid', candidates: candidates.map((c) => c.candidate), reasons, trace };
  }
  trace.push({ stage: 'SELECTION', subject: chosen.candidate.candidateId, decision: 'SELECTED:SINGLE_CANDIDATE', reasons: [] });
  return {
    status: 'selected',
    selection: { candidate: chosen.candidate, structure: chosen.built.structure, exercise: chosen.built.exercise, parametersUsed: chosen.candidate.parameters },
    candidates: candidates.map((c) => c.candidate), reasons: chosen.candidate.reasons, trace,
  };
}

interface EvalEnv {
  readonly input: SportEngineInput<RunningContext>;
  readonly analysis: RunningWave1Analysis;
  readonly governance: RunningGovernance;
  readonly opts: Wave2Options;
  readonly assessment: SessionAssessment | undefined;
  readonly trace: PipelineTraceEntry[];
}

interface Evaluated { readonly candidate: RunningCandidate; readonly built?: { readonly structure: RunStructure; readonly exercise: Exercise } }

function evaluate(a: RunningSessionArchetype, family: StructureFamily, env: EvalEnv): Evaluated {
  const { input, analysis, governance, opts, assessment, trace } = env;
  const ctx = input.discipline;
  const params = governance.parameters;
  const used: ParameterUse[] = [];
  const reasons: ReasonCode[] = [];
  let degradations: Degradation[] = [...(assessment?.degradations ?? [])];
  const base = {
    candidateId: `${input.intent.id}.${a}.${family}`, archetype: a, structureFamily: family, goal: ctx.goal.type,
    capabilities: analysis.capabilities.map((c) => ({ capability: c.capability, enabled: c.enabled })),
    references: [] as string[],
    g1Policies: G1_POLICIES.map((policyId) => ({ policyId, status: governance.g1Policies[policyId] })),
    provenance: { rulesetVersion: governance.rulesetVersion, mode: ctx.mode, simulation: opts.simulation },
  };
  const snapshot = (extra: Partial<RunningCandidate>): RunningCandidate => ({
    ...base, precision: assessment?.precision.level ?? 'NOT_APPLICABLE', degradations: sortDegradations(degradations), parameters: [...used], reasons: [...reasons], ...extra,
  });
  const reject = (stage: PipelineStage, rs: readonly ReasonCode[], extra: Partial<RunningCandidate> = {}): Evaluated => {
    const rejection: CandidateRejection = { stage, reasons: rs };
    trace.push({ stage, subject: base.candidateId, decision: 'REJECTED', reasons: rs });
    return { candidate: snapshot({ ...extra, rejection }) };
  };

  // Éligibilité (vague 1) : une séance indisponible est rejetée, jamais dégradée.
  if (assessment?.eligibility.status !== 'ELIGIBLE') return reject('ELIGIBILITY', sessionReasons(assessment));
  trace.push({ stage: 'ELIGIBILITY', subject: base.candidateId, decision: 'ELIGIBLE', reasons: [] });

  // Sécurité / G1 et mode.
  if (ctx.mode === 'PRODUCTION' && !analysis.foundation.eligible) return reject('SAFETY_G1', analysis.foundation.reasonCodes);
  if (ctx.mode === 'CANDIDATE' && !opts.simulation) return reject('SAFETY_G1', [runningReasons.emit(RUNNING_CODES.SIMULATION_REQUIRED, { mode: ctx.mode })]);
  const returning = ctx.returnState.state !== 'NONE';
  if (returning) {
    const protocol = resolveParameter(params, RETURN_PROTOCOL, ctx.mode);
    reasons.push(...protocol.reasons);
    const cap = protocol.status === 'resolved' ? (protocol.value as { doseCap?: unknown }).doseCap : undefined;
    if (cap !== 'AT_MOST_REALIZED_POST_RETURN') {
      return reject('SAFETY_G1', [...protocol.reasons, runningReasons.emit(RUNNING_CODES.RETURN_PROTOCOL_UNRESOLVED, { returnState: ctx.returnState.state })]);
    }
    used.push(paramUse(params, RETURN_PROTOCOL));
  }
  trace.push({ stage: 'SAFETY_G1', subject: base.candidateId, decision: opts.simulation && ctx.mode === 'CANDIDATE' ? 'PASSED_SIMULATION' : 'PASSED', reasons: [] });

  // Faisabilité : ancre de dose (V19), exercice du catalogue.
  const anchor = historyAnchor({
    archetype: a, structureFamily: family, history: ctx.sessionHistory, now: input.context.now as ISODateTime, mode: ctx.mode, parameters: params, returning,
    ...(ctx.recentLoad?.returnStartedAt !== undefined ? { returnStartedAt: ctx.recentLoad.returnStartedAt } : {}),
  });
  if (anchor.status === 'unavailable') return reject('FEASIBILITY', anchor.reasons);
  reasons.push(...anchor.reasons);
  for (const pid of anchor.parameterIds) used.push(paramUse(params, pid));
  const dose = { kind: 'duration' as const, durationS: anchor.session.realizedDurationS, source: { parameterId: anchor.parameterIds[0] ?? '', sessionId: anchor.session.sessionId } };
  const exercises = runExercises(input);
  const exercise = exercises[0];
  if (exercise === undefined || exercises.length > 1) {
    return reject('FEASIBILITY', [runningReasons.emit(RUNNING_CODES.EXERCISE_UNAVAILABLE, { cause: exercise === undefined ? 'NONE' : 'AMBIGUOUS', candidates: exercises.map((e) => e.id) })], { dose });
  }
  trace.push({ stage: 'FEASIBILITY', subject: base.candidateId, decision: `ANCHORED:${anchor.session.sessionId}`, reasons: anchor.reasons });

  // Résolution de précision : plafond RPE V02 ; allure refusée pour EASY (V40, aucun algorithme gouverné).
  const v02 = resolveParameter(params, V02, ctx.mode);
  const ceiling = v02.status === 'resolved' ? (v02.value as { EASY_LOW?: { max?: unknown } }).EASY_LOW?.max : undefined;
  if (typeof ceiling !== 'number' || !(ceiling > 0)) return reject('PRECISION', [...v02.reasons], { dose, exerciseId: exercise.id });
  reasons.push(...v02.reasons);
  used.push(paramUse(params, V02));
  const v40 = resolveParameter(params, V40, ctx.mode);
  const priorCauses = assessment.precision.level === 'EFFORT_ONLY' ? assessment.precision.causes : [];
  const precisionReason = runningReasons.emit(RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED, { archetype: a, precision: 'EFFORT_ONLY', cause: [...priorCauses, EASY_CEILING_PACE_UNGOVERNED].join(',') });
  degradations = [
    ...degradations.filter((d) => d.effect !== 'PRECISION_REDUCED'),
    { effect: 'PRECISION_REDUCED', subject: a, capability: 'paceTargets', parameterIds: ['running.target.paceRangeWidthByConfidence', V40], reason: precisionReason },
  ];
  reasons.push(...(v40.status === 'unresolved' ? v40.reasons : []), precisionReason);
  const intensity = { domain: 'EASY_LOW' as const, rpeCeiling: ceiling, source: { parameterId: V02 } };
  trace.push({ stage: 'PRECISION', subject: base.candidateId, decision: 'EFFORT_ONLY', reasons: [precisionReason] });

  // Structure CORE (run_structure) : un segment continu, estimation dérivée par le CORE.
  const target: RunSegment['target'] = {
    domain: CORE_RUN_DOMAIN.EASY_LOW, effort: { rpe: { min: ceiling, max: ceiling } }, priority: 'effort',
    ...(ctx.sensors.wearable ? {} : { noWearable: true }),
  };
  const structure = withDerivedEstimate({ type: 'run_structure', segments: [{ kind: 'steady', id: 'steady', dose: { durationS: dose.durationS }, target }] });
  // Invariant : dose positive finie (schéma) et cible complète ⇒ le CORE dérive toujours l'estimation.
  if (structure === undefined) throw new TypeError(`structure run_structure non dérivable : ${base.candidateId}`);
  if (structure.estimate.totalS.max > input.intent.availableTimeS) {
    return reject('FEASIBILITY', [runningReasons.emit(RUNNING_CODES.TIME_EXCEEDED, { archetype: a, availableTimeS: input.intent.availableTimeS, estimatedMaxS: structure.estimate.totalS.max })], { dose, intensity, exerciseId: exercise.id });
  }
  if (opts.simulation && ctx.mode === 'CANDIDATE') reasons.push(runningReasons.emit(RUNNING_CODES.SIMULATED_PROPOSAL, { rulesetVersion: governance.rulesetVersion }));
  const candidate = snapshot({ precision: 'EFFORT_ONLY', dose, intensity, exerciseId: exercise.id });
  return { candidate, built: { structure, exercise } };
}
