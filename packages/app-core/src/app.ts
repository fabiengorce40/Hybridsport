/**
 * Façade applicative de KAIRO V0 : transitions PURES de l'état (l'instant courant et la date du jour sont
 * toujours injectés). L'interface n'appelle que ces fonctions ; elle ne décide rien de sportif.
 */
import { zFingerprintHistoryEntry } from '@hybridsport/domain';
import { normalizeInstant, weekStartOf } from './dates.js';
import { generateSession, isStale } from './generate.js';
import type { AppState, Feedback, GeneratedSession, PlanEntry, ProfileInput, SessionLog, SetLog } from './model.js';
import { zFeedback, zProfile } from './model.js';
import { planWeek } from './planner.js';
import { applyCompletion } from './progression.js';
import { applyMissedRuns, composeRunningDays } from './running-week.js';

export interface Clock {
  /** Instant courant ISO (injecté). */
  readonly now: string;
  /** Date civile locale du jour (AAAA-MM-JJ). */
  readonly today: string;
}

export { AppError } from './errors.js';
import { AppError } from './errors.js';

const lockedOf = (state: AppState, entries: readonly PlanEntry[]): PlanEntry[] => entries.filter((e) => state.logs[e.key] !== undefined);

/** (Re)planifie la semaine contenant `today` : les séances commencées ou terminées sont conservées (P5). */
export function replanWeek(state: AppState, clock: Clock, weekStart = weekStartOf(clock.today)): AppState {
  if (!state.profile) throw new AppError('PROFILE_MISSING');
  const prev = state.plans[weekStart];
  // Jours de course : archétypes choisis ensuite par le moteur Course (composition §R, dans refreshSessions).
  const plan = { ...planWeek({ profile: state.profile, weekStart, locked: lockedOf(state, prev?.entries ?? []), plannedAt: normalizeInstant(clock.now) }), dropped: prev?.dropped ?? [] };
  // Les séances non commencées de la semaine sont retirées puis régénérées avec le profil courant :
  // aucune séance orpheline, aucun doublon, aucune séance commencée modifiée.
  const dropped = new Set((prev?.entries ?? []).map((e) => e.key).filter((k) => state.logs[k] === undefined));
  const sessions = Object.fromEntries(Object.entries(state.sessions).filter(([k]) => !dropped.has(k)));
  return refreshSessions({ ...state, plans: { ...state.plans, [weekStart]: plan }, sessions }, clock, weekStart);
}

/** Génère les séances manquantes ou périmées de la semaine (jamais une séance commencée ou passée). */
export function refreshSessions(state: AppState, clock: Clock, weekStart = weekStartOf(clock.today)): AppState {
  const before = state.plans[weekStart];
  if (!before) return state;
  // Historique modifié depuis la dernière composition Course : les jours de course restants sont recomposés (§R).
  const plan = before.runningRevision === state.revision ? before : composeRunningDays(state, before, normalizeInstant(clock.now), clock.today);
  const changed = new Set(plan.entries.filter((e) => before.entries.find((b) => b.key === e.key)?.archetypeId !== e.archetypeId).map((e) => e.key));
  let s: AppState = plan === before ? state : { ...state, plans: { ...state.plans, [weekStart]: plan }, sessions: Object.fromEntries(Object.entries(state.sessions).filter(([k]) => !changed.has(k))) };
  // Ordre chronologique : chaque génération voit les séances de la semaine déjà générées (contexte de semaine).
  for (const e of plan.entries) {
    const g = s.sessions[e.key];
    if (!isStale(g, s, clock.today)) continue;
    s = { ...s, sessions: { ...s.sessions, [e.key]: generateSession({ state: s, entry: e, generatedAt: normalizeInstant(clock.now) }) } };
  }
  return s;
}

