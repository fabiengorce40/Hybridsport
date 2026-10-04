/**
 * Beta 0 — chemin hybride Strength + Running : profil → définition de programme (aucun archétype Running déclaré)
 * → Programme Engine → Global Planner → Strength (archétype déclaré) + Running (composition DU MOTEUR) → séances
 * persistées → réalisations → clôture → semaine suivante, sur trois semaines glissantes, avec export / import et
 * reprise. Environnement : `beta0Environment()` (autorité `beta0_experimental`, valeurs SIMULATION_ONLY tracées).
 * Les saisies de réalisation sont des données de test (TEST_ONLY).
 */
import { describe, expect, it } from 'vitest';
import {
  BETA0_SIMULATION, beta0Environment, closeProgrammeWeekInApp, completeOnboarding, decodeState, emptyState, ensureCurrentWeek, EQUIPMENT_PRESETS, exportState, logFreeRun,
  planProgrammeCurrentWeek, programmeDefinitionFromProfile, recordSessionExecution, selectBeta0Week, startProgramme,
} from '../src/index.js';
import type { AppState, ProfileInput, ProgrammeEnvironment, SessionExecutionInput } from '../src/index.js';
import { clock, profile } from './fixtures.js';
import { plannedSession, workSetsDone } from './executions.js';
import { programmeGovernance } from '../../programme/tests/fixtures.js';

const W = ['2026-10-05', '2026-10-12', '2026-10-19'] as const;
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
// technical-constant: TEST_ONLY — minutes disponibles par jour (lundi → dimanche)
const AVAIL = [60, 45, 60, 0, 60, 90, 75];
// technical-constant: TEST_ONLY — course libre déclarée avant le programme (s, m)
const FREE_RUN = { realizedDurationS: 1800, distanceM: 5000 };
// technical-constant: TEST_ONLY — saisies de course : distance réalisée (m) et temps du contre-la-montre (s)
const RUN_INPUT = { distanceM: 6000, testTimeS: 1500 };

type Sports = 'strength' | 'running' | 'hybrid';
function athlete(sports: Sports, o: Partial<ProfileInput['running']> = {}): AppState {
  const s = completeOnboarding(emptyState(), profile({
    priorities: sports === 'running' ? ['running'] : sports === 'strength' ? ['strength'] : ['strength', 'running'],
    strength: { enabled: sports !== 'running', goal: 'strength', sessionsPerWeek: 2 },
    running: { enabled: sports !== 'strength', population: 'P_R2', goal: 'HALF_MARATHON', wearable: false, sessionsPerWeek: 3, returnState: 'NONE', ...o },
    equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
    availability: AVAIL,
  }), clock('2026-10-01'));
  return sports === 'strength' ? s : logFreeRun(s, { ...FREE_RUN, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false }, clock('2026-10-01', '18:00:00'));
}
const started = (s: AppState): AppState => {
  if (!s.profile) throw new Error('profil absent');
  return startProgramme(s, programmeDefinitionFromProfile(s.profile, { programmeId: 'beta0', startWeek: W[0], horizonWeeks: 3, origin: 'profile' }), clock(W[0]));
};
const reload = (s: AppState): AppState => { const d = decodeState(exportState(s)); if (!d.ok) throw new Error(d.problem); return d.state; };
const week = (s: AppState, w: string) => {
  const x = s.planner.weeks[w];
  if (!x) throw new Error(`semaine absente : ${w}`);
  return x;
};

/** Saisie TEST_ONLY d'une séance planifiée : Strength = séries faites ; Running = durée prescrite, distance, temps de TEST. */
function execution(s: AppState, requestId: string, completion: SessionExecutionInput['completion'] = 'completed_as_prescribed', pain: 'NONE' | 'P2' = 'NONE'): SessionExecutionInput {
  const r = Object.values(s.planner.weeks).flatMap((w) => w.requests).find((x) => x.requestId === requestId);
  if (r?.sport === 'strength') return { requestId, sport: 'strength', completion, pain, sets: workSetsDone(s, requestId) };
  const isTest = r?.intent?.archetypeId === 'running.test';
  return { requestId, sport: 'running', completion, pain, run: { realizedDurationS: plannedSession(s, requestId).targetDurationS, distanceM: RUN_INPUT.distanceM, ...(isTest ? { testTimeS: RUN_INPUT.testTimeS } : {}) } };
}
const executeAll = (s: AppState, w: string, except: readonly string[] = []): AppState =>
  week(s, w).requests.filter((r) => r.status === 'planned' && !except.includes(r.requestId))
    .reduce((acc, r) => recordSessionExecution(acc, clock(r.date ?? w, '18:00:00'), execution(acc, r.requestId)), s);

