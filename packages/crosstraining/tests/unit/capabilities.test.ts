/**
 * C1 — capacités dérivées de la gouvernance : aucune n'est active aujourd'hui ; chaque blocage est tracé.
 */
import { describe, expect, it } from 'vitest';
import {
  CT_CAPABILITIES, CT_CAPABILITY_IDS, CT_CODES, CT_FOUNDATION, CT_FOUNDATION_DEFINITION, CURRENT_CT_GOVERNANCE, capabilityState, capabilityStates, foundationState,
} from '../../src/index.js';
import type { CtGovernance } from '../../src/index.js';
import { fullyValuedGovernance, withCandidate } from '../fixtures.js';

const codes = (xs: readonly { code: string }[]) => xs.map((x) => x.code);

/** Toutes les valeurs candidates (EXPERT_PROPOSED), décisions en attente, G1 non signées, dépendances non satisfaites. */
const candidateValues = (): CtGovernance => ({ ...CURRENT_CT_GOVERNANCE, parameters: CURRENT_CT_GOVERNANCE.parameters.map((p) => withCandidate(p)) });

describe('état réel C1', () => {
  it('chaque capacité demandée est désactivée pour PARAMETER_UNRESOLVED ; ses paramètres sont les bloqueurs', () => {
    for (const mode of ['CANDIDATE', 'PRODUCTION'] as const) {
      for (const id of CT_CAPABILITY_IDS) {
        const s = capabilityState(id, CURRENT_CT_GOVERNANCE, mode, true);
        expect(s.enabled).toBe(false);
        expect(s.reasons[0]).toMatchObject({ code: CT_CODES.CAPABILITY_DISABLED, params: { capability: id, cause: 'PARAMETER_UNRESOLVED' } });
        expect(s.blockers.slice(0, CT_CAPABILITIES[id].parameters.length)).toEqual(CT_CAPABILITIES[id].parameters);
        expect(codes(s.reasons).filter((c) => c === CT_CODES.UNRESOLVED_PARAMETER)).toHaveLength(CT_CAPABILITIES[id].parameters.length);
      }
    }
  });

  it('non demandée ⇒ NOT_REQUESTED ; ordre stable de capabilityStates', () => {
    const all = capabilityStates(CURRENT_CT_GOVERNANCE, 'CANDIDATE', []);
    expect(all.map((s) => s.capability)).toEqual([...CT_CAPABILITY_IDS]);
    for (const s of all) {
      expect(s).toMatchObject({ enabled: false, requested: false, blockers: ['NOT_REQUESTED'] });
      expect(s.reasons).toEqual([expect.objectContaining({ code: CT_CODES.CAPABILITY_DISABLED, params: { capability: s.capability, cause: 'NOT_REQUESTED', blockers: [] } })]);
    }
  });

  it('le socle est toujours évalué et désactivé', () => {
    const f = foundationState(CURRENT_CT_GOVERNANCE, 'CANDIDATE');
    expect(f).toMatchObject({ capability: CT_FOUNDATION, requested: true, enabled: false });
    expect(f.blockers).toEqual(expect.arrayContaining([...CT_FOUNDATION_DEFINITION.parameters, ...CT_FOUNDATION_DEFINITION.g1Policies, ...CT_FOUNDATION_DEFINITION.technical]));
  });
});

describe('chaque verrou bloque à lui seul (ordre des causes)', () => {
  it('valeurs présentes mais G1 non signées ⇒ G1_UNSIGNED (ctFirstExposure)', () => {
    const s = capabilityState('ctFirstExposure', candidateValues(), 'CANDIDATE', true);
    expect(s.enabled).toBe(false);
    expect(s.reasons[0]?.params).toMatchObject({ cause: 'G1_UNSIGNED' });
    expect(codes(s.reasons)).toEqual(expect.arrayContaining([CT_CODES.G1_POLICY_UNSIGNED, CT_CODES.CANDIDATE_VALUE_USED]));
  });

  it('valeurs présentes, sans G1, dépendance technique manquante ⇒ TECHNICAL_DEPENDENCY (ctLoadedMovements : CORE-EXT-C1)', () => {
    const s = capabilityState('ctLoadedMovements', candidateValues(), 'CANDIDATE', true);
    expect(s.reasons[0]?.params).toMatchObject({ cause: 'TECHNICAL_DEPENDENCY', blockers: ['CORE_EXT_C1', 'CT_CONTENT'] });
    expect(codes(s.reasons)).toContain(CT_CODES.TECHNICAL_DEPENDENCY);
  });

  it('ctHybridPlanning exige le planificateur global, même valorisée', () => {
    const s = capabilityState('ctHybridPlanning', candidateValues(), 'CANDIDATE', true);
    expect(s.blockers).toEqual(['GLOBAL_PLANNER']);
  });

  it('tout satisfait ⇒ activée en CANDIDATE, valeurs candidates tracées ; en PRODUCTION : DECISION_PENDING puis RULESET_NOT_LOCKED', () => {
    const g: CtGovernance = { ...fullyValuedGovernance(), parameters: candidateValues().parameters, rulesetLocked: false };
    const c = capabilityState('ctCalibratedDose', g, 'CANDIDATE', true);
    expect(c.enabled).toBe(true);
    expect(c.blockers).toEqual([]);
    expect(codes(c.reasons).every((x) => x === CT_CODES.CANDIDATE_VALUE_USED)).toBe(true);
    const full = fullyValuedGovernance();
    const pending: CtGovernance = { ...full, decisions: { ...full.decisions, 'CT-D8': 'PENDING' } };
    expect(capabilityState('ctCalibratedDose', pending, 'PRODUCTION', true)).toMatchObject({ enabled: false, blockers: ['CT-D8'] });
    expect(capabilityState('ctCalibratedDose', pending, 'PRODUCTION', true).reasons[0]?.params).toMatchObject({ cause: 'DECISION_PENDING' });
    const unlocked: CtGovernance = { ...full, rulesetLocked: false };
    expect(capabilityState('ctCalibratedDose', unlocked, 'PRODUCTION', true)).toMatchObject({ enabled: false, blockers: ['RULESET_NOT_LOCKED'] });
    expect(capabilityState('ctCalibratedDose', unlocked, 'PRODUCTION', true).reasons[0]?.params).toMatchObject({ cause: 'RULESET_NOT_LOCKED' });
    expect(capabilityState('ctCalibratedDose', full, 'PRODUCTION', true)).toMatchObject({ enabled: true, blockers: [], reasons: [] });
  });

  it('retirer UN paramètre d’une capacité entièrement satisfaite la désactive (chaque capacité, chaque paramètre)', () => {
    const full = fullyValuedGovernance();
    for (const id of CT_CAPABILITY_IDS) {
      for (const pid of CT_CAPABILITIES[id].parameters) {
        const g: CtGovernance = { ...full, parameters: full.parameters.filter((p) => p.parameterId !== pid) };
        const s = capabilityState(id, g, 'CANDIDATE', true);
        expect(s.enabled, `${id} sans ${pid}`).toBe(false);
        expect(s.blockers).toEqual([pid]);
      }
    }
  });
});
