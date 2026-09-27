/**
 * StrengthEngine (spec strength V1 + addendum V1.1). Moteur DÉTERMINISTE de programmation : il
 * PROPOSE ; le CORE contrôle, ajuste la durée dans ses limites, analyse les doublons, valide, répare,
 * trace et décide. Le moteur ne se déclare jamais valide, ne crée ni ne clôture de track, n'invente
 * aucune intention de répétition et ne modifie jamais l'intention (stimulus, archétype, temps).
 */
import { zSessionDraft } from '@hybridsport/domain';
import type { Exercise, ReasonCode, RepTarget, SessionBlock, SessionDraft, SessionItem, SetIntensity, SetPrescription, SportEngineProposalInput } from '@hybridsport/domain';
import { checkDuration, estimateDuration, readDurationParams, readToleranceProfile, SeededRng } from '@hybridsport/engine';
import type { ProposeResult, SportEngine, SportEngineInput } from '@hybridsport/engine';
import { parseStrengthContext } from './context.js';
import type { StrengthContext, StrengthTrack } from './context.js';
import { readStrengthParams } from './params.js';
import type { LoadedStrengthParams, SlotRole } from './params.js';
import { findArchetype, goalKey as goalKeyOf, resolveSlots } from './archetypes.js';
import type { SlotInstance } from './archetypes.js';
import { buildEnv } from './model.js';
import type { Env } from './model.js';
import { firstFailingFilter, maxEffortEligible, slotCandidatesFor } from './candidates.js';
import type { FilterId } from './candidates.js';
import { decidingCriterion, rankCandidates } from './selection.js';
import type { Ranked, SessionSoFar } from './selection.js';
import { computeDose, doseCell } from './dose.js';
import { decideLoad, loadKnowledge, loadStep, pctFor } from './load.js';
import { buildRampups } from './rampup.js';
import { progressionModelFor } from './models.js';
import { groupsOf, plannedHardSets, remainingShare, volumeFit, weeklyTarget } from './volume.js';
import { loweredStructures } from './interference.js';
import { strengthReasons } from './codes.js';
import { STRENGTH_CHECKS } from './checks.js';
import { validateStrengthIntent } from './intent-contract.js';
import { roundDownToStep } from './util.js';

export const STRENGTH_ENGINE_ID = 'engine.strength';
/** Paramètres du CORE lus par le moteur (dérivation des structures, estimation de durée), déclarés dans chaque proposition. */
const CORE_PARAMETERS_READ = ['demand.derivationTable', 'duration.toleranceProfiles', 'duration.blockTransitionS', 'duration.briefingS', 'duration.defaultTiming', 'duration.transitionTable', 'duration.uncertaintyCorrelation'];
export const STRENGTH_ENGINE_VERSION = '0.1.0' as const;

type Input = SportEngineInput<StrengthContext>;

interface Pick {
  readonly slot: SlotInstance;
  readonly exercise: Exercise;
  readonly ranked: readonly Ranked[];
  readonly track?: StrengthTrack;
  readonly substitutedFrom?: string;
}

interface Built {
  readonly session: SessionDraft;
  readonly picks: readonly Pick[];
  readonly reasons: readonly ReasonCode[];
  readonly p50: number;
  readonly markers: Record<string, number>;
  readonly volumeByItem: Record<string, number>;
  readonly anchorsUsed: readonly string[];
  /** Emplacements résolus pour CETTE séance (requis + optionnels) : base du critère B1. */
  readonly slotIds: readonly string[];
}

class NoProposal extends Error {
  constructor(readonly reasons: readonly ReasonCode[], readonly blockingNeeds: readonly { slotId: string; need: string }[] = [], readonly missingData: readonly ('capacities' | 'week_context' | 'tracks' | 'catalog_coverage')[] = []) { super('no_valid_proposal'); }
}

const workingOf = (sets: readonly SetPrescription[]): number => sets.filter((s) => s.kind !== 'rampup' && s.optional !== true).length;
const repsForLoad = (r: RepTarget): number => (typeof r === 'number' ? r : r.max);

