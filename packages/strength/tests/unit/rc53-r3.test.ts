/**
 * RC5.3 lot R3 — mésocycles (contenu 0.12.0) : arrondi des séries en décharge, capacité observée d'un cycle, début de
 * cycle (plafond et refus remis à zéro, une fois par cycle) et réévaluation SUR PREUVE des principaux — progression
 * « non évaluable » sans preuve suffisante (aucune hausse inventée), baisse bornée, hausse bornée.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise } from '@hybridsport/domain';
import { computeDose, cycleCapacity, readStrengthParams, startTrackCycle } from '../../src/index.js';
import type { StrengthTrack } from '../../src/index.js';
import { envFor, NOW, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { strengthF6CatalogDocument } from '../fixtures/f6.js';
import { RC53_R3_RULESET_VERSION, strengthRc53R2RulesetDocument, strengthRc53R3RulesetDocument } from '../fixtures/rc53.js';

const R3 = strengthRuleset(strengthRc53R3RulesetDocument());
const R2 = strengthRuleset(strengthRc53R2RulesetDocument());
const P = readStrengthParams(R3).values;
const P2 = readStrengthParams(R2).values;
const CATALOG = strengthCatalog(strengthF6CatalogDocument());
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const SQUAT = ex('ex.back_squat');
const AT = NOW;
const squat = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({
  trackId: 'track.squat', tier: 'anchor', exerciseId: 'ex.back_squat', archetypeId: 'str_lower_a', slotId: 'la.main_knee', model: 'linear_load', status: 'active', openedAt: NOW,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, cycleStartLoadKg: 40, nextPrescription: { sets: 3, reps: 6, loadKg: 40, rir: 2 }, ...o,
});
// Exposition de squat 6 répétitions à 40 kg avec un RIR déclaré : e1RM = 40 × (1 + (6 + RIR) / 30).
const expo = (rir: number | undefined, kg = 40, reps = 6) => ({ sets: [{ reps, loadKg: kg, ...(rir !== undefined ? { rir } : {}) }] });
const codes = (r: { reasons: readonly { code: string; params: Record<string, unknown> }[] }) => r.reasons.map((x) => `${x.code}${x.params.cause ? `:${String(x.params.cause)}` : ''}`);

describe('contenu RC5.3 R3', () => {
  it('version 0.12.0 ; cycles 6 / 5 / 4 semaines (débutant / intermédiaire / avancé), réglage 4–6, arrondi au plus proche', () => {
    expect(R3.version).toBe(RC53_R3_RULESET_VERSION);
    expect(P['strength.progression.policy']?.mesocycle).toMatchObject({ lengths: { beginner: 6, intermediate: 5, advanced: 4 }, userRange: { min: 4, max: 6 }, deloadSetsRounding: 'nearest' });
    expect(P2['strength.progression.policy']?.mesocycle).toBeUndefined();
  });
});

describe('décharge : séries × 0,6 arrondies au plus proche (minimum 1), RIR + 2', () => {
  const opts = { role: 'secondary' as const, timePressure: false, doubleProgression: false, calibration: false };
  const deload = (ruleset: typeof R3) => envFor(scenario({ ruleset, context: { phase: { kind: 'deload', weekInMesocycle: 1, mesocycleLength: 1 } } }));
  const normal = envFor(scenario({ ruleset: R3 }));
  it('3 séries ⇒ 2 (R3) ; avant R3 : 1 (arrondi inférieur, contenu R2 inchangé) ; RIR relevé de 2', () => {
    const d = computeDose(SQUAT, deload(R3), { ...opts, allocatedSets: 3 });
    expect(d.sets).toBe(2);
    expect(computeDose(SQUAT, deload(R2), { ...opts, allocatedSets: 3 }).sets).toBe(1);
    expect(d.rir).toBe(computeDose(SQUAT, normal, { ...opts, allocatedSets: 3 }).rir + 2);
  });
  it('4 ⇒ 2, 5 ⇒ 3, 1 ⇒ 1 (minimum)', () => {
    const sets = (n: number) => computeDose(SQUAT, deload(R3), { ...opts, allocatedSets: n }).sets;
    expect([sets(4), sets(5), sets(1)]).toEqual([2, 3, 1]);
  });
});

describe('capacité observée d’un cycle', () => {
  it('médiane des e1RM des expositions À EFFORT SAISI ; une exposition sans RIR n’est pas une preuve', () => {
    const c = cycleCapacity([expo(2), expo(4), expo(undefined), expo(3)], P);
    expect(c.exposures).toBe(3);
    expect(c.e1rmKg).toBeCloseTo(40 * (1 + 9 / 30), 6);
    expect(cycleCapacity([expo(undefined), expo(undefined)], P)).toEqual({ exposures: 0 });
  });
  it('effort au-delà de la plage valide (6 + 9 > 12) : preuve censurée, comptée à la borne haute (jamais extrapolée)', () => {
    expect(cycleCapacity([expo(9), expo(11)], P)).toEqual({ e1rmKg: 40 * (1 + 12 / 30), exposures: 2 });
  });
});

describe('début de cycle et réévaluation sur preuve', () => {
  it('preuve insuffisante ⇒ « non évaluable » : état explicite, tracé, charge conservée (aucune hausse inventée)', () => {
    const r = startTrackCycle(squat(), { cycle: 1, at: AT, capacity: cycleCapacity([expo(undefined), expo(5)], P) }, SQUAT, P);
    expect(codes(r)).toEqual(['PROGRESSION.CYCLE_STARTED', 'PROGRESSION.NOT_EVALUABLE:insufficient_effort_data']);
    expect(r.track.nextPrescription?.loadKg).toBe(40);
    expect(r.track.evaluation).toEqual({ status: 'not_evaluable', cause: 'insufficient_effort_data', at: AT });
    expect(r.track.cycleIndex).toBe(1);
  });
  it('trop légère (idéale ≥ charge + 1 pas) ⇒ hausse d’au plus 2 pas ; « non évaluable » effacé', () => {
    // RIR réels 6 à 45 kg × 6 : e1RM = 63 kg ⇒ idéale (8 répétitions jusqu'à l'échec, 80 %) 50 kg ⇒ +2 pas au plus.
    const t = squat({ evaluation: { status: 'not_evaluable', cause: 'insufficient_effort_data', at: AT } });
    const r = startTrackCycle(t, { cycle: 1, at: AT, capacity: cycleCapacity([expo(6, 45), expo(6, 45)], P) }, SQUAT, P);
    expect(codes(r)).toContain('PROGRESSION.REEVALUATED:too_light');
    expect(r.track.nextPrescription?.loadKg).toBe(45);
    expect(r.track.cycleStartLoadKg).toBe(45);
    expect(r.track.evaluation).toBeUndefined();
  });
  it('moins d’un pas d’écart : charge conservée ; un pas d’écart : +1 pas', () => {
    // RIR 3 à 40 kg × 6 : e1RM 52 kg ⇒ idéale (8 répétitions jusqu'à l'échec, 80 %) 41,6 ⇒ 40 kg ⇒ aucune hausse.
    const r = startTrackCycle(squat(), { cycle: 1, at: AT, capacity: cycleCapacity([expo(3), expo(3)], P) }, SQUAT, P);
    expect(r.track.nextPrescription?.loadKg).toBe(40);
    expect(codes(r)).toEqual(['PROGRESSION.CYCLE_STARTED']);
    // RIR 4 : e1RM ≈ 53,3 kg ⇒ idéale 42,5 kg ⇒ +1 pas.
    expect(startTrackCycle(squat(), { cycle: 1, at: AT, capacity: cycleCapacity([expo(4), expo(4)], P) }, SQUAT, P).track.nextPrescription?.loadKg).toBe(42.5);
  });
  it('trop lourde (idéale < charge − 1 pas) ⇒ baisse vers l’idéale, au plus −10 % (60 ⇒ 55 kg, jamais 52,5)', () => {
    const t = squat({ nextPrescription: { sets: 3, reps: 6, loadKg: 60, rir: 2 }, cycleStartLoadKg: 55 });
    const r = startTrackCycle(t, { cycle: 2, at: AT, capacity: cycleCapacity([expo(0, 40), expo(0, 40)], P) }, SQUAT, P);
    expect(codes(r)).toContain('PROGRESSION.REEVALUATED:too_heavy');
    expect(r.track.nextPrescription?.loadKg).toBe(55);
  });
  it('plafond de gain par cycle : référence = charge du nouveau cycle ; refus d’essai et essai en cours remis à zéro', () => {
    const t = squat({ nextPrescription: { sets: 3, reps: 6, loadKg: 45, rir: 2 }, cycleStartLoadKg: 40, probeRefused: { kg: 47.5, at: AT } });
    const r = startTrackCycle(t, { cycle: 1, at: AT, capacity: cycleCapacity([expo(2, 45), expo(2, 45)], P) }, SQUAT, P);
    expect(r.track.cycleStartLoadKg).toBe(45);
    expect(r.track.probeRefused).toBeUndefined();
  });
  it('une seule fois par cycle ; accessoire en double progression : plafond remis à zéro, aucune réévaluation ; sans la politique : inchangé', () => {
    const once = startTrackCycle(squat(), { cycle: 1, at: AT, capacity: cycleCapacity([expo(6), expo(6)], P) }, SQUAT, P).track;
    expect(startTrackCycle(once, { cycle: 1, at: AT, capacity: cycleCapacity([expo(6), expo(6)], P) }, SQUAT, P)).toEqual({ track: once, reasons: [] });
    const acc = squat({ model: 'double_progression', tier: 'tracked', nextPrescription: { sets: 3, reps: { min: 8, max: 12 }, loadKg: 30, rir: 2 }, cycleStartLoadKg: 25 });
    const a = startTrackCycle(acc, { cycle: 1, at: AT, capacity: cycleCapacity([expo(6), expo(6)], P) }, SQUAT, P);
    expect([a.track.nextPrescription?.loadKg, a.track.cycleStartLoadKg, codes(a)]).toEqual([30, 30, ['PROGRESSION.CYCLE_STARTED']]);
    expect(startTrackCycle(squat(), { cycle: 1, at: AT, capacity: { exposures: 0 } }, SQUAT, P2)).toEqual({ track: squat(), reasons: [] });
  });
});
