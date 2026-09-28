/**
 * Phase 6B — RecentLoadContext (provisoire, pas une capacité sûre), variabilité contextuelle,
 * interface de modèle de performance (aucun modèle éligible, marathon exclu).
 */
import { describe, expect, it } from 'vitest';
import {
  CURRENT_RUNNING_GOVERNANCE, PERFORMANCE_MODELS, RUNNING_CODES, classifyAgainstContext, coefficientOfVariation, estimateVariability, hasNegativeResponse,
  recentLoadContext, selectPerformanceModel, zWeekObservation,
} from '../../src/index.js';
import type { WeekObservation } from '../../src/index.js';
import { fullyApprovedGovernance, ref, withParameter } from '../fixtures.js';

const G = CURRENT_RUNNING_GOVERNANCE;
const wk = (i: number, value: number | null, o: Partial<WeekObservation> = {}): WeekObservation => zWeekObservation.parse({ weekStart: `2026-09-${String(1 + 7 * i).padStart(2, '0')}T00:00:00Z`, value, completion: 'COMPLETED', ...o });
const opts = { mode: 'CANDIDATE' as const, parameters: G.parameters };
const codes = (xs: readonly { code: string }[]) => xs.map((x) => x.code);

describe('RecentLoadContext', () => {
  it('médiane = niveau typique ; bestToleratedExposure = plus haute semaine SANS réponse négative ; provisoire', () => {
    const c = recentLoadContext('WEEKLY_DURATION', [wk(0, 100), wk(1, 120), wk(2, 110), wk(3, 130, { unexpectedDifficulty: 'MUCH_HARDER' })], opts);
    expect(c).toMatchObject({ status: 'AVAILABLE', typicalLevel: 115, bestToleratedExposure: 120, provisional: true, parameterIds: ['running.load.recentLoadContext'] });
    expect(codes(c.reasons)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED]);
    expect(JSON.stringify(c)).not.toMatch(/safe|sûr|risk|risque|injur|blessure/i);
  });

  it('semaine manquante : UNKNOWN, exclue, jamais 0 ; semaine à zéro déclarée : comptée et signalée', () => {
    const c = recentLoadContext('WEEKLY_DURATION', [wk(0, 100), wk(1, null), wk(2, 0), wk(3, 90)], opts);
    expect(c.typicalLevel).toBe(90); // médiane de [100, 0, 90]
    expect(c.flags).toEqual(['MISSING_WEEK', 'ZERO_WEEK']);
    expect(c.weeks.map((w) => w.value)).toEqual([100, null, 0, 90]);
  });

  it('moins de 2 semaines connues ⇒ UNKNOWN (INSUFFICIENT_HISTORY) ; fenêtre = 4 dernières semaines', () => {
    const u = recentLoadContext('LONG_RUN', [wk(0, null), wk(1, null), wk(2, null), wk(3, 60)], opts);
    expect(u).toMatchObject({ status: 'UNKNOWN', flags: ['INSUFFICIENT_HISTORY', 'MISSING_WEEK'] });
    expect(u.typicalLevel).toBeUndefined();
    expect(codes(u.reasons)).toContain(RUNNING_CODES.RECENT_LOAD_UNKNOWN);
    const w = recentLoadContext('LONG_RUN', [wk(0, 999), wk(1, 50), wk(2, 60), wk(3, 70), wk(4, 80)], opts);
    expect(w.weeks.map((x) => x.value)).toEqual([50, 60, 70, 80]);
  });

  it('reprise : seules les semaines post-retour comptent (POST_RETURN_ONLY)', () => {
    const c = recentLoadContext('WEEKLY_DURATION', [wk(0, 300), wk(1, 300), wk(2, 60), wk(3, 80)], { ...opts, returnStartedAt: '2026-09-15T00:00:00Z' });
    expect(c).toMatchObject({ status: 'AVAILABLE', bestToleratedExposure: 80, flags: ['MISSING_WEEK', 'POST_RETURN_ONLY'] });
  });

  it('semaine aberrante signalée sans effet de décision ; aucune semaine tolérée ⇒ drapeau, pas de meilleure exposition', () => {
    expect(recentLoadContext('WEEKLY_DURATION', [wk(0, 50), wk(1, 50), wk(2, 50), wk(3, 200)], opts)).toMatchObject({ bestToleratedExposure: 200, flags: ['OUTLIER_WEEK'] });
    const none = recentLoadContext('WEEKLY_DURATION', [wk(0, 50, { lowAdherence: true }), wk(1, 60, { intoleranceOrPainSignal: true })], opts);
    expect(none.flags).toContain('NO_TOLERATED_WEEK');
    expect(none.bestToleratedExposure).toBeUndefined();
    expect(classifyAgainstContext(10, none)).toBe('UNKNOWN_CONTEXT');
  });

  it('réponse négative : uniquement les informations produit (aucun diagnostic)', () => {
    expect(hasNegativeResponse(wk(0, 1))).toBe(false);
    expect(hasNegativeResponse(wk(0, 1, { completion: 'PARTIAL' }))).toBe(true);
    expect(hasNegativeResponse(wk(0, 1, { completion: 'SKIPPED', skipReason: 'TIME' }))).toBe(false);
    expect(hasNegativeResponse(wk(0, 1, { completion: 'SKIPPED', skipReason: 'FATIGUE' }))).toBe(true);
    expect(hasNegativeResponse(wk(0, 1, { completion: 'SKIPPED' }))).toBe(true);
    expect(hasNegativeResponse(wk(0, 1, { unexpectedDifficulty: 'HARDER' }))).toBe(false);
    expect(hasNegativeResponse(wk(0, 1, { readinessOrToleranceDegraded: true }))).toBe(true);
  });

  it('classement : WITHIN ≤ meilleure exposition < INCREASE_BEYOND ; contexte UNKNOWN ⇒ UNKNOWN_CONTEXT', () => {
    const c = recentLoadContext('WEEKLY_DURATION', [wk(0, 100), wk(1, 120)], opts);
    expect(classifyAgainstContext(120, c)).toBe('WITHIN_RECENT_CONTEXT');
    expect(classifyAgainstContext(121, c)).toBe('INCREASE_BEYOND_CONTEXT');
  });

  it('paramètre non résolu ou malformé ⇒ UNKNOWN (fail-closed, jamais une fenêtre par défaut)', () => {
    expect(recentLoadContext('WEEKLY_DURATION', [wk(0, 1), wk(1, 2)], { mode: 'PRODUCTION', parameters: G.parameters })).toMatchObject({ status: 'UNKNOWN', reasons: [{ code: RUNNING_CODES.UNRESOLVED_PARAMETER }, { code: RUNNING_CODES.RECENT_LOAD_UNKNOWN, params: { cause: 'PARAMETER_MATURITY_INSUFFICIENT' } }] });
    const malformed = withParameter(G, 'running.load.recentLoadContext', (p) => ({ ...p, value: { status: 'candidate', value: { windowWeeks: 0 } } }));
    expect(recentLoadContext('WEEKLY_DURATION', [wk(0, 1), wk(1, 2)], { mode: 'CANDIDATE', parameters: malformed.parameters }).reasons.at(-1)?.params.cause).toBe('PARAMETER_MALFORMED');
  });
});

