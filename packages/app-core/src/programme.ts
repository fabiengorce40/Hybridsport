/**
 * Programme longitudinal dans l'application : app-core → Programme Engine → planificateur global → moteurs → CORE.
 * L'application ne décide rien de sportif : elle fournit l'état (historique, disponibilités, déclarations), persiste
 * la semaine planifiée et l'état du programme, et renvoie les réalisations à l'historique des moteurs par leurs
 * contrats existants (course réalisée, référence TEST, empreintes, douleur).
 */
import type { FingerprintHistoryEntry, PainLevel, ReasonCode, SessionRecord } from '@hybridsport/domain';
import { applySwaps } from './equipment.js';
import { migrateToCurrent } from '@hybridsport/engine';
import type { LoadedRuleset } from '@hybridsport/engine';
import { PG_CODES, closeProgrammeWeek, createProgramme, pgReasons, planProgrammeWeek, recordProgrammeResult, requestIntent, weekIndexOf } from '@hybridsport/programme';
import type { Completion, ProgrammeDefinitionInput, ProgrammeState } from '@hybridsport/programme';
import { AppError } from './app.js';
import { assertPlanningAllowed, writePlannedWeek } from './weeks.js';
import type { Clock } from './app.js';
import { addDays, normalizeInstant } from './dates.js';
import type { AppState, Feedback, ProgrammeIntent, SessionLog, SetLog } from './model.js';
import { appPlannerEnvironment, assertEnvironment, buildPorts, clockOf, persistWeek, recentOf } from './planning.js';
import type { EngineGoals, PlannerEnvironment } from './planning.js';
import { adaptedItemsOf, applyStrengthExecutionTraced, performedSets, realizedRunFrom, testReferenceFrom } from './progression.js';
import { isHyroxComposed, realizeCrossTrainingExecution, realizeHyroxComposed, realizeHyroxStation } from '@hybridsport/planner';
import { assessStrengthWeekVolume, readStrengthParams } from '@hybridsport/strength';
import type { StrengthGoalRef, WeekVolumeAssessment } from '@hybridsport/strength';
import { strengthContent } from './provisional-content.js';

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
export function portInputs(ps: ProgrammeState): { intent: ProgrammeIntent; goals: EngineGoals } {
  const d = ps.definition;
  const intent: ProgrammeIntent = {
    origin: d.origin,
    sports: d.priorities.flatMap((sp) => {
      const plan = d.sports.find((x) => x.sport === sp);
      return plan ? [{ sport: sp, sessions: plan.sessionsPerWeek, intent: { ...plan.intent }, ...(plan.composition === 'engine' ? { composition: 'engine' as const } : {}), declarations: { ...plan.declarations }, ...(plan.station === undefined ? {} : { station: plan.station }) }] : [];
    }),
  };
  const goals: { -readonly [K in keyof EngineGoals]: EngineGoals[K] } = {};
  for (const g of d.goals) {
    if (g.sport === 'strength' && goals.strength === undefined) goals.strength = g.goal;
    if (g.sport === 'running' && goals.running === undefined) goals.running = { type: g.goal, ...(g.targetDate ? { targetDate: g.targetDate } : {}) };
    if (g.sport === 'crosstraining' && goals.crosstraining === undefined) goals.crosstraining = g.goal;
    if (g.sport === 'hyrox' && goals.hyrox === undefined) goals.hyrox = g.goal;
  }
  return { intent, goals };
}

