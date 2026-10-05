/**
 * Façade applicative Beta 0 pour l'interface : création du programme depuis le profil, ouverture de la semaine
 * (clôture des semaines passées, planification de la semaine courante), séance en cours PERSISTÉE (séries
 * réellement faites, chrono de repos horodaté), fin de séance par `recordSessionExecution`, lectures (séance,
 * historique). Aucune décision sportive : prescription, composition, interférence et progression restent aux
 * moteurs, au planificateur et au programme. L'instant courant est toujours injecté (`Clock`).
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import { requestAssessment, weekIndexOf, withinProgramme } from '@hybridsport/programme';
import type { ProgrammeResult } from '@hybridsport/programme';
import { logFreeRun } from './app.js';
import type { Clock } from './app.js';
import { beta0Environment, programmeDefinitionFromProfile } from './beta0.js';
import { addDays, dateOf, normalizeInstant, weekStartOf } from './dates.js';
import { AppError } from './errors.js';
import { zProfile } from './model.js';
import type { AppState, Feedback, PersistedWeek, ProfileInput, ProgrammeLog, Rest, SetLog } from './model.js';
import { closeProgrammeWeekInApp, planProgrammeCurrentWeek, ProgrammeError, recordSessionExecution, startProgramme } from './programme.js';
import { declareRunningPerformance } from './running-profile.js';
import type { DeclaredPerformance } from './running-profile.js';
import type { ProgrammeEnvironment } from './programme.js';
import { activePainPause } from './weeks.js';

// technical-constant: conversion secondes → millisecondes
const MS_PER_S = 1000;
// technical-constant: ajout manuel au chrono de repos (commande d'interface « +15 s »), jamais une durée prescrite
export const REST_EXTENSION_S = 15;
// technical-constant: jours par semaine (calendrier)
const DAYS_PER_WEEK = 7;

export interface Beta0ProgrammeOptions {
  /**
   * Date de l'objectif Running DÉCLARÉE (contrat `goal.targetDate`) : le programme va jusqu'à cette semaine. Sans date :
   * programme continu. Dans les deux cas, seule la semaine courante est construite (horizon glissant).
   */
  readonly runningTargetDate?: string;
  /** Dernière course réelle déclarée (base de la dose Running : aucune dose de départ n'est validée). */
  readonly lastRun?: { readonly realizedDurationS: number; readonly distanceM?: number; readonly difficulty: Feedback['difficulty'] };
  /** Performances récentes OBSERVÉES (profil Course) : références du moteur Running, jamais l'objectif. */
  readonly performances?: readonly DeclaredPerformance[];
  /** « Je n'ai pas de chrono récent » : TEST demandé au programme dès la première semaine (mécanisme d'évaluation). */
  readonly requestTest?: boolean;
}

function startFromProfile(state: AppState, clock: Clock, o: Beta0ProgrammeOptions, startWeek: string, env: ProgrammeEnvironment): AppState {
  if (o.requestTest && !state.profile?.running.enabled) throw new AppError('RUNNING_NOT_ENABLED');
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  const def = programmeDefinitionFromProfile(p, { programmeId: `beta0.${normalizeInstant(clock.now)}`, startWeek, origin: 'profile', ...(o.runningTargetDate ? { runningTargetDate: o.runningTargetDate } : {}) });
  const started = startProgramme(state, def, clock);
  if (!o.requestTest || !started.programmeState) return ensureBeta0Week(started, clock, env);
  const r = requestAssessment(started.programmeState, 'running', Math.max(0, weekIndexOf(started.programmeState, clock.today)), normalizeInstant(clock.now));
  if (!r.ok) throw new ProgrammeError('RUNNING_TEST_REFUSED', r.reasons);
  return ensureBeta0Week({ ...started, programmeState: r.value }, clock, env);
}

