/**
 * Programme longitudinal dans l'application : app-core → Programme Engine → planificateur global → moteurs → CORE.
 * L'application ne décide rien de sportif : elle fournit l'état (historique, disponibilités, déclarations), persiste
 * la semaine planifiée et l'état du programme, et renvoie les réalisations à l'historique des moteurs par leurs
 * contrats existants (course réalisée, référence TEST, empreintes, douleur).
 */
import type { FingerprintHistoryEntry, ReasonCode, SessionDraft, SessionRecord } from '@hybridsport/domain';
import { migrateToCurrent } from '@hybridsport/engine';
import type { LoadedRuleset } from '@hybridsport/engine';
import { closeProgrammeWeek, createProgramme, planProgrammeWeek, recordProgrammeResult, requestIntent, weekIndexOf } from '@hybridsport/programme';
import type { Completion, ProgrammeDefinitionInput, ProgrammeState } from '@hybridsport/programme';
import { AppError } from './app.js';
import type { Clock } from './app.js';
import { addDays, normalizeInstant } from './dates.js';
import type { AppState, ProgrammeIntent, SessionLog } from './model.js';
import { appPlannerEnvironment, buildPorts, clockOf, persistWeek, recentOf } from './planning.js';
import type { EngineGoals, PlannerEnvironment } from './planning.js';
import { realizedRunFrom, testReferenceFrom } from './progression.js';

/** Erreur applicative portant les raisons structurées (jamais « échec » sans cause). */
export class ProgrammeError extends AppError {
  constructor(code: string, readonly reasons: readonly ReasonCode[]) { super(code); }
}

/** Environnement du programme : celui du planificateur + gouvernance du programme (politique, horizon glissant). */
export interface ProgrammeEnvironment extends PlannerEnvironment {
  readonly programmeGovernance?: LoadedRuleset;
}

const requireProgramme = (s: AppState): ProgrammeState => {
  if (!s.programmeState) throw new AppError('PROGRAMME_MISSING');
  return s.programmeState;
};

export function startProgramme(state: AppState, definition: ProgrammeDefinitionInput, clock: Clock): AppState {
  if (!state.profile) throw new AppError('PROFILE_MISSING');
  const r = createProgramme(definition, normalizeInstant(clock.now));
  if (!r.ok) throw new ProgrammeError('PROGRAMME_INVALID', r.reasons);
  return { ...state, programmeState: r.value };
}

/** Intention au format du chemin multisport (déclarations transmises aux ports) et objectifs vers les contrats moteurs. */
function portInputs(ps: ProgrammeState): { intent: ProgrammeIntent; goals: EngineGoals } {
  const d = ps.definition;
  const intent: ProgrammeIntent = {
    origin: d.origin,
    sports: d.priorities.flatMap((sp) => {
      const plan = d.sports.find((x) => x.sport === sp);
      return plan ? [{ sport: sp, sessions: plan.sessionsPerWeek, intent: { ...plan.intent }, declarations: { ...plan.declarations }, ...(plan.station === undefined ? {} : { station: plan.station }) }] : [];
    }),
  };
  const goals: { -readonly [K in keyof EngineGoals]: EngineGoals[K] } = {};
  for (const g of d.goals) {
    if (g.sport === 'strength' && goals.strength === undefined) goals.strength = g.goal;
    if (g.sport === 'running' && goals.running === undefined) goals.running = { type: g.goal, ...(g.targetDate ? { targetDate: g.targetDate } : {}) };
    if (g.sport === 'crosstraining' && goals.crosstraining === undefined) goals.crosstraining = g.goal;
  }
  return { intent, goals };
}

/** Planifie la semaine du programme (par défaut la semaine courante) et persiste semaine et état. */
export function planProgrammeCurrentWeek(state: AppState, clock: Clock, env: ProgrammeEnvironment = appPlannerEnvironment(), weekIndex?: number): AppState {
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  const ps = requireProgramme(state);
  const i = weekIndex ?? weekIndexOf(ps, clock.today);
  const weekStart = addDays(ps.definition.startWeek, i * p.availability.length);
  const { intent, goals } = portInputs(ps);
  const r = planProgrammeWeek(ps, i, {
    today: clock.today, at: normalizeInstant(clock.now), mode: env.mode, ports: buildPorts(state, p, intent, env, goals), plannerGovernance: env.governance,
    programmeGovernance: env.programmeGovernance, clock: clockOf(), days: p.availability.map((m, k) => ({ date: addDays(weekStart, k), availableMinutes: m })),
    recent: recentOf(state, p, weekStart),
  });
  if (!r.ok) throw new ProgrammeError('PROGRAMME_WEEK_NOT_PLANNABLE', r.reasons);
  return { ...state, programmeState: r.value.state, planner: { weeks: { ...state.planner.weeks, [weekStart]: persistWeek(r.value.week, normalizeInstant(clock.now), ps.definition.origin) } } };
}

