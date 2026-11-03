/**
 * Chantier C — vue Progression : lecture pure de l'état persisté (séries réelles, courses réalisées, séances prévues).
 * États construits par le chemin réel Beta 0 (programme, démarrage, séries saisies, fin de séance). Saisies : TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import {
  createBeta0Programme, emptyState, ensureBeta0Week, EQUIPMENT_PRESETS, finishProgrammeSession, isoWeekNumber, logFreeRun, progressView,
  recordProgrammeSet, selectBeta0Week, selectProgrammeSession, startProgrammeSession,
} from '../src/index.js';
import type { AppState, ProfileInput, SessionItem } from '../src/index.js';
import { clock, profile } from './fixtures.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
// technical-constant: TEST_ONLY — minutes disponibles par jour
const AVAIL = [60, 45, 60, 0, 60, 90, 75];
const input = (sports: 'strength' | 'hybrid'): ProfileInput => profile({
  priorities: sports === 'strength' ? ['strength'] : ['strength', 'running'],
  strength: { enabled: true, goal: 'strength', sessionsPerWeek: 2 },
  running: { enabled: sports !== 'strength', population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
  equipment: { presetId: 'preset.full_gym', items: [...fullGym] }, availability: AVAIL,
});
const create = (sports: 'strength' | 'hybrid'): AppState => createBeta0Programme(emptyState(), input(sports), clock(W1), sports === 'hybrid' ? { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } } : {});
const sessionsOf = (s: AppState, week: string, sport: 'strength' | 'running') => (selectBeta0Week(s, week)?.sessions ?? []).filter((v) => v.sport === sport && v.status === 'planned' && v.date);
const workItems = (s: AppState, id: string): SessionItem[] => (selectProgrammeSession(s, id)?.session.blocks ?? [])
  .filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => (b.role === 'primary' ? b.items : []))
  .filter((i) => i.prescription.type === 'sets');

/** Toutes les séries de travail du premier exercice principal saisies à `kg` (montées en charge saisies aussi, à 20 kg). */
function doStrength(s0: AppState, id: string, date: string, kg: number, reps: number): { s: AppState; item: SessionItem; work: number } {
  let s = startProgrammeSession(s0, clock(date, '18:00:00'), id);
  const item = workItems(s, id)[0];
  if (!item || item.prescription.type !== 'sets') throw new Error('aucun exercice principal');
  let work = 0;
  item.prescription.sets.forEach((p, i) => {
    const ramp = p.kind === 'rampup';
    if (!ramp) work += 1;
    s = recordProgrammeSet(s, clock(date, '18:01:00'), id, { itemId: item.id, setIndex: i, done: true, reps, loadKg: ramp ? 20 : kg });
  });
  s = finishProgrammeSession(s, clock(date, '19:00:00'), { requestId: id, completion: 'modified', pain: false });
  return { s, item, work };
}

describe('progressView — états vides', () => {
  it('aucun état ⇒ vide partout, aucune valeur inventée', () => {
    const v = progressView(emptyState());
    expect(v).toEqual({
      empty: true, strength: { exercises: [], weeks: [] }, running: { sessions: [], weeks: [] },
      hyrox: { sessionsDone: 0, totalDurationS: null, sessions: [] }, crosstraining: { sessionsDone: 0, totalDurationS: null, sessions: [] },
    });
  });

  it('programme créé sans séance réalisée ⇒ vide ; la course d’onboarding sans date n’est jamais une séance', () => {
    const v = progressView(create('hybrid'), { today: W1 });
    expect(v.empty).toBe(true);
    expect(v.running.sessions).toEqual([]);
    expect(v.strength.exercises).toEqual([]);
  });
});

describe('progressView — musculation', () => {
  it('séries de travail réelles par exercice, charge max, volume, tendance ; montées en charge exclues ; totaux par semaine ISO', () => {
    let s = create('strength');
    const a = sessionsOf(s, W1, 'strength')[0];
    if (!a?.date) throw new Error('aucune séance');
    const r1 = doStrength(s, a.requestId, a.date, 60, 5);
    s = ensureBeta0Week(r1.s, clock(W2));
    const b = sessionsOf(s, W2, 'strength').find((x) => workItems(s, x.requestId)[0]?.exerciseId === r1.item.exerciseId);
    if (!b?.date) throw new Error('exercice principal absent en semaine 2');
    const r2 = doStrength(s, b.requestId, b.date, 62.5, 5);
    const v = progressView(r2.s, { today: W2 });
    const ex = v.strength.exercises[0];
    expect(ex).toMatchObject({ exerciseId: r1.item.exerciseId, main: true });
    expect(ex?.sessions).toEqual([
      { requestId: a.requestId, date: a.date, topLoadKg: 60, bestReps: 5, setsDone: r1.work, volumeKg: r1.work * 5 * 60 },
      { requestId: b.requestId, date: b.date, topLoadKg: 62.5, bestReps: 5, setsDone: r2.work, volumeKg: r2.work * 5 * 62.5 },
    ]);
    expect(ex?.trend).toEqual({ sessions: 2, firstTopLoadKg: 60, lastTopLoadKg: 62.5, deltaKg: 2.5 });
    expect(v.strength.weeks).toEqual([
      { weekStart: W1, isoWeek: 41, setsDone: r1.work, volumeKg: r1.work * 5 * 60 },
      { weekStart: W2, isoWeek: 42, setsDone: r2.work, volumeKg: r2.work * 5 * 62.5 },
    ]);
    expect(v.empty).toBe(false);
  });

  it('séance terminée sans aucune série saisie ⇒ aucun point (rien de supposé fait)', () => {
    let s = create('strength');
    const a = sessionsOf(s, W1, 'strength')[0];
    if (!a?.date) throw new Error('aucune séance');
    s = startProgrammeSession(s, clock(a.date, '18:00:00'), a.requestId);
    s = finishProgrammeSession(s, clock(a.date, '19:00:00'), { requestId: a.requestId, completion: 'abandoned', pain: false });
    expect(progressView(s).strength).toEqual({ exercises: [], weeks: [] });
  });
});

