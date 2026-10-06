/**
 * KAIRO Beta 0 — chemin hybride Strength + Running : profil → Programme Engine → Global Planner → moteurs.
 *
 * Responsabilités (aucune logique sportive ici) :
 *   - le PROGRAMME déclare, par sport, le nombre de séances et le cadre d'intention ; pour Running, la composition
 *     hebdomadaire est demandée au MOTEUR (`composition: 'engine'`) ;
 *   - le PLANIFICATEUR place les séances dans les disponibilités, vérifie l'interférence, appelle les moteurs ;
 *   - RUNNING compose sa semaine (§R : KEY / LONG / TEST / EASY) sur les jours placés ;
 *   - STRENGTH compose sa semaine (archétype de chaque séance, `composeStrengthWeek`) sur les jours placés, avec la règle
 *     CANDIDATE tirée de la spec Strength 02 §5 (non approuvée : autorité `provisional`, refusée en PRODUCTION) ; chaque
 *     séance connaît les séances Strength placées avant elle dans la semaine (expositions PRÉVUES).
 *
 * Environnement EXPÉRIMENTAL (autorité `beta0_experimental`, mode CANDIDATE) : les seules valeurs disponibles sont des
 * fixtures de test EXISTANTES, réutilisées sans modification et déclarées SIMULATION_ONLY (identifiants listés dans
 * `BETA0_SIMULATION`, tracés dans chaque semaine persistée). Aucune n'est approuvée : en PRODUCTION elles sont
 * refusées par les lecteurs gouvernés (fail-closed) et un environnement `production` qui en porte est refusé.
 */
import { CURRENT_RUNNING_GOVERNANCE, ARCHETYPE_INTENT_IDS, createRunningEngine, withProductDecisions } from '@hybridsport/running';
import type { RunningGovernance } from '@hybridsport/running';
import { requirePlannerProvenance } from '@hybridsport/planner';
import { StrengthEngine, STRENGTH_WEEKLY_COMPOSITION_CANDIDATE, goalKey, readStrengthParams } from '@hybridsport/strength';
import type { SportEngine } from '@hybridsport/engine';
import { adherenceOf, weekIndexOf, weekStartAt, weekStatus, withinProgramme } from '@hybridsport/programme';
import type { Adherence, ProgrammeDefinition, ProgrammeDefinitionInput, ProgrammeResult, ProgrammeState, WeekStatus } from '@hybridsport/programme';
import { plannerGovernance, withDemand } from '../../planner/tests/simulation.js';
import { AppError } from './errors.js';
import { addDays, daysBetween, weekStartOf } from './dates.js';
import type { AppState, EnvironmentAuthority, PersistedWeek, Profile, Reason, Sport } from './model.js';
import { STIMULUS_BY_GOAL } from './planner.js';
import type { ProgrammeEnvironment } from './programme.js';
import { runningContent, strengthContent } from './provisional-content.js';

/** Sports exposés en Beta 0. */
export const BETA0_SPORTS = ['strength', 'running'] as const;

/** Marqueur porté par chaque valeur SIMULATION_ONLY injectée (justification lisible dans le ruleset). */
export const SIMULATION_ONLY = 'SIMULATION_ONLY — Beta 0 expérimental : valeur de test, non approuvée, jamais lue en production';

/**
 * Valeurs SIMULATION_ONLY de l'environnement Beta 0 :
 *   - écarts d'interférence par structure (fixture du planificateur) ;
 *   - normalisation des doses Strength / Running (fixture du planificateur) ;
 *   - intégration « planificateur global ↔ Running » déclarée satisfaite (dépendance technique de Running), tenue
 *     par la provenance obligatoire du planificateur ;
 *   - moteur Running en simulation (comme V0).
 * Les règles de composition Running (V26, V10, V11) sont les valeurs CANDIDATES de la gouvernance Running existante
 * (non approuvées, tracées CANDIDATE_VALUE_USED, non résolues en PRODUCTION). La règle de composition Strength est la
 * règle CANDIDATE du moteur Strength (`STRENGTH_WEEKLY_COMPOSITION_CANDIDATE`, citation de la spec 02 §5 ; tracée
 * PLAN.WEEK_COMPOSITION avec son statut, autorité `provisional`, non résolue en PRODUCTION).
 */
