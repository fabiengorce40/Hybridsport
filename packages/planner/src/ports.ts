/**
 * Ports de discipline : le SEUL chemin par lequel le planificateur obtient une séance. Un port appelle le moteur réel
 * de sa discipline par le pipeline du CORE (strict pour Cross-training et HYROX : aucune substitution publiée), puis
 * expose ce que le CORE dérive de la séance GÉNÉRÉE : structures sollicitées, profil de demande standard, record
 * persistable. Le planificateur ne transmet que le créneau, l'intention DÉCLARÉE par le programme et le contexte
 * voisin ; le contexte sportif (historique, références, déclarations) est fourni par l'appelant.
 */
import {
  ENGINE_VERSION, DEMAND_NORMALIZATION_PARAMETER, deriveExerciseStructures, deriveSessionDemand, estimateDuration, isDerivationTable, readDurationParams,
  readToleranceProfile, runSportSession, targetFromAvailable, toRecordedDurationEstimate,
} from '@hybridsport/engine';
import type { CoreProfile, CorePipelineOutcome, CoreState, EngineContext, LoadedCatalog, LoadedRuleset, SportEngine, SportSessionRequest } from '@hybridsport/engine';
import type { Discipline, FingerprintHistoryEntry, ReasonCode, SessionDraft, SessionFingerprint, SessionRecord } from '@hybridsport/domain';
import { runCrossTrainingC2 } from '@hybridsport/crosstraining';
import type { CrossTrainingContextInput, CrossTrainingEngine } from '@hybridsport/crosstraining';
import { runHyroxH1 } from '@hybridsport/hyrox';
import type { HyroxContextInput, HyroxEngine } from '@hybridsport/hyrox';
import { ARCHETYPE_INTENT_IDS, archetypeFromIntentId, composeRunningWeek, isV1Archetype, parseRunningContext, resolveParameter } from '@hybridsport/running';
import type { RunningContextInput, RunningParameter } from '@hybridsport/running';
import type { StrengthContextInput } from '@hybridsport/strength';
import { GP_CODES, gpReasons } from './codes.js';
import type { DeclaredIntent, DemandOutcome, NeighbourContext, PlannerClock, PlannerMode, PlannerSport } from './model.js';
import type { NoValidProposalInput } from '@hybridsport/domain';

export type { CrossTrainingContextInput, CrossTrainingEngine, HyroxContextInput, HyroxEngine, RunningContextInput, StrengthContextInput };

// technical-constant: conversion minutes → secondes
const S_PER_MIN = 60;

/** Créneau transmis au moteur : rien d'autre ne franchit la frontière planificateur → discipline. */
export interface SlotRequest {
  readonly requestId: string;
  readonly date: string;
  readonly availableMinutes: number;
  readonly hybrid: boolean;
  readonly seed: string;
  /** Intention de séance déclarée par le PROGRAMME (le planificateur ne la choisit pas). */
  readonly intent: DeclaredIntent;
  /** HYROX : station demandée par le programme, transmise telle quelle. */
  readonly station?: string;
  /** Contexte voisin (seconde passe), pour les moteurs qui le consomment. */
  readonly neighbours?: NeighbourContext;
}

export type PortOutcome =
  | { readonly status: 'planned'; readonly session: SessionDraft; readonly fingerprint?: SessionFingerprint; readonly record: SessionRecord; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'refused'; readonly reasons: readonly ReasonCode[] };

export type StructuresResult = { readonly ok: true; readonly structures: readonly string[] } | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

/** Jour attribué au sport pour la composition ; `locked` : intention imposée (ex. évaluation demandée par le programme). */
export interface CompositionDay { readonly date: string; readonly availableMinutes: number; readonly requestId: string; readonly locked?: DeclaredIntent }
export type CompositionResult =
  | { readonly status: 'composed'; readonly authority: 'approved' | 'provisional'; readonly days: readonly { readonly date: string; readonly intent: DeclaredIntent; readonly role: string }[]; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'unresolved'; readonly reasons: readonly ReasonCode[] };

