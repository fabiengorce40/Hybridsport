/**
 * Chemin applicatif MULTISPORT : profil → intention de programme → planificateur global → moteurs → CORE →
 * semaine persistée (session_record). L'application ne choisit ni exercice, ni dose, ni station, ne duplique aucune
 * règle d'interférence et ne construit aucune séance : elle construit les entrées DÉCLARÉES des ports (historique,
 * déclarations) et persiste le résultat du planificateur, refus et conflits compris.
 *
 * Le planificateur V0 (planner.ts) reste la voie des semaines Strength / Running existantes (migration progressive).
 */
import { toEnvelope } from '@hybridsport/engine';
import type { ISODateTime, ReasonCode, SessionDraft } from '@hybridsport/domain';
import { findArchetype, readStrengthParams, StrengthEngine } from '@hybridsport/strength';
import { crossTrainingPort, hyroxPort, planMultisportWeek, runningPort, strengthPort } from '@hybridsport/planner';
import type { CrossTrainingEngine, HyroxEngine, PlannedWeek, PlannerClock, PlannerMode, SportPorts } from '@hybridsport/planner';
import type { LoadedRuleset, SportEngine } from '@hybridsport/engine';
import { addDays, normalizeInstant, sessionInstant, weekStartOf } from './dates.js';
import { coreProfile, RUNNING_CAPABILITY_REQUESTS, runningContext, simulatedRunning, strengthContextAt } from './generate.js';
import type { AppState, PersistedWeek, Profile, ProgrammeIntent, ProgrammeIntentInput, Reason, Sport } from './model.js';
import { zProgrammeIntent } from './model.js';
import { RUNNING_ARCHETYPE, STIMULUS_BY_GOAL, STRENGTH_ARCHETYPE } from './planner.js';
import { runningContent, strengthContent } from './provisional-content.js';
import type { ContentSource } from './provisional-content.js';
import type { Clock } from './app.js';
import { AppError } from './app.js';

type Content = Pick<ContentSource, 'ruleset' | 'catalog'>;
/** Environnement d'orchestration : moteurs, contenus, gouvernance du planificateur et mode. Injecté (tests : TEST_ONLY). */
export interface PlannerEnvironment {
  readonly mode: PlannerMode;
  /** Ruleset de gouvernance du planificateur ; absent ⇒ décisions d'interférence fail-closed. */
  readonly governance?: LoadedRuleset;
  readonly strength?: { readonly engine: SportEngine<unknown>; readonly content: Content };
  readonly running?: { readonly engine: SportEngine<unknown>; readonly content: Content };
  readonly crosstraining?: { readonly engine: CrossTrainingEngine; readonly content: Content };
  readonly hyrox?: { readonly engine: HyroxEngine; readonly content: Content };
}

/**
 * Environnement par défaut de l'application : Strength (contenu provisoire) et Running (simulation), comme V0 ;
 * aucun contenu Cross-training ni HYROX de production ⇒ moteurs non raccordés (ENGINE_UNAVAILABLE) ; aucune
 * gouvernance du planificateur ⇒ interférence multisport fail-closed.
 */
export function appPlannerEnvironment(): PlannerEnvironment {
  return { mode: 'CANDIDATE', strength: { engine: StrengthEngine as SportEngine<unknown>, content: strengthContent() }, running: { engine: simulatedRunning as SportEngine<unknown>, content: runningContent() } };
}

/** Capacités Cross-training DEMANDÉES par l'application (le moteur décide de leur activation selon sa gouvernance). */
export const CT_CAPABILITY_REQUESTS = ['ctBootstrapExposure', 'ctReplayHold', 'ctHybridPlanning'] as const;

/**
 * Intention de programme Strength / Running issue des déclarations du PROFIL (nombre de séances déclaré par
 * l'utilisateur, ordre de priorité déclaré) et des choix V0 existants (archétype Strength, stimulus par objectif,
 * archétype Running provisoire). Cross-training et HYROX : aucune intention déduite (nombre, intention et station
 * doivent être déclarés par le programme ou l'utilisateur).
 */
