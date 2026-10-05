/**
 * Programme Engine P1 — contrats, horizon glissant, adhérence descriptive, décisions gouvernées (politique TEST_ONLY),
 * évaluations, par le planificateur global et les moteurs réels (ports des fixtures du planificateur).
 */
import { describe, expect, it } from 'vitest';
import {
  PG_CODES, adherenceOf, closeProgrammeWeek, createProgramme, decide, planProgrammeWeek, programmeOutlook, readProgrammeParam, recordProgrammeResult, requestIntent,
  weekIntent, weekStatus, zProgrammeState,
} from '../../src/index.js';
import type { ProgrammeDefinitionInput, ProgrammeState } from '../../src/index.js';
import { parseStrengthContext } from '../../../strength/src/index.js';
import { ALL_PORTS, RUNNING_INTENT, clock, days, plannerGovernance } from '../../../planner/tests/fixtures.js';
import { FOUR_SPORTS, START, TEST_POLICY, definition, programmeGovernance } from '../fixtures.js';
import { strengthBase } from '../../../planner/tests/fixtures.js';

const AT = '2026-10-05T07:00:00Z';
const make = (o: Partial<ProgrammeDefinitionInput> = {}): ProgrammeState => { const r = createProgramme(definition(o), AT); if (!r.ok) throw new Error(JSON.stringify(r.reasons)); return r.value; };
const deps = (o: { today?: string; ports?: ReturnType<typeof ALL_PORTS>; gov?: ReturnType<typeof programmeGovernance> | undefined; weekStart?: string } = {}) => ({
  today: o.today ?? START, at: AT, mode: 'CANDIDATE' as const, ports: o.ports ?? ALL_PORTS(), plannerGovernance: plannerGovernance(), programmeGovernance: o.gov,
  clock, days: days().map((d, i) => ({ ...d, date: addDays(o.weekStart ?? START, i) })),
});
function addDays(d: string, n: number): string { return new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10); }
const plan = (s: ProgrammeState, i: number, o: Parameters<typeof deps>[0] = {}) => { const r = planProgrammeWeek(s, i, deps({ ...o, weekStart: addDays(START, 7 * i) })); if (!r.ok) throw new Error(JSON.stringify(r.reasons)); return r.value; };
const record = (s: ProgrammeState, requestId: string, completion: 'completed_as_prescribed' | 'modified' | 'abandoned' | 'missed', pain = false) => {
  const r = recordProgrammeResult(s, { requestId, completion, pain, recordedAt: AT }); if (!r.ok) throw new Error(JSON.stringify(r.reasons)); return r.value;
};
/** `null` ⇒ AUCUN ruleset de gouvernance du programme. */
const close = (s: ProgrammeState, i: number, gov: ReturnType<typeof programmeGovernance> | null = programmeGovernance(), today = addDays(START, 7 * (i + 1))) => closeProgrammeWeek(s, i, { today, at: AT, mode: 'CANDIDATE', programmeGovernance: gov ?? undefined });

