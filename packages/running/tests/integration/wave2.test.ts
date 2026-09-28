/**
 * Phase 6C — RunningEngine vague 2 : matrice de réalité de production, matrice de gouvernance simulée,
 * invariants et cas adverses. La gouvernance simulée est construite par les fixtures (transitions
 * légitimes) ou par le mode SIMULATION explicite du moteur : jamais par une donnée de production modifiée.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Exercise, FingerprintHistoryEntry, ReasonCode } from '@hybridsport/domain';
import { canonicalStringify, runSportSession } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import {
  ARCHETYPE_INTENT_IDS, createRunningEngine, CURRENT_RUNNING_GOVERNANCE, PIPELINE_STAGES, POST_V1_ARCHETYPES, RUNNING_CODES, RUNNING_ENGINE_ID, RUNNING_ENGINE_VERSION,
  RUNNING_SESSION_ARCHETYPES, runningReasons, WAVE2_ARCHETYPES, WAVE3_ARCHETYPES,
} from '../../src/index.js';
import type { RunningContext, RunningContextInput, RunningEngine, RunningGovernance, RunningParameter } from '../../src/index.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { coreContext, ctxInput, fullyApprovedGovernance, ref, runIntent, withParameter } from '../fixtures.js';

/** Instant du CORE de test (harnais) : 2026-09-28T08:00:00Z. */
const CORE_NOW = Date.parse('2026-09-28T08:00:00Z');
const daysAgo = (d: number) => new Date(CORE_NOW - d * 86_400_000).toISOString().replace('.000Z', 'Z');
type HistoryIn = NonNullable<RunningContextInput['sessionHistory']>[number];
const easy = (o: Partial<HistoryIn> = {}): HistoryIn => ({ sessionId: 'h.easy.1', archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: daysAgo(4), realizedDurationS: 2700, completion: 'COMPLETED', ...o });
const withHistory = (o: Partial<RunningContextInput> = {}, history: HistoryIn[] = [easy()]): RunningContextInput => ({ ...ctxInput(o), sessionHistory: history });
type Profile = typeof PROFILE_GYM;
const request = (disc: RunningContextInput, archetypeId = 'running.easy', profile: Partial<Profile> = {}): Parameters<typeof runSportSession>[1] => (
  { intent: runIntent(archetypeId), profile: { ...PROFILE_GYM, ...profile }, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: disc }
);
const codes = (rs: readonly ReasonCode[] | undefined) => (rs ?? []).map((r) => r.code);

/** Capture l'entrée exacte que le CORE transmet au moteur (pour observer le pipeline sans effet de bord). */
function captured(engine: RunningEngine, disc: RunningContextInput, archetypeId = 'running.easy', profile: Partial<Profile> = {}): SportEngineInput<RunningContext> {
  let seen: SportEngineInput<RunningContext> | undefined;
  const spy = { ...engine, propose: (input: SportEngineInput<RunningContext>) => { seen = input; return engine.propose(input); } };
  runSportSession(spy, request(disc, archetypeId, profile), coreContext('w2'));
  if (!seen) throw new Error('entrée non transmise au moteur');
  return seen;
}
const sim = () => createRunningEngine({ simulation: true });
const approvedProd = () => createRunningEngine({ governance: fullyApprovedGovernance() });
const outcome = (engine: RunningEngine, disc: RunningContextInput, archetypeId = 'running.easy', profile: Partial<Profile> = {}) => engine.prescribe(captured(engine, disc, archetypeId, profile));
const session = (o: ReturnType<typeof runSportSession>) => (o.result.status === 'ok' ? o.result.value : undefined);
const prescriptionOf = (o: ReturnType<typeof runSportSession>) => session(o)?.blocks[0]?.items[0]?.prescription as { segments: { target: Record<string, unknown>; dose: { durationS: number } }[] } | undefined;

