/**
 * Moteur de discipline FACTICE (test uniquement) : il ne fait aucune programmation sportive ; il
 * renvoie des séances de fixture pour exercer la frontière SportEngine / CORE.
 */
import type { SessionDraftInput, SportEngineProposalInput } from '@hybridsport/domain';
import type { SportEngine, SportEngineInput } from '../../src/index.js';
import { machineVariant } from '../harness/requests.js';
import { strengthSessionInput } from './sessions.js';

export const INTENT = {
  id: 'intent.w1.d1', discipline: 'strength', archetypeId: 'arch.test.upper', stimulus: 'stim.strength_upper', objective: 'objective.test.upper_strength',
  priority: 'standard', phase: 'phase.test.base', availableTimeS: 2100, targetDurationS: 1740, repetitionIntents: [], plannerNotes: [],
} as const;

/** Entrées d'empreinte d'une séance de fixture : volume = nombre de séries de travail (convention du moteur factice). */
export function fingerprintInputsFor(s: SessionDraftInput, markers: Record<string, number> = { 'ex.bench_press:load': 80 }): Record<string, unknown> {
  const volumeByItem: Record<string, number> = {};
  for (const b of s.blocks) for (const i of b.items) volumeByItem[i.id] = i.prescription.type === 'sets' ? i.prescription.sets.filter((x) => x.kind !== 'rampup').length : 1;
  return { archetypeId: INTENT.archetypeId, stimulus: INTENT.stimulus, energy: { low: 0.2, moderate: 0.5, high: 0.3 }, format: 'straight_sets', volumeByItem, prescriptionMarkers: markers };
}

export function proposalFor(input: SportEngineInput, session: SessionDraftInput, overrides: Partial<SportEngineProposalInput> = {}, engine: { id: string; version: string } = FAKE_ENGINE): SportEngineProposalInput {
  return {
    proposalId: `proposal.${session.id}`, discipline: input.intent.discipline, intentId: input.intent.id, archetypeId: input.intent.archetypeId,
    stimulus: input.intent.stimulus, objective: input.intent.objective, session, optimization: { B1: 0.8, B2: 0.7, B3: 0.5, B4: 0, B5: 0.5, B6: 0.2 },
    fingerprintInputs: fingerprintInputsFor(session), repetitionIntents: [], reasons: [],
    provenance: { engineId: engine.id, engineVersion: engine.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
    parametersUsed: [{ id: 'core.optimization.epsilon', version: '0.1.0' }],
    ...overrides,
  };
}

export const FAKE_ENGINE = { id: 'engine.test.fake', version: '0.0.1' as const };

/** Moteur factice configurable : `make` reçoit l'entrée et renvoie les propositions brutes. */
export function fakeEngine(make: (input: SportEngineInput) => readonly SportEngineProposalInput[], calls: SportEngineInput[] = []): SportEngine {
  return { ...FAKE_ENGINE, discipline: 'strength', propose: (input) => { calls.push(input); return make(input); } };
}

export const TWO_PROPOSALS = (input: SportEngineInput) => [
  proposalFor(input, strengthSessionInput()),
  proposalFor(input, machineVariant(), { optimization: { B1: 0.78, B2: 0.6, B3: 0.9, B4: 0, B5: 0.5, B6: 0.4 } }),
];
