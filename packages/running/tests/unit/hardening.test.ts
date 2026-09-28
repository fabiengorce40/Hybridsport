/**
 * Phase 6B — durcissement guidé par la mutation (lots 1 à 6) : comportements réellement exigés
 * (dépendances exactes des capacités, fail-closed par défaut, éligibilité ≠ précision, trace).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  APPROVER_ROLE, CAPABILITIES, CAPABILITY_IDS, CURRENT_RUNNING_GOVERNANCE, FOUNDATION, RUNNING_CODES, analyzeRunning, assessProductionEligibility, capabilityState,
  eligibilityBlockers, governanceIssues, meetsRequiredMaturity, registryIssues, sortDegradations, targetPrecision, transitionMaturity, zRunningParameter,
} from '../../src/index.js';
import type { Degradation, RunningContextInput, RunningParameter, RunningWave1Analysis } from '../../src/index.js';
import { runningReasons } from '../../src/codes.js';
import { NOW, ctx, fullyApprovedGovernance, ref, withParameter } from '../fixtures.js';

const G = CURRENT_RUNNING_GOVERNANCE;
const A = fullyApprovedGovernance();
const param = (id: string): RunningParameter => {
  const p = G.parameters.find((x) => x.parameterId === id);
  if (!p) throw new Error(id);
  return p;
};
const run = (o: Partial<RunningContextInput> = {}, g = G): RunningWave1Analysis => analyzeRunning(ctx(o), g, NOW);
const session = (a: RunningWave1Analysis, arch: string) => {
  const s = a.sessions.find((x) => x.archetype === arch);
  if (!s) throw new Error(arch);
  return s;
};

describe('dépendances EXACTES de chaque capacité (lot 2)', () => {
  it('chaque décision et chaque paramètre propres à une capacité la bloquent individuellement', () => {
    for (const id of CAPABILITY_IDS) {
      const def = CAPABILITIES[id];
      for (const d of def.decisions) {
        const e = assessProductionEligibility(id, { ...A, decisions: { ...A.decisions, [d]: 'PENDING' } });
        expect(e.blockingDecisionIds, `${id}:${d}`).toEqual([d]);
      }
      for (const p of def.parameters) {
        const e = assessProductionEligibility(id, withParameter(A, p, () => param(p)));
        expect(e.blockingParameterIds, `${id}:${p}`).toContain(p);
        expect(e.eligible).toBe(false);
      }
    }
  });

  it('les dépendances déclarées correspondent au graphe 5G', () => {
    expect(Object.fromEntries(CAPABILITY_IDS.map((id) => [id, CAPABILITIES[id].decisions]))).toEqual({
      noviceEntry: [], longReturn: [], progressionBeyondHistory: ['E-RECENTLOAD', 'E-PROG'], longRunProgression: ['E-LONG', 'E-PROG'],
      firstThresholdExposure: ['E-FIRST', 'E-RECOVERY'], firstSevereExposure: ['E-FIRST', 'E-RECOVERY'], marathon: ['E-LONG', 'E-TAPER'],
      performanceExtrapolation: ['E-MODEL', 'E-VARIABILITY'], taper: ['E-TAPER'], paceTargets: ['E-PACE'], hybridPlanning: [],
    });
    expect(Object.fromEntries(CAPABILITY_IDS.map((id) => [id, CAPABILITIES[id].parameters]))).toEqual({
      noviceEntry: ['running.safety.noviceEntryProtocol', 'running.novice.entryDose'],
      longReturn: ['running.return.stateBoundaries', 'running.return.protocol', 'running.return.unknownStateHandling', 'running.return.firstExposureDose'],
      progressionBeyondHistory: ['running.load.recentLoadContext', 'running.progression.magnitude'],
      longRunProgression: ['running.longRun.marginAndBound', 'running.progression.magnitude'],
      firstThresholdExposure: ['running.firstExposure.threshold', 'running.interval.recoveryRatio'],
      firstSevereExposure: ['running.firstExposure.severe', 'running.firstExposure.hills', 'running.interval.recoveryRatio'],
      marathon: ['running.longRun.marginAndBound', 'running.taper.durationMarathon'],
      performanceExtrapolation: ['running.performance.extrapolationModelFamily', 'running.performance.extrapolationExponent', 'running.performance.predictionUncertaintyWidth', 'running.reference.performanceVariabilityEstimate'],
      taper: ['running.taper.volumeReduction', 'running.taper.durationByEvent'],
      paceTargets: ['running.target.paceRangeWidthByConfidence', 'running.threshold.likeMargin'],
      hybridPlanning: [],
    });
    // Identifiants et clés de configuration 5G (`running.<capacité>.enabled`) cohérents avec leur entrée.
    for (const id of CAPABILITY_IDS) expect([CAPABILITIES[id].id, CAPABILITIES[id].flagKey]).toEqual([id, `running.${id}.enabled`]);
    expect([FOUNDATION.id, FOUNDATION.flagKey]).toEqual(['foundation', 'running.foundation']);
    expect(CAPABILITIES.noviceEntry.g1Policies).toEqual(['G1-SCOPE', 'G1-NOVICE']);
    expect(CAPABILITIES.longReturn.g1Policies).toEqual(['G1-RETURN']);
  });

  it('CANDIDATE : dépendance technique satisfaite ⇒ activée ; tout approuvé ⇒ activée SANS dérogation ; causes exactes', () => {
    const planner = { ...G, technical: { ...G.technical, GLOBAL_PLANNER_INTEGRATION: 'SATISFIED' as const } };
    expect(capabilityState('hybridPlanning', planner, 'CANDIDATE', true)).toMatchObject({ enabled: true, candidateOverride: true });
    expect(capabilityState('taper', A, 'CANDIDATE', true)).toEqual(expect.objectContaining({ enabled: true, candidateOverride: false, reasons: [runningReasons.emit(RUNNING_CODES.CAPABILITY_ENABLED, { capability: 'taper', mode: 'CANDIDATE' })] }));
    expect(capabilityState('taper', A, 'PRODUCTION', true).reasons).toEqual([runningReasons.emit(RUNNING_CODES.CAPABILITY_ENABLED, { capability: 'taper', mode: 'PRODUCTION' })]);
    expect(capabilityState('taper', A, 'PRODUCTION', false)).toMatchObject({ enabled: false, candidateOverride: false });
    expect(capabilityState('taper', G, 'PRODUCTION', true).reasons[0]?.params.cause).toBe('NOT_PRODUCTION_ELIGIBLE');
    expect(capabilityState('taper', G, 'CANDIDATE', true).reasons[0]?.params.cause).toBe('PARAMETER_WITHOUT_VALUE');
    expect(capabilityState('hybridPlanning', G, 'CANDIDATE', true).reasons[0]?.params.cause).toBe('TECHNICAL_DEPENDENCY');
  });

  it('bloqueurs de dérogation : le verrou n’apparaît que s’il manque', () => {
    const locked = { ...A, decisions: { ...A.decisions, 'E-PACE': 'PENDING' as const } };
    expect(eligibilityBlockers(assessProductionEligibility('paceTargets', locked))).toEqual(['E-PACE']);
    expect(eligibilityBlockers(assessProductionEligibility('paceTargets', { ...locked, rulesetLocked: false }))).toEqual(['E-PACE', 'RULESET_NOT_LOCKED']);
  });
});

describe('registre et maturité (lot 3)', () => {
  it('identifiants et étiquettes ancrés ; entrée malformée signalée', () => {
    const v02 = param('running.target.rpeByDomain');
    for (const bad of [{ ...v02, parameterId: 'xrunning.a' }, { ...v02, parameterId: 'running.a b' }, { ...v02, tag: 'XV02' }, { ...v02, tag: 'V02x' }]) expect(zRunningParameter.safeParse(bad).success).toBe(false);
    expect(registryIssues([{ parameterId: 'running.broken' } as unknown as RunningParameter])).toEqual(['running.broken : schéma invalide']);
  });

  it('G1 à SAFETY_APPROVED avec ses approbations : cohérent ; approbations exigées pour chaque état, rôle compris', () => {
    const v24 = param('running.return.stateBoundaries');
    const safe = transitionMaturity(v24, 'SAFETY_APPROVED', { role: 'SAFETY', reference: 'S' });
    if (!safe.ok) throw new Error('signature');
    expect(registryIssues([safe.parameter])).toEqual([]);
    expect(registryIssues([{ ...safe.parameter, approvals: [{ state: 'SAFETY_APPROVED', role: 'EXPERT', reference: 'S' }] }])).toEqual(['running.return.stateBoundaries : état SAFETY_APPROVED sans approbation SAFETY']);
    expect(registryIssues([{ ...safe.parameter, approvals: [{ state: 'EXPERT_APPROVED', role: 'SAFETY', reference: 'S' }] }])).toEqual(['running.return.stateBoundaries : état SAFETY_APPROVED sans approbation SAFETY']);
    expect(registryIssues([{ ...safe.parameter, maturity: 'PRODUCTION_ELIGIBLE' }])).toEqual(['running.return.stateBoundaries : état PRODUCTION_ELIGIBLE sans approbation RULESET_GATE']);
    expect(registryIssues([{ ...param('running.target.rpeByDomain'), maturity: 'PRODUCT_APPROVED' }])).toEqual(expect.arrayContaining(['running.target.rpeByDomain : maturité PRODUCT_APPROVED hors du chemin EXPERT']));
  });

  it('une dose G1 légitimement signée (V33 : proposée → experte → sécurité) est cohérente pour le registre', () => {
    let v33 = param('running.novice.entryDose');
    for (const [to, role, value] of [['EXPERT_PROPOSED', 'AUTHOR', { testOnly: true }], ['EXPERT_APPROVED', 'EXPERT', undefined], ['SAFETY_APPROVED', 'SAFETY', undefined]] as const) {
      const r = transitionMaturity(v33, to, { role, reference: `T-${to}` }, { rulesetLocked: false, ...(value !== undefined ? { value } : {}) });
      if (!r.ok) throw new Error(String(r.reason.params.cause));
      v33 = r.parameter;
    }
    expect(v33.maturity).toBe('SAFETY_APPROVED');
    expect(registryIssues([v33])).toEqual([]);
  });

  it('par défaut, le ruleset est considéré NON verrouillé (fail-closed) ; révision réservée à l’auteur', () => {
    const a = transitionMaturity(param('running.target.rpeByDomain'), 'EXPERT_APPROVED', { role: 'EXPERT', reference: 'E' });
    if (!a.ok) throw new Error('approbation');
    const pe = transitionMaturity(a.parameter, 'PRODUCTION_ELIGIBLE', { role: APPROVER_ROLE.PRODUCTION_ELIGIBLE, reference: 'G' });
    expect(!pe.ok && pe.reason.params.cause).toBe('ruleset non verrouillé');
    const rev = transitionMaturity(a.parameter, 'EXPERT_PROPOSED', { role: 'EXPERT', reference: 'R' });
    expect(!rev.ok && rev.reason.params.cause).toBe('rôle non habilité');
  });

  it('état requis atteint ⇒ exigence satisfaite ; valeur absente ⇒ jamais, même avec une maturité falsifiée', () => {
    const a = transitionMaturity(param('running.target.rpeByDomain'), 'EXPERT_APPROVED', { role: 'EXPERT', reference: 'E' });
    expect(a.ok && meetsRequiredMaturity(a.parameter)).toBe(true);
    expect(meetsRequiredMaturity({ ...param('running.novice.entryDose'), maturity: 'SAFETY_APPROVED' })).toBe(false);
    expect(meetsRequiredMaturity({ ...param('running.novice.entryDose'), maturity: 'PRODUCTION_ELIGIBLE' })).toBe(false);
  });

  it('gouvernance : schéma invalide et version de ruleset incohérente signalés', () => {
    expect(governanceIssues({ ...G, rulesetLocked: 'no' })).toEqual(['rulesetLocked : Invalid input: expected boolean, received string']);
    const v = withParameter(G, 'running.target.rpeByDomain', (p) => ({ ...p, rulesetVersion: 'autre' }));
    expect(governanceIssues(v)).toEqual([`running.target.rpeByDomain : version autre ≠ ruleset ${G.rulesetVersion}`]);
  });
});

describe('verrous de population et de périmètre (lot 4)', () => {
  it('objectif « course générale » : EASY et LONG restent éligibles (seul RACE_PACE est refusé)', () => {
    const a = run({ goal: { type: 'GENERAL_RUNNING' } });
    expect(session(a, 'EASY').eligibility.status).toBe('ELIGIBLE');
    expect(session(a, 'LONG').eligibility.status).toBe('ELIGIBLE');
  });

  it('blocages et dégradations exacts (observabilité)', () => {
    const prod = session(run({ mode: 'PRODUCTION' }), 'EASY');
    expect(prod.eligibility.blocking).toEqual(['foundation']);
    const hybrid = session(run({ population: { level: 'P_R2', hybrid: true } }), 'EASY');
    expect(hybrid.degradations).toEqual([expect.objectContaining({ effect: 'NO_VALID', subject: 'EASY', capability: 'hybridPlanning', parameterIds: [] })]);
    const marathon = session(run({ goal: { type: 'MARATHON', strict: true } }), 'EASY');
    expect(marathon.degradations).toEqual([expect.objectContaining({ effect: 'NO_VALID', capability: 'marathon', parameterIds: ['running.longRun.marginAndBound'] })]);
    const novice = session(run({ population: { level: 'P_R0', hybrid: false } }), 'EASY');
    expect(novice.eligibility.reasons[0]?.params).toEqual({ population: 'P_R0' });
    expect(session(run(), 'LONG').degradations.filter((d) => d.effect === 'HOLD_OR_RESTORE_ONLY')).toEqual([expect.objectContaining({ effect: 'HOLD_OR_RESTORE_ONLY', subject: 'LONG', capability: 'longRunProgression', parameterIds: ['running.longRun.marginAndBound'], reason: expect.objectContaining({ params: { capability: 'longRunProgression' } }) })]);
  });
});

describe('éligibilité ≠ précision (lot 5)', () => {
  it('séance indisponible : ni dégradation de précision, ni confiance de prescription ; précision NOT_APPLICABLE complète', () => {
    const s = session(run({ population: { level: 'P_R0', hybrid: false } }), 'EASY');
    expect(s.degradations.map((d) => d.effect)).toEqual(['NO_VALID']);
    expect(s.prescriptionConfidence).toBeUndefined();
    expect(session(run(), 'PROGRESSION_RUN').precision).toEqual({ level: 'NOT_APPLICABLE', causes: ['SESSION_UNAVAILABLE'], effortMapping: { parameterId: 'running.target.rpeByDomain', status: 'unresolved' }, reasons: [] });
    expect(targetPrecision({ archetype: 'EASY', sessionAvailable: false, paceTargetsEnabled: true, wearable: true, referenceConfidence: 'HIGH', mode: 'CANDIDATE', parameters: G.parameters })).toEqual({ level: 'NOT_APPLICABLE', causes: ['SESSION_UNAVAILABLE'], effortMapping: { parameterId: 'running.target.rpeByDomain', status: 'resolved-candidate' }, reasons: [] });
  });

  it('effort par nature (lignes droites, test) : jamais une dégradation, même sans montre', () => {
    for (const arch of ['STRIDES', 'TEST']) {
      const s = session(run({ references: [ref({ referenceId: 'r' })], sensors: { wearable: false, heartRate: false } }), arch);
      expect(s.precision.causes, arch).toContain('EFFORT_BY_NATURE');
      expect(s.degradations, arch).toEqual([]);
      expect(s.precision.reasons.map((r) => r.code), arch).not.toContain(RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED);
    }
  });

  it('dégradation de précision complète ; paramètre V03 non résolu ou incomplet ⇒ causes exactes', () => {
    const s = session(run(), 'EASY');
    expect(s.degradations).toEqual([expect.objectContaining({ effect: 'PRECISION_REDUCED', subject: 'EASY', capability: 'paceTargets', parameterIds: ['running.target.paceRangeWidthByConfidence'], reason: expect.objectContaining({ params: { archetype: 'EASY', precision: 'EFFORT_ONLY', cause: 'REFERENCE_MISSING' } }) })]);
    const base = { archetype: 'EASY' as const, sessionAvailable: true, paceTargetsEnabled: true, wearable: true, referenceConfidence: 'HIGH' as const };
    const prod = targetPrecision({ ...base, mode: 'PRODUCTION', parameters: G.parameters });
    expect(prod.causes).toEqual(['PARAMETER_UNRESOLVED']);
    expect(prod.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.UNRESOLVED_PARAMETER, RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED]);
    const empty = withParameter(G, 'running.target.paceRangeWidthByConfidence', (p) => ({ ...p, value: { status: 'candidate', value: {} } }));
    expect(targetPrecision({ ...base, mode: 'CANDIDATE', parameters: empty.parameters }).causes).toEqual(['REFERENCE_CONFIDENCE_INSUFFICIENT']);
    const ok = targetPrecision({ ...base, mode: 'CANDIDATE', parameters: G.parameters });
    expect(ok).toMatchObject({ level: 'PACE_RANGE', reasons: [{ code: RUNNING_CODES.CANDIDATE_VALUE_USED }] });
  });

  it('la raison attachée à la dégradation de précision est bien PRESCRIPTION_PRECISION_REDUCED, causes jointes', () => {
    const declared = session(run({ references: [ref({ referenceId: 'd', type: 'USER_DECLARED', values: { paceSecPerKm: 300 } })] }), 'EASY');
    expect(declared.degradations[0]?.reason).toMatchObject({ code: RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED, params: { archetype: 'EASY', precision: 'EFFORT_ONLY', cause: 'REFERENCE_CONFIDENCE_INSUFFICIENT' } });
    const both = session(run({ capabilityRequests: [], sensors: { wearable: false, heartRate: false } }), 'EASY');
    expect(both.degradations[0]?.reason.params.cause).toBe('PACE_TARGETS_DISABLED,NO_WEARABLE,REFERENCE_MISSING');
  });

  it('la variabilité connue ou inconnue change la confiance de prescription (pas l’éligibilité)', () => {
    const general = session(run({ goal: { type: 'GENERAL_RUNNING' }, references: [ref({ referenceId: 'r' })] }), 'EASY');
    expect(general.prescriptionConfidence).toEqual({ level: 'MEDIUM', limitingFactors: ['VARIABILITY'], consequences: ['WIDER_RANGES'] });
    const tenK = session(run({ goal: { type: 'TEN_K' }, references: [ref({ referenceId: 'r' })] }), 'EASY');
    expect(tenK.prescriptionConfidence?.level).toBe('HIGH');
  });
});

describe('dégradations globales et trace (lot 6)', () => {
  it('variabilité par objectif ; modèle et calibration selon l’objectif ; aucune dégradation hors situation', () => {
    const general = run({ goal: { type: 'GENERAL_RUNNING' } });
    expect(general.variability).toMatchObject({ kind: 'UNKNOWN', reasons: [{ code: RUNNING_CODES.VARIABILITY_UNKNOWN, params: { cause: 'NO_RACE_GOAL' } }] });
    expect(general.degradations.map((d) => d.effect)).toEqual(['HOLD_OR_RESTORE_ONLY']);
    expect(run({ goal: { type: 'HALF_MARATHON' } }).variability.kind).toBe('CONTEXT_PRIOR');
    const half = run({ goal: { type: 'HALF_MARATHON' } });
    expect(half.degradations.find((d) => d.effect === 'CALIBRATION_REQUIRED')).toMatchObject({ parameterIds: ['running.performance.extrapolationExponent'], reason: { params: { cause: 'MODEL_UNAVAILABLE:CAPABILITY_UNAVAILABLE' } } });
    const approved = run({ goal: { type: 'MARATHON' } }, A);
    // Progression et marathon éligibles dans la simulation : seule reste la calibration (aucun modèle n'a autorité pour le marathon).
    expect(approved.degradations).toEqual([expect.objectContaining({ effect: 'CALIBRATION_REQUIRED', reason: expect.objectContaining({ params: { cause: 'MODEL_UNAVAILABLE:MARATHON_NO_AUTHORITATIVE_MODEL' } }) })]);
    expect(run({ goal: { type: 'MARATHON' } }).degradations.find((d) => d.effect === 'GENERAL_PROGRAM_WITHOUT_GOAL_CLAIM')?.parameterIds).toEqual(['running.longRun.marginAndBound', 'running.taper.durationMarathon']);
  });

  it('modèle : capacité demandée ou non (gouvernance approuvée) ⇒ cause distincte', () => {
    expect(run({ goal: { type: 'HALF_MARATHON' } }, A).performanceModel).toMatchObject({ cause: 'NO_IMPLEMENTED_MODEL' });
    expect(run({ goal: { type: 'HALF_MARATHON' }, capabilityRequests: ['paceTargets'] }, A).performanceModel).toMatchObject({ cause: 'CAPABILITY_UNAVAILABLE' });
  });

  it('trace : décisions libellées, charge récente et dégradations tracées', () => {
    const a = run({ recentLoad: { returnStartedAt: '2026-09-01T00:00:00Z', dimensions: [{ dimension: 'WEEKLY_DURATION', weeks: [{ weekStart: '2026-08-25T00:00:00Z', value: 500, completion: 'COMPLETED' }, { weekStart: '2026-09-08T00:00:00Z', value: 100, completion: 'COMPLETED' }, { weekStart: '2026-09-15T00:00:00Z', value: 120, completion: 'COMPLETED' }] }] } });
    expect(a.recentLoad).toEqual([expect.objectContaining({ dimension: 'WEEKLY_DURATION', status: 'AVAILABLE', bestToleratedExposure: 120, flags: expect.arrayContaining(['POST_RETURN_ONLY']) })]);
    const t = (step: string, subject?: string) => a.trace.find((x) => x.step === step && (subject === undefined || x.subject === subject));
    expect(t('recent_load')).toMatchObject({ subject: 'WEEKLY_DURATION', decision: 'AVAILABLE' });
    expect(t('governance')).toMatchObject({ subject: 'foundation', decision: 'NOT_ELIGIBLE' });
    expect(t('capability', 'paceTargets')?.decision).toBe('ENABLED_CANDIDATE_OVERRIDE');
    expect(t('model')?.decision).toBe('UNAVAILABLE:CAPABILITY_UNAVAILABLE');
    expect(t('reference', 'INTENSITY_TARGETING')?.decision).toBe('NONE');
    expect(t('degradation', 'PROGRESSION')?.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.PROGRESSION_UNRESOLVED]);
    const approved = run({}, A);
    expect(approved.trace.find((x) => x.step === 'governance')?.decision).toBe('ELIGIBLE');
    expect(approved.trace.find((x) => x.step === 'capability' && x.subject === 'taper')?.decision).toBe('ENABLED');
  });

  it('dégradations triées et dédupliquées de façon stable', () => {
    const d = (subject: string, effect: Degradation['effect'], capability?: Degradation['capability']): Degradation => ({ effect, subject, ...(capability ? { capability } : {}), parameterIds: [], reason: runningReasons.emit(RUNNING_CODES.CALIBRATION_REQUIRED, { cause: 'x' }) });
    const out = sortDegradations([d('B', 'NO_VALID'), d('A', 'PRECISION_REDUCED', 'paceTargets'), d('A', 'NO_VALID'), d('B', 'NO_VALID'), d('A', 'NO_VALID', 'taper')]);
    expect(out.map((x) => `${x.subject}/${x.effect}/${x.capability ?? '-'}`)).toEqual(['A/NO_VALID/taper', 'A/NO_VALID/-', 'A/PRECISION_REDUCED/paceTargets', 'B/NO_VALID/-']);
    // Propriété : l'ordre de la trace ne dépend jamais de l'ordre d'entrée.
    const pool = [d('B', 'NO_VALID'), d('A', 'PRECISION_REDUCED', 'paceTargets'), d('A', 'NO_VALID'), d('C', 'CALIBRATION_REQUIRED'), d('A', 'NO_VALID', 'taper')];
    fc.assert(fc.property(fc.shuffledSubarray(pool, { minLength: pool.length, maxLength: pool.length }), (perm) => {
      expect(sortDegradations(perm).map((x) => `${x.subject}/${x.effect}/${x.capability ?? '-'}`)).toEqual(sortDegradations(pool).map((x) => `${x.subject}/${x.effect}/${x.capability ?? '-'}`));
    }), { numRuns: 60 });
  });
});