export const BETA0_SIMULATION = [
  'planner.interference.structureWindows', 'demand.doseNormalization', 'running.technical.GLOBAL_PLANNER_INTEGRATION', 'running.engine.simulation',
] as const;

/** Gouvernance Running Beta 0 : décisions produit existantes + intégration planificateur déclarée (SIMULATION_ONLY). */
export function beta0RunningGovernance(): RunningGovernance {
  const g = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
  return { ...g, technical: { ...g.technical, GLOBAL_PLANNER_INTEGRATION: 'SATISFIED' } };
}

const simulationMark = { justification: SIMULATION_ONLY };

/**
 * Version du chemin de planification Beta 0, écrite dans chaque semaine persistée. À INCRÉMENTER à chaque changement
 * d'un compositeur (Running, Strength) ou de l'intention dérivée du profil : une semaine NON COMMENCÉE d'une version
 * antérieure est alors régénérée de façon sûre ; une semaine commencée est conservée telle quelle (beta0-app.ts).
 * `beta0-s1` : composition hebdomadaire Strength par le moteur (S1). Absente : antérieure à S1.
 * `beta0-s3` : Strength longitudinal (S3) — graine Strength stable, ancres déclarées, prescription hebdomadaire tracée.
 * `beta0-s4` : continuité des exercices déclarée, priorité des sports transportée, bilan de volume, traces allégées.
 */
export const BETA0_PLANNING_VERSION = 'beta0-s4';

/**
 * Environnement Beta 0 EXPÉRIMENTAL : Strength et Running seulement (CT / HYROX non raccordés), mode CANDIDATE.
 * Running n'accepte un athlète multisport QUE par le planificateur global (provenance obligatoire) : tout autre
 * chemin reste refusé. Aucune politique d'adaptation (décisions BLOCKED) ni horizon d'avance : aucune valeur inventée.
 */
export function beta0Environment(): ProgrammeEnvironment {
  const g = beta0RunningGovernance();
  return {
    mode: 'CANDIDATE', authority: 'beta0_experimental', simulation: [...BETA0_SIMULATION], planningVersion: BETA0_PLANNING_VERSION,
    governance: plannerGovernance(undefined, simulationMark),
    strength: { engine: StrengthEngine as SportEngine<unknown>, content: withDemand(strengthContent(), undefined, simulationMark), composition: { rule: STRENGTH_WEEKLY_COMPOSITION_CANDIDATE } },
    running: {
      engine: requirePlannerProvenance(createRunningEngine({ governance: g, simulation: true }) as SportEngine<unknown>),
      content: withDemand(runningContent(), undefined, simulationMark),
      composition: { parameters: g.parameters },
    },
  };
}

/** Autorité d'un environnement (lecture pour l'interface). */
export const isExperimental = (a: EnvironmentAuthority | 'unknown'): boolean => a !== 'production';

export interface ProgrammeFromProfileOptions {
  readonly programmeId: string;
  /** Lundi de la semaine 1. */
  readonly startWeek: string;
  /**
   * Fin explicite du programme (semaines), facultative. Absente : semaine de la date d'objectif Running si elle est
   * déclarée, sinon programme CONTINU (aucune fin). Jamais une durée par défaut.
   */
  readonly horizonWeeks?: number;
  readonly origin: string;
  /** Date cible DÉCLARÉE de l'objectif Running (contrat Running `goal.targetDate`), facultative. */
  readonly runningTargetDate?: string;
}