/** Base d'intention d'une composition par le moteur : cadre déclaré par le programme, SANS archétype. */
export type CompositionBase = Omit<DeclaredIntent, 'archetypeId'>;
export interface SportComposition {
  /**
   * Archétype du moteur utilisé pour RÉSERVER les jours (première passe, interférence) avant la composition ; c'est
   * l'archétype de complément de la règle du moteur. La séance définitive est régénérée après composition.
   */
  readonly placementArchetypeId: string;
  compose(input: { readonly days: readonly CompositionDay[]; readonly base: CompositionBase; readonly hybrid: boolean; readonly mode: PlannerMode }): CompositionResult;
}

export interface SportPort {
  readonly sport: PlannerSport;
  /** Composition hebdomadaire PROPRE AU MOTEUR (archétype de chaque jour), si le moteur la possède. */
  readonly composition?: SportComposition;
  readonly discipline: Discipline;
  /** Le moteur consomme-t-il un contexte voisin (seconde passe) ? */
  readonly consumesNeighbours: boolean;
  generate(slot: SlotRequest): PortOutcome;
  /** Structures sollicitées (dérivées du catalogue par la table GOUVERNÉE du ruleset de la discipline). */
  structures(session: SessionDraft): StructuresResult;
  /** Profil de demande standard (CORE, normalisation gouvernée) ; en PRODUCTION, normalisation approuvée exigée. */
  demand(session: SessionDraft, mode: PlannerMode): DemandOutcome;
}

type Content = { readonly ruleset: LoadedRuleset; readonly catalog: LoadedCatalog };

export interface EnginePortDefinition<C> {
  readonly sport: PlannerSport;
  readonly discipline: Discipline;
  readonly engine: SportEngine<C>;
  readonly content: Content;
  readonly profile: CoreProfile;
  readonly state: CoreState;
  readonly history: readonly FingerprintHistoryEntry[];
  readonly clock: PlannerClock;
  readonly consumesNeighbours?: boolean;
  /** Contexte de discipline pour ce créneau (contrat du moteur). */
  readonly context: (slot: SlotRequest) => unknown;
  /** Exécution : pipeline du CORE (par défaut) ou variante stricte du moteur. */
  readonly run?: (engine: SportEngine<C>, request: SportSessionRequest, ctx: EngineContext<LoadedRuleset, LoadedCatalog>) => CorePipelineOutcome;
  /** Notes du planificateur transmises dans l'intention (ex. provenance). */
  readonly plannerNotes?: readonly string[];
}

/** Blocs d'entraînement (hors échauffement et retour au calme) : ceux qui portent la sollicitation de la séance. */
const TRAINING_EXCLUDED_KINDS = new Set(['warmup', 'cooldown']);

export function structuresOf(session: SessionDraft, content: Content, sport: PlannerSport): StructuresResult {
  const table = content.ruleset.parameter('demand.derivationTable')?.value;
  if (!isDerivationTable(table)) return { ok: false, reasons: [gpReasons.emit(GP_CODES.STRUCTURES_UNAVAILABLE, { sport, cause: 'DERIVATION_TABLE_MISSING' })] };
  const out = new Set<string>();
  for (const b of session.blocks) {
    if (TRAINING_EXCLUDED_KINDS.has(b.kind)) continue;
    for (const it of b.items) {
      const e = content.catalog.exercise(it.exerciseId);
      if (!e) return { ok: false, reasons: [gpReasons.emit(GP_CODES.STRUCTURES_UNAVAILABLE, { sport, cause: `UNKNOWN_EXERCISE:${it.exerciseId}` })] };
      for (const s of Object.keys(deriveExerciseStructures(e, table))) out.add(s);
    }
  }
  return { ok: true, structures: [...out].sort() };
}

