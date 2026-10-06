/**
 * Façade Beta 0 de l'interface : onboarding → programme → semaine → séance en cours PERSISTÉE (séries réelles, chrono
 * horodaté) → fin de séance par recordSessionExecution → historique ; ouverture des semaines suivantes ; recréation
 * explicite du programme. Saisies : TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import {
  controlRest, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, EQUIPMENT_PRESETS, exportState, finishProgrammeSession, isBeta0, recordProgrammeSet,
  recreateBeta0Programme, restRemainingS, selectBeta0Week, selectHistory, selectProgrammeSession, startProgrammeSession, toggleProgrammePainItem,
} from '../src/index.js';
import type { AppState, ProfileInput } from '../src/index.js';
import { addDays } from '../src/dates.js';
import { clock, profile } from './fixtures.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
// technical-constant: TEST_ONLY — minutes disponibles par jour, dernière course déclarée (s, m)
const AVAIL = [60, 45, 60, 0, 60, 90, 75];
const LAST_RUN = { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' as const };

const input = (sports: 'strength' | 'running' | 'hybrid'): ProfileInput => profile({
  priorities: sports === 'running' ? ['running'] : sports === 'strength' ? ['strength'] : ['strength', 'running'],
  strength: { enabled: sports !== 'running', goal: 'strength', sessionsPerWeek: 2 },
  running: { enabled: sports !== 'strength', population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
  equipment: { presetId: 'preset.full_gym', items: [...fullGym] }, availability: AVAIL,
});
const create = (sports: 'strength' | 'running' | 'hybrid' = 'hybrid'): AppState => createBeta0Programme(emptyState(), input(sports), clock(W1), { lastRun: LAST_RUN });
const reload = (s: AppState): AppState => { const d = decodeState(exportState(s)); if (!d.ok) throw new Error(d.problem); return d.state; };
const first = (s: AppState, sport: 'strength' | 'running') => {
  const x = selectBeta0Week(s, W1)?.sessions.find((v) => v.sport === sport && v.status === 'planned');
  if (!x?.date) throw new Error(`aucune séance ${sport}`);
  return { id: x.requestId, date: x.date };
};
const at = (date: string, time: string) => clock(date, time);
const restOf = (s: AppState, id: string) => { const r = s.programmeLogs[id]?.rest; if (!r) throw new Error('chrono absent'); return r; };

describe('création du programme Beta 0', () => {
  it('hybride : profil, dernière course, programme et semaine planifiée par le chemin Beta 0 (aucune séance V0)', () => {
    const s = create();
    expect(isBeta0(s)).toBe(true);
    expect(Object.keys(s.plans)).toEqual([]);
    expect(Object.keys(s.sessions)).toEqual([]);
    expect(s.running.realized).toHaveLength(1);
    const v = selectBeta0Week(s, W1);
    expect(v?.authority).toBe('beta0_experimental');
    expect(v?.sessions.map((x) => x.status)).toEqual(['planned', 'planned', 'planned', 'planned']);
  });

  it('programme créé en milieu de semaine : aucune séance placée sur un jour déjà passé', () => {
    const s = createBeta0Programme(emptyState(), input('strength'), clock('2026-10-07'), {});
    const dates = selectBeta0Week(s, '2026-10-07')?.sessions.flatMap((x) => (x.date ? [x.date] : [])) ?? [];
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every((d) => d >= '2026-10-07')).toBe(true);
  });

  it('HYROX (H2.5) sans déclarations ⇒ refus explicite (aucune valeur supposée) ; aucun sport ⇒ refus', () => {
    expect(() => createBeta0Programme(emptyState(), { ...input('strength'), hyrox: { enabled: true } }, clock(W1), {})).toThrow('HR_DECLARATION_MISSING');
    expect(() => createBeta0Programme(emptyState(), { ...input('strength'), strength: { enabled: false, goal: 'strength', sessionsPerWeek: 2 } }, clock(W1), {})).toThrow('NO_SPORT_SELECTED');
  });
});

describe('durée du programme : objectif daté ou programme continu, horizon glissant', () => {
  it('objectif daté : le programme va jusqu’à la semaine de la date d’objectif (calendrier), sans durée par défaut', () => {
    const p = { ...input('running'), running: { ...input('running').running, goal: 'HALF_MARATHON' as const } };
    // TEST_ONLY : course le samedi 2027-04-17 ⇒ semaine du lundi 2027-04-12, 28 semaines depuis le 2026-10-05.
    const s = createBeta0Programme(emptyState(), p, clock(W1), { runningTargetDate: '2027-04-17', lastRun: LAST_RUN });
    expect(s.programmeState?.definition.horizonWeeks).toBe(28);
    expect(s.programmeState?.definition.goals).toEqual([expect.objectContaining({ sport: 'running', targetDate: '2027-04-17' })]);
    expect(selectBeta0Week(s, W1)?.programme).toMatchObject({ horizonWeeks: 28, targetDate: '2027-04-17' });
    // Horizon glissant : seule la semaine courante est construite.
    expect(s.programmeState?.weeks.map((w) => w.weekIndex)).toEqual([0]);
  });

  it('sans objectif daté : programme continu, sans fin ; à la semaine 30, seule cette semaine est construite', () => {
    const s0 = create('strength');
    expect(s0.programmeState?.definition.horizonWeeks).toBeUndefined();
    expect(selectBeta0Week(s0, W1)?.programme).toMatchObject({ horizonWeeks: null, targetDate: null });
    // technical-constant: TEST_ONLY — 30 semaines après le début
    const later = addDays(W1, 30 * 7);
    const s = ensureBeta0Week(s0, clock(later));
    expect(s.programmeState?.weeks.map((w) => [w.weekIndex, w.closedAt !== undefined])).toEqual([[0, true], [30, false]]);
    expect(selectBeta0Week(s, later)?.sessions.length).toBe(2);
  });
});

describe('jours canoniques de la semaine (selectBeta0Week.days)', () => {
  // TEST_ONLY : mardi disponible 30 min ⇒ la 2e course y est essayée puis refusée (créneau trop court).
  const weekWithRefusedTuesday = () => createBeta0Programme(emptyState(), { ...input('hybrid'), availability: [60, 30, 60, 0, 0, 90, 0] }, clock(W1), { lastRun: LAST_RUN });
  const TUE = addDays(W1, 1);
  const marked = (s: AppState, today: string, i?: number) => (selectBeta0Week(s, today, i)?.days ?? []).filter((d) => d.sessions.length > 0).map((d) => d.date);

  it('seuls les jours portant une séance RÉELLEMENT placée ; une demande refusée n’occupe aucun jour (jour essayé = information)', () => {
    const s = weekWithRefusedTuesday();
    const v = selectBeta0Week(s, W1);
    expect(v?.days.map((d) => d.date)).toEqual(Array.from({ length: 7 }, (_, k) => addDays(W1, k)));
    expect(marked(s, W1)).toEqual([W1, addDays(W1, 2), addDays(W1, 5)]);
    expect(v?.days.find((d) => d.date === TUE)?.sessions).toEqual([]);
    const refused = v?.sessions.find((x) => x.status === 'not_planned');
    expect(refused).toMatchObject({ sport: 'running', date: null, notPlanned: { category: 'slot_unavailable', triedDate: TUE } });
  });

  it('états réalisée, adaptée, manquée : la séance reste sur son jour avec son état', () => {
    let s = weekWithRefusedTuesday();
    const v = selectBeta0Week(s, W1);
    const on = (date: string) => v?.days.find((d) => d.date === date)?.sessions[0]?.requestId ?? '';
    s = finishProgrammeSession(s, at(W1, '19:00:00'), { requestId: on(W1), completion: 'modified', pain: false });
    s = finishProgrammeSession(s, at(addDays(W1, 5), '19:00:00'), { requestId: on(addDays(W1, 5)), completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800 } });
    s = ensureBeta0Week(s, clock(W2));
    const past = selectBeta0Week(s, W2, 0);
    expect(past?.days.filter((d) => d.sessions.length > 0).map((d) => [d.date, d.sessions[0]?.status])).toEqual([
      [W1, 'modified'], [addDays(W1, 2), 'missed'], [addDays(W1, 5), 'completed_as_prescribed'],
    ]);
  });
});

describe('séance Strength en cours', () => {
  it('séries réelles saisies, chrono démarré sur le repos prescrit ; reprise après rechargement ; aucune série supposée faite', () => {
    let s = create();
    const { id, date } = first(s, 'strength');
    s = startProgrammeSession(s, at(date, '18:00:00'), id);
    const v = selectProgrammeSession(s, id);
    const item = v?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets' && i.prescription.sets.some((x) => x.restAfterS > 0));
    if (!item || item.prescription.type !== 'sets') throw new Error('aucun exercice à séries');
    const idx = item.prescription.sets.findIndex((x) => x.restAfterS > 0);
    const rest = item.prescription.sets[idx]?.restAfterS ?? 0;
    expect(() => recordProgrammeSet(s, at(date, '18:01:00'), id, { itemId: item.id, setIndex: idx, done: true })).toThrow('SET_REPS_REQUIRED');
    s = recordProgrammeSet(s, at(date, '18:01:00'), id, { itemId: item.id, setIndex: idx, done: true, reps: 7, loadKg: 42.5 });
    const log = reload(s).programmeLogs[id];
    expect(log?.sets).toEqual([{ itemId: item.id, setIndex: idx, done: true, reps: 7, loadKg: 42.5 }]);
    expect(log?.rest?.totalS).toBe(rest);
    expect(restRemainingS(restOf(s, id), `${date}T18:01:00Z`)).toBe(rest);
    // Pause : reste figé ; +15 s ; reprise : nouvelle échéance ; passer.
    s = controlRest(s, at(date, '18:01:10'), id, 'pause');
    expect(s.programmeLogs[id]?.rest?.pausedRemainingS).toBe(rest - 10);
    s = controlRest(s, at(date, '18:05:00'), id, 'extend');
    expect(restRemainingS(restOf(s, id), `${date}T18:09:00Z`)).toBe(rest - 10 + 15);
    s = controlRest(s, at(date, '18:05:00'), id, 'resume');
    expect(restRemainingS(restOf(s, id), `${date}T18:05:00Z`)).toBe(rest + 5);
    s = controlRest(s, at(date, '18:05:00'), id, 'skip');
    expect(s.programmeLogs[id]?.rest).toBeNull();
    expect(s.programmeState?.results).toEqual([]);
  });

  it('« comme prévu » sans toutes les séries ⇒ refus explicite ; « adaptée » ⇒ enregistrée, terminée, historique avec les séries réelles', () => {
    let s = create();
    const { id, date } = first(s, 'strength');
    s = startProgrammeSession(s, at(date, '18:00:00'), id);
    const item = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
    if (!item) throw new Error('aucun exercice');
    s = recordProgrammeSet(s, at(date, '18:01:00'), id, { itemId: item.id, setIndex: 0, done: true, reps: 5, loadKg: 60 });
    expect(() => finishProgrammeSession(s, at(date, '19:00:00'), { requestId: id, completion: 'completed_as_prescribed', pain: false })).toThrow('EXECUTION_STRENGTH_INCOMPLETE');
    s = finishProgrammeSession(s, at(date, '19:00:00'), { requestId: id, completion: 'modified', pain: false });
    expect(s.programmeLogs[id]?.finishedAt).toBeDefined();
    expect(selectBeta0Week(s, W1)?.sessions.find((x) => x.requestId === id)?.status).toBe('modified');
    expect(selectHistory(s)).toEqual([expect.objectContaining({ requestId: id, sport: 'strength', completion: 'modified', sets: [{ itemId: item.id, setIndex: 0, done: true, reps: 5, loadKg: 60 }] })]);
    expect(() => recordProgrammeSet(s, at(date, '19:01:00'), id, { itemId: item.id, setIndex: 1, done: true, reps: 5 })).toThrow('SESSION_FINISHED');
  });

  it('douleur sur un exercice ⇒ pause de planification ; aucune nouvelle semaine planifiée tant qu’elle est active', () => {
    let s = create();
    const { id, date } = first(s, 'strength');
    s = startProgrammeSession(s, at(date, '18:00:00'), id);
    const item = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
    s = toggleProgrammePainItem(s, id, item?.id ?? '');
    s = finishProgrammeSession(s, at(date, '19:00:00'), { requestId: id, completion: 'abandoned', pain: false });
    expect(s.safety.activePain).not.toBeNull();
    expect(selectHistory(s)[0]?.pain).toBe(true);
    const next = ensureBeta0Week(s, clock(W2));
    expect(next.programmeState?.weeks.map((w) => [w.weekIndex, w.closedAt !== undefined])).toEqual([[0, true]]);
  });
});

describe('séance Running', () => {
  it('durée exigée ; course enregistrée (historique moteur) ; douleur signalée sans niveau ⇒ pause', () => {
    let s = create();
    const { id, date } = first(s, 'running');
    expect(() => finishProgrammeSession(s, at(date, '19:00:00'), { requestId: id, completion: 'completed_as_prescribed', pain: false })).toThrow('EXECUTION_RUN_DETAILS_REQUIRED');
    s = finishProgrammeSession(s, at(date, '19:00:00'), { requestId: id, completion: 'completed_as_prescribed', pain: true, run: { realizedDurationS: 1900, distanceM: 5200 } });
    expect(s.running.realized.map((r) => r.sessionId)).toContain(id);
    expect(s.safety.activePain).not.toBeNull();
    expect(selectHistory(s)[0]).toMatchObject({ sport: 'running', completion: 'completed_as_prescribed', pain: true, run: { realizedDurationS: 1900, distanceM: 5200 } });
  });
});

describe('semaines suivantes et recréation', () => {
  it('lundi suivant : semaine passée clôturée (non saisies ⇒ manquées), séance en cours abandonnée, semaine courante planifiée', () => {
    let s = create();
    const { id, date } = first(s, 'strength');
    s = startProgrammeSession(s, at(date, '18:00:00'), id);
    s = ensureBeta0Week(reload(s), clock(W2));
    expect(s.programmeState?.weeks.map((w) => [w.weekIndex, w.closedAt !== undefined])).toEqual([[0, true], [1, false]]);
    expect(s.programmeLogs[id]).toBeUndefined();
    expect(selectHistory(s).every((h) => h.completion === 'missed')).toBe(true);
    expect(selectBeta0Week(s, W2)?.sessions.length).toBe(4);
    // Idempotent.
    expect(ensureBeta0Week(s, clock(W2))).toEqual(s);
  });

  it('recréation explicite : semaine commencée REPRISE telle quelle, nouvelles intentions dès lundi prochain ; historique conservé', () => {
    let s = create();
    const { id, date } = first(s, 'running');
    s = finishProgrammeSession(s, at(date, '19:00:00'), { requestId: id, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800 } });
    const r = recreateBeta0Programme(s, { ...input('strength') }, at(date, '20:00:00'), {});
    expect(r.programmeState?.definition.startWeek).toBe(W1);
    expect(r.planner.weeks[W1]).toEqual(s.planner.weeks[W1]);
    expect(r.programmeState?.results.map((x) => x.requestId)).toEqual([id]);
    expect(selectHistory(r).map((h) => h.requestId)).toContain(id);
    expect(selectBeta0Week(ensureBeta0Week(r, clock(W2, '09:00:00')), W2)?.sessions.every((x) => x.sport === 'strength')).toBe(true);
    // Semaine sans réalisation ⇒ recréé dès cette semaine.
    const fresh = recreateBeta0Programme(create(), input('running'), clock(W1, '09:00:00'), {});
    expect(fresh.programmeState?.definition.startWeek).toBe(W1);
    expect(selectBeta0Week(fresh, W1)?.sessions.every((x) => x.sport === 'running')).toBe(true);
  });
});
