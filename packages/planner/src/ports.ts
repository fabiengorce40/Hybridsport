/**
 * Ports de discipline : le SEUL chemin par lequel le planificateur obtient une séance. Un port appelle le moteur réel
 * de sa discipline par le pipeline du CORE (strict pour Cross-training et HYROX : aucune substitution publiée), puis
 * expose ce que le CORE dérive de la séance GÉNÉRÉE : structures sollicitées, profil de demande standard, record
 * persistable. Le planificateur ne transmet que le créneau, l'intention DÉCLARÉE par le programme et le contexte
 * voisin ; le contexte sportif (historique, références, déclarations) est fourni par l'appelant.
 */
import {
  ENGINE_VERSION, DEMAND_NORMALIZATION_PARAMETER, deriveExerciseStructures, deriveSessionDemand, estimateDuration, isDerivationTable, readDurationParams,
  readToleranceProfile, runSportSession, targetFromAvailable, toRecordedDurationEstimate, assessment, genericCriteria,
} from '@hybridsport/engine';
import type { CoreProfile, CorePipelineOutcome, CoreState, EngineContext, LoadedCatalog, LoadedRuleset, SportEngine, SportSessionRequest } from '@hybridsport/engine';
import type { Discipline, FingerprintHistoryEntry, ReasonCode, RepetitionIntent, SessionDraft, SessionFingerprint, SessionRecord } from '@hybridsport/domain';
import { ctPrescriptionOf, runCrossTrainingC2, stimulusFromArchetypeId } from '@hybridsport/crosstraining';
import type { CrossTrainingContextInput, CrossTrainingEngine } from '@hybridsport/crosstraining';
import { h2ExposureOf, runHyroxH1 } from '@hybridsport/hyrox';
import type { HyroxContextInput, HyroxEngine } from '@hybridsport/hyrox';
import { ARCHETYPE_INTENT_IDS, archetypeFromIntentId, composeRunningWeek, isV1Archetype, parseRunningContext, resolveParameter } from '@hybridsport/running';
import type { RunningContextInput, RunningParameter } from '@hybridsport/running';
import { composeStrengthWeek, declarableAnchors, plannedWeekExposures, readStrengthParams, sessionPlannedHardSets, strengthReasons, strengthWeekPrescription, weekPrescriptionSummary } from '@hybridsport/strength';
import type { StrengthCompositionRule, StrengthContextInput } from '@hybridsport/strength';
import { GP_CODES, gpReasons } from './codes.js';
import { assessC3Quality } from '@hybridsport/crosstraining';
import type { CtGovernance } from '@hybridsport/crosstraining';
import { assessH2Quality, roleFromArchetype } from '@hybridsport/hyrox';
import { basisOfParameter, governedCriterion } from '@hybridsport/engine';
import type { QualityAssessment, QualityBasis, QualityCriterion, QualityEnvironment } from '@hybridsport/engine';
import type { DeclaredIntent, DemandOutcome, NeighbourContext, PlannerClock, PlannerMode, PlannerSport } from './model.js';
import type { NoValidProposalInput } from '@hybridsport/domain';

export type { CrossTrainingContextInput, CrossTrainingEngine, CtGovernance, HyroxContextInput, HyroxEngine, RunningContextInput, StrengthContextInput };

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
  /**
   * Séances de la MÊME discipline déjà placées plus tôt dans la semaine (génération séquentielle, ordre des dates) :
   * expositions PRÉVUES, jamais réalisées. Consommées par les moteurs qui le déclarent (`consumesWeekSessions`).
   */
  readonly weekSessions?: readonly WeekSession[];
  /** Nombre de séances de ce sport déclarées pour la semaine (intention du programme), pour la trace du moteur. */
  readonly sportSessions?: number;
  /** S4 — ordre de priorité DÉCLARÉ des sports du programme (transporté, jamais interprété par le planificateur). */
  readonly sportPriority?: readonly PlannerSport[];
}

