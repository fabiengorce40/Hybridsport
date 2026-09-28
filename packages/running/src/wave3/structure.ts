/**
 * Vague 3 — structure CORE (`run_structure`, CORE-EXT-R1) d'une séance de qualité REJOUÉE : les durées sont
 * exactement celles de la structure réalisée (HOLD), les cibles viennent de V02 (bandes RPE). Aucune durée,
 * aucune allure et aucune récupération n'est calculée ; l'estimation est dérivée par le CORE.
 */
import type { RunStructure } from '@hybridsport/domain';
import { withDerivedEstimate } from '@hybridsport/engine';
import { CORE_RUN_DOMAIN } from '../model.js';
import type { RealizedStructure } from '../wave2/history.js';
import type { QualityArchetype } from './guards.js';

/** Domaine de travail par archétype de qualité (§K : THRESHOLD_LIKE ; §L–§N : SEVERE). */
export const QUALITY_DOMAIN: Readonly<Record<QualityArchetype, 'THRESHOLD_LIKE' | 'SEVERE'>> = {
  THRESHOLD: 'THRESHOLD_LIKE', SEVERE: 'SEVERE', SHORT_INTERVAL: 'SEVERE', HILLS: 'SEVERE',
};

export interface QualityTargets {
  readonly domain: 'THRESHOLD_LIKE' | 'SEVERE';
  readonly rpe: { readonly min: number; readonly max: number };
  /** Plafond EASY_LOW (V02) pour l'échauffement, le retour au calme et la récupération trottée. */
  readonly easyCeiling: number;
  readonly noWearable: boolean;
}

export function buildQualityStructure(s: RealizedStructure, t: QualityTargets): RunStructure | undefined {
  const easy = { domain: CORE_RUN_DOMAIN.EASY_LOW, effort: { rpe: { min: t.easyCeiling, max: t.easyCeiling } }, priority: 'effort' as const, ...(t.noWearable ? { noWearable: true } : {}) };
  const work = { domain: CORE_RUN_DOMAIN[t.domain], effort: { rpe: { min: t.rpe.min, max: t.rpe.max } }, priority: 'effort' as const, ...(t.noWearable ? { noWearable: true } : {}) };
  const segments: RunStructure['segments'] = [
    ...(s.warmupS !== undefined ? [{ kind: 'warmup' as const, id: 'warmup', dose: { durationS: s.warmupS }, target: easy }] : []),
    ...(s.reps > 1 && s.recoveryS !== undefined && s.recoveryMode !== undefined
      ? [{ kind: 'repeat' as const, id: 'work', sets: 1, reps: s.reps, work: { durationS: s.workS }, target: work, recovery: { dose: { durationS: s.recoveryS }, mode: s.recoveryMode } }]
      : [{ kind: 'steady' as const, id: 'work', dose: { durationS: s.workS }, target: work }]),
    ...(s.cooldownS !== undefined ? [{ kind: 'cooldown' as const, id: 'cooldown', dose: { durationS: s.cooldownS }, target: easy }] : []),
  ];
  return withDerivedEstimate({ type: 'run_structure', segments });
}
