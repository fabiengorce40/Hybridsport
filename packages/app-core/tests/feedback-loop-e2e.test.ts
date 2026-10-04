/**
 * F1 — boucle fermée « séance planifiée → réalisation → historique du moteur → décision suivante du moteur », quatre
 * sports, deux semaines, par le programme, le planificateur et les moteurs RÉELS (espionnés). TEST_ONLY : gouvernances,
 * contenus, intentions, saisies de réalisation. Aucune progression inventée : on prouve le TRANSPORT et l'usage par
 * les règles EXISTANTES des moteurs (rejeu strict C2, contexte Strength, historique Running) ; HYROX : transporté
 * jusqu'à la frontière H1, non exploité.
 */
import { describe, expect, it } from 'vitest';
import type { SportEngine } from '@hybridsport/engine';
import { StrengthEngine } from '@hybridsport/strength';
import { createRunningEngine } from '@hybridsport/running';
import {
  clearPain, closeProgrammeWeekInApp, completeOnboarding, decodeState, emptyState, EQUIPMENT_PRESETS, exportState, logFreeRun, planProgrammeCurrentWeek, ProgrammeError,
  recordSessionExecution, runningContent, startProgramme, strengthContent,
} from '../src/index.js';
import type { AppState, ProgrammeEnvironment, SessionExecutionInput } from '../src/index.js';
import { createCrossTrainingEngine } from '../../crosstraining/src/index.js';
import type { CrossTrainingEngine } from '../../crosstraining/src/index.js';
import { createHyroxEngine } from '../../hyrox/src/index.js';
import type { HyroxEngine } from '../../hyrox/src/index.js';
import { clock, profile } from './fixtures.js';
import { plannedSession, workSetsDone } from './executions.js';
import { ctGovernance, hyroxContent, plannerGovernance, runningGovernance, withDemand } from '../../planner/tests/fixtures.js';
import { FOUR_SPORTS, definition, programmeGovernance } from '../../programme/tests/fixtures.js';
import { testCatalog, testRuleset } from '../../engine/tests/fixtures/load.js';
// Anti-doublon : poids de TEST (avec un historique CT, le CORE exige des poids `crosstraining` — fail-closed sinon).
import { testRulesetDocumentWithDuplicate } from '../../engine/tests/fixtures/ruleset.js';
import { presetEquipment } from '../../engine/tests/fixtures/context.js';

type Seen = { strength: unknown[]; running: unknown[]; crosstraining: { input: unknown; out: unknown }[]; hyrox: unknown[] };
function env(seen: Seen): ProgrammeEnvironment {
  const spy = <E extends { propose: (i: never) => unknown }>(e: E, f: (i: unknown, o: unknown) => void): E => ({ ...e, propose: (i: never) => { const o = e.propose(i); f(i, o); return o; } });
  return {
    mode: 'CANDIDATE', governance: plannerGovernance(), programmeGovernance: programmeGovernance(),
    strength: { engine: spy(StrengthEngine, (i) => seen.strength.push(i)) as SportEngine<unknown>, content: withDemand(strengthContent()) },
    running: { engine: spy(createRunningEngine({ governance: runningGovernance(), simulation: true }), (i) => seen.running.push(i)) as SportEngine<unknown>, content: withDemand(runningContent()) },
    crosstraining: { engine: spy(createCrossTrainingEngine({ governance: ctGovernance(), simulation: true }), (i, o) => seen.crosstraining.push({ input: i, out: o })) as CrossTrainingEngine, content: withDemand({ ruleset: testRuleset(testRulesetDocumentWithDuplicate()), catalog: testCatalog() }) },
    hyrox: { engine: spy(createHyroxEngine({ simulation: true }), (i) => seen.hyrox.push(i)) as HyroxEngine, content: hyroxContent() },
  };
}
const fresh = (): Seen => ({ strength: [], running: [], crosstraining: [], hyrox: [] });

const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
const W1 = '2026-10-05';
const W2 = '2026-10-12';
const W3 = '2026-10-19';
const id = (w: string, sport: string, k = 1) => `${w}.${sport}.${String(k)}`;
// technical-constant: TEST_ONLY — minutes disponibles par jour
const AVAIL = [90, 90, 90, 90, 90, 90, 90];

