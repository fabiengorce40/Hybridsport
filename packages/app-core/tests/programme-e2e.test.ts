/**
 * E2E PROGRAMME (P1) : création → objectifs → semaine 1 (planificateur + moteurs réels) → persistée → séances
 * réalisées, modifiée, manquée → ingestion → adhérence descriptive → décision gouvernée (politique TEST_ONLY) ou
 * BLOCKED → intention de la semaine 2 → semaine 2 planifiée et persistée → évaluation Running TEST réelle.
 * Toutes les valeurs non approuvées sont TEST_ONLY ; aucune séance injectée (moteurs espionnés).
 */
import { describe, expect, it } from 'vitest';
import type { SportEngine } from '@hybridsport/engine';
import { StrengthEngine } from '@hybridsport/strength';
import { createRunningEngine } from '@hybridsport/running';
import {
  closeProgrammeWeekInApp, completeOnboarding, decodeState, emptyState, EQUIPMENT_PRESETS, exportState, logFreeRun, planProgrammeCurrentWeek, ProgrammeError,
  recordProgrammeSession, runningContent, startProgramme, strengthContent,
} from '../src/index.js';
import type { AppState, ProgrammeEnvironment } from '../src/index.js';
import { createCrossTrainingEngine } from '../../crosstraining/src/index.js';
import type { CrossTrainingEngine } from '../../crosstraining/src/index.js';
import { createHyroxEngine } from '../../hyrox/src/index.js';
import type { HyroxEngine } from '../../hyrox/src/index.js';
import { clock, profile } from './fixtures.js';
import { ctGovernance, hyroxContent, plannerGovernance, runningGovernance, withDemand } from '../../planner/tests/fixtures.js';
import { FOUR_SPORTS, definition, programmeGovernance } from '../../programme/tests/fixtures.js';
import { testCatalog, testRuleset } from '../../engine/tests/fixtures/load.js';
import { presetEquipment } from '../../engine/tests/fixtures/context.js';
import { RUNNING_INTENT } from '../../planner/tests/fixtures.js';

const calls = new Map<string, number>();
const spied = <E extends { propose: (i: never) => unknown }>(name: string, e: E): E => ({ ...e, propose: (i: never) => { calls.set(name, (calls.get(name) ?? 0) + 1); return e.propose(i); } });

/** Environnement TEST_ONLY : moteurs réels, gouvernances simulées (planificateur, programme, moteurs). */
function env(o: { programme?: ProgrammeEnvironment['programmeGovernance'] | null; hyrox?: boolean } = {}): ProgrammeEnvironment {
  return {
    mode: 'CANDIDATE', governance: plannerGovernance(),
    ...(o.programme === null ? {} : { programmeGovernance: o.programme ?? programmeGovernance() }),
    strength: { engine: spied('strength', StrengthEngine) as SportEngine<unknown>, content: withDemand(strengthContent()) },
    running: { engine: spied('running', createRunningEngine({ governance: runningGovernance(), simulation: true })) as SportEngine<unknown>, content: withDemand(runningContent()) },
    crosstraining: { engine: spied('crosstraining', createCrossTrainingEngine({ governance: ctGovernance(), simulation: true })) as CrossTrainingEngine, content: withDemand({ ruleset: testRuleset(), catalog: testCatalog() }) },
    ...(o.hyrox === false ? {} : { hyrox: { engine: spied('hyrox', createHyroxEngine({ simulation: true })) as HyroxEngine, content: hyroxContent() } }),
  };
}

const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
// technical-constant: TEST_ONLY — minutes disponibles par jour (assez longues pour le TEST du moteur Course)
const AVAIL = [90, 90, 90, 90, 90, 90, 90];
// technical-constant: TEST_ONLY — jours plus courts que la durée maximale estimée du TEST
const SHORT = [60, 60, 60, 60, 60, 60, 60];
const W1 = '2026-10-05';
const W2 = '2026-10-12';
const W3 = '2026-10-19';

