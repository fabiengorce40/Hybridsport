/**
 * ProgressionEngine — modèles de la musculation (spec strength 05 §12, addendum V1.1 §4–§5).
 * SEULE AUTORITÉ sur le cycle de vie des tracks : création (après exécution réelle d'une ancre
 * candidate ou d'un accessoire suivi), mise à jour, suspension, rotation, clôture. Le StrengthEngine ne
 * l'importe jamais (test d'architecture) : il ne fait qu'appliquer `nextPrescription`.
 *
 * Le modèle est porté par la TRACK (ou par l'exercice sans track), jamais par la séance ni par la série.
 * Une variable dominante progresse à la fois ; la double progression enchaîne reps puis charge, une
 * seule variable par pas. Douleur et pause de sécurité ne sont JAMAIS des échecs de performance.
 */
import type { Exercise, ISODateTime, ReasonCode, RepTarget, SetPrescription } from '@hybridsport/domain';
import type { StrengthTrack } from './context.js';
import type { ProgressionModel, StrengthParams } from './params.js';
import { strengthReasons } from './codes.js';
import { daysBetween, median, roundDownToStep } from './util.js';

export const EXPOSURE_CLASSES = ['above', 'on_target', 'partial', 'below', 'no_data', 'interrupted', 'pain', 'safety_pause', 'substituted'] as const;
export type ExposureClass = (typeof EXPOSURE_CLASSES)[number];

export interface PerformedSet { readonly reps: number; readonly loadKg?: number; readonly rir?: number }

/** Exécution d'un exercice prescrit, telle que rapportée par le feedback (spec strength 06 §19). */
export interface ExecutedItem {
  readonly exerciseId: string;
  readonly prescribed: readonly SetPrescription[];
  /** Séries de TRAVAIL réalisées (montées exclues). Vide si rien n'a été saisi. */
  readonly performed: readonly PerformedSet[];
  readonly sessionCompleted: boolean;
  readonly skipReason?: 'pain' | 'safety_pause' | 'other';
  readonly substitutedFrom?: string;
}

const targetMin = (r: RepTarget): number => (typeof r === 'number' ? r : r.min);
const targetRir = (s: SetPrescription): number | undefined => {
  const i = s.intensity;
  if (i && 'effort' in i && i.effort && 'rir' in i.effort) return i.effort.rir;
  return s.rir;
};

export function classifyExposure(x: ExecutedItem, params: StrengthParams): ExposureClass {
  if (x.skipReason === 'pain') return 'pain';
  if (x.skipReason === 'safety_pause') return 'safety_pause';
  if (x.substitutedFrom !== undefined) return 'substituted';
  const work = x.prescribed.filter((s) => s.kind !== 'rampup' && s.optional !== true);
  if (x.performed.length === 0) return x.sessionCompleted ? 'no_data' : 'interrupted';
  const p = params['strength.progression'];
  const first = work[0];
  if (!first) return 'no_data';
  const reps = targetMin(first.reps);
  const rir = targetRir(first);
  const met = x.performed.filter((s) => s.reps >= reps).length;
  if (!x.sessionCompleted && x.performed.length < work.length) return met === x.performed.length ? 'interrupted' : 'partial';
  const missed = work.length - met;
  const lastRir = x.performed.at(-1)?.rir;
  if (missed > p.partialMaxMissedSets || (rir !== undefined && lastRir !== undefined && lastRir <= rir - p.belowRirMargin)) return 'below';
  if (missed > 0) return 'partial';
  if (rir !== undefined && lastRir !== undefined && lastRir >= rir + p.aboveRirMargin) return 'above';
  return 'on_target';
}

export interface TrackUpdate {
  readonly track: StrengthTrack;
  readonly reasons: readonly ReasonCode[];
  /** Stagnation persistante : le ProgressionEngine décide une rotation à la prochaine frontière. */
  readonly rotate: boolean;
}

/** Pas de charge réalisable pour l'exercice (incrément × nombre d'incréments du ruleset). */
function stepFor(e: Exercise, params: StrengthParams, declaredStepKg?: number): number | undefined {
  const inc = declaredStepKg ?? (e.loadModel ? params['strength.load.defaultIncrements'][e.loadModel] : undefined);
  return inc === undefined ? undefined : inc * params['strength.progression'].loadStepIncrements;
}

function e1rmOf(sets: readonly PerformedSet[], params: StrengthParams): number | undefined {
  const l = params['strength.load'];
  const vals = sets.flatMap((s) => {
    const rtf = s.reps + (s.rir ?? l.assumedRirWhenUnknown);
    return s.loadKg !== undefined && s.loadKg > 0 && rtf >= l.validRepRange.min && rtf <= l.validRepRange.max ? [s.loadKg * (1 + rtf / l.e1rmDivisor)] : [];
  });
  return median(vals);
}