/** Profil de demande via le CORE ; en PRODUCTION la normalisation des doses doit être approuvée et non provisoire. */
export function demandOf(session: SessionDraft, content: Content, sport: PlannerSport, mode: PlannerMode): DemandOutcome {
  const meta = content.ruleset.parameter(DEMAND_NORMALIZATION_PARAMETER);
  if (mode === 'PRODUCTION' && meta && !(meta.status === 'approved' && !meta.provisional)) {
    return { status: 'unavailable', reasons: [gpReasons.emit(GP_CODES.DEMAND_PROFILE_NOT_APPROVED, { sport, parameterId: DEMAND_NORMALIZATION_PARAMETER, mode })] };
  }
  const d = deriveSessionDemand(session, content.catalog, content.ruleset);
  return d.ok ? { status: 'derived', levels: d.profile.levels } : { status: 'unavailable', reasons: d.reasons };
}

function outcomeOf(o: CorePipelineOutcome, content: Content, seed: string): PortOutcome {
  if (o.result.status !== 'ok') return { status: 'refused', reasons: o.result.status === 'error' ? o.result.error.reasons : o.result.reasons };
  const session = o.result.value;
  // Estimation de durée du CORE (DurationEngine), stockée avec le record (aucun calcul de durée ici).
  const est = estimateDuration(session, content.catalog, readDurationParams(content.ruleset));
  const record: SessionRecord = {
    session,
    provenance: { engineVersion: ENGINE_VERSION, rulesetVersion: content.ruleset.version, catalogVersion: content.catalog.version, seed, traceId: o.result.trace.traceId },
    fingerprint: o.fingerprint ? { status: 'available', value: o.fingerprint } : { status: 'unavailable', reason: 'duplicate_analysis_inactive' },
    durationEstimate: est.ok ? toRecordedDurationEstimate(est.estimate) : { availability: 'UNAVAILABLE_LEGACY' },
  };
  return { status: 'planned', session, ...(o.fingerprint ? { fingerprint: o.fingerprint } : {}), record, reasons: o.result.warnings };
}

export function createEnginePort<C>(def: EnginePortDefinition<C>): SportPort {
  const run = def.run ?? ((e, r, c) => runSportSession(e, r, c));
  return {
    sport: def.sport,
    discipline: def.discipline,
    consumesNeighbours: def.consumesNeighbours === true,
    generate(slot) {
      const now = def.clock.instantOf(slot.date);
      const availableTimeS = slot.availableMinutes * S_PER_MIN;
      const i = slot.intent;
      const request: SportSessionRequest = {
        intent: {
          id: `plan.${slot.requestId}`, discipline: def.discipline, archetypeId: i.archetypeId, stimulus: i.stimulus, objective: i.objective, priority: 'standard', phase: i.phase,
          availableTimeS, targetDurationS: targetFromAvailable(availableTimeS, readToleranceProfile(def.content.ruleset, i.toleranceProfile)), repetitionIntents: [], plannerNotes: [...(def.plannerNotes ?? [])],
        },
        profile: def.profile, state: def.state,
        history: def.history.filter((h) => h.at < now),
        disciplineContext: def.context(slot),
      };
      const ctx: EngineContext<LoadedRuleset, LoadedCatalog> = { now, timezone: def.clock.timezone, seed: slot.seed, engineVersion: ENGINE_VERSION, ruleset: def.content.ruleset, catalog: def.content.catalog };
      return outcomeOf(run(def.engine, request, ctx), def.content, slot.seed);
    },
    structures: (session) => structuresOf(session, def.content, def.sport),
    demand: (session, mode) => demandOf(session, def.content, def.sport, mode),
  };
}

type Base<C> = Omit<EnginePortDefinition<C>, 'sport' | 'discipline' | 'context' | 'run' | 'engine' | 'consumesNeighbours' | 'plannerNotes'>;

/**
 * Provenance du planificateur global : note portée par l'intention de toute séance demandée PAR LE PLANIFICATEUR
 * (port Running). Un moteur protégé par `requirePlannerProvenance` refuse tout appel MULTISPORT qui ne la porte pas :
 * l'intégration « planificateur ↔ Running » ne peut pas être contournée par un autre chemin applicatif.
 */
export const PLANNER_PROVENANCE_NOTE = 'kairo.global_planner.v2';

