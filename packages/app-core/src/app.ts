/**
 * Façade applicative de KAIRO V0 : transitions PURES de l'état (l'instant courant et la date du jour sont
 * toujours injectés). L'interface n'appelle que ces fonctions ; elle ne décide rien de sportif.
 */
import { zFingerprintHistoryEntry } from '@hybridsport/domain';
import { dateOf, normalizeInstant, sessionInstant, weekStartOf } from './dates.js';
import { generateSession, isStale } from './generate.js';
import type { AppState, Feedback, FreeRunType, GeneratedSession, PlanEntry, ProfileInput, SessionLog, SetLog } from './model.js';
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

export interface FreeRunInput {
  readonly realizedDurationS: number;
  readonly completion: 'COMPLETED' | 'PARTIAL' | 'SKIPPED';
  readonly difficulty: Feedback['difficulty'];
  readonly pain: boolean;
  readonly distanceM?: number;
  /** Début déclaré (instant ISO) ; fin = début + durée. */
  readonly startedAt?: string;
  /** RC3.4 — date seule (AAAA-MM-JJ), heure inconnue : convention de jour de l'application, jamais une heure inventée. */
  readonly completedOn?: string;
  readonly note?: string;
  /** RC3.4 — zones douloureuses déclarées (facultatives), ajoutées à la pause douleur existante. */
  readonly painAreas?: readonly string[];
  /** RC4.3 — type DÉCLARÉ (facultatif) ; absent ⇒ « Non précisé » (aucune intensité supposée). */
  readonly type?: FreeRunType;
  /**
   * RC4.3 — confirmation EXPLICITE d'une activité supplémentaire : course sans heure précise déclarée le même jour
   * qu'une course du programme déjà réalisée. Sans elle, la saisie est refusée (`FREE_RUN_SAME_DAY_CONFIRM`) : jamais de
   * fusion automatique, jamais de double comptage silencieux.
   */
  readonly confirmedExtra?: boolean;
}

/**
 * RC4.3 — courses du PROGRAMME déjà réalisées le jour `date` (identifiants) : base de l'avertissement « même jour »
 * pour une course libre sans heure précise. Les chevauchements horaires restent refusés (`DUPLICATE_RUN`).
 */
export function programmeRunsOn(state: AppState, date: string, exceptId?: string): readonly string[] {
  return state.running.realized.filter((r) => r.sessionId !== exceptId && !r.sessionId.startsWith('free:') && r.completion !== 'SKIPPED' && dateOf(r.completedAt) === date).map((r) => r.sessionId);
}

/**
 * Valide une course libre et calcule son instant de fin ; `exceptId` : course en cours de correction, exclue du
 * contrôle de chevauchement. Refus explicites, jamais de valeur corrigée en silence.
 */
function checkedFreeRun(state: AppState, run: FreeRunInput, clock: Clock, exceptId?: string): { at: ReturnType<typeof normalizeInstant>; note: string; timeKnown: boolean } {
  if (!(Number.isFinite(run.realizedDurationS) && run.realizedDurationS > 0 && run.realizedDurationS <= FREE_RUN_MAX_DURATION_S)) throw new AppError('DURATION_INVALID');
  if (run.distanceM !== undefined && !(Number.isFinite(run.distanceM) && run.distanceM > 0)) throw new AppError('DISTANCE_INVALID');
  if (run.distanceM !== undefined && run.distanceM / run.realizedDurationS > FREE_RUN_MAX_SPEED_MS) throw new AppError('RUN_SPEED_IMPOSSIBLE');
  const now = normalizeInstant(clock.now);
  const nowMs = Date.parse(now);
  let at = now;
  let timeKnown = run.completedOn === undefined;
  if (run.startedAt !== undefined) {
    const start = Date.parse(run.startedAt);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(run.startedAt) || !Number.isFinite(start)) throw new AppError('RUN_DATE_INVALID');
    const end = start + run.realizedDurationS * MS_PER_S;
    if (end > nowMs) throw new AppError('RUN_IN_FUTURE');
    at = normalizeInstant(new Date(end).toISOString());
    timeKnown = true;
  } else if (run.completedOn !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(run.completedOn) || !Number.isFinite(Date.parse(`${run.completedOn}T00:00:00Z`))) throw new AppError('RUN_DATE_INVALID');
    if (run.completedOn > clock.today) throw new AppError('RUN_IN_FUTURE');
    // Convention de jour de l'application (instant de séance), bornée à maintenant pour une course du jour.
    const day = sessionInstant(run.completedOn);
    at = Date.parse(day) > nowMs ? now : normalizeInstant(day);
  }
  const note = run.note?.trim() ?? '';
  if (note.length > FREE_RUN_NOTE_MAX) throw new AppError('RUN_NOTE_TOO_LONG');
  if (run.type !== undefined && !(FREE_RUN_TYPE_LIST as readonly string[]).includes(run.type)) throw new AppError('FREE_RUN_TYPE_INVALID');
  // RC4.3 — même jour qu'une course du programme réalisée, sans heure précise : confirmation explicite exigée.
  if (run.startedAt === undefined && run.completedOn !== undefined && run.confirmedExtra !== true && programmeRunsOn(state, run.completedOn).length > 0) throw new AppError('FREE_RUN_SAME_DAY_CONFIRM');
  const id = `free:${at}`;
  const others = state.running.realized.filter((r) => r.sessionId !== exceptId);
  if (others.some((r) => r.sessionId === id)) throw new AppError('DUPLICATE_RUN');
  const [s0, e0] = intervalOf({ completedAt: at, realizedDurationS: run.realizedDurationS });
  if (others.some((r) => { const [s1, e1] = intervalOf(r); return s0 < e1 && s1 < e0; })) throw new AppError('DUPLICATE_RUN');
  return { at, note, timeKnown };
}

