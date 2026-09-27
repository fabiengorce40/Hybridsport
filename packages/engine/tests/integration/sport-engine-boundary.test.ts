/**
 * Phase 3.5 — frontière SportEngine / CORE. Le moteur (ici FACTICE) propose ; le CORE contrôle,
 * compare, ajuste, valide, répare et explique. Un moteur ne peut jamais s'auto-déclarer valide.
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime } from '@hybridsport/domain';
import type { FingerprintHistoryEntry, SportEngineProposalInput } from '@hybridsport/domain';
import { acceptProposal, buildFingerprint, canonicalStringify, runSportSession } from '../../src/index.js';
import type { SportEngineInput } from '../../src/index.js';
import { coreContext } from '../harness/context.js';
import { machineVariant, pain, PROFILE_GYM, STATE_FRESH } from '../harness/requests.js';
import { presetEquipment } from '../fixtures/context.js';
import { testRuleset } from '../fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../fixtures/ruleset.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';
import { FAKE_ENGINE, fakeEngine, fingerprintInputsFor, INTENT, proposalFor, TWO_PROPOSALS } from '../fixtures/sport-engine.js';

const ctx = (seed = 'boundary') => coreContext(seed, testRuleset(testRulesetDocumentWithDuplicate()));
const request = (o: Partial<Parameters<typeof runSportSession>[1]> = {}) => ({ intent: INTENT, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], ...o });
const codeOf = (r: ReturnType<typeof runSportSession>['result']) => (r.status === 'error' ? r.error.code : r.status);
const steps = (o: ReturnType<typeof runSportSession>) => o.trace.entries.map((e) => e.step);

describe('flux : intention → garde → moteur → acceptation → durée → empreinte → anti-doublon → validation → sélection', () => {
  it('nominal : séance valide, empreinte et rapport anti-doublon joints au résultat', () => {
    const o = runSportSession(fakeEngine(TWO_PROPOSALS), request(), ctx());
    expect(o.result.status).toBe('ok');
    expect(steps(o)).toEqual(['safety', 'duration', 'duplicate', 'validate', 'duration', 'duplicate', 'validate', 'score', 'result']);
    expect(o.fingerprint?.sessionId).toBe(o.result.status === 'ok' ? o.result.value.id : '');
    expect(o.duplicate?.classification).toBe('none');
  });

  it('le moteur reçoit les contraintes DÉRIVÉES par le CORE et une graine dédiée', () => {
    const calls: SportEngineInput[] = [];
    runSportSession(fakeEngine(TWO_PROPOSALS, calls), request({ state: { ...STATE_FRESH, activePain: [pain({ level: 'P2', bodyAreas: ['knee'] })] } }), ctx('s1'));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.constraints.areaRestrictions).toEqual([{ area: 'knee', action: 'exclude', painLevel: 'P2' }]);
    expect(calls[0]?.context.seed).toBe('s1/engine/engine.test.fake');
    expect(calls[0]?.intent.archetypeId).toBe(INTENT.archetypeId);
  });

  it('programme en pause (P4) ou hors périmètre ⇒ le moteur n’est JAMAIS appelé', () => {
    const calls: SportEngineInput[] = [];
    const p4 = runSportSession(fakeEngine(TWO_PROPOSALS, calls), request({ state: { ...STATE_FRESH, activePain: [pain({ level: 'P4', bodyAreas: [] })] } }), ctx());
    expect(codeOf(p4.result)).toBe('SAFETY_BLOCK');
    const scope = runSportSession(fakeEngine(TWO_PROPOSALS, calls), request({ profile: { ...PROFILE_GYM, eligibility: 'excluded' } }), ctx());
    expect(codeOf(scope.result)).toBe('OUT_OF_SCOPE');
    expect(calls).toEqual([]);
  });

  it('intention invalide, moteur d’une autre discipline, moteur en échec ⇒ INVALID_INPUT', () => {
    expect(codeOf(runSportSession(fakeEngine(TWO_PROPOSALS), request({ intent: { ...INTENT, stimulus: undefined } }), ctx()).result)).toBe('INVALID_INPUT');
    expect(codeOf(runSportSession({ ...fakeEngine(TWO_PROPOSALS), discipline: 'running' }, request(), ctx()).result)).toBe('INVALID_INPUT');
    expect(codeOf(runSportSession(fakeEngine(() => { throw new Error('boum'); }), request(), ctx()).result)).toBe('INVALID_INPUT');
  });

  it('déterminisme complet du flux', () => {
    const a = runSportSession(fakeEngine(TWO_PROPOSALS), request(), ctx('d'));
    const b = runSportSession(fakeEngine(TWO_PROPOSALS), request(), ctx('d'));
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });
});

describe('acceptation : un moteur ne peut ni s’auto-valider ni s’écarter de l’intention', () => {
  const one = (mutate: (p: SportEngineProposalInput, input: SportEngineInput) => unknown) =>
    runSportSession(fakeEngine((input) => [mutate(proposalFor(input, strengthSessionInput()), input) as SportEngineProposalInput]), request(), ctx());

  it.each([
    ['champ d’auto-validation', (p: SportEngineProposalInput) => ({ ...p, validated: true })],
    ['statut VALID auto-déclaré', (p: SportEngineProposalInput) => ({ ...p, status: 'VALID' })],
    ['rapport de validation fourni', (p: SportEngineProposalInput) => ({ ...p, validation: { status: 'VALID', errors: [] } })],
  ])('%s ⇒ proposition refusée (schéma strict), jamais évaluée', (_n, mutate) => {
    const o = one(mutate);
    expect(codeOf(o.result)).toBe('NO_VALID_SOLUTION');
    expect(o.trace.entries.find((e) => e.step === 'proposal')?.decision).toBe('rejected');
  });

  it.each([
    ['autre archétype', (p: SportEngineProposalInput) => ({ ...p, archetypeId: 'arch.other' })],
    ['autre stimulus', (p: SportEngineProposalInput) => ({ ...p, stimulus: 'stim.other' })],
    ['autre intention', (p: SportEngineProposalInput) => ({ ...p, intentId: 'intent.other' })],
    ['temps disponible allongé', (p: SportEngineProposalInput) => ({ ...p, session: strengthSessionInput({ availableTimeS: 3000 }) })],
    ['graine différente', (p: SportEngineProposalInput) => ({ ...p, provenance: { ...p.provenance, seed: 'other' } })],
    ['ruleset d’une autre version', (p: SportEngineProposalInput) => ({ ...p, provenance: { ...p.provenance, rulesetVersion: '9.9.9' } })],
    ['paramètre inconnu cité', (p: SportEngineProposalInput) => ({ ...p, parametersUsed: [{ id: 'strength.secret', version: '0.1.0' }] })],
    ['paramètre cité dans une autre version', (p: SportEngineProposalInput) => ({ ...p, parametersUsed: [{ id: 'core.optimization.epsilon', version: '0.2.0' }] })],
  ])('%s ⇒ refus TECHNICAL tracé', (_n, mutate) => {
    const o = one(mutate);
    expect(codeOf(o.result)).toBe('NO_VALID_SOLUTION');
    const rejected = o.trace.entries.find((e) => e.step === 'proposal');
    expect(rejected?.reasons.length).toBeGreaterThan(0);
  });

  it('intention de répétition inventée par le moteur ⇒ DUPLICATE.INTENT_NOT_DECLARED (jamais une excuse a posteriori)', () => {
    const o = one((p) => ({ ...p, repetitionIntents: [{ kind: 'benchmark_retest', benchmarkId: 'bench.invented' }] }));
    expect(o.trace.entries.find((e) => e.step === 'proposal')?.reasons.map((r) => r.code)).toContain('DUPLICATE.INTENT_NOT_DECLARED');
  });

  it('intention de répétition déclarée par le planificateur ⇒ acceptée', () => {
    const retest = { kind: 'benchmark_retest' as const, benchmarkId: 'bench.upper' };
    const o = runSportSession(fakeEngine((input) => [proposalFor(input, strengthSessionInput(), { repetitionIntents: [retest] })]), request({ intent: { ...INTENT, repetitionIntents: [retest] } }), ctx());
    expect(o.result.status).toBe('ok');
  });

  it('empreinte invalide (volume manquant) ⇒ candidat inadmissible (A4) et jamais réparé', () => {
    const o = one((p) => ({ ...p, fingerprintInputs: { ...(p.fingerprintInputs as object), volumeByItem: {} } }));
    expect(codeOf(o.result)).toBe('NO_VALID_SOLUTION');
    expect(steps(o)).toContain('fingerprint');
    expect(steps(o)).not.toContain('repair');
  });

  it('acceptProposal isolé : une proposition conforme devient un candidat, rien de plus', () => {
    const calls: SportEngineInput[] = [];
    runSportSession(fakeEngine(TWO_PROPOSALS, calls), request(), ctx());
    const input = calls[0]!;
    const a = acceptProposal(proposalFor(input, strengthSessionInput()), 0, input, FAKE_ENGINE);
    expect(a.ok).toBe(true);
    if (a.ok) expect(Object.keys(a.candidate).sort()).toEqual(['fingerprintInputs', 'optimization', 'session']);
  });
});

describe('anti-doublon dans la décision : SOFT, au niveau B6, subordonné à la progression', () => {
  const benchFp = () => {
    const r = buildFingerprint(session({ ...strengthSessionInput(), id: 'session.last_week' }), coreContext().catalog, fingerprintInputsFor(strengthSessionInput()));
    if (!r.ok) throw new Error('empreinte');
    return r.fingerprint;
  };
  const history: FingerprintHistoryEntry[] = [{ fingerprint: benchFp(), at: asISODateTime('2026-09-24T08:00:00Z'), status: 'completed', repetitionIntents: [] }];
  const EQUAL = { B1: 0.5, B2: 0.5, B3: 0.5, B4: 0.5, B5: 0.5, B6: 0.5 };
  const equalPair = (input: SportEngineInput) => [proposalFor(input, strengthSessionInput(), { optimization: EQUAL }), proposalFor(input, machineVariant(), { optimization: EQUAL })];

  it('à égalité B1–B5, la séance qui répète la semaine précédente perd en B6', () => {
    const without = runSportSession(fakeEngine(equalPair), request(), ctx('v'));
    const withHistory = runSportSession(fakeEngine(equalPair), request({ history }), ctx('v'));
    expect(withHistory.result.status === 'ok' && withHistory.result.value.id).toBe('session.test.upper_machines');
    expect(without.result.status).toBe('ok');
    expect(withHistory.trace.entries.find((e) => e.step === 'score')?.reasons[0]).toMatchObject({ code: 'SELECT.DECIDED_AT_LEVEL', params: { level: 'B6' } });
  });

  it('progression (B2) > variété (B6) : la séance meilleure en B2 reste choisie malgré la répétition', () => {
    const o = runSportSession(fakeEngine(TWO_PROPOSALS), request({ history }), ctx('v'));
    expect(o.result.status === 'ok' && o.result.value.id).toBe('session.test.upper');
    expect(o.duplicate?.classification).toBe('accidental_strong');
    if (o.result.status === 'ok') expect(o.result.warnings.map((w) => w.code)).toContain('DUPLICATE.ACCIDENTAL');
  });

  it('après réparation, l’empreinte est recalculée sur la séance finale', () => {
    const o = runSportSession(fakeEngine(TWO_PROPOSALS), request({ profile: { ...PROFILE_GYM, availableEquipment: presetEquipment('preset.dumbbells_only') } }), ctx());
    expect(o.result.status).toBe('ok');
    if (o.result.status === 'ok') expect(o.fingerprint?.exercises).toEqual([...new Set(o.result.value.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)))].sort());
  });
});