/** Scénario complet : 3 semaines, export / import et reprise entre chaque semaine. */
function threeWeeks(env: () => ProgrammeEnvironment = beta0Environment) {
  const s0 = started(athlete('hybrid'));
  const s1 = planProgrammeCurrentWeek(s0, clock(W[0]), env());
  const s1x = executeAll(s1, W[0]);
  const s1c = reload(closeProgrammeWeekInApp(s1x, clock(W[1]), env()));
  const s2 = planProgrammeCurrentWeek(s1c, clock(W[1]), env());
  const missed = week(s2, W[1]).requests.find((r) => r.sport === 'running' && r.status === 'planned')?.requestId ?? '';
  const s2x = executeAll(reload(s2), W[1], [missed]);
  const s2c = reload(closeProgrammeWeekInApp(s2x, clock(W[2]), env()));
  const s3 = planProgrammeCurrentWeek(s2c, clock(W[2]), env());
  return { s0, s1, s1x, s1c, s2, s2x, s2c, s3, missed };
}

describe('profil → définition de programme Beta 0', () => {
  it('Strength : intention V0 déclarée ; Running : cadre SANS archétype, composition par le moteur ; CT / HYROX exclus', () => {
    const s = athlete('hybrid');
    if (!s.profile) throw new Error('profil absent');
    const d = programmeDefinitionFromProfile({ ...s.profile, hyrox: { enabled: true }, priorities: ['hyrox', 'strength', 'running'] }, { programmeId: 'p', startWeek: W[0], horizonWeeks: 3, origin: 'profile' });
    expect(d.priorities).toEqual(['strength', 'running']);
    expect(d.sports.map((x) => [x.sport, x.composition, x.intent.archetypeId])).toEqual([['strength', 'declared', 'str_full_body'], ['running', 'engine', undefined]]);
    expect(d.sports[1]?.sessionsPerWeek).toBe(3);
  });

  it('aucun sport Beta 0 activé ⇒ refus explicite', () => {
    const p = athlete('strength').profile;
    if (!p) throw new Error('profil absent');
    expect(() => programmeDefinitionFromProfile({ ...p, strength: { ...p.strength, enabled: false } }, { programmeId: 'p', startWeek: W[0], horizonWeeks: 3, origin: 'profile' })).toThrow('BETA0_NO_SPORT');
  });
});

