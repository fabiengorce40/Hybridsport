/**
 * Génération d'une séance planifiée par le moteur RÉEL de sa discipline, via le CORE (`runSportSession`).
 *
 * Aucune dose, charge, intensité ni durée n'est calculée ici : l'application ne fait que construire les
 * entrées déclarées par les contrats des moteurs (profil, historique réalisé, contexte de semaine) et
 * conserver la sortie. Un refus (`no_valid_proposal`, erreur du CORE) est conservé avec ses raisons exactes.
 *
 * Autorité : Strength = `provisional` (ruleset de test verrouillé provisoirement) ; Running = `simulation`
 * (moteur construit en mode simulation, contexte CANDIDATE, gouvernance réelle : rien d'approuvé).
 */
import type { CoreState, EngineContext, LoadedCatalog, LoadedRuleset, SportEngine } from '@hybridsport/engine';
import { ENGINE_VERSION, readToleranceProfile, runSportSession, targetFromAvailable } from '@hybridsport/engine';
import type { FingerprintHistoryEntry, ISODateTime, SessionDraft } from '@hybridsport/domain';
import { findArchetype, groupsOf, readStrengthParams, StrengthEngine } from '@hybridsport/strength';
import type { Env, StrengthContextInput } from '@hybridsport/strength';
import { createRunningEngine, CURRENT_RUNNING_GOVERNANCE, withProductDecisions } from '@hybridsport/running';
import type { CapabilityId, RunningContextInput } from '@hybridsport/running';
import { dateOf, daysBetween, sessionInstant, weekStartOf } from './dates.js';
import type { AppState, Authority, GeneratedSession, PlanEntry, Profile, Reason } from './model.js';
import { STIMULUS_BY_GOAL } from './planner.js';
import { anchorsToDeclare } from './progression.js';
import { activePainPause } from './weeks.js';
import { runningContent, strengthContent } from './provisional-content.js';
import type { ContentSource } from './provisional-content.js';

// technical-constant: conversion minutes → secondes
const S_PER_MIN = 60;
// technical-constant: fenêtre du champ `hardSets.d7` du contrat StrengthContext (7 jours)
const D7 = 7;

const FRESH_STATE: CoreState = { readiness: 'normal', activePain: [], painHistory: 'available', dayAvailable: true };

export function coreProfile(p: Profile) {
  return {
    athleteLevel: p.level, eligibility: 'eligible' as const, declarations: [], healthDataConsent: true,
    restrictions: [], excludedExercises: [...p.excludedExercises], availableEquipment: [...p.equipment.items],
  };
}

function ctx(content: ContentSource, date: string, seed: string): EngineContext<LoadedRuleset, LoadedCatalog> {
  return { now: sessionInstant(date), timezone: 'Europe/Paris', seed, engineVersion: ENGINE_VERSION, ruleset: content.ruleset, catalog: content.catalog };
}

const before = (xs: readonly FingerprintHistoryEntry[], date: string): FingerprintHistoryEntry[] => xs.filter((h) => h.at < sessionInstant(date));

/** Comptabilité E1 par groupe musculaire, par les fonctions du moteur (groupes et pondération lus dans le ruleset). */
function hardSetsByGroup(items: readonly { exerciseId: string; workingSets: number }[], content: ContentSource): Record<string, number> {
  const params = readStrengthParams(content.ruleset).values;
  const env = { params } as unknown as Env;
  const w = params['strength.volume'].secondaryWeight;
  const out: Record<string, number> = {};
  for (const it of items) {
    const e = content.catalog.exercise(it.exerciseId);
    if (!e) continue;
    const g = groupsOf(e, env);
    for (const x of g.primary) out[x] = (out[x] ?? 0) + it.workingSets;
    for (const x of g.secondary) out[x] = (out[x] ?? 0) + it.workingSets * w;
  }
  return out;
}

function workingSetsOfSession(s: SessionDraft): { exerciseId: string; workingSets: number }[] {
  return s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items).map((it) => ({
    exerciseId: it.exerciseId,
    workingSets: it.prescription.type === 'sets' ? it.prescription.sets.filter((x) => x.kind !== 'rampup' && x.optional !== true).length : 0,
  }));
}

