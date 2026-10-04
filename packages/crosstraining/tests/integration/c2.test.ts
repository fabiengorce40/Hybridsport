/**
 * C2 — premier incrément génératif Cross-training, par le pipeline RÉEL du CORE (runSportSession / runCrossTrainingC2).
 *
 * GOUVERNANCE TEST_ONLY : valeurs CANDIDATES de test (maturité EXPERT_PROPOSED, jamais PRODUCTION_ELIGIBLE),
 * politiques G1 marquées SIGNED avec une signature de TEST, CT_CONTENT déclaré satisfait, mode CANDIDATE + simulation.
 * Elle prouve les MÉCANISMES ; elle ne représente aucune décision. La gouvernance réelle reste fail-closed (dernier bloc).
 * Toutes les durées et fenêtres ci-dessous sont des DONNÉES DE TEST, jamais des valeurs approuvées.
 */
import { describe, expect, it } from 'vitest';
import { NOT_APPLICABLE, asISODateTime } from '@hybridsport/domain';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { runSportSession } from '@hybridsport/engine';
import {
  CT_C2_ARCHETYPE, CT_CODES, CT_ENGINE_ID, CT_ENGINE_VERSION, CT_G1_POLICIES, CURRENT_CT_GOVERNANCE, c2Proposal, createCrossTrainingEngine,
  parseCrossTrainingContext, runCrossTrainingC2, volumeGuardParameters,
} from '../../src/index.js';
import type { CrossTrainingContextInput, CtGovernance } from '../../src/index.js';
import { coreContext, ctIntent, ctRequest, ctxInput, withCandidate, withParameter } from '../fixtures.js';
import { PROFILE_GYM, pain } from '../../../engine/tests/harness/requests.js';
import { testCatalog, testRuleset } from '../../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';
import { decodeState, emptyState, exportState, recordCrossTrainingSession } from '../../../app-core/src/index.js';

// technical-constant: TEST_ONLY — durée d'amorçage et fenêtre de rejeu de TEST (aucune valeur approuvée)
const TEST_DURATION_S = 600;
// technical-constant: TEST_ONLY — maxReplayAge de TEST (jours)
const TEST_MAX_REPLAY_AGE_DAYS = 14;
const TEST_APPROVAL = { role: 'TEST', reference: 'TEST-ONLY' };

const entry = (movementId: string, o: Record<string, unknown> = {}) => ({
  movementId, status: 'APPROVED', approvedBootstrapDurationS: TEST_DURATION_S, durationApproval: TEST_APPROVAL, eligibility: { contentReviewRef: 'TEST-ONLY' }, ...o,
});

/** Gouvernance TEST_ONLY (voir en-tête). `allowlist` = valeur candidate de `ct.bootstrap.movementAllowlist`. */
function testGovernance(allowlist: unknown[] = [entry('ex.air_squat')], o: { maxReplayAge?: unknown; signed?: boolean } = {}): CtGovernance {
  let g: CtGovernance = {
    ...CURRENT_CT_GOVERNANCE,
    g1Policies: Object.fromEntries(CT_G1_POLICIES.map((p) => [p, o.signed === false ? 'UNSIGNED' : 'SIGNED'])) as CtGovernance['g1Policies'],
    technical: { ...CURRENT_CT_GOVERNANCE.technical, CT_CONTENT: 'SATISFIED' },
  };
  for (const id of ['ct.safety.novicePolicy', 'ct.return.protocol', 'ct.safety.novelEccentricVolume', 'ct.history.anchorPolicy', 'ct.history.negativeResponse', 'ct.history.completionCriterion']) g = withParameter(g, id, (p) => withCandidate(p));
  g = withParameter(g, 'ct.bootstrap.movementAllowlist', (p) => withCandidate(p, allowlist));
  if (o.maxReplayAge !== null) g = withParameter(g, 'ct.history.recencyBand', (p) => withCandidate(p, o.maxReplayAge ?? TEST_MAX_REPLAY_AGE_DAYS));
  return g;
}