/**
 * Définition de programme Beta 0 issue des seules DÉCLARATIONS du profil (sports activés, ordre de priorité, objectif,
 * nombre de séances) : Strength = cadre d'intention SANS archétype (stimulus par objectif), composition par le MOTEUR
 * Strength ; Running = cadre d'intention V0 SANS archétype, composition par le moteur. Évaluation Running : la séance TEST du moteur
 * (demandée seulement par une décision gouvernée REASSESS). Aucun sport hors Beta 0, aucune phase inférée.
 */
export function programmeDefinitionFromProfile(p: Profile, o: ProgrammeFromProfileOptions): ProgrammeDefinitionInput {
  const enabled = p.priorities.filter((s): s is (typeof BETA0_SPORTS)[number] => (BETA0_SPORTS as readonly Sport[]).includes(s) && p[s].enabled);
  if (enabled.length === 0) throw new AppError('BETA0_NO_SPORT');
  const runningFrame = { stimulus: 'stim.running.aerobic', objective: 'objective.running.base', phase: 'phase.running.base', toleranceProfile: 'fixed_time' };
  const sports = enabled.map((s) => {
    if (s === 'strength') {
      // Profil de tolérance du cadre : celui, UNIQUE, des archétypes Strength admis pour l'objectif (donnée du ruleset) ;
      // chaque séance composée porte ensuite celui de son archétype. Aucun archétype choisi ici.
      const toleranceProfile = strengthFrameTolerance(p.strength.goal);
      if (toleranceProfile === undefined) throw new AppError('BETA0_STRENGTH_ARCHETYPE_MISSING');
      const stimulus = STIMULUS_BY_GOAL[p.strength.goal];
      return { sport: s, sessionsPerWeek: p.strength.sessionsPerWeek, composition: 'engine' as const, intent: { stimulus, objective: `objective.${stimulus}`, phase: 'phase.accumulation', toleranceProfile } };
    }
    return {
      sport: s, sessionsPerWeek: p.running.sessionsPerWeek, composition: 'engine' as const, intent: runningFrame,
      assessment: { kind: 'running.test', intent: { ...runningFrame, archetypeId: ARCHETYPE_INTENT_IDS.TEST } },
    };
  });
  const goals = enabled.map((s) => (s === 'strength' ? { goalId: 'goal.strength', sport: s, goal: p.strength.goal } : { goalId: 'goal.running', sport: s, goal: p.running.goal, ...(o.runningTargetDate ? { targetDate: o.runningTargetDate } : {}) }));
  const end = o.horizonWeeks ?? (o.runningTargetDate && enabled.includes('running') ? weeksThrough(o.startWeek, o.runningTargetDate) : undefined);
  return { programmeId: o.programmeId, origin: o.origin, startWeek: o.startWeek, ...(end !== undefined ? { horizonWeeks: end } : {}), goals, priorities: enabled, sports };
}

// technical-constant: jours par semaine (calendrier)
const DAYS_PER_WEEK = 7;

// ——— Programmes et semaines antérieurs à Strength S1 (politique de mise à niveau)

/** Archétype de l'intention Strength TEMPORAIRE de la Beta 0 antérieure à S1 (jamais un choix de l'utilisateur). */
export const LEGACY_BETA0_STRENGTH_ARCHETYPE = 'str_full_body';

/** Profil de tolérance du cadre Strength : celui, UNIQUE, des archétypes admis pour l'objectif (donnée du ruleset). */
function strengthFrameTolerance(goal: Profile['strength']['goal']): string | undefined {
  const gk = goalKey({ goal });
  const tolerances = [...new Set(readStrengthParams(strengthContent().ruleset).values['strength.archetypes'].filter((a) => a.goals.includes(gk)).map((a) => a.toleranceProfile))];
  return tolerances.length === 1 ? tolerances[0] : undefined;
}

const sameIntent = (a: Readonly<Record<string, unknown>> | undefined, b: Readonly<Record<string, unknown>>): boolean =>
  a !== undefined && Object.keys(a).length === Object.keys(b).length && Object.entries(b).every(([k, v]) => a[k] === v);

