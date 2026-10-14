/**
 * RC3.3 — course libre (hors programme) par le contrat existant `logFreeRun` : saisie datée, distance, durée,
 * ressenti, commentaire ; allure CALCULÉE ; refus explicites ; aucun doublon ; persistance ; aucune séance planifiée
 * modifiée ; lue par le moteur Running (dose de départ, allure observée ⇒ TEST possible) ; profils multisports.
 */
import { describe, expect, it } from 'vitest';
import {
  BETA0_RESET_CONFIRMATION, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, finishProgrammeSession, logFreeRun, requestRunningTest,
  resetBeta0Data, selectBeta0Week, selectFreeRuns, selectHistory, startProgrammeSession,
} from '../../src/index.js';
import type { AppState, ProfileInput } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const at = (d: string, t: string) => ({ today: d, now: `${d}T${t}Z` });
// technical-constant: TEST_ONLY — course déclarée (s, m)
const RUN = { realizedDurationS: 1800, completion: 'COMPLETED' as const, difficulty: 'AS_EXPECTED' as const, pain: false, distanceM: 5000 };
const runner = (o: Partial<ProfileInput['running']> = {}): ProfileInput => profile({
  priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
  running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE', ...o },
});
const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? (e as Error).message; } };
const reload = (s: AppState): AppState => { const d = decodeState(exportState(s)); if (!d.ok) throw new Error(d.problem); return d.state; };
const running = (s: AppState, today = W1) => (selectBeta0Week(s, today)?.sessions ?? []).filter((x) => x.sport === 'running');

describe('RC3.3 — saisie d’une course libre', () => {
  it('course datée (début déclaré) : une seule entrée au contrat Running ; allure calculée depuis distance et durée ; commentaire annexé', () => {
    const s0 = createBeta0Programme(emptyState(), runner(), clock(W1), {});
    const s = logFreeRun(s0, { ...RUN, startedAt: '2026-10-03T08:15:00Z', note: '  Bords de Seine  ' }, at(W1, '07:30:00'));
    expect(s.running.realized.length).toBe(s0.running.realized.length + 1);
    expect(s.running.realized.at(-1)).toMatchObject({ sessionId: 'free:2026-10-03T08:45:00Z', completedAt: '2026-10-03T08:45:00Z', realizedDurationS: 1800, distanceM: 5000, structureFamily: 'CONTINUOUS', completion: 'COMPLETED' });
    expect(selectFreeRuns(s)).toEqual([{ sessionId: 'free:2026-10-03T08:45:00Z', startedAt: '2026-10-03T08:15:00Z', completedAt: '2026-10-03T08:45:00Z', durationS: 1800, distanceM: 5000, paceSecPerKm: 360, difficulty: 'AS_EXPECTED', note: 'Bords de Seine' }]);
    // Sans distance : aucune allure inventée.
    const t = logFreeRun(s, { ...RUN, distanceM: undefined, startedAt: '2026-10-04T08:00:00Z' }, at(W1, '07:30:00'));
    expect(selectFreeRuns(t)[0]).toMatchObject({ distanceM: null, paceSecPerKm: null, note: null });
  });

  it('saisies invalides refusées, état inchangé : durée, distance, vitesse impossible, date invalide ou à venir, commentaire trop long', () => {
    const s = createBeta0Programme(emptyState(), runner(), clock(W1), {});
    const now = at(W1, '07:30:00');
    const cases: [string, Parameters<typeof logFreeRun>[1]][] = [
      ['DURATION_INVALID', { ...RUN, realizedDurationS: 0 }], ['DURATION_INVALID', { ...RUN, realizedDurationS: -60 }], ['DURATION_INVALID', { ...RUN, realizedDurationS: Number.NaN }], ['DURATION_INVALID', { ...RUN, realizedDurationS: 90000 }],
      ['DISTANCE_INVALID', { ...RUN, distanceM: 0 }], ['DISTANCE_INVALID', { ...RUN, distanceM: -5 }], ['DISTANCE_INVALID', { ...RUN, distanceM: Number.POSITIVE_INFINITY }],
      ['RUN_SPEED_IMPOSSIBLE', { ...RUN, realizedDurationS: 60, distanceM: 5000 }],
      ['RUN_DATE_INVALID', { ...RUN, startedAt: 'hier' }], ['RUN_DATE_INVALID', { ...RUN, startedAt: '2026-13-45T08:00:00Z' }],
      ['RUN_IN_FUTURE', { ...RUN, startedAt: '2026-10-06T08:00:00Z' }], ['RUN_IN_FUTURE', { ...RUN, startedAt: '2026-10-05T07:15:00Z' }],
      ['RUN_NOTE_TOO_LONG', { ...RUN, startedAt: '2026-10-03T08:00:00Z', note: 'x'.repeat(281) }],
    ];
    for (const [expected, run] of cases) expect(code(() => logFreeRun(s, run, now)), JSON.stringify(run)).toBe(expected);
  });

  it('jamais comptée deux fois : même course ressaisie ou course qui chevauche ⇒ refus ; courses consécutives acceptées', () => {
    let s = createBeta0Programme(emptyState(), runner(), clock(W1), {});
    const now = at(W1, '07:30:00');
    s = logFreeRun(s, { ...RUN, startedAt: '2026-10-03T08:00:00Z' }, now);
    expect(code(() => logFreeRun(s, { ...RUN, startedAt: '2026-10-03T08:00:00Z' }, now))).toBe('DUPLICATE_RUN');
    expect(code(() => logFreeRun(s, { ...RUN, startedAt: '2026-10-03T08:20:00Z', realizedDurationS: 600, distanceM: 2000 }, now))).toBe('DUPLICATE_RUN');
    s = logFreeRun(s, { ...RUN, startedAt: '2026-10-03T08:30:00Z', realizedDurationS: 600, distanceM: 2000 }, now);
    expect(selectFreeRuns(s)).toHaveLength(2);
    // Ni l'historique du programme ni l'export ne la dupliquent.
    expect(selectHistory(s)).toEqual([]);
    expect(reload(s).running.realized.filter((r) => r.sessionId.startsWith('free:'))).toHaveLength(2);
  });

  it('course du programme déjà enregistrée au même moment ⇒ la course libre est refusée (même course comptée une fois)', () => {
    let s = createBeta0Programme(emptyState(), runner(), clock(W1), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
    const v = running(s)[0];
    if (!v?.date) throw new Error('course planifiée');
    s = startProgrammeSession(s, at(v.date, '18:00:00'), v.requestId);
    s = finishProgrammeSession(s, at(v.date, '18:40:00'), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800, distanceM: 5000 } });
    expect(code(() => logFreeRun(s, { ...RUN, startedAt: `${v.date ?? ''}T18:15:00Z` }, at(v.date ?? W1, '20:00:00')))).toBe('DUPLICATE_RUN');
  });

  it('persistance : course et commentaire conservés après export / relecture ; commentaire conservé à l’enregistrement d’une course du programme et à la réinitialisation Beta', () => {
    let s = createBeta0Programme(emptyState(), runner(), clock(W1), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
    s = logFreeRun(s, { ...RUN, startedAt: '2026-10-03T08:00:00Z', note: 'Fractionné improvisé' }, at(W1, '07:30:00'));
    expect(selectFreeRuns(reload(s)).find((x) => x.sessionId === 'free:2026-10-03T08:30:00Z')?.note).toBe('Fractionné improvisé');
    const v = running(s)[0];
    if (!v?.date) throw new Error('course planifiée');
    s = startProgrammeSession(s, at(v.date, '18:00:00'), v.requestId);
    s = finishProgrammeSession(s, at(v.date, '18:40:00'), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800, distanceM: 5000 } });
    expect(selectFreeRuns(s).find((x) => x.sessionId === 'free:2026-10-03T08:30:00Z')?.note).toBe('Fractionné improvisé');
    const r = resetBeta0Data(s, at(v.date, '21:00:00'), BETA0_RESET_CONFIRMATION);
    expect(selectFreeRuns(r).find((x) => x.sessionId === 'free:2026-10-03T08:30:00Z')?.note).toBe('Fractionné improvisé');
  });
});

