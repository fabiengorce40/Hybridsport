/**
 * Passerelle UNIQUE d'écriture des semaines planifiées persistées (`planner.weeks`) et garde de sécurité commune.
 *
 * Invariants (Beta 0) :
 * - une douleur active suspend TOUTE planification, quel que soit le chemin (V0 : séances indisponibles ; multisport et
 *   programme : refus) — même prédicat partout (`activePainPause`), aucun seuil ;
 * - une semaine n'a qu'UN propriétaire (`programme` ou `multisport`) ; le chemin multisport ne remplace jamais une
 *   semaine du programme ;
 * - une semaine COMMENCÉE (au moins une exécution enregistrée) ou CLÔTURÉE n'est jamais remplacée : refus fail-closed,
 *   aucune fusion implicite ; seule une semaine inexistante ou planifiée sans exécution peut être (re)planifiée.
 */
import type { AppState, PersistedWeek, Reason } from './model.js';
import { AppError } from './errors.js';

export const WEEK_OWNERS = ['programme', 'multisport'] as const;
export type WeekOwner = (typeof WEEK_OWNERS)[number];
export type PlannedWeekStatus = 'absent' | 'planned' | 'started' | 'closed';

/** Douleur active : suspension de la planification (règle G1 fail-closed existante, identique sur tous les chemins). */
export function activePainPause(state: AppState): Reason | null {
  const p = state.safety.activePain;
  return p ? { code: 'KAIRO.SAFETY_PAUSE_ACTIVE_PAIN', params: { reportedAt: p.reportedAt } } : null;
}

/** Erreur structurée (code + raisons) des écritures de semaine refusées. */
export class WeekWriteError extends AppError {
  constructor(code: string, readonly reasons: readonly Reason[]) { super(code); }
}

/** Garde commune des chemins multisport et programme. */
export function assertPlanningAllowed(state: AppState): void {
  const pause = activePainPause(state);
  if (pause) throw new WeekWriteError('SAFETY_PAUSE_ACTIVE_PAIN', [pause]);
}

/** État d'une semaine persistée : exécutions et clôture lues dans l'état du programme (aucune autre source). */
export function plannedWeekStatus(state: AppState, weekStart: string): PlannedWeekStatus {
  const w = state.planner.weeks[weekStart];
  if (!w) return 'absent';
  const pw = state.programmeState?.weeks.find((x) => x.plannerRef === weekStart);
  if (pw?.closedAt) return 'closed';
  const ids = new Set(w.requests.map((r) => r.requestId));
  if ((state.programmeState?.results ?? []).some((r) => ids.has(r.requestId))) return 'started';
  return 'planned';
}

/** Écrit (ou remplace) une semaine, sous les invariants ci-dessus ; sinon refus explicite, état inchangé. */
export function writePlannedWeek(state: AppState, week: Omit<PersistedWeek, 'owner'>, owner: WeekOwner): AppState {
  const status = plannedWeekStatus(state, week.weekStart);
  const current = state.planner.weeks[week.weekStart];
  if (status === 'started' || status === 'closed') throw new WeekWriteError('WEEK_NOT_REPLACEABLE', [{ code: 'KAIRO.WEEK_NOT_REPLACEABLE', params: { weekStart: week.weekStart, status } }]);
  if (current && current.owner !== owner && current.owner === 'programme') throw new WeekWriteError('WEEK_OWNED_BY_PROGRAMME', [{ code: 'KAIRO.WEEK_OWNED_BY_PROGRAMME', params: { weekStart: week.weekStart, owner } }]);
  return { ...state, planner: { weeks: { ...state.planner.weeks, [week.weekStart]: { ...week, owner } } } };
}
