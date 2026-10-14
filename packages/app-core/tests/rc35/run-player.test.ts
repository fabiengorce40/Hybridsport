/**
 * RC3.5 — lecteur de séance Course. Audit des prescriptions RÉELLES du moteur Running (unités), puis lecteur :
 * transitions dérivées de l'horloge, pause / reprise, persistance (rechargement, interruption), étape en distance à
 * validation manuelle (jamais de durée déduite d'une allure), double validation, fin de séance jamais automatique,
 * contrôle avant séance et pause douleur réutilisés. Aucune prescription modifiée.
 */
import { describe, expect, it } from 'vitest';
import { executionSteps } from '@hybridsport/domain';
import {
  advanceRunPlayer, controlRunPlayer, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, finishProgrammeSession, runPlayerPosition,
  runPlayerSteps, selectBeta0Week, selectProgrammeSession, startProgrammeSession,
} from '../../src/index.js';
import type { AppState, ProfileInput } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
type Pop = ProfileInput['running']['population'];
type Goal = ProfileInput['running']['goal'];
const runner = (population: Pop, goal: Goal, wearable: boolean): ProfileInput => profile({
  priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
  running: { enabled: true, population, goal, wearable, sessionsPerWeek: 3, returnState: 'NONE' },
});
// technical-constant: TEST_ONLY — dernière course déclarée (s, m)
const LAST = { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' as const, distanceM: 5000 };
// technical-constant: TEST_ONLY — temps du test seul (s)
const TEST_TIME_S = 1200;
const runs = (s: AppState, today: string) => (selectBeta0Week(s, today)?.sessions ?? []).filter((x) => x.sport === 'running');
const byArchetype = (s: AppState, today: string, a: string) => {
  const x = runs(s, today).find((r) => r.archetypeId === a);
  if (!x?.date) throw new Error(`séance ${a} absente`);
  return { id: x.requestId, date: x.date };
};
const at = (date: string, s: number) => {
  const t = new Date(Date.parse(`${date}T08:00:00Z`) + s * 1000).toISOString().replace('.000Z', 'Z');
  return { today: date, now: t };
};
const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? (e as Error).message; } };
const reload = (s: AppState): AppState => { const d = decodeState(exportState(s)); if (!d.ok) throw new Error(d.problem); return d.state; };
const steps = (s: AppState, id: string) => {
  const v = selectProgrammeSession(s, id);
  const st = v ? runPlayerSteps(v) : null;
  if (!st) throw new Error('aucune étape');
  return st;
};
const pos = (s: AppState, id: string, nowIso: string) => runPlayerPosition(s.programmeLogs[id]?.runPlayer, steps(s, id), nowIso);
const blocks = (s: AppState, id: string) => JSON.stringify(selectProgrammeSession(s, id)?.session.blocks);

/** 5K : TEST la semaine 1 ; TEST fait ⇒ séance sévère avec allure la semaine 2. 10K sans montre : seuil à l'effort. */
function fiveK(): { s1: AppState; s2: AppState } {
  const s1 = createBeta0Programme(emptyState(), runner('P_R3', 'FIVE_K', true), clock(W1), { requestTest: true, lastRun: LAST });
  const t = byArchetype(s1, W1, 'running.test');
  let s = startProgrammeSession(s1, at(t.date, 0), t.id);
  s = finishProgrammeSession(s, at(t.date, 3600), { requestId: t.id, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 2400, testTimeS: TEST_TIME_S } });
  return { s1, s2: ensureBeta0Week(s, clock(W2)) };
}
function tenK(): AppState {
  const s1 = createBeta0Programme(emptyState(), runner('P_R2', 'TEN_K', false), clock(W1), { requestTest: true, lastRun: LAST });
  const t = byArchetype(s1, W1, 'running.test');
  let s = startProgrammeSession(s1, at(t.date, 0), t.id);
  s = finishProgrammeSession(s, at(t.date, 4200), { requestId: t.id, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 4200, testTimeS: 2700 } });
  return ensureBeta0Week(s, clock(W2));
}

