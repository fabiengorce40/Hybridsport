import { zSessionIntent } from '@hybridsport/domain';
import type { EngineResult, FingerprintHistoryEntry, ReasonCode, SessionDraft } from '@hybridsport/domain';
import type { EngineContext } from '../core/context.js';
import { createCoreRegistry, TraceBuilder } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import { deriveSafetyRestrictions, isActive } from '../safety/pain.js';
import { deriveProgramStatus, generationGuard } from '../safety/eligibility.js';
import { acceptProposal, structureProblem } from '../contracts/sport-engine.js';
import type { SessionConstraints, SportEngine, SportEngineInput } from '../contracts/sport-engine.js';
import type { CoreProfile, CoreState } from '../contracts/core-types.js';
import { runCorePipeline } from './pipeline.js';
import type { CorePipelineOutcome } from './pipeline.js';

const reasons = createCoreRegistry();

export interface SportSessionRequest {
  readonly intent: unknown;
  readonly profile: CoreProfile;
  readonly state: CoreState;
  readonly history: readonly FingerprintHistoryEntry[];
}

type Ctx = EngineContext<LoadedRuleset, LoadedCatalog>;

function earlyError(ctx: Ctx, step: string, code: 'INVALID_INPUT' | 'SAFETY_BLOCK' | 'OUT_OF_SCOPE', rs: readonly ReasonCode[]): CorePipelineOutcome {
  const trace = new TraceBuilder({ engineVersion: ctx.engineVersion, rulesetVersion: ctx.ruleset.version, catalogVersion: ctx.catalog.version }, ctx.seed);
  trace.add({ step, subject: { kind: 'program', id: ctx.seed }, decision: code, reasons: [...rs] });
  const built = trace.build();
  const result: EngineResult<SessionDraft> = { status: 'error', error: { code, reasons: [...rs], alternatives: [] }, trace: { traceId: built.traceId } };
  return { result, trace: built };
}

/**
 * Flux complet d'une séance : INTENTION → garde de sécurité (le moteur n'est JAMAIS appelé si le
 * programme n'est pas actif) → MOTEUR SPORTIF (propose) → acceptation des propositions → pipeline CORE
 * (durée → empreinte → anti-doublon → validation → sélection → réparation → trace → résultat).
 */
export function runSportSession(engine: SportEngine, request: SportSessionRequest, ctx: Ctx): CorePipelineOutcome {
  const intentParsed = zSessionIntent.safeParse(request.intent);
  if (!intentParsed.success) {
    return earlyError(ctx, 'intent', 'INVALID_INPUT', intentParsed.error.issues.map((i) => reasons.emit('TECHNICAL.SCHEMA_INVALID', { path: `intent.${i.path.join('.')}`, problem: i.message })));
  }
  const intent = intentParsed.data;
  if (intent.discipline !== engine.discipline) return earlyError(ctx, 'intent', 'INVALID_INPUT', [structureProblem('moteur d’une autre discipline que l’intention', engine.id)]);

  let constraints: SessionConstraints;
  try {
    const safety = deriveSafetyRestrictions(request.state.activePain.filter(isActive), ctx.ruleset);
    const status = deriveProgramStatus({ eligibility: request.profile.eligibility, declarations: request.profile.declarations, safety, ruleset: ctx.ruleset });
    const guard = generationGuard(status.status, request.profile.eligibility);
    if (!guard.ok) return earlyError(ctx, 'safety', guard.error.code === 'OUT_OF_SCOPE' ? 'OUT_OF_SCOPE' : 'SAFETY_BLOCK', [...status.reasons, ...safety.reasons, ...guard.error.reasons]);
    constraints = {
      availableEquipment: request.profile.availableEquipment, restrictions: request.profile.restrictions,
      areaRestrictions: safety.areaRestrictions, restrictedMovements: safety.restrictedMovements,
      excludedExercises: request.profile.excludedExercises, suspendHighIntensity: safety.suspendHighIntensity,
    };
  } catch (e) {
    return earlyError(ctx, 'safety', 'INVALID_INPUT', [reasons.emit('TECHNICAL.PARAMETER_MISSING', { parameterId: e instanceof Error ? e.message : String(e) })]);
  }

  const input: SportEngineInput = {
    intent, profile: request.profile, state: request.state, constraints, catalog: ctx.catalog, ruleset: ctx.ruleset, history: request.history,
    context: { seed: `${ctx.seed}/engine/${engine.id}`, now: ctx.now, engineVersion: ctx.engineVersion },
  };
  let raw: readonly unknown[];
  try {
    raw = engine.propose(input);
  } catch (e) {
    return earlyError(ctx, 'proposal', 'INVALID_INPUT', [structureProblem(`moteur en échec : ${e instanceof Error ? e.message : String(e)}`, engine.id)]);
  }
  const accepted = raw.map((r, i) => acceptProposal(r, i, input, engine));
  return runCorePipeline({
    profile: request.profile, state: request.state,
    candidates: accepted.flatMap((a) => (a.ok ? [a.candidate] : [])),
    rejectedProposals: accepted.flatMap((a) => (a.ok ? [] : [{ id: a.id, reasons: a.reasons }])),
    duplicate: { history: request.history, declaredIntents: intent.repetitionIntents },
  }, ctx);
}
