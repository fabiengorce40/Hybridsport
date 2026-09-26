import { decideReplacement } from '../../src/index.js';
import type { EvaluatedCandidate, HysteresisThresholds, Tolerances } from '../../src/index.js';

/** Événement d'un parcours adversarial : produit une proposition de plan à partir de l'état courant. */
export interface JourneyEvent<S> { readonly name: string; apply(state: S): { readonly state: S; readonly proposal: EvaluatedCandidate } }

export interface JourneyResult {
  readonly changes: number;
  readonly events: number;
  readonly oscillations: number;
  readonly history: readonly string[];
}

/**
 * Exécute un parcours adversarial (spec 11 §8 bis) : chaque événement produit une proposition, la
 * couche C (hystérésis) décide KEEP ou CHANGE. Mesures : changements, oscillations (A → B → A).
 */
export function runJourney<S>(initial: { state: S; plan: EvaluatedCandidate }, events: readonly JourneyEvent<S>[], eps: Tolerances, hyst: HysteresisThresholds): JourneyResult {
  let { state, plan } = initial;
  const history = [plan.id];
  let changes = 0;
  for (const ev of events) {
    const next = ev.apply(state);
    state = next.state;
    if (decideReplacement(plan, next.proposal, eps, hyst).decision === 'CHANGE') {
      plan = next.proposal;
      changes++;
      history.push(plan.id);
    }
  }
  let oscillations = 0;
  for (let i = 2; i < history.length; i++) if (history[i] === history[i - 2]) oscillations++;
  return { changes, events: events.length, oscillations, history };
}
