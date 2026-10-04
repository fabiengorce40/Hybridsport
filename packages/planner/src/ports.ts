/**
 * Ports de discipline : le SEUL chemin par lequel le planificateur obtient une séance. Un port appelle le moteur réel
 * de sa discipline par le pipeline du CORE (strict pour Cross-training et HYROX : aucune substitution publiée) et
 * renvoie la séance ou le refus, raisons exactes à l'appui. Le planificateur ne fournit au port que le créneau
 * (date, temps disponible, caractère multisport) : le contexte sportif (historique, objectifs, références, intention
 * de programme) est déclaré par l'appelant, jamais calculé ici.
 */
import { ENGINE_VERSION, deriveExerciseStructures, isDerivationTable, readToleranceProfile, runSportSession, targetFromAvailable } from '@hybridsport/engine';
import type { CoreProfile, CorePipelineOutcome, CoreState, EngineContext, LoadedCatalog, LoadedRuleset, SportEngine, SportSessionRequest } from '@hybridsport/engine';
import type { Discipline, FingerprintHistoryEntry, ReasonCode, SessionDraft, SessionFingerprint } from '@hybridsport/domain';
import { runCrossTrainingC2 } from '@hybridsport/crosstraining';
import type { CrossTrainingContextInput, CrossTrainingEngine } from '@hybridsport/crosstraining';
import { runHyroxH1 } from '@hybridsport/hyrox';
import type { HyroxContextInput, HyroxEngine } from '@hybridsport/hyrox';
import type { RunningContextInput } from '@hybridsport/running';
import type { StrengthContextInput } from '@hybridsport/strength';
import { GP_CODES, gpReasons } from './codes.js';
import type { PlannerClock, PlannerSport } from './model.js';

// technical-constant: conversion minutes → secondes
const S_PER_MIN = 60;

/** Créneau transmis au moteur : rien d'autre ne franchit la frontière planificateur → discipline. */
export interface SlotRequest {
  readonly requestId: string;
  readonly date: string;
  readonly availableMinutes: number;
  readonly hybrid: boolean;
  readonly seed: string;
}

export type PortOutcome =
  | { readonly status: 'planned'; readonly session: SessionDraft; readonly fingerprint?: SessionFingerprint; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'refused'; readonly reasons: readonly ReasonCode[] };

export type StructuresResult = { readonly ok: true; readonly structures: readonly string[] } | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

export interface SportPort {
  readonly sport: PlannerSport;
  generate(slot: SlotRequest): PortOutcome;
  /** Structures de planification sollicitées (dérivées du catalogue par la table GOUVERNÉE du ruleset de la discipline). */
  structures(session: SessionDraft): StructuresResult;
}

/** Intention de séance DÉCLARÉE par le programme ou l'utilisateur (le planificateur ne choisit ni archétype ni stimulus). */
export interface DeclaredIntent {
  readonly archetypeId: string;
  readonly stimulus: string;
  readonly objective: string;
  readonly phase: string;
  readonly toleranceProfile: string;
}

export interface EnginePortDefinition<C> {
  readonly sport: PlannerSport;
  readonly discipline: Discipline;
  readonly engine: SportEngine<C>;
  readonly content: { readonly ruleset: LoadedRuleset; readonly catalog: LoadedCatalog };
  readonly profile: CoreProfile;
  readonly state: CoreState;
  readonly history: readonly FingerprintHistoryEntry[];
  readonly intent: DeclaredIntent;
  readonly clock: PlannerClock;
  /** Contexte de discipline pour ce créneau (contrat du moteur ; seul le champ multisport dépend du créneau). */
  readonly context: (slot: SlotRequest) => unknown;
  /** Exécution : pipeline du CORE (par défaut) ou variante stricte du moteur. */
  readonly run?: (engine: SportEngine<C>, request: SportSessionRequest, ctx: EngineContext<LoadedRuleset, LoadedCatalog>) => CorePipelineOutcome;
}

function outcomeOf(o: CorePipelineOutcome): PortOutcome {
  if (o.result.status === 'ok') return { status: 'planned', session: o.result.value, ...(o.fingerprint ? { fingerprint: o.fingerprint } : {}), reasons: o.result.warnings };
  return { status: 'refused', reasons: o.result.status === 'error' ? o.result.error.reasons : o.result.reasons };
}

