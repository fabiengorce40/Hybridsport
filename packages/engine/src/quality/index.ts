/**
 * Q1 — DIAGNOSTIC DE QUALITÉ d'une prescription déjà composée (contrat GÉNÉRIQUE du CORE).
 *
 *   MOTEUR SPORTIF → PRESCRIPTION → DIAGNOSTIC DE QUALITÉ → PLANIFICATEUR / M3 → EXÉCUTION
 *
 * Le diagnostic LIT une séance ; il ne choisit, ne modifie, ne réécrit et ne remplace rien (aucun exercice, aucune
 * dose, aucune charge, aucune durée, aucun placement). Il n'existe AUCUN score global : le verdict est la conséquence
 * MÉCANIQUE de critères individuels, chacun avec son statut, la BASE de son jugement et ses faits.
 *
 * Base d'un critère (provenance du jugement, jamais un texte libre) :
 * - DERIVED : vérification mathématique ou définitionnelle (cohérence interne, somme, appartenance) ;
 * - APPROVED : règle sportive approuvée (statut `approved`, non provisoire, approbation enregistrée) ;
 * - EXPERT : règle de consensus d'experts non encore approuvée ;
 * - PROVISIONAL : valeur gouvernée non approuvée (hypothèse interne, brouillon) ;
 * - TEST_ONLY / SIMULATION_ONLY : valeur de démonstration déclarée comme telle par l'environnement ;
 * - UNRESOLVED : aucune règle ni valeur.
 * Un critère qui dépend d'une valeur non APPROUVÉE ne peut pas être « démontré » : statut UNRESOLVED, jamais PASS.
 */
import type { ParameterMetadata, SessionDraft } from '@hybridsport/domain';

export const QUALITY_VERDICTS = ['ACCEPTABLE', 'ACCEPTABLE_WITH_WARNINGS', 'BLOCKED', 'UNRESOLVED'] as const;
export type QualityVerdict = (typeof QUALITY_VERDICTS)[number];
export const CRITERION_STATUSES = ['PASS', 'WARNING', 'BLOCKED', 'UNRESOLVED'] as const;
export type CriterionStatus = (typeof CRITERION_STATUSES)[number];
export const QUALITY_BASES = ['DERIVED', 'APPROVED', 'EXPERT', 'PROVISIONAL', 'TEST_ONLY', 'SIMULATION_ONLY', 'UNRESOLVED'] as const;
export type QualityBasis = (typeof QUALITY_BASES)[number];
/** Version du contrat de diagnostic (lecteurs persistés). */
export const QUALITY_SCHEMA = 'q1' as const;

export type QualityFact = string | number | boolean | readonly string[];
export interface QualityCriterion {
  /** Identifiant stable (`duration_coherence`, `dose_coherence`, …). */
  readonly id: string;
  readonly status: CriterionStatus;
  readonly basis: QualityBasis;
  /** Faits CALCULÉS ou LUS (jamais une appréciation). */
  readonly facts: Readonly<Record<string, QualityFact>>;
  /** Raisons machine (jetons stables), jamais un texte libre comme source de vérité. */
  readonly reasons: readonly string[];
}
export interface QualityAssessment {
  readonly schema: typeof QUALITY_SCHEMA;
  readonly verdict: QualityVerdict;
  readonly criteria: readonly QualityCriterion[];
}

/** Bases qui ne démontrent RIEN sur la qualité sportive (valeurs non approuvées ou absentes). */
export const UNPROVEN_BASES: ReadonlySet<QualityBasis> = new Set(['EXPERT', 'PROVISIONAL', 'TEST_ONLY', 'SIMULATION_ONLY', 'UNRESOLVED']);

/**
 * Verdict MÉCANIQUE (aucun score, aucune pondération) : un critère bloquant ⇒ BLOCKED ; sinon un critère non démontré
 * ⇒ UNRESOLVED ; sinon un avertissement ⇒ ACCEPTABLE_WITH_WARNINGS ; sinon ACCEPTABLE. Aucun critère ⇒ UNRESOLVED.
 */
export function verdictOf(criteria: readonly QualityCriterion[]): QualityVerdict {
  if (criteria.length === 0) return 'UNRESOLVED';
  if (criteria.some((c) => c.status === 'BLOCKED')) return 'BLOCKED';
  if (criteria.some((c) => c.status === 'UNRESOLVED')) return 'UNRESOLVED';
  if (criteria.some((c) => c.status === 'WARNING')) return 'ACCEPTABLE_WITH_WARNINGS';
  return 'ACCEPTABLE';
}

export function assessment(criteria: readonly QualityCriterion[]): QualityAssessment {
  // Ordre stable (identifiant) : même prescription ⇒ même diagnostic, octet pour octet.
  const sorted = [...criteria].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { schema: QUALITY_SCHEMA, verdict: verdictOf(sorted), criteria: sorted };
}