describe('RecentLoadContext — durcissement (lot 7b)', () => {
  const valid = { windowWeeks: 4, typicalLevel: 'MEDIAN', bestTolerated: 'MAX_WITHOUT_NEGATIVE_RESPONSE', minKnownWeeks: 2, outlierFlagMultipleOfMedian: 2 };
  const withV21 = (value: unknown) => withParameter(G, 'running.load.recentLoadContext', (p) => ({ ...p, value: { status: 'candidate', value } })).parameters;

  it('chaque malformation de V21 ⇒ UNKNOWN (PARAMETER_MALFORMED), jamais une valeur par défaut', () => {
    const variants: unknown[] = [
      null, 'x', { ...valid, windowWeeks: 0 }, { ...valid, windowWeeks: 2.5 }, { ...valid, windowWeeks: '4' }, { ...valid, minKnownWeeks: 0 },
      { ...valid, minKnownWeeks: undefined }, { ...valid, outlierFlagMultipleOfMedian: 0 }, { ...valid, outlierFlagMultipleOfMedian: '2' },
      { ...valid, typicalLevel: 'MEAN' }, { ...valid, bestTolerated: 'MAX' },
    ];
    for (const v of variants) {
      const c = recentLoadContext('WEEKLY_DURATION', [wk(0, 1), wk(1, 2)], { mode: 'CANDIDATE', parameters: withV21(v) });
      expect(c, JSON.stringify(v)).toMatchObject({ status: 'UNKNOWN', provisional: true, flags: [], weeks: [] });
      expect(c.reasons.at(-1)?.params, JSON.stringify(v)).toEqual({ dimension: 'WEEKLY_DURATION', cause: 'PARAMETER_MALFORMED' });
    }
    expect(recentLoadContext('WEEKLY_DURATION', [wk(0, 1), wk(1, 2)], { mode: 'CANDIDATE', parameters: withV21(valid) }).status).toBe('AVAILABLE');
  });

  it('fenêtre : les N DERNIÈRES semaines par date, quel que soit l’ordre d’entrée', () => {
    const weeks = [wk(4, 80), wk(0, 999), wk(2, 60), wk(1, 50), wk(3, 70)];
    expect(recentLoadContext('LONG_RUN', weeks, opts).weeks.map((w) => w.value)).toEqual([50, 60, 70, 80]);
  });

  it('semaine aberrante : strictement au-delà du multiple de la médiane', () => {
    expect(recentLoadContext('WEEKLY_DURATION', [wk(0, 50), wk(1, 50), wk(2, 50), wk(3, 100)], opts).flags).toEqual([]);
    expect(recentLoadContext('WEEKLY_DURATION', [wk(0, 50), wk(1, 50), wk(2, 50), wk(3, 101)], opts).flags).toEqual(['OUTLIER_WEEK']);
  });

  it('historique insuffisant : contexte UNKNOWN provisoire, raisons exactes', () => {
    const c = recentLoadContext('LONG_RUN', [wk(0, 60)], opts);
    expect(c).toMatchObject({ status: 'UNKNOWN', provisional: true, parameterIds: ['running.load.recentLoadContext'] });
    expect(c.reasons.map((r) => [r.code, r.params.cause])).toEqual([[RUNNING_CODES.CANDIDATE_VALUE_USED, undefined], [RUNNING_CODES.RECENT_LOAD_UNKNOWN, 'INSUFFICIENT_HISTORY']]);
  });

  it('observation hebdomadaire : valeurs admises', () => {
    for (const skipReason of ['TIME', 'EQUIPMENT', 'PAIN', 'FATIGUE', 'OTHER'] as const) expect(zWeekObservation.safeParse({ weekStart: '2026-09-01T00:00:00Z', value: 1, completion: 'SKIPPED', skipReason }).success).toBe(true);
    for (const d of ['EASIER', 'AS_EXPECTED', 'HARDER', 'MUCH_HARDER', 'UNKNOWN'] as const) expect(zWeekObservation.safeParse({ weekStart: '2026-09-01T00:00:00Z', value: 1, completion: 'UNKNOWN', unexpectedDifficulty: d }).success).toBe(true);
    expect(zWeekObservation.parse({ weekStart: '2026-09-01T00:00:00Z', value: 1, completion: 'COMPLETED' }).unexpectedDifficulty).toBe('UNKNOWN');
    expect(zWeekObservation.safeParse({ weekStart: 'lundi', value: 1, completion: 'COMPLETED' }).error?.issues[0]?.message).toBe('instant ISO attendu');
  });
});

