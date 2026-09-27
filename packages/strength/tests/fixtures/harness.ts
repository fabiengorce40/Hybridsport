/**
 * Banc de test du StrengthEngine : contexte injecté (instant, graine), profils, intentions, contexte
 * de musculation, et exécution de bout en bout (moteur → CORE).
 */
import { asISODateTime } from '@hybridsport/domain';
import type { FingerprintHistoryEntry, Level, SessionIntentInput } from '@hybridsport/domain';
import { ENGINE_VERSION, loadCatalog, loadRuleset, runSportSession } from '@hybridsport/engine';
import type { CoreProfile, CoreState, EngineContext, LoadedCatalog, LoadedRuleset, SportEngineInput } from '@hybridsport/engine';
import { StrengthEngine, parseStrengthContext } from '../../src/index.js';
import type { StrengthContext, StrengthContextInput } from '../../src/index.js';
import { presetEquipment, strengthCatalogDocument } from './catalog.js';
import { strengthRulesetDocument } from './ruleset.js';

export const NOW = asISODateTime('2026-10-05T08:00:00Z');

export function strengthRuleset(doc = strengthRulesetDocument()): LoadedRuleset {
  const r = loadRuleset(doc);
  if (!r.ok) throw new Error(`Ruleset strength invalide : ${JSON.stringify(r.issues.map((i) => i.params))}`);
  return r.ruleset;
}

export function strengthCatalog(doc = strengthCatalogDocument()): LoadedCatalog {
  const r = loadCatalog(doc);
  if (!r.ok) throw new Error(`Catalogue strength invalide : ${JSON.stringify(r.issues.map((i) => i.params))}`);
  return r.catalog;
}

const RULESET = strengthRuleset();
const CATALOG = strengthCatalog();

export function ctx(seed = 'strength-seed', ruleset: LoadedRuleset = RULESET, catalog: LoadedCatalog = CATALOG): EngineContext<LoadedRuleset, LoadedCatalog> {
  return { now: NOW, timezone: 'Europe/Paris', seed, engineVersion: ENGINE_VERSION, ruleset, catalog };
}

export function profile(level: Level, preset: string, o: Partial<CoreProfile> = {}): CoreProfile {
  return { athleteLevel: level, eligibility: 'eligible', declarations: [], healthDataConsent: true, restrictions: [], excludedExercises: [], availableEquipment: presetEquipment(preset), ...o };
}

export const STATE: CoreState = { readiness: 'normal', activePain: [], painHistory: 'available', dayAvailable: true };

export function intent(archetypeId: string, stimulus: string, minutes: number, o: Partial<SessionIntentInput> = {}): SessionIntentInput {
  // technical-constant: conversion minutes → secondes ; marge de la cible = profil strength_sets du ruleset de test (360 s)
  const available = minutes * 60;
  return {
    id: `intent.${archetypeId}.${stimulus}`, discipline: 'strength', archetypeId, stimulus, objective: `objective.${stimulus}`, priority: 'standard', phase: 'phase.test',
    availableTimeS: available, targetDurationS: available - 360, repetitionIntents: [], plannerNotes: [], ...o,
  };
}

export function strengthContext(o: Partial<StrengthContextInput> = {}): StrengthContextInput {
  return {
    goal: { primary: { goal: 'hypertrophy' } },
    phase: { kind: 'accumulation', weekInMesocycle: 1, mesocycleLength: 4 },
    capacities: [], tracks: [], recentExposures: [], hardSets: { d7: {} },
    week: { otherStrengthSessions: [], neighbors: [], known: true },
    preferences: { liked: [], disliked: [] },
    ...o,
  };
}

export interface Scenario {
  readonly profile: CoreProfile;
  readonly state?: CoreState;
  readonly intent: SessionIntentInput;
  readonly context: StrengthContextInput;
  readonly history?: readonly FingerprintHistoryEntry[];
  readonly seed?: string;
  readonly ruleset?: LoadedRuleset;
}

export function run(s: Scenario) {
  return runSportSession(StrengthEngine, { intent: s.intent, profile: s.profile, state: s.state ?? STATE, history: s.history ?? [], disciplineContext: s.context }, ctx(s.seed, s.ruleset));
}

/** Entrée du moteur telle que la construit le CORE (pour appeler `propose` directement dans les tests unitaires). */
export function engineInput(s: Scenario): SportEngineInput<StrengthContext> {
  const parsed = parseStrengthContext(s.context);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.reasons));
  const c = ctx(s.seed, s.ruleset);
  return {
    intent: { repetitionIntents: [], plannerNotes: [], ...s.intent } as SportEngineInput<StrengthContext>['intent'],
    profile: s.profile, state: s.state ?? STATE,
    constraints: { availableEquipment: s.profile.availableEquipment, restrictions: s.profile.restrictions, areaRestrictions: [], restrictedMovements: [], excludedExercises: s.profile.excludedExercises, suspendHighIntensity: false },
    catalog: c.catalog, ruleset: c.ruleset, history: s.history ?? [],
    context: { seed: `${c.seed}/engine/${StrengthEngine.id}`, now: c.now, engineVersion: c.engineVersion },
    discipline: parsed.context,
  };
}
