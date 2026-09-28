/**
 * `RunningPrescriptionConfidence` (5A §AE) et précision de cible : ce qui mesure la PRÉCISION et
 * l'AUTORITÉ d'une prescription, SÉPARÉMENT de la confiance dans une référence et SÉPARÉMENT de
 * l'éligibilité d'une séance. Une confiance faible réduit la précision (effort prioritaire, plages
 * élargies, test proposé) ; elle ne rend JAMAIS une séance inéligible (ce type n'a aucun champ
 * d'éligibilité, par construction).
 */
import type { ReasonCode } from '@hybridsport/domain';
import { minConfidence } from './model.js';
import type { ConfidenceLevel, RunningMode, RunningSessionArchetype } from './model.js';
import { RUNNING_CODES, runningReasons } from './codes.js';
import { resolveParameter } from './governance/parameters.js';
import type { RunningParameter } from './governance/parameters.js';

/** Précision de cible : allure en plage, effort seul, ou sans objet (séance indisponible). */
export const TARGET_PRECISIONS = ['PACE_RANGE', 'EFFORT_ONLY', 'NOT_APPLICABLE'] as const;
export type TargetPrecisionLevel = (typeof TARGET_PRECISIONS)[number];

export const PRECISION_CAUSES = ['PACE_TARGETS_DISABLED', 'REFERENCE_MISSING', 'REFERENCE_CONFIDENCE_INSUFFICIENT', 'PARAMETER_UNRESOLVED', 'NO_WEARABLE', 'EFFORT_BY_NATURE', 'SESSION_UNAVAILABLE'] as const;
export type PrecisionCause = (typeof PRECISION_CAUSES)[number];

export interface TargetPrecision {
  readonly level: TargetPrecisionLevel;
  readonly causes: readonly PrecisionCause[];
  /**
   * Statut de la correspondance effort ↔ domaine (V02, non approuvée) : jamais calculée en vague 1.
   * `resolved-candidate` signifie qu'une valeur candidate existe, pas qu'elle est appliquée.
   */
  readonly effortMapping: { readonly parameterId: string; readonly status: 'unresolved' | 'resolved-candidate' | 'production-eligible' };
  readonly reasons: readonly ReasonCode[];
}

export const PRESCRIPTION_CONSEQUENCES = ['WIDER_RANGES', 'EFFORT_PRIORITY', 'TEST_PROPOSED'] as const;
export type PrescriptionConsequence = (typeof PRESCRIPTION_CONSEQUENCES)[number];

export interface PrescriptionConfidence {
  readonly level: ConfidenceLevel;
  readonly limitingFactors: readonly string[];
  readonly consequences: readonly PrescriptionConsequence[];
}

/** Archétypes ciblés par l'effort par nature (lignes droites : descripteur ; test : effort maximal déclaré). */
const EFFORT_BY_NATURE: readonly RunningSessionArchetype[] = ['STRIDES', 'TEST'];

export interface PrecisionInput {
  readonly archetype: RunningSessionArchetype;
  readonly sessionAvailable: boolean;
  readonly paceTargetsEnabled: boolean;
  readonly wearable: boolean;
  /** Confiance de la référence retenue pour la décision d'intensité (NONE si aucune). */
  readonly referenceConfidence: ConfidenceLevel;
  readonly mode: RunningMode;
  readonly parameters: readonly RunningParameter[];
}

/**
 * Précision de cible. L'allure n'est retenue que si TOUT est réuni : capacité `paceTargets` active,
 * montre disponible, référence retenue, et V03 autorisant une plage pour ce niveau de confiance.
 * Sinon : EFFORT_ONLY, avec TOUTES les causes (jamais une allure fabriquée).
 */
export function targetPrecision(i: PrecisionInput): TargetPrecision {
  const v02 = resolveParameter(i.parameters, 'running.target.rpeByDomain', i.mode);
  const effortMapping = { parameterId: 'running.target.rpeByDomain', status: v02.status === 'unresolved' ? 'unresolved' : v02.candidate ? 'resolved-candidate' : 'production-eligible' } as const;
  if (!i.sessionAvailable) return { level: 'NOT_APPLICABLE', causes: ['SESSION_UNAVAILABLE'], effortMapping, reasons: [] };
  const causes: PrecisionCause[] = [];
  const reasons: ReasonCode[] = [];
  if (EFFORT_BY_NATURE.includes(i.archetype)) causes.push('EFFORT_BY_NATURE');
  if (!i.paceTargetsEnabled) causes.push('PACE_TARGETS_DISABLED');
  if (!i.wearable) causes.push('NO_WEARABLE');
  if (i.referenceConfidence === 'NONE') causes.push('REFERENCE_MISSING');
  else {
    const v03 = resolveParameter(i.parameters, 'running.target.paceRangeWidthByConfidence', i.mode);
    reasons.push(...v03.reasons);
    if (v03.status === 'unresolved') causes.push('PARAMETER_UNRESOLVED');
    else {
      const band = (v03.value as Record<string, unknown>)[i.referenceConfidence];
      if (band === null || band === undefined) causes.push('REFERENCE_CONFIDENCE_INSUFFICIENT');
    }
  }
  if (causes.length === 0) return { level: 'PACE_RANGE', causes: [], effortMapping, reasons };
  if (!(causes.length === 1 && causes[0] === 'EFFORT_BY_NATURE')) {
    reasons.push(runningReasons.emit(RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED, { archetype: i.archetype, precision: 'EFFORT_ONLY', cause: causes.join(',') }));
  }
  return { level: 'EFFORT_ONLY', causes, effortMapping, reasons };
}

/**
 * Confiance de prescription : minimum des facteurs limitants. Elle détermine des CONSÉQUENCES de
 * précision, jamais l'éligibilité.
 */
export function prescriptionConfidence(input: { readonly referenceConfidence: ConfidenceLevel; readonly precision: TargetPrecision; readonly variabilityKnown: boolean }): PrescriptionConfidence {
  const factors: { name: string; level: ConfidenceLevel }[] = [
    { name: 'REFERENCE', level: input.referenceConfidence },
    { name: 'TARGET_PRECISION', level: input.precision.level === 'PACE_RANGE' ? 'HIGH' : 'LOW' },
    { name: 'VARIABILITY', level: input.variabilityKnown ? 'HIGH' : 'MEDIUM' },
  ];
  const level = minConfidence(factors.map((f) => f.level));
  const limitingFactors = factors.filter((f) => f.level === level).map((f) => f.name);
  const consequences: PrescriptionConsequence[] = [];
  if (level === 'MEDIUM') consequences.push('WIDER_RANGES');
  if (level === 'LOW' || level === 'NONE') consequences.push('EFFORT_PRIORITY');
  if (input.referenceConfidence === 'NONE') consequences.push('TEST_PROPOSED');
  return { level, limitingFactors, consequences };
}
