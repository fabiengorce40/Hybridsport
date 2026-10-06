/**
 * Strength S4 — cas adverses par le chemin réel de l'application (Beta 0) : continuité des exercices, preuve de
 * progression, poids du corps, priorité multisport, bilan de volume, conflit insoluble, compaction de l'historique.
 * Critères : aucun exercice ne change sans cause tracée ; aucune progression sans preuve ; une contrainte Running
 * n'efface jamais silencieusement l'objectif Strength ; la compaction ne change ni la génération, ni l'affichage.
 * Saisies TEST_ONLY (s3-scenario.ts).
 */
import { describe, expect, it } from 'vitest';
import {
  BETA0_PLANNING_VERSION, beta0Environment, beta0Integrity, closeProgrammeWeekInApp, compactableWeeks, compactHistory, createBeta0Programme, decodeState, emptyState, ensureBeta0Week,
  exportState, HISTORY_COMPACTED, planProgrammeCurrentWeek, recordSessionExecution, recreateBeta0Programme, selectBeta0Week, selectHistory, strengthWeekVolume,
} from '../../src/index.js';
import type { AppState, PersistedWeek, ProfileInput, SetLog } from '../../src/index.js';
import { zProgrammeDefinition } from '@hybridsport/programme';
import { clock, profile } from '../fixtures.js';
import { asPrescribed, drive, recordOf } from './s3-scenario.js';

