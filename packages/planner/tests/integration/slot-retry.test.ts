/**
 * Réessai BORNÉ sur contrainte de créneau : un refus dû au SEUL temps disponible (TIME_EXCEEDED) autorise le même
 * appel — même sport, même intention, même station — sur un créneau plus long ; jamais pour la sécurité, la
 * gouvernance, une intention invalide ou un autre refus. Valeurs : TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import { GP_CODES, classifyRefusal, planMultisportWeek, runningPort } from '../../src/index.js';
import { createRunningEngine } from '@hybridsport/running';
import { runningContent } from '../../../app-core/src/provisional-content.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import type { PlannerInput, SlotRequest, SportPort, SportPorts } from '../../src/index.js';
import { ALL_PORTS, PROFILE, RUNNING_INTENT, WEEK, clock, days, hyrox, input, plannerGovernance, running, runningBase, runningGovernance, strength, want, withDemand } from '../fixtures.js';
import { asISODateTime } from '@hybridsport/domain';

const reason = (code: string) => ({ code, domain: code.split('.')[0], category: 'feasibility', params: {}, ruleRefs: [], severity: 'error', audience: 'user' }) as never;
const TEST_INTENT = { ...RUNNING_INTENT, archetypeId: 'running.test' };
/** Course observée AVEC distance : allure observée nécessaire au TEST du moteur Course (TEST_ONLY). */
function testRunning(): SportPort {
  const base = runningBase();
  const free = base.sessionHistory?.[0];
  // technical-constant: TEST_ONLY — distance observée de la course libre (m)
  const observed = free ? [{ ...free, distanceM: 5000 }] : [];
  return runningPort({
    engine: createRunningEngine({ governance: runningGovernance(), simulation: true }) as never, content: withDemand(runningContent()),
    profile: PROFILE, state: STATE_FRESH, history: [], clock, baseContext: { ...base, goal: { type: 'TEN_K' }, sessionHistory: observed },
  });
}
function spy(port: SportPort): { port: SportPort; slots: SlotRequest[] } {
  const slots: SlotRequest[] = [];
  return { port: { ...port, generate: (s) => { slots.push(s); return port.generate(s); } }, slots };
}
const plan = (demands: PlannerInput['demands'], ports: SportPorts, minutes: number[]) => planMultisportWeek(input(demands, { days: days(minutes) }), ports, plannerGovernance(), clock);

describe('classification des refus', () => {
  it.each([
    [['PLAN.RUNNING.TIME_EXCEEDED'], 'retryable_slot_constraint'],
    [['FEASIBILITY.TIME_EXCEEDED', 'DURATION.ESTIMATED'], 'retryable_slot_constraint'],
    [['FEASIBILITY.TIME_EXCEEDED', 'SAFETY.PAIN.ZONE_RESTRICTED'], 'safety_blocked'],
    [['REPAIR.LOAD_TRANSFER_REFUSED'], 'safety_blocked'],
    [['SCOPE.RUNNING.HYBRID_PLANNER_UNAVAILABLE', 'PLAN.RUNNING.TIME_EXCEEDED'], 'governance_blocked'],
    [['PLAN.HYROX.STATION_NOT_REQUESTED'], 'invalid_intent'],
    [['FEASIBILITY.EQUIPMENT_MISSING'], 'non_retryable_engine_refusal'],
    [['SAFETY.HYROX.MOVEMENT_INELIGIBLE'], 'safety_blocked'],
    [[], 'non_retryable_engine_refusal'],
  ])('%j ⇒ %s', (codes, cls) => expect(classifyRefusal((codes as string[]).map(reason))).toBe(cls));
});