describe('audit — prescriptions réellement produites par le moteur Running', () => {
  it('EASY, TEST, THRESHOLD (sans montre), SEVERE (allure) : toutes les étapes en durée, sauf le segment TEST en distance ; récupérations en durée', () => {
    const { s1, s2 } = fiveK();
    const s3 = tenK();
    const shape = (s: AppState, id: string) => steps(s, id).map((x) => `${x.key}:${'durationS' in x.dose ? `${String(x.dose.durationS)}s` : `${String(x.dose.distanceM)}m`}${x.recoveryMode ? `:${x.recoveryMode}` : ''}${x.target?.priority === 'pace' ? ':pace' : ''}`);
    expect(shape(s1, byArchetype(s1, W1, 'running.easy').id)).toEqual(['steady/1/1/single:1800s']);
    expect(shape(s1, byArchetype(s1, W1, 'running.test').id)).toEqual(['warmup/1/1/single:600s', 'test/1/1/single:5000m', 'cooldown/1/1/single:300s']);
    expect(shape(s3, byArchetype(s3, W2, 'running.threshold').id)).toEqual([
      'warmup/1/1/single:600s', 'work/1/1/work:300s', 'work/1/1/recovery:60s:jog', 'work/1/2/work:300s', 'work/1/2/recovery:60s:jog', 'work/1/3/work:300s', 'cooldown/1/1/single:300s',
    ]);
    expect(shape(s2, byArchetype(s2, W2, 'running.severe').id)).toEqual([
      'warmup/1/1/single:600s', 'work/1/1/work:240s:pace', 'work/1/1/recovery:180s:jog', 'work/1/2/work:240s:pace', 'work/1/2/recovery:180s:jog', 'work/1/3/work:240s:pace',
      'work/1/3/recovery:180s:jog', 'work/1/4/work:240s:pace', 'cooldown/1/1/single:300s',
    ]);
    // Le segment en distance du TEST porte une allure OBSERVÉE (borne d'estimation, priorité effort) : jamais une cible.
    const test = steps(s1, byArchetype(s1, W1, 'running.test').id)[1];
    expect(test?.target).toMatchObject({ priority: 'effort', pace: { provenance: { source: 'observed_athlete_range' } } });
  });
});

describe('lecteur — transitions, pause, persistance', () => {
  it('séance de seuil : enchaînement des étapes en durée dérivé de l’horloge ; temps restant ; toutes passées ≠ séance terminée', () => {
    const s0 = tenK();
    const { id, date } = byArchetype(s0, W2, 'running.threshold');
    let s = startProgrammeSession(s0, at(date, 0), id);
    const before = blocks(s, id);
    expect(pos(s, id, at(date, 30).now)).toMatchObject({ started: false, running: false, index: 0, remainingS: 600 });
    s = controlRunPlayer(s, at(date, 30), id, 'start');
    expect(pos(s, id, at(date, 30 + 599).now)).toMatchObject({ index: 0, remainingS: 1, running: true });
    expect(pos(s, id, at(date, 30 + 600).now)).toMatchObject({ index: 1, elapsedInStepS: 0, remainingS: 300, step: { key: 'work/1/1/work' }, next: { key: 'work/1/1/recovery' } });
    expect(pos(s, id, at(date, 30 + 905).now)).toMatchObject({ index: 2, remainingS: 55, step: { recoveryMode: 'jog' } });
    // Total : 600 + 3 × 300 + 2 × 60 + 300 = 1920 s.
    const end = pos(s, id, at(date, 30 + 1920).now);
    expect(end).toMatchObject({ index: 7, step: null, next: null, allStepsPassed: true, activeS: 1920 });
    // Rien n'est enregistré : aucun résultat, journal non terminé.
    expect(selectProgrammeSession(s, id)?.result).toBeNull();
    expect(s.programmeLogs[id]?.finishedAt).toBeUndefined();
    expect(blocks(s, id)).toBe(before);
  });

  it('pause / reprise : temps figé pendant la pause, reprise au même point ; commandes idempotentes', () => {
    const s0 = tenK();
    const { id, date } = byArchetype(s0, W2, 'running.threshold');
    let s = controlRunPlayer(startProgrammeSession(s0, at(date, 0), id), at(date, 0), id, 'start');
    s = controlRunPlayer(s, at(date, 700), id, 'pause');
    expect(controlRunPlayer(s, at(date, 710), id, 'pause')).toBe(s);
    expect(pos(s, id, at(date, 5000).now)).toMatchObject({ running: false, started: true, index: 1, elapsedInStepS: 100, remainingS: 200, activeS: 700 });
    s = controlRunPlayer(s, at(date, 5000), id, 'resume');
    expect(controlRunPlayer(s, at(date, 5001), id, 'start')).toBe(s);
    expect(pos(s, id, at(date, 5200).now)).toMatchObject({ running: true, index: 2, elapsedInStepS: 0, activeS: 900 });
  });

  it('rechargement, verrouillage ou interruption : position recalculée depuis l’horodatage (état exporté puis relu)', () => {
    const s0 = tenK();
    const { id, date } = byArchetype(s0, W2, 'running.threshold');
    const s = controlRunPlayer(startProgrammeSession(s0, at(date, 0), id), at(date, 0), id, 'start');
    const r = reload(s);
    expect(r.programmeLogs[id]?.runPlayer).toEqual(s.programmeLogs[id]?.runPlayer);
    expect(pos(r, id, at(date, 1250).now)).toEqual(pos(s, id, at(date, 1250).now));
    expect(pos(r, id, at(date, 1250).now)).toMatchObject({ index: 3, elapsedInStepS: 290 });
    // Journal antérieur à RC3.5 (sans lecteur) : relu tel quel, lecteur en attente de départ.
    const legacy = startProgrammeSession(s0, at(date, 0), id);
    expect(reload(legacy).programmeLogs[id]?.runPlayer).toBeUndefined();
    expect(pos(reload(legacy), id, at(date, 99).now)).toMatchObject({ started: false, index: 0 });
  });
});

