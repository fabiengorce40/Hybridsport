import { muscleLevel, personalizationParams } from './strength-personalization.js';
import { personalizedStrengthContent } from './provisional-content.js';
import { strengthReasons } from '@hybridsport/strength';
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
import type { StrengthCompositionRule } from '@hybridsport/strength';
import { crossTrainingPort, hyroxHistoriesOf, hyroxPort, planMultisportWeek, runningPort, strengthPort } from '@hybridsport/planner';
import type { QualityAssessment } from '@hybridsport/engine';
import type { CompositeDemandRule, CrossTrainingEngine, CtGovernance, HyroxEngine, PlannedWeek, PlannerClock, PlannerMode, SlotRequest, SportPorts, StrengthBlockRule, StrengthWithinWeekVariationRule } from '@hybridsport/planner';
import type { CoreState, LoadedRuleset, SportEngine } from '@hybridsport/engine';
import { UNKNOWN_CORE_STATE } from './checkin.js';
import { addDays, normalizeInstant, sessionInstant, weekStartOf } from './dates.js';
import { coreProfile, RUNNING_CAPABILITY_REQUESTS, runningContext, simulatedRunning, strengthContextAt } from './generate.js';
import type { AppState, EnvironmentAuthority, PersistedWeek, Profile, ProgrammeIntent, ProgrammeIntentInput, Reason, Sport } from './model.js';
import type { RunningParameter } from '@hybridsport/running';
import { zProgrammeIntent } from './model.js';
import { RUNNING_ARCHETYPE, STIMULUS_BY_GOAL, STRENGTH_ARCHETYPE } from './planner.js';
import { runningContent, strengthContent } from './provisional-content.js';
import type { ContentSource } from './provisional-content.js';
import type { Clock } from './app.js';
import { AppError } from './app.js';
import { assertPlanningAllowed, writePlannedWeek } from './weeks.js';
import { freeRunRecent } from './free-run-load.js';

type Content = Pick<ContentSource, 'ruleset' | 'catalog'>;
/** Environnement d'orchestration : moteurs, contenus, gouvernance du planificateur et mode. Injecté (tests : TEST_ONLY). */
export interface PlannerEnvironment {
  readonly mode: PlannerMode;
  /** Autorité EXPLICITE de l'environnement, vérifiée avant toute planification (`assertEnvironment`). */
  readonly authority: EnvironmentAuthority;
  /** Identifiants des valeurs SIMULATION_ONLY injectées (tracés dans la semaine persistée) ; interdits en production. */
  readonly simulation?: readonly string[];
  /** Version du chemin de planification (compositeurs), écrite dans chaque semaine persistée (`planningVersion`). */
  readonly planningVersion?: string;
  /** Ruleset de gouvernance du planificateur ; absent ⇒ décisions d'interférence fail-closed. */
  readonly governance?: LoadedRuleset;
  /**
   * `composition` : règle de composition hebdomadaire du MOTEUR Strength (archétype de chaque séance). Absente : intention
   * déclarée exécutée telle quelle (chemin multisport existant).
   */
  readonly strength?: { readonly engine: SportEngine<unknown>; readonly content: Content; readonly composition?: { readonly rule: StrengthCompositionRule | undefined }; readonly withinWeekVariation?: StrengthWithinWeekVariationRule };
  readonly running?: { readonly engine: SportEngine<unknown>; readonly content: Content; readonly composition?: { readonly parameters: readonly RunningParameter[] } };
  /**
   * `transportNeighbours` : voisines (seconde passe) et priorité transportées au contexte CT (C3) ; `simulation` :
   * identifiants SIMULATION_ONLY propres au Cross-training, tracés dans les seules semaines qui en contiennent.
   */
  readonly crosstraining?: { readonly engine: CrossTrainingEngine; readonly content: Content; readonly transportNeighbours?: boolean; readonly simulation?: readonly string[]; readonly governance?: CtGovernance; readonly strengthBlockRule?: StrengthBlockRule; readonly compositeDemand?: CompositeDemandRule };
  /**
   * `transportNeighbours` (H2.5) : voisines, priorité et séances HYROX de la semaine transportées au contexte H2 ;
   * `simulation` : identifiants SIMULATION_ONLY propres à HYROX, tracés dans les seules semaines qui en contiennent.
   */
  readonly hyrox?: { readonly engine: HyroxEngine; readonly content: Content; readonly transportNeighbours?: boolean; readonly simulation?: readonly string[] };
}

