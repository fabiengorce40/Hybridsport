import { DISCIPLINES, REPETITION_INTENT_KINDS, SIMILARITY_COMPONENTS, hoursBetween } from '@hybridsport/domain';
import type {
  DuplicateClassification, FingerprintHistoryEntry, ISODateTime, ReasonCode, RepetitionIntent, SessionFingerprint, SimilarityComponent,
} from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { RulesetParameterError } from '../rules/errors.js';

const reasons = createCoreRegistry();

/** Paramètres de l'anti-doublon, tous lus dans le ruleset (aucune valeur par défaut dans le CORE). */
export interface DuplicateParams {
  readonly windowDays: number;
  readonly weights: Readonly<Record<SimilarityComponent, number>>;
  readonly thresholds: { readonly warn: number; readonly strong: number };
  readonly exerciseLevels: { readonly exercise: number; readonly equivalence: number; readonly family: number };
  readonly stimulusNeighbors: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly intentPolicy: Readonly<Record<RepetitionIntent['kind'], { readonly covers: readonly SimilarityComponent[]; readonly requiresEvolution: boolean }>>;
  readonly penalties: Readonly<Record<DuplicateClassification, number>>;
}

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const isUnit = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
const isComponentWeights = (v: unknown): v is Record<SimilarityComponent, number> =>
  isRecord(v) && SIMILARITY_COMPONENTS.every((c) => typeof v[c] === 'number' && Number.isFinite(v[c]) && (v[c] as number) >= 0);
const isWeightTable = (v: unknown): v is Record<string, Record<SimilarityComponent, number>> =>
  isRecord(v) && Object.keys(v).every((k) => (DISCIPLINES as readonly string[]).includes(k)) && Object.values(v).every(isComponentWeights);
const isNeighbors = (v: unknown): v is Record<string, Record<string, number>> => isRecord(v) && Object.values(v).every((row) => isRecord(row) && Object.values(row).every(isUnit));
const isIntentPolicy = (v: unknown): v is DuplicateParams['intentPolicy'] =>
  isRecord(v) && REPETITION_INTENT_KINDS.every((k) => {
    const p = v[k];
    return isRecord(p) && typeof p.requiresEvolution === 'boolean' && Array.isArray(p.covers) && p.covers.every((c) => (SIMILARITY_COMPONENTS as readonly string[]).includes(c as string));
  });

function unitRecord(id: string, r: Record<string, number>, keys: readonly string[]): Record<string, number> {
  for (const k of keys) if (!isUnit(r[k])) throw new RulesetParameterError(id, 'type', `${k} ∈ [0, 1]`);
  return r;
}

/** Lit et vérifie les paramètres de l'anti-doublon pour une discipline. */
export function readDuplicateParams(ruleset: LoadedRuleset, discipline: SessionFingerprint['discipline']): DuplicateParams {
  const weights = ruleset.table('duplicate.weights', isWeightTable, 'Record<discipline, Record<composante, poids ≥ 0>>')[discipline];
  if (!weights) throw new RulesetParameterError('duplicate.weights', 'type', `poids pour ${discipline}`);
  const t = unitRecord('duplicate.thresholds', ruleset.numberRecord('duplicate.thresholds'), ['warn', 'strong']);
  const warn = t.warn ?? Number.NaN;
  const strong = t.strong ?? Number.NaN;
  if (!(warn <= strong)) throw new RulesetParameterError('duplicate.thresholds', 'type', 'warn ≤ strong');
  const lv = unitRecord('duplicate.exerciseLevelWeights', ruleset.numberRecord('duplicate.exerciseLevelWeights'), ['exercise', 'equivalence', 'family']);
  const pen = ruleset.numberRecord('duplicate.penalties');
  for (const k of ['accidental_warn', 'accidental_strong'] as const) if (!(typeof pen[k] === 'number' && (pen[k] ?? Number.NaN) >= 0)) throw new RulesetParameterError('duplicate.penalties', 'type', `${k} ≥ 0`);
  const windowDays = ruleset.number('duplicate.windowDays');
  if (!(windowDays >= 0)) throw new RulesetParameterError('duplicate.windowDays', 'type', '≥ 0');
  return {
    windowDays, weights, thresholds: { warn, strong },
    exerciseLevels: { exercise: lv.exercise ?? Number.NaN, equivalence: lv.equivalence ?? Number.NaN, family: lv.family ?? Number.NaN },
    stimulusNeighbors: ruleset.table('duplicate.stimulusNeighbors', isNeighbors, 'Record<stimulus, Record<stimulus, [0,1]>>'),
    intentPolicy: ruleset.table('duplicate.intentPolicy', isIntentPolicy, 'Record<intention, { covers, requiresEvolution }>'),
    penalties: { none: 0, planned: 0, accidental_warn: pen.accidental_warn ?? Number.NaN, accidental_strong: pen.accidental_strong ?? Number.NaN },
  };
}

// ——— Composantes (mesures mathématiques ; aucune valeur sportive) ———

