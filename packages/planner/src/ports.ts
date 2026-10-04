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
import type { RunningContextInput } from '@hybridsport/running';
import type { StrengthContextInput } from '@hybridsport/strength';
import { GP_CODES, gpReasons } from './codes.js';
import type { DeclaredIntent, DemandOutcome, NeighbourContext, PlannerClock, PlannerMode, PlannerSport } from './model.js';

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

export interface SportPort {
  readonly sport: PlannerSport;
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
          availableTimeS, targetDurationS: targetFromAvailable(availableTimeS, readToleranceProfile(def.content.ruleset, i.toleranceProfile)), repetitionIntents: [], plannerNotes: [],
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

type Base<C> = Omit<EnginePortDefinition<C>, 'sport' | 'discipline' | 'context' | 'run' | 'engine' | 'consumesNeighbours'>;
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

export function runningPort(def: Base<unknown> & { readonly engine: SportEngine<unknown>; readonly baseContext: Ctx<RunningContextInput> }): SportPort {
  return createEnginePort({ ...def, sport: 'running', discipline: 'running', context: (slot) => { const b = resolve(def.baseContext, slot); return { ...b, population: { ...b.population, hybrid: slot.hybrid } }; } });
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
