/**
 * RC5.4 — RAPPORT des durées de séance Musculation : durée PRÉVUE (p50 du CORE de la séance exécutée) et durée RÉELLE
 * (temps actif du chronomètre global, pauses manuelles exclues), séance par séance, et synthèse. Observation seulement :
 * aucun moteur ne lit ce rapport, aucun repos ni aucune estimation n'est modifié. Les séances terminées avant RC5.4
 * n'ont qu'une durée d'horloge (début → fin) : listées comme « non mesurées », hors synthèse.
 */
import { prescribedArchetype } from './beta0.js';
import { dateOf } from './dates.js';
import type { AppState } from './model.js';

// technical-constant: millisecondes par seconde
const MS_PER_S = 1000;
// technical-constant: tolérance d'affichage « conforme à la prévision » (± 15 %), observation seulement
export const DURATION_ON_TARGET = 0.15;

export interface DurationRow {
  readonly requestId: string;
  readonly date: string;
  readonly archetypeId: string | null;
  readonly completion: 'completed_as_prescribed' | 'modified' | 'abandoned';
  /** `chrono` : temps actif mesuré (RC5.4) ; `wall` : horloge début → fin (séance antérieure, pauses comprises). */
  readonly source: 'chrono' | 'wall';
  readonly plannedS: number | null;
  readonly actualS: number;
  readonly pausedS: number | null;
  /** Écart réel − prévu (s) et rapport réel / prévu ; null sans durée prévue. */
  readonly deltaS: number | null;
  readonly ratio: number | null;
}

export interface DurationReport {
  readonly rows: readonly DurationRow[];
  /** Synthèse sur les séances MESURÉES, complètes ou adaptées (arrêtées exclues), avec une durée prévue. */
  readonly summary: { readonly sessions: number; readonly meanRatio: number | null; readonly medianDeltaS: number | null; readonly onTarget: number };
}

// technical-constant: moitié d'une série (médiane)
const HALF = 2;
const median = (xs: readonly number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / HALF);
  return s.length % HALF === 1 ? (s[m] ?? null) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / HALF;
};

export function strengthDurationReport(state: AppState): DurationReport {
  const requests = new Map(Object.values(state.planner.weeks).flatMap((w) => w.requests.map((r) => [r.requestId, r] as const)));
  const rows = Object.values(state.programmeLogs).flatMap((l): DurationRow[] => {
    if (l.sport !== 'strength' || !l.finishedAt || !l.outcome) return [];
    const r = requests.get(l.requestId);
    const plannedS = l.timing?.plannedS ?? null;
    const actualS = l.timing?.activeS ?? Math.max(0, Math.round((Date.parse(l.finishedAt) - Date.parse(l.startedAt)) / MS_PER_S));
    return [{
      requestId: l.requestId, date: r?.status === 'planned' && r.date ? r.date : dateOf(l.startedAt), archetypeId: r ? prescribedArchetype(r).archetypeId : null,
      completion: l.outcome.completion, source: l.timing ? 'chrono' : 'wall', plannedS, actualS, pausedS: l.timing?.pausedS ?? null,
      deltaS: plannedS !== null ? actualS - plannedS : null, ratio: plannedS !== null && plannedS > 0 ? actualS / plannedS : null,
    }];
  }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.requestId.localeCompare(a.requestId)));
  const measured = rows.filter((x) => x.source === 'chrono' && x.completion !== 'abandoned' && x.ratio !== null);
  const ratios = measured.map((x) => x.ratio ?? 0);
  return {
    rows,
    summary: {
      sessions: measured.length,
      meanRatio: ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null,
      medianDeltaS: median(measured.map((x) => x.deltaS ?? 0)),
      onTarget: measured.filter((x) => Math.abs((x.ratio ?? 0) - 1) <= DURATION_ON_TARGET).length,
    },
  };
}
