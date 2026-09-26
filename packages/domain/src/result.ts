import type { ReasonCode } from './reason.js';
import type { ValidationReport } from './validation.js';

/** Codes d'erreur métier (spec 01 §7). Le repos recommandé n'est PAS une erreur. */
export const ENGINE_ERROR_CODES = [
  'NO_VALID_SOLUTION', 'INSUFFICIENT_AVAILABILITY', 'CONFLICTING_GOALS', 'EQUIPMENT_INSUFFICIENT',
  'SAFETY_BLOCK', 'OUT_OF_SCOPE', 'INVALID_INPUT', 'REPAIR_EXHAUSTED', 'UNSUPPORTED_VERSION',
] as const;
export type EngineErrorCode = (typeof ENGINE_ERROR_CODES)[number];

export interface Alternative {
  readonly code: string;
  readonly description: ReasonCode;
  /** Modification d'entrée qui rendrait une solution possible (ex. { availableMinutes: 45 }). */
  readonly patch: Readonly<Record<string, unknown>>;
}

export interface EngineError {
  readonly code: EngineErrorCode;
  readonly reasons: readonly ReasonCode[];
  readonly alternatives: readonly Alternative[];
}

/** Trace minimale référencée par un résultat (le détail vit dans le module trace du moteur). */
export interface TraceRef {
  readonly traceId: string;
}

/**
 * Résultat de toute fonction du moteur : jamais d'exception pour un cas métier.
 * - `ok` : une valeur valide ;
 * - `rest_recommended` : issue VALIDE (spec 09 §2), pas une erreur ;
 * - `error` : erreur typée avec raisons et alternatives.
 */
export type EngineResult<T> =
  | { readonly status: 'ok'; readonly value: T; readonly validation: ValidationReport; readonly trace: TraceRef; readonly warnings: readonly ReasonCode[] }
  | { readonly status: 'rest_recommended'; readonly reasons: readonly ReasonCode[]; readonly trace: TraceRef }
  | { readonly status: 'error'; readonly error: EngineError; readonly trace: TraceRef };

export function isOk<T>(r: EngineResult<T>): r is Extract<EngineResult<T>, { status: 'ok' }> {
  return r.status === 'ok';
}
