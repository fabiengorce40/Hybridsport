/**
 * H2.5 — 48 tests adversariaux du runtime HYROX dans l'application (numérotés comme la demande H2.5 §47), par le chemin
 * RÉEL : profil Beta 0 → programme → planificateur → H2 → semaine persistée → séance → exécution → résultat →
 * historique → génération suivante. Valeurs sportives : environnement Beta 0 (H2 TEST_ONLY, SIMULATION_ONLY).
 * n° 44 (aucun code interne) : test DOM `apps/kairo/tests/hr-workout-dom.test.tsx` ; n° 45 (360 × 640) : E2E navigateur.
 */
import { describe, expect, it } from 'vitest';
import { deriveSessionDemand } from '@hybridsport/engine';
import type { SessionDraft } from '@hybridsport/domain';
import {
  beta0Environment, beta0Integrity, controlHrTimer, ensureBeta0Week, finishProgrammeSession, hrClock, hrElapsedS, hrProgress, planProgrammeCurrentWeek, previewBeta0Recreation, recordHrLoad,
  recreateBeta0Programme, selectHistory, selectProgrammeSession, setHrSteps, startProgrammeSession,
} from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, create, decisions, doHr, hrProfile, hrSessions, MON1, MON2, reload, request, ROLE, week, workoutOf } from './hr-fixtures.js';
import { hrBeta0 } from '../../../planner/tests/hr-beta0.js';

const planned = (s: AppState, now = MON1) => hrSessions(s, now).filter((x) => x.status === 'planned');
const first = (s: AppState, now = MON1) => { const v = planned(s, now)[0]; if (!v?.date) throw new Error('séance HYROX planifiée attendue'); return v as typeof v & { date: string }; };
const errOf = (f: () => unknown): string => { try { f(); return 'NO_ERROR'; } catch (e) { return e instanceof Error ? e.message : String(e); } };
const t = (date: string, hhmm: string) => `${date}T${hhmm}:00.000Z`;
const sports = (s: AppState, now = MON1) => [...new Set((week(s, now)?.sessions ?? []).filter((x) => x.status === 'planned').map((x) => x.sport))].sort();

describe('H2.5 adversarial — activation, prescription, rôles', () => {
  it('1. HYROX absent : aucune demande HYROX, aucune marque SIMULATION_ONLY HYROX', () => {
    const s = create(hrProfile({ hr: false, strength: true }));
    expect(hrSessions(s)).toEqual([]);
    expect(week(s)?.simulation.some((x) => x.startsWith('hybrid_race'))).toBe(false);
  });

  it('2. prescription invalide (séance persistée altérée) : jamais reconstruite ni démarrée', () => {
    const s = create();
    const v = first(s);
    const r = request(s, v.requestId);
    const data = r?.record?.data as { session: SessionDraft };
    data.session = { ...data.session, blocks: data.session.blocks.map((b) => ({ ...b, id: 'bloc.altere' })) } as SessionDraft;
    expect(workoutOf(s, v.requestId)).toBeNull();
    expect(errOf(() => startProgrammeSession(s, at(t(v.date, '08:00')), v.requestId))).toBe('HR_SESSION_UNREADABLE');
  });

  it('3. rôle inconnu (ex. simulation complète) : refus explicite à la création', () => {
    expect(errOf(() => create(hrProfile({ hr: { role: ROLE('full_simulation') } })))).toBe('HR_ROLE_UNKNOWN');
    expect(errOf(() => create(hrProfile({ hr: { role: undefined } })))).toBe('HR_DECLARATION_MISSING');
  });

  it.each([
    ['4', 'station_capacity', 'station_repeats'], ['5', 'strength_endurance', 'station_circuit'], ['6', 'mixed_station_conditioning', 'station_circuit'],
    ['7', 'compromised_running', 'run_station_alternation'], ['8', 'partial_simulation', 'partial_sequence'],
  ])('%s. rôle %s : séance planifiée, structure %s, exécutable jusqu’au bout', (_n, role, structure) => {
    let s = create(hrProfile({ hr: { role: ROLE(role), sessionsPerWeek: 1 } }));
    const v = first(s);
    const w = workoutOf(s, v.requestId);
    expect(w?.structure).toBe(structure);
    expect(v.archetypeId).toBe(ROLE(role));
    s = doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:40'), 'all', { completion: 'completed_as_prescribed', pain: false, hr: { timeCapReached: false } });
    expect(s.hyrox.realized[0]).toMatchObject({ role, structure, completion: 'completed_as_prescribed', result: { kind: 'completed' } });
  });

  it('9. simulation complète refusée : aucun rôle, aucun libellé, refus explicite', () => {
    expect(errOf(() => create(hrProfile({ hr: { role: 'hybrid_race.h2.full_simulation' } })))).toBe('HR_ROLE_UNKNOWN');
  });
});

