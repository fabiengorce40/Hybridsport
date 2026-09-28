/**
 * Phase 6B — modèle de références et ReferenceConfidence (séparée de la confiance de prescription).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { asISODateTime } from '@hybridsport/domain';
import {
  CURRENT_RUNNING_GOVERNANCE, RUNNING_CODES, detectConflicts, performancePace, referenceConfidence, selectReference, zRunningReference,
} from '../../src/index.js';
import type { ConfidenceContext, RunningReference } from '../../src/index.js';
import { NOW, fullyApprovedGovernance, ref } from '../fixtures.js';

const cand: ConfidenceContext = { now: NOW, mode: 'CANDIDATE', parameters: CURRENT_RUNNING_GOVERNANCE.parameters, targetDistanceM: 10000 };
const level = (r: RunningReference, d: Parameters<typeof referenceConfidence>[1] = 'INTENSITY_TARGETING', c: ConfidenceContext = cand) => referenceConfidence(r, d, c).confidence;
const codes = (xs: readonly { code: string }[]) => xs.map((x) => x.code);

describe('représentation des références', () => {
  it('chaque référence porte type, valeurs, date, provenance, entrées de confiance (schéma strict)', () => {
    expect(zRunningReference.safeParse(ref({ referenceId: 'r1' })).success).toBe(true);
    expect(zRunningReference.safeParse({ ...ref({ referenceId: 'r1' }), extra: 1 }).success).toBe(false);
    expect(zRunningReference.safeParse(ref({ referenceId: 'r1', date: 'hier' as never })).success).toBe(false);
  });

  it('exigences par type (sans formule de conversion)', () => {
    const bad = (o: Partial<RunningReference>) => zRunningReference.safeParse(ref({ referenceId: 'x', ...o })).success;
    expect(bad({ type: 'RACE_RESULT', values: { distanceM: 5000 } })).toBe(false);
    expect(bad({ type: 'CRITICAL_SPEED_TEST', values: { speedMps: 4, trials: 3 } })).toBe(false); // modèle non déclaré
    expect(bad({ type: 'CRITICAL_SPEED_TEST', values: { speedMps: 4, trials: 3 }, provenance: { source: 'APP_RECORDED', method: '2-param' } })).toBe(true);
    expect(bad({ type: 'LAB_THRESHOLD', values: { speedMps: 4 } })).toBe(false); // définition absente
    expect(bad({ type: 'VO2MAX_TEST', values: { vo2MlKgMin: 55 } })).toBe(true);
    expect(bad({ type: 'RPE_BASED', values: { rpe: 3 } })).toBe(false);
    expect(bad({ type: 'CALIBRATION_RESULT', values: { durationS: 1200, rpe: 4 } })).toBe(true);
    expect(bad({ type: 'USER_DECLARED', values: { paceSecPerKm: 300 } })).toBe(true);
    expect(bad({ type: 'TRAINING_OBSERVATION', values: {} })).toBe(false);
    expect(bad({ type: 'VMA_TEST', values: {} })).toBe(false);
  });

  it('allure comparable : arithmétique seulement', () => {
    expect(performancePace(ref({ referenceId: 'r', values: { distanceM: 10000, durationS: 3000 } }))).toBe(300);
    expect(performancePace(ref({ referenceId: 'r', type: 'USER_DECLARED', values: { paceSecPerKm: 280 } }))).toBe(280);
    expect(performancePace(ref({ referenceId: 'r', type: 'VMA_TEST', values: { speedMps: 5 } }))).toBe(200);
    expect(performancePace(ref({ referenceId: 'r', type: 'VO2MAX_TEST', values: { vo2MlKgMin: 50 } }))).toBeUndefined();
  });
});

describe('ReferenceConfidence : minimum des facteurs, par décision', () => {
  it('référence récente, protocole et conditions normales, spécifique ⇒ HIGH (valeurs candidates tracées)', () => {
    const r = referenceConfidence(ref({ referenceId: 'r' }), 'RACE_SPECIFIC_PACE', cand);
    expect(r.confidence.level).toBe('HIGH');
    expect(r.confidence.factors.map((f) => f.factor)).toEqual(['TYPE_CAP', 'RECENCY', 'HIGH_CONDITIONS', 'SPECIFICITY']);
    expect(codes(r.reasons)).toContain(RUNNING_CODES.CANDIDATE_VALUE_USED);
  });

  it('plafonds de type (5B) : déclarée ≤ LOW ; observation ≤ MEDIUM ; VO2max ≤ LOW pour une allure', () => {
    expect(level(ref({ referenceId: 'd', type: 'USER_DECLARED', values: { paceSecPerKm: 300 } })).level).toBe('LOW');
    expect(level(ref({ referenceId: 'o', type: 'TRAINING_OBSERVATION', values: { durationS: 1800 } }), 'CURRENT_TOLERANCE').level).toBe('MEDIUM');
    expect(level(ref({ referenceId: 'f', type: 'FIELD_THRESHOLD', values: { speedMps: 4 }, provenance: { source: 'APP_RECORDED', method: 'field' } }), 'THRESHOLD_BOUNDARY').level).toBe('MEDIUM');
    expect(level(ref({ referenceId: 'v', type: 'VO2MAX_TEST', values: { vo2MlKgMin: 55 } })).level).toBe('NONE'); // non utilisable pour cibler une intensité
  });

  it('récence (V12) : RECENT ⇒ HIGH, AGING ⇒ MEDIUM, STALE ⇒ LOW + REFERENCE_STALE ; date future ⇒ NONE', () => {
    const at = (weeksAgo: number) => asISODateTime(new Date(Date.parse(NOW) - weeksAgo * 7 * 86400000).toISOString().replace('.000Z', 'Z'));
    expect(level(ref({ referenceId: 'a', date: at(8) })).level).toBe('HIGH');
    expect(level(ref({ referenceId: 'b', date: at(9) })).level).toBe('MEDIUM');
    expect(level(ref({ referenceId: 'c', date: at(16) })).level).toBe('MEDIUM');
    const stale = referenceConfidence(ref({ referenceId: 'd', date: at(17) }), 'INTENSITY_TARGETING', cand);
    expect(stale.confidence.level).toBe('LOW');
    expect(codes(stale.reasons)).toContain(RUNNING_CODES.REFERENCE_STALE);
    expect(level(ref({ referenceId: 'e', date: at(-1) })).level).toBe('NONE');
  });

  it('conditions exigées pour HIGH (5B) : un seul manquement plafonne à MEDIUM', () => {
    const base = { protocolDeclared: true, conditions: 'NORMAL', interruptionSince: 'NONE' } as const;
    for (const ci of [{ ...base, protocolDeclared: false }, { ...base, conditions: 'ATYPICAL' as const }, { ...base, conditions: 'UNKNOWN' as const }, { ...base, interruptionSince: 'YES' as const }, { ...base, interruptionSince: 'UNKNOWN' as const }]) {
      expect(level(ref({ referenceId: 'x', confidenceInputs: ci })).level).toBe('MEDIUM');
    }
  });

  it('spécificité : allure spécifique seulement à la même distance (sinon un modèle est requis)', () => {
    const r5k = ref({ referenceId: 'r5', values: { distanceM: 5000, durationS: 1400 } });
    const res = referenceConfidence(r5k, 'RACE_SPECIFIC_PACE', cand).confidence;
    expect(res.level).toBe('NONE');
    expect(res.factors.find((f) => f.factor === 'SPECIFICITY')?.cause).toBe('DISTANCE_MISMATCH_MODEL_REQUIRED');
    expect(referenceConfidence(r5k, 'RACE_SPECIFIC_PACE', { ...cand, targetDistanceM: undefined }).confidence.level).toBe('NONE');
  });

  it('PRODUCTION aujourd’hui : paramètres non éligibles ⇒ confiance NONE (fail-closed)', () => {
    const prod = { ...cand, mode: 'PRODUCTION' as const };
    const r = referenceConfidence(ref({ referenceId: 'r' }), 'INTENSITY_TARGETING', prod);
    expect(r.confidence.level).toBe('NONE');
    expect(r.confidence.factors.filter((f) => f.level === 'NONE').map((f) => f.cause)).toEqual(['PARAMETER_MATURITY_INSUFFICIENT', 'PARAMETER_MATURITY_INSUFFICIENT']);
    // Paramètres approuvés (simulation) : la même référence redevient utilisable en PRODUCTION.
    const g = fullyApprovedGovernance();
    expect(referenceConfidence(ref({ referenceId: 'r' }), 'INTENSITY_TARGETING', { ...prod, parameters: g.parameters }).confidence.level).toBe('HIGH');
  });
});

describe('sélection de références', () => {
  it('aucune référence ⇒ REFERENCE_MISSING, confiance NONE', () => {
    const s = selectReference([], 'INTENSITY_TARGETING', cand);
    expect(s).toMatchObject({ confidence: 'NONE', calibrationRequired: false });
    expect(s.selected).toBeUndefined();
    expect(codes(s.reasons)).toEqual([RUNNING_CODES.REFERENCE_MISSING]);
  });

  it('références rejetées tracées avec leur cause ; la meilleure est retenue (REFERENCE_SELECTED)', () => {
    const s = selectReference([ref({ referenceId: 'vo2', type: 'VO2MAX_TEST', values: { vo2MlKgMin: 55 } }), ref({ referenceId: 'race' })], 'INTENSITY_TARGETING', cand);
    expect(s.selected?.referenceId).toBe('race');
    expect(s.reasons.find((r) => r.code === RUNNING_CODES.REFERENCE_REJECTED)?.params).toEqual({ referenceId: 'vo2', decision: 'INTENSITY_TARGETING', cause: 'SPECIFICITY:TYPE_NOT_USABLE_FOR_DECISION' });
    expect(s.reasons.find((r) => r.code === RUNNING_CODES.REFERENCE_SELECTED)?.params).toEqual({ referenceId: 'race', decision: 'INTENSITY_TARGETING', level: 'HIGH' });
  });

  it('confiance faible retenue ⇒ REFERENCE_LOW_CONFIDENCE (jamais masquée)', () => {
    const s = selectReference([ref({ referenceId: 'd', type: 'USER_DECLARED', values: { paceSecPerKm: 300 } })], 'INTENSITY_TARGETING', cand);
    expect(s.confidence).toBe('LOW');
    expect(s.reasons.find((r) => r.code === RUNNING_CODES.REFERENCE_LOW_CONFIDENCE)?.params).toMatchObject({ referenceId: 'd', level: 'LOW', factors: ['TYPE_CAP'] });
  });

  it('références contradictoires : conflit MAJOR (variabilité non décidée), référence la plus prudente, calibration demandée', () => {
    const fast = ref({ referenceId: 'fast', values: { distanceM: 10000, durationS: 2900 } });
    const slow = ref({ referenceId: 'slow', values: { distanceM: 10000, durationS: 3100 }, date: asISODateTime('2026-09-01T08:00:00Z') });
    expect(detectConflicts([fast, slow])).toEqual([{ referenceIds: ['fast', 'slow'], severity: 'MAJOR_PENDING_VARIABILITY', cause: 'DISCORDANT_PERFORMANCES_10000M' }]);
    const s = selectReference([fast, slow], 'INTENSITY_TARGETING', cand);
    expect(s.selected?.referenceId).toBe('slow');
    expect(s.confidence).toBe('LOW');
    expect(s.calibrationRequired).toBe(true);
    expect(codes(s.reasons)).toEqual(expect.arrayContaining([RUNNING_CODES.REFERENCE_CONFLICT, RUNNING_CODES.CALIBRATION_REQUIRED, RUNNING_CODES.REFERENCE_LOW_CONFIDENCE]));
    // Performances identiques : aucun conflit.
    expect(detectConflicts([fast, ref({ referenceId: 'same', values: { distanceM: 10000, durationS: 2900 } })])).toEqual([]);
  });

  it('départage stable : date la plus récente, puis identifiant ; indépendant de l’ordre d’entrée (propriété)', () => {
    const a = ref({ referenceId: 'a', type: 'LAB_THRESHOLD', values: { speedMps: 4 }, provenance: { source: 'LAB', method: 'LT2' }, date: asISODateTime('2026-09-10T08:00:00Z') });
    const b = ref({ referenceId: 'b', type: 'LAB_THRESHOLD', values: { speedMps: 4.1 }, provenance: { source: 'LAB', method: 'LT2' }, date: asISODateTime('2026-09-20T08:00:00Z') });
    const c = ref({ referenceId: 'c', type: 'LAB_THRESHOLD', values: { speedMps: 4.2 }, provenance: { source: 'LAB', method: 'LT2' }, date: asISODateTime('2026-09-20T08:00:00Z') });
    fc.assert(fc.property(fc.shuffledSubarray([a, b, c], { minLength: 3, maxLength: 3 }), (order) => {
      const s = selectReference(order, 'THRESHOLD_BOUNDARY', cand);
      expect(s.selected?.referenceId).toBe('b');
      expect(JSON.stringify(s)).toBe(JSON.stringify(selectReference([a, b, c], 'THRESHOLD_BOUNDARY', cand)));
    }), { numRuns: 30 });
  });

  it('référence ancienne et interrompue : retenue en LOW si c’est la seule (jamais inventée), sinon écartée au profit d’une meilleure', () => {
    const old = ref({ referenceId: 'old', date: asISODateTime('2025-01-01T08:00:00Z'), confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL', interruptionSince: 'YES' } });
    expect(selectReference([old], 'INTENSITY_TARGETING', cand)).toMatchObject({ confidence: 'LOW', selected: { referenceId: 'old' } });
    expect(selectReference([old, ref({ referenceId: 'new', values: { distanceM: 5000, durationS: 1400 } })], 'INTENSITY_TARGETING', cand).selected?.referenceId).toBe('new');
  });
});