describe('lecteur — étape en distance, étape suivante, double validation', () => {
  it('TEST : l’étape en distance ne se termine JAMAIS seule (aucune durée déduite d’une allure) ; validation manuelle tracée avec le temps écoulé', () => {
    const s0 = createBeta0Programme(emptyState(), runner('P_R3', 'FIVE_K', true), clock(W1), { requestTest: true, lastRun: LAST });
    const { id, date } = byArchetype(s0, W1, 'running.test');
    let s = controlRunPlayer(startProgrammeSession(s0, at(date, 0), id), at(date, 0), id, 'start');
    // 10 heures plus tard : toujours sur le test, temps écoulé seulement.
    expect(pos(s, id, at(date, 36000).now)).toMatchObject({ index: 1, remainingS: null, elapsedInStepS: 35400, step: { key: 'test/1/1/single', dose: { distanceM: 5000 } } });
    s = advanceRunPlayer(s, at(date, 600 + TEST_TIME_S), id, 'test/1/1/single');
    expect(s.programmeLogs[id]?.runPlayer?.marks).toEqual([{ key: 'test/1/1/single', end: 'distance_validated', elapsedS: TEST_TIME_S, at: at(date, 600 + TEST_TIME_S).now }]);
    expect(pos(s, id, at(date, 600 + TEST_TIME_S + 10).now)).toMatchObject({ index: 2, remainingS: 290, step: { key: 'cooldown/1/1/single' } });
    expect(selectProgrammeSession(s, id)?.result).toBeNull();
  });

  it('double validation : un second appui sur la même étape, ou sur une étape déjà passée par l’échéance, ne change rien', () => {
    const s0 = tenK();
    const { id, date } = byArchetype(s0, W2, 'running.threshold');
    let s = controlRunPlayer(startProgrammeSession(s0, at(date, 0), id), at(date, 0), id, 'start');
    // Échauffement passé avant son échéance : tracé « passée ».
    s = advanceRunPlayer(s, at(date, 120), id, 'warmup/1/1/single');
    expect(advanceRunPlayer(s, at(date, 121), id, 'warmup/1/1/single')).toBe(s);
    expect(pos(s, id, at(date, 121).now)).toMatchObject({ index: 1, elapsedInStepS: 1 });
    expect(s.programmeLogs[id]?.runPlayer?.marks).toEqual([{ key: 'warmup/1/1/single', end: 'skipped', elapsedS: 120, at: at(date, 120).now }]);
    // Répétition 1 terminée par l'échéance pendant que l'utilisateur appuie : appui sans effet.
    expect(advanceRunPlayer(s, at(date, 120 + 305), id, 'work/1/1/work')).toBe(s);
    // Étape suivante en pause : la position avance, le chrono reste en pause.
    s = controlRunPlayer(s, at(date, 130), id, 'pause');
    s = advanceRunPlayer(s, at(date, 140), id, 'work/1/1/work');
    expect(pos(s, id, at(date, 999).now)).toMatchObject({ running: false, index: 2, elapsedInStepS: 0 });
  });
});

