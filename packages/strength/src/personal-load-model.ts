/**
 * Contrat PersonalLoadModel (ruleset scientifique V1, 4E §D) : niveau 3 de la hiérarchie de référence de
 * charge. CONTRAT SEULEMENT — aucune implémentation ni apprentissage automatique en V1 ; le moteur ne le
 * consulte pas encore. Un futur modèle devra : rester déterministe pour une version donnée, exposer une
 * fourchette et une confiance ordinale (jamais une précision supérieure aux données), tracer ses bases, et
 * ne jamais passer au-dessus d'une donnée spécifique récente fiable.
 */
import type { ConfidenceLevel } from './confidence.js';

/** Hiérarchie de référence de charge, du plus fiable au repli (4E §D). */
export const LOAD_REFERENCE_HIERARCHY = ['recent_specific', 'exercise_history', 'personal_model', 'generic_e1rm', 'calibration'] as const;
export type LoadReferenceLevel = (typeof LOAD_REFERENCE_HIERARCHY)[number];

export interface PersonalLoadQuery {
  readonly exerciseId: string;
  readonly reps: number;
  readonly rir: number;
  /** Instant de la décision (injecté, jamais l'horloge). */
  readonly asOf: string;
}

export interface PersonalLoadEstimate {
  readonly exerciseId: string;
  readonly kg: { readonly min: number; readonly max: number };
  readonly confidence: ConfidenceLevel;
  readonly modelId: string;
  readonly modelVersion: string;
  /** Observations ou hypothèses utilisées (traçabilité). */
  readonly basis: readonly string[];
}

export interface PersonalLoadModel {
  readonly modelId: string;
  readonly version: string;
  /** Estimation, ou `undefined` si le modèle ne sait pas (jamais une valeur inventée). */
  estimate(query: PersonalLoadQuery): PersonalLoadEstimate | undefined;
}
