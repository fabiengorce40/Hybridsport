/**
 * Outil de test Beta 0 « Recréer mon programme de test » et audit de la semaine affichée sur le téléphone.
 * État de départ : AppState RÉEL pré-S1 (fixture), ouvert un MERCREDI comme l'utilisateur (séance de lundi passée).
 * Prouve : Full body = ancienne semaine persistée conservée (pas une régénération S1) ; semaine suivante composée par
 * S1 ; reset explicite, confirmé, cohérent, jamais disponible hors Beta ; programme neuf composé par S1 ; aucune date
 * dupliquée ; aucun archétype hérité.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AppError, BETA0_PLANNING_VERSION, BETA0_RESET_CONFIRMATION, beta0Environment, beta0Integrity, decodeState, ensureBeta0Week, exportState,
  recordSessionExecution, resetBeta0Data, selectBeta0Week, startProgrammeSession,
} from '../src/index.js';
import type { AppState } from '../src/index.js';
import { clock } from './fixtures.js';
import { plannedSession, workSetsDone } from './executions.js';

const MON = '2026-10-05';
const WED = '2026-10-07';
const NEXT = '2026-10-12';
const pre = (): AppState => { const d = decodeState(readFileSync(new URL('./fixtures/pre-s1-state.json', import.meta.url), 'utf8')); if (!d.ok) throw new Error(d.problem); return d.state; };
const strength = (s: AppState, w: string) => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength').sort((a, b) => (a.date ?? 'z').localeCompare(b.date ?? 'z'));
const codes = (r: { reasons: readonly { code: string }[] }) => r.reasons.map((x) => x.code);
const exercises = (s: AppState, id: string) => plannedSession(s, id).blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items.map((i) => i.exerciseId));

describe('audit de l’état affiché (programme pré-S1 ouvert un mercredi)', () => {
  const s = ensureBeta0Week(pre(), clock(WED));

  it('Full body = ANCIENNE semaine persistée, conservée (séance de lundi passée) ; S1 ne l’a PAS régénérée', () => {
    expect(s.planner.weeks[MON]).toEqual(pre().planner.weeks[MON]);
    expect(s.planner.weeks[MON]?.planningVersion).toBeUndefined();
    expect(strength(s, MON).map((r) => [r.intent?.archetypeId, r.composition, codes(r).includes('PLAN.WEEK_COMPOSITION')])).toEqual(Array(4).fill(['str_full_body', undefined, false]));
    expect(selectBeta0Week(s, WED)?.planning).toMatchObject({ status: 'stale_kept', cause: 'past_sessions' });
    expect((s.programmeState?.audit ?? []).map((a) => a.reason.code)).not.toContain('KAIRO.WEEK_REPLANNED_STALE');
    expect(beta0Integrity(s)).toEqual([]);
  });

  it('semaine suivante : S1 réellement appelé — haut / bas / haut / bas, expositions prévues transmises (0, 1, 2, 3)', () => {
    const n = ensureBeta0Week(s, clock(NEXT));
    const rs = strength(n, NEXT);
    expect(rs.map((r) => r.intent?.archetypeId)).toEqual(['str_upper', 'str_lower', 'str_upper', 'str_lower']);
    expect(rs.every((r) => codes(r).includes('PLAN.WEEK_COMPOSITION') && codes(r).includes('PLAN.PLANNER.COMPOSITION_APPLIED'))).toBe(true);
    expect(rs.map((r) => r.reasons.find((x) => x.code === 'PLAN.PLANNER.WEEK_EXPOSURES')?.params.planned)).toEqual([0, 1, 2, 3]);
    expect(n.planner.weeks[NEXT]?.planningVersion).toBe(BETA0_PLANNING_VERSION);
    expect(beta0Integrity(n)).toEqual([]);
  });
});

describe('Recréer mon programme de test (Beta / dev)', () => {
  it('refusé sans confirmation explicite, et hors environnement Beta expérimental : état inchangé', () => {
    const s = ensureBeta0Week(pre(), clock(WED));
    expect(() => resetBeta0Data(s, clock(WED), 'oui')).toThrow(AppError);
    expect(() => resetBeta0Data(s, clock(WED), BETA0_RESET_CONFIRMATION, { ...beta0Environment(), mode: 'PRODUCTION', authority: 'production', simulation: [] })).toThrow('BETA_RESET_NOT_ALLOWED');
  });

  it('reset le LUNDI (profil actuel reproduit) : 4 séances Haut / Bas / Haut / Bas composées par S1, exercices réels, aucune donnée héritée', () => {
    const before = ensureBeta0Week(pre(), clock(MON, '06:00:00'));
    const s = resetBeta0Data(before, clock(MON, '09:00:00'), BETA0_RESET_CONFIRMATION);
    expect(s.profile).toEqual(pre().profile);
    expect(s.programmeState?.definition.programmeId).not.toBe(pre().programmeState?.definition.programmeId);
    expect(s.programmeState?.definition.sports.find((x) => x.sport === 'strength')).toMatchObject({ composition: 'engine' });
    expect(s.programmeState?.definition.sports.find((x) => x.sport === 'strength')?.intent.archetypeId).toBeUndefined();
    expect(Object.keys(s.planner.weeks)).toEqual([MON]);
    const rs = strength(s, MON);
    expect(rs.map((r) => [r.date, r.intent?.archetypeId, r.composition?.authority])).toEqual([
      ['2026-10-05', 'str_upper', 'provisional'], ['2026-10-07', 'str_lower', 'provisional'], ['2026-10-08', 'str_upper', 'provisional'], ['2026-10-09', 'str_lower', 'provisional'],
    ]);
    // Contenu réel persisté (session_record) : deux séances de même archétype restent différentes.
    const ex = rs.map((r) => exercises(s, r.requestId));
    expect(ex.every((e) => e.length > 0)).toBe(true);
    expect(ex[0]).not.toEqual(ex[2]);
    expect(ex[1]).not.toEqual(ex[3]);
    expect(selectBeta0Week(s, MON)?.sessions.filter((x) => x.sport === 'strength').every((x) => x.compositionRule === 'strength.rules.weeklyComposition@0.1.0-candidate' && x.dataError === null)).toBe(true);
    expect(s.planner.weeks[MON]?.planningVersion).toBe(BETA0_PLANNING_VERSION);
    expect(beta0Integrity(s)).toEqual([]);
    expect((s.programmeState?.audit ?? []).map((a) => a.reason.code)).toContain('KAIRO.BETA_DATA_RESET');
  });

  it('reset un MERCREDI : jours passés indisponibles (calendrier) — séances placées à partir d’aujourd’hui, les autres non planifiées avec leur raison', () => {
    const s = resetBeta0Data(ensureBeta0Week(pre(), clock(WED)), clock(WED, '09:00:00'), BETA0_RESET_CONFIRMATION);
    const v = selectBeta0Week(s, WED);
    expect(v?.sessions.filter((x) => x.date !== null).every((x) => (x.date ?? '') >= WED)).toBe(true);
    expect(v?.sessions.filter((x) => x.sport === 'strength' && x.date !== null).map((x) => x.archetypeId)).toEqual(['str_upper', 'str_lower']);
    expect(v?.sessions.filter((x) => x.status === 'not_planned').map((x) => x.notPlanned?.category)).toEqual(['slot_unavailable', 'slot_unavailable']);
    expect(beta0Integrity(s)).toEqual([]);
  });

  it('cohérence : semaine COMMENCÉE (séance enregistrée, séance en cours) entièrement effacée avec ses dépendances, jamais modifiée partiellement ; déclarations conservées', () => {
    const s0 = ensureBeta0Week(pre(), clock(MON));
    const id = strength(s0, MON)[0]?.requestId ?? '';
    const done = recordSessionExecution(s0, clock(MON, '18:00:00'), { requestId: id, sport: 'strength', completion: 'completed_as_prescribed', pain: 'NONE', sets: workSetsDone(s0, id) });
    const inProgress = startProgrammeSession(done, clock(WED), strength(done, MON)[1]?.requestId ?? '');
    expect(inProgress.strength.exposures.length).toBeGreaterThan(0);
    const s = resetBeta0Data(inProgress, clock(WED, '09:00:00'), BETA0_RESET_CONFIRMATION);
    expect([s.programmeState?.results, s.programmeLogs, s.strength.exposures, s.strength.tracks, s.fingerprints.strength]).toEqual([[], {}, [], [], []]);
    expect(s.running.realized.map((r) => r.sessionId)).toEqual(pre().running.realized.filter((r) => r.sessionId.startsWith('free:')).map((r) => r.sessionId));
    expect(s.planner.weeks[MON]?.requests.some((r) => r.requestId === id && r.intent?.archetypeId === 'str_full_body')).toBe(false);
    const audit = s.programmeState?.audit.find((a) => a.reason.code === 'KAIRO.BETA_DATA_RESET');
    expect(audit?.reason.params).toMatchObject({ results: 1, sessionsInProgress: 1 });
  });

  it('pause douleur active : conservée (le reset ne lève jamais une protection), aucune planification', () => {
    const s0 = ensureBeta0Week(pre(), clock(MON));
    const pained: AppState = { ...s0, safety: { activePain: { reportedAt: '2026-10-05T08:00:00Z' as never, areas: ['knee'] } } };
    const s = resetBeta0Data(pained, clock(MON, '09:00:00'), BETA0_RESET_CONFIRMATION);
    expect(s.safety).toEqual(pained.safety);
    expect(Object.keys(s.planner.weeks)).toEqual([]);
  });

  it('export / import après reset : identique', () => {
    const s = resetBeta0Data(ensureBeta0Week(pre(), clock(MON)), clock(MON, '09:00:00'), BETA0_RESET_CONFIRMATION);
    const d = decodeState(exportState(s));
    if (!d.ok) throw new Error(d.problem);
    expect(d.state).toEqual(s);
  });
});

describe('contrôle d’intégrité (jamais masqué)', () => {
  it('deux séances le même jour, date hors semaine, demande dans deux semaines : signalés précisément', () => {
    const s = ensureBeta0Week(pre(), clock(WED));
    const w = s.planner.weeks[MON];
    if (!w) throw new Error('semaine');
    const run = w.requests.find((r) => r.sport === 'running' && r.date === '2026-10-06');
    if (!run) throw new Error('course');
    const corrupted: AppState = { ...s, planner: { weeks: { ...s.planner.weeks, [MON]: { ...w, requests: w.requests.map((r) => (r === run ? { ...r, date: '2026-10-08' } : r)) } } } };
    expect(beta0Integrity(corrupted)).toEqual([{ code: 'SEVERAL_SESSIONS_SAME_DAY', date: '2026-10-08', requestIds: ['2026-10-05.strength.2', run.requestId] }]);
  });
});
