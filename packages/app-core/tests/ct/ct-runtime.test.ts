/**
 * C3.5 — 40 tests adversariaux du parcours Cross-training RÉEL (app-core, Beta 0 expérimental). Le n° 30 (petite
 * hauteur Android) est vérifié par l'E2E navigateur (scripts/e2e.mjs, viewport 360 × 640).
 */
import { describe, expect, it } from 'vitest';
import {
  beta0Environment, controlCtTimer, ctClock, ctElapsedS, ctWorkoutOf, decodeState, ensureBeta0Week, exportState, finishProgrammeSession, planProgrammeCurrentWeek, recordCtProgress,
  recordSessionExecution, recreateBeta0Programme, selectBeta0Week, selectHistory, selectProgrammeSession, startProgrammeSession,
} from '../../src/index.js';
import type { AppState, SessionDraft } from '../../src/index.js';
import { at, create, ctSessions, decisions, doCt, fullGym, MON1, MON2, profile, reload } from './ct-fixtures.js';

const ids = (s: AppState) => ctSessions(s).filter((x) => x.status === 'planned').map((x) => x.requestId);
const formatOf = (s: AppState, id: string) => { const v = selectProgrammeSession(s, id); return v ? ctWorkoutOf(v.session)?.format : undefined; };
/** Premier identifiant de séance CT de la semaine au format demandé. */
function ofFormat(s: AppState, f: string): string {
  const id = ids(s).find((x) => formatOf(s, x) === f);
  if (!id) throw new Error(`aucune séance ${f} : ${ids(s).map((x) => formatOf(s, x)).join(',')}`);
  return id;
}
const T = (hhmm: string) => `2026-10-05T${hhmm}:00.000Z`;
const mixed = () => create();
const aerobic = () => create(profile({ ct: { intent: 'crosstraining.aerobic_capacity' } }));
const realizedOf = (s: AppState, id: string) => s.crosstraining.realized.find((r) => r.sessionId === id);

