/**
 * HYROX H1 — première tranche générative, par le pipeline RÉEL du CORE (runHyroxH1 → runSportSession).
 *
 * GOUVERNANCE TEST_ONLY : doses, charges, niveaux et approbations viennent des fixtures (DONNÉES DE TEST), jamais
 * d'une règle officielle ni d'une décision. Elles prouvent les MÉCANISMES ; sans paramètres gouvernés, tout refuse.
 */
import { describe, expect, it } from 'vitest';
import { NOT_APPLICABLE, asISODateTime, zSessionDraft } from '@hybridsport/domain';
import { ENGINE_VERSION, migrateToCurrent, runSportSession, toEnvelope } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { HR_CODES, HR_ENGINE_ID, HR_ENGINE_VERSION, createHyroxEngine, runHyroxH1 } from '../../src/index.js';
import type { HyroxContext, HyroxContextInput, HyroxEngine } from '../../src/index.js';
import { coreContext } from '../../../engine/tests/harness/context.js';
import { PROFILE_GYM, STATE_FRESH, pain } from '../../../engine/tests/harness/requests.js';
import { DOSES, PROFILE_HYROX, TEST, approvedTestOnly, hrCtx, hrRequest, hyroxCatalog, hyroxRuleset, hyroxRulesetDocument } from '../fixtures.js';
import { testRuleset } from '../../../engine/tests/fixtures/load.js';
import { param } from '../../../engine/tests/fixtures/ruleset.js';
import type { HrParamsOverride } from '../fixtures.js';

// technical-constant: TEST_ONLY — durée cible de la requête de test (le CORE reste juge de la durée)
const TARGET_S = 1800;
const engineOf = (simulation = true) => createHyroxEngine({ simulation });
const ctxOf = (o: HrParamsOverride = {}) => coreContext('hr-h1', hyroxRuleset(o), hyroxCatalog());
type Opts = Parameters<typeof hrRequest>[2];
const run = (c: Partial<HyroxContextInput> = {}, params: HrParamsOverride = {}, opts: Opts = {}, engine: HyroxEngine = engineOf()) =>
  runHyroxH1(engine, hrRequest(hrCtx(c), TARGET_S, opts), ctxOf(params));
const refusal = (o: ReturnType<typeof run>) => (o.result.status === 'error' ? o.result.error.reasons.map((r) => ({ code: r.code, params: r.params })) : []);
const sessionOf = (o: ReturnType<typeof run>) => (o.result.status === 'ok' ? o.result.value : undefined);
const itemOf = (o: ReturnType<typeof run>) => sessionOf(o)?.blocks[0]?.items[0];