/**
 * Onboarding Beta 0 : profil validé (Strength et/ou Running seulement), dernière course déclarée éventuelle, puis
 * programme créé et semaine courante planifiée par le chemin Beta 0 (jamais par le planificateur V0).
 */
export function createBeta0Programme(state: AppState, input: ProfileInput, clock: Clock, o: Beta0ProgrammeOptions, env: ProgrammeEnvironment = beta0Environment()): AppState {
  const profile = zProfile.parse(input);
  if (profile.crosstraining.enabled || profile.hyrox.enabled) throw new AppError('BETA0_SPORT_UNSUPPORTED');
  if (!profile.strength.enabled && !profile.running.enabled) throw new AppError('NO_SPORT_SELECTED');
  let s: AppState = { ...state, profile };
  if (o.lastRun && profile.running.enabled) {
    s = logFreeRun(s, { realizedDurationS: o.lastRun.realizedDurationS, completion: 'COMPLETED', difficulty: o.lastRun.difficulty, pain: false, ...(o.lastRun.distanceM !== undefined ? { distanceM: o.lastRun.distanceM } : {}) }, clock);
  }
  if (profile.running.enabled) for (const x of o.performances ?? []) s = declareRunningPerformance(s, clock, x);
  return startFromProfile(s, clock, o, weekStartOf(clock.today), env);
}

/**
 * Recréation EXPLICITE du programme (profil modifié) : jamais de mutation du programme en cours. Démarre cette
 * semaine si elle n'a encore aucune réalisation, sinon lundi prochain (une semaine commencée n'est jamais
 * remplacée). Les séances non terminées sont abandonnées ; l'historique (réalisations, moteurs) est conservé.
 */
export function recreateBeta0Programme(state: AppState, input: ProfileInput, clock: Clock, o: Beta0ProgrammeOptions, env: ProgrammeEnvironment = beta0Environment()): AppState {
  const profile = zProfile.parse(input);
  if (profile.crosstraining.enabled || profile.hyrox.enabled) throw new AppError('BETA0_SPORT_UNSUPPORTED');
  if (!profile.strength.enabled && !profile.running.enabled) throw new AppError('NO_SPORT_SELECTED');
  const thisWeek = weekStartOf(clock.today);
  const ps = state.programmeState;
  const started = ps !== null && ps.results.some((r) => weekStartOf(r.date) === thisWeek && r.provenance === 'declared');
  const programmeLogs = Object.fromEntries(Object.entries(state.programmeLogs).filter(([, l]) => l.finishedAt !== undefined));
  let s: AppState = { ...state, profile, programmeLogs };
  if (profile.running.enabled) for (const x of o.performances ?? []) s = declareRunningPerformance(s, clock, x);
  return startFromProfile(s, clock, o, started ? addDays(thisWeek, DAYS_PER_WEEK) : thisWeek, env);
}

/**
 * Ouverture de l'application : semaines passées du programme clôturées (séances non saisies ⇒ manquées, dérivé),
 * séances en cours d'une semaine clôturée abandonnées, puis semaine courante planifiée si elle ne l'est pas — sauf
 * pause douleur active (garde commune) ou semaine hors horizon. Erreur de planification ⇒ AppError propagée.
 */
export function ensureBeta0Week(state: AppState, clock: Clock, env: ProgrammeEnvironment = beta0Environment()): AppState {
  const ps0 = state.programmeState;
  if (!ps0 || !state.profile) return state;
  const cur = weekIndexOf(ps0, clock.today);
  let s = state;
  for (const w of ps0.weeks) if (!w.closedAt && w.weekIndex < cur) s = closeProgrammeWeekInApp(s, clock, env, w.weekIndex);
  const results = s.programmeState?.results ?? [];
  const programmeLogs = Object.fromEntries(Object.entries(s.programmeLogs).filter(([id, l]) => l.finishedAt !== undefined || !results.some((r) => r.requestId === id)));
  s = { ...s, programmeLogs };
  const ps = s.programmeState;
  if (!ps || !withinProgramme(ps, cur) || ps.weeks.some((w) => w.weekIndex === cur) || activePainPause(s)) return s;
  return planProgrammeCurrentWeek(s, clock, env, cur, { pastDaysUnavailable: true });
}

