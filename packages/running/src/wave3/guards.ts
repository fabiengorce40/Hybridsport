/**
 * Vague 3 — gardes des séances de qualité (RULESET-V0 §G.3, §K, §L, §M, §N, §S, §X), sans aucune valeur
 * ajoutée : les bornes viennent du registre (V10 `running.hi.densityPolicy`, V11
 * `running.placement.strongDefaultSeparation`, `running.return.resumeCondition`), les règles qualitatives
 * des tables documentées. Pures et déterministes. Toute règle illisible ⇒ refus (jamais un défaut).
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningContext } from '../context.js';
import type { ConfidenceLevel, RunningLevel, RunningSessionArchetype } from '../model.js';
import { confidenceRank, RUNNING_LEVELS } from '../model.js';
import { resolveParameter } from '../governance/parameters.js';
import type { RunningParameter } from '../governance/parameters.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';
import { sessionNegativeResponse } from '../wave2/history.js';
import type { RealizedSession, StructureFamily } from '../wave2/history.js';

/** Archétypes de qualité prescriptibles en vague 3 (rejeu en HOLD de l'historique, V19). */
export const QUALITY_ARCHETYPES = ['THRESHOLD', 'SEVERE', 'SHORT_INTERVAL', 'HILLS'] as const satisfies readonly RunningSessionArchetype[];
export type QualityArchetype = (typeof QUALITY_ARCHETYPES)[number];

/**
 * Séances HIGH_DEMAND par CONTENU (§S) : travail en THRESHOLD_LIKE ou SEVERE, séances de test, LONG_RUN
 * désignée (V32 vide ⇒ défaut conservateur), RACE_PACE. V31 vide ⇒ toute dose de qualité compte (défaut tracé).
 */
export const HIGH_DEMAND_ARCHETYPES: readonly RunningSessionArchetype[] = ['THRESHOLD', 'SEVERE', 'SHORT_INTERVAL', 'HILLS', 'RACE_PACE', 'LONG', 'TEST'];

/** Niveau minimal par archétype de qualité (§G.3 : P-R2 et plus). */
const MIN_LEVEL: Readonly<Record<QualityArchetype, RunningLevel>> = { THRESHOLD: 'P_R2', SEVERE: 'P_R2', SHORT_INTERVAL: 'P_R2', HILLS: 'P_R2' };
/** §K : CONTINUOUS réservé à P-R3 et plus, ou confiance ≥ MEDIUM. */
const CONTINUOUS_THRESHOLD_LEVEL: RunningLevel = 'P_R3';
const CONTINUOUS_THRESHOLD_CONFIDENCE: ConfidenceLevel = 'MEDIUM';
/** §G.3 SHORT_INTERVALS : objectif 5K / 10K / GENERAL. */
const SHORT_INTERVAL_GOALS: readonly RunningContext['goal']['type'][] = ['FIVE_K', 'TEN_K', 'GENERAL_RUNNING'];

const V10 = 'running.hi.densityPolicy';
const V11 = 'running.placement.strongDefaultSeparation';
const RESUME = 'running.return.resumeCondition';

// technical-constant: conversion calendaire
const MS_PER_DAY = 86_400_000;
const dayOf = (iso: string): number => Math.floor(Date.parse(iso) / MS_PER_DAY);

export interface GuardInput {
  readonly archetype: QualityArchetype;
  readonly family: StructureFamily;
  readonly ctx: RunningContext;
  readonly now: string;
  readonly parameters: readonly RunningParameter[];
  /** Confiance de la référence servant la frontière du seuil (analyse de vague 1). */
  readonly thresholdReferenceConfidence: ConfidenceLevel;
}

export interface GuardResult { readonly ok: boolean; readonly reasons: readonly ReasonCode[]; readonly parameterIds: readonly string[] }

const levelRank = (l: RunningLevel): number => RUNNING_LEVELS.indexOf(l);
const isHighDemand = (s: RealizedSession): boolean => HIGH_DEMAND_ARCHETYPES.includes(s.archetype) && s.completion !== 'SKIPPED';

