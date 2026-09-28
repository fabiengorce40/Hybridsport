/**
 * `RecentLoadContext` (5D « RUNNING-RECENT-LOAD-CONTEXT », corrections 5E) : CONTEXTE DE PROGRAMMATION.
 * Ce n'est ni une bande de sécurité, ni une capacité sûre, ni une tolérance ; il n'infère AUCUN risque
 * de blessure et ne pose AUCUN diagnostic. Pas d'ACWR.
 *
 * La fenêtre, l'agrégation (médiane), `bestToleratedExposure` et le seuil de signalement des semaines
 * aberrantes viennent du paramètre V21 (EXPERT_PROPOSED, décision E-RECENTLOAD en attente) : tout reste
 * PROVISOIRE (`provisional: true`). Paramètre non résolu ⇒ contexte UNKNOWN (fail-closed).
 */
import { z } from 'zod';
import { isISODateTime, toEpochMs } from '@hybridsport/domain';
import type { ISODateTime, ReasonCode } from '@hybridsport/domain';
import type { RunningMode } from './model.js';
import { RUNNING_CODES, runningReasons } from './codes.js';
import { resolveParameter } from './governance/parameters.js';
import type { RunningParameter } from './governance/parameters.js';

/** Dimensions (5D §3). */
export const RECENT_LOAD_DIMENSIONS = ['WEEKLY_DURATION', 'WEEKLY_DISTANCE', 'FREQUENCY', 'LONG_RUN', 'HIGH_INTENSITY_EXPOSURE', 'MODERATE_TO_HEAVY_EXPOSURE', 'INTERNAL_LOAD_SRPE', 'CONCURRENT_LOCOMOTOR_LOAD'] as const;
export type RecentLoadDimension = (typeof RECENT_LOAD_DIMENSIONS)[number];

/**
 * Semaine observée. `value: null` = semaine MANQUANTE (UNKNOWN, exclue, jamais 0) ; `0` = semaine à zéro
 * déclarée (comptée, signalée). Les signaux de réponse négative sont des informations produit, jamais
 * un diagnostic.
 */
export const zWeekObservation = z.object({
  weekStart: z.string().refine(isISODateTime, 'instant ISO attendu'),
  value: z.number().nonnegative().nullable(),
  completion: z.enum(['COMPLETED', 'PARTIAL', 'SKIPPED', 'UNKNOWN']),
  skipReason: z.enum(['TIME', 'EQUIPMENT', 'PAIN', 'FATIGUE', 'OTHER']).optional(),
  unexpectedDifficulty: z.enum(['EASIER', 'AS_EXPECTED', 'HARDER', 'MUCH_HARDER', 'UNKNOWN']).default('UNKNOWN'),
  intoleranceOrPainSignal: z.boolean().default(false),
  readinessOrToleranceDegraded: z.boolean().default(false),
  lowAdherence: z.boolean().default(false),
}).strict();
export type WeekObservation = z.infer<typeof zWeekObservation>;

export const RECENT_LOAD_FLAGS = ['MISSING_WEEK', 'ZERO_WEEK', 'OUTLIER_WEEK', 'POST_RETURN_ONLY', 'INSUFFICIENT_HISTORY', 'NO_TOLERATED_WEEK'] as const;
export type RecentLoadFlag = (typeof RECENT_LOAD_FLAGS)[number];

export interface RecentLoadContext {
  readonly dimension: RecentLoadDimension;
  readonly status: 'AVAILABLE' | 'UNKNOWN';
  /** Semaines retenues (fenêtre), valeur ou null (UNKNOWN), dans l'ordre chronologique. */
  readonly weeks: readonly { readonly weekStart: string; readonly value: number | null; readonly negativeResponse: boolean }[];
  /** Niveau typique (médiane des semaines connues) : un repère, pas une cible. */
  readonly typicalLevel?: number;
  /** Plus haute semaine connue SANS réponse négative observée : réalisé récemment, PAS un maximum sûr. */
  readonly bestToleratedExposure?: number;
  readonly flags: readonly RecentLoadFlag[];
  readonly provisional: true;
  readonly parameterIds: readonly string[];
  readonly reasons: readonly ReasonCode[];
}

/** Réponse négative (5E) : échec de réalisation hors manque de temps, difficulté bien supérieure, intolérance ou douleur déclarée, readiness dégradée, adhérence effondrée. */
export function hasNegativeResponse(w: WeekObservation): boolean {
  return w.completion === 'PARTIAL'
    || (w.completion === 'SKIPPED' && w.skipReason !== 'TIME')
    || w.unexpectedDifficulty === 'MUCH_HARDER'
    || w.intoleranceOrPainSignal
    || w.readinessOrToleranceDegraded
    || w.lowAdherence;
}

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  // technical-constant: médiane (indice central de l'effectif trié)
  const mid = Math.floor(s.length / 2);
  const hi = s[mid];
  const lo = s[mid - 1];
  if (hi === undefined) throw new TypeError('médiane d’un ensemble vide');
  // technical-constant: médiane (moyenne des deux valeurs centrales pour un effectif pair)
  return s.length % 2 === 1 || lo === undefined ? hi : (lo + hi) / 2;
}