/** Sélectionne l'exercice d'un emplacement (ancre, substitution ponctuelle F1–F3, repli F4 encadré). */
function pickForSlot(slot: SlotInstance, env: Env, soFar: SessionSoFar, usedFamilies: ReadonlySet<string>, technicalCount: number, reasons: ReasonCode[], override?: string): Pick | { blocked: 'context' | 'none' } {
  const tryNeed = (s: SlotInstance): { ranked: Ranked[]; rejected: Partial<Record<FilterId, number>> } => {
    const r = slotCandidatesFor(s, env, { technicalCount });
    const pool = r.candidates.filter((e) => !usedFamilies.has(e.family));
    return { ranked: rankCandidates(pool, s, env, soFar), rejected: r.rejected };
  };
  const main = tryNeed(slot);
  for (const [f, n] of Object.entries(main.rejected).sort()) reasons.push(strengthReasons.emit('SELECT.FILTERED', { slot: slot.def.id, filter: f, count: n }));
  let ranked = main.ranked;
  let usedSlot = slot;
  if (ranked.length === 0) {
    // Repli F4 : jamais sur le principal d'un objectif de force (D-S4) — le CORE et le planificateur décident.
    const allowF4 = !(slot.def.role === 'primary' && env.goal.goal === 'strength');
    for (const need of allowF4 ? env.params['strength.substitution.fallbackNeeds'][slot.def.need] ?? [] : []) {
      const requirement = env.params['strength.needs'][need]?.requirement;
      if (!requirement) continue;
      const alt = tryNeed({ def: { ...slot.def, need }, requirement });
      if (alt.ranked.length > 0) {
        ranked = alt.ranked; usedSlot = { def: { ...slot.def, need }, requirement };
        reasons.push(strengthReasons.emit('SELECT.PATTERN_FALLBACK', { slot: slot.def.id, fallbackNeed: need }));
        break;
      }
    }
  }
  if (ranked.length === 0) {
    const onlyContext = (main.rejected.F9_context ?? 0) > 0;
    return { blocked: onlyContext ? 'context' : 'none' };
  }
  const anchor = env.anchorBySlot.get(slot.def.id);
  const tracked = env.trackedBySlot.get(slot.def.id);
  let chosen = ranked[0] as Ranked;
  let substitutedFrom: string | undefined;
  if (override) chosen = ranked.find((r) => r.exercise.id === override) ?? chosen;
  else if (anchor && chosen.exercise.id !== anchor.exerciseId) {
    // Ancre temporairement impossible : substitution PONCTUELLE par fidélité (classe d'équivalence, famille, emplacement).
    const a = env.catalog.exercise(anchor.exerciseId);
    // technical-constant: rangs ordinaux de fidélité (0 = même classe d'équivalence, 1 = même famille, 2 = même emplacement)
    const tier = (e: Exercise): number => (a && e.equivalenceClass === a.equivalenceClass ? 0 : a && e.family === a.family ? 1 : 2);
    const best = [...ranked].sort((x, y) => tier(x.exercise) - tier(y.exercise))[0];
    if (best) {
      chosen = best; substitutedFrom = anchor.exerciseId;
      const t = tier(best.exercise);
      // technical-constant: rang ordinal « même emplacement » (fidélité basse)
      reasons.push(t < 2
        ? strengthReasons.emit('SELECT.SUBSTITUTION', { from: anchor.exerciseId, to: best.exercise.id, fidelity: t === 0 ? 'high' : 'medium' })
        : strengthReasons.emit('SELECT.SUBSTITUTION_LOW_FIDELITY', { from: anchor.exerciseId, to: best.exercise.id }));
    }
  }
  const ordered = [chosen, ...ranked.filter((r) => r !== chosen)];
  reasons.push(strengthReasons.emit('SELECT.EXERCISE.CHOSEN', { exerciseId: chosen.exercise.id, slot: slot.def.id, decidingCriterion: override ? 'variant' : decidingCriterion(ordered, usedSlot, env) }));
  const track = anchor?.exerciseId === chosen.exercise.id ? anchor : tracked?.exerciseId === chosen.exercise.id ? tracked : undefined;
  return { slot: usedSlot, exercise: chosen.exercise, ranked: ordered, ...(track ? { track } : {}), ...(substitutedFrom ? { substitutedFrom } : {}) };
}

/** Prescription complète d'un exercice choisi (dose, charge, montée, série lourde). */
type PrescriptionSource = 'track' | 'base_profile' | 'calibration' | 'history';

interface Rx {
  readonly prescription: SessionItem['prescription'];
  /** Séries de travail (montées et séries facultatives exclues) : volume E1 et empreinte. */
  readonly working: number;
  readonly hasRampup: boolean;
  readonly workingKg?: number;
  readonly source: PrescriptionSource;
  readonly reps: RepTarget;
}

/** Effort d'une intensité remplacé par un autre RIR (séries de calibration). */
function withRir(i: SetIntensity, rir: number): SetIntensity {
  switch (i.mode) {
    case 'effort': return { ...i, effort: { rir } };
    case 'bodyweight': case 'load': case 'percent_of_reference': return { ...i, effort: { rir } };
    case 'relative_to_working': return i;
  }
}

