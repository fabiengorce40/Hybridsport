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
import type { RealizedSession, StructureFamily } from './history.js';
import { WAVE3_ARCHETYPES, WAVE3_STRUCTURE_FAMILIES } from './candidate.js';
import { qualityGuards, QUALITY_ARCHETYPES, returnLifted } from '../wave3/guards.js';
import { progressionStep, V23 } from '../wave3/progression.js';
import type { StepResult } from '../wave3/progression.js';
import type { QualityArchetype } from '../wave3/guards.js';
import { buildQualityStructure, QUALITY_DOMAIN } from '../wave3/structure.js';
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

  if (archetype === undefined || !(WAVE3_ARCHETYPES as readonly string[]).includes(archetype)) {
    const reasons = [
      runningReasons.emit(RUNNING_CODES.PRESCRIPTION_NOT_IMPLEMENTED, { archetype: archetype ?? input.intent.archetypeId, wave: opts.wave }),
      ...(assessment ? sessionReasons(assessment) : [runningReasons.emit(RUNNING_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId })]),
    ];
    trace.push({ stage: 'GENERATION', subject: input.intent.archetypeId, decision: 'NOT_GENERATED', reasons });
    return { status: 'no_valid', candidates: [], reasons, trace };
  }
  const a = archetype as RunningSessionArchetype;
  const families = WAVE3_STRUCTURE_FAMILIES[a] ?? [];
  const candidates = families.map((family) => evaluate(a, family, { input, analysis, governance, opts, assessment, trace }));
  trace.push({ stage: 'GENERATION', subject: a, decision: `GENERATED:${String(candidates.length)}`, reasons: [] });

  // Sélection déterministe, aucun score : un candidat par famille (EASY : une seule famille). Plusieurs familles
  // ancrées (seuil continu ET fractionné) : HOLD = rejouer la famille réalisée le plus récemment ; égalité ⇒ refus.
  const all = candidates.filter((c) => c.built !== undefined);
  const lastAt = (c: Evaluated): string => (c.candidate.dose?.kind === 'structure' ? c.candidate.dose.source.completedAt : '');
  const latest = all.reduce((m, c) => (lastAt(c) > m ? lastAt(c) : m), '');
  const survivors = all.length > 1 ? all.filter((c) => lastAt(c) === latest) : all;
  if (survivors.length > 1) {
    const reasons = [runningReasons.emit(RUNNING_CODES.FAMILY_AMBIGUOUS, { archetype: a, families: survivors.map((c) => c.candidate.structureFamily) })];
    trace.push({ stage: 'SELECTION', subject: a, decision: 'NO_CANDIDATE', reasons });
    return { status: 'no_valid', candidates: candidates.map((c) => c.candidate), reasons, trace };
  }
  const chosen = survivors[0];
  if (chosen?.built === undefined) {
    const reasons = candidates.flatMap((c) => c.candidate.rejection?.reasons ?? []);
    trace.push({ stage: 'SELECTION', subject: a, decision: 'NO_CANDIDATE', reasons });
    return { status: 'no_valid', candidates: candidates.map((c) => c.candidate), reasons, trace };
  }
  trace.push({ stage: 'SELECTION', subject: chosen.candidate.candidateId, decision: all.length > 1 ? 'SELECTED:MOST_RECENT_FAMILY' : 'SELECTED:SINGLE_CANDIDATE', reasons: [] });
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
  // Dégradations globales (HOLD de progression, marathon sans prétention, calibration) + propres à l'archétype.
  let degradations: Degradation[] = [...analysis.degradations, ...(assessment?.degradations ?? [])];
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
  // V33 / V34 : la vague 2 n'applique AUCUNE dose d'entrée novice ni de première exposition après une longue
  // coupure, même si une valeur (simulée) existe ; ces cas restent refusés (jamais d'ancre substituée).
  if (ctx.population.level === 'P_R0') return reject('SAFETY_G1', [runningReasons.emit(RUNNING_CODES.NOVICE_ENTRY_UNRESOLVED, { population: 'P_R0' })]);
  if ((ctx.returnState.state === 'LONG' || ctx.returnState.state === 'UNKNOWN') && ctx.returnState.postReturnSessions === 0) {
    return reject('SAFETY_G1', [runningReasons.emit(RUNNING_CODES.RETURN_PROTOCOL_UNRESOLVED, { returnState: ctx.returnState.state })]);
  }
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
  const quality = (QUALITY_ARCHETYPES as readonly string[]).includes(a);
  if (quality || a === 'LONG') {
    // Vague 3 : gardes documentées des séances de qualité (§G.3, §K, §M, §N, §X, V10, V11).
    const thresholdRef = analysis.references.find((r) => r.decision === 'THRESHOLD_BOUNDARY')?.confidence ?? 'NONE';
    const guard = qualityGuards({ archetype: a as QualityArchetype | 'LONG', family, ctx, now: input.context.now, parameters: params, thresholdReferenceConfidence: thresholdRef });
    if (!guard.ok) return reject('SAFETY_G1', guard.reasons);
    reasons.push(...guard.reasons);
    for (const pid of guard.parameterIds) used.push(paramUse(params, pid));
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
  if (quality) {
    const step = stepFor(a, family, anchor, { ctx, analysis, params, now: input.context.now, lifted: returnLifted(ctx, params, ctx.mode).lifted, capability: 'progressionBeyondHistory' });
    return qualityTail(a as QualityArchetype, family, anchor.session, anchor.reasons, anchor.parameterIds[0] ?? '', step, { input, assessment, trace, used, reasons, base, reject, snapshot, getDegradations: () => degradations, setDegradations: (d) => { degradations = d; }, governance, opts });
  }
  const lifted = returnLifted(ctx, params, ctx.mode).lifted;
  const step = stepFor(a, family, anchor, { ctx, analysis, params, now: input.context.now, lifted, capability: a === 'LONG' ? 'longRunProgression' : 'progressionBeyondHistory' });
  const holdDose = { kind: 'duration' as const, durationS: anchor.session.realizedDurationS, source: { parameterId: anchor.parameterIds[0] ?? '', sessionId: anchor.session.sessionId } };
  let dose: typeof holdDose & { progression?: { variable: string; from: number; to: number; parameterId: string } } = step.kind === 'step' && step.durationS !== undefined
    ? { ...holdDose, durationS: step.durationS, progression: { variable: step.variable, from: step.from, to: step.to, parameterId: V23 } }
    : holdDose;
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
  const buildSteady = (durationS: number) => withDerivedEstimate({ type: 'run_structure', segments: [{ kind: 'steady', id: 'steady', dose: { durationS }, target }] });
  let structure = buildSteady(dose.durationS);
  // Invariant : dose positive finie (schéma) et cible complète ⇒ le CORE dérive toujours l'estimation.
  if (structure === undefined) throw new TypeError(`structure run_structure non dérivable : ${base.candidateId}`);
  let stepReasons = step.reasons;
  if (dose.progression !== undefined && structure.estimate.totalS.max > input.intent.availableTimeS) {
    // Le pas ne tient pas dans le temps disponible : HOLD tracé (jamais une dose tronquée).
    dose = holdDose;
    structure = buildSteady(dose.durationS);
    if (structure === undefined) throw new TypeError(`structure run_structure non dérivable : ${base.candidateId}`);
    stepReasons = [runningReasons.emit(RUNNING_CODES.PROGRESSION_HOLD, { archetype: a, cause: 'TIME_AVAILABLE' })];
  }
  reasons.push(...stepReasons);
  if (dose.progression !== undefined) used.push(paramUse(params, V23));
  if (structure.estimate.totalS.max > input.intent.availableTimeS) {
    return reject('FEASIBILITY', [runningReasons.emit(RUNNING_CODES.TIME_EXCEEDED, { archetype: a, availableTimeS: input.intent.availableTimeS, estimatedMaxS: structure.estimate.totalS.max })], { dose, intensity, exerciseId: exercise.id });
  }
  if (a === 'LONG') reasons.push(runningReasons.emit(RUNNING_CODES.HIGH_DEMAND_DEFAULT_CONSERVATIVE, { archetype: a, parameterId: 'running.longRun.marginAndBound' }));
  if (opts.simulation && ctx.mode === 'CANDIDATE') reasons.push(runningReasons.emit(RUNNING_CODES.SIMULATED_PROPOSAL, { rulesetVersion: governance.rulesetVersion }));
  reasons.push(...sortDegradations(degradations).filter((d) => d.effect !== 'PRECISION_REDUCED').map((d) => d.reason));
  const candidate = snapshot({ precision: 'EFFORT_ONLY', dose, intensity, exerciseId: exercise.id });
  return { candidate, built: { structure, exercise } };
}