/** Planifie la semaine du programme (par défaut la semaine courante) et persiste semaine et état. */
export function planProgrammeCurrentWeek(state: AppState, clock: Clock, env: ProgrammeEnvironment = appPlannerEnvironment(), weekIndex?: number, o: { readonly pastDaysUnavailable?: boolean } = {}): AppState {
  const i = weekIndex ?? weekIndexOf(requireProgramme(state), clock.today);
  const first = planWeekOnce(state, clock, env, i, o);
  // A2 — TEST Running (évaluation) refusé par le moteur : la séance ne disparaît jamais. L'évaluation, désormais
  // « non planifiée » dans le programme, n'est plus imposée : la semaine est replanifiée UNE fois et le moteur Running
  // compose sa séance habituelle (aucune allure inventée). Le repli est tracé (audit du programme).
  const fallbacks = refusedRunningTests(state, first, i);
  const planned = fallbacks.length === 0 ? first : withAudit(planWeekOnce(first, clock, env, i, o), clock, i,
    fallbacks.map((f) => ({ code: RUNNING_TEST_FALLBACK, params: { weekIndex: i, assessmentId: f.assessmentId, cause: f.cause } })));
  return withStrengthVolumeAudit(planned, clock, i);
}

/** Code d'audit du repli A2 (TEST refusé ⇒ composition habituelle du moteur Running). */
export const RUNNING_TEST_FALLBACK = 'KAIRO.RUNNING_TEST_FALLBACK';

/**
 * Évaluations Running de la semaine i passées à « non planifiée » par CETTE planification parce que le moteur Running a
 * refusé le TEST (`DOSE.RUNNING.TEST_REFUSED`), avec la cause donnée par le moteur.
 */
function refusedRunningTests(before: AppState, after: AppState, i: number): { assessmentId: string; cause: string }[] {
  const wasOpen = new Set((before.programmeState?.assessments ?? []).filter((a) => a.status === 'requested' || a.status === 'scheduled').map((a) => a.assessmentId));
  const pw = after.programmeState?.weeks.find((w) => w.weekIndex === i);
  const refusal = (pw ? after.planner.weeks[pw.plannerRef]?.requests ?? [] : [])
    .filter((r) => r.sport === 'running' && r.status !== 'planned')
    .flatMap((r) => r.reasons.filter((x) => x.code === 'DOSE.RUNNING.TEST_REFUSED'))[0];
  if (!refusal) return [];
  return (after.programmeState?.assessments ?? [])
    .filter((a) => a.sport === 'running' && a.scheduledWeek === i && a.status === 'not_planned' && wasOpen.has(a.assessmentId))
    .map((a) => ({ assessmentId: a.assessmentId, cause: String(refusal.params.cause ?? 'UNKNOWN') }));
}

function withAudit(s: AppState, clock: Clock, i: number, reasons: readonly { code: string; params: Record<string, string | number> }[]): AppState {
  if (!s.programmeState || reasons.length === 0) return s;
  return { ...s, programmeState: { ...s.programmeState, audit: [...s.programmeState.audit, ...reasons.map((reason) => ({ at: normalizeInstant(clock.now), weekIndex: i, reason }))] } };
}

function planWeekOnce(state: AppState, clock: Clock, env: ProgrammeEnvironment, i: number, o: { readonly pastDaysUnavailable?: boolean }): AppState {
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  const ps = requireProgramme(state);
  assertEnvironment(env);
  // Douleur active : garde COMMUNE à tous les chemins de planification (weeks.ts).
  assertPlanningAllowed(state);
  const weekStart = addDays(ps.definition.startWeek, i * p.availability.length);
  const { intent, goals } = portInputs(ps);
  const r = planProgrammeWeek(ps, i, {
    today: clock.today, at: normalizeInstant(clock.now), mode: env.mode, ports: buildPorts(state, p, intent, env, goals), plannerGovernance: env.governance,
    programmeGovernance: env.programmeGovernance, clock: clockOf(),
    // Jours déjà passés (option) : aucune séance ne peut y être réalisée ⇒ indisponibles (calendrier, pas une règle sportive).
    days: p.availability.map((m, k) => { const date = addDays(weekStart, k); return { date, availableMinutes: o.pastDaysUnavailable && date < clock.today ? 0 : m }; }),
    recent: recentOf(state, p, weekStart),
  });
  if (!r.ok) throw new ProgrammeError('PROGRAMME_WEEK_NOT_PLANNABLE', r.reasons);
  // Écriture par la passerelle unique : jamais de remplacement d'une semaine commencée ou clôturée (refus, état inchangé).
  const written = writePlannedWeek(state, persistWeek(r.value.week, normalizeInstant(clock.now), ps.definition.origin, env), 'programme');
  return { ...written, programmeState: r.value.state };
}

