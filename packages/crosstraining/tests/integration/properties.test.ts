/**
 * C1 — propriétés adverses : quelle que soit la gouvernance (valeurs injectées, décisions, G1, dépendances,
 * verrou), le mode, la simulation, le multisport et les capacités demandées, AUCUNE proposition n'est émise,
 * et chaque refus est explicite (raisons non vides, PRESCRIPTION_NOT_IMPLEMENTED). Déterminisme.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { canonicalStringify } from '@hybridsport/engine';
import {
  CT_CAPABILITY_IDS, CT_CODES, CT_DECISIONS, CT_G1_POLICIES, CT_STIMULI, CT_TECHNICAL_DEPENDENCIES, CURRENT_CT_GOVERNANCE, archetypeIdOf, createCrossTrainingEngine,
} from '../../src/index.js';
import type { CtGovernance } from '../../src/index.js';
import { ctx, productionEligible, withCandidate } from '../fixtures.js';

const arbGovernance: fc.Arbitrary<CtGovernance> = fc.record({
  values: fc.array(fc.constantFrom('none', 'candidate', 'eligible'), { minLength: CURRENT_CT_GOVERNANCE.parameters.length, maxLength: CURRENT_CT_GOVERNANCE.parameters.length }),
  payload: fc.jsonValue(),
  decisions: fc.array(fc.constantFrom('PENDING', 'APPROVED', 'REJECTED'), { minLength: CT_DECISIONS.length, maxLength: CT_DECISIONS.length }),
  g1: fc.array(fc.constantFrom('UNSIGNED', 'SIGNED'), { minLength: CT_G1_POLICIES.length, maxLength: CT_G1_POLICIES.length }),
  technical: fc.array(fc.constantFrom('UNSATISFIED', 'SATISFIED'), { minLength: CT_TECHNICAL_DEPENDENCIES.length, maxLength: CT_TECHNICAL_DEPENDENCIES.length }),
  locked: fc.boolean(),
}).map(({ values, payload, decisions, g1, technical, locked }) => {
  // jsonValue peut contenir -0 ; la valeur reste une donnée de TEST.
  const value = JSON.parse(JSON.stringify(payload ?? null)) as unknown;
  return {
    ...CURRENT_CT_GOVERNANCE,
    rulesetLocked: locked,
    decisions: Object.fromEntries(CT_DECISIONS.map((d, i) => [d, decisions[i]])) as CtGovernance['decisions'],
    g1Policies: Object.fromEntries(CT_G1_POLICIES.map((g, i) => [g, g1[i]])) as CtGovernance['g1Policies'],
    technical: Object.fromEntries(CT_TECHNICAL_DEPENDENCIES.map((t, i) => [t, technical[i]])) as CtGovernance['technical'],
    parameters: CURRENT_CT_GOVERNANCE.parameters.map((p, i) => (values[i] === 'none' ? p : values[i] === 'candidate' ? withCandidate(p, value) : (locked ? productionEligible(p, value) : withCandidate(p, value)))),
  };
});

const arbInput = fc.record({
  stimulus: fc.constantFrom(...CT_STIMULI),
  mode: fc.constantFrom('CANDIDATE' as const, 'PRODUCTION' as const),
  hybrid: fc.boolean(),
  level: fc.constantFrom('novice' as const, 'beginner' as const, 'intermediate' as const, 'advanced' as const),
  requests: fc.subarray([...CT_CAPABILITY_IDS]),
  simulation: fc.boolean(),
});

function input(stimulus: string, discipline: ReturnType<typeof ctx>) {
  return {
    intent: { archetypeId: archetypeIdOf(stimulus as (typeof CT_STIMULI)[number]) }, discipline,
    ruleset: { version: '1.0.0' }, catalog: { version: '1.0.0' }, context: { seed: 'p', now: '2026-10-05T08:00:00Z', engineVersion: '0.1.0' },
  } as unknown as Parameters<ReturnType<typeof createCrossTrainingEngine>['propose']>[0];
}

describe('propriétés C1', () => {
  it('jamais de proposition, toujours un refus explicite terminé par PRESCRIPTION_NOT_IMPLEMENTED (valeurs injectées comprises)', () => {
    fc.assert(fc.property(arbGovernance, arbInput, (governance, i) => {
      const engine = createCrossTrainingEngine({ governance, simulation: i.simulation });
      const r = engine.propose(input(i.stimulus, ctx({ mode: i.mode, population: { level: i.level, hybrid: i.hybrid }, capabilityRequests: i.requests })));
      expect(r.status).toBe('no_valid_proposal');
      if (r.status !== 'no_valid_proposal') return;
      expect(r.reasons.length).toBeGreaterThan(0);
      expect(r.reasons.at(-1)).toMatchObject({ code: CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED, params: { stimulus: i.stimulus, wave: 'C1' } });
      if (i.hybrid) expect(r.reasons[0]?.code).toBe(CT_CODES.HYBRID_PLANNER_UNAVAILABLE);
      if (i.mode === 'CANDIDATE' && !i.simulation) expect(r.reasons.map((x) => x.code)).toContain(CT_CODES.SIMULATION_REQUIRED);
    }), { numRuns: 300 });
  });

  it('toute source de dose sans valeur ⇒ DOSE_SOURCE_UNAVAILABLE (aucun repli)', () => {
    fc.assert(fc.property(arbGovernance, arbInput, (governance, i) => {
      const engine = createCrossTrainingEngine({ governance, simulation: i.simulation });
      const a = engine.analyze(input(i.stimulus, ctx({ mode: i.mode, population: { level: i.level, hybrid: i.hybrid }, capabilityRequests: i.requests })));
      if (a === undefined) throw new Error('analyse');
      const noSource = a.doseSources.every((s) => !s.enabled);
      expect(a.blockingReasons.some((r) => r.code === CT_CODES.DOSE_SOURCE_UNAVAILABLE)).toBe(noSource);
      // Une capacité active a toujours tous ses paramètres résolus dans le mode.
      for (const s of [...a.capabilities, a.foundation]) if (s.enabled) expect(s.blockers).toEqual([]);
    }), { numRuns: 300 });
  });

  it('déterminisme : deux moteurs, même entrée ⇒ même résultat', () => {
    fc.assert(fc.property(arbGovernance, arbInput, (governance, i) => {
      const c = ctx({ mode: i.mode, population: { level: i.level, hybrid: i.hybrid }, capabilityRequests: i.requests });
      const a = createCrossTrainingEngine({ governance, simulation: i.simulation }).propose(input(i.stimulus, c));
      const b = createCrossTrainingEngine({ governance, simulation: i.simulation }).propose(input(i.stimulus, c));
      expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    }), { numRuns: 150 });
  });
});