/** Blocs d'entraînement (hors échauffement et retour au calme) : ceux qui portent la sollicitation de la séance. */
const TRAINING_EXCLUDED_KINDS = new Set(['warmup', 'cooldown']);

export function structuresOf(session: SessionDraft, content: EnginePortDefinition<unknown>['content'], sport: PlannerSport): StructuresResult {
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

export function createEnginePort<C>(def: EnginePortDefinition<C>): SportPort {
  const run = def.run ?? ((e, r, c) => runSportSession(e, r, c));
  return {
    sport: def.sport,
    generate(slot) {
      const now = def.clock.instantOf(slot.date);
      const availableTimeS = slot.availableMinutes * S_PER_MIN;
      const request: SportSessionRequest = {
        intent: {
          id: `plan.${slot.requestId}`, discipline: def.discipline, archetypeId: def.intent.archetypeId, stimulus: def.intent.stimulus,
          objective: def.intent.objective, priority: 'standard', phase: def.intent.phase, availableTimeS,
          targetDurationS: targetFromAvailable(availableTimeS, readToleranceProfile(def.content.ruleset, def.intent.toleranceProfile)),
          repetitionIntents: [], plannerNotes: [],
        },
        profile: def.profile, state: def.state,
        history: def.history.filter((h) => h.at < now),
        disciplineContext: def.context(slot),
      };
      const ctx: EngineContext<LoadedRuleset, LoadedCatalog> = { now, timezone: def.clock.timezone, seed: slot.seed, engineVersion: ENGINE_VERSION, ruleset: def.content.ruleset, catalog: def.content.catalog };
      return outcomeOf(run(def.engine, request, ctx));
    },
    structures: (session) => structuresOf(session, def.content, def.sport),
  };
}

type Base<C> = Omit<EnginePortDefinition<C>, 'sport' | 'discipline' | 'context' | 'run' | 'engine'>;

/**
 * Plomberie de CONTRAT par discipline : seul le champ multisport défini par chaque moteur dépend du créneau.
 * Strength : semaine « connue » seulement hors multisport (les voisines d'autres disciplines exigent un profil de
 * demande qu'aucun moteur ne fournit encore : hypothèse prudente du moteur). Running, Cross-training, HYROX :
 * `population.hybrid` transmis tel quel ; chaque moteur applique sa propre gouvernance multisport.
 */
export function strengthPort(def: Base<unknown> & { readonly engine: SportEngine<unknown>; readonly baseContext: StrengthContextInput }): SportPort {
  return createEnginePort({ ...def, sport: 'strength', discipline: 'strength', context: (slot) => ({ ...def.baseContext, week: { ...def.baseContext.week, known: def.baseContext.week.known && !slot.hybrid } }) });
}

export function runningPort(def: Base<unknown> & { readonly engine: SportEngine<unknown>; readonly baseContext: RunningContextInput }): SportPort {
  return createEnginePort({ ...def, sport: 'running', discipline: 'running', context: (slot) => ({ ...def.baseContext, population: { ...def.baseContext.population, hybrid: slot.hybrid } }) });
}

export function crossTrainingPort(def: Base<unknown> & { readonly engine: CrossTrainingEngine; readonly baseContext: CrossTrainingContextInput }): SportPort {
  return createEnginePort<unknown>({
    ...def, engine: def.engine as SportEngine<unknown>, sport: 'crosstraining', discipline: 'crosstraining',
    context: (slot) => ({ ...def.baseContext, population: { ...def.baseContext.population, hybrid: slot.hybrid } }),
    run: (_e, r, c) => runCrossTrainingC2(def.engine, r, c),
  });
}

export function hyroxPort(def: Base<unknown> & { readonly engine: HyroxEngine; readonly baseContext: HyroxContextInput }): SportPort {
  return createEnginePort<unknown>({
    ...def, engine: def.engine as SportEngine<unknown>, sport: 'hyrox', discipline: 'hybrid_race',
    context: (slot) => ({ ...def.baseContext, population: { ...def.baseContext.population, hybrid: slot.hybrid } }),
    run: (_e, r, c) => runHyroxH1(def.engine, r, c),
  });
}
