/**
 * Étapes 8–11 : hiérarchie de la charge (jamais de 1RM inventé, jamais de transfert de machine), dosage
 * (profil de base × modificateurs, politique de conflit tracée), première exposition (calibration), et
 * montée en charge selon les 4 états de connaissance.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, SetPrescription } from '@hybridsport/domain';
import { buildRampups, computeDose, decideLoad, loadKnowledge } from '../../src/index.js';
import type { LoadDecision, StrengthContextInput } from '../../src/index.js';
import { envFor, NOW, scenario, strengthCatalog } from '../fixtures/harness.js';
import { strengthCatalogDocument } from '../fixtures/catalog.js';

const CATALOG = strengthCatalog();
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const daysAgo = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString().replace('.000Z', 'Z');
const exposure = (exerciseId: string, d: number, sets: { loadKg?: number; reps: number; rir?: number }[]) => ({ exerciseId, at: daysAgo(d), sets });
const withCtx = (context: Partial<StrengthContextInput>, o: Parameters<typeof scenario>[0] = {}) => envFor(scenario({ ...o, context }));
const kgOf = (s: SetPrescription | undefined): number | undefined => (s?.intensity?.mode === 'load' ? s.intensity.kg : s?.intensity?.mode === 'percent_of_reference' ? s.intensity.kgRounded : undefined);

describe('hiérarchie de la charge (étape 9)', () => {
  it('aucune donnée ⇒ confiance none, aucune estimation ; jamais de 1RM inventé', () => {
    const k = loadKnowledge(ex('ex.bench_press'), withCtx({}));
    expect(k).toMatchObject({ confidence: 'none', source: 'none' });
    expect(k.e1rmKg).toBeUndefined();
  });

  it('séries récentes AVEC RIR ⇒ high (mesuré) ; la confiance baisse avec l’âge de la référence (fenêtres G2)', () => {
    const at = (d: number) => loadKnowledge(ex('ex.bench_press'), withCtx({ recentExposures: [exposure('ex.bench_press', d, [{ loadKg: 80, reps: 8, rir: 2 }])] }));
    expect(at(3)).toMatchObject({ confidence: 'high', source: 'measured' });
    expect(at(3).e1rmKg).toBeCloseTo(80 * (1 + 10 / 30), 5);
    expect(at(60).confidence).toBe('medium');
    expect(at(200).confidence).toBe('low');
    expect(at(400).confidence).toBe('none');
  });

  it('séries SANS RIR ⇒ medium (RIR supposé du ruleset) ; 1RM déclaré ⇒ medium ; conflit > tolérance ⇒ déclassé et tracé', () => {
    expect(loadKnowledge(ex('ex.bench_press'), withCtx({ recentExposures: [exposure('ex.bench_press', 3, [{ loadKg: 80, reps: 8 }])] })).confidence).toBe('medium');
    const declared = loadKnowledge(ex('ex.bench_press'), withCtx({ capacities: [{ exerciseId: 'ex.bench_press', source: 'declared_1rm', asOf: daysAgo(10), e1rmKg: 100 }] }));
    expect(declared).toMatchObject({ confidence: 'medium', source: 'declared', e1rmKg: 100 });
    const conflict = loadKnowledge(ex('ex.bench_press'), withCtx({ recentExposures: [exposure('ex.bench_press', 3, [{ loadKg: 80, reps: 8, rir: 2 }])], capacities: [{ exerciseId: 'ex.bench_press', source: 'declared_1rm', asOf: daysAgo(10), e1rmKg: 140 }] }));
    expect(conflict.confidence).toBe('medium');
    expect(conflict.reasons.map((r) => r.code)).toContain('STATE.REFERENCE_CONFLICT');
  });

  it('une machine n’hérite JAMAIS de la charge d’une barre ; deux machines ne sont jamais équivalentes', () => {
    const env = withCtx({ recentExposures: [exposure('ex.bench_press', 3, [{ loadKg: 80, reps: 8, rir: 2 }]), exposure('ex.leg_press', 3, [{ loadKg: 200, reps: 10, rir: 2 }])] });
    expect(loadKnowledge(ex('ex.machine_chest_press'), env).confidence).toBe('none');
    expect(loadKnowledge(ex('ex.hack_squat'), env).confidence).toBe('none');
  });

  it('transfert LIMITÉ à la classe d’équivalence et aux modèles transférables, avec déclassement (D-S5)', () => {
    const doc = strengthCatalogDocument();
    const bench = doc.exercises.find((e) => e.id === 'ex.bench_press');
    if (!bench) throw new Error('bench');
    const paused = { ...bench, id: 'ex.paused_bench_press', family: 'fam.bench_paused' };
    const catalog = strengthCatalog({ ...doc, exercises: [...doc.exercises, paused] });
    const env = envFor(scenario({ catalog, context: { recentExposures: [exposure('ex.bench_press', 3, [{ loadKg: 80, reps: 8, rir: 2 }])] } }));
    const k = loadKnowledge(catalog.exercise('ex.paused_bench_press') as Exercise, env);
    expect(k).toMatchObject({ confidence: 'medium', source: 'transferred' });
  });

  it('référence de machine liée à sa salle (D-S6) : ignorée dans un autre contexte de matériel', () => {
    const cap = { exerciseId: 'ex.leg_press', source: 'declared_recent_loads' as const, asOf: daysAgo(5), loadKg: 180, reps: 10, rir: 2, contextKey: 'gym.a' };
    expect(loadKnowledge(ex('ex.leg_press'), withCtx({ capacities: [cap], currentContextKey: 'gym.a' })).confidence).not.toBe('none');
    expect(loadKnowledge(ex('ex.leg_press'), withCtx({ capacities: [cap], currentContextKey: 'gym.b' })).confidence).toBe('none');
  });

  it('mode de prescription par confiance : high ⇒ % d’e1RM arrondi au pas ; accessoire ⇒ dernière charge réelle ; low ⇒ effort + fourchette ; none ⇒ effort seul', () => {
    const high = withCtx({ recentExposures: [exposure('ex.bench_press', 3, [{ loadKg: 80, reps: 8, rir: 2 }])] });
    const d = decideLoad(ex('ex.bench_press'), 6, 2, high);
    expect(d.intensity.mode).toBe('percent_of_reference');
    if (d.intensity.mode === 'percent_of_reference') {
      expect(d.intensity.kgRounded % 2.5).toBe(0);
      expect(d.intensity.kgRounded).toBeLessThanOrEqual(80 * (1 + 10 / 30) * d.intensity.fraction);
    }
    const acc = decideLoad(ex('ex.bench_press'), 10, 2, high, undefined, false);
    expect(acc.intensity).toMatchObject({ mode: 'load', kg: 80, certainty: 'prescribed' });
    const low = decideLoad(ex('ex.bench_press'), 6, 2, withCtx({ recentExposures: [exposure('ex.bench_press', 200, [{ loadKg: 80, reps: 8, rir: 2 }])] }));
    expect(low.intensity.mode).toBe('effort');
    expect(low.intensity.mode === 'effort' && low.intensity.indicativeKg !== undefined).toBe(true);
    const none = decideLoad(ex('ex.bench_press'), 6, 2, withCtx({}));
    expect(none).toMatchObject({ source: 'calibration', knowledge: 'unknown', intensity: { mode: 'effort' } });
    expect(JSON.stringify(none.intensity)).not.toMatch(/kg/i);
  });

  it('lest du poids du corps sans référence ⇒ poids du corps à l’effort (aucun lest inventé) ; non chargeable ⇒ bodyweight', () => {
    expect(decideLoad(ex('ex.pull_up'), 8, 2, withCtx({})).intensity).toMatchObject({ mode: 'bodyweight' });
    expect(decideLoad(ex('ex.push_up'), 10, 2, withCtx({})).intensity).toMatchObject({ mode: 'bodyweight' });
  });

  it('charge de la track (ProgressionEngine) fait foi ; plafond matériel déclaré ⇒ charge plafonnée et tracée', () => {
    const env = withCtx({ recentExposures: [exposure('ex.db_bench_press', 3, [{ loadKg: 30, reps: 10, rir: 2 }])], equipmentIncrements: { dumbbells: { stepKg: 2.5, maxKg: 32.5 } } });
    const t = decideLoad(ex('ex.db_bench_press'), 10, 2, env, 30);
    expect(t).toMatchObject({ source: 'track', intensity: { mode: 'load', kg: 30 } });
    const capped = decideLoad(ex('ex.db_bench_press'), 10, 2, env, 35);
    expect(capped.capped).toBe(true);
    expect(capped.intensity).toMatchObject({ kg: 32.5 });
    expect(capped.reasons.map((r) => r.code)).toContain('DOSE.LOAD.CAP_REACHED');
  });

  it('e1RM lissé de la track préféré à la dernière exposition brute (sans relever la confiance)', () => {
    const env = withCtx({ recentExposures: [exposure('ex.back_squat', 2, [{ loadKg: 142.5, reps: 5, rir: 2 }])] });
    const raw = decideLoad(ex('ex.back_squat'), 3, 2, env);
    const smoothed = decideLoad(ex('ex.back_squat'), 3, 2, env, undefined, true, 150);
    expect(kgOf({ kind: 'working', reps: 3, restAfterS: 60, intensity: smoothed.intensity })).toBeLessThan(kgOf({ kind: 'working', reps: 3, restAfterS: 60, intensity: raw.intensity }) ?? 0);
    expect(decideLoad(ex('ex.back_squat'), 3, 2, withCtx({}), undefined, true, 150).knowledge).toBe('unknown');
  });
});

describe('dosage (étape 8) et première exposition (étape 10)', () => {
  const cellOf = (env: ReturnType<typeof envFor>) => env.params['strength.dose.base'].general?.primary?.compound_high_load;

  it('profil de base : séries, reps et repos dans la cellule du ruleset ; repos arrondi au pas', () => {
    const env = withCtx({});
    const d = computeDose(ex('ex.back_squat'), env, { role: 'primary', timePressure: false, doubleProgression: false, calibration: false });
    const cell = cellOf(env);
    if (!cell) throw new Error('cell');
    expect(d.sets).toBeGreaterThanOrEqual(cell.sets.min);
    expect(d.sets).toBeLessThanOrEqual(cell.sets.max);
    expect(d.reps).toBe(cell.reps.min);
    expect(d.restS % env.params['strength.dose.modifiers'].restRoundingS).toBe(0);
    expect(d.restS).toBeGreaterThanOrEqual(cell.restS.min);
    expect(d.reasons).toEqual([]);
  });

  it('modificateurs tracés ; politique de conflit most_conservative : Δséries = min, ΔRIR = max', () => {
    const env = envFor(scenario({ level: 'novice', state: { readiness: 'caution', activePain: [], painHistory: 'available', dayAvailable: true } }));
    const d = computeDose(ex('ex.goblet_squat'), env, { role: 'primary', timePressure: false, doubleProgression: false, calibration: false });
    const mods = d.reasons.filter((r) => r.code === 'DOSE.MODIFIED').map((r) => String(r.params.modifier));
    expect(mods.some((m) => m.startsWith('level:novice|most_conservative'))).toBe(true);
    expect(mods.some((m) => m.startsWith('readiness:caution'))).toBe(true);
    const cell = env.params['strength.dose.base'].general?.primary?.compound_high_load;
    // novice (−1 série, +1 RIR) et prudence (0, +1) : Δséries = −1, ΔRIR = +1 (le max, pas la somme).
    expect(d.rir).toBe((cell?.rir ?? 0) + 1);
    expect(d.sets).toBe(Math.max(1, (cell?.sets.min ?? 0) - 1));
  });

  it('régression (simulation) : séries allouées par le volume ⇒ le niveau ne retire pas une série de plus (cibles déjà à l’échelle du niveau)', () => {
    const env = envFor(scenario({ level: 'novice' }));
    const d = computeDose(ex('ex.goblet_squat'), env, { role: 'primary', timePressure: false, doubleProgression: false, calibration: false, allocatedSets: 3 });
    const cell = env.params['strength.dose.base'].general?.primary?.compound_high_load;
    expect(d.sets).toBe(Math.min(3, cell?.sets.max ?? 3));
    expect(d.rir).toBe((cell?.rir ?? 0) + env.params['strength.dose.modifiers'].level.novice.rirDelta);
  });

  it('décharge : facteur de séries et RIR relevé ; pression temporelle : non-principaux au plancher, repos bas', () => {
    const deload = envFor(scenario({ context: { phase: { kind: 'deload', weekInMesocycle: 4, mesocycleLength: 4 } } }));
    const normal = withCtx({});
    const opts = { role: 'secondary' as const, timePressure: false, doubleProgression: false, calibration: false, allocatedSets: 3 };
    const dd = computeDose(ex('ex.bench_press'), deload, opts);
    const dn = computeDose(ex('ex.bench_press'), normal, opts);
    expect(dd.sets).toBeLessThan(dn.sets);
    expect(dd.rir).toBeGreaterThan(dn.rir);
    const tp = computeDose(ex('ex.bench_press'), normal, { ...opts, timePressure: true });
    expect(tp.sets).toBeLessThanOrEqual(dn.sets);
    expect(tp.restS).toBeLessThanOrEqual(dn.restS);
  });

  it('première exposition : N premières séries de calibration à un effort plus prudent (G2), jamais sur une track ; la track fixe les reps, jamais les séries ni le RIR', () => {
    const env = withCtx({});
    const d = computeDose(ex('ex.bench_press'), env, { role: 'secondary', timePressure: false, doubleProgression: false, calibration: true, allocatedSets: 3 });
    const cal = env.params['strength.calibration'];
    expect(d.calibrationSets).toBe(Math.min(d.sets, cal.sets));
    expect(d.calibrationRir).toBeGreaterThanOrEqual(d.rir);
    const tracked = computeDose(ex('ex.bench_press'), env, { role: 'secondary', timePressure: false, doubleProgression: false, calibration: true, track: { trackId: 't', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_full_body', slotId: 'fb.push_h', model: 'double_progression', status: 'active', openedAt: NOW, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, nextPrescription: { sets: 6, reps: 8, loadKg: 80, rir: 5 } } });
    expect(tracked.calibrationSets).toBe(0);
    // Séries = allocation du volume ; RIR = profil du stimulus (+ modificateurs) : pas de double application (régression).
    const cell = env.params['strength.dose.base'].general?.secondary?.compound_high_load;
    expect(tracked).toMatchObject({ sets: cell?.sets.min, reps: 8, rir: cell?.rir });
  });

  it('aucun RIR universel : le RIR dépend du stimulus, du rôle et de la classe d’exercice (lu dans le ruleset)', () => {
    const env = withCtx({});
    const rirs = new Set([
      computeDose(ex('ex.back_squat'), env, { role: 'primary', timePressure: false, doubleProgression: false, calibration: false }).rir,
      computeDose(ex('ex.cable_curl'), env, { role: 'accessory', timePressure: false, doubleProgression: true, calibration: false }).rir,
      computeDose(ex('ex.back_squat'), envFor(scenario({ archetype: 'str_lower', stimulus: 'strength_volume', context: { goal: { primary: { goal: 'hypertrophy' } } } })), { role: 'accessory', timePressure: false, doubleProgression: true, calibration: false }).rir,
      computeDose(ex('ex.cable_curl'), envFor(scenario({ archetype: 'str_upper', stimulus: 'strength_volume', context: { goal: { primary: { goal: 'hypertrophy' } } } })), { role: 'accessory', timePressure: false, doubleProgression: true, calibration: false }).rir,
    ]);
    expect(rirs.size).toBeGreaterThanOrEqual(2);
  });
});

describe('montée en charge (étape 11)', () => {
  const env = withCtx({});
  const decision = (knowledge: LoadDecision['knowledge'], workingKg?: number): LoadDecision => ({ intensity: { mode: 'effort', effort: { rir: 2 } }, source: 'base_profile', knowledge, reasons: [], capped: false, ...(workingKg !== undefined ? { workingKg } : {}) });
  const base = { role: 'primary' as const, exerciseClass: 'compound_high_load' as const, samePatternBefore: 0, workingReps: 5 };

  it('connue : paliers en kg croissants, sous la charge de travail, sans doublon ; bande choisie par l’intensité relative', () => {
    const light = buildRampups(ex('ex.back_squat'), env, { ...base, decision: decision('known', 140), relativeIntensity: 0.6 });
    const heavy = buildRampups(ex('ex.back_squat'), env, { ...base, decision: decision('known', 140), relativeIntensity: 0.9 });
    expect(heavy.length).toBeGreaterThan(light.length);
    const kgs = heavy.map((s) => (s.intensity?.mode === 'load' ? s.intensity.kg : Number.NaN));
    expect(kgs).toEqual([...kgs].sort((a, b) => a - b));
    expect(new Set(kgs).size).toBe(kgs.length);
    expect(kgs.every((k) => k > 0 && k < 140)).toBe(true);
    expect(heavy.every((s) => s.kind === 'rampup')).toBe(true);
  });

  it('estimée : relative_to_working seulement, plafonnée par le ruleset ; effort : RPE ; inconnue : RPE progressifs', () => {
    const r = env.params['strength.rampup'];
    const est = buildRampups(ex('ex.back_squat'), env, { ...base, decision: decision('estimated') });
    expect(est.length).toBeGreaterThan(0);
    expect(est.every((s) => s.intensity?.mode === 'relative_to_working' && s.intensity.fraction <= r.estimatedLastStepMax)).toBe(true);
    const eff = buildRampups(ex('ex.back_squat'), env, { ...base, decision: decision('effort') });
    expect(eff.map((s) => (s.intensity?.mode === 'effort' ? s.intensity.effort : undefined))).toEqual(r.effortSteps.map((s) => ({ rpe: s.rpe })));
    const unk = buildRampups(ex('ex.back_squat'), env, { ...base, decision: decision('unknown') });
    expect(unk).toHaveLength(r.unknownSteps.length);
  });

  it('jamais sur l’isolation, un accessoire, le poids du corps, un modèle de charge non listé ni au-delà du seuil de répétitions', () => {
    expect(buildRampups(ex('ex.back_squat'), env, { ...base, role: 'accessory', decision: decision('known', 140) })).toEqual([]);
    expect(buildRampups(ex('ex.leg_curl'), env, { ...base, exerciseClass: 'isolation', decision: decision('known', 50) })).toEqual([]);
    expect(buildRampups(ex('ex.pull_up'), env, { ...base, decision: decision('unknown') })).toEqual([]);
    expect(buildRampups(ex('ex.db_bench_press'), env, { ...base, decision: decision('known', 30) })).toEqual([]);
    expect(buildRampups(ex('ex.back_squat'), env, { ...base, workingReps: env.params['strength.rampup'].maxWorkingReps + 1, decision: decision('known', 100) })).toEqual([]);
  });

  it('même pattern déjà monté dans la séance : au plus samePatternMax paliers (les plus lourds)', () => {
    const all = buildRampups(ex('ex.back_squat'), env, { ...base, decision: decision('known', 140), relativeIntensity: 0.9 });
    const after = buildRampups(ex('ex.back_squat'), env, { ...base, samePatternBefore: 1, decision: decision('known', 140), relativeIntensity: 0.9 });
    expect(after).toHaveLength(env.params['strength.rampup'].samePatternMax);
    expect(after).toEqual(all.slice(-after.length));
  });
});