describe('réessai sur créneau plus long', () => {
  it('TEST Running (4 500 s estimés) : créneau de 3 600 s refusé ⇒ même TEST accepté sur un créneau ultérieur plus long', () => {
    const s = spy(testRunning());
    // technical-constant: TEST_ONLY — minutes : un seul jour assez long (samedi, 90 min)
    const w = plan([want('running', 1, { intent: TEST_INTENT })], { running: s.port }, [60, 0, 0, 0, 0, 90, 0]);
    const r = w.requests[0];
    expect(r).toMatchObject({ status: 'planned', date: WEEK[5] });
    expect(r?.reasons[0]).toMatchObject({ code: GP_CODES.SLOT_RETRY, params: { fromDate: WEEK[0], fromMinutes: 60, causes: ['PLAN.RUNNING.TIME_EXCEEDED'] } });
    // Demande STRICTEMENT identique : même intention, même sport ; seul le créneau (et sa graine) change.
    expect(s.slots.map((x) => [x.date, x.availableMinutes])).toEqual([[WEEK[0], 60], [WEEK[5], 90]]);
    expect(s.slots.every((x) => JSON.stringify(x.intent) === JSON.stringify(TEST_INTENT) && x.station === undefined)).toBe(true);
    expect(r?.status === 'planned' && r.session.blocks.flatMap((b) => b.items).map((i) => i.prescription.type)).toEqual(['run_structure']);
  });

  it('réessai borné : seuls les créneaux PLUS LONGS sont essayés ; aucun ⇒ refus « slot_unavailable », tentatives tracées', () => {
    const s = spy(testRunning());
    const w = plan([want('running', 1, { intent: TEST_INTENT })], { running: s.port }, [60, 60, 0, 45, 0, 60, 0]);
    expect(s.slots).toHaveLength(1);
    expect(w.requests[0]).toMatchObject({ status: 'refused', category: 'slot_unavailable' });
    expect(w.requests[0]?.reasons.map((x) => x.code).slice(0, 3)).toEqual([GP_CODES.SLOT_RETRY, GP_CODES.ENGINE_REFUSED, 'PLAN.RUNNING.TIME_EXCEEDED']);
  });

  it('déterministe', () => {
    const go = () => JSON.stringify(plan([want('running', 1, { intent: TEST_INTENT })], { running: testRunning() }, [60, 0, 0, 0, 0, 90, 0]));
    expect(go()).toBe(go());
  });
});

describe('aucun réessai opportuniste', () => {
  it('gouvernance (Running sans intégration planificateur) : un seul appel, refus « governance_blocked »', () => {
    const s = spy(running({ governance: runningGovernance(false) }));
    const w = plan([want('strength', 1), want('running', 1)], { strength: strength(), running: s.port }, [60, 60, 60, 60, 60, 90, 60]);
    expect(s.slots).toHaveLength(1);
    expect(w.requests.find((r) => r.sport === 'running')?.category).toBe('governance_blocked');
  });

  it('matériel absent (HYROX sans SkiErg) et intention invalide (station absente) : un seul appel chacun', () => {
    const noSki = { ...PROFILE, availableEquipment: PROFILE.availableEquipment.filter((e) => e !== 'skierg') };
    const a = spy(hyrox({ profile: noSki }));
    const wa = plan([want('hyrox', 1)], { hyrox: a.port }, [60, 60, 60, 60, 60, 90, 60]);
    expect(a.slots).toHaveLength(1);
    expect(wa.requests[0]?.category).toBe('safety_blocked');
    const b = spy(hyrox());
    plan([want('hyrox', 1, { station: undefined })], { hyrox: b.port }, [60, 60, 60, 60, 60, 90, 60]);
    expect(b.slots).toHaveLength(1);
  });

  it('douleur : refus de sécurité, jamais déplacé vers un autre jour', () => {
    const base = strength();
    const pained: SportPort = { ...base, generate: () => ({ status: 'refused', reasons: [reason('SAFETY.PAIN.ZONE_RESTRICTED'), reason('FEASIBILITY.TIME_EXCEEDED')] }) };
    const s = spy(pained);
    const w = plan([want('strength', 1)], { strength: s.port }, [60, 90, 120, 0, 0, 0, 0]);
    expect(s.slots).toHaveLength(1);
    expect(w.requests[0]?.category).toBe('safety_blocked');
    expect(asISODateTime('2026-10-05T00:00:00Z')).toBeDefined();
  });

  it('interférence toujours respectée après réessai (le créneau plus long en conflit n’est pas retenu)', () => {
    // technical-constant: TEST_ONLY — écart strict de test (heures)
    const strict = plannerGovernance(Object.fromEntries(['lower_knee', 'lower_hip', 'upper_push', 'upper_pull', 'axial', 'locomotor_impact', 'high_intensity_systemic', 'grip'].map((x) => [x, 48])));
    const w = planMultisportWeek(input([want('strength', 1), want('running', 1, { intent: TEST_INTENT })], { days: days([90, 60, 0, 0, 0, 0, 0]) }), ALL_PORTS(), strict, clock);
    const run = w.requests.find((r) => r.sport === 'running');
    expect(run?.status).not.toBe('planned');
  });
});
