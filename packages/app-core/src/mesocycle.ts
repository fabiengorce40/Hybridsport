/**
 * RC5.3 R3 — MÉSOCYCLE de Musculation : semaines écoulées depuis l'ANCRE (première semaine planifiée avec un contenu à
 * mésocycles, persistée) modulo la durée du cycle. Durée : réglage de l'utilisateur s'il est dans les bornes du contenu, sinon durée du contenu pour son niveau.
 * Dernière semaine du cycle = décharge. Sans la politique `mesocycle` du contenu : aucun cycle (comportement antérieur).
 */
import { weekStartAt } from '@hybridsport/programme';
import { addDays, daysBetween } from './dates.js';
import type { StrengthParams } from '@hybridsport/strength';
import type { AppState } from './model.js';

/** Durées proposées au réglage utilisateur (semaines) ; « selon le niveau » si aucune n'est choisie. */
// technical-constant: réglage utilisateur de la durée de mésocycle (décision RC5.3 du 2026-10-25 : 4 à 6 semaines)
export const MESOCYCLE_WEEK_CHOICES = [4, 5, 6] as const;

// technical-constant: jours par semaine (calendrier)
const DAYS_PER_WEEK = 7;

export interface MesocyclePosition {
  /** Durée du cycle (semaines) et origine de cette durée. */
  readonly length: number;
  readonly source: 'user' | 'level';
  /** Index du cycle (0 = premier), position dans le cycle (0 = première semaine). */
  readonly cycle: number;
  readonly position: number;
  readonly deload: boolean;
  /** Lundi de la première semaine du cycle. */
  readonly cycleStart: string;
}

export function mesocycleAt(state: AppState, date: string, params: StrengthParams): MesocyclePosition | undefined {
  const pol = params['strength.progression.policy']?.mesocycle;
  const p = state.profile;
  if (!pol || !p) return undefined;
  const user = p.strength.mesocycleWeeks;
  const fromUser = user !== undefined && user >= pol.userRange.min && user <= pol.userRange.max;
  const length = fromUser ? user : pol.lengths[p.level];
  const anchor = state.strength.mesocycleStartWeek;
  if (length === undefined || anchor === undefined) return undefined;
  const week = Math.floor(daysBetween(anchor, date) / DAYS_PER_WEEK);
  if (week < 0) return undefined;
  const cycle = Math.floor(week / length);
  const position = week % length;
  return { length, source: fromUser ? 'user' : 'level', cycle, position, deload: position === length - 1, cycleStart: addDays(anchor, cycle * length * DAYS_PER_WEEK) };
}

/**
 * RC5.3 R3 — ancre posée à la planification d'une NOUVELLE semaine, si le contenu courant déclare des mésocycles et
 * qu'aucune ancre n'existe : cette semaine devient la première du premier cycle.
 */
export function withMesocycleAnchor(state: AppState, weekIndex: number, params: StrengthParams): AppState {
  const ps = state.programmeState;
  if (!ps || state.strength.mesocycleStartWeek !== undefined || !params['strength.progression.policy']?.mesocycle || !state.profile?.strength.enabled) return state;
  return { ...state, strength: { ...state.strength, mesocycleStartWeek: weekStartAt(ps, weekIndex) } };
}
