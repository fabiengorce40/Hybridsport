/**
 * RC5.4 lot B — chronomètre GLOBAL de séance, horodaté : temps écoulé depuis le lancement effectif, pause manuelle de
 * séance distincte du repos, reprise sans double comptage, persistance (export / relecture), figé à la fin ; anciennes
 * séances (sans champ RC5.4) relues telles quelles. Saisies : TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import {
  controlRest, createBeta0Programme, decodeState, emptyState, EQUIPMENT_PRESETS, exportState, finishProgrammeSession, pauseProgrammeSession, recordProgrammeSet,
  resumeProgrammeSession, selectBeta0Week, selectProgrammeSession, sessionElapsedS, startProgrammeSession,
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
const reload = (s: AppState): AppState => { const d = decodeState(exportState(s)); if (!d.ok) throw new Error(d.problem); return d.state; };
const started = () => {
  const s0 = create();
  const x = selectBeta0Week(s0, W1)?.sessions.find((v) => v.sport === 'strength' && v.status === 'planned');
  if (!x?.date) throw new Error('aucune séance');
  const s = startProgrammeSession(s0, clock(x.date, '10:00:00'), x.requestId);
  return { s, id: x.requestId, date: x.date, at: (t: string) => clock(x.date ?? '', `${t}:00`) };
};
const logOf = (s: AppState, id: string): ProgrammeLog => { const l = s.programmeLogs[id]; if (!l) throw new Error('log absent'); return l; };
const workSet = (s: AppState, id: string) => {
  const it = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets' && i.prescription.sets.some((p) => p.kind !== 'rampup'));
  if (!it || it.prescription.type !== 'sets') throw new Error('aucun exercice');
  return { itemId: it.id, setIndex: it.prescription.sets.findIndex((p) => p.kind !== 'rampup') };
};

describe('RC5.4 B — chronomètre global horodaté', () => {
  it('temps écoulé = maintenant − lancement ; aucun compteur persisté ; survit à la relecture (redémarrage)', () => {
    const { s, id, at } = started();
    expect(logOf(s, id).clock).toBeUndefined();
    expect(sessionElapsedS(logOf(s, id), at('10:00').now)).toBe(0);
    // Arrière-plan / verrouillage 25 min : aucun temps perdu (calcul sur horodatages).
    expect(sessionElapsedS(logOf(reload(s), id), at('10:25').now)).toBe(25 * 60);
  });

  it('pause manuelle : temps figé, repos indépendant ; reprise sans double comptage ; pause répétée sans effet', () => {
    const { s: s0, id, at } = started();
    const set = workSet(s0, id);
    const s1 = recordProgrammeSet(s0, at('10:05'), id, { ...set, done: true, reps: 5, loadKg: 60 });
    const rest = logOf(s1, id).rest;
    const p = pauseProgrammeSession(s1, at('10:10'), id);
    expect(logOf(p, id).rest).toEqual(rest);
    expect(pauseProgrammeSession(p, at('10:12'), id)).toBe(p);
    expect(sessionElapsedS(logOf(p, id), at('10:30').now)).toBe(10 * 60);
    // Relecture pendant la pause (PWA redémarrée) : pause conservée.
    const r = resumeProgrammeSession(reload(p), at('10:30'), id);
    expect(logOf(r, id).clock).toEqual({ pausedS: 20 * 60 });
    expect(sessionElapsedS(logOf(r, id), at('10:40').now)).toBe(20 * 60);
    expect(resumeProgrammeSession(r, at('10:41'), id)).toBe(r);
    // Commande de repos sans effet sur le chronomètre global.
    expect(sessionElapsedS(logOf(controlRest(r, at('10:40'), id, 'skip'), id), at('10:40').now)).toBe(20 * 60);
  });

  it('série validée pendant une pause : la séance reprend à cet instant', () => {
    const { s: s0, id, at } = started();
    const p = pauseProgrammeSession(s0, at('10:05'), id);
    const s1 = recordProgrammeSet(p, at('10:15'), id, { ...workSet(p, id), done: true, reps: 5, loadKg: 60 });
    expect(logOf(s1, id).clock).toEqual({ pausedS: 10 * 60 });
  });

  it('fin de séance : durée réelle figée (hors pauses), durée prévue de la séance exécutée ; plus de commande', () => {
    const { s: s0, id, at } = started();
    const p = pauseProgrammeSession(recordProgrammeSet(s0, at('10:05'), id, { ...workSet(s0, id), done: true, reps: 5, loadKg: 60 }), at('10:20'), id);
    const f = finishProgrammeSession(p, at('10:50'), { requestId: id, completion: 'modified', pain: false });
    const l = logOf(f, id);
    expect(l.timing).toEqual({ activeS: 20 * 60, pausedS: 30 * 60, plannedS: selectProgrammeSession(s0, id)?.estimatedDurationS ?? null });
    expect(l.timing?.plannedS).toBeGreaterThan(0);
    expect(sessionElapsedS(l, at('23:00').now)).toBe(20 * 60);
    expect(() => pauseProgrammeSession(f, at('11:00'), id)).toThrow('SESSION_FINISHED');
    expect(logOf(reload(f), id)).toEqual(l);
  });

  it('séance terminée avant RC5.4 (sans `clock` ni `timing`) : relue sans migration, durée = fin − début', () => {
    const { s: s0, id, at } = started();
    const f = finishProgrammeSession(s0, at('10:40'), { requestId: id, completion: 'modified', pain: false });
    const { timing: _t, clock: _c, ...legacy } = logOf(f, id);
    const old: AppState = { ...f, programmeLogs: { ...f.programmeLogs, [id]: legacy } };
    expect(logOf(reload(old), id)).toEqual(legacy);
    expect(sessionElapsedS(legacy, at('23:00').now)).toBe(40 * 60);
  });
});
