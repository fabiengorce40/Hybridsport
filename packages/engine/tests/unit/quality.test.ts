/**
 * Q1 — contrat GÉNÉRIQUE du diagnostic de qualité (CORE) : verdict mécanique (aucun score, aucune pondération),
 * base lue dans les seuls champs structurés des paramètres, critères génériques dérivés, déterminisme.
 */
import { describe, expect, it } from 'vitest';
import { assessment, basisOfParameter, genericCriteria, governedCriterion, verdictOf, weakestBasis } from '../../src/index.js';
import type { QualityCriterion } from '../../src/index.js';

const c = (id: string, status: QualityCriterion['status'], basis: QualityCriterion['basis'] = 'DERIVED'): QualityCriterion => ({ id, status, basis, facts: {}, reasons: [] });
const meta = (o: Partial<{ status: 'draft' | 'approved'; provisional: boolean; approvals: { by: string; at: string; role: string }[]; kind: 'internal_hypothesis' | 'expert_consensus' | 'study' }> = {}) => ({
  status: o.status ?? 'draft', provisional: o.provisional ?? true, approvals: (o.approvals ?? []) as never, source: { kind: o.kind ?? 'internal_hypothesis' },
});
const session = { id: 's', discipline: 'strength', athleteLevel: 'intermediate', availableTimeS: 3600, targetDurationS: 3000, toleranceProfile: 'fixed_time', blocks: [{ id: 'b', kind: 'strength', role: 'primary', optional: false, items: [{ id: 'i', exerciseId: 'ex.x', prescription: { type: 'reps', reps: 5 } }], levers: [], format: 'sets', grouping: 'straight' }] } as never;

describe('Q1 — contrat générique (CORE)', () => {
  it('Q1. verdict mécanique : BLOCKED > UNRESOLVED > WARNING > ACCEPTABLE ; aucun critère ⇒ UNRESOLVED', () => {
    expect(verdictOf([c('a', 'PASS'), c('b', 'BLOCKED'), c('c', 'UNRESOLVED')])).toBe('BLOCKED');
    expect(verdictOf([c('a', 'PASS'), c('c', 'UNRESOLVED'), c('d', 'WARNING')])).toBe('UNRESOLVED');
    expect(verdictOf([c('a', 'PASS'), c('d', 'WARNING')])).toBe('ACCEPTABLE_WITH_WARNINGS');
    expect(verdictOf([c('a', 'PASS')])).toBe('ACCEPTABLE');
    expect(verdictOf([])).toBe('UNRESOLVED');
  });
  it('Q2. base : approuvé exige statut approved + non provisoire + approbation enregistrée', () => {
    expect(basisOfParameter(meta({ status: 'approved', provisional: false, approvals: [{ by: 'x', at: '2026-01-01', role: 'expert' }] }))).toBe('APPROVED');
    expect(basisOfParameter(meta({ status: 'approved', provisional: false }))).toBe('PROVISIONAL');
    expect(basisOfParameter(meta({ status: 'approved', provisional: true, approvals: [{ by: 'x', at: '2026-01-01', role: 'expert' }] }))).toBe('PROVISIONAL');
  });
  it('Q3. base : environnement déclaré (TEST_ONLY / SIMULATION_ONLY) seulement pour une valeur non approuvée', () => {
    expect(basisOfParameter(meta(), 'TEST_ONLY')).toBe('TEST_ONLY');
    expect(basisOfParameter(meta(), 'SIMULATION_ONLY')).toBe('SIMULATION_ONLY');
    expect(basisOfParameter(meta({ status: 'approved', provisional: false, approvals: [{ by: 'x', at: '2026-01-01', role: 'expert' }] }), 'TEST_ONLY')).toBe('APPROVED');
  });
  it('Q4. base : absent ⇒ UNRESOLVED ; consensus d’experts non approuvé ⇒ EXPERT', () => {
    expect(basisOfParameter(undefined)).toBe('UNRESOLVED');
    expect(basisOfParameter(meta({ kind: 'expert_consensus' }))).toBe('EXPERT');
  });
  it('Q5. la base la plus faible l’emporte (une seule valeur non approuvée suffit à ne rien démontrer)', () => {
    expect(weakestBasis(['APPROVED', 'TEST_ONLY'])).toBe('TEST_ONLY');
    expect(weakestBasis(['APPROVED', 'UNRESOLVED'])).toBe('UNRESOLVED');
    expect(weakestBasis([])).toBe('UNRESOLVED');
  });
  it('Q6. critère gouverné : toujours UNRESOLVED (aucune plage de qualité approuvée), même sur valeurs approuvées', () => {
    expect(governedCriterion('dose_coherence', ['APPROVED'], {}).status).toBe('UNRESOLVED');
    expect(governedCriterion('dose_coherence', ['TEST_ONLY'], {}).reasons).toEqual(['value_source:TEST_ONLY', 'no_approved_quality_range']);
  });
  it('Q7. critères génériques : intégrité et durée p90 ≤ disponible (dérivées)', () => {
    const [integrity, duration] = genericCriteria(session, { availability: 'AVAILABLE', p50: 1800, p90: 2400 });
    expect(integrity?.status).toBe('PASS');
    expect(duration).toMatchObject({ status: 'PASS', basis: 'DERIVED' });
    expect(genericCriteria(session, { availability: 'AVAILABLE', p50: 3500, p90: 4000 })[1]?.status).toBe('BLOCKED');
    expect(genericCriteria(session, { availability: 'UNAVAILABLE_LEGACY' })[1]?.status).toBe('UNRESOLVED');
  });
  it('Q8. diagnostic déterministe : ordre stable indépendant de l’ordre d’entrée', () => {
    expect(assessment([c('b', 'PASS'), c('a', 'UNRESOLVED', 'TEST_ONLY')])).toEqual(assessment([c('a', 'UNRESOLVED', 'TEST_ONLY'), c('b', 'PASS')]));
  });
});
