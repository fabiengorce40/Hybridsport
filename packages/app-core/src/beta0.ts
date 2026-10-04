/**
 * KAIRO Beta 0 — chemin hybride Strength + Running : profil → Programme Engine → Global Planner → moteurs.
 *
 * Responsabilités (aucune logique sportive ici) :
 *   - le PROGRAMME déclare, par sport, le nombre de séances et le cadre d'intention ; pour Running, la composition
 *     hebdomadaire est demandée au MOTEUR (`composition: 'engine'`) ;
 *   - le PLANIFICATEUR place les séances dans les disponibilités, vérifie l'interférence, appelle les moteurs ;
 *   - RUNNING compose sa semaine (§R : KEY / LONG / TEST / EASY) sur les jours placés ;
 *   - STRENGTH reste auteur de ses séances (archétype V0 déclaré : aucun choix de split gouverné n'existe).
 *
 * Environnement EXPÉRIMENTAL (autorité `beta0_experimental`, mode CANDIDATE) : les seules valeurs disponibles sont des
 * fixtures de test EXISTANTES, réutilisées sans modification et déclarées SIMULATION_ONLY (identifiants listés dans
 * `BETA0_SIMULATION`, tracés dans chaque semaine persistée). Aucune n'est approuvée : en PRODUCTION elles sont
 * refusées par les lecteurs gouvernés (fail-closed) et un environnement `production` qui en porte est refusé.
 */
import { CURRENT_RUNNING_GOVERNANCE, ARCHETYPE_INTENT_IDS, createRunningEngine, withProductDecisions } from '@hybridsport/running';
import type { RunningGovernance } from '@hybridsport/running';
import { requirePlannerProvenance } from '@hybridsport/planner';
import { StrengthEngine, findArchetype, readStrengthParams } from '@hybridsport/strength';
import type { SportEngine } from '@hybridsport/engine';
import { adherenceOf, weekIndexOf, weekStartAt, weekStatus } from '@hybridsport/programme';
import type { Adherence, ProgrammeDefinitionInput, ProgrammeResult, WeekStatus } from '@hybridsport/programme';
import { plannerGovernance, withDemand } from '../../planner/tests/simulation.js';
import { AppError } from './errors.js';
import type { AppState, EnvironmentAuthority, PersistedWeek, Profile, Reason, Sport } from './model.js';
import { STIMULUS_BY_GOAL, STRENGTH_ARCHETYPE } from './planner.js';
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
 * (non approuvées, tracées CANDIDATE_VALUE_USED, non résolues en PRODUCTION).
 */
export const BETA0_SIMULATION = [
  'planner.interference.structureWindows', 'demand.doseNormalization', 'running.technical.GLOBAL_PLANNER_INTEGRATION', 'running.engine.simulation',
] as const;

/** Gouvernance Running Beta 0 : décisions produit existantes + intégration planificateur déclarée (SIMULATION_ONLY). */
function beta0RunningGovernance(): RunningGovernance {
  const g = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
  return { ...g, technical: { ...g.technical, GLOBAL_PLANNER_INTEGRATION: 'SATISFIED' } };
}

const simulationMark = { justification: SIMULATION_ONLY };

/**
 * Environnement Beta 0 EXPÉRIMENTAL : Strength et Running seulement (CT / HYROX non raccordés), mode CANDIDATE.
 * Running n'accepte un athlète multisport QUE par le planificateur global (provenance obligatoire) : tout autre
 * chemin reste refusé. Aucune politique d'adaptation (décisions BLOCKED) ni horizon d'avance : aucune valeur inventée.
 */