describe('création et objectifs', () => {
  it('programme valide : objectifs, priorité explicite, intention courante = intention déclarée', () => {
    const s = make();
    expect(s.current.map((c) => c.sport)).toEqual(['strength', 'running']);
    expect(zProgrammeState.safeParse(s).success).toBe(true);
  });

  it.each([
    ['objectif d’un sport absent', { goals: [{ goalId: 'g', sport: 'hyrox', goal: 'GENERAL' }] }, 'goals.0.sport'],
    ['priorité incomplète', { priorities: ['strength'] }, 'priorities'],
    ['goalId en double', { goals: [{ goalId: 'g', sport: 'strength', goal: 'strength' }, { goalId: 'g', sport: 'running', goal: 'TEN_K' }] }, 'goals'],
    ['date cible antérieure au début', { goals: [{ goalId: 'g', sport: 'running', goal: 'TEN_K', targetDate: '2026-01-01' }] }, 'goals.0.targetDate'],
    ['objectif inconnu du moteur', { goals: [{ goalId: 'g', sport: 'running', goal: 'ULTRA' }] }, 'goals.0.goal'],
    ['phases chevauchantes', { phases: [{ label: 'a', fromWeek: 0, toWeek: 3 }, { label: 'b', fromWeek: 2, toWeek: 5 }] }, 'phases.0'],
    ['aucun objectif', { goals: [] }, 'goals'],
  ] as const)('%s ⇒ refus structuré', (_, o, path) => {
    const r = createProgramme(definition(o as never), AT);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reasons.some((x) => x.code === PG_CODES.DEFINITION_INVALID && x.params.path === path)).toBe(true);
  });

  it('objectifs Strength du programme = objectifs du contrat de contexte Strength (validés par le moteur)', () => {
    for (const goal of ['strength', 'hypertrophy', 'general'] as const) expect(parseStrengthContext({ ...strengthBase(), goal: { primary: { goal } } }).ok).toBe(true);
  });
});

describe('horizon glissant', () => {
  it('semaine courante planifiable ; suivantes projetées ; aucune semaine future planifiable sans politique d’avance', () => {
    const s = make();
    const o = programmeOutlook(s, START, undefined, 'CANDIDATE');
    expect(o.weeks.map((w) => w.status)).toEqual(['plannable', 'projected', 'projected', 'projected', 'projected', 'projected', 'projected', 'projected']);
    expect(o.reasons[0]).toMatchObject({ code: PG_CODES.PARAMETER_UNAVAILABLE, params: { parameterId: 'programme.planning.horizonWeeks' } });
    const r = planProgrammeWeek(s, 1, deps({ weekStart: addDays(START, 7) }));
    expect(!r.ok && r.reasons[0]).toMatchObject({ code: PG_CODES.WEEK_NOT_PLANNABLE, params: { status: 'projected' } });
  });

  it('avance TEST_ONLY (1 semaine) : semaine 2 planifiable avant le début ; après planification de la semaine 1, la 2 attend les résultats', () => {
    const s = make();
    expect(weekStatus(s, 1, START, 1)).toBe('plannable');
    const after = plan(s, 0).state;
    expect(weekStatus(after, 0, START, 1)).toBe('planned');
    expect(weekStatus(after, 1, START, 1)).toBe('awaiting_results');
    expect(weekStatus(after, 0, addDays(START, 14), 1)).toBe('planned');
    expect(weekStatus(make(), 0, addDays(START, 14), undefined)).toBe('past_unplanned');
  });

  it('hors horizon déclaré ⇒ refus ; replanification d’une semaine sans résultat admise (aucune séance figée) ; refusée après un résultat', () => {
    const s = make();
    expect(planProgrammeWeek(s, 8, deps()).ok).toBe(false);
    const w1 = plan(s, 0);
    const again = planProgrammeWeek(w1.state, 0, deps());
    expect(again.ok).toBe(true);
    const id = w1.week.requests.find((r) => r.status === 'planned')?.requestId ?? '';
    const withResult = record(w1.state, id, 'completed_as_prescribed');
    expect(planProgrammeWeek(withResult, 0, deps()).ok).toBe(false);
  });
});

