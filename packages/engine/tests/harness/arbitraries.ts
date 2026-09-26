import fc from 'fast-check';
import type { SessionDraftInput } from '@hybridsport/domain';
import type { CoreProfile } from '../../src/index.js';
import { EXERCISES, PRESETS } from '../fixtures/catalog.js';
import { presetEquipment } from '../fixtures/context.js';

const setsExercises = EXERCISES.filter((e) => (e.defaultPrescriptionType ?? 'sets') === 'sets' && e.timing?.secondsPerRep).map((e) => e.id);
const RESTRICTIONS = ['no_impact', 'no_overhead', 'no_running', 'no_jumping', 'no_deep_knee_flexion', 'no_loaded_spinal_flexion', 'no_grip_intensive'];

/** Profils plausibles (préset de matériel, restrictions, exclusions, niveau). */
export const arbProfile: fc.Arbitrary<CoreProfile> = fc.record({
  athleteLevel: fc.constantFrom('novice', 'beginner', 'intermediate', 'advanced'),
  eligibility: fc.constant('eligible' as const),
  declarations: fc.constant([]),
  healthDataConsent: fc.boolean(),
  restrictions: fc.subarray(RESTRICTIONS),
  excludedExercises: fc.subarray(setsExercises, { maxLength: 3 }),
  availableEquipment: fc.constantFrom(...(PRESETS ?? []).map((p) => p.id)).map(presetEquipment),
});

/** Séances de musculation plausibles construites à partir du mini catalogue. */
export const arbStrengthSession: fc.Arbitrary<SessionDraftInput> = fc.record({
  exercises: fc.uniqueArray(fc.constantFrom(...setsExercises), { minLength: 1, maxLength: 4 }),
  sets: fc.integer({ min: 1, max: 5 }), reps: fc.integer({ min: 1, max: 15 }), rest: fc.integer({ min: 30, max: 240 }),
  available: fc.integer({ min: 900, max: 5400 }),
}).map(({ exercises, sets, reps, rest, available }) => ({
  id: 'session.arb', discipline: 'strength' as const, athleteLevel: 'intermediate' as const,
  availableTimeS: available, targetDurationS: Math.max(300, available - 360), toleranceProfile: 'strength_sets',
  blocks: [{ id: 'b.main', kind: 'strength' as const, role: 'primary' as const, format: 'sets' as const, grouping: 'straight' as const,
    items: exercises.map((id, i) => ({ id: `i.${i}`, exerciseId: id, prescription: { type: 'sets' as const, sets: Array.from({ length: sets }, () => ({ kind: 'working' as const, reps, restAfterS: rest })) } })) }],
}));
