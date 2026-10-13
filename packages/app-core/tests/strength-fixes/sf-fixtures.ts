/**
 * Correctifs Musculation — profils réalistes (Beta 0) : pratiquant multisport prise de masse 3 séances/semaine avec
 * Running et Cross-training ; prise de masse 4 séances/semaine ; matériel incomplet (préréglages réels).
 */
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, selectBeta0Week, selectProgrammeSession } from '../../src/index.js';
import type { AppState, Clock, ProfileInput, ProgrammeEnvironment } from '../../src/index.js';

export const at = (iso: string): Clock => ({ today: iso.slice(0, 10), now: iso });
export const MON1 = '2026-10-05T07:30:00.000Z';
export const eqOf = (id: string): string[] => [...(EQUIPMENT_PRESETS.find((p) => p.id === id)?.equipment ?? [])];

export function massProfile(o: { sessions?: number; multisport?: boolean; preset?: string; availability?: number[] } = {}): ProfileInput {
  const multi = o.multisport ?? true;
  const preset = o.preset ?? 'preset.commercial_gym';
  return {
    displayName: '', level: 'intermediate', priorities: multi ? ['strength', 'running', 'crosstraining'] : ['strength'],
    strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: o.sessions ?? 3 },
    running: { enabled: multi, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: multi ? { enabled: true, sessionsPerWeek: 1, intent: 'crosstraining.mixed_modal_medium', returnState: 'NONE' } : { enabled: false },
    hyrox: { enabled: false },
    equipment: { presetId: preset, items: eqOf(preset) },
    availability: o.availability ?? [75, 60, 75, 60, 75, 90, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  };
}

export function create(p: ProfileInput = massProfile(), now = MON1, env?: ProgrammeEnvironment): AppState {
  return createBeta0Programme(emptyState(), p, at(now), p.running.enabled ? { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } } : {}, ...(env ? [env] : []));
}

export const week = (s: AppState, mon = '2026-10-05') => selectBeta0Week(s, mon);
export const strengthIds = (s: AppState, mon = '2026-10-05') => (week(s, mon)?.sessions ?? []).filter((x) => x.sport === 'strength' && x.placement === 'planned').map((x) => x.requestId);
export const exercisesOf = (s: AppState, id: string) => (selectProgrammeSession(s, id)?.session.blocks ?? []).filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items.map((i) => i.exerciseId));
export const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
