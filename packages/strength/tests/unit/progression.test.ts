/**
 * Étape 12 et addendum V1.1 §4–§5 : ProgressionEngine. Quatre familles de modèles portées par la TRACK
 * (jamais par la séance) ; classification des expositions ; douleur et pause de sécurité ne sont jamais
 * des échecs ; une substitution ponctuelle ne détruit pas la track ; cycle de vie (création, clôture).
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, ISODateTime, SetPrescription } from '@hybridsport/domain';
import { asISODateTime } from '@hybridsport/domain';
import { classifyExposure, closeTrack, closureCause, createTrack, EXPOSURE_CLASSES, readStrengthParams, updateTrack } from '../../src/index.js';
import type { ExecutedItem, StrengthTrack } from '../../src/index.js';
import { NOW, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';

const P = readStrengthParams(strengthRuleset()).values;
const CATALOG = strengthCatalog();
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const work = (n: number, reps: SetPrescription['reps'], kg: number, rir = 2): SetPrescription[] => Array.from({ length: n }, () => ({ kind: 'working', reps, restAfterS: 120, intensity: { mode: 'load', kg, certainty: 'prescribed', effort: { rir } } }));
const item = (o: Partial<ExecutedItem> & { performed: ExecutedItem['performed'] }, prescribed = work(3, 8, 80)): ExecutedItem => ({ exerciseId: 'ex.bench_press', prescribed, sessionCompleted: true, ...o });
const track = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({
  trackId: 'track.t', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'linear_load', status: 'active', openedAt: NOW,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, nextPrescription: { sets: 3, reps: 8, loadKg: 80, rir: 2 }, ...o,
});
const sets = (n: number, reps: number, kg: number, rir?: number) => Array.from({ length: n }, () => ({ reps, loadKg: kg, ...(rir !== undefined ? { rir } : {}) }));
const codes = (r: { reasons: readonly { code: string }[] }) => r.reasons.map((x) => x.code);

describe('classification des expositions', () => {
  it('distingue succès, au-dessus, partiel, échec, données manquantes, interruption, douleur, pause de sécurité, substitution', () => {
    expect(classifyExposure(item({ performed: sets(3, 8, 80, 2) }), P)).toBe('on_target');
    expect(classifyExposure(item({ performed: sets(3, 8, 80, 4) }), P)).toBe('above');
    expect(classifyExposure(item({ performed: [...sets(2, 8, 80, 2), { reps: 6, loadKg: 80, rir: 1 }] }), P)).toBe('partial');
    expect(classifyExposure(item({ performed: [...sets(1, 8, 80, 1), ...sets(2, 5, 80, 0)] }), P)).toBe('below');
    expect(classifyExposure(item({ performed: sets(3, 8, 80, 0) }), P)).toBe('below');
    expect(classifyExposure(item({ performed: [] }), P)).toBe('no_data');
    expect(classifyExposure(item({ performed: [], sessionCompleted: false }), P)).toBe('interrupted');
    expect(classifyExposure(item({ performed: sets(1, 8, 80, 2), sessionCompleted: false }), P)).toBe('interrupted');
    expect(classifyExposure(item({ performed: sets(3, 2, 80, 0), skipReason: 'pain' }), P)).toBe('pain');
    expect(classifyExposure(item({ performed: [], skipReason: 'safety_pause' }), P)).toBe('safety_pause');
    expect(classifyExposure(item({ performed: sets(3, 8, 30, 2), substitutedFrom: 'ex.bench_press' }), P)).toBe('substituted');
    expect(EXPOSURE_CLASSES).toHaveLength(9);
  });
});

describe('mise à jour d’une track (une variable à la fois, sur preuves)', () => {
  it('douleur et pause de sécurité : track SUSPENDUE, rien ne baisse, compteurs d’échec intacts (jamais un échec)', () => {
    for (const cls of ['pain', 'safety_pause'] as const) {
      const t = track({ consecutiveBelow: 1 });
      const u = updateTrack(t, item({ performed: [] }), cls, ex('ex.bench_press'), P, 'accumulation');
      expect(u.track.status).toBe('suspended');
      expect(u.track.nextPrescription).toEqual(t.nextPrescription);
      expect(u.track.consecutiveBelow).toBe(1);
      expect(codes(u)).toEqual(['PROGRESSION.SUSPENDED']);
    }
  });

  it('substitution ponctuelle, données manquantes, interruption, décharge : track CONSERVÉE, prescription inchangée', () => {
    for (const [cls, phase] of [['substituted', 'accumulation'], ['no_data', 'accumulation'], ['interrupted', 'accumulation'], ['on_target', 'deload']] as const) {
      const t = track({ consecutiveSuccess: 3 });
      const u = updateTrack(t, item({ performed: sets(3, 8, 80, 2) }), cls, ex('ex.bench_press'), P, phase);
      expect(u.track.status, cls).toBe('active');
      expect(u.track.trackId).toBe(t.trackId);
      expect(u.track.nextPrescription).toEqual(t.nextPrescription);
      expect(codes(u)).toEqual(['PROGRESSION.HELD']);
    }
  });

  it('une track suspendue reprend (active) à la première exposition normale', () => {
    const u = updateTrack(track({ status: 'suspended' }), item({ performed: sets(3, 8, 80, 2) }), 'no_data', ex('ex.bench_press'), P, 'accumulation');
    expect(u.track.status).toBe('active');
  });

  it('linear_load : +1 pas de charge après la preuve requise ; plafond de cycle respecté', () => {
    const u = updateTrack(track(), item({ performed: sets(3, 8, 80, 2) }), 'on_target', ex('ex.bench_press'), P, 'accumulation');
    expect(u.track.nextPrescription?.loadKg).toBe(82.5);
    expect(codes(u)).toEqual(['PROGRESSION.ADVANCED']);
    const capped = updateTrack(track({ cycleStartLoadKg: 70, nextPrescription: { sets: 3, reps: 8, loadKg: 80, rir: 2 } }), item({ performed: sets(3, 8, 80, 2) }), 'on_target', ex('ex.bench_press'), P, 'accumulation');
    expect(capped.track.nextPrescription?.loadKg).toBe(80);
    expect(codes(capped)).toEqual(['PROGRESSION.CAP_REACHED']);
  });

  it('autoregulated : preuves répétées exigées (2) ; e1RM lissé (médiane) ; hausse bornée à un pas', () => {
    const t = track({ model: 'autoregulated', e1rmKg: 100, nextPrescription: { sets: 3, reps: 5, loadKg: 85, rir: 2 } });
    const first = updateTrack(t, item({ performed: sets(3, 5, 85, 3) }, work(3, 5, 85)), 'above', ex('ex.bench_press'), P, 'accumulation');
    expect(first.track.nextPrescription?.loadKg).toBe(85);
    expect(first.track.consecutiveSuccess).toBe(1);
    const second = updateTrack(first.track, item({ performed: sets(3, 5, 85, 3) }, work(3, 5, 85)), 'above', ex('ex.bench_press'), P, 'accumulation');
    const kg = second.track.nextPrescription?.loadKg ?? 0;
    expect(kg).toBeGreaterThanOrEqual(85);
    expect(kg).toBeLessThanOrEqual(87.5);
    expect(second.track.e1rmKg).toBeGreaterThan(100);
  });

  it('double_progression : reps d’abord (+1 dans la plage), puis charge au sommet avec retour au bas de la plage', () => {
    const t = track({ model: 'double_progression', repRange: { min: 8, max: 10 }, nextPrescription: { sets: 3, reps: { min: 8, max: 10 }, loadKg: 30, rir: 2 } });
    const e = ex('ex.db_bench_press');
    const r1 = updateTrack(t, item({ performed: sets(3, 8, 30, 2) }), 'on_target', e, P, 'accumulation');
    expect(r1.track.nextPrescription).toMatchObject({ reps: { min: 9, max: 10 }, loadKg: 30 });
    const r2 = updateTrack(r1.track, item({ performed: sets(3, 9, 30, 2) }), 'on_target', e, P, 'accumulation');
    expect(r2.track.nextPrescription).toMatchObject({ reps: { min: 10, max: 10 }, loadKg: 30 });
    const r3 = updateTrack(r2.track, item({ performed: sets(3, 10, 30, 2) }), 'on_target', e, P, 'accumulation');
    expect(r3.track.nextPrescription).toMatchObject({ reps: { min: 8, max: 10 }, loadKg: 32 });
  });

  it('set_progression (PM4) n’est jamais un modèle de track : aucune hausse de charge ni de reps', () => {
    const u = updateTrack(track({ model: 'set_progression' }), item({ performed: sets(3, 8, 80, 2) }), 'on_target', ex('ex.bench_press'), P, 'accumulation');
    expect(u.track.nextPrescription).toEqual(track().nextPrescription);
  });

  it('échec : maintien d’abord, régression bornée après échecs répétés ; stagnation persistante ⇒ rotation proposée', () => {
    const b1 = updateTrack(track(), item({ performed: sets(3, 5, 80, 0) }), 'below', ex('ex.bench_press'), P, 'accumulation');
    expect(b1.track.nextPrescription?.loadKg).toBe(80);
    expect(b1.track.consecutiveBelow).toBe(1);
    const b2 = updateTrack(b1.track, item({ performed: sets(3, 5, 80, 0) }), 'below', ex('ex.bench_press'), P, 'accumulation');
    // 80 × (1 − 10 %) = 72 kg, arrondi au pas réalisable INFÉRIEUR (prudent) : 70 kg.
    expect(b2.track.nextPrescription?.loadKg).toBe(70);
    expect(codes(b2)).toEqual(['PROGRESSION.REGRESSED']);
    let t = track();
    let rotate = false;
    for (let i = 0; i < P['strength.progression'].stagnationHolds; i++) ({ track: t, rotate } = updateTrack(t, item({ performed: [...sets(2, 8, 80, 2), { reps: 6, loadKg: 80 }] }), 'partial', ex('ex.bench_press'), P, 'accumulation'));
    expect(rotate).toBe(true);
  });

  it('la progression est portée par la TRACK : deux tracks du même exercice évoluent indépendamment', () => {
    const a = track({ trackId: 'a', model: 'linear_load' });
    const b = track({ trackId: 'b', model: 'double_progression', repRange: { min: 8, max: 10 }, nextPrescription: { sets: 3, reps: { min: 8, max: 10 }, loadKg: 80, rir: 2 } });
    const x = item({ performed: sets(3, 8, 80, 2) });
    expect(updateTrack(a, x, 'on_target', ex('ex.bench_press'), P, 'accumulation').track.nextPrescription?.loadKg).toBe(82.5);
    expect(updateTrack(b, x, 'on_target', ex('ex.bench_press'), P, 'accumulation').track.nextPrescription).toMatchObject({ loadKg: 80, reps: { min: 9, max: 10 } });
  });
});

describe('cycle de vie des tracks (addendum V1.1 §3)', () => {
  it('création APRÈS exécution réelle : prescription suivante = charge réellement faite, e1RM mesuré', () => {
    const at: ISODateTime = asISODateTime('2026-10-05T18:00:00Z');
    const r = createTrack({ tier: 'anchor', archetypeId: 'str_upper', slotId: 'up.main_push_h', exercise: ex('ex.bench_press'), model: 'linear_load', prescribed: work(3, 8, 80), performed: sets(3, 8, 77.5, 2), at }, P);
    expect(r.track).toMatchObject({ tier: 'anchor', status: 'active', nextPrescription: { sets: 3, reps: 8, loadKg: 77.5, rir: 2 } });
    expect(r.track.e1rmKg).toBeCloseTo(77.5 * (1 + 10 / 30), 5);
    expect(codes(r)).toEqual(['PROGRESSION.TRACK_CREATED']);
  });

  it('clôture : inadmissibilité, stagnation, durée maximale par niveau, fin de mésocycle ; une track close ne se reclôt pas', () => {
    const t = track({ openedAt: asISODateTime('2026-06-01T08:00:00Z') });
    const base = { now: NOW, mesocycleEnded: false, stagnant: false, inadmissible: false, level: 'intermediate' as const };
    expect(closureCause(t, { ...base, inadmissible: true }, P)).toBe('inadmissible');
    expect(closureCause(t, { ...base, stagnant: true }, P)).toBe('stagnation');
    expect(closureCause(t, base, P)).toBe('max_weeks');
    expect(closureCause(track(), { ...base, mesocycleEnded: true }, P)).toBe('mesocycle_end');
    expect(closureCause(track(), base, P)).toBeUndefined();
    const closed = closeTrack(t, 'max_weeks');
    expect(closed.track.status).toBe('closed');
    expect(closureCause(closed.track, { ...base, inadmissible: true }, P)).toBeUndefined();
  });
});