/**
 * Surcouche d'ENVIRONNEMENT (déclarée par l'environnement d'exécution, jamais devinée) : une valeur non approuvée
 * utilisée par un environnement de test ou de simulation est classée TEST_ONLY / SIMULATION_ONLY.
 */
export type QualityEnvironment = 'TEST_ONLY' | 'SIMULATION_ONLY' | undefined;

/** Base d'une valeur gouvernée, depuis les SEULS champs structurés du paramètre (statut, provisoire, approbations, source). */
export function basisOfParameter(meta: Pick<ParameterMetadata, 'status' | 'provisional' | 'approvals' | 'source'> | undefined, env: QualityEnvironment = undefined): QualityBasis {
  if (!meta) return 'UNRESOLVED';
  if (meta.status === 'approved' && !meta.provisional && meta.approvals.length > 0) return 'APPROVED';
  if (env) return env;
  return meta.source.kind === 'expert_consensus' ? 'EXPERT' : 'PROVISIONAL';
}

/** Base la plus FAIBLE d'un ensemble (une seule valeur non approuvée suffit à ne rien démontrer). */
const BASIS_ORDER: readonly QualityBasis[] = ['UNRESOLVED', 'TEST_ONLY', 'SIMULATION_ONLY', 'PROVISIONAL', 'EXPERT', 'APPROVED', 'DERIVED'];
export function weakestBasis(bases: readonly QualityBasis[]): QualityBasis {
  if (bases.length === 0) return 'UNRESOLVED';
  return [...bases].sort((a, b) => BASIS_ORDER.indexOf(a) - BASIS_ORDER.indexOf(b))[0] as QualityBasis;
}

/**
 * Critère dont le jugement repose sur des valeurs gouvernées : il n'est démontrable que si TOUTES sont approuvées ET
 * qu'une plage de QUALITÉ approuvée existe. Aucune telle plage n'est modélisée aujourd'hui : UNRESOLVED, faits gardés.
 */
export function governedCriterion(id: string, bases: readonly QualityBasis[], facts: Readonly<Record<string, QualityFact>>, extraReasons: readonly string[] = []): QualityCriterion {
  const basis = weakestBasis(bases);
  return { id, status: 'UNRESOLVED', basis, facts, reasons: [`value_source:${basis}`, 'no_approved_quality_range', ...extraReasons] };
}

/** Durée estimée enregistrée par le CORE (p50 / p90), si disponible. */
export interface RecordedEstimate { readonly availability: string; readonly p50?: number; readonly p90?: number }

/**
 * Critères GÉNÉRIQUES (toutes disciplines), DÉRIVÉS de la séance et de l'estimation du CORE :
 * - `prescription_integrity` : au moins un bloc principal et des items dosés (sinon BLOCKED : donnée invalide) ;
 * - `duration_coherence` : estimation p90 du CORE ≤ temps disponible (contrainte du CORE lui-même) ; estimation
 *   absente ⇒ UNRESOLVED.
 */
export function genericCriteria(session: SessionDraft, estimate: RecordedEstimate | undefined): QualityCriterion[] {
  const main = session.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown');
  const items = main.flatMap((b) => b.items);
  const integrity: QualityCriterion = main.length > 0 && items.length > 0
    ? { id: 'prescription_integrity', status: 'PASS', basis: 'DERIVED', facts: { blocks: session.blocks.length, mainBlocks: main.length, items: items.length }, reasons: ['schema_valid', 'main_content_present'] }
    : { id: 'prescription_integrity', status: 'BLOCKED', basis: 'DERIVED', facts: { blocks: session.blocks.length, mainBlocks: main.length, items: items.length }, reasons: ['insufficient_content'] };
  const available = estimate?.availability === 'AVAILABLE' && estimate.p90 !== undefined;
  const duration: QualityCriterion = !available
    ? { id: 'duration_coherence', status: 'UNRESOLVED', basis: 'UNRESOLVED', facts: { availableTimeS: session.availableTimeS }, reasons: ['duration_estimate_unavailable'] }
    : (estimate.p90 ?? 0) <= session.availableTimeS
      ? { id: 'duration_coherence', status: 'PASS', basis: 'DERIVED', facts: { availableTimeS: session.availableTimeS, targetDurationS: session.targetDurationS, estimatedP50S: Math.round(estimate.p50 ?? 0), estimatedP90S: Math.round(estimate.p90 ?? 0) }, reasons: ['p90_within_available_time'] }
      : { id: 'duration_coherence', status: 'BLOCKED', basis: 'DERIVED', facts: { availableTimeS: session.availableTimeS, estimatedP90S: Math.round(estimate.p90 ?? 0) }, reasons: ['p90_exceeds_available_time'] };
  return [integrity, duration];
}

/** Lecture tolérante d'un diagnostic persisté (forme compacte), jamais recalculée par l'interface. */
export const isBlockingVerdict = (v: QualityVerdict | undefined): boolean => v === 'BLOCKED';