export function programmeFromProfile(p: Profile): ProgrammeIntent {
  const sports = p.priorities.filter((s) => p[s].enabled).flatMap((s): ProgrammeIntent['sports'] => {
    if (s === 'strength') {
      const a = findArchetype(readStrengthParams(strengthContent().ruleset).values, STRENGTH_ARCHETYPE);
      const stimulus = STIMULUS_BY_GOAL[p.strength.goal];
      return [{ sport: s, sessions: p.strength.sessionsPerWeek, intent: { archetypeId: STRENGTH_ARCHETYPE, stimulus, objective: `objective.${stimulus}`, phase: 'phase.accumulation', ...(a ? { toleranceProfile: a.toleranceProfile } : {}) }, declarations: {} }];
    }
    if (s === 'running') return [{ sport: s, sessions: p.running.sessionsPerWeek, intent: { archetypeId: RUNNING_ARCHETYPE, stimulus: 'stim.running.aerobic', objective: 'objective.running.base', phase: 'phase.running.base', toleranceProfile: 'fixed_time' }, declarations: {} }];
    return [];
  });
  return { sports, origin: 'profile' };
}

export function setProgrammeIntent(state: AppState, intent: ProgrammeIntentInput): AppState {
  return { ...state, programme: zProgrammeIntent.parse(intent) };
}

export const clockOf = (): PlannerClock => ({ instantOf: sessionInstant, timezone: 'Europe/Paris' });

/** Ports des moteurs raccordés, contextes construits depuis l'état (historique) et les déclarations du programme. */
/**
 * Objectifs du programme transmis aux moteurs par leur CONTRAT de contexte (aucune progression déduite) : Strength
 * `goal.primary`, Running `goal.type` / `targetDate`, Cross-training `goal.type`. HYROX : aucun champ d'objectif.
 */
export interface EngineGoals {
  readonly strength?: Profile['strength']['goal'];
  readonly running?: { readonly type: Profile['running']['goal']; readonly targetDate?: string };
  readonly crosstraining?: string;
}

export function buildPorts(state: AppState, p: Profile, programme: ProgrammeIntent, env: PlannerEnvironment, goals: EngineGoals = {}): SportPorts {
  const clock = clockOf();
  const profile = coreProfile(p);
  const state0 = { readiness: 'normal' as const, activePain: [], painHistory: 'available' as const, dayAvailable: true };
  const decl = (s: Sport): Record<string, unknown> => programme.sports.find((x) => x.sport === s)?.declarations ?? {};
  const ports: { -readonly [K in keyof SportPorts]: SportPorts[K] } = {};
  if (env.strength) {
    const content = env.strength.content as ContentSource;
    ports.strength = strengthPort({ engine: env.strength.engine, content, profile, state: state0, history: state.fingerprints.strength, clock, baseContext: (slot) => { const b = strengthContextAt(state, p, slot.date, content); return goals.strength ? { ...b, goal: { primary: { goal: goals.strength } } } : b; } });
  }
  if (env.running) {
    ports.running = runningPort({
      engine: env.running.engine, content: env.running.content, profile, state: state0, history: state.fingerprints.running, clock,
      baseContext: (slot) => ({
        ...runningContext(state, p, slot), capabilityRequests: [...RUNNING_CAPABILITY_REQUESTS, 'hybridPlanning'],
        ...(goals.running ? { goal: { type: goals.running.type, ...(goals.running.targetDate ? { targetDate: sessionInstant(goals.running.targetDate) } : {}) } } : {}),
      }),
    });
  }
  if (env.crosstraining) {
    ports.crosstraining = crossTrainingPort({
      engine: env.crosstraining.engine, content: env.crosstraining.content, profile, state: state0, history: state.fingerprints.crosstraining, clock,
      baseContext: (slot) => ({ ...decl('crosstraining'), ...(goals.crosstraining ? { goal: { type: goals.crosstraining } } : {}), sessionHistory: state.crosstraining.realized.filter((r) => typeof r.completedAt === 'string' && r.completedAt < sessionInstant(slot.date)), mode: env.mode, capabilityRequests: [...CT_CAPABILITY_REQUESTS] }) as never,
    });
  }
  if (env.hyrox) ports.hyrox = hyroxPort({ engine: env.hyrox.engine, content: env.hyrox.content, profile, state: state0, history: [], clock, baseContext: () => ({ ...decl('hyrox'), mode: env.mode }) as never });
  return ports;
}

