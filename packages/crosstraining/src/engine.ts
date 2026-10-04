/**
 * CrossTrainingEngine — conforme au contrat SportEngine<CrossTrainingContext>.
 *
 * - Archétypes de stimulus (les 9 identifiants techniques C1) : TOUJOURS `no_valid_proposal`, avec les raisons
 *   exactes et PRESCRIPTION_NOT_IMPLEMENTED (C1 inchangé).
 * - Archétype C2 (`crosstraining.c2`) : UNE proposition au plus, dans le corridor strict de c2.ts (amorçage ou rejeu
 *   strict), ou `no_valid_proposal` avec la raison exacte. Aucune valeur sportive écrite ici.
 * Le moteur ne se valide jamais et ne calcule aucune durée : le CORE reste l'autorité.
 */
import { canonicalStringify, runSportSession } from '@hybridsport/engine';
import type { NoValidProposalInput, ReasonCode, SemVerString, SportEngineProposalInput } from '@hybridsport/domain';
import type { CorePipelineOutcome, EngineContext, IntentContractInput, LoadedCatalog, LoadedRuleset, ProposeResult, SportEngine, SportEngineInput, SportSessionRequest } from '@hybridsport/engine';
import { CT_C2_ARCHETYPE, stimulusFromArchetypeId } from './model.js';
import { capabilityState, foundationState } from './capabilities.js';
import {
  BOOTSTRAP_ALLOWLIST_ID, ageIssues, bootstrapCandidate, c2Proposal, corridorIssues, latestRealized, movementIssues, readMaxReplayAge,
  replaySourceIssues, volumeGuardParameters, zBootstrapMovementAllowlist,
} from './c2.js';
import { resolveParameter } from './governance/parameters.js';
import { CT_CODES, ctReasons } from './codes.js';
import { parseCrossTrainingContext } from './context.js';
import type { CrossTrainingContext } from './context.js';
import { analyzeCrossTraining } from './analysis.js';
import type { CtAnalysis } from './analysis.js';
import { CURRENT_CT_GOVERNANCE, governanceIssues } from './governance/state.js';
import type { CtGovernance } from './governance/state.js';

export const CT_ENGINE_ID = 'engine.crosstraining';
export const CT_ENGINE_VERSION = '0.2.0' as const satisfies SemVerString;
export const CT_ENGINE_WAVE = 'C2';

export interface CrossTrainingEngineOptions {
  /** État de gouvernance (par défaut : l'état réel C1, rien de décidé). */
  readonly governance?: CtGovernance;
  /** Mode SIMULATION (tests uniquement) : exigé pour le mode CANDIDATE. Absent ⇒ false (fermé). */
  readonly simulation?: boolean;
}

export type CrossTrainingEngine = SportEngine<CrossTrainingContext> & {
  /** Observabilité : l'analyse des blocages pour une entrée (sans effet de bord), ou undefined si l'archétype est inconnu. */
  analyze(input: SportEngineInput<CrossTrainingContext>): CtAnalysis | undefined;
  readonly governance: CtGovernance;
  readonly simulation: boolean;
};

const toProposalReasons = (rs: readonly ReasonCode[]): SportEngineProposalInput['reasons'] => rs.map((r) => ({
  ...r,
  params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === 'object' ? [...v] : v])) as Record<string, string | number | boolean | string[]>,
  ruleRefs: [...r.ruleRefs],
}));

/** Déduplication stable (code + paramètres). */
function uniqueReasons(rs: readonly ReasonCode[]): ReasonCode[] {
  const seen = new Set<string>();
  return rs.filter((r) => { const k = JSON.stringify([r.code, r.params]); if (seen.has(k)) return false; seen.add(k); return true; });
}