describe('réalité de production (gouvernance réelle : rien de signé, rien d’approuvé)', () => {
  const real = createRunningEngine();
  const all = [...RUNNING_SESSION_ARCHETYPES, ...POST_V1_ARCHETYPES];

  it.each(all)('%s : PRODUCTION ⇒ aucune séance (socle non éligible), même avec un historique complet', (a) => {
    const o = runSportSession(real, request(withHistory({ mode: 'PRODUCTION' }, RUNNING_SESSION_ARCHETYPES.map((x, i) => easy({ sessionId: `h${String(i)}`, archetype: x }))), ARCHETYPE_INTENT_IDS[a]), coreContext('prod'));
    expect(o.result.status).toBe('error');
    if (o.result.status !== 'error') return;
    expect(o.result.error.code).toBe('NO_VALID_SOLUTION');
    expect(codes(o.result.error.reasons)).toEqual(expect.arrayContaining(a === 'PROGRESSION_RUN' ? [RUNNING_CODES.ARCHETYPE_POST_V1] : [RUNNING_CODES.G1_POLICY_UNSIGNED, RUNNING_CODES.DECISION_PENDING, RUNNING_CODES.RULESET_NOT_LOCKED]));
  });

  it.each(all)('%s : CANDIDATE sans mode simulation ⇒ aucune séance', (a) => {
    const o = runSportSession(real, request(withHistory(), ARCHETYPE_INTENT_IDS[a]), coreContext('cand'));
    expect(o.result.status).toBe('error');
  });

  it('EASY, CANDIDATE sans simulation : refus explicite SIMULATION_REQUIRED à l’étape SAFETY_G1', () => {
    const out = outcome(real, withHistory());
    expect(out.status).toBe('no_valid');
    expect(out.candidates[0]?.rejection).toEqual({ stage: 'SAFETY_G1', reasons: [runningReasons.emit(RUNNING_CODES.SIMULATION_REQUIRED, { mode: 'CANDIDATE' })] });
  });

  it('le mode simulation n’assouplit rien en PRODUCTION', () => {
    const out = outcome(createRunningEngine({ simulation: true }), withHistory({ mode: 'PRODUCTION' }));
    expect(out.status).toBe('no_valid');
    expect(out.candidates[0]?.rejection?.stage).toBe('ELIGIBILITY');
  });

  it('les statuts G1 et décisions de production restent inchangés (aucune signature automatique)', () => {
    expect(Object.values(CURRENT_RUNNING_GOVERNANCE.g1Policies)).toEqual(['UNSIGNED', 'UNSIGNED', 'UNSIGNED', 'UNSIGNED']);
    expect(new Set(Object.values(CURRENT_RUNNING_GOVERNANCE.decisions))).toEqual(new Set(['PENDING']));
    expect(CURRENT_RUNNING_GOVERNANCE.rulesetLocked).toBe(false);
    expect(CURRENT_RUNNING_GOVERNANCE.parameters.filter((p) => p.maturity === 'PRODUCTION_ELIGIBLE' || p.approvals.length > 0)).toEqual([]);
    expect(createRunningEngine().simulation).toBe(false);
  });
});