// ——— Séance du programme

type PlannedRequest = PersistedWeek['requests'][number];

/** Requête planifiée (toutes semaines persistées, programmes antérieurs compris). */
function requestOf(state: AppState, requestId: string): PlannedRequest | undefined {
  for (const w of Object.values(state.planner.weeks)) {
    const r = w.requests.find((x) => x.requestId === requestId);
    if (r) return r;
  }
  return undefined;
}

function recordOf(r: PlannedRequest | undefined): SessionRecord | undefined {
  if (r?.status !== 'planned' || !r.record) return undefined;
  const d = migrateToCurrent<SessionRecord>(r.record);
  return d.ok ? d.value : undefined;
}

export interface ProgrammeSessionView {
  readonly requestId: string;
  readonly sport: 'strength' | 'running';
  readonly date: string;
  readonly session: SessionDraft;
  readonly archetypeId: string | null;
  readonly role: string | null;
  /** Durée estimée par le CORE (p50, s) si disponible. */
  readonly estimatedDurationS: number | null;
  readonly log: ProgrammeLog | null;
  readonly result: ProgrammeResult | null;
  /** Semaine planifiée en autorité expérimentale. */
  readonly experimental: boolean;
}

/** Lecture d'une séance planifiée du programme (prescription du moteur, saisies en cours, résultat). */
export function selectProgrammeSession(state: AppState, requestId: string): ProgrammeSessionView | null {
  const r = requestOf(state, requestId);
  const record = recordOf(r);
  const session = record?.session;
  if (!r?.date || !record || !session || (r.sport !== 'strength' && r.sport !== 'running')) return null;
  const week = Object.values(state.planner.weeks).find((w) => w.requests.includes(r));
  return {
    requestId, sport: r.sport, date: r.date, session, archetypeId: r.intent?.archetypeId ?? null, role: r.composition?.role ?? null,
    estimatedDurationS: record.durationEstimate.availability === 'AVAILABLE' ? record.durationEstimate.p50 : null,
    log: state.programmeLogs[requestId] ?? null, result: state.programmeState?.results.find((x) => x.requestId === requestId) ?? null,
    experimental: week?.authority !== 'production',
  };
}

function openLog(state: AppState, requestId: string): ProgrammeLog {
  const log = state.programmeLogs[requestId];
  if (!log) throw new AppError('SESSION_NOT_STARTED');
  if (log.finishedAt) throw new AppError('SESSION_FINISHED');
  return log;
}
const withLog = (state: AppState, log: ProgrammeLog): AppState => ({ ...state, programmeLogs: { ...state.programmeLogs, [log.requestId]: log } });

/** Démarre (ou reprend) une séance planifiée, non encore enregistrée. */
export function startProgrammeSession(state: AppState, clock: Clock, requestId: string): AppState {
  const v = selectProgrammeSession(state, requestId);
  if (!v) throw new AppError('SESSION_UNAVAILABLE');
  if (v.result) throw new AppError('SESSION_FINISHED');
  if (v.log) return state;
  return withLog(state, { requestId, sport: v.sport, startedAt: normalizeInstant(clock.now), sets: [], painItems: [], rest: null });
}

/**
 * Série RÉELLEMENT faite (répétitions et charge saisies) cochée ou décochée. Cochée : chrono de repos démarré sur
 * le repos PRESCRIT par le moteur pour cette série (échéance horodatée). Jamais de série supposée faite.
 */
