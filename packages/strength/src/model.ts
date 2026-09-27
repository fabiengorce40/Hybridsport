/**
 * Environnement de décision partagé par les étapes du pipeline du StrengthEngine (lecture seule).
 */
import type { Exercise, Level, ReasonCode } from '@hybridsport/domain';
import { deriveExerciseStructures, isDerivationTable } from '@hybridsport/engine';
import type { DerivationTable, LoadedCatalog, SeededRng, SportEngineInput } from '@hybridsport/engine';
import type { StrengthContext, StrengthGoalRef, StrengthTrack } from './context.js';
import type { ExerciseClass, StrengthArchetype, StrengthParams } from './params.js';
import { daysBetween } from './util.js';

export interface Env {
  readonly input: SportEngineInput<StrengthContext>;
  readonly params: StrengthParams;
  readonly catalog: LoadedCatalog;
  readonly level: Level;
  readonly goal: StrengthGoalRef;
  readonly goalKey: string;
  readonly stimulus: string;
  readonly archetype: StrengthArchetype;
  readonly equipment: ReadonlySet<string>;
  /** Structures « abaissées » par le contexte multisport (structure → cause). */
  readonly lowered: ReadonlyMap<string, string>;
  /** Structures à ajustement d'effort seulement (InterferenceAssessment MODERATE, ruleset scientifique V1). */
  readonly rirOnly: ReadonlyMap<string, string>;
  /** Tracks ACTIVES de cet archétype, par emplacement : ancres déclarées par l'intention, et accessoires suivis. */
  readonly anchorBySlot: ReadonlyMap<string, StrengthTrack>;
  readonly trackedBySlot: ReadonlyMap<string, StrengthTrack>;
  readonly rng: SeededRng;
  structuresOf(e: Exercise): Readonly<Record<string, number>>;
  /** Jours depuis la dernière exposition d'une famille (historique d'exécutions et d'empreintes). */
  familyDaysSince(family: string): number | undefined;
}

export function exerciseClass(e: Exercise, params: StrengthParams): ExerciseClass {
  const t = params['strength.exerciseClass'];
  if (e.loadCeiling <= t.cappedLoadCeilingMax) return 'bodyweight_capped';
  if (!e.compound) return 'isolation';
  return e.loadCeiling >= t.highLoadCeilingMin ? 'compound_high_load' : 'compound_other';
}

export function buildEnv(input: SportEngineInput<StrengthContext>, params: StrengthParams, archetype: StrengthArchetype, goal: StrengthGoalRef, goalKey: string, lowered: ReadonlyMap<string, string>, rng: SeededRng, rirOnly: ReadonlyMap<string, string> = new Map()): Env {
  const ctx = input.discipline;
  const catalog = input.catalog;
  const table: DerivationTable = input.ruleset.table('demand.derivationTable', isDerivationTable, 'DerivationTable');
  const cache = new Map<string, Readonly<Record<string, number>>>();
  const declaredAnchors = new Set(input.intent.repetitionIntents.flatMap((r) => (r.kind === 'progression_anchor' ? [r.trackId] : [])));
  const active = ctx.tracks.filter((t) => t.status === 'active' && t.archetypeId === archetype.id);
  const anchorBySlot = new Map(active.filter((t) => t.tier === 'anchor' && declaredAnchors.has(t.trackId)).map((t) => [t.slotId, t]));
  const trackedBySlot = new Map(active.filter((t) => t.tier === 'tracked').map((t) => [t.slotId, t]));
  const lastSeen = new Map<string, string>();
  const note = (family: string, at: string) => { const cur = lastSeen.get(family); if (cur === undefined || at > cur) lastSeen.set(family, at); };
  for (const x of ctx.recentExposures) { const e = catalog.exercise(x.exerciseId); if (e) note(e.family, x.at); }
  for (const h of input.history) for (const f of h.fingerprint.families) note(f, h.at);
  return {
    input, params, catalog, level: input.profile.athleteLevel, goal, goalKey, stimulus: input.intent.stimulus, archetype,
    equipment: new Set(input.constraints.availableEquipment), lowered, rirOnly, anchorBySlot, trackedBySlot, rng,
    structuresOf: (e) => { let v = cache.get(e.id); if (!v) { v = deriveExerciseStructures(e, table); cache.set(e.id, v); } return v; },
    familyDaysSince: (family) => { const at = lastSeen.get(family); return at === undefined ? undefined : daysBetween(at, input.context.now); },
  };
}

export type Reasons = ReasonCode[];