/** Reprise levée (V25 : N séances post-retour sans signal négatif, valeur du registre). */
export function returnLifted(ctx: RunningContext, parameters: readonly RunningParameter[], mode: RunningContext['mode']): { lifted: boolean; reasons: readonly ReasonCode[] } {
  if (ctx.returnState.state === 'NONE') return { lifted: true, reasons: [] };
  const p = resolveParameter(parameters, RESUME, mode);
  const n = p.status === 'resolved' ? (p.value as { postReturnSessionsWithoutSignal?: unknown }).postReturnSessionsWithoutSignal : undefined;
  if (typeof n !== 'number' || !(n > 0)) return { lifted: false, reasons: [...p.reasons] };
  const since = ctx.recentLoad?.returnStartedAt;
  if (since === undefined) return { lifted: false, reasons: [...p.reasons] };
  const clean = ctx.sessionHistory.filter((s) => s.completedAt >= since && s.completion === 'COMPLETED' && !sessionNegativeResponse(s)).length;
  return { lifted: clean >= n, reasons: [...p.reasons] };
}

export function qualityGuards(g: GuardInput): GuardResult {
  const { archetype: a, ctx } = g;
  const reasons: ReasonCode[] = [];
  const used: string[] = [];
  const refuse = (rule: string, detail: string): GuardResult => ({ ok: false, reasons: [...reasons, runningReasons.emit(RUNNING_CODES.QUALITY_GUARD_FAILED, { archetype: a, rule, detail })], parameterIds: used });

  // §G.3 : niveau minimal ; §K : CONTINUOUS réservé à P-R3+ ou à une confiance ≥ MEDIUM.
  if (levelRank(ctx.population.level) < levelRank(MIN_LEVEL[a])) return refuse('G3_POPULATION', ctx.population.level);
  if (a === 'THRESHOLD' && g.family === 'CONTINUOUS' && levelRank(ctx.population.level) < levelRank(CONTINUOUS_THRESHOLD_LEVEL)
    && confidenceRank(g.thresholdReferenceConfidence) < confidenceRank(CONTINUOUS_THRESHOLD_CONFIDENCE)) return refuse('K_CONTINUOUS_LEVEL', `${ctx.population.level}/${g.thresholdReferenceConfidence}`);
  if (a === 'SHORT_INTERVAL' && !SHORT_INTERVAL_GOALS.includes(ctx.goal.type)) return refuse('G3_GOAL', ctx.goal.type);
  if (a === 'HILLS' && ctx.terrain?.hills !== true) return refuse('N_TERRAIN_UNDECLARED', 'hills');

  // §X : LONG ⇒ EASY seulement ; UNKNOWN ⇒ aucune séance HIGH_DEMAND ; MODERATE ⇒ sévère seulement après levée (V25).
  const state = ctx.returnState.state;
  if (state === 'LONG' || state === 'UNKNOWN') return refuse('X_RETURN_STATE', state);
  if (state === 'MODERATE' && a !== 'THRESHOLD') {
    const r = returnLifted(ctx, g.parameters, ctx.mode);
    reasons.push(...r.reasons);
    used.push(RESUME);
    if (!r.lifted) return refuse('X_RETURN_NOT_LIFTED', state);
  }

  // V10 : densité de séances HIGH_DEMAND sur la fenêtre du registre, par population (la séance proposée comprise).
  const density = resolveParameter(g.parameters, V10, ctx.mode);
  reasons.push(...density.reasons);
  const dv = density.status === 'resolved' ? density.value as Record<string, unknown> : undefined;
  const perDays = dv?.perDays;
  const cap = dv?.[ctx.population.level];
  if (typeof perDays !== 'number' || !(perDays > 0) || typeof cap !== 'number' || !(cap >= 0)) return refuse('V10_UNRESOLVED', V10);
  used.push(V10);
  const nowDay = dayOf(g.now);
  const recentHd = ctx.sessionHistory.filter((s) => isHighDemand(s) && s.completedAt <= g.now && nowDay - dayOf(s.completedAt) < perDays).length;
  if (recentHd + 1 > cap) return refuse('V10_DENSITY', `${String(recentHd)}/${String(cap)}`);

  // V11 : jamais deux jours consécutifs à forte demande (la veille ou le jour même).
  const sep = resolveParameter(g.parameters, V11, ctx.mode);
  reasons.push(...sep.reasons);
  if (sep.status !== 'resolved' || (sep.value as { default?: unknown }).default !== 'NO_CONSECUTIVE_HIGH_DEMAND_DAYS') return refuse('V11_UNRESOLVED', V11);
  used.push(V11);
  if (ctx.sessionHistory.some((s) => isHighDemand(s) && s.completedAt <= g.now && nowDay - dayOf(s.completedAt) <= 1)) return refuse('V11_CONSECUTIVE', 'HIGH_DEMAND');

  return { ok: true, reasons, parameterIds: used };
}
