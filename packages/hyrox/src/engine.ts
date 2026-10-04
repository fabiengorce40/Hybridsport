/**
 * HyroxEngine (`hybrid_race`) — conforme au contrat SportEngine<HyroxContext>. Vague H1 : UNE station isolée, dose et
 * charge GOUVERNÉES, ou `no_valid_proposal` avec la raison exacte. Aucune valeur sportive écrite ici ; aucune
 * substitution ; le moteur ne calcule ni durée ni validation (le CORE reste l'autorité).
 */
import { canonicalStringify, runSportSession } from '@hybridsport/engine';
import type { NoValidProposalInput, ReasonCode, SemVerString, SportEngineProposalInput } from '@hybridsport/domain';
import type { CorePipelineOutcome, EngineContext, IntentContractInput, LoadedCatalog, LoadedRuleset, ProposeResult, SportEngine, SportEngineInput, SportSessionRequest } from '@hybridsport/engine';
import { HR_CODES, hrReasons } from './codes.js';
import { HR_H1_ARCHETYPE, parseHyroxContext } from './model.js';
import type { HyroxContext } from './model.js';
import { readHrParam } from './params.js';
import { h1Proposal, loadIssue, movementIssues } from './h1.js';

export const HR_ENGINE_ID = 'engine.hybrid_race';
export const HR_ENGINE_VERSION = '0.1.0' as const satisfies SemVerString;
export const HR_ENGINE_WAVE = 'H1';

export interface HyroxEngineOptions {
  /** Mode SIMULATION (tests uniquement) : exigé pour le mode CANDIDATE. Absent ⇒ false (fermé). */
  readonly simulation?: boolean;
}

export type HyroxEngine = SportEngine<HyroxContext> & { readonly simulation: boolean };

const toProposalReasons = (rs: readonly ReasonCode[]): SportEngineProposalInput['reasons'] => rs.map((r) => ({
  ...r,
  params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === 'object' ? [...v] : v])) as Record<string, string | number | boolean | string[]>,
  ruleRefs: [...r.ruleRefs],
}));

function refuse(input: SportEngineInput<HyroxContext>, reasons: readonly ReasonCode[]): NoValidProposalInput {
  return {
    status: 'no_valid_proposal',
    reasons: toProposalReasons(reasons),
    blockingNeeds: [],
    missingData: [],
    provenance: { engineId: HR_ENGINE_ID, engineVersion: HR_ENGINE_VERSION, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
  };
}

export function createHyroxEngine(options: HyroxEngineOptions = {}): HyroxEngine {
  const simulation = options.simulation === true;
  return {
    id: HR_ENGINE_ID,
    version: HR_ENGINE_VERSION,
    discipline: 'hybrid_race',
    simulation,
    parseContext: parseHyroxContext,
    validateIntent(input: IntentContractInput<HyroxContext>): readonly ReasonCode[] {
      return input.intent.archetypeId === HR_H1_ARCHETYPE ? [] : [hrReasons.emit(HR_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId })];
    },
    propose: (input) => proposeH1(input, simulation),
  };
}

/**
 * H1 : ordre fixe des contrôles, chacun fail-closed — archétype, simulation (CANDIDATE), multisport (paramètre G1
 * `hybrid_race.h1.hybridPlanning` requis), reprise (seul `NONE` admis), paramètres gouvernés, niveau admis, dose de la station
 * demandée, cohérence de charge, éligibilité du mouvement (matériel, restriction, douleur, exclusion).
 */