/**
 * Intention Strength HÉRITÉE de la Beta 0 antérieure à S1 : définition DÉRIVÉE DU PROFIL (`origin: profile`), plan
 * Strength `declared` portant EXACTEMENT l'intention temporaire que `programmeDefinitionFromProfile` écrivait alors
 * (`str_full_body`, stimulus de l'objectif, `phase.accumulation`, tolérance du ruleset), sans variante, déclaration,
 * évaluation ni station, et intention courante identique. Tout autre cas (intention explicite, variante appliquée…)
 * n'est JAMAIS considéré comme hérité.
 */
export function legacyBeta0StrengthIntent(ps: ProgrammeState): { readonly sessionsPerWeek: number; readonly frame: Readonly<Record<string, string>> } | null {
  const d = ps.definition;
  const plan = d.sports.find((x) => x.sport === 'strength');
  const goal = d.goals.find((g) => g.sport === 'strength');
  if (d.origin !== 'profile' || !plan || plan.composition !== 'declared' || !goal || !('goal' in goal)) return null;
  const g = goal.goal as Profile['strength']['goal'];
  const stimulus = STIMULUS_BY_GOAL[g] as string | undefined;
  const toleranceProfile = strengthFrameTolerance(g);
  if (!stimulus || !toleranceProfile) return null;
  const frame = { stimulus, objective: `objective.${stimulus}`, phase: 'phase.accumulation', toleranceProfile };
  const legacy = { archetypeId: LEGACY_BETA0_STRENGTH_ARCHETYPE, ...frame };
  const pristine = plan.station === undefined && plan.assessment === undefined && Object.keys(plan.declarations).length === 0 && plan.variants.PROGRESS === undefined && plan.variants.REGRESS === undefined;
  const current = ps.current.find((x) => x.sport === 'strength')?.intent;
  return pristine && sameIntent(plan.intent, legacy) && sameIntent(current, legacy) ? { sessionsPerWeek: plan.sessionsPerWeek, frame } : null;
}

/**
 * Statut de planification d'une semaine persistée du programme, au regard de la version COURANTE du chemin :
 * - `current` : planifiée par cette version ;
 * - `stale_replaceable` : version antérieure (ou absente) ET semaine non commencée — aucun résultat, aucune séance en
 *   cours, aucune séance planifiée à une date déjà passée, semaine non clôturée : régénération SÛRE ;
 * - `stale_kept` : version antérieure mais semaine commencée : JAMAIS remplacée (cause donnée), affichée comme telle.
 */
export type WeekPlanningCause = 'closed' | 'results' | 'session_in_progress' | 'past_sessions';
export interface WeekPlanning {
  readonly version: string | null;
  readonly status: 'current' | 'stale_replaceable' | 'stale_kept';
  readonly cause: WeekPlanningCause | null;
}
export function weekPlanning(state: AppState, weekStart: string, today: string, currentVersion: string = BETA0_PLANNING_VERSION): WeekPlanning | null {
  const w = state.planner.weeks[weekStart];
  if (!w || w.owner !== 'programme') return null;
  const version = w.planningVersion ?? null;
  if (version === currentVersion) return { version, status: 'current', cause: null };
  const kept = (cause: WeekPlanningCause): WeekPlanning => ({ version, status: 'stale_kept', cause });
  if (state.programmeState?.weeks.find((x) => x.plannerRef === weekStart)?.closedAt) return kept('closed');
  const ids = new Set(w.requests.map((r) => r.requestId));
  if ((state.programmeState?.results ?? []).some((r) => ids.has(r.requestId))) return kept('results');
  if (Object.keys(state.programmeLogs).some((id) => ids.has(id))) return kept('session_in_progress');
  if (w.requests.some((r) => r.status === 'planned' && r.date !== undefined && r.date < today)) return kept('past_sessions');
  return { version, status: 'stale_replaceable', cause: null };
}
/** Nombre de semaines du lundi `startWeek` jusqu'à la semaine contenant `date` incluse (calendrier seulement). */
function weeksThrough(startWeek: string, date: string): number {
  return Math.max(1, Math.floor(daysBetween(startWeek, weekStartOf(date)) / DAYS_PER_WEEK) + 1);
}