export function requirePlannerProvenance<C>(engine: SportEngine<C>): SportEngine<C> {
  return {
    ...engine,
    propose: (input) => {
      const hybrid = (input.discipline as { population?: { hybrid?: unknown } } | undefined)?.population?.hybrid === true;
      if (!hybrid || input.intent.plannerNotes.includes(PLANNER_PROVENANCE_NOTE)) return engine.propose(input);
      const r = gpReasons.emit(GP_CODES.PROVENANCE_REQUIRED, { engineId: engine.id });
      const refusal: NoValidProposalInput = {
        status: 'no_valid_proposal', reasons: [{ ...r, params: { ...r.params } as Record<string, string>, ruleRefs: [...r.ruleRefs] }], blockingNeeds: [], missingData: [],
        provenance: { engineId: engine.id, engineVersion: engine.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
      };
      return refusal;
    },
  };
}
type Ctx<T> = T | ((slot: SlotRequest) => T);
const resolve = <T>(c: Ctx<T>, slot: SlotRequest): T => (typeof c === 'function' ? (c as (s: SlotRequest) => T)(slot) : c);

/**
 * Plomberie de CONTRAT par discipline (champs définis par chaque moteur, aucune décision sportive) :
 * - Strength : voisines d'autres disciplines transmises avec leur profil DÉRIVÉ ; semaine connue si toutes les
 *   voisines sont connues (sinon hypothèse prudente du moteur, inchangée) ;
 * - Running, Cross-training, HYROX : `population.hybrid` transmis tel quel ; HYROX : station du programme.
 */
export function strengthPort(def: Base<unknown> & { readonly engine: SportEngine<unknown>; readonly baseContext: Ctx<StrengthContextInput> }): SportPort {
  return createEnginePort({
    ...def, sport: 'strength', discipline: 'strength', consumesNeighbours: true,
    context: (slot) => {
      const base = resolve(def.baseContext, slot);
      if (!slot.hybrid) return base;
      const n = slot.neighbours;
      return {
        ...base,
        week: {
          ...base.week,
          neighbors: [...base.week.neighbors, ...(n?.neighbours ?? []).map((x) => ({ discipline: x.discipline, stimulus: x.stimulus, priority: 'standard' as const, hoursFromThisSession: x.hoursFromThisSession, demand: { ...x.demand } }))],
          known: base.week.known && n?.known === true,
        },
      };
    },
  });
}

/**
 * Running : `population.hybrid` transmis tel quel, provenance du planificateur portée par l'intention. Composition
 * hebdomadaire : celle du MOTEUR Running (`composeRunningWeek`, §R), sur les jours placés, sonde = génération réelle ;
 * autorité lue dans la résolution de ses règles (V26, V10, V11) : approuvées ⇒ approved ; candidates ⇒ provisional ;
 * non résolues ⇒ unresolved (aucune composition inventée, aucun repli « maintien » présenté comme une règle).
 */
const RUNNING_COMPOSITION_RULES = ['running.frequency.minimumPlannerRunningFrequency', 'running.hi.densityPolicy', 'running.placement.strongDefaultSeparation'] as const;

export function runningPort(def: Base<unknown> & { readonly engine: SportEngine<unknown>; readonly baseContext: Ctx<RunningContextInput>; readonly composition?: { readonly parameters: readonly RunningParameter[] } }): SportPort {
  const context = (slot: SlotRequest) => { const b = resolve(def.baseContext, slot); return { ...b, population: { ...b.population, hybrid: slot.hybrid } }; };
  const port = createEnginePort({ ...def, sport: 'running', discipline: 'running', plannerNotes: [PLANNER_PROVENANCE_NOTE], context });
  const comp = def.composition;
  if (!comp) return port;
  return {
    ...port,
    composition: {
    // §R étape 5 (Running) : tout jour non attribué à KEY / LONG / TEST reçoit EASY, l'archétype de complément.
    placementArchetypeId: ARCHETYPE_INTENT_IDS.EASY,
    compose({ days, base: frame, hybrid, mode }) {
      const base: DeclaredIntent = { ...frame, archetypeId: ARCHETYPE_INTENT_IDS.EASY };
      const resolutions = RUNNING_COMPOSITION_RULES.map((id) => resolveParameter(comp.parameters, id, mode));
      const trace = resolutions.flatMap((r) => r.reasons);
      if (resolutions.some((r) => r.status !== 'resolved')) return { status: 'unresolved', reasons: [gpReasons.emit(GP_CODES.COMPOSITION_UNRESOLVED, { sport: 'running', mode }), ...trace] };
      const authority = resolutions.some((r) => r.status === 'resolved' && r.candidate) ? 'provisional' : 'approved';
      const last = [...days].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      if (!last) return { status: 'composed', authority, days: [], reasons: trace };
      const ctxSlot: SlotRequest = { requestId: last.requestId, date: last.date, availableMinutes: last.availableMinutes, hybrid, seed: `planner:${last.requestId}:${last.date}`, intent: base };
      const parsed = parseRunningContext(context(ctxSlot));
      if (!parsed.ok) return { status: 'unresolved', reasons: [gpReasons.emit(GP_CODES.COMPOSITION_UNRESOLVED, { sport: 'running', mode }), ...parsed.reasons] };
      const byDate = new Map(days.map((d) => [d.date, d]));
      const c = composeRunningWeek({
        ctx: parsed.context, parameters: comp.parameters, mode, weeklySessions: days.length,
        days: days.map((d) => {
          const a = d.locked ? archetypeFromIntentId(d.locked.archetypeId) : undefined;
          return { date: d.date, availableS: d.availableMinutes * S_PER_MIN, ...(a !== undefined && isV1Archetype(a) ? { locked: a } : {}) };
        }),
        probe: (a, date) => {
          const d = byDate.get(date);
          if (!d) return { ok: false, reasons: [] };
          const out = port.generate({ requestId: d.requestId, date, availableMinutes: d.availableMinutes, hybrid, seed: `planner:${d.requestId}:${date}`, intent: { ...base, archetypeId: ARCHETYPE_INTENT_IDS[a] } });
          return out.status === 'planned' ? { ok: true, reasons: [] } : { ok: false, reasons: out.reasons.map((r) => ({ code: r.code, params: r.params })) };
        },
      });
      return {
        // Trace de résolution du port + raisons de la composition du moteur, sans doublon (mêmes lectures de règles).
        status: 'composed', authority, reasons: [...new Map([...trace, ...c.reasons].map((r) => [`${r.code}|${JSON.stringify(r.params)}`, r])).values()],
        days: c.slots.map((sl) => ({ date: sl.date, role: sl.role, intent: sl.role === 'LOCKED' ? (byDate.get(sl.date)?.locked ?? base) : { ...base, archetypeId: ARCHETYPE_INTENT_IDS[sl.archetype] } })),
      };
    },
    },
  };
}

export function crossTrainingPort(def: Base<unknown> & { readonly engine: CrossTrainingEngine; readonly baseContext: Ctx<CrossTrainingContextInput> }): SportPort {
  return createEnginePort<unknown>({
    ...def, engine: def.engine as SportEngine<unknown>, sport: 'crosstraining', discipline: 'crosstraining',
    context: (slot) => { const b = resolve(def.baseContext, slot); return { ...b, population: { ...b.population, hybrid: slot.hybrid } }; },
    run: (_e, r, c) => runCrossTrainingC2(def.engine, r, c),
  });
}

export function hyroxPort(def: Base<unknown> & { readonly engine: HyroxEngine; readonly baseContext: Ctx<Omit<HyroxContextInput, 'requestedStation'>> }): SportPort {
  return createEnginePort<unknown>({
    ...def, engine: def.engine as SportEngine<unknown>, sport: 'hyrox', discipline: 'hybrid_race',
    context: (slot) => {
      const b = resolve(def.baseContext, slot);
      return { ...b, population: { ...b.population, hybrid: slot.hybrid }, ...(slot.station === undefined ? {} : { requestedStation: slot.station }) };
    },
    run: (_e, r, c) => runHyroxH1(def.engine, r, c),
  });
}