describe('gouvernance simulée — EASY (classe A)', () => {
  it('CANDIDATE + simulation : séance proposée, acceptée, validée et retenue par le CORE', () => {
    const o = runSportSession(sim(), request(withHistory()), coreContext('sim-1'));
    expect(o.result.status).toBe('ok');
    const s = session(o);
    expect(s).toMatchObject({ discipline: 'running', athleteLevel: PROFILE_GYM.athleteLevel, availableTimeS: 3600, targetDurationS: 2700, toleranceProfile: 'fixed_time' });
    expect(s?.blocks).toHaveLength(1);
    expect(s?.blocks[0]).toMatchObject({ kind: 'running', role: 'primary', format: 'continuous', items: [{ exerciseId: 'ex.easy_run' }] });
    expect(prescriptionOf(o)).toEqual({
      type: 'run_structure',
      segments: [{ kind: 'steady', id: 'steady', dose: { durationS: 2700 }, target: { domain: 'easy_low', effort: { rpe: { min: 3, max: 3 } }, priority: 'effort' } }],
      estimate: { method: 'core.run_structure.pace_bounds', methodVersion: 1, unit: 's', workS: { min: 2700, max: 2700 }, totalS: { min: 2700, max: 2700 } },
    });
    expect(o.trace.entries.map((t) => t.step)).toContain('validate');
  });

  it('proposition marquée SIMULATION : SIMULATED_PROPOSAL + CANDIDATE_VALUE_USED (V19, V12, V02) + ancre + HOLD', () => {
    const engine = sim();
    const p = engine.propose(captured(engine, withHistory()));
    expect(p.status).toBe('proposals');
    if (p.status !== 'proposals') return;
    const rs = p.proposals[0]?.reasons ?? [];
    expect(codes(rs as ReasonCode[])).toEqual(expect.arrayContaining([
      RUNNING_CODES.SIMULATED_PROPOSAL, RUNNING_CODES.DOSE_ANCHOR_SELECTED, RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED, RUNNING_CODES.PROGRESSION_UNRESOLVED,
    ]));
    expect(rs.filter((r) => r.code === RUNNING_CODES.CANDIDATE_VALUE_USED).map((r) => r.params.parameterId)).toEqual(expect.arrayContaining(['running.dose.historyAnchorPolicy', 'running.reference.recencyBands', 'running.target.rpeByDomain']));
    expect(rs.find((r) => r.code === RUNNING_CODES.SIMULATED_PROPOSAL)?.params).toEqual({ rulesetVersion: 'running-0.2.0-candidate' });
    expect(new Set(rs.map((r) => JSON.stringify([r.code, r.params]))).size).toBe(rs.length);
    expect(p.proposals[0]).toMatchObject({
      proposalId: 'proposal.intent.run.w1.EASY.CONTINUOUS', discipline: 'running', intentId: 'intent.run.w1', archetypeId: 'running.easy',
      optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 }, repetitionIntents: [], parametersUsed: [],
      fingerprintInputs: { archetypeId: 'running.easy', energy: { low: 1, moderate: 0, high: 0 }, format: 'continuous', volumeByItem: { 'intent.run.w1.run': 2700 }, prescriptionMarkers: { 'EASY.doseS': 2700 } },
      provenance: { engineId: RUNNING_ENGINE_ID, engineVersion: RUNNING_ENGINE_VERSION },
    });
  });

  it('PRODUCTION + gouvernance entièrement approuvée (simulée) : séance sans marque de simulation ni valeur candidate', () => {
    const engine = approvedProd();
    const p = engine.propose(captured(engine, withHistory({ mode: 'PRODUCTION' })));
    expect(p.status).toBe('proposals');
    if (p.status !== 'proposals') return;
    const cs = codes(p.proposals[0]?.reasons as ReasonCode[]);
    expect(cs).not.toContain(RUNNING_CODES.SIMULATED_PROPOSAL);
    expect(cs).not.toContain(RUNNING_CODES.CANDIDATE_VALUE_USED);
    expect(cs).toContain(RUNNING_CODES.DOSE_ANCHOR_SELECTED);
    expect(runSportSession(engine, request(withHistory({ mode: 'PRODUCTION' })), coreContext('prod-ok')).result.status).toBe('ok');
  });

  it('PRODUCTION approuvée sauf V19 (revenu à EXPERT_PROPOSED) ⇒ aucune séance : l’autorité de la dose manque', () => {
    const g = withParameter(fullyApprovedGovernance(), 'running.dose.historyAnchorPolicy', (p): RunningParameter => ({ ...p, maturity: 'EXPERT_PROPOSED', approvals: [] }));
    const out = outcome(createRunningEngine({ governance: g }), withHistory({ mode: 'PRODUCTION' }));
    expect(out.status).toBe('no_valid');
    expect(out.candidates[0]?.rejection?.stage).toBe('FEASIBILITY');
    expect(codes(out.reasons)).toEqual([RUNNING_CODES.UNRESOLVED_PARAMETER, RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE]);
  });

  it('PRODUCTION approuvée sauf V02 (paramètre du socle) ⇒ socle inéligible ⇒ rejet dès l’éligibilité, aucune dose', () => {
    const g = withParameter(fullyApprovedGovernance(), 'running.target.rpeByDomain', (p): RunningParameter => ({ ...p, maturity: 'EXPERT_PROPOSED', approvals: [] }));
    const out = outcome(createRunningEngine({ governance: g }), withHistory({ mode: 'PRODUCTION' }));
    expect(out.status).toBe('no_valid');
    expect(out.candidates[0]?.rejection?.stage).toBe('ELIGIBILITY');
    expect(out.candidates[0]?.dose).toBeUndefined();
  });

  it('V02 sans plafond EASY_LOW exploitable ⇒ refus (jamais un plafond inventé)', () => {
    for (const value of [{ EASY_LOW: {} }, { EASY_LOW: { max: 0 } }, { EASY_LOW: { max: '3' } }, {}]) {
      const g = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.target.rpeByDomain', (p): RunningParameter => ({ ...p, value: { status: 'candidate', value } }));
      expect(outcome(createRunningEngine({ governance: g, simulation: true }), withHistory()).candidates[0]?.rejection?.stage, JSON.stringify(value)).toBe('PRECISION');
    }
  });

  it('allure JAMAIS prescrite pour EASY, même avec allure activée, montre, référence récente et V40 simulé', () => {
    const engine = approvedProd();
    const disc = withHistory({ mode: 'PRODUCTION', references: [ref({ referenceId: 'r10k' })] });
    const analysis = engine.analyze(captured(engine, disc));
    expect(analysis.sessions.find((s) => s.archetype === 'EASY')?.precision.level).toBe('PACE_RANGE'); // vague 1 : précision annoncée
    const out = engine.prescribe(captured(engine, disc));
    expect(out.status).toBe('selected');
    if (out.status !== 'selected') return;
    expect(out.selection.candidate.precision).toBe('EFFORT_ONLY');
    const seg = out.selection.structure.segments[0];
    expect(seg?.target.pace).toBeUndefined();
    expect(seg?.target.hrBpm).toBeUndefined();
    const reduced = out.selection.candidate.degradations.filter((d) => d.effect === 'PRECISION_REDUCED');
    expect(reduced).toHaveLength(1);
    expect(reduced[0]?.reason.params).toEqual({ archetype: 'EASY', precision: 'EFFORT_ONLY', cause: 'EASY_CEILING_PACE_UNGOVERNED' });
    expect(reduced[0]?.parameterIds).toEqual(['running.target.paceRangeWidthByConfidence', 'running.target.easyCeilingPaceMargin']);
  });

  it('sans montre : cible noWearable ; causes de précision de la vague 1 conservées ; V40 non résolu tracé', () => {
    const engine = sim();
    const out = engine.prescribe(captured(engine, withHistory({ sensors: { wearable: false, heartRate: false } })));
    expect(out.status).toBe('selected');
    if (out.status !== 'selected') return;
    expect(out.selection.structure.segments[0]?.target).toEqual({ domain: 'easy_low', effort: { rpe: { min: 3, max: 3 } }, priority: 'effort', noWearable: true });
    const cause = out.reasons.find((r) => r.code === RUNNING_CODES.PRESCRIPTION_PRECISION_REDUCED)?.params.cause;
    expect(cause).toBe('NO_WEARABLE,REFERENCE_MISSING,EASY_CEILING_PACE_UNGOVERNED');
    expect(out.reasons.filter((r) => r.code === RUNNING_CODES.UNRESOLVED_PARAMETER).map((r) => r.params.parameterId)).toEqual(['running.target.easyCeilingPaceMargin']);
    expect(runSportSession(engine, request(withHistory({ sensors: { wearable: false, heartRate: false } })), coreContext('nw')).result.status).toBe('ok');
  });

  it('dose = dernière dose réalisée : jamais augmentée vers la durée cible ni vers le temps disponible (HOLD)', () => {
    const out = outcome(sim(), withHistory({}, [easy({ realizedDurationS: 2640 })]));
    expect(out.status === 'selected' && out.selection.candidate.dose).toEqual({ kind: 'duration', durationS: 2640, source: { parameterId: 'running.dose.historyAnchorPolicy', sessionId: 'h.easy.1' } });
  });

  it('retour inconnu sur la séance d’ancrage : HOLD autorisé (contrat V0), retour inconnu tracé', () => {
    const out = outcome(sim(), withHistory());
    expect(out.status).toBe('selected');
    expect(out.reasons.find((r) => r.code === RUNNING_CODES.DOSE_ANCHOR_SELECTED)?.params.feedbackKnown).toBe(false);
  });

  it('marathon non strict : EASY proposé avec GENERAL_PROGRAM_WITHOUT_GOAL_CLAIM tracé (aucune prétention marathon)', () => {
    const out = outcome(sim(), withHistory({ goal: { type: 'MARATHON' } }));
    expect(out.status).toBe('selected');
    expect(out.status === 'selected' && out.selection.candidate.degradations.map((d) => d.effect)).toEqual(expect.arrayContaining(['GENERAL_PROGRAM_WITHOUT_GOAL_CLAIM', 'HOLD_OR_RESTORE_ONLY']));
    expect(codes(out.reasons)).toContain(RUNNING_CODES.MARATHON_RULE_UNRESOLVED);
  });

  it('modèle de candidat : archétype, objectif, capacités, paramètres, G1, précision, provenance tracés', () => {
    const out = outcome(sim(), withHistory());
    expect(out.status).toBe('selected');
    if (out.status !== 'selected') return;
    const c = out.selection.candidate;
    expect(c).toMatchObject({ candidateId: 'intent.run.w1.EASY.CONTINUOUS', archetype: 'EASY', structureFamily: 'CONTINUOUS', goal: 'TEN_K', precision: 'EFFORT_ONLY', exerciseId: 'ex.easy_run', references: [], provenance: { rulesetVersion: 'running-0.2.0-candidate', mode: 'CANDIDATE', simulation: true } });
    expect(c.parameters).toEqual([
      { parameterId: 'running.dose.historyAnchorPolicy', maturity: 'EXPERT_PROPOSED', candidate: true },
      { parameterId: 'running.reference.recencyBands', maturity: 'EXPERT_PROPOSED', candidate: true },
      { parameterId: 'running.target.rpeByDomain', maturity: 'EXPERT_PROPOSED', candidate: true },
    ]);
    expect(c.g1Policies).toEqual([{ policyId: 'G1-PAIN', status: 'UNSIGNED' }, { policyId: 'G1-SCOPE', status: 'UNSIGNED' }, { policyId: 'G1-NOVICE', status: 'UNSIGNED' }, { policyId: 'G1-RETURN', status: 'UNSIGNED' }]);
    expect(c.capabilities).toHaveLength(11);
    expect(c.intensity).toEqual({ domain: 'EASY_LOW', rpeCeiling: 3, source: { parameterId: 'running.target.rpeByDomain' } });
    expect(c.rejection).toBeUndefined();
  });

  it('observabilité : trace complète des étapes, dans l’ordre, pour une proposition', () => {
    const out = outcome(sim(), withHistory());
    expect(out.trace.map((t) => t.stage)).toEqual(['ANALYSIS', 'ELIGIBILITY', 'SAFETY_G1', 'FEASIBILITY', 'PRECISION', 'GENERATION', 'SELECTION']);
    expect(out.trace.find((t) => t.stage === 'SAFETY_G1')?.decision).toBe('PASSED_SIMULATION');
    expect(out.trace.find((t) => t.stage === 'SELECTION')?.decision).toBe('SELECTED:SINGLE_CANDIDATE');
    expect(PIPELINE_STAGES).toEqual(['ANALYSIS', 'GENERATION', 'ELIGIBILITY', 'SAFETY_G1', 'FEASIBILITY', 'PRECISION', 'SELECTION', 'PROPOSAL']);
    const prod = outcome(approvedProd(), withHistory({ mode: 'PRODUCTION' }));
    expect(prod.trace.find((t) => t.stage === 'SAFETY_G1')?.decision).toBe('PASSED');
  });

  it('observabilité : trace complète pour un no_valid (étape et raisons du rejet)', () => {
    const out = outcome(sim(), withHistory({}, []));
    expect(out.status).toBe('no_valid');
    expect(out.trace.map((t) => [t.stage, t.decision])).toEqual([['ANALYSIS', 'ELIGIBLE/EFFORT_ONLY'], ['ELIGIBILITY', 'ELIGIBLE'], ['SAFETY_G1', 'PASSED_SIMULATION'], ['FEASIBILITY', 'REJECTED'], ['GENERATION', 'GENERATED:1'], ['SELECTION', 'NO_CANDIDATE']]);
    expect(out.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE, params: { archetype: 'EASY', cause: 'NO_REALIZED_SESSION' } });
  });
});

