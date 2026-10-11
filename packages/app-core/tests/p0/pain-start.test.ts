/**
 * P0 — pause douleur et démarrage des séances DÉJÀ PLANIFIÉES : politique unique avec « Faire maintenant ». Une douleur
 * active interdit tout NOUVEAU démarrage (les quatre sports, planifiée ou non placée) ; une séance déjà commencée est
 * toujours reprise et terminée ; la levée explicite rétablit les démarrages ; l'historique n'est jamais modifié.
 * Aucun seuil : présence de la pause seulement (garde existante `activePainPause`).
 */
import { describe, expect, it } from 'vitest';
import {
  clearPain, controlCtTimer, finishProgrammeSession, recordProgrammeSet, selectProgrammeSession, selectBeta0Week, selectBetaJournal, selectHistory, setHrSteps, startAssessment, startProgrammeSession,
} from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, create, hrProfile, reload } from '../hr/hr-fixtures.js';

const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
const FOUR = hrProfile({ strength: true, running: true, ct: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 0, 0] });
const D = (day: string, h = '18:00') => at(`2026-10-${day}T${h}:00.000Z`);
const s0 = create(FOUR);
const sessions = selectBeta0Week(s0, '2026-10-05')?.sessions ?? [];
const id = (sport: string) => sessions.find((x) => x.sport === sport && x.placement === 'planned')?.requestId ?? '';
const U = sessions.find((x) => x.placement === 'composed_unplaced')?.requestId ?? '';
/** Douleur signalée à la fin de la séance Strength du lundi (chemin réel). */
const pained = finishProgrammeSession(startProgrammeSession(s0, D('05'), id('strength')), D('05', '19:00'), { requestId: id('strength'), completion: 'modified', pain: true });

