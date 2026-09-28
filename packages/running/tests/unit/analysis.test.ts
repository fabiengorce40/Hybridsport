/**
 * Phase 6B — éligibilité ≠ précision, dégradations explicites, V33 / V34, marathon, premières
 * expositions, confiance de prescription séparée, déterminisme et observabilité.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CURRENT_RUNNING_GOVERNANCE, RUNNING_CODES, RUNNING_SESSION_ARCHETYPES, analyzeRunning, prescriptionConfidence, targetPrecision } from '../../src/index.js';
import type { RunningContextInput, RunningWave1Analysis, SessionAssessment } from '../../src/index.js';
import { NOW, ctx, fullyApprovedGovernance, ref } from '../fixtures.js';

const G = CURRENT_RUNNING_GOVERNANCE;
const run = (o: Partial<RunningContextInput> = {}, g = G): RunningWave1Analysis => analyzeRunning(ctx(o), g, NOW);
const session = (a: RunningWave1Analysis, archetype: string): SessionAssessment => {
  const s = a.sessions.find((x) => x.archetype === archetype);
  if (!s) throw new Error(archetype);
  return s;
};
const codes = (xs: readonly { code: string }[]) => xs.map((x) => x.code);
const recentRace = ref({ referenceId: 'r10k' });

describe('éligibilité distincte de la précision', () => {
  it('EASY éligible alors que l’allure n’est pas prescriptible : précision EFFORT_ONLY, jamais « séance interdite »', () => {
    const a = run({ references: [] });
    const easy = session(a, 'EASY');
    expect(easy.eligibility).toMatchObject({ status: 'ELIGIBLE', blocking: [] });
    expect(easy.precision).toMatchObject({ level: 'EFFORT_ONLY', causes: ['REFERENCE_MISSING'] });
    expect(easy.degradations.map((d) => d.effect)).toEqual(['PRECISION_REDUCED']);
    expect(easy.prescriptionConfidence).toMatchObject({ level: 'NONE', consequences: expect.arrayContaining(['EFFORT_PRIORITY', 'TEST_PROPOSED']) });
  });

  it('allure en plage seulement si tout est réuni (capacité, montre, référence, V03 pour ce niveau)', () => {
    expect(session(run({ references: [recentRace] }), 'EASY').precision).toMatchObject({ level: 'PACE_RANGE', causes: [] });
    expect(session(run({ references: [recentRace], sensors: { wearable: false, heartRate: false } }), 'EASY').precision).toMatchObject({ level: 'EFFORT_ONLY', causes: ['NO_WEARABLE'] });
    expect(session(run({ references: [recentRace], capabilityRequests: [] }), 'EASY').precision.causes).toEqual(['PACE_TARGETS_DISABLED']);
    const declared = ref({ referenceId: 'd', type: 'USER_DECLARED', values: { paceSecPerKm: 300 } });
    expect(session(run({ references: [declared] }), 'EASY').precision.causes).toEqual(['REFERENCE_CONFIDENCE_INSUFFICIENT']); // V03 : LOW ⇒ pas d'allure
    expect(session(run({ references: [recentRace] }), 'STRIDES').precision).toMatchObject({ level: 'EFFORT_ONLY', causes: ['EFFORT_BY_NATURE'] });
    expect(session(run({ references: [recentRace] }), 'STRIDES').degradations).toEqual([]); // l'effort par nature n'est pas une dégradation
  });

  it('la correspondance effort ↔ domaine (V02) n’est jamais calculée : seul son statut est exposé', () => {
    expect(session(run(), 'EASY').precision.effortMapping).toEqual({ parameterId: 'running.target.rpeByDomain', status: 'resolved-candidate' });
    expect(targetPrecision({ archetype: 'EASY', sessionAvailable: true, paceTargetsEnabled: false, wearable: true, referenceConfidence: 'NONE', mode: 'PRODUCTION', parameters: G.parameters }).effortMapping.status).toBe('unresolved');
    expect(JSON.stringify(run())).not.toMatch(/"rpeRange"|"rpeTarget"/);
  });

  it('une confiance de prescription faible ne rend pas la séance inéligible (types séparés)', () => {
    const pc = prescriptionConfidence({ referenceConfidence: 'LOW', precision: { level: 'EFFORT_ONLY', causes: ['REFERENCE_CONFIDENCE_INSUFFICIENT'], effortMapping: { parameterId: 'x', status: 'unresolved' }, reasons: [] }, variabilityKnown: false });
    expect(pc).toEqual({ level: 'LOW', limitingFactors: ['REFERENCE', 'TARGET_PRECISION'], consequences: ['EFFORT_PRIORITY'] });
    expect(Object.keys(pc)).not.toContain('eligible');
    expect(prescriptionConfidence({ referenceConfidence: 'HIGH', precision: { level: 'PACE_RANGE', causes: [], effortMapping: { parameterId: 'x', status: 'unresolved' }, reasons: [] }, variabilityKnown: false })).toEqual({ level: 'MEDIUM', limitingFactors: ['VARIABILITY'], consequences: ['WIDER_RANGES'] });
    expect(prescriptionConfidence({ referenceConfidence: 'HIGH', precision: { level: 'PACE_RANGE', causes: [], effortMapping: { parameterId: 'x', status: 'unresolved' }, reasons: [] }, variabilityKnown: true })).toEqual({ level: 'HIGH', limitingFactors: ['REFERENCE', 'TARGET_PRECISION', 'VARIABILITY'], consequences: [] });
    const eligibleLow = session(run({ references: [ref({ referenceId: 'd', type: 'USER_DECLARED', values: { paceSecPerKm: 300 } })] }), 'EASY');
    expect(eligibleLow.eligibility.status).toBe('ELIGIBLE');
    expect(eligibleLow.prescriptionConfidence?.level).toBe('LOW');
  });
});

describe('dégradations et indisponibilités explicites', () => {
  it('P-R0 avec V33 non résolu ⇒ entrée novice indisponible (NO_VALID), pour TOUS les archétypes, même EASY', () => {
    const a = run({ population: { level: 'P_R0', hybrid: false } });
    for (const arch of RUNNING_SESSION_ARCHETYPES) {
      const s = session(a, arch);
      expect(s.eligibility.status, arch).toBe('UNAVAILABLE');
      expect(s.eligibility.blocking, arch).toContain('noviceEntry');
      expect(codes(s.eligibility.reasons), arch).toContain(RUNNING_CODES.NOVICE_ENTRY_UNRESOLVED);
      expect(s.degradations.find((d) => d.capability === 'noviceEntry')).toMatchObject({ effect: 'NO_VALID', parameterIds: ['running.novice.entryDose'] });
      expect(s.precision.level).toBe('NOT_APPLICABLE');
    }
  });

  it('reprise LONG ou UNKNOWN sans séance post-retour, V34 non résolu ⇒ première prescription indisponible', () => {
    for (const state of ['LONG', 'UNKNOWN'] as const) {
      const s = session(run({ returnState: { state, postReturnSessions: 0 } }), 'EASY');
      expect(s.eligibility.blocking).toEqual(['longReturn']);
      expect(s.eligibility.reasons[0]).toMatchObject({ code: RUNNING_CODES.RETURN_PROTOCOL_UNRESOLVED, params: { returnState: state } });
      expect(s.degradations[0]).toMatchObject({ effect: 'NO_VALID', parameterIds: ['running.return.firstExposureDose'] });
    }
    // Après des séances post-retour, ou pour une reprise courte : la règle V34 ne s'applique pas.
    expect(session(run({ returnState: { state: 'LONG', postReturnSessions: 2 } }), 'EASY').eligibility.status).toBe('ELIGIBLE');
    expect(session(run({ returnState: { state: 'SHORT', postReturnSessions: 0 } }), 'EASY').eligibility.status).toBe('ELIGIBLE');
    expect(session(run({ returnState: { state: 'MODERATE', postReturnSessions: 0 } }), 'EASY').eligibility.status).toBe('ELIGIBLE');
  });

  it('marathon sans règle : programmation générale explicite SANS prétention marathon ; strict ou allure marathon ⇒ indisponible', () => {
    const a = run({ goal: { type: 'MARATHON' } });
    expect(a.degradations.find((d) => d.effect === 'GENERAL_PROGRAM_WITHOUT_GOAL_CLAIM')).toMatchObject({ subject: 'GOAL:MARATHON', capability: 'marathon', reason: { code: RUNNING_CODES.MARATHON_RULE_UNRESOLVED, params: { strict: false } } });
    expect(session(a, 'EASY').eligibility.status).toBe('ELIGIBLE');
    expect(session(a, 'RACE_PACE').eligibility).toMatchObject({ status: 'UNAVAILABLE', blocking: ['marathon'] });
    const strict = run({ goal: { type: 'MARATHON', strict: true } });
    expect(session(strict, 'EASY').eligibility.reasons[0]).toMatchObject({ code: RUNNING_CODES.MARATHON_RULE_UNRESOLVED, params: { strict: true } });
    expect(strict.degradations.some((d) => d.effect === 'GENERAL_PROGRAM_WITHOUT_GOAL_CLAIM')).toBe(false);
  });

  it('premières expositions non résolues : composant indisponible ; avec historique : éligible', () => {
    const a = run();
    expect(session(a, 'THRESHOLD').eligibility).toMatchObject({ status: 'UNAVAILABLE', blocking: ['firstThresholdExposure'] });
    for (const arch of ['SEVERE', 'SHORT_INTERVAL', 'HILLS']) {
      expect(session(a, arch).eligibility.blocking, arch).toEqual(['firstSevereExposure']);
      expect(session(a, arch).degradations[0]?.effect, arch).toBe('COMPONENT_UNAVAILABLE');
    }
    const withHistory = run({ exposures: [{ archetype: 'THRESHOLD', lastAt: '2026-09-28T08:00:00Z', count: 3 }, { archetype: 'HILLS', lastAt: '2026-09-21T08:00:00Z', count: 1 }] });
    expect(session(withHistory, 'THRESHOLD').eligibility.status).toBe('ELIGIBLE');
    expect(session(withHistory, 'HILLS').eligibility.status).toBe('ELIGIBLE');
    expect(session(withHistory, 'SEVERE').eligibility.status).toBe('UNAVAILABLE');
  });

  it('progression au-delà de l’historique indisponible ⇒ HOLD / restauration seulement ; long run en HOLD / restauration', () => {
    const a = run();
    expect(a.degradations.find((d) => d.subject === 'PROGRESSION')).toMatchObject({ effect: 'HOLD_OR_RESTORE_ONLY', capability: 'progressionBeyondHistory', parameterIds: ['running.progression.magnitude'] });
    expect(session(a, 'LONG').degradations.map((d) => d.effect)).toContain('HOLD_OR_RESTORE_ONLY');
    expect(session(a, 'LONG').eligibility.status).toBe('ELIGIBLE');
  });

  it('modèle de performance indisponible ⇒ calibration requise (objectif de course sans référence spécifique)', () => {
    const a = run({ goal: { type: 'HALF_MARATHON' }, references: [recentRace] });
    expect(a.performanceModel).toMatchObject({ status: 'unavailable', cause: 'CAPABILITY_UNAVAILABLE' });
    expect(a.degradations.find((d) => d.effect === 'CALIBRATION_REQUIRED')).toMatchObject({ subject: 'GOAL:HALF_MARATHON', capability: 'performanceExtrapolation' });
    // Référence spécifique à la distance : pas de calibration exigée par le modèle.
    expect(run({ goal: { type: 'TEN_K' }, references: [recentRace] }).degradations.some((d) => d.effect === 'CALIBRATION_REQUIRED')).toBe(false);
  });

  it('allure spécifique sans objectif de course ⇒ GOAL_UNSUPPORTED ; PROGRESSION_RUN ⇒ hors V1 ; hybride sans planificateur ⇒ indisponible', () => {
    expect(session(run({ goal: { type: 'GENERAL_RUNNING' } }), 'RACE_PACE').eligibility).toMatchObject({ status: 'UNAVAILABLE', blocking: ['goal'], reasons: [{ code: RUNNING_CODES.GOAL_UNSUPPORTED }] });
    expect(session(run(), 'PROGRESSION_RUN')).toMatchObject({ eligibility: { status: 'UNAVAILABLE', blocking: ['post_v1'] }, precision: { level: 'NOT_APPLICABLE' } });
    expect(session(run({ population: { level: 'P_R3', hybrid: true } }), 'EASY').eligibility).toMatchObject({ status: 'UNAVAILABLE', blocking: ['hybridPlanning'], reasons: [{ code: RUNNING_CODES.HYBRID_PLANNER_UNAVAILABLE }] });
  });

  it('PRODUCTION aujourd’hui : le socle (4 G1 non signées) bloque TOUTES les séances', () => {
    const a = run({ mode: 'PRODUCTION', references: [recentRace] });
    expect(a.foundation.eligible).toBe(false);
    for (const s of a.sessions) {
      expect(s.eligibility.status, s.archetype).toBe('UNAVAILABLE');
      if (s.archetype !== 'PROGRESSION_RUN') expect(codes(s.eligibility.reasons), s.archetype).toContain(RUNNING_CODES.G1_POLICY_UNSIGNED);
    }
  });

  it('gouvernance entièrement approuvée (simulée), PRODUCTION : EASY éligible, allure en plage', () => {
    const a = run({ mode: 'PRODUCTION', references: [recentRace] }, fullyApprovedGovernance());
    expect(session(a, 'EASY').eligibility.status).toBe('ELIGIBLE');
    expect(session(a, 'THRESHOLD').eligibility.status).toBe('ELIGIBLE'); // capacité de première exposition éligible dans la simulation
  });
});

describe('déterminisme et observabilité', () => {
  it('mêmes contexte, gouvernance et instant ⇒ même analyse, même trace (propriété)', () => {
    fc.assert(fc.property(
      fc.constantFrom('P_R0', 'P_R1', 'P_R2', 'P_R3', 'P_R4'), fc.boolean(), fc.constantFrom('GENERAL_RUNNING', 'FIVE_K', 'TEN_K', 'HALF_MARATHON', 'MARATHON'),
      fc.constantFrom('NONE', 'SHORT', 'MODERATE', 'LONG', 'UNKNOWN'), fc.constantFrom('CANDIDATE', 'PRODUCTION'), fc.subarray(['paceTargets', 'marathon', 'noviceEntry', 'performanceExtrapolation'] as const),
      (level, hybrid, goal, state, mode, caps) => {
        const o: Partial<RunningContextInput> = { population: { level, hybrid }, goal: { type: goal }, returnState: { state, postReturnSessions: 0 }, mode, capabilityRequests: [...caps], references: [recentRace] };
        expect(JSON.stringify(run(o))).toBe(JSON.stringify(run(JSON.parse(JSON.stringify(o)) as Partial<RunningContextInput>)));
      },
    ), { numRuns: 80 });
  });

  it('la trace répond aux questions : capacité activée/désactivée, paramètre et G1 bloquants, précision dégradée, référence retenue/rejetée, version', () => {
    const a = run({ references: [recentRace, ref({ referenceId: 'vo2', type: 'VO2MAX_TEST', values: { vo2MlKgMin: 55 } })], sensors: { wearable: false, heartRate: false } });
    expect(a.rulesetVersion).toBe(G.rulesetVersion);
    const steps = new Set(a.trace.map((t) => t.step));
    expect([...steps].sort()).toEqual(['capability', 'degradation', 'governance', 'model', 'reference', 'session', 'variability']);
    expect(a.trace.find((t) => t.step === 'capability' && t.subject === 'noviceEntry')).toMatchObject({ decision: 'DISABLED' });
    const noviceReasons = a.trace.find((t) => t.subject === 'noviceEntry')?.reasons ?? [];
    expect(noviceReasons.find((r) => r.code === RUNNING_CODES.UNRESOLVED_PARAMETER)?.params.parameterId).toBe('running.novice.entryDose');
    expect(codes(a.trace.find((t) => t.step === 'governance')?.reasons ?? [])).toContain(RUNNING_CODES.G1_POLICY_UNSIGNED);
    expect(a.trace.find((t) => t.step === 'session' && t.subject === 'EASY')?.decision).toBe('ELIGIBLE/EFFORT_ONLY');
    expect(codes(a.trace.find((t) => t.step === 'session' && t.subject === 'EASY')?.reasons ?? [])).toContain(RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED);
    const intensity = a.trace.find((t) => t.step === 'reference' && t.subject === 'INTENSITY_TARGETING');
    expect(intensity?.decision).toBe('SELECTED:r10k:HIGH');
    expect(codes(intensity?.reasons ?? [])).toEqual(expect.arrayContaining([RUNNING_CODES.REFERENCE_SELECTED, RUNNING_CODES.REFERENCE_REJECTED]));
  });
});
