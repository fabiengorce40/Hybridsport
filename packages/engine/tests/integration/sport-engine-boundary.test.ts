/**
 * Phase 3.5 — frontière SportEngine / CORE. Le moteur (ici FACTICE) propose ; le CORE contrôle,
 * compare, ajuste, valide, répare et explique. Un moteur ne peut jamais s'auto-déclarer valide.
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime } from '@hybridsport/domain';
import type { FingerprintHistoryEntry, SportEngineProposalInput } from '@hybridsport/domain';
import { acceptProposal, buildFingerprint, canonicalStringify, createCoreRegistry, runSportSession } from '../../src/index.js';
import type { SessionCheck, SportEngineInput } from '../../src/index.js';
import { coreContext } from '../harness/context.js';
import { machineVariant, pain, PROFILE_GYM, STATE_FRESH } from '../harness/requests.js';
import { presetEquipment } from '../fixtures/context.js';
import { testRuleset } from '../fixtures/load.js';
import { rule, testRulesetDocumentWithDuplicate } from '../fixtures/ruleset.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';
import { FAKE_ENGINE, fakeEngine, fingerprintInputsFor, INTENT, proposalFor, TWO_PROPOSALS } from '../fixtures/sport-engine.js';
import type { FakeContext } from '../fixtures/sport-engine.js';

const ctx = (seed = 'boundary') => coreContext(seed, testRuleset(testRulesetDocumentWithDuplicate()));
const request = (o: Partial<Parameters<typeof runSportSession>[1]> = {}): Parameters<typeof runSportSession>[1] => ({ intent: INTENT, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: {}, ...o });
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
    const calls: SportEngineInput<FakeContext>[] = [];
    runSportSession(fakeEngine(TWO_PROPOSALS, calls), request({ state: { ...STATE_FRESH, activePain: [pain({ level: 'P2', bodyAreas: ['knee'] })] } }), ctx('s1'));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.constraints.areaRestrictions).toEqual([{ area: 'knee', action: 'exclude', painLevel: 'P2' }]);
    expect(calls[0]?.context.seed).toBe('s1/engine/engine.test.fake');
    expect(calls[0]?.intent.archetypeId).toBe(INTENT.archetypeId);
  });

  it('programme en pause (P4) ou hors périmètre ⇒ le moteur n’est JAMAIS appelé', () => {
    const calls: SportEngineInput<FakeContext>[] = [];
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
    const calls: SportEngineInput<FakeContext>[] = [];
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

  it('historique à comparer mais paramètres anti-doublon absents du ruleset ⇒ INVALID_INPUT TECHNICAL (jamais de valeur par défaut)', () => {
    const o = runSportSession(fakeEngine(TWO_PROPOSALS), request({ history }), coreContext('p'));
    expect(codeOf(o.result)).toBe('INVALID_INPUT');
    if (o.result.status === 'error') expect(o.result.error.reasons[0]).toMatchObject({ code: 'TECHNICAL.PARAMETER_MISSING', category: 'technical' });
    // Sans historique comparable : aucun contrôle, aucune erreur (spec 07 §4).
    expect(runSportSession(fakeEngine(TWO_PROPOSALS), request(), coreContext('p')).result.status).toBe('ok');
  });

  it('après réparation, l’empreinte est recalculée sur la séance finale', () => {
    const o = runSportSession(fakeEngine(TWO_PROPOSALS), request({ profile: { ...PROFILE_GYM, availableEquipment: presetEquipment('preset.dumbbells_only') } }), ctx());
    expect(o.result.status).toBe('ok');
    if (o.result.status === 'ok') expect(o.fingerprint?.exercises).toEqual([...new Set(o.result.value.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)))].sort());
  });
});

describe('CORE-EXT-1/2/3 — ancres déclarées, contexte de discipline, absence de proposition', () => {
  const ANCHOR = { kind: 'progression_anchor' as const, trackId: 'track.bench' };
  const withAnchorItem = (input: SportEngineInput<FakeContext>, trackId: string) => {
    const base = strengthSessionInput();
    const main = base.blocks[1]!;
    const s = { ...base, blocks: [base.blocks[0]!, { ...main, items: [{ ...main.items[0]!, refs: { slotId: 'slot.push', progressionTrackId: trackId, anchor: 'declared' as const, prescriptionSource: 'track' as const } }] } as typeof main, base.blocks[2]!] };
    return proposalFor(input, s, { repetitionIntents: input.intent.repetitionIntents.filter((r) => r.kind === 'progression_anchor') });
  };

  it('EXT-1 : ancre déclarée par l’intention ⇒ acceptée ; ancre déclarée absente de l’intention ⇒ refusée', () => {
    const ok = runSportSession(fakeEngine((input) => [withAnchorItem(input, 'track.bench')]), request({ intent: { ...INTENT, repetitionIntents: [ANCHOR] } }), ctx());
    expect(ok.result.status).toBe('ok');
    const ko = runSportSession(fakeEngine((input) => [withAnchorItem(input, 'track.invented')]), request({ intent: { ...INTENT, repetitionIntents: [ANCHOR] } }), ctx());
    expect(codeOf(ko.result)).toBe('NO_VALID_SOLUTION');
    expect(ko.trace.entries.find((e) => e.step === 'proposal')?.reasons.map((r) => r.code)).toContain('DUPLICATE.INTENT_NOT_DECLARED');
  });

  it('EXT-2 : contexte invalide ⇒ INVALID_INPUT, moteur jamais appelé ; contexte valide transmis tel que parsé', () => {
    const calls: SportEngineInput<FakeContext>[] = [];
    const bad = runSportSession(fakeEngine(TWO_PROPOSALS, calls), request({ disciplineContext: { note: 42 } }), ctx());
    expect(codeOf(bad.result)).toBe('INVALID_INPUT');
    expect(bad.trace.entries.map((e) => e.step)).toEqual(['discipline_context']);
    expect(runSportSession(fakeEngine(TWO_PROPOSALS, calls), request({ disciplineContext: { note: 'x', extra: 1 } }), ctx()).result.status).toBe('error');
    expect(calls).toEqual([]);
    runSportSession(fakeEngine(TWO_PROPOSALS, calls), request({ disciplineContext: { note: 'semaine 3' } }), ctx());
    expect(calls[0]?.discipline).toEqual({ note: 'semaine 3' });
  });

  it('EXT-2 : un parseur qui lève ⇒ INVALID_INPUT technique', () => {
    const engine = { ...fakeEngine(TWO_PROPOSALS), parseContext: () => { throw new Error('boum'); } };
    expect(codeOf(runSportSession(engine, request(), ctx()).result)).toBe('INVALID_INPUT');
  });

  const noProposal = (input: SportEngineInput<FakeContext>, o: Record<string, unknown> = {}) => ({
    status: 'no_valid_proposal' as const,
    reasons: [{ code: 'SELECT.NO_CANDIDATE_FOR_SLOT', domain: 'SELECT' as const, category: 'feasibility' as const, params: { slot: 'slot.knee', need: 'knee_dominant' }, ruleRefs: [], severity: 'error' as const, audience: 'user' as const }],
    blockingNeeds: [{ slotId: 'slot.knee', need: 'knee_dominant' }],
    missingData: ['capacities' as const],
    provenance: { engineId: FAKE_ENGINE.id, engineVersion: FAKE_ENGINE.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
    ...o,
  });

  it('EXT-3 : no_valid_proposal = issue métier ⇒ NO_VALID_SOLUTION avec raisons du moteur, besoins bloquants et données manquantes', () => {
    const o = runSportSession(fakeEngine((input) => noProposal(input)), request(), ctx());
    expect(codeOf(o.result)).toBe('NO_VALID_SOLUTION');
    if (o.result.status === 'error') {
      const codes = o.result.error.reasons.map((r) => r.code);
      expect(codes).toEqual(['SELECT.NO_CANDIDATE_FOR_SLOT', 'SELECT.BLOCKING_NEED', 'DATA.MISSING_FOR_PROPOSAL']);
      expect(o.result.error.reasons[1]?.params).toMatchObject({ slotId: 'slot.knee', need: 'knee_dominant', engineId: FAKE_ENGINE.id });
    }
    expect(o.trace.entries.find((e) => e.step === 'proposal')?.decision).toBe('no_valid_proposal');
  });

  it('EXT-3 : no_valid_proposal sans raison, à provenance incohérente ou hors contrat ⇒ INVALID_INPUT', () => {
    expect(codeOf(runSportSession(fakeEngine((input) => noProposal(input, { reasons: [] })), request(), ctx()).result)).toBe('INVALID_INPUT');
    expect(codeOf(runSportSession(fakeEngine((input) => noProposal(input, { provenance: { ...noProposal(input).provenance, seed: 'autre' } })), request(), ctx()).result)).toBe('INVALID_INPUT');
    expect(codeOf(runSportSession(fakeEngine(() => ({ status: 'maybe' }) as never), request(), ctx()).result)).toBe('INVALID_INPUT');
  });

  it('EXT-3 : une exception du moteur reste TECHNIQUE (INVALID_INPUT), jamais confondue avec no_valid_proposal', () => {
    const o = runSportSession(fakeEngine(() => { throw new Error('bug'); }), request(), ctx());
    expect(codeOf(o.result)).toBe('INVALID_INPUT');
    expect(o.trace.entries.find((e) => e.step === 'proposal')?.decision).toBe('INVALID_INPUT');
  });
});

describe('contrôles de discipline exécutés par le CORE (SportEngine.checks)', () => {
  it('un contrôle HARD fourni par le moteur est exécuté par le validateur du CORE (le moteur ne s’auto-valide pas)', () => {
    const doc = testRulesetDocumentWithDuplicate();
    const rs = testRuleset({ ...doc, rules: [...doc.rules, rule('test.discipline.no_bench', { nature: 'SAFETY', governance: 'G1', category: 'safety' })] });
    const reasonsReg = createCoreRegistry();
    const check: SessionCheck = {
      rule: { id: 'test.discipline.no_bench', version: '1.0.0' }, layer: 'A1', nature: 'SAFETY',
      evaluate: ({ session: s }) => ({
        violations: s.blocks.flatMap((b) => b.items).filter((i) => i.exerciseId === 'ex.bench_press').map((i) => ({
          ruleId: 'test.discipline.no_bench', ruleVersion: '1.0.0', nature: 'SAFETY' as const, level: 'hard' as const, target: { kind: 'exercise' as const, id: i.id },
          reason: reasonsReg.emit('RULE.VIOLATION', { ruleId: 'test.discipline.no_bench', detail: i.exerciseId }),
        })),
        repairs: [],
      }),
    };
    const engine = { ...fakeEngine((input) => [proposalFor(input, strengthSessionInput())]), checks: [check] };
    const o = runSportSession(engine, request(), coreContext('checks', rs));
    expect(o.result.status).not.toBe('ok');
    expect(o.trace.entries.filter((e) => e.step === 'validate').flatMap((e) => e.reasons.map((r) => r.code))).toContain('RULE.VIOLATION');
    // Sans le contrôle, la même proposition passe : c'est bien le CORE qui l'a appliqué.
    expect(runSportSession(fakeEngine((input) => [proposalFor(input, strengthSessionInput())]), request(), coreContext('checks', rs)).result.status).toBe('ok');
  });
});