/** À l'ouverture : planifie la semaine courante si besoin, sinon régénère les séances périmées. */
export function ensureCurrentWeek(state: AppState, clock: Clock): AppState {
  if (!state.profile) return state;
  const weekStart = weekStartOf(clock.today);
  // §W : séances de course manquées (passées, jamais commencées) ⇒ déplacées ou abandonnées par le moteur Course.
  return state.plans[weekStart] ? refreshSessions(applyMissedRuns(state, weekStart, clock.today, normalizeInstant(clock.now)), clock) : replanWeek(state, clock);
}

export function completeOnboarding(state: AppState, input: ProfileInput, clock: Clock): AppState {
  const profile = zProfile.parse(input);
  if (!profile.strength.enabled && !profile.running.enabled && !profile.crosstraining.enabled && !profile.hyrox.enabled) throw new AppError('NO_SPORT_SELECTED');
  return replanWeek({ ...state, profile }, clock);
}

/** Modification du profil : la semaine est replanifiée (séances commencées conservées). */
export function updateProfile(state: AppState, input: ProfileInput, clock: Clock): AppState {
  return completeOnboarding(state, input, clock);
}

function requireSession(state: AppState, key: string): GeneratedSession {
  const g = state.sessions[key];
  if (!g) throw new AppError('SESSION_UNKNOWN');
  if (g.outcome.status !== 'ok') throw new AppError('SESSION_UNAVAILABLE');
  return g;
}

export function startSession(state: AppState, key: string, clock: Clock): AppState {
  const g = requireSession(state, key);
  if (state.logs[key]) return state;
  const log: SessionLog = { key, sport: g.sport, startedAt: normalizeInstant(clock.now), sets: [], painItems: [] };
  return { ...state, logs: { ...state.logs, [key]: log } };
}

function openLog(state: AppState, key: string): SessionLog {
  const log = state.logs[key];
  if (!log) throw new AppError('SESSION_NOT_STARTED');
  if (log.finishedAt) throw new AppError('SESSION_FINISHED');
  return log;
}

/** Coche / décoche une série et enregistre ce qui a été réalisé (répétitions, charge, RIR saisis par l'utilisateur). */
export function recordSet(state: AppState, key: string, set: SetLog): AppState {
  const log = openLog(state, key);
  const g = requireSession(state, key);
  const item = g.outcome.status === 'ok' ? g.outcome.session.blocks.flatMap((b) => b.items).find((i) => i.id === set.itemId) : undefined;
  if (!item || item.prescription.type !== 'sets' || set.setIndex >= item.prescription.sets.length) throw new AppError('SET_UNKNOWN');
  const sets = [...log.sets.filter((x) => !(x.itemId === set.itemId && x.setIndex === set.setIndex)), set]
    .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : a.setIndex - b.setIndex));
  return { ...state, logs: { ...state.logs, [key]: { ...log, sets } } };
}

export function togglePainItem(state: AppState, key: string, itemId: string): AppState {
  const log = openLog(state, key);
  const painItems = log.painItems.includes(itemId) ? log.painItems.filter((x) => x !== itemId) : [...log.painItems, itemId].sort();
  return { ...state, logs: { ...state.logs, [key]: { ...log, painItems } } };
}

export function recordRun(state: AppState, key: string, run: NonNullable<SessionLog['run']>): AppState {
  const log = openLog(state, key);
  if (log.sport !== 'running') throw new AppError('NOT_A_RUN');
  return { ...state, logs: { ...state.logs, [key]: { ...log, run } } };
}

/** Termine la séance avec le feedback, puis applique l'adaptation et régénère les séances non commencées. */
export function finishSession(state: AppState, key: string, feedback: Feedback, clock: Clock): AppState {
  const log = openLog(state, key);
  if (log.sport === 'running' && !log.run) throw new AppError('RUN_DURATION_REQUIRED');
  const at = normalizeInstant(clock.now);
  const done = { ...state, logs: { ...state.logs, [key]: { ...log, finishedAt: at, feedback: zFeedback.parse(feedback) } } };
  return refreshSessions(applyCompletion(done, key, at), clock);
}