function withStrengthVolumeAudit(planned: AppState, clock: Clock, i: number): AppState {
  const ps = planned.programmeState;
  const p = planned.profile;
  if (!ps || !p) return planned;
  const weekStart = addDays(ps.definition.startWeek, i * p.availability.length);
  // S4 — bilan de volume Strength de la semaine planifiée (cible / prévu / contraintes), audité une fois par semaine.
  const v = strengthWeekVolume(planned, weekStart);
  // technical-constant: affichage au dixième de série (E1 pondéré)
  const TENTH = 10;
  if (!v || !planned.programmeState) return planned;
  const reason = { code: 'KAIRO.STRENGTH_WEEK_VOLUME', params: {
    status: v.status, sessions: `${String(v.plannedSessions)}/${String(v.requestedSessions)}`,
    belowTarget: v.groups.filter((g) => g.status === 'reduced_by_constraint' || g.status === 'unmet').map((g) => `${g.group}:${String(Math.round(g.planned * TENTH) / TENTH)}/${String(g.target)}:${g.status}`),
    constraints: v.constraints.map((c) => `${c.cause}:${c.detail}`),
  } };
  return { ...planned, programmeState: { ...planned.programmeState, audit: [...planned.programmeState.audit, { at: normalizeInstant(clock.now), weekIndex: i, reason }] } };
}

/**
 * S4 — Bilan de volume Strength d'une semaine PERSISTÉE (séances planifiées, raisons persistées, demandes non
 * planifiées), par la fonction du moteur Strength. Null si la semaine ne demande pas de Strength.
 */
export function strengthWeekVolume(state: AppState, weekStart: string): WeekVolumeAssessment | null {
  const w = state.planner.weeks[weekStart];
  const p = state.profile;
  if (!w || !p) return null;
  const reqs = w.requests.filter((r) => r.sport === 'strength');
  if (reqs.length === 0) return null;
  const sessions = reqs.flatMap((r) => {
    const d = r.status === 'planned' && r.record ? migrateToCurrent<SessionRecord>(r.record) : undefined;
    return d?.ok ? [{ session: d.value.session, reasons: r.reasons }] : [];
  });
  const goal = state.programmeState?.definition.goals.find((g) => g.sport === 'strength')?.goal ?? p.strength.goal;
  const content = strengthContent();
  return assessStrengthWeekVolume({
    params: readStrengthParams(content.ruleset).values, catalog: content.catalog, goal: { goal } as StrengthGoalRef, level: p.level,
    requestedSessions: reqs.length, sessions, notPlanned: reqs.filter((r) => r.status !== 'planned').map((r) => ({ category: r.category })),
  });
}

/**
 * Saisie de RÉALISATION d'une séance planifiée : partie générique (identité, complétion, douleur, tolérance) +
 * détails propres à la discipline, typés (séries Strength, course, résultat continu CT, résultat de station HYROX).
 * Rien n'est déduit de la prescription : une donnée absente reste absente.
 */