/**
 * Environnement par défaut de l'application : Strength (contenu provisoire) et Running (simulation), comme V0 ;
 * aucun contenu Cross-training ni HYROX de production ⇒ moteurs non raccordés (ENGINE_UNAVAILABLE) ; aucune
 * gouvernance du planificateur ⇒ interférence multisport fail-closed.
 */
export function appPlannerEnvironment(): PlannerEnvironment {
  return { mode: 'CANDIDATE', authority: 'beta0_experimental', strength: { engine: StrengthEngine as SportEngine<unknown>, content: strengthContent() }, running: { engine: simulatedRunning as SportEngine<unknown>, content: runningContent() } };
}

/**
 * Cohérence de l'autorité (avant toute planification) : `production` ⇔ mode PRODUCTION et AUCUNE valeur
 * SIMULATION_ONLY ; `beta0_experimental` ⇒ mode CANDIDATE. Toute incohérence est refusée (aucun repli).
 */
export function assertEnvironment(env: Pick<PlannerEnvironment, 'mode' | 'authority' | 'simulation'>): void {
  if (env.authority === 'production' && (env.simulation ?? []).length > 0) throw new AppError('ENVIRONMENT_SIMULATION_IN_PRODUCTION');
  if (env.authority === 'production' && env.mode !== 'PRODUCTION') throw new AppError('ENVIRONMENT_AUTHORITY_MISMATCH');
  if (env.authority === 'beta0_experimental' && env.mode !== 'CANDIDATE') throw new AppError('ENVIRONMENT_AUTHORITY_MISMATCH');
}

/** Capacités Cross-training DEMANDÉES par l'application (le moteur décide de leur activation selon sa gouvernance). */
export const CT_CAPABILITY_REQUESTS = ['ctBootstrapExposure', 'ctReplayHold', 'ctHybridPlanning', 'ctSessionComposition', 'ctFullSessionComposition'] as const;

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
  /** HYROX : objectif du programme (`GENERAL` / `RACE_PREPARATION`), transmis au contrat H2 `goal.type`. */
  readonly hyrox?: string;
}