describe('H1 — prescription valide (TEST_ONLY)', () => {
  it('station chargée en distance : un bloc continu, un item, dose et charge gouvernées, aucun levier', () => {
    const o = run();
    const s = sessionOf(o);
    expect(s?.blocks).toHaveLength(1);
    expect(s?.blocks[0]).toMatchObject({ kind: 'hybrid_station_work', role: 'primary', format: 'continuous', levers: [] });
    expect(s?.blocks[0]?.items).toHaveLength(1);
    expect(itemOf(o)).toMatchObject({ exerciseId: 'ex.sled_push', prescription: { type: 'distance', distanceM: TEST.sledM, load: { kg: TEST.sledKg, certainty: 'prescribed' } } });
    expect(s).toMatchObject({ id: 'intent.hr.h1.hr', discipline: 'hybrid_race', toleranceProfile: 'mixed' });
  });

  it('station chargée en répétitions, station chargée en durée, stations non chargées (SkiErg, BBJ), sled pull', () => {
    expect(itemOf(run({ requestedStation: 'wall_ball' }))?.prescription).toEqual({ type: 'reps', reps: TEST.wallBallReps, load: { kg: TEST.wallBallKg, certainty: 'prescribed' } });
    expect(itemOf(run({ requestedStation: 'farmers_carry' }))?.prescription).toEqual({ type: 'timed', workS: TEST.carryS, rounds: 1, restS: 0, load: { kg: TEST.carryKg, certainty: 'prescribed' } });
    expect(itemOf(run({ requestedStation: 'skierg' }))?.prescription).toEqual({ type: 'distance', distanceM: TEST.skiM });
    expect(itemOf(run({ requestedStation: 'burpee_broad_jump' }))?.prescription).toEqual({ type: 'distance', distanceM: TEST.bbjM });
    expect(itemOf(run({ requestedStation: 'sled_pull' }))?.prescription).toEqual({ type: 'distance', distanceM: TEST.pullM, load: { kg: TEST.pullKg, certainty: 'prescribed' } });
  });

  it('empreinte : stimulus et energy not_applicable, aucun format ; provenance et paramètres utilisés tracés ; valeurs candidates signalées', () => {
    const engine = engineOf();
    let proposal: unknown;
    const spy: HyroxEngine = { ...engine, propose: (i) => { const r = engine.propose(i); proposal = r.status === 'proposals' ? r.proposals[0] : undefined; return r; } };
    const o = run({}, {}, {}, spy);
    expect(o.fingerprint?.energy).toEqual(NOT_APPLICABLE);
    expect(o.fingerprint?.stimulus).toEqual(NOT_APPLICABLE);
    expect(o.fingerprint && 'format' in o.fingerprint).toBe(false);
    expect(proposal).toMatchObject({
      provenance: { engineId: HR_ENGINE_ID, engineVersion: HR_ENGINE_VERSION },
      parametersUsed: [{ id: 'hybrid_race.h1.stationDoses', version: '0.1.0' }, { id: 'hybrid_race.h1.eligibleLevels', version: '0.1.0' }, { id: 'hybrid_race.h1.toleranceProfile', version: '0.1.0' }],
    });
    const codes = (proposal as { reasons: { code: string }[] }).reasons.map((r) => r.code);
    expect(codes.filter((c) => c === HR_CODES.CANDIDATE_VALUE_USED)).toHaveLength(3);
    expect(codes).toContain(HR_CODES.H1_PROPOSED);
  });

  it('PRODUCTION : paramètres approuvés (approbation TEST tracée, non provisoires) ⇒ séance, sans valeur candidate', () => {
    const o = run({ mode: 'PRODUCTION' }, { extra: approvedTestOnly }, {}, engineOf(false));
    expect(itemOf(o)?.exerciseId).toBe('ex.sled_push');
  });
});