// ——— Contrat de lecture pour l'interface (aucune logique sportive : projection de l'état persisté)

export type SessionViewStatus = 'planned' | 'completed_as_prescribed' | 'modified' | 'abandoned' | 'missed' | 'not_planned';
export interface SessionView {
  readonly requestId: string;
  readonly sport: Sport;
  readonly date: string | null;
  readonly status: SessionViewStatus;
  /** Durée cible prescrite par le moteur (s) ; null si non planifiée. */
  readonly targetDurationS: number | null;
  /** Durée ESTIMÉE de la séance par le CORE (p50, s), si l'enregistrement la porte ; sinon null. */
  readonly estimatedDurationS: number | null;
  /**
   * Archétype réellement PRESCRIT : celui du session_record canonique (empreinte de la séance générée), sinon celui de
   * l'intention utilisée. Aucune valeur par défaut : absent ou incohérent ⇒ null et `dataError` renseigné.
   */
  readonly archetypeId: string | null;
  /** Erreur de données sur l'archétype (jamais masquée) : absent du record et de l'intention, ou record ≠ intention. */
  readonly dataError: 'ARCHETYPE_MISSING' | 'ARCHETYPE_MISMATCH' | null;
  readonly role: string | null;
  readonly compositionAuthority: 'approved' | 'provisional' | null;
  /** Règle de composition du moteur qui a choisi l'archétype (`identifiant@version`), si tracée. */
  readonly compositionRule: string | null;
  /**
   * Séance non planifiée : catégorie, raison principale (codes) et jour ESSAYÉ (information seulement : la séance
   * n'est placée sur aucun jour, `date` est null).
   */
  readonly notPlanned: { readonly category: string; readonly reason: Reason | null; readonly triedDate: string | null } | null;
  readonly pain: boolean;
}
export interface Beta0WeekView {
  /** `horizonWeeks` null : programme continu ; `targetDate` : date d'objectif déclarée (la plus proche), sinon null. */
  readonly programme: { readonly programmeId: string; readonly origin: string; readonly horizonWeeks: number | null; readonly targetDate: string | null };
  readonly weekIndex: number;
  readonly weekStart: string;
  readonly weekStatus: WeekStatus;
  readonly authority: EnvironmentAuthority | 'unknown';
  readonly experimental: boolean;
  readonly simulation: readonly string[];
  /** Séances ordonnées (date, puis identifiant) ; les non planifiées en fin de liste. */
  readonly sessions: readonly SessionView[];
  /**
   * Les 7 jours de la semaine (lundi → dimanche) et, pour chacun, les séances RÉELLEMENT placées ce jour (quel que soit
   * leur état : prévue, réalisée, adaptée, arrêtée, manquée). Source unique des vues jour par jour (accueil, planning).
   */
  readonly days: readonly { readonly date: string; readonly sessions: readonly SessionView[] }[];
  /**
   * Planification de la semaine au regard de la version courante (null : semaine non planifiée). `replannedAt` : la
   * semaine, obsolète et non commencée, a été régénérée par la version courante (trace d'audit du programme).
   */
  readonly planning: (WeekPlanning & { readonly replannedAt: string | null }) | null;
  /** Adhérence DESCRIPTIVE (comptes, aucun seuil) ; null si la semaine n'est pas planifiée. */
  readonly adherence: Adherence | null;
}

const INFORMATIVE = /^PLAN\.PLANNER\./;
const mainReason = (rs: readonly Reason[]): Reason | null => rs.find((r) => !INFORMATIVE.test(r.code)) ?? rs[0] ?? null;

/**
 * Archétype réellement PRESCRIT d'une demande persistée : celui du session_record canonique (empreinte de la séance
 * générée), contrôlé contre l'intention utilisée. Aucune valeur par défaut : incohérence ou absence ⇒ null + erreur.
 */