/** Course libre déclarée (hors planning) : donnée réalisée, base de l'ancre V19 (aucune dose par défaut sinon). */
// technical-constant: garde de saisie — une course déclarée tient dans une journée (s), jamais une règle sportive
export const FREE_RUN_MAX_DURATION_S = 86400;
// technical-constant: garde de saisie — vitesse moyenne humainement impossible (m/s, au-delà du record du 100 m)
export const FREE_RUN_MAX_SPEED_MS = 12.5;
// technical-constant: longueur maximale d'un commentaire de course libre (caractères, taille d'état)
export const FREE_RUN_NOTE_MAX = 280;
// technical-constant: millisecondes par seconde (conversion d'unité)
const MS_PER_S = 1000;

/** Intervalle [début, fin] (ms) d'une course réalisée : fin = `completedAt`, début = fin − durée réalisée. */
const intervalOf = (r: { readonly completedAt: string; readonly realizedDurationS: number }): [number, number] => {
  const end = Date.parse(r.completedAt);
  return [end - r.realizedDurationS * MS_PER_S, end];
};

/**
 * Course libre RÉALISÉE (hors programme) : une entrée au contrat Running (`running.realized`), lue par le moteur
 * Running comme toute course réalisée (dose de départ, allure observée pour un TEST) — jamais un second historique.
 * RC3.3 : `startedAt` (début déclaré ; défaut : fin = maintenant) et `note` facultatifs. Refus explicites : durée ou
 * distance invalides, vitesse impossible, date invalide ou à venir, chevauchement avec une course déjà enregistrée
 * (même course saisie deux fois, ou course du programme au même moment). Aucune séance planifiée n'est modifiée.
 */
export function logFreeRun(state: AppState, run: { realizedDurationS: number; completion: 'COMPLETED' | 'PARTIAL' | 'SKIPPED'; difficulty: Feedback['difficulty']; pain: boolean; distanceM?: number; startedAt?: string; note?: string }, clock: Clock): AppState {
  if (!(Number.isFinite(run.realizedDurationS) && run.realizedDurationS > 0 && run.realizedDurationS <= FREE_RUN_MAX_DURATION_S)) throw new AppError('DURATION_INVALID');
  if (run.distanceM !== undefined && !(Number.isFinite(run.distanceM) && run.distanceM > 0)) throw new AppError('DISTANCE_INVALID');
  if (run.distanceM !== undefined && run.distanceM / run.realizedDurationS > FREE_RUN_MAX_SPEED_MS) throw new AppError('RUN_SPEED_IMPOSSIBLE');
  const nowMs = Date.parse(normalizeInstant(clock.now));
  let at = normalizeInstant(clock.now);
  if (run.startedAt !== undefined) {
    const start = Date.parse(run.startedAt);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(run.startedAt) || !Number.isFinite(start)) throw new AppError('RUN_DATE_INVALID');
    const end = start + run.realizedDurationS * MS_PER_S;
    if (end > nowMs) throw new AppError('RUN_IN_FUTURE');
    at = normalizeInstant(new Date(end).toISOString());
  }
  const note = run.note?.trim() ?? '';
  if (note.length > FREE_RUN_NOTE_MAX) throw new AppError('RUN_NOTE_TOO_LONG');
  const id = `free:${at}`;
  if (state.running.realized.some((r) => r.sessionId === id)) throw new AppError('DUPLICATE_RUN');
  const [s0, e0] = intervalOf({ completedAt: at, realizedDurationS: run.realizedDurationS });
  if (state.running.realized.some((r) => { const [s1, e1] = intervalOf(r); return s0 < e1 && s1 < e0; })) throw new AppError('DUPLICATE_RUN');
  const realized = {
    sessionId: id, archetype: 'EASY' as const, structureFamily: 'CONTINUOUS' as const, completedAt: at, realizedDurationS: run.realizedDurationS, completion: run.completion,
    ...(run.completion === 'SKIPPED' ? { skipReason: 'OTHER' as const } : {}),
    unexpectedDifficulty: run.difficulty, intoleranceOrPainSignal: run.pain, readinessOrToleranceDegraded: false,
    ...(run.distanceM !== undefined ? { distanceM: run.distanceM } : {}),
  };
  const next: AppState = {
    ...state, running: { ...state.running, realized: [...state.running.realized, realized], ...(note !== '' ? { notes: { ...(state.running.notes ?? {}), [id]: note } } : {}) }, revision: state.revision + 1,
    safety: run.pain ? { ...state.safety, activePain: { reportedAt: at, areas: [] } } : state.safety,
  };
  return refreshSessions(next, clock);
}