export function recordProgrammeSet(state: AppState, clock: Clock, requestId: string, set: SetLog): AppState {
  const log = openLog(state, requestId);
  const v = selectProgrammeSession(state, requestId);
  const item = v?.session.blocks.flatMap((b) => b.items).find((i) => i.id === set.itemId);
  if (!item || item.prescription.type !== 'sets') throw new AppError('SET_UNKNOWN');
  const prescribed = item.prescription.sets[set.setIndex];
  if (!prescribed) throw new AppError('SET_UNKNOWN');
  if (set.done && set.reps === undefined) throw new AppError('SET_REPS_REQUIRED');
  const sets = [...log.sets.filter((x) => !(x.itemId === set.itemId && x.setIndex === set.setIndex)), set]
    .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : a.setIndex - b.setIndex));
  const now = Date.parse(clock.now);
  const rest: Rest | null = set.done && prescribed.restAfterS > 0
    ? { endsAt: normalizeInstant(new Date(now + prescribed.restAfterS * MS_PER_S).toISOString()), totalS: prescribed.restAfterS, exerciseId: item.exerciseId }
    : log.rest;
  return withLog(state, { ...log, sets, rest });
}

export function toggleProgrammePainItem(state: AppState, requestId: string, itemId: string): AppState {
  const log = openLog(state, requestId);
  const painItems = log.painItems.includes(itemId) ? log.painItems.filter((x) => x !== itemId) : [...log.painItems, itemId].sort();
  return withLog(state, { ...log, painItems });
}

/** Secondes restantes du chrono à l'instant donné (négatif : repos dépassé). */
export function restRemainingS(rest: Rest, nowIso: string): number {
  return rest.pausedRemainingS ?? Math.ceil((Date.parse(rest.endsAt) - Date.parse(nowIso)) / MS_PER_S);
}

/** Commandes du chrono : pause (reste figé), reprise (nouvelle échéance), +15 s, passer. */
export function controlRest(state: AppState, clock: Clock, requestId: string, action: 'pause' | 'resume' | 'extend' | 'skip'): AppState {
  const log = openLog(state, requestId);
  const r = log.rest;
  if (!r) return state;
  const now = Date.parse(clock.now);
  const at = (ms: number) => normalizeInstant(new Date(ms).toISOString());
  let rest: Rest | null = r;
  if (action === 'skip') rest = null;
  else if (action === 'pause' && r.pausedRemainingS === undefined) rest = { ...r, pausedRemainingS: Math.max(0, restRemainingS(r, clock.now)) };
  else if (action === 'resume' && r.pausedRemainingS !== undefined) { const { pausedRemainingS, ...rest0 } = r; rest = { ...rest0, endsAt: at(now + pausedRemainingS * MS_PER_S) }; }
  else if (action === 'extend') {
    rest = r.pausedRemainingS !== undefined ? { ...r, pausedRemainingS: r.pausedRemainingS + REST_EXTENSION_S, totalS: r.totalS + REST_EXTENSION_S }
      : { ...r, endsAt: at(Math.max(Date.parse(r.endsAt), now) + REST_EXTENSION_S * MS_PER_S), totalS: r.totalS + REST_EXTENSION_S };
  }
  return withLog(state, { ...log, rest });
}

export interface FinishInput {
  readonly requestId: string;
  readonly completion: 'completed_as_prescribed' | 'modified' | 'abandoned';
  /** Douleur signalée (présence seulement : aucun niveau ni diagnostic). */
  readonly pain: boolean;
  /** Course : saisies réelles (durée exigée ; distance facultative ; temps du TEST seul). */
  readonly run?: { readonly realizedDurationS: number; readonly distanceM?: number; readonly testTimeS?: number };
}

/**
 * Fin de séance : construit l'entrée d'exécution RÉELLE (séries saisies, douleur, course) et l'enregistre par
 * `recordSessionExecution` (validation par le contrat du moteur, historique, programme). Refus ⇒ état inchangé.
 */