const engineOf = (g: CtGovernance = testGovernance()) => createCrossTrainingEngine({ governance: g, simulation: true });
const c2Request = (ctx: Partial<CrossTrainingContextInput> = {}, profile = PROFILE_GYM, history: FingerprintHistoryEntry[] = []) => ({ ...ctRequest(ctxInput(ctx), CT_C2_ARCHETYPE), profile, history });
const run = (ctx: Partial<CrossTrainingContextInput> = {}, g?: CtGovernance, profile = PROFILE_GYM) => runCrossTrainingC2(engineOf(g), c2Request(ctx, profile), coreContext('ct-c2'));
const refusal = (o: ReturnType<typeof run>) => (o.result.status === 'error' ? o.result.error.reasons.map((r) => ({ code: r.code, params: r.params })) : []);
const sessionOf = (o: ReturnType<typeof run>) => (o.result.status === 'ok' ? o.result.value : undefined);

/** Séance réalisée C2 (contrat Cross-training), TEST_ONLY. completedAt : 1 jour avant l'instant du contexte de test. */
const realizedC2 = (o: Record<string, unknown> = {}) => ({
  sessionId: 'ct.prev.1', completedAt: '2026-09-27T08:00:00Z', stimulus: 'mixed_modal_medium',
  prescription: { format: 'continuous', durationS: TEST_DURATION_S, items: [{ exerciseId: 'ex.air_squat', quantity: { kind: 'duration_s', value: TEST_DURATION_S } }] },
  result: { kind: 'total', durationS: TEST_DURATION_S }, completion: 'completed_as_prescribed', pain: 'NONE', ...o,
});

describe('C2 amorçage — allowlist × durée approuvée', () => {
  it('aucun mouvement approuvé ⇒ refus BOOTSTRAP_UNAVAILABLE', () => {
    expect(refusal(run({}, testGovernance([])))).toEqual([{ code: CT_CODES.BOOTSTRAP_UNAVAILABLE, params: { cause: 'NO_APPROVED_MOVEMENT_DURATION', entries: ['NO_ENTRY'] } }]);
  });

  it('mouvement approuvé mais durée absente ⇒ refus', () => {
    const g = testGovernance([{ movementId: 'ex.air_squat', status: 'APPROVED', eligibility: { contentReviewRef: 'TEST-ONLY' } }]);
    expect(refusal(run({}, g))).toEqual([{ code: CT_CODES.BOOTSTRAP_UNAVAILABLE, params: { cause: 'NO_APPROVED_MOVEMENT_DURATION', entries: ['ex.air_squat:DURATION_NOT_APPROVED'] } }]);
  });

  it('durée approuvée mais mouvement non approuvé ⇒ refus', () => {
    expect(refusal(run({}, testGovernance([entry('ex.air_squat', { status: 'PENDING' })]))))
      .toEqual([{ code: CT_CODES.BOOTSTRAP_UNAVAILABLE, params: { cause: 'NO_APPROVED_MOVEMENT_DURATION', entries: ['ex.air_squat:MOVEMENT_PENDING'] } }]);
  });

  it('durée sans approbation tracée ⇒ allowlist illisible ⇒ refus (fail-closed)', () => {
    const g = testGovernance([{ movementId: 'ex.air_squat', status: 'APPROVED', approvedBootstrapDurationS: TEST_DURATION_S, eligibility: { contentReviewRef: 'TEST-ONLY' } }]);
    expect(refusal(run({}, g)).map((r) => r.params.cause)).toContain('UNREADABLE');
  });

  it('corridor valide (TEST_ONLY) ⇒ continuous, UN mouvement, un item timed, aucune répétition, durée de l’allowlist, aucun levier', () => {
    const s = sessionOf(run());
    expect(s?.blocks).toHaveLength(1);
    const b = s?.blocks[0];
    expect(b).toMatchObject({ kind: 'conditioning', role: 'primary', format: 'continuous', levers: [] });
    expect(b?.items).toHaveLength(1);
    expect(b?.items[0]).toMatchObject({ exerciseId: 'ex.air_squat', prescription: { type: 'timed', workS: TEST_DURATION_S, rounds: 1, restS: 0 } });
    expect(JSON.stringify(s)).not.toMatch(/"reps"/);
  });

  it('empreinte : energy et stimulus explicitement not_applicable ; aucun format déclaré ; aucune énergie ni stimulus inventés', () => {
    const o = run();
    expect(o.fingerprint?.energy).toEqual(NOT_APPLICABLE);
    expect(o.fingerprint?.stimulus).toEqual(NOT_APPLICABLE);
    expect(o.fingerprint && 'format' in o.fingerprint).toBe(false);
  });

  it('candidat = première entrée entièrement approuvée, dans l’ordre gouverné (filtre de gouvernance seulement)', () => {
    const g = testGovernance([entry('ex.push_up', { status: 'REJECTED' }), entry('ex.air_squat')]);
    expect(sessionOf(run({}, g))?.blocks[0]?.items[0]?.exerciseId).toBe('ex.air_squat');
  });

  it('mouvement chargé dans l’allowlist ⇒ refus (aucune charge tant que le contrat générique n’est pas décidé)', () => {
    expect(refusal(run({}, testGovernance([entry('ex.goblet_squat')])))).toEqual([{ code: CT_CODES.MOVEMENT_INELIGIBLE, params: { exerciseId: 'ex.goblet_squat', causes: ['LOADED'] } }]);
  });
});