describe('H2.5 adversarial — charges, course, transitions, tours', () => {
  it('10. charge prescrite visible (lue dans la séance), jamais calculée', () => {
    const s = create(hrProfile({ hr: { role: ROLE('strength_endurance'), sessionsPerWeek: 1 } }));
    const w = workoutOf(s, first(s).requestId);
    expect(w?.components.every((c) => c.kind === 'station' && c.loadKg !== undefined)).toBe(true);
  });

  it('11. charge réelle différente : enregistrée, survit au rechargement ; « comme prévu » refusé, « adaptée » acceptée', () => {
    let s = create(hrProfile({ hr: { role: ROLE('strength_endurance'), sessionsPerWeek: 1 } }));
    const v = first(s);
    const c = workoutOf(s, v.requestId)?.components[0];
    if (c?.loadKg === undefined) throw new Error('station chargée attendue');
    s = startProgrammeSession(s, at(t(v.date, '08:00')), v.requestId);
    s = recordHrLoad(s, v.requestId, c.itemId, c.loadKg - 2);
    s = reload(s, t(v.date, '08:05'));
    expect(s.programmeLogs[v.requestId]?.hr?.loads).toEqual([{ itemId: c.itemId, kg: c.loadKg - 2 }]);
    s = setHrSteps(s, v.requestId, workoutOf(s, v.requestId)?.steps.length ?? 0);
    expect(errOf(() => finishProgrammeSession(s, at(t(v.date, '08:30')), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false }))).toBe('EXECUTION_INVALID');
    s = finishProgrammeSession(s, at(t(v.date, '08:30')), { requestId: v.requestId, completion: 'modified', pain: false });
    expect(s.hyrox.realized[0]).toMatchObject({ completion: 'completed', performedLoads: [{ itemId: c.itemId, kg: c.loadKg - 2 }] });
    expect(errOf(() => recordHrLoad(startProgrammeSession(create(), at(MON1), first(create()).requestId), first(create()).requestId, 'item.inconnu', 10))).toBe('HR_LOAD_NOT_PRESCRIBED');
  });

  it('12. segment couru : composante « course », distance native, contexte après station', () => {
    const s = create();
    const runs = workoutOf(s, first(s).requestId)?.components.filter((c) => c.kind === 'run') ?? [];
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((c) => c.dose.kind === 'distance_m' && c.runContext === 'after_station')).toBe(true);
  });

  it('13. course sans allure : aucune allure dans la prescription persistée (BLOCKED)', () => {
    const s = create();
    const v = selectProgrammeSession(s, first(s).requestId);
    const items = v?.session.blocks.flatMap((b) => b.items) ?? [];
    expect(JSON.stringify(items)).not.toMatch(/pace|allure|speed|zone/i);
    expect(workoutOf(s, first(s).requestId)?.components.filter((c) => c.kind === 'run').every((c) => c.pace === 'BLOCKED:RUNNING_ENGINE_DELEGATION')).toBe(true);
  });

  it('14. transition inconnue : comptée, durée null (jamais inventée)', () => {
    const s = create();
    const w = workoutOf(s, first(s).requestId);
    expect(w?.transitions).toEqual({ count: (w?.steps.length ?? 0) - 1, durationS: null });
  });

  it('15. plusieurs tours : séquence = tours × composantes, tour courant suivi', () => {
    const s = create(hrProfile({ hr: { role: ROLE('station_capacity'), sessionsPerWeek: 1 } }));
    const w = workoutOf(s, first(s).requestId);
    if (!w) throw new Error('séance attendue');
    expect(w.rounds).toBeGreaterThan(1);
    expect(w.steps.length).toBe(w.rounds * w.components.length);
    expect(hrProgress(w, w.components.length).round).toBe(2);
    expect(hrProgress(w, w.steps.length)).toMatchObject({ finished: true, current: null });
  });
});

