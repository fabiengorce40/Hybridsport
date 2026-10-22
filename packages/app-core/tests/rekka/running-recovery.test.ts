/**
 * REKKA — parcours Course (test réel Android, diagnostic `docs/kairo/REKKA-AUDIT-COURSE.md`) :
 * - sortie d'entraînement ≠ test chronométré ≠ compétition ; une sortie n'est jamais une référence maximale ;
 * - requalification CONFIRMÉE d'un chrono déclaré en sortie (historique conservé, sans doublon) ;
 * - nouvelle tentative CIBLÉE des séances de Course refusées de la semaine (rien d'autre ne bouge) ;
 * - programme évolutif guidé par l'effort perçu, sans performance maximale.
 */
import { describe, expect, it } from 'vitest';
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionRecord } from '@hybridsport/domain';
import {
  AppError, beta0Environment, BETA0_RESET_CONFIRMATION, createBeta0Programme, emptyState, ensureBeta0Week, logFreeRun, logTrainingRun, MemoryStorage, loadState,
  regenerateSession, requalifyAsTrainingRun, requalifyRunningPerformance, requestRunningTest, resetBeta0Data, retryRefusedRunning, RUNNING_SESSION_RETRIED,
  saveState, selectProgrammeSession, selectRunningProfile, sessionChanges, startProgrammeSession, STORAGE_KEY, UNKNOWN_CORE_STATE, weekReproducibility,
} from '../../src/index.js';
import type { AppState, DeclaredPerformance, ProfileInput } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';
import { at } from '../hr/hr-fixtures.js';
import { simulate } from '../rc4-audit/rc4-sim.js';

const env = beta0Environment();
const TODAY = '2026-10-21';
const WEEK = '2026-10-19';
const C = clock(TODAY);
const RUN = (o: Partial<ProfileInput['running']> = {}): ProfileInput['running'] => ({ enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: true, sessionsPerWeek: 2, returnState: 'NONE', ...o });
/** Profil du test réel : Musculation et Course 2×, « Courir régulièrement » sans date. */
const HYBRID: ProfileInput = { ...profile({ priorities: ['strength', 'running'], running: RUN() }), availability: [60, 60, 60, 60, 60, 90, 90] };
const RUNNER: ProfileInput = { ...HYBRID, priorities: ['running'], strength: { ...HYBRID.strength, enabled: false }, running: RUN({ sessionsPerWeek: 3 }) };
const perf = (o: Partial<Extract<DeclaredPerformance, { kind: 'TIME_TRIAL' | 'RACE_RESULT' }>>): DeclaredPerformance =>
  ({ kind: 'TIME_TRIAL', date: TODAY, distanceM: 5000, durationS: 1800, measuredCourse: true, conditions: 'NORMAL', interruptionSince: 'NONE', ...o }) as DeclaredPerformance;
/** Les deux « chronos » saisis lors du test réel : en fait deux sorties d'entraînement ordinaires. */
const SORTIE_5K = perf({ date: '2026-10-15', distanceM: 5000, durationS: 1800 });
const SORTIE_10K = perf({ date: '2026-08-14', distanceM: 10000, durationS: 3900 });

type Req = AppState['planner']['weeks'][string]['requests'][number];
const runs = (s: AppState, w = WEEK): Req[] => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'running');
const others = (s: AppState, w = WEEK): string => JSON.stringify((s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport !== 'running'));
const sessionOf = (r: Req): SessionRecord['session'] | undefined => { const d = r.record ? migrateToCurrent<SessionRecord>(r.record) : null; return d?.ok ? d.value.session : undefined; };
const steady = (r: Req) => sessionOf(r)?.blocks.flatMap((b) => b.items).map((i) => i.prescription).flatMap((p) => (p.type === 'run_structure' ? p.segments : [])).find((x) => x.kind === 'steady');
const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return e instanceof AppError ? e.code : String(e); } };
const real = (): AppState => createBeta0Programme(emptyState(), HYBRID, C, { performances: [SORTIE_5K, SORTIE_10K] });
const requalifyAll = (s0: AppState): AppState => s0.running.references.reduce((s, r) => requalifyRunningPerformance(s, C, r.referenceId, { confirmed: true }), s0);