describe('C2 — politiques CT-G1 (comportements arbitrés, signature TEST)', () => {
  it('PAIN : douleur active sur une zone du mouvement ⇒ refus, aucune substitution ni réduction', () => {
    const o = runCrossTrainingC2(engineOf(), { ...c2Request(), state: { readiness: 'normal', activePain: [pain({ level: 'P2', bodyAreas: ['knee'] })], painHistory: 'available', dayAvailable: true } }, coreContext('ct-c2-pain'));
    expect(refusal(o)).toEqual([{ code: CT_CODES.MOVEMENT_INELIGIBLE, params: { exerciseId: 'ex.air_squat', causes: ['PAIN_AREA'] } }]);
  });

  it('NOVICE : un novice est admissible dans le corridor, sans coefficient (même durée)', () => {
    const s = sessionOf(run({ population: { level: 'novice', hybrid: false } }));
    expect(s?.blocks[0]?.items[0]?.prescription).toEqual({ type: 'timed', workS: TEST_DURATION_S, rounds: 1, restS: 0 });
  });

  it('RETURN : seul NONE est admis ; SHORT, MODERATE, LONG, UNKNOWN ⇒ refus', () => {
    for (const state of ['SHORT', 'MODERATE', 'LONG', 'UNKNOWN'] as const) {
      expect(refusal(run({ returnState: { state } }))).toEqual([{ code: CT_CODES.RETURN_NOT_SUPPORTED, params: { returnState: state } }]);
    }
  });

  it('EXERTIONAL : sans mouvement approuvé OU sans durée approuvée ⇒ refus (déjà couvert) ; politiques non signées ⇒ refus', () => {
    expect(refusal(run({}, testGovernance([entry('ex.air_squat')], { signed: false }))).map((r) => r.code)).toContain(CT_CODES.G1_POLICY_UNSIGNED);
  });

  it('matériel absent ⇒ refus (jamais de substitution)', () => {
    expect(refusal(run({}, testGovernance([entry('ex.skierg')])))).toEqual([{ code: CT_CODES.MOVEMENT_INELIGIBLE, params: { exerciseId: 'ex.skierg', causes: ['EQUIPMENT_MISSING'] } }]);
  });

  it('restriction déclarée incompatible ⇒ refus ; exclusion utilisateur ⇒ refus', () => {
    expect(refusal(run({}, undefined, { ...PROFILE_GYM, restrictions: ['no_deep_knee_flexion'] }))).toEqual([{ code: CT_CODES.MOVEMENT_INELIGIBLE, params: { exerciseId: 'ex.air_squat', causes: ['RESTRICTION'] } }]);
    expect(refusal(run({}, undefined, { ...PROFILE_GYM, excludedExercises: ['ex.air_squat'] }))).toEqual([{ code: CT_CODES.MOVEMENT_INELIGIBLE, params: { exerciseId: 'ex.air_squat', causes: ['USER_EXCLUSION'] } }]);
  });

  it('candidat inéligible ⇒ refus, JAMAIS de passage à l’entrée suivante de l’allowlist', () => {
    const g = testGovernance([entry('ex.skierg'), entry('ex.air_squat')]);
    expect(refusal(run({}, g))[0]?.params.exerciseId).toBe('ex.skierg');
  });

  it('multisport ⇒ refus ; CANDIDATE sans simulation ⇒ refus', () => {
    expect(refusal(run({ population: { level: 'intermediate', hybrid: true } }))[0]?.code).toBe(CT_CODES.HYBRID_PLANNER_UNAVAILABLE);
    const o = runCrossTrainingC2(createCrossTrainingEngine({ governance: testGovernance() }), c2Request(), coreContext('ct-c2-sim'));
    expect(refusal(o)[0]?.code).toBe(CT_CODES.SIMULATION_REQUIRED);
  });

  it('multisport : admis seulement si la capacité gouvernée ctHybridPlanning est active (ct.hybrid.policy + planificateur global)', () => {
    const hybrid = { population: { level: 'intermediate' as const, hybrid: true } };
    expect(refusal(run(hybrid)).map((r) => r.code).slice(0, 2)).toEqual([CT_CODES.HYBRID_PLANNER_UNAVAILABLE, CT_CODES.CAPABILITY_DISABLED]);
    let g = withParameter(testGovernance(), 'ct.hybrid.policy', (p) => withCandidate(p));
    expect(refusal(run(hybrid, g)).map((r) => r.params.blockers ?? r.params.dependencyId).filter(Boolean)).toEqual([['GLOBAL_PLANNER'], 'GLOBAL_PLANNER']);
    g = { ...g, technical: { ...g.technical, GLOBAL_PLANNER: 'SATISFIED' } };
    expect(sessionOf(run(hybrid, g))?.blocks[0]?.items[0]?.exerciseId).toBe('ex.air_squat');
  });
});