describe('H2.5 adversarial — time cap, fin, douleur', () => {
  it('16. time cap : plafond prescrit ; « time cap atteint » refusé tant que le chrono ne l’a pas atteint', () => {
    let s = create();
    const v = first(s);
    const cap = workoutOf(s, v.requestId)?.timeCapS ?? 0;
    s = startProgrammeSession(s, at(t(v.date, '08:00')), v.requestId);
    s = setHrSteps(s, v.requestId, 2);
    expect(errOf(() => finishProgrammeSession(s, at(t(v.date, '08:10')), { requestId: v.requestId, completion: 'modified', pain: false, hr: { timeCapReached: true } }))).toBe('EXECUTION_INVALID');
    const w = workoutOf(s, v.requestId);
    if (!w) throw new Error('séance attendue');
    expect(hrClock(w, cap - 1).capReached).toBe(false);
    expect(hrClock(w, cap).capReached).toBe(true);
  });

  it('17. time cap partiel : tours complets + étapes du tour en cours ; jamais « comme prévu »', () => {
    let s = create();
    const v = first(s);
    const w = workoutOf(s, v.requestId);
    if (!w) throw new Error('séance attendue');
    const end = new Date(Date.parse(t(v.date, '08:00')) + (w.timeCapS + 5) * 1000).toISOString();
    s = startProgrammeSession(s, at(t(v.date, '08:00')), v.requestId);
    s = setHrSteps(s, v.requestId, w.components.length + 1);
    expect(errOf(() => finishProgrammeSession(s, at(end), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false, hr: { timeCapReached: true } }))).toBe('EXECUTION_INVALID');
    s = finishProgrammeSession(s, at(end), { requestId: v.requestId, completion: 'modified', pain: false, hr: { timeCapReached: true } });
    expect(s.hyrox.realized[0]).toMatchObject({ completion: 'completed', result: { kind: 'time_capped', roundsCompleted: 1, itemsCompletedInRound: 1 } });
    expect(selectHistory(s)[0]).toMatchObject({ completion: 'modified', hr: { result: { kind: 'time_capped' } } });
  });

  it('18. terminée comme prévu : toute la séquence ; terminer sans tout parcourir sans time cap ⇒ refus', () => {
    let s = create();
    const v = first(s);
    s = startProgrammeSession(s, at(t(v.date, '08:00')), v.requestId);
    s = setHrSteps(s, v.requestId, 1);
    expect(errOf(() => finishProgrammeSession(s, at(t(v.date, '08:20')), { requestId: v.requestId, completion: 'modified', pain: false }))).toBe('EXECUTION_INVALID');
    s = setHrSteps(s, v.requestId, workoutOf(s, v.requestId)?.steps.length ?? 0);
    s = finishProgrammeSession(s, at(t(v.date, '08:40')), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false });
    expect(s.programmeState?.results.find((r) => r.requestId === v.requestId)?.completion).toBe('completed_as_prescribed');
  });

  it('19. abandon : progression conservée, distinct du time cap, visible dans l’historique', () => {
    let s = create();
    const v = first(s);
    s = doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:10'), 3, { completion: 'abandoned', pain: false });
    expect(s.hyrox.realized[0]).toMatchObject({ completion: 'abandoned', result: { kind: 'abandoned', roundsCompleted: 0, itemsCompletedInRound: 3 } });
    expect(selectHistory(s)[0]).toMatchObject({ completion: 'abandoned', hr: { result: { kind: 'abandoned' } } });
  });

  it('20. douleur : système central (pause de planification), persistée, transmise à H2', () => {
    let s = create();
    const v = first(s);
    s = doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:10'), 1, { completion: 'abandoned', pain: true });
    s = reload(s, t(v.date, '09:00'));
    expect(s.safety.activePain?.sessionKey).toBe(v.requestId);
    expect(s.hyrox.realized[0]).toMatchObject({ pain: 'REPORTED' });
    expect(selectHistory(s)[0]?.pain).toBe(true);
  });
});

