/**
 * Composition hebdomadaire PAR LE MOTEUR (Running, §R) appelée par le planificateur : le programme demande N séances
 * et un cadre d'intention sans archétype ; le planificateur réserve les jours ; Running choisit l'archétype de chaque
 * jour (sonde = génération réelle) ; autorité lue dans la résolution de ses règles ; PRODUCTION sans règles
 * approuvées ⇒ refus (aucun jour réservé). Provenance du planificateur obligatoire pour un appel multisport protégé.
 * Valeurs : TEST_ONLY (gouvernances candidates existantes et fixtures).
 */
import { describe, expect, it } from 'vitest';
import { ARCHETYPE_INTENT_IDS, createRunningEngine } from '@hybridsport/running';
import { GP_CODES, PLANNER_PROVENANCE_NOTE, createEnginePort, planMultisportWeek, requirePlannerProvenance, runningPort, zPlannerInput } from '../../src/index.js';
import type { PlannerInput, PlannerMode, SportPort, SportPorts } from '../../src/index.js';
import { runningContent } from '../../../app-core/src/provisional-content.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { PROFILE, RUNNING_INTENT, WEEK, clock, days, input, plannerGovernance, running, runningBase, runningGovernance, strength, want, withDemand } from '../fixtures.js';

const { archetypeId: _declared, ...FRAME } = RUNNING_INTENT;
const TEST_INTENT = { ...RUNNING_INTENT, archetypeId: ARCHETYPE_INTENT_IDS.TEST };
const ARCHETYPE_IDS = Object.values(ARCHETYPE_INTENT_IDS);

/** Port Running avec la composition du moteur (paramètres de la gouvernance candidate existante). */
function composing(o: { goal?: string; observedDistanceM?: number; protectedEngine?: boolean } = {}): SportPort {
  const g = runningGovernance();
  const base = runningBase();
  const free = base.sessionHistory?.[0];
  const engine = createRunningEngine({ governance: g, simulation: true }) as never;
  return runningPort({
    engine: o.protectedEngine ? requirePlannerProvenance(engine) : engine, content: withDemand(runningContent()), profile: PROFILE, state: STATE_FRESH, history: [], clock,
    baseContext: { ...base, goal: { type: (o.goal ?? 'GENERAL_RUNNING') as never }, sessionHistory: free && o.observedDistanceM !== undefined ? [{ ...free, distanceM: o.observedDistanceM }] : base.sessionHistory ?? [] },
    composition: { parameters: g.parameters },
  });
}
const runs = (n: number, o: Partial<PlannerInput['demands'][number]> = {}) => want('running', n, { intent: { ...FRAME }, composition: 'engine', ...o });
const plan = (demands: PlannerInput['demands'], ports: SportPorts, o: { minutes?: number[]; mode?: PlannerMode } = {}) =>
  planMultisportWeek(input(demands, { days: days(o.minutes), mode: o.mode ?? 'CANDIDATE' }), ports, plannerGovernance(), clock);
const codes = (rs: readonly { code: string }[]) => rs.map((r) => r.code);

