/**
 * C1 — le CrossTrainingEngine par le pipeline réel du CORE (runSportSession) : gouvernance non résolue ⇒ REFUS
 * explicite (NO_VALID_SOLUTION) avec les raisons exactes, jamais une séance de repli.
 */
import { describe, expect, it } from 'vitest';
import { canonicalStringify, runSportSession } from '@hybridsport/engine';
import { CT_CODES, CT_ENGINE_ID, CT_ENGINE_VERSION, CT_STIMULI, CURRENT_CT_GOVERNANCE, DOSE_SOURCE_CAPABILITIES, createCrossTrainingEngine } from '../../src/index.js';
import { coreContext, ctRequest, ctxInput, fullyValuedGovernance, realized } from '../fixtures.js';

const engine = createCrossTrainingEngine();
const errorOf = (o: ReturnType<typeof runSportSession>) => (o.result.status === 'error' ? o.result.error : undefined);
const codes = (xs: readonly { code: string }[] = []) => xs.map((x) => x.code);

describe('contrat SportEngine', () => {
  it('identité, discipline, gouvernance réelle, simulation fermée par défaut', () => {
    expect(engine).toMatchObject({ id: CT_ENGINE_ID, version: CT_ENGINE_VERSION, discipline: 'crosstraining', simulation: false });
    expect(engine.governance).toBe(CURRENT_CT_GOVERNANCE);
    expect(createCrossTrainingEngine({ simulation: true }).simulation).toBe(true);
  });

  it('gouvernance invalide ⇒ le moteur refuse d’être construit', () => {
    const bad = { ...CURRENT_CT_GOVERNANCE, parameters: [...CURRENT_CT_GOVERNANCE.parameters, ...CURRENT_CT_GOVERNANCE.parameters.slice(0, 1)] };
    expect(() => createCrossTrainingEngine({ governance: bad })).toThrow(/Gouvernance Cross-training invalide : ct\.stimulus\.catalog : identifiant dupliqué/);
  });

  it('archétype inconnu ⇒ INVALID_INPUT par le contrat planificateur (ARCHETYPE_UNKNOWN)', () => {
    const e = errorOf(runSportSession(engine, ctRequest(ctxInput(), 'crosstraining.fran'), coreContext('ct-unknown')));
    expect(e).toMatchObject({ code: 'INVALID_INPUT', reasons: [{ code: CT_CODES.ARCHETYPE_UNKNOWN, params: { archetypeId: 'crosstraining.fran' } }] });
  });

  it('contexte invalide ⇒ INVALID_INPUT avant toute proposition', () => {
    const e = errorOf(runSportSession(engine, ctRequest({ ...ctxInput(), sessionHistory: undefined }), coreContext('ct-ctx')));
    expect(e?.code).toBe('INVALID_INPUT');
    expect(codes(e?.reasons)).toEqual(['TECHNICAL.SCHEMA_INVALID']);
  });
});

describe('gouvernance non résolue ⇒ refus explicite pour CHAQUE stimulus', () => {
  for (const stimulus of CT_STIMULI) {
    it(`${stimulus} : NO_VALID_SOLUTION, sources de dose indisponibles, paramètres non résolus, non implémenté`, () => {
      const o = runSportSession(engine, ctRequest(ctxInput(), stimulus), coreContext(`ct-${stimulus}`));
      const e = errorOf(o);
      expect(e?.code).toBe('NO_VALID_SOLUTION');
      const cs = codes(e?.reasons);
      expect(cs).toEqual(expect.arrayContaining([CT_CODES.CAPABILITY_DISABLED, CT_CODES.UNRESOLVED_PARAMETER, CT_CODES.DOSE_SOURCE_UNAVAILABLE, CT_CODES.SIMULATION_REQUIRED, CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED, CT_CODES.G1_POLICY_UNSIGNED]));
      expect(e?.reasons.find((r) => r.code === CT_CODES.DOSE_SOURCE_UNAVAILABLE)?.params).toEqual({ stimulus, capabilities: [...DOSE_SOURCE_CAPABILITIES] });
      expect(e?.reasons.at(-1)).toMatchObject({ code: CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED, params: { stimulus, wave: 'C1' } });
      expect(o.trace.entries.map((t) => t.step)).not.toContain('validate');
    });
  }

  it('les raisons nomment chaque paramètre bloquant des sources de dose (rejeu, calibrage, première exposition)', () => {
    const e = errorOf(runSportSession(engine, ctRequest(ctxInput()), coreContext('ct-params')));
    const unresolved = new Set((e?.reasons ?? []).filter((r) => r.code === CT_CODES.UNRESOLVED_PARAMETER).map((r) => r.params.parameterId));
    for (const id of ['ct.history.anchorPolicy', 'ct.history.recencyBand', 'ct.estimation.workRates', 'ct.dose.construction', 'ct.format.timeCapMargin', 'ct.format.emomDensity', 'ct.firstExposure.byStimulus', 'ct.stimulus.catalog']) {
      expect(unresolved.has(id), id).toBe(true);
    }
  });

  it('un historique réalisé ne suffit pas : le rejeu reste bloqué (CT-D15 non décidé)', () => {
    const e = errorOf(runSportSession(engine, ctRequest(ctxInput({ sessionHistory: [realized()] as never })), coreContext('ct-hist')));
    expect(e?.code).toBe('NO_VALID_SOLUTION');
    const replay = e?.reasons.find((r) => r.code === CT_CODES.CAPABILITY_DISABLED && r.params.capability === 'ctReplayHold');
    expect(replay?.params.cause).toBe('PARAMETER_UNRESOLVED');
  });

  it('PRODUCTION : pas de SIMULATION_REQUIRED, mais le même refus', () => {
    const e = errorOf(runSportSession(engine, ctRequest(ctxInput({ mode: 'PRODUCTION' })), coreContext('ct-prod')));
    expect(e?.code).toBe('NO_VALID_SOLUTION');
    expect(codes(e?.reasons)).not.toContain(CT_CODES.SIMULATION_REQUIRED);
    expect(codes(e?.reasons)).toEqual(expect.arrayContaining([CT_CODES.DOSE_SOURCE_UNAVAILABLE, CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED]));
  });

  it('capacités non demandées ⇒ NOT_REQUESTED tracé, même refus', () => {
    const e = errorOf(runSportSession(engine, ctRequest(ctxInput({ capabilityRequests: [] })), coreContext('ct-none')));
    const causes = (e?.reasons ?? []).filter((r) => r.code === CT_CODES.CAPABILITY_DISABLED).map((r) => `${String(r.params.capability)}:${String(r.params.cause)}`);
    expect(causes).toEqual(expect.arrayContaining(['ctReplayHold:NOT_REQUESTED', 'ctCalibratedDose:NOT_REQUESTED', 'ctFirstExposure:NOT_REQUESTED', 'ctFoundation:PARAMETER_UNRESOLVED']));
  });
});

