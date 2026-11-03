/**
 * Chantier C — vue « Progression » : lecture PURE des données déjà persistées (séries saisies, séances réalisées,
 * séances planifiées). Aucune écriture, aucun moteur appelé, aucune valeur inventée : une donnée absente reste absente.
 *
 * - Musculation : séries de TRAVAIL réellement faites (journal du programme) rattachées à l'exercice PRESCRIT
 *   (séance persistée, remplacements compris) ; échauffement, retour au calme et séries de montée exclus.
 * - Course : séances réalisées du contrat Running (programme et courses libres), allure SEULEMENT si la distance est
 *   connue et la séance déclarée complète ; régularité hebdomadaire prévue / faite.
 * - HYROX / Cross-training : faits seulement (nombre, dates, durée mesurée) ; aucune progression déduite.
 *
 * Unités : kg, secondes, mètres. Semaines : lundi (AAAA-MM-JJ) et numéro ISO.
 */
import type { AppState } from './model.js';
import { selectProgrammeSession } from './beta0-app.js';
import { selectFieldHistory } from './field.js';
import { addDays, dateOf, weekStartOf } from './dates.js';

export interface StrengthSessionPoint {
  readonly requestId: string;
  readonly date: string;
  /** Charge la plus lourde des séries de travail faites (kg) ; absente si aucune charge saisie. */
  readonly topLoadKg?: number;
  readonly bestReps: number;
  readonly setsDone: number;
  /** Somme répétitions × charge des séries de travail faites (kg). */
  readonly volumeKg: number;
}

export interface StrengthExerciseProgress {
  readonly exerciseId: string;
  /** Exercice principal : track d'ancrage, ancre déclarée/candidate ou bloc principal de la séance. */
  readonly main: boolean;
  readonly sessions: readonly StrengthSessionPoint[];
  readonly trend: { readonly sessions: number; readonly firstTopLoadKg?: number; readonly lastTopLoadKg?: number; readonly deltaKg?: number };
}

export interface WeekTotals {
  readonly weekStart: string;
  readonly isoWeek: number;
  readonly setsDone: number;
  readonly volumeKg: number;
}

export interface RunPoint {
  readonly sessionId: string;
  readonly date: string;
  readonly source: 'programme' | 'free';
  readonly durationS: number;
  readonly distanceM?: number;
  /** Allure (s/km) : uniquement distance connue > 0 ET séance complète. */
  readonly paceSPerKm?: number;
  readonly complete: boolean;
}

export interface RunWeek {
  readonly weekStart: string;
  readonly isoWeek: number;
  /** Séances de course planifiées dans la semaine ; null si aucune semaine planifiée connue. */
  readonly planned: number | null;
  readonly done: number;
}

export interface SimpleSportProgress {
  readonly sessionsDone: number;
  /** Somme des durées mesurées (s) ; null si aucune durée enregistrée. */
  readonly totalDurationS: number | null;
  readonly sessions: readonly { readonly id: string; readonly date: string; readonly durationS?: number }[];
}

export interface ProgressView {
  readonly empty: boolean;
  readonly strength: { readonly exercises: readonly StrengthExerciseProgress[]; readonly weeks: readonly WeekTotals[] };
  readonly running: { readonly sessions: readonly RunPoint[]; readonly weeks: readonly RunWeek[] };
  readonly hyrox: SimpleSportProgress;
  readonly crosstraining: SimpleSportProgress;
}

export interface ProgressViewOptions {
  /** Jour courant : les semaines postérieures à sa semaine ne sont pas listées (régularité). */
  readonly today?: string;
}

// technical-constant: mètres par kilomètre (conversion d'unité)
const M_PER_KM = 1000;
// technical-constant: calendrier — jeudi (lundi + 3) détermine l'année de la semaine ISO
const THURSDAY_OFFSET_DAYS = 3;
// technical-constant: millisecondes par semaine (calendrier)
const MS_PER_WEEK = 604_800_000;
// technical-constant: longueur de l'année AAAA
const YEAR_LEN = 4;

const byDate = <T extends { readonly date: string }>(a: T, b: T): number => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

/** Numéro de semaine ISO 8601 d'une date (semaine du jeudi). */
export function isoWeekNumber(date: string): number {
  const thursday = addDays(weekStartOf(date), THURSDAY_OFFSET_DAYS);
  const jan1 = Date.parse(`${thursday.slice(0, YEAR_LEN)}-01-01T00:00:00Z`);
  return Math.floor((Date.parse(`${thursday}T00:00:00Z`) - jan1) / MS_PER_WEEK) + 1;
}

