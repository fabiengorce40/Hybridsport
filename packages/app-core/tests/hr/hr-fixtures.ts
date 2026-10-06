/**
 * Fixtures H2.5 (tests app-core) : profils Beta 0 avec HYROX, horloge, lecture des décisions H2 PERSISTÉES, exécution
 * par le chemin de l'application. Toutes les valeurs sportives viennent de l'environnement Beta 0 (gouvernance H2
 * TEST_ONLY, SIMULATION_ONLY).
 */
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, finishProgrammeSession, hrWorkoutOfView, selectBeta0Week, selectProgrammeSession, setHrSteps, startProgrammeSession } from '../../src/index.js';
import type { AppState, Clock, FinishInput, ProfileInput } from '../../src/index.js';
import { at, reload } from '../ct/ct-fixtures.js';

export { at, reload };
export const hyroxGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.hybrid_race_gym')?.equipment ?? [];
export const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
/** Lundi de la semaine 1 (horloge de test), 07:30 UTC. */
export const MON1 = '2026-10-05T07:30:00.000Z';
export const MON2 = '2026-10-12T07:30:00.000Z';
export const ROLE = (r: string) => `hybrid_race.h2.${r}`;

type HrDecl = Partial<ProfileInput['hyrox']>;
export function hrProfile(o: { hr?: HrDecl | false; strength?: boolean; running?: boolean; ct?: boolean; priorities?: ProfileInput['priorities']; availability?: number[]; equipment?: readonly string[]; level?: ProfileInput['level'] } = {}): ProfileInput {
  const hr = o.hr === false ? { enabled: false } : { enabled: true, sessionsPerWeek: 2, role: ROLE('compromised_running'), goal: 'RACE_PREPARATION' as const, returnState: 'NONE' as const, ...o.hr };
  const priorities = o.priorities ?? [...(o.strength ? ['strength' as const] : []), ...(o.running ? ['running' as const] : []), ...(o.ct ? ['crosstraining' as const] : []), ...(hr.enabled ? ['hyrox' as const] : [])];
  return {
    displayName: '', level: o.level ?? 'intermediate', priorities,
    strength: { enabled: o.strength === true, goal: 'general', sessionsPerWeek: 2 },
    running: { enabled: o.running === true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: o.ct ? { enabled: true, sessionsPerWeek: 1, intent: 'crosstraining.mixed_modal_medium', returnState: 'NONE' } : { enabled: false },
    hyrox: hr,
    equipment: { presetId: 'preset.hybrid_race_gym', items: [...(o.equipment ?? [...new Set([...hyroxGym, ...fullGym])])] },
    availability: o.availability ?? [60, 60, 60, 60, 60, 60, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  };
}

export function create(p: ProfileInput = hrProfile(), now = MON1): AppState {
  return createBeta0Programme(emptyState(), p, at(now), p.running.enabled ? { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } } : {});
}
export const week = (s: AppState, now = MON1) => selectBeta0Week(s, now.slice(0, 10));
export const hrSessions = (s: AppState, now = MON1) => (week(s, now)?.sessions ?? []).filter((x) => x.sport === 'hyrox');
export function request(s: AppState, requestId: string) {
  for (const w of Object.values(s.planner.weeks)) { const r = w.requests.find((x) => x.requestId === requestId); if (r) return r; }
  return undefined;
}
export const decisions = (s: AppState, requestId: string, code: string) => (request(s, requestId)?.reasons ?? []).filter((r) => r.code.endsWith(code)).map((r) => r.params);
export const workoutOf = (s: AppState, requestId: string) => { const v = selectProgrammeSession(s, requestId); return v ? hrWorkoutOfView(v) : null; };

/** Démarre, avance de `steps` étapes, puis termine une séance HYROX (chemin applicatif complet). */
export function doHr(s: AppState, requestId: string, startIso: string, endIso: string, steps: number | 'all', f: Omit<FinishInput, 'requestId'>): AppState {
  const started = startProgrammeSession(s, at(startIso), requestId);
  const total = workoutOf(started, requestId)?.steps.length ?? 0;
  const moved = setHrSteps(started, requestId, steps === 'all' ? total : steps);
  return finishProgrammeSession(moved, at(endIso), { requestId, ...f });
}
export type { Clock };
