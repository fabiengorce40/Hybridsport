/**
 * RC3.1 — A2 : « Je n'ai pas de chrono récent : programmer un test chronométré » sans course récente AVEC distance.
 * Avant : le moteur Running refusait le TEST (`OBSERVED_PACE_UNAVAILABLE`) et la séance disparaissait (« non
 * planifiée »). Après : la semaine garde la séance HABITUELLE du moteur (course facile), identique à la semaine sans
 * demande de test ; le repli est tracé (audit) et expliqué. Aucune allure inventée, aucune règle Running modifiée.
 */
import { describe, expect, it } from 'vitest';
import {
  createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, finishProgrammeSession, requestRunningTest, RUNNING_TEST_FALLBACK,
  selectBeta0Week, selectProgrammeSession, startProgrammeSession,
} from '../../src/index.js';
import type { AppState, ProfileInput } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
type Pop = ProfileInput['running']['population'];
type Goal = ProfileInput['running']['goal'];
const PROFILES: readonly (readonly [Pop, Goal, number])[] = [['P_R1', 'GENERAL_RUNNING', 2], ['P_R2', 'FIVE_K', 2], ['P_R2', 'TEN_K', 2], ['P_R3', 'HALF_MARATHON', 3]];
const runner = (population: Pop, goal: Goal, sessionsPerWeek: number): ProfileInput => profile({
  priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
  running: { enabled: true, population, goal, wearable: false, sessionsPerWeek, returnState: 'NONE' },
});
// technical-constant: TEST_ONLY — dernière course déclarée (s, m)
const NO_DIST = { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' as const };
const WITH_DIST = { ...NO_DIST, distanceM: 5000 };
const make = (p: ProfileInput, requestTest: boolean, lastRun: typeof NO_DIST | typeof WITH_DIST) => createBeta0Programme(emptyState(), p, clock(W1), { requestTest, lastRun });
const running = (s: AppState, today = W1) => (selectBeta0Week(s, today)?.sessions ?? []).filter((x) => x.sport === 'running');
const shape = (s: AppState, today = W1) => running(s, today).map((x) => `${x.date ?? '-'}|${x.archetypeId ?? '-'}|${x.status}`);
/** Prescription persistée d'une séance (sans identifiants d'horodatage). */
const prescription = (s: AppState, id: string) => JSON.stringify(selectProgrammeSession(s, id)?.session.blocks ?? null);
const fallbacks = (s: AppState) => (s.programmeState?.audit ?? []).filter((a) => a.reason.code === RUNNING_TEST_FALLBACK);

describe('A2 — TEST demandé sans distance : jamais de séance perdue', () => {
  for (const [pop, goal, n] of PROFILES) {
    it(`${pop} · ${goal} · ${String(n)} : avant/après — semaine identique à « sans demande », repli tracé et expliqué`, () => {
      const p = runner(pop, goal, n);
      const fixed = make(p, true, NO_DIST);
      const reference = make(p, false, NO_DIST);
      // Aucune séance de course non planifiée ; même nombre que demandé.
      expect(running(fixed).filter((x) => x.status !== 'planned')).toEqual([]);
      expect(running(fixed)).toHaveLength(n);
      // Exactement la composition du moteur sans demande de test (jours, archétypes, prescriptions).
      expect(shape(fixed)).toEqual(shape(reference));
      running(fixed).forEach((x, k) => expect(prescription(fixed, x.requestId)).toBe(prescription(reference, running(reference)[k]?.requestId ?? '')));
      expect(running(fixed).every((x) => x.archetypeId === 'running.easy')).toBe(true);
      // Trace : évaluation conservée « non planifiée », repli audité avec la cause du moteur, vue de la semaine.
      expect(fixed.programmeState?.assessments).toEqual([expect.objectContaining({ sport: 'running', status: 'not_planned' })]);
      expect(fallbacks(fixed)).toEqual([expect.objectContaining({ weekIndex: 0, reason: expect.objectContaining({ params: expect.objectContaining({ cause: 'OBSERVED_PACE_UNAVAILABLE' }) }) })]);
      expect(selectBeta0Week(fixed, W1)?.runningTestFallback).toEqual({ cause: 'OBSERVED_PACE_UNAVAILABLE', at: expect.any(String) });
      expect(selectBeta0Week(reference, W1)?.runningTestFallback).toBeNull();
    });

    it(`${pop} · ${goal} : avec distance, TEST programmé comme avant (aucun repli)`, () => {
      const s = make(runner(pop, goal, n), true, WITH_DIST);
      expect(running(s).some((x) => x.archetypeId === 'running.test' && x.status === 'planned')).toBe(true);
      expect(running(s).filter((x) => x.status !== 'planned')).toEqual([]);
      expect(fallbacks(s)).toEqual([]);
      expect(selectBeta0Week(s, W1)?.runningTestFallback).toBeNull();
    });
  }

  it('repli persisté (export / relecture) et stable : relire la semaine ne replanifie ni ne duplique la trace', () => {
    const s = make(runner('P_R2', 'TEN_K', 2), true, NO_DIST);
    const d = decodeState(exportState(s));
    if (!d.ok) throw new Error(d.problem);
    expect(selectBeta0Week(d.state, W1)?.runningTestFallback?.cause).toBe('OBSERVED_PACE_UNAVAILABLE');
    const again = ensureBeta0Week(d.state, clock(W1, '09:00:00'));
    expect(fallbacks(again)).toHaveLength(1);
    expect(shape(again)).toEqual(shape(s));
  });

  it('TEST demandé plus tard depuis le profil, toujours sans distance : même repli, aucune séance perdue', () => {
    const s0 = make(runner('P_R2', 'GENERAL_RUNNING', 2), false, NO_DIST);
    const s = requestRunningTest(s0, clock(W1, '09:00:00'));
    expect(shape(s)).toEqual(shape(s0));
    expect(fallbacks(s)).toHaveLength(1);
  });

  it('chemin de sortie : course facile réalisée AVEC distance ⇒ le test redemandé est programmé la semaine suivante', () => {
    let s = make(runner('P_R2', 'TEN_K', 2), true, NO_DIST);
    const easy = running(s)[0];
    if (!easy?.date) throw new Error('course facile absente');
    s = startProgrammeSession(s, clock(easy.date, '18:00:00'), easy.requestId);
    s = finishProgrammeSession(s, clock(easy.date, '18:40:00'), { requestId: easy.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800, distanceM: 5200 } });
    s = requestRunningTest(s, clock(easy.date, '19:00:00'));
    s = ensureBeta0Week(s, clock(W2));
    expect(running(s, W2).some((x) => x.archetypeId === 'running.test' && x.status === 'planned')).toBe(true);
    expect(selectBeta0Week(s, W2)?.runningTestFallback).toBeNull();
  });
});
