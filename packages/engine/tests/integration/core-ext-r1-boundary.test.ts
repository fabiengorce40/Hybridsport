/**
 * Phase 6A — CORE-EXT-R1 à la frontière SportEngine / CORE : un moteur de discipline (FACTICE, aucune
 * programmation) propose une séance `run_structure` ; le CORE l'accepte, l'estime, la valide et la
 * sélectionne sans modification du contrat SportEngine. Une estimation falsifiée n'est jamais acceptée.
 */
import { describe, expect, it } from 'vitest';
import type { FingerprintHistoryEntry, SessionDraftInput } from '@hybridsport/domain';
import { canonicalStringify, runSportSession, withDerivedEstimate } from '../../src/index.js';
import type { SportEngineInput } from '../../src/index.js';
import { coreContext } from '../harness/context.js';
import { PROFILE_GYM, STATE_FRESH } from '../harness/requests.js';
import { testRuleset } from '../fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../fixtures/ruleset.js';
import { fakeEngine, INTENT, proposalFor } from '../fixtures/sport-engine.js';

const RUN_INTENT = { ...INTENT, discipline: 'running', availableTimeS: 5400, targetDurationS: 3600 } as const;
const ctx = (seed = 'r1') => coreContext(seed, testRuleset(testRulesetDocumentWithDuplicate()));
const request = (): Parameters<typeof runSportSession>[1] => ({ intent: RUN_INTENT, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: {} });

const easy = { domain: 'easy_low', effort: { rpe: { min: 2, max: 3 } }, priority: 'effort' } as const;
const structure = withDerivedEstimate({ type: 'run_structure', segments: [
  { kind: 'warmup', id: 'wu', dose: { durationS: 600 }, target: easy },
  { kind: 'repeat', id: 'A', sets: 2, reps: 4, work: { durationS: 120 }, target: { domain: 'severe', effort: { rpe: { min: 7, max: 8 } }, priority: 'effort' }, recovery: { dose: { durationS: 90 }, mode: 'jog' }, betweenSetRecovery: { dose: { durationS: 180 }, mode: 'walk' } },
  { kind: 'cooldown', id: 'cd', dose: { durationS: 480 }, target: easy },
] })!;
const runSession = (prescription: unknown): SessionDraftInput => ({
  id: 'session.run.r1', discipline: 'running', athleteLevel: 'intermediate', availableTimeS: 5400, targetDurationS: 3600, toleranceProfile: 'strength_sets',
  blocks: [{ id: 'b.run', kind: 'running', role: 'primary', format: 'continuous', items: [{ id: 'i.run', exerciseId: 'ex.easy_run', prescription: prescription as never }] }],
});
const runningEngine = (s: SessionDraftInput) => ({ ...fakeEngine((input: SportEngineInput<unknown>) => [proposalFor(input, s)]), discipline: 'running' as const });

describe('CORE-EXT-R1 — contrat SportEngine inchangé', () => {
  it('une séance run_structure proposée par un moteur est acceptée, estimée, validée et retenue telle quelle', () => {
    const o = runSportSession(runningEngine(runSession(structure)), request(), ctx());
    expect(o.result.status).toBe('ok');
    if (o.result.status !== 'ok') return;
    expect(canonicalStringify(o.result.value.blocks[0]!.items[0]!.prescription)).toBe(canonicalStringify(structure));
  });

  it('estimation falsifiée par le moteur ⇒ candidat inadmissible, jamais réparé', () => {
    const forged = { ...structure, estimate: { ...structure.estimate, totalS: { min: 1, max: 2 } } };
    const o = runSportSession(runningEngine(runSession(forged)), request(), ctx());
    expect(o.result.status).not.toBe('ok');
    expect(JSON.stringify(o.trace)).toContain('DURATION.ESTIMATE_MISMATCH');
  });

  it('déterminisme du flux complet (rejeu)', () => {
    const a = runSportSession(runningEngine(runSession(structure)), request(), ctx('d'));
    const b = runSportSession(runningEngine(runSession(structure)), request(), ctx('d'));
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });
});