describe('programme continu (sans fin déclarée)', () => {
  const continuous = (): ProgrammeState => {
    const { horizonWeeks: _h, ...d } = definition();
    const r = createProgramme(d, `${START}T06:00:00Z`);
    if (!r.ok) throw new Error('définition invalide');
    return r.value;
  };
  it('aucune fin : une semaine lointaine est planifiable quand elle devient courante ; jamais d’avance sans politique', () => {
    const s = continuous();
    expect(s.definition.horizonWeeks).toBeUndefined();
    // technical-constant: TEST_ONLY — semaine lointaine (un an après le début)
    const far = 52;
    const today = addDays(START, far * 7);
    expect(weekStatus(s, far, today, undefined)).toBe('plannable');
    expect(weekStatus(s, far + 1, today, undefined)).toBe('projected');
    expect(planProgrammeWeek(s, -1, deps()).ok).toBe(false);
  });
  it('vue longitudinale BORNÉE : semaine courante seulement (aucune semaine future générée d’avance)', () => {
    const s = continuous();
    expect(programmeOutlook(s, START, undefined, 'CANDIDATE').weeks.map((w) => w.status)).toEqual(['plannable']);
    const later = programmeOutlook(s, addDays(START, 21), undefined, 'CANDIDATE').weeks;
    expect(later.map((w) => w.status)).toEqual(['past_unplanned', 'past_unplanned', 'past_unplanned', 'plannable']);
  });
});

describe('semaine 1 multisport : intention → planificateur → moteurs', () => {
  it('priorité explicite transmise telle quelle ; moteurs réels ; résumé référencé (aucune séance recopiée)', () => {
    const r = plan(make(FOUR_SPORTS), 0);
    expect(r.intent.demands.map((d) => d.sport)).toEqual(['strength', 'running', 'crosstraining', 'hyrox']);
    expect(r.week.requests.filter((x) => x.status === 'planned')).toHaveLength(6);
    const w = r.state.weeks[0];
    expect(w?.plannerRef).toBe(START);
    expect(JSON.stringify(w)).not.toMatch(/"blocks"|"exerciseId"/);
  });

  it('résultat planificateur partiel (moteur indisponible) remonté et enregistré dans l’état longitudinal', () => {
    const { hyrox: _h, ...three } = ALL_PORTS();
    const r = plan(make(FOUR_SPORTS), 0, { ports: three });
    expect(r.state.weeks[0]?.requests.find((x) => x.sport === 'hyrox')).toMatchObject({ status: 'unplaced', category: 'engine_unavailable' });
  });
});