interface ExecutionCommon {
  readonly requestId: string;
  readonly completion: Completion;
  /**
   * Douleur déclarée : niveau du domaine ; `REPORTED` = douleur signalée SANS niveau (Strength / Running : seule
   * la présence est consommée ; CT / HYROX exigent un niveau) ; `NONE` = aucune ; absente = inconnue.
   */
  readonly pain?: 'NONE' | 'REPORTED' | PainLevel;
  readonly tolerance?: 'tolerated' | 'poorly_tolerated';
}
export type SessionExecutionInput = ExecutionCommon & (
  | { readonly sport: 'strength'; readonly sets?: readonly SetLog[]; readonly painItems?: readonly string[] }
  | { readonly sport: 'running'; readonly run?: { readonly realizedDurationS: number; readonly distanceM?: number; readonly testTimeS?: number }; readonly difficulty?: Feedback['difficulty'] }
  | {
    readonly sport: 'crosstraining';
    /** Corridor C2 : résultat continu. */
    readonly result?: { readonly durationS?: number; readonly calories?: number; readonly distanceM?: number };
    /** C3 (C3.5) : résultat STRUCTURÉ du format (contrat de résultat CT, validé par le moteur). */
    readonly ctResult?: Readonly<Record<string, unknown>>;
    /** Charges RÉELLEMENT utilisées (observation), distinctes de la prescription. */
    readonly performedLoads?: readonly { readonly exerciseId: string; readonly kg: number }[];
    /** C4.3 — séries saisies du bloc de force DÉLÉGUÉ (Strength) de la séance, s'il existe. */
    readonly sets?: readonly SetLog[];
    readonly sessionRpe?: number;
  }
  | {
    readonly sport: 'hyrox';
    /** H1 (station unique) : quantité, temps, charge mesurés. */
    readonly result?: { readonly achieved?: number; readonly elapsedS?: number; readonly actualLoadKg?: number };
    /** H2 (séance composée) : progression ENREGISTRÉE (étapes achevées, chrono, time cap constaté). */
    readonly progress?: { readonly stepsCompleted: number; readonly elapsedS: number; readonly timeCapReached: boolean };
    /** H2 : charges RÉELLEMENT utilisées par item de station (observation). */
    readonly performedLoads?: readonly { readonly itemId: string; readonly kg: number }[];
  }
);

const RUN_COMPLETION: Readonly<Record<Exclude<Completion, 'missed'>, NonNullable<SessionLog['run']>['completion']>> = { completed_as_prescribed: 'COMPLETED', modified: 'PARTIAL', abandoned: 'PARTIAL' };
const reject = (code: string, ...reasons: ReasonCode[]): never => { throw new ProgrammeError(code, reasons); };

/**
 * Point d'entrée UNIQUE d'enregistrement d'une séance réalisée (chemin programme) :
 *   validation générique (séance planifiée connue, discipline, identité non encore enregistrée)
 *   → dispatch typé par discipline → validation sportive (contrat du moteur) → historique du moteur
 *   → retour au programme (statut générique + référence de preuve) → état persisté.
 * Identités : séance planifiée = `requestId` ; exécution = une seule par `requestId` (refus explicite sinon) ;
 * occurrence dans l'historique du moteur = `requestId` (un rejeu CT de la semaine suivante est une NOUVELLE occurrence).
 */