export interface ProgrammeSessionResult {
  readonly requestId: string;
  readonly completion: Completion;
  readonly pain: boolean;
  /** Course : durée réalisée et, facultativement, distance et temps de TEST (résultat mesuré). */
  readonly run?: { readonly realizedDurationS: number; readonly distanceM?: number; readonly testTimeS?: number };
  readonly difficulty?: NonNullable<SessionLog['feedback']>['difficulty'];
}

const RUN_COMPLETION: Readonly<Record<Completion, NonNullable<SessionLog['run']>['completion']>> = { completed_as_prescribed: 'COMPLETED', modified: 'PARTIAL', abandoned: 'PARTIAL', missed: 'SKIPPED' };

/**
 * Enregistre la réalisation d'une séance planifiée : état du programme + historique des moteurs par leurs contrats
 * (course réalisée et référence TEST, empreinte anti-doublon, pause douleur existante). Aucune progression calculée ici.
 */
export function recordProgrammeSession(state: AppState, clock: Clock, x: ProgrammeSessionResult): AppState {
  const ps = requireProgramme(state);
  const at = normalizeInstant(clock.now);
  const week = ps.weeks.find((w) => w.requests.some((r) => r.requestId === x.requestId));
  const planned = week ? state.planner.weeks[week.plannerRef]?.requests.find((r) => r.requestId === x.requestId) : undefined;
  const decoded = planned?.record ? migrateToCurrent<SessionRecord>(planned.record) : undefined;
  const record = decoded?.ok ? decoded.value : undefined;
  const intent = requestIntent(ps, x.requestId);
  const r = recordProgrammeResult(ps, {
    requestId: x.requestId, completion: x.completion, pain: x.pain, recordedAt: at,
    ...(x.run?.testTimeS !== undefined ? { measured: { kind: 'TIME_TRIAL', values: { durationS: x.run.testTimeS } } } : {}),
  });
  if (!r.ok) throw new ProgrammeError('PROGRAMME_RESULT_REJECTED', r.reasons);
  let s: AppState = { ...state, programmeState: r.value, revision: state.revision + 1 };
  const sport = planned?.sport;
  const session: SessionDraft | undefined = record?.session;
  if (sport === 'running' && session && intent && x.run && x.completion !== 'missed') {
    const run = { realizedDurationS: x.run.realizedDurationS, completion: RUN_COMPLETION[x.completion], ...(x.run.distanceM !== undefined ? { distanceM: x.run.distanceM } : {}), ...(x.run.testTimeS !== undefined ? { testTimeS: x.run.testTimeS } : {}) };
    const real = { sessionId: x.requestId, archetypeId: intent.archetypeId, session, run, ...(x.difficulty ? { difficulty: x.difficulty } : {}), pain: x.pain, at };
    const ref = testReferenceFrom(real);
    s = { ...s, running: { realized: [...s.running.realized, realizedRunFrom(real)], references: [...s.running.references, ...(ref ? [ref] : [])] } };
  }
  const fp = record?.fingerprint.status === 'available' ? record.fingerprint.value : undefined;
  if (fp && x.completion !== 'missed' && (sport === 'strength' || sport === 'running' || sport === 'crosstraining')) {
    const entry = { fingerprint: fp, at, status: 'completed', repetitionIntents: [] } as FingerprintHistoryEntry;
    s = { ...s, fingerprints: { ...s.fingerprints, [sport]: [...s.fingerprints[sport], entry] } };
  }
  // Douleur déclarée : même règle G1 fail-closed que le chemin V0 (pause de toutes les séances jusqu'à levée explicite).
  if (x.pain) s = { ...s, safety: { activePain: { reportedAt: at, areas: [], sessionKey: x.requestId } } };
  return s;
}

/** Clôture une semaine du programme (par défaut la précédente) : manquées dérivées, adhérence, décisions gouvernées. */
export function closeProgrammeWeekInApp(state: AppState, clock: Clock, env: ProgrammeEnvironment = appPlannerEnvironment(), weekIndex?: number): AppState {
  const ps = requireProgramme(state);
  const i = weekIndex ?? weekIndexOf(ps, clock.today) - 1;
  const r = closeProgrammeWeek(ps, i, { today: clock.today, at: normalizeInstant(clock.now), mode: env.mode, programmeGovernance: env.programmeGovernance });
  if (!r.ok) throw new ProgrammeError('PROGRAMME_WEEK_NOT_CLOSABLE', r.reasons);
  return { ...state, programmeState: r.value };
}

