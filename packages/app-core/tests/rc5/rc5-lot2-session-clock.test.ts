/**
 * Reprise RC5 — lot 2 : chronomètre GLOBAL de séance unique (RC5.4), horodaté dans le journal de séance.
 * - temps actif = maintenant − lancement effectif − pauses VOLONTAIRES (aucun compteur, aucune perte en arrière-plan) ;
 * - règle impérative : valider une série pendant une pause volontaire ne relance JAMAIS le chronomètre ;
 * - chrono de repos indépendant ; fin de séance pendant une pause ; durées figées (relecture, export / import) ;
 * - séances historiques (sans `clock` ni `timing`) inchangées. Saisies : TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import {
  betaJournalText, controlRest, createBeta0Programme, CURRENT_SCHEMA_VERSION, decodeState, emptyState, EQUIPMENT_PRESETS, exportState, finishProgrammeSession,
  hasGlobalSessionClock, pauseProgrammeSession, recordProgrammeSet, resumeProgrammeSession, selectBeta0Week, selectFieldHistory, selectProgrammeSession,
  sessionElapsedS, sessionTotalS, startProgrammeSession,
} from '../../src/index.js';
import type { AppState, ProgrammeLog } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';

const W1 = '2026-10-05';
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
const create = (): AppState => createBeta0Programme(emptyState(), profile({
  priorities: ['strength'], strength: { enabled: true, goal: 'strength', sessionsPerWeek: 2 },
  running: { enabled: false, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
  equipment: { presetId: 'preset.full_gym', items: [...fullGym] }, availability: [60, 45, 60, 0, 60, 90, 75],
}), clock(W1), {});
/** Export puis import (même chemin que la sauvegarde Réglages et le rechargement de la PWA). */
const reload = (s: AppState): AppState => { const d = decodeState(exportState(s)); if (!d.ok) throw new Error(d.problem); return d.state; };
const started = () => {
  const s0 = create();
  const x = selectBeta0Week(s0, W1)?.sessions.find((v) => v.sport === 'strength' && v.status === 'planned');
  if (!x?.date) throw new Error('aucune séance');
  const s = startProgrammeSession(s0, clock(x.date, '10:00:00'), x.requestId);
  return { s, id: x.requestId, at: (t: string) => clock(x.date ?? '', `${t}:00`) };
};
const logOf = (s: AppState, id: string): ProgrammeLog => { const l = s.programmeLogs[id]; if (!l) throw new Error('log absent'); return l; };
const workSets = (s: AppState, id: string) => {
  const it = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets' && i.prescription.sets.filter((p) => p.kind !== 'rampup').length >= 2);
  if (!it || it.prescription.type !== 'sets') throw new Error('aucun exercice');
  return it.prescription.sets.flatMap((p, setIndex) => (p.kind === 'rampup' ? [] : [{ itemId: it.id, setIndex }]));
};
const MIN = 60;