export function recordSessionExecution(state: AppState, clock: Clock, x: SessionExecutionInput): AppState {
  const ps = requireProgramme(state);
  const at = normalizeInstant(clock.now);
  const week = ps.weeks.find((w) => w.requests.some((r) => r.requestId === x.requestId));
  const req = week?.requests.find((r) => r.requestId === x.requestId);
  const planned = week ? state.planner.weeks[week.plannerRef]?.requests.find((r) => r.requestId === x.requestId) : undefined;
  // Séance planifiée, ou (M3.1) séance COMPOSÉE MAIS NON PLACÉE dont la prescription persistée est réalisée manuellement.
  const manual = req?.status === 'unplaced' && req.composedUnplaced === true && planned?.composedFor !== undefined;
  if (!week || !(req?.status === 'planned' || manual) || !planned) return reject('EXECUTION_UNKNOWN_SESSION', pgReasons.emit(PG_CODES.RESULT_UNKNOWN_REQUEST, { requestId: x.requestId }));
  if (manual && x.completion === 'missed') return reject('EXECUTION_UNKNOWN_SESSION');
  if (req.sport !== x.sport) return reject('EXECUTION_SPORT_MISMATCH');
  if (ps.results.some((r) => r.requestId === x.requestId)) return reject('EXECUTION_DUPLICATE', pgReasons.emit(PG_CODES.RESULT_DUPLICATE, { requestId: x.requestId }));
  // P0 — séance ADAPTÉE au démarrage (contrôle pré-séance) : c'est elle qui a été exécutée.
  const adapted = state.programmeLogs[x.requestId]?.adaptation?.record;
  const decoded = adapted ? migrateToCurrent<SessionRecord>(adapted) : planned.record ? migrateToCurrent<SessionRecord>(planned.record) : undefined;
  const record = decoded?.ok ? decoded.value : undefined;
  if (!record) return reject('EXECUTION_SESSION_UNREADABLE');
  const plannedDecoded = adapted && planned.record ? migrateToCurrent<SessionRecord>(planned.record) : undefined;
  const adaptedFrom = plannedDecoded?.ok ? plannedDecoded.value.session : undefined;
  // P1 — exercices remplacés pendant la séance (matériel indisponible) : la séance EXÉCUTÉE.
  const session = applySwaps(record.session, state.programmeLogs[x.requestId]?.swaps);
  const pained = (x.pain !== undefined && x.pain !== 'NONE') || (x.sport === 'strength' && (x.painItems?.length ?? 0) > 0);
  let s: AppState = state;
  let evidence: { history: ProgrammeState['definition']['priorities'][number]; ref: string; measurement?: string } | undefined;
  let progressionTrace: readonly ReasonCode[] = [];

  // HYROX H1 exige un niveau ; Cross-training C3 et HYROX H2 acceptent la présence seule (`REPORTED`) — les niveaux sont
  // un contenu G1 indisponible.
  const hrIntent = x.sport === 'hyrox' ? requestIntent(ps, x.requestId) : undefined;
  const hrComposed = hrIntent !== undefined && isHyroxComposed(hrIntent.archetypeId);
  if (x.pain === 'REPORTED' && x.sport === 'hyrox' && !hrComposed) return reject('EXECUTION_PAIN_LEVEL_REQUIRED');
  if (x.completion !== 'missed') {
    const common = { sessionId: x.requestId, completedAt: at, completion: x.completion, ...(x.pain !== undefined && x.pain !== 'REPORTED' ? { pain: x.pain } : {}), ...(x.tolerance !== undefined ? { tolerance: x.tolerance } : {}) };
    switch (x.sport) {
      case 'strength': {
        const intent = requestIntent(ps, x.requestId);
        if (!intent) return reject('EXECUTION_INTENT_UNKNOWN');
        const sets = x.sets ?? [];
        const work = session.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items)
          .flatMap((it) => (it.prescription.type === 'sets' ? it.prescription.sets.map((p, i) => ({ itemId: it.id, i, work: p.kind !== 'rampup' && p.optional !== true, count: it.prescription.type === 'sets' ? it.prescription.sets.length : 0 })) : []));
        const unknown = sets.filter((l) => !work.some((w) => w.itemId === l.itemId && w.i === l.setIndex));
        if (unknown.length > 0) return reject('EXECUTION_STRENGTH_SET_UNKNOWN');
        // « Telle que prescrite » n'est jamais supposé : chaque série de travail doit être saisie, faite, avec ses répétitions.
        if (x.completion === 'completed_as_prescribed' && !work.filter((w) => w.work).every((w) => sets.some((l) => l.itemId === w.itemId && l.setIndex === w.i && l.done && l.reps !== undefined))) return reject('EXECUTION_STRENGTH_INCOMPLETE');
        // S3 — séance abandonnée ⇒ jamais lue comme « terminée » ; douleur de séance ⇒ chaque exercice classé `pain`.
        const applied = applyStrengthExecutionTraced(s, {
          archetypeId: intent.archetypeId, session, sets: [...sets], painItems: [...(x.painItems ?? [])],
          sessionCompleted: x.completion !== 'abandoned', sessionPain: x.pain !== undefined && x.pain !== 'NONE',
          sessionStatus: x.completion === 'abandoned' ? 'abandoned' : x.completion === 'modified' ? 'modified' : 'completed',
          // RC5.3 R4 — séance adaptée au démarrage : items modifiés et RIR de référence de la séance planifiée.
          ...(adaptedFrom ? { modifiedItems: adaptedItemsOf(adaptedFrom, session) } : {}),
        }, at);
        s = { ...s, strength: applied.strength };
        progressionTrace = applied.reasons;
        evidence = { history: 'strength', ref: x.requestId };
        break;
      }
      case 'running': {
        const intent = requestIntent(ps, x.requestId);
        if (!intent || !x.run) return reject('EXECUTION_RUN_DETAILS_REQUIRED');
        const run = { realizedDurationS: x.run.realizedDurationS, completion: RUN_COMPLETION[x.completion], ...(x.run.distanceM !== undefined ? { distanceM: x.run.distanceM } : {}), ...(x.run.testTimeS !== undefined ? { testTimeS: x.run.testTimeS } : {}) };
        const real = { sessionId: x.requestId, archetypeId: intent.archetypeId, session, run, ...(x.difficulty ? { difficulty: x.difficulty } : {}), pain: pained, at };
        const ref = testReferenceFrom(real);
        s = { ...s, running: { ...s.running, realized: [...s.running.realized, realizedRunFrom(real)], references: [...s.running.references, ...(ref ? [ref] : [])] } };
        evidence = { history: 'running', ref: x.requestId, ...(ref ? { measurement: ref.type } : {}) };
        break;
      }
      case 'crosstraining': {
        const intent = requestIntent(ps, x.requestId);
        if (!intent) return reject('EXECUTION_INTENT_UNKNOWN');
        if (s.crosstraining.realized.some((r) => r.sessionId === x.requestId)) return reject('EXECUTION_DUPLICATE');
        const ctCommon = { sessionId: x.requestId, completedAt: at, completion: x.completion, ...(x.pain !== undefined ? { pain: x.pain } : {}), ...(x.tolerance !== undefined ? { tolerance: x.tolerance } : {}) };
        const r = realizeCrossTrainingExecution(session, {
          ...ctCommon, archetypeId: intent.archetypeId, stimulus: intent.stimulus, ...(x.result ? { continuous: x.result } : {}), ...(x.ctResult ? { result: x.ctResult } : {}),
          ...(x.sessionRpe !== undefined ? { sessionRpe: x.sessionRpe } : {}), ...(x.performedLoads ? { performedLoads: x.performedLoads } : {}),
        });
        if (!r.ok) return reject('EXECUTION_INVALID', ...r.reasons);
        // C4.3 — bloc de force délégué : séries RÉALISÉES ajoutées aux expositions Strength (volume hebdomadaire,
        // alternance, références de charge), JAMAIS aux tracks (la progression reste portée par les séances Strength :
        // aucune double progression). Séries inconnues refusées ; « telle que prescrite » exige chaque série de travail.
        const blockItems = session.blocks.filter((b) => b.kind === 'strength').flatMap((b) => b.items);
        const ctSets = x.sets ?? [];
        if (ctSets.some((l) => !blockItems.some((it) => it.id === l.itemId && it.prescription.type === 'sets' && l.setIndex < it.prescription.sets.length))) return reject('EXECUTION_STRENGTH_SET_UNKNOWN');
        const workOf = (it: (typeof blockItems)[number]) => (it.prescription.type === 'sets' ? it.prescription.sets.flatMap((p, i) => (p.kind !== 'rampup' && p.optional !== true ? [i] : [])) : []);
        if (x.completion === 'completed_as_prescribed' && !blockItems.every((it) => workOf(it).every((i) => ctSets.some((l) => l.itemId === it.id && l.setIndex === i && l.done && l.reps !== undefined)))) return reject('EXECUTION_STRENGTH_INCOMPLETE');
        const blockLog = { sets: [...ctSets], painItems: [] } as unknown as SessionLog;
        const blockExposures = blockItems.flatMap((it) => {
          if (it.prescription.type !== 'sets') return [];
          const performed = performedSets(it.id, it.prescription.sets, blockLog);
          return performed.length > 0 ? [{ exerciseId: it.exerciseId, at, ...(it.refs?.slotId ? { slotId: it.refs.slotId } : {}), sets: performed }] : [];
        });
        s = { ...s, crosstraining: { realized: [...s.crosstraining.realized, { ...r.value }] }, ...(blockExposures.length > 0 ? { strength: { ...s.strength, exposures: [...s.strength.exposures, ...blockExposures] } } : {}) };
        evidence = { history: 'crosstraining', ref: x.requestId };
        break;
      }
      case 'hyrox': {
        if (hrComposed && hrIntent) {
          // H2.5 : séance COMPOSÉE — prescription lue dans la séance, progression enregistrée, contrat strict du moteur.
          if (s.hyrox.realized.some((r) => r.sessionId === x.requestId)) return reject('EXECUTION_DUPLICATE');
          if (!x.progress) return reject('EXECUTION_HR_PROGRESS_REQUIRED');
          const r = realizeHyroxComposed(session, {
            sessionId: x.requestId, completedAt: at, completion: x.completion, archetypeId: hrIntent.archetypeId, progress: x.progress,
            ...(x.pain !== undefined ? { pain: x.pain } : {}), ...(x.tolerance !== undefined ? { tolerance: x.tolerance } : {}),
            ...(x.performedLoads && x.performedLoads.length > 0 ? { performedLoads: x.performedLoads } : {}),
          });
          if (!r.ok) return reject('EXECUTION_INVALID', ...r.reasons);
          s = { ...s, hyrox: { realized: [...s.hyrox.realized, { ...r.value }] } };
          evidence = { history: 'hyrox', ref: x.requestId };
          break;
        }
        const station = week.intent.demands.find((d) => d.sport === 'hyrox')?.station;
        if (!station) return reject('EXECUTION_STATION_UNKNOWN');
        if (s.hyrox.realized.some((r) => r.sessionId === x.requestId)) return reject('EXECUTION_DUPLICATE');
        const r = realizeHyroxStation(session, { ...common, stationId: station, ...(x.result ? { result: x.result } : {}) });
        if (!r.ok) return reject('EXECUTION_INVALID', ...r.reasons);
        s = { ...s, hyrox: { realized: [...s.hyrox.realized, { ...r.value }] } };
        evidence = { history: 'hyrox', ref: x.requestId };
        break;
      }
    }
  }
  const result = recordProgrammeResult(ps, { requestId: x.requestId, completion: x.completion, pain: pained, recordedAt: at, ...(evidence ? { evidence } : {}), ...(manual ? { executedOn: clock.today } : {}) });
  if (!result.ok) return reject('EXECUTION_REJECTED', ...result.reasons);
  // S3 — décisions de progression Strength de cette réalisation, auditées avec la semaine.
  const audited = progressionTrace.map((r) => ({ at, weekIndex: week.weekIndex, reason: { code: r.code, params: { ...r.params } } }));
  s = { ...s, programmeState: { ...result.value, audit: [...result.value.audit, ...audited] }, revision: s.revision + 1 };
  const fp = record.fingerprint.status === 'available' ? record.fingerprint.value : undefined;
  if (fp && x.completion !== 'missed' && x.sport !== 'hyrox') {
    s = { ...s, fingerprints: { ...s.fingerprints, [x.sport]: [...s.fingerprints[x.sport], { fingerprint: fp, at, status: 'completed', repetitionIntents: [] } as FingerprintHistoryEntry] } };
  }
  // Douleur déclarée : même règle G1 fail-closed que le chemin V0 (pause jusqu'à levée explicite).
  if (pained) s = { ...s, safety: { ...s.safety, activePain: { reportedAt: at, areas: [], sessionKey: x.requestId } } };
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