/**
 * Mise à jour d'une track après exécution. Variable progressée selon le modèle de la TRACK.
 * `phaseKind = deload` : aucune hausse. Douleur / pause : track suspendue, rien ne baisse.
 */
export function updateTrack(track: StrengthTrack, x: ExecutedItem, cls: ExposureClass, e: Exercise, params: StrengthParams, phaseKind: string, declaredStepKg?: number): TrackUpdate {
  const p = params['strength.progression'];
  const reasons: ReasonCode[] = [];
  const next = track.nextPrescription;
  if (cls === 'pain' || cls === 'safety_pause') {
    reasons.push(strengthReasons.emit('PROGRESSION.SUSPENDED', { trackId: track.trackId, cause: cls }));
    return { track: { ...track, status: 'suspended' }, reasons, rotate: false };
  }
  const resumed: StrengthTrack = track.status === 'suspended' ? { ...track, status: 'active' } : track;
  if (cls === 'substituted' || cls === 'no_data' || cls === 'interrupted' || phaseKind === 'deload') {
    reasons.push(strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: phaseKind === 'deload' ? 'deload' : cls }));
    return { track: resumed, reasons, rotate: false };
  }
  if (cls === 'partial') {
    const holds = resumed.consecutiveHolds + 1;
    reasons.push(strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'partial' }));
    return { track: { ...resumed, consecutiveHolds: holds, consecutiveSuccess: 0, consecutiveBelow: 0 }, reasons, rotate: holds >= p.stagnationHolds };
  }
  const step = stepFor(e, params, declaredStepKg);
  if (cls === 'below') {
    const below = resumed.consecutiveBelow + 1;
    if (below >= p.regressAfterBelow && next?.loadKg !== undefined && step !== undefined) {
      const kg = Math.max(step, roundDownToStep(next.loadKg * (1 - p.regressionFraction), step));
      reasons.push(strengthReasons.emit('PROGRESSION.REGRESSED', { trackId: track.trackId }));
      return { track: { ...resumed, consecutiveBelow: 0, consecutiveSuccess: 0, consecutiveHolds: resumed.consecutiveHolds + 1, nextPrescription: { ...next, loadKg: kg } }, reasons, rotate: resumed.consecutiveHolds + 1 >= p.stagnationHolds };
    }
    reasons.push(strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'below' }));
    return { track: { ...resumed, consecutiveBelow: below, consecutiveSuccess: 0, consecutiveHolds: resumed.consecutiveHolds + 1 }, reasons, rotate: resumed.consecutiveHolds + 1 >= p.stagnationHolds };
  }
  // Succès (above / on_target) : progression seulement sur preuves répétées.
  const success = resumed.consecutiveSuccess + 1;
  if (success < p.evidenceRequired[track.model] || !next) {
    return { track: { ...resumed, consecutiveSuccess: success, consecutiveBelow: 0 }, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'evidence' })], rotate: false };
  }
  const base: StrengthTrack = { ...resumed, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0 };
  const cap = track.cycleStartLoadKg !== undefined ? track.cycleStartLoadKg * (1 + p.cycleCapFraction) : undefined;
  const capped = (kg: number) => cap !== undefined && kg > cap;
  switch (track.model) {
    case 'linear_load':
    case 'autoregulated': {
      if (next.loadKg === undefined || step === undefined) return { track: base, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'no_load' })], rotate: false };
      let kg = next.loadKg + step;
      let e1rm = track.e1rmKg;
      if (track.model === 'autoregulated') {
        const measured = e1rmOf(x.performed, params);
        e1rm = measured === undefined ? track.e1rmKg : track.e1rmKg === undefined ? measured : median([track.e1rmKg, measured]);
        const reps = targetMin(next.reps);
        const rtf = String(Math.round(reps + (next.rir ?? 0)));
        const pct = params['strength.load'].pctByRepsToFailure[rtf];
        if (e1rm !== undefined && pct !== undefined) kg = Math.max(next.loadKg, Math.min(next.loadKg + step, roundDownToStep(e1rm * pct, step)));
      }
      if (capped(kg)) return { track: base, reasons: [strengthReasons.emit('PROGRESSION.CAP_REACHED', { trackId: track.trackId })], rotate: false };
      if (kg === next.loadKg) return { track: { ...base, ...(e1rm !== undefined ? { e1rmKg: e1rm } : {}) }, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'estimate' })], rotate: false };
      return { track: { ...base, ...(e1rm !== undefined ? { e1rmKg: e1rm } : {}), nextPrescription: { ...next, loadKg: kg } }, reasons: [strengthReasons.emit('PROGRESSION.ADVANCED', { trackId: track.trackId, variable: 'load' })], rotate: false };
    }
    case 'double_progression': {
      const range = track.repRange ?? (typeof next.reps === 'number' ? { min: next.reps, max: next.reps } : next.reps);
      const current = targetMin(next.reps);
      if (current < range.max) {
        return { track: { ...base, nextPrescription: { ...next, reps: { min: current + 1, max: range.max } } }, reasons: [strengthReasons.emit('PROGRESSION.ADVANCED', { trackId: track.trackId, variable: 'reps' })], rotate: false };
      }
      if (next.loadKg === undefined || step === undefined) return { track: base, reasons: [strengthReasons.emit('PROGRESSION.CAP_REACHED', { trackId: track.trackId })], rotate: false };
      const kg = next.loadKg + step;
      if (capped(kg)) return { track: base, reasons: [strengthReasons.emit('PROGRESSION.CAP_REACHED', { trackId: track.trackId })], rotate: false };
      return { track: { ...base, nextPrescription: { ...next, loadKg: kg, reps: { min: range.min, max: range.max } } }, reasons: [strengthReasons.emit('PROGRESSION.ADVANCED', { trackId: track.trackId, variable: 'load' })], rotate: false };
    }
    case 'set_progression':
      // PM4 agit sur le volume hebdomadaire (allocation), jamais comme modèle de track.
      return { track: base, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: track.trackId, cause: 'volume_model' })], rotate: false };
  }
}