describe('multisport : fermé tant que le planificateur global n’existe pas', () => {
  it('Cross-training + autre sport ⇒ HYBRID_PLANNER_UNAVAILABLE en tête, sans aucune résolution locale', () => {
    const e = errorOf(runSportSession(engine, ctRequest(ctxInput({ population: { level: 'intermediate', hybrid: true } })), coreContext('ct-hybrid')));
    expect(e?.code).toBe('NO_VALID_SOLUTION');
    expect(e?.reasons[0]).toMatchObject({ code: CT_CODES.HYBRID_PLANNER_UNAVAILABLE, params: { cause: 'GLOBAL_PLANNER_REQUIRED' } });
    expect(e?.reasons.find((r) => r.code === CT_CODES.CAPABILITY_DISABLED && r.params.capability === 'ctHybridPlanning')).toBeDefined();
  });

  it('même avec une gouvernance entièrement valorisée et le planificateur déclaré satisfait, le moteur ne résout pas l’interférence', () => {
    const e = errorOf(runSportSession(createCrossTrainingEngine({ governance: fullyValuedGovernance(), simulation: true }), ctRequest(ctxInput({ population: { level: 'intermediate', hybrid: true } })), coreContext('ct-hybrid-full')));
    expect(codes(e?.reasons)).toEqual([CT_CODES.HYBRID_PLANNER_UNAVAILABLE, CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED]);
  });
});

describe('valeurs injectées : C1 reste non générable', () => {
  it('gouvernance entièrement valorisée, simulation, PRODUCTION ou CANDIDATE ⇒ seul PRESCRIPTION_NOT_IMPLEMENTED', () => {
    const full = createCrossTrainingEngine({ governance: fullyValuedGovernance(), simulation: true });
    for (const mode of ['CANDIDATE', 'PRODUCTION'] as const) {
      const e = errorOf(runSportSession(full, ctRequest(ctxInput({ mode })), coreContext(`ct-full-${mode}`)));
      expect(e?.code).toBe('NO_VALID_SOLUTION');
      expect(e?.reasons).toEqual([expect.objectContaining({ code: CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED, params: { stimulus: 'mixed_modal_medium', wave: 'C1' } })]);
    }
  });

  it('propose() direct : archétype inconnu ⇒ ARCHETYPE_UNKNOWN (défense en profondeur), analyze() ⇒ undefined', () => {
    const parsed = engine.parseContext(ctxInput());
    if (!parsed.ok) throw new Error('contexte');
    const input = {
      intent: { archetypeId: 'crosstraining.fran' }, discipline: parsed.context,
      ruleset: { version: '1.0.0' }, catalog: { version: '1.0.0' }, context: { seed: 's', now: '2026-10-05T08:00:00Z', engineVersion: '0.1.0' },
    } as unknown as Parameters<typeof engine.propose>[0];
    expect(engine.analyze(input)).toBeUndefined();
    const r = engine.propose(input);
    expect(r.status).toBe('no_valid_proposal');
    if (r.status === 'no_valid_proposal') {
      expect(codes(r.reasons)).toEqual([CT_CODES.ARCHETYPE_UNKNOWN]);
      expect(r.provenance).toEqual({ engineId: CT_ENGINE_ID, engineVersion: CT_ENGINE_VERSION, rulesetVersion: '1.0.0', catalogVersion: '1.0.0', seed: 's' });
    }
  });
});

describe('déterminisme', () => {
  it('même entrée ⇒ même issue complète (trace incluse), moteurs distincts', () => {
    const a = runSportSession(engine, ctRequest(ctxInput({ sessionHistory: [realized()] as never })), coreContext('det'));
    const b = runSportSession(createCrossTrainingEngine(), ctRequest(ctxInput({ sessionHistory: [realized()] as never })), coreContext('det'));
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it('l’ordre des capacités demandées n’a aucun effet', () => {
    const a = runSportSession(engine, ctRequest(ctxInput()), coreContext('ord'));
    const b = runSportSession(engine, ctRequest(ctxInput({ capabilityRequests: [...ctxInput().capabilityRequests ?? []].reverse() })), coreContext('ord'));
    expect(canonicalStringify(errorOf(a)?.reasons)).toBe(canonicalStringify(errorOf(b)?.reasons));
  });
});