export function prescribedArchetype(r: PersistedWeek['requests'][number]): { readonly archetypeId: string | null; readonly dataError: SessionView['dataError'] } {
  const data = r.record?.data as { fingerprint?: { status?: unknown; value?: { archetypeId?: unknown } } } | undefined;
  const recorded = data?.fingerprint?.status === 'available' && typeof data.fingerprint.value?.archetypeId === 'string' ? data.fingerprint.value.archetypeId : null;
  const declared = r.intent?.archetypeId ?? null;
  if (r.status !== 'planned') return { archetypeId: declared, dataError: null };
  if (recorded !== null && declared !== null && recorded !== declared) return { archetypeId: null, dataError: 'ARCHETYPE_MISMATCH' };
  const archetypeId = recorded ?? declared;
  return { archetypeId, dataError: archetypeId === null ? 'ARCHETYPE_MISSING' : null };
}

function sessionView(r: PersistedWeek['requests'][number], result: ProgrammeResult | undefined): SessionView {
  const data = r.record?.data as { session?: { targetDurationS?: unknown }; durationEstimate?: { availability?: unknown; p50?: unknown } } | undefined;
  const composition = r.reasons.find((x) => x.code === 'PLAN.WEEK_COMPOSITION')?.params;
  const session = data?.session;
  const estimate = data?.durationEstimate?.availability === 'AVAILABLE' && typeof data.durationEstimate.p50 === 'number' ? data.durationEstimate.p50 : null;
  const planned = r.status === 'planned';
  return {
    // Date = jour où la séance est PLACÉE ; une demande non planifiée n'occupe aucun jour.
    requestId: r.requestId, sport: r.sport, date: planned ? r.date ?? null : null,
    status: planned ? (result?.completion ?? 'planned') : 'not_planned',
    targetDurationS: planned && typeof session?.targetDurationS === 'number' ? session.targetDurationS : null,
    estimatedDurationS: planned ? estimate : null,
    ...prescribedArchetype(r),
    role: r.composition?.role ?? null, compositionAuthority: r.composition?.authority ?? null,
    compositionRule: typeof composition?.rule === 'string' ? `${composition.rule}${typeof composition.version === 'string' ? `@${composition.version}` : ''}` : null,
    notPlanned: planned ? null : { category: r.category, reason: mainReason(r.reasons), triedDate: r.date ?? null },
    pain: result?.pain ?? false,
  };
}

/**
 * Vue de la semaine du programme (par défaut celle de `today`) : lecture seule de l'état persisté (programme,
 * semaine planifiée, réalisations). Aucune décision, aucun calcul sportif.
 */
/** Date d'objectif déclarée la plus proche du programme (objectifs datés), sinon null. */
export function programmeTargetDate(d: ProgrammeDefinition): string | null {
  const dates = d.goals.flatMap((g) => ('targetDate' in g && g.targetDate ? [g.targetDate] : [])).sort();
  return dates[0] ?? null;
}

/**
 * Contrôle d'INTÉGRITÉ des semaines persistées du programme (lecture seule, jamais réparé ni masqué) : une incohérence
 * est rendue visible avec sa nature exacte pour être diagnostiquée sur les données réelles.
 */
export type Beta0IntegrityIssue =
  | { readonly code: 'WEEK_KEY_MISMATCH'; readonly key: string; readonly weekStart: string }
  | { readonly code: 'DUPLICATE_DAY'; readonly weekStart: string; readonly date: string }
  | { readonly code: 'DATE_OUTSIDE_WEEK'; readonly weekStart: string; readonly requestId: string; readonly date: string }
  | { readonly code: 'SEVERAL_SESSIONS_SAME_DAY'; readonly date: string; readonly requestIds: readonly string[] }
  | { readonly code: 'REQUEST_IN_SEVERAL_WEEKS'; readonly requestId: string; readonly weeks: readonly string[] };