export function finishProgrammeSession(state: AppState, clock: Clock, f: FinishInput): AppState {
  const s0 = state.programmeLogs[f.requestId] ? state : startProgrammeSession(state, clock, f.requestId);
  const log = openLog(s0, f.requestId);
  const pain = f.pain ? 'REPORTED' as const : 'NONE' as const;
  const recorded = log.sport === 'strength'
    ? recordSessionExecution(s0, clock, { requestId: f.requestId, sport: 'strength', completion: f.completion, pain, sets: log.sets, painItems: log.painItems })
    : recordSessionExecution(s0, clock, { requestId: f.requestId, sport: 'running', completion: f.completion, pain, ...(f.run ? { run: f.run } : {}) });
  const outcome = { completion: f.completion, pain: f.pain || log.painItems.length > 0, ...(f.run ? { run: { ...f.run } } : {}) };
  return withLog(recorded, { ...log, rest: null, finishedAt: normalizeInstant(clock.now), outcome });
}

// ——— Historique

export interface HistoryEntry {
  readonly requestId: string;
  readonly sport: 'strength' | 'running';
  readonly date: string;
  readonly archetypeId: string | null;
  readonly role: string | null;
  readonly completion: ProgrammeResult['completion'];
  readonly pain: boolean;
  /** Séries réellement faites (Strength). */
  readonly sets: readonly SetLog[];
  readonly run: NonNullable<ProgrammeLog['outcome']>['run'] | null;
  /** TEST réalisé : référence TIME_TRIAL enregistrée. */
  readonly testReference: boolean;
}

/** Historique des séances du programme (terminées, ou manquées dérivées), plus récentes d'abord. */
export function selectHistory(state: AppState): readonly HistoryEntry[] {
  const fromLogs = Object.values(state.programmeLogs).flatMap((l): HistoryEntry[] => {
    if (!l.finishedAt || !l.outcome || (l.sport !== 'strength' && l.sport !== 'running')) return [];
    const r = requestOf(state, l.requestId);
    return [{
      requestId: l.requestId, sport: l.sport, date: r?.date ?? dateOf(l.startedAt), archetypeId: r?.intent?.archetypeId ?? null, role: r?.composition?.role ?? null,
      completion: l.outcome.completion, pain: l.outcome.pain, sets: l.sets.filter((x) => x.done), run: l.outcome.run ?? null,
      testReference: state.running.references.some((x) => x.referenceId === `test:${l.requestId}`),
    }];
  });
  const missed = (state.programmeState?.results ?? []).flatMap((x): HistoryEntry[] => {
    if (x.completion !== 'missed' || fromLogs.some((e) => e.requestId === x.requestId) || (x.sport !== 'strength' && x.sport !== 'running')) return [];
    const r = requestOf(state, x.requestId);
    return [{ requestId: x.requestId, sport: x.sport, date: x.date, archetypeId: r?.intent?.archetypeId ?? null, role: r?.composition?.role ?? null, completion: 'missed', pain: false, sets: [], run: null, testReference: false }];
  });
  return [...fromLogs, ...missed].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.requestId.localeCompare(a.requestId)));
}

/** Le chemin Beta 0 est-il actif (programme créé) ? Sinon l'application reste sur le chemin V0 (repli / legacy). */
export const isBeta0 = (state: AppState): boolean => state.programmeState !== null;

/** Index de la semaine du programme contenant `today` (peut être hors horizon) ; null sans programme. */
export const programmeWeekIndex = (state: AppState, today: string): number | null => (state.programmeState ? weekIndexOf(state.programmeState, today) : null);

/** Situation du programme à `today` : pas encore commencé, en cours, terminé (fin déclarée dépassée) ; null sans programme. */
export function programmeStatusAt(state: AppState, today: string): 'not_started' | 'active' | 'ended' | null {
  const ps = state.programmeState;
  if (!ps) return null;
  const i = weekIndexOf(ps, today);
  return i < 0 ? 'not_started' : withinProgramme(ps, i) ? 'active' : 'ended';
}