// technical-constant: arrondi d'affichage au millième (évite les résidus flottants des sommes)
const ROUND_FACTOR = 1000;
const round = (x: number): number => Math.round(x * ROUND_FACTOR) / ROUND_FACTOR;

function strengthView(state: AppState, history: ReturnType<typeof selectFieldHistory>): ProgressView['strength'] {
  const anchors = new Set(state.strength.tracks.filter((t) => t.tier === 'anchor').flatMap((t) => [t.trackId, t.exerciseId]));
  const perExercise = new Map<string, { main: boolean; sessions: StrengthSessionPoint[] }>();
  const weeks = new Map<string, { setsDone: number; volumeKg: number }>();
  const entries = history.filter((e) => e.sport === 'strength' && e.completion !== 'missed').slice().sort(byDate);
  for (const e of entries) {
    const session = selectProgrammeSession(state, e.requestId)?.session;
    if (!session) continue;
    const perItem = new Map<string, { exerciseId: string; main: boolean; sets: { reps: number; loadKg?: number }[] }>();
    for (const block of session.blocks) {
      if (block.kind === 'warmup' || block.kind === 'cooldown') continue;
      for (const item of block.items) {
        if (item.prescription.type !== 'sets') continue;
        const prescribed = item.prescription.sets;
        const done = e.sets.filter((l) => l.itemId === item.id && l.done && prescribed[l.setIndex] !== undefined && prescribed[l.setIndex]?.kind !== 'rampup');
        if (done.length === 0) continue;
        const main = block.role === 'primary' || item.refs?.anchor !== undefined || anchors.has(item.exerciseId) || (item.refs?.progressionTrackId !== undefined && anchors.has(item.refs.progressionTrackId));
        const prev = perItem.get(item.id);
        perItem.set(item.id, { exerciseId: item.exerciseId, main: main || (prev?.main ?? false), sets: [...(prev?.sets ?? []), ...done.map((l) => ({ reps: l.reps ?? 0, ...(l.loadKg !== undefined && l.loadKg > 0 ? { loadKg: l.loadKg } : {}) }))] });
      }
    }
    // Un même exercice présent dans plusieurs items d'une séance : un seul point pour la séance.
    const perEx = new Map<string, { main: boolean; sets: { reps: number; loadKg?: number }[] }>();
    for (const x of perItem.values()) {
      const prev = perEx.get(x.exerciseId);
      perEx.set(x.exerciseId, { main: x.main || (prev?.main ?? false), sets: [...(prev?.sets ?? []), ...x.sets] });
    }
    const wk = weekStartOf(e.date);
    const wTotals = weeks.get(wk) ?? { setsDone: 0, volumeKg: 0 };
    for (const [exerciseId, x] of perEx) {
      const loads = x.sets.flatMap((s) => (s.loadKg !== undefined ? [s.loadKg] : []));
      const volumeKg = round(x.sets.reduce((n, s) => n + s.reps * (s.loadKg ?? 0), 0));
      const point: StrengthSessionPoint = {
        requestId: e.requestId, date: e.date, ...(loads.length > 0 ? { topLoadKg: Math.max(...loads) } : {}),
        bestReps: Math.max(0, ...x.sets.map((s) => s.reps)), setsDone: x.sets.length, volumeKg,
      };
      const ex = perExercise.get(exerciseId) ?? { main: false, sessions: [] };
      perExercise.set(exerciseId, { main: ex.main || x.main, sessions: [...ex.sessions, point] });
      wTotals.setsDone += point.setsDone;
      wTotals.volumeKg = round(wTotals.volumeKg + volumeKg);
    }
    if (perEx.size > 0) weeks.set(wk, wTotals);
  }
  const exercises = [...perExercise].map(([exerciseId, x]): StrengthExerciseProgress => {
    const loaded = x.sessions.filter((s) => s.topLoadKg !== undefined);
    const firstTop = loaded[0]?.topLoadKg;
    const lastTop = loaded[loaded.length - 1]?.topLoadKg;
    return {
      exerciseId, main: x.main, sessions: x.sessions,
      trend: { sessions: x.sessions.length, ...(firstTop !== undefined ? { firstTopLoadKg: firstTop } : {}), ...(lastTop !== undefined ? { lastTopLoadKg: lastTop } : {}), ...(firstTop !== undefined && lastTop !== undefined && loaded.length > 1 ? { deltaKg: round(lastTop - firstTop) } : {}) },
    };
  }).sort((a, b) => (a.main !== b.main ? (a.main ? -1 : 1) : b.sessions.length - a.sessions.length || a.exerciseId.localeCompare(b.exerciseId)));
  return {
    exercises,
    weeks: [...weeks].map(([weekStart, t]) => ({ weekStart, isoWeek: isoWeekNumber(weekStart), ...t })).sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1)),
  };
}