describe('RC3.3 — intégration au programme et au moteur Running', () => {
  it('aucune séance déjà planifiée modifiée : semaine persistée et programme identiques après la saisie', () => {
    const s0 = createBeta0Programme(emptyState(), runner(), clock(W1), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } });
    const s = ensureBeta0Week(logFreeRun(s0, { ...RUN, startedAt: '2026-10-04T08:00:00Z' }, at(W1, '07:30:00')), at(W1, '09:00:00'));
    expect(s.planner.weeks).toEqual(s0.planner.weeks);
    expect(s.programmeState).toEqual(s0.programmeState);
  });

  it('dose de départ : sans course enregistrée, la course est bloquée (information manquante) ; après une course libre, la semaine suivante est planifiée — la semaine courante n’est pas réécrite', () => {
    let s = createBeta0Programme(emptyState(), runner(), clock(W1), {});
    expect(running(s).every((x) => x.notPlanned?.display === 'missing_data')).toBe(true);
    s = logFreeRun(s, { ...RUN, startedAt: '2026-10-05T06:30:00Z' }, at(W1, '07:30:00'));
    expect(running(s).every((x) => x.status === 'not_planned')).toBe(true);
    s = ensureBeta0Week(s, at(W2, '07:30:00'));
    expect(running(s, W2).filter((x) => x.status === 'planned').length).toBeGreaterThan(0);
  });

  it('allure observée : après une course libre AVEC distance, le TEST demandé est programmé (prérequis réunis) ; sans distance, repli A2', () => {
    const base = createBeta0Programme(emptyState(), runner(), clock(W1), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } });
    const without = requestRunningTest(logFreeRun(base, { ...RUN, distanceM: undefined, startedAt: '2026-10-04T08:00:00Z' }, at(W1, '07:30:00')), at(W1, '09:00:00'));
    expect(running(without).some((x) => x.archetypeId === 'running.test')).toBe(false);
    expect(selectBeta0Week(without, W1)?.runningTestFallback?.cause).toBe('OBSERVED_PACE_UNAVAILABLE');
    const withDistance = requestRunningTest(logFreeRun(base, { ...RUN, startedAt: '2026-10-04T08:00:00Z' }, at(W1, '07:30:00')), at(W1, '09:00:00'));
    expect(running(withDistance).some((x) => x.archetypeId === 'running.test' && x.status === 'planned')).toBe(true);
  });

  it('profils multisports : Musculation + Course + Cross-training — saisie acceptée, séances des autres sports inchangées', () => {
    const p = profile({ crosstraining: { enabled: true, sessionsPerWeek: 1, intent: 'crosstraining.mixed_modal_medium', returnState: 'NONE' }, priorities: ['strength', 'running', 'crosstraining'] });
    const s0 = createBeta0Programme(emptyState(), p, clock(W1), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } });
    const s = logFreeRun(s0, { ...RUN, startedAt: '2026-10-04T08:00:00Z' }, at(W1, '07:30:00'));
    expect(s.planner.weeks).toEqual(s0.planner.weeks);
    expect(selectFreeRuns(s).length).toBe(selectFreeRuns(s0).length + 1);
  });
});