type FreeRunMeta = NonNullable<AppState['running']['freeRunMeta']>[string];
const FREE_RUN_TYPE_LIST: readonly FreeRunType[] = ['easy', 'long', 'threshold', 'interval', 'hills'];

/**
 * Annexes (commentaire, heure inconnue, métadonnées RC4.3) d'une course libre, recalculées pour l'identifiant `id` ;
 * `removeId` : ancien identifiant (correction) ou course supprimée — ses annexes sont retirées. Annexe vide ⇒ absente.
 */
function withAnnexes(running: AppState['running'], removeId: string | null, id: string | null, note: string, timeKnown: boolean, meta: FreeRunMeta = {}): AppState['running'] {
  const notes = Object.fromEntries(Object.entries(running.notes ?? {}).filter(([k]) => k !== removeId && k !== id));
  const unknown = (running.timeUnknown ?? []).filter((k) => k !== removeId && k !== id);
  const metas = Object.fromEntries(Object.entries(running.freeRunMeta ?? {}).filter(([k]) => k !== removeId && k !== id));
  const { notes: _n, timeUnknown: _t, freeRunMeta: _m, ...rest } = running;
  const nextNotes = id !== null && note !== '' ? { ...notes, [id]: note } : notes;
  const nextUnknown = id !== null && !timeKnown ? [...unknown, id] : unknown;
  const nextMeta = id !== null && Object.keys(meta).length > 0 ? { ...metas, [id]: meta } : metas;
  return { ...rest, ...(Object.keys(nextNotes).length > 0 ? { notes: nextNotes } : {}), ...(nextUnknown.length > 0 ? { timeUnknown: nextUnknown } : {}), ...(Object.keys(nextMeta).length > 0 ? { freeRunMeta: nextMeta } : {}) };
}
const metaOf = (type: FreeRunType | undefined, dateUnknown: boolean): FreeRunMeta => ({ ...(type !== undefined ? { type } : {}), ...(dateUnknown ? { dateUnknown: true as const } : {}) });

/**
 * Course libre RÉALISÉE (hors programme) : une entrée au contrat Running (`running.realized`), lue par le moteur
 * Running comme toute course réalisée (dose de départ, allure observée pour un TEST) — jamais un second historique,
 * jamais une performance de référence (celles-ci restent déclarées à part, `declareRunningPerformance`).
 * RC3.3 : `startedAt` et `note` ; RC3.4 : `completedOn` (date seule) et zones de douleur. Douleur déclarée ⇒ pause
 * douleur EXISTANTE (zones ajoutées à une pause déjà active, jamais remplacées) ; aucune douleur ⇒ sécurité inchangée.
 */
export function logFreeRun(state: AppState, run: FreeRunInput, clock: Clock, o: { readonly dateUnknown?: boolean } = {}): AppState {
  const { at, note, timeKnown } = checkedFreeRun(state, run, clock);
  const id = `free:${at}`;
  const realized = {
    sessionId: id, archetype: 'EASY' as const, structureFamily: 'CONTINUOUS' as const, completedAt: at, realizedDurationS: run.realizedDurationS, completion: run.completion,
    ...(run.completion === 'SKIPPED' ? { skipReason: 'OTHER' as const } : {}),
    unexpectedDifficulty: run.difficulty, intoleranceOrPainSignal: run.pain, readinessOrToleranceDegraded: false,
    ...(run.distanceM !== undefined ? { distanceM: run.distanceM } : {}),
  };
  const active = state.safety.activePain;
  const next: AppState = {
    ...state, running: withAnnexes({ ...state.running, realized: [...state.running.realized, realized] }, null, id, note, timeKnown, metaOf(run.type, o.dateUnknown === true)), revision: state.revision + 1,
    safety: run.pain ? { ...state.safety, activePain: { reportedAt: active?.reportedAt ?? normalizeInstant(clock.now), areas: [...new Set([...(active?.areas ?? []), ...(run.painAreas ?? [])])].sort(), ...(active?.sessionKey ? { sessionKey: active.sessionKey } : {}) } } : state.safety,
  };
  return refreshSessions(next, clock);
}

