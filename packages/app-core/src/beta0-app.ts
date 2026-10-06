/**
 * Façade applicative Beta 0 pour l'interface : création du programme depuis le profil, ouverture de la semaine
 * (clôture des semaines passées, planification de la semaine courante), séance en cours PERSISTÉE (séries
 * réellement faites, chrono de repos horodaté), fin de séance par `recordSessionExecution`, lectures (séance,
 * historique). Aucune décision sportive : prescription, composition, interférence et progression restent aux
 * moteurs, au planificateur et au programme. L'instant courant est toujours injecté (`Clock`).
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import { requestAssessment, weekIndexOf, withinProgramme, zProgrammeState } from '@hybridsport/programme';
import type { ProgrammeResult, ProgrammeState } from '@hybridsport/programme';
import { logFreeRun } from './app.js';
import type { Clock } from './app.js';
import { beta0Environment, legacyBeta0StrengthIntent, prescribedArchetype, LEGACY_BETA0_STRENGTH_ARCHETYPE, programmeDefinitionFromProfile, weekPlanning } from './beta0.js';
import { STRENGTH_WEEKLY_COMPOSITION_CANDIDATE } from '@hybridsport/strength';
import { addDays, dateOf, normalizeInstant, weekStartOf } from './dates.js';
import { AppError } from './errors.js';
import { emptyState, zProfile } from './model.js';
import type { AppState, Feedback, PersistedWeek, ProfileInput, ProgrammeLog, Rest, SetLog } from './model.js';
import { closeProgrammeWeekInApp, planProgrammeCurrentWeek, ProgrammeError, recordSessionExecution, startProgramme } from './programme.js';
import { strengthWeekBoundary } from './progression.js';
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

function startFromProfile(state: AppState, clock: Clock, o: Beta0ProgrammeOptions, startWeek: string, env: ProgrammeEnvironment, carried: CarriedWeek | null = null): AppState {
  if (o.requestTest && !state.profile?.running.enabled) throw new AppError('RUNNING_NOT_ENABLED');
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  const def = programmeDefinitionFromProfile(p, { programmeId: `beta0.${normalizeInstant(clock.now)}`, startWeek, origin: 'profile', ...(o.runningTargetDate ? { runningTargetDate: o.runningTargetDate } : {}) });
  const fresh = startProgramme(state, def, clock);
  // Semaine commencée REPRISE telle quelle (semaine 0 du nouveau programme) AVANT toute planification : jamais remplacée.
  const started = carried && fresh.programmeState ? { ...fresh, programmeState: carryWeek(fresh.programmeState, carried) } : fresh;
  if (!o.requestTest || !started.programmeState) return ensureBeta0Week(started, clock, env);
  const cur = Math.max(0, weekIndexOf(started.programmeState, clock.today));
  const r = requestAssessment(started.programmeState, 'running', carried ? cur + 1 : cur, normalizeInstant(clock.now));
  if (!r.ok) throw new ProgrammeError('RUNNING_TEST_REFUSED', r.reasons);
  return ensureBeta0Week({ ...started, programmeState: r.value }, clock, env);
}

/** Semaine commencée du programme précédent : son entrée et ses résultats, repris à l'identique. */
interface CarriedWeek { readonly week: ProgrammeState['weeks'][number]; readonly results: ProgrammeState['results'] }
function carryWeek(ps: ProgrammeState, c: CarriedWeek): ProgrammeState {
  return zProgrammeState.parse({
    ...ps,
    weeks: [{ ...c.week, weekIndex: 0, intent: { ...c.week.intent, weekIndex: 0 } }],
    results: c.results.map((r) => ({ ...r, weekIndex: 0 })),
  });
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
 * Aperçu de « Modifier le programme » (lecture seule, affiché AVANT validation) : à partir de quand les nouvelles
 * intentions s'appliquent et ce qu'il advient de la semaine en cours.
 *   - semaine en cours COMMENCÉE (au moins une séance enregistrée) : jamais remplacée (`WEEK_NOT_REPLACEABLE`) ; elle est
 *     REPRISE telle quelle par le nouveau programme (séances restantes toujours réalisables) et les nouvelles intentions
 *     s'appliquent à partir de lundi prochain ;
 *   - séance EN COURS (commencée, non terminée) : modification refusée tant qu'elle n'est pas terminée ;
 *   - sinon : la semaine en cours est replanifiée dès aujourd'hui avec le nouveau programme ; les séances prévues à une
 *     date déjà passée et non réalisées en sont retirées (comptées, annoncées), jamais déclarées faites ni manquées.
 */
export interface RecreationPreview {
  /** Lundi de la première semaine construite avec les nouvelles intentions. */
  readonly appliesFrom: string;
  readonly currentWeek: 'replanned' | 'kept';
  readonly sessionInProgress: string | null;
  readonly pastSessionsDropped: number;
  /** Date d'objectif Course du programme actuel (préremplie, jamais perdue en silence). */
  readonly runningTargetDate: string | null;
}
export function previewBeta0Recreation(state: AppState, today: string): RecreationPreview {
  const thisWeek = weekStartOf(today);
  const ps = state.programmeState;
  const week = state.planner.weeks[thisWeek];
  const ids = new Set((week?.requests ?? []).map((r) => r.requestId));
  const started = ps !== null && ps.results.some((r) => ids.has(r.requestId) && r.provenance === 'declared');
  const inProgress = Object.values(state.programmeLogs).find((l) => l.finishedAt === undefined && ids.has(l.requestId))?.requestId ?? null;
  const past = started ? 0 : (week?.requests ?? []).filter((r) => r.status === 'planned' && r.date !== undefined && r.date < today).length;
  const target = ps?.definition.goals.flatMap((g) => (g.sport === 'running' && 'targetDate' in g && g.targetDate ? [g.targetDate] : []))[0] ?? null;
  return { appliesFrom: started ? addDays(thisWeek, DAYS_PER_WEEK) : thisWeek, currentWeek: started ? 'kept' : 'replanned', sessionInProgress: inProgress, pastSessionsDropped: past, runningTargetDate: target };
}

/**
 * Recréation EXPLICITE du programme (« Modifier le programme ») : jamais de mutation du programme en cours ; un nouveau
 * programme est créé depuis le profil modifié et démarre cette semaine. Semaine commencée : reprise à l'identique (semaine
 * 0, résultats compris), nouvelles intentions dès lundi prochain. Refusée si une séance est en cours (jamais de brouillon
 * supprimé en silence). Historique conservé : profil, réalisations des moteurs (Strength, Course), séances terminées,
 * références. Tracée dans l'audit du nouveau programme.
 */
export function recreateBeta0Programme(state: AppState, input: ProfileInput, clock: Clock, o: Beta0ProgrammeOptions, env: ProgrammeEnvironment = beta0Environment()): AppState {
  const profile = zProfile.parse(input);
  if (profile.crosstraining.enabled || profile.hyrox.enabled) throw new AppError('BETA0_SPORT_UNSUPPORTED');
  if (!profile.strength.enabled && !profile.running.enabled) throw new AppError('NO_SPORT_SELECTED');
  const preview = previewBeta0Recreation(state, clock.today);
  if (preview.sessionInProgress) throw new AppError('PROGRAMME_SESSION_IN_PROGRESS');
  const thisWeek = weekStartOf(clock.today);
  const old = state.programmeState;
  const oldWeek = old?.weeks.find((w) => w.plannerRef === thisWeek);
  const carried = preview.currentWeek === 'kept' && old && oldWeek ? { week: oldWeek, results: old.results.filter((r) => r.weekIndex === oldWeek.weekIndex) } : null;
  const programmeLogs = Object.fromEntries(Object.entries(state.programmeLogs).filter(([, l]) => l.finishedAt !== undefined));
  let s: AppState = { ...state, profile, programmeLogs };
  if (profile.running.enabled) for (const x of o.performances ?? []) s = declareRunningPerformance(s, clock, x);
  const next = startFromProfile(s, clock, o, thisWeek, env, carried);
  const nps = next.programmeState;
  if (!nps) return next;
  const reason = { code: 'KAIRO.PROGRAMME_RECREATED', params: { previousProgrammeId: old?.definition.programmeId ?? '', appliesFrom: preview.appliesFrom, currentWeek: preview.currentWeek, pastSessionsDropped: preview.pastSessionsDropped } };
  return { ...next, programmeState: { ...nps, audit: [...nps.audit, { at: normalizeInstant(clock.now), weekIndex: null, reason }] } };
}

/** Jeton de confirmation EXPLICITE exigé par `resetBeta0Data` (aucun appel implicite ou accidentel possible). */
export const BETA0_RESET_CONFIRMATION = 'EFFACER_LE_PROGRAMME_BETA';

/**
 * Outil de TEST Beta 0 (jamais en production) : efface de façon COHÉRENTE tout ce qui dépend du programme, puis recrée
 * un programme neuf depuis le profil ACTUEL avec le moteur courant et planifie la semaine courante.
 *
 * Effacé (produits du programme et de ses exécutions) : programme, semaines planifiées, séances en cours, réalisations
 * Strength (expositions, tracks), empreintes, courses réalisées dans le programme, références issues des TEST KAIRO,
 * anciennes séances V0. Conservé (déclarations de l'utilisateur) : profil, courses libres déclarées, références de
 * performance déclarées, et la pause douleur active (une remise à zéro de test ne lève jamais une protection).
 *
 * Ce n'est PAS une replanification : aucune semaine n'est modifiée partiellement ; l'invariant WEEK_NOT_REPLACEABLE reste
 * entier pour tous les autres chemins. Refusé hors environnement `beta0_experimental`, sans le jeton de confirmation,
 * ou sans programme Beta 0. Tracé dans l'audit du nouveau programme.
 */
export function resetBeta0Data(state: AppState, clock: Clock, confirmation: string, env: ProgrammeEnvironment = beta0Environment()): AppState {
  if (confirmation !== BETA0_RESET_CONFIRMATION) throw new AppError('BETA_RESET_NOT_CONFIRMED');
  if (env.authority !== 'beta0_experimental' || env.mode === 'PRODUCTION') throw new AppError('BETA_RESET_NOT_ALLOWED');
  const ps = state.programmeState;
  const profile = state.profile;
  if (!ps || !profile) throw new AppError('PROGRAMME_MISSING');
  const targetDate = ps.definition.goals.flatMap((g) => (g.sport === 'running' && 'targetDate' in g && g.targetDate ? [g.targetDate] : []))[0];
  const kept = {
    freeRuns: state.running.realized.filter((r) => r.sessionId.startsWith('free:')),
    references: state.running.references.filter((r) => r.provenance.source === 'USER_DECLARED'),
  };
  const erased = {
    programmeId: ps.definition.programmeId,
    weeks: Object.keys(state.planner.weeks).length,
    results: ps.results.length,
    sessionsInProgress: Object.keys(state.programmeLogs).length,
    strengthExposures: state.strength.exposures.length,
    programmeRuns: state.running.realized.length - kept.freeRuns.length,
    testReferences: state.running.references.length - kept.references.length,
  };
  const clean: AppState = {
    ...emptyState(), profile, safety: state.safety, crosstraining: state.crosstraining, hyrox: state.hyrox,
    running: { realized: kept.freeRuns, references: kept.references }, revision: state.revision + 1,
  };
  const next = startFromProfile(clean, clock, targetDate ? { runningTargetDate: targetDate } : {}, weekStartOf(clock.today), env);
  const nps = next.programmeState;
  if (!nps) return next;
  const reason = { code: 'KAIRO.BETA_DATA_RESET', params: { ...erased, keptFreeRuns: kept.freeRuns.length, keptReferences: kept.references.length, planningVersion: env.planningVersion ?? '' } };
  return { ...next, programmeState: { ...nps, audit: [...nps.audit, { at: normalizeInstant(clock.now), weekIndex: null, reason }] } };
}

/**
 * Mise à niveau EXPLICITE d'un programme Beta 0 antérieur à S1 : l'intention Strength TEMPORAIRE (`str_full_body`
 * déclaré par l'application faute de composition) devient le cadre SANS archétype composé par le moteur Strength, comme
 * pour un programme neuf. Seule l'intention héritée EXACTE est concernée (`legacyBeta0StrengthIntent`) : une intention
 * explicite n'est jamais transformée. Idempotente ; tracée dans l'audit du programme. Les semaines déjà planifiées ne
 * sont pas touchées ici (voir la politique de semaine obsolète dans `ensureBeta0Week`).
 */
export function upgradeLegacyBeta0Programme(state: AppState, clock: Clock): AppState {
  const ps = state.programmeState;
  const legacy = ps ? legacyBeta0StrengthIntent(ps) : null;
  if (!ps || !legacy) return state;
  const sports = ps.definition.sports.map((x) => (x.sport === 'strength' ? { ...x, composition: 'engine' as const, intent: { ...legacy.frame } } : x));
  const current = ps.current.map((x) => (x.sport === 'strength' ? { ...x, intent: { ...legacy.frame } } : x));
  const reason = { code: 'KAIRO.PROGRAMME_STRENGTH_INTENT_UPGRADED', params: { from: `declared:${LEGACY_BETA0_STRENGTH_ARCHETYPE}`, to: 'engine', rule: STRENGTH_WEEKLY_COMPOSITION_CANDIDATE.id, version: STRENGTH_WEEKLY_COMPOSITION_CANDIDATE.version } };
  const next = zProgrammeState.parse({ ...ps, definition: { ...ps.definition, sports }, current, audit: [...ps.audit, { at: normalizeInstant(clock.now), weekIndex: null, reason }] });
  return { ...state, programmeState: next };
}

/**
 * Ouverture de l'application : semaines passées du programme clôturées (séances non saisies ⇒ manquées, dérivé),
 * séances en cours d'une semaine clôturée abandonnées, programme antérieur à S1 mis à niveau, puis semaine courante :
 * planifiée si elle ne l'est pas ; RÉGÉNÉRÉE si elle a été planifiée par une version antérieure du chemin ET n'est pas
 * commencée (`weekPlanning` : aucun résultat, aucune séance en cours, aucune séance à une date passée) ; conservée
 * telle quelle sinon (jamais de remplacement silencieux d'une semaine commencée). Sauf pause douleur active (garde
 * commune) ou semaine hors horizon. Erreur de planification ⇒ AppError propagée.
 */
/**
 * S3 — frontière de semaine Strength (ProgressionEngine), juste avant de planifier une NOUVELLE semaine, hors pause
 * douleur : reprise des tracks suspendues, clôtures traçables, revues d'ancre ; chaque décision est auditée.
 */
function strengthBoundary(state: AppState, clock: Clock, weekIndex: number): AppState {
  const ps = state.programmeState;
  if (!ps || state.strength.tracks.length === 0) return state;
  const at = normalizeInstant(clock.now);
  const b = strengthWeekBoundary(state, at, { painCleared: activePainPause(state) === null });
  if (b.reasons.length === 0) return state;
  const audited = b.reasons.map((r) => ({ at, weekIndex, reason: { code: r.code, params: { ...r.params } } }));
  return { ...state, strength: b.strength, programmeState: { ...ps, audit: [...ps.audit, ...audited] } };
}

export function ensureBeta0Week(state: AppState, clock: Clock, env: ProgrammeEnvironment = beta0Environment()): AppState {
  const ps0 = state.programmeState;
  if (!ps0 || !state.profile) return state;
  const cur = weekIndexOf(ps0, clock.today);
  let s = state;
  for (const w of ps0.weeks) if (!w.closedAt && w.weekIndex < cur) s = closeProgrammeWeekInApp(s, clock, env, w.weekIndex);
  const results = s.programmeState?.results ?? [];
  const programmeLogs = Object.fromEntries(Object.entries(s.programmeLogs).filter(([id, l]) => l.finishedAt !== undefined || !results.some((r) => r.requestId === id)));
  s = upgradeLegacyBeta0Programme({ ...s, programmeLogs }, clock);
  const ps = s.programmeState;
  if (!ps || !withinProgramme(ps, cur) || activePainPause(s)) return s;
  const existing = ps.weeks.find((w) => w.weekIndex === cur);
  if (!existing) return planProgrammeCurrentWeek(strengthBoundary(s, clock, cur), clock, env, cur, { pastDaysUnavailable: true });
  const planning = env.planningVersion ? weekPlanning(s, existing.plannerRef, clock.today, env.planningVersion) : null;
  if (planning?.status !== 'stale_replaceable') return s;
  const replanned = planProgrammeCurrentWeek(strengthBoundary(s, clock, cur), clock, env, cur, { pastDaysUnavailable: true });
  const rps = replanned.programmeState;
  if (!rps) return replanned;
  const reason = { code: 'KAIRO.WEEK_REPLANNED_STALE', params: { weekStart: existing.plannerRef, fromVersion: planning.version ?? 'unversioned', toVersion: env.planningVersion ?? '' } };
  return { ...replanned, programmeState: { ...rps, audit: [...rps.audit, { at: normalizeInstant(clock.now), weekIndex: cur, reason }] } };
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
  /** Erreur de données sur l'archétype prescrit (jamais masquée). */
  readonly dataError: 'ARCHETYPE_MISSING' | 'ARCHETYPE_MISMATCH' | null;
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
    requestId, sport: r.sport, date: r.date, session, ...prescribedArchetype(r), role: r.composition?.role ?? null,
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
      requestId: l.requestId, sport: l.sport, date: r?.date ?? dateOf(l.startedAt), archetypeId: r ? prescribedArchetype(r).archetypeId : null, role: r?.composition?.role ?? null,
      completion: l.outcome.completion, pain: l.outcome.pain, sets: l.sets.filter((x) => x.done), run: l.outcome.run ?? null,
      testReference: state.running.references.some((x) => x.referenceId === `test:${l.requestId}`),
    }];
  });
  const missed = (state.programmeState?.results ?? []).flatMap((x): HistoryEntry[] => {
    if (x.completion !== 'missed' || fromLogs.some((e) => e.requestId === x.requestId) || (x.sport !== 'strength' && x.sport !== 'running')) return [];
    const r = requestOf(state, x.requestId);
    return [{ requestId: x.requestId, sport: x.sport, date: x.date, archetypeId: r ? prescribedArchetype(r).archetypeId : null, role: r?.composition?.role ?? null, completion: 'missed', pain: false, sets: [], run: null, testReference: false }];
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
