/**
 * Phase 6B — durcissement du modèle de références (lot 7a) : exigences par type, choix par confiance
 * AVANT la date, départage prudent puis récent, frontières de récence, conflits, traçabilité.
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime } from '@hybridsport/domain';
import { CURRENT_RUNNING_GOVERNANCE, RUNNING_CODES, USABLE_FOR, detectConflicts, performancePace, referenceConfidence, selectReference, zRunningReference } from '../../src/index.js';
import type { ConfidenceContext, RunningReference } from '../../src/index.js';
import { NOW, ref, withParameter } from '../fixtures.js';

const cand: ConfidenceContext = { now: NOW, mode: 'CANDIDATE', parameters: CURRENT_RUNNING_GOVERNANCE.parameters, targetDistanceM: 10000 };
const valid = (o: Partial<RunningReference>) => zRunningReference.safeParse(ref({ referenceId: 'x', ...o })).success;
const lab = { source: 'LAB' as const, method: 'LT2' };

describe('exigences par type (5B §E)', () => {
  it('chaque type exige ses valeurs ; complet ⇒ accepté, incomplet ⇒ refusé', () => {
    const cases: [RunningReference['type'], RunningReference['values'], RunningReference['values'], RunningReference['provenance']?][] = [
      ['RACE_RESULT', { distanceM: 5000, durationS: 1200 }, { durationS: 1200 }],
      ['TIME_TRIAL', { distanceM: 3000, durationS: 700 }, { distanceM: 3000 }],
      ['CRITICAL_SPEED_TEST', { speedMps: 4, trials: 3 }, { speedMps: 4 }, { source: 'APP_RECORDED', method: '3-param' }],
      ['CRITICAL_SPEED_TEST', { speedMps: 4, trials: 3 }, { trials: 3 }, { source: 'APP_RECORDED', method: '3-param' }],
      ['LAB_THRESHOLD', { paceSecPerKm: 250 }, {}, lab],
      ['FIELD_THRESHOLD', { speedMps: 4 }, { rpe: 7 }, lab],
      ['VMA_TEST', { speedMps: 5 }, { distanceM: 1000 }],
      ['VO2MAX_TEST', { vo2MlKgMin: 55 }, { speedMps: 5 }],
      ['TRAINING_OBSERVATION', { durationS: 1800 }, { distanceM: 5000 }],
      ['RPE_BASED', { rpe: 3, durationS: 1800 }, { durationS: 1800 }],
      ['RPE_BASED', { rpe: 3, durationS: 1800 }, { rpe: 3 }],
      ['CALIBRATION_RESULT', { durationS: 1200, distanceM: 4000 }, { distanceM: 4000 }],
      ['CALIBRATION_RESULT', { durationS: 1200, rpe: 5 }, { durationS: 1200 }],
      ['USER_DECLARED', { distanceM: 10000, durationS: 3000 }, { distanceM: 10000 }],
      ['USER_DECLARED', { distanceM: 10000, durationS: 3000 }, { durationS: 3000 }],
    ];
    for (const [type, ok, bad, provenance] of cases) {
      const p = provenance ?? { source: 'APP_RECORDED' as const };
      expect(valid({ type, values: ok, provenance: p }), `${type} complet`).toBe(true);
      expect(valid({ type, values: bad, provenance: p }), `${type} incomplet ${JSON.stringify(bad)}`).toBe(false);
    }
    expect(valid({ type: 'FIELD_THRESHOLD', values: { speedMps: 4 }, provenance: { source: 'APP_RECORDED' } })).toBe(false); // définition absente
    const issue = zRunningReference.safeParse(ref({ referenceId: 'x', values: { distanceM: 5000 } }));
    expect(!issue.success && issue.error.issues[0]).toMatchObject({ code: 'custom', message: 'RACE_RESULT : distance et durée requis', path: ['values'] });
  });

  it('sources et conditions admises ; identifiant non vide', () => {
    for (const source of ['USER_DECLARED', 'APP_RECORDED', 'IMPORTED', 'LAB', 'COACH'] as const) expect(valid({ provenance: { source } }), source).toBe(true);
    for (const conditions of ['NORMAL', 'ATYPICAL', 'UNKNOWN'] as const) for (const interruptionSince of ['NONE', 'YES', 'UNKNOWN'] as const) {
      expect(valid({ confidenceInputs: { protocolDeclared: true, conditions, interruptionSince } })).toBe(true);
    }
    expect(valid({ referenceId: '' })).toBe(false);
    expect(zRunningReference.safeParse({ ...ref({ referenceId: 'x' }), date: 'x' }).error?.issues[0]?.message).toBe('instant ISO attendu');
  });

  it('types utilisables par décision (5B §E « peut / ne peut pas estimer »)', () => {
    expect(USABLE_FOR).toEqual({
      INTENSITY_TARGETING: ['RACE_RESULT', 'TIME_TRIAL', 'CRITICAL_SPEED_TEST', 'LAB_THRESHOLD', 'FIELD_THRESHOLD', 'TRAINING_OBSERVATION', 'CALIBRATION_RESULT', 'USER_DECLARED'],
      THRESHOLD_BOUNDARY: ['CRITICAL_SPEED_TEST', 'LAB_THRESHOLD', 'FIELD_THRESHOLD', 'RACE_RESULT', 'TIME_TRIAL'],
      SEVERE_DOMAIN: ['VMA_TEST', 'RACE_RESULT', 'TIME_TRIAL', 'CRITICAL_SPEED_TEST'],
      RACE_SPECIFIC_PACE: ['RACE_RESULT', 'TIME_TRIAL'],
      CURRENT_TOLERANCE: ['TRAINING_OBSERVATION', 'RPE_BASED', 'CALIBRATION_RESULT'],
    });
  });

  it('allure comparable : la distance seule ne suffit pas', () => {
    expect(performancePace(ref({ referenceId: 'v', type: 'VMA_TEST', values: { speedMps: 5, distanceM: 1000 } }))).toBe(200);
    expect(performancePace(ref({ referenceId: 'o', type: 'TRAINING_OBSERVATION', values: { durationS: 1800 } }))).toBeUndefined();
  });
});

describe('confiance : frontières et paramètres', () => {
  it('référence datée de l’instant même : récente (pas « future ») ; aucune alerte de péremption pour une référence fraîche', () => {
    const r = referenceConfidence(ref({ referenceId: 'now', date: NOW }), 'INTENSITY_TARGETING', cand);
    expect(r.confidence.factors.find((f) => f.factor === 'RECENCY')).toEqual({ factor: 'RECENCY', level: 'HIGH', cause: 'RECENT' });
    expect(r.reasons.map((x) => x.code)).not.toContain(RUNNING_CODES.REFERENCE_STALE);
    expect(r.reasons.filter((x) => x.code === RUNNING_CODES.CANDIDATE_VALUE_USED).map((x) => x.params.parameterId)).toEqual(['running.reference.typeConfidenceCaps', 'running.reference.recencyBands']);
  });

  it('paramètre de récence malformé ⇒ NONE (PARAMETER_MALFORMED), jamais un défaut', () => {
    const bad = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.reference.recencyBands', (p) => ({ ...p, value: { status: 'candidate', value: { recentMaxWeeks: 8 } } }));
    const r = referenceConfidence(ref({ referenceId: 'r' }), 'INTENSITY_TARGETING', { ...cand, parameters: bad.parameters }).confidence;
    expect(r.factors.find((f) => f.factor === 'RECENCY')).toEqual({ factor: 'RECENCY', level: 'NONE', cause: 'PARAMETER_MALFORMED' });
    const noCap = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.reference.recencyBands', (p) => ({ ...p, value: { status: 'candidate', value: { recentMaxWeeks: 8, agingMaxWeeks: 16 } } }));
    expect(referenceConfidence(ref({ referenceId: 'r' }), 'INTENSITY_TARGETING', { ...cand, parameters: noCap.parameters }).confidence.level).toBe('NONE');
    const noTypeCap = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.reference.typeConfidenceCaps', (p) => ({ ...p, value: { status: 'candidate', value: {} } }));
    expect(referenceConfidence(ref({ referenceId: 'r' }), 'INTENSITY_TARGETING', { ...cand, parameters: noTypeCap.parameters }).confidence.factors[0]).toEqual({ factor: 'TYPE_CAP', level: 'NONE', cause: 'CAP_UNDEFINED_FOR_TYPE' });
  });

  it('allure spécifique sans distance visée : refusée même pour une course à 10 km', () => {
    const r = referenceConfidence(ref({ referenceId: 'r' }), 'RACE_SPECIFIC_PACE', { ...cand, targetDistanceM: undefined }).confidence;
    expect(r.factors.find((f) => f.factor === 'SPECIFICITY')).toEqual({ factor: 'SPECIFICITY', level: 'NONE', cause: 'DISTANCE_MISMATCH_MODEL_REQUIRED' });
  });
});

describe('sélection : confiance d’abord, puis prudence, puis récence', () => {
  it('une référence plus RÉCENTE mais moins fiable ne remplace pas une référence plus fiable', () => {
    const oldHigh = ref({ referenceId: 'old', date: asISODateTime('2026-08-20T08:00:00Z') });
    const newLow = ref({ referenceId: 'new', type: 'USER_DECLARED', values: { paceSecPerKm: 280 }, date: asISODateTime('2026-10-01T08:00:00Z') });
    const s = selectReference([newLow, oldHigh], 'INTENSITY_TARGETING', cand);
    expect(s).toMatchObject({ confidence: 'HIGH', selected: { referenceId: 'old' } });
    expect(s.reasons.map((r) => r.code)).not.toContain(RUNNING_CODES.REFERENCE_LOW_CONFIDENCE);
  });

  it('en conflit : la plus prudente (allure la plus lente), puis la plus récente', () => {
    const a = ref({ referenceId: 'a', values: { distanceM: 10000, durationS: 3000 }, date: asISODateTime('2026-09-01T08:00:00Z') });
    const b = ref({ referenceId: 'b', values: { distanceM: 10000, durationS: 3100 }, date: asISODateTime('2026-09-10T08:00:00Z') });
    const c = ref({ referenceId: 'c', values: { distanceM: 10000, durationS: 3100 }, date: asISODateTime('2026-09-20T08:00:00Z') });
    expect(selectReference([a, b, c], 'INTENSITY_TARGETING', cand).selected?.referenceId).toBe('c');
    expect(selectReference([c, b, a], 'INTENSITY_TARGETING', cand).selected?.referenceId).toBe('c');
  });

  it('conflits : contre-la-montre compris, groupes triés par distance, identifiants triés ; distance absente ignorée', () => {
    const tt1 = ref({ referenceId: 'z', type: 'TIME_TRIAL', values: { distanceM: 3000, durationS: 700 } });
    const tt2 = ref({ referenceId: 'y', type: 'TIME_TRIAL', values: { distanceM: 3000, durationS: 720 } });
    const r10a = ref({ referenceId: 'k', values: { distanceM: 10000, durationS: 3000 } });
    const r10b = ref({ referenceId: 'j', values: { distanceM: 10000, durationS: 3050 } });
    expect(detectConflicts([r10a, r10b, tt1, tt2]).map((c) => [c.cause, c.referenceIds])).toEqual([['DISCORDANT_PERFORMANCES_3000M', ['y', 'z']], ['DISCORDANT_PERFORMANCES_10000M', ['j', 'k']]]);
    const declared = ref({ referenceId: 'd', type: 'USER_DECLARED', values: { paceSecPerKm: 300 } });
    expect(detectConflicts([declared, ref({ referenceId: 'd2', type: 'USER_DECLARED', values: { paceSecPerKm: 280 } })])).toEqual([]);
    const s = selectReference([r10a, r10b], 'INTENSITY_TARGETING', cand);
    expect(s.reasons.find((r) => r.code === RUNNING_CODES.REFERENCE_CONFLICT)?.params).toEqual({ referenceIds: ['j', 'k'], severity: 'MAJOR_PENDING_VARIABILITY', cause: 'DISCORDANT_PERFORMANCES_10000M' });
    expect(s.candidates.find((c) => c.referenceId === 'k')?.factors.at(-1)).toEqual({ factor: 'CONFLICT', level: 'LOW', cause: 'MAJOR_PENDING_VARIABILITY' });
  });
});
