import type { Exercise, Level, ReasonCode, SessionBlock, SessionDraft, SessionItem, SetPrescription } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import { segmentDuration, UnknownDurationComponent } from './run-structure.js';
import type { DurationRange } from './run-structure.js';

const reasons = createCoreRegistry();
// technical-constant: conversions d'unités (s/min, m/km)
const SECONDS_PER_MINUTE = 60;
// technical-constant: conversions d'unités
const METERS_PER_KM = 1000;

/** Triplet de durée (secondes) : optimiste, médian, pessimiste. */
export interface Span { readonly min: number; readonly p50: number; readonly p90: number }
const span = (min: number, p50: number, p90: number): Span => ({ min, p50, p90 });
const add = (a: Span, b: Span): Span => span(a.min + b.min, a.p50 + b.p50, a.p90 + b.p90);
const scale = (a: Span, k: number): Span => span(a.min * k, a.p50 * k, a.p90 * k);
const ZERO = span(0, 0, 0);
const mul = (a: Span, b: Span): Span => span(a.min * b.min, a.p50 * b.p50, a.p90 * b.p90);
/** Série facultative : absente de min et de p50, présente dans p90 (prudence sur le temps disponible). */
const onlyP90 = (a: Span): Span => span(0, 0, a.p90);

/** Répétitions d'une série : exactes, ou plage (min → min, milieu → p50, max → p90). */
function repsSpan(reps: SetPrescription['reps']): Span {
  if (typeof reps === 'number') return span(reps, reps, reps);
  // technical-constant: milieu de la plage de répétitions (moyenne arithmétique)
  return span(reps.min, (reps.min + reps.max) / 2, reps.max);
}

/** Facteurs de timing personnels (calibrés plus tard ; valeurs par défaut lues dans le ruleset). */
export interface AthleteTimingProfile {
  readonly restOverrunFactor: number;
  readonly restP90Factor: number;
  readonly transitionFactor: number;
}

export interface DurationParams {
  readonly timing: AthleteTimingProfile;
  readonly transitionTable: Readonly<Record<string, number>>;
  readonly blockTransitionS: number;
  readonly briefingS: number;
  readonly correlation: number;
}

/** Paramètres de durée : toutes les constantes viennent du ruleset (spec 07 §2). */
export function readDurationParams(ruleset: LoadedRuleset, timing?: AthleteTimingProfile): DurationParams {
  const def = ruleset.numberRecord('duration.defaultTiming');
  return {
    timing: timing ?? { restOverrunFactor: def.restOverrunFactor ?? Number.NaN, restP90Factor: def.restP90Factor ?? Number.NaN, transitionFactor: def.transitionFactor ?? Number.NaN },
    transitionTable: ruleset.numberRecord('duration.transitionTable'),
    blockTransitionS: ruleset.number('duration.blockTransitionS'),
    briefingS: ruleset.number('duration.briefingS'),
    correlation: ruleset.number('duration.uncertaintyCorrelation'),
  };
}

export interface BlockEstimate { readonly blockId: string; readonly min: number; readonly p50: number; readonly p90: number; readonly fixed: boolean }

export interface DurationEstimate {
  readonly p10: number;
  readonly p50: number;
  readonly p90: number;
  readonly byBlock: readonly BlockEstimate[];
  readonly components: { readonly setupS: number; readonly workS: number; readonly restS: number; readonly transitionsS: number };
}

export type EstimateResult = { ok: true; estimate: DurationEstimate } | { ok: false; reasons: ReasonCode[] };

class EstimationError extends Error {
  constructor(readonly reason: ReasonCode) { super(reason.code); }
}

function missing(kind: string, id: string): never {
  throw new EstimationError(reasons.emit('TECHNICAL.UNKNOWN_REFERENCE', { kind, id }));
}

interface Acc { setup: number; work: Span; rest: Span; transitions: number }

