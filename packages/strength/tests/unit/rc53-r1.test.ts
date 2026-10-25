/**
 * RC5.3 lot R1 — progression partagée A/B (contenu 0.10.0) :
 * - clé de progression d'un emplacement : `famille/suffixe` sous la politique, `archétype/emplacement` sinon ;
 * - l'accessoire suivi d'un emplacement porte la track d'un archétype de la même famille (même suffixe), celle de
 *   l'archétype lui-même primant ; contenus antérieurs inchangés (une track par archétype).
 */
import { describe, expect, it } from 'vitest';
import { progressionSlotKey, readStrengthParams } from '../../src/index.js';
import type { StrengthTrack } from '../../src/index.js';
import { envFor, NOW, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { strengthF6CatalogDocument } from '../fixtures/f6.js';
import { RC53_R1_RULESET_VERSION, strengthRc53R1RulesetDocument, strengthRc53R4RulesetDocument } from '../fixtures/rc53.js';

const R1 = strengthRuleset(strengthRc53R1RulesetDocument());
const R4 = strengthRuleset(strengthRc53R4RulesetDocument());
const P1 = readStrengthParams(R1).values;
const P4 = readStrengthParams(R4).values;
const CATALOG = strengthCatalog(strengthF6CatalogDocument());
const tracked = (o: Partial<StrengthTrack>): StrengthTrack => ({
  trackId: 'track.ua.pec', tier: 'tracked', exerciseId: 'ex.pec_deck', archetypeId: 'str_upper_a', slotId: 'ua.iso_upper', model: 'double_progression', status: 'active', openedAt: NOW,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, repRange: { min: 12, max: 20 }, nextPrescription: { sets: 3, reps: { min: 15, max: 20 }, loadKg: 40, rir: 1 }, ...o,
});
const hyper = { stimulus: 'strength_volume', context: { goal: { primary: { goal: 'hypertrophy' as const } } } };

describe('contenu RC5.3 R1', () => {
  it('version 0.10.0 ; familles déclarées pour Haut A/B et Bas A/B seulement ; politique R4 conservée', () => {
    expect(R1.version).toBe(RC53_R1_RULESET_VERSION);
    const fam = Object.fromEntries(P1['strength.archetypes'].map((a) => [a.id, a.progressionFamily]));
    expect(fam).toMatchObject({ str_upper_a: 'str_upper', str_upper_b: 'str_upper', str_lower_a: 'str_lower', str_lower_b: 'str_lower', str_upper: undefined, str_lower: undefined, str_full_body: undefined });
    expect(P1['strength.progression.policy']).toEqual({ modifiedExposure: { mode: 'soft', recalculateLoad: false }, sharedProgression: true });
  });
});

describe('clé de progression d’un emplacement', () => {
  it('politique + famille : même clé pour Haut A et Haut B au même suffixe ; suffixes différents ⇒ clés différentes', () => {
    expect(progressionSlotKey(P1, 'str_upper_a', 'ua.iso_upper')).toBe('str_upper/iso_upper');
    expect(progressionSlotKey(P1, 'str_upper_b', 'ub.iso_upper')).toBe('str_upper/iso_upper');
    expect(progressionSlotKey(P1, 'str_upper_a', 'ua.push_2v')).not.toBe(progressionSlotKey(P1, 'str_upper_b', 'ub.main_push_v'));
    expect(progressionSlotKey(P1, 'str_lower_a', 'la.iso_lower')).not.toBe(progressionSlotKey(P1, 'str_upper_a', 'ua.iso_upper'));
  });
  it('sans famille (Full Body, Haut / Bas communs) ou sans politique (R4) : clé par archétype (comportement antérieur)', () => {
    expect(progressionSlotKey(P1, 'str_full_body', 'fb.iso_upper')).toBe('str_full_body/fb.iso_upper');
    expect(progressionSlotKey(P4, 'str_upper_a', 'ua.iso_upper')).toBe('str_upper_a/ua.iso_upper');
    expect(progressionSlotKey(P4, 'str_upper_b', 'ub.iso_upper')).toBe('str_upper_b/ub.iso_upper');
  });
});

describe('accessoire suivi partagé dans la famille (moteur)', () => {
  const env = (ruleset: typeof R1, tracks: StrengthTrack[]) => envFor(scenario({ ruleset, catalog: CATALOG, archetype: 'str_upper_b', ...hyper, context: { ...hyper.context, tracks } }));

  it('Haut B reprend la track pec deck créée en Haut A (même suffixe) ; sans la politique, aucune', () => {
    expect(env(R1, [tracked({})]).trackedBySlot.get('ub.iso_upper')?.trackId).toBe('track.ua.pec');
    expect(env(R4, [tracked({})]).trackedBySlot.get('ub.iso_upper')).toBeUndefined();
  });

  it('la track de l’archétype lui-même prime ; une track close ou suspendue n’est pas reprise ; autre suffixe : rien', () => {
    const own = tracked({ trackId: 'track.ub.pec', archetypeId: 'str_upper_b', slotId: 'ub.iso_upper' });
    expect(env(R1, [tracked({}), own]).trackedBySlot.get('ub.iso_upper')?.trackId).toBe('track.ub.pec');
    expect(env(R1, [tracked({ status: 'closed' })]).trackedBySlot.get('ub.iso_upper')).toBeUndefined();
    expect(env(R1, [tracked({ status: 'suspended' })]).trackedBySlot.get('ub.iso_upper')).toBeUndefined();
    expect([...env(R1, [tracked({ slotId: 'ua.push_2v' })]).trackedBySlot.keys()].includes('ub.iso_upper')).toBe(false);
  });

  it('séance Haut B : l’item pec deck porte la track partagée et sa prescription (répétitions, charge)', () => {
    const r = run(scenario({ ruleset: R1, catalog: CATALOG, archetype: 'str_upper_b', ...hyper, minutes: 75, context: { ...hyper.context, tracks: [tracked({})] } }));
    expect(r.result.status).toBe('ok');
    const it0 = r.result.status === 'ok' ? r.result.value.blocks.flatMap((b) => b.items).find((i) => i.refs?.slotId === 'ub.iso_upper' && i.exerciseId === 'ex.pec_deck') : undefined;
    expect(it0?.refs?.progressionTrackId).toBe('track.ua.pec');
    const w = it0?.prescription.type === 'sets' ? it0.prescription.sets.find((x) => x.kind !== 'rampup') : undefined;
    expect(w?.reps).toEqual({ min: 15, max: 20 });
    expect(w?.intensity?.mode === 'load' ? w.intensity.kg : undefined).toBe(40);
  });
});