describe('résultats, adhérence descriptive, décisions', () => {
  const week1 = () => {
    const r = plan(make(), 0);
    const ids = r.week.requests.filter((x) => x.status === 'planned').map((x) => x.requestId);
    return { s: r.state, ids };
  };

  it('adhérence : comptes factuels (prévu, réalisé, tel que prescrit, modifié, abandonné, manqué dérivé, douleur)', () => {
    const { s, ids } = week1();
    let x = record(s, ids[0] ?? '', 'completed_as_prescribed');
    x = record(x, ids[1] ?? '', 'modified');
    x = record(x, ids[2] ?? '', 'abandoned', true);
    const c = close(x, 0, null);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.value.weeks[0]?.adherence?.total).toEqual({ requested: 4, planned: 4, notPlanned: 0, completed: 2, completedAsPrescribed: 1, modified: 1, abandoned: 1, missed: 1, painReported: 1 });
    expect(c.value.results.find((r) => r.provenance === 'derived_missed')).toMatchObject({ requestId: ids[3], completion: 'missed' });
    expect(adherenceOf([], [])).toMatchObject({ planned: 0, completed: 0 });
  });

  it('aucune politique ⇒ aucune décision automatique : BLOCKED (POLICY_UNAVAILABLE) pour chaque sport, intention inchangée', () => {
    const { s, ids } = week1();
    const all = ids.reduce((acc, id) => record(acc, id, 'completed_as_prescribed'), s);
    const c = close(all, 0, null);
    expect(c.ok && c.value.decisions.map((d) => [d.sport, d.decision, d.policy])).toEqual([['strength', 'BLOCKED', null], ['running', 'BLOCKED', null]]);
    expect(c.ok && c.value.current).toEqual(s.current);
  });

  it('PRODUCTION : politique draft ⇒ BLOCKED (NOT_PRODUCTION_READY)', () => {
    const p = readProgrammeParam(programmeGovernance(), 'programme.adaptation.decisionPolicy', 'PRODUCTION');
    expect(decide('strength', { adherence: adherenceOf([], []), assessment: 'none' }, p, 'x')).toMatchObject({ decision: 'BLOCKED', reasons: [{ params: { cause: 'NOT_PRODUCTION_READY' } }, { params: { cause: 'POLICY_UNAVAILABLE' } }] });
  });

  it('politique TEST_ONLY : PROGRESS (tout tel que prescrit), REASSESS (course sans évaluation) — provenance complète', () => {
    const { s, ids } = week1();
    const c = close(ids.reduce((acc, id) => record(acc, id, 'completed_as_prescribed'), s), 0);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const [str, run] = c.value.decisions;
    expect(str).toMatchObject({ sport: 'strength', decision: 'PROGRESS', policy: { id: 'programme.adaptation.decisionPolicy', version: '0.1.0', status: 'draft' }, rule: TEST_POLICY.rules.length - 1 });
    expect(str?.facts.adherence.completedAsPrescribed).toBe(2);
    expect(str?.results).toHaveLength(2);
    expect(run).toMatchObject({ sport: 'running', decision: 'REASSESS', rule: 3 });
    // PROGRESS sans variante déclarée : intention inchangée, tracée ; REASSESS sans contenu déclaré : évaluation sans contenu.
    expect(str?.reasons.map((r) => r.code)).toContain(PG_CODES.NO_VARIANT_DECLARED);
    expect(c.value.assessments[0]).toMatchObject({ sport: 'running', status: 'content_unavailable' });
  });

  it('HOLD (manquée), REGRESS (douleur), BLOCKED (aucune règle applicable)', () => {
    const { s, ids } = week1();
    // strength : 1 tel que prescrit + 1 manquée ⇒ HOLD ; running : douleur ⇒ REGRESS
    let x = record(s, ids[0] ?? '', 'completed_as_prescribed');
    for (const id of ids.filter((i) => i.includes('.running.'))) x = record(x, id, 'completed_as_prescribed', true);
    const c = close(x, 0);
    expect(c.ok && c.value.decisions.map((d) => [d.sport, d.decision])).toEqual([['strength', 'HOLD'], ['running', 'REGRESS']]);
    const only = { rules: [{ sport: 'hyrox', when: {}, decision: 'HOLD' }] };
    const b = close(x, 0, programmeGovernance({ policy: only }));
    expect(b.ok && b.value.decisions[0]).toMatchObject({ decision: 'BLOCKED', reasons: expect.arrayContaining([expect.objectContaining({ params: { sport: 'strength', cause: 'NO_RULE_APPLIES' } })]) });
  });

  it('variante DÉCLARÉE : PROGRESS ⇒ intention suivante = variante (aucune dose touchée) ; semaine 2 la transmet au planificateur', () => {
    const r = plan(make({ sports: [{ sport: 'strength', sessionsPerWeek: 2, intent: { ...definition().sports[0]!.intent }, variants: { PROGRESS: { phase: 'phase.intensification' } } }, { sport: 'running', sessionsPerWeek: 2, intent: { ...RUNNING_INTENT } }] }), 0);
    const ids = r.week.requests.filter((x) => x.status === 'planned').map((x) => x.requestId);
    const c = close(ids.reduce((acc, id) => record(acc, id, 'completed_as_prescribed'), r.state), 0);
    if (!c.ok) throw new Error('clôture attendue');
    expect(c.value.current.find((x) => x.sport === 'strength')?.intent.phase).toBe('phase.intensification');
    expect(weekIntent(c.value, 1).demands[0]?.intent.phase).toBe('phase.intensification');
  });

  it('semaine non terminée ⇒ clôture refusée (séances encore à venir) ; résultat inconnu ou en double ⇒ refus', () => {
    const { s, ids } = week1();
    expect(close(s, 0, programmeGovernance(), START)).toMatchObject({ ok: false, reasons: [{ code: PG_CODES.WEEK_NOT_OVER }] });
    expect(recordProgrammeResult(s, { requestId: 'x', completion: 'missed', pain: false, recordedAt: AT })).toMatchObject({ ok: false, reasons: [{ code: PG_CODES.RESULT_UNKNOWN_REQUEST }] });
    const once = record(s, ids[0] ?? '', 'modified');
    expect(recordProgrammeResult(once, { requestId: ids[0] ?? '', completion: 'modified', pain: false, recordedAt: AT })).toMatchObject({ ok: false, reasons: [{ code: PG_CODES.RESULT_DUPLICATE }] });
  });
});