export function beta0Environment(): ProgrammeEnvironment {
  const g = beta0RunningGovernance();
  return {
    mode: 'CANDIDATE', authority: 'beta0_experimental', simulation: [...BETA0_SIMULATION],
    governance: plannerGovernance(undefined, simulationMark),
    strength: { engine: StrengthEngine as SportEngine<unknown>, content: withDemand(strengthContent(), undefined, simulationMark) },
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
  readonly horizonWeeks: number;
  readonly origin: string;
}

/**
 * Définition de programme Beta 0 issue des seules DÉCLARATIONS du profil (sports activés, ordre de priorité, objectif,
 * nombre de séances) : Strength = intention V0 déclarée (archétype `str_full_body`, stimulus par objectif) ; Running =
 * cadre d'intention V0 SANS archétype, composition par le moteur. Évaluation Running : la séance TEST du moteur
 * (demandée seulement par une décision gouvernée REASSESS). Aucun sport hors Beta 0, aucune phase inférée.
 */
export function programmeDefinitionFromProfile(p: Profile, o: ProgrammeFromProfileOptions): ProgrammeDefinitionInput {
  const enabled = p.priorities.filter((s): s is (typeof BETA0_SPORTS)[number] => (BETA0_SPORTS as readonly Sport[]).includes(s) && p[s].enabled);
  if (enabled.length === 0) throw new AppError('BETA0_NO_SPORT');
  const runningFrame = { stimulus: 'stim.running.aerobic', objective: 'objective.running.base', phase: 'phase.running.base', toleranceProfile: 'fixed_time' };
  const sports = enabled.map((s) => {
    if (s === 'strength') {
      const a = findArchetype(readStrengthParams(strengthContent().ruleset).values, STRENGTH_ARCHETYPE);
      if (!a) throw new AppError('BETA0_STRENGTH_ARCHETYPE_MISSING');
      const stimulus = STIMULUS_BY_GOAL[p.strength.goal];
      return { sport: s, sessionsPerWeek: p.strength.sessionsPerWeek, composition: 'declared' as const, intent: { archetypeId: STRENGTH_ARCHETYPE, stimulus, objective: `objective.${stimulus}`, phase: 'phase.accumulation', toleranceProfile: a.toleranceProfile } };
    }
    return {
      sport: s, sessionsPerWeek: p.running.sessionsPerWeek, composition: 'engine' as const, intent: runningFrame,
      assessment: { kind: 'running.test', intent: { ...runningFrame, archetypeId: ARCHETYPE_INTENT_IDS.TEST } },
    };
  });
  const goals = enabled.map((s) => (s === 'strength' ? { goalId: 'goal.strength', sport: s, goal: p.strength.goal } : { goalId: 'goal.running', sport: s, goal: p.running.goal }));
  return { programmeId: o.programmeId, origin: o.origin, startWeek: o.startWeek, horizonWeeks: o.horizonWeeks, goals, priorities: enabled, sports };
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
  /** Archétype réellement utilisé (le libellé reste à l'interface) et rôle de composition éventuel. */
  readonly archetypeId: string | null;
  readonly role: string | null;
  readonly compositionAuthority: 'approved' | 'provisional' | null;
  /** Séance non planifiée : catégorie et raison principale (codes). */
  readonly notPlanned: { readonly category: string; readonly reason: Reason | null } | null;
  readonly pain: boolean;
}
export interface Beta0WeekView {
  readonly programme: { readonly programmeId: string; readonly origin: string; readonly horizonWeeks: number };
  readonly weekIndex: number;
  readonly weekStart: string;
  readonly weekStatus: WeekStatus;
  readonly authority: EnvironmentAuthority | 'unknown';
  readonly experimental: boolean;
  readonly simulation: readonly string[];
  /** Séances ordonnées (date, puis identifiant) ; les non planifiées en fin de liste. */
  readonly sessions: readonly SessionView[];
  /** Adhérence DESCRIPTIVE (comptes, aucun seuil) ; null si la semaine n'est pas planifiée. */
  readonly adherence: Adherence | null;
}

const INFORMATIVE = /^PLAN\.PLANNER\./;
const mainReason = (rs: readonly Reason[]): Reason | null => rs.find((r) => !INFORMATIVE.test(r.code)) ?? rs[0] ?? null;

function sessionView(r: PersistedWeek['requests'][number], result: ProgrammeResult | undefined): SessionView {
  const session = (r.record?.data as { session?: { targetDurationS?: unknown } } | undefined)?.session;
  const planned = r.status === 'planned';
  return {
    requestId: r.requestId, sport: r.sport, date: r.date ?? null,
    status: planned ? (result?.completion ?? 'planned') : 'not_planned',
    targetDurationS: planned && typeof session?.targetDurationS === 'number' ? session.targetDurationS : null,
    archetypeId: r.intent?.archetypeId ?? null, role: r.composition?.role ?? null, compositionAuthority: r.composition?.authority ?? null,
    notPlanned: planned ? null : { category: r.category, reason: mainReason(r.reasons) },
    pain: result?.pain ?? false,
  };
}

/**
 * Vue de la semaine du programme (par défaut celle de `today`) : lecture seule de l'état persisté (programme,
 * semaine planifiée, réalisations). Aucune décision, aucun calcul sportif.
 */
export function selectBeta0Week(state: AppState, today: string, weekIndex?: number): Beta0WeekView | null {
  const ps = state.programmeState;
  if (!ps) return null;
  const i = weekIndex ?? weekIndexOf(ps, today);
  if (i < 0 || i >= ps.definition.horizonWeeks) return null;
  const pw = ps.weeks.find((w) => w.weekIndex === i);
  const week = pw ? state.planner.weeks[pw.plannerRef] : undefined;
  const resultOf = (id: string) => ps.results.find((x) => x.requestId === id);
  const sessions = (week?.requests ?? []).map((r) => sessionView(r, resultOf(r.requestId)))
    .sort((a, b) => (a.date === null ? 1 : 0) - (b.date === null ? 1 : 0) || (a.date ?? '').localeCompare(b.date ?? '') || a.requestId.localeCompare(b.requestId));
  const authority = week?.authority ?? 'unknown';
  return {
    programme: { programmeId: ps.definition.programmeId, origin: ps.definition.origin, horizonWeeks: ps.definition.horizonWeeks },
    weekIndex: i, weekStart: weekStartAt(ps, i), weekStatus: weekStatus(ps, i, today, undefined),
    authority, experimental: week ? isExperimental(authority) : true, simulation: [...(week?.simulation ?? [])],
    sessions, adherence: pw ? (pw.adherence?.total ?? adherenceOf(pw.requests, ps.results)) : null,
  };
}
