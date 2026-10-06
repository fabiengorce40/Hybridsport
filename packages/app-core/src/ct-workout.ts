/**
 * C3.5 — PROJECTION d'exécution d'une séance Cross-training PERSISTÉE (session_record) pour l'interface : dérivée,
 * sans perte, sans réinterprétation. Format, tours, time cap, minutes, travail / repos et doses viennent tels quels
 * de la prescription du moteur (unités natives : répétitions, mètres, calories, secondes, kg) ; aucune conversion,
 * aucun rythme cible inventé. Le chrono est une fonction pure du temps écoulé (aucun état par seconde).
 */
import type { SessionDraft } from '@hybridsport/domain';

// technical-constant: une minute = 60 s (définition de l'EMOM et de l'affichage)
const SECONDS_PER_MINUTE = 60;

export type CtWorkoutFormat = 'continuous' | 'intervals' | 'emom' | 'amrap' | 'for_time';

export interface CtWorkoutItem {
  readonly itemId: string;
  readonly exerciseId: string;
  readonly quantity: { readonly kind: 'reps' | 'calories' | 'distance_m' | 'duration_s'; readonly value: number };
  /** Charge PRESCRITE (kg), si la séance en porte une. */
  readonly loadKg?: number;
}

export interface CtWorkout {
  readonly format: CtWorkoutFormat;
  readonly items: readonly CtWorkoutItem[];
  /** Durée prescrite du bloc (s) : continu, intervalles, EMOM, AMRAP ; time cap pour for time. */
  readonly totalS: number;
  readonly rounds?: number;
  readonly minutes?: number;
  readonly workS?: number;
  readonly restS?: number;
  readonly timeCapS?: number;
}

/** Projection de la séance ; null si elle n'est pas une séance Cross-training C3 lisible (jamais reconstruite). */
export function ctWorkoutOf(session: SessionDraft): CtWorkout | null {
  const blocks = session.blocks.filter((b) => b.kind === 'conditioning');
  const b = blocks[0];
  if (blocks.length !== 1 || !b || b.items.length === 0) return null;
  const items: CtWorkoutItem[] = [];
  for (const it of b.items) {
    const p = it.prescription;
    const load = 'load' in p && p.load ? { loadKg: p.load.kg } : {};
    if (p.type === 'reps') items.push({ itemId: it.id, exerciseId: it.exerciseId, quantity: { kind: 'reps', value: p.reps }, ...load });
    else if (p.type === 'calories') items.push({ itemId: it.id, exerciseId: it.exerciseId, quantity: { kind: 'calories', value: p.calories }, ...load });
    else if (p.type === 'distance') items.push({ itemId: it.id, exerciseId: it.exerciseId, quantity: { kind: 'distance_m', value: p.distanceM }, ...load });
    else if (p.type === 'timed') items.push({ itemId: it.id, exerciseId: it.exerciseId, quantity: { kind: 'duration_s', value: p.workS }, ...load });
    else return null;
  }
  switch (b.format) {
    case 'emom': return { format: 'emom', items, minutes: b.minutes, totalS: b.minutes * SECONDS_PER_MINUTE };
    case 'amrap': return { format: 'amrap', items, totalS: b.timeCapS };
    case 'for_time': return { format: 'for_time', items, rounds: b.rounds, timeCapS: b.timeCapS, totalS: b.timeCapS };
    case 'continuous': {
      const p = b.items[0]?.prescription;
      if (b.items.length !== 1 || p?.type !== 'timed') return null;
      if (p.rounds > 1) return { format: 'intervals', items, rounds: p.rounds, workS: p.workS, restS: p.restS, totalS: p.rounds * p.workS + (p.rounds - 1) * p.restS };
      return { format: 'continuous', items, workS: p.workS, totalS: p.workS };
    }
    default: return null;
  }
}

/** État du chrono à un temps écoulé donné (fonction pure). */
export interface CtClockState {
  /** Temps écoulé (s) et restant sur la durée prescrite / le time cap (jamais négatif). */
  readonly elapsedS: number;
  readonly remainingS: number;
  /** Durée prescrite (ou time cap) atteinte. */
  readonly over: boolean;
  /** Intervalles : phase, numéro d'intervalle (1…n), restant dans la phase, intervalles de travail ACHEVÉS. */
  readonly phase?: 'work' | 'rest';
  readonly round?: number;
  readonly phaseRemainingS?: number;
  readonly completedIntervals?: number;
  /** EMOM : minute en cours (1…n), restant dans la minute, minutes ACHEVÉES. */
  readonly minute?: number;
  readonly minuteRemainingS?: number;
  readonly completedMinutes?: number;
}

export function ctClock(w: CtWorkout, elapsedS: number): CtClockState {
  const e = Math.max(0, Math.floor(elapsedS));
  const base = { elapsedS: e, remainingS: Math.max(0, w.totalS - e), over: e >= w.totalS };
  if (w.format === 'intervals' && w.workS !== undefined && w.restS !== undefined && w.rounds !== undefined) {
    const cycle = w.workS + w.restS;
    const idx = Math.min(Math.floor(e / cycle), w.rounds - 1);
    const within = e - idx * cycle;
    const work = within < w.workS || idx === w.rounds - 1;
    const completedIntervals = Math.min(w.rounds, Math.floor(e / cycle) + (e - Math.floor(e / cycle) * cycle >= w.workS ? 1 : 0));
    return { ...base, phase: work ? 'work' : 'rest', round: idx + 1, phaseRemainingS: Math.max(0, work ? w.workS - within : cycle - within), completedIntervals };
  }
  if (w.format === 'emom' && w.minutes !== undefined) {
    const minute = Math.min(Math.floor(e / SECONDS_PER_MINUTE) + 1, w.minutes);
    return { ...base, minute, minuteRemainingS: base.over ? 0 : SECONDS_PER_MINUTE - (e % SECONDS_PER_MINUTE), completedMinutes: Math.min(w.minutes, Math.floor(e / SECONDS_PER_MINUTE)) };
  }
  return base;
}