/** Pas de progression (D1) pour l'ancre retenue : capacité de vague 1, reprise levée, tolérance démontrée. */
function stepFor(a: RunningSessionArchetype, family: StructureFamily, anchor: Extract<ReturnType<typeof historyAnchor>, { status: 'anchored' }>, e: {
  readonly ctx: RunningContext; readonly analysis: RunningWave1Analysis; readonly params: readonly RunningParameter[]; readonly now: string; readonly lifted: boolean; readonly capability: 'longRunProgression' | 'progressionBeyondHistory';
}): StepResult {
  return progressionStep({
    archetype: a, family, anchor: anchor.session, afterNegativeFallback: anchor.afterNegativeFallback === true, history: e.ctx.sessionHistory, now: e.now,
    capabilityEnabled: e.analysis.capabilities.find((c) => c.capability === e.capability)?.enabled === true, returnLifted: e.lifted,
    ...(e.ctx.returnState.state !== 'NONE' && e.ctx.recentLoad?.returnStartedAt !== undefined ? { returnStartedAt: e.ctx.recentLoad.returnStartedAt } : {}),
    parameters: e.params, mode: e.ctx.mode,
  });
}

interface QualityEnv {
  readonly input: SportEngineInput<RunningContext>;
  readonly assessment: SessionAssessment;
  readonly trace: PipelineTraceEntry[];
  readonly used: ParameterUse[];
  readonly reasons: ReasonCode[];
  readonly base: { readonly candidateId: string };
  readonly reject: (stage: PipelineStage, rs: readonly ReasonCode[], extra?: Partial<RunningCandidate>) => Evaluated;
  readonly snapshot: (extra: Partial<RunningCandidate>) => RunningCandidate;
  readonly getDegradations: () => Degradation[];
  readonly setDegradations: (d: Degradation[]) => void;
  readonly governance: RunningGovernance;
  readonly opts: Wave2Options;
}