describe('composition Running par le moteur', () => {
  it('mono-sport : N séances demandées, archétype de chaque jour choisi par Running, autorité provisoire tracée', () => {
    const w = plan([runs(3)], { running: composing() });
    const rs = w.requests.filter((r) => r.sport === 'running');
    expect(rs).toHaveLength(3);
    for (const r of rs) {
      expect(r.status).toBe('planned');
      expect(ARCHETYPE_IDS).toContain(r.intent?.archetypeId);
      expect(r.intent).toMatchObject(FRAME);
      expect(r.composition?.authority).toBe('provisional');
      expect(codes(r.reasons)).toContain(GP_CODES.COMPOSITION_APPLIED);
      expect(codes(r.reasons)).toContain('RULE.RUNNING.CANDIDATE_VALUE_USED');
      // Trace sans doublon (lectures de règles fusionnées).
      const keys = r.reasons.map((x) => `${x.code}|${JSON.stringify(x.params)}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(rs.map((r) => r.composition?.role).sort()).toEqual(['EASY', 'EASY', 'KEY']);
    // La séance persistée est celle de l'archétype composé (régénérée sur son jour, même graine).
    const key = rs.find((r) => r.composition?.role === 'KEY');
    expect(key?.status === 'planned' && key.session.id).toContain(key?.requestId);
  });

  it('archétype déclaré ET composition par le moteur : contrat refusé (aucune ambiguïté)', () => {
    expect(() => zPlannerInput.parse(input([want('running', 2, { composition: 'engine' })]))).toThrow(/archétype non déclaré/);
  });

  it('PRODUCTION sans règles de composition approuvées : refus gouvernance, AUCUN jour réservé (hybride : Strength placée seule)', () => {
    const w = plan([runs(2), want('strength', 1)], { running: composing(), strength: strength() }, { mode: 'PRODUCTION' });
    const rs = w.requests.filter((r) => r.sport === 'running');
    expect(rs.map((r) => [r.status, r.category])).toEqual([['unplaced', 'governance_blocked'], ['unplaced', 'governance_blocked']]);
    for (const r of rs) expect(codes(r.reasons)).toEqual(expect.arrayContaining([GP_CODES.COMPOSITION_UNRESOLVED, 'RULE.RUNNING.UNRESOLVED_PARAMETER']));
    expect(w.days.filter((d) => d.status === 'planned' && d.sport === 'running')).toEqual([]);
  });

  it('moteur sans composition : refus gouvernance explicite (le planificateur ne compose jamais à sa place)', () => {
    const w = plan([runs(2)], { running: running() });
    expect(w.requests.map((r) => [r.status, r.category, r.reasons[0]?.code])).toEqual([['unplaced', 'governance_blocked', GP_CODES.COMPOSITION_UNRESOLVED], ['unplaced', 'governance_blocked', GP_CODES.COMPOSITION_UNRESOLVED]]);
  });

  it('évaluation (TEST) demandée par le programme : REMPLACE une séance (verrouillée), jamais ajoutée ; réessai sur créneau plus long conservé', () => {
    const w = plan([runs(3, { overrides: [{ index: 1, intent: TEST_INTENT }] })], { running: composing({ goal: 'TEN_K', observedDistanceM: 5000 }) }, { minutes: [60, 0, 60, 0, 60, 90, 0] });
    const rs = w.requests.filter((r) => r.sport === 'running');
    expect(rs).toHaveLength(3);
    const test = rs[0];
    expect(test?.status).toBe('planned');
    expect(test?.intent).toEqual(TEST_INTENT);
    expect(test?.composition).toBeUndefined();
    expect(test?.status === 'planned' && test.date).toBe(WEEK[5]);
    expect(codes(test?.reasons ?? [])).toContain(GP_CODES.SLOT_RETRY);
    // Les autres séances sont composées autour de l'évaluation : aucune autre séance clé ni second TEST.
    for (const r of rs.slice(1)) {
      expect(r.status).toBe('planned');
      expect(['EASY', 'LONG']).toContain(r.composition?.role);
      expect(r.intent?.archetypeId).not.toBe(ARCHETYPE_INTENT_IDS.TEST);
    }
  });

  it('hybride Strength + Running : composition Running sur les jours placés, interférence revérifiée, une séance par jour', () => {
    const w = plan([want('strength', 2), runs(3)], { strength: strength(), running: composing({ protectedEngine: true }) });
    expect(w.hybrid).toBe(true);
    const planned = w.requests.filter((r) => r.status === 'planned');
    expect(planned).toHaveLength(5);
    expect(new Set(planned.map((r) => r.status === 'planned' && r.date)).size).toBe(5);
    expect(w.requests.filter((r) => r.sport === 'running').every((r) => r.composition?.authority === 'provisional')).toBe(true);
    expect(w.requests.filter((r) => r.sport === 'strength').every((r) => r.intent?.archetypeId === 'str_full_body' && r.composition === undefined)).toBe(true);
  });

  it('déterminisme : même entrée ⇒ même semaine composée', () => {
    const a = plan([want('strength', 2), runs(3)], { strength: strength(), running: composing() });
    const b = plan([want('strength', 2), runs(3)], { strength: strength(), running: composing() });
    expect(a).toEqual(b);
  });
});

describe('provenance du planificateur global', () => {
  it('Running protégé : appel multisport SANS la provenance du planificateur ⇒ refus PROVENANCE_REQUIRED', () => {
    const engine = requirePlannerProvenance(createRunningEngine({ governance: runningGovernance(), simulation: true }) as never);
    const bypass = createEnginePort({
      sport: 'running', discipline: 'running', engine, content: withDemand(runningContent()), profile: PROFILE, state: STATE_FRESH, history: [], clock,
      context: (slot) => ({ ...runningBase(), population: { level: 'P_R2', hybrid: slot.hybrid } }),
    });
    const out = bypass.generate({ requestId: 'x', date: WEEK[0], availableMinutes: 60, hybrid: true, seed: 's', intent: RUNNING_INTENT });
    expect(out.status).toBe('refused');
    expect(out.status === 'refused' && codes(out.reasons)).toContain(GP_CODES.PROVENANCE_REQUIRED);
    // Mono-sport : la provenance n'est pas exigée (chemin V0 inchangé).
    expect(bypass.generate({ requestId: 'x', date: WEEK[0], availableMinutes: 60, hybrid: false, seed: 's', intent: RUNNING_INTENT }).status).toBe('planned');
  });

  it('par le planificateur (port Running) : provenance portée par l’intention ⇒ multisport accepté', () => {
    const w = plan([want('strength', 1), want('running', 1)], { strength: strength(), running: composing({ protectedEngine: true }) });
    const r = w.requests.find((x) => x.sport === 'running');
    expect(r?.status).toBe('planned');
    expect(PLANNER_PROVENANCE_NOTE).toBe('kairo.global_planner.v2');
  });
});