/** Prescription complète d'un exercice choisi (dose, charge, montée, série lourde). */
function prescribe(pick: Pick, env: Env, timePressure: boolean, allocated: number | undefined, samePatternBefore: number, reasons: ReasonCode[]): Rx {
  const e = pick.exercise;
  const role: SlotRole = pick.slot.def.role;
  const knowledge = loadKnowledge(e, env);
  const model = pick.track?.model ?? progressionModelFor(e, role, env.level, knowledge.lastLoadKg, env.params, loadStep(e, env)?.stepKg);
  const trackKg = pick.track?.nextPrescription?.loadKg;
  const calibration = knowledge.confidence === 'none' && knowledge.lastLoadKg === undefined && trackKg === undefined && e.loadable;
  const dose = computeDose(e, env, { role, timePressure, doubleProgression: model === 'double_progression', calibration, ...(allocated !== undefined ? { allocatedSets: allocated } : {}), ...(pick.track ? { track: pick.track } : {}) });
  reasons.push(...dose.reasons);
  const source: PrescriptionSource = pick.track?.nextPrescription ? 'track' : calibration ? 'calibration' : 'base_profile';
  // Maintien (gainage) et porté : prescriptions en durée / distance (valeurs G2), sans répétitions.
  const nonRep = env.params['strength.dose.nonRep'];
  const pickValue = (r: { min: number; max: number }) => (env.params['strength.dose.modifiers'].repChoice === 'low' ? r.min : r.max);
  if (e.defaultPrescriptionType === 'hold') {
    return { prescription: { type: 'hold', seconds: pickValue(nonRep.holdSeconds), sets: dose.sets, restS: dose.restS }, working: dose.sets, hasRampup: false, source, reps: dose.sets };
  }
  if (e.defaultPrescriptionType === 'distance') {
    return { prescription: { type: 'intervals', reps: dose.sets, work: { distanceM: pickValue(nonRep.carryMeters) }, recoveryS: dose.restS }, working: dose.sets, hasRampup: false, source, reps: dose.sets };
  }
  const compound = e.compound && role !== 'accessory';
  const decision = decideLoad(e, repsForLoad(dose.reps), dose.rir, env, trackKg, compound, pick.track?.e1rmKg);
  reasons.push(...decision.reasons);
  const relativeIntensity = decision.intensity.mode === 'percent_of_reference' ? decision.intensity.fraction : pctFor(repsForLoad(dose.reps), dose.rir, env);
  const ramp = buildRampups(e, env, { role, exerciseClass: dose.exerciseClass, decision, samePatternBefore, workingReps: repsForLoad(dose.reps), ...(relativeIntensity !== undefined ? { relativeIntensity } : {}) });
  if (ramp.length > 0) reasons.push(strengthReasons.emit('DOSE.RAMPUP', { exerciseId: e.id, steps: ramp.length, knowledge: decision.knowledge }));
  const reps: RepTarget = decision.capped && typeof dose.reps === 'number' ? dose.cell.reps.max : dose.reps;
  // Première exposition : les premières séries collectent l'information à un effort plus prudent (G2).
  const working: SetPrescription[] = Array.from({ length: dose.sets }, (_, i) => ({
    kind: 'working', reps, restAfterS: dose.restS,
    intensity: i < dose.calibrationSets ? withRir(decision.intensity, dose.calibrationRir) : decision.intensity,
  }));
  // Série lourde + séries allégées (D-S7) : stimulus et niveau admis, éligibilité G1, charge connue.
  const ts = env.params['strength.topSet'];
  const step = loadStep(e, env);
  if (role === 'primary' && ts.stimuli.includes(env.stimulus) && ts.levels.includes(env.level) && maxEffortEligible(e, env) && decision.workingKg !== undefined && decision.knowledge === 'known' && step && dose.sets > 1) {
    const backKg = Math.max(step.stepKg, roundDownToStep(decision.workingKg * ts.backoffLoadFraction, step.stepKg));
    const backoffs = Math.min(ts.backoffSets, dose.sets - 1);
    working.splice(0, working.length,
      { kind: 'top_set', reps, restAfterS: dose.restS, intensity: decision.intensity },
      ...Array.from({ length: backoffs }, (): SetPrescription => ({ kind: 'backoff', reps, restAfterS: dose.restS, intensity: { mode: 'load', kg: backKg, certainty: 'prescribed', effort: { rir: dose.rir } } })));
    reasons.push(strengthReasons.emit('DOSE.TOP_SET', { exerciseId: e.id, topKg: decision.workingKg, backoffFraction: ts.backoffLoadFraction, backoffUnroundedKg: decision.workingKg * ts.backoffLoadFraction, backoffKg: backKg, backoffSets: backoffs }));
  }
  const sets = [...ramp, ...working];
  return { prescription: { type: 'sets', sets }, working: workingOf(sets), hasRampup: ramp.length > 0, ...(decision.workingKg !== undefined ? { workingKg: decision.workingKg } : {}), source: pick.track?.nextPrescription ? 'track' : decision.source, reps };
}

