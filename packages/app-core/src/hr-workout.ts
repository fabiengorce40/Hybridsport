/**
 * H2.5 — PROJECTION d'exécution d'une séance HYROX PERSISTÉE pour l'interface : la présentation H2 (façade du
 * planificateur, sans catalogue) déroulée en SÉQUENCE d'étapes (tour × composante), dans l'ordre prescrit. Aucune
 * station choisie, aucune dose calculée, aucune allure, aucune durée de transition : l'interface sait seulement OÙ en
 * est l'athlète et ce qui vient ensuite. Le chrono est une fonction pure du temps écoulé (aucun état par seconde).
 */
import { hyroxPresentationOf } from '@hybridsport/planner';
import type { HyroxComponent, HyroxPresentation } from '@hybridsport/planner';
import type { SessionDraft } from '@hybridsport/domain';
import type { Reason } from './model.js';

export type { HyroxComponent };

export interface HrStep {
  /** Rang dans la séquence (0…n−1). */
  readonly index: number;
  /** Tour (1…rounds) et position dans le tour (1…items). */
  readonly round: number;
  readonly position: number;
  readonly component: HyroxComponent;
  /** Station du catalogue (décision H2 persistée), si connue. */
  readonly stationId: string | null;
}

export interface HrWorkout {
  readonly role: HyroxPresentation['role'];
  readonly specificity: HyroxPresentation['specificity'];
  readonly structure: HyroxPresentation['structure'];
  readonly rounds: number;
  /** Plafond PRESCRIT (jamais une cible). */
  readonly timeCapS: number;
  readonly components: readonly HyroxComponent[];
  readonly steps: readonly HrStep[];
  /** Transitions : nombre connu, durée INCONNUE. */
  readonly transitions: HyroxPresentation['transitions'];
}

/** Stations des composantes, lues dans les décisions H2 PERSISTÉES avec la séance (`H2_STATION_SELECTED`). */
export function hrStationsOf(reasons: readonly Reason[]): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const r of reasons) if (r.code === 'PLAN.HYROX.H2_STATION_SELECTED' && typeof r.params.exerciseId === 'string' && typeof r.params.stationId === 'string') out[r.params.exerciseId] = r.params.stationId;
  return out;
}

/** Projection de la séance ; null si elle n'est pas une séance HYROX H2 intacte (jamais reconstruite). */
export function hrWorkoutOf(session: SessionDraft, archetypeId: string, stations: Readonly<Record<string, string>> = {}): HrWorkout | null {
  const p = hyroxPresentationOf(session, archetypeId);
  if (!p) return null;
  const steps: HrStep[] = [];
  for (let r = 0; r < p.rounds; r += 1) {
    p.components.forEach((component, k) => steps.push({ index: steps.length, round: r + 1, position: k + 1, component, stationId: stations[component.exerciseId] ?? null }));
  }
  return { role: p.role, specificity: p.specificity, structure: p.structure, rounds: p.rounds, timeCapS: p.timeCapS, components: p.components, steps, transitions: p.transitions };
}

/** Où en est l'athlète : étape courante, suivante, tour, séquence terminée. */
export interface HrProgress {
  readonly done: number;
  readonly total: number;
  readonly current: HrStep | null;
  readonly next: HrStep | null;
  readonly round: number;
  readonly finished: boolean;
}
export function hrProgress(w: HrWorkout, stepsCompleted: number): HrProgress {
  const done = Math.max(0, Math.min(stepsCompleted, w.steps.length));
  const current = w.steps[done] ?? null;
  return { done, total: w.steps.length, current, next: w.steps[done + 1] ?? null, round: current?.round ?? w.rounds, finished: done === w.steps.length };
}

/** Chrono face au time cap (fonction pure) : écoulé, restant avant le cap, cap atteint. */
export function hrClock(w: HrWorkout, elapsedS: number): { readonly elapsedS: number; readonly toCapS: number; readonly capReached: boolean } {
  const e = Math.max(0, Math.floor(elapsedS));
  return { elapsedS: e, toCapS: Math.max(0, w.timeCapS - e), capReached: e >= w.timeCapS };
}