/** Création d'une track après exécution réelle d'un item `candidate` (ancre) ou d'un accessoire suivi. */
export function createTrack(input: {
  readonly tier: 'anchor' | 'tracked'; readonly archetypeId: string; readonly slotId: string; readonly exercise: Exercise;
  readonly model: ProgressionModel; readonly prescribed: readonly SetPrescription[]; readonly performed: readonly PerformedSet[]; readonly at: ISODateTime;
}, params: StrengthParams): { track: StrengthTrack; reasons: readonly ReasonCode[] } {
  const work = input.prescribed.filter((s) => s.kind !== 'rampup' && s.optional !== true);
  const first = work[0];
  const reps: RepTarget = first?.reps ?? 1;
  const lastLoad = [...input.performed].reverse().find((s) => s.loadKg !== undefined && s.loadKg > 0)?.loadKg;
  const e1rm = e1rmOf(input.performed, params);
  const rir = first ? targetRir(first) : undefined;
  // technical-constant: longueur de la date ISO AAAA-MM-JJ
  const trackId = `track.${input.archetypeId}.${input.slotId}.${input.exercise.id}.${input.at.slice(0, 10)}`;
  const track: StrengthTrack = {
    trackId, tier: input.tier, exerciseId: input.exercise.id, archetypeId: input.archetypeId, slotId: input.slotId, model: input.model,
    status: 'active', openedAt: input.at, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0,
    ...(typeof reps !== 'number' ? { repRange: reps } : {}),
    ...(lastLoad !== undefined ? { cycleStartLoadKg: lastLoad } : {}),
    ...(e1rm !== undefined ? { e1rmKg: e1rm } : {}),
    nextPrescription: { sets: Math.max(1, work.length), reps, ...(lastLoad !== undefined ? { loadKg: lastLoad } : {}), ...(rir !== undefined ? { rir } : {}) },
  };
  return { track, reasons: [strengthReasons.emit('PROGRESSION.TRACK_CREATED', { trackId, tier: input.tier, exerciseId: input.exercise.id })] };
}

/** Rotation / clôture (frontière de semaine) : fin de mésocycle, durée maximale, stagnation, inadmissibilité durable. */
export function closureCause(track: StrengthTrack, o: { readonly now: string; readonly mesocycleEnded: boolean; readonly stagnant: boolean; readonly inadmissible: boolean; readonly level: keyof StrengthParams['strength.tracks']['anchorMaxWeeks'] }, params: StrengthParams): string | undefined {
  if (track.status === 'closed') return undefined;
  const t = params['strength.tracks'];
  // technical-constant: jours par semaine (conversion d'unités)
  const DAYS_PER_WEEK = 7;
  if (o.inadmissible) return 'inadmissible';
  if (o.stagnant) return 'stagnation';
  if (daysBetween(track.openedAt, o.now) > t.anchorMaxWeeks[o.level] * DAYS_PER_WEEK) return 'max_weeks';
  if (o.mesocycleEnded && t.rotateAtMesocycleEnd) return 'mesocycle_end';
  return undefined;
}

export function closeTrack(track: StrengthTrack, cause: string): { track: StrengthTrack; reasons: readonly ReasonCode[] } {
  return { track: { ...track, status: 'closed' }, reasons: [strengthReasons.emit('PROGRESSION.TRACK_CLOSED', { trackId: track.trackId, cause })] };
}