const W = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'] as const;
const STRENGTH: ProfileInput = profile({ priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 }, availability: [60, 60, 60, 60, 60, 0, 0] });
// technical-constant: TEST_ONLY — dernière course déclarée (durée s, distance m)
const LAST_RUN = { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' as const };
const HYBRID = (priorities: ProfileInput['priorities']): ProfileInput => profile({
  priorities, strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
  running: { enabled: true, population: 'P_R2', goal: 'HALF_MARATHON', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' }, availability: [60, 45, 60, 45, 60, 90, 75],
});
type Req = PersistedWeek['requests'][number];
type Reason = { code: string; params: Record<string, unknown> };

const A = drive(createBeta0Programme(emptyState(), STRENGTH, clock(W[0]), {}), W.slice(0, 4));
const audit = (s: AppState): Reason[] => (s.programmeState?.audit ?? []).map((a) => a.reason);
const reasonsOfWeek = (s: AppState, w: string): Reason[] => (s.planner.weeks[w]?.requests ?? []).flatMap((r) => r.reasons);
const strengthReqs = (s: AppState, w: string): Req[] => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
const items = (r: Req) => (recordOf(r)?.session.blocks ?? []).filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);

describe('continuité des exercices (scénario A, 4 semaines)', () => {
  it('accessoires stables : aucun exercice en place remplacé sans cause ; seules causes observées = ancre déclarée', () => {
    const all = A.weeks.flatMap((w) => reasonsOfWeek(A.final, w.weekStart));
    const replaced = all.filter((r) => r.code === 'SELECT.CONTINUITY');
    expect(all.some((r) => r.code === 'SELECT.CONTINUITY_KEPT')).toBe(true);
    expect([...new Set(replaced.map((r) => r.params.cause))]).toEqual(['declared_anchor']);
    expect(replaced.every((r) => r.params.outcome === 'replaced' && r.params.cause !== 'outranked')).toBe(true);
    // Un accessoire NON suivi est conservé semaines 3 et 4 (aucune variante « variété »).
    const keptFree = (w: string) => strengthReqs(A.final, w).flatMap((r) => r.reasons.filter((x) => x.code === 'SELECT.CONTINUITY_KEPT').flatMap((x) => (x.params.exercises as string[]).map((e) => e.split('=')[1] ?? '')));
    const tracked = new Set(A.final.strength.tracks.map((t) => t.exerciseId));
    const free3 = keptFree(W[2]).filter((x) => !tracked.has(x));
    expect(free3.length).toBeGreaterThan(0);
    for (const x of free3) expect(keptFree(W[3])).toContain(x);
  });

  const W3 = ensureBeta0Week(A.weeks[2]?.before ?? A.final, clock(W[2]));
  const incumbentFree = strengthReqs(W3, W[2]).flatMap((r) => r.reasons).filter((x) => x.code === 'SELECT.CONTINUITY_KEPT').flatMap((x) => (x.params.exercises as string[]).map((e) => e.split('=')[1] ?? '')).find((x) => !A.final.strength.tracks.some((t) => t.exerciseId === x));
  const afterWeek2 = A.weeks[2]?.before as AppState;

  it('accessoire devenu inadmissible (exclu) ou matériel retiré ⇒ remplacement tracé avec le filtre éliminatoire', () => {
    if (!incumbentFree) throw new Error('accessoire en place attendu');
    const replaced = (s: AppState) => strengthReqs(s, W[3]).flatMap((r) => r.reasons).filter((x) => x.code === 'SELECT.CONTINUITY' && x.params.incumbent === incumbentFree);
    const closed = closeProgrammeWeekInApp(afterWeek2, clock(W[3]));
    const excluded = ensureBeta0Week(recreateBeta0Programme(closed, { ...(closed.profile as ProfileInput), excludedExercises: [incumbentFree] }, clock(W[3], '06:00:00'), {}), clock(W[3]));
    expect(replaced(excluded).every((x) => x.params.outcome === 'replaced' && x.params.cause === 'F6_user_exclusion')).toBe(true);
    expect(strengthReqs(excluded, W[3]).flatMap(items).map((i) => i.exerciseId)).not.toContain(incumbentFree);
  });
});

describe('preuve de progression (exposition par exposition)', () => {
  const s1 = drive(createBeta0Programme(emptyState(), STRENGTH, clock(W[0]), {}), [W[0]]).final;
  const s2 = ensureBeta0Week(s1, clock(W[1]));
  const first = strengthReqs(s2, W[1])[0] as Req;
  const all = asPrescribed(recordOf(first)?.session as never);
  const anchor = items(first).find((i) => i.refs?.anchor === 'declared');
  const exec = (sets: SetLog[], completion: 'completed_as_prescribed' | 'modified' = 'completed_as_prescribed') => {
    const s = recordSessionExecution(s2, clock(first.date ?? W[1], '18:00:00'), { requestId: first.requestId, sport: 'strength', completion, pain: 'NONE', sets });
    return audit(s).slice(audit(s2).length).filter((r) => r.code === 'PROGRESSION.EXPOSURE_CLASSIFIED' && r.params.trackId === anchor?.refs?.progressionTrackId)[0]?.params;
  };
  const onAnchor = (f: (x: SetLog) => SetLog) => all.map((x) => (x.itemId === anchor?.id ? f(x) : x));

  it('réussite exacte, dépassement (reps, RIR), charge inférieure, série partielle : preuve explicite', () => {
    expect(exec(all)).toMatchObject({ exposure: 'on_target', success: 'exact', repsDelta: '0', loadDeltaKg: '0', rirDelta: '0', rir: 'reported' });
    expect(exec(onAnchor((x) => ({ ...x, reps: (x.reps ?? 0) + 2 })))).toMatchObject({ success: 'exceeded', repsDelta: '+2' });
    expect(exec(onAnchor((x) => ({ ...x, rir: (x.rir ?? 0) + 2 })))).toMatchObject({ success: 'exceeded', rirDelta: '+2' });
    expect(exec(onAnchor((x) => ({ ...x, loadKg: (x.loadKg ?? 0) - 10 })))).toMatchObject({ exposure: 'load_deviation', success: 'none', loadDeltaKg: '-10' });
    const partial = all.filter((x) => !(x.itemId === anchor?.id && x === all.filter((y) => y.itemId === anchor?.id).at(-1)));
    expect(exec(partial, 'modified')).toMatchObject({ success: 'none' });
  });

  it('séance manquée : aucune preuve, aucune décision de progression', () => {
    const closed = closeProgrammeWeekInApp(s2, clock(W[2]));
    expect(audit(closed).slice(audit(s2).length).filter((r) => r.code.startsWith('PROGRESSION.'))).toEqual([]);
  });

  it('réussite exacte répétée d’un modèle autorégulé ⇒ décision BLOQUÉE tracée (scénario A), jamais une hausse inventée', () => {
    expect(audit(A.final).some((r) => r.code === 'PROGRESSION.DECISION_BLOCKED' && r.params.capability === 'exact_success_progression')).toBe(true);
  });

  it('poids du corps au plafond : méthode non gouvernée, méthodes possibles listées (scénario A)', () => {
    const m = audit(A.final).find((r) => r.code === 'PROGRESSION.METHOD_UNGOVERNED');
    expect(m?.params).toMatchObject({ exerciseId: 'ex.pull_up', capability: 'bodyweight_overload_method', methods: ['added_load', 'harder_variant', 'new_rep_range', 'hold'] });
    expect(audit(A.final).some((r) => r.code === 'PROGRESSION.CAP_REACHED' && String(r.params.trackId).includes('pull_up'))).toBe(false);
  });
});

describe('priorité multisport et volume', () => {
  const strengthFirst = createBeta0Programme(emptyState(), HYBRID(['strength', 'running']), clock(W[0]), { lastRun: LAST_RUN });
  const runningFirst = createBeta0Programme(emptyState(), HYBRID(['running', 'strength']), clock(W[0]), { lastRun: LAST_RUN });
  const prio = (s: AppState) => reasonsOfWeek(s, W[0]).find((r) => r.code === 'PLAN.SPORT_PRIORITY')?.params;

  it('priorité Strength / priorité Running : transportée jusqu’à Strength, tracée, politique BLOQUÉE', () => {
    expect(prio(strengthFirst)).toMatchObject({ order: ['strength', 'running'], strengthRank: 1, policy: 'blocked:priority_interference_policy' });
    expect(prio(runningFirst)).toMatchObject({ order: ['running', 'strength'], strengthRank: 2, policy: 'blocked:priority_interference_policy' });
  });

  it('priorité égale : non représentable par le contrat du programme (ordre total des sports) — aucune égalité inventée', () => {
    const d = strengthFirst.programmeState?.definition;
    if (!d) throw new Error('programme');
    expect(zProgrammeDefinition.safeParse({ ...d, priorities: ['strength', 'running'] }).success).toBe(true);
    // Deux sports « au même rang » : impossible à écrire (liste ordonnée) ; un doublon ou un oubli est refusé.
    expect(zProgrammeDefinition.safeParse({ ...d, priorities: ['strength', 'strength'] }).success).toBe(false);
    expect(zProgrammeDefinition.safeParse({ ...d, priorities: ['strength'] }).success).toBe(false);
  });

  it('volume sous la cible en hybride : objectif partiellement satisfait, contraintes d’interférence listées, audité', () => {
    const v = strengthWeekVolume(strengthFirst, W[0]);
    expect(v?.status).toBe('partially_satisfied');
    expect(v?.groups.some((g) => g.status === 'reduced_by_constraint')).toBe(true);
    expect(v?.constraints.some((c) => c.cause === 'interference')).toBe(true);
    const a = audit(strengthFirst).find((r) => r.code === 'KAIRO.STRENGTH_WEEK_VOLUME');
    expect(a?.params.status).toBe('partially_satisfied');
    expect((a?.params.belowTarget as string[]).some((x) => x.startsWith('quads:'))).toBe(true);
  });

  it('conflit insoluble (disponibilité trop courte) : objectif BLOQUÉ, jamais une semaine dégradée silencieuse', () => {
    const s = createBeta0Programme(emptyState(), profile({ priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 }, availability: [10, 0, 0, 0, 0, 0, 0] }), clock(W[0]), {});
    const v = strengthWeekVolume(s, W[0]);
    expect(v?.plannedSessions).toBe(0);
    expect(v?.status).toBe('blocked');
    expect(v?.constraints.some((c) => c.cause === 'sessions_not_planned')).toBe(true);
  });
});