describe('évaluations (contrat ; chemin réel Running TEST couvert en E2E applicatif)', () => {
  const withTest = () => make({ sports: [{ sport: 'strength', sessionsPerWeek: 2, intent: { ...definition().sports[0]!.intent } }, { sport: 'running', sessionsPerWeek: 2, intent: { ...RUNNING_INTENT }, assessment: { kind: 'TIME_TRIAL', intent: { ...RUNNING_INTENT, archetypeId: 'running.test' } } }] });

  it('REASSESS ⇒ évaluation demandée pour la semaine suivante ; elle SURCHARGE la 1re séance du sport (intention d’évaluation déclarée)', () => {
    const r = plan(withTest(), 0);
    const ids = r.week.requests.filter((x) => x.status === 'planned').map((x) => x.requestId);
    const c = close(ids.reduce((acc, id) => record(acc, id, 'completed_as_prescribed'), r.state), 0);
    if (!c.ok) throw new Error('clôture attendue');
    expect(c.value.assessments[0]).toMatchObject({ sport: 'running', kind: 'TIME_TRIAL', requestedAtWeek: 0, scheduledWeek: 1, status: 'requested' });
    const next = weekIntent(c.value, 1);
    expect(next.assessments).toEqual(['prog.test.running.w1']);
    expect(next.demands.find((d) => d.sport === 'running')?.overrides).toEqual([{ index: 1, intent: { ...RUNNING_INTENT, archetypeId: 'running.test' } }]);
  });

  it('évaluation planifiée puis manquée ⇒ result_missing ; la décision suivante voit « result_missing » (politique décide, sinon BLOCKED)', () => {
    const r = plan(withTest(), 0);
    const ids = r.week.requests.filter((x) => x.status === 'planned').map((x) => x.requestId);
    const c = close(ids.reduce((acc, id) => record(acc, id, 'completed_as_prescribed'), r.state), 0);
    if (!c.ok) throw new Error('clôture attendue');
    const w2 = plan(c.value, 1, { today: addDays(START, 7) });
    const a = w2.state.assessments[0];
    expect(a?.status === 'scheduled' || a?.status === 'not_planned').toBe(true);
    if (a?.status !== 'scheduled') return;
    expect(requestIntent(w2.state, a.requestId ?? '')?.archetypeId).toBe('running.test');
    const c2 = close(w2.state, 1, programmeGovernance({ policy: { rules: [] } }));
    if (!c2.ok) throw new Error('clôture attendue');
    expect(c2.value.assessments[0]?.status).toBe('result_missing');
    expect(c2.value.decisions.filter((d) => d.weekIndex === 1).map((d) => d.decision)).toEqual(['BLOCKED', 'BLOCKED']);
    expect(c2.value.decisions.find((d) => d.weekIndex === 1 && d.sport === 'running')?.facts.assessment).toBe('result_missing');
  });
});

describe('déterminisme', () => {
  it('mêmes entrées ⇒ même état longitudinal, octet par octet', () => {
    const run = () => {
      const r = plan(make(FOUR_SPORTS), 0);
      const ids = r.week.requests.filter((x) => x.status === 'planned').map((x) => x.requestId);
      const c = close(ids.slice(1).reduce((acc, id) => record(acc, id, 'completed_as_prescribed'), r.state), 0);
      return JSON.stringify(c);
    };
    expect(run()).toBe(run());
  });
});