describe('H2.5 adversarial — persistance, navigation, double saisie, empreinte', () => {
  it('21. rechargement avant départ : séance intacte, rien de démarré', () => {
    const s = reload(create(), '2026-10-05T07:40:00.000Z');
    const v = first(s);
    expect(selectProgrammeSession(s, v.requestId)?.log).toBeNull();
    expect(workoutOf(s, v.requestId)).not.toBeNull();
  });

  it('22. rechargement chrono en marche : horodatage conservé, le temps continue', () => {
    let s = create();
    const v = first(s);
    s = setHrSteps(startProgrammeSession(s, at(t(v.date, '08:00')), v.requestId), v.requestId, 2);
    s = reload(s, t(v.date, '08:30'));
    const rt = s.programmeLogs[v.requestId]?.hr;
    if (!rt) throw new Error('runtime attendu');
    expect(rt.steps).toBe(2);
    expect(hrElapsedS(rt, t(v.date, '08:30'))).toBe(1800);
  });

  it('23. rechargement en pause : temps figé', () => {
    let s = create();
    const v = first(s);
    s = controlHrTimer(startProgrammeSession(s, at(t(v.date, '08:00')), v.requestId), at(t(v.date, '08:05')), v.requestId, 'pause');
    s = reload(s, t(v.date, '09:00'));
    const rt = s.programmeLogs[v.requestId]?.hr;
    if (!rt) throw new Error('runtime attendu');
    expect(hrElapsedS(rt, t(v.date, '09:00'))).toBe(300);
  });

  it('24. rechargement après la fin : résultat, historique et réalisation H2 intacts', () => {
    let s = create();
    const v = first(s);
    s = doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:40'), 'all', { completion: 'completed_as_prescribed', pain: false });
    const before = { realized: s.hyrox.realized, history: selectHistory(s) };
    s = reload(s, t(v.date, '10:00'));
    expect(s.hyrox.realized).toEqual(before.realized);
    expect(selectHistory(s)).toEqual(before.history);
  });

  it('25. navigation / retour : lecture pure, démarrage idempotent (aucune écriture)', () => {
    let s = create();
    const v = first(s);
    s = startProgrammeSession(s, at(t(v.date, '08:00')), v.requestId);
    expect(startProgrammeSession(s, at(t(v.date, '08:05')), v.requestId)).toBe(s);
    const json = JSON.stringify(s);
    selectProgrammeSession(s, v.requestId);
    selectProgrammeSession(s, v.requestId);
    expect(JSON.stringify(s)).toBe(json);
  });

  it('26. double soumission impossible : la seconde fin est refusée, état inchangé', () => {
    let s = create();
    const v = first(s);
    s = doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:40'), 'all', { completion: 'completed_as_prescribed', pain: false });
    expect(errOf(() => finishProgrammeSession(s, at(t(v.date, '08:41')), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false }))).toBe('SESSION_FINISHED');
    expect(s.hyrox.realized).toHaveLength(1);
  });

  it('27. empreinte de prescription ≠ résultat : deux résultats différents, même empreinte persistée', () => {
    const s0 = create();
    const v = first(s0);
    const fp = (s: AppState) => JSON.stringify((request(s, v.requestId)?.record?.data as { fingerprint?: unknown }).fingerprint);
    const a = doHr(s0, v.requestId, t(v.date, '08:00'), t(v.date, '08:40'), 'all', { completion: 'completed_as_prescribed', pain: false });
    const b = doHr(s0, v.requestId, t(v.date, '08:00'), t(v.date, '08:10'), 1, { completion: 'abandoned', pain: false });
    expect(fp(a)).toBe(fp(s0));
    expect(fp(b)).toBe(fp(s0));
    expect(a.hyrox.realized[0]?.result).not.toEqual(b.hyrox.realized[0]?.result);
  });
});

