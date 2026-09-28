/**
 * Modèle de références (5A §E, arbitrage 5B §E) et `RunningReferenceConfidence` : confiance dans une
 * référence POUR UNE DÉCISION DONNÉE. Représentation et sélection seulement : AUCUNE formule de
 * conversion entre distances (le modèle de performance est une interface séparée, sans modèle éligible).
 *
 * Confiance = MINIMUM des facteurs (5G) : plafond du type, récence (V12), conditions exigées pour HIGH
 * (5B : protocole déclaré, conditions normales, pas d'interruption depuis), spécificité à la décision,
 * conflit. Un facteur dont le paramètre n'est pas résolu vaut NONE (fail-closed).
 */
import { z } from 'zod';
import { isISODateTime, toEpochMs } from '@hybridsport/domain';
import type { ISODateTime, ReasonCode } from '@hybridsport/domain';
import { confidenceRank, minConfidence } from './model.js';
import type { ConfidenceLevel, RunningMode } from './model.js';
import { RUNNING_CODES, runningReasons } from './codes.js';
import { resolveParameter } from './governance/parameters.js';
import type { RunningParameter } from './governance/parameters.js';

/** Types de référence (5B §E ; la récence n'est pas dans le nom : elle est évaluée). */
export const REFERENCE_TYPES = [
  'RACE_RESULT', 'TIME_TRIAL', 'CRITICAL_SPEED_TEST', 'LAB_THRESHOLD', 'FIELD_THRESHOLD', 'VMA_TEST', 'VO2MAX_TEST',
  'TRAINING_OBSERVATION', 'RPE_BASED', 'CALIBRATION_RESULT', 'USER_DECLARED',
] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

/** Décisions pour lesquelles une référence peut servir (la confiance dépend de la décision). */
export const REFERENCE_DECISIONS = ['INTENSITY_TARGETING', 'THRESHOLD_BOUNDARY', 'SEVERE_DOMAIN', 'RACE_SPECIFIC_PACE', 'CURRENT_TOLERANCE'] as const;
export type ReferenceDecision = (typeof REFERENCE_DECISIONS)[number];

const instant = z.string().refine(isISODateTime, 'instant ISO attendu');
const pos = z.number().positive();

export const zRunningReference = z.object({
  referenceId: z.string().min(1),
  type: z.enum(REFERENCE_TYPES),
  values: z.object({
    distanceM: pos.optional(),
    durationS: pos.optional(),
    speedMps: pos.optional(),
    paceSecPerKm: pos.optional(),
    rpe: z.number().nonnegative().optional(),
    vo2MlKgMin: pos.optional(),
    trials: z.number().int().positive().optional(),
  }).strict(),
  date: instant,
  provenance: z.object({
    source: z.enum(['USER_DECLARED', 'APP_RECORDED', 'IMPORTED', 'LAB', 'COACH']),
    protocol: z.string().min(1).optional(),
    /** Définition mesurée (LT1, LT2, VT1, VT2, MLSS) ou modèle déclaré (CS). */
    method: z.string().min(1).optional(),
  }).strict(),
  confidenceInputs: z.object({
    protocolDeclared: z.boolean(),
    maximalEffortDeclared: z.boolean().optional(),
    conditions: z.enum(['NORMAL', 'ATYPICAL', 'UNKNOWN']),
    interruptionSince: z.enum(['NONE', 'YES', 'UNKNOWN']),
  }).strict(),
  rulesetVersion: z.string().min(1).optional(),
}).strict().superRefine((r, ctx) => {
  const v = r.values;
  const need = (ok: boolean, what: string) => { if (!ok) ctx.addIssue({ code: 'custom', message: `${r.type} : ${what} requis`, path: ['values'] }); };
  switch (r.type) {
    case 'RACE_RESULT': case 'TIME_TRIAL': need(v.distanceM !== undefined && v.durationS !== undefined, 'distance et durée'); break;
    case 'CRITICAL_SPEED_TEST': need(v.speedMps !== undefined && v.trials !== undefined, 'vitesse et nombre d’essais'); need(r.provenance.method !== undefined, 'modèle déclaré'); break;
    case 'LAB_THRESHOLD': case 'FIELD_THRESHOLD': need(v.speedMps !== undefined || v.paceSecPerKm !== undefined, 'vitesse ou allure'); need(r.provenance.method !== undefined, 'définition mesurée'); break;
    case 'VMA_TEST': need(v.speedMps !== undefined, 'vitesse'); break;
    case 'VO2MAX_TEST': need(v.vo2MlKgMin !== undefined, 'VO2'); break;
    case 'TRAINING_OBSERVATION': need(v.durationS !== undefined, 'durée'); break;
    case 'RPE_BASED': need(v.rpe !== undefined && v.durationS !== undefined, 'RPE et durée'); break;
    case 'CALIBRATION_RESULT': need(v.durationS !== undefined && (v.distanceM !== undefined || v.rpe !== undefined), 'durée et distance ou RPE'); break;
    case 'USER_DECLARED': need((v.distanceM !== undefined && v.durationS !== undefined) || v.paceSecPerKm !== undefined, 'performance ou allure'); break;
  }
});
export type RunningReference = z.infer<typeof zRunningReference>;