describe('P0 — pause douleur : démarrage des séances planifiées', () => {
  it('PS-1. pré-condition : la douleur signalée ouvre la pause centrale', () => {
    expect(pained.safety.activePain).not.toBeNull();
  });
  it.each(['running', 'crosstraining', 'hyrox'])('PS-2. %s planifiée : nouveau démarrage refusé (SAFETY_PAUSE_ACTIVE_PAIN), état inchangé', (sport) => {
    const before = JSON.stringify(pained);
    expect(startAssessment(pained, D('06'), id(sport))).toMatchObject({ allowed: false, cause: 'ACTIVE_PAIN' });
    expect(code(() => startProgrammeSession(pained, D('06'), id(sport)))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
    expect(JSON.stringify(pained)).toBe(before);
  });
  it('PS-3. Strength planifiée (seconde séance) : refus identique', () => {
    const second = sessions.filter((x) => x.sport === 'strength' && x.placement === 'planned')[1]?.requestId ?? '';
    expect(code(() => startProgrammeSession(pained, D('08'), second))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });
  it('PS-4. contournement par la fin directe (sans démarrage) : refusé aussi', () => {
    expect(code(() => finishProgrammeSession(pained, D('09'), { requestId: id('running'), completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800 } }))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });
  it('PS-5. même politique pour « Faire maintenant » (non placée) : douleur prioritaire sur l’interférence', () => {
    expect(startAssessment(pained, D('10'), U).cause).toBe('ACTIVE_PAIN');
    expect(code(() => startProgrammeSession(pained, D('10'), U))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });
  it('PS-6. séance COMMENCÉE avant la douleur : reprise et fin admises, saisies conservées (Cross-training)', () => {
    // CT démarré mardi, douleur signalée ensuite par une autre séance (Strength terminée plus tard dans la journée).
    let s = startProgrammeSession(s0, D('07', '07:00'), id('crosstraining'));
    s = controlCtTimer(s, D('07', '07:05'), id('crosstraining'), 'pause');
    s = finishProgrammeSession(startProgrammeSession(s, D('07', '08:00'), id('strength')), D('07', '09:00'), { requestId: id('strength'), completion: 'modified', pain: true });
    expect(s.safety.activePain).not.toBeNull();
    expect(code(() => startProgrammeSession(s, D('07', '10:00'), id('crosstraining')))).toBe('OK');
    expect(startAssessment(s, D('07', '10:00'), id('crosstraining')).allowed).toBe(true);
    const done = finishProgrammeSession(s, D('07', '10:30'), { requestId: id('crosstraining'), completion: 'abandoned', pain: false });
    expect(done.programmeState?.results.find((r) => r.requestId === id('crosstraining'))?.completion).toBe('abandoned');
  });
  it('PS-7. HYROX commencé avant la douleur : progression conservée après rechargement, fin admise', () => {
    let s = startProgrammeSession(s0, D('06', '07:00'), id('hyrox'));
    s = setHrSteps(s, id('hyrox'), 1);
    s = finishProgrammeSession(startProgrammeSession(s, D('06', '08:00'), id('strength')), D('06', '09:00'), { requestId: id('strength'), completion: 'modified', pain: true });
    const r = reload(s, '2026-10-06T10:00:00.000Z');
    expect(r.programmeLogs[id('hyrox')]?.hr?.steps).toBe(1);
    const done = finishProgrammeSession(r, D('06', '10:30'), { requestId: id('hyrox'), completion: 'abandoned', pain: false, hr: { timeCapReached: false } });
    expect(done.programmeState?.results.some((x) => x.requestId === id('hyrox'))).toBe(true);
  });
  it('PS-8. Strength commencée avant la douleur : série saisie et validée pendant la pause, reprise admise', () => {
    const second = sessions.filter((x) => x.sport === 'strength' && x.placement === 'planned')[1]?.requestId ?? '';
    let s = startProgrammeSession(s0, D('08', '07:00'), second);
    s = finishProgrammeSession(startProgrammeSession(s, D('08', '07:10'), id('running')), D('08', '07:40'), { requestId: id('running'), completion: 'completed_as_prescribed', pain: true, run: { realizedDurationS: 1500 } });
    expect(s.safety.activePain).not.toBeNull();
    const item = selectProgrammeSession(s, second)?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
    s = recordProgrammeSet(s, D('08', '08:00'), second, { itemId: item?.id ?? '', setIndex: 0, done: true, reps: 5 });
    expect(s.programmeLogs[second]?.sets).toHaveLength(1);
    expect(code(() => startProgrammeSession(s, D('08', '08:05'), second))).toBe('OK');
  });
  it('PS-9. levée explicite de la douleur ⇒ démarrages rétablis (planifiée)', () => {
    const cleared = clearPain(pained, D('06', '08:00'));
    expect(cleared.safety.activePain).toBeNull();
    expect(code(() => startProgrammeSession(cleared, D('06'), id('hyrox')))).toBe('OK');
  });
  it('PS-10. historique et Journal Beta inchangés par un refus ; réalisation douloureuse conservée', () => {
    code(() => startProgrammeSession(pained, D('06'), id('running')));
    expect(selectHistory(pained).find((e) => e.requestId === id('strength'))?.pain).toBe(true);
    expect(selectBetaJournal(pained).find((e) => e.requestId === id('running'))?.execution).toBeNull();
  });
  it('PS-11. pause persistée : toujours appliquée après rechargement', () => {
    const r = reload(pained, '2026-10-06T07:00:00.000Z');
    expect(code(() => startProgrammeSession(r, D('06'), id('hyrox')))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });
  it('PS-12. sans douleur : aucun changement de comportement pour les quatre sports (non-régression)', () => {
    for (const sport of ['strength', 'running', 'crosstraining', 'hyrox']) expect(code(() => startProgrammeSession(s0, D('05'), id(sport)))).toBe('OK');
  });
  it('PS-13. qualité BLOQUÉE reste prioritaire, même pour une séance déjà commencée', () => {
    const started = startProgrammeSession(s0, D('05'), id('running'));
    const blocked: AppState = { ...started, planner: { weeks: Object.fromEntries(Object.entries(started.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map((r) => (r.requestId === id('running') && r.quality ? { ...r, quality: { ...r.quality, verdict: 'BLOCKED' as const } } : r)) }])) } };
    expect(code(() => startProgrammeSession(blocked, D('05'), id('running')))).toBe('QUALITY_BLOCKED');
  });
});