function jaccard(a: readonly string[], b: readonly string[]): number | null {
  const sa = new Set(a);
  const sb = new Set(b);
  const union = new Set([...sa, ...sb]);
  if (union.size === 0) return null;
  return [...sa].filter((x) => sb.has(x)).length / union.size;
}

function cosine(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): number | null {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0; let na = 0; let nb = 0;
  for (const k of keys) { const x = a[k] ?? 0; const y = b[k] ?? 0; dot += x * y; na += x * x; nb += y * y; }
  if (na === 0 || nb === 0) return null;
  return Math.min(1, dot / Math.sqrt(na * nb));
}

const mean = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
const indicator = (b: boolean): number => (b ? 1 : 0);

function structureSimilarity(a: SessionFingerprint['structure'], b: SessionFingerprint['structure']): number | null {
  const n = Math.max(a.length, b.length);
  if (n === 0) return null;
  const per = Array.from({ length: n }, (_, i) => {
    const x = a[i]; const y = b[i];
    if (!x || !y) return 0;
    const hi = Math.max(x.durationS, y.durationS);
    const ratio = hi === 0 ? 1 : Math.min(x.durationS, y.durationS) / hi;
    return mean([indicator(x.kind === y.kind), indicator(x.format === y.format), ratio]);
  });
  return mean(per);
}

function formatSimilarity(a: SessionFingerprint, b: SessionFingerprint): number | null {
  const fields = (['format', 'timeDomain', 'repScheme'] as const).filter((f) => a[f] !== undefined || b[f] !== undefined);
  if (fields.length === 0) return null;
  return mean(fields.map((f) => indicator(a[f] === b[f])));
}

export type SimilarityBreakdown = Readonly<Record<SimilarityComponent, number | null>>;

/** Détail par composante (null = non comparable, exclu du score). Toujours conservé (spec 07 §4). */
export function similarityBreakdown(a: SessionFingerprint, b: SessionFingerprint, p: Pick<DuplicateParams, 'exerciseLevels' | 'stimulusNeighbors'>): SimilarityBreakdown {
  const levels = [
    [p.exerciseLevels.exercise, jaccard(a.exercises, b.exercises)],
    [p.exerciseLevels.equivalence, jaccard(a.equivalences, b.equivalences)],
    [p.exerciseLevels.family, jaccard(a.families, b.families)],
  ] as const;
  const available = levels.filter((l): l is readonly [number, number] => l[1] !== null);
  const neighbor = p.stimulusNeighbors[a.stimulus]?.[b.stimulus] ?? p.stimulusNeighbors[b.stimulus]?.[a.stimulus] ?? 0;
  // technical-constant: distance de variation totale = demi-somme des écarts absolus (normalisation mathématique)
  const HALF = 0.5;
  return {
    exercise: available.length === 0 ? null : Math.max(...available.map(([w, j]) => w * j)),
    movement: cosine(a.patterns, b.patterns),
    muscle: cosine(a.muscles, b.muscles),
    structure: structureSimilarity(a.structure, b.structure),
    stimulus: a.stimulus === b.stimulus ? 1 : neighbor,
    energy: 1 - HALF * (Math.abs(a.energy.low - b.energy.low) + Math.abs(a.energy.moderate - b.energy.moderate) + Math.abs(a.energy.high - b.energy.high)),
    format: formatSimilarity(a, b),
  };
}

// ——— Intentions ———

export function intentKey(i: RepetitionIntent): string {
  switch (i.kind) {
    case 'progression_anchor': return `progression_anchor:${i.trackId}`;
    case 'progression_series': return `progression_series:${i.seriesId}`;
    case 'benchmark_retest': return `benchmark_retest:${i.benchmarkId}`;
    case 'recurring_slot': return `recurring_slot:${i.slotKey}`;
    case 'deload_mirror': return `deload_mirror:${i.ofSessionId}`;
  }
}

function matches(declared: RepetitionIntent, entry: FingerprintHistoryEntry): boolean {
  if (declared.kind === 'deload_mirror') return entry.fingerprint.sessionId === declared.ofSessionId;
  return entry.repetitionIntents.some((i) => intentKey(i) === intentKey(declared));
}

function evolved(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].some((k) => a[k] !== b[k]);
}

// ——— Analyse ———

export interface DuplicateComparison {
  readonly sessionId: string;
  readonly at: string;
  readonly status: FingerprintHistoryEntry['status'];
  readonly breakdown: SimilarityBreakdown;
  /** Similarité toutes composantes. */
  readonly similarity: number;
  /** Similarité sur les composantes NON couvertes par une intention déclarée. */
  readonly accidentalSimilarity: number;
  readonly matchedIntents: readonly string[];
  readonly coveredComponents: readonly SimilarityComponent[];
  readonly sameContext: boolean;
  readonly classification: DuplicateClassification;
}