describe('Beta 0 hybride — trois semaines glissantes (E2E)', () => {
  const run = threeWeeks();

  it('semaine 1 : hybride planifié par le planificateur global, autorité expérimentale et valeurs SIMULATION_ONLY tracées', () => {
    const w1 = week(run.s1, W[0]);
    expect(w1.owner).toBe('programme');
    expect(w1.hybrid).toBe(true);
    expect(w1.authority).toBe('beta0_experimental');
    expect(w1.simulation).toEqual([...BETA0_SIMULATION]);
    expect(w1.requests.map((r) => [r.sport, r.status])).toEqual([
      ['strength', 'planned'], ['running', 'planned'], ['strength', 'planned'], ['running', 'planned'], ['running', 'planned'],
    ]);
    // Une séance par jour (aucune double séance).
    const dates = w1.requests.flatMap((r) => (r.date ? [r.date] : []));
    expect(new Set(dates).size).toBe(dates.length);
    // Valeurs candidates / simulation identifiables dans la trace.
    const trace = w1.requests.flatMap((r) => r.reasons.map((x) => x.code));
    expect(trace).toContain('RULE.RUNNING.CANDIDATE_VALUE_USED');
    expect(w1.governance.map((x) => x.code)).toContain('DATA.PLANNER.CANDIDATE_VALUE_USED');
  });

  it('composition Running AUTOMATIQUE : archétypes choisis par Running (autorité provisoire), Strength déclarée', () => {
    const w1 = week(run.s1, W[0]);
    const runs = w1.requests.filter((r) => r.sport === 'running');
    expect(runs.every((r) => r.composition?.authority === 'provisional' && r.intent?.archetypeId.startsWith('running.'))).toBe(true);
    // Première exposition à la séance clé du semi : le moteur exige un TEST récent ⇒ TEST à la place de la KEY.
    expect(runs.map((r) => r.composition?.role).sort()).toEqual(['EASY', 'EASY', 'TEST']);
    expect(runs.flatMap((r) => r.reasons.map((x) => x.code))).toContain('PLAN.RUNNING.WEEK_TEST_REPLACES_KEY');
    expect(w1.requests.filter((r) => r.sport === 'strength').every((r) => r.intent?.archetypeId === 'str_full_body' && r.composition === undefined)).toBe(true);
  });

  it('réalisations semaine 1 : historiques Strength et Running alimentés ; TEST ⇒ référence TIME_TRIAL', () => {
    expect(run.s1x.strength.tracks.length).toBeGreaterThan(0);
    expect(run.s1x.running.realized.length).toBe(1 + 3);
    expect(run.s1x.running.references.map((r) => r.type)).toEqual(['TIME_TRIAL']);
    expect(run.s1x.programmeState?.results).toHaveLength(5);
  });

  it('clôture : adhérence descriptive ; aucune politique d’adaptation en Beta 0 ⇒ décisions BLOCKED (aucune progression inventée)', () => {
    const w = run.s1c.programmeState?.weeks.find((x) => x.weekIndex === 0);
    expect(w?.closedAt).toBeDefined();
    expect(w?.adherence?.total).toMatchObject({ requested: 5, planned: 5, completed: 5, completedAsPrescribed: 5, missed: 0 });
    expect(run.s1c.programmeState?.decisions.map((d) => d.decision)).toEqual(['BLOCKED', 'BLOCKED']);
  });

  it('semaine 2 : historique utilisé — la référence TEST récente lève l’exigence, Running compose une séance clé', () => {
    const runs = week(run.s2, W[1]).requests.filter((r) => r.sport === 'running');
    expect(runs.every((r) => r.status === 'planned')).toBe(true);
    const roles = runs.map((r) => r.composition?.role);
    expect(roles).not.toContain('TEST');
    expect(roles).toContain('KEY');
    // Strength : contexte d'historique réel (tracks de la semaine 1) transmis au moteur.
    expect(run.s2.strength.tracks).toEqual(run.s1c.strength.tracks);
  });

  it('semaine 2 → 3 : séance non saisie dérivée « manquée » à la clôture ; semaine 3 planifiée ; historique des 3 semaines', () => {
    const results = run.s2c.programmeState?.results ?? [];
    expect(results.find((r) => r.requestId === run.missed)).toMatchObject({ completion: 'missed', provenance: 'derived_missed' });
    expect(run.s3.programmeState?.weeks.map((w) => [w.weekIndex, w.closedAt !== undefined])).toEqual([[0, true], [1, true], [2, false]]);
    const w3 = week(run.s3, W[2]);
    expect(w3.requests.filter((r) => r.status === 'planned')).toHaveLength(5);
    expect(w3.authority).toBe('beta0_experimental');
  });

  it('export / import / reprise : état sémantiquement identique, reprise sans perte', () => {
    expect(reload(run.s3)).toEqual(run.s3);
    const resumed = executeAll(reload(run.s3), W[2]);
    expect(resumed.programmeState?.results.filter((r) => r.weekIndex === 2)).toHaveLength(5);
  });

  it('semaine commencée : jamais replanifiée (refus explicite, état inchangé)', () => {
    const first = week(run.s3, W[2]).requests.find((r) => r.status === 'planned');
    if (!first?.date) throw new Error('aucune séance');
    const s = recordSessionExecution(run.s3, clock(first.date, '18:00:00'), execution(run.s3, first.requestId));
    expect(() => planProgrammeCurrentWeek(s, clock(W[2]), beta0Environment())).toThrow();
  });

  it('douleur déclarée sur une séance ⇒ planification suspendue (même règle que V0)', () => {
    const first = week(run.s3, W[2]).requests.find((r) => r.status === 'planned');
    if (!first?.date) throw new Error('aucune séance');
    const s = recordSessionExecution(run.s3, clock(first.date, '18:00:00'), execution(run.s3, first.requestId, 'modified', 'P2'));
    expect(s.safety.activePain).not.toBeNull();
    expect(() => planProgrammeCurrentWeek(s, clock(W[2]), beta0Environment())).toThrow('SAFETY_PAUSE_ACTIVE_PAIN');
  });

  it('déterminisme : même scénario ⇒ même état exporté', () => {
    expect(exportState(threeWeeks().s3)).toBe(exportState(run.s3));
  });
});