describe('RunningPerformanceVariabilityEstimate', () => {
  const races = [ref({ referenceId: 'a', values: { distanceM: 10000, durationS: 3000 } }), ref({ referenceId: 'b', values: { distanceM: 10000, durationS: 3060 } }), ref({ referenceId: 'c', values: { distanceM: 10000, durationS: 2940 } })];

  it('aujourd’hui : UNKNOWN (nombre minimal non décidé, E-VARIABILITY en attente en PRODUCTION) — jamais une constante universelle', () => {
    expect(estimateVariability({ references: races, distanceM: 10000, priorKey: 'SHORT_OR_ROAD_FASTEST', governance: G, mode: 'PRODUCTION' })).toMatchObject({ kind: 'UNKNOWN', confidence: 'NONE' });
    const none = estimateVariability({ references: [], distanceM: 10000, governance: G, mode: 'CANDIDATE' });
    expect(none.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.VARIABILITY_UNKNOWN, params: { cause: 'NO_COMPARABLE_PERFORMANCE' } });
  });

  it('a priori contextuel en CANDIDATE (valeur candidate tracée, E-VARIABILITY en attente), confiance LOW', () => {
    const e = estimateVariability({ references: [], distanceM: 21097.5, priorKey: 'HALF_MARATHON', governance: G, mode: 'CANDIDATE' });
    expect(e).toMatchObject({ kind: 'CONTEXT_PRIOR', range: { min: 0.027, max: 0.042 }, confidence: 'LOW' });
    expect(codes(e.reasons)).toEqual(expect.arrayContaining([RUNNING_CODES.DECISION_PENDING, RUNNING_CODES.CANDIDATE_VALUE_USED]));
  });

  it('estimation personnelle seulement quand le nombre minimal est décidé (simulation), avec la statistique descriptive', () => {
    const g = withParameter(fullyApprovedGovernance(), 'running.reference.variabilityMinComparablePerformances', (p) => ({ ...p, value: { status: 'candidate', value: 3 } }));
    const e = estimateVariability({ references: races, distanceM: 10000, governance: g, mode: 'PRODUCTION' });
    expect(e).toMatchObject({ kind: 'PERSONAL', sampleSize: 3, confidence: 'MEDIUM' });
    if (e.kind === 'PERSONAL') expect(e.coefficientOfVariation).toBeCloseTo(coefficientOfVariation([300, 306, 294]), 12);
    expect(estimateVariability({ references: races.slice(0, 2), distanceM: 10000, governance: g, mode: 'PRODUCTION' }).kind).toBe('UNKNOWN');
  });
});

