/**
 * Reprise RC5 lot 4.4 (chantier E) — lecture R4 des séances allégées dans le moteur de progression RÉEL, PROPOSITION non
 * activée : sans `reading`, `updateTrack` est strictement inchangé ; avec `reading`, aucune hausse ni baisse décidée sur
 * une séance allégée (sauf règle de sécurité de la variante 6) ; preuves comptées ; R3 jamais en baisse, plafonnée.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, SetPrescription } from '@hybridsport/domain';
import { classifyExposure, durableReferenceRir, floorReferenceRir, readStrengthParams, reassessTrack, updateTrack } from '../../src/index.js';
import type { ExecutedItem, LightenedReading, StrengthTrack } from '../../src/index.js';
import { NOW, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';

const P = readStrengthParams(strengthRuleset()).values;
const E = strengthCatalog().exercise('ex.bench_press') as Exercise;
const work = (kg: number, rir: number): SetPrescription[] => Array.from({ length: 3 }, () => ({ kind: 'working', reps: 6, restAfterS: 120, intensity: { mode: 'load', kg, certainty: 'prescribed', effort: { rir } } }));
const done = (kg: number, reps: number, rir: number) => Array.from({ length: 3 }, () => ({ reps, loadKg: kg, rir }));
const exec = (kg: number, prescribedRir: number, reps: number, rir: number): ExecutedItem => ({ exerciseId: E.id, prescribed: work(kg, prescribedRir), performed: done(kg, reps, rir), sessionCompleted: true });
const track = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({
  trackId: 'track.r4', tier: 'anchor', exerciseId: E.id, archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'autoregulated', status: 'active', openedAt: NOW,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, cycleStartLoadKg: 80, e1rmKg: 100, nextPrescription: { sets: 3, reps: 6, loadKg: 80, rir: 2 }, ...o,
});
const R4: LightenedReading = { policy: 'r4', referenceRir: 2 };
const run = (t: StrengthTrack, x: ExecutedItem, r?: LightenedReading) => updateTrack(t, x, classifyExposure(x, P), E, P, 'accumulation', undefined, r);

describe('R4 (option) : séance allégée', () => {
  it('sans lecture : comportement actuel strictement identique (même résultat avec une lecture sur une séance NON allégée)', () => {
    const x = exec(80, 2, 6, 3);
    expect(run(track({ consecutiveSuccess: 1 }), x, R4)).toEqual(run(track({ consecutiveSuccess: 1 }), x));
  });
  it('réussite allégée : preuve comptée, e1RM mise à jour, aucune hausse ; la hausse vient à la séance NON allégée suivante', () => {
    const u = run(track(), exec(80, 4, 6, 4), R4);
    expect(u.track.nextPrescription?.loadKg).toBe(80);
    expect(u.track.consecutiveSuccess).toBe(1);
    expect(u.reasons.map((r) => r.params.cause)).toEqual(['lightened_evidence']);
    // La règle actuelle aurait, elle, décidé sur la séance allégée (preuves réunies).
    const current = run(track({ consecutiveSuccess: 1 }), exec(80, 4, 6, 4));
    expect(current.reasons.map((r) => r.code)).toContain('PROGRESSION.ADVANCED');
    const v = run(u.track, exec(80, 2, 6, 3), R4);
    expect((v.track.nextPrescription?.loadKg ?? 0)).toBeGreaterThan(80);
  });
  it('en dessous sur une séance allégée : maintien SANS compteur (R4) — jamais une baisse', () => {
    let t = track();
    for (let k = 0; k < 4; k++) t = run(t, exec(80, 4, 4, 0), R4).track;
    expect(t.nextPrescription?.loadKg).toBe(80);
    expect(t.consecutiveBelow).toBe(0);
  });
  it('variante 6 : 3 séances allégées consécutives en dessous ⇒ baisse (−10 %) ; 2 ne suffisent pas', () => {
    const V6: LightenedReading = { policy: 'r4_floor_r3_safety', referenceRir: 2, safetyBelow: 3 };
    let t = track();
    for (let k = 0; k < 2; k++) t = run(t, exec(80, 4, 4, 0), V6).track;
    expect(t.nextPrescription?.loadKg).toBe(80);
    const u = run(t, exec(80, 4, 4, 0), V6);
    // Même formule que la baisse actuelle : −10 %, arrondi inférieur au pas réalisable (barre : 5 kg).
    expect(u.track.nextPrescription?.loadKg).toBe(70);
    expect(u.reasons.map((r) => r.code)).toEqual(['PROGRESSION.REGRESSED']);
  });
  it('exception plancher : un allègement récurrent devient la référence (séance lue comme normale) ; sinon référence de base', () => {
    expect(floorReferenceRir([4, 4], 2, 2)).toBe(4);
    expect(floorReferenceRir([2, 4], 2, 2)).toBe(2);
    expect(floorReferenceRir([4], 2, 2)).toBe(2);
    const F: LightenedReading = { policy: 'r4_floor', referenceRir: 2, floorRir: 4 };
    const x = exec(80, 4, 6, 5);
    expect(run(track({ consecutiveSuccess: 1 }), x, F)).toEqual(run(track({ consecutiveSuccess: 1 }), x));
  });
  it('référence durable : base + niveau / phase selon la politique de conflit du ruleset (jamais l’interférence)', () => {
    expect(durableReferenceRir(2, P, 'intermediate', 'accumulation')).toBe(2);
    expect(durableReferenceRir(2, P, 'beginner', 'accumulation')).toBe(3);
  });
});

describe('R3 (option) : réévaluation de fin de cycle', () => {
  it('charge recalculée depuis l’e1RM, jamais en baisse, jamais au-delà du plafond de cycle', () => {
    const up = reassessTrack(track({ e1rmKg: 120 }), E, P);
    const kg = up.track.nextPrescription?.loadKg ?? 0;
    expect(kg).toBeGreaterThan(80);
    expect(kg).toBeLessThanOrEqual(80 * (1 + P['strength.progression'].cycleCapFraction));
    expect(reassessTrack(track({ e1rmKg: 60 }), E, P).track.nextPrescription?.loadKg).toBe(80);
    expect(reassessTrack(track({ model: 'linear_load' }), E, P).reasons).toEqual([]);
  });
});
