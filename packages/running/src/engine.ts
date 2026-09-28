/**
 * RunningEngine — conforme au contrat générique SportEngine<RunningContext>.
 *
 * Vague 2 (phase 6C) : seul EASY est prescriptible, en HOLD strict (ancre V19, plafond RPE V02, effort
 * seul), et seulement là où l'autorité existe : PRODUCTION exige un socle éligible et des paramètres
 * PRODUCTION_ELIGIBLE (aujourd'hui : jamais) ; CANDIDATE exige un moteur construit en SIMULATION.
 * Tous les autres cas renvoient `no_valid_proposal` avec les raisons exactes. Aucune séance factice.
 * Le moteur ne se valide jamais : le CORE reste l'autorité de validation et de durée.
 */
import { CURRENT_SCHEMA } from '@hybridsport/domain';
import type { NoValidProposalInput, ReasonCode, SemVerString } from '@hybridsport/domain';
import type { IntentContractInput, ProposeResult, SportEngine, SportEngineInput } from '@hybridsport/engine';
import { archetypeFromIntentId } from './model.js';
import { RUNNING_CODES, runningReasons } from './codes.js';
import { parseRunningContext } from './context.js';
import type { RunningContext } from './context.js';
import { analyzeRunning } from './analysis.js';
import type { RunningWave1Analysis } from './analysis.js';
import { CURRENT_RUNNING_GOVERNANCE, governanceIssues } from './governance/state.js';
import type { RunningGovernance } from './governance/state.js';
import { runWave2 } from './wave2/pipeline.js';
import type { Wave2Outcome } from './wave2/pipeline.js';
import { toCoreProposal, toProposalReasons, uniqueReasons } from './wave2/proposal.js';

export const RUNNING_ENGINE_ID = 'engine.running';
export const RUNNING_ENGINE_VERSION = '0.3.0' as const satisfies SemVerString;
/** Vague d'implémentation (vague 3 : EASY + séances de qualité en HOLD, rejeu de l'historique réalisé). */
export const RUNNING_ENGINE_WAVE = '3';

// technical-constant: version du format session_record (CORE-EXT-R1) exigée pour les séances structurées
const REQUIRED_SESSION_RECORD_VERSION = 4;

/** Le CORE porte-t-il CORE-EXT-R1 (séances `run_structure`, session_record v4) ? Vérifié sur les artefacts, pas sur un rapport. */
export function coreExtR1Available(): boolean {
  return CURRENT_SCHEMA.session_record.version >= REQUIRED_SESSION_RECORD_VERSION;
}

export interface RunningEngineOptions {
  /** État de gouvernance (par défaut : l'état réel au début de la phase 6B, rien d'approuvé). */
  readonly governance?: RunningGovernance;
  /**
   * Mode SIMULATION (tests uniquement) : autorise la prescription en mode CANDIDATE, avec des valeurs
   * candidates non approuvées ; chaque proposition porte RULE.RUNNING.SIMULATED_PROPOSAL. Par défaut : false.
   * Sans effet en PRODUCTION (rien n'y est assoupli).
   */
  readonly simulation?: boolean;
}

export type RunningEngine = SportEngine<RunningContext> & {
  /** Observabilité : l'analyse complète de vague 1 pour une entrée (sans effet de bord). */
  analyze(input: SportEngineInput<RunningContext>): RunningWave1Analysis;
  /** Observabilité : le pipeline de vague 2 complet (candidats, rejets, trace) pour une entrée. */
  prescribe(input: SportEngineInput<RunningContext>): Wave2Outcome;
  readonly governance: RunningGovernance;
  readonly simulation: boolean;
};

export function createRunningEngine(options: RunningEngineOptions = {}): RunningEngine {
  const governance = options.governance ?? CURRENT_RUNNING_GOVERNANCE;
  const issues = governanceIssues(governance);
  if (issues.length > 0) throw new TypeError(`Gouvernance Running invalide : ${issues.join(' ; ')}`);
  const effective: RunningGovernance = coreExtR1Available() ? governance : { ...governance, technical: { ...governance.technical, CORE_EXT_R1: 'UNSATISFIED' } };

  const simulation = options.simulation === true;
  const analyze = (input: SportEngineInput<RunningContext>): RunningWave1Analysis => analyzeRunning(input.discipline, effective, input.context.now);
  const prescribe = (input: SportEngineInput<RunningContext>): Wave2Outcome => runWave2(input, analyze(input), effective, { simulation, wave: RUNNING_ENGINE_WAVE });

  return {
    id: RUNNING_ENGINE_ID,
    version: RUNNING_ENGINE_VERSION,
    discipline: 'running',
    governance: effective,
    simulation,
    parseContext: parseRunningContext,
    validateIntent(input: IntentContractInput<RunningContext>): readonly ReasonCode[] {
      return archetypeFromIntentId(input.intent.archetypeId) === undefined ? [runningReasons.emit(RUNNING_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId })] : [];
    },
    analyze,
    prescribe,
    propose(input: SportEngineInput<RunningContext>): ProposeResult {
      const outcome = prescribe(input);
      if (outcome.status === 'selected') return { status: 'proposals', proposals: [toCoreProposal(input, outcome.selection, { id: RUNNING_ENGINE_ID, version: RUNNING_ENGINE_VERSION })] };
      const out: NoValidProposalInput = {
        status: 'no_valid_proposal',
        reasons: toProposalReasons(uniqueReasons(outcome.reasons)),
        blockingNeeds: [],
        missingData: [],
        provenance: { engineId: RUNNING_ENGINE_ID, engineVersion: RUNNING_ENGINE_VERSION, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
      };
      return out;
    },
  };
}