describe('C2 rejeu strict (CT-D15)', () => {
  it('dernière séance completed_as_prescribed admissible ⇒ même prescription, NOUVELLE occurrence (nouvel identifiant)', () => {
    const s = sessionOf(run({ sessionHistory: [realizedC2()] as never }));
    expect(s?.id).not.toBe('ct.prev.1');
    expect(s?.blocks[0]?.items[0]).toMatchObject({ exerciseId: 'ex.air_squat', prescription: { type: 'timed', workS: TEST_DURATION_S, rounds: 1, restS: 0 } });
  });

  it('rejeu = durée HISTORIQUE, même si l’allowlist a changé (aucun recalcul de dose)', () => {
    const g = testGovernance([entry('ex.air_squat', { approvedBootstrapDurationS: TEST_DURATION_S * 2 })]);
    expect(sessionOf(run({ sessionHistory: [realizedC2()] as never }, g))?.blocks[0]?.items[0]?.prescription).toMatchObject({ workS: TEST_DURATION_S });
  });

  it('completed mais pas « tel que prescrit » ⇒ non rejouable', () => {
    const r = realizedC2({ completion: 'completed', result: { kind: 'total', durationS: TEST_DURATION_S / 2 } });
    expect(refusal(run({ sessionHistory: [r] as never }))).toEqual([{ code: CT_CODES.REPLAY_SOURCE_INADMISSIBLE, params: { sessionId: 'ct.prev.1', causes: ['NOT_COMPLETED_AS_PRESCRIBED'] } }]);
  });

  it('douleur déclarée, douleur inconnue, abandon, mauvaise tolérance ⇒ non rejouable', () => {
    const causes = (o: Record<string, unknown>) => refusal(run({ sessionHistory: [realizedC2(o)] as never }))[0]?.params.causes;
    expect(causes({ pain: 'P1' })).toEqual(['PAIN_DECLARED']);
    expect(causes({ pain: undefined })).toEqual(['PAIN_UNKNOWN']);
    expect(causes({ completion: 'abandoned', result: { kind: 'abandoned' } })).toEqual(['ABANDONED']);
    expect(causes({ tolerance: 'poorly_tolerated' })).toEqual(['POORLY_TOLERATED']);
  });

  it('la DERNIÈRE séance échoue ⇒ refus, aucune recherche d’une séance plus ancienne, aucun repli sur l’amorçage', () => {
    const older = realizedC2({ sessionId: 'ct.prev.0', completedAt: '2026-09-25T08:00:00Z' });
    const latest = realizedC2({ sessionId: 'ct.prev.1', tolerance: 'poorly_tolerated' });
    const o = run({ sessionHistory: [older, latest] as never });
    expect(refusal(o)).toEqual([{ code: CT_CODES.REPLAY_SOURCE_INADMISSIBLE, params: { sessionId: 'ct.prev.1', causes: ['POORLY_TOLERATED'] } }]);
  });

  it('hors corridor (format, plusieurs mouvements, charge) ⇒ refus', () => {
    const amrap = { prescription: { format: 'amrap', durationS: TEST_DURATION_S, items: [{ exerciseId: 'ex.air_squat', quantity: { kind: 'reps', value: 10 } }] }, result: { kind: 'rounds_reps', rounds: 3, reps: 0 } };
    expect(refusal(run({ sessionHistory: [realizedC2(amrap)] as never }))[0]?.params.causes).toEqual(['FORMAT_AMRAP']);
  });

  it('maxReplayAge non résolu ⇒ rejeu refusé ; séance plus ancienne que maxReplayAge ⇒ refusée', () => {
    expect(refusal(run({ sessionHistory: [realizedC2()] as never }, testGovernance(undefined, { maxReplayAge: null })))[0]).toMatchObject({ code: CT_CODES.CAPABILITY_DISABLED, params: { capability: 'ctReplayHold', cause: 'PARAMETER_UNRESOLVED', blockers: ['ct.history.recencyBand'] } });
    expect(refusal(run({ sessionHistory: [realizedC2({ completedAt: '2026-08-01T08:00:00Z' })] as never }))[0]?.params.causes).toEqual(['TOO_OLD']);
  });

  it('CORE voudrait modifier la séance (substitution par réparation) ⇒ refus C2_MODIFIED_BY_CORE', () => {
    const base = engineOf();
    // Moteur de TEST qui contourne les gardes C2 pour forcer une réparation du CORE (matériel absent).
    const bypass = { ...base, propose: (input: Parameters<typeof base.propose>[0]) => ({ status: 'proposals' as const, proposals: [c2Proposal(input, 'ex.box_jump', TEST_DURATION_S, 'bootstrap', { id: CT_ENGINE_ID, version: CT_ENGINE_VERSION }, [])] }) };
    const noBox = { ...PROFILE_GYM, availableEquipment: PROFILE_GYM.availableEquipment.filter((e) => e !== 'box') };
    const direct = runSportSession(bypass, c2Request({}, noBox), coreContext('ct-c2-mod'));
    expect(direct.result.status === 'ok' && direct.result.value.blocks[0]?.items[0]?.exerciseId).not.toBe('ex.box_jump');
    expect(refusal(runCrossTrainingC2(bypass, c2Request({}, noBox), coreContext('ct-c2-mod')))).toEqual([{ code: CT_CODES.C2_MODIFIED_BY_CORE, params: { sessionId: `${ctIntent(CT_C2_ARCHETYPE).id}.ct` } }]);
  });
});

