import type {
  Eligibility, FingerprintHistoryEntry, Level, PainHistoryAvailability, PainReport, ReadinessCategory, ReasonCode, RepetitionIntent, UserDeclaration,
} from '@hybridsport/domain';
import type { OptimizationVector } from '../decision/optimization.js';
import type { AthleteTimingProfile } from '../duration/estimate.js';
import type { ValidationContext } from '../validation/context.js';

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
 * Candidat soumis au pipeline (proposition acceptée d'un moteur sportif, ou fixture) : séance
 * proposée, vecteur B1–B6 et, si l'anti-doublon est actif, entrées d'empreinte. Tout est non fiable.
 */
export interface CoreCandidate {
  readonly session: unknown;
  readonly optimization: OptimizationVector;
  readonly fingerprintInputs?: unknown;
}

/** Contexte de l'anti-doublon : historique d'empreintes et intentions DÉCLARÉES par le planificateur. */
export interface DuplicateContext {
  readonly history: readonly FingerprintHistoryEntry[];
  readonly declaredIntents: readonly RepetitionIntent[];
}

export type { SessionCheck } from '../validation/checks.js';

export interface RejectedProposal { readonly id: string; readonly reasons: readonly ReasonCode[] }