describe('gouvernance simulée — archétypes non prescriptibles (classe C)', () => {
  const others = [...RUNNING_SESSION_ARCHETYPES.filter((a) => !WAVE3_ARCHETYPES.includes(a)), ...POST_V1_ARCHETYPES];
  const richHistory = RUNNING_SESSION_ARCHETYPES.flatMap((a, i) => [easy({ sessionId: `c${String(i)}`, archetype: a }), easy({ sessionId: `i${String(i)}`, archetype: a, structureFamily: 'INTERVALS' })]);

  it('vague 2 : EASY seul ; vague 3 : EASY, LONG, qualité + TEST (RACE_PACE, STRIDES, PROGRESSION_RUN exclus)', () => {
    expect(WAVE2_ARCHETYPES).toEqual(['EASY']);
    expect(WAVE3_ARCHETYPES).toEqual(['EASY', 'LONG', 'THRESHOLD', 'SEVERE', 'SHORT_INTERVAL', 'HILLS', 'TEST']);
    expect(others).toEqual(['RACE_PACE', 'STRIDES', 'PROGRESSION_RUN']);
  });

  it.each(others)('%s : aucune séance, même tout approuvé (simulé), historique complet et références', (a) => {
    for (const engine of [approvedProd(), sim()]) {
      const disc = withHistory({ mode: engine.simulation ? 'CANDIDATE' : 'PRODUCTION', references: [ref({ referenceId: 'r' })], exposures: RUNNING_SESSION_ARCHETYPES.map((x) => ({ archetype: x, lastAt: daysAgo(3), count: 3 })) }, richHistory);
      const out = outcome(engine, disc, ARCHETYPE_INTENT_IDS[a]);
      expect(out.status).toBe('no_valid');
      expect(out.candidates).toEqual([]);
      expect(out.reasons[0]).toMatchObject({ code: RUNNING_CODES.PRESCRIPTION_NOT_IMPLEMENTED, params: { archetype: a, wave: '3' } });
      expect(runSportSession(engine, request(disc, ARCHETYPE_INTENT_IDS[a]), coreContext('c')).result.status).toBe('error');
    }
  });
});