/** Séance de la même discipline placée plus tôt dans la semaine (exposition PRÉVUE). */
export interface WeekSession {
  readonly requestId: string;
  readonly date: string;
  readonly archetypeId: string;
  readonly session: SessionDraft;
  readonly fingerprint?: SessionFingerprint;
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
   * l'archétype de complément de la règle du moteur (ou, selon la fréquence déclarée, celui que la règle du moteur
   * attribue en premier). La séance définitive est régénérée après composition.
   */
  readonly placementArchetypeId: string | ((weeklySessions: number) => string | undefined);
  compose(input: { readonly days: readonly CompositionDay[]; readonly base: CompositionBase; readonly hybrid: boolean; readonly mode: PlannerMode; readonly weeklySessions: number }): CompositionResult;
}

export interface SportPort {
  readonly sport: PlannerSport;
  /** Composition hebdomadaire PROPRE AU MOTEUR (archétype de chaque jour), si le moteur la possède. */
  readonly composition?: SportComposition;
  readonly discipline: Discipline;
  /** Le moteur consomme-t-il un contexte voisin (seconde passe) ? */
  readonly consumesNeighbours: boolean;
  /** Le moteur consomme-t-il les séances de sa discipline placées plus tôt dans la semaine (`SlotRequest.weekSessions`) ? */
  readonly consumesWeekSessions?: boolean;
  /**
   * C3.5 — portée des séances de la semaine transmises : `before` (défaut, ordre des dates : expositions antérieures,
   * Strength) ou `generated` (toutes les séances de la discipline DÉJÀ générées, quelle que soit leur date : variété
   * Cross-training, indépendante de l'ordre de génération du planificateur).
   */
  readonly weekSessionsScope?: 'before' | 'generated';
  generate(slot: SlotRequest): PortOutcome;
  /** Structures sollicitées (dérivées du catalogue par la table GOUVERNÉE du ruleset de la discipline). */
  structures(session: SessionDraft): StructuresResult;
  /** Profil de demande standard (CORE, normalisation gouvernée) ; en PRODUCTION, normalisation approuvée exigée. */
  demand(session: SessionDraft, mode: PlannerMode): DemandOutcome;
  /** Q1 — diagnostic de qualité de la prescription générée (lecture seule ; aucune modification de séance). */
  readonly quality?: QualityOf;
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
  /** Entrées d'historique propres au créneau (ex. séances PRÉVUES plus tôt dans la semaine, statut `planned`). */
  readonly extraHistory?: (slot: SlotRequest) => readonly FingerprintHistoryEntry[];
  /** Graine effective (par défaut celle du créneau) : un moteur peut exiger une graine STABLE d'une semaine à l'autre. */
  readonly seedOf?: (slot: SlotRequest) => string;
  /** Intentions de répétition déclarées pour le créneau (ex. ancres de progression du moteur Strength). */
  readonly repetitionIntents?: (slot: SlotRequest, context: unknown) => RepetitionIntent[];
  /** Raisons de décision du moteur à PERSISTER avec la séance (proposition retenue), filtrées par code. */
  readonly persistedDecisions?: RegExp;
  /** Raisons propres au port à joindre à la séance (ex. prescription hebdomadaire du moteur). */
  readonly extraReasons?: (slot: SlotRequest, context: unknown) => readonly ReasonCode[];
  /**
   * Q1 — environnement DÉCLARÉ des valeurs non approuvées pour le diagnostic de qualité (TEST_ONLY, SIMULATION_ONLY) ;
   * absent ⇒ base lue dans les seuls champs des paramètres (PROVISIONAL / EXPERT).
   */
  readonly qualityEnv?: QualityEnvironment;
  /** Q1 — diagnostic propre à la discipline (défaut : critères génériques du CORE). */
  readonly quality?: QualityOf;
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

function outcomeOf(o: CorePipelineOutcome, content: Content, seed: string, persisted?: RegExp, extra: readonly ReasonCode[] = []): PortOutcome {
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
  // Décisions du moteur pour la proposition RETENUE (trace du CORE), persistées pour l'audit si le port le demande.
  const decisions = persisted ? o.trace.entries.filter((e) => e.step === 'proposal' && e.subject.id === session.id).flatMap((e) => e.reasons).filter((r) => persisted.test(r.code)) : [];
  return { status: 'planned', session, ...(o.fingerprint ? { fingerprint: o.fingerprint } : {}), record, reasons: [...o.result.warnings, ...extra, ...decisions] };
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
      const disciplineContext = def.context(slot);
      const seed = def.seedOf?.(slot) ?? slot.seed;
      const request: SportSessionRequest = {
        intent: {
          id: `plan.${slot.requestId}`, discipline: def.discipline, archetypeId: i.archetypeId, stimulus: i.stimulus, objective: i.objective, priority: 'standard', phase: i.phase,
          availableTimeS, targetDurationS: targetFromAvailable(availableTimeS, readToleranceProfile(def.content.ruleset, i.toleranceProfile)), repetitionIntents: def.repetitionIntents?.(slot, disciplineContext) ?? [], plannerNotes: [...(def.plannerNotes ?? [])],
        },
        profile: def.profile, state: def.state,
        history: [...def.history, ...(def.extraHistory?.(slot) ?? [])].filter((h) => h.at < now),
        disciplineContext,
      };
      const ctx: EngineContext<LoadedRuleset, LoadedCatalog> = { now, timezone: def.clock.timezone, seed, engineVersion: ENGINE_VERSION, ruleset: def.content.ruleset, catalog: def.content.catalog };
      return outcomeOf(run(def.engine, request, ctx), def.content, seed, def.persistedDecisions, def.extraReasons?.(slot, disciplineContext) ?? []);
    },
    structures: (session) => structuresOf(session, def.content, def.sport),
    demand: (session, mode) => demandOf(session, def.content, def.sport, mode),
    quality: def.quality ?? (({ session, record }) => assessment(genericCriteria(session, record.durationEstimate))),
  };
}

