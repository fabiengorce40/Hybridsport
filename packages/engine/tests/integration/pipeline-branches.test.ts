/**
 * Phase 3.5 — chaque sortie et chaque branche importante du pipeline CORE.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { canonicalStringify, fromArray, runCorePipeline } from '../../src/index.js';
import type { CoreCandidate, CorePipelineRequest } from '../../src/index.js';
import { coreContext } from '../harness/context.js';
import { machineVariant, pain, PROFILE_GYM, REQUESTS, STATE_FRESH } from '../harness/requests.js';
import { presetEquipment } from '../fixtures/context.js';
import { strengthSessionInput } from '../fixtures/sessions.js';

const V = (...xs: number[]) => fromArray(xs);
const bench: CoreCandidate = { session: strengthSessionInput(), optimization: V(0.8, 0.7, 0.5, 0, 0.5, 0.2) };
const machines: CoreCandidate = { session: machineVariant(), optimization: V(0.78, 0.6, 0.9, 0, 0.5, 0.4) };
const req = (o: Partial<CorePipelineRequest> = {}): CorePipelineRequest => ({ profile: PROFILE_GYM, state: STATE_FRESH, candidates: [bench, machines], ...o });
const run = (r: CorePipelineRequest, seed = 'branches') => runCorePipeline(r, coreContext(seed));
const codeOf = (r: ReturnType<typeof run>['result']) => (r.status === 'error' ? r.error.code : r.status);
const safetyCodes = (o: ReturnType<typeof run>) => o.trace.entries.find((e) => e.step === 'safety')?.reasons.map((x) => x.code) ?? [];

describe('pipeline — issues', () => {
  it('ok : séance valide, trace liée au résultat', () => {
    const o = run(req());
    expect(o.result.status).toBe('ok');
    expect(o.result.trace.traceId).toBe(o.trace.traceId);
  });

  it('rest_recommended : la douleur retire l’objet de la séance', () => {
    const o = run(req({ state: { ...STATE_FRESH, activePain: [pain({ level: 'P2', bodyAreas: ['shoulder'] })] } }));
    expect(o.result.status).toBe('rest_recommended');
  });

  it('error INVALID_INPUT : contexte invalide (graine vide) ⇒ rejet TECHNICAL avant toute décision', () => {
    const o = runCorePipeline(req(), { ...coreContext(), seed: '' });
    expect(codeOf(o.result)).toBe('INVALID_INPUT');
    expect(o.trace.entries.map((e) => e.step)).toEqual(['context']);
  });

  it('OUT_OF_SCOPE (suspended_scope) : exclu, suspendu, ou déclaration exigée absente', () => {
    for (const eligibility of ['excluded', 'suspended', 'declaration_required'] as const) {
      const o = run(req({ profile: { ...PROFILE_GYM, eligibility } }));
      expect(codeOf(o.result)).toBe('OUT_OF_SCOPE');
      expect(o.trace.entries.find((e) => e.step === 'safety')?.decision).toBe('suspended_scope');
    }
  });

  it('déclaration acceptée par le ruleset ⇒ programme actif', () => {
    const o = run(req({ profile: { ...PROFILE_GYM, eligibility: 'declaration_required', declarations: [{ kind: 'test.professional_clearance', declaredAt: '2026-09-01T10:00:00Z', rulesetRef: '0.1.0-test' }] as never } }));
    expect(o.result.status).toBe('ok');
  });

  it('SAFETY_BLOCK (paused_safety) : P4, ou P3 sur une zone centrale selon la règle de pause du ruleset', () => {
    const p4 = run(req({ state: { ...STATE_FRESH, activePain: [pain({ level: 'P4', bodyAreas: [] })] } }));
    expect(codeOf(p4.result)).toBe('SAFETY_BLOCK');
    expect(safetyCodes(p4)).toContain('SAFETY.PAIN.P4_INTERRUPTED');
    const p3 = run(req({ state: { ...STATE_FRESH, activePain: [pain({ level: 'P3', bodyAreas: ['lower_back'] })] } }));
    expect(codeOf(p3.result)).toBe('SAFETY_BLOCK');
    expect(p3.trace.entries.find((e) => e.step === 'safety')?.decision).toBe('paused_safety');
    // Aucune séance ne passe, quel que soit son score : ni durée ni validation ne sont tentées.
    expect(p3.trace.entries.map((e) => e.step)).toEqual(['safety']);
  });

  it('P2 sans consentement : adaptation immédiate (zone exclue), non-persistance signalée, historique indisponible', () => {
    const o = run(req({
      profile: { ...PROFILE_GYM, healthDataConsent: false },
      state: { ...STATE_FRESH, painHistory: 'unavailable', activePain: [pain({ level: 'P2', bodyAreas: ['knee'], persisted: false })] },
    }));
    expect(['ok', 'rest_recommended']).toContain(o.result.status);
    expect(safetyCodes(o)).toEqual(expect.arrayContaining(['DATA.NOT_PERSISTED_NO_CONSENT', 'DATA.HEALTH_HISTORY_UNAVAILABLE']));
    if (o.result.status === 'ok') {
      const cat = coreContext().catalog;
      for (const id of o.result.value.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))) expect(cat.exercise(id)?.painSensitiveAreas).not.toContain('knee');
    }
  });

  it('rapport de douleur persisté alors que le consentement est absent ⇒ INVALID_INPUT (jamais traité en silence)', () => {
    const o = run(req({ profile: { ...PROFILE_GYM, healthDataConsent: false }, state: { ...STATE_FRESH, activePain: [pain({ level: 'P2', bodyAreas: ['knee'], persisted: true })] } }));
    expect(codeOf(o.result)).toBe('INVALID_INPUT');
  });

  it('painHistory = unavailable : tracé, sans inventer d’historique ni bloquer la séance', () => {
    const o = run(req({ state: { ...STATE_FRESH, painHistory: 'unavailable' } }));
    expect(o.result.status).toBe('ok');
    expect(safetyCodes(o)).toContain('DATA.HEALTH_HISTORY_UNAVAILABLE');
  });
});

describe('pipeline — candidats', () => {
  it('un candidat A-invalide est écarté même avec le meilleur score ; le candidat admissible gagne', () => {
    const invalidBest: CoreCandidate = { session: { ...strengthSessionInput(), id: 'session.bad' }, optimization: V(1, 1, 1, 1, 1, 1) };
    const o = run(req({ profile: { ...PROFILE_GYM, excludedExercises: ['ex.bench_press'] }, candidates: [invalidBest, machines] }));
    expect(o.result.status).toBe('ok');
    if (o.result.status === 'ok') expect(o.result.value.id).toBe('session.test.upper_machines');
    const score = o.trace.entries.find((e) => e.step === 'score');
    expect(score?.rejected?.map((r) => r.candidate)).toEqual(['session.bad']);
  });

  it('candidat illisible (schéma) : rejeté TECHNICAL, jamais réparé', () => {
    const o = run(req({ candidates: [{ session: { id: 'x', nope: true }, optimization: V(1, 1, 1, 1, 1, 1) }] }));
    expect(codeOf(o.result)).toBe('NO_VALID_SOLUTION');
    if (o.result.status === 'error') expect(o.result.error.reasons[0]?.code).toBe('SELECT.NO_ADMISSIBLE_CANDIDATE');
  });

  it('aucun candidat ⇒ NO_VALID_SOLUTION explicite', () => {
    expect(codeOf(run(req({ candidates: [] })).result)).toBe('NO_VALID_SOLUTION');
  });

  it('tous les candidats invalides ⇒ réparation du mieux classé en couche B', () => {
    const o = run(req({ profile: { ...PROFILE_GYM, availableEquipment: presetEquipment('preset.dumbbells_only') } }));
    expect(o.result.status).toBe('ok');
    expect(o.trace.entries.some((e) => e.step === 'repair')).toBe(true);
    if (o.result.status === 'ok') expect(['session.test.upper', 'session.test.upper_machines']).toContain(o.result.value.id);
  });

  it('admissible sur le fond mais durée impossible ⇒ l’autre candidat gagne ; seul ⇒ échec explicite', () => {
    const tooLong: CoreCandidate = { session: strengthSessionInput({ id: 'session.short', availableTimeS: 700, targetDurationS: 500 }), optimization: V(1, 1, 1, 1, 1, 1) };
    const both = run(req({ candidates: [tooLong, machines] }));
    expect(both.result.status === 'ok' && both.result.value.id).toBe('session.test.upper_machines');
    expect(both.trace.entries.find((e) => e.step === 'duration' && e.subject.id === 'session.short')?.decision).toBe('INFEASIBLE');
    const alone = run(req({ candidates: [tooLong] }));
    expect(['NO_VALID_SOLUTION', 'REPAIR_EXHAUSTED']).toContain(codeOf(alone.result));
  });

  it('réparation réussie (substitution) puis réparation impossible (jour indisponible)', () => {
    const ok = run(REQUESTS.dumbbells_only!);
    expect(ok.result.status).toBe('ok');
    const ko = run(req({ state: { ...STATE_FRESH, dayAvailable: false } }));
    expect(codeOf(ko.result)).toBe('NO_VALID_SOLUTION');
  });

  it('plusieurs candidats admissibles : décision au niveau B tracée ; égalité parfaite départagée par la graine', () => {
    const o = run(req());
    expect(o.trace.entries.find((e) => e.step === 'score')?.reasons[0]?.code).toBe('SELECT.DECIDED_AT_LEVEL');
    const same = V(0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
    const tie = run(req({ candidates: [{ ...bench, optimization: same }, { ...machines, optimization: same }] }));
    expect(tie.trace.entries.find((e) => e.step === 'score')?.reasons.map((x) => x.code)).toContain('SELECT.TIE_BROKEN_BY_SEED');
  });

  it('identifiants de candidats dupliqués ⇒ INVALID_INPUT (sinon la décision dépendrait de l’ordre d’entrée)', () => {
    const dup: CoreCandidate = { session: { ...machineVariant(), id: 'session.test.upper' }, optimization: machines.optimization };
    const a = run(req({ candidates: [bench, dup] }));
    const b = run(req({ candidates: [dup, bench] }));
    expect(codeOf(a.result)).toBe('INVALID_INPUT');
    expect(codeOf(b.result)).toBe('INVALID_INPUT');
  });
});

describe('pipeline — déterminisme', () => {
  it('déterminisme complet : même requête + même graine ⇒ sortie identique octet pour octet (toutes les requêtes du banc)', () => {
    for (const r of Object.values(REQUESTS)) expect(canonicalStringify(run(r, 'd'))).toBe(canonicalStringify(run(r, 'd')));
  });

  it('propriété : l’ordre d’entrée des candidats ne change jamais la décision (sémantique identique)', () => {
    const same = V(0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
    const pools: CoreCandidate[][] = [
      [bench, machines],
      [{ ...bench, optimization: same }, { ...machines, optimization: same }],
      [{ session: { ...strengthSessionInput(), id: 'session.bad' }, optimization: V(1, 1, 1, 1, 1, 1) }, machines, bench],
    ];
    fc.assert(fc.property(fc.constantFrom(...pools), fc.string({ minLength: 1, maxLength: 8 }), fc.boolean(), (pool, seed, dumbbells) => {
      const profile = { ...PROFILE_GYM, excludedExercises: ['ex.cable_fly'], ...(dumbbells ? { availableEquipment: presetEquipment('preset.dumbbells_only') } : {}) };
      const a = run(req({ profile, candidates: pool }), seed).result;
      const b = run(req({ profile, candidates: [...pool].reverse() }), seed).result;
      expect(a.status).toBe(b.status);
      if (a.status === 'ok' && b.status === 'ok') expect(canonicalStringify(a.value)).toBe(canonicalStringify(b.value));
    }), { numRuns: 40 });
  });
});