const reason = (r: ReasonCode): Reason => ({ code: r.code, params: { ...r.params } });

/** Forme persistée (sans perte d'audit) d'une semaine planifiée. */
export function persistWeek(w: PlannedWeek, plannedAt: ISODateTime, programmeOrigin: string): PersistedWeek {
  return {
    weekStart: w.weekStart, plannedAt, mode: w.mode, hybrid: w.hybrid, programmeOrigin,
    days: w.days.map((d) => (d.status === 'planned' ? { date: d.date, availableMinutes: d.availableMinutes, status: 'planned', sport: d.sport, requestId: d.requestId } : { date: d.date, availableMinutes: d.availableMinutes, status: 'empty', reason: reason(d.reason) })),
    requests: w.requests.map((r) => ({
      requestId: r.requestId, sport: r.sport, status: r.status, category: r.category, reasons: r.reasons.map(reason),
      ...(r.status === 'unplaced' ? {} : { date: r.date }),
      ...(r.status === 'planned' ? {
        record: toEnvelope('session_record', r.record),
        demand: r.demand.status === 'derived' ? { status: 'derived' as const, levels: { ...r.demand.levels } } : { status: 'unavailable' as const, reasons: r.demand.reasons.map(reason) },
        ...(r.neighbourContext ? { neighbourContext: { known: r.neighbourContext.known, neighbours: r.neighbourContext.neighbours.map((n) => ({ ...n, demand: { ...n.demand } })) } } : {}),
      } : {}),
    })),
    conflicts: w.conflicts.map(reason), governance: w.governance.map(reason),
  };
}

/** Séances planifiées de la semaine précédente (historique d'interférence et de contexte voisin). */
export function recentOf(state: AppState, p: Profile, weekStart: string): { date: string; sport: Sport; session: SessionDraft }[] {
  const prev = state.planner.weeks[addDays(weekStart, -p.availability.length)];
  return (prev?.requests ?? []).flatMap((r) => {
    const data = r.record?.data as { session?: SessionDraft } | undefined;
    return r.status === 'planned' && r.date && data?.session ? [{ date: r.date, sport: r.sport, session: data.session }] : [];
  });
}

/**
 * Planifie la semaine par le planificateur global et la persiste dans l'état. Exige un profil et une intention de
 * programme (aucune composition déduite). La semaine précédemment planifiée par ce chemin est remplacée.
 */
export function planProgrammeWeek(state: AppState, clock: Clock, env: PlannerEnvironment = appPlannerEnvironment(), weekStart = weekStartOf(clock.today)): AppState {
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  const programme = state.programme;
  if (!programme) throw new AppError('PROGRAMME_INTENT_MISSING');
  const days = p.availability.map((m, i) => ({ date: addDays(weekStart, i), availableMinutes: m }));
  const week = planMultisportWeek({
    weekStart, days, mode: env.mode, recent: recentOf(state, p, weekStart),
    demands: programme.sports.map((s) => ({ sport: s.sport, sessions: s.sessions, intent: { ...s.intent }, ...(s.station === undefined ? {} : { station: s.station }) })),
  }, buildPorts(state, p, programme, env), env.governance, clockOf());
  const plannedAt = normalizeInstant(clock.now);
  return { ...state, planner: { weeks: { ...state.planner.weeks, [weekStart]: persistWeek(week, plannedAt, programme.origin) } } };
}