describe('C2 — CT-D6, anti-doublon, historique applicatif', () => {
  it('CT-D6 : aucun plafond exigé pour une prescription timed ; plafonds exigés dès que des répétitions (ou des sauts) sont prescrites', () => {
    const cat = testCatalog();
    const one = (exerciseId: string, prescription: unknown) => ({ id: 's', discipline: 'crosstraining', athleteLevel: 'intermediate', availableTimeS: 1, targetDurationS: 1, toleranceProfile: 'x', blocks: [{ id: 'b', kind: 'conditioning', role: 'primary', format: 'continuous', items: [{ id: 'i', exerciseId, prescription }] }] }) as never;
    expect(volumeGuardParameters(one('ex.air_squat', { type: 'timed', workS: 60, rounds: 1, restS: 0 }), (id) => cat.exercise(id))).toEqual([]);
    expect(volumeGuardParameters(one('ex.air_squat', { type: 'reps', reps: 10 }), (id) => cat.exercise(id))).toEqual(['ct.safety.repsPerMovementCap']);
    expect(volumeGuardParameters(one('ex.box_jump', { type: 'reps', reps: 10 }), (id) => cat.exercise(id))).toEqual(['ct.safety.jumpContactsCap', 'ct.safety.repsPerMovementCap']);
  });

  it('anti-doublon : diagnostic seulement — une séance identique dans l’historique ⇒ classée, mais la séance est produite', () => {
    const ctx = coreContext('ct-c2-dup', testRuleset(testRulesetDocumentWithDuplicate()));
    const first = runCrossTrainingC2(engineOf(), c2Request(), ctx);
    if (!first.fingerprint) throw new Error('empreinte attendue');
    const history = [{ fingerprint: { ...first.fingerprint, sessionId: 'ct.earlier' }, at: asISODateTime('2026-09-27T08:00:00Z'), status: 'completed' as const, repetitionIntents: [] }];
    const again = runCrossTrainingC2(engineOf(), c2Request({}, PROFILE_GYM, history), ctx);
    expect(again.result.status).toBe('ok');
    expect(again.duplicate?.classification).toBe('accidental_strong');
    // energy et stimulus non comparables : exclus du calcul.
    expect(again.duplicate?.comparisons[0]?.breakdown).toMatchObject({ energy: null, stimulus: null });
  });

  it('historique applicatif : séance prescrite + résultat + completed_as_prescribed enregistrés, persistés, relus ⇒ la séance suivante est un rejeu strict', () => {
    const first = runCrossTrainingC2(engineOf(), c2Request(), coreContext('ct-c2-app'));
    const s = sessionOf(first);
    if (!s || !first.fingerprint) throw new Error('séance attendue');
    const item = s.blocks[0]?.items[0];
    const workS = item?.prescription.type === 'timed' ? item.prescription.workS : 0;
    const realized = {
      sessionId: s.id, completedAt: '2026-09-27T08:00:00Z', stimulus: 'mixed_modal_medium',
      prescription: { format: 'continuous', durationS: workS, items: [{ exerciseId: item?.exerciseId ?? '', quantity: { kind: 'duration_s', value: workS } }] },
      result: { kind: 'total', durationS: workS }, completion: 'completed_as_prescribed', pain: 'NONE',
    };
    let state = recordCrossTrainingSession(emptyState(), { realized, fingerprint: first.fingerprint }, { now: '2026-09-27T08:00:00Z', today: '2026-09-27' });
    expect(() => recordCrossTrainingSession(state, { realized }, { now: '2026-09-27T09:00:00Z', today: '2026-09-27' })).toThrow('DUPLICATE_CT_SESSION');
    const back = decodeState(exportState(state));
    if (!back.ok) throw new Error(back.problem);
    state = back.state;
    expect(state.crosstraining.realized[0]?.completion).toBe('completed_as_prescribed');
    expect(state.fingerprints.crosstraining[0]?.fingerprint.energy).toEqual(NOT_APPLICABLE);
    const parsed = parseCrossTrainingContext(ctxInput({ sessionHistory: state.crosstraining.realized as never }));
    expect(parsed.ok).toBe(true);
    const next = runCrossTrainingC2(engineOf(), { ...c2Request({ sessionHistory: state.crosstraining.realized as never }), history: state.fingerprints.crosstraining, intent: { ...ctIntent(CT_C2_ARCHETYPE), id: 'intent.ct.c2.next' } }, coreContext('ct-c2-app', testRuleset(testRulesetDocumentWithDuplicate())));
    const n = sessionOf(next);
    expect(n?.id).toBe('intent.ct.c2.next.ct');
    expect(n?.blocks[0]?.items[0]?.prescription).toMatchObject({ type: 'timed', workS });
    expect(next.trace.entries.flatMap((e) => e.reasons).some((r) => r.code === CT_CODES.C2_PROPOSED && r.params.source === 'replay')).toBe(true);
  });
});

describe('C2 — gouvernance RÉELLE : fail-closed', () => {
  it('état réel (rien de signé, rien de résolu) ⇒ refus, en CANDIDATE simulé comme en PRODUCTION', () => {
    for (const mode of ['CANDIDATE', 'PRODUCTION'] as const) {
      const o = runCrossTrainingC2(createCrossTrainingEngine({ simulation: true }), c2Request({ mode }), coreContext('ct-c2-real'));
      expect(o.result.status).toBe('error');
      expect(refusal(o).map((r) => r.code)).toContain(CT_CODES.G1_POLICY_UNSIGNED);
    }
  });

  it('gouvernance TEST_ONLY en PRODUCTION ⇒ refus (valeurs candidates jamais PRODUCTION_ELIGIBLE)', () => {
    expect(refusal(run({ mode: 'PRODUCTION' })).map((r) => r.code)).toContain(CT_CODES.UNRESOLVED_PARAMETER);
  });
});
