/**
 * M3.1 — rotation « équilibrée » du PROGRAMME (fail-closed) : le programme choisit l'archétype de chaque séance parmi
 * les candidates GOUVERNÉES, d'après son historique ; PRODUCTION / politique absente / objectif sans candidates ⇒ aucune
 * assignation (demande non planifiée, tracé), jamais un archétype inventé. Réalisation manuelle d'une séance composée
 * mais non placée : provenance `manual_from_unplaced`, jour réel, jamais « manquée ». Politique : TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import { createProgramme, planProgrammeWeek, recordProgrammeResult, zSportPlan } from '../../src/index.js';
import type { ProgrammeState } from '../../src/index.js';
import { definition, START } from '../fixtures.js';
import { rotationGovernance } from '../rotation-governance.js';
import { ALL_PORTS, clock, days, plannerGovernance } from '../../../planner/tests/fixtures.js';

const AT = '2026-10-05T06:00:00Z';
const FRAME = { stimulus: 'stim.hybrid_race.h2.rotation', objective: 'objective.hybrid_race.h2', phase: 'phase.hybrid_race.base', toleranceProfile: 'for_time' };
const balancedDef = (sessions = 2, goal = 'RACE_PREPARATION') => definition({
  priorities: ['hyrox'], goals: [{ goalId: 'g.hr', sport: 'hyrox', goal: 'RACE_PREPARATION' }],
  sports: [{ sport: 'hyrox', sessionsPerWeek: sessions, intent: { ...FRAME }, rotation: { kind: 'balanced', goal } }],
});
const start = (sessions = 2, goal = 'RACE_PREPARATION'): ProgrammeState => { const r = createProgramme(balancedDef(sessions, goal), AT); if (!r.ok) throw new Error(JSON.stringify(r.reasons)); return r.value; };
const deps = (o: { gov?: ReturnType<typeof rotationGovernance> | undefined; mode?: 'CANDIDATE' | 'PRODUCTION' } = {}) => ({
  today: START, at: AT, mode: o.mode ?? 'CANDIDATE', ports: ALL_PORTS(), plannerGovernance: plannerGovernance(), programmeGovernance: 'gov' in o ? o.gov : rotationGovernance(), clock, days: days(),
});
const plan = (s: ProgrammeState, o: Parameters<typeof deps>[0] = {}) => { const r = planProgrammeWeek(s, 0, deps(o)); if (!r.ok) throw new Error(JSON.stringify(r.reasons)); return r.value; };
const overrides = (v: ReturnType<typeof plan>) => v.intent.demands.find((d) => d.sport === 'hyrox')?.overrides.map((o) => o.intent.archetypeId) ?? [];
const codes = (v: ReturnType<typeof plan>) => v.state.audit.map((a) => a.reason.code);

describe('rotation : gouvernance fail-closed', () => {
  it('30. politique TEST_ONLY : un archétype par séance, tous différents, tracé ROTATION_ASSIGNED', () => {
    const v = plan(start(3));
    expect(overrides(v)).toHaveLength(3);
    expect(new Set(overrides(v)).size).toBe(3);
    expect(codes(v)).toContain('PLAN.PROGRAMME.ROTATION_ASSIGNED');
  });
  it('31. PRODUCTION : politique draft refusée ⇒ aucune assignation, ROTATION_UNAVAILABLE, demande non planifiée', () => {
    const v = plan(start(), { mode: 'PRODUCTION' });
    expect(overrides(v)).toEqual([]);
    expect(codes(v)).toContain('RULE.PROGRAMME.ROTATION_UNAVAILABLE');
    expect(v.week.requests.every((r) => r.status !== 'planned' && !(r.status === 'unplaced' && r.composed))).toBe(true);
  });
  it('32. politique absente ⇒ aucune assignation (jamais un rôle par défaut)', () => {
    const v = plan(start(), { gov: undefined });
    expect(overrides(v)).toEqual([]);
    expect(v.week.requests.every((r) => r.category === 'programme_intent_incomplete')).toBe(true);
  });
  it('33. paramètre de sélection absent ⇒ POLICY_UNAVAILABLE', () => {
    const v = plan(start(), { gov: rotationGovernance({}, { omit: ['programme.rotation.selection'] }) });
    expect(overrides(v)).toEqual([]);
    expect(v.state.audit.find((a) => a.reason.code === 'RULE.PROGRAMME.ROTATION_UNAVAILABLE')?.reason.params.cause).toBe('POLICY_UNAVAILABLE');
  });
  it('34. objectif sans candidates gouvernées ⇒ NO_CANDIDATES_FOR_GOAL', () => {
    const v = plan(start(2, 'UNKNOWN_GOAL'));
    expect(v.state.audit.find((a) => a.reason.code === 'RULE.PROGRAMME.ROTATION_UNAVAILABLE')?.reason.params.cause).toBe('NO_CANDIDATES_FOR_GOAL');
  });
  it('35. candidates invalides (liste vide) ⇒ politique illisible, aucune assignation', () => {
    expect(overrides(plan(start(), { gov: rotationGovernance({}, { values: { 'programme.rotation.candidates': { hyrox: { RACE_PREPARATION: [] } } } }) }))).toEqual([]);
  });
  it('36. critère inconnu ⇒ politique illisible', () => {
    expect(overrides(plan(start(), { gov: rotationGovernance({}, { values: { 'programme.rotation.selection': { order: ['random'], executedCompletions: [] } } }) }))).toEqual([]);
  });
  it('37. plan à rotation : archétype déclaré refusé ; composition par le moteur refusée', () => {
    expect(zSportPlan.safeParse({ sport: 'hyrox', sessionsPerWeek: 2, intent: { ...FRAME, archetypeId: 'x' }, rotation: { kind: 'balanced', goal: 'G' } }).success).toBe(false);
    expect(zSportPlan.safeParse({ sport: 'hyrox', sessionsPerWeek: 2, composition: 'engine', intent: { ...FRAME }, rotation: { kind: 'balanced', goal: 'G' } }).success).toBe(false);
  });
  it('38. déterminisme : même état ⇒ mêmes assignations', () => {
    expect(overrides(plan(start(3)))).toEqual(overrides(plan(start(3))));
  });
  it('39. plus de séances que de candidates : chaque candidate une fois avant toute reprise', () => {
    const o = overrides(plan(start(7)));
    expect(new Set(o.slice(0, 5)).size).toBe(5);
    expect(o).toHaveLength(7);
  });
});

describe('réalisation manuelle d\'une séance composée mais non placée (programme)', () => {
  it('40. résultat manuel : jour réel exigé, provenance manual_from_unplaced ; jamais « manquée » ; jamais deux fois', () => {
    const s0 = start();
    const ps: ProgrammeState = { ...s0, weeks: [{ weekIndex: 0, weekStart: START, intent: { weekIndex: 0, weekStart: START, phase: null, demands: [], assessments: [] }, plannedAt: AT, plannerRef: START, requests: [{ requestId: 'r1', sport: 'hyrox', status: 'unplaced', category: 'slot_unavailable', composedUnplaced: true }, { requestId: 'r2', sport: 'hyrox', status: 'unplaced', category: 'slot_unavailable' }] }] };
    expect(recordProgrammeResult(ps, { requestId: 'r1', completion: 'modified', pain: false, recordedAt: AT }).ok).toBe(false);
    expect(recordProgrammeResult(ps, { requestId: 'r1', completion: 'missed', pain: false, recordedAt: AT, executedOn: '2026-10-06' }).ok).toBe(false);
    expect(recordProgrammeResult(ps, { requestId: 'r2', completion: 'modified', pain: false, recordedAt: AT, executedOn: '2026-10-06' }).ok).toBe(false);
    const r = recordProgrammeResult(ps, { requestId: 'r1', completion: 'modified', pain: false, recordedAt: AT, executedOn: '2026-10-06' });
    expect(r.ok && r.value.results[0]).toMatchObject({ provenance: 'manual_from_unplaced', date: '2026-10-06' });
    expect(r.ok && recordProgrammeResult(r.value, { requestId: 'r1', completion: 'modified', pain: false, recordedAt: AT, executedOn: '2026-10-06' }).ok).toBe(false);
  });
});