function mobilityItem(env: Env, itemId: string, seconds: number, primaryPattern: string | undefined): SessionItem | undefined {
  if (seconds <= 0) return undefined;
  const slot: SlotInstance = { def: { id: itemId, blockId: 'mobility', need: 'mobility', role: 'accessory', status: 'optional', count: { min: 1, max: 1 }, anchorable: false, trackable: false }, requirement: { movementTypes: ['mobility'] } };
  const cands = [...env.catalog.exercises()].sort((a, b) => (a.id < b.id ? -1 : 1))
    .filter((e) => firstFailingFilter(e, slot, env, { technicalCount: 0 }) === undefined || firstFailingFilter(e, slot, env, { technicalCount: 0 }) === 'F8_discipline');
  const best = [...cands].sort((a, b) => Number(primaryPattern !== undefined && b.patterns.secondary.includes(primaryPattern)) - Number(primaryPattern !== undefined && a.patterns.secondary.includes(primaryPattern)))[0];
  return best ? { id: itemId, exerciseId: best.id, prescription: { type: 'mobility', seconds, sides: 1 } } : undefined;
}

/** Construit une séance complète dans le budget de durée (spec 05 §15). */
function build(env: Env, input: Input, overrides: ReadonlyMap<string, string>): Built {
  const reasons: ReasonCode[] = [];
  const ctx = input.discipline;
  const params = env.params;
  // Alternance des groupes de choix : date de la DERNIÈRE exposition du besoin (plus ancienne = prioritaire),
  // jamais un nombre d'expositions (qui dépend de la quantité d'historique transmise par le planificateur).
  const recentNeed = (need: string): number => {
    const req = params['strength.needs'][need]?.requirement;
    if (!req) return 0;
    const probe: SlotInstance = { def: { id: need, blockId: '', need, role: 'accessory', status: 'optional', count: { min: 1, max: 1 }, anchorable: false, trackable: false }, requirement: req };
    const last = ctx.recentExposures.filter((x) => { const e = env.catalog.exercise(x.exerciseId); return e !== undefined && firstFailingFilter(e, probe, env, { technicalCount: 0 }) !== 'F2_slot'; }).map((x) => Date.parse(x.at));
    return last.length === 0 ? 0 : Math.max(...last);
  };

  const feasible = (def: SlotInstance['def']): boolean => slotCandidatesFor({ def, requirement: params['strength.needs'][def.need]?.requirement ?? {} }, env, { technicalCount: 0 }).candidates.length > 0;
  const slots = resolveSlots(env.archetype, params, env.goalKey, env.stimulus, recentNeed, (id) => env.anchorBySlot.has(id), feasible);
  const dropped = new Set([...env.lowered.keys()].flatMap((s) => params['strength.interference'].perStructure[s]?.dropOptionalNeeds ?? []));
  // Ancre déclarée dont l'emplacement n'est pas retenu (ex. deux ancres dans un même groupe de choix) :
  // jamais ignorée en silence (le planificateur ne devrait déclarer qu'une ancre par groupe et par séance).
  const resolvedIds = new Set([...slots.required, ...slots.optional].map((s) => s.def.id));
  for (const [slotId, t] of [...env.anchorBySlot].sort(([a], [b]) => (a < b ? -1 : 1))) if (!resolvedIds.has(slotId)) reasons.push(strengthReasons.emit('PROGRESSION.ANCHOR_NOT_APPLICABLE', { trackId: t.trackId, slot: slotId }));

  const picks: Pick[] = [];
  const families = new Set<string>();
  const tech = params['strength.novice.technicalUnderFatigue'];
  const techCount = () => picks.filter((p) => p.exercise.cost.technical >= tech.minTechnical).length;
  const soFar = (): SessionSoFar => ({ chosen: picks.map((p) => ({ exercise: p.exercise, slotId: p.slot.def.id, blockId: p.slot.def.blockId })) });
  const blocking: { slotId: string; need: string }[] = [];
  let contextBlocked = false;
  const add = (slot: SlotInstance, required: boolean): boolean => {
    const r = pickForSlot(slot, env, soFar(), families, techCount(), reasons, overrides.get(slot.def.id));
    if ('blocked' in r) {
      if (required) { blocking.push({ slotId: slot.def.id, need: slot.def.need }); contextBlocked ||= r.blocked === 'context'; }
      else reasons.push(strengthReasons.emit('SELECT.SLOT_OMITTED', { slot: slot.def.id, cause: r.blocked === 'context' ? 'context' : 'no_candidate' }));
      return false;
    }
    picks.push(r); families.add(r.exercise.family);
    return true;
  };
  for (const s of slots.required) for (let k = 0; k < s.def.count.min; k++) add(s, true);
  if (blocking.length > 0) {
    const reason = contextBlocked
      ? strengthReasons.emit('PLAN.CONTEXT_INCOMPATIBLE', { archetype: env.archetype.id, structures: [...env.lowered.keys()].sort() })
      : strengthReasons.emit('SELECT.NO_CANDIDATE_FOR_SLOT', { slot: blocking[0]?.slotId ?? '', need: blocking[0]?.need ?? '' });
    throw new NoProposal([reason, ...reasons], blocking, contextBlocked ? [] : ['catalog_coverage']);
  }

  const mob = params['strength.session.mobility'];
  const primaryPattern = picks[0]?.exercise.patterns.primary;
  // Échauffement / retour au calme : durée haute par défaut, basse sous contrainte de temps (plages G2).
  const mobility = (tp: boolean) => ({
    warmup: mobilityItem(env, 'i.warmup', tp ? mob.warmupS.min : mob.warmupS.max, primaryPattern),
    cooldown: mobilityItem(env, 'i.cooldown', tp ? mob.cooldownS.min : mob.cooldownS.max, primaryPattern),
  });
  const duration = readDurationParams(input.ruleset);
  const profile = readToleranceProfile(input.ruleset, env.archetype.toleranceProfile);

  const assemble = (list: readonly Pick[], timePressure: boolean, trace: ReasonCode[] | undefined): Omit<Built, 'reasons' | 'slotIds'> & { p90: number; upper: number } => {
    const itemsByBlock = new Map<string, SessionItem[]>();
    const markers: Record<string, number> = {};
    const volumeByItem: Record<string, number> = {};
    const anchorsUsed: string[] = [];
    const allocated: Record<string, number> = {};
    const patternRamped = new Map<string, number>();
    const local: ReasonCode[] = [];
    const counters = new Map<string, number>();
    for (const p of list) {
      const groups = groupsOf(p.exercise, env).primary;
      const shares = groups.map((g) => remainingShare(g, env)).filter((x): x is number => x !== undefined);
      const need = shares.length > 0 ? Math.min(...shares) - Math.max(0, ...groups.map((g) => allocated[g] ?? 0)) : undefined;
      const { cell } = doseCell(p.exercise, p.slot.def.role, env);
      const alloc = need === undefined ? undefined : Math.min(cell.sets.max, Math.max(cell.sets.min, Math.floor(need)));
      const before = patternRamped.get(p.exercise.patterns.primary) ?? 0;
      const rx = prescribe(p, env, timePressure, alloc, before, local);
      if (rx.hasRampup) patternRamped.set(p.exercise.patterns.primary, before + 1);
      const w = rx.working;
      for (const g of groups) allocated[g] = (allocated[g] ?? 0) + w;
      if (alloc !== undefined) local.push(strengthReasons.emit('DOSE.VOLUME_ALLOCATED', { exerciseId: p.exercise.id, sets: w, group: groups.join('+') || 'none' }));
      const n = (counters.get(p.slot.def.id) ?? 0) + 1;
      counters.set(p.slot.def.id, n);
      const itemId = `${p.slot.def.id}.${String(n)}`;
      const anchorDeclared = p.track?.tier === 'anchor' && env.anchorBySlot.get(p.slot.def.id)?.trackId === p.track.trackId;
      if (anchorDeclared && p.track) { anchorsUsed.push(p.track.trackId); local.push(strengthReasons.emit('PROGRESSION.ANCHOR_APPLIED', { trackId: p.track.trackId, exerciseId: p.exercise.id })); }
      const candidate = !p.track && !p.substitutedFrom && p.slot.def.anchorable && !env.anchorBySlot.has(p.slot.def.id);
      if (candidate) local.push(strengthReasons.emit('PROGRESSION.ANCHOR_PROPOSED', { slot: p.slot.def.id, exerciseId: p.exercise.id }));
      const refs = {
        slotId: p.slot.def.id,
        ...(p.track ? { progressionTrackId: p.track.trackId } : {}),
        ...(anchorDeclared ? { anchor: 'declared' as const } : candidate ? { anchor: 'candidate' as const } : {}),
        prescriptionSource: p.substitutedFrom ? 'substitution' as const : rx.source,
        ...(p.substitutedFrom ? { substitutedFrom: p.substitutedFrom } : {}),
      };
      // technical-constant: au plus 3 alternatives prévalidées (contrat de schéma zItem)
      const alternatives = p.ranked.slice(1).map((r) => r.exercise.id).slice(0, 3);
      const item: SessionItem = { id: itemId, exerciseId: p.exercise.id, prescription: rx.prescription, refs, ...(alternatives.length > 0 ? { alternatives } : {}) };
      itemsByBlock.set(p.slot.def.blockId, [...(itemsByBlock.get(p.slot.def.blockId) ?? []), item]);
      volumeByItem[itemId] = w;
      if (p.track) {
        markers[`${p.exercise.id}:sets`] = w;
        markers[`${p.exercise.id}:reps`] = typeof rx.reps === 'number' ? rx.reps : rx.reps.min;
        if (rx.workingKg !== undefined) markers[`${p.exercise.id}:load`] = rx.workingKg;
      }
    }
    // Plafond L4 par séance et par groupe (G1) : réduction des séries des rôles les moins prioritaires.
    const cap = env.params['strength.volume.sessionCap'][env.level];
    const plannedItems = () => [...itemsByBlock.values()].flat().map((it) => ({ exercise: env.catalog.exercise(it.exerciseId) as Exercise, workingSets: it.prescription.type === 'sets' ? workingOf(it.prescription.sets) : 0, it }));
    for (let guard = 0; guard < list.length * cell0(list, env); guard++) {
      const planned = plannedHardSets(plannedItems(), env);
      const over = Object.entries(planned).filter(([, v]) => v > cap).sort()[0];
      if (!over) break;
      const victim = [...plannedItems()].reverse().find((x) => x.workingSets > 1 && groupsOf(x.exercise, env).primary.includes(over[0]));
      if (!victim || victim.it.prescription.type !== 'sets') break;
      const sets = [...victim.it.prescription.sets];
      sets.splice(sets.findLastIndex((s) => s.kind !== 'rampup'), 1);
      (victim.it as { prescription: SessionItem['prescription'] }).prescription = { type: 'sets', sets };
      volumeByItem[victim.it.id] = workingOf(sets);
      local.push(strengthReasons.emit('DOSE.SESSION_CAP_APPLIED', { group: over[0], cap }));
    }
    const { warmup, cooldown } = mobility(timePressure);
    const blocks: SessionBlock[] = [];
    if (warmup) blocks.push({ id: 'b.warmup', kind: 'warmup', role: 'support', optional: false, format: 'continuous', items: [warmup], levers: [] });
    for (const b of env.archetype.blocks) {
      const items = itemsByBlock.get(b.id);
      // Un superset n'enchaîne que des séries à répétitions (contrat du CORE) : sinon, séries classiques.
      if (!items || items.length === 0) continue;
      const grouping = b.grouping === 'superset' && items.length > 1 && items.every((it) => it.prescription.type === 'sets') ? 'superset' : 'straight';
      blocks.push({ id: b.id, kind: b.kind, role: b.role, optional: false, format: 'sets', grouping, items, levers: grouping === 'superset' ? b.levers : b.levers.filter((l) => l.kind !== 'superset_accessories' || items.filter((it) => it.prescription.type === 'sets').length > 1) });
    }
    if (cooldown) blocks.push({ id: 'b.cooldown', kind: 'cooldown', role: 'support', optional: false, format: 'continuous', items: [cooldown], levers: [] });
    if (warmup) volumeByItem[warmup.id] = 0;
    if (cooldown) volumeByItem[cooldown.id] = 0;
    const session = zSessionDraft.parse({
      id: `${input.intent.id}.s${String(overrides.size)}`, discipline: 'strength', athleteLevel: env.level,
      availableTimeS: input.intent.availableTimeS, targetDurationS: input.intent.targetDurationS, toleranceProfile: env.archetype.toleranceProfile, blocks,
    });
    const est = estimateDuration(session, env.catalog, duration);
    if (!est.ok) throw new NoProposal(est.reasons);
    const check = checkDuration(est.estimate, session.availableTimeS, session.targetDurationS, profile);
    if (trace) trace.push(...local);
    return { session, picks: list, p50: est.estimate.p50, p90: est.estimate.p90, upper: check.upperS, markers, volumeByItem, anchorsUsed };
  };

  const fits = (b: { p50: number; p90: number; upper: number }) => b.p50 <= b.upper && b.p90 <= input.intent.availableTimeS;
  // 1. Noyau (emplacements requis) ; si trop long, M6 (séries des non-principaux au plancher, repos courts).
  let timePressure = false;
  let core = assemble(picks, false, undefined);
  if (!fits(core)) { timePressure = true; core = assemble(picks, true, undefined); }
  if (!fits(core)) throw new NoProposal([strengthReasons.emit('DURATION.TARGET_BELOW_ARCHETYPE_MIN', { requiredS: Math.round(core.p50), targetS: input.intent.targetDurationS }), ...reasons]);
  // 2. Emplacements optionnels, par ordre de priorité, tant que la cible raisonnable n'est pas dépassée.
  const addTried = (slot: SlotInstance) => {
    if (dropped.has(slot.def.need)) { reasons.push(strengthReasons.emit('SELECT.SLOT_OMITTED', { slot: slot.def.id, cause: 'interference' })); return; }
    const before = picks.length;
    if (!add(slot, false)) return;
    // Haut SOFT du volume hebdomadaire : un ajout OPTIONNEL dont TOUS les groupes primaires dépasseraient le
    // haut n'apporte que du volume superflu ; il est omis (un polyarticulaire utile à un autre groupe reste).
    const added = picks[picks.length - 1] as Pick;
    const vf = volumeFit(added.exercise, added.slot.def.role, picks.slice(0, -1).map((p) => ({ exercise: p.exercise, role: p.slot.def.role })), env);
    if (vf.groups > 0 && vf.over === vf.groups) {
      const removed = picks.splice(before);
      for (const r of removed) families.delete(r.exercise.family);
      reasons.push(strengthReasons.emit('SELECT.SLOT_OMITTED', { slot: slot.def.id, cause: 'volume' }));
      return;
    }
    const trial = assemble(picks, timePressure, undefined);
    if (fits(trial)) { core = trial; return; }
    const removed = picks.splice(before);
    for (const r of removed) families.delete(r.exercise.family);
    reasons.push(strengthReasons.emit('SELECT.SLOT_OMITTED', { slot: slot.def.id, cause: 'duration' }));
  };
  for (const s of slots.optional) addTried(s);
  // 3. Exercices supplémentaires jusqu'à count.max (même ordre), toujours dans le budget.
  for (const s of [...slots.required, ...slots.optional]) {
    const have = picks.filter((p) => p.slot.def.id === s.def.id).length;
    if (have > 0 && have < s.def.count.max) addTried(s);
  }
  const trace: ReasonCode[] = [];
  const final = assemble(picks, timePressure, trace);
  // Volume hebdomadaire : plancher d'un groupe inatteignable cette semaine ⇒ signal au planificateur.
  const planned = plannedHardSets(final.session.blocks.flatMap((b) => b.items).map((it) => ({ exercise: env.catalog.exercise(it.exerciseId) as Exercise, workingSets: it.prescription.type === 'sets' ? workingOf(it.prescription.sets) : 0 })), env);
  if (ctx.week.known && ctx.week.otherStrengthSessions.every((s) => s.done)) {
    for (const g of Object.keys(env.params['strength.volume'].muscleGroups).sort()) {
      const t = weeklyTarget(g, env);
      const total = (ctx.hardSets.d7[g] ?? 0) + (planned[g] ?? 0);
      if (t && total < t.floor && (planned[g] ?? 0) > 0) reasons.push(strengthReasons.emit('PLAN.VOLUME_IMBALANCE_WEEK', { group: g, planned: total, floor: t.floor }));
    }
  }
  return { session: final.session, picks: final.picks, reasons: [...reasons, ...trace], p50: final.p50, markers: final.markers, volumeByItem: final.volumeByItem, anchorsUsed: final.anchorsUsed, slotIds: [...slots.required, ...slots.optional].map((s) => s.def.id) };
}