describe('compaction de l’historique', () => {
  // Trois semaines réalisées et clôturées, SANS compaction (fermeture directe) : état complet de référence.
  const full = (() => {
    let s = createBeta0Programme(emptyState(), HYBRID(['strength', 'running']), clock(W[0]), { lastRun: LAST_RUN });
    for (const [k, w] of W.slice(0, 3).entries()) {
      if (k > 0) s = planProgrammeCurrentWeek(s, clock(w), beta0Environment(), k, { pastDaysUnavailable: true });
      for (const r of (s.planner.weeks[w]?.requests ?? []).filter((x) => x.status === 'planned')) {
        const session = recordOf(r)?.session;
        if (!session || !r.date) continue;
        s = recordSessionExecution(s, clock(r.date, '18:00:00'), r.sport === 'strength'
          ? { requestId: r.requestId, sport: 'strength', completion: 'completed_as_prescribed', pain: 'NONE', sets: asPrescribed(session) }
          : { requestId: r.requestId, sport: 'running', completion: 'completed_as_prescribed', pain: 'NONE', run: { realizedDurationS: session.targetDurationS, distanceM: 6000 } });
      }
      s = closeProgrammeWeekInApp(s, clock(W[k + 1] ?? W[3]));
    }
    return s;
  })();
  const compacted = compactHistory(full);

  it('périmètre : semaines clôturées sauf la plus récente ; perte EXPLICITE (marqueur), décisions conservées', () => {
    expect(compactableWeeks(full)).toEqual([W[0], W[1]]);
    for (const w of [W[0], W[1]]) {
      for (const r of compacted.planner.weeks[w]?.requests ?? []) {
        if (r.status !== 'planned') continue;
        expect(r.reasons.at(-1)?.code).toBe(HISTORY_COMPACTED);
        expect(r.demand).toBeUndefined();
        expect(r.neighbourContext).toBeUndefined();
        expect(r.reasons.some((x) => x.code === 'DOSE.LOAD.CONFIDENCE' || x.code === 'DUPLICATE.ACCIDENTAL' || x.code === 'PLAN.INTERFERENCE_ASSESSED' || x.code === 'PLAN.PLANNER.PLACED')).toBe(false);
      }
      const before = reasonsOfWeek(full, w).filter((x) => /^(SELECT\.(EXERCISE\.CHOSEN|CONTINUITY|CONTINUITY_KEPT|CHOICE_GROUP|SLOT_OMITTED)|PLAN\.(WEEK_COMPOSITION|WEEK_PRESCRIPTION|STRUCTURE_LOWERED|SPORT_PRIORITY)|DOSE\.LOAD\.(FROM|CALIBRATION))/.test(x.code));
      const after = reasonsOfWeek(compacted, w).filter((x) => before.some((b) => b.code === x.code));
      expect(after).toEqual(before);
    }
    // Dernière semaine clôturée (contexte de la semaine suivante) : intacte.
    expect(compacted.planner.weeks[W[2]]).toEqual(full.planner.weeks[W[2]]);
    expect(compacted.programmeState).toEqual(full.programmeState);
    expect(compacted.strength).toEqual(full.strength);
    expect(compacted.fingerprints).toEqual(full.fingerprints);
    expect(compacted.running).toEqual(full.running);
  });

  it('génération future IDENTIQUE : état complet vs compacté', () => {
    const next = (s: AppState) => planProgrammeCurrentWeek(s, clock(W[3]), beta0Environment(), 3, { pastDaysUnavailable: true });
    const a = next(full);
    const b = next(compacted);
    expect(b.planner.weeks[W[3]]).toEqual(a.planner.weeks[W[3]]);
    expect(b.strength).toEqual(a.strength);
    expect(b.programmeState?.audit.slice(full.programmeState?.audit.length ?? 0)).toEqual(a.programmeState?.audit.slice(full.programmeState?.audit.length ?? 0));
  });

  it('historique visible, semaines affichées et intégrité identiques ; idempotente ; export / import ; réduction mesurée', () => {
    expect(selectHistory(compacted)).toEqual(selectHistory(full));
    for (const w of W.slice(0, 3)) expect(selectBeta0Week(compacted, w)).toEqual(selectBeta0Week(full, w));
    expect(beta0Integrity(compacted)).toEqual(beta0Integrity(full));
    expect(compactHistory(compacted)).toBe(compacted);
    const d = decodeState(exportState(compacted));
    if (!d.ok) throw new Error(d.problem);
    expect(d.state).toEqual(compacted);
    expect(JSON.stringify(compacted).length).toBeLessThan(JSON.stringify(full).length);
    expect(full.planner.weeks[W[0]]?.planningVersion).toBe(BETA0_PLANNING_VERSION);
  });
});
