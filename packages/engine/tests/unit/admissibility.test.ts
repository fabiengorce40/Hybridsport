import { describe, expect, it } from 'vitest';
import { evaluateAdmissibility, assertValidChecks, AdmissibilityDefinitionError, admissibleOnly } from '../../src/index.js';
import type { AdmissibilityCheck } from '../../src/index.js';
import { candidate, hardViolation } from '../fixtures/candidates.js';

describe('couche A — admissibilité', () => {
  it('ordonne les violations A1 → A4 et rend la solution inadmissible', () => {
    const checks: AdmissibilityCheck<null>[] = [
      { id: 'c4', version: '1.0.0', layer: 'A4', nature: 'TECHNICAL', evaluate: () => [hardViolation('A4')] },
      { id: 'c1', version: '1.0.0', layer: 'A1', nature: 'SAFETY', evaluate: () => [hardViolation('A1')] },
      { id: 'c2', version: '1.0.0', layer: 'A2', nature: 'FEASIBILITY', evaluate: () => [hardViolation('A2')] },
    ];
    const r = evaluateAdmissibility(null, checks);
    expect(r.admissible).toBe(false);
    expect(r.violations.map((v) => v.layer)).toEqual(['A1', 'A2', 'A4']);
    expect(r.byLayer.A3).toEqual([]);
  });

  it('SAFETY, FEASIBILITY et TECHNICAL restent distingués par leur catégorie', () => {
    const r = candidate('x', {}, ['A1', 'A2', 'A4']).admissibility;
    expect(r.violations.map((v) => v.reason.category)).toEqual(['safety', 'feasibility', 'technical']);
  });

  it('une violation SOFT n’est jamais un filtre : elle est transmise comme pénalité', () => {
    const soft = { ...hardViolation('A3'), level: 'soft' as const, penalty: 2 };
    const r = evaluateAdmissibility(null, [{ id: 'c3', version: '1.0.0', layer: 'A3', nature: 'PROGRAMMING_HEURISTIC', evaluate: () => [soft] }]);
    expect(r.admissible).toBe(true);
    expect(r.soft).toHaveLength(1);
  });

  it('FAIL-CLOSED : un contrôle qui lève une exception rend la solution inadmissible (A4, TECHNICAL)', () => {
    const r = evaluateAdmissibility(null, [{ id: 'boom', version: '1.0.0', layer: 'A1', nature: 'SAFETY', evaluate: () => { throw new Error('panne'); } }]);
    expect(r.admissible).toBe(false);
    expect(r.byLayer.A4[0]?.reason.code).toBe('TECHNICAL.STRUCTURE_INVALID');
  });

  it('refuse les contrôles mal déclarés (nature incompatible, doublons)', () => {
    expect(() => assertValidChecks([{ id: 'x', version: '1', layer: 'A1', nature: 'PREFERENCE', evaluate: () => [] }])).toThrow(AdmissibilityDefinitionError);
    const c = { id: 'x', version: '1', layer: 'A2' as const, nature: 'PREFERENCE' as const, evaluate: () => [] };
    expect(() => assertValidChecks([c])).not.toThrow(); // exclusion explicite de l'utilisateur
    expect(() => assertValidChecks([c, c])).toThrow(/dupliqué/);
  });

  it('admissibleOnly ne garde que les solutions admissibles', () => {
    expect(admissibleOnly([candidate('ok', {}), candidate('ko', {}, ['A2'])]).map((c) => c.id)).toEqual(['ok']);
  });
});
