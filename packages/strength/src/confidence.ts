/**
 * PrescriptionConfidence ORDINALE (ruleset scientifique V1, addendum 4E §E). Aucune somme pondérée, aucun
 * coefficient : des facteurs qualitatifs tracés (récence, spécificité, observations utilisables, cohérence,
 * incertitude du RIR, conflit, transfert) combinés par des règles versionnées (`rulesVersion`).
 *
 * - HIGH exige TOUTES les conditions : séances et observations suffisantes, données fraîches, estimations
 *   cohérentes, RIR fiable, aucun conflit, aucune donnée transférée. Deux observations ne suffisent jamais
 *   à elles seules.
 * - MEDIUM : au moins une observation utilisable, fraîche ou vieillissante.
 * - LOW : données anciennes, borne inférieure seule, ou déclassement.
 * Les seuils numériques (séances, observations) sont des HEURISTIQUES G2 lues dans le ruleset ; les fenêtres
 * de récence et la tolérance de cohérence réutilisent les paramètres existants `strength.load`.
 */
import type { Level } from '@hybridsport/domain';
import type { StrengthParams } from './params.js';
import { daysBetween, median } from './util.js';

export const CONFIDENCE_ORDER = ['none', 'low', 'medium', 'high'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_ORDER)[number];
export const notchConfidence = (c: ConfidenceLevel, d: number): ConfidenceLevel =>
  CONFIDENCE_ORDER[Math.max(0, Math.min(CONFIDENCE_ORDER.length - 1, CONFIDENCE_ORDER.indexOf(c) + d))] ?? 'none';
const minConfidence = (a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel => (CONFIDENCE_ORDER.indexOf(a) <= CONFIDENCE_ORDER.indexOf(b) ? a : b);

export type Recency = 'fresh' | 'aging' | 'old' | 'expired';

export interface MeasuredObservation {
  /** e1RM estimé de la série (formule générique de repli). */
  readonly value: number;
  readonly at: string;
  readonly withRir: boolean;
}

export interface ConfidenceFactors {
  readonly recency: Recency;
  readonly observations: number;
  readonly sessions: number;
  readonly consistency: 'consistent' | 'inconsistent';
  readonly rir: 'reliable' | 'uncertain';
  readonly conflict: boolean;
  readonly transfer: boolean;
  readonly source: 'measured' | 'declared' | 'lower_bound' | 'none';
}

export interface ConfidenceAssessment {
  readonly level: ConfidenceLevel;
  readonly factors: ConfidenceFactors;
  readonly rulesVersion: string;
}

type Rules = NonNullable<StrengthParams['strength.prescriptionConfidence']>;

export function recencyOf(asOf: string, now: string, params: StrengthParams): Recency {
  const w = params['strength.load'].referenceWindowsDays;
  const days = daysBetween(asOf, now);
  if (days > w.low) return 'expired';
  if (days > w.medium) return 'old';
  if (days > w.high) return 'aging';
  return 'fresh';
}

/** Confiance de données MESURÉES sur l'exercice lui-même. */
export function assessMeasured(obs: readonly MeasuredObservation[], o: { readonly now: string; readonly level: Level; readonly conflict: boolean }, params: StrengthParams, rules: Rules): ConfidenceAssessment {
  const p = params['strength.load'];
  const sorted = [...obs].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const latest = sorted[0]?.at ?? o.now;
  const recency = recencyOf(latest, o.now, params);
  // Observations utilisables : celles de la fenêtre « vieillissante » (au-delà, elles ne décrivent plus l'athlète).
  const usable = sorted.filter((x) => daysBetween(x.at, o.now) <= p.referenceWindowsDays.medium);
  const pool = usable.length > 0 ? usable : sorted;
  const values = pool.map((x) => x.value);
  const mid = median(values) ?? 0;
  const spread = mid > 0 ? (Math.max(...values) - Math.min(...values)) / mid : 0;
  const consistency = spread <= p.conflictTolerance ? 'consistent' : 'inconsistent';
  const rir = pool.every((x) => x.withRir) && !rules.rirUncertainLevels.includes(o.level) ? 'reliable' : 'uncertain';
  const sessions = new Set(pool.map((x) => x.at)).size;
  const factors: ConfidenceFactors = { recency, observations: pool.length, sessions, consistency, rir, conflict: o.conflict, transfer: false, source: 'measured' };
  let level: ConfidenceLevel;
  if (recency === 'expired') level = 'none';
  else if (sessions >= rules.high.minSessions && pool.length >= rules.high.minObservations && recency === 'fresh' && consistency === 'consistent' && rir === 'reliable') level = 'high';
  else if (recency === 'fresh' || recency === 'aging') level = 'medium';
  else level = 'low';
  if (o.conflict && level !== 'none') level = notchConfidence(level, -1);
  return { level, factors, rulesVersion: rules.rulesVersion };
}

/** Confiance d'une capacité DÉCLARÉE : jamais au-dessus du plafond déclaré, dégradée par l'âge et le conflit. */
export function assessDeclared(base: ConfidenceLevel, asOf: string, o: { readonly now: string; readonly conflict: boolean }, params: StrengthParams, rules: Rules): ConfidenceAssessment {
  const recency = recencyOf(asOf, o.now, params);
  const aged = recency === 'expired' ? 'none' : recency === 'old' ? notchConfidence(base, -1 - 1) : recency === 'aging' ? notchConfidence(base, -1) : base;
  const capped = minConfidence(aged, rules.declaredCap);
  const level = o.conflict && capped !== 'none' ? notchConfidence(capped, -1) : capped;
  return { level, factors: { recency, observations: 0, sessions: 0, consistency: 'consistent', rir: 'uncertain', conflict: o.conflict, transfer: false, source: 'declared' }, rulesVersion: rules.rulesVersion };
}

/** Donnée transférée d'un exercice équivalent : pénalité de transfert (paramètre existant), jamais HIGH. */
export function assessTransferred(peer: ConfidenceAssessment, penalty: number): ConfidenceAssessment {
  const level = minConfidence(notchConfidence(peer.level, -penalty), 'medium');
  return { level, factors: { ...peer.factors, transfer: true }, rulesVersion: peer.rulesVersion };
}