function strengthContext(state: AppState, p: Profile, entry: PlanEntry, content: ContentSource): StrengthContextInput {
  const week = state.plans[weekStartOf(entry.date)];
  const others = (week?.entries ?? []).filter((e) => e.sport === 'strength' && e.key !== entry.key).map((e) => {
    const g = state.sessions[e.key];
    const done = state.logs[e.key]?.finishedAt !== undefined;
    const planned = g?.outcome.status === 'ok' ? hardSetsByGroup(workingSetsOfSession(g.outcome.session), content) : {};
    return { intentId: `kairo.${e.key}`, archetypeId: e.archetypeId, plannedHardSets: planned, done };
  });
  // Semaine « connue » seulement si aucune séance d'une autre discipline n'y figure : les voisines d'autres
  // disciplines exigent un profil de demande que V0 ne sait pas fournir (hypothèse prudente du moteur sinon).
  const otherDiscipline = (week?.entries ?? []).some((e) => e.sport !== 'strength');
  return strengthContextAt(state, p, entry.date, content, others, !otherDiscipline);
}

/**
 * Contexte Strength à une date : historique réalisé, tracks, E1 sur 7 jours (fonctions du moteur). Les autres séances
 * Strength de la semaine et le caractère « connu » de la semaine sont fournis par l'appelant (V0 ou planificateur
 * global, qui y ajoute les voisines d'autres disciplines avec leur profil de demande dérivé).
 */
export function strengthContextAt(state: AppState, p: Profile, date: string, content: ContentSource, others: StrengthContextInput['week']['otherStrengthSessions'] = [], known = true): StrengthContextInput {
  const now = sessionInstant(date);
  const exposures = state.strength.exposures.filter((x) => x.at < now);
  const recentDone = exposures.filter((x) => daysBetween(dateOf(x.at), date) < D7);
  return {
    goal: { primary: { goal: p.strength.goal } },
    // Périodisation non gouvernée : phase fixe, aucune rampe de volume ni décharge planifiée.
    phase: { kind: 'accumulation', weekInMesocycle: 1, mesocycleLength: 1 },
    capacities: [],
    tracks: state.strength.tracks.filter((t) => t.status !== 'closed'),
    recentExposures: exposures,
    hardSets: { d7: hardSetsByGroup(recentDone.map((x) => ({ exerciseId: x.exerciseId, workingSets: x.sets.length })), content) },
    week: { otherStrengthSessions: others, neighbors: [], known },
    preferences: { liked: [], disliked: [] },
  };
}

/**
 * Capacités DEMANDÉES par l'application (décisions produit du 2026-09-28) : progression par pas minimal (D1),
 * sortie longue (D3), premières séances après TEST (D2), cibles d'allure gouvernées (V18 ± V03). Elles ne
 * s'activent qu'en simulation (valeurs candidates tracées), jamais en production.
 */
export const RUNNING_CAPABILITY_REQUESTS: readonly CapabilityId[] = ['progressionBeyondHistory', 'longRunProgression', 'firstThresholdExposure', 'firstSevereExposure', 'paceTargets'];

export function runningContext(state: AppState, p: Profile, entry: Pick<PlanEntry, 'date'>): RunningContextInput {
  const now = sessionInstant(entry.date);
  const realized = state.running.realized.filter((s) => s.completedAt <= now);
  const returning = p.running.returnState !== 'NONE';
  const returnAt = p.running.returnStartedAt !== undefined ? sessionInstant(p.running.returnStartedAt) : undefined;
  const byArch = new Map<string, { lastAt: string; count: number }>();
  for (const s of realized.filter((x) => x.completion === 'COMPLETED')) {
    const cur = byArch.get(s.archetype);
    byArch.set(s.archetype, { lastAt: cur && cur.lastAt > s.completedAt ? cur.lastAt : s.completedAt, count: (cur?.count ?? 0) + 1 });
  }
  return {
    // P-HYBRID : la course partage la charge avec un autre sport déclaré (définition RUNNING-V1-DOMAIN-SPEC §P-HYBRID).
    population: { level: p.running.population, hybrid: p.strength.enabled || p.crosstraining.enabled || p.hyrox.enabled },
    goal: { type: p.running.goal },
    returnState: { state: p.running.returnState, postReturnSessions: returning && returnAt ? realized.filter((s) => s.completedAt >= returnAt).length : 0 },
    references: state.running.references.filter((r) => r.date <= now),
    exposures: [...byArch].map(([archetype, v]) => ({ archetype: archetype as 'EASY', lastAt: v.lastAt, count: v.count })),
    ...(returning && returnAt ? { recentLoad: { returnStartedAt: returnAt, dimensions: [] } } : {}),
    sessionHistory: realized,
    sensors: { wearable: p.running.wearable, heartRate: false },
    terrain: { hills: p.running.hills },
    mode: 'CANDIDATE',
    capabilityRequests: [...RUNNING_CAPABILITY_REQUESTS],
  };
}

/** Moteur Course : gouvernance candidate + décisions produit (surcouche identifiable), mode simulation. */
export const simulatedRunning = createRunningEngine({ governance: withProductDecisions(CURRENT_RUNNING_GOVERNANCE), simulation: true });