function athlete(availability: number[] = AVAIL): AppState {
  const s = completeOnboarding(emptyState(), profile({
    priorities: ['strength', 'running', 'crosstraining', 'hyrox'],
    strength: { enabled: true, goal: 'strength', sessionsPerWeek: 2 },
    running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: true }, hyrox: { enabled: true },
    equipment: { presetId: 'preset.full_gym', items: [...new Set([...fullGym, ...presetEquipment('preset.hybrid_race_gym')])].sort() },
    availability,
  }), clock('2026-10-01'));
  // Course libre déclarée AVEC distance : historique réel du moteur Course (allure observée nécessaire au TEST).
  // technical-constant: TEST_ONLY — course libre déclarée (s, m)
  return logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, distanceM: 5000 }, clock('2026-10-01', '18:00:00'));
}

/** Programme TEST_ONLY quatre sports ; évaluation Running déclarée (archétype TEST du moteur Course). */
const DEF = definition({
  ...FOUR_SPORTS,
  sports: FOUR_SPORTS.sports?.map((x) => {
    if (x.sport === 'running') return { ...x, assessment: { kind: 'TIME_TRIAL', intent: { ...RUNNING_INTENT, archetypeId: 'running.test' } } };
    if (x.sport === 'crosstraining') return { ...x, declarations: { population: { level: 'intermediate', hybrid: false }, returnState: { state: 'NONE' }, declaredSkills: [], benchmarks: [] } };
    if (x.sport === 'hyrox') return { ...x, declarations: { population: { level: 'intermediate', hybrid: false }, returnState: { state: 'NONE' } } };
    return x;
  }) ?? [],
});

