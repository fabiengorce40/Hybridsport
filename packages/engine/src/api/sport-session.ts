import { zNoValidProposal, zSessionIntent } from '@hybridsport/domain';
import type { EngineResult, FingerprintHistoryEntry, ReasonCode, SessionDraft } from '@hybridsport/domain';
import type { EngineContext } from '../core/context.js';
import { createCoreRegistry, TraceBuilder } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import { deriveSafetyRestrictions, isActive } from '../safety/pain.js';
import { deriveProgramStatus, generationGuard } from '../safety/eligibility.js';
import { acceptProposal, structureProblem } from '../contracts/sport-engine.js';
import type { ContextParse, SessionConstraints, SportEngine, SportEngineInput } from '../contracts/sport-engine.js';
import type { CoreProfile, CoreState } from '../contracts/core-types.js';
import { runCorePipeline } from './pipeline.js';
import type { CorePipelineOutcome } from './pipeline.js';

const reasons = createCoreRegistry();

export interface SportSessionRequest {
  readonly intent: unknown;
  readonly profile: CoreProfile;
  readonly state: CoreState;
  readonly history: readonly FingerprintHistoryEntry[];
  /** Contexte propre à la discipline, BRUT : validé par le parseur du moteur avant tout appel (CORE-EXT-2). */
  readonly disciplineContext: unknown;
}

type Ctx = EngineContext<LoadedRuleset, LoadedCatalog>;

function earlyError(ctx: Ctx, step: string, code: 'INVALID_INPUT' | 'SAFETY_BLOCK' | 'OUT_OF_SCOPE' | 'NO_VALID_SOLUTION', rs: readonly ReasonCode[], decision: string = code): CorePipelineOutcome {
  const trace = new TraceBuilder({ engineVersion: ctx.engineVersion, rulesetVersion: ctx.ruleset.version, catalogVersion: ctx.catalog.version }, ctx.seed);
  trace.add({ step, subject: { kind: 'program', id: ctx.seed }, decision, reasons: [...rs] });
  const built = trace.build();
  const result: EngineResult<SessionDraft> = { status: 'error', error: { code, reasons: [...rs], alternatives: [] }, trace: { traceId: built.traceId } };
  return { result, trace: built };
}

/**
 * Flux complet d'une séance : INTENTION → garde de sécurité (le moteur n'est JAMAIS appelé si le
 * programme n'est pas actif) → MOTEUR SPORTIF (propose) → acceptation des propositions → pipeline CORE
 * (durée → empreinte → anti-doublon → validation → sélection → réparation → trace → résultat).
 */