describe('H1 — paramètres absents ou non gouvernés ⇒ refus', () => {
  it.each([
    ['doses', 'hybrid_race.h1.stationDoses'], ['levels', 'hybrid_race.h1.eligibleLevels'], ['tolerance', 'hybrid_race.h1.toleranceProfile'],
  ] as const)('%s absent ⇒ PARAMETER_UNAVAILABLE MISSING', (key, parameterId) => {
    expect(refusal(run({}, { [key]: null }))).toEqual([{ code: HR_CODES.PARAMETER_UNAVAILABLE, params: { parameterId, cause: 'MISSING', mode: 'CANDIDATE' } }]);
  });

  it('aucun paramètre H1 ⇒ trois refus, aucune valeur par défaut', () => {
    expect(refusal(run({}, { doses: null, levels: null, tolerance: null })).map((r) => r.params.parameterId))
      .toEqual(['hybrid_race.h1.stationDoses', 'hybrid_race.h1.eligibleLevels', 'hybrid_race.h1.toleranceProfile']);
  });

  it('PRODUCTION avec valeurs draft/provisoires ⇒ NOT_PRODUCTION_READY', () => {
    expect(refusal(run({ mode: 'PRODUCTION' }, {}, {}, engineOf(false))).map((r) => r.params.cause)).toEqual(['NOT_PRODUCTION_READY', 'NOT_PRODUCTION_READY', 'NOT_PRODUCTION_READY']);
  });

  it('gouvernance déclarée incorrecte ⇒ GOVERNANCE_MISMATCH ; valeur illisible ⇒ UNREADABLE', () => {
    expect(refusal(run({}, { governance: { doses: 'G2' } }))[0]?.params.cause).toBe('GOVERNANCE_MISMATCH');
    expect(refusal(run({}, { doses: [{ stationId: 'sled_push' }] }))[0]?.params.cause).toBe('UNREADABLE');
  });

  it('station sans dose gouvernée ⇒ STATION_DOSE_UNAVAILABLE ; deux doses pour la même station ⇒ ambiguë, refus', () => {
    expect(refusal(run({ requestedStation: 'row' }))).toEqual([{ code: HR_CODES.STATION_DOSE_UNAVAILABLE, params: { stationId: 'row', cause: 'NO_GOVERNED_DOSE' } }]);
    expect(refusal(run({}, { doses: [DOSES[0]!, DOSES[0]!] }))[0]?.params.cause).toBe('AMBIGUOUS_GOVERNED_DOSE');
  });

  it('niveau déclaré non admis ⇒ LEVEL_NOT_ELIGIBLE ; reprise ⇒ RETURN_NOT_SUPPORTED ; multisport ⇒ planificateur global requis', () => {
    expect(refusal(run({ population: { level: 'novice', hybrid: false } }))).toEqual([{ code: HR_CODES.LEVEL_NOT_ELIGIBLE, params: { level: 'novice' } }]);
    expect(refusal(run({ returnState: { state: 'UNKNOWN' } }))[0]?.code).toBe(HR_CODES.RETURN_NOT_SUPPORTED);
    expect(refusal(run({ population: { level: 'intermediate', hybrid: true } }))[0]?.code).toBe(HR_CODES.HYBRID_PLANNER_UNAVAILABLE);
  });

  it('CANDIDATE hors simulation ⇒ SIMULATION_REQUIRED ; archétype inconnu ⇒ refus', () => {
    expect(refusal(run({}, {}, {}, engineOf(false)))[0]?.code).toBe(HR_CODES.SIMULATION_REQUIRED);
    expect(refusal(run({}, {}, { archetypeId: 'hybrid_race.full_sim' }))[0]?.code).toBe(HR_CODES.ARCHETYPE_UNKNOWN);
  });

  it('station non demandée (intention absente) ⇒ STATION_NOT_REQUESTED : ni le moteur ni le planificateur ne la choisissent', () => {
    const { requestedStation: _omit, ...partial } = hrCtx();
    const o = runHyroxH1(engineOf(), hrRequest(partial as HyroxContextInput, TARGET_S), ctxOf());
    expect(refusal(o)).toEqual([{ code: HR_CODES.STATION_NOT_REQUESTED, params: {} }]);
  });

  it('contexte malformé (station vide) ⇒ refus de schéma, aucune valeur par défaut', () => {
    const o = runHyroxH1(engineOf(), hrRequest({ ...hrCtx(), requestedStation: '' }, TARGET_S), ctxOf());
    expect(refusal(o)[0]?.code).toBe('TECHNICAL.SCHEMA_INVALID');
  });

  it('multisport : admis seulement par le paramètre G1 `hybrid_race.h1.hybridPlanning` (true) ; absent ou false ⇒ refus', () => {
    const hybrid = { population: { level: 'intermediate' as const, hybrid: true } };
    expect(refusal(run(hybrid))[0]).toEqual({ code: HR_CODES.HYBRID_PLANNER_UNAVAILABLE, params: { cause: 'GLOBAL_PLANNER_REQUIRED' } });
    const withParam = (v: boolean) => {
      const doc = hyroxRulesetDocument();
      return runHyroxH1(engineOf(), hrRequest(hrCtx(hybrid), TARGET_S), coreContext('hr-h1', testRuleset({ ...doc, parameters: [...doc.parameters, param('hybrid_race.h1.hybridPlanning', v, 'G1')] }), hyroxCatalog()));
    };
    expect(refusal(withParam(false))[0]).toEqual({ code: HR_CODES.HYBRID_PLANNER_UNAVAILABLE, params: { cause: 'POLICY_DISALLOWS' } });
    expect(sessionOf(withParam(true))?.blocks[0]?.items[0]?.exerciseId).toBe('ex.sled_push');
  });
});