describe('Beta 0 mono-sport', () => {
  it('Running seul : composition par le moteur (mono-sport), aucune provenance exigée hors multisport', () => {
    const s = planProgrammeCurrentWeek(started(athlete('running')), clock(W[0]), beta0Environment());
    const w = week(s, W[0]);
    expect(w.hybrid).toBe(false);
    expect(w.requests.map((r) => [r.status, r.composition?.authority])).toEqual([['planned', 'provisional'], ['planned', 'provisional'], ['planned', 'provisional']]);
  });

  it('Strength seul : intention déclarée, aucune composition', () => {
    const s = planProgrammeCurrentWeek(started(athlete('strength')), clock(W[0]), beta0Environment());
    expect(week(s, W[0]).requests.map((r) => [r.status, r.intent?.archetypeId, r.composition])).toEqual([['planned', 'str_full_body', undefined], ['planned', 'str_full_body', undefined]]);
  });
});

describe('autorité de l’environnement : simulation ≠ production', () => {
  it('environnement « production » portant des valeurs SIMULATION_ONLY ⇒ refusé avant toute planification', () => {
    const s = started(athlete('hybrid'));
    expect(() => planProgrammeCurrentWeek(s, clock(W[0]), { ...beta0Environment(), mode: 'PRODUCTION', authority: 'production' })).toThrow('ENVIRONMENT_SIMULATION_IN_PRODUCTION');
    expect(() => planProgrammeCurrentWeek(s, clock(W[0]), { ...beta0Environment(), mode: 'PRODUCTION' })).toThrow('ENVIRONMENT_AUTHORITY_MISMATCH');
    expect(() => planProgrammeCurrentWeek(s, clock(W[0]), { ...beta0Environment(), simulation: [], mode: 'CANDIDATE', authority: 'production' })).toThrow('ENVIRONMENT_AUTHORITY_MISMATCH');
  });

  it('mode PRODUCTION (règles non approuvées) : composition Running non résolue ⇒ refus gouvernance, aucune valeur SIMULATION_ONLY lue', () => {
    const s = planProgrammeCurrentWeek(started(athlete('hybrid')), clock(W[0]), { ...beta0Environment(), mode: 'PRODUCTION', authority: 'test_only' });
    const w = week(s, W[0]);
    const runs = w.requests.filter((r) => r.sport === 'running');
    expect(runs.every((r) => r.status === 'unplaced' && r.category === 'governance_blocked')).toBe(true);
    expect(runs.flatMap((r) => r.reasons.map((x) => x.code))).toContain('RULE.PLANNER.COMPOSITION_UNRESOLVED');
    expect(w.requests.flatMap((r) => r.reasons.map((x) => x.code))).not.toContain('RULE.RUNNING.CANDIDATE_VALUE_USED');
    expect(w.governance.map((x) => x.code)).not.toContain('DATA.PLANNER.CANDIDATE_VALUE_USED');
    const view = selectBeta0Week(s, W[0]);
    expect(view?.sessions.filter((x) => x.sport === 'running').map((x) => [x.status, x.notPlanned?.category, x.notPlanned?.reason?.code])).toEqual([
      ['not_planned', 'governance_blocked', 'RULE.PLANNER.COMPOSITION_UNRESOLVED'], ['not_planned', 'governance_blocked', 'RULE.PLANNER.COMPOSITION_UNRESOLVED'], ['not_planned', 'governance_blocked', 'RULE.PLANNER.COMPOSITION_UNRESOLVED'],
    ]);
  });

  it('chemin V0 inchangé : hybride Running toujours refusé (HYBRID_PLANNER_UNAVAILABLE), seul le planificateur global l’active', () => {
    const s = ensureCurrentWeek(athlete('hybrid'), clock(W[0]));
    const runs = Object.values(s.sessions).filter((g) => g.date >= W[0] && g.sport === 'running');
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((g) => g.outcome.status === 'unavailable' && g.outcome.reasons.some((r) => r.code === 'SCOPE.RUNNING.HYBRID_PLANNER_UNAVAILABLE'))).toBe(true);
  });
});

