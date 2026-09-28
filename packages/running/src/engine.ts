/**
 * RunningEngine — coquille de vague 1 conforme au contrat générique SportEngine<RunningContext>.
 *
 * Aucune prescription n'est implémentée en vague 1 : `propose` renvoie TOUJOURS `no_valid_proposal`,
 * avec les raisons exactes (prescription non implémentée, capacités indisponibles, G1 non signées,
 * paramètres non résolus). Aucune séance factice n'est fabriquée. Le moteur ne se valide jamais : le CORE
 * reste l'autorité de validation (SessionValidator) et de durée (DurationEngine).
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

export const RUNNING_ENGINE_ID = 'engine.running';
export const RUNNING_ENGINE_VERSION = '0.1.0' as const satisfies SemVerString;
/** Vague d'implémentation (aucune prescription avant la vague 2). */
export const RUNNING_ENGINE_WAVE = '1';

// technical-constant: version du format session_record (CORE-EXT-R1) exigée pour les séances structurées
const REQUIRED_SESSION_RECORD_VERSION = 4;

/** Le CORE porte-t-il CORE-EXT-R1 (séances `run_structure`, session_record v4) ? Vérifié sur les artefacts, pas sur un rapport. */
export function coreExtR1Available(): boolean {
  return CURRENT_SCHEMA.session_record.version >= REQUIRED_SESSION_RECORD_VERSION;
}

const toProposalReason = (r: ReasonCode) => ({
  ...r,
  params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === 'object' ? [...v] : v])) as Record<string, string | number | boolean | string[]>,
  ruleRefs: [...r.ruleRefs],
});

export interface RunningEngineOptions {
  /** État de gouvernance (par défaut : l'état réel au début de la phase 6B, rien d'approuvé). */
  readonly governance?: RunningGovernance;
}

export type RunningEngine = SportEngine<RunningContext> & {
  /** Observabilité : l'analyse complète de vague 1 pour une entrée (sans effet de bord). */
  analyze(input: SportEngineInput<RunningContext>): RunningWave1Analysis;
  readonly governance: RunningGovernance;
};

export function createRunningEngine(options: RunningEngineOptions = {}): RunningEngine {
  const governance = options.governance ?? CURRENT_RUNNING_GOVERNANCE;
  const issues = governanceIssues(governance);
  if (issues.length > 0) throw new TypeError(`Gouvernance Running invalide : ${issues.join(' ; ')}`);
  const effective: RunningGovernance = coreExtR1Available() ? governance : { ...governance, technical: { ...governance.technical, CORE_EXT_R1: 'UNSATISFIED' } };

  const analyze = (input: SportEngineInput<RunningContext>): RunningWave1Analysis => analyzeRunning(input.discipline, effective, input.context.now);

  return {
    id: RUNNING_ENGINE_ID,
    version: RUNNING_ENGINE_VERSION,
    discipline: 'running',
    governance: effective,
    parseContext: parseRunningContext,
    validateIntent(input: IntentContractInput<RunningContext>): readonly ReasonCode[] {
      return archetypeFromIntentId(input.intent.archetypeId) === undefined ? [runningReasons.emit(RUNNING_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId })] : [];
    },
    analyze,
    propose(input: SportEngineInput<RunningContext>): ProposeResult {
      const archetype = archetypeFromIntentId(input.intent.archetypeId);
      const analysis = analyze(input);
      const session = analysis.sessions.find((s) => s.archetype === archetype);
      const reasons: ReasonCode[] = [
        runningReasons.emit(RUNNING_CODES.PRESCRIPTION_NOT_IMPLEMENTED, { archetype: archetype ?? input.intent.archetypeId, wave: RUNNING_ENGINE_WAVE }),
        ...(session ? [...session.eligibility.reasons, ...session.degradations.map((d) => d.reason)] : [runningReasons.emit(RUNNING_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId })]),
      ];
      const seen = new Set<string>();
      const unique = reasons.filter((r) => { const k = JSON.stringify([r.code, r.params]); if (seen.has(k)) return false; seen.add(k); return true; });
      const out: NoValidProposalInput = {
        status: 'no_valid_proposal',
        reasons: unique.map(toProposalReason),
        blockingNeeds: [],
        missingData: [],
        provenance: { engineId: RUNNING_ENGINE_ID, engineVersion: RUNNING_ENGINE_VERSION, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
      };
      return out;
    },
  };
}