describe('REKKA Course — cas réel (deux sorties saisies comme chronos)', () => {
  it('avant correction (diagnostic figé) : footings refusés faute de course réalisée ; la sortie de 5 km sert à tort d’ancre VO₂', () => {
    const s = real();
    expect(runs(s).map((r) => [r.status, r.cause?.params.cause])).toEqual([['refused', 'NO_REALIZED_SESSION'], ['refused', 'NO_REALIZED_SESSION']]);
    const v = selectRunningProfile(s, TODAY);
    expect(v?.severePace).toMatchObject({ status: 'pace', minSecPerKm: 349.2, maxSecPerKm: 370.8 });
    expect(v?.keySessions.threshold.status).toBe('available');
    expect(v?.plannedByGoal).toEqual({ threshold: false, severe: false });
  });

  it('aucune écriture sans confirmation explicite ; types non requalifiables refusés', () => {
    const s = real();
    const id = s.running.references[0]?.referenceId ?? '';
    const before = JSON.stringify(s);
    expect(code(() => requalifyAsTrainingRun(s, C, id, { confirmed: false }))).toBe('RUNNING_REQUALIFY_NOT_CONFIRMED');
    expect(code(() => requalifyAsTrainingRun(s, C, 'inconnue', { confirmed: true }))).toBe('RUNNING_REQUALIFY_UNAVAILABLE');
    expect(JSON.stringify(s)).toBe(before);
  });

  it('requalification : références conservées et marquées, deux sorties réalisées (dates réelles), plus aucune référence maximale', () => {
    const s0 = real();
    const s = requalifyAll(s0);
    expect(s.running.references).toEqual(s0.running.references);
    expect(Object.keys(s.running.requalified ?? {}).sort()).toEqual(s0.running.references.map((r) => r.referenceId).sort());
    expect(s.running.realized.map((r) => [r.completedAt.slice(0, 10), r.realizedDurationS, r.distanceM, r.unexpectedDifficulty])).toEqual([['2026-10-15', 1800, 5000, 'UNKNOWN'], ['2026-08-14', 3900, 10000, 'UNKNOWN']]);
    const v = selectRunningProfile(s, TODAY);
    expect(v?.references.every((r) => r.requalified !== null && !r.requalifiable && r.selectedFor.length === 0)).toBe(true);
    expect(v?.decisions.every((d) => d.selectedId === null)).toBe(true);
    expect(v?.severePace).toEqual({ status: 'effort', causes: ['ANCHOR_REFERENCE_MISSING'] });
    expect(v?.keySessions).toEqual({ threshold: { status: 'test_required' }, severe: { status: 'test_required' } });
    expect(v?.criticalSpeed).toEqual({ status: 'missing' });
    expect(code(() => requalifyAsTrainingRun(s, C, s0.running.references[0]?.referenceId ?? '', { confirmed: true }))).toBe('RUNNING_ALREADY_REQUALIFIED');
  });

  it('les deux séances bloquées sont générées et placées dans la semaine en cours : footings de 30 min à l’effort (RPE), rien d’autre ne bouge', () => {
    const s0 = real();
    const s = requalifyAll(s0);
    const r = runs(s);
    expect(r.map((x) => [x.status, x.intent?.archetypeId])).toEqual([['planned', 'running.easy'], ['planned', 'running.easy']]);
    expect(r.every((x) => (x.date ?? '') >= TODAY && (x.date ?? '') < '2026-10-26')).toBe(true);
    expect(new Set(r.map((x) => x.date)).size).toBe(2);
    for (const x of r) {
      expect(steady(x)).toMatchObject({ dose: { durationS: 1800 }, target: { domain: 'easy_low', priority: 'effort' } });
      expect(x.reasons.some((y) => y.code === RUNNING_SESSION_RETRIED)).toBe(true);
    }
    // Musculation et semaines existantes identiques, octet pour octet ; jours et programme cohérents.
    expect(others(s)).toBe(others(s0));
    const occupied = (s.planner.weeks[WEEK]?.requests ?? []).filter((x) => x.status === 'planned').map((x) => x.date);
    expect(new Set(occupied).size).toBe(occupied.length);
    for (const x of r) expect(s.planner.weeks[WEEK]?.days.find((d) => d.date === x.date)).toMatchObject({ status: 'planned', sport: 'running', requestId: x.requestId });
    expect(s.programmeState?.weeks.find((w) => w.plannerRef === WEEK)?.requests.filter((x) => x.sport === 'running').map((x) => x.status)).toEqual(['planned', 'planned']);
    expect(s.programmeState?.audit.filter((a) => a.reason.code === RUNNING_SESSION_RETRIED)).toHaveLength(2);
    // Reproductibles : régénération identique, diagnostic R-A sans divergence.
    for (const x of r) {
      const g = regenerateSession(s, x.requestId, UNKNOWN_CORE_STATE, env);
      expect(g.status === 'planned' && sessionChanges(selectProgrammeSession(s, x.requestId)?.session as never, g.record.session)).toEqual([]);
    }
    expect(weekReproducibility(s, WEEK, env, 'running').counts).toMatchObject({ identical: 2, planner_divergence: 0 });
  });

  it('séances placées réalisables : démarrage par le chemin de l’application', () => {
    const s = requalifyAll(real());
    const first = [...runs(s)].sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1))[0] as Req;
    const started = startProgrammeSession(s, at(`${first.date ?? ''}T17:00:00.000Z`), first.requestId, env);
    expect(started.programmeLogs[first.requestId]?.startedAt).toBeDefined();
  });

  it('sans doublon : une sortie déjà enregistrée (même jour, même durée) est seulement reliée', () => {
    let s = real();
    s = logFreeRun(s, { realizedDurationS: 1800, distanceM: 5000, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, completedOn: '2026-10-15' }, C);
    const n = s.running.realized.length;
    const ref = s.running.references.find((r) => r.date.startsWith('2026-10-15')) as AppState['running']['references'][number];
    s = requalifyAsTrainingRun(s, C, ref.referenceId, { confirmed: true });
    expect(s.running.realized).toHaveLength(n);
    expect(s.running.requalified?.[ref.referenceId]).toMatchObject({ link: 'existing', runId: s.running.realized[0]?.sessionId });
  });

  it('la sortie de 65 min reste dans l’historique mais, trop ancienne (> 8 semaines), ne sert jamais de base de durée', () => {
    let s = createBeta0Programme(emptyState(), HYBRID, C, { performances: [SORTIE_10K] });
    s = requalifyAll(s);
    expect(s.running.realized.map((r) => r.realizedDurationS)).toEqual([3900]);
    expect(runs(s).map((r) => [r.status, r.cause?.params.cause])).toEqual([['refused', 'NOT_RECENT'], ['refused', 'NOT_RECENT']]);
  });

  it('conservation : enregistrement / relecture identiques ; remise à zéro BÊTA conserve les requalifications', () => {
    const s = requalifyAll(real());
    const st = new MemoryStorage();
    expect(saveState(st, s).ok).toBe(true);
    const l = loadState(st, `${TODAY}T18:00:00.000Z`);
    expect(l.status).toBe('ok');
    if (l.status !== 'ok') return;
    expect(l.state.running.requalified).toEqual(s.running.requalified);
    expect(runs(l.state)).toEqual(runs(s));
    expect(st.getItem(STORAGE_KEY)).not.toBeNull();
    const reset = resetBeta0Data(s, C, BETA0_RESET_CONFIRMATION, env);
    expect(reset.running.requalified).toEqual(s.running.requalified);
    expect(runs(reset).every((r) => r.status === 'planned')).toBe(true);
  });

  it('séance commencée et jours passés jamais touchés ; pause douleur : aucune nouvelle tentative', () => {
    const s0 = real();
    const strength = (s0.planner.weeks[WEEK]?.requests ?? []).find((r) => r.sport === 'strength' && r.date === TODAY) as Req;
    const started = startProgrammeSession(s0, at(`${TODAY}T17:00:00.000Z`), strength.requestId, env);
    const s = requalifyAll(started);
    expect(s.programmeLogs[strength.requestId]).toEqual(started.programmeLogs[strength.requestId]);
    expect(runs(s).every((r) => r.status === 'planned' && (r.date ?? '') > TODAY)).toBe(true);
    const paused: AppState = { ...requalifyAsTrainingRun(s0, C, s0.running.references[0]?.referenceId ?? '', { confirmed: true }), safety: { activePain: { reportedAt: `${TODAY}T08:00:00Z` as never, areas: ['knee'] } } };
    expect(retryRefusedRunning(paused, C, env).placed).toEqual([]);
  });
});

