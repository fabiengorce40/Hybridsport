import type { AdmissibilityLayer, RuleNature, Violation } from '@hybridsport/domain';
import { createCoreRegistry, evaluateAdmissibility, fromArray, toArray } from '../../src/index.js';
import type { AdmissibilityCheck, EvaluatedCandidate, OptimizationVector } from '../../src/index.js';

const reg = createCoreRegistry();

export const NATURE_OF: Record<AdmissibilityLayer, RuleNature> = { A1: 'SAFETY', A2: 'FEASIBILITY', A3: 'PROGRAMMING_HEURISTIC', A4: 'TECHNICAL' };

export function hardViolation(layer: AdmissibilityLayer, id = `rule.${layer}`): Violation {
  const reason =
    layer === 'A1' ? reg.emit('SAFETY.RESTRICTION_VIOLATED', { restriction: 'no_impact', exerciseId: 'ex.box_jump' })
      : layer === 'A2' ? reg.emit('FEASIBILITY.TIME_EXCEEDED', { p90S: 4200, availableS: 3600 })
        : layer === 'A3' ? reg.emit('RECOVERY.MIN_GAP_VIOLATION', { structure: 'lower_knee', gapHours: 14, requiredHours: 24 }, { category: 'business_hard' })
          : reg.emit('TECHNICAL.STRUCTURE_INVALID', { problem: 'bloc vide', target: 'b1' });
  return { ruleId: id, ruleVersion: '1.0.0', nature: NATURE_OF[layer], level: 'hard', target: { kind: 'session', id: 's' }, reason };
}

/** Candidat de test : vecteur B et couches A violées (via de vrais contrôles d'admissibilité). */
export function candidate(id: string, vector: Partial<OptimizationVector>, violated: AdmissibilityLayer[] = []): EvaluatedCandidate<string> {
  const checks: AdmissibilityCheck<string>[] = (['A1', 'A2', 'A3', 'A4'] as const).map((layer) => ({
    id: `check.${layer}`, version: '1.0.0', layer, nature: NATURE_OF[layer],
    evaluate: () => (violated.includes(layer) ? [hardViolation(layer)] : []),
  }));
  const full = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0, ...vector };
  return { id, payload: id, admissibility: evaluateAdmissibility(id, checks), optimization: toArray(fromArray(toArray(full))) };
}