function rateFor(e: Exercise, level: Level, unit: 'reps_per_min' | 'm_per_min' | 'cal_per_min'): { p50: number; p90Slow: number } {
  if (!e.workRate || e.workRate.unit !== unit) return missing(`workRate(${unit})`, e.id);
  return e.workRate.byLevel[level];
}

function perRep(e: Exercise): Span {
  const s = e.timing.secondsPerRep;
  if (!s) return missing('timing.secondsPerRep', e.id);
  return span(s.min, s.typical, s.max);
}

function paceSpan(distanceM: number, pace: { min: number; max: number } | undefined, e: Exercise, level: Level): Span {
  if (pace) {
    const km = distanceM / METERS_PER_KM;
    // technical-constant: milieu de la plage d'allure (moyenne arithmétique)
    return span(km * pace.min, (km * (pace.min + pace.max)) / 2, km * pace.max);
  }
  const r = rateFor(e, level, 'm_per_min');
  return span((distanceM / (r.p50 * (r.p50 / r.p90Slow))) * SECONDS_PER_MINUTE, (distanceM / r.p50) * SECONDS_PER_MINUTE, (distanceM / r.p90Slow) * SECONDS_PER_MINUTE);
}

/** Plage [min, max] → triplet (milieu arithmétique en p50), sans facteur de dépassement. */
// technical-constant: milieu de la plage (moyenne arithmétique)
const rangeSpan = (r: DurationRange): Span => span(r.min, (r.min + r.max) / 2, r.max);

/**
 * CORE-EXT-R1 : parties d'une `run_structure` (hors récupérations / récupérations), calculées par la
 * dérivation unique de run-structure.ts. Une dose en distance sans allure est une erreur TECHNICAL.
 */
function runParts(item: SessionItem, p: Extract<SessionItem['prescription'], { type: 'run_structure' }>): { effort: Span; recovery: Span } {
  let effort = ZERO;
  let recovery = ZERO;
  p.segments.forEach((seg, i) => {
    try {
      const d = segmentDuration(seg);
      effort = add(effort, rangeSpan({ min: d.total.min - d.recovery.min, max: d.total.max - d.recovery.max }));
      recovery = add(recovery, rangeSpan(d.recovery));
    } catch (e) {
      if (!(e instanceof UnknownDurationComponent)) throw e;
      throw new EstimationError(reasons.emit('TECHNICAL.STRUCTURE.DISTANCE_WITHOUT_PACE', { path: `${item.id}.segments.${String(i)}` }));
    }
  });
  return { effort, recovery };
}

/** Travail d'un « tour » d'item (sans le repos de fin de série ni la mise en place). */
function itemWork(item: SessionItem, e: Exercise, level: Level): Span {
  const p = item.prescription;
  switch (p.type) {
    case 'sets': return p.sets.reduce((acc, s) => {
      const w = mul(perRep(e), repsSpan(s.reps));
      return add(acc, s.optional === true ? onlyP90(w) : w);
    }, ZERO);
    case 'timed': return scale(span(p.workS, p.workS, p.workS), p.rounds);
    case 'distance': return paceSpan(p.distanceM, p.paceSecPerKm, e, level);
    case 'calories': { const r = rateFor(e, level, 'cal_per_min'); return span((p.calories / (r.p50 * (r.p50 / r.p90Slow))) * SECONDS_PER_MINUTE, (p.calories / r.p50) * SECONDS_PER_MINUTE, (p.calories / r.p90Slow) * SECONDS_PER_MINUTE); }
    case 'reps': {
      if (e.workRate?.unit === 'reps_per_min') { const r = e.workRate.byLevel[level]; return span((p.reps / (r.p50 * (r.p50 / r.p90Slow))) * SECONDS_PER_MINUTE, (p.reps / r.p50) * SECONDS_PER_MINUTE, (p.reps / r.p90Slow) * SECONDS_PER_MINUTE); }
      return scale(perRep(e), p.reps);
    }
    case 'hold': return scale(span(p.seconds, p.seconds, p.seconds), p.sets);
    case 'mobility': return scale(span(p.seconds, p.seconds, p.seconds), p.sides);
    case 'intervals': {
      const one = 'timeS' in p.work ? span(p.work.timeS, p.work.timeS, p.work.timeS) : paceSpan(p.work.distanceM, p.paceSecPerKm, e, level);
      return scale(one, p.reps);
    }
    case 'run_structure': return runParts(item, p).effort;
  }
}

