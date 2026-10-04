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
export function logFreeRun(state: AppState, run: { realizedDurationS: number; completion: 'COMPLETED' | 'PARTIAL' | 'SKIPPED'; difficulty: Feedback['difficulty']; pain: boolean; distanceM?: number }, clock: Clock): AppState {
  if (run.distanceM !== undefined && !(Number.isFinite(run.distanceM) && run.distanceM > 0)) throw new AppError('DISTANCE_INVALID');
  const at = normalizeInstant(clock.now);
  const id = `free:${at}`;
  if (state.running.realized.some((r) => r.sessionId === id)) throw new AppError('DUPLICATE_RUN');
  const realized = {
    sessionId: id, archetype: 'EASY' as const, structureFamily: 'CONTINUOUS' as const, completedAt: at, realizedDurationS: run.realizedDurationS, completion: run.completion,
    ...(run.completion === 'SKIPPED' ? { skipReason: 'OTHER' as const } : {}),
    unexpectedDifficulty: run.difficulty, intoleranceOrPainSignal: run.pain, readinessOrToleranceDegraded: false,
    ...(run.distanceM !== undefined ? { distanceM: run.distanceM } : {}),
  };
  const next: AppState = {
    ...state, running: { ...state.running, realized: [...state.running.realized, realized] }, revision: state.revision + 1,
    safety: run.pain ? { activePain: { reportedAt: at, areas: [] } } : state.safety,
  };
  return refreshSessions(next, clock);
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
  return refreshSessions({ ...state, safety: { activePain: null }, revision: state.revision + 1 }, clock);
}