export interface GenerateInput {
  readonly state: AppState;
  readonly entry: PlanEntry;
  readonly generatedAt: ISODateTime;
}

/** Génère (ou refuse, raisons à l'appui) la séance d'une entrée du planning. Déterministe. */
export function generateSession({ state, entry, generatedAt }: GenerateInput): GeneratedSession {
  const p = state.profile;
  if (!p) throw new TypeError('profil absent');
  const strength = entry.sport === 'strength';
  const content = strength ? strengthContent() : runningContent();
  const authority: Authority = strength ? 'provisional' : 'simulation';
  const base = { storage: 'legacy_v0' as const, key: entry.key, date: entry.date, sport: entry.sport, archetypeId: entry.archetypeId, authority, generatedAt, basedOnRevision: state.revision, contentOrigin: content.origin, rulesetVersion: content.ruleset.version };
  const unavailable = (reasons: Reason[]): GeneratedSession => ({ ...base, outcome: { status: 'unavailable', reasons } });

  // Douleur signalée : aucune règle G1 validée ⇒ suspension de TOUTES les séances (fail-closed) jusqu'à levée explicite.
  const pause = activePainPause(state);
  if (pause) return unavailable([pause]);

  const A = entry.availableMinutes * S_PER_MIN;
  const seed = `kairo:${entry.key}:r${String(state.revision)}`;
  let engine: SportEngine<unknown>;
  let archetype: { stimulus: string; objective: string; phase: string; tolerance: string };
  let disciplineContext: unknown;
  let history: FingerprintHistoryEntry[];
  let repetitionIntents: { kind: 'progression_anchor'; trackId: string }[] = [];
  if (strength) {
    const params = readStrengthParams(content.ruleset).values;
    const a = findArchetype(params, entry.archetypeId);
    if (!a) return unavailable([{ code: 'KAIRO.ARCHETYPE_MISSING', params: { archetypeId: entry.archetypeId } }]);
    const stimulus = STIMULUS_BY_GOAL[p.strength.goal];
    engine = StrengthEngine as SportEngine<unknown>;
    archetype = { stimulus, objective: `objective.${stimulus}`, phase: 'phase.accumulation', tolerance: a.toleranceProfile };
    disciplineContext = strengthContext(state, p, entry, content);
    history = before(state.fingerprints.strength, entry.date);
    repetitionIntents = anchorsToDeclare(state, entry.archetypeId).map((t) => ({ kind: 'progression_anchor' as const, trackId: t.trackId }));
  } else {
    engine = simulatedRunning as SportEngine<unknown>;
    archetype = { stimulus: 'stim.running.aerobic', objective: 'objective.running.base', phase: 'phase.running.base', tolerance: 'fixed_time' };
    disciplineContext = runningContext(state, p, entry);
    history = before(state.fingerprints.running, entry.date);
  }
  const target = targetFromAvailable(A, readToleranceProfile(content.ruleset, archetype.tolerance));
  const o = runSportSession(engine, {
    intent: {
      id: `kairo.${entry.key}`, discipline: entry.sport, archetypeId: entry.archetypeId, stimulus: archetype.stimulus, objective: archetype.objective,
      priority: 'standard', phase: archetype.phase, availableTimeS: A, targetDurationS: target, repetitionIntents, plannerNotes: [],
    },
    profile: coreProfile(p), state: FRESH_STATE, history, disciplineContext,
  }, ctx(content, entry.date, seed));
  if (o.result.status === 'ok') {
    const session = o.result.value;
    const est = o.trace.entries.filter((t) => t.subject.id === session.id).flatMap((t) => t.reasons).filter((r) => r.code === 'DURATION.ESTIMATED').at(-1)?.params;
    const estimate = est && typeof est.p50S === 'number' && typeof est.p90S === 'number' ? { p50S: est.p50S, p90S: est.p90S } : undefined;
    return { ...base, outcome: { status: 'ok', session, ...(o.fingerprint ? { fingerprint: o.fingerprint } : {}), ...(estimate ? { estimate } : {}) } };
  }
  const reasons = o.result.status === 'error' ? o.result.error.reasons : [];
  return unavailable(reasons.length > 0 ? reasons.map((r) => ({ code: r.code, params: { ...r.params } })) : [{ code: `KAIRO.ENGINE_${o.result.status.toUpperCase()}`, params: {} }]);
}

/** Une séance générée doit-elle être régénérée (historique modifié, jamais commencée, jour pas encore passé) ? */
export function isStale(g: GeneratedSession | undefined, state: AppState, today: string): boolean {
  if (!g) return true;
  if (state.logs[g.key]) return false;
  if (g.date < today) return false;
  return g.basedOnRevision !== state.revision;
}