/** Programme TEST_ONLY : CT avec stimulus du contrat Cross-training déclaré ; HYROX station SkiErg. */
const DEF = definition({
  ...FOUR_SPORTS,
  sports: FOUR_SPORTS.sports?.map((x) => {
    if (x.sport === 'crosstraining') return { ...x, intent: { ...x.intent, stimulus: 'mixed_modal_medium' }, declarations: { population: { level: 'intermediate', hybrid: false }, returnState: { state: 'NONE' }, declaredSkills: [], benchmarks: [] } };
    if (x.sport === 'hyrox') return { ...x, declarations: { population: { level: 'intermediate', hybrid: false }, returnState: { state: 'NONE' } } };
    return x;
  }) ?? [],
});

function athlete(): AppState {
  const s = completeOnboarding(emptyState(), profile({
    priorities: ['strength', 'running', 'crosstraining', 'hyrox'],
    strength: { enabled: true, goal: 'strength', sessionsPerWeek: 2 },
    running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: true }, hyrox: { enabled: true },
    equipment: { presetId: 'preset.full_gym', items: [...new Set([...fullGym, ...presetEquipment('preset.hybrid_race_gym')])].sort() },
    availability: AVAIL,
  }), clock('2026-10-01'));
  // technical-constant: TEST_ONLY — course libre déclarée (s, m)
  return logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, distanceM: 5000 }, clock('2026-10-01', '18:00:00'));
}

const ctWorkS = (s: AppState, requestId: string): number => {
  const p = plannedSession(s, requestId).blocks[0]?.items[0]?.prescription;
  return p?.type === 'timed' ? p.workS : 0;
};
type CtOverride = Partial<Extract<SessionExecutionInput, { sport: 'crosstraining' }>>;

/** Semaine 1 réalisée ; `ct` surcharge la saisie Cross-training (variantes). */
function week1(seen: Seen, ct: CtOverride = {}): AppState {
  let s = startProgramme(athlete(), DEF, clock(W1));
  s = planProgrammeCurrentWeek(s, clock(W1), env(seen));
  const at = clock(W1, '19:00:00');
  // technical-constant: TEST_ONLY — charge et RIR saisis par l'utilisateur
  for (const k of [1, 2]) s = recordSessionExecution(s, at, { sport: 'strength', requestId: id(W1, 'strength', k), completion: 'completed_as_prescribed', pain: 'NONE', sets: workSetsDone(s, id(W1, 'strength', k), { loadKg: 60, rir: 2 }) });
  // technical-constant: TEST_ONLY — courses réalisées (s, m)
  for (const k of [1, 2]) s = recordSessionExecution(s, at, { sport: 'running', requestId: id(W1, 'running', k), completion: 'completed_as_prescribed', pain: 'NONE', run: { realizedDurationS: 1800, distanceM: 5200 } });
  s = recordSessionExecution(s, at, { sport: 'crosstraining', requestId: id(W1, 'crosstraining'), completion: 'completed_as_prescribed', pain: 'NONE', tolerance: 'tolerated', result: { durationS: ctWorkS(s, id(W1, 'crosstraining')) }, ...ct } as SessionExecutionInput);
  // technical-constant: TEST_ONLY — résultat de station mesuré (m réalisés, s)
  s = recordSessionExecution(s, at, { sport: 'hyrox', requestId: id(W1, 'hyrox'), completion: 'completed_as_prescribed', pain: 'NONE', result: { achieved: 500, elapsedS: 125 } });
  return s;
}
const ctSource = (seen: Seen): string | undefined => {
  const o = seen.crosstraining.at(-1)?.out as { status: string; proposals?: { reasons: { code: string; params: { source?: string } }[] }[]; reasons?: { code: string; params: Record<string, unknown> }[] } | undefined;
  return o?.proposals?.[0]?.reasons.find((r) => r.code === 'PLAN.CROSSTRAINING.C2_PROPOSED')?.params.source ?? o?.reasons?.map((r) => r.code).join(',');
};

