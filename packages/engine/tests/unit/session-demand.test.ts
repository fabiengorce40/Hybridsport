/**
 * Profil de demande standard d'une séance générée : RÉUTILISE deriveDemandProfile ; doses normalisées par le
 * paramètre gouverné `demand.doseNormalization` (facultatif, aucune valeur par défaut). Valeurs : DONNÉES DE TEST.
 */
import { describe, expect, it } from 'vitest';
import type { Prescription, SessionDraftInput } from '@hybridsport/domain';
import { deriveDemandProfile, deriveSessionDemand, nativeDose, preflightCoreParameters } from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { param, testRulesetDocument } from '../fixtures/ruleset.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';

// technical-constant: TEST_ONLY — normalisation de test
const NORM = { strength: { working_set: { perUnit: 2, intensityBand: 'high' } }, hybrid_race: { meter: { perUnit: 0.03, intensityBand: 'high' } } };
const catalog = testCatalog();
const rulesetWith = (v: unknown) => { const doc = testRulesetDocument(); return testRuleset({ ...doc, parameters: [...doc.parameters, param('demand.doseNormalization', v as never, 'G2')] }); };

describe('dose native (aucune conversion)', () => {
  it.each([
    [{ type: 'sets', sets: [{ kind: 'rampup', reps: 5, restAfterS: 60 }, { kind: 'working', reps: 5, restAfterS: 60 }, { kind: 'working', reps: 5, restAfterS: 60, optional: true }] }, 'working_set', 1],
    [{ type: 'reps', reps: 20 }, 'rep', 20], [{ type: 'distance', distanceM: 500 }, 'meter', 500], [{ type: 'calories', calories: 12 }, 'calorie', 12],
    [{ type: 'timed', workS: 60, rounds: 3, restS: 0 }, 'second', 180], [{ type: 'hold', seconds: 30, sets: 2, restS: 0 }, 'second', 60],
    [{ type: 'mobility', seconds: 60, sides: 2 }, 'mobility_second', 120], [{ type: 'intervals', reps: 4, work: { distanceM: 400 }, recoveryS: 60 }, 'meter', 1600],
  ])('%j', (p, unit, quantity) => expect(nativeDose(p as Prescription)).toEqual({ unit, quantity }));
});

describe('deriveSessionDemand', () => {
  it('réutilise deriveDemandProfile : même profil qu’avec les items normalisés à la main ; échauffement exclu', () => {
    const s = session();
    const r = deriveSessionDemand(s, catalog, rulesetWith(NORM));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items.map((i) => i.exerciseId)).toEqual(['ex.bench_press', 'ex.db_row', 'ex.cable_fly']);
    expect(r.profile).toEqual(deriveDemandProfile(r.items, catalog, rulesetWith(NORM)));
    expect(r.items[0]).toEqual({ exerciseId: 'ex.bench_press', doseUnits: 3 * NORM.strength.working_set.perUnit, intensityBand: 'high' });
  });

  it.each([
    ['paramètre absent', testRuleset(), 'PARAMETER_MISSING'],
    ['paramètre illisible', rulesetWith({ strength: { furlong: { perUnit: 1, intensityBand: 'high' } } }), 'PARAMETER_UNREADABLE'],
    ['discipline non normalisée', rulesetWith({ running: NORM.strength }), 'DISCIPLINE_NOT_NORMALIZED'],
    ['unité non normalisée', rulesetWith({ strength: { rep: NORM.strength.working_set } }), 'UNIT_NOT_NORMALIZED'],
    ['bande inconnue du ruleset', rulesetWith({ strength: { working_set: { perUnit: 1, intensityBand: 'extreme' } } }), 'INTENSITY_BAND_UNKNOWN'],
  ])('%s ⇒ non dérivable (%s), raison exacte', (_, rs, cause) => {
    expect(deriveSessionDemand(session(), catalog, rs)).toMatchObject({ ok: false, reasons: [{ code: 'DATA.DEMAND_PROFILE_UNAVAILABLE', params: { cause } }] });
  });

  it('exercice inconnu du catalogue ⇒ non dérivable', () => {
    const base = strengthSessionInput();
    const s = session({ ...base, blocks: [{ ...base.blocks[1]!, items: [{ ...base.blocks[1]!.items[0]!, exerciseId: 'ex.unknown' }] }] } as SessionDraftInput);
    expect(deriveSessionDemand(s, catalog, rulesetWith(NORM))).toMatchObject({ ok: false, reasons: [{ params: { cause: 'UNKNOWN_EXERCISE', detail: 'ex.unknown' } }] });
  });

  it('paramètre facultatif du CORE (préflight inchangé sans lui) ; déterministe', () => {
    expect(preflightCoreParameters(testRuleset())).toEqual([]);
    expect(JSON.stringify(deriveSessionDemand(session(), catalog, rulesetWith(NORM)))).toBe(JSON.stringify(deriveSessionDemand(session(), catalog, rulesetWith(NORM))));
  });
});
