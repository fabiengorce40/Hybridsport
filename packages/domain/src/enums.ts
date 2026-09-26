/**
 * Énumérations du domaine. Chaque énumération est un tableau `as const` (source unique)
 * dont le type est dérivé, afin de pouvoir itérer et valider à l'exécution.
 */
export const DISCIPLINES = ['strength', 'running', 'crosstraining', 'hybrid_race'] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const LEVELS = ['novice', 'beginner', 'intermediate', 'advanced'] as const;
export type Level = (typeof LEVELS)[number];

export const CONFIDENCES = ['high', 'medium', 'low', 'none'] as const;
export type Confidence = (typeof CONFIDENCES)[number];

/** Statut du programme (spec 02 §8). */
export const PROGRAM_STATUSES = ['active', 'paused_safety', 'suspended_scope'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

/** Éligibilité calculée par la couche app selon les règles G1 (spec 09 §8). */
export const ELIGIBILITIES = ['eligible', 'declaration_required', 'suspended', 'excluded'] as const;
export type Eligibility = (typeof ELIGIBILITIES)[number];

/** Lecture de l'état (spec 04 §3.2) : `unknown` n'est jamais assimilé à `normal`. */
export const READINESS_CATEGORIES = ['unknown', 'normal', 'caution', 'reduce'] as const;
export type ReadinessCategory = (typeof READINESS_CATEGORIES)[number];

/** Motifs de saut (spec 02 §6). `pain` et `safety_pause` ne sont jamais des échecs de performance. */
export const SKIP_REASONS = ['time', 'equipment', 'pain', 'safety_pause', 'fatigue', 'other'] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];

/** Motifs de saut qui ne doivent jamais être interprétés comme une baisse de performance. */
export const NON_PERFORMANCE_SKIP_REASONS: readonly SkipReason[] = ['pain', 'safety_pause'];

/** Données disponibles sur l'historique de santé (spec 09 §7.3). */
export const PAIN_HISTORY_AVAILABILITIES = ['available', 'unavailable'] as const;
export type PainHistoryAvailability = (typeof PAIN_HISTORY_AVAILABILITIES)[number];

export const DATA_QUALITIES = ['none', 'sparse', 'adequate'] as const;
export type DataQuality = (typeof DATA_QUALITIES)[number];

/** Nature d'une règle (spec 01 §3). */
export const RULE_NATURES = ['SAFETY', 'FEASIBILITY', 'PROGRAMMING_HEURISTIC', 'PREFERENCE', 'TECHNICAL'] as const;
export type RuleNature = (typeof RULE_NATURES)[number];

/** Niveau d'application (spec 01 §3, 04 §4.1). `inactive` seulement si la politique l'autorise. */
export const ENFORCEMENT_LEVELS = ['hard', 'soft', 'inactive'] as const;
export type EnforcementLevel = (typeof ENFORCEMENT_LEVELS)[number];

/** Classes de gouvernance (spec 09 §4). */
export const GOVERNANCE_CLASSES = ['G1', 'G2', 'G3', 'G4', 'G5'] as const;
export type GovernanceClass = (typeof GOVERNANCE_CLASSES)[number];

export const REVIEW_STATUSES = ['draft', 'reviewed', 'approved', 'deprecated'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Niveau de preuve d'une règle ou d'un paramètre. */
export const EVIDENCE_LEVELS = ['established', 'consensus', 'heuristic', 'provisional'] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

/** Couche A — admissibilité (spec 01 §5). */
export const ADMISSIBILITY_LAYERS = ['A1', 'A2', 'A3', 'A4'] as const;
export type AdmissibilityLayer = (typeof ADMISSIBILITY_LAYERS)[number];

/** Couche B — optimisation (spec 01 §5). */
export const OPTIMIZATION_LEVELS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'] as const;
export type OptimizationLevel = (typeof OPTIMIZATION_LEVELS)[number];

export const DEMAND_LEVELS = ['none', 'low', 'moderate', 'high'] as const;
export type DemandLevel = (typeof DEMAND_LEVELS)[number];

/** Niveaux de douleur (spec 09 §7.2) — architecture seulement, contenus G1 dans le ruleset. */
export const PAIN_LEVELS = ['P1', 'P2', 'P3', 'P4'] as const;
export type PainLevel = (typeof PAIN_LEVELS)[number];

/** Environnement de livraison (matrice de barrières, spec 09 §6). */
export const RELEASE_STAGES = ['local', 'ci', 'staging', 'beta_closed', 'production'] as const;
export type ReleaseStage = (typeof RELEASE_STAGES)[number];

export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

/** Rang ordinal d'une valeur dans une énumération ordonnée. */
export function ordinal<T extends string>(values: readonly T[], value: T): number {
  return values.indexOf(value);
}
