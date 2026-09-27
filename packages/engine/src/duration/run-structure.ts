import { RUN_ESTIMATE_METHOD } from '@hybridsport/domain';
import type { NumericRange, PaceTarget, RecoverySpec, RunDose, RunEstimate, RunSegment, RunStructure } from '@hybridsport/domain';

// technical-constant: conversion d'unités (m/km)
const METERS_PER_KM = 1000;

/**
 * CORE-EXT-R1 — dérivation DÉTERMINISTE de la durée d'une `run_structure` (le DurationEngine reste
 * l'unique autorité de durée ; aucune autre fonction du système ne calcule ces valeurs).
 *
 * - dose en durée d : [d, d] ;
 * - dose en distance D avec une plage d'allure [rapide, lente] (s/km) : [D × rapide / 1000, D × lente / 1000] ;
 *   la durée MIN vient de l'allure la plus RAPIDE, la durée MAX de la plus LENTE ;
 * - dose en distance SANS plage d'allure : aucune durée (null) — jamais une allure inventée (Q1) ;
 * - aucun arrondi : unité explicite (secondes), arithmétique flottante identique au recalcul.
 */
export type DurationRange = NumericRange;

const ZERO: DurationRange = { min: 0, max: 0 };
const add = (a: DurationRange, b: DurationRange): DurationRange => ({ min: a.min + b.min, max: a.max + b.max });
const times = (a: DurationRange, k: number): DurationRange => ({ min: a.min * k, max: a.max * k });

export type DoseDuration = { readonly ok: true; readonly range: DurationRange } | { readonly ok: false; readonly reason: 'DISTANCE_WITHOUT_PACE' };

export function doseDuration(dose: RunDose, pace: PaceTarget | undefined): DoseDuration {
  if ('durationS' in dose) return { ok: true, range: { min: dose.durationS, max: dose.durationS } };
  if (!pace) return { ok: false, reason: 'DISTANCE_WITHOUT_PACE' };
  return { ok: true, range: { min: (dose.distanceM * pace.secPerKm.min) / METERS_PER_KM, max: (dose.distanceM * pace.secPerKm.max) / METERS_PER_KM } };
}

/** Composante de durée inconnue (distance sans allure) : jamais une valeur inventée. */
export class UnknownDurationComponent extends Error {}
function need(d: DoseDuration): DurationRange {
  if (!d.ok) throw new UnknownDurationComponent(d.reason);
  return d.range;
}
const recovery = (r: RecoverySpec): DurationRange => need(doseDuration(r.dose, r.pace));

/**
 * Durée d'un segment : `work` = doses de travail (hors échauffement, retour au calme et récupérations) ;
 * `recovery` = récupérations ; `total` = tout le segment.
 */
export interface SegmentDuration { readonly work: DurationRange; readonly recovery: DurationRange; readonly total: DurationRange }

export function segmentDuration(s: RunSegment): SegmentDuration {
  switch (s.kind) {
    case 'warmup': case 'cooldown': return { work: ZERO, recovery: ZERO, total: need(doseDuration(s.dose, s.target.pace)) };
    case 'steady': { const d = need(doseDuration(s.dose, s.target.pace)); return { work: d, recovery: ZERO, total: d }; }
    case 'preparation': {
      const reps = s.reps ?? 1;
      const work = times(need(doseDuration(s.dose, s.target.pace)), reps);
      // Récupération entre répétitions seulement : aucune après la dernière.
      const rec = s.recovery ? times(recovery(s.recovery), reps - 1) : ZERO;
      return { work, recovery: rec, total: add(work, rec) };
    }
    case 'repeat': {
      const work = times(need(doseDuration(s.work, s.target.pace)), s.sets * s.reps);
      // Aucune récupération après la dernière répétition d'une série ; une récupération entre séries.
      const intra = times(recovery(s.recovery), s.sets * (s.reps - 1));
      const between = s.betweenSetRecovery ? times(recovery(s.betweenSetRecovery), s.sets - 1) : ZERO;
      const rec = add(intra, between);
      return { work, recovery: rec, total: add(work, rec) };
    }
  }
}

export type RunEstimateResult = { readonly ok: true; readonly estimate: RunEstimate } | { readonly ok: false; readonly reason: 'DISTANCE_WITHOUT_PACE' };

/** Estimation dérivée d'une structure (travail et total), avec sa provenance de méthode. */
export function deriveRunEstimate(p: Pick<RunStructure, 'segments'>): RunEstimateResult {
  try {
    let work = ZERO;
    let total = ZERO;
    for (const s of p.segments) { const d = segmentDuration(s); work = add(work, d.work); total = add(total, d.total); }
    return { ok: true, estimate: { method: RUN_ESTIMATE_METHOD, methodVersion: 1, unit: 's', workS: work, totalS: total } };
  } catch (e) {
    if (e instanceof UnknownDurationComponent) return { ok: false, reason: 'DISTANCE_WITHOUT_PACE' };
    throw e;
  }
}

/** Construit une prescription avec son estimation dérivée (aide aux moteurs de discipline). */
export function withDerivedEstimate(p: Omit<RunStructure, 'estimate'>): RunStructure | undefined {
  const r = deriveRunEstimate(p);
  return r.ok ? { ...p, estimate: r.estimate } : undefined;
}

export type EstimateConsistency =
  | { readonly consistent: true }
  | { readonly consistent: false; readonly field: 'workS' | 'totalS' | 'derivation'; readonly stored: DurationRange | undefined; readonly recomputed: DurationRange | undefined };

/**
 * Compare l'estimation STOCKÉE au recalcul (Q2). Égalité stricte : le recalcul avec la même méthode
 * doit donner exactement la même valeur ; tout écart est un refus, jamais une réparation.
 */
export function checkRunEstimate(p: RunStructure): EstimateConsistency {
  const r = deriveRunEstimate(p);
  if (!r.ok) return { consistent: false, field: 'derivation', stored: p.estimate.totalS, recomputed: undefined };
  for (const field of ['workS', 'totalS'] as const) {
    const a = p.estimate[field];
    const b = r.estimate[field];
    if (a.min !== b.min || a.max !== b.max) return { consistent: false, field, stored: a, recomputed: b };
  }
  return { consistent: true };
}
