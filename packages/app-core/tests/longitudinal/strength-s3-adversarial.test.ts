/**
 * Strength S3 — 26 cas adverses, par le chemin réel de l'application (Beta 0). Critère commun : AUCUN cas ne produit
 * silencieusement une progression injustifiée (toute progression suit une exposition `on_target` / `above` tracée), et
 * aucune charge n'est héritée d'un autre exercice sans conversion gouvernée.
 *
 * Base : Strength seul (hypertrophie, 4 / semaine, intermédiaire, salle complète), semaine 1 réalisée comme prescrit
 * (tracks créées), semaine 2 planifiée. Saisies TEST_ONLY (s3-scenario.ts).
 */
import { describe, expect, it } from 'vitest';
import {
  BETA0_PLANNING_VERSION, clearPain, closeProgrammeWeekInApp, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, EQUIPMENT_PRESETS, exportState, finishProgrammeSession, loadState,
  MemoryStorage, recordProgrammeSet, recordSessionExecution, recreateBeta0Programme, saveState, startProgrammeSession,
} from '../../src/index.js';
import type { AppState, PersistedWeek, ProfileInput, SetLog } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';
import { asPrescribed, drive, recordOf } from './s3-scenario.js';

const W = ['2026-10-05', '2026-10-12', '2026-10-19'] as const;
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
const INPUT: ProfileInput = profile({ priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 }, availability: [60, 60, 60, 60, 60, 0, 0] });
type Reason = { code: string; params: Record<string, unknown> };
type Req = PersistedWeek['requests'][number];

const week1 = drive(createBeta0Programme(emptyState(), INPUT, clock(W[0]), {}), [W[0]]).final;
const W2 = ensureBeta0Week(week1, clock(W[1]));

const strengthReqs = (s: AppState, w: string): Req[] => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
const sessionOf = (r: Req) => { const rec = recordOf(r); if (!rec) throw new Error(r.requestId); return rec.session; };
const mainItems = (r: Req) => sessionOf(r).blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const FIRST = strengthReqs(W2, W[1])[0] as Req;
const ANCHOR = mainItems(FIRST).find((i) => i.refs?.anchor === 'declared');
if (!ANCHOR?.refs?.progressionTrackId) throw new Error('ancre déclarée attendue en semaine 2');
const TRACK_ID = ANCHOR.refs.progressionTrackId;
const ALL = asPrescribed(sessionOf(FIRST));
const anchorSets = ALL.filter((x) => x.itemId === ANCHOR.id);
const others = ALL.filter((x) => x.itemId !== ANCHOR.id);

const auditSince = (before: AppState, after: AppState): Reason[] => (after.programmeState?.audit ?? []).slice(before.programmeState?.audit.length ?? 0).map((a) => a.reason);
const track = (s: AppState, id = TRACK_ID) => s.strength.tracks.find((t) => t.trackId === id);
const of = (rs: readonly Reason[], id = TRACK_ID) => rs.filter((r) => r.params.trackId === id).map((r) => (r.code === 'PROGRESSION.EXPOSURE_CLASSIFIED' ? `exposure:${String(r.params.exposure)}` : r.code === 'PROGRESSION.HELD' ? `held:${String(r.params.cause)}` : r.code));

