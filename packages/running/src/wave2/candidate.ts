/**
 * Vague 2 — modèle TYPÉ d'un candidat de prescription. Un candidat trace : archétype, objectif,
 * capacités, paramètres, références, G1, précision, dégradations, raisons de rejet et provenance.
 * Un candidat rejeté ne devient JAMAIS une séance dégradée : il reste rejeté, avec l'étape et les raisons.
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningGoal, RunningMode, RunningSessionArchetype } from '../model.js';
import type { CapabilityId } from '../capability-definitions.js';
import type { G1PolicyId } from '../governance/state.js';
import type { MaturityState } from '../governance/parameters.js';
import type { TargetPrecisionLevel } from '../precision.js';
import type { Degradation } from '../degradation.js';
import type { StructureFamily } from './history.js';

/** Étapes du pipeline, dans l'ordre d'exécution. */
export const PIPELINE_STAGES = ['ANALYSIS', 'GENERATION', 'ELIGIBILITY', 'SAFETY_G1', 'FEASIBILITY', 'PRECISION', 'SELECTION', 'PROPOSAL'] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Archétypes prescriptibles en vague 2 (audit 6C §3 : seul EASY est de classe A). */
export const WAVE2_ARCHETYPES: readonly RunningSessionArchetype[] = ['EASY'];

/** Familles de structure générées par archétype prescriptible (RULESET-V0 §I : EASY continu). */
export const WAVE2_STRUCTURE_FAMILIES: Readonly<Partial<Record<RunningSessionArchetype, readonly StructureFamily[]>>> = { EASY: ['CONTINUOUS'] };

export interface ParameterUse {
  readonly parameterId: string;
  readonly maturity: MaturityState;
  /** Valeur candidate (non approuvée) utilisée : jamais présentée comme approuvée. */
  readonly candidate: boolean;
}

export interface CandidateRejection {
  readonly stage: PipelineStage;
  readonly reasons: readonly ReasonCode[];
}

export interface CandidateDose {
  readonly kind: 'duration';
  readonly durationS: number;
  /** Provenance de la valeur (I18) : paramètre de règle et séance réalisée d'ancrage. */
  readonly source: { readonly parameterId: string; readonly sessionId: string };
}

export interface CandidateIntensity {
  readonly domain: 'EASY_LOW';
  /** Plafond RPE (V02) ; encodé en plage plafond CORE (RFC R1, règle 5). */
  readonly rpeCeiling: number;
  readonly source: { readonly parameterId: string };
}

export interface RunningCandidate {
  readonly candidateId: string;
  readonly archetype: RunningSessionArchetype;
  readonly structureFamily: StructureFamily;
  readonly goal: RunningGoal;
  readonly capabilities: readonly { readonly capability: CapabilityId; readonly enabled: boolean }[];
  readonly parameters: readonly ParameterUse[];
  /** Références d'athlète utilisées pour une cible (aucune pour une cible à l'effort). */
  readonly references: readonly string[];
  readonly g1Policies: readonly { readonly policyId: G1PolicyId; readonly status: string }[];
  readonly precision: TargetPrecisionLevel;
  readonly degradations: readonly Degradation[];
  readonly dose?: CandidateDose;
  readonly intensity?: CandidateIntensity;
  readonly exerciseId?: string;
  readonly rejection?: CandidateRejection;
  readonly reasons: readonly ReasonCode[];
  readonly provenance: { readonly rulesetVersion: string; readonly mode: RunningMode; readonly simulation: boolean };
}
