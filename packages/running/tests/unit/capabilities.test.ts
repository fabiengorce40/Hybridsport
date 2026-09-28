/**
 * Phase 6B — capacités et éligibilité à la production (fail-closed, déterministe).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  CAPABILITIES, CAPABILITY_IDS, CURRENT_RUNNING_GOVERNANCE, FOUNDATION, RUNNING_CODES, assessProductionEligibility, capabilityState, capabilityStates,
} from '../../src/index.js';
import type { CapabilityId, RunningGovernance } from '../../src/index.js';
import { ALL_CAPABILITIES, fullyApprovedGovernance, withParameter } from '../fixtures.js';

const G = CURRENT_RUNNING_GOVERNANCE;
const codes = (xs: readonly { code: string }[]) => xs.map((x) => x.code);

describe('définitions des capacités (5G)', () => {
  it('11 drapeaux, chacun avec ses dépendances ; le socle couvre les 4 G1 et les 4 décisions du socle', () => {
    expect([...CAPABILITY_IDS]).toEqual([...ALL_CAPABILITIES]);
    expect(FOUNDATION.g1Policies).toEqual(['G1-PAIN', 'G1-SCOPE', 'G1-NOVICE', 'G1-RETURN']);
    expect(FOUNDATION.decisions).toEqual(['E-RPE', 'E-DENSITY', 'E-RECENCY', 'E-RECENTLOAD']);
    expect(CAPABILITIES.noviceEntry.parameters).toContain('running.novice.entryDose');
    expect(CAPABILITIES.longReturn.parameters).toContain('running.return.firstExposureDose');
    expect(CAPABILITIES.progressionBeyondHistory.parameters).toContain('running.progression.magnitude');
    expect(CAPABILITIES.hybridPlanning.technical).toEqual(['GLOBAL_PLANNER_INTEGRATION']);
    for (const id of CAPABILITY_IDS) {
      const d = CAPABILITIES[id];
      for (const p of d.parameters) expect(G.parameters.some((x) => x.parameterId === p), `${id}:${p}`).toBe(true);
      expect(d.decisions.length + d.parameters.length + d.g1Policies.length + d.technical.length, id).toBeGreaterThan(0);
    }
  });
});

describe('RunningProductionEligibility', () => {
  it('état réel : socle et 11 capacités NON éligibles, avec blocages exacts et triés', () => {
    const f = assessProductionEligibility('foundation', G);
    expect(f).toMatchObject({
      eligible: false, rulesetLocked: false,
      blockingG1PolicyIds: ['G1-NOVICE', 'G1-PAIN', 'G1-RETURN', 'G1-SCOPE'],
      blockingDecisionIds: ['E-DENSITY', 'E-RECENCY', 'E-RECENTLOAD', 'E-RPE'],
      blockingTechnicalIds: [],
    });
    expect(f.blockingParameterIds).toEqual([...FOUNDATION.parameters].sort());
    expect(codes(f.reasonCodes)).toEqual(expect.arrayContaining([RUNNING_CODES.G1_POLICY_UNSIGNED, RUNNING_CODES.DECISION_PENDING, RUNNING_CODES.RULESET_NOT_LOCKED, RUNNING_CODES.UNRESOLVED_PARAMETER]));
    for (const id of CAPABILITY_IDS) {
      const e = assessProductionEligibility(id, G);
      expect(e.eligible, id).toBe(false);
      for (const x of f.blockingG1PolicyIds) expect(e.blockingG1PolicyIds, id).toContain(x); // le socle bloque toujours
    }
    expect(assessProductionEligibility('noviceEntry', G).blockingParameterIds).toContain('running.novice.entryDose');
    expect(assessProductionEligibility('hybridPlanning', G).blockingTechnicalIds).toEqual(['GLOBAL_PLANNER_INTEGRATION']);
    expect(assessProductionEligibility('marathon', G).blockingDecisionIds).toEqual(expect.arrayContaining(['E-LONG', 'E-TAPER']));
  });

  it('gouvernance entièrement approuvée (simulée) : tout devient éligible', () => {
    const g = fullyApprovedGovernance();
    expect(assessProductionEligibility('foundation', g)).toMatchObject({ eligible: true, reasonCodes: [] });
    for (const id of CAPABILITY_IDS) expect(assessProductionEligibility(id, g).eligible, id).toBe(true);
  });

  it('chaque dépendance manquante suffit à bloquer (une à la fois)', () => {
    const g = fullyApprovedGovernance();
    const check = (id: CapabilityId | 'foundation', mutate: (x: RunningGovernance) => RunningGovernance, field: 'blockingDecisionIds' | 'blockingParameterIds' | 'blockingG1PolicyIds' | 'blockingTechnicalIds' | 'rulesetLocked', expected: unknown) => {
      const e = assessProductionEligibility(id, mutate(g));
      expect(e.eligible, `${id}/${field}`).toBe(false);
      expect(e[field]).toEqual(expected);
    };
    check('marathon', (x) => ({ ...x, decisions: { ...x.decisions, 'E-TAPER': 'PENDING' } }), 'blockingDecisionIds', ['E-TAPER']);
    check('marathon', (x) => ({ ...x, decisions: { ...x.decisions, 'E-TAPER': 'REJECTED' } }), 'blockingDecisionIds', ['E-TAPER']);
    check('noviceEntry', (x) => ({ ...x, g1Policies: { ...x.g1Policies, 'G1-NOVICE': 'UNSIGNED' } }), 'blockingG1PolicyIds', ['G1-NOVICE']);
    check('taper', (x) => ({ ...x, g1Policies: { ...x.g1Policies, 'G1-PAIN': 'UNSIGNED' } }), 'blockingG1PolicyIds', ['G1-PAIN']);
    check('hybridPlanning', (x) => ({ ...x, technical: { ...x.technical, GLOBAL_PLANNER_INTEGRATION: 'UNSATISFIED' } }), 'blockingTechnicalIds', ['GLOBAL_PLANNER_INTEGRATION']);
    check('paceTargets', (x) => ({ ...x, technical: { ...x.technical, CORE_EXT_R1: 'UNSATISFIED' } }), 'blockingTechnicalIds', ['CORE_EXT_R1']);
    check('taper', (x) => ({ ...x, rulesetLocked: false }), 'rulesetLocked', false);
    check('progressionBeyondHistory', (x) => withParameter(x, 'running.progression.magnitude', () => G.parameters.find((p) => p.parameterId === 'running.progression.magnitude')!), 'blockingParameterIds', ['running.progression.magnitude']);
    check('longReturn', (x) => ({ ...x, parameters: x.parameters.filter((p) => p.parameterId !== 'running.return.firstExposureDose') }), 'blockingParameterIds', ['running.return.firstExposureDose']);
    // Une décision du socle bloque aussi une capacité qui ne la cite pas.
    check('taper', (x) => ({ ...x, decisions: { ...x.decisions, 'E-RPE': 'PENDING' } }), 'blockingDecisionIds', ['E-RPE']);
  });

  it('déterministe (propriété) : même gouvernance ⇒ même résultat, octet pour octet', () => {
    fc.assert(fc.property(fc.constantFrom(...CAPABILITY_IDS, 'foundation' as const), fc.boolean(), (id, approved) => {
      const g = approved ? fullyApprovedGovernance() : G;
      expect(JSON.stringify(assessProductionEligibility(id, g))).toBe(JSON.stringify(assessProductionEligibility(id, JSON.parse(JSON.stringify(g)) as RunningGovernance)));
    }), { numRuns: 60 });
  });
});

describe('état effectif des capacités', () => {
  it('non demandée ⇒ désactivée (CAPABILITY_NOT_REQUESTED), quel que soit le mode', () => {
    for (const mode of ['CANDIDATE', 'PRODUCTION'] as const) {
      expect(capabilityState('taper', fullyApprovedGovernance(), mode, false)).toMatchObject({ enabled: false, reasons: [{ code: RUNNING_CODES.CAPABILITY_NOT_REQUESTED }] });
    }
  });

  it('PRODUCTION : demandée mais non éligible ⇒ refusée (demande manuelle malgré dépendance manquante)', () => {
    for (const s of capabilityStates(G, 'PRODUCTION', [...ALL_CAPABILITIES])) {
      expect(s.enabled, s.capability).toBe(false);
      expect(s.candidateOverride).toBe(false);
      expect(codes(s.reasons)[0]).toBe(RUNNING_CODES.CAPABILITY_DISABLED);
      expect(codes(s.reasons)).toContain(RUNNING_CODES.G1_POLICY_UNSIGNED);
    }
    for (const s of capabilityStates(fullyApprovedGovernance(), 'PRODUCTION', [...ALL_CAPABILITIES])) expect(s).toMatchObject({ enabled: true, candidateOverride: false });
  });

  it('CANDIDATE : activée avec valeurs candidates, blocages TRACÉS (CANDIDATE_OVERRIDE) ; sans valeur ⇒ indisponible', () => {
    const states = Object.fromEntries(capabilityStates(G, 'CANDIDATE', [...ALL_CAPABILITIES]).map((s) => [s.capability, s]));
    // Paramètres sans valeur : indisponibles même en CANDIDATE.
    for (const id of ['noviceEntry', 'longReturn', 'progressionBeyondHistory', 'longRunProgression', 'firstThresholdExposure', 'firstSevereExposure', 'marathon', 'performanceExtrapolation', 'taper'] as const) {
      expect(states[id]?.enabled, id).toBe(false);
      expect(states[id]?.missingValues.length, id).toBeGreaterThan(0);
    }
    expect(states.noviceEntry?.missingValues).toEqual(['running.novice.entryDose']);
    expect(states.longReturn?.missingValues).toEqual(['running.return.firstExposureDose']);
    // Dépendance technique : indisponible.
    expect(states.hybridPlanning).toMatchObject({ enabled: false, reasons: [{ code: RUNNING_CODES.CAPABILITY_DISABLED, params: { cause: 'TECHNICAL_DEPENDENCY' } }, { code: RUNNING_CODES.TECHNICAL_DEPENDENCY }] });
    // Valeurs candidates présentes : activée avec dérogation tracée (G1 non signées, E-PACE en attente).
    expect(states.paceTargets).toMatchObject({ enabled: true, candidateOverride: true });
    const override = states.paceTargets?.reasons.find((r) => r.code === RUNNING_CODES.CANDIDATE_OVERRIDE);
    expect(override?.params.blockers).toEqual(expect.arrayContaining(['E-PACE', 'G1-PAIN', 'RULESET_NOT_LOCKED']));
  });

  it('aucun état configurable indépendamment : même demande, gouvernance différente ⇒ état différent', () => {
    expect(capabilityState('paceTargets', G, 'PRODUCTION', true).enabled).toBe(false);
    expect(capabilityState('paceTargets', fullyApprovedGovernance(), 'PRODUCTION', true).enabled).toBe(true);
  });
});