describe('évaluation Running (TEST) demandée par le programme', () => {
  it('politique TEST_ONLY ⇒ REASSESS ⇒ le TEST REMPLACE une séance composée (jamais ajoutée) ; réalisé ⇒ évaluation complétée', () => {
    const env = (): ProgrammeEnvironment => ({ ...beta0Environment(), authority: 'test_only', programmeGovernance: programmeGovernance() });
    // GENERAL_RUNNING : aucun TEST exigé par la composition en semaine 1 (la KEY est une séance facile).
    let s = planProgrammeCurrentWeek(started(athlete('running', { goal: 'GENERAL_RUNNING' })), clock(W[0]), env());
    expect(week(s, W[0]).requests.map((r) => r.composition?.role)).not.toContain('TEST');
    s = closeProgrammeWeekInApp(executeAll(s, W[0]), clock(W[1]), env());
    expect(s.programmeState?.decisions.map((d) => d.decision)).toEqual(['REASSESS']);
    s = planProgrammeCurrentWeek(s, clock(W[1]), env());
    const runs = week(s, W[1]).requests;
    expect(runs).toHaveLength(3);
    const test = runs.filter((r) => r.intent?.archetypeId === 'running.test');
    expect(test).toHaveLength(1);
    expect(test[0]?.composition).toBeUndefined();
    expect(s.programmeState?.assessments.map((a) => a.status)).toEqual(['scheduled']);
    s = closeProgrammeWeekInApp(executeAll(s, W[1]), clock(W[2]), env());
    expect(s.programmeState?.assessments.map((a) => a.status)).toEqual(['completed']);
  });
});

describe('contrat de lecture pour l’interface (selectBeta0Week)', () => {
  const run = threeWeeks();
  it('semaine courante : séances ordonnées, sport, date, statut, durée, archétype / rôle, expérimental visible, adhérence descriptive', () => {
    const v = selectBeta0Week(run.s2x, W[1]);
    expect(v).not.toBeNull();
    expect(v?.weekIndex).toBe(1);
    expect(v?.experimental).toBe(true);
    expect(v?.authority).toBe('beta0_experimental');
    expect(v?.simulation).toEqual([...BETA0_SIMULATION]);
    const dates = v?.sessions.map((x) => x.date ?? '') ?? [];
    expect(dates).toEqual([...dates].sort());
    expect(v?.sessions.every((x) => x.targetDurationS !== null && x.archetypeId !== null)).toBe(true);
    expect(v?.sessions.find((x) => x.requestId === run.missed)?.status).toBe('planned');
    expect(v?.sessions.filter((x) => x.status === 'completed_as_prescribed')).toHaveLength(4);
    expect(v?.adherence).toMatchObject({ planned: 5, completed: 4, missed: 0 });
    // Après clôture : séance non saisie « manquée ».
    expect(selectBeta0Week(run.s2c, W[1])?.sessions.find((x) => x.requestId === run.missed)?.status).toBe('missed');
  });

  it('sans programme ⇒ null ; semaine hors horizon ⇒ null ; semaine non planifiée ⇒ séances vides, adhérence null', () => {
    expect(selectBeta0Week(athlete('hybrid'), W[0])).toBeNull();
    expect(selectBeta0Week(run.s3, '2026-11-30')).toBeNull();
    const v = selectBeta0Week(run.s0, W[0]);
    expect(v?.sessions).toEqual([]);
    expect(v?.adherence).toBeNull();
  });
});