describe('F1 — semaine 1 → réalisations → semaine 2, quatre sports', () => {
  it('historiques réels transmis aux moteurs ; C2 rejoue la dernière séance admissible ; HYROX transporté ; adhérence du programme', () => {
    const seen = fresh();
    let s = week1(seen);
    expect(ctSource(seen)).toBe('bootstrap');
    // Historiques des moteurs (contrats propres) et preuves référencées par le programme (aucune donnée sportive recopiée).
    expect(s.strength.exposures.length).toBeGreaterThan(0);
    expect(s.running.realized).toHaveLength(3);
    expect(s.running.references).toEqual([]);
    expect(s.crosstraining.realized).toHaveLength(1);
    expect(s.hyrox.realized[0]).toMatchObject({ stationId: 'skierg', exerciseId: 'ex.skierg', prescription: { dose: { kind: 'distance_m', value: 500 } }, result: { kind: 'completed', achieved: 500, elapsedS: 125 }, completion: 'completed_as_prescribed' });
    expect(s.programmeState?.results.map((r) => r.evidence?.history)).toEqual(['strength', 'strength', 'running', 'running', 'crosstraining', 'hyrox']);
    expect(JSON.stringify(s.programmeState?.results)).not.toMatch(/"sets"|"reps"|"achieved"|"realizedDurationS"/);
    s = closeProgrammeWeekInApp(s, clock(W2), env(seen));
    expect(s.programmeState?.weeks[0]?.adherence?.total).toMatchObject({ planned: 6, completed: 6, completedAsPrescribed: 6, missed: 0 });
    // Semaine 2
    const seen2 = fresh();
    s = planProgrammeCurrentWeek(s, clock(W2), env(seen2));
    // Strength : expositions et tracks réels dans son contexte.
    const strCtx = (seen2.strength.at(-1) as { discipline: { recentExposures: unknown[]; tracks: unknown[] } }).discipline;
    expect(strCtx.recentExposures.length).toBe(s.strength.exposures.length);
    expect(strCtx.tracks.length).toBe(s.strength.tracks.length);
    // Running : ses séances réalisées dans son historique.
    const runCtx = (seen2.running.at(-1) as { discipline: { sessionHistory: { sessionId: string }[] } }).discipline;
    expect(runCtx.sessionHistory.map((x) => x.sessionId)).toEqual(expect.arrayContaining([id(W1, 'running', 1), id(W1, 'running', 2)]));
    // CT : rejeu STRICT de la dernière séance admissible, NOUVELLE occurrence.
    expect(ctSource(seen2)).toBe('replay');
    const ct2 = plannedSession(s, id(W2, 'crosstraining'));
    expect(ct2.blocks[0]?.items[0]?.exerciseId).toBe(plannedSession(s, id(W1, 'crosstraining')).blocks[0]?.items[0]?.exerciseId);
    expect(ctWorkS(s, id(W2, 'crosstraining'))).toBe(ctWorkS(s, id(W1, 'crosstraining')));
    expect(ct2.id).not.toBe(plannedSession(s, id(W1, 'crosstraining')).id);
    // HYROX : historique arrivé à la frontière du moteur (validé), non exploité pour prescrire.
    const hrCtx = (seen2.hyrox.at(-1) as { discipline: { sessionHistory: { sessionId: string }[] } }).discipline;
    expect(hrCtx.sessionHistory.map((x) => x.sessionId)).toEqual([id(W1, 'hyrox')]);
    expect(plannedSession(s, id(W2, 'hyrox')).blocks[0]?.items[0]?.prescription).toEqual(plannedSession(s, id(W1, 'hyrox')).blocks[0]?.items[0]?.prescription);
    // Rejeu enregistré : nouvelle occurrence, aucun doublon d'historique.
    s = recordSessionExecution(s, clock(W2, '19:00:00'), { sport: 'crosstraining', requestId: id(W2, 'crosstraining'), completion: 'completed_as_prescribed', pain: 'NONE', tolerance: 'tolerated', result: { durationS: ctWorkS(s, id(W2, 'crosstraining')) } });
    expect(s.crosstraining.realized.map((r) => r.sessionId)).toEqual([id(W1, 'crosstraining'), id(W2, 'crosstraining')]);
    // Persistance : relecture identique, histoires des quatre sports conservées.
    const d = decodeState(exportState(s));
    expect(d.ok && d.state).toEqual(s);
  });

  it('Strength : la réalisation influence la génération suivante par les règles EXISTANTES (contexte d’historique différent ⇒ séance recalculée par le moteur)', () => {
    const seen = fresh();
    const done = closeProgrammeWeekInApp(week1(seen), clock(W2), env(seen));
    const withHistory = fresh();
    const a = planProgrammeCurrentWeek(done, clock(W2), env(withHistory));
    // Même semaine 2, sans l'historique Strength (expositions / tracks vidés) : le moteur reçoit un autre contexte.
    const blank = fresh();
    const b = planProgrammeCurrentWeek({ ...done, strength: { tracks: [], exposures: [], accessoryCounts: {} } }, clock(W2), env(blank));
    const ctx = (x: Seen) => (x.strength.at(-1) as { discipline: { recentExposures: unknown[]; hardSets: { d7: Record<string, number> } } }).discipline;
    expect(ctx(withHistory).recentExposures.length).toBeGreaterThan(0);
    expect(ctx(blank).recentExposures).toEqual([]);
    expect(JSON.stringify(plannedSession(a, id(W2, 'strength')))).not.toBe(JSON.stringify(plannedSession(b, id(W2, 'strength'))));
  });

  it.each([
    ['modified', { completion: 'modified' }, 'NOT_COMPLETED_AS_PRESCRIBED'],
    ['abandoned', { completion: 'abandoned', result: undefined }, 'ABANDONED'],
    ['poor tolerance', { tolerance: 'poorly_tolerated' }, 'POORLY_TOLERATED'],
    ['douleur inconnue', { pain: undefined }, 'PAIN_UNKNOWN'],
  ] as const)('CT semaine 1 %s ⇒ AUCUN rejeu en semaine 2 (et aucun repli sur l’amorçage)', (_, o, cause) => {
    const seen = fresh();
    const s = closeProgrammeWeekInApp(week1(seen, o as CtOverride), clock(W2), env(seen));
    const seen2 = fresh();
    const s2 = planProgrammeCurrentWeek(s, clock(W2), env(seen2));
    const r = s2.planner.weeks[W2]?.requests.find((x) => x.sport === 'crosstraining');
    expect(r?.status).toBe('refused');
    expect(r?.reasons.find((x) => x.code === 'DOSE.CROSSTRAINING.REPLAY_SOURCE_INADMISSIBLE')?.params.causes).toContain(cause);
  });

  it('CT avec douleur ⇒ pause de sécurité (planification suspendue) ; après levée explicite, aucun rejeu (douleur déclarée)', () => {
    const seen = fresh();
    let s = week1(seen, { pain: 'P2' });
    expect(s.safety.activePain).not.toBeNull();
    s = closeProgrammeWeekInApp(s, clock(W2), env(seen));
    expect(() => planProgrammeCurrentWeek(s, clock(W2), env(fresh()))).toThrow(ProgrammeError);
    s = planProgrammeCurrentWeek(clearPain(s, clock(W2)), clock(W2), env(fresh()));
    expect(s.planner.weeks[W2]?.requests.find((x) => x.sport === 'crosstraining')?.reasons.find((x) => x.code === 'DOSE.CROSSTRAINING.REPLAY_SOURCE_INADMISSIBLE')?.params.causes).toContain('PAIN_DECLARED');
  });

  it('dernière séance CT non rejouable ⇒ aucun repli vers une séance plus ancienne admissible', () => {
    const seen = fresh();
    let s = closeProgrammeWeekInApp(week1(seen), clock(W2), env(seen));
    s = planProgrammeCurrentWeek(s, clock(W2), env(fresh()));
    s = recordSessionExecution(s, clock(W2, '19:00:00'), { sport: 'crosstraining', requestId: id(W2, 'crosstraining'), completion: 'modified', pain: 'NONE', result: { durationS: 100 } });
    s = closeProgrammeWeekInApp(s, clock(W3), env(fresh()));
    const seen3 = fresh();
    s = planProgrammeCurrentWeek(s, clock(W3), env(seen3));
    const r = s.planner.weeks[W3]?.requests.find((x) => x.sport === 'crosstraining');
    expect(r?.status).toBe('refused');
    expect(r?.reasons.find((x) => x.code === 'DOSE.CROSSTRAINING.REPLAY_SOURCE_INADMISSIBLE')?.params.sessionId).toBe(id(W2, 'crosstraining'));
  });
});