describe('variabilité — durcissement (lot 7c)', () => {
  const race = (id: string, durationS: number, type: 'RACE_RESULT' | 'TIME_TRIAL' = 'RACE_RESULT', distanceM = 10000) => ref({ referenceId: id, type, values: { distanceM, durationS } });
  const personal = (n: unknown) => withParameter(fullyApprovedGovernance(), 'running.reference.variabilityMinComparablePerformances', (p) => ({ ...p, value: { status: 'candidate', value: n } }));

  it('coefficient de variation : valeur exacte (écart type d’échantillon / moyenne)', () => {
    expect(coefficientOfVariation([300, 306, 294])).toBeCloseTo(0.02, 12);
    expect(coefficientOfVariation([100, 200])).toBeCloseTo(Math.SQRT2 / 3, 12);
  });

  it('performances comparables : courses ET contre-la-montre à la même distance seulement ; nombre minimal > 1', () => {
    const refs = [race('a', 3000), race('b', 3060, 'TIME_TRIAL'), race('c', 2940), race('x', 1200, 'RACE_RESULT', 5000), ref({ referenceId: 'd', type: 'USER_DECLARED', values: { paceSecPerKm: 280 } })];
    const withCalibration = [...refs.slice(0, 2), ref({ referenceId: 'cal', type: 'CALIBRATION_RESULT', values: { distanceM: 10000, durationS: 3300 } })];
    expect(estimateVariability({ references: withCalibration, distanceM: 10000, governance: personal(3), mode: 'PRODUCTION' }).kind).toBe('UNKNOWN');
    const e = estimateVariability({ references: refs, distanceM: 10000, governance: personal(3), mode: 'PRODUCTION' });
    expect(e).toMatchObject({ kind: 'PERSONAL', sampleSize: 3, distanceM: 10000, provenance: 'personal-repeated-performances' });
    expect(estimateVariability({ references: refs, distanceM: 10000, governance: personal(4), mode: 'PRODUCTION' }).kind).toBe('UNKNOWN');
    for (const bad of [1, 0, 2.5, '3']) expect(estimateVariability({ references: refs, distanceM: 10000, governance: personal(bad), mode: 'PRODUCTION' }).kind, String(bad)).toBe('UNKNOWN');
    const cand = estimateVariability({ references: refs, distanceM: 10000, governance: withParameter(G, 'running.reference.variabilityMinComparablePerformances', (p) => ({ ...p, maturity: 'EXPERT_PROPOSED', value: { status: 'candidate', value: 2 } })), mode: 'CANDIDATE' });
    expect(cand).toMatchObject({ kind: 'PERSONAL', confidence: 'LOW' });
  });

  it('a priori en PRODUCTION : exige E-VARIABILITY APPROUVÉE et le paramètre éligible', () => {
    const noPersonal = fullyApprovedGovernance();
    expect(estimateVariability({ references: [], distanceM: 21097.5, priorKey: 'HALF_MARATHON', governance: noPersonal, mode: 'PRODUCTION' })).toMatchObject({ kind: 'CONTEXT_PRIOR', range: { min: 0.027, max: 0.042 }, provenance: 'RS-HOPKINS-2001-VAR (a priori, non personnel)' });
    const pending = { ...noPersonal, decisions: { ...noPersonal.decisions, 'E-VARIABILITY': 'PENDING' as const } };
    const u = estimateVariability({ references: [], distanceM: 21097.5, priorKey: 'HALF_MARATHON', governance: pending, mode: 'PRODUCTION' });
    expect(u.kind).toBe('UNKNOWN');
    expect(u.reasons.find((r) => r.code === RUNNING_CODES.DECISION_PENDING)?.params).toEqual({ decisionId: 'E-VARIABILITY' });
    expect(u.reasons.at(-1)?.params).toEqual({ cause: 'NO_COMPARABLE_PERFORMANCE' });
    expect(estimateVariability({ references: [ref({ referenceId: 'r' })], distanceM: 21097.5, priorKey: 'HALF_MARATHON', governance: pending, mode: 'PRODUCTION' }).reasons.at(-1)?.params).toEqual({ cause: 'NO_COMPARABLE_PERFORMANCE' });
    expect(estimateVariability({ references: [race('a', 3000)], distanceM: 10000, priorKey: 'UNKNOWN_KEY', governance: noPersonal, mode: 'PRODUCTION' }).reasons.at(-1)?.params).toEqual({ cause: 'PERSONAL_OR_PRIOR_UNAVAILABLE' });
    const malformed = withParameter(noPersonal, 'running.reference.performanceVariabilityEstimate', (p) => ({ ...p, value: { status: 'candidate', value: { prior: { HALF_MARATHON: { min: 'x', max: 0.04 } } } } }));
    expect(estimateVariability({ references: [], distanceM: 21097.5, priorKey: 'HALF_MARATHON', governance: malformed, mode: 'PRODUCTION' }).kind).toBe('UNKNOWN');
    const malformedMax = withParameter(noPersonal, 'running.reference.performanceVariabilityEstimate', (p) => ({ ...p, value: { status: 'candidate', value: { prior: { HALF_MARATHON: { min: 0.02, max: 'x' } } } } }));
    expect(estimateVariability({ references: [], distanceM: 21097.5, priorKey: 'HALF_MARATHON', governance: malformedMax, mode: 'PRODUCTION' }).kind).toBe('UNKNOWN');
    // Décision approuvée mais paramètre non éligible en PRODUCTION : UNKNOWN, jamais une exception.
    const ineligible = { ...G, decisions: { ...G.decisions, 'E-VARIABILITY': 'APPROVED' as const } };
    expect(estimateVariability({ references: [], distanceM: 21097.5, priorKey: 'HALF_MARATHON', governance: ineligible, mode: 'PRODUCTION' }).kind).toBe('UNKNOWN');
    expect(estimateVariability({ references: [], distanceM: 21097.5, priorKey: 'HALF_MARATHON', governance: G, mode: 'PRODUCTION' }).reasons.map((r) => r.params.parameterId).filter(Boolean)).toEqual(['running.reference.variabilityMinComparablePerformances', 'running.reference.performanceVariabilityEstimate']);
  });
});