export function createCrossTrainingEngine(options: CrossTrainingEngineOptions = {}): CrossTrainingEngine {
  const governance = options.governance ?? CURRENT_CT_GOVERNANCE;
  const issues = governanceIssues(governance);
  if (issues.length > 0) throw new TypeError(`Gouvernance Cross-training invalide : ${issues.join(' ; ')}`);
  const simulation = options.simulation === true;

  const analyze = (input: SportEngineInput<CrossTrainingContext>): CtAnalysis | undefined => {
    const stimulus = stimulusFromArchetypeId(input.intent.archetypeId);
    return stimulus === undefined ? undefined : analyzeCrossTraining(stimulus, input.discipline, governance);
  };

  return {
    id: CT_ENGINE_ID,
    version: CT_ENGINE_VERSION,
    discipline: 'crosstraining',
    governance,
    simulation,
    parseContext: parseCrossTrainingContext,
    validateIntent(input: IntentContractInput<CrossTrainingContext>): readonly ReasonCode[] {
      const known = input.intent.archetypeId === CT_C2_ARCHETYPE || stimulusFromArchetypeId(input.intent.archetypeId) !== undefined;
      return known ? [] : [ctReasons.emit(CT_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId })];
    },
    analyze,
    propose(input: SportEngineInput<CrossTrainingContext>): ProposeResult {
      if (input.intent.archetypeId === CT_C2_ARCHETYPE) return proposeC2(input, governance, simulation);
      const analysis = analyze(input);
      const reasons: ReasonCode[] = [];
      if (analysis === undefined) {
        reasons.push(ctReasons.emit(CT_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId }));
      } else {
        reasons.push(...analysis.blockingReasons);
        if (input.discipline.mode === 'CANDIDATE' && !simulation) reasons.push(ctReasons.emit(CT_CODES.SIMULATION_REQUIRED, { mode: input.discipline.mode }));
        reasons.push(ctReasons.emit(CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED, { stimulus: analysis.stimulus, wave: CT_ENGINE_WAVE }));
      }
      return refuse(input, reasons);
    },
  };
}

