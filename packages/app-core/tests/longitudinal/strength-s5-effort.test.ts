/**
 * Strength S5 — EFFORT observé / inconnu, de la saisie à la progression, par le chemin réel de l'application (Beta 0).
 * Invariant : une absence de RIR n'est JAMAIS lue comme RIR 0 (saisie, persistance, rechargement, export / import,
 * expositions, preuve, tracks, audit, compaction). Les cas moteur pur (plusieurs expositions, arrondi, amélioration
 * sous le pas) sont dans `packages/strength/tests/longitudinal/evidence-longitudinal.test.ts` ; le parcours mobile réel
 * dans `apps/kairo/scripts/e2e.mjs` (E). Saisies TEST_ONLY.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AppError, beta0Environment, compactHistory, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, loadState, MemoryStorage, planProgrammeCurrentWeek,
  recordProgrammeSet, recordProgrammeSetEffort, recordSessionExecution, saveState, startProgrammeSession,
} from '../../src/index.js';
import type { AppState, PersistedWeek, ProfileInput, SetLog } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';
import { asPrescribed, drive, recordOf } from './s3-scenario.js';

const W = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'] as const;
const STRENGTH: ProfileInput = profile({ priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 }, availability: [60, 60, 60, 60, 60, 0, 0] });
type Req = PersistedWeek['requests'][number];
type Reason = { code: string; params: Record<string, unknown> };
const audit = (s: AppState): Reason[] => (s.programmeState?.audit ?? []).map((a) => a.reason);
const strengthReqs = (s: AppState, w: string): Req[] => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
const items = (r: Req) => (recordOf(r)?.session.blocks ?? []).filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);

// Semaine 1 réalisée avec effort observé, semaine 2 planifiée : l'ancre du premier exercice est déclarée.
const week1 = drive(createBeta0Programme(emptyState(), STRENGTH, clock(W[0]), {}), [W[0]]).final;
const W2 = ensureBeta0Week(week1, clock(W[1]));
const FIRST = strengthReqs(W2, W[1])[0] as Req;
const ANCHOR = items(FIRST).find((i) => i.refs?.anchor === 'declared');
if (!ANCHOR?.refs?.progressionTrackId) throw new Error('ancre déclarée attendue');
const TRACK_ID = ANCHOR.refs.progressionTrackId;
const ALL = asPrescribed(recordOf(FIRST)?.session as never);
const anchorSets = ALL.filter((x) => x.itemId === ANCHOR.id);
const others = ALL.filter((x) => x.itemId !== ANCHOR.id);
const withAnchor = (f: (x: SetLog) => SetLog, keep = anchorSets): SetLog[] => [...keep.map(f), ...others];

function exec(sets: readonly SetLog[], completion: 'completed_as_prescribed' | 'modified' | 'abandoned' = 'completed_as_prescribed', pain: 'NONE' | 'P2' = 'NONE') {
  const s = recordSessionExecution(W2, clock(FIRST.date ?? W[1], '18:00:00'), { requestId: FIRST.requestId, sport: 'strength', completion, pain, sets: [...sets] });
  const rs = audit(s).slice(audit(W2).length);
  return { s, ev: rs.find((r) => r.code === 'PROGRESSION.EXPOSURE_CLASSIFIED' && r.params.trackId === TRACK_ID)?.params, rs };
}

describe('saisie d’effort : RIR 0, 1, 2, 3, absent — jamais confondus', () => {
  it('1–4. RIR 0 / 1 / 2 / 3 saisis (cible 2) : effort OBSERVÉ, écart exact, classement du ruleset', () => {
    const at = (rir: number) => exec(withAnchor((x) => ({ ...x, rir }))).ev;
    expect(at(0)).toMatchObject({ effort: 'observed', rirDelta: '-2', exposure: 'below', kind: 'effort_harder' });
    expect(at(1)).toMatchObject({ effort: 'observed', rirDelta: '-1', exposure: 'on_target', kind: 'exact_effort_known' });
    expect(at(2)).toMatchObject({ effort: 'observed', rirDelta: '0', exposure: 'on_target', kind: 'exact_effort_known' });
    expect(at(3)).toMatchObject({ effort: 'observed', rirDelta: '+1', exposure: 'above', kind: 'better_rir' });
  });

  it('5. RIR absent : effort INCONNU, aucun écart calculé, jamais RIR 0 (exposition stockée sans RIR)', () => {
    const { s, ev } = exec(withAnchor(({ rir: _r, ...x }) => x));
    expect(ev).toMatchObject({ effort: 'unknown', rirDelta: 'n/a', rir: 'not_collected', kind: 'exact_effort_unknown' });
    const exposure = s.strength.exposures.filter((x) => x.exerciseId === ANCHOR.exerciseId).at(-1);
    expect(exposure?.sets.every((z) => z.rir === undefined)).toBe(true);
    // RIR 0 RÉELLEMENT saisi ≠ RIR absent : classement et preuve différents.
    expect(exec(withAnchor((x) => ({ ...x, rir: 0 }))).ev?.exposure).not.toBe(ev?.exposure);
  });
});

describe('preuve centralisée (verdict + signaux)', () => {
  it('7–15. exacte, reps dépassées, reps + RIR, charge +/−, série partielle, exercice abandonné, séance abandonnée, douleur', () => {
    expect(exec(ALL).ev).toMatchObject({ kind: 'exact_effort_known', success: 'exact' });
    expect(exec(withAnchor((x) => ({ ...x, reps: (x.reps ?? 0) + 2 }))).ev).toMatchObject({ kind: 'exceeded_reps', success: 'exceeded' });
    const both = exec(withAnchor((x) => ({ ...x, reps: (x.reps ?? 0) + 2, rir: (x.rir ?? 0) + 2 }))).ev;
    expect(both).toMatchObject({ kind: 'exceeded_reps', success: 'exceeded' });
    // Signaux combinés lisibles dans les écarts audités (aucune duplication de la liste de signaux dans l'audit).
    expect(both).toMatchObject({ repsDelta: '+2', rirDelta: '+2', effort: 'observed' });
    expect(exec(withAnchor((x) => ({ ...x, loadKg: (x.loadKg ?? 0) + 2.5 }))).ev).toMatchObject({ kind: 'load_higher', success: 'exceeded', loadDeltaKg: '+2.5' });
    expect(exec(withAnchor((x) => ({ ...x, loadKg: (x.loadKg ?? 0) - 10 }))).ev).toMatchObject({ kind: 'load_lower', success: 'none' });
    expect(exec(withAnchor((x) => x, anchorSets.slice(0, -1)), 'modified').ev).toMatchObject({ kind: 'partial_sets', success: 'none' });
    expect(exec(withAnchor((x) => x, []), 'modified').ev).toMatchObject({ kind: 'insufficient_data', success: 'none' });
    expect(exec(ALL.slice(0, 1), 'abandoned').ev).toMatchObject({ kind: 'session_abandoned', success: 'none' });
    expect(exec(ALL, 'completed_as_prescribed', 'P2').ev).toMatchObject({ kind: 'pain', success: 'none' });
    // Aucune progression sur une preuve non probante.
    for (const r of [exec(withAnchor((x) => ({ ...x, loadKg: (x.loadKg ?? 0) - 10 }))).rs, exec(ALL.slice(0, 1), 'abandoned').rs, exec(ALL, 'completed_as_prescribed', 'P2').rs]) {
      expect(r.some((x) => x.code === 'PROGRESSION.ADVANCED' && x.params.trackId === TRACK_ID)).toBe(false);
    }
  });
});

describe('saisie en séance, persistance, export', () => {
  const started = startProgrammeSession(W2, clock(FIRST.date ?? W[1], '17:00:00'), FIRST.requestId);
  const first = anchorSets[0] as SetLog;
  const done = recordProgrammeSet(started, clock(FIRST.date ?? W[1], '17:05:00'), FIRST.requestId, { itemId: first.itemId, setIndex: first.setIndex, done: true, reps: first.reps ?? 0, loadKg: first.loadKg ?? 0 });
  const logOf = (s: AppState) => s.programmeLogs[FIRST.requestId];

  it('16. RIR saisi puis modifié, puis effacé avant la fin : dernière valeur seule ; chrono jamais modifié', () => {
    const a = recordProgrammeSetEffort(done, FIRST.requestId, first.itemId, first.setIndex, 2);
    const b = recordProgrammeSetEffort(a, FIRST.requestId, first.itemId, first.setIndex, 3);
    expect(logOf(b)?.sets.find((x) => x.setIndex === first.setIndex && x.itemId === first.itemId)?.rir).toBe(3);
    expect(logOf(b)?.rest).toEqual(logOf(done)?.rest);
    const c = recordProgrammeSetEffort(b, FIRST.requestId, first.itemId, first.setIndex, null);
    expect(logOf(c)?.sets.find((x) => x.setIndex === first.setIndex && x.itemId === first.itemId)?.rir).toBeUndefined();
    // Garde : série non validée, valeur invalide.
    expect(() => recordProgrammeSetEffort(started, FIRST.requestId, first.itemId, first.setIndex, 2)).toThrow(AppError);
    expect(() => recordProgrammeSetEffort(done, FIRST.requestId, first.itemId, first.setIndex, -1)).toThrow(AppError);
    expect(() => recordProgrammeSetEffort(done, FIRST.requestId, first.itemId, first.setIndex, 1.5)).toThrow(AppError);
  });

  it('17–18. rechargement pendant la séance, export / import : RIR observé et effort inconnu conservés tels quels', () => {
    const s = recordProgrammeSetEffort(done, FIRST.requestId, first.itemId, first.setIndex, 0);
    const storage = new MemoryStorage();
    saveState(storage, s);
    const loaded = loadState(storage, '2026-10-12T17:10:00Z');
    if (loaded.status !== 'ok') throw new Error(loaded.status);
    expect(logOf(loaded.state)?.sets.find((x) => x.done)?.rir).toBe(0);
    const d = decodeState(exportState(s));
    if (!d.ok) throw new Error(d.problem);
    expect(d.state).toEqual(s);
    const unknown = decodeState(exportState(done));
    if (!unknown.ok) throw new Error(unknown.problem);
    expect(logOf(unknown.state)?.sets.find((x) => x.done)?.rir).toBeUndefined();
  });
});

describe('tracks, première exposition, réussites successives', () => {
  const runObserved = drive(createBeta0Programme(emptyState(), STRENGTH, clock(W[0]), {}), W);
  const runUnknown = drive(createBeta0Programme(emptyState(), STRENGTH, clock(W[0]), {}), W, () => 'as_prescribed', { effort: 'unknown' });
  const bench = (s: AppState) => s.strength.tracks.find((t) => t.exerciseId === 'ex.bench_press' && t.tier === 'anchor');

  it('19 / 22. exercice principal, première exposition : effort connu ⇒ e1RM observé ; inconnu ⇒ borne inférieure ; même charge suivante', () => {
    const o = drive(createBeta0Programme(emptyState(), STRENGTH, clock(W[0]), {}), [W[0]]).final;
    const u = drive(createBeta0Programme(emptyState(), STRENGTH, clock(W[0]), {}), [W[0]], () => 'as_prescribed', { effort: 'unknown' }).final;
    expect(bench(o)?.evidence?.e1rmBasis).toBe('observed');
    expect(bench(u)?.evidence?.e1rmBasis).toBe('lower_bound');
    expect(bench(o)?.e1rmKg ?? 0).toBeGreaterThan(bench(u)?.e1rmKg ?? 0);
    expect(bench(o)?.nextPrescription?.loadKg).toBe(bench(u)?.nextPrescription?.loadKg);
  });

  it('20. accessoire en double progression : progresse avec ou sans RIR (modèle inchangé)', () => {
    for (const r of [runObserved, runUnknown]) expect(audit(r.final).some((x) => x.code === 'PROGRESSION.ADVANCED' && x.params.variable === 'reps')).toBe(true);
  });

  it('21. poids du corps en haut de plage : méthode non gouvernée, effort qualifié (observé à la cible / inconnu)', () => {
    expect(audit(runObserved.final).find((x) => x.code === 'PROGRESSION.METHOD_UNGOVERNED')?.params.effort).toBe('at_target');
    expect(audit(runUnknown.final).find((x) => x.code === 'PROGRESSION.METHOD_UNGOVERNED')?.params.effort).toBe('unknown');
  });

  it('23–24. réussites exactes successives : mémorisées dans la track, l’arrondi empêche la hausse ⇒ BLOQUÉE tracée', () => {
    expect(bench(runObserved.final)?.evidence?.exactStreak ?? 0).toBeGreaterThanOrEqual(3);
    expect(bench(runObserved.final)?.nextPrescription?.loadKg).toBe(40);
    const blocked = audit(runObserved.final).filter((x) => x.code === 'PROGRESSION.DECISION_BLOCKED');
    expect(blocked.map((x) => x.params.exactStreak as number).some((n) => n >= 2)).toBe(true);
    expect(audit(runUnknown.final).some((x) => x.code === 'PROGRESSION.DECISION_BLOCKED' && x.params.situation === 'exact_success_effort_unknown')).toBe(true);
  });
});

describe('séances historiques pré-S5 et compaction', () => {
  const fixture = (f: string): AppState => { const d = decodeState(readFileSync(join(import.meta.dirname, '..', 'fixtures', f), 'utf8')); if (!d.ok) throw new Error(d.problem); return d.state; };

  it('6 / 27. état réel antérieur à S5 : valide, aucune migration vers RIR 0, effort inconnu ; la semaine suivante se génère', () => {
    const s = fixture('pre-s1-started-state.json');
    const sets = Object.values(s.programmeLogs).flatMap((l) => l.sets);
    expect(sets.length).toBeGreaterThan(0);
    const reloaded = decodeState(exportState(s));
    if (!reloaded.ok) throw new Error(reloaded.problem);
    expect(Object.values(reloaded.state.programmeLogs).flatMap((l) => l.sets).map((x) => x.rir)).toEqual(sets.map((x) => x.rir));
    expect(reloaded.state.strength.exposures.flatMap((x) => x.sets).every((z) => z.rir === undefined || typeof z.rir === 'number')).toBe(true);
    for (const t of reloaded.state.strength.tracks) expect(t.evidence).toBeUndefined();
    const next = ensureBeta0Week(s, clock(W[1]));
    expect(strengthReqs(next, W[1]).length).toBeGreaterThan(0);
  });

  it('28. compaction : efforts observés et inconnus intacts (expositions, tracks, audit), génération identique', () => {
    const full = drive(createBeta0Programme(emptyState(), STRENGTH, clock(W[0]), {}), W.slice(0, 3)).final;
    const compacted = compactHistory(full);
    expect(compacted.strength).toEqual(full.strength);
    expect(compacted.programmeState?.audit).toEqual(full.programmeState?.audit);
    expect(compacted.programmeLogs).toEqual(full.programmeLogs);
    const next = (s: AppState) => planProgrammeCurrentWeek(s, clock(W[3]), beta0Environment(), 3, { pastDaysUnavailable: true });
    expect(next(compacted).planner.weeks[W[3]]).toEqual(next(full).planner.weeks[W[3]]);
  });
});