describe('H1 — matériel, restriction, douleur, charge ⇒ refus sans substitution', () => {
  it('matériel absent (pas de traîneau) ⇒ MOVEMENT_INELIGIBLE EQUIPMENT_MISSING, jamais le substitut du catalogue', () => {
    const o = run({}, {}, { profile: PROFILE_GYM });
    expect(refusal(o)).toEqual([{ code: HR_CODES.MOVEMENT_INELIGIBLE, params: { exerciseId: 'ex.sled_push', causes: ['EQUIPMENT_MISSING'] } }]);
    expect(JSON.stringify(o)).not.toContain('ex.sandbag_lunge');
  });

  it('restriction déclarée ⇒ RESTRICTION ; exclusion utilisateur ⇒ USER_EXCLUSION', () => {
    expect(refusal(run({ requestedStation: 'wall_ball' }, {}, { profile: { ...PROFILE_HYROX, restrictions: ['no_overhead'] } }))[0]?.params.causes).toEqual(['RESTRICTION']);
    expect(refusal(run({}, {}, { profile: { ...PROFILE_HYROX, excludedExercises: ['ex.sled_push'] } }))[0]?.params.causes).toEqual(['USER_EXCLUSION']);
  });

  it('douleur active sur une zone sensible du mouvement ⇒ refus (PAIN_AREA), sans réduction de dose ni substitution', () => {
    const o = run({}, {}, { state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['knee'] })] } });
    expect(refusal(o)[0]).toMatchObject({ code: HR_CODES.MOVEMENT_INELIGIBLE, params: { exerciseId: 'ex.sled_push' } });
    expect(refusal(o)[0]?.params.causes).toContain('PAIN_AREA');
    expect(sessionOf(o)).toBeUndefined();
  });

  it('charge absente pour un mouvement chargé ⇒ LOAD_INVALID LOAD_REQUIRED', () => {
    const { loadKg: _k, ...noLoad } = DOSES[0]!;
    expect(refusal(run({}, { doses: [noLoad] }))).toEqual([{ code: HR_CODES.LOAD_INVALID, params: { exerciseId: 'ex.sled_push', cause: 'LOAD_REQUIRED' } }]);
  });

  it('charge sur un mouvement non chargé ⇒ LOAD_INVALID LOAD_ON_UNLOADED_MOVEMENT', () => {
    const doses = [{ ...DOSES[2]!, loadKg: TEST.sledKg }];
    expect(refusal(run({ requestedStation: 'skierg' }, { doses }))).toEqual([{ code: HR_CODES.LOAD_INVALID, params: { exerciseId: 'ex.skierg', cause: 'LOAD_ON_UNLOADED_MOVEMENT' } }]);
  });

  it('mouvement gouverné rattaché à une autre station ou inconnu du catalogue ⇒ refus', () => {
    expect(refusal(run({}, { doses: [{ ...DOSES[0]!, exerciseId: 'ex.sandbag_lunge' }] }))[0]?.params.causes).toEqual(['NOT_THIS_STATION']);
    expect(refusal(run({}, { doses: [{ ...DOSES[0]!, exerciseId: 'ex.unknown' }] }))[0]?.params.causes).toEqual(['UNKNOWN_MOVEMENT']);
  });

  it('défense en profondeur : moteur défaillant proposant un traîneau indisponible ⇒ le CORE refuse le transfert de charge (aucun substitut chargé publié)', () => {
    const base = engineOf();
    // Moteur volontairement défaillant : il croit le traîneau disponible ; le CORE, lui, voit le profil réel.
    const blind: HyroxEngine = { ...base, propose: (i: SportEngineInput<HyroxContext>) => base.propose({ ...i, constraints: { ...i.constraints, availableEquipment: [...i.constraints.availableEquipment, 'sled'] } }) };
    const request = hrRequest(hrCtx(), TARGET_S, { profile: PROFILE_GYM });
    for (const o of [runSportSession(blind, request, ctxOf()), runHyroxH1(blind, request, ctxOf())]) {
      expect(o.result.status).toBe('error');
      expect(refusal(o)[0]).toEqual({ code: 'REPAIR.LOAD_TRANSFER_REFUSED', params: { itemId: 'intent.hr.h1.station', exerciseId: 'ex.sled_push', substituteId: 'ex.sandbag_lunge' } });
      expect(JSON.stringify(o.result)).not.toMatch(/"exerciseId":"ex\.sandbag_lunge","prescription"/);
    }
  });

  it('garde stricte H1 : station NON chargée substituée par le CORE ⇒ H1_MODIFIED_BY_CORE (le pipeline nu publierait le substitut)', () => {
    const base = engineOf();
    const blind: HyroxEngine = { ...base, propose: (i: SportEngineInput<HyroxContext>) => base.propose({ ...i, constraints: { ...i.constraints, availableEquipment: [...i.constraints.availableEquipment, 'skierg'] } }) };
    const request = hrRequest(hrCtx({ requestedStation: 'skierg' }), TARGET_S, { profile: PROFILE_GYM });
    const naked = runSportSession(blind, request, ctxOf());
    expect(naked.result.status === 'ok' && naked.result.value.blocks[0]?.items[0]?.exerciseId).toBe('ex.row_erg');
    expect(refusal(runHyroxH1(blind, request, ctxOf()))).toEqual([{ code: HR_CODES.H1_MODIFIED_BY_CORE, params: { sessionId: 'intent.hr.h1.hr' } }]);
  });
});

