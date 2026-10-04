/**
 * Programme longitudinal dans l'application : app-core → Programme Engine → planificateur global → moteurs → CORE.
 * L'application ne décide rien de sportif : elle fournit l'état (historique, disponibilités, déclarations), persiste
 * la semaine planifiée et l'état du programme, et renvoie les réalisations à l'historique des moteurs par leurs
 * contrats existants (course réalisée, référence TEST, empreintes, douleur).
 */
import type { FingerprintHistoryEntry, PainLevel, ReasonCode, SessionRecord } from '@hybridsport/domain';
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
import { applyStrengthExecution, realizedRunFrom, testReferenceFrom } from './progression.js';
import { realizeCrossTrainingC2, realizeHyroxStation } from '@hybridsport/planner';

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
      return plan ? [{ sport: sp, sessions: plan.sessionsPerWeek, intent: { ...plan.intent }, ...(plan.composition === 'engine' ? { composition: 'engine' as const } : {}), declarations: { ...plan.declarations }, ...(plan.station === undefined ? {} : { station: plan.station }) }] : [];
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
export function planProgrammeCurrentWeek(state: AppState, clock: Clock, env: ProgrammeEnvironment = appPlannerEnvironment(), weekIndex?: number, o: { readonly pastDaysUnavailable?: boolean } = {}): AppState {
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  const ps = requireProgramme(state);
  assertEnvironment(env);
  // Douleur active : garde COMMUNE à tous les chemins de planification (weeks.ts).
  assertPlanningAllowed(state);
  const i = weekIndex ?? weekIndexOf(ps, clock.today);
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
  | { readonly sport: 'crosstraining'; readonly result?: { readonly durationS?: number; readonly calories?: number; readonly distanceM?: number }; readonly sessionRpe?: number }
  | { readonly sport: 'hyrox'; readonly result?: { readonly achieved?: number; readonly elapsedS?: number; readonly actualLoadKg?: number } }
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
  if (!week || req?.status !== 'planned' || !planned) return reject('EXECUTION_UNKNOWN_SESSION', pgReasons.emit(PG_CODES.RESULT_UNKNOWN_REQUEST, { requestId: x.requestId }));
  if (req.sport !== x.sport) return reject('EXECUTION_SPORT_MISMATCH');
  if (ps.results.some((r) => r.requestId === x.requestId)) return reject('EXECUTION_DUPLICATE', pgReasons.emit(PG_CODES.RESULT_DUPLICATE, { requestId: x.requestId }));
  const decoded = planned.record ? migrateToCurrent<SessionRecord>(planned.record) : undefined;
  const record = decoded?.ok ? decoded.value : undefined;
  if (!record) return reject('EXECUTION_SESSION_UNREADABLE');
  const session = record.session;
  const pained = (x.pain !== undefined && x.pain !== 'NONE') || (x.sport === 'strength' && (x.painItems?.length ?? 0) > 0);
  let s: AppState = state;
  let evidence: { history: ProgrammeState['definition']['priorities'][number]; ref: string; measurement?: string } | undefined;

  if (x.pain === 'REPORTED' && (x.sport === 'crosstraining' || x.sport === 'hyrox')) return reject('EXECUTION_PAIN_LEVEL_REQUIRED');
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
        s = { ...s, strength: applyStrengthExecution(s, { archetypeId: intent.archetypeId, session, sets: [...sets], painItems: [...(x.painItems ?? [])] }, at) };
        evidence = { history: 'strength', ref: x.requestId };
        break;
      }
      case 'running': {
        const intent = requestIntent(ps, x.requestId);
        if (!intent || !x.run) return reject('EXECUTION_RUN_DETAILS_REQUIRED');
        const run = { realizedDurationS: x.run.realizedDurationS, completion: RUN_COMPLETION[x.completion], ...(x.run.distanceM !== undefined ? { distanceM: x.run.distanceM } : {}), ...(x.run.testTimeS !== undefined ? { testTimeS: x.run.testTimeS } : {}) };
        const real = { sessionId: x.requestId, archetypeId: intent.archetypeId, session, run, ...(x.difficulty ? { difficulty: x.difficulty } : {}), pain: pained, at };
        const ref = testReferenceFrom(real);
        s = { ...s, running: { realized: [...s.running.realized, realizedRunFrom(real)], references: [...s.running.references, ...(ref ? [ref] : [])] } };
        evidence = { history: 'running', ref: x.requestId, ...(ref ? { measurement: ref.type } : {}) };
        break;
      }
      case 'crosstraining': {
        const intent = requestIntent(ps, x.requestId);
        if (!intent) return reject('EXECUTION_INTENT_UNKNOWN');
        if (s.crosstraining.realized.some((r) => r.sessionId === x.requestId)) return reject('EXECUTION_DUPLICATE');
        const r = realizeCrossTrainingC2(session, { ...common, stimulus: intent.stimulus, ...(x.result ? { result: x.result } : {}), ...(x.sessionRpe !== undefined ? { sessionRpe: x.sessionRpe } : {}) });
        if (!r.ok) return reject('EXECUTION_INVALID', ...r.reasons);
        s = { ...s, crosstraining: { realized: [...s.crosstraining.realized, { ...r.value }] } };
        evidence = { history: 'crosstraining', ref: x.requestId };
        break;
      }
      case 'hyrox': {
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
  const result = recordProgrammeResult(ps, { requestId: x.requestId, completion: x.completion, pain: pained, recordedAt: at, ...(evidence ? { evidence } : {}) });
  if (!result.ok) return reject('EXECUTION_REJECTED', ...result.reasons);
  s = { ...s, programmeState: result.value, revision: s.revision + 1 };
  const fp = record.fingerprint.status === 'available' ? record.fingerprint.value : undefined;
  if (fp && x.completion !== 'missed' && x.sport !== 'hyrox') {
    s = { ...s, fingerprints: { ...s.fingerprints, [x.sport]: [...s.fingerprints[x.sport], { fingerprint: fp, at, status: 'completed', repetitionIntents: [] } as FingerprintHistoryEntry] } };
  }
  // Douleur déclarée : même règle G1 fail-closed que le chemin V0 (pause jusqu'à levée explicite).
  if (pained) s = { ...s, safety: { activePain: { reportedAt: at, areas: [], sessionKey: x.requestId } } };
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