describe('sécurité, G1 et éligibilité (adversarial)', () => {
  it('P_R0 : NOVICE_ENTRY_UNRESOLVED, jamais d’ancre substituée à V33 — même avec une valeur V33 simulée et un historique', () => {
    for (const engine of [sim(), approvedProd()]) {
      const out = outcome(engine, withHistory({ mode: engine.simulation ? 'CANDIDATE' : 'PRODUCTION', population: { level: 'P_R0', hybrid: false } }));
      expect(out.status).toBe('no_valid');
      expect(codes(out.reasons)).toContain(RUNNING_CODES.NOVICE_ENTRY_UNRESOLVED);
      expect(out.candidates.every((c) => c.dose === undefined)).toBe(true);
    }
  });

  it.each(['LONG', 'UNKNOWN'] as const)('reprise %s sans séance post-retour : RETURN_PROTOCOL_UNRESOLVED (V34), même V34 simulé', (state) => {
    for (const engine of [sim(), approvedProd()]) {
      const out = outcome(engine, withHistory({ mode: engine.simulation ? 'CANDIDATE' : 'PRODUCTION', returnState: { state, postReturnSessions: 0 }, recentLoad: { returnStartedAt: daysAgo(20), dimensions: [] } }));
      expect(out.status).toBe('no_valid');
      expect(codes(out.reasons)).toContain(RUNNING_CODES.RETURN_PROTOCOL_UNRESOLVED);
    }
  });

  it('reprise LONG avec une séance post-retour : dose ≤ réalisée depuis le retour (les doses d’avant la coupure sont ignorées)', () => {
    const history = [easy({ sessionId: 'pre', completedAt: daysAgo(45), realizedDurationS: 3600 }), easy({ sessionId: 'post', completedAt: daysAgo(2), realizedDurationS: 1200 })];
    const out = outcome(sim(), withHistory({ returnState: { state: 'LONG', postReturnSessions: 1 }, recentLoad: { returnStartedAt: daysAgo(10), dimensions: [] } }, history));
    expect(out.status === 'selected' && (out.selection.candidate.dose?.kind === 'duration' ? out.selection.candidate.dose.durationS : undefined)).toBe(1200);
    expect(out.status === 'selected' && out.selection.candidate.parameters.map((p) => p.parameterId)).toContain('running.return.protocol');
    const onlyPre = outcome(sim(), withHistory({ returnState: { state: 'LONG', postReturnSessions: 1 }, recentLoad: { returnStartedAt: daysAgo(10), dimensions: [] } }, [history[0] as HistoryIn]));
    expect(onlyPre.reasons.at(-1)?.params).toEqual({ archetype: 'EASY', cause: 'NO_REALIZED_SESSION' });
  });

  it('reprise sans date de début connue ⇒ RETURN_START_UNKNOWN (jamais de supposition)', () => {
    const out = outcome(sim(), withHistory({ returnState: { state: 'MODERATE', postReturnSessions: 2 } }));
    expect(out.reasons.at(-1)?.params).toEqual({ archetype: 'EASY', cause: 'RETURN_START_UNKNOWN' });
  });

  it('protocole de reprise G1 absent ou altéré ⇒ RETURN_PROTOCOL_UNRESOLVED', () => {
    const g = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.return.protocol', (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: { LONG: 'EASY_ONLY' } } }));
    const disc = withHistory({ returnState: { state: 'SHORT', postReturnSessions: 1 }, recentLoad: { returnStartedAt: daysAgo(5), dimensions: [] } });
    const out = outcome(createRunningEngine({ governance: g, simulation: true }), disc);
    expect(out.candidates[0]?.rejection?.stage).toBe('SAFETY_G1');
    expect(codes(out.reasons)).toEqual([RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.RETURN_PROTOCOL_UNRESOLVED]);
    expect(out.reasons[1]?.params).toEqual({ returnState: 'SHORT' });
    // En PRODUCTION, le protocole de reprise appartient au socle : non approuvé ⇒ rejet dès l'éligibilité.
    const prodUnapproved = withParameter(fullyApprovedGovernance(), 'running.return.protocol', (p): RunningParameter => ({ ...p, maturity: 'EXPERT_PROPOSED', approvals: [] }));
    const prod = outcome(createRunningEngine({ governance: prodUnapproved }), { ...disc, mode: 'PRODUCTION' });
    expect(prod.candidates[0]?.rejection?.stage).toBe('ELIGIBILITY');
  });

  it('hybride sans planificateur global : éligibilité refusée, jamais une séance dégradée', () => {
    const out = outcome(sim(), withHistory({ population: { level: 'P_R2', hybrid: true } }));
    expect(out.status).toBe('no_valid');
    expect(out.candidates[0]?.rejection?.stage).toBe('ELIGIBILITY');
    expect(out.candidates[0]?.dose).toBeUndefined();
    expect(codes(out.reasons)).toContain(RUNNING_CODES.HYBRID_PLANNER_UNAVAILABLE);
  });

  it('marathon strict sans règle : refus d’éligibilité (MARATHON_RULE_UNRESOLVED)', () => {
    const out = outcome(sim(), withHistory({ goal: { type: 'MARATHON', strict: true } }));
    expect(out.candidates[0]?.rejection?.stage).toBe('ELIGIBILITY');
    expect(codes(out.reasons)).toContain(RUNNING_CODES.MARATHON_RULE_UNRESOLVED);
  });

  it('eligible = false ne devient jamais une séance : pour toute population/état bloquant, aucun candidat construit', () => {
    const blocking: Partial<RunningContextInput>[] = [
      { population: { level: 'P_R0', hybrid: false } }, { population: { level: 'P_R3', hybrid: true } }, { goal: { type: 'MARATHON', strict: true } },
      { returnState: { state: 'LONG', postReturnSessions: 0 } }, { returnState: { state: 'UNKNOWN', postReturnSessions: 0 } },
    ];
    for (const b of blocking) {
      const out = outcome(sim(), withHistory(b));
      expect(out.status, JSON.stringify(b)).toBe('no_valid');
      expect(out.candidates.every((c) => c.rejection !== undefined && c.intensity === undefined)).toBe(true);
    }
  });
});

