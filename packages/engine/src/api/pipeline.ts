import { zSessionDraft } from '@hybridsport/domain';
import type {
  Eligibility, EngineResult, Level, PainHistoryAvailability, PainReport, ReadinessCategory, ReasonCode, SessionDraft, TraceRef, UserDeclaration,
} from '@hybridsport/domain';
import type { EngineContext } from '../core/context.js';
import { checkEngineContext } from '../core/context.js';
import { SeededRng } from '../core/rng.js';
import { createCoreRegistry, TraceBuilder } from '../trace/index.js';
import type { DecisionTrace } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { preflightCoreParameters } from '../rules/core-parameters.js';
import { RulesetParameterError } from '../rules/errors.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import { evaluateAdmissibility } from '../decision/admissibility.js';
import type { AdmissibilityCheck, EvaluatedCandidate } from '../decision/admissibility.js';
import { readTolerances, selectBest, toArray } from '../decision/optimization.js';
import type { OptimizationVector } from '../decision/optimization.js';
import { fitDuration } from '../duration/fit.js';
import type { AthleteTimingProfile } from '../duration/estimate.js';
import { validateSession } from '../validation/validator.js';
import type { ValidationContext } from '../validation/context.js';
import { repairSession } from '../repair/repair.js';
import { deriveSafetyRestrictions, isActive } from '../safety/pain.js';
import { deriveProgramStatus, generationGuard } from '../safety/eligibility.js';

const reasons = createCoreRegistry();

/** Profil minimal vu par le CORE (données fournies, jamais inventées). */
export interface CoreProfile {
  readonly athleteLevel: Level;
  readonly eligibility: Eligibility;
  readonly declarations: readonly UserDeclaration[];
  readonly healthDataConsent: boolean;
  readonly restrictions: readonly string[];
  readonly excludedExercises: readonly string[];
  readonly availableEquipment: readonly string[];
}

/** État minimal vu par le CORE. */
export interface CoreState {
  readonly readiness: ReadinessCategory;
  readonly activePain: readonly PainReport[];
  readonly painHistory: PainHistoryAvailability;
  readonly dayAvailable: boolean;
  readonly recovery?: ValidationContext['recovery'];
  readonly timing?: AthleteTimingProfile;
}

/**
 * Candidat fourni par l'appelant (futurs moteurs de discipline ; ici des fixtures) : séance proposée et
 * vecteur d'optimisation B1–B6. Le CORE ne génère aucune séance : il décide, vérifie, répare et trace.
 */
export interface CoreCandidate {
  readonly session: unknown;
  readonly optimization: OptimizationVector;
}

export interface CorePipelineRequest {
  readonly profile: CoreProfile;
  readonly state: CoreState;
  readonly candidates: readonly CoreCandidate[];
}

export interface CorePipelineOutcome {
  readonly result: EngineResult<SessionDraft>;
  readonly trace: DecisionTrace;
}

type Ctx = EngineContext<LoadedRuleset, LoadedCatalog>;

/**
 * Pipeline CORE (spec 01 §2, sans moteur sportif) :
 * contexte → sécurité / éligibilité → restrictions → durée → validation (couche A) → score (couche B)
 * → réparation si nécessaire → trace → résultat. Pur et déterministe (même entrée + même graine ⇒
 * même sortie).
 */
