import { canonicalStringify, SeededRng, runCorePipeline } from '../../src/index.js';
import type { CorePipelineOutcome, CorePipelineRequest, EngineContext, LoadedCatalog, LoadedRuleset } from '../../src/index.js';

export interface WeekRecord { readonly week: number; readonly request: CorePipelineRequest; readonly outcome: CorePipelineOutcome }

/** Détecteur de dérive : examine la chronologie complète et renvoie les anomalies (vide si RAS). */
export interface DriftDetector { readonly id: string; detect(timeline: readonly WeekRecord[]): string[] }

export interface LongitudinalConfig {
  readonly weeks: number;
  readonly seed: string;
  readonly context: (seed: string) => EngineContext<LoadedRuleset, LoadedCatalog>;
  /** Requête de la semaine (profil, état, candidats) : trajectoire et comportements simulés. */
  readonly weekRequest: (week: number, rng: SeededRng, previous: readonly WeekRecord[]) => CorePipelineRequest;
  readonly detectors: readonly DriftDetector[];
}

export interface LongitudinalResult { readonly timeline: readonly WeekRecord[]; readonly anomalies: Readonly<Record<string, string[]>>; readonly fingerprint: string }

/**
 * Simulateur longitudinal (spec 11 §8) : exécute le pipeline CORE semaine après semaine avec une graine
 * par semaine, puis applique les détecteurs. L'empreinte permet de prouver le déterminisme d'une année.
 */
export function runLongitudinal(cfg: LongitudinalConfig): LongitudinalResult {
  const timeline: WeekRecord[] = [];
  const root = SeededRng.fromSeed(cfg.seed);
  for (let week = 1; week <= cfg.weeks; week++) {
    const request = cfg.weekRequest(week, root.fork(`week-${week}`), timeline);
    timeline.push({ week, request, outcome: runCorePipeline(request, cfg.context(`${cfg.seed}/w${week}`)) });
  }
  const anomalies = Object.fromEntries(cfg.detectors.map((d) => [d.id, d.detect(timeline)]));
  return { timeline, anomalies, fingerprint: canonicalStringify(timeline.map((t) => t.outcome)) };
}