describe('faisabilité (adversarial)', () => {
  it('restriction « no_running » ou exercice exclu ⇒ EXERCISE_UNAVAILABLE (NONE)', () => {
    for (const profile of [{ restrictions: ['no_running'] }, { excludedExercises: ['ex.easy_run'] }, { availableEquipment: [] as string[] }]) {
      const out = outcome(sim(), withHistory(), 'running.easy', profile);
      if (profile.availableEquipment) { expect(out.status).toBe('selected'); continue; } // poids du corps : aucun matériel requis
      expect(out.status, JSON.stringify(profile)).toBe('no_valid');
      expect(out.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.EXERCISE_UNAVAILABLE, params: { cause: 'NONE', candidates: [] } });
      expect(out.candidates[0]?.dose?.kind === 'duration' && out.candidates[0].dose.durationS).toBe(2700);
    }
  });

  it('plusieurs exercices de course admissibles ⇒ ambiguïté exposée (AMBIGUOUS), aucun choix arbitraire', () => {
    const engine = sim();
    const input = captured(engine, withHistory());
    const easyRun = input.catalog.exercise('ex.easy_run') as Exercise;
    const twin = { ...easyRun, id: 'ex.easy_run_b' } as Exercise;
    const catalog = Object.assign(Object.create(Object.getPrototypeOf(input.catalog) as object) as typeof input.catalog, input.catalog, { activeExercises: () => [twin, easyRun, ...input.catalog.activeExercises().filter((e) => e.id !== 'ex.easy_run')] });
    const out = engine.prescribe({ ...input, catalog });
    expect(out.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.EXERCISE_UNAVAILABLE, params: { cause: 'AMBIGUOUS', candidates: ['ex.easy_run', 'ex.easy_run_b'] } });
  });

  it('dose ancrée au-delà du temps disponible ⇒ TIME_EXCEEDED (jamais raccourcie par Running)', () => {
    const out = outcome(sim(), withHistory({}, [easy({ realizedDurationS: 3700 })]));
    expect(out.status).toBe('no_valid');
    expect(out.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.TIME_EXCEEDED, params: { archetype: 'EASY', availableTimeS: 3600, estimatedMaxS: 3700 } });
    expect(out.candidates[0]?.rejection?.stage).toBe('FEASIBILITY');
    // Égal au temps disponible : admissible pour Running (le CORE reste juge de la tolérance).
    expect(outcome(sim(), withHistory({}, [easy({ realizedDurationS: 3600 })])).status).toBe('selected');
  });

  it('dose ancrée hors tolérance de la durée cible : Running ne modifie ni T ni la dose ; le CORE décide', () => {
    const o = runSportSession(sim(), request(withHistory({}, [easy({ realizedDurationS: 1500 })])), coreContext('tol'));
    // Caractérisation (6C.1, Q-W2-6) : le CORE retient la séance plus courte (doc 06 §5, DURATION.SHORTER_ACCEPTED) ;
    // T et A restent ceux de l'intention, la dose reste la dose réalisée (aucun remplissage par Running).
    expect(o.result.status).toBe('ok');
    if (o.result.status !== 'ok') return;
    expect(o.result.value).toMatchObject({ availableTimeS: 3600, targetDurationS: 2700 });
    expect(o.result.value.blocks[0]?.items[0]?.prescription).toMatchObject({ segments: [{ dose: { durationS: 1500 } }] });
    expect(JSON.stringify(o)).toContain('DURATION.SHORTER_ACCEPTED');
  });

  it('historique hostile (sans séance EASY exploitable) ⇒ aucune dose par défaut', () => {
    const hostile: HistoryIn[] = [
      easy({ sessionId: 'p', completion: 'PARTIAL' }), easy({ sessionId: 's', completion: 'SKIPPED', skipReason: 'TIME' }), easy({ sessionId: 'u', completion: 'UNKNOWN' }),
      easy({ sessionId: 'old', completedAt: daysAgo(120) }), easy({ sessionId: 'future', completedAt: daysAgo(-3) }), easy({ sessionId: 'lg', archetype: 'LONG' }),
    ];
    const out = outcome(sim(), withHistory({}, hostile));
    expect(out.status).toBe('no_valid');
    expect(out.candidates[0]?.dose).toBeUndefined();
  });

  it.each([-5, 0, Number.NaN, Number.POSITIVE_INFINITY])('contexte : durée réalisée %s rejetée à la frontière (fail-closed)', (realizedDurationS) => {
    const o = runSportSession(sim(), request({ ...withHistory(), sessionHistory: [{ ...easy(), realizedDurationS }] }), coreContext('bad'));
    expect(o.result.status).toBe('error');
    if (o.result.status === 'error') expect(o.result.error.code).toBe('INVALID_INPUT');
  });
});