export function runCorePipeline(request: CorePipelineRequest, ctx: Ctx): CorePipelineOutcome {
  const versions = { engineVersion: ctx.engineVersion, rulesetVersion: ctx.ruleset.version, catalogVersion: ctx.catalog.version };
  const trace = new TraceBuilder(versions, ctx.seed);
  const pipelineSubject = { kind: 'program' as const, id: ctx.seed };
  const finish = (make: (ref: TraceRef) => EngineResult<SessionDraft>): CorePipelineOutcome => {
    const built = trace.build();
    return { result: make({ traceId: built.traceId }), trace: built };
  };
  const technicalError = (rs: ReasonCode[]) => finish((ref) => ({ status: 'error', error: { code: 'INVALID_INPUT', reasons: rs, alternatives: [] }, trace: ref }));

  // 1. Contexte et paramètres
  const ctxIssues = checkEngineContext({ ...ctx, ruleset: { version: ctx.ruleset.version }, catalog: { version: ctx.catalog.version } });
  const pre = preflightCoreParameters(ctx.ruleset);
  if (ctxIssues.length > 0 || pre.length > 0) {
    const rs = [
      ...ctxIssues.map((i) => reasons.emit('TECHNICAL.SCHEMA_INVALID', { path: `context.${i.field}`, problem: i.problem })),
      ...pre.map((p) => reasons.emit('TECHNICAL.PARAMETER_MISSING', { parameterId: `${p.id} (${p.problem})` })),
    ];
    trace.add({ step: 'context', subject: pipelineSubject, decision: 'rejected', reasons: rs });
    return technicalError(rs);
  }

  try {
    // 2. Sécurité et éligibilité
    const active = request.state.activePain.filter(isActive);
    const safety = deriveSafetyRestrictions(active, ctx.ruleset);
    const status = deriveProgramStatus({ eligibility: request.profile.eligibility, declarations: request.profile.declarations, safety, ruleset: ctx.ruleset });
    const info: ReasonCode[] = [...safety.reasons, ...status.reasons];
    if (request.state.readiness === 'unknown') info.push(reasons.emit('DATA.READINESS_UNKNOWN'));
    if (request.state.painHistory === 'unavailable') info.push(reasons.emit('DATA.HEALTH_HISTORY_UNAVAILABLE'));
    trace.add({ step: 'safety', subject: pipelineSubject, decision: status.status, reasons: info });
    const guard = generationGuard(status.status, request.profile.eligibility);
    if (!guard.ok) return finish((ref) => ({ status: 'error', error: guard.error, trace: ref }));

    const vctx: ValidationContext = {
      programStatus: status.status, eligibility: request.profile.eligibility, athleteLevel: request.profile.athleteLevel,
      availableEquipment: request.profile.availableEquipment, restrictions: request.profile.restrictions,
      areaRestrictions: safety.areaRestrictions, restrictedMovements: safety.restrictedMovements,
      excludedExercises: request.profile.excludedExercises, dayAvailable: request.state.dayAvailable,
      ...(request.state.recovery ? { recovery: request.state.recovery } : {}),
    };
    const deps = { catalog: ctx.catalog, ruleset: ctx.ruleset, engineVersion: ctx.engineVersion, ...(request.state.timing ? { timing: request.state.timing } : {}) };

    // 3. Durée puis validation de chaque candidat ⇒ admissibilité (couche A)
    const evaluated: EvaluatedCandidate<SessionDraft | undefined>[] = [];
    request.candidates.forEach((c, index) => {
      const parsed = zSessionDraft.safeParse(c.session);
      const id = parsed.success ? parsed.data.id : `candidate-${index}`;
      let session: SessionDraft | undefined = parsed.success ? parsed.data : undefined;
      if (session) {
        const fit = fitDuration(session, ctx.catalog, ctx.ruleset, request.state.timing);
        trace.add({ step: 'duration', subject: { kind: 'session', id }, decision: fit.status, reasons: [...fit.reasons] });
        if (fit.status !== 'INFEASIBLE') session = fit.session;
      }
      const v = validateSession(session ?? c.session, vctx, deps);
      trace.add({ step: 'validate', subject: { kind: 'session', id }, decision: v.report.status, reasons: [...v.report.errors, ...v.report.warnings].map((x) => x.reason) });
      const checks: AdmissibilityCheck<null>[] = (['A1', 'A2', 'A3', 'A4'] as const).map((layer) => ({
        id: `pipeline.${layer}`, version: '1.0.0', layer,
        nature: layer === 'A1' ? 'SAFETY' : layer === 'A2' ? 'FEASIBILITY' : layer === 'A3' ? 'PROGRAMMING_HEURISTIC' : 'TECHNICAL',
        evaluate: () => v.report.errors.filter((e) => (e.layer ?? 'A4') === layer),
      }));
      // Les violations restent attachées à leur couche ; la nature du contrôle d'agrégation ne les réécrit pas.
      const admissibility = evaluateAdmissibility(null, checks);
      evaluated.push({ id, payload: v.session ?? session, admissibility, optimization: toArray(c.optimization) });
    });

    // 4. Sélection (couche B)
    const selection = selectBest(evaluated, readTolerances(ctx.ruleset), SeededRng.fromSeed(ctx.seed).fork('selection'));
    trace.add({
      step: 'score', subject: pipelineSubject, decision: selection.status,
      reasons: [...selection.reasons], rejected: selection.rejected.map((r) => ({ candidate: r.id, reasons: r.reasons })),
    });
    const winnerSession = selection.status === 'selected' ? selection.winner.payload : undefined;
    if (selection.status === 'selected' && winnerSession) {
      const final = validateSession(winnerSession, vctx, deps);
      trace.add({ step: 'result', subject: { kind: 'session', id: selection.winner.id }, decision: final.report.status, reasons: final.report.warnings.map((w) => w.reason) });
      return finish((ref) => ({ status: 'ok', value: winnerSession, validation: final.report, trace: ref, warnings: final.report.warnings.map((w) => w.reason) }));
    }

    // 5. Aucune solution admissible : réparation du candidat le mieux placé sur la couche B (ordre déterministe).
    const repairable = evaluated.flatMap((e) => (e.payload ? [{ ...e, payload: e.payload }] : [])).sort((a, b) => {
      for (let i = 0; i < a.optimization.length; i++) { const d = (b.optimization[i] ?? 0) - (a.optimization[i] ?? 0); if (d !== 0) return d; }
      return a.id < b.id ? -1 : 1;
    })[0];
    if (!repairable) {
      const rs = [reasons.emit('SELECT.NO_ADMISSIBLE_CANDIDATE', { candidates: request.candidates.length })];
      return finish((ref) => ({ status: 'error', error: { code: 'NO_VALID_SOLUTION', reasons: rs, alternatives: [] }, trace: ref }));
    }
    const repaired = repairSession(repairable.payload, vctx, deps, { seed: `${ctx.seed}/repair` });
    for (const e of repaired.trace.entries) trace.add({ step: e.step, subject: e.subject, decision: e.decision, reasons: e.reasons });
    return finish((ref) => ({ ...repaired.result, trace: ref }));
  } catch (e) {
    // Paramètre ou politique absents : erreur TECHNICAL explicite, jamais masquée ni contournée.
    const problem = e instanceof RulesetParameterError ? `${e.parameterId} (${e.problem})` : e instanceof Error ? e.message : String(e);
    const rs = [reasons.emit('TECHNICAL.PARAMETER_MISSING', { parameterId: problem })];
    trace.add({ step: 'context', subject: pipelineSubject, decision: 'technical_error', reasons: rs });
    return technicalError(rs);
  }
}