describe('RC5 lot 2 — chronomètre global horodaté', () => {
  it('démarre au lancement effectif ; aucun champ écrit tant qu’il n’y a pas de pause ; arrière-plan / verrouillage sans perte', () => {
    const { s, id, at } = started();
    expect(logOf(s, id).clock).toBeUndefined();
    expect(sessionElapsedS(logOf(s, id), at('10:00').now)).toBe(0);
    // Écran verrouillé ou application en arrière-plan 25 min, puis relecture : calcul sur horodatages.
    expect(sessionElapsedS(logOf(reload(s), id), at('10:25').now)).toBe(25 * MIN);
    expect(sessionTotalS(logOf(s, id), at('10:25').now)).toBe(25 * MIN);
  });

  it('pause puis reprise : aucune période comptée deux fois, pause et reprise répétées sans effet', () => {
    const { s: s0, id, at } = started();
    const p = pauseProgrammeSession(s0, at('10:10'), id);
    expect(pauseProgrammeSession(p, at('10:12'), id)).toBe(p);
    expect(sessionElapsedS(logOf(p, id), at('10:30').now)).toBe(10 * MIN);
    const r = resumeProgrammeSession(reload(p), at('10:30'), id);
    expect(logOf(r, id).clock).toEqual({ pausedS: 20 * MIN });
    expect(resumeProgrammeSession(r, at('10:31'), id)).toBe(r);
    expect(sessionElapsedS(logOf(r, id), at('10:40').now)).toBe(20 * MIN);
    // Deuxième pause : cumul exact.
    const r2 = resumeProgrammeSession(pauseProgrammeSession(r, at('10:40'), id), at('10:45'), id);
    expect(logOf(r2, id).clock).toEqual({ pausedS: 25 * MIN });
    expect(sessionElapsedS(logOf(r2, id), at('11:00').now)).toBe(35 * MIN);
    expect(sessionTotalS(logOf(r2, id), at('11:00').now)).toBe(60 * MIN);
  });

  it('RÈGLE IMPÉRATIVE : une série validée pendant une pause volontaire ne relance pas le chronomètre', () => {
    const { s: s0, id, at } = started();
    const [a, b] = workSets(s0, id);
    if (!a || !b) throw new Error('deux séries attendues');
    const p = pauseProgrammeSession(s0, at('10:05'), id);
    const s1 = recordProgrammeSet(p, at('10:15'), id, { ...a, done: true, reps: 5, loadKg: 60 });
    const s2 = recordProgrammeSet(s1, at('10:18'), id, { ...b, done: true, reps: 5, loadKg: 60 });
    expect(logOf(s2, id).clock).toEqual({ pausedS: 0, pausedAt: logOf(p, id).clock?.pausedAt });
    expect(sessionElapsedS(logOf(s2, id), at('10:30').now)).toBe(5 * MIN);
    // Les séries sont bien enregistrées, et le repos prescrit démarre (chrono de repos indépendant).
    expect(logOf(s2, id).sets.filter((x) => x.done)).toHaveLength(2);
    // Décocher / modifier une série pendant la pause : pause toujours conservée.
    const s3 = recordProgrammeSet(s2, at('10:20'), id, { ...b, done: false });
    expect(logOf(s3, id).clock?.pausedAt).toBe(logOf(p, id).clock?.pausedAt);
  });

  it('chrono de repos et chrono global simultanés et indépendants', () => {
    const { s: s0, id, at } = started();
    const [a] = workSets(s0, id);
    if (!a) throw new Error('série attendue');
    const s1 = recordProgrammeSet(s0, at('10:05'), id, { ...a, done: true, reps: 5, loadKg: 60 });
    const rest = logOf(s1, id).rest;
    expect(rest).not.toBeNull();
    // Pause globale : le repos n'est pas touché.
    const p = pauseProgrammeSession(s1, at('10:05'), id);
    expect(logOf(p, id).rest).toEqual(rest);
    // Commandes du repos (prolonger, pause, passer) : chrono global inchangé.
    const ext = controlRest(s1, at('10:06'), id, 'extend');
    expect(logOf(ext, id).clock).toBeUndefined();
    expect(sessionElapsedS(logOf(ext, id), at('10:06').now)).toBe(6 * MIN);
    const sk = controlRest(p, at('10:06'), id, 'skip');
    expect(logOf(sk, id).clock).toEqual(logOf(p, id).clock);
    expect(logOf(sk, id).rest).toBeNull();
  });

  it('fin de séance PENDANT une pause : pause close à la fin, durées figées (actif, pauses, total, prévue)', () => {
    const { s: s0, id, at } = started();
    const p = pauseProgrammeSession(s0, at('10:20'), id);
    const f = finishProgrammeSession(p, at('10:50'), { requestId: id, completion: 'modified', pain: false });
    const l = logOf(f, id);
    expect(l.clock).toEqual({ pausedS: 30 * MIN });
    expect(l.timing).toEqual({ activeS: 20 * MIN, pausedS: 30 * MIN, plannedS: selectProgrammeSession(s0, id)?.estimatedDurationS ?? null });
    expect(l.timing?.plannedS).toBeGreaterThan(0);
    // Figée : identique plus tard, après relecture et après export / import.
    expect(sessionElapsedS(l, at('23:00').now)).toBe(20 * MIN);
    expect(sessionTotalS(l, at('23:00').now)).toBe(50 * MIN);
    expect(logOf(reload(reload(f)), id)).toEqual(l);
    expect(() => pauseProgrammeSession(f, at('11:00'), id)).toThrow('SESSION_FINISHED');
    expect(() => resumeProgrammeSession(f, at('11:00'), id)).toThrow('SESSION_FINISHED');
  });

  it('durée enregistrée = temps actif (historique, journal) ; pauses et durée prévue exposées', () => {
    const { s: s0, id, at } = started();
    const r = resumeProgrammeSession(pauseProgrammeSession(s0, at('10:30'), id), at('10:40'), id);
    const f = finishProgrammeSession(r, at('11:00'), { requestId: id, completion: 'modified', pain: false });
    const h = selectFieldHistory(f).find((e) => e.requestId === id);
    expect([h?.durationS, h?.pausedS, h?.plannedDurationS]).toEqual([50 * MIN, 10 * MIN, logOf(f, id).timing?.plannedS]);
    expect(betaJournalText(f, { build: 'test', builtAt: null, exportedAt: at('12:00').now })).toContain('durée réelle 50 min 00 s (pauses 10 min 00 s)');
  });

  it('séances historiques (sans `clock` ni `timing`) : relues à l’identique, durée = fin − début, jamais recalculée', () => {
    const { s: s0, id, at } = started();
    const f = finishProgrammeSession(s0, at('10:40'), { requestId: id, completion: 'modified', pain: false });
    const { timing: _t, clock: _c, ...legacy } = logOf(f, id);
    const old: AppState = { ...f, programmeLogs: { ...f.programmeLogs, [id]: legacy } };
    expect(logOf(reload(old), id)).toEqual(legacy);
    expect(sessionElapsedS(legacy, at('23:00').now)).toBe(40 * MIN);
    const h = selectFieldHistory(old).find((e) => e.requestId === id);
    expect([h?.durationS, h?.pausedS, h?.plannedDurationS]).toEqual([40 * MIN, null, null]);
  });

  it('séance commencée sous une version antérieure (donnée v4, sans `clock`) : relue en v5, chrono depuis le lancement', () => {
    const { s, id, at } = started();
    const v4 = JSON.stringify({ ...JSON.parse(exportState(s)) as object, schemaVersion: 4 });
    const d = decodeState(v4);
    expect(d.ok && d.state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    if (d.ok) expect(sessionElapsedS(logOf(d.state, id), at('10:12').now)).toBe(12 * MIN);
  });

  it('horloge de l’appareil reculée : jamais de temps négatif ni de pause négative', () => {
    const { s: s0, id, at } = started();
    expect(sessionElapsedS(logOf(s0, id), at('09:50').now)).toBe(0);
    const p = pauseProgrammeSession(s0, at('10:10'), id);
    expect(logOf(resumeProgrammeSession(p, at('10:05'), id), id).clock).toEqual({ pausedS: 0 });
  });

  it('un seul chronomètre par sport : Course, Cross-training et HYROX gardent leur propre chrono (aucune pause globale ajoutée)', () => {
    const { s, id } = started();
    const l = logOf(s, id);
    expect(hasGlobalSessionClock(l)).toBe(true);
    for (const sport of ['running', 'crosstraining', 'hyrox'] as const) expect(hasGlobalSessionClock({ ...l, sport })).toBe(false);
    const running: AppState = { ...s, programmeLogs: { ...s.programmeLogs, [id]: { ...l, sport: 'running' } } };
    expect(pauseProgrammeSession(running, clock(W1, '10:10:00'), id)).toBe(running);
  });
});

describe('RC5 lot 2 — précision', () => {
  it('instants avec millisecondes : durée figée à la fin = temps affiché pendant la pause (aucun écart d’une seconde)', () => {
    const { s: s0, id } = started();
    const date = logOf(s0, id).startedAt.slice(0, 10);
    const ms = (t: string) => ({ today: date, now: `${date}T${t}Z` });
    const p = pauseProgrammeSession(s0, ms('10:14:00.900'), id);
    const shown = sessionElapsedS(logOf(p, id), ms('10:20:00.100').now);
    const f = finishProgrammeSession(p, ms('10:20:00.100'), { requestId: id, completion: 'modified', pain: false });
    expect(logOf(f, id).timing?.activeS).toBe(shown);
    expect(Number.isInteger(logOf(f, id).clock?.pausedS)).toBe(true);
  });
});