/** Borne technique du plafond L4 : au plus (séries max du profil) réductions par exercice. */
function cell0(list: readonly Pick[], env: Env): number {
  return Math.max(1, ...list.map((p) => doseCell(p.exercise, p.slot.def.role, env).cell.sets.max));
}

/** Reason codes vers la forme sérialisable du contrat (copie mutable, même contenu). */
function asProposalReasons(rs: readonly ReasonCode[]): SportEngineProposalInput['reasons'] {
  return rs.map((r) => ({ ...r, params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])) as Record<string, string | number | boolean | string[]>, ruleRefs: [...r.ruleRefs] }));
}

/** Vecteur de la couche B, du point de vue du moteur (le CORE y applique ses propres pénalités). */
function optimization(b: Built, env: Env, input: Input): SportEngineProposalInput['optimization'] {
  const needs = b.slotIds;
  const covered = new Set(b.picks.map((p) => p.slot.def.id));
  const declaredAnchors = env.anchorBySlot.size;
  const prefs = input.discipline.preferences;
  const ex = b.picks.map((p) => p.exercise.id);
  const liked = ex.filter((x) => prefs.liked.includes(x)).length;
  const disliked = ex.filter((x) => prefs.disliked.includes(x)).length;
  const lastFamilies = new Set(input.history.flatMap((h) => h.fingerprint.families));
  const nonAnchor = b.picks.filter((p) => !p.track);
  return {
    B1: needs.length === 0 ? 0 : needs.filter((n) => covered.has(n)).length / needs.length,
    B2: declaredAnchors === 0 ? 1 : b.anchorsUsed.length / declaredAnchors,
    B3: ex.length === 0 ? 0 : (liked - disliked + ex.length) / (ex.length + ex.length),
    B4: 0,
    B5: Math.max(0, 1 - Math.abs(b.p50 - input.intent.targetDurationS) / input.intent.targetDurationS),
    B6: nonAnchor.length === 0 ? 1 : nonAnchor.filter((p) => !lastFamilies.has(p.exercise.family)).length / nonAnchor.length,
  };
}