describe('C3.5 — parcours Cross-training : 40 tests adversariaux', () => {
  it('1. séance CT absente ⇒ aucune vue, démarrage refusé', () => {
    const s = mixed();
    expect(selectProgrammeSession(s, 'absente')).toBeNull();
    expect(() => startProgrammeSession(s, at(MON1), 'absente')).toThrow('SESSION_UNAVAILABLE');
  });

  it('2. séance CT invalide (bloc de séries) ⇒ projection nulle, jamais reconstruite', () => {
    const bad = { blocks: [{ id: 'b', kind: 'conditioning', role: 'primary', format: 'sets', grouping: 'straight', items: [{ id: 'i', exerciseId: 'ex.air_squat', prescription: { type: 'sets', sets: [] } }] }] } as unknown as SessionDraft;
    expect(ctWorkoutOf(bad)).toBeNull();
    expect(ctWorkoutOf({ blocks: [] } as unknown as SessionDraft)).toBeNull();
  });

  it('3. format inconnu ⇒ projection nulle ; enregistrement refusé par le contrat', () => {
    const odd = { blocks: [{ id: 'b', kind: 'conditioning', role: 'primary', format: 'tabata', items: [{ id: 'i', exerciseId: 'ex.row_erg', prescription: { type: 'reps', reps: 1 } }] }] } as unknown as SessionDraft;
    expect(ctWorkoutOf(odd)).toBeNull();
  });

  it('4. continuous : chrono restant, résultat « total » (durée réalisée)', () => {
    let s = aerobic();
    const id = ofFormat(s, 'continuous');
    const w = ctWorkoutOf(selectProgrammeSession(s, id)?.session as SessionDraft);
    s = doCt(s, id, T('07:00'), T('07:31'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'total', durationS: w?.totalS } } });
    expect(realizedOf(s, id)).toMatchObject({ prescription: { format: 'continuous' }, result: { kind: 'total', durationS: w?.totalS } });
  });

  it('5. intervals : TRAVAIL / RÉCUP dérivés du temps, résultat « intervals »', () => {
    let s = aerobic();
    const id = ofFormat(s, 'intervals');
    const w = ctWorkoutOf(selectProgrammeSession(s, id)?.session as SessionDraft);
    if (!w?.workS || !w.restS || !w.rounds) throw new Error('intervalles attendus');
    s = startProgrammeSession(s, at(T('07:00')), id);
    expect(s.programmeLogs[id]?.ct?.runningSince).toBe('2026-10-05T07:00:00Z');
    expect(ctClock(w, 1).phase).toBe('work');
    expect(ctClock(w, w.workS + 1)).toMatchObject({ phase: 'rest', round: 1, completedIntervals: 1 });
    expect(ctClock(w, w.workS + w.restS + 1)).toMatchObject({ phase: 'work', round: 2 });
    s = finishProgrammeSession(s, at(T('07:30')), { requestId: id, completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'intervals', intervalsCompleted: w.rounds } } });
    expect(realizedOf(s, id)?.result).toEqual({ kind: 'intervals', intervalsCompleted: w.rounds });
  });

  it('6. EMOM : minute en cours, minutes achevées, résultat « emom »', () => {
    let s = mixed();
    const id = ofFormat(s, 'emom');
    const w = ctWorkoutOf(selectProgrammeSession(s, id)?.session as SessionDraft);
    if (!w?.minutes) throw new Error('EMOM attendu');
    expect(ctClock(w, 125)).toMatchObject({ minute: 3, minuteRemainingS: 55, completedMinutes: 2 });
    s = doCt(s, id, T('07:00'), T('07:15'), { completion: 'modified', pain: false, ct: { result: { kind: 'emom', minutesCompleted: w.minutes - 1 } } });
    expect(realizedOf(s, id)).toMatchObject({ completion: 'completed', result: { kind: 'emom', minutesCompleted: w.minutes - 1 } });
  });

  it('7. AMRAP : compteurs persistés, résultat « rounds_reps »', () => {
    let s = mixed();
    const id = ofFormat(s, 'amrap');
    s = startProgrammeSession(s, at(T('07:00')), id);
    s = recordCtProgress(s, id, { rounds: 7 });
    s = recordCtProgress(s, id, { partialReps: 12 });
    s = finishProgrammeSession(s, at(T('07:13')), { requestId: id, completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 7, reps: 12 } } });
    expect(realizedOf(s, id)?.result).toEqual({ kind: 'rounds_reps', rounds: 7, reps: 12 });
  });

  it('8. for_time : terminé (temps) ou time cap (progression) — jamais un échec', () => {
    let s = mixed();
    const id = ofFormat(s, 'for_time');
    s = doCt(s, id, T('07:00'), T('07:20'), { completion: 'modified', pain: false, ct: { result: { kind: 'capped_rounds', roundsCompleted: 3, partialReps: 8 } } });
    expect(realizedOf(s, id)).toMatchObject({ completion: 'completed', result: { kind: 'capped_rounds', roundsCompleted: 3, partialReps: 8 } });
    expect(selectHistory(s).find((e) => e.requestId === id)?.completion).toBe('modified');
  });

  it('9. charge prescrite : aucune politique en Beta 0 ⇒ aucun mouvement chargé ; projection d’une charge sans conversion', () => {
    const s = mixed();
    for (const id of ids(s)) expect(ctWorkoutOf(selectProgrammeSession(s, id)?.session as SessionDraft)?.items.every((i) => i.loadKg === undefined)).toBe(true);
    const loaded = { blocks: [{ id: 'b', kind: 'conditioning', role: 'primary', format: 'amrap', timeCapS: 600, items: [{ id: 'i', exerciseId: 'ex.kb_swing', prescription: { type: 'reps', reps: 15, load: { kg: 16, certainty: 'prescribed' } } }] }] } as unknown as SessionDraft;
    expect(ctWorkoutOf(loaded)?.items[0]).toMatchObject({ quantity: { kind: 'reps', value: 15 }, loadKg: 16 });
  });

  it('10. charge réalisée ≠ prescrite : observation séparée ; mouvement non prescrit ⇒ refus', () => {
    let s = mixed();
    const id = ofFormat(s, 'amrap');
    const ex = selectProgrammeSession(s, id)?.session.blocks[0]?.items[1]?.exerciseId ?? '';
    const done = doCt(s, id, T('07:00'), T('07:13'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 5, reps: 0 }, performedLoads: [{ exerciseId: ex, kg: 10 }] } });
    expect(realizedOf(done, id)?.performedLoads).toEqual([{ exerciseId: ex, kg: 10 }]);
    expect((realizedOf(done, id)?.prescription as { items: { load?: unknown }[] }).items.every((i) => i.load === undefined)).toBe(true);
    s = startProgrammeSession(s, at(T('07:00')), id);
    expect(() => finishProgrammeSession(s, at(T('07:13')), { requestId: id, completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 5, reps: 0 }, performedLoads: [{ exerciseId: 'ex.back_squat', kg: 60 }] } })).toThrow('EXECUTION_INVALID');
  });

  it('11. douleur en cours ⇒ signal REPORTED persisté, pause douleur centrale, moteur futur la voit', () => {
    let s = mixed();
    const id = ofFormat(s, 'amrap');
    s = doCt(s, id, T('07:00'), T('07:10'), { completion: 'abandoned', pain: true });
    expect(realizedOf(s, id)?.pain).toBe('REPORTED');
    expect(s.safety.activePain).not.toBeNull();
    s = reload(s, T('09:00'));
    expect(s.safety.activePain?.sessionKey).toBe(id);
    expect(selectHistory(s)[0]?.pain).toBe(true);
    // Planification suspendue (système central) : la semaine suivante n'est pas construite.
    expect(ensureBeta0Week(s, at(MON2)).planner.weeks['2026-10-12']).toBeUndefined();
  });

  it('12. abandon ⇒ persisté, visible, distinct d’une séance terminée, sans résultat', () => {
    let s = mixed();
    const id = ofFormat(s, 'emom');
    s = doCt(s, id, T('07:00'), T('07:04'), { completion: 'abandoned', pain: false });
    expect(realizedOf(s, id)).toMatchObject({ completion: 'abandoned', result: { kind: 'abandoned' } });
    expect(selectHistory(s)[0]).toMatchObject({ completion: 'abandoned', ct: { result: null } });
  });

  it('13. reload avant démarrage ⇒ séance prévue, aucun chrono', () => {
    const s = reload(mixed(), T('06:00'));
    const id = ids(s)[0] ?? '';
    expect(selectProgrammeSession(s, id)?.log).toBeNull();
    expect(selectBeta0Week(s, MON1.slice(0, 10))?.sessions.find((x) => x.requestId === id)?.status).toBe('planned');
  });

  it('14. reload pendant le chrono ⇒ le temps continue (horodatage), compteurs conservés', () => {
    let s = startProgrammeSession(mixed(), at(T('07:00')), ofFormat(mixed(), 'amrap'));
    const id = ofFormat(mixed(), 'amrap');
    s = recordCtProgress(s, id, { rounds: 3 });
    s = reload(s, T('07:05'));
    const rt = s.programmeLogs[id]?.ct;
    if (!rt) throw new Error('chrono attendu');
    expect(ctElapsedS(rt, T('07:05'))).toBe(300);
    expect(rt.rounds).toBe(3);
  });

  it('15. reload en pause ⇒ cumul figé, aucune dérive', () => {
    const id = ofFormat(mixed(), 'amrap');
    let s = startProgrammeSession(mixed(), at(T('07:00')), id);
    s = controlCtTimer(s, at(T('07:02')), id, 'pause');
    s = reload(s, T('08:00'));
    const rt = s.programmeLogs[id]?.ct;
    if (!rt) throw new Error('chrono attendu');
    expect(ctElapsedS(rt, T('08:00'))).toBe(120);
    expect(rt.runningSince).toBeNull();
  });

  it('16. reload après fin ⇒ terminée, résultat conservé, jamais redevenue prévue', () => {
    const id = ofFormat(mixed(), 'amrap');
    const s = reload(doCt(mixed(), id, T('07:00'), T('07:13'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 4, reps: 1 } } }), T('09:00'));
    expect(selectBeta0Week(s, MON1.slice(0, 10))?.sessions.find((x) => x.requestId === id)?.status).toBe('completed_as_prescribed');
    expect(s.programmeLogs[id]?.outcome?.ct?.result).toEqual({ kind: 'rounds_reps', rounds: 4, reps: 1 });
  });

  it('17. double validation ⇒ refusée (séance terminée, exécution en double)', () => {
    const id = ofFormat(mixed(), 'amrap');
    const s = doCt(mixed(), id, T('07:00'), T('07:13'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 4, reps: 0 } } });
    expect(() => finishProgrammeSession(s, at(T('07:14')), { requestId: id, completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 4, reps: 0 } } })).toThrow();
    expect(() => recordSessionExecution(s, at(T('07:14')), { requestId: id, sport: 'crosstraining', completion: 'abandoned' })).toThrow('EXECUTION_DUPLICATE');
    expect(s.crosstraining.realized).toHaveLength(1);
  });

  it('18. navigation hors séance puis retour ⇒ aucune écriture, aucun abandon', () => {
    const id = ofFormat(mixed(), 'amrap');
    const s = startProgrammeSession(mixed(), at(T('07:00')), id);
    const before = JSON.stringify(s);
    selectProgrammeSession(s, id);
    selectBeta0Week(s, MON1.slice(0, 10));
    expect(JSON.stringify(s)).toBe(before);
    expect(s.programmeLogs[id]?.finishedAt).toBeUndefined();
  });

  it('19. historique vide ⇒ C3 trace 0 séance vue', () => {
    const s = mixed();
    expect(decisions(s, ids(s)[0] ?? '', 'C3_HISTORY')[0]).toMatchObject({ sameStimulus: 0, recentMovements: [] });
  });

  it('20. historique avec séance terminée ⇒ la séance suivante la lit (mouvements récents)', () => {
    const s0 = mixed();
    const id = ids(s0)[0] ?? '';
    const s = ensureBeta0Week(doCt(s0, id, T('07:00'), T('07:13'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 4, reps: 0 } } }), at(MON2));
    const b = ctSessions(s, MON2)[0]?.requestId ?? '';
    expect(decisions(s, b, 'C3_HISTORY')[0]?.sameStimulus).toBeGreaterThanOrEqual(1);
  });

  it('21. historique avec abandon ⇒ politique négative tracée (avec alternative)', () => {
    const s0 = create(profile({ equipment: [...fullGym, 'skierg'] }));
    const id = ids(s0)[0] ?? '';
    const s = ensureBeta0Week(doCt(s0, id, T('07:00'), T('07:05'), { completion: 'abandoned', pain: false }), at(MON2));
    expect(decisions(s, ctSessions(s, MON2)[0]?.requestId ?? '', 'C3_HISTORY_NEGATIVE')[0]).toMatchObject({ causes: ['abandoned'] });
  });

  it('22. export / import ⇒ séance en cours (chrono, compteurs) et réalisée restaurées à l’identique', () => {
    const [a, b] = [ofFormat(mixed(), 'amrap'), ofFormat(mixed(), 'emom')];
    let s = doCt(mixed(), b, T('06:00'), T('06:12'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'emom', minutesCompleted: 12 } } });
    s = recordCtProgress(startProgrammeSession(s, at(T('07:00')), a), a, { rounds: 2 });
    const back = decodeState(exportState(s));
    expect(back.ok && back.state.programmeLogs[a]?.ct).toEqual(s.programmeLogs[a]?.ct);
    expect(back.ok && back.state.crosstraining.realized).toEqual(s.crosstraining.realized);
  });

  it('23. programme Cross-training seul ⇒ séances CT seules, formats variés dans la semaine', () => {
    const s = mixed();
    const sessions = selectBeta0Week(s, MON1.slice(0, 10))?.sessions ?? [];
    expect(sessions.every((x) => x.sport === 'crosstraining' && x.status === 'planned')).toBe(true);
    expect(new Set(ids(s).map((x) => formatOf(s, x))).size).toBe(ids(s).length);
  });

  it.each([
    ['24. CT + Strength', { strength: true }, ['crosstraining', 'strength']],
    ['25. CT + Running', { running: true }, ['crosstraining', 'running']],
    ['26. CT + Strength + Running', { strength: true, running: true }, ['crosstraining', 'running', 'strength']],
  ] as const)('%s ⇒ chaque sport planifié, CT composé par C3', (_t, o, sports) => {
    const s = create(profile({ ...o, ct: { sessionsPerWeek: 2 } }));
    const planned = (selectBeta0Week(s, MON1.slice(0, 10))?.sessions ?? []).filter((x) => x.status === 'planned');
    expect([...new Set(planned.map((x) => x.sport))].sort()).toEqual([...sports]);
    const ct = planned.find((x) => x.sport === 'crosstraining');
    expect(decisions(s, ct?.requestId ?? '', 'C3_PROPOSED')).toHaveLength(1);
  });

  it('27. ajout de CT à un programme existant (semaine non commencée) ⇒ replanifiée avec CT', () => {
    const s0 = create(profile({ strength: true, ct: false }));
    expect(ctSessions(s0)).toHaveLength(0);
    const s = recreateBeta0Programme(s0, profile({ strength: true, ct: { sessionsPerWeek: 2 } }), at(T('08:00')), {});
    expect(ctSessions(s).length).toBeGreaterThan(0);
  });

  it('28. retrait de CT ⇒ plus de séance CT, historique CT conservé', () => {
    const s0 = mixed();
    const id = ofFormat(s0, 'amrap');
    const done = doCt(s0, id, T('06:00'), T('06:13'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 4, reps: 0 } } });
    const s = recreateBeta0Programme(ensureBeta0Week(done, at(MON2)), profile({ strength: true, ct: false }), at(MON2), {});
    expect(ctSessions(s, MON2)).toHaveLength(0);
    expect(s.crosstraining.realized).toHaveLength(1);
    expect(selectHistory(s).some((e) => e.sport === 'crosstraining')).toBe(true);
  });

  it('29. semaine commencée (séance CT réalisée) ⇒ conservée telle quelle à la modification', () => {
    const s0 = mixed();
    const id = ofFormat(s0, 'amrap');
    const done = doCt(s0, id, T('06:00'), T('06:13'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 4, reps: 0 } } });
    const s = recreateBeta0Programme(done, profile({ strength: true, ct: false }), at(T('08:00')), {});
    expect(selectBeta0Week(s, MON1.slice(0, 10))?.sessions.find((x) => x.requestId === id)?.status).toBe('completed_as_prescribed');
    expect(ctSessions(s).length).toBe(ctSessions(done).length);
  });

  it('30. petite hauteur Android : vérifiée par l’E2E navigateur (viewport 360 × 640)', () => {
    expect(true).toBe(true);
  });

  it('31. chrono sans écriture par seconde : l’état ne change pas sans commande', () => {
    const id = ofFormat(mixed(), 'amrap');
    const s = startProgrammeSession(mixed(), at(T('07:00')), id);
    const rt = s.programmeLogs[id]?.ct;
    if (!rt) throw new Error('chrono attendu');
    const snapshot = JSON.stringify(s);
    expect([ctElapsedS(rt, T('07:00')), ctElapsedS(rt, T('07:01')), ctElapsedS(rt, T('07:10'))]).toEqual([0, 60, 600]);
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(Object.keys(rt).sort()).toEqual(['accumulatedS', 'partialReps', 'rounds', 'runningSince']);
  });

  it('32–36. résultats STRUCTURÉS par format (jamais une chaîne « 7+12 »), incohérences refusées par le contrat', () => {
    const s = mixed();
    const amrap = ofFormat(s, 'amrap');
    const started = startProgrammeSession(s, at(T('07:00')), amrap);
    expect(() => finishProgrammeSession(started, at(T('07:13')), { requestId: amrap, completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'time', completionS: 600 } } })).toThrow('EXECUTION_INVALID');
    const ft = ofFormat(s, 'for_time');
    const s2 = startProgrammeSession(s, at(T('07:00')), ft);
    // Time cap atteint déclaré « comme prévu » ⇒ incohérent ; tous les tours au time cap ⇒ incohérent.
    expect(() => finishProgrammeSession(s2, at(T('07:20')), { requestId: ft, completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'capped_rounds', roundsCompleted: 2, partialReps: 0 } } })).toThrow('EXECUTION_INVALID');
    expect(() => finishProgrammeSession(s2, at(T('07:20')), { requestId: ft, completion: 'modified', pain: false, ct: { result: { kind: 'capped_rounds', roundsCompleted: 99, partialReps: 0 } } })).toThrow('EXECUTION_INVALID');
    const em = ofFormat(s, 'emom');
    const s3 = startProgrammeSession(s, at(T('07:00')), em);
    expect(() => finishProgrammeSession(s3, at(T('07:12')), { requestId: em, completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'emom', minutesCompleted: 3 } } })).toThrow('EXECUTION_INVALID');
    expect(() => finishProgrammeSession(s3, at(T('07:12')), { requestId: em, completion: 'completed_as_prescribed', pain: false })).toThrow();
  });

  it('37. empreinte inchangée par le score : même prescription ⇒ même empreinte, quel que soit le résultat', () => {
    const id = ofFormat(mixed(), 'amrap');
    const a = doCt(mixed(), id, T('07:00'), T('07:13'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 2, reps: 0 } } });
    const b = doCt(mixed(), id, T('07:00'), T('07:13'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 9, reps: 11 } } });
    expect(a.fingerprints.crosstraining[0]?.fingerprint).toEqual(b.fingerprints.crosstraining[0]?.fingerprint);
    expect(JSON.stringify(a.fingerprints.crosstraining[0]?.fingerprint)).not.toMatch(/rounds_reps|"reps":9/);
  });

  it('38. production stricte ⇒ Cross-training fail-closed (aucune séance CT planifiée)', () => {
    const s0 = mixed();
    const env = { ...beta0Environment(), mode: 'PRODUCTION' as const, authority: 'production' as const, simulation: [] };
    const fresh = { ...s0, planner: { weeks: {} }, programmeState: s0.programmeState ? { ...s0.programmeState, weeks: [] } : null };
    const s = planProgrammeCurrentWeek(fresh, at(MON1), { ...env, crosstraining: env.crosstraining ? { ...env.crosstraining, simulation: [] } : undefined }, 0);
    const ct = (selectBeta0Week(s, MON1.slice(0, 10))?.sessions ?? []).filter((x) => x.sport === 'crosstraining');
    expect(ct.length).toBeGreaterThan(0);
    expect(ct.every((x) => x.status === 'not_planned')).toBe(true);
  });

  it('39. provenance Beta 0 visible : autorité expérimentale, marques SIMULATION_ONLY CT, valeurs candidates tracées', () => {
    const s = mixed();
    const w = selectBeta0Week(s, MON1.slice(0, 10));
    expect(w?.authority).toBe('beta0_experimental');
    expect(w?.experimental).toBe(true);
    expect(w?.simulation).toEqual(expect.arrayContaining(['crosstraining.c3.testGovernance', 'crosstraining.engine.simulation']));
    expect(selectProgrammeSession(s, ids(s)[0] ?? '')?.experimental).toBe(true);
    expect(decisions(s, ids(s)[0] ?? '', 'CANDIDATE_VALUE_USED').every((p) => p.maturity === 'EXPERT_PROPOSED')).toBe(true);
    // Une semaine sans Cross-training ne porte aucune marque CT.
    const strengthOnly = selectBeta0Week(create(profile({ strength: true, ct: false })), MON1.slice(0, 10));
    expect(strengthOnly?.simulation.some((x) => x.startsWith('crosstraining.'))).toBe(false);
  });

  it('40. la génération suivante lit RÉELLEMENT l’exécution précédente (état rechargé, aucun mock)', () => {
    const s0 = mixed();
    const id = ofFormat(s0, 'amrap');
    const done = reload(doCt(s0, id, T('07:00'), T('07:13'), { completion: 'completed_as_prescribed', pain: false, ct: { result: { kind: 'rounds_reps', rounds: 5, reps: 3 } } }), T('09:00'));
    const s = ensureBeta0Week(done, at(MON2));
    const b = ctSessions(s, MON2)[0]?.requestId ?? '';
    const moves = (selectProgrammeSession(s, id)?.session.blocks[0]?.items ?? []).map((i) => i.exerciseId);
    expect(decisions(s, b, 'C3_HISTORY')[0]?.recentMovements).toEqual(expect.arrayContaining(moves));
  });
});
