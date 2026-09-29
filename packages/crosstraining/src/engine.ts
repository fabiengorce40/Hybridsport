/**
 * CrossTrainingEngine C1 — conforme au contrat SportEngine<CrossTrainingContext>.
 *
 * C1 est un SOCLE : aucune prescription n'est implémentée. `propose` renvoie TOUJOURS `no_valid_proposal`, avec
 * toutes les raisons exactes (multisport, socle, sources de dose, simulation) et PRESCRIPTION_NOT_IMPLEMENTED,
 * y compris quand une gouvernance injectée fournit des valeurs : aucune valeur ne rend une séance générable en C1.
 * Le moteur ne se valide jamais et ne calcule aucune durée : le CORE reste l'autorité.
 */
import type { NoValidProposalInput, ReasonCode, SemVerString, SportEngineProposalInput } from '@hybridsport/domain';
import type { IntentContractInput, ProposeResult, SportEngine, SportEngineInput } from '@hybridsport/engine';
import { stimulusFromArchetypeId } from './model.js';
import { CT_CODES, ctReasons } from './codes.js';
import { parseCrossTrainingContext } from './context.js';
import type { CrossTrainingContext } from './context.js';
import { analyzeCrossTraining } from './analysis.js';
import type { CtAnalysis } from './analysis.js';
import { CURRENT_CT_GOVERNANCE, governanceIssues } from './governance/state.js';
import type { CtGovernance } from './governance/state.js';

export const CT_ENGINE_ID = 'engine.crosstraining';
export const CT_ENGINE_VERSION = '0.1.0' as const satisfies SemVerString;
export const CT_ENGINE_WAVE = 'C1';

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
      return stimulusFromArchetypeId(input.intent.archetypeId) === undefined ? [ctReasons.emit(CT_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId })] : [];
    },
    analyze,
    propose(input: SportEngineInput<CrossTrainingContext>): ProposeResult {
      const analysis = analyze(input);
      const reasons: ReasonCode[] = [];
      if (analysis === undefined) {
        reasons.push(ctReasons.emit(CT_CODES.ARCHETYPE_UNKNOWN, { archetypeId: input.intent.archetypeId }));
      } else {
        reasons.push(...analysis.blockingReasons);
        if (input.discipline.mode === 'CANDIDATE' && !simulation) reasons.push(ctReasons.emit(CT_CODES.SIMULATION_REQUIRED, { mode: input.discipline.mode }));
        reasons.push(ctReasons.emit(CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED, { stimulus: analysis.stimulus, wave: CT_ENGINE_WAVE }));
      }
      const out: NoValidProposalInput = {
        status: 'no_valid_proposal',
        reasons: toProposalReasons(uniqueReasons(reasons)),
        blockingNeeds: [],
        missingData: [],
        provenance: { engineId: CT_ENGINE_ID, engineVersion: CT_ENGINE_VERSION, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
      };
      return out;
    },
  };
}
