/** Lectures dérivées de l'état pour l'affichage (aucune décision sportive). */
import { addDays, weekStartOf } from '@hybridsport/app-core';
import type { AppState, GeneratedSession, PlanEntry } from '@hybridsport/app-core';

export interface DayView { readonly date: string; readonly entry?: PlanEntry; readonly session?: GeneratedSession; readonly done: boolean; readonly started: boolean }

export function weekView(state: AppState, today: string): { weekStart: string; days: DayView[] } {
  const weekStart = weekStartOf(today);
  const plan = state.plans[weekStart];
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => {
    const entry = plan?.entries.find((e) => e.date === date);
    const session = entry ? state.sessions[entry.key] : undefined;
    const log = entry ? state.logs[entry.key] : undefined;
    return { date, ...(entry ? { entry } : {}), ...(session ? { session } : {}), done: log?.finishedAt !== undefined, started: log !== undefined && log.finishedAt === undefined };
  });
  return { weekStart, days };
}

/** Séance recommandée : séance en cours, sinon la prochaine séance disponible à partir d'aujourd'hui. */
export function recommended(state: AppState, today: string): DayView | undefined {
  const { days } = weekView(state, today);
  return days.find((d) => d.started) ?? days.find((d) => d.date >= today && !d.done && d.session?.outcome.status === 'ok');
}

export function completedSessions(state: AppState): { key: string; session: GeneratedSession; finishedAt: string }[] {
  return Object.values(state.logs).flatMap((l) => {
    const s = state.sessions[l.key];
    return l.finishedAt && s ? [{ key: l.key, session: s, finishedAt: l.finishedAt }] : [];
  }).sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1));
}

export function weekStats(state: AppState, today: string): { done: number; planned: number; minutes: number; sets: number } {
  const { days } = weekView(state, today);
  const planned = days.filter((d) => d.session?.outcome.status === 'ok').length;
  let minutes = 0;
  let sets = 0;
  for (const d of days.filter((x) => x.done && x.entry)) {
    const log = state.logs[d.entry?.key ?? ''];
    if (!log) continue;
    sets += log.sets.filter((x) => x.done).length;
    if (log.run) minutes += log.run.realizedDurationS / 60;
    else if (log.finishedAt) minutes += (Date.parse(log.finishedAt) - Date.parse(log.startedAt)) / 60_000;
  }
  return { done: days.filter((d) => d.done).length, planned, minutes: Math.round(minutes), sets };
}
