/**
 * Phase 6B — coquille RunningEngine contre le contrat SportEngine générique, par le pipeline réel du
 * CORE (runSportSession), et cas adversariaux (fail-closed).
 */
import { describe, expect, it } from 'vitest';
import { canonicalStringify, runSportSession } from '@hybridsport/engine';
import {
  CURRENT_RUNNING_GOVERNANCE, RUNNING_CODES, RUNNING_ENGINE_ID, RUNNING_ENGINE_VERSION, capabilityState, coreExtR1Available, createRunningEngine,
  parseRunningContext, transitionMaturity,
} from '../../src/index.js';
import type { RunningGovernance } from '../../src/index.js';
import { ctxInput, coreContext, fullyApprovedGovernance, ref, runRequest, withParameter } from '../fixtures.js';

const engine = createRunningEngine();
const errorOf = (o: ReturnType<typeof runSportSession>) => (o.result.status === 'error' ? o.result.error : undefined);
const codes = (xs: readonly { code: string }[] = []) => xs.map((x) => x.code);

describe('contrat SportEngine', () => {
  it('identité, discipline, contexte strict ; CORE-EXT-R1 vérifiée sur les artefacts du CORE', () => {
    expect(engine).toMatchObject({ id: RUNNING_ENGINE_ID, version: RUNNING_ENGINE_VERSION, discipline: 'running' });
    expect(coreExtR1Available()).toBe(true);
    expect(engine.governance.technical.CORE_EXT_R1).toBe('SATISFIED');
    expect(engine.parseContext(ctxInput()).ok).toBe(true);
  });

  it('vague 1 : aucune séance proposée ; NO_VALID_SOLUTION par le CORE avec les raisons exactes (aucune séance factice)', () => {
    const o = runSportSession(engine, runRequest(ctxInput({ references: [ref({ referenceId: 'r' })] })), coreContext('run-1'));
    const e = errorOf(o);
    expect(e?.code).toBe('NO_VALID_SOLUTION');
    expect(codes(e?.reasons)[0]).toBe(RUNNING_CODES.PRESCRIPTION_NOT_IMPLEMENTED);
    expect(e?.reasons[0]?.params).toEqual({ archetype: 'EASY', wave: '1' });
    expect(o.trace.entries.map((t) => t.step)).not.toContain('validate'); // rien à valider : aucune séance
  });

  it('P-R0 : les raisons d’indisponibilité (V33) accompagnent le NO_VALID', () => {
    const e = errorOf(runSportSession(engine, runRequest(ctxInput({ population: { level: 'P_R0', hybrid: false } })), coreContext('run-2')));
    expect(codes(e?.reasons)).toEqual(expect.arrayContaining([RUNNING_CODES.PRESCRIPTION_NOT_IMPLEMENTED, RUNNING_CODES.NOVICE_ENTRY_UNRESOLVED]));
  });

  it('PRODUCTION : G1 non signées tracées dans le NO_VALID', () => {
    const e = errorOf(runSportSession(engine, runRequest(ctxInput({ mode: 'PRODUCTION' }), 'running.threshold'), coreContext('run-3')));
    expect(codes(e?.reasons)).toEqual(expect.arrayContaining([RUNNING_CODES.G1_POLICY_UNSIGNED, RUNNING_CODES.DECISION_PENDING, RUNNING_CODES.RULESET_NOT_LOCKED]));
  });

  it('archétype inconnu ⇒ INVALID_INPUT (contrat planificateur) ; PROGRESSION_RUN ⇒ NO_VALID hors V1', () => {
    const bad = errorOf(runSportSession(engine, runRequest(ctxInput(), 'running.vo2max_magic'), coreContext('run-4')));
    expect(bad).toMatchObject({ code: 'INVALID_INPUT', reasons: [{ code: RUNNING_CODES.ARCHETYPE_UNKNOWN }] });
    const post = errorOf(runSportSession(engine, runRequest(ctxInput(), 'running.progression_run'), coreContext('run-5')));
    expect(codes(post?.reasons)).toEqual(expect.arrayContaining([RUNNING_CODES.ARCHETYPE_POST_V1]));
  });

  it('rejeu déterministe du flux complet', () => {
    const a = runSportSession(engine, runRequest(ctxInput({ references: [ref({ referenceId: 'r' })] })), coreContext('det'));
    const b = runSportSession(createRunningEngine(), runRequest(ctxInput({ references: [ref({ referenceId: 'r' })] })), coreContext('det'));
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it('observabilité : analyze() expose l’analyse complète sans effet de bord', () => {
    const parsed = parseRunningContext(ctxInput());
    if (!parsed.ok) throw new Error('contexte');
    const input = { discipline: parsed.context, context: { seed: 's', now: '2026-10-05T08:00:00Z', engineVersion: '0.1.0' } } as unknown as Parameters<typeof engine.analyze>[0];
    const a = engine.analyze(input);
    expect(a.rulesetVersion).toBe(CURRENT_RUNNING_GOVERNANCE.rulesetVersion);
    expect(canonicalStringify(engine.analyze(input))).toBe(canonicalStringify(a));
  });
});

describe('adversarial (fail-closed)', () => {
  it('population ou objectif inconnus ⇒ codes propres ; autres anomalies ⇒ TECHNICAL', () => {
    const pop = parseRunningContext({ ...ctxInput(), population: { level: 'P_R9', hybrid: false } });
    expect(!pop.ok && codes(pop.reasons)).toEqual([RUNNING_CODES.POPULATION_UNSUPPORTED]);
    const goal = parseRunningContext({ ...ctxInput(), goal: { type: 'ULTRA_TRAIL' } });
    expect(!goal.ok && codes(goal.reasons)).toEqual([RUNNING_CODES.GOAL_UNSUPPORTED]);
    const both = parseRunningContext({ ...ctxInput(), goal: { type: 'ULTRA' }, extra: true });
    expect(!both.ok && codes(both.reasons)).toEqual([RUNNING_CODES.GOAL_UNSUPPORTED, 'TECHNICAL.SCHEMA_INVALID']);
    for (const raw of [null, 42, {}, { ...ctxInput(), mode: 'DEMO' }, { ...ctxInput(), capabilityRequests: ['teleport'] }, { ...ctxInput(), returnState: { state: 'LONG', postReturnSessions: -1 } }]) {
      const r = parseRunningContext(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reasons.length).toBeGreaterThan(0);
    }
    const e = errorOf(runSportSession(engine, runRequest({ ...ctxInput(), population: { level: 'ELITE', hybrid: false } }), coreContext('adv')));
    expect(e).toMatchObject({ code: 'INVALID_INPUT', reasons: [{ code: RUNNING_CODES.POPULATION_UNSUPPORTED }] });
  });

  it('gouvernance incohérente (valeur « zéro » glissée sans maturité, approbation fictive) ⇒ moteur refusé', () => {
    const zero = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.novice.entryDose', (p) => ({ ...p, value: { status: 'candidate', value: 0 } }));
    expect(() => createRunningEngine({ governance: zero })).toThrow(/valeur candidate mais maturité UNRESOLVED/);
    const fake = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.target.rpeByDomain', (p) => ({ ...p, maturity: 'PRODUCTION_ELIGIBLE' }));
    expect(() => createRunningEngine({ governance: fake })).toThrow(/sans approbation|sans ruleset verrouillé/);
    expect(() => createRunningEngine({ governance: { ...CURRENT_RUNNING_GOVERNANCE, g1Policies: { ...CURRENT_RUNNING_GOVERNANCE.g1Policies, 'G1-PAIN': 'MAYBE' } } as unknown as RunningGovernance })).toThrow();
  });

  it('une dose V33 PROPOSÉE (même 0) ne passe jamais en production sans signature ; en CANDIDATE elle est tracée comme dérogation', () => {
    const v33 = CURRENT_RUNNING_GOVERNANCE.parameters.find((p) => p.parameterId === 'running.novice.entryDose');
    if (!v33) throw new Error('V33');
    const proposed = transitionMaturity(v33, 'EXPERT_PROPOSED', { role: 'AUTHOR', reference: 'TEST' }, { rulesetLocked: false, value: 0 });
    if (!proposed.ok) throw new Error('proposition');
    const g = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.novice.entryDose', () => proposed.parameter);
    expect(capabilityState('noviceEntry', g, 'PRODUCTION', true)).toMatchObject({ enabled: false });
    const cand = capabilityState('noviceEntry', g, 'CANDIDATE', true);
    expect(cand).toMatchObject({ enabled: true, candidateOverride: true });
    expect(cand.reasons.find((r) => r.code === RUNNING_CODES.CANDIDATE_OVERRIDE)?.params.blockers).toEqual(expect.arrayContaining(['G1-NOVICE', 'running.novice.entryDose']));
  });

  it('capacité demandée manuellement malgré une dépendance échouée : refusée en PRODUCTION, même avec tout le reste approuvé', () => {
    const g = { ...fullyApprovedGovernance(), g1Policies: { ...fullyApprovedGovernance().g1Policies, 'G1-RETURN': 'UNSIGNED' as const } };
    expect(capabilityState('longReturn', g, 'PRODUCTION', true)).toMatchObject({ enabled: false, eligibility: { blockingG1PolicyIds: ['G1-RETURN'] } });
  });

  it('CORE-EXT-R1 absente (simulée) ⇒ dépendance technique non satisfaite', () => {
    const g = { ...CURRENT_RUNNING_GOVERNANCE, technical: { ...CURRENT_RUNNING_GOVERNANCE.technical, CORE_EXT_R1: 'UNSATISFIED' as const } };
    expect(createRunningEngine({ governance: g }).governance.technical.CORE_EXT_R1).toBe('UNSATISFIED');
  });
});