export function buildPorts(state: AppState, p: Profile, programme: ProgrammeIntent, env: PlannerEnvironment, goals: EngineGoals = {}, stateFor?: (date: string) => CoreState): SportPorts {
  const clock = clockOf();
  const profile = coreProfile(p);
  // P0 — état du jour : DÉCLARÉ au contrôle pré-séance (régénération d'une séance), sinon INCONNU — jamais « normal »
  // par défaut (spec 04 S4 ; Strength applique `unknownReadiness` gouverné, le CORE trace DATA.READINESS_UNKNOWN).
  const state0 = stateFor ? (slot: SlotRequest): CoreState => stateFor(slot.date) : UNKNOWN_CORE_STATE;
  const decl = (s: Sport): Record<string, unknown> => programme.sports.find((x) => x.sport === s)?.declarations ?? {};
  const ports: { -readonly [K in keyof SportPorts]: SportPorts[K] } = {};
  // Q1 — environnement des valeurs non approuvées pour le diagnostic de qualité (déclaré par l'autorité, jamais deviné).
  const qualityEnv = env.authority === 'beta0_experimental' ? 'SIMULATION_ONLY' as const : env.authority === 'test_only' ? 'TEST_ONLY' as const : undefined;
  const q = qualityEnv ? { qualityEnv } : {};
  if (env.strength) {
    const source = env.strength.content as ContentSource;
    const content = p.strength.personalization ? personalizedStrengthContent(source) : source;
    ports.strength = strengthPort({ ...q, engine: env.strength.engine, content, profile: p.strength.personalization ? { ...profile, athleteLevel: muscleLevel(p) } : profile, state: state0, history: state.fingerprints.strength, clock, ...(env.strength.withinWeekVariation ? { withinWeekVariation: env.strength.withinWeekVariation } : {}), ...(env.strength.composition ? { composition: { rule: env.strength.composition.rule, goal: { goal: goals.strength ?? p.strength.goal } } } : {}), baseContext: (slot) => { const b = strengthContextAt(state, p, slot.date, content); return goals.strength ? { ...b, goal: { primary: { goal: goals.strength } } } : b; } });
  }
  if (ports.strength && p.strength.personalization) {
    const original = ports.strength; const c = p.strength.personalization;
    const policy = personalizationParams()['strength.personalization'];
    if (!policy) throw new AppError('STRENGTH_PERSONALIZATION_POLICY_MISSING');
    ports.strength = { ...original, availableMinutesFor: (date,common) => { const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); const day = (weekday+p.availability.length-1)%p.availability.length; return c.days.includes(day) ? Math.min(common,c.sessionMinutes) : 0; }, generate: slot => {
      const weekday = new Date(`${slot.date}T12:00:00Z`).getUTCDay();
      const day = (weekday+p.availability.length-1)%p.availability.length;
      // technical-constant: dix caractères du format de date ISO AAAA-MM-JJ
      const dateLength = 10;
      const recent = [...(slot.weekSessions ?? []).map(w => ({ date:w.date, archetype:w.archetypeId })), ...state.strength.exposures.map(x => ({ date:x.at.slice(0,dateLength), archetype:x.slotId?.startsWith('up.') || x.slotId?.startsWith('str_upper.') ? 'str_upper' : x.slotId?.startsWith('lo.') || x.slotId?.startsWith('str_lower.') ? 'str_lower' : 'str_full_body' }))];
      // technical-constant: conversion millisecondes → heures
      const hourMs = 3600000;
      const disjoint = (a:string,b:string) => (a==='str_upper' && b==='str_lower') || (a==='str_lower' && b==='str_upper');
      const fullBodyBand = env.strength?.composition?.rule?.bands.find(b => b.rotation.length === 1 && b.rotation.includes('str_full_body'));
      const tooClose = !!fullBodyBand && p.strength.sessionsPerWeek <= fullBodyBand.maxSessions && recent.some(x => !disjoint(x.archetype,slot.intent.archetypeId) && x.date < slot.date && (Date.parse(slot.date)-Date.parse(x.date))/hourMs < policy.recoveryHours);
      if (!c.days.includes(day) || tooClose) return { status: 'refused', reasons: [strengthReasons.emit('PLAN.PERSONALIZATION_BLOCKED',{ cause: tooClose ? 'strength_recovery_window' : 'unavailable_day' })] };
      const result = original.generate({ ...slot, availableMinutes: Math.min(slot.availableMinutes,c.sessionMinutes) });
      return { ...result, reasons: [...result.reasons, strengthReasons.emit('PLAN.PERSONALIZATION',{ outcome:c.outcome, priorities:c.priorities.map(x=>`${x.zone}:${x.intention}`), policy:policy.version, strategy:policy.goals[c.outcome].strategy, recovery:c.recovery })] };
    } };
  }
  if (env.running) {
    ports.running = runningPort({
      ...q, engine: env.running.engine, content: env.running.content, profile, state: state0, history: state.fingerprints.running, clock,
      ...(env.running.composition ? { composition: env.running.composition } : {}),
      baseContext: (slot) => ({
        ...runningContext(state, p, slot), capabilityRequests: [...RUNNING_CAPABILITY_REQUESTS, 'hybridPlanning'],
        ...(goals.running ? { goal: { type: goals.running.type, ...(goals.running.targetDate ? { targetDate: sessionInstant(goals.running.targetDate) } : {}) } } : {}),
      }),
    });
  }
  if (env.crosstraining) {
    // C4.3 — port Strength en MODE BLOC (délégation par le planificateur) : même moteur et même contenu que Strength,
    // profil réel (matériel déclaré), historique réalisé ; objectif support:crosstraining ; règle TEST_ONLY de l'environnement.
    const rule = env.crosstraining.strengthBlockRule;
    const sc = env.strength?.content as ContentSource | undefined;
    const blockPort = rule && env.strength && sc ? strengthPort({
      ...q, engine: env.strength.engine, content: sc, profile, state: state0, history: state.fingerprints.strength, clock,
      baseContext: (slot) => { const { personalization: _personalization, personalizationSessions: _sessions, otherSports: _other, ...base } = strengthContextAt(state, p, slot.date, sc); return { ...base, goal: { primary: { goal: 'support' as const, supportFor: 'crosstraining' as const } }, blockMode: { host: 'crosstraining' as const } }; },
    }) : undefined;
    ports.crosstraining = crossTrainingPort({
      ...(blockPort && rule ? { strengthBlocks: { port: blockPort, rule } } : {}),
      ...(env.crosstraining.compositeDemand ? { compositeDemand: env.crosstraining.compositeDemand } : {}),
      ...q, ...(env.crosstraining.governance ? { qualityGovernance: env.crosstraining.governance } : {}), engine: env.crosstraining.engine, content: env.crosstraining.content, profile, state: state0, history: state.fingerprints.crosstraining, clock,
      ...(env.crosstraining.transportNeighbours ? { transportNeighbours: true } : {}),
      baseContext: (slot) => ({ ...decl('crosstraining'), ...(goals.crosstraining ? { goal: { type: goals.crosstraining } } : {}), sessionHistory: state.crosstraining.realized.filter((r) => typeof r.completedAt === 'string' && r.completedAt < sessionInstant(slot.date)), mode: env.mode, capabilityRequests: [...CT_CAPABILITY_REQUESTS] }) as never,
    });
  }
  if (env.hyrox) {
    // Réalisations HYROX ANTÉRIEURES au créneau : H1 (stations, `completedAt`) et H2 (séances composées, `at`), réduites
    // par le planificateur à leurs contrats (`sessionHistory` / `compositionHistory`). Aucune lecture sportive ici.
    const before = (slot: { date: string }) => state.hyrox.realized.filter((r) => { const t = r.at ?? r.completedAt; return typeof t === 'string' && t < sessionInstant(slot.date); });
    ports.hyrox = hyroxPort({
      ...q, engine: env.hyrox.engine, content: env.hyrox.content, profile, state: state0, history: [], clock,
      ...(env.hyrox.transportNeighbours ? { transportNeighbours: true } : {}),
      baseContext: (slot) => ({ ...decl('hyrox'), mode: env.mode, ...(goals.hyrox ? { goal: { type: goals.hyrox } } : {}), ...hyroxHistoriesOf(before(slot)) }) as never,
    });
  }
  return ports;
}