describe('déterminisme et invariants (propriétés)', () => {
  const arbSession = fc.record({
    sessionId: fc.constantFrom('a', 'b', 'c', 'd', 'e'),
    archetype: fc.constantFrom('EASY', 'LONG'),
    structureFamily: fc.constantFrom('CONTINUOUS', 'INTERVALS'),
    day: fc.integer({ min: -5, max: 90 }),
    realizedDurationS: fc.integer({ min: 300, max: 5400 }),
    completion: fc.constantFrom('COMPLETED', 'COMPLETED', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'UNKNOWN'),
    unexpectedDifficulty: fc.constantFrom('UNKNOWN', 'AS_EXPECTED', 'HARDER', 'MUCH_HARDER'),
    intoleranceOrPainSignal: fc.boolean(),
  }).map(({ day, ...s }) => ({ ...s, completedAt: daysAgo(day), intoleranceOrPainSignal: s.intoleranceOrPainSignal && s.realizedDurationS % 7 === 0 }) as HistoryIn);
  const engine = sim();

  it('la dose proposée est toujours une dose réalisée d’une séance EASY continue terminée, jamais supérieure au maximum réalisé', () => {
    fc.assert(fc.property(fc.array(arbSession, { maxLength: 8 }), (history) => {
      const out = outcome(engine, withHistory({}, history));
      if (out.status !== 'selected') return true;
      const dose = (out.selection.candidate.dose?.kind === 'duration' ? out.selection.candidate.dose.durationS : undefined);
      const realized = history.filter((h) => h.archetype === 'EASY' && h.structureFamily === 'CONTINUOUS' && h.completion === 'COMPLETED').map((h) => h.realizedDurationS);
      return dose !== undefined && realized.includes(dose) && dose <= Math.max(...realized) && dose <= 3600;
    }), { numRuns: 60, seed: 6_302 });
  });

  it('même entrée ⇒ même sortie (rejeu octet pour octet) ; permutation de l’historique sans effet', () => {
    fc.assert(fc.property(fc.array(arbSession, { maxLength: 6 }), (history) => {
      const a = canonicalStringify(outcome(engine, withHistory({}, history)));
      const b = canonicalStringify(outcome(engine, withHistory({}, [...history].reverse())));
      return a === canonicalStringify(outcome(engine, withHistory({}, history))) && a === b;
    }), { numRuns: 40, seed: 6_303 });
  });

  it('flux complet CORE déterministe (rejeu)', () => {
    const a = runSportSession(sim(), request(withHistory()), coreContext('det'));
    const b = runSportSession(sim(), request(withHistory()), coreContext('det'));
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it('aucune proposition sans historique, quel que soit le reste du contexte (absence de données ≠ absence de charge)', () => {
    fc.assert(fc.property(fc.constantFrom('P_R1', 'P_R2', 'P_R3', 'P_R4'), fc.constantFrom('GENERAL_RUNNING', 'FIVE_K', 'TEN_K', 'HALF_MARATHON'), fc.boolean(), (level, goal, wearable) => {
      const out = outcome(engine, withHistory({ population: { level, hybrid: false }, goal: { type: goal }, sensors: { wearable, heartRate: false } }, []));
      return out.status === 'no_valid';
    }), { numRuns: 20, seed: 6_304 });
  });
});

describe('codes de raison de la vague 2', () => {
  it('nouveaux codes enregistrés, paramètres typés vérifiés à l’émission', () => {
    const emitted = [
      runningReasons.emit(RUNNING_CODES.DOSE_ANCHOR_SELECTED, { archetype: 'EASY', sessionId: 's', realizedDurationS: 1, feedbackKnown: true }),
      runningReasons.emit(RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE, { archetype: 'EASY', cause: 'AMBIGUOUS' }),
      runningReasons.emit(RUNNING_CODES.SIMULATION_REQUIRED, { mode: 'CANDIDATE' }),
      runningReasons.emit(RUNNING_CODES.SIMULATED_PROPOSAL, { rulesetVersion: 'v' }),
      runningReasons.emit(RUNNING_CODES.EXERCISE_UNAVAILABLE, { cause: 'NONE', candidates: [] }),
      runningReasons.emit(RUNNING_CODES.TIME_EXCEEDED, { archetype: 'EASY', availableTimeS: 1, estimatedMaxS: 2 }),
    ];
    expect(emitted.map((r) => r.domain)).toEqual(['DOSE', 'DOSE', 'RULE', 'RULE', 'PLAN', 'PLAN']);
    expect(() => runningReasons.emit(RUNNING_CODES.DOSE_ANCHOR_SELECTED, { archetype: 'EASY', sessionId: 's', realizedDurationS: '1', feedbackKnown: true } as never)).toThrow();
    expect(() => runningReasons.emit(RUNNING_CODES.TIME_EXCEEDED, { archetype: 'EASY' } as never)).toThrow();
  });

  it('une gouvernance invalide est refusée à la construction du moteur, simulation comprise', () => {
    const broken = { ...CURRENT_RUNNING_GOVERNANCE, rulesetVersion: 'autre' } as RunningGovernance;
    expect(() => createRunningEngine({ governance: broken, simulation: true })).toThrow(/Gouvernance Running invalide/);
  });
});
