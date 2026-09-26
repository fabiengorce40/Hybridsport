import { OPTIMIZATION_LEVELS } from '@hybridsport/domain';
import type { OptimizationLevel, ReasonCode } from '@hybridsport/domain';
import type { SeededRng } from '../core/rng.js';
import { tieBreak } from '../core/rng.js';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { RulesetParameterError } from '../rules/errors.js';
import type { EvaluatedCandidate } from './admissibility.js';

const reasons = createCoreRegistry();

/** Couche B (spec 01 §5) : B1 cohérence objectif principal … B6 variété / préférences faibles. */
export type OptimizationVector = Readonly<Record<OptimizationLevel, number>>;
export type Tolerances = Readonly<Record<OptimizationLevel, number>>;

export function toArray(v: OptimizationVector): number[] {
  return OPTIMIZATION_LEVELS.map((l) => v[l]);
}

export function fromArray(values: readonly number[]): OptimizationVector {
  return Object.fromEntries(OPTIMIZATION_LEVELS.map((l, i) => [l, values[i] ?? 0])) as OptimizationVector;
}

/** Tolérances ε par niveau, lues dans le ruleset (paramètre `core.optimization.epsilon`) — jamais codées en dur. */
export function readTolerances(ruleset: LoadedRuleset): Tolerances {
  const rec = ruleset.numberRecord('core.optimization.epsilon');
  for (const l of OPTIMIZATION_LEVELS) {
    const v = rec[l];
    if (v === undefined || v < 0) throw new RulesetParameterError('core.optimization.epsilon', 'type', `ε ≥ 0 pour ${l}`);
  }
  return rec as Tolerances;
}

export interface Comparison {
  readonly winner: 'a' | 'b' | 'tie';
  readonly decidingLevel?: OptimizationLevel;
  readonly gap?: number;
}

/** Comparaison lexicographique à tolérance entre deux vecteurs (écart ≤ ε ⇒ niveau suivant). */
export function compareOptimization(a: OptimizationVector, b: OptimizationVector, eps: Tolerances): Comparison {
  for (const l of OPTIMIZATION_LEVELS) {
    const d = a[l] - b[l];
    if (Math.abs(d) > eps[l]) return { winner: d > 0 ? 'a' : 'b', decidingLevel: l, gap: Math.abs(d) };
  }
  return { winner: 'tie' };
}

export type Selection<P> =
  | { readonly status: 'selected'; readonly winner: EvaluatedCandidate<P>; readonly decidingLevel?: OptimizationLevel; readonly reasons: readonly ReasonCode[]; readonly rejected: readonly { readonly id: string; readonly reasons: readonly ReasonCode[] }[] }
  | { readonly status: 'none'; readonly reasons: readonly ReasonCode[]; readonly rejected: readonly { readonly id: string; readonly reasons: readonly ReasonCode[] }[] };

const isFiniteVector = (v: readonly number[]): boolean => v.length === OPTIMIZATION_LEVELS.length && v.every((x) => Number.isFinite(x));

/**
 * Sélection de la meilleure solution :
 * 1. couche A = FILTRE : aucune solution inadmissible n'est comparée, quel que soit son score ;
 * 2. couche B par BANDES : à chaque niveau, on garde les candidats à moins de ε du meilleur
 *    (ordre-indépendant, contrairement à un tri avec un comparateur non transitif) ;
 * 3. égalité finale : départage par graine (spec 01 §6).
 */
export function selectBest<P>(candidates: readonly EvaluatedCandidate<P>[], eps: Tolerances, rng: SeededRng): Selection<P> {
  const rejected: { id: string; reasons: ReasonCode[] }[] = [];
  let pool: EvaluatedCandidate<P>[] = [];
  for (const c of [...candidates].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))) {
    if (!c.admissibility.admissible) {
      const layers = [...new Set(c.admissibility.violations.map((v) => v.layer ?? 'A4'))];
      rejected.push({ id: c.id, reasons: [reasons.emit('SELECT.CANDIDATE_INADMISSIBLE', { candidateId: c.id, layers }), ...c.admissibility.violations.map((v) => v.reason)] });
    } else if (!isFiniteVector(c.optimization)) {
      rejected.push({ id: c.id, reasons: [reasons.emit('TECHNICAL.NON_FINITE_VALUE', { path: `candidates(${c.id}).optimization` })] });
    } else {
      pool.push(c);
    }
  }
  if (pool.length === 0) return { status: 'none', reasons: [reasons.emit('SELECT.NO_ADMISSIBLE_CANDIDATE', { candidates: candidates.length })], rejected };

  let decidingLevel: OptimizationLevel | undefined;
  let gap = 0;
  OPTIMIZATION_LEVELS.forEach((level, i) => {
    const best = Math.max(...pool.map((c) => c.optimization[i] ?? 0));
    const kept = pool.filter((c) => (c.optimization[i] ?? 0) >= best - eps[level]);
    if (kept.length < pool.length && decidingLevel === undefined) {
      decidingLevel = level;
      const bestExcluded = Math.max(...pool.filter((c) => !kept.includes(c)).map((c) => c.optimization[i] ?? 0));
      gap = best - bestExcluded;
    }
    pool = kept;
  });

  const winner = pool.length === 1 ? pool[0] : tieBreak(pool, (c) => c.id, rng);
  if (!winner) return { status: 'none', reasons: [reasons.emit('SELECT.NO_ADMISSIBLE_CANDIDATE', { candidates: candidates.length })], rejected };
  const out: ReasonCode[] = [];
  if (decidingLevel !== undefined) {
    out.push(reasons.emit('SELECT.DECIDED_AT_LEVEL', { winnerId: winner.id, level: decidingLevel, gap }));
    if (decidingLevel === 'B3') out.push(reasons.emit('SELECT.ADHERENCE_TIEBREAK', { winnerId: winner.id }));
  }
  if (pool.length > 1) out.push(reasons.emit('SELECT.TIE_BROKEN_BY_SEED', { winnerId: winner.id, tiedWith: pool.filter((c) => c !== winner).map((c) => c.id) }));
  return { status: 'selected', winner, ...(decidingLevel !== undefined ? { decidingLevel } : {}), reasons: out, rejected };
}