describe('progressView — course', () => {
  it('allure seulement si distance connue ET séance complète ; régularité prévue / faite par semaine', () => {
    let s = create('hybrid');
    const [r1, r2] = sessionsOf(s, W1, 'running');
    if (!r1?.date || !r2?.date) throw new Error('deux courses attendues');
    s = finishProgrammeSession(s, clock(r1.date, '19:00:00'), { requestId: r1.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800, distanceM: 6000 } });
    // Séance adaptée (PARTIAL) avec distance : distance affichée, allure NON fiable.
    s = finishProgrammeSession(s, clock(r2.date, '19:00:00'), { requestId: r2.requestId, completion: 'modified', pain: false, run: { realizedDurationS: 1200, distanceM: 3000 } });
    // Course libre complète sans distance : aucune allure.
    s = logFreeRun(s, { realizedDurationS: 2400, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, startedAt: `${W1}T06:00:00Z` }, clock(W1, '08:00:00'));
    const v = progressView(s, { today: W1 });
    const by = (id: string) => v.running.sessions.find((x) => x.sessionId === id);
    expect(by(r1.requestId)).toEqual({ sessionId: r1.requestId, date: r1.date, source: 'programme', durationS: 1800, distanceM: 6000, paceSPerKm: 300, complete: true });
    expect(by(r2.requestId)).toEqual({ sessionId: r2.requestId, date: r2.date, source: 'programme', durationS: 1200, distanceM: 3000, complete: false });
    const free = v.running.sessions.find((x) => x.source === 'free');
    expect(free).toMatchObject({ date: W1, durationS: 2400, complete: true });
    expect(free?.paceSPerKm).toBeUndefined();
    expect(v.running.sessions.map((x) => x.date)).toEqual([...v.running.sessions.map((x) => x.date)].sort());
    expect(v.running.weeks).toEqual([{ weekStart: W1, isoWeek: 41, planned: 2, done: 3 }]);
  });

  it('semaines futures exclues avec `today` ; semaine sans planification connue ⇒ prévu null', () => {
    let s = create('hybrid');
    s = logFreeRun(s, { realizedDurationS: 1500, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, distanceM: 4000, startedAt: '2026-09-28T07:00:00Z' }, clock(W1, '08:00:00'));
    const v = progressView(s, { today: W1 });
    expect(v.running.weeks).toEqual([{ weekStart: '2026-09-28', isoWeek: 40, planned: null, done: 1 }, { weekStart: W1, isoWeek: 41, planned: 2, done: 0 }]);
    expect(v.running.sessions[0]?.paceSPerKm).toBe(375);
    expect(progressView(s, { today: '2026-09-30' }).running.weeks.map((w) => w.weekStart)).toEqual(['2026-09-28']);
  });
});

describe('progressView — HYROX / Cross-training (faits seulement)', () => {
  it('réalisations hors programme : nombre et dates, aucune durée supposée', () => {
    const s: AppState = { ...emptyState(), crosstraining: { realized: [{ sessionId: 'ct-1', completedAt: '2026-10-06T18:00:00Z', completion: 'completed_as_prescribed' }] }, hyrox: { realized: [] } };
    const v = progressView(s);
    expect(v.crosstraining).toEqual({ sessionsDone: 1, totalDurationS: null, sessions: [{ id: 'ct-1', date: '2026-10-06' }] });
    expect(v.hyrox.sessionsDone).toBe(0);
    expect(v.empty).toBe(false);
  });
});

describe('isoWeekNumber', () => {
  it('semaines ISO aux bornes d’année', () => {
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2027-01-01')).toBe(53);
    expect(isoWeekNumber('2024-12-30')).toBe(1);
  });
});