export interface DuplicateReport {
  readonly comparisons: readonly DuplicateComparison[];
  readonly maxSimilarity: number;
  readonly classification: DuplicateClassification;
  readonly stagnation: readonly { readonly sessionId: string; readonly intent: string }[];
  /** Pénalité SOFT à retrancher de B6 (variété) — jamais une exclusion (pas de HARD par défaut, V1.1). */
  readonly penalty: number;
  readonly reasons: readonly ReasonCode[];
}

const SEVERITY: readonly DuplicateClassification[] = ['none', 'planned', 'accidental_warn', 'accidental_strong'];
const worst = (xs: readonly DuplicateClassification[]): DuplicateClassification =>
  xs.reduce<DuplicateClassification>((w, c) => (SEVERITY.indexOf(c) > SEVERITY.indexOf(w) ? c : w), 'none');

/**
 * DuplicateDetectionEngine (spec 07 §4) — responsabilité COMMUNE, jamais réimplémentée par un moteur.
 * `declaredIntents` provient de l'intention de séance fixée AVANT la génération (planificateur) : le
 * moteur de discipline ne peut pas en ajouter après coup pour « excuser » une similarité.
 * Historique absent ⇒ rien à comparer, aucune erreur. Pure et déterministe (instant injecté).
 */
export function analyzeDuplicates(candidate: SessionFingerprint, history: readonly FingerprintHistoryEntry[], declaredIntents: readonly RepetitionIntent[], ruleset: LoadedRuleset, now: ISODateTime): DuplicateReport {
  const p = readDuplicateParams(ruleset, candidate.discipline);
  // technical-constant: conversion jours → heures
  const HOURS_PER_DAY = 24;
  const windowH = p.windowDays * HOURS_PER_DAY;
  const totalWeight = (b: SimilarityBreakdown, keep: (c: SimilarityComponent) => boolean): number =>
    SIMILARITY_COMPONENTS.filter((c) => b[c] !== null && keep(c)).reduce((s, c) => s + p.weights[c] * (b[c] ?? 0), 0);

  const relevant = history
    .filter((h) => h.fingerprint.sessionId !== candidate.sessionId && h.fingerprint.discipline === candidate.discipline)
    .filter((h) => Math.abs(hoursBetween(h.at, now)) <= windowH)
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.fingerprint.sessionId < b.fingerprint.sessionId ? -1 : 1));

  const comparisons: DuplicateComparison[] = [];
  const stagnation: { sessionId: string; intent: string }[] = [];
  const out: ReasonCode[] = [];
  for (const h of relevant) {
    const breakdown = similarityBreakdown(candidate, h.fingerprint, p);
    const denom = SIMILARITY_COMPONENTS.filter((c) => breakdown[c] !== null).reduce((s, c) => s + p.weights[c], 0);
    const matched = declaredIntents.filter((i) => matches(i, h));
    const covered = [...new Set(matched.flatMap((i) => p.intentPolicy[i.kind].covers))].sort();
    const similarity = denom > 0 ? totalWeight(breakdown, () => true) / denom : 0;
    const accidentalSimilarity = denom > 0 ? totalWeight(breakdown, (c) => !covered.includes(c)) / denom : 0;
    const classification: DuplicateClassification = accidentalSimilarity >= p.thresholds.strong ? 'accidental_strong'
      : accidentalSimilarity >= p.thresholds.warn ? 'accidental_warn'
      : matched.length > 0 ? 'planned' : 'none';
    const keys = matched.map(intentKey).sort();
    comparisons.push({
      sessionId: h.fingerprint.sessionId, at: h.at, status: h.status, breakdown, similarity, accidentalSimilarity,
      matchedIntents: keys, coveredComponents: covered, sameContext: candidate.contextKey !== undefined && candidate.contextKey === h.fingerprint.contextKey, classification,
    });
    if (classification === 'accidental_warn' || classification === 'accidental_strong') {
      out.push(reasons.emit('DUPLICATE.ACCIDENTAL', { sessionId: h.fingerprint.sessionId, similarity: accidentalSimilarity, level: classification }));
    } else if (classification === 'planned') {
      out.push(reasons.emit('DUPLICATE.PLANNED', { sessionId: h.fingerprint.sessionId, intents: keys }));
    }
    // Répétition prévue : une évolution de prescription est exigée, sauf justification (retest, décharge…)
    for (const i of matched) {
      if (p.intentPolicy[i.kind].requiresEvolution && !evolved(candidate.prescriptionMarkers, h.fingerprint.prescriptionMarkers)) {
        stagnation.push({ sessionId: h.fingerprint.sessionId, intent: intentKey(i) });
        out.push(reasons.emit('DUPLICATE.PLANNED_BUT_STAGNANT', { sessionId: h.fingerprint.sessionId, intent: intentKey(i) }));
      }
    }
  }
  const classification = worst(comparisons.map((c) => c.classification));
  return {
    comparisons, classification, stagnation, reasons: out,
    maxSimilarity: comparisons.reduce((m, c) => Math.max(m, c.similarity), 0),
    penalty: p.penalties[classification],
  };
}