describe('exécutions : validation, identité, idempotence', () => {
  const ready = () => planProgrammeCurrentWeek(startProgramme(athlete(), DEF, clock(W1)), clock(W1), env(fresh()));

  it('Strength « telle que prescrite » sans toutes les séries saisies ⇒ refus explicite ; « modifiée » partielle ⇒ historique partiel (séries saisies seulement)', () => {
    const s = ready();
    const r = id(W1, 'strength');
    expect(() => recordSessionExecution(s, clock(W1), { sport: 'strength', requestId: r, completion: 'completed_as_prescribed', pain: 'NONE', sets: workSetsDone(s, r, { skipLast: true }) })).toThrow('EXECUTION_STRENGTH_INCOMPLETE');
    expect(() => recordSessionExecution(s, clock(W1), { sport: 'strength', requestId: r, completion: 'completed_as_prescribed', pain: 'NONE' })).toThrow('EXECUTION_STRENGTH_INCOMPLETE');
    const sets = workSetsDone(s, r, { loadKg: 60 }).slice(0, 2);
    const p = recordSessionExecution(s, clock(W1), { sport: 'strength', requestId: r, completion: 'modified', pain: 'NONE', sets });
    expect(p.strength.exposures.flatMap((e) => e.sets)).toHaveLength(2);
    expect(() => recordSessionExecution(s, clock(W1), { sport: 'strength', requestId: r, completion: 'modified', pain: 'NONE', sets: [{ itemId: 'nope', setIndex: 0, done: true, reps: 5 }] })).toThrow('EXECUTION_STRENGTH_SET_UNKNOWN');
  });

  it('soumission en double ⇒ refus explicite, aucun historique doublé ; discipline incohérente ⇒ refus', () => {
    let s = ready();
    const r = id(W1, 'hyrox');
    s = recordSessionExecution(s, clock(W1), { sport: 'hyrox', requestId: r, completion: 'completed_as_prescribed', pain: 'NONE', result: { achieved: 500 } });
    expect(() => recordSessionExecution(s, clock(W1), { sport: 'hyrox', requestId: r, completion: 'completed_as_prescribed', pain: 'NONE', result: { achieved: 500 } })).toThrow('EXECUTION_DUPLICATE');
    expect(s.hyrox.realized).toHaveLength(1);
    expect(() => recordSessionExecution(s, clock(W1), { sport: 'running', requestId: id(W1, 'strength'), completion: 'missed' })).toThrow('EXECUTION_SPORT_MISMATCH');
  });

  it('Running ordinaire : séance réalisée enregistrée, AUCUNE référence de performance créée', () => {
    let s = ready();
    s = recordSessionExecution(s, clock(W1), { sport: 'running', requestId: id(W1, 'running'), completion: 'completed_as_prescribed', pain: 'NONE', run: { realizedDurationS: 1800, distanceM: 5000, testTimeS: 1500 } });
    expect(s.running.references).toEqual([]);
    expect(s.programmeState?.results[0]?.evidence).toEqual({ history: 'running', ref: id(W1, 'running') });
  });

  it('séance manquée déclarée : statut générique seulement, aucun historique sportif ; CT / HYROX invalides ⇒ refus (contrat du moteur)', () => {
    let s = ready();
    s = recordSessionExecution(s, clock(W1), { sport: 'hyrox', requestId: id(W1, 'hyrox'), completion: 'missed' });
    expect(s.hyrox.realized).toEqual([]);
    expect(s.programmeState?.results[0]).toMatchObject({ completion: 'missed', provenance: 'declared' });
    expect(() => recordSessionExecution(s, clock(W1), { sport: 'crosstraining', requestId: id(W1, 'crosstraining'), completion: 'completed_as_prescribed', pain: 'NONE', result: {} })).toThrow('EXECUTION_INVALID');
  });

  it('déterminisme : mêmes saisies ⇒ même état exporté', () => {
    const go = () => exportState(closeProgrammeWeekInApp(week1(fresh()), clock(W2), env(fresh())));
    expect(go()).toBe(go());
  });
});
