import type { AdmissibilityLayer, RuleNature } from './enums.js';
import type { ReasonCode } from './reason.js';

export const VALIDATION_STATUSES = ['VALID', 'VALID_WITH_WARNINGS', 'INVALID'] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

/** Cible d'une violation (séance, bloc, item, semaine…). */
export interface EntityRef {
  readonly kind: 'session' | 'block' | 'item' | 'week' | 'program' | 'ruleset' | 'catalog' | 'exercise' | 'input';
  readonly id: string;
}

export interface Violation {
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly nature: RuleNature;
  readonly level: 'hard' | 'soft';
  /** Couche d'admissibilité concernée pour une violation HARD (A1–A4). */
  readonly layer?: AdmissibilityLayer;
  readonly target: EntityRef;
  readonly reason: ReasonCode;
  /** Pénalité pour une violation SOFT (≥ 0). */
  readonly penalty?: number;
}

/** Action de réparation proposée par une règle (appliquée par le RepairEngine). */
export type RepairAction =
  | { readonly kind: 'replace_exercise'; readonly itemId: string; readonly candidates: readonly string[] }
  | { readonly kind: 'remove_item'; readonly itemId: string }
  | { readonly kind: 'reduce_sets'; readonly itemId: string; readonly minSets: number }
  | { readonly kind: 'reduce_rest'; readonly itemId: string; readonly floorS: number }
  | { readonly kind: 'drop_block'; readonly blockId: string }
  | { readonly kind: 'compress_duration' };

export interface ValidationReport {
  readonly status: ValidationStatus;
  readonly errors: readonly Violation[];
  readonly warnings: readonly Violation[];
  readonly repairSuggestions: readonly RepairAction[];
  readonly rulesEvaluated: readonly { readonly ruleId: string; readonly version: string }[];
  readonly engineVersion: string;
  readonly rulesetVersion: string;
  readonly catalogVersion: string;
}

export function statusFrom(errors: readonly Violation[], warnings: readonly Violation[]): ValidationStatus {
  if (errors.length > 0) return 'INVALID';
  if (warnings.length > 0) return 'VALID_WITH_WARNINGS';
  return 'VALID';
}