describe('H2.5 adversarial — historique lu par H2', () => {
  const sat = (s: AppState) => { const v = planned(s).find((x) => x.date === '2026-10-10'); if (!v?.date) throw new Error('séance du samedi attendue'); return v as typeof v & { date: string }; };

  it('28. historique vide : H2 ne voit rien (ordre gouverné)', () => {
    const s = create();
    expect(decisions(s, first(s).requestId, 'H2_HISTORY')[0]).toMatchObject({ sameRole: 0, recentStations: [] });
  });

  it('29. historique réussi : la semaine suivante voit la séance, sans mémoire négative', () => {
    let s = create();
    const v = sat(s);
    s = ensureBeta0Week(doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:40'), 'all', { completion: 'completed_as_prescribed', pain: false }), at(MON2));
    const b = first(s, MON2);
    expect(decisions(s, b.requestId, 'H2_HISTORY')[0]?.sameRole).toBeGreaterThanOrEqual(1);
    expect(decisions(s, b.requestId, 'H2_HISTORY_NEGATIVE')).toEqual([]);
  });

  it('30. historique abandon : stations écartées (politique TEST_ONLY)', () => {
    let s = create();
    const v = sat(s);
    s = ensureBeta0Week(doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:10'), 2, { completion: 'abandoned', pain: false }), at(MON2));
    expect(decisions(s, first(s, MON2).requestId, 'H2_HISTORY_NEGATIVE')[0]).toMatchObject({ sessionId: v.requestId, action: 'exclude_stations' });
  });

  it('31. historique douleur : pause, puis refus explicite (politique TEST_ONLY « refuse »)', () => {
    let s = create();
    const v = sat(s);
    s = doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:10'), 1, { completion: 'abandoned', pain: true });
    s = ensureBeta0Week({ ...s, safety: { activePain: null } }, at(MON2));
    const refused = (s.planner.weeks['2026-10-12']?.requests ?? []).filter((r) => r.sport === 'hyrox' && r.status !== 'planned');
    expect(refused.length).toBeGreaterThan(0);
    expect(refused.flatMap((r) => r.reasons).some((r) => r.code === 'SAFETY.HYROX.H2_HISTORY_NEGATIVE' && r.params.action === 'refuse')).toBe(true);
  });

  it('32. export / import : runtime en cours et réalisations H2 relus strictement à l’identique', () => {
    let s = create();
    const v = first(s);
    s = setHrSteps(startProgrammeSession(s, at(t(v.date, '08:00')), v.requestId), v.requestId, 3);
    const back = reload(s, t(v.date, '08:10'));
    expect(back.programmeLogs).toEqual(s.programmeLogs);
    const done = doHr(create(), v.requestId, t(v.date, '08:00'), t(v.date, '08:40'), 'all', { completion: 'completed_as_prescribed', pain: false });
    expect(reload(done, t(v.date, '09:00')).hyrox).toEqual(done.hyrox);
  });
});

describe('H2.5 adversarial — multisport, programme', () => {
  it('33. HYROX seul : séances HYROX planifiées, aucune autre discipline', () => {
    expect(sports(create())).toEqual(['hyrox']);
  });

  it.each([
    ['34', { strength: true }, ['hyrox', 'strength']], ['35', { running: true }, ['hyrox', 'running']], ['36', { ct: true }, ['crosstraining', 'hyrox']],
  ] as const)('%s. HYROX + autre sport : les deux planifiés, voisines transportées à H2', (_n, o, expected) => {
    const s = create(hrProfile({ ...o, availability: [60, 60, 60, 60, 60, 60, 60] }));
    expect(sports(s)).toEqual(expected);
    expect(beta0Integrity(s)).toEqual([]);
    const neighbours = planned(s).flatMap((x) => decisions(s, x.requestId, 'H2_NEIGHBOURS'));
    expect(neighbours.some((n) => (n.neighbours as string[]).length > 0)).toBe(true);
  });

  it('37. quatre sports : chacun planifié, une séance par jour, aucune incohérence', () => {
    const s = create(hrProfile({ strength: true, running: true, ct: true, hr: { sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 60, 60] }));
    expect(sports(s)).toEqual(['crosstraining', 'hyrox', 'running', 'strength']);
    expect(beta0Integrity(s)).toEqual([]);
  });

  it('38. ajout de HYROX (semaine non commencée) : replanifiée avec HYROX', () => {
    const base = hrProfile({ hr: false, strength: true });
    const s0 = create(base);
    const s = recreateBeta0Programme(s0, hrProfile({ strength: true }), at(MON1), {});
    expect(sports(s)).toContain('hyrox');
  });

  it('39. retrait de HYROX : plus de séance HYROX, historique HYROX conservé', () => {
    let s = create();
    const v = first(s);
    s = doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:40'), 'all', { completion: 'completed_as_prescribed', pain: false });
    const next = recreateBeta0Programme(s, hrProfile({ hr: false, strength: true }), at(MON2), {});
    expect(sports(next, MON2)).not.toContain('hyrox');
    expect(next.hyrox.realized).toEqual(s.hyrox.realized);
  });

  it('40. semaine commencée : conservée telle quelle (séance HYROX restante toujours réalisable)', () => {
    let s = create();
    const v = first(s);
    s = doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:40'), 'all', { completion: 'completed_as_prescribed', pain: false });
    expect(previewBeta0Recreation(s, '2026-10-06').currentWeek).toBe('kept');
    const next = recreateBeta0Programme(s, hrProfile({ hr: { role: ROLE('station_capacity') } }), at('2026-10-06T07:00:00.000Z'), {});
    const rest = planned(next, '2026-10-06T07:00:00.000Z').filter((x) => x.requestId !== v.requestId);
    expect(rest.every((x) => x.archetypeId === ROLE('compromised_running'))).toBe(true);
  });

  it('41. séance HYROX commencée : modification du programme refusée', () => {
    const s0 = create();
    const v = first(s0);
    const s = startProgrammeSession(s0, at(t(v.date, '08:00')), v.requestId);
    expect(errOf(() => recreateBeta0Programme(s, hrProfile({ strength: true }), at(t(v.date, '08:10')), {}))).toBe('PROGRAMME_SESSION_IN_PROGRESS');
  });
});

describe('H2.5 adversarial — gouvernance, provenance, chrono, demande', () => {
  it('42. production fail-closed : sans simulation et en PRODUCTION, H2 refuse (valeurs non approuvées)', () => {
    const s = create();
    const hr = hrBeta0();
    const env = { ...beta0Environment(), mode: 'PRODUCTION' as const, authority: 'production' as const, simulation: [], hyrox: { engine: hr.engine, content: hr.content, transportNeighbours: true, simulation: [] }, crosstraining: undefined };
    const ps = s.programmeState;
    if (!ps) throw new Error('programme attendu');
    const wk = planProgrammeCurrentWeek({ ...s, planner: { weeks: {} }, programmeState: { ...ps, weeks: [] } }, at(MON1), env as never, 0);
    const reqs = Object.values(wk.planner.weeks).flatMap((w) => w.requests).filter((r) => r.sport === 'hyrox');
    expect(reqs.length).toBeGreaterThan(0);
    expect(reqs.every((r) => r.status !== 'planned')).toBe(true);
    expect(reqs.flatMap((r) => r.reasons).some((r) => r.params.cause === 'NOT_PRODUCTION_READY')).toBe(true);
  });

  it('43. provenance Beta visible : marques SIMULATION_ONLY HYROX dans la semaine, valeurs candidates persistées', () => {
    const s = create();
    expect(week(s)?.simulation).toEqual(expect.arrayContaining(['hybrid_race.h2.testGovernance', 'hybrid_race.engine.simulation', 'demand.doseNormalization.hybrid_race']));
    expect(week(s)?.experimental).toBe(true);
    expect(decisions(s, first(s).requestId, 'CANDIDATE_VALUE_USED').length).toBeGreaterThan(0);
  });

  it('46. chrono sans écriture par seconde : 30 minutes sans commande ⇒ état identique, temps calculé', () => {
    const s = startProgrammeSession(create(), at(t('2026-10-05', '08:00')), first(create()).requestId);
    const json = JSON.stringify(s);
    const rt = s.programmeLogs[first(create()).requestId]?.hr;
    if (!rt) throw new Error('runtime attendu');
    expect(hrElapsedS(rt, t('2026-10-05', '08:30'))).toBe(1800);
    expect(JSON.stringify(s)).toBe(json);
  });

  it('47. génération suivante : H2 lit la réalisation stockée (contrat compositionHistory)', () => {
    let s = create();
    const v = planned(s).find((x) => x.date === '2026-10-10');
    if (!v?.date) throw new Error('séance attendue');
    s = ensureBeta0Week(doHr(s, v.requestId, t(v.date, '08:00'), t(v.date, '08:40'), 'all', { completion: 'completed_as_prescribed', pain: false }), at(MON2));
    const seen = decisions(s, first(s, MON2).requestId, 'H2_HISTORY')[0];
    const aStations = decisions(s, v.requestId, 'H2_STATION_SELECTED').map((d) => d.stationId);
    for (const st of aStations) expect(seen?.recentStations).toContain(st);
  });

  it('48. CORE : la demande de la séance HYROX persistée compte les tours du for time (correctif eab25cf)', () => {
    const s = create();
    const v = selectProgrammeSession(s, first(s).requestId);
    if (!v) throw new Error('séance attendue');
    const b = v.session.blocks[0];
    if (b?.format !== 'for_time' || b.rounds < 2) throw new Error('for_time à plusieurs tours attendu');
    const content = hrBeta0().content;
    const full = deriveSessionDemand(v.session, content.catalog, content.ruleset);
    const one = deriveSessionDemand({ ...v.session, blocks: [{ ...b, rounds: 1 }] }, content.catalog, content.ruleset);
    if (!full.ok || !one.ok) throw new Error('profil attendu');
    for (const [k, x] of Object.entries(one.profile.scores)) expect(full.profile.scores[k]).toBeCloseTo(x * b.rounds, 9);
  });
});