function runningView(state: AppState, options: ProgressViewOptions): ProgressView['running'] {
  const requests = Object.values(state.planner.weeks).flatMap((w) => w.requests);
  const plannedDate = new Map(requests.flatMap((r) => (r.sport === 'running' && r.date ? [[r.requestId, r.date] as const] : [])));
  const sessions = state.running.realized
    // Course d'onboarding sans date réelle et séances non faites : jamais une séance de la période.
    .filter((r) => r.completion !== 'SKIPPED' && state.running.freeRunMeta?.[r.sessionId]?.dateUnknown !== true)
    .map((r): RunPoint => {
      const free = r.sessionId.startsWith('free:');
      const complete = r.completion === 'COMPLETED';
      const distanceM = r.distanceM !== undefined && r.distanceM > 0 ? r.distanceM : undefined;
      return {
        sessionId: r.sessionId, date: (free ? undefined : plannedDate.get(r.sessionId)) ?? dateOf(r.completedAt), source: free ? 'free' : 'programme',
        durationS: r.realizedDurationS, ...(distanceM !== undefined ? { distanceM } : {}),
        ...(distanceM !== undefined && complete ? { paceSPerKm: round((r.realizedDurationS * M_PER_KM) / distanceM) } : {}), complete,
      };
    })
    .sort((a, b) => byDate(a, b) || a.sessionId.localeCompare(b.sessionId));
  const plannedWeeks = new Set(Object.values(state.planner.weeks).map((w) => w.weekStart));
  const plannedPerWeek = new Map<string, number>();
  for (const r of requests) if (r.sport === 'running' && r.status === 'planned' && r.date) plannedPerWeek.set(weekStartOf(r.date), (plannedPerWeek.get(weekStartOf(r.date)) ?? 0) + 1);
  const donePerWeek = new Map<string, number>();
  for (const s of sessions) donePerWeek.set(weekStartOf(s.date), (donePerWeek.get(weekStartOf(s.date)) ?? 0) + 1);
  const limit = options.today !== undefined ? weekStartOf(options.today) : undefined;
  const weekKeys = [...new Set([...plannedPerWeek.keys(), ...donePerWeek.keys()])].filter((w) => limit === undefined || w <= limit).sort();
  return {
    sessions,
    weeks: weekKeys.map((weekStart) => ({ weekStart, isoWeek: isoWeekNumber(weekStart), planned: plannedWeeks.has(weekStart) ? (plannedPerWeek.get(weekStart) ?? 0) : null, done: donePerWeek.get(weekStart) ?? 0 })),
  };
}

function simpleView(state: AppState, history: ReturnType<typeof selectFieldHistory>, sport: 'hyrox' | 'crosstraining'): SimpleSportProgress {
  type Row = SimpleSportProgress['sessions'][number];
  const fromHistory = history.filter((e) => e.sport === sport && e.completion !== 'missed').map((e): Row => {
    const measured = e.durationS ?? (sport === 'hyrox' ? e.hr?.elapsedS : e.ct?.elapsedS) ?? null;
    return { id: e.requestId, date: e.date, ...(measured !== null && measured > 0 ? { durationS: measured } : {}) };
  });
  // Réalisations hors programme (ancien chemin) : date seule, aucune durée supposée.
  const known = new Set(fromHistory.map((x) => x.id));
  const extra = state[sport].realized.flatMap((r) => (typeof r.sessionId === 'string' && !known.has(r.sessionId) && typeof r.completedAt === 'string' && r.completion !== 'missed' ? [{ id: r.sessionId, date: dateOf(r.completedAt) } satisfies Row] : []));
  const sessions: Row[] = [...fromHistory, ...extra].sort((a, b) => byDate(a, b) || a.id.localeCompare(b.id));
  const durations = sessions.flatMap((s) => (s.durationS !== undefined ? [s.durationS] : []));
  return { sessionsDone: sessions.length, totalDurationS: durations.length > 0 ? durations.reduce((n, d) => n + d, 0) : null, sessions };
}

/** Vue Progression (lecture seule, déterministe) : voir l'en-tête du module. */
export function progressView(state: AppState, options: ProgressViewOptions = {}): ProgressView {
  const history = selectFieldHistory(state);
  const strength = strengthView(state, history);
  const running = runningView(state, options);
  const hyrox = simpleView(state, history, 'hyrox');
  const crosstraining = simpleView(state, history, 'crosstraining');
  return { empty: strength.exercises.length === 0 && running.sessions.length === 0 && hyrox.sessionsDone === 0 && crosstraining.sessionsDone === 0, strength, running, hyrox, crosstraining };
}
