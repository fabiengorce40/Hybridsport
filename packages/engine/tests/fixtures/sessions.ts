import type { SessionDraftInput } from '@hybridsport/domain';
import { zSessionDraft } from '@hybridsport/domain';
import type { SessionDraft } from '@hybridsport/domain';

export const set = (kind: 'rampup' | 'working', reps: number, restAfterS: number) => ({ kind, reps, restAfterS });

/** Séance de force de référence (durées calculées à la main dans duration.test.ts). */
export function strengthSessionInput(overrides: Partial<SessionDraftInput> = {}): SessionDraftInput {
  return {
    id: 'session.test.upper', discipline: 'strength', athleteLevel: 'intermediate',
    availableTimeS: 2100, targetDurationS: 1740, toleranceProfile: 'strength_sets',
    blocks: [
      { id: 'b.warmup', kind: 'warmup', role: 'support', format: 'continuous', minDurationS: 300,
        items: [{ id: 'i.mob', exerciseId: 'ex.hip_mobility_flow', prescription: { type: 'mobility', seconds: 300 } }] },
      { id: 'b.main', kind: 'strength', role: 'primary', format: 'sets', grouping: 'straight',
        items: [{ id: 'i.bench', exerciseId: 'ex.bench_press', prescription: { type: 'sets', sets: [set('rampup', 5, 60), set('rampup', 5, 60), set('working', 5, 150), set('working', 5, 150), set('working', 5, 150)] } }] },
      { id: 'b.acc', kind: 'accessory', role: 'support', format: 'sets', grouping: 'straight',
        levers: [{ kind: 'superset_accessories' }, { kind: 'reduce_sets', min: 2 }, { kind: 'reduce_rest', floorS: 45 }, { kind: 'drop_accessory', keepAtLeast: 1 }],
        items: [
          { id: 'i.row', exerciseId: 'ex.db_row', prescription: { type: 'sets', sets: [set('working', 10, 90), set('working', 10, 90), set('working', 10, 90)] } },
          { id: 'i.fly', exerciseId: 'ex.cable_fly', prescription: { type: 'sets', sets: [set('working', 12, 60), set('working', 12, 60), set('working', 12, 60)] } },
        ] },
    ],
    ...overrides,
  };
}

export function session(input: SessionDraftInput = strengthSessionInput()): SessionDraft {
  return zSessionDraft.parse(input);
}