describe('REKKA Course — chronos, sorties et tests', () => {
  it('un test chronométré récent (effort maximal confirmé) : allure VO₂ estimée ±3 %, séances clés autorisées ; footings après une sortie', () => {
    let s = createBeta0Programme(emptyState(), RUNNER, C, { performances: [perf({ date: '2026-10-08', durationS: 1350, maximalEffort: true })] });
    expect(s.running.references[0]?.confidenceInputs.maximalEffortDeclared).toBe(true);
    const v = selectRunningProfile(s, TODAY);
    expect(v?.severePace).toMatchObject({ status: 'pace', minSecPerKm: 261.9, maxSecPerKm: 278.1 });
    expect(v?.keySessions.threshold.status).toBe('available');
    expect(runs(s).every((r) => r.status === 'refused')).toBe(true);
    s = logTrainingRun(s, C, { date: '2026-10-18', durationS: 2400, distanceM: 6000, difficulty: 'AS_EXPECTED' });
    expect(runs(s).every((r) => r.status === 'planned')).toBe(true);
    expect(runs(s).map((r) => steady(r)?.dose)).toEqual(runs(s).map(() => ({ durationS: 2400 })));
  });

  it('deux chronos cohérents : aucun conflit, ancre VO₂ = le 3–5 km ; jamais de Critical Speed calculée', () => {
    const s = createBeta0Programme(emptyState(), RUNNER, C, { performances: [perf({ date: '2026-10-08', durationS: 1350, maximalEffort: true }), perf({ date: '2026-10-04', distanceM: 10000, durationS: 2820, maximalEffort: true })] });
    const v = selectRunningProfile(s, TODAY);
    expect(v?.conflicts).toEqual([]);
    const pace = v?.severePace;
    expect(pace?.status === 'pace' && v?.references.find((r) => r.referenceId === pace.referenceId)?.distanceM).toBe(5000);
    expect(v?.criticalSpeed).toEqual({ status: 'missing' });
  });

  it('deux chronos discordants à la même distance : conflit signalé, jamais l’allure la plus rapide', () => {
    const s = createBeta0Programme(emptyState(), RUNNER, C, { performances: [perf({ date: '2026-10-08', durationS: 1200, maximalEffort: true }), perf({ date: '2026-10-10', durationS: 1320, maximalEffort: true })] });
    const v = selectRunningProfile(s, TODAY);
    expect(v?.conflicts).toHaveLength(1);
    if (v?.severePace.status === 'pace') expect(v.severePace.minSecPerKm).toBeGreaterThan(240);
  });

  it('chronos anciens (> 16 semaines) : aucune allure, test récent demandé', () => {
    const s = createBeta0Programme(emptyState(), RUNNER, C, { performances: [perf({ date: '2026-05-01', durationS: 1350, maximalEffort: true })] });
    const v = selectRunningProfile(s, TODAY);
    expect(v?.severePace.status).toBe('effort');
    expect(v?.keySessions.threshold.status).toBe('test_required');
  });

  it('aucun chrono, une sortie d’entraînement à l’onboarding : footings planifiés, guidés par l’effort, aucune allure', () => {
    const s = createBeta0Programme(emptyState(), RUNNER, C, { trainingRuns: [{ date: '2026-10-15', durationS: 1800, distanceM: 5000 }] });
    expect(s.running.references).toEqual([]);
    expect(runs(s).map((r) => [r.status, steady(r)?.target])).toEqual(runs(s).map(() => ['planned', expect.objectContaining({ domain: 'easy_low', priority: 'effort' })]));
    expect(selectRunningProfile(s, TODAY)?.severePace).toEqual({ status: 'effort', causes: ['ANCHOR_REFERENCE_MISSING'] });
  });

  it('objectif sans date : programme continu, semaine suivante planifiée', () => {
    const s = createBeta0Programme(emptyState(), RUNNER, C, { trainingRuns: [{ date: '2026-10-15', durationS: 1800, distanceM: 5000 }] });
    expect(s.programmeState?.definition.goals.find((g) => g.sport === 'running')).not.toHaveProperty('targetDate');
    const n = ensureBeta0Week(s, at('2026-10-26T06:00:00.000Z'), env);
    expect(runs(n, '2026-10-26').map((r) => r.status)).toEqual(['planned', 'planned', 'planned']);
  });

  it('test chronométré demandé après une sortie avec distance : TEST programmé (jamais une sortie promue en record)', () => {
    let s = createBeta0Programme(emptyState(), RUNNER, C, { trainingRuns: [{ date: '2026-10-15', durationS: 1800, distanceM: 5000 }] });
    s = requestRunningTest(s, C, env);
    const test = s.programmeState?.assessments.find((a) => a.sport === 'running');
    expect(['scheduled', 'requested']).toContain(test?.status);
    expect(s.running.references).toEqual([]);
  });

  it('programme évolutif guidé par le RPE, sans performance maximale : la durée du footing progresse par pas minimal', () => {
    const r = simulate({ id: 'RPE', label: 'Course 3× sans chrono', profile: { ...RUNNER, running: RUN({ sessionsPerWeek: 3, wearable: false }) }, lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } }, 4, env);
    const weekly = Object.keys(r.state.planner.weeks).sort().map((w) => runs(r.state, w).map((x) => steady(x)?.dose));
    const first = weekly.map((w) => (w[0] as { durationS?: number } | undefined)?.durationS ?? 0);
    expect(first[0]).toBe(1800);
    for (let i = 1; i < first.length; i++) expect(first[i]).toBeGreaterThan(first[i - 1] as number);
    expect(r.state.running.references).toEqual([]);
  }, 600000);
});