export function runSportSession<TContext>(engine: SportEngine<TContext>, request: SportSessionRequest, ctx: Ctx): CorePipelineOutcome {
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

  // CORE-EXT-2 : le contexte de discipline n'entre qu'après validation par le parseur du moteur.
  let parsedContext: ContextParse<TContext>;
  try {
    parsedContext = engine.parseContext(request.disciplineContext);
  } catch (e) {
    return earlyError(ctx, 'discipline_context', 'INVALID_INPUT', [structureProblem(`parseur de contexte en échec : ${e instanceof Error ? e.message : String(e)}`, engine.id)]);
  }
  if (!parsedContext.ok) return earlyError(ctx, 'discipline_context', 'INVALID_INPUT', [...parsedContext.reasons]);

  // CORE-EXT-4 : contrat planificateur de la discipline, vérifié avant toute génération.
  if (engine.validateIntent) {
    let contract: readonly ReasonCode[];
    try {
      contract = engine.validateIntent({ intent, discipline: parsedContext.context, ruleset: ctx.ruleset, catalog: ctx.catalog });
    } catch (e) {
      return earlyError(ctx, 'intent_contract', 'INVALID_INPUT', [structureProblem(`contrat d'intention en échec : ${e instanceof Error ? e.message : String(e)}`, engine.id)]);
    }
    if (contract.length > 0) return earlyError(ctx, 'intent_contract', 'INVALID_INPUT', [...contract]);
  }

  const input: SportEngineInput<TContext> = {
    intent, profile: request.profile, state: request.state, constraints, catalog: ctx.catalog, ruleset: ctx.ruleset, history: request.history,
    context: { seed: `${ctx.seed}/engine/${engine.id}`, now: ctx.now, engineVersion: ctx.engineVersion },
    discipline: parsedContext.context,
  };
  let result: unknown;
  try {
    result = engine.propose(input);
  } catch (e) {
    // Une exception reste un défaut TECHNIQUE ; l'absence de proposition est une issue métier (ci-dessous).
    return earlyError(ctx, 'proposal', 'INVALID_INPUT', [structureProblem(`moteur en échec : ${e instanceof Error ? e.message : String(e)}`, engine.id)]);
  }
  const status = result !== null && typeof result === 'object' && 'status' in result ? result.status : undefined;
  if (status === 'no_valid_proposal') return noValidProposal(result, input, engine, ctx);
  const proposals = status === 'proposals' && 'proposals' in (result as object) ? (result as { proposals: unknown }).proposals : undefined;
  if (!Array.isArray(proposals)) return earlyError(ctx, 'proposal', 'INVALID_INPUT', [structureProblem('résultat de propose() hors contrat (proposals | no_valid_proposal)', engine.id)]);
  const accepted = proposals.map((r: unknown, i) => acceptProposal(r, i, input, engine));
  return runCorePipeline({
    profile: request.profile, state: request.state,
    candidates: accepted.flatMap((a) => (a.ok ? [a.candidate] : [])),
    rejectedProposals: accepted.flatMap((a) => (a.ok ? [] : [{ id: a.id, reasons: a.reasons }])),
    duplicate: { history: request.history, declaredIntents: intent.repetitionIntents },
    ...(engine.checks ? { extraChecks: engine.checks } : {}),
  }, ctx);
}

/**
 * CORE-EXT-3 : absence de proposition = issue MÉTIER. Schéma strict et provenance vérifiés ; les raisons
 * du moteur, les besoins bloquants et les données manquantes sont conservés jusqu'au résultat
 * (`NO_VALID_SOLUTION`). Le CORE et le planificateur décident ensuite d'une autre intention.
 */
function noValidProposal<TContext>(raw: unknown, input: SportEngineInput<TContext>, engine: Pick<SportEngine<TContext>, 'id' | 'version'>, ctx: Ctx): CorePipelineOutcome {
  const parsed = zNoValidProposal.safeParse(raw);
  if (!parsed.success) {
    return earlyError(ctx, 'proposal', 'INVALID_INPUT', parsed.error.issues.map((i) => reasons.emit('TECHNICAL.SCHEMA_INVALID', { path: `no_valid_proposal.${i.path.join('.')}`, problem: i.message })));
  }
  const n = parsed.data;
  const prov = n.provenance;
  if (prov.engineId !== engine.id || prov.engineVersion !== engine.version || prov.rulesetVersion !== ctx.ruleset.version || prov.catalogVersion !== ctx.catalog.version || prov.seed !== input.context.seed) {
    return earlyError(ctx, 'proposal', 'INVALID_INPUT', [structureProblem('provenance de no_valid_proposal incohérente avec le contexte', engine.id)]);
  }
  const rs: ReasonCode[] = [
    ...(n.reasons as ReasonCode[]),
    ...n.blockingNeeds.map((b) => reasons.emit('SELECT.BLOCKING_NEED', { slotId: b.slotId, need: b.need, engineId: engine.id })),
    ...n.missingData.map((key) => reasons.emit('DATA.MISSING_FOR_PROPOSAL', { key, engineId: engine.id })),
  ];
  return earlyError(ctx, 'proposal', 'NO_VALID_SOLUTION', rs, 'no_valid_proposal');
}
