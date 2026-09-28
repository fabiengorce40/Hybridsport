/**
 * Vague 3 — structure CORE (`run_structure`, CORE-EXT-R1) d'une séance de qualité REJOUÉE : les durées sont
 * exactement celles de la structure réalisée (HOLD), les cibles viennent de V02 (bandes RPE). Aucune durée,
 * aucune allure et aucune récupération n'est calculée ; l'estimation est dérivée par le CORE.
 */
import type { RunStructure, RunTarget } from '@hybridsport/domain';
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
  /** Vague R5 : plage d'allure gouvernée (V18 ± V03) du travail ; priorité à l'allure (§H), l'effort reste secondaire. */
  readonly pace?: { readonly secPerKm: { readonly min: number; readonly max: number }; readonly referenceId: string };
}

export function buildQualityStructure(s: RealizedStructure, t: QualityTargets): RunStructure | undefined {
  const easy = { domain: CORE_RUN_DOMAIN.EASY_LOW, effort: { rpe: { min: t.easyCeiling, max: t.easyCeiling } }, priority: 'effort' as const, ...(t.noWearable ? { noWearable: true } : {}) };
  const work: RunTarget = t.pace !== undefined
    ? { domain: CORE_RUN_DOMAIN[t.domain], pace: { secPerKm: { ...t.pace.secPerKm }, provenance: { source: 'reference_derived', sourceId: t.pace.referenceId } }, effort: { rpe: { min: t.rpe.min, max: t.rpe.max } }, priority: 'pace' }
    : { domain: CORE_RUN_DOMAIN[t.domain], effort: { rpe: { min: t.rpe.min, max: t.rpe.max } }, priority: 'effort', ...(t.noWearable ? { noWearable: true } : {}) };
  const segments: RunStructure['segments'] = [
    ...(s.warmupS !== undefined ? [{ kind: 'warmup' as const, id: 'warmup', dose: { durationS: s.warmupS }, target: easy }] : []),
    ...(s.reps > 1 && s.recoveryS !== undefined && s.recoveryMode !== undefined
      ? [{ kind: 'repeat' as const, id: 'work', sets: 1, reps: s.reps, work: { durationS: s.workS }, target: work, recovery: { dose: { durationS: s.recoveryS }, mode: s.recoveryMode } }]
      : [{ kind: 'steady' as const, id: 'work', dose: { durationS: s.workS }, target: work }]),
    ...(s.cooldownS !== undefined ? [{ kind: 'cooldown' as const, id: 'cooldown', dose: { durationS: s.cooldownS }, target: easy }] : []),
  ];
  return withDerivedEstimate({ type: 'run_structure', segments });
}

/**
 * Vague R5 — structure CORE d'un TEST (§Q) : échauffement et retour au calme sous le plafond EASY_LOW, segment
 * en DISTANCE (protocole) à l'effort maximal (bande V02 TEST). L'allure OBSERVÉE (provenance observed_athlete_range)
 * ne sert qu'à borner l'estimation CORE ; la priorité reste l'effort. Distance mesurée (piste, parcours déclaré
 * ou montre, §H) : jamais marqué NO_WEARABLE (le CORE interdit une allure sur une cible sans montre).
 */
export interface TestTargets {
  readonly distanceM: number;
  readonly warmupS: number;
  readonly cooldownS: number;
  readonly rpe: { readonly min: number; readonly max: number };
  readonly easyCeiling: number;
  readonly observedPace: { readonly min: number; readonly max: number };
  readonly observedSourceId: string;
}

export function buildTestStructure(t: TestTargets): RunStructure | undefined {
  const easy: RunTarget = { domain: CORE_RUN_DOMAIN.EASY_LOW, effort: { rpe: { min: t.easyCeiling, max: t.easyCeiling } }, priority: 'effort' };
  const test: RunTarget = {
    domain: CORE_RUN_DOMAIN.SEVERE, effort: { rpe: { min: t.rpe.min, max: t.rpe.max } }, priority: 'effort',
    pace: { secPerKm: { min: t.observedPace.min, max: t.observedPace.max }, provenance: { source: 'observed_athlete_range', sourceId: t.observedSourceId } },
  };
  return withDerivedEstimate({
    type: 'run_structure',
    segments: [
      { kind: 'warmup', id: 'warmup', dose: { durationS: t.warmupS }, target: easy },
      { kind: 'steady', id: 'test', dose: { distanceM: t.distanceM }, target: test },
      { kind: 'cooldown', id: 'cooldown', dose: { durationS: t.cooldownS }, target: easy },
    ],
  });
}