describe('lecteur — fin de séance, refus, sécurité', () => {
  it('fin de séance déclarée seulement par l’utilisateur ; lecteur figé ; aucune commande après la fin', () => {
    const s0 = tenK();
    const { id, date } = byArchetype(s0, W2, 'running.threshold');
    let s = controlRunPlayer(startProgrammeSession(s0, at(date, 0), id), at(date, 0), id, 'start');
    s = finishProgrammeSession(s, at(date, 1000), { requestId: id, completion: 'modified', pain: false, run: { realizedDurationS: 1000 } });
    expect(s.programmeLogs[id]?.runPlayer).toMatchObject({ runningSince: null, accumulatedS: 1000 });
    expect(selectProgrammeSession(s, id)?.result?.completion).toBe('modified');
    expect(code(() => controlRunPlayer(s, at(date, 1001), id, 'resume'))).toBe('SESSION_FINISHED');
    expect(code(() => advanceRunPlayer(s, at(date, 1001), id, 'work/1/2/work'))).toBe('SESSION_FINISHED');
  });

  it('séance non commencée, contrôle avant séance (douleur ⇒ pause, aucun départ), pause douleur active : lecteur indisponible', () => {
    const s0 = tenK();
    const { id, date } = byArchetype(s0, W2, 'running.threshold');
    expect(code(() => controlRunPlayer(s0, at(date, 0), id, 'start'))).toBe('SESSION_NOT_STARTED');
    const paused = startProgrammeSession(s0, at(date, 0), id, undefined, { painAnswer: 'yes', pains: [], generalSignal: true });
    expect(paused.programmeLogs[id]).toBeUndefined();
    expect(code(() => controlRunPlayer(paused, at(date, 0), id, 'start'))).toBe('SESSION_NOT_STARTED');
    expect(code(() => startProgrammeSession(paused, at(date, 60), id))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });

  it('douleur locale au contrôle (genou P2) : séance ADAPTÉE par le contrôle existant ; le lecteur déroule la séance adaptée (exercice remplacé), jamais la planifiée', () => {
    const s0 = tenK();
    const { id, date } = byArchetype(s0, W2, 'running.threshold');
    const planned = steps(s0, id);
    const s = startProgrammeSession(s0, at(date, 0), id, undefined, { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }] });
    const v = selectProgrammeSession(s, id);
    expect(s.checkIns.at(-1)?.decision).toBe('adapted');
    expect(v?.adaptation).not.toBeNull();
    const run = v?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'run_structure')?.prescription;
    expect(run?.type).toBe('run_structure');
    expect(v ? runPlayerSteps(v) : null).toEqual(run?.type === 'run_structure' ? executionSteps(run) : null);
    // Exclusion douleur existante : la course est remplacée par l'exercice retenu par le moteur (rameur), même structure.
    expect(v?.adaptation?.changes).toEqual(['removed:ex.easy_run', 'added:ex.row_erg']);
    expect(v?.session.blocks[0]?.items[0]?.exerciseId).toBe('ex.row_erg');
    expect(steps(s, id)).toEqual(planned);
  });

  it('séance d’un autre sport : lecteur indisponible ; prescriptions jamais modifiées par le lecteur', () => {
    const p = profile({ priorities: ['strength'], running: { enabled: false, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } });
    const s0 = createBeta0Programme(emptyState(), p, clock(W1), {});
    const x = (selectBeta0Week(s0, W1)?.sessions ?? []).find((r) => r.sport === 'strength' && r.date !== null);
    if (!x?.date) throw new Error('séance de musculation absente');
    const s = startProgrammeSession(s0, at(x.date, 0), x.requestId);
    expect(code(() => controlRunPlayer(s, at(x.date ?? '', 0), x.requestId, 'start'))).toBe('RUN_PLAYER_UNAVAILABLE');
    const v = selectProgrammeSession(s, x.requestId);
    expect(v ? runPlayerSteps(v) : 'none').toBeNull();
  });
});