/** RC3.3 — course libre telle qu'enregistrée (lecture seule) ; allure moyenne CALCULÉE seulement si la distance est connue. */
export interface FreeRunView {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationS: number;
  readonly distanceM: number | null;
  readonly paceSecPerKm: number | null;
  readonly difficulty: Feedback['difficulty'] | 'UNKNOWN';
  readonly note: string | null;
}
// technical-constant: mètres par kilomètre (conversion d'unité)
const M_PER_KM = 1000;

/** Courses libres enregistrées (les plus récentes d'abord), lues du contrat Running : aucune copie. */
export function selectFreeRuns(state: AppState): readonly FreeRunView[] {
  return state.running.realized.filter((r) => r.sessionId.startsWith('free:')).map((r) => ({
    sessionId: r.sessionId, startedAt: new Date(intervalOf(r)[0]).toISOString().replace('.000Z', 'Z'), completedAt: r.completedAt, durationS: r.realizedDurationS,
    distanceM: r.distanceM ?? null, paceSecPerKm: r.distanceM ? (r.realizedDurationS * M_PER_KM) / r.distanceM : null,
    difficulty: r.unexpectedDifficulty, note: state.running.notes?.[r.sessionId] ?? null,
  })).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
}

/**
 * Séance Cross-training RÉALISÉE (C2) : la séance réalisée (contrat Cross-training, complétion déclarée comprise) et,
 * si elle existe, l'empreinte de la séance générée, qui rejoint l'historique anti-doublon Cross-training. Une
 * occurrence = un identifiant : un identifiant déjà enregistré est refusé (jamais d'écrasement ni de doublon).
 * Le contenu est validé à la lecture par le moteur Cross-training (fail-closed), pas ici.
 */
export function recordCrossTrainingSession(state: AppState, entry: { readonly realized: Readonly<Record<string, unknown>>; readonly fingerprint?: unknown }, clock: Clock): AppState {
  const id = entry.realized.sessionId;
  if (typeof id !== 'string' || id.length === 0) throw new AppError('CT_SESSION_ID_REQUIRED');
  if (state.crosstraining.realized.some((r) => r.sessionId === id)) throw new AppError('DUPLICATE_CT_SESSION');
  const at = normalizeInstant(clock.now);
  const fingerprint = entry.fingerprint === undefined ? [] : [zFingerprintHistoryEntry.parse({ fingerprint: entry.fingerprint, at, status: 'completed', repetitionIntents: [] })];
  return {
    ...state,
    crosstraining: { realized: [...state.crosstraining.realized, { ...entry.realized }] },
    fingerprints: { ...state.fingerprints, crosstraining: [...state.fingerprints.crosstraining, ...fingerprint] },
    revision: state.revision + 1,
  };
}

/** Levée EXPLICITE de la pause douleur par l'utilisateur (déclaration : douleur disparue ou avis professionnel). */
export function clearPain(state: AppState, clock: Clock): AppState {
  return refreshSessions({ ...state, safety: { activePain: null, clearedAt: normalizeInstant(clock.now) }, revision: state.revision + 1 }, clock);
}