/** Repos internes d'un item (entre séries / tours / intervalles), dernier repos exclu. */
function itemRest(item: SessionItem, params: DurationParams): Span {
  const p = item.prescription;
  const t = params.timing;
  const r = (s: number): Span => span(s, s * t.restOverrunFactor, s * t.restOverrunFactor * t.restP90Factor);
  switch (p.type) {
    // Le repos précédant une série facultative n'est compté que dans p90.
    case 'sets': return p.sets.slice(0, -1).reduce((acc, s, i) => add(acc, p.sets[i + 1]?.optional === true ? onlyP90(r(s.restAfterS)) : r(s.restAfterS)), ZERO);
    case 'timed': return r(p.restS * (p.rounds - 1));
    case 'hold': return r(p.restS * (p.sets - 1));
    case 'intervals': return span(p.recoveryS * (p.reps - 1), p.recoveryS * (p.reps - 1), p.recoveryS * (p.reps - 1));
    case 'run_structure': return runParts(item, p).recovery;
    default: return ZERO;
  }
}

function loadChanges(item: SessionItem, e: Exercise): number {
  if (item.prescription.type !== 'sets' || e.timing.loadChangeS === undefined) return 0;
  const ramp = item.prescription.sets.filter((s) => s.kind === 'rampup').length;
  return ramp * e.timing.loadChangeS;
}

function transition(from: Exercise, to: Exercise, params: DurationParams): number {
  const key = `${from.timing.transitionClass}>${to.timing.transitionClass}`;
  const base = params.transitionTable[key] ?? params.transitionTable.default;
  if (base === undefined) return missing('duration.transitionTable', key);
  return base * params.timing.transitionFactor;
}

function blockSpan(block: SessionBlock, session: SessionDraft, catalog: LoadedCatalog, params: DurationParams, acc: Acc): { s: Span; fixed: boolean } {
  const pairs = block.items.map((item) => ({ item, e: catalog.exercise(item.exerciseId) ?? missing('exercise', item.exerciseId) }));
  const setup = pairs.reduce((sum, { item, e }) => sum + e.timing.setupS + loadChanges(item, e), 0);
  let transitions = 0;
  pairs.forEach((p, i) => { const prev = pairs[i - 1]; if (prev) transitions += transition(prev.e, p.e, params); });
  const works = pairs.map(({ item, e }) => itemWork(item, e, session.athleteLevel));
  const rests = block.items.map((it) => itemRest(it, params));
  const fixedSpan = (s: number): { s: Span; fixed: boolean } => ({ s: span(s, s, s), fixed: true });

  switch (block.format) {
    case 'emom': acc.setup += setup; return fixedSpan(block.minutes * SECONDS_PER_MINUTE + setup);
    case 'amrap': acc.setup += setup; return fixedSpan(block.timeCapS + setup);
    case 'for_time': {
      const round = works.reduce(add, ZERO);
      const within = add(scale(round, block.rounds), span(transitions * block.rounds, transitions * block.rounds, transitions * block.rounds));
      const cap = block.timeCapS;
      acc.setup += setup; acc.work = add(acc.work, within); acc.transitions += transitions * block.rounds;
      return { s: span(Math.min(cap, within.min) + setup, Math.min(cap, within.p50) + setup, Math.min(cap, within.p90) + setup), fixed: false };
    }
    case 'sets': {
      if (block.grouping === 'straight') {
        const work = works.reduce(add, ZERO);
        const rest = rests.reduce(add, ZERO);
        acc.setup += setup; acc.work = add(acc.work, work); acc.rest = add(acc.rest, rest); acc.transitions += transitions;
        return { s: add(add(work, rest), span(setup + transitions, setup + transitions, setup + transitions)), fixed: false };
      }
      // Superset / circuit : les items s'enchaînent tour par tour ; un repos par tour.
      const rounds = Math.max(...block.items.map((it) => (it.prescription.type === 'sets' ? it.prescription.sets.length : 1)));
      const work = works.reduce(add, ZERO);
      const perRoundRest = block.restBetweenRoundsS ?? Math.max(...block.items.map((it) => (it.prescription.type === 'sets' ? Math.max(...it.prescription.sets.map((s) => s.restAfterS)) : 0)));
      const t = params.timing;
      const rest = span(perRoundRest * (rounds - 1), perRoundRest * (rounds - 1) * t.restOverrunFactor, perRoundRest * (rounds - 1) * t.restOverrunFactor * t.restP90Factor);
      const tr = transitions * rounds;
      acc.setup += setup; acc.work = add(acc.work, work); acc.rest = add(acc.rest, rest); acc.transitions += tr;
      return { s: add(add(work, rest), span(setup + tr, setup + tr, setup + tr)), fixed: false };
    }
    case 'continuous': {
      const work = works.reduce(add, ZERO);
      const rest = rests.reduce(add, ZERO);
      acc.setup += setup; acc.work = add(acc.work, work); acc.rest = add(acc.rest, rest); acc.transitions += transitions;
      const fixed = block.items.every((it) => it.prescription.type === 'timed' || it.prescription.type === 'mobility' || it.prescription.type === 'hold');
      return { s: add(add(work, rest), span(setup + transitions, setup + transitions, setup + transitions)), fixed };
    }
  }
}

