/**
 * CORE — répétition structurelle des blocs dans le profil de demande (audit « demand repetition »).
 *
 * Contrat : la dose d'un item est multipliée par le nombre de passages que le FORMAT impose (la même règle que le
 * DurationEngine) — `for_time.rounds` ; aucun facteur pour `sets` / `continuous` (dose déjà complète dans la
 * prescription) ; `amrap` (tours inconnus) et `emom` (rotation des items non spécifiée) : un passage prescrit, signalé
 * DATA.DEMAND_REPETITION_UNRESOLVED. Tests GÉNÉRIQUES : aucune discipline n'a de traitement propre.
 * Normalisations et séances : DONNÉES DE TEST.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { zSessionDraft } from '@hybridsport/domain';
import type { SessionDraft } from '@hybridsport/domain';
import { blockRepetition, deriveSessionDemand, nativeDose } from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { param, testRulesetDocument } from '../fixtures/ruleset.js';

// technical-constant: TEST_ONLY — normalisation identique pour deux disciplines (indépendance au sport)
const UNIT = { rep: { perUnit: 0.5, intensityBand: 'high' }, meter: { perUnit: 0.03, intensityBand: 'high' }, calorie: { perUnit: 0.5, intensityBand: 'high' }, second: { perUnit: 0.1, intensityBand: 'high' } };
const NORM = { hybrid_race: UNIT, crosstraining: UNIT, strength: { working_set: { perUnit: 2, intensityBand: 'high' } } };
const catalog = testCatalog();
const ruleset = (v: unknown = NORM) => { const doc = testRulesetDocument(); return testRuleset({ ...doc, parameters: [...doc.parameters, param('demand.doseNormalization', v as never, 'G2')] }); };
const RS = ruleset();

type Format = { format: 'for_time'; rounds: number; timeCapS: number } | { format: 'amrap'; timeCapS: number } | { format: 'emom'; minutes: number } | { format: 'continuous' } | { format: 'sets'; grouping: 'straight' };
// technical-constant: TEST_ONLY — items de test (répétitions, mètres, calories, secondes)
const ITEMS = [
  { id: 'i.wb', exerciseId: 'ex.wall_ball', prescription: { type: 'reps', reps: 10, load: { kg: 6, certainty: 'prescribed' } } },
  { id: 'i.row', exerciseId: 'ex.row_erg', prescription: { type: 'distance', distanceM: 250 } },
  { id: 'i.ski', exerciseId: 'ex.skierg', prescription: { type: 'calories', calories: 12 } },
  { id: 'i.carry', exerciseId: 'ex.farmers_carry', prescription: { type: 'timed', workS: 30, rounds: 2, restS: 0 } },
];
function draft(blocks: { format: Format; items?: unknown[]; kind?: string }[], discipline = 'hybrid_race'): SessionDraft {
  return zSessionDraft.parse({
    // technical-constant: TEST_ONLY — cadre de séance
    id: 's.rep', discipline, athleteLevel: 'intermediate', availableTimeS: 7200, targetDurationS: 3600, toleranceProfile: 'for_time',
    blocks: blocks.map((b, k) => ({ id: `b${String(k)}`, kind: b.kind ?? 'conditioning', role: 'primary', ...b.format, items: b.items ?? ITEMS })),
  });
}
// technical-constant: TEST_ONLY — time cap des blocs de test
const CAP = 1200;
const forTime = (rounds: number): Format => ({ format: 'for_time', rounds, timeCapS: CAP });
const demand = (s: SessionDraft, rs = RS) => { const d = deriveSessionDemand(s, catalog, rs); if (!d.ok) throw new Error(JSON.stringify(d.reasons)); return d; };
const LEVELS = ['none', 'low', 'moderate', 'high'];

describe('golden — un tour vs plusieurs tours (for_time)', () => {
  it('rounds = 1 : dose identique à l’ancienne dérivation (aucun facteur) ; rounds = 4 : dose effective × 4 par item', () => {
    const one = demand(draft([{ format: forTime(1) }]));
    const four = demand(draft([{ format: forTime(4) }]));
    expect(one.items.map((i) => i.doseUnits)).toEqual(ITEMS.map((it) => { const d = nativeDose(it.prescription as never); return d.quantity * (UNIT as Record<string, { perUnit: number }>)[d.unit]!.perUnit; }));
    // technical-constant: TEST_ONLY — 4 tours
    four.items.forEach((it, k) => expect(it.doseUnits).toBeCloseTo((one.items[k]?.doseUnits ?? 0) * 4, 12));
    for (const [s, v] of Object.entries(one.profile.scores)) expect(four.profile.scores[s]).toBeCloseTo(v * 4, 9);
    // 10 répétitions × 4 tours = 40 répétitions normalisées par la table existante, jamais un niveau multiplié.
    expect(four.items[0]?.doseUnits).toBeCloseTo(40 * UNIT.rep.perUnit, 12);
  });

  it('aucune double multiplication : `timed.rounds` (dans l’item) × `for_time.rounds` (bloc), chacun une seule fois', () => {
    const carry = [ITEMS[3]];
    // technical-constant: TEST_ONLY — 3 tours × (30 s × 2) = 180 s
    expect(demand(draft([{ format: forTime(3), items: carry }])).items[0]?.doseUnits).toBeCloseTo(180 * UNIT.second.perUnit, 12);
  });

  it('la prescription n’est jamais modifiée ; déterministe', () => {
    const s = draft([{ format: forTime(4) }]);
    const before = JSON.stringify(s);
    const a = demand(s);
    expect(JSON.stringify(s)).toBe(before);
    expect(JSON.stringify(demand(s))).toBe(JSON.stringify(a));
  });

  it('indépendant du sport : même bloc sous deux disciplines à normalisation identique ⇒ même profil', () => {
    expect(demand(draft([{ format: forTime(3) }], 'crosstraining')).profile).toEqual(demand(draft([{ format: forTime(3) }], 'hybrid_race')).profile);
  });

  it('propriété : monotonie (scores et niveaux non décroissants avec les tours), proportionnalité exacte des scores', () => {
    // technical-constant: TEST_ONLY — bornes de génération (tours)
    fc.assert(fc.property(fc.integer({ min: 1, max: 40 }), fc.integer({ min: 1, max: 40 }), (a, b) => {
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      const x = demand(draft([{ format: forTime(lo) }]));
      const y = demand(draft([{ format: forTime(hi) }]));
      for (const s of Object.keys(x.profile.scores)) {
        expect(y.profile.scores[s] ?? 0).toBeGreaterThanOrEqual(x.profile.scores[s] ?? 0);
        expect(LEVELS.indexOf(y.profile.levels[s] ?? 'none')).toBeGreaterThanOrEqual(LEVELS.indexOf(x.profile.levels[s] ?? 'none'));
        expect((y.profile.scores[s] ?? 0) * lo).toBeCloseTo((x.profile.scores[s] ?? 0) * hi, 6);
      }
    }), { numRuns: 30 });
  });
});

describe('matrice des formats (contrat)', () => {
  it('facteurs : sets / continuous = 1 (dose complète), for_time = rounds, amrap / emom = un passage NON résolu', () => {
    const block = (format: Format) => zSessionDraft.parse({ ...draft([{ format: forTime(1) }]), blocks: [{ id: 'b', kind: 'conditioning', role: 'primary', ...format, items: ITEMS }] }).blocks[0]!;
    // technical-constant: TEST_ONLY — 5 tours, 12 minutes
    expect(blockRepetition(block(forTime(5)))).toEqual({ kind: 'resolved', factor: 5 });
    expect(blockRepetition(block({ format: 'continuous' }))).toEqual({ kind: 'resolved', factor: 1 });
    expect(blockRepetition(block({ format: 'sets', grouping: 'straight' }))).toEqual({ kind: 'resolved', factor: 1 });
    expect(blockRepetition(block({ format: 'amrap', timeCapS: CAP }))).toEqual({ kind: 'unresolved', factor: 1, cause: 'AMRAP_ROUNDS_UNKNOWN' });
    expect(blockRepetition(block({ format: 'emom', minutes: 12 }))).toEqual({ kind: 'unresolved', factor: 1, cause: 'EMOM_ITEM_ROTATION_UNSPECIFIED' });
  });

  it('AMRAP : aucun nombre de tours inventé (time cap sans effet), un passage, signalé', () => {
    const short = demand(draft([{ format: { format: 'amrap', timeCapS: CAP } }]));
    const long = demand(draft([{ format: { format: 'amrap', timeCapS: CAP * 3 } }]));
    expect(long.profile.scores).toEqual(short.profile.scores);
    expect(short.profile.reasons).toMatchObject([{ code: 'DATA.DEMAND_REPETITION_UNRESOLVED', params: { blockId: 'b0', format: 'amrap', cause: 'AMRAP_ROUNDS_UNKNOWN' } }]);
  });

  it('EMOM : `minutes` sans effet sur la dose (rotation des items non spécifiée par le contrat), signalé', () => {
    // technical-constant: TEST_ONLY — 10 et 30 minutes
    const a = demand(draft([{ format: { format: 'emom', minutes: 10 } }]));
    const b = demand(draft([{ format: { format: 'emom', minutes: 30 } }]));
    expect(b.profile.scores).toEqual(a.profile.scores);
    expect(a.profile.reasons.map((r) => r.params.cause)).toEqual(['EMOM_ITEM_ROTATION_UNSPECIFIED']);
  });

  it('intervals et continuous : la répétition est DANS la prescription (nativeDose), aucun facteur de bloc', () => {
    // technical-constant: TEST_ONLY — 6 × 400 m
    const iv = [{ id: 'i.iv', exerciseId: 'ex.row_erg', prescription: { type: 'intervals', reps: 6, work: { distanceM: 400 }, recoveryS: 60 } }];
    const d = demand(draft([{ format: { format: 'continuous' }, items: iv }]));
    expect(d.items[0]?.doseUnits).toBeCloseTo(2400 * UNIT.meter.perUnit, 12);
    expect(d.profile.reasons).toEqual([]);
  });

  it('set-based (référence Strength) : inchangé, aucune raison', () => {
    const sets = [{ id: 'i.bp', exerciseId: 'ex.bench_press', prescription: { type: 'sets', sets: [1, 2, 3].map(() => ({ kind: 'working', reps: 5, restAfterS: 120 })) } }];
    const d = demand(draft([{ format: { format: 'sets', grouping: 'straight' }, items: sets }], 'strength'));
    expect(d.items[0]?.doseUnits).toBe(3 * NORM.strength.working_set.perUnit);
    expect(d.profile.reasons).toEqual([]);
  });
});

describe('adversarial', () => {
  it('valeur minimale (rounds = 1) ≡ dérivation sans facteur ; plusieurs blocs : chacun avec SA répétition', () => {
    const s = draft([{ format: forTime(2) }, { format: { format: 'continuous' } }, { format: { format: 'amrap', timeCapS: CAP } }]);
    const d = demand(s);
    const n = ITEMS.length;
    for (let k = 0; k < n; k += 1) {
      expect(d.items[k]?.doseUnits).toBeCloseTo((d.items[n + k]?.doseUnits ?? 0) * 2, 12);
      expect(d.items[2 * n + k]?.doseUnits).toBeCloseTo(d.items[n + k]?.doseUnits ?? 0, 12);
    }
    expect(d.profile.reasons.map((r) => r.params.blockId)).toEqual(['b2']);
  });

  it('échauffement / retour au calme toujours exclus, même répétés', () => {
    const d = demand(draft([{ format: forTime(9), kind: 'warmup' }, { format: forTime(1) }]));
    expect(d.items).toHaveLength(ITEMS.length);
  });

  it('unité non normalisée ⇒ fail-closed (aucun facteur de conversion créé), quelle que soit la répétition', () => {
    const rs = ruleset({ hybrid_race: { rep: UNIT.rep } });
    expect(deriveSessionDemand(draft([{ format: forTime(4) }]), catalog, rs)).toMatchObject({ ok: false, reasons: [{ code: 'DATA.DEMAND_PROFILE_UNAVAILABLE', params: { cause: 'UNIT_NOT_NORMALIZED' } }] });
  });

  it('très grand nombre de tours : scores finis, niveaux saturés à `high` par les SEULS seuils existants', () => {
    // technical-constant: TEST_ONLY — nombre de tours extrême
    const d = demand(draft([{ format: forTime(100_000) }]));
    expect(Object.values(d.profile.scores).every(Number.isFinite)).toBe(true);
    for (const [s, v] of Object.entries(d.profile.scores)) if (v > 0) expect(d.profile.levels[s]).toBe('high');
  });

  it('charge prescrite : n’entre pas dans la dose (contrat inchangé), seule la quantité est répétée', () => {
    const light = demand(draft([{ format: forTime(3), items: [ITEMS[0]] }]));
    const heavy = demand(draft([{ format: forTime(3), items: [{ ...ITEMS[0], prescription: { type: 'reps', reps: 10, load: { kg: 20, certainty: 'prescribed' } } }] }]));
    expect(heavy.profile.scores).toEqual(light.profile.scores);
  });

  it('export / import : la séance relue après JSON redonne exactement le même profil (dérivation, rien de stocké)', () => {
    const s = draft([{ format: forTime(4) }]);
    const back = zSessionDraft.parse(JSON.parse(JSON.stringify(s)));
    expect(demand(back).profile).toEqual(demand(s).profile);
  });
});
