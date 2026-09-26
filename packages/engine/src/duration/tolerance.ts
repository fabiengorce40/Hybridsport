import type { LoadedRuleset } from '../rules/ruleset.js';
import { RulesetParameterError } from '../rules/errors.js';
import type { DurationEstimate } from './estimate.js';

export interface ToleranceProfile { readonly lowerPct: number; readonly upperPct: number; readonly marginS: number }

const isProfiles = (v: unknown): v is Record<string, ToleranceProfile> =>
  v !== null && typeof v === 'object' && Object.values(v).every((p) => {
    if (p === null || typeof p !== 'object') return false;
    const t = p as Record<string, unknown>;
    return [t.lowerPct, t.upperPct, t.marginS].every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0);
  });

/** Profil de tolérance (provisoire, spec 07 §3.2) lu dans le ruleset. */
export function readToleranceProfile(ruleset: LoadedRuleset, profileId: string): ToleranceProfile {
  const all = ruleset.table('duration.toleranceProfiles', isProfiles, 'Record<profil, {lowerPct, upperPct, marginS}>');
  const p = all[profileId];
  if (!p) throw new RulesetParameterError(`duration.toleranceProfiles.${profileId}`, 'missing');
  return p;
}

/** Durée cible dérivée du temps disponible : T = A − marge (spec 07 §3.1). */
export function targetFromAvailable(availableS: number, profile: ToleranceProfile): number {
  return Math.max(0, availableS - profile.marginS);
}

export interface DurationCheck {
  /** Contrainte HARD : p90 ≤ temps réellement disponible. */
  readonly feasible: boolean;
  readonly lowerS: number;
  readonly upperS: number;
  readonly withinTolerance: boolean;
  readonly shorterThanTarget: boolean;
}

export function checkDuration(e: DurationEstimate, availableS: number, targetS: number, profile: ToleranceProfile): DurationCheck {
  const lowerS = targetS * (1 - profile.lowerPct);
  const upperS = targetS * (1 + profile.upperPct);
  return { feasible: e.p90 <= availableS, lowerS, upperS, withinTolerance: e.p50 >= lowerS && e.p50 <= upperS, shorterThanTarget: e.p50 < lowerS };
}