const reason = (r: ReasonCode): Reason => ({ code: r.code, params: { ...r.params } });

/**
 * RC3.1 A8 — cause décisive d'un refus : la première raison de sévérité « error » émise par un MOTEUR (cause précise),
 * sinon la première du planificateur (ex. jours insuffisants). Un avertissement ou une information n'est jamais une cause.
 */
export function decisiveReason(reasons: readonly ReasonCode[]): ReasonCode | undefined {
  const errors = reasons.filter((r) => r.severity === 'error');
  return errors.find((r) => !r.code.startsWith('PLAN.PLANNER.')) ?? errors[0];
}

/** Q1 — diagnostic compact : verdict et `critère|statut|base` (ordre stable du diagnostic). */
export const compactQuality = (q: QualityAssessment): { verdict: QualityAssessment['verdict']; criteria: string[] } => ({ verdict: q.verdict, criteria: q.criteria.map((c) => `${c.id}|${c.status}|${c.basis}`) });

/** Forme persistée (sans perte d'audit) d'une semaine planifiée. */
export function persistWeek(w: PlannedWeek, plannedAt: ISODateTime, programmeOrigin: string, env: Pick<PlannerEnvironment, 'authority' | 'simulation' | 'planningVersion' | 'crosstraining' | 'hyrox'>): Omit<PersistedWeek, 'owner'> {
  const ct = w.requests.some((r) => r.sport === 'crosstraining') ? env.crosstraining?.simulation ?? [] : [];
  const hr = w.requests.some((r) => r.sport === 'hyrox') ? env.hyrox?.simulation ?? [] : [];
  return {
    weekStart: w.weekStart, authority: env.authority, simulation: [...(env.simulation ?? []), ...ct, ...hr], plannedAt, mode: w.mode, hybrid: w.hybrid, programmeOrigin,
    ...(env.planningVersion ? { planningVersion: env.planningVersion } : {}),
    days: w.days.map((d) => (d.status === 'planned' ? { date: d.date, availableMinutes: d.availableMinutes, status: 'planned', sport: d.sport, requestId: d.requestId } : { date: d.date, availableMinutes: d.availableMinutes, status: 'empty', reason: reason(d.reason) })),
    requests: w.requests.map((r) => ({
      requestId: r.requestId, sport: r.sport, status: r.status, category: r.category, reasons: r.reasons.map(reason),
      ...(r.status === 'unplaced' ? {} : { date: r.date }),
      ...(r.status !== 'planned' && decisiveReason(r.reasons) ? { cause: reason(decisiveReason(r.reasons) as ReasonCode) } : {}),
      ...(r.intent ? { intent: { ...r.intent } } : {}), ...(r.composition ? { composition: { ...r.composition } } : {}),
      ...(r.status === 'planned' ? {
        record: toEnvelope('session_record', r.record),
        demand: r.demand.status === 'derived' ? { status: 'derived' as const, levels: { ...r.demand.levels } } : { status: 'unavailable' as const, reasons: r.demand.reasons.map(reason) },
        ...(r.quality ? { quality: compactQuality(r.quality) } : {}),
        ...(r.neighbourContext ? { neighbourContext: { known: r.neighbourContext.known, neighbours: r.neighbourContext.neighbours.map((n) => ({ ...n, demand: { ...n.demand } })) } } : {}),
        ...(r.crossInputs ? { crossInputs: { v: r.crossInputs.v, crosstraining: r.crossInputs.crosstraining.map((w) => ({ ...w, items: w.items.map(([e, n]) => [e, n] as [string, number]) })) } } : {}),
      } : {}),
      // M3.1 — composée mais non placée : la prescription du moteur est persistée telle quelle (réalisable, jamais recomposée).
      ...(r.status === 'unplaced' && r.composed ? {
        record: toEnvelope('session_record', r.composed.record), composedFor: { referenceDate: r.composed.referenceDate, availableMinutes: r.composed.availableMinutes },
        ...(r.composed.quality ? { quality: compactQuality(r.composed.quality) } : {}),
        demand: r.composed.demand.status === 'derived' ? { status: 'derived' as const, levels: { ...r.composed.demand.levels } } : { status: 'unavailable' as const, reasons: r.composed.demand.reasons.map(reason) },
      } : {}),
    })),
    conflicts: w.conflicts.map(reason),
    // M3 : raisons de l'arbitrage persistées seulement quand il est indisponible ou bloqué (fail-closed visible) ; les
    // valeurs candidates lues chaque semaine sont déjà tracées par `simulation` (état compact).
    governance: [...w.governance, ...(w.arbitration && (w.arbitration.status === 'BLOCKED' || w.arbitration.status === 'POLICY_UNAVAILABLE') ? w.arbitration.reasons : [])].map(reason),
    ...(w.arbitration ? { arbitration: { status: w.arbitration.status, passes: w.arbitration.passes, policyVersion: w.arbitration.policyVersion, initial: [...w.arbitration.initial], decisions: w.arbitration.decisions.map((d) => ({ ...d, why: [...d.why] })), residual: w.arbitration.residual.map((r) => ({ ...r, tried: [...r.tried] })) } } : {}),
  };
}