describe('H1 — déterminisme, sérialisation, anti-doublon', () => {
  it('même entrée ⇒ même sortie, octet par octet', () => {
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
    expect(JSON.stringify(run({ requestedStation: 'wall_ball' }))).toBe(JSON.stringify(run({ requestedStation: 'wall_ball' })));
  });

  it('session_record v6 : séance chargée écrite puis relue, charge et empreinte not_applicable conservées', () => {
    const o = run();
    const s = sessionOf(o);
    if (!s || !o.fingerprint) throw new Error('séance attendue');
    const provenance = { engineVersion: ENGINE_VERSION, rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test', seed: 'hr-h1', traceId: 't0123456789abcdef' } as const;
    const record = { session: zSessionDraft.parse(s), provenance, fingerprint: { status: 'available', value: o.fingerprint }, durationEstimate: { availability: 'UNAVAILABLE_LEGACY' } };
    const env = toEnvelope('session_record', record);
    expect(env.schemaVersion).toBe(6);
    const back = migrateToCurrent<typeof record>(JSON.parse(JSON.stringify(env)));
    expect(back.ok && back.value.session.blocks[0]?.items[0]?.prescription).toEqual({ type: 'distance', distanceM: TEST.sledM, load: { kg: TEST.sledKg, certainty: 'prescribed' } });
    expect(back.ok && back.value.fingerprint).toMatchObject({ value: { energy: NOT_APPLICABLE, stimulus: NOT_APPLICABLE } });
  });

  it('anti-doublon : diagnostic seulement — séance identique dans l’historique ⇒ comparée, séance produite (poids de TEST)', () => {
    const first = run();
    if (!first.fingerprint) throw new Error('empreinte attendue');
    const history = [{ fingerprint: { ...first.fingerprint, sessionId: 'hr.earlier' }, at: asISODateTime('2026-09-27T08:00:00Z'), status: 'completed' as const, repetitionIntents: [] }];
    const again = run({}, {}, { history });
    expect(again.result.status).toBe('ok');
    expect(again.duplicate?.comparisons).toHaveLength(1);
    expect(again.duplicate?.comparisons[0]?.breakdown).toMatchObject({ energy: null, stimulus: null });
  });
});