describe('E2E programme : semaine 1 → résultats → décision → semaine 2', () => {
  it('scénario complet, persistant et relisible', () => {
    calls.clear();
    // 1–2. création, objectifs déclarés
    let s = startProgramme(athlete(), DEF, clock(W1));
    expect(s.programmeState?.definition.goals.map((g) => g.goal)).toEqual(['strength', 'TEN_K', 'GENERAL_FITNESS', 'RACE_PREPARATION']);
    // 3–5. semaine 1 : planificateur, moteurs réels, persistée
    s = planProgrammeCurrentWeek(s, clock(W1), env());
    expect([...calls.keys()].sort()).toEqual(['crosstraining', 'hyrox', 'running', 'strength']);
    const w1 = s.planner.weeks[W1];
    const planned = (w1?.requests ?? []).filter((r) => r.status === 'planned');
    expect(planned).toHaveLength(6);
    expect(s.programmeState?.weeks[0]?.plannerRef).toBe(W1);
    // 6–7. réalisations : tel que prescrit, modifiée, abandonnée ; une séance manquée (aucune saisie)
    const id = (sport: string, k: number) => `${W1}.${sport}.${String(k)}`;
    s = recordProgrammeSession(s, clock(W1, '19:00:00'), { requestId: id('strength', 1), completion: 'completed_as_prescribed', pain: false });
    s = recordProgrammeSession(s, clock(W1, '19:00:00'), { requestId: id('strength', 2), completion: 'completed_as_prescribed', pain: false });
    // technical-constant: TEST_ONLY — courses réalisées déclarées (s, m)
    s = recordProgrammeSession(s, clock(W1, '19:00:00'), { requestId: id('running', 1), completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800, distanceM: 5200 } });
    s = recordProgrammeSession(s, clock(W1, '19:00:00'), { requestId: id('running', 2), completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800, distanceM: 5300 } });
    s = recordProgrammeSession(s, clock(W1, '19:00:00'), { requestId: id('crosstraining', 1), completion: 'modified', pain: false });
    // HYROX : manquée (aucune saisie)
    expect(s.running.realized).toHaveLength(3);
    expect(s.fingerprints.strength.length).toBeGreaterThan(0);
    // 8–10. ingestion, adhérence descriptive, décisions gouvernées (TEST_ONLY)
    s = closeProgrammeWeekInApp(s, clock(W2), env());
    const ps = s.programmeState;
    expect(ps?.weeks[0]?.adherence?.total).toEqual({ requested: 6, planned: 6, notPlanned: 0, completed: 5, completedAsPrescribed: 4, modified: 1, abandoned: 0, missed: 1, painReported: 0 });
    expect(ps?.decisions.map((d) => [d.sport, d.decision])).toEqual([['strength', 'PROGRESS'], ['running', 'REASSESS'], ['crosstraining', 'BLOCKED'], ['hyrox', 'HOLD']]);
    for (const d of ps?.decisions ?? []) {
      expect(d.policy, d.sport).toEqual({ id: 'programme.adaptation.decisionPolicy', version: '0.1.0', status: 'draft' });
      expect(d.reasons.length, d.sport).toBeGreaterThan(0);
    }
    expect(ps?.assessments[0]).toMatchObject({ sport: 'running', status: 'requested', scheduledWeek: 1 });
    // 11–12. semaine 2 : intention préparée (évaluation Running), planifiée, persistée
    s = planProgrammeCurrentWeek(s, clock(W2), env());
    const w2 = s.planner.weeks[W2];
    expect((w2?.requests ?? []).filter((r) => r.status === 'planned').length).toBeGreaterThan(0);
    expect(s.programmeState?.weeks[1]?.intent.demands.find((d) => d.sport === 'running')?.overrides[0]?.intent.archetypeId).toBe('running.test');
    // Évaluation réelle : TEST généré par le moteur Course, réalisé, chronométré ⇒ référence TIME_TRIAL, évaluation complétée.
    const a = s.programmeState?.assessments[0];
    expect(a?.status).toBe('scheduled');
    // technical-constant: TEST_ONLY — TEST réalisé (s)
    s = recordProgrammeSession(s, clock(W2, '19:00:00'), { requestId: a?.requestId ?? '', completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 2400, testTimeS: 1500 } });
    expect(s.programmeState?.assessments[0]?.status).toBe('completed');
    expect(s.running.references.map((r) => r.type)).toEqual(['TIME_TRIAL']);
    // Export / import : état restauré à l'identique (programme compris).
    const d = decodeState(exportState(s));
    expect(d.ok && d.state).toEqual(s);
  });

  it('évaluation demandée mais refusée par le moteur (TEST plus long que le créneau) ⇒ « not_planned », raison du moteur conservée', () => {
    let s = startProgramme(athlete(SHORT), DEF, clock(W1));
    s = planProgrammeCurrentWeek(s, clock(W1), env());
    for (const k of [1, 2]) s = recordProgrammeSession(s, clock(W1, '19:00:00'), { requestId: `${W1}.running.${String(k)}`, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800, distanceM: 5200 } });
    s = closeProgrammeWeekInApp(s, clock(W2), env());
    s = planProgrammeCurrentWeek(s, clock(W2), env());
    expect(s.programmeState?.assessments[0]).toMatchObject({ status: 'not_planned', reasons: expect.arrayContaining([expect.objectContaining({ code: 'PROGRESSION.PROGRAMME.ASSESSMENT_NOT_PLANNED', params: expect.objectContaining({ category: 'engine_refused' }) })]) });
    expect(s.planner.weeks[W2]?.requests.find((r) => r.requestId === `${W2}.running.1`)?.reasons.map((r) => r.code)).toContain('PLAN.RUNNING.TIME_EXCEEDED');
  });

  it('sans politique de programme : décisions BLOCKED (aucune décision automatique) ; semaine 2 planifiée avec l’intention inchangée', () => {
    let s = startProgramme(athlete(), DEF, clock(W1));
    s = planProgrammeCurrentWeek(s, clock(W1), env({ programme: null }));
    s = closeProgrammeWeekInApp(s, clock(W2), env({ programme: null }));
    expect(s.programmeState?.decisions.every((d) => d.decision === 'BLOCKED' && d.policy === null)).toBe(true);
    expect(s.programmeState?.results.every((r) => r.completion === 'missed' && r.provenance === 'derived_missed')).toBe(true);
    s = planProgrammeCurrentWeek(s, clock(W2), env({ programme: null }));
    expect(s.programmeState?.weeks[1]?.intent.demands).toEqual(s.programmeState?.weeks[0]?.intent.demands);
  });

  it('semaine suivante non planifiable tant que la précédente n’est pas clôturée (résultats attendus) ; future non planifiable sans horizon gouverné', () => {
    let s = startProgramme(athlete(), DEF, clock(W1));
    s = planProgrammeCurrentWeek(s, clock(W1), env());
    expect(() => planProgrammeCurrentWeek(s, clock(W2), env())).toThrow(ProgrammeError);
    try { planProgrammeCurrentWeek(s, clock(W2), env()); } catch (e) { expect((e as ProgrammeError).reasons[0]).toMatchObject({ code: 'PLAN.PROGRAMME.WEEK_NOT_PLANNABLE', params: { status: 'awaiting_results' } }); }
    const fresh = startProgramme(athlete(), DEF, clock(W1));
    expect(() => planProgrammeCurrentWeek(fresh, clock(W1), env(), 2)).toThrow(ProgrammeError);
    // Horizon d'avance TEST_ONLY : la semaine 2 est planifiable dès la semaine 1 si aucune semaine n'attend de résultats.
    const ahead = planProgrammeCurrentWeek(fresh, clock(W1), env({ programme: programmeGovernance({ horizon: 1 }) }), 1);
    expect(ahead.planner.weeks[W2]).toBeDefined();
    expect(ahead.planner.weeks[W3]).toBeUndefined();
  });

  it('moteur indisponible : HYROX non raccordé ⇒ demande non placée enregistrée, décision du programme sur faits (aucune séance)', () => {
    let s = startProgramme(athlete(), DEF, clock(W1));
    s = planProgrammeCurrentWeek(s, clock(W1), env({ hyrox: false }));
    expect(s.programmeState?.weeks[0]?.requests.find((r) => r.sport === 'hyrox')).toMatchObject({ status: 'unplaced', category: 'engine_unavailable' });
    s = closeProgrammeWeekInApp(s, clock(W2), env({ hyrox: false }));
    expect(s.programmeState?.weeks[0]?.adherence?.bySport.hyrox).toMatchObject({ requested: 1, planned: 0, notPlanned: 1 });
  });

  it('résultat d’une séance inconnue refusé, raisons structurées ; programme absent ⇒ erreur explicite', () => {
    let s = startProgramme(athlete(), DEF, clock(W1));
    s = planProgrammeCurrentWeek(s, clock(W1), env());
    expect(() => recordProgrammeSession(s, clock(W1), { requestId: 'nope', completion: 'modified', pain: false })).toThrow(ProgrammeError);
    expect(() => planProgrammeCurrentWeek(athlete(), clock(W1), env())).toThrow('PROGRAMME_MISSING');
    expect(() => startProgramme(athlete(), { ...DEF, priorities: ['strength'] }, clock(W1))).toThrow(ProgrammeError);
  });

  it('déterminisme : même état et mêmes réalisations ⇒ même export', () => {
    const run = () => {
      let s = startProgramme(athlete(), DEF, clock(W1));
      s = planProgrammeCurrentWeek(s, clock(W1), env());
      s = recordProgrammeSession(s, clock(W1, '19:00:00'), { requestId: `${W1}.strength.1`, completion: 'modified', pain: true });
      return exportState(closeProgrammeWeekInApp(s, clock(W2), env()));
    };
    expect(run()).toBe(run());
  });
});
