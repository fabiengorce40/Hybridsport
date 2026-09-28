/** Fixtures des tests KAIRO V0 (profils et horloge injectée). */
import { EQUIPMENT_PRESETS } from '../src/index.js';
import type { Clock, ProfileInput } from '../src/index.js';

/** Lundi 2026-10-05. */
export const MONDAY = '2026-10-05';

export const clock = (today = MONDAY, time = '07:30:00'): Clock => ({ today, now: `${today}T${time}Z` });

const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];

export function profile(o: Partial<ProfileInput> = {}): ProfileInput {
  return {
    displayName: 'Test', level: 'intermediate', priorities: ['strength', 'running'],
    strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
    running: { enabled: false, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: false },
    equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
    // Lundi … dimanche (minutes)
    availability: [60, 0, 60, 0, 60, 90, 0],
    excludedExercises: [],
    acceptedProvisionalAt: '2026-10-04T10:00:00Z',
    ...o,
  };
}

export const runner = (o: Partial<ProfileInput['running']> = {}): Partial<ProfileInput> => ({
  priorities: ['running'],
  strength: { enabled: false, goal: 'hypertrophy', sessionsPerWeek: 1 },
  running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 3, returnState: 'NONE', ...o },
});
