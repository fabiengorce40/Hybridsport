/**
 * Reprise RC5 lot 4.5 (chantier A) — RIR de référence de la prescription : `referenceCell` reproduit EXACTEMENT la
 * cellule du moteur (`doseCell` → `personalizedDoseCell`) ; `createTrack` mémorise donc le RIR réellement prescrit
 * (avant 4.5 : cellule brute, d'où une référence inférieure au prescrit pour un accessoire personnalisé ou un profil
 * multisport). Séries lourdes et séries de retour : même effort de référence ; montées en charge exclues.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, SetPrescription } from '@hybridsport/domain';
import { createTrack, exerciseClass, readStrengthParams, referenceCell } from '../../src/index.js';
import type { StrengthPersonalization } from '../../src/index.js';
import { GOLDENS } from '../fixtures/goldens.js';
import { goldenOutcome } from '../fixtures/golden-record.js';
import { NOW, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';

const P = readStrengthParams(strengthRuleset()).values;
const C = strengthCatalog();
const ex = (id: string) => C.exercise(id) as Exercise;
const pers = (o: Partial<StrengthPersonalization> = {}): StrengthPersonalization => ({ version: 1, completed: true, outcome: 'muscle', priorities: [], experience: { months: 24, regularSessions: 3, technique: 'confident' }, sessionMinutes: 60, days: [0, 2, 4], recovery: 'normal', avoidAreas: [], avoidExercises: [], likedExercises: [], painNow: false, ...o } as StrengthPersonalization);
const work = (rir: number): SetPrescription[] => [{ kind: 'working', reps: 10, restAfterS: 60, intensity: { mode: 'load', kg: 30, certainty: 'prescribed', effort: { rir } } }];

describe('cellule de référence = cellule réellement prescrite', () => {
  it('sans personnalisation : cellule du ruleset (comportement antérieur)', () => {
    const profile = P['strength.stimuli'].strength_volume?.doseProfile ?? '';
    const raw = P['strength.dose.base'][profile]?.accessory;
    expect(raw).toBeDefined();
    const e = ex('ex.leg_curl');
    expect(referenceCell({ exercise: e, role: 'accessory', stimulus: 'strength_volume' }, P)).toEqual(raw?.[exerciseClass(e, P)]);
  });
  it('profil multisport : prudence de la politique (RIR relevé) appliquée à la référence comme à la prescription', () => {
    const rule = P['strength.personalization'];
    if (!rule) return; // ruleset de test sans politique : contrôlé côté app-core (rc5-lot45-reference-rir)
    const base = referenceCell({ exercise: ex('ex.back_squat'), role: 'primary', stimulus: 'strength_volume', personalization: pers() }, P)?.rir ?? 0;
    const multi = referenceCell({ exercise: ex('ex.back_squat'), role: 'primary', stimulus: 'strength_volume', personalization: pers(), otherSports: ['running'] }, P)?.rir ?? 0;
    expect(multi).toBe(Math.max(base, rule.cautiousRir));
  });
  it('createTrack : RIR de la track = RIR de la cellule de référence (et non de la cellule brute)', () => {
    const t = createTrack({ tier: 'tracked', archetypeId: 'str_lower', slotId: 'lo.iso_lower', exercise: ex('ex.leg_curl'), model: 'double_progression', prescribed: work(2), performed: [{ reps: 10, loadKg: 30, rir: 2 }], at: NOW, stimulus: 'strength_volume', role: 'accessory' }, P).track;
    expect(t.nextPrescription?.rir).toBe(referenceCell({ exercise: ex('ex.leg_curl'), role: 'accessory', stimulus: 'strength_volume' }, P)?.rir);
  });
});

describe('série lourde et séries de retour (golden S5, avancé, force)', () => {
  it('même effort prescrit pour la série lourde et les séries de retour ; montées en charge sans effort (exclues des calculs)', () => {
    const g = GOLDENS.S5;
    if (!g) throw new Error('S5');
    const o = goldenOutcome(g.scenario);
    if (o.outcome.result.status !== 'ok') throw new Error('séance attendue');
    const squat = o.outcome.result.value.blocks.flatMap((b) => b.items).find((it) => it.exerciseId === 'ex.back_squat');
    const sets = squat?.prescription.type === 'sets' ? squat.prescription.sets : [];
    const rir = (s: SetPrescription) => { const eff = s.intensity && 'effort' in s.intensity ? s.intensity.effort : undefined; return eff && 'rir' in eff ? eff.rir : s.rir; };
    const top = sets.filter((s) => s.kind === 'top_set'); const back = sets.filter((s) => s.kind === 'backoff');
    expect(top).toHaveLength(1);
    expect(back.length).toBeGreaterThan(0);
    expect(new Set([...top, ...back].map(rir)).size).toBe(1);
    // Première série de travail = série lourde : c'est elle qui sert au classement de l'exposition.
    expect(sets.find((s) => s.kind !== 'rampup')?.kind).toBe('top_set');
    for (const s of sets.filter((x) => x.kind === 'rampup')) expect(rir(s)).toBeUndefined();
  });
});
