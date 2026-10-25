/**
 * RC5.3 lot R2 — réussite exacte et essais (contenu 0.11.0, extension validée aux répétitions) :
 * réussite exacte ; essai de charge confirmé / annulé ; essai de répétition confirmé / annulé ; stagnation réelle (vraie
 * baisse détectée sur plusieurs observations) ; fatigue temporaire ; séance modifiée ; matériel à grands paliers.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, SetPrescription } from '@hybridsport/domain';
import { readStrengthParams, updateTrack } from '../../src/index.js';
import type { ExecutedItem, StrengthTrack } from '../../src/index.js';
import { NOW, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { strengthF6CatalogDocument } from '../fixtures/f6.js';
import { RC53_R2_RULESET_VERSION, strengthRc53R1RulesetDocument, strengthRc53R2RulesetDocument } from '../fixtures/rc53.js';

const R2 = strengthRuleset(strengthRc53R2RulesetDocument());
const P = readStrengthParams(R2).values;
const P1 = readStrengthParams(strengthRuleset(strengthRc53R1RulesetDocument())).values;
const CATALOG = strengthCatalog(strengthF6CatalogDocument());
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const BENCH = ex('ex.bench_press');
const PEC = ex('ex.pec_deck');
const DAY = (d: number) => new Date(Date.parse(NOW) + d * 86_400_000).toISOString().replace('.000Z', 'Z') as typeof NOW;

const work = (n: number, reps: SetPrescription['reps'], kg: number, rir: number): SetPrescription[] => Array.from({ length: n }, () => ({ kind: 'working', reps, restAfterS: 90, intensity: { mode: 'load', kg, certainty: 'prescribed', effort: { rir } } }));
const sets = (n: number, reps: number, kg: number, rir?: number) => Array.from({ length: n }, () => ({ reps, loadKg: kg, ...(rir !== undefined ? { rir } : {}) }));
const item = (exerciseId: string, prescribed: SetPrescription[], performed: ExecutedItem['performed']): ExecutedItem => ({ exerciseId, prescribed, performed, sessionCompleted: true });
const bench = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({
  trackId: 'track.bench', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_upper_a', slotId: 'ua.main_push_h', model: 'autoregulated', status: 'active', openedAt: NOW,
  consecutiveSuccess: 1, consecutiveBelow: 0, consecutiveHolds: 0, e1rmKg: 100, cycleStartLoadKg: 80, nextPrescription: { sets: 3, reps: 8, loadKg: 80, rir: 2 },
  evidence: { exactStreak: 1, effortKnown: 1, effortUnknown: 0, e1rmBasis: 'observed' }, ...o,
});
const pec = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({
  trackId: 'track.pec', tier: 'tracked', exerciseId: 'ex.pec_deck', archetypeId: 'str_upper_a', slotId: 'ua.iso_upper', model: 'double_progression', status: 'active', openedAt: NOW,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, repRange: { min: 12, max: 20 }, nextPrescription: { sets: 3, reps: { min: 16, max: 20 }, loadKg: 40, rir: 1 }, ...o,
});
// Exposition « exacte » du développé couché (80 kg × 8, RIR 2, e1RM cohérent : aucune marge mesurée).
const benchExact = (kg = 80, rir: number | null = 2) => item('ex.bench_press', work(3, 8, kg, 2), sets(3, 8, kg, rir ?? undefined));
const pecAt = (min: number, kg: number, reps: number, rir: number) => item('ex.pec_deck', work(3, { min, max: 20 }, kg, 1), sets(3, reps, kg, rir));
const codes = (u: ReturnType<typeof updateTrack>) => u.reasons.map((r) => `${r.code}${r.params.cause ? `:${String(r.params.cause)}` : ''}${r.params.variable ? `:${String(r.params.variable)}` : ''}`);
const up = (t: StrengthTrack, x: ExecutedItem, cls: Parameters<typeof updateTrack>[2], e = BENCH, o: Parameters<typeof updateTrack>[7] = {}) => updateTrack(t, x, cls, e, P, 'accumulation', undefined, { level: 'intermediate', at: DAY(7), ...o });

describe('contenu RC5.3 R2', () => {
  it('version 0.11.0 ; politique : réussite exacte 2 / 3 (+1 sans RIR), essais de charge et de répétitions, refus 4 semaines', () => {
    expect(R2.version).toBe(RC53_R2_RULESET_VERSION);
    expect(P['strength.progression.policy']).toMatchObject({ exactSuccess: { streak: { intermediate: 2, advanced: 3 }, unknownEffortExtra: 1 }, probes: { reps: true, refusalMaxWeeks: 4 } });
  });
});

describe('1. réussite exacte (R2.1)', () => {
  it('intermédiaire : 2 réussites exactes ⇒ +1 pas, tracé `exact_success`, la hausse devient un essai', () => {
    const u = up(bench(), benchExact(), 'on_target');
    expect(codes(u)).toEqual(['PROGRESSION.ADVANCED:exact_success:load']);
    expect(u.track.nextPrescription?.loadKg).toBe(82.5);
    expect(u.track.probe).toEqual({ kind: 'load', fromKg: 80, fromReps: 8 });
  });
  it('avancé : 3 réussites exactes ; effort non saisi : une de plus ; sans la politique (R1) : décision bloquée', () => {
    expect(up(bench(), benchExact(), 'on_target', BENCH, { level: 'advanced' }).track.nextPrescription?.loadKg).toBe(80);
    expect(up(bench({ evidence: { exactStreak: 2, effortKnown: 2, effortUnknown: 0, e1rmBasis: 'observed' } }), benchExact(), 'on_target', BENCH, { level: 'advanced' }).track.nextPrescription?.loadKg).toBe(82.5);
    const unknown = bench({ evidence: { exactStreak: 1, effortKnown: 0, effortUnknown: 1 } });
    expect(up(unknown, benchExact(80, null), 'on_target').track.nextPrescription?.loadKg).toBe(80);
    expect(codes(updateTrack(bench(), benchExact(), 'on_target', BENCH, P1, 'accumulation', undefined, { level: 'intermediate' }))).toContain('PROGRESSION.DECISION_BLOCKED');
  });
  it('plafond du cycle respecté ; jamais sur une exposition modifiée', () => {
    expect(up(bench({ cycleStartLoadKg: 70 }), benchExact(), 'on_target').track.nextPrescription?.loadKg).toBe(80);
    const m = up(bench(), benchExact(), 'on_target', BENCH, { modified: true });
    expect(m.track.nextPrescription?.loadKg).toBe(80);
    expect(m.track.probe).toBeUndefined();
  });
});

describe('2–3. essai de charge confirmé / annulé (R2.2)', () => {
  const probing = bench({ consecutiveSuccess: 0, evidence: { exactStreak: 0, effortKnown: 0, effortUnknown: 0, e1rmBasis: 'observed' }, nextPrescription: { sets: 3, reps: 8, loadKg: 82.5, rir: 2 }, probe: { kind: 'load', fromKg: 80, fromReps: 8 } });
  it('confirmé : réussite à la charge essayée ⇒ essai levé, progression ordinaire', () => {
    const u = up(probing, benchExact(82.5), 'on_target');
    expect(u.track.probe).toBeUndefined();
    expect(u.track.nextPrescription?.loadKg).toBe(82.5);
  });
  it('annulé : en dessous ⇒ retour à 80 kg (dernière réussie), maintien compté, 82,5 kg refusé, AUCUNE régression supplémentaire', () => {
    const u = up(probing, item('ex.bench_press', work(3, 8, 82.5, 2), sets(3, 6, 82.5, 0)), 'below');
    expect(codes(u)).toEqual(['PROGRESSION.PROBE_REVERTED:load']);
    expect(u.track.nextPrescription).toEqual({ sets: 3, reps: 8, loadKg: 80, rir: 2 });
    expect(u.track.probeRefused).toEqual({ kg: 82.5, at: DAY(7) });
    expect(u.track.consecutiveHolds).toBe(1);
    expect(u.track.probe).toBeUndefined();
  });
  it('refus : la charge refusée n’est pas retentée avant expiration (4 semaines sans mésocycle) ; ensuite, de nouveau un essai', () => {
    const refused = bench({ probeRefused: { kg: 82.5, at: DAY(7) } });
    const early = up(refused, benchExact(), 'on_target', BENCH, { at: DAY(14) });
    expect(codes(early)).toEqual(['PROGRESSION.HELD:probe_refused']);
    expect(early.track.nextPrescription?.loadKg).toBe(80);
    const late = up(refused, benchExact(), 'on_target', BENCH, { at: DAY(7 + 28) });
    expect(late.track.nextPrescription?.loadKg).toBe(82.5);
    expect(late.track.probeRefused).toBeUndefined();
    expect(late.track.probe?.kind).toBe('load');
  });
});

describe('4–5. essai de répétition confirmé / annulé (extension R2.2)', () => {
  it('hausse de répétitions = essai ; confirmée par une réussite au nouveau bas de plage', () => {
    const u = up(pec(), pecAt(16, 40, 16, 1), 'on_target', PEC);
    expect(u.track.nextPrescription?.reps).toEqual({ min: 17, max: 20 });
    expect(u.track.probe).toEqual({ kind: 'reps', fromKg: 40, fromReps: { min: 16, max: 20 } });
    const c = up(u.track, pecAt(17, 40, 17, 1), 'on_target', PEC);
    expect(c.track.nextPrescription?.reps).toEqual({ min: 18, max: 20 });
    expect(c.track.probe?.fromReps).toEqual({ min: 17, max: 20 });
  });
  it('annulée : en dessous ⇒ retour aux répétitions réussies (16), charge inchangée, 17 refusé, aucune baisse de charge', () => {
    const t = pec({ nextPrescription: { sets: 3, reps: { min: 17, max: 20 }, loadKg: 40, rir: 1 }, probe: { kind: 'reps', fromKg: 40, fromReps: { min: 16, max: 20 } } });
    const u = up(t, pecAt(17, 40, 14, 0), 'below', PEC);
    expect(codes(u)).toEqual(['PROGRESSION.PROBE_REVERTED:reps']);
    expect(u.track.nextPrescription).toEqual({ sets: 3, reps: { min: 16, max: 20 }, loadKg: 40, rir: 1 });
    expect(u.track.probeRefused).toEqual({ reps: 17, at: DAY(7) });
    // Retentée trop tôt : maintien sans échec ni hausse.
    expect(codes(up(u.track, pecAt(16, 40, 16, 1), 'on_target', PEC, { at: DAY(10) }))).toEqual(['PROGRESSION.HELD:probe_refused']);
  });
});

describe('6. stagnation réelle : une vraie baisse reste détectée sur plusieurs observations', () => {
  it('deux expositions en dessous À la prescription réussie (aucun essai en cours) ⇒ régression des règles communes', () => {
    const t = pec();
    const a = up(t, pecAt(16, 40, 12, 0), 'below', PEC);
    expect(codes(a)).toEqual(['PROGRESSION.HELD:below']);
    const b = up(a.track, pecAt(16, 40, 12, 0), 'below', PEC);
    expect(codes(b)).toEqual(['PROGRESSION.REGRESSED']);
  });
  it('un essai annulé ne compte pas comme un échec de la prescription réussie (compteur « en dessous » remis à zéro)', () => {
    const t = pec({ consecutiveBelow: 1, nextPrescription: { sets: 3, reps: { min: 17, max: 20 }, loadKg: 40, rir: 1 }, probe: { kind: 'reps', fromKg: 40, fromReps: { min: 16, max: 20 } } });
    expect(up(t, pecAt(17, 40, 14, 0), 'below', PEC).track.consecutiveBelow).toBe(0);
  });
});

describe('7–8. fatigue temporaire, séance modifiée', () => {
  const t = pec({ nextPrescription: { sets: 3, reps: { min: 17, max: 20 }, loadKg: 40, rir: 1 }, probe: { kind: 'reps', fromKg: 40, fromReps: { min: 16, max: 20 } } });
  it('séance adaptée (fatigue) en dessous : l’essai reste en attente, aucune annulation, aucun compteur', () => {
    const u = up(t, pecAt(17, 40, 14, 0), 'below', PEC, { modified: true });
    expect(codes(u)).toEqual(['PROGRESSION.HELD:below_modified']);
    expect(u.track.probe).toEqual(t.probe);
    expect(u.track.nextPrescription).toEqual(t.nextPrescription);
  });
  it('séance modifiée réussie : l’essai n’est PAS validé (en attente d’une exposition probante)', () => {
    const u = up(t, pecAt(17, 40, 17, 2), 'on_target', PEC, { modified: true });
    expect(u.track.probe).toEqual(t.probe);
    expect(u.track.nextPrescription).toEqual(t.nextPrescription);
  });
  it('décharge : aucune décision, essai en attente', () => {
    const u = updateTrack(t, pecAt(17, 40, 17, 1), 'on_target', PEC, P, 'deload', undefined, { level: 'intermediate', at: DAY(7) });
    expect(u.track.probe).toEqual(t.probe);
  });
});

describe('9. matériel à grands paliers (machine, 5 kg) : plus d’oscillation 40 → 35 → 40 kg', () => {
  it('haut de plage ⇒ essai à 45 kg ; en dessous ⇒ retour à 40 kg au HAUT de plage réussi, jamais 35 kg', () => {
    const top = pec({ nextPrescription: { sets: 3, reps: { min: 20, max: 20 }, loadKg: 40, rir: 1 } });
    const a = up(top, pecAt(20, 40, 20, 1), 'on_target', PEC);
    expect(a.track.nextPrescription).toMatchObject({ loadKg: 45, reps: { min: 12, max: 20 } });
    expect(a.track.probe).toEqual({ kind: 'load', fromKg: 40, fromReps: { min: 20, max: 20 } });
    const b = up(a.track, pecAt(12, 45, 9, 0), 'below', PEC);
    expect(b.track.nextPrescription).toMatchObject({ loadKg: 40, reps: { min: 20, max: 20 } });
    expect(b.track.probeRefused?.kg).toBe(45);
    expect(codes(b)).not.toContain('PROGRESSION.REGRESSED');
  });
  it('limite atteinte en répétitions : retour aux répétitions réussies, charge conservée (40 kg)', () => {
    let t = pec({ nextPrescription: { sets: 3, reps: { min: 17, max: 20 }, loadKg: 40, rir: 1 } });
    // L'athlète tient 17 répétitions, pas 18 : l'essai à 18 est annulé, 17 refusé un temps, aucune baisse de charge.
    t = up(t, pecAt(17, 40, 17, 1), 'on_target', PEC).track;
    const r = up(t, pecAt(18, 40, 16, 0), 'below', PEC);
    expect(r.track.nextPrescription).toMatchObject({ loadKg: 40, reps: { min: 17, max: 20 } });
    expect(r.track.probeRefused?.reps).toBe(18);
  });
});
