/**
 * Vague R5 — séance TEST (RULESET-V0 §Q, décision produit D2, choix « borne d'allure observée » du 2026-09-28).
 *
 * - Protocole EXCLUSIVEMENT lu au registre (`running.test.protocol`) : distance selon l'objectif, échauffement,
 *   retour au calme. Aucune valeur ici.
 * - Cible : effort maximal (bande V02 `TEST`), jamais une allure.
 * - Le segment de test est une DISTANCE : le CORE exige une allure sourcée pour borner la durée. Elle vient de
 *   l'allure OBSERVÉE de l'athlète (séances continues terminées avec distance, bande RECENT V12, post-retour en
 *   reprise), provenance `observed_athlete_range`, et ne sert QU'À l'estimation (priorité à l'effort).
 * - Sans séance observée avec distance : refus explicite (jamais une allure inventée).
 * - Le TEST ne fixe jamais un volume de travail : il produit une référence d'intensité (TIME_TRIAL).
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningContext } from '../context.js';
import type { RunningMode } from '../model.js';
import { MS_PER_WEEK } from '../references.js';
import { resolveParameter } from '../governance/parameters.js';
import type { RunningParameter } from '../governance/parameters.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';

export const TEST_PROTOCOL = 'running.test.protocol';
const V12 = 'running.reference.recencyBands';
/** Identifiant de source de l'allure observée (plage de l'athlète, jamais une cible). */
export const OBSERVED_PACE_SOURCE_ID = 'running.observedPace.recent';
// technical-constant: conversion d'unités (m/km)
const METERS_PER_KM = 1000;

export interface TestPlan {
  readonly distanceM: number;
  readonly warmupS: number;
  readonly cooldownS: number;
  /** Plage d'allure OBSERVÉE (s/km) : min = la plus rapide, max = la plus lente. Borne d'estimation seulement. */
  readonly observedPace: { readonly min: number; readonly max: number };
  readonly observedSessionIds: readonly string[];
  readonly referenceType: string;
}

export type TestOutcome =
  | { readonly status: 'applied'; readonly plan: TestPlan; readonly reasons: readonly ReasonCode[]; readonly parameterIds: readonly string[] }
  | { readonly status: 'refused'; readonly reasons: readonly ReasonCode[] };

const positive = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;

export interface TestInput {
  readonly ctx: RunningContext;
  readonly now: string;
  readonly parameters: readonly RunningParameter[];
  readonly mode: RunningMode;
}

export function testSession(i: TestInput): TestOutcome {
  const refuse = (cause: string, extra: readonly ReasonCode[] = []): TestOutcome =>
    ({ status: 'refused', reasons: [...extra, runningReasons.emit(RUNNING_CODES.TEST_REFUSED, { parameterId: TEST_PROTOCOL, cause })] });
  const p = resolveParameter(i.parameters, TEST_PROTOCOL, i.mode);
  if (p.status !== 'resolved') return refuse('PARAMETER_UNRESOLVED', p.reasons);
  const v = p.value as { referenceType?: unknown; distanceMByGoal?: Record<string, unknown>; warmupS?: unknown; cooldownS?: unknown; observedPace?: { recencyBand?: unknown; use?: unknown } } | null;
  const byGoal = v?.distanceMByGoal;
  const distanceM = byGoal?.[i.ctx.goal.type] ?? byGoal?.OTHER;
  if (!positive(distanceM) || !positive(v?.warmupS) || !positive(v.cooldownS) || typeof v.referenceType !== 'string'
    || v.observedPace?.recencyBand !== 'RECENT' || v.observedPace.use !== 'ESTIMATE_BOUND_ONLY') return refuse('VALUE_UNREADABLE', p.reasons);
  const bands = resolveParameter(i.parameters, V12, i.mode);
  const weeks = bands.status === 'resolved' ? (bands.value as { recentMaxWeeks?: unknown }).recentMaxWeeks : undefined;
  if (!positive(weeks)) return refuse('RECENCY_UNRESOLVED', [...p.reasons, ...bands.reasons]);

  const nowMs = Date.parse(i.now);
  const since = i.ctx.returnState.state !== 'NONE' ? i.ctx.recentLoad?.returnStartedAt : undefined;
  const observed = i.ctx.sessionHistory
    .filter((s) => s.completion === 'COMPLETED' && s.structureFamily === 'CONTINUOUS'
      && Date.parse(s.completedAt) <= nowMs && (nowMs - Date.parse(s.completedAt)) / MS_PER_WEEK <= weeks && (since === undefined || s.completedAt >= since))
    .flatMap((s) => (s.distanceM === undefined ? [] : [{ id: s.sessionId, pace: (s.realizedDurationS * METERS_PER_KM) / s.distanceM }]))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.pace - b.pace));
  if (observed.length === 0) return refuse('OBSERVED_PACE_UNAVAILABLE', [...p.reasons, ...bands.reasons]);
  const paces = observed.map((o) => o.pace);
  const plan: TestPlan = {
    distanceM, warmupS: v.warmupS, cooldownS: v.cooldownS, referenceType: v.referenceType,
    observedPace: { min: Math.min(...paces), max: Math.max(...paces) }, observedSessionIds: [...new Set(observed.map((o) => o.id))],
  };
  return {
    status: 'applied', plan, parameterIds: [TEST_PROTOCOL, V12],
    reasons: [...p.reasons, ...bands.reasons, runningReasons.emit(RUNNING_CODES.TEST_PROTOCOL_APPLIED, { distanceM, parameterId: TEST_PROTOCOL, observedSessionIds: plan.observedSessionIds })],
  };
}