/**
 * Estime la durée d'une séance (spec 07 §2) : somme des composants (mise en place, travail, repos,
 * transitions, consignes), puis propagation de l'incertitude par blocs avec une corrélation paramétrée.
 * Fonction pure et déterministe. Données manquantes ⇒ erreur TECHNICAL, jamais une valeur inventée.
 */
export function estimateDuration(session: SessionDraft, catalog: LoadedCatalog, params: DurationParams): EstimateResult {
  if (![params.timing.restOverrunFactor, params.timing.restP90Factor, params.timing.transitionFactor].every((v) => Number.isFinite(v) && v > 0)) {
    return { ok: false, reasons: [reasons.emit('TECHNICAL.PARAMETER_TYPE', { parameterId: 'duration.defaultTiming', expected: 'facteurs positifs' })] };
  }
  try {
    const acc: Acc = { setup: 0, work: ZERO, rest: ZERO, transitions: 0 };
    const byBlock: BlockEstimate[] = session.blocks.map((b) => {
      const { s, fixed } = blockSpan(b, session, catalog, params, acc);
      const brief = params.briefingS;
      return { blockId: b.id, min: s.min + brief, p50: s.p50 + brief, p90: s.p90 + brief, fixed };
    });
    const between = params.blockTransitionS * (session.blocks.length - 1);
    const p50 = byBlock.reduce((a, b) => a + b.p50, 0) + between;
    const up = byBlock.map((b) => b.p90 - b.p50);
    const down = byBlock.map((b) => b.p50 - b.min);
    const rho = params.correlation;
    const combine = (d: number[]) => (1 - rho) * Math.sqrt(d.reduce((a, x) => a + x * x, 0)) + rho * d.reduce((a, x) => a + x, 0);
    return {
      ok: true,
      estimate: {
        p10: Math.max(0, p50 - combine(down)), p50, p90: p50 + combine(up), byBlock,
        components: { setupS: acc.setup, workS: acc.work.p50, restS: acc.rest.p50, transitionsS: acc.transitions + between + params.briefingS * session.blocks.length },
      },
    };
  } catch (e) {
    if (e instanceof EstimationError) return { ok: false, reasons: [e.reason] };
    throw e;
  }
}