const freeRunOf = (state: AppState, id: string) => {
  const r = state.running.realized.find((x) => x.sessionId === id);
  if (!r || !id.startsWith('free:')) throw new AppError('FREE_RUN_UNKNOWN');
  return r;
};

/**
 * RC3.4 — CORRECTION d'une course libre (date, heure, durée, distance, ressenti, commentaire), mêmes contrôles qu'à
 * la saisie (chevauchement hors elle-même). La douleur déclarée et la sécurité ne changent pas. L'identifiant suit
 * l'instant de fin ; commentaire et annexes suivent. Aucune semaine planifiée ni séance persistée n'est recalculée.
 */
export function updateFreeRun(state: AppState, id: string, edit: Omit<FreeRunInput, 'completion' | 'pain' | 'painAreas'>, clock: Clock): AppState {
  const old = freeRunOf(state, id);
  const oldMeta = state.running.freeRunMeta?.[id] ?? {};
  // RC4.3 — date inconnue (onboarding) conservée tant qu'aucune date ni heure réelle n'est saisie : l'instant
  // conventionnel reste celui d'origine (jamais déplacé à « maintenant ») ; une date saisie devient la date réelle.
  const dateUnknown = oldMeta.dateUnknown === true && edit.completedOn === undefined && edit.startedAt === undefined;
  const keepInstant = dateUnknown ? { startedAt: new Date(Date.parse(old.completedAt) - edit.realizedDurationS * MS_PER_S).toISOString() } : {};
  // Même jour déjà accepté (date inchangée) : la confirmation d'activité supplémentaire n'est pas redemandée.
  const sameDay = edit.completedOn !== undefined && edit.completedOn === dateOf(old.completedAt) ? { confirmedExtra: true } : {};
  const input: FreeRunInput = { ...edit, ...keepInstant, ...sameDay, completion: old.completion === 'UNKNOWN' ? 'COMPLETED' : old.completion, pain: old.intoleranceOrPainSignal };
  const checked = checkedFreeRun(state, input, clock, id);
  const { at, note } = checked;
  // L'heure d'une course d'onboarding sans date n'est jamais présentée comme réelle.
  const timeKnown = dateUnknown ? !(state.running.timeUnknown ?? []).includes(id) : checked.timeKnown;
  const nextId = `free:${at}`;
  const { distanceM: _d, ...base } = old;
  const updated = { ...base, sessionId: nextId, completedAt: at, realizedDurationS: edit.realizedDurationS, unexpectedDifficulty: edit.difficulty, ...(edit.distanceM !== undefined ? { distanceM: edit.distanceM } : {}) };
  const realized = state.running.realized.map((x) => (x.sessionId === id ? updated : x));
  return { ...state, running: withAnnexes({ ...state.running, realized }, id, nextId, note, timeKnown, metaOf(edit.type, dateUnknown)), revision: state.revision + 1 };
}

/**
 * RC3.4 — SUPPRESSION d'une course libre (erreur de saisie) : retirée de l'historique de course avec son commentaire.
 * Une pause douleur active n'est jamais levée ici (levée explicite seulement) ; aucune séance persistée n'est touchée.
 */
export function deleteFreeRun(state: AppState, id: string): AppState {
  freeRunOf(state, id);
  return { ...state, running: withAnnexes({ ...state.running, realized: state.running.realized.filter((x) => x.sessionId !== id) }, id, null, '', true), revision: state.revision + 1 };
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
  /** RC3.4 — heure réelle connue (false : date seule, heure jamais affichée). */
  readonly timeKnown: boolean;
  /** Douleur déclarée avec la course. */
  readonly pain: boolean;
  /** RC4.3 — type déclaré ; `null` : « Non précisé ». */
  readonly type: FreeRunType | null;
  /** RC4.3 — course d'onboarding sans date réelle (instant conventionnel, jamais une fatigue récente). */
  readonly dateUnknown: boolean;
}
// technical-constant: mètres par kilomètre (conversion d'unité)
const M_PER_KM = 1000;

/** Courses libres enregistrées (les plus récentes d'abord), lues du contrat Running : aucune copie. */
export function selectFreeRuns(state: AppState): readonly FreeRunView[] {
  return state.running.realized.filter((r) => r.sessionId.startsWith('free:')).map((r) => ({
    sessionId: r.sessionId, startedAt: new Date(intervalOf(r)[0]).toISOString().replace('.000Z', 'Z'), completedAt: r.completedAt, durationS: r.realizedDurationS,
    distanceM: r.distanceM ?? null, paceSecPerKm: r.distanceM ? (r.realizedDurationS * M_PER_KM) / r.distanceM : null,
    difficulty: r.unexpectedDifficulty, note: state.running.notes?.[r.sessionId] ?? null,
    timeKnown: !(state.running.timeUnknown ?? []).includes(r.sessionId), pain: r.intoleranceOrPainSignal,
    type: state.running.freeRunMeta?.[r.sessionId]?.type ?? null, dateUnknown: state.running.freeRunMeta?.[r.sessionId]?.dateUnknown === true,
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