/** Critère commun : toute progression suit, pour la même track, une exposition probante (on_target / above). */
function noUnjustifiedProgression(rs: readonly Reason[]) {
  const ok = new Set<string>();
  for (const r of rs) {
    if (r.code === 'PROGRESSION.EXPOSURE_CLASSIFIED') { if (r.params.exposure === 'on_target' || r.params.exposure === 'above') ok.add(String(r.params.trackId)); else ok.delete(String(r.params.trackId)); }
    if (r.code === 'PROGRESSION.ADVANCED') expect([r.params.trackId, ok.has(String(r.params.trackId))]).toEqual([r.params.trackId, true]);
  }
}
function exec(s: AppState, sets: readonly SetLog[], completion: 'completed_as_prescribed' | 'modified' | 'abandoned' = 'completed_as_prescribed', pain: 'NONE' | 'P2' = 'NONE', r: Req = FIRST): { s: AppState; rs: Reason[] } {
  const next = recordSessionExecution(s, clock(r.date ?? W[1], '18:00:00'), { requestId: r.requestId, sport: 'strength', completion, pain, sets: [...sets] });
  const rs = auditSince(s, next);
  noUnjustifiedProgression(rs);
  return { s: next, rs };
}
const withAnchor = (f: (x: SetLog, i: number) => SetLog) => [...anchorSets.map(f), ...others];
// technical-constant: TEST_ONLY — dernière course déclarée lors de l'ajout de Running (durée s, distance m)
const LAST_RUN = { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' as const };
const recreate = (s: AppState, input: Partial<ProfileInput>, day: string = W[1]) => recreateBeta0Programme(s, { ...(s.profile as ProfileInput), ...input }, clock(day, '06:00:00'), input.running?.enabled ? { lastRun: LAST_RUN } : {});
// Toute la trace d'audit du programme courant (une modification crée un nouveau programme, audit compris).
const fullAudit = (s: AppState): Reason[] => (s.programmeState?.audit ?? []).map((a) => a.reason);
const anchorExercises = (s: AppState, w: string) => strengthReqs(s, w).flatMap((r) => mainItems(r).filter((i) => i.refs?.anchor === 'declared').map((i) => `${r.intent?.archetypeId}:${i.refs?.slotId}:${i.exerciseId}`)).sort();

describe('Strength S3 — cas adverses (réalisation)', () => {
  it('1. séance entièrement réalisée : exposition probante, décision du modèle tracée', () => {
    const { rs } = exec(W2, ALL);
    expect(of(rs)[0]).toBe('exposure:on_target');
  });

  it('2. séries partielles : jamais une progression', () => {
    const { s, rs } = exec(W2, [...anchorSets.slice(0, -1), ...others], 'modified');
    expect(of(rs)).not.toContain('PROGRESSION.ADVANCED');
    expect(['exposure:partial', 'exposure:below']).toContain(of(rs)[0]);
    expect(track(s)?.nextPrescription).toEqual(track(W2)?.nextPrescription);
  });

  it('3. répétitions supérieures à la cible : exposition probante (jamais une baisse)', () => {
    const { s, rs } = exec(W2, withAnchor((x) => ({ ...x, reps: (x.reps ?? 0) + 2 })));
    expect(['exposure:on_target', 'exposure:above']).toContain(of(rs)[0]);
    expect(track(s)?.nextPrescription?.loadKg ?? 0).toBeGreaterThanOrEqual(track(W2)?.nextPrescription?.loadKg ?? 0);
  });

  it('4. répétitions inférieures : échec classé, aucune progression', () => {
    const { s, rs } = exec(W2, withAnchor((x) => ({ ...x, reps: Math.max(1, (x.reps ?? 0) - 3) })));
    expect(of(rs)[0]).toBe('exposure:below');
    expect(of(rs)).not.toContain('PROGRESSION.ADVANCED');
    expect(track(s)?.consecutiveBelow).toBe((track(W2)?.consecutiveBelow ?? 0) + 1);
  });

  it('5. charge inférieure à la prescription : exposition NON probante (load_deviation), prescription inchangée', () => {
    const { s, rs } = exec(W2, withAnchor((x) => ({ ...x, loadKg: (x.loadKg ?? 0) - 10 })));
    expect(of(rs)).toEqual(['exposure:load_deviation', 'held:load_deviation']);
    expect(track(s)).toEqual(track(W2));
  });

  it('6. RIR saisi bien plus bas que la cible : échec classé, aucune progression', () => {
    const { rs } = exec(W2, withAnchor((x) => ({ ...x, rir: 0 })));
    expect(of(rs)[0]).toBe('exposure:below');
    expect(of(rs)).not.toContain('PROGRESSION.ADVANCED');
  });

  it('7. séance modifiée mais tout réalisé : classement selon les séries réelles', () => {
    const { rs } = exec(W2, ALL, 'modified');
    expect(of(rs)[0]).toBe('exposure:on_target');
  });

  it('8. séance abandonnée : interruption, jamais un échec ni une progression', () => {
    const { s, rs } = exec(W2, ALL.slice(0, 1), 'abandoned');
    expect(rs.filter((r) => r.code === 'PROGRESSION.ADVANCED' || r.code === 'PROGRESSION.REGRESSED')).toEqual([]);
    expect(of(rs)[0]).toBe('exposure:interrupted');
    expect(track(s)?.consecutiveBelow).toBe(track(W2)?.consecutiveBelow);
  });

  it('9. séance manquée : aucune réalisation, tracks inchangées après clôture', () => {
    const closed = closeProgrammeWeekInApp(W2, clock(W[2]));
    expect(closed.strength.tracks).toEqual(W2.strength.tracks);
    expect(closed.programmeState?.results.filter((r) => r.completion === 'missed').length).toBe(strengthReqs(W2, W[1]).length);
  });

  it('10. douleur déclarée pour la séance (chemin UI) : toutes les tracks touchées SUSPENDUES ; reprise à la frontière après levée', () => {
    let s = startProgrammeSession(W2, clock(FIRST.date ?? W[1], '17:00:00'), FIRST.requestId);
    for (const x of ALL) s = recordProgrammeSet(s, clock(FIRST.date ?? W[1], '17:30:00'), FIRST.requestId, x);
    const done = finishProgrammeSession(s, clock(FIRST.date ?? W[1], '18:00:00'), { requestId: FIRST.requestId, completion: 'completed_as_prescribed', pain: true });
    const rs = auditSince(s, done);
    noUnjustifiedProgression(rs);
    expect(of(rs)).toEqual(['exposure:pain', 'PROGRESSION.SUSPENDED']);
    expect(rs.some((r) => r.code === 'PROGRESSION.ADVANCED')).toBe(false);
    expect(track(done)?.status).toBe('suspended');
    // Pause douleur : aucune nouvelle semaine ; après levée explicite, la frontière reprend la track (tracé).
    const closed = closeProgrammeWeekInApp(done, clock(W[2]));
    expect(ensureBeta0Week(closed, clock(W[2])).planner.weeks[W[2]]).toBeUndefined();
    const resumed = ensureBeta0Week(clearPain(closed, clock(W[2])), clock(W[2]));
    expect(track(resumed)?.status).toBe('active');
    expect(auditSince(closed, resumed).filter((r) => r.code === 'PROGRESSION.RESUMED').map((r) => r.params.trackId)).toContain(TRACK_ID);
  });
});

describe('Strength S3 — cas adverses (contexte et programme)', () => {
  const closed = closeProgrammeWeekInApp(exec(W2, ALL).s, clock(W[2]));
  const anchorExercise = ANCHOR.exerciseId;

  it('11 / 23 / 24. matériel retiré ou exercice exclu : track clôturée « inadmissible » (tracée), remplaçant SANS charge héritée', () => {
    for (const change of [{ excludedExercises: [anchorExercise] }, { equipment: { presetId: 'preset.full_gym', items: fullGym.filter((q) => !q.includes('barbell')) } }]) {
      const s = ensureBeta0Week(recreate(closed, change, W[2]), clock(W[2]));
      expect(track(s)?.status).toBe('closed');
      expect(fullAudit(s).some((r) => r.code === 'PROGRESSION.TRACK_CLOSED' && r.params.trackId === TRACK_ID && r.params.cause === 'inadmissible')).toBe(true);
      const items = strengthReqs(s, W[2]).flatMap(mainItems);
      expect(items.map((i) => i.exerciseId)).not.toContain(anchorExercise);
      // Emplacement de l'ancre clôturée : aucune track appliquée, aucune charge reprise de l'ancien exercice.
      const slot = items.filter((i) => i.refs?.slotId === ANCHOR.refs?.slotId);
      for (const i of slot) { expect(i.refs?.progressionTrackId).not.toBe(TRACK_ID); expect(i.refs?.prescriptionSource).not.toBe('track'); }
    }
  });

  it('12. nouvel équipement : les ancres admissibles sont conservées (aucun changement « pour la nouveauté »)', () => {
    const before = ensureBeta0Week(closed, clock(W[2]));
    const s = ensureBeta0Week(recreate(closed, { equipment: { presetId: 'preset.full_gym', items: [...fullGym, 'eq.unknown_new_item'].filter((x, i, a) => a.indexOf(x) === i) } }, W[2]), clock(W[2]));
    expect(anchorExercises(s, W[2])).toEqual(anchorExercises(before, W[2]));
  });

  it('13. changement de disponibilité : tracks inchangées par la modification, ancres déclarées conservées', () => {
    const s = recreate(closed, { availability: [60, 0, 60, 60, 0, 60, 60] }, W[2]);
    expect(s.strength).toEqual(closed.strength);
    const n = ensureBeta0Week(s, clock(W[2]));
    for (const a of anchorExercises(n, W[2])) expect(a).toMatch(/^str_/);
  });

  it('14 / 15. Running ajouté puis retiré : historique Strength conservé, aucune progression appliquée par la modification', () => {
    const added = recreate(closed, { priorities: ['strength', 'running'], running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' }, availability: [60, 45, 60, 45, 60, 90, 75] }, W[2]);
    expect(added.strength).toEqual(closed.strength);
    const n = ensureBeta0Week(added, clock(W[2]));
    // Running demandé par le programme (planifié, ou refusé fail-closed par SON moteur avec une raison tracée) ;
    // la musculation reste planifiée avec ses ancres.
    const running = (n.planner.weeks[W[2]]?.requests ?? []).filter((r) => r.sport === 'running');
    expect(running.length).toBe(2);
    for (const r of running) expect(r.status === 'planned' || r.reasons.length > 0).toBe(true);
    expect(anchorExercises(n, W[2]).length).toBeGreaterThan(0);
    const removed = recreate(n, { priorities: ['strength'], running: { ...INPUT.running, enabled: false } }, W[2]);
    expect(removed.strength).toEqual(n.strength);
  });

  it('16 / 17. fréquence ou objectif Strength modifiés : tracks conservées, aucune charge modifiée par la modification', () => {
    for (const change of [{ strength: { enabled: true, goal: 'hypertrophy' as const, sessionsPerWeek: 3 } }, { strength: { enabled: true, goal: 'strength' as const, sessionsPerWeek: 4 } }]) {
      const s = recreate(closed, change, W[2]);
      expect(s.strength).toEqual(closed.strength);
      const n = ensureBeta0Week(s, clock(W[2]));
      expect(auditSince(s, n).filter((r) => r.code === 'PROGRESSION.ADVANCED')).toEqual([]);
    }
  });

  it('18 / 19. export / import et rechargement entre deux semaines : semaine suivante identique', () => {
    const direct = ensureBeta0Week(closed, clock(W[2]));
    const d = decodeState(exportState(closed));
    if (!d.ok) throw new Error(d.problem);
    expect(ensureBeta0Week(d.state, clock(W[2])).planner.weeks[W[2]]).toEqual(direct.planner.weeks[W[2]]);
    const storage = new MemoryStorage();
    saveState(storage, closed);
    const loaded = loadState(storage, `${W[2]}T06:00:00Z`);
    expect(ensureBeta0Week(loaded.state, clock(W[2])).planner.weeks[W[2]]).toEqual(direct.planner.weeks[W[2]]);
  });

  it('20. même graine : même état ⇒ mêmes séances ; graine Strength indépendante de la date', () => {
    const a = ensureBeta0Week(closed, clock(W[2]));
    const b = ensureBeta0Week(closed, clock(W[2]));
    expect(a.planner.weeks[W[2]]).toEqual(b.planner.weeks[W[2]]);
    const seeds = (s: AppState, w: string) => strengthReqs(s, w).map((r) => recordOf(r)?.provenance.seed);
    expect(seeds(a, W[2])).toEqual(seeds(W2, W[1]));
  });

  it('21. historique absent : première exposition en calibration, aucune track, aucune progression', () => {
    const s = createBeta0Programme(emptyState(), INPUT, clock(W[0]), {});
    expect(s.strength.tracks).toEqual([]);
    const items = strengthReqs(s, W[0]).flatMap(mainItems);
    expect(items.every((i) => i.refs?.prescriptionSource === 'calibration' || i.refs?.prescriptionSource === 'base_profile')).toBe(true);
    expect(items.some((i) => i.refs?.anchor === 'declared')).toBe(false);
  });

  it('22. historique incomplet (charges non saisies) : aucune progression de charge déduite', () => {
    const s0 = createBeta0Programme(emptyState(), INPUT, clock(W[0]), {});
    const r = strengthReqs(s0, W[0])[0] as Req;
    const noLoad = asPrescribed(sessionOf(r)).map(({ loadKg: _drop, ...x }) => x);
    const s1 = recordSessionExecution(s0, clock(r.date ?? W[0], '18:00:00'), { requestId: r.requestId, sport: 'strength', completion: 'completed_as_prescribed', pain: 'NONE', sets: noLoad });
    const rs = auditSince(s0, s1);
    noUnjustifiedProgression(rs);
    expect(rs.filter((x) => x.code === 'PROGRESSION.ADVANCED' && x.params.variable === 'load')).toEqual([]);
    for (const t of s1.strength.tracks) expect(t.nextPrescription?.loadKg).toBeUndefined();
  });

  it('25. semaine commencée : modification du programme ⇒ semaine conservée, tracks inchangées', () => {
    const started = exec(W2, ALL).s;
    const s = recreate(started, { availability: [60, 0, 60, 60, 0, 60, 60] }, strengthReqs(W2, W[1])[1]?.date ?? W[1]);
    expect(s.planner.weeks[W[1]]).toEqual(started.planner.weeks[W[1]]);
    expect(s.strength).toEqual(started.strength);
  });

  it('25 bis. semaine planifiée AVANT S3 (beta0-s1) : non commencée ⇒ régénérée (tracé) ; commencée ⇒ conservée telle quelle', () => {
    const asS1 = (x: AppState): AppState => ({ ...x, planner: { ...x.planner, weeks: { ...x.planner.weeks, [W[1]]: { ...(x.planner.weeks[W[1]] as PersistedWeek), planningVersion: 'beta0-s1' } } } });
    const fresh = ensureBeta0Week(asS1(W2), clock(W[1], '06:00:00'));
    expect(fresh.planner.weeks[W[1]]?.planningVersion).toBe(BETA0_PLANNING_VERSION);
    expect(fullAudit(fresh).some((r) => r.code === 'KAIRO.WEEK_REPLANNED_STALE')).toBe(true);
    const started = asS1(exec(W2, ALL).s);
    expect(ensureBeta0Week(started, clock(FIRST.date ?? W[1], '20:00:00')).planner.weeks[W[1]]).toEqual(started.planner.weeks[W[1]]);
  });

  it('26. semaine clôturée : aucune réalisation tardive, aucune progression après clôture', () => {
    expect(() => recordSessionExecution(closed, clock(W[2], '08:00:00'), { requestId: FIRST.requestId, sport: 'strength', completion: 'completed_as_prescribed', pain: 'NONE', sets: ALL })).toThrow();
    const late = strengthReqs(closed, W[1])[1] as Req;
    let s: AppState | undefined;
    try { s = recordSessionExecution(closed, clock(W[2], '08:00:00'), { requestId: late.requestId, sport: 'strength', completion: 'completed_as_prescribed', pain: 'NONE', sets: asPrescribed(sessionOf(late)) }); } catch { s = undefined; }
    expect(s?.strength ?? closed.strength).toEqual(closed.strength);
  });
});