interface V21 { readonly windowWeeks: number; readonly minKnownWeeks: number; readonly outlierFlagMultipleOfMedian: number }
function readV21(v: unknown): V21 | undefined {
  if (v === null || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const ok = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0;
  if (!ok(o.windowWeeks) || !ok(o.minKnownWeeks) || typeof o.outlierFlagMultipleOfMedian !== 'number' || o.outlierFlagMultipleOfMedian <= 0) return undefined;
  if (o.typicalLevel !== 'MEDIAN' || o.bestTolerated !== 'MAX_WITHOUT_NEGATIVE_RESPONSE') return undefined;
  return { windowWeeks: o.windowWeeks, minKnownWeeks: o.minKnownWeeks, outlierFlagMultipleOfMedian: o.outlierFlagMultipleOfMedian };
}

/**
 * Calcule le contexte d'une dimension. En reprise (`returnStartedAt`), seules les semaines POST-retour
 * sont retenues (POST_RETURN_ONLY) : les semaines d'avant la coupure ne sont pas un niveau démontré actuel.
 */
export function recentLoadContext(dimension: RecentLoadDimension, weeks: readonly WeekObservation[], opts: { readonly returnStartedAt?: string; readonly mode: RunningMode; readonly parameters: readonly RunningParameter[] }): RecentLoadContext {
  const parameterIds = ['running.load.recentLoadContext'];
  const res = resolveParameter(opts.parameters, 'running.load.recentLoadContext', opts.mode);
  const unknown = (flags: RecentLoadFlag[], cause: string, extra: readonly ReasonCode[] = []): RecentLoadContext => ({
    dimension, status: 'UNKNOWN', weeks: [], flags, provisional: true, parameterIds,
    reasons: [...res.reasons, ...extra, runningReasons.emit(RUNNING_CODES.RECENT_LOAD_UNKNOWN, { dimension, cause })],
  });
  if (res.status === 'unresolved') return unknown([], `PARAMETER_${res.cause}`);
  const p = readV21(res.value);
  if (!p) return unknown([], 'PARAMETER_MALFORMED');
  const flags = new Set<RecentLoadFlag>();
  let pool = [...weeks].sort((a, b) => toEpochMs(a.weekStart as ISODateTime) - toEpochMs(b.weekStart as ISODateTime));
  if (opts.returnStartedAt !== undefined) {
    const start = toEpochMs(opts.returnStartedAt as ISODateTime);
    pool = pool.filter((w) => toEpochMs(w.weekStart as ISODateTime) >= start);
    flags.add('POST_RETURN_ONLY');
  }
  const window = pool.slice(-p.windowWeeks);
  const view = window.map((w) => ({ weekStart: w.weekStart, value: w.value, negativeResponse: hasNegativeResponse(w) }));
  const known = window.filter((w): w is WeekObservation & { value: number } => w.value !== null);
  if (window.length < p.windowWeeks || known.length < window.length) flags.add('MISSING_WEEK');
  if (known.some((w) => w.value === 0)) flags.add('ZERO_WEEK');
  if (known.length < p.minKnownWeeks) {
    flags.add('INSUFFICIENT_HISTORY');
    return { ...unknown([...flags].sort() as RecentLoadFlag[], 'INSUFFICIENT_HISTORY'), weeks: view };
  }
  const typicalLevel = median(known.map((w) => w.value));
  if (known.some((w) => w.value > p.outlierFlagMultipleOfMedian * typicalLevel)) flags.add('OUTLIER_WEEK');
  const tolerated = known.filter((w) => !hasNegativeResponse(w)).map((w) => w.value);
  if (tolerated.length === 0) flags.add('NO_TOLERATED_WEEK');
  return {
    dimension, status: 'AVAILABLE', weeks: view, typicalLevel,
    ...(tolerated.length > 0 ? { bestToleratedExposure: Math.max(...tolerated) } : {}),
    flags: [...flags].sort() as RecentLoadFlag[], provisional: true, parameterIds, reasons: [...res.reasons],
  };
}

export const LOAD_CONTEXT_CLASSES = ['WITHIN_RECENT_CONTEXT', 'INCREASE_BEYOND_CONTEXT', 'UNKNOWN_CONTEXT'] as const;
export type LoadContextClass = (typeof LOAD_CONTEXT_CLASSES)[number];

/**
 * Classe une valeur prévue par rapport au contexte (5D §3) : ≤ bestToleratedExposure ⇒ WITHIN ;
 * au-delà ⇒ INCREASE_BEYOND_CONTEXT (évaluée par les règles de progression : V23 non résolu ⇒ HOLD) ;
 * contexte UNKNOWN ou sans semaine tolérée ⇒ UNKNOWN_CONTEXT (aucune progression sur cette dimension).
 */
export function classifyAgainstContext(planned: number, ctx: RecentLoadContext): LoadContextClass {
  if (ctx.status !== 'AVAILABLE' || ctx.bestToleratedExposure === undefined) return 'UNKNOWN_CONTEXT';
  return planned <= ctx.bestToleratedExposure ? 'WITHIN_RECENT_CONTEXT' : 'INCREASE_BEYOND_CONTEXT';
}