const QUALITY_MIN_DOSE = 'running.quality.minimumDose';
const QUALITY_PACE_NOT_PRESCRIBED = 'QUALITY_PACE_NOT_PRESCRIBED';

/**
 * Vague 3 — séance de qualité en HOLD : rejeu EXACT de la structure réalisée ancrée (V19, même archétype et
 * même famille), cibles à l'effort (bandes V02), échauffement et retour au calme sous le plafond EASY_LOW.
 * Aucune hausse (V23 vide), aucune première exposition (V35–V37), aucune allure (vague R4).
 */
function qualityTail(a: QualityArchetype, family: StructureFamily, anchored: RealizedSession, anchorReasons: readonly ReasonCode[], policyId: string, step: StepResult, env: QualityEnv): Evaluated {
  const { input, assessment, trace, used, reasons, base, reject, snapshot, governance, opts } = env;
  const ctx = input.discipline;
  const params = governance.parameters;
  const st = anchored.structure;
  const realizedFamily = st === undefined ? undefined : st.reps > 1 ? 'INTERVALS' : 'CONTINUOUS';
  if (st === undefined || realizedFamily !== family) {
    return reject('FEASIBILITY', [...anchorReasons, runningReasons.emit(RUNNING_CODES.STRUCTURE_UNAVAILABLE, { archetype: a, sessionId: anchored.sessionId, cause: st === undefined ? 'NOT_RECORDED' : 'FAMILY_MISMATCH' })]);
  }
  const holdDose = { kind: 'structure' as const, structure: st, workS: st.reps * st.workS, source: { parameterId: policyId, sessionId: anchored.sessionId, completedAt: anchored.completedAt } };
  const stepped = step.kind === 'step' && step.structure !== undefined ? step.structure : undefined;
  let dose: typeof holdDose & { progression?: { variable: string; from: number; to: number; parameterId: string } } = stepped !== undefined && step.kind === 'step'
    ? { ...holdDose, structure: stepped, workS: stepped.reps * stepped.workS, progression: { variable: step.variable, from: step.from, to: step.to, parameterId: V23 } }
    : holdDose;
  const exercises = runExercises(input);
  const exercise = exercises[0];
  if (exercise === undefined || exercises.length > 1) {
    return reject('FEASIBILITY', [runningReasons.emit(RUNNING_CODES.EXERCISE_UNAVAILABLE, { cause: exercise === undefined ? 'NONE' : 'AMBIGUOUS', candidates: exercises.map((e) => e.id) })], { dose });
  }
  trace.push({ stage: 'FEASIBILITY', subject: base.candidateId, decision: `ANCHORED:${anchored.sessionId}`, reasons: anchorReasons });

  // Résolution de précision : bande RPE du domaine de travail et plafond EASY_LOW (V02) ; allure non prescrite.
  const v02 = resolveParameter(params, V02, ctx.mode);
  const bands = v02.status === 'resolved' ? v02.value as Record<string, { min?: unknown; max?: unknown } | undefined> : {};
  const domain = QUALITY_DOMAIN[a];
  const lo = bands[domain]?.min;
  const hi = bands[domain]?.max;
  const easy = bands.EASY_LOW?.max;
  if (typeof lo !== 'number' || typeof hi !== 'number' || typeof easy !== 'number' || !(lo > 0) || !(hi >= lo) || !(easy > 0)) {
    return reject('PRECISION', [...v02.reasons], { dose, exerciseId: exercise.id });
  }
  reasons.push(...v02.reasons);
  used.push(paramUse(params, V02));
  const priorCauses = assessment.precision.level === 'EFFORT_ONLY' ? assessment.precision.causes : [];
  const precisionReason = runningReasons.emit(RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED, { archetype: a, precision: 'EFFORT_ONLY', cause: [...priorCauses, QUALITY_PACE_NOT_PRESCRIBED].join(',') });
  const degradations: Degradation[] = [
    ...env.getDegradations().filter((d) => d.effect !== 'PRECISION_REDUCED'),
    { effect: 'PRECISION_REDUCED', subject: a, capability: 'paceTargets', parameterIds: ['running.target.paceRangeWidthByConfidence'], reason: precisionReason },
  ];
  env.setDegradations(degradations);
  reasons.push(precisionReason);
  const intensity = { domain, rpe: { min: lo, max: hi }, easyCeiling: easy, source: { parameterId: V02 } };
  trace.push({ stage: 'PRECISION', subject: base.candidateId, decision: 'EFFORT_ONLY', reasons: [precisionReason] });

  const targets = { domain, rpe: { min: lo, max: hi }, easyCeiling: easy, noWearable: !ctx.sensors.wearable };
  let structure = buildQualityStructure(dose.structure, targets);
  if (structure === undefined) throw new TypeError(`structure run_structure non dérivable : ${base.candidateId}`);
  let stepReasons = step.reasons;
  if (dose.progression !== undefined && structure.estimate.totalS.max > input.intent.availableTimeS) {
    // Le pas ne tient pas dans le temps disponible : HOLD tracé (jamais une structure tronquée).
    dose = holdDose;
    structure = buildQualityStructure(dose.structure, targets);
    if (structure === undefined) throw new TypeError(`structure run_structure non dérivable : ${base.candidateId}`);
    stepReasons = [runningReasons.emit(RUNNING_CODES.PROGRESSION_HOLD, { archetype: a, cause: 'TIME_AVAILABLE' })];
  }
  reasons.push(...stepReasons);
  if (dose.progression !== undefined) used.push(paramUse(params, V23));
  if (structure.estimate.totalS.max > input.intent.availableTimeS) {
    return reject('FEASIBILITY', [runningReasons.emit(RUNNING_CODES.TIME_EXCEEDED, { archetype: a, availableTimeS: input.intent.availableTimeS, estimatedMaxS: structure.estimate.totalS.max })], { dose, intensity, exerciseId: exercise.id });
  }
  // V31 vide : toute dose de qualité compte comme séance à forte demande (défaut conservateur tracé, §S).
  const minDose = resolveParameter(params, QUALITY_MIN_DOSE, ctx.mode);
  if (minDose.status === 'unresolved') reasons.push(runningReasons.emit(RUNNING_CODES.HIGH_DEMAND_DEFAULT_CONSERVATIVE, { archetype: a, parameterId: QUALITY_MIN_DOSE }));
  if (opts.simulation && ctx.mode === 'CANDIDATE') reasons.push(runningReasons.emit(RUNNING_CODES.SIMULATED_PROPOSAL, { rulesetVersion: governance.rulesetVersion }));
  reasons.push(...sortDegradations(degradations).filter((d) => d.effect !== 'PRECISION_REDUCED').map((d) => d.reason));
  const candidate = snapshot({ precision: 'EFFORT_ONLY', dose, intensity, exerciseId: exercise.id });
  return { candidate, built: { structure, exercise } };
}