/**
 * Séances planifiées de la semaine précédente (historique d'interférence et de contexte voisin), avec leur statut
 * CONNU (M3) : réalisée (comme prévu ou modifiée), abandonnée, manquée, sinon seulement prévue. Une séance prévue n'est
 * jamais présentée comme réalisée ; la politique gouvernée du planificateur décide lesquelles comptent.
 */
export function recentOf(state: AppState, p: Profile, weekStart: string): { date: string; sport: Sport; session: SessionDraft; status: 'executed' | 'abandoned' | 'missed' | 'planned' }[] {
  const from = addDays(weekStart, -p.availability.length);
  // RC4.3 (R3) — courses libres datées et effectuées de la semaine précédente : voisines RÉALISÉES (charge réelle).
  return [...programmeRecentOf(state, state.planner.weeks[from]), ...freeRunRecent(state, from, weekStart)];
}

function programmeRecentOf(state: AppState, prev: AppState['planner']['weeks'][string] | undefined): { date: string; sport: Sport; session: SessionDraft; status: 'executed' | 'abandoned' | 'missed' | 'planned' }[] {
  const results = new Map((state.programmeState?.results ?? []).map((x) => [x.requestId, x]));
  const STATUS = { completed_as_prescribed: 'executed', modified: 'executed', abandoned: 'abandoned', missed: 'missed' } as const;
  return (prev?.requests ?? []).flatMap((r) => {
    const data = r.record?.data as { session?: SessionDraft } | undefined;
    const x = results.get(r.requestId);
    if (r.status === 'planned' && r.date && data?.session) return [{ date: r.date, sport: r.sport, session: data.session, status: x === undefined ? 'planned' as const : STATUS[x.completion] }];
    // M3.1 — séance non placée réalisée manuellement : exposition RÉELLE, au jour réel de sa réalisation.
    if (r.status === 'unplaced' && x?.provenance === 'manual_from_unplaced' && data?.session) return [{ date: x.date, sport: r.sport, session: data.session, status: STATUS[x.completion] }];
    return [];
  });
}