function proposeH1(input: SportEngineInput<HyroxContext>, simulation: boolean): ProposeResult {
  if (input.intent.archetypeId !== HR_H1_ARCHETYPE) return refuse(input, [hrReasons.emit(HR_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId })]);
  const ctx = input.discipline;
  if (ctx.mode === 'CANDIDATE' && !simulation) return refuse(input, [hrReasons.emit(HR_CODES.SIMULATION_REQUIRED, { mode: ctx.mode })]);
  const hybrid = ctx.population.hybrid ? readHrParam(input.ruleset, 'hybrid_race.h1.hybridPlanning', ctx.mode) : undefined;
  if (hybrid && !(hybrid.ok && hybrid.value)) {
    return refuse(input, [hrReasons.emit(HR_CODES.HYBRID_PLANNER_UNAVAILABLE, { cause: hybrid.ok ? 'POLICY_DISALLOWS' : 'GLOBAL_PLANNER_REQUIRED' }), ...hybrid.reasons]);
  }
  if (ctx.returnState.state !== 'NONE') return refuse(input, [hrReasons.emit(HR_CODES.RETURN_NOT_SUPPORTED, { returnState: ctx.returnState.state })]);

  const doses = readHrParam(input.ruleset, 'hybrid_race.h1.stationDoses', ctx.mode);
  const levels = readHrParam(input.ruleset, 'hybrid_race.h1.eligibleLevels', ctx.mode);
  const tolerance = readHrParam(input.ruleset, 'hybrid_race.h1.toleranceProfile', ctx.mode);
  const failed = [doses, levels, tolerance].flatMap((r) => (r.ok ? [] : r.reasons));
  if (!doses.ok || !levels.ok || !tolerance.ok) return refuse(input, failed);

  if (!levels.value.includes(ctx.population.level)) return refuse(input, [hrReasons.emit(HR_CODES.LEVEL_NOT_ELIGIBLE, { level: ctx.population.level })]);
  if (ctx.requestedStation === undefined) return refuse(input, [hrReasons.emit(HR_CODES.STATION_NOT_REQUESTED, {})]);
  const entries = doses.value.filter((d) => d.stationId === ctx.requestedStation);
  const dose = entries[0];
  if (!dose || entries.length !== 1) {
    return refuse(input, [hrReasons.emit(HR_CODES.STATION_DOSE_UNAVAILABLE, { stationId: ctx.requestedStation, cause: entries.length === 0 ? 'NO_GOVERNED_DOSE' : 'AMBIGUOUS_GOVERNED_DOSE' })]);
  }
  const exercise = input.catalog.exercise(dose.exerciseId);
  const movement = movementIssues(dose.stationId, dose.exerciseId, exercise, input);
  if (movement.length > 0 || !exercise) return refuse(input, [hrReasons.emit(HR_CODES.MOVEMENT_INELIGIBLE, { exerciseId: dose.exerciseId, causes: movement })]);
  const load = loadIssue(dose, exercise);
  if (load) return refuse(input, [hrReasons.emit(HR_CODES.LOAD_INVALID, { exerciseId: dose.exerciseId, cause: load })]);

  const used = [
    ...(hybrid?.ok ? [{ id: 'hybrid_race.h1.hybridPlanning', version: hybrid.version }] : []),
    { id: 'hybrid_race.h1.stationDoses', version: doses.version },
    { id: 'hybrid_race.h1.eligibleLevels', version: levels.version },
    { id: 'hybrid_race.h1.toleranceProfile', version: tolerance.version },
  ];
  const trace = [...(hybrid?.reasons ?? []), ...doses.reasons, ...levels.reasons, ...tolerance.reasons];
  return { status: 'proposals', proposals: [h1Proposal(input, dose, tolerance.value, { id: HR_ENGINE_ID, version: HR_ENGINE_VERSION }, used, trace)] };
}

/** Contenu prescriptif comparable (format, items, prescriptions — charge comprise), hors défauts techniques. */
const prescriptive = (blocks: readonly unknown[]): string => canonicalStringify((blocks as { format: string; items: { exerciseId: string; prescription: unknown }[] }[])
  .map((b) => ({ format: b.format, items: b.items.map((i) => ({ exerciseId: i.exerciseId, prescription: i.prescription })) })));

/**
 * Exécution H1 STRICTE : pipeline CORE réel, puis vérification que la séance publiée est EXACTEMENT celle proposée.
 * Toute modification par le CORE (réparation, substitution, retrait, raccourcissement) ⇒ refus `NO_VALID_SOLUTION`
 * (H1_MODIFIED_BY_CORE) : une station substituée ou une dose réduite n'est jamais publiée.
 */
export function runHyroxH1(engine: HyroxEngine, request: SportSessionRequest, ctx: EngineContext<LoadedRuleset, LoadedCatalog>): CorePipelineOutcome {
  let proposed: unknown;
  const watched: HyroxEngine = {
    ...engine,
    propose: (input) => {
      const out = engine.propose(input);
      proposed = out.status === 'proposals' ? out.proposals[0]?.session : undefined;
      return out;
    },
  };
  const outcome = runSportSession(watched, request, ctx);
  if (outcome.result.status !== 'ok' || proposed === undefined) return outcome;
  if (prescriptive(outcome.result.value.blocks) === prescriptive((proposed as { blocks: unknown[] }).blocks)) return outcome;
  const reason = hrReasons.emit(HR_CODES.H1_MODIFIED_BY_CORE, { sessionId: outcome.result.value.id });
  return { trace: outcome.trace, result: { status: 'error', error: { code: 'NO_VALID_SOLUTION', reasons: [reason], alternatives: [] }, trace: outcome.result.trace } };
}
