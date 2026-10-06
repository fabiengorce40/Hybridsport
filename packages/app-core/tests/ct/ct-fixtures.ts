/**
 * Fixtures C3.5 (tests app-core) : profils Beta 0 avec Cross-training, horloge, lecture des décisions C3 PERSISTÉES.
 * Toutes les valeurs sportives viennent de l'environnement Beta 0 (gouvernance C3 TEST_ONLY, SIMULATION_ONLY).
 */
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, finishProgrammeSession, loadState, MemoryStorage, saveState, selectBeta0Week, startProgrammeSession } from '../../src/index.js';
import type { AppState, Clock, FinishInput, ProfileInput } from '../../src/index.js';

export const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
export const at = (iso: string): Clock => ({ today: iso.slice(0, 10), now: iso });
/** Lundi de la semaine 1 (horloge de test), 07:30 UTC. */
export const MON1 = '2026-10-05T07:30:00.000Z';
export const MON2 = '2026-10-12T07:30:00.000Z';

type CtDecl = Partial<ProfileInput['crosstraining']>;
export function profile(o: { ct?: CtDecl | false; strength?: boolean; running?: boolean; priorities?: ProfileInput['priorities']; availability?: number[]; equipment?: readonly string[]; level?: ProfileInput['level'] } = {}): ProfileInput {
  const ct = o.ct === false ? { enabled: false } : { enabled: true, sessionsPerWeek: 3, intent: 'crosstraining.mixed_modal_medium', returnState: 'NONE' as const, ...o.ct };
  const priorities = o.priorities ?? [...(o.strength ? ['strength' as const] : []), ...(o.running ? ['running' as const] : []), ...(ct.enabled ? ['crosstraining' as const] : [])];
  return {
    displayName: '', level: o.level ?? 'intermediate', priorities,
    strength: { enabled: o.strength === true, goal: 'general', sessionsPerWeek: 2 },
    running: { enabled: o.running === true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: ct, hyrox: { enabled: false },
    equipment: { presetId: 'preset.full_gym', items: [...(o.equipment ?? fullGym)] },
    availability: o.availability ?? [60, 60, 60, 60, 60, 60, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  };
}

export function create(p: ProfileInput = profile(), now = MON1): AppState {
  return createBeta0Programme(emptyState(), p, at(now), p.running.enabled ? { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } } : {});
}

export const week = (s: AppState, now = MON1) => selectBeta0Week(s, now.slice(0, 10));
export const ctSessions = (s: AppState, now = MON1) => (week(s, now)?.sessions ?? []).filter((x) => x.sport === 'crosstraining');

/** Requête persistée (toutes semaines). */
export function request(s: AppState, requestId: string) {
  for (const w of Object.values(s.planner.weeks)) { const r = w.requests.find((x) => x.requestId === requestId); if (r) return r; }
  return undefined;
}
/** Décisions C3 PERSISTÉES de la séance (code → params). */
export const decisions = (s: AppState, requestId: string, code: string) => (request(s, requestId)?.reasons ?? []).filter((r) => r.code.endsWith(code)).map((r) => r.params);

/** Démarre puis termine une séance CT à un instant donné. */
export function doCt(s: AppState, requestId: string, startIso: string, endIso: string, f: Omit<FinishInput, 'requestId'>): AppState {
  const started = startProgrammeSession(s, at(startIso), requestId);
  return finishProgrammeSession(started, at(endIso), { requestId, ...f });
}

/** Rechargement réel : sérialisation → stockage → relecture stricte. */
export function reload(s: AppState, now: string): AppState {
  const storage = new MemoryStorage();
  const w = saveState(storage, s);
  if (!w.ok) throw new Error(`enregistrement : ${w.error}`);
  const r = loadState(storage, now);
  if (r.status !== 'ok') throw new Error(`rechargement : ${r.status}`);
  return r.state;
}