/**
 * Planifie la semaine par le planificateur global et la persiste dans l'état. Exige un profil et une intention de
 * programme (aucune composition déduite). La semaine précédemment planifiée par ce chemin est remplacée.
 */
export function planProgrammeWeek(state: AppState, clock: Clock, env: PlannerEnvironment = appPlannerEnvironment(), weekStart = weekStartOf(clock.today)): AppState {
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  assertEnvironment(env);
  assertPlanningAllowed(state);
  const programme = state.programme;
  if (!programme) throw new AppError('PROGRAMME_INTENT_MISSING');
  const days = p.availability.map((m, i) => ({ date: addDays(weekStart, i), availableMinutes: m }));
  const week = planMultisportWeek({
    weekStart, days, mode: env.mode, recent: recentOf(state, p, weekStart),
    demands: programme.sports.map((s) => ({ sport: s.sport, sessions: s.sessions, intent: { ...s.intent }, ...(s.station === undefined ? {} : { station: s.station }) })),
  }, buildPorts(state, p, programme, env), env.governance, clockOf());
  const plannedAt = normalizeInstant(clock.now);
  return writePlannedWeek(state, { ...persistWeek(week, plannedAt, programme.origin, env), ...(p.strength.personalization ? { strengthProfile: p } : {}) }, 'multisport');
}