function proposal(b: Built, env: Env, input: Input, loaded: LoadedStrengthParams, variant: number): SportEngineProposalInput {
  const stim = env.params['strength.stimuli'][env.stimulus];
  const superset = b.session.blocks.some((x) => x.format === 'sets' && x.grouping === 'superset' && x.items.length > 1);
  const intents = input.intent.repetitionIntents.filter((r) => r.kind === 'progression_anchor' && b.anchorsUsed.includes(r.trackId));
  return {
    proposalId: `proposal.${input.intent.id}.v${String(variant)}`, discipline: 'strength', intentId: input.intent.id,
    archetypeId: input.intent.archetypeId, stimulus: input.intent.stimulus, objective: input.intent.objective,
    session: b.session, optimization: optimization(b, env, input),
    fingerprintInputs: {
      archetypeId: input.intent.archetypeId, stimulus: input.intent.stimulus,
      energy: stim?.energy, format: superset ? 'supersets' : stim?.format,
      volumeByItem: b.volumeByItem, prescriptionMarkers: b.markers,
    },
    repetitionIntents: intents,
    reasons: asProposalReasons(b.reasons),
    provenance: { engineId: STRENGTH_ENGINE_ID, engineVersion: STRENGTH_ENGINE_VERSION, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
    parametersUsed: [...loaded.used, ...(CORE_PARAMETERS_READ.flatMap((pid) => { const m = input.ruleset.parameter(pid); return m ? [{ id: pid, version: m.version }] : []; }))],
  };
}

/** Point d'entrée : propositions (1 à N), ou absence de proposition explicable (issue métier). */
export function proposeStrength(input: Input): ProposeResult {
  const loaded = readStrengthParams(input.ruleset);
  const params = loaded.values;
  const noProposal = (reasons: readonly ReasonCode[], blockingNeeds: readonly { slotId: string; need: string }[] = [], missingData: readonly ('capacities' | 'week_context' | 'tracks' | 'catalog_coverage')[] = []): ProposeResult => ({
    status: 'no_valid_proposal', reasons: asProposalReasons(reasons), blockingNeeds: [...blockingNeeds], missingData: [...missingData],
    provenance: { engineId: STRENGTH_ENGINE_ID, engineVersion: STRENGTH_ENGINE_VERSION, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
  });
  // Défense en profondeur : le CORE vérifie le contrat planificateur avant propose (CORE-EXT-4). Un appel
  // direct qui le viole est un défaut technique, jamais l'occasion d'un choix arbitraire entre ancres.
  const contract = validateStrengthIntent({ intent: input.intent, discipline: input.discipline, ruleset: input.ruleset, catalog: input.catalog });
  if (contract.length > 0) throw new Error(`contrat planificateur violé : ${contract.map((r) => r.code).join(', ')}`);
  const archetype = findArchetype(params, input.intent.archetypeId);
  const goal = input.discipline.goal.primary;
  const gk = goalKeyOf(goal);
  const na = (reason: string) => noProposal([strengthReasons.emit('PLAN.ARCHETYPE_NOT_APPLICABLE', { archetype: input.intent.archetypeId, reason })]);
  if (!archetype) return na('unknown_archetype');
  if (archetype.status === 'deprecated') return na('deprecated');
  if (!archetype.levels.includes(input.profile.athleteLevel)) return na('level_not_admitted');
  if (!archetype.goals.includes(gk)) return na('goal_not_admitted');
  if (!params['strength.stimuli'][input.intent.stimulus]) return na('unknown_stimulus');
  const { lowered, reasons: lr } = loweredStructures(input, params);
  const env = buildEnv(input, params, archetype, goal, gk, lowered, SeededRng.fromSeed(input.context.seed));
  try {
    const main = build(env, input, new Map());
    const out = [proposal({ ...main, reasons: [...lr, ...main.reasons] }, env, input, loaded, 0)];
    // Alternatives : même séance, seul un emplacement NON ancré change d'exercice (sa première alternative).
    const variable = main.picks.filter((p) => !p.track && p.slot.def.role === 'accessory' && p.ranked.length > 1);
    for (const p of variable.slice(0, params['strength.proposals.max'] - 1)) {
      const alt = p.ranked[1]?.exercise.id;
      if (!alt) continue;
      try {
        const b = build(env, input, new Map([[p.slot.def.id, alt]]));
        out.push(proposal({ ...b, reasons: [...lr, ...b.reasons] }, env, input, loaded, out.length));
      } catch (e) {
        if (!(e instanceof NoProposal)) throw e; // une alternative infaisable est simplement omise
      }
    }
    return { status: 'proposals', proposals: out };
  } catch (e) {
    if (e instanceof NoProposal) return noProposal([...lr, ...e.reasons], e.blockingNeeds, e.missingData);
    throw e;
  }
}

/** Le StrengthEngine, conforme au contrat SportEngine<StrengthContext> du CORE. */
export const StrengthEngine: SportEngine<StrengthContext> = {
  id: STRENGTH_ENGINE_ID,
  version: STRENGTH_ENGINE_VERSION,
  discipline: 'strength',
  parseContext: parseStrengthContext,
  propose: proposeStrength,
  checks: STRENGTH_CHECKS,
  validateIntent: validateStrengthIntent,
};