describe('interface de modèle de performance', () => {
  it('le candidat type Riegel n’est ni autoritaire ni implémenté ; aucun modèle ne couvre le marathon', () => {
    expect(PERFORMANCE_MODELS.every((m) => m.authoritative === false && m.implementation === 'NOT_IMPLEMENTED')).toBe(true);
    expect(PERFORMANCE_MODELS.flatMap((m) => m.supportedGoals)).not.toContain('MARATHON');
    expect(PERFORMANCE_MODELS).toEqual([{
      modelId: 'riegel-type-candidate', version: '0.0.0', supportedGoals: ['FIVE_K', 'TEN_K', 'HALF_MARATHON'],
      inputRequirements: ['one recent race or time trial (distance, duration)'], uncertainty: 'RANGE_REQUIRED',
      parameterIds: ['running.performance.extrapolationModelFamily', 'running.performance.extrapolationExponent', 'running.performance.predictionUncertaintyWidth'],
      provenance: 'RS-VICKERS-2016-PRED (famille candidate ; exposant non verrouillé)', authoritative: false, implementation: 'NOT_IMPLEMENTED',
    }]);
  });

  it('marathon : MODEL_UNAVAILABLE même avec une gouvernance entièrement approuvée', () => {
    const r = selectPerformanceModel('MARATHON', { governance: fullyApprovedGovernance(), mode: 'PRODUCTION', requested: true, references: [ref({ referenceId: 'r' })] });
    expect(r).toMatchObject({ status: 'unavailable', cause: 'MARATHON_NO_AUTHORITATIVE_MODEL', reasons: [{ code: RUNNING_CODES.MODEL_UNAVAILABLE, params: { goal: 'MARATHON' } }] });
  });

  it('capacité indisponible, puis aucune implémentation : MODEL_UNAVAILABLE avec la cause exacte', () => {
    expect(selectPerformanceModel('HALF_MARATHON', { governance: G, mode: 'CANDIDATE', requested: true, references: [] })).toMatchObject({ status: 'unavailable', cause: 'CAPABILITY_UNAVAILABLE' });
    expect(selectPerformanceModel('HALF_MARATHON', { governance: fullyApprovedGovernance(), mode: 'PRODUCTION', requested: true, references: [ref({ referenceId: 'r' })] })).toMatchObject({ status: 'unavailable', cause: 'NO_IMPLEMENTED_MODEL' });
    expect(selectPerformanceModel('GENERAL_RUNNING', { governance: G, mode: 'CANDIDATE', requested: true, references: [] })).toMatchObject({ status: 'unavailable', cause: 'GOAL_NOT_COVERED' });
  });
});