function refuse(input: SportEngineInput<CrossTrainingContext>, reasons: readonly ReasonCode[]): NoValidProposalInput {
  return {
    status: 'no_valid_proposal',
    reasons: toProposalReasons(uniqueReasons(reasons)),
    blockingNeeds: [],
    missingData: [],
    provenance: { engineId: CT_ENGINE_ID, engineVersion: CT_ENGINE_VERSION, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
  };
}

/**
 * C2 : ordre fixe des contrôles, chacun fail-closed — multisport, simulation (CANDIDATE), socle (politiques G1,
 * contenu), reprise (seul `NONE` admis : CT-G1-RETURN), puis source de dose :
 * - historique réalisé NON vide ⇒ rejeu strict de la DERNIÈRE séance, ou refus (aucune recherche plus ancienne,
 *   aucun repli sur l'amorçage) ;
 * - historique vide ⇒ amorçage (allowlist × durée approuvée).
 * Le niveau déclaré (novice compris) n'est pas un critère : un novice est admissible dans ce corridor, sans coefficient.
 */
function proposeC2(input: SportEngineInput<CrossTrainingContext>, governance: CtGovernance, simulation: boolean): ProposeResult {
  const ctx = input.discipline;
  const mode = ctx.mode;
  const requested = new Set<string>(ctx.capabilityRequests);
  if (ctx.population.hybrid) return refuse(input, [ctReasons.emit(CT_CODES.HYBRID_PLANNER_UNAVAILABLE, { cause: 'GLOBAL_PLANNER_REQUIRED' })]);
  if (mode === 'CANDIDATE' && !simulation) return refuse(input, [ctReasons.emit(CT_CODES.SIMULATION_REQUIRED, { mode })]);
  const foundation = foundationState(governance, mode);
  if (!foundation.enabled) return refuse(input, foundation.reasons);
  if (ctx.returnState.state !== 'NONE') return refuse(input, [ctReasons.emit(CT_CODES.RETURN_NOT_SUPPORTED, { returnState: ctx.returnState.state })]);
  const engine = { id: CT_ENGINE_ID, version: CT_ENGINE_VERSION };
  const trace = [...foundation.reasons];

  const latest = latestRealized(ctx.sessionHistory);
  let exerciseId: string;
  let durationS: number;
  let source: 'bootstrap' | 'replay';
  if (latest) {
    const cap = capabilityState('ctReplayHold', governance, mode, requested.has('ctReplayHold'));
    if (!cap.enabled) return refuse(input, cap.reasons);
    const age = readMaxReplayAge(governance, mode);
    if (!age.ok) return refuse(input, age.reasons);
    const causes = [...replaySourceIssues(latest), ...corridorIssues(latest), ...ageIssues(latest.completedAt, input.context.now, age.days)];
    if (causes.length > 0) return refuse(input, [ctReasons.emit(CT_CODES.REPLAY_SOURCE_INADMISSIBLE, { sessionId: latest.sessionId, causes })]);
    const p = latest.prescription;
    // corridorIssues garantit : continu, un seul item en durée égale à la durée prescrite.
    exerciseId = p.items[0]?.exerciseId ?? '';
    durationS = p.format === 'continuous' ? p.durationS : 0;
    source = 'replay';
    trace.push(...cap.reasons, ...age.reasons);
  } else {
    const cap = capabilityState('ctBootstrapExposure', governance, mode, requested.has('ctBootstrapExposure'));
    if (!cap.enabled) return refuse(input, cap.reasons);
    const r = resolveParameter(governance.parameters, BOOTSTRAP_ALLOWLIST_ID, mode);
    const list = r.status === 'resolved' ? zBootstrapMovementAllowlist.safeParse(r.value) : undefined;
    if (!list?.success) return refuse(input, [...r.reasons, ctReasons.emit(CT_CODES.UNRESOLVED_PARAMETER, { parameterId: BOOTSTRAP_ALLOWLIST_ID, cause: 'UNREADABLE', mode })]);
    const candidate = bootstrapCandidate(list.data);
    if ('causes' in candidate) return refuse(input, [ctReasons.emit(CT_CODES.BOOTSTRAP_UNAVAILABLE, { cause: 'NO_APPROVED_MOVEMENT_DURATION', entries: [...candidate.causes] })]);
    exerciseId = candidate.entry.movementId;
    durationS = candidate.durationS;
    source = 'bootstrap';
    trace.push(...cap.reasons);
  }

  // CT-G1-PAIN, matériel, restrictions, exclusions : refus, jamais de substitution ni de réduction de dose.
  const issues = movementIssues(exerciseId, input.catalog.exercise(exerciseId), input, governance);
  if (issues.length > 0) return refuse(input, [ctReasons.emit(CT_CODES.MOVEMENT_INELIGIBLE, { exerciseId, causes: issues })]);
  const proposal = c2Proposal(input, exerciseId, durationS, source, engine, trace);
  // CT-D6 : plafonds exigés seulement si la prescription expose la quantité contrôlée (aucun pour `timed`).
  const guards = volumeGuardParameters(proposal.session as never, (id) => input.catalog.exercise(id));
  const missing = guards.filter((g) => resolveParameter(governance.parameters, g, mode).status !== 'resolved');
  if (missing.length > 0) return refuse(input, missing.map((g) => ctReasons.emit(CT_CODES.VOLUME_GUARD_REQUIRED, { parameterId: g })));
  return { status: 'proposals', proposals: [proposal] };
}

/** Contenu prescriptif comparable d'une séance (blocs : format, items, prescriptions), hors défauts techniques. */
const prescriptive = (blocks: readonly unknown[]): string => canonicalStringify((blocks as { format: string; items: { exerciseId: string; prescription: unknown }[] }[])
  .map((b) => ({ format: b.format, items: b.items.map((i) => ({ exerciseId: i.exerciseId, prescription: i.prescription })) })));

/**
 * Exécution C2 STRICTE : pipeline CORE réel, puis vérification que la séance publiée est EXACTEMENT celle proposée.
 * Si le CORE l'a modifiée (réparation, substitution, retrait, raccourcissement), le résultat devient un refus
 * `NO_VALID_SOLUTION` (C2_MODIFIED_BY_CORE) : un rejeu ou un amorçage modifié n'est jamais publié.
 */
export function runCrossTrainingC2(engine: CrossTrainingEngine, request: SportSessionRequest, ctx: EngineContext<LoadedRuleset, LoadedCatalog>): CorePipelineOutcome {
  let proposed: unknown;
  const watched: CrossTrainingEngine = {
    ...engine,
    propose: (input) => {
      const out = engine.propose(input);
      proposed = out.status === 'proposals' ? out.proposals[0]?.session : undefined;
      return out;
    },
  };
  const outcome = runSportSession(watched, request, ctx);
  if (outcome.result.status !== 'ok' || proposed === undefined) return outcome;
  const expected = (proposed as { blocks: unknown[] }).blocks;
  if (prescriptive(outcome.result.value.blocks) === prescriptive(expected)) return outcome;
  const reason = ctReasons.emit(CT_CODES.C2_MODIFIED_BY_CORE, { sessionId: outcome.result.value.id });
  return { trace: outcome.trace, result: { status: 'error', error: { code: 'NO_VALID_SOLUTION', reasons: [reason], alternatives: [] }, trace: outcome.result.trace } };
}