type Base<C> = Omit<EnginePortDefinition<C>, 'sport' | 'discipline' | 'context' | 'run' | 'engine' | 'consumesNeighbours' | 'plannerNotes' | 'extraHistory' | 'seedOf' | 'repetitionIntents' | 'persistedDecisions' | 'extraReasons'>;

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
 *   voisines sont connues (sinon hypothèse prudente du moteur, inchangée) ; séances Strength placées plus tôt dans la
 *   semaine transmises comme expositions PRÉVUES (`week.otherStrengthSessions`, `done: false` ; empreintes de statut
 *   `planned` dans l'historique) ; composition hebdomadaire : celle du MOTEUR Strength (`composeStrengthWeek`) ;
 * - Running, Cross-training, HYROX : `population.hybrid` transmis tel quel ; HYROX : station du programme.
 */
/**
 * Décisions Strength persistées avec la séance (audit longitudinal) : choix d'exercices et continuité, progression,
 * provenance de charge, interférence, priorité. S4 : rien de RECALCULABLE depuis la séance elle-même n'est recopié
 * (`DOSE.VOLUME_ALLOCATED` = séries de l'item, `PROGRESSION.ANCHOR_APPLIED` = `refs.anchor` / `refs.progressionTrackId`).
 */
const STRENGTH_PERSISTED_DECISIONS = /^(SELECT\.(EXERCISE\.CHOSEN|CHOICE_GROUP|CONTINUITY|CONTINUITY_KEPT|SLOT_OMITTED|SUBSTITUTION|PATTERN_FALLBACK|STIMULUS_PRESERVED)|PROGRESSION\.(?!ANCHOR_APPLIED$)|DOSE\.LOAD\.|PLAN\.(STRUCTURE_LOWERED|INTERFERENCE_ASSESSED|VOLUME_IMBALANCE_WEEK|ANCHOR|SPORT_PRIORITY))/;

export function strengthPort(def: Base<unknown> & { readonly engine: SportEngine<unknown>; readonly baseContext: Ctx<StrengthContextInput>; readonly composition?: { readonly rule: StrengthCompositionRule | undefined; readonly goal: StrengthContextInput['goal']['primary'] } }): SportPort {
  const params = () => readStrengthParams(def.content.ruleset).values;
  const context = (slot: SlotRequest): StrengthContextInput => {
    const resolved = resolve(def.baseContext, slot);
    // S4 — priorité déclarée des sports, au vocabulaire du contrat Strength (sports sans discipline Strength ignorés).
    const order = (slot.sportPriority ?? []).filter((x): x is 'strength' | 'running' | 'crosstraining' => x === 'strength' || x === 'running' || x === 'crosstraining');
    const base: StrengthContextInput = order.length > 0 ? { ...resolved, sportPriority: { order } } : resolved;
    const earlier = slot.weekSessions ?? [];
    const withWeek: StrengthContextInput = earlier.length === 0 ? base : {
      ...base,
      week: {
        ...base.week,
        otherStrengthSessions: [...base.week.otherStrengthSessions, ...earlier.map((w) => ({ intentId: `plan.${w.requestId}`, archetypeId: w.archetypeId, plannedHardSets: sessionPlannedHardSets(w.session, params(), def.content.catalog), done: false }))],
      },
    };
    if (!slot.hybrid) return withWeek;
    const n = slot.neighbours;
    return {
      ...withWeek,
      week: {
        ...withWeek.week,
        neighbors: [...withWeek.week.neighbors, ...(n?.neighbours ?? []).map((x) => ({ discipline: x.discipline as StrengthContextInput['week']['neighbors'][number]['discipline'], stimulus: x.stimulus, priority: x.importance === 'key' ? 'key' as const : 'standard' as const, hoursFromThisSession: x.hoursFromThisSession, demand: { ...x.demand } }))],
        known: withWeek.week.known && n?.known === true,
      },
    };
  };
  // S3 — expositions RÉALISÉES + séances PRÉVUES plus tôt dans la semaine (même date d'instant que l'historique prévu) :
  // l'alternance entre ancres d'un même groupe se lit sur l'usage le plus ancien, réalisé ou prévu.
  const plannedExposures = (slot: SlotRequest) => plannedWeekExposures((slot.weekSessions ?? []).map((w) => ({ at: def.clock.instantOf(w.date), session: w.session })));
  const anchorsOf = (slot: SlotRequest, c: StrengthContextInput) => declarableAnchors(c.tracks, [...c.recentExposures, ...plannedExposures(slot)], slot.intent.archetypeId, params());
  const port = createEnginePort({
    ...def, sport: 'strength', discipline: 'strength', consumesNeighbours: true, context, quality: strengthQuality(def.content.ruleset, def.qualityEnv),
    // S3 — graine STABLE d'une semaine à l'autre (archétype, stimulus, rang de l'occurrence de cet archétype dans la
    // semaine) : un départage par la graine ne peut plus changer un exercice d'une semaine à la suivante.
    seedOf: (slot) => `strength:${slot.intent.archetypeId}:${slot.intent.stimulus}:${(slot.weekSessions ?? []).filter((w) => w.archetypeId === slot.intent.archetypeId).length + 1}`,
    // S3 — ancres DÉCLARÉES (contrat CORE-EXT-4) : tracks d'ancre actives de l'archétype, une par groupe de choix.
    repetitionIntents: (slot, c) => anchorsOf(slot, c as StrengthContextInput).map((t) => ({ kind: 'progression_anchor' as const, trackId: t.trackId })),
    persistedDecisions: STRENGTH_PERSISTED_DECISIONS,
    extraReasons: (slot, c) => {
      const ctx = c as StrengthContextInput;
      const p = strengthWeekPrescription({
        params: params(), paramStatus: (id) => def.content.ruleset.parameter(id)?.status ?? 'missing', goal: ctx.goal.primary, level: def.profile.athleteLevel,
        archetypeId: slot.intent.archetypeId, occurrence: (slot.weekSessions ?? []).length + 1, weeklySessions: slot.sportSessions ?? (slot.weekSessions ?? []).length + 1,
        context: { tracks: ctx.tracks, recentExposures: [...ctx.recentExposures, ...plannedExposures(slot)], hardSets: ctx.hardSets, week: ctx.week },
      });
      const sum = weekPrescriptionSummary(p);
      const status = (id: string) => p.provenance.find((x) => x.parameterId === id)?.status ?? 'missing';
      return [strengthReasons.emit('PLAN.WEEK_PRESCRIPTION', {
        archetype: p.archetypeId, occurrence: p.occurrence, weeklySessions: p.weeklySessions, plannedBefore: (slot.weekSessions ?? []).length,
        belowFloor: sum.belowFloor, atOrAboveHigh: sum.atOrAboveHigh, noTarget: sum.noTarget, anchors: p.anchors.map((a) => a.exerciseId),
        volumeRule: status('strength.volume'), progressionRule: status('strength.progression'), phase: 'placeholder', blocked: [...p.blocked],
      })];
    },
    extraHistory: (slot) => (slot.weekSessions ?? []).flatMap((w) => (w.fingerprint ? [{ fingerprint: w.fingerprint, at: def.clock.instantOf(w.date), status: 'planned' as const, repetitionIntents: [] }] : [])),
  });
  const comp = def.composition;
  const withWeek = { ...port, consumesWeekSessions: true };
  if (!comp) return withWeek;
  // Objectif du PROGRAMME (contrat de contexte Strength `goal.primary`), niveau du profil CORE, fréquence déclarée.
  const run = (days: readonly CompositionDay[], weeklySessions: number, mode: PlannerMode) => {
    return composeStrengthWeek({
      params: params(), rule: comp.rule, mode, goal: comp.goal, level: def.profile.athleteLevel, weeklySessions,
      days: days.map((d) => ({ date: d.date, availableS: d.availableMinutes * S_PER_MIN, ...(d.locked ? { lockedArchetypeId: d.locked.archetypeId } : {}) })),
    });
  };
  return {
    ...withWeek,
    composition: {
      // Réservation des jours : archétype que la règle du moteur attribue en premier pour la fréquence déclarée.
      placementArchetypeId: (weeklySessions) => { const r = run([], weeklySessions, 'CANDIDATE'); return r.status === 'composed' ? r.rotation[0] : undefined; },
      compose({ days, base, mode, weeklySessions }) {
        const r = run(days, weeklySessions, mode);
        if (r.status === 'unresolved') return { status: 'unresolved', reasons: [gpReasons.emit(GP_CODES.COMPOSITION_UNRESOLVED, { sport: 'strength', mode }), ...r.reasons] };
        const byDate = new Map(days.map((d) => [d.date, d]));
        return {
          status: 'composed', authority: r.authority, reasons: r.reasons,
          days: r.slots.map((sl) => ({ date: sl.date, role: sl.role, intent: sl.role === 'LOCKED' ? (byDate.get(sl.date)?.locked ?? { ...base, archetypeId: sl.archetypeId }) : { ...base, archetypeId: sl.archetypeId, toleranceProfile: sl.toleranceProfile } })),
        };
      },
    },
  };
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
  const port = createEnginePort({ ...def, sport: 'running', discipline: 'running', plannerNotes: [PLANNER_PROVENANCE_NOTE], context, quality: runningQuality(def.qualityEnv) });
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

/**
 * C3.5 — décisions de composition Cross-training PERSISTÉES avec la séance (audit, preuve de la boucle moteur → terrain
 * → moteur) : intention, structure, historique vu, voisines, formats écartés / choisi, mouvements et raisons, dose,
 * durée, densité, provenance des valeurs candidates. Les listes de candidats écartés restent dans la trace du CORE.
 */
const CT_PERSISTED_DECISIONS = /^(PLAN\.CROSSTRAINING\.C3_(INTENT|STRUCTURE|BLOCK_NOT_GENERATED|HISTORY|NEIGHBOURS|FORMAT_REJECTED|FORMAT_CHOSEN|MOVEMENT_SELECTED|DURATION|DENSITY|REPEAT_UNAVOIDABLE|PROPOSED)|SAFETY\.CROSSTRAINING\.C3_HISTORY_NEGATIVE|DOSE\.CROSSTRAINING\.C3_DOSE|DATA\.CROSSTRAINING\.CANDIDATE_VALUE_USED)$/;

/** Sport du planificateur → discipline du contrat de contexte (HYROX = `hybrid_race`). */
const DISCIPLINE_OF: Readonly<Record<PlannerSport, 'strength' | 'running' | 'crosstraining' | 'hybrid_race'>> = { strength: 'strength', running: 'running', crosstraining: 'crosstraining', hyrox: 'hybrid_race' };

/**
 * Cross-training. `transportNeighbours` (C3) : voisines (seconde passe) et ordre de priorité DÉCLARÉ transportés dans le
 * contexte, sans interprétation ; absent ⇒ comportement C2 inchangé (aucune seconde passe).
 */
export function crossTrainingPort(def: Base<unknown> & { readonly engine: CrossTrainingEngine; readonly baseContext: Ctx<CrossTrainingContextInput>; readonly transportNeighbours?: boolean; readonly qualityGovernance?: CtGovernance }): SportPort {
  const transport = def.transportNeighbours === true;
  // C3.5 — séances CT PRÉVUES plus tôt dans la semaine (prescription lue dans la séance, stimulus de l'archétype).
  const plannedOf = (slot: SlotRequest) => (slot.weekSessions ?? []).flatMap((w) => {
    const prescription = ctPrescriptionOf(w.session);
    const stimulus = stimulusFromArchetypeId(w.archetypeId);
    return prescription && stimulus ? [{ sessionId: w.requestId, plannedAt: def.clock.instantOf(w.date), stimulus, prescription }] : [];
  });
  const port = createEnginePort<unknown>({
    ...def, engine: def.engine as SportEngine<unknown>, sport: 'crosstraining', discipline: 'crosstraining', consumesNeighbours: transport,
    quality: crossTrainingQuality(def.content.catalog, def.qualityGovernance, def.qualityEnv),
    context: (slot) => {
      const b = resolve(def.baseContext, slot);
      const n = slot.neighbours;
      const order = (slot.sportPriority ?? []).map((x) => DISCIPLINE_OF[x]);
      return {
        ...b, population: { ...b.population, hybrid: slot.hybrid },
        ...(transport && n ? { neighbours: { known: n.known, items: n.neighbours.map((x) => ({ discipline: x.discipline, hoursFromThisSession: x.hoursFromThisSession, demand: { ...x.demand } })) } } : {}),
        ...(transport && order.length > 0 ? { sportPriority: { order } } : {}),
        ...(transport && plannedOf(slot).length > 0 ? { plannedSessions: plannedOf(slot) } : {}),
      };
    },
    run: (_e, r, c) => runCrossTrainingC2(def.engine, r, c),
    ...(transport ? { persistedDecisions: CT_PERSISTED_DECISIONS } : {}),
    // Empreintes des séances prévues de la semaine : anti-doublon du CORE (statut `planned`), comme Strength.
    ...(transport ? { extraHistory: (slot: SlotRequest) => (slot.weekSessions ?? []).flatMap((w) => (w.fingerprint ? [{ fingerprint: w.fingerprint, at: def.clock.instantOf(w.date), status: 'planned' as const, repetitionIntents: [] }] : [])) } : {}),
  });
  return transport ? { ...port, consumesWeekSessions: true, weekSessionsScope: 'generated' } : port;
}

/**
 * H2 — décisions de composition HYROX PERSISTÉES avec la séance : intention, objectif transporté, structure de séance,
 * historique vu, voisines, structures écartées / choisie, stations et raisons, course (contexte, allure BLOCKED), dose,
 * transitions (durée inconnue), durée, accumulation, provenance des valeurs candidates.
 */
const HR_PERSISTED_DECISIONS = /^(PLAN\.HYROX\.H2_(INTENT|GOAL_TRANSPORTED|SESSION_STRUCTURE|BLOCK_NOT_GENERATED|HISTORY|NEIGHBOURS|STRUCTURE_REJECTED|STRUCTURE_CHOSEN|STATION_SELECTED|RUN_COMPONENT|TRANSITIONS|DURATION|ACCUMULATION|REPEAT_UNAVOIDABLE|PROPOSED)|SAFETY\.HYROX\.H2_HISTORY_NEGATIVE|DOSE\.HYROX\.H2_DOSE|DATA\.HYROX\.CANDIDATE_VALUE_USED)$/;

/**
 * HYROX. H1 : station du programme transmise telle quelle. H2 (`transportNeighbours`) : voisines (seconde passe),
 * priorité DÉCLARÉE et séances HYROX déjà générées de la semaine transportées SANS interprétation ; le port ne lit
 * aucune station (l'exposition est relue par HYROX dans la séance générée).
 */
export function hyroxPort(def: Base<unknown> & { readonly engine: HyroxEngine; readonly baseContext: Ctx<Omit<HyroxContextInput, 'requestedStation'>>; readonly transportNeighbours?: boolean }): SportPort {
  const transport = def.transportNeighbours === true;
  const plannedOf = (slot: SlotRequest) => (slot.weekSessions ?? []).flatMap((w) => {
    const x = h2ExposureOf(w.session, w.archetypeId, w.requestId, def.clock.instantOf(w.date));
    return x ? [x] : [];
  });
  const port = createEnginePort<unknown>({
    ...def, engine: def.engine as SportEngine<unknown>, sport: 'hyrox', discipline: 'hybrid_race', consumesNeighbours: transport,
    quality: hyroxQuality(def.content, def.qualityEnv),
    context: (slot) => {
      const b = resolve(def.baseContext, slot);
      const n = slot.neighbours;
      const order = (slot.sportPriority ?? []).map((x) => DISCIPLINE_OF[x]);
      return {
        ...b, population: { ...b.population, hybrid: slot.hybrid }, ...(slot.station === undefined ? {} : { requestedStation: slot.station }),
        ...(transport && n ? { neighbours: { known: n.known, items: n.neighbours.map((x) => ({ discipline: x.discipline, hoursFromThisSession: x.hoursFromThisSession, demand: { ...x.demand } })) } } : {}),
        ...(transport && order.length > 0 ? { sportPriority: { order } } : {}),
        ...(transport && plannedOf(slot).length > 0 ? { plannedSessions: plannedOf(slot) } : {}),
      };
    },
    run: (_e, r, c) => runHyroxH1(def.engine, r, c),
    ...(transport ? { persistedDecisions: HR_PERSISTED_DECISIONS } : {}),
    ...(transport ? { extraHistory: (slot: SlotRequest) => (slot.weekSessions ?? []).flatMap((w) => (w.fingerprint ? [{ fingerprint: w.fingerprint, at: def.clock.instantOf(w.date), status: 'planned' as const, repetitionIntents: [] }] : [])) } : {}),
  });
  return transport ? { ...port, consumesWeekSessions: true, weekSessionsScope: 'generated' } : port;
}

// ——— Q1 : diagnostic de qualité au niveau du port

/**
 * Q1 — DIAGNOSTIC DE QUALITÉ au niveau du port (lecture seule de la prescription GÉNÉRÉE par le moteur) :
 *
 *   MOTEUR → PRESCRIPTION → DIAGNOSTIC (ici) → PLANIFICATEUR / M3 → EXÉCUTION
 *
 * - Cross-training et HYROX H2 : critères propres à leur paquet (`assessC3Quality`, `assessH2Quality`).
 * - Strength (S1→S5 gelé) et Running (inchangé) : critères GÉNÉRIQUES du CORE + lecture de leurs propres traces
 *   (prescription hebdomadaire Strength, valeurs candidates Running) ; aucune règle de ces moteurs n'est réécrite.
 * Le diagnostic ne modifie rien : il est calculé sur la séance telle que le moteur l'a produite, identique pour une
 * séance placée ou composée mais non placée, et M3 ne le lit ni ne le change.
 */
export interface QualityInput {
  readonly session: SessionDraft;
  readonly archetypeId: string;
  readonly reasons: readonly ReasonCode[];
  readonly record: SessionRecord;
}
export type QualityOf = (x: QualityInput) => QualityAssessment;

const estimateOf = (r: SessionRecord) => r.durationEstimate;

/** Base des valeurs candidates TRACÉES par un moteur (`*.CANDIDATE_VALUE_USED`) : aucune trace ⇒ inconnue. */
export function traceBasis(reasons: readonly ReasonCode[], env: QualityEnvironment): QualityBasis {
  const candidate = reasons.some((r) => r.code.endsWith('.CANDIDATE_VALUE_USED'));
  return candidate ? env ?? 'PROVISIONAL' : 'UNRESOLVED';
}

const listOf = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

/** Strength (gelé) : critères génériques + prescription hebdomadaire TRACÉE par le moteur (volume, progression). */
export function strengthQuality(ruleset: LoadedRuleset, env: QualityEnvironment): QualityOf {
  return ({ session, reasons, record }) => {
    const w = reasons.find((r) => r.code === 'PLAN.WEEK_PRESCRIPTION')?.params;
    const criteria: QualityCriterion[] = [...genericCriteria(session, estimateOf(record))];
    const b = (id: string) => basisOfParameter(ruleset.parameter(id), env);
    criteria.push(governedCriterion('volume_target', [b('strength.volume')], w ? {
      belowFloor: listOf(w.belowFloor), atOrAboveHigh: listOf(w.atOrAboveHigh), noTarget: listOf(w.noTarget), weeklySessions: Number(w.weeklySessions ?? 0),
    } : { weekPrescription: 'not_traced' }, ['volume_source:strength.volume']));
    criteria.push(governedCriterion('progression_support', [b('strength.progression'), b('strength.tracks')], w ? {
      declaredAnchors: listOf(w.anchors), blocked: listOf(w.blocked),
    } : { weekPrescription: 'not_traced' }, ['progression_source:strength.progression']));
    return assessment(criteria);
  };
}

/** Running (inchangé) : critères génériques + base des valeurs candidates tracées par le moteur. */
export function runningQuality(env: QualityEnvironment): QualityOf {
  return ({ session, reasons, record, archetypeId }) => assessment([
    ...genericCriteria(session, estimateOf(record)),
    governedCriterion('dose_coherence', [traceBasis(reasons, env)], { archetypeId, targetDurationS: session.targetDurationS }, ['dose_source:running_governance']),
  ]);
}

/** Cross-training C3 : critères du paquet (gouvernance déclarée par l'appelant ; absente ⇒ bases inconnues). */
export function crossTrainingQuality(catalog: LoadedCatalog, governance: CtGovernance | undefined, env: QualityEnvironment): QualityOf {
  return ({ session, reasons, record, archetypeId }) => {
    const stimulus = stimulusFromArchetypeId(archetypeId);
    if (!stimulus || !governance) return assessment([...genericCriteria(session, estimateOf(record)), governedCriterion('dose_coherence', ['UNRESOLVED'], { archetypeId }, [governance ? 'stimulus_unknown' : 'governance_not_provided'])]);
    return assessC3Quality(session, stimulus, { catalog, governance, env, estimate: estimateOf(record), reasons });
  };
}

/** HYROX : H2 (rôle) ⇒ critères du paquet ; H1 (station) ⇒ génériques + dose non démontrée. */
export function hyroxQuality(content: { readonly ruleset: LoadedRuleset; readonly catalog: LoadedCatalog }, env: QualityEnvironment): QualityOf {
  return ({ session, reasons, record, archetypeId }) => (roleFromArchetype(archetypeId)
    ? assessH2Quality(session, archetypeId, { catalog: content.catalog, ruleset: content.ruleset, env, estimate: estimateOf(record), reasons })
    : assessment([...genericCriteria(session, estimateOf(record)), governedCriterion('dose_coherence', [traceBasis(reasons, env)], { archetypeId })]));
}