export interface ConfidenceFactor { readonly factor: 'TYPE_CAP' | 'RECENCY' | 'HIGH_CONDITIONS' | 'SPECIFICITY' | 'CONFLICT'; readonly level: ConfidenceLevel; readonly cause: string }

/** Confiance dans une référence pour une décision (distincte de la confiance de prescription). */
export interface ReferenceConfidence {
  readonly referenceId: string;
  readonly decision: ReferenceDecision;
  readonly level: ConfidenceLevel;
  readonly factors: readonly ConfidenceFactor[];
}

const isConfidence = (x: unknown): x is ConfidenceLevel => typeof x === 'string' && (['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const).includes(x as ConfidenceLevel);
// technical-constant: conversion d'unités (ms → semaines)
export const MS_PER_WEEK = 7 * 24 * 3600 * 1000;
// technical-constant: conversion d'unités (m/km)
const METERS_PER_KM = 1000;

/** Allure comparable (s/km) d'une référence de performance, si elle est calculable (arithmétique, pas un modèle). */
export function performancePace(r: RunningReference): number | undefined {
  const v = r.values;
  if (v.paceSecPerKm !== undefined) return v.paceSecPerKm;
  if (v.distanceM !== undefined && v.durationS !== undefined) return (v.durationS * METERS_PER_KM) / v.distanceM;
  if (v.speedMps !== undefined) return METERS_PER_KM / v.speedMps;
  return undefined;
}

/** Types utilisables par décision (5B §E « peut estimer / ne peut pas estimer »). */
export const USABLE_FOR: Readonly<Record<ReferenceDecision, readonly ReferenceType[]>> = {
  INTENSITY_TARGETING: ['RACE_RESULT', 'TIME_TRIAL', 'CRITICAL_SPEED_TEST', 'LAB_THRESHOLD', 'FIELD_THRESHOLD', 'TRAINING_OBSERVATION', 'CALIBRATION_RESULT', 'USER_DECLARED'],
  THRESHOLD_BOUNDARY: ['CRITICAL_SPEED_TEST', 'LAB_THRESHOLD', 'FIELD_THRESHOLD', 'RACE_RESULT', 'TIME_TRIAL'],
  SEVERE_DOMAIN: ['VMA_TEST', 'RACE_RESULT', 'TIME_TRIAL', 'CRITICAL_SPEED_TEST'],
  // Allure spécifique : seulement une performance à la MÊME distance (sinon un modèle est requis).
  RACE_SPECIFIC_PACE: ['RACE_RESULT', 'TIME_TRIAL'],
  CURRENT_TOLERANCE: ['TRAINING_OBSERVATION', 'RPE_BASED', 'CALIBRATION_RESULT'],
};

export interface ConfidenceContext {
  readonly now: ISODateTime;
  readonly mode: RunningMode;
  readonly parameters: readonly RunningParameter[];
  /** Distance visée (décision RACE_SPECIFIC_PACE). */
  readonly targetDistanceM?: number;
}

/** Confiance d'une référence pour une décision, avec les facteurs et les raisons de résolution. */
export function referenceConfidence(r: RunningReference, decision: ReferenceDecision, c: ConfidenceContext, conflict?: ConfidenceFactor): { confidence: ReferenceConfidence; reasons: readonly ReasonCode[] } {
  const reasons: ReasonCode[] = [];
  const factors: ConfidenceFactor[] = [];
  // 1. Plafond du type (paramètre ordinal gouverné).
  const caps = resolveParameter(c.parameters, 'running.reference.typeConfidenceCaps', c.mode);
  reasons.push(...caps.reasons);
  if (caps.status === 'unresolved') factors.push({ factor: 'TYPE_CAP', level: 'NONE', cause: `PARAMETER_${caps.cause}` });
  else {
    const raw = (caps.value as Record<string, unknown>)[r.type];
    const cap = isConfidence(raw) ? raw : raw !== null && typeof raw === 'object' ? (decision === 'INTENSITY_TARGETING' || decision === 'RACE_SPECIFIC_PACE' ? (raw as Record<string, unknown>).pace : (raw as Record<string, unknown>).default) : undefined;
    factors.push(isConfidence(cap) ? { factor: 'TYPE_CAP', level: cap, cause: r.type } : { factor: 'TYPE_CAP', level: 'NONE', cause: 'CAP_UNDEFINED_FOR_TYPE' });
  }
  // 2. Récence (V12 : bandes et plafond ordinal par bande).
  const bands = resolveParameter(c.parameters, 'running.reference.recencyBands', c.mode);
  reasons.push(...bands.reasons);
  const ageWeeks = (toEpochMs(c.now) - toEpochMs(r.date as ISODateTime)) / MS_PER_WEEK;
  if (ageWeeks < 0) factors.push({ factor: 'RECENCY', level: 'NONE', cause: 'FUTURE_DATE' });
  else if (bands.status === 'unresolved') factors.push({ factor: 'RECENCY', level: 'NONE', cause: `PARAMETER_${bands.cause}` });
  else {
    const b = bands.value as { recentMaxWeeks?: unknown; agingMaxWeeks?: unknown; confidenceCapByBand?: Record<string, unknown> };
    const band = typeof b.recentMaxWeeks === 'number' && typeof b.agingMaxWeeks === 'number'
      ? (ageWeeks <= b.recentMaxWeeks ? 'RECENT' : ageWeeks <= b.agingMaxWeeks ? 'AGING' : 'STALE')
      : undefined;
    const cap = band !== undefined ? b.confidenceCapByBand?.[band] : undefined;
    factors.push(band !== undefined && isConfidence(cap) ? { factor: 'RECENCY', level: cap, cause: band } : { factor: 'RECENCY', level: 'NONE', cause: 'PARAMETER_MALFORMED' });
    if (band === 'STALE') reasons.push(runningReasons.emit(RUNNING_CODES.REFERENCE_STALE, { referenceId: r.referenceId }));
  }
  // 3. Conditions exigées pour HIGH (5B) : protocole déclaré, conditions normales, pas d'interruption.
  const i = r.confidenceInputs;
  const highOk = i.protocolDeclared && i.conditions === 'NORMAL' && i.interruptionSince === 'NONE';
  factors.push({ factor: 'HIGH_CONDITIONS', level: highOk ? 'HIGH' : 'MEDIUM', cause: highOk ? 'MET' : 'NOT_MET' });
  // 4. Spécificité à la décision.
  if (!USABLE_FOR[decision].includes(r.type)) factors.push({ factor: 'SPECIFICITY', level: 'NONE', cause: 'TYPE_NOT_USABLE_FOR_DECISION' });
  else if (decision === 'RACE_SPECIFIC_PACE' && (c.targetDistanceM === undefined || r.values.distanceM !== c.targetDistanceM)) factors.push({ factor: 'SPECIFICITY', level: 'NONE', cause: 'DISTANCE_MISMATCH_MODEL_REQUIRED' });
  else factors.push({ factor: 'SPECIFICITY', level: 'HIGH', cause: 'USABLE' });
  if (conflict) factors.push(conflict);
  return { confidence: { referenceId: r.referenceId, decision, level: minConfidence(factors.map((f) => f.level)), factors }, reasons };
}

export interface ReferenceConflict { readonly referenceIds: readonly string[]; readonly severity: 'MAJOR_PENDING_VARIABILITY'; readonly cause: string }

/**
 * Conflits entre références comparables (même type de performance, même distance, allures différentes).
 * La gravité (V43) se mesure en multiples de l'estimation de variabilité (V42, E-VARIABILITY en attente) :
 * tant qu'elle n'est pas décidée, TOUTE discordance est traitée comme MAJOR (5E), jamais ignorée.
 */
export function detectConflicts(refs: readonly RunningReference[]): readonly ReferenceConflict[] {
  const groups = new Map<string, RunningReference[]>();
  for (const r of refs) {
    if (!(r.type === 'RACE_RESULT' || r.type === 'TIME_TRIAL') || r.values.distanceM === undefined) continue;
    const k = String(r.values.distanceM);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const out: ReferenceConflict[] = [];
  for (const [k, g] of [...groups.entries()].sort(([a], [b]) => Number(a) - Number(b))) {
    const paces = new Set(g.map(performancePace));
    if (g.length > 1 && paces.size > 1) out.push({ referenceIds: g.map((r) => r.referenceId).sort(), severity: 'MAJOR_PENDING_VARIABILITY', cause: `DISCORDANT_PERFORMANCES_${k}M` });
  }
  return out;
}

export interface ReferenceSelection {
  readonly decision: ReferenceDecision;
  readonly selected?: RunningReference;
  readonly confidence: ConfidenceLevel;
  readonly candidates: readonly ReferenceConfidence[];
  readonly conflicts: readonly ReferenceConflict[];
  readonly calibrationRequired: boolean;
  readonly reasons: readonly ReasonCode[];
}

/**
 * Sélection déterministe pour une décision : références de confiance NONE rejetées (avec cause) ;
 * puis confiance la plus haute ; en cas de conflit MAJOR, la référence la plus PRUDENTE (allure la plus
 * lente) et une calibration demandée ; départage stable (date la plus récente, puis identifiant).
 */
export function selectReference(refs: readonly RunningReference[], decision: ReferenceDecision, c: ConfidenceContext): ReferenceSelection {
  const conflicts = detectConflicts(refs);
  const inConflict = new Set(conflicts.flatMap((x) => x.referenceIds));
  const reasons: ReasonCode[] = conflicts.map((x) => runningReasons.emit(RUNNING_CODES.REFERENCE_CONFLICT, { referenceIds: [...x.referenceIds], severity: x.severity, cause: x.cause }));
  const scored = [...refs].sort((a, b) => (a.referenceId < b.referenceId ? -1 : a.referenceId > b.referenceId ? 1 : 0)).map((r) => {
    const conflictFactor: ConfidenceFactor | undefined = inConflict.has(r.referenceId) ? { factor: 'CONFLICT', level: 'LOW', cause: 'MAJOR_PENDING_VARIABILITY' } : undefined;
    const res = referenceConfidence(r, decision, c, conflictFactor);
    reasons.push(...res.reasons);
    return { r, conf: res.confidence };
  });
  const usable = scored.filter((s) => s.conf.level !== 'NONE');
  for (const s of scored) {
    if (s.conf.level === 'NONE') reasons.push(runningReasons.emit(RUNNING_CODES.REFERENCE_REJECTED, { referenceId: s.r.referenceId, decision, cause: s.conf.factors.filter((f) => f.level === 'NONE').map((f) => `${f.factor}:${f.cause}`).join(',') }));
  }
  const calibrationRequired = conflicts.length > 0;
  if (calibrationRequired) reasons.push(runningReasons.emit(RUNNING_CODES.CALIBRATION_REQUIRED, { cause: 'REFERENCE_CONFLICT' }));
  if (usable.length === 0) {
    reasons.push(runningReasons.emit(RUNNING_CODES.REFERENCE_MISSING, { decision }));
    return { decision, confidence: 'NONE', candidates: scored.map((s) => s.conf), conflicts, calibrationRequired, reasons };
  }
  const best = usable.reduce((m, s) => Math.max(m, confidenceRank(s.conf.level)), 0);
  const top = usable.filter((s) => confidenceRank(s.conf.level) === best);
  const prudent = (a: (typeof top)[number], b: (typeof top)[number]): number => {
    if (calibrationRequired) {
      const pa = performancePace(a.r) ?? 0;
      const pb = performancePace(b.r) ?? 0;
      if (pa !== pb) return pb - pa; // allure la plus lente d'abord
    }
    const ta = toEpochMs(a.r.date as ISODateTime);
    const tb = toEpochMs(b.r.date as ISODateTime);
    if (ta !== tb) return tb - ta;
    return a.r.referenceId < b.r.referenceId ? -1 : 1;
  };
  const [chosen] = [...top].sort(prudent);
  if (!chosen) {
    reasons.push(runningReasons.emit(RUNNING_CODES.REFERENCE_MISSING, { decision }));
    return { decision, confidence: 'NONE', candidates: scored.map((s) => s.conf), conflicts, calibrationRequired, reasons };
  }
  reasons.push(runningReasons.emit(RUNNING_CODES.REFERENCE_SELECTED, { referenceId: chosen.r.referenceId, decision, level: chosen.conf.level }));
  if (confidenceRank(chosen.conf.level) <= confidenceRank('LOW')) {
    reasons.push(runningReasons.emit(RUNNING_CODES.REFERENCE_LOW_CONFIDENCE, { referenceId: chosen.r.referenceId, decision, level: chosen.conf.level, factors: chosen.conf.factors.filter((f) => f.level === chosen.conf.level).map((f) => f.factor) }));
  }
  return { decision, selected: chosen.r, confidence: chosen.conf.level, candidates: scored.map((s) => s.conf), conflicts, calibrationRequired, reasons };
}