export function beta0Integrity(state: AppState): Beta0IntegrityIssue[] {
  const out: Beta0IntegrityIssue[] = [];
  const weeks = Object.entries(state.planner.weeks).filter(([, w]) => w.owner === 'programme').sort(([a], [b]) => (a < b ? -1 : 1));
  const byDate = new Map<string, string[]>();
  const byRequest = new Map<string, string[]>();
  for (const [key, w] of weeks) {
    if (key !== w.weekStart) out.push({ code: 'WEEK_KEY_MISMATCH', key, weekStart: w.weekStart });
    const seen = new Set<string>();
    for (const d of w.days) { if (seen.has(d.date)) out.push({ code: 'DUPLICATE_DAY', weekStart: w.weekStart, date: d.date }); seen.add(d.date); }
    const end = addDays(w.weekStart, DAYS_PER_WEEK - 1);
    for (const r of w.requests) {
      byRequest.set(r.requestId, [...(byRequest.get(r.requestId) ?? []), key]);
      if (r.status !== 'planned' || !r.date) continue;
      if (r.date < w.weekStart || r.date > end) out.push({ code: 'DATE_OUTSIDE_WEEK', weekStart: w.weekStart, requestId: r.requestId, date: r.date });
      byDate.set(r.date, [...(byDate.get(r.date) ?? []), r.requestId]);
    }
  }
  for (const [date, ids] of [...byDate].sort(([a], [b]) => (a < b ? -1 : 1))) if (ids.length > 1) out.push({ code: 'SEVERAL_SESSIONS_SAME_DAY', date, requestIds: ids });
  for (const [requestId, ws] of [...byRequest].sort(([a], [b]) => (a < b ? -1 : 1))) if (ws.length > 1) out.push({ code: 'REQUEST_IN_SEVERAL_WEEKS', requestId, weeks: ws });
  return out;
}

export function selectBeta0Week(state: AppState, today: string, weekIndex?: number): Beta0WeekView | null {
  const ps = state.programmeState;
  if (!ps) return null;
  const i = weekIndex ?? weekIndexOf(ps, today);
  if (!withinProgramme(ps, i)) return null;
  const pw = ps.weeks.find((w) => w.weekIndex === i);
  const week = pw ? state.planner.weeks[pw.plannerRef] : undefined;
  const resultOf = (id: string) => ps.results.find((x) => x.requestId === id);
  const sessions = (week?.requests ?? []).map((r) => sessionView(r, resultOf(r.requestId)))
    .sort((a, b) => (a.date === null ? 1 : 0) - (b.date === null ? 1 : 0) || (a.date ?? '').localeCompare(b.date ?? '') || a.requestId.localeCompare(b.requestId));
  const authority = week?.authority ?? 'unknown';
  const start = weekStartAt(ps, i);
  const days = Array.from({ length: DAYS_PER_WEEK }, (_, k) => addDays(start, k)).map((date) => ({ date, sessions: sessions.filter((x) => x.date === date) }));
  return {
    programme: { programmeId: ps.definition.programmeId, origin: ps.definition.origin, horizonWeeks: ps.definition.horizonWeeks ?? null, targetDate: programmeTargetDate(ps.definition) },
    weekIndex: i, weekStart: weekStartAt(ps, i), weekStatus: weekStatus(ps, i, today, undefined),
    authority, experimental: week ? isExperimental(authority) : true, simulation: [...(week?.simulation ?? [])],
    sessions, days, adherence: pw ? (pw.adherence?.total ?? adherenceOf(pw.requests, ps.results)) : null,
    planning: planningOf(state, start, today),
  };
}

function planningOf(state: AppState, weekStart: string, today: string): Beta0WeekView['planning'] {
  const p = weekPlanning(state, weekStart, today);
  if (!p) return null;
  const replanned = (state.programmeState?.audit ?? []).filter((a) => a.reason.code === 'KAIRO.WEEK_REPLANNED_STALE' && a.reason.params.weekStart === weekStart).at(-1);
  return { ...p, replannedAt: replanned?.at ?? null };
}
