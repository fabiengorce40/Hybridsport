/**
 * Phase 4C §10 — durcissement après Stryker : valeurs EXACTES et bornes des modules critiques (sélection,
 * dosage, charge, progression). Chaque test cible des mutants survivants qui modifiaient réellement une
 * prescription ou une sélection sans qu'aucun test rapide ne le voie (seuls les goldens le voyaient).
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, SetPrescription } from '@hybridsport/domain';
import { asISODateTime } from '@hybridsport/domain';
import { classifyExposure, closureCause, computeDose, createTrack, criterionValue, decideLoad, decidingCriterion, loadKnowledge, loadStep, rankCandidates, readStrengthParams, startCycle, updateTrack } from '../../src/index.js';
import type { Env, ExecutedItem, SlotInstance, StrengthContextInput, StrengthTrack } from '../../src/index.js';
import { envFor, NOW, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { strengthRulesetDocument, STRENGTH_TEST_VALUES } from '../fixtures/ruleset.js';

const CATALOG = strengthCatalog();
const P = readStrengthParams(strengthRuleset()).values;
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const daysAgo = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString().replace('.000Z', 'Z');
const exposure = (exerciseId: string, d: number, sets: { loadKg?: number; reps: number; rir?: number }[]) => ({ exerciseId, at: daysAgo(d), sets });
const withCtx = (context: Partial<StrengthContextInput>, o: Parameters<typeof scenario>[0] = {}) => envFor(scenario({ ...o, context: { ...(o.context ?? {}), ...context } }));
const slotIn = (env: Env, id: string): SlotInstance => { const def = env.archetype.slots.find((s) => s.id === id); if (!def) throw new Error(id); return { def, requirement: env.params['strength.needs'][def.need]?.requirement ?? {} }; };
const norm = (xs: readonly number[]) => xs.map((x) => x + 0); // −0 → 0
const NONE = { chosen: [] };
const cv = (c: Parameters<typeof criterionValue>[0], e: string, slot: string, env: Env, soFar: Parameters<typeof criterionValue>[4] = NONE) => norm(criterionValue(c, ex(e), slotIn(env, slot), env, soFar));

describe('sélection : valeur exacte de chaque critère', () => {
  it('goal_relevance selon l’objectif (force, soutien course, soutien HYROX)', () => {
    const general = envFor(scenario());
    expect(cv('goal_relevance', 'ex.db_rdl', 'fb.main_hip', general)).toEqual([ex('ex.db_rdl').relevance.strength ?? 0]);
    const run = withCtx({ goal: { primary: { goal: 'support', supportFor: 'running' } } }, { archetype: 'str_support', stimulus: 'strength_support' });
    expect(cv('goal_relevance', 'ex.db_rdl', 'sp.main_hip', run)).toEqual([ex('ex.db_rdl').relevance.running_support ?? 0]);
    const hyrox = withCtx({ goal: { primary: { goal: 'support', supportFor: 'hybrid_race' } } }, { archetype: 'str_support', stimulus: 'strength_support' });
    expect(cv('goal_relevance', 'ex.db_rdl', 'sp.main_hip', hyrox)).toEqual([ex('ex.db_rdl').relevance.hybrid_race ?? 0]);
    expect(cv('goal_relevance', 'ex.leg_press', 'sp.main_hip', run)).toEqual([0]);
  });

  it('role_fit selon la préférence de modalité ; load_adequacy à la borne ; préférence ; ancre et track', () => {
    const env = envFor(scenario());
    expect(cv('role_fit', 'ex.back_squat', 'fb.main_knee', env)).toEqual([ex('ex.back_squat').loadCeiling]);
    for (const id of ['ex.pec_deck', 'ex.db_curl', 'ex.cable_fly']) expect(cv('role_fit', id, 'fb.iso_upper', env)).toEqual([ex(id).stability, 3 - ex(id).cost.technical]);
    expect(cv('role_fit', 'ex.bench_press', 'fb.push_h', env)).toEqual([0]);
    const run = withCtx({ goal: { primary: { goal: 'support', supportFor: 'running' } } }, { archetype: 'str_support', stimulus: 'strength_support' });
    expect(cv('role_fit', 'ex.db_rdl', 'sp.main_hip', run)).toEqual([ex('ex.db_rdl').relevance.running_support ?? 0]);
    // Plafond minimal intermédiaire = 1 : loadCeiling 1 admis (≥), 0 non.
    expect(cv('load_adequacy', 'ex.leg_curl', 'fb.iso_lower', env)).toEqual([1]);
    expect(cv('load_adequacy', 'ex.push_up', 'fb.push_h', env)).toEqual([0]);
    const pref = withCtx({ preferences: { liked: ['ex.db_row'], disliked: ['ex.machine_row'] } });
    expect([cv('preference', 'ex.db_row', 'fb.pull_h', pref), cv('preference', 'ex.machine_row', 'fb.pull_h', pref), cv('preference', 'ex.seated_cable_row', 'fb.pull_h', pref)]).toEqual([[1], [-1], [0]]);
    const t = (o: Partial<StrengthTrack>): StrengthTrack => ({ trackId: 't', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_full_body', slotId: 'fb.push_h', model: 'linear_load', status: 'active', openedAt: NOW, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, ...o });
    const tracked = withCtx({ tracks: [t({}), t({ trackId: 'u', tier: 'tracked', exerciseId: 'ex.pec_deck', slotId: 'fb.iso_upper' })] }, { intent: { repetitionIntents: [{ kind: 'progression_anchor', trackId: 't' }] } });
    expect([cv('anchor', 'ex.bench_press', 'fb.push_h', tracked), cv('anchor', 'ex.db_bench_press', 'fb.push_h', tracked)]).toEqual([[1], [0]]);
    expect([cv('track', 'ex.pec_deck', 'fb.iso_upper', tracked), cv('track', 'ex.db_curl', 'fb.iso_upper', tracked)]).toEqual([[1], [0]]);
  });

  it('recency : bandes [2, 5] jours aux bornes ; jamais exposé = meilleur', () => {
    const at = (d: number) => cv('recency', 'ex.bench_press', 'fb.push_h', withCtx({ recentExposures: [exposure('ex.db_bench_press', d, [{ loadKg: 30, reps: 8, rir: 2 }])] }));
    expect([at(1), at(2), at(3), at(5), at(6)]).toEqual([[0], [1], [1], [2], [2]]);
    expect(cv('recency', 'ex.bench_press', 'fb.push_h', envFor(scenario()))).toEqual([2]);
  });

  it('fatigue_fit : charge axiale au-delà du maximum, zones à ménager, structures abaissées ; logistique', () => {
    const env = envFor(scenario());
    const squatChosen = { chosen: [{ exercise: ex('ex.back_squat'), slotId: 'fb.main_knee', blockId: 'b.main' }] };
    expect(cv('fatigue_fit', 'ex.back_squat', 'fb.main_knee', env, squatChosen)[0]).toBe(-1);
    expect(cv('fatigue_fit', 'ex.romanian_deadlift', 'fb.main_hip', env, squatChosen)[0]).toBe(0);
    expect(cv('fatigue_fit', 'ex.back_squat', 'fb.main_knee', env)).toEqual([0, 0, 0]);
    const knee = { ...env, input: { ...env.input, constraints: { ...env.input.constraints, areaRestrictions: [{ area: 'knee', action: 'reduce' as const, painLevel: 'P1' }, { area: 'shoulder', action: 'exclude' as const, painLevel: 'P2' }] } } } as Env;
    expect(cv('fatigue_fit', 'ex.back_squat', 'fb.main_knee', knee)[1]).toBe(-ex('ex.back_squat').painSensitiveAreas.filter((a) => a === 'knee').length);
    const lowered = withCtx({ week: { otherStrengthSessions: [], neighbors: [{ discipline: 'running', stimulus: 'k', priority: 'key', hoursFromThisSession: 10, demand: { lower_knee: 'high', lower_hip: 'high' } }], known: true } });
    const st = lowered.structuresOf(ex('ex.back_squat'));
    expect(cv('fatigue_fit', 'ex.back_squat', 'fb.main_knee', lowered)[2]).toBe(-((st.lower_knee ?? 0) + (st.lower_hip ?? 0)));
    const prev = { chosen: [{ exercise: ex('ex.db_bench_press'), slotId: 'fb.push_h', blockId: 'b.secondary' }] };
    expect(cv('logistics', 'ex.db_row', 'fb.pull_h', env, prev)).toEqual([1, -ex('ex.db_row').timing.setupS]);
    expect(cv('logistics', 'ex.seated_cable_row', 'fb.pull_h', env, prev)).toEqual([0, -ex('ex.seated_cable_row').timing.setupS]);
    const otherBlock = { chosen: [{ exercise: ex('ex.db_bench_press'), slotId: 'fb.push_h', blockId: 'b.main' }] };
    expect(cv('logistics', 'ex.db_row', 'fb.pull_h', env, otherBlock)[0]).toBe(0);
  });

  it('volume_fit : [−groupes au-delà du haut, +groupes sous le plancher]', () => {
    const base = { archetype: 'str_upper', stimulus: 'strength_volume', context: { goal: { primary: { goal: 'hypertrophy' as const } } } };
    expect(cv('volume_fit', 'ex.pec_deck', 'up.iso_upper', envFor(scenario(base)))).toEqual([0, 1]);
    expect(cv('volume_fit', 'ex.pec_deck', 'up.iso_upper', envFor(scenario({ ...base, context: { ...base.context, hardSets: { d7: { chest: 40 } } } })))).toEqual([-1, 0]);
    const mid = envFor(scenario({ ...base, context: { ...base.context, hardSets: { d7: { chest: 12 } } } }));
    expect(cv('volume_fit', 'ex.pec_deck', 'up.iso_upper', mid)).toEqual([0, 0]);
  });

  it('classement : égalité parfaite ⇒ graine ; autres départagés par identifiant ; critère décisif « none » / « only_candidate »', () => {
    const env = envFor(scenario());
    const slot = slotIn(env, 'fb.pull_h');
    expect(decidingCriterion([], slot, env)).toBe('none');
    const one = rankCandidates([ex('ex.db_row')], slot, env, NONE);
    expect(decidingCriterion(one, slot, env)).toBe('only_candidate');
    const clones = ['ex.a', 'ex.b', 'ex.c'].map((id) => ({ ...ex('ex.machine_row'), id }));
    const r = rankCandidates(clones, slot, env, NONE);
    expect(decidingCriterion(r, slot, env)).toBe('seed_tiebreak');
    expect(r.slice(1).map((x) => x.exercise.id)).toEqual(clones.map((c) => c.id).filter((id) => id !== r[0]?.exercise.id));
  });
});

describe('dosage : valeurs exactes', () => {
  const env = envFor(scenario());
  const o = { timePressure: false, doubleProgression: false, calibration: false };

  it('repos : milieu arrondi au pas (52,5 → 60), jamais sous le minimum ; bas sous contrainte de temps ; haut si choisi', () => {
    expect(computeDose(ex('ex.pec_deck'), env, { ...o, role: 'accessory' }).restS).toBe(60);
    expect(computeDose(ex('ex.bench_press'), env, { ...o, role: 'secondary' }).restS).toBe(105);
    expect(computeDose(ex('ex.bench_press'), env, { ...o, role: 'secondary', timePressure: true }).restS).toBe(90);
    const high = envFor(scenario({ ruleset: strengthRuleset(strengthRulesetDocument({ 'strength.dose.modifiers': { ...(STRENGTH_TEST_VALUES['strength.dose.modifiers'] as object), restChoice: 'high' } })) }));
    expect(computeDose(ex('ex.bench_press'), high, { ...o, role: 'secondary' }).restS).toBe(120);
  });

  it('politique de conflit : most_conservative (min séries, max RIR) contre sum ; RIR de calibration = max(RIR, cible + delta)', () => {
    const caution = { readiness: 'caution' as const, activePain: [], painHistory: 'available' as const, dayAvailable: true };
    const mc = computeDose(ex('ex.back_squat'), envFor(scenario({ level: 'novice', state: caution })), { ...o, role: 'primary', calibration: true });
    expect({ sets: mc.sets, rir: mc.rir, cal: mc.calibrationRir }).toEqual({ sets: 1, rir: 3, cal: 4 });
    const sum = envFor(scenario({ level: 'novice', state: caution, ruleset: strengthRuleset(strengthRulesetDocument({ 'strength.dose.modifiers': { ...(STRENGTH_TEST_VALUES['strength.dose.modifiers'] as object), conflictPolicy: 'sum' } })) }));
    const s = computeDose(ex('ex.back_squat'), sum, { ...o, role: 'primary', calibration: true });
    expect({ sets: s.sets, rir: s.rir, cal: s.calibrationRir }).toEqual({ sets: 1, rir: 4, cal: 5 });
    const unknown = envFor(scenario({ state: { ...caution, readiness: 'unknown' }, ruleset: strengthRuleset(strengthRulesetDocument({ 'strength.dose.modifiers': { ...(STRENGTH_TEST_VALUES['strength.dose.modifiers'] as object), unknownReadiness: 'as_caution' } })) }));
    expect(computeDose(ex('ex.back_squat'), unknown, { ...o, role: 'primary' }).reasons.map((r) => String(r.params.modifier))).toContain('readiness:caution|most_conservative');
    expect(computeDose(ex('ex.back_squat'), envFor(scenario({ state: { ...caution, readiness: 'unknown' } })), { ...o, role: 'primary' }).reasons).toEqual([]);
  });

  it('contrainte de temps : non-principal au plancher avec delta tracé exact ; principal inchangé ; interférence au seuil de sollicitation', () => {
    const tp = computeDose(ex('ex.bench_press'), env, { ...o, role: 'secondary', allocatedSets: 3, timePressure: true });
    expect(tp.sets).toBe(2);
    expect(tp.reasons.find((r) => r.params.modifier === 'time')?.params.setsDelta).toBe(-1);
    expect(computeDose(ex('ex.back_squat'), env, { ...o, role: 'primary', allocatedSets: 3, timePressure: true }).sets).toBe(3);
    const lowered = withCtx({ week: { otherStrengthSessions: [], neighbors: [{ discipline: 'running', stimulus: 'k', priority: 'key', hoursFromThisSession: 10, demand: { lower_knee: 'high' } }], known: true } });
    expect(computeDose(ex('ex.back_squat'), lowered, { ...o, role: 'primary' }).reasons.some((r) => String(r.params.modifier).startsWith('interference:lower_knee'))).toBe(true);
    expect(computeDose(ex('ex.bench_press'), lowered, { ...o, role: 'secondary' }).reasons).toEqual([]);
  });
});

describe('charge : valeurs exactes et bornes', () => {
  it('fenêtres d’âge : 42 j → high, 43 → medium, 112 → medium, 113 → low, 365 → low, 366 → none', () => {
    const conf = (d: number) => loadKnowledge(ex('ex.bench_press'), withCtx({ recentExposures: [exposure('ex.bench_press', d, [{ loadKg: 80, reps: 8, rir: 2 }])] })).confidence;
    expect([42, 43, 112, 113, 365, 366].map(conf)).toEqual(['high', 'medium', 'medium', 'low', 'low', 'none']);
  });

  it('lissage sur les 3 mesures les plus récentes (médiane) ; dernière charge = exposition la plus récente ; séries vides ignorées', () => {
    const env = withCtx({ recentExposures: [exposure('ex.bench_press', 10, [{ loadKg: 60, reps: 10, rir: 2 }]), exposure('ex.bench_press', 1, [{ loadKg: 90, reps: 5, rir: 2 }]), exposure('ex.bench_press', 7, [{ loadKg: 70, reps: 8, rir: 2 }]), exposure('ex.bench_press', 4, [{ loadKg: 80, reps: 8, rir: 2 }])] });
    const k = loadKnowledge(ex('ex.bench_press'), env);
    expect(k.e1rmKg).toBeCloseTo(80 * (1 + 10 / 30), 6);
    expect(k.lastLoadKg).toBe(90);
    const empty = loadKnowledge(ex('ex.bench_press'), withCtx({ recentExposures: [exposure('ex.bench_press', 1, [{ loadKg: 0, reps: 8, rir: 2 }, { loadKg: 80, reps: 0, rir: 2 }])] }));
    expect(empty).toMatchObject({ confidence: 'none' });
    expect(empty.e1rmKg).toBeUndefined();
  });

  it('borne inférieure (série trop légère) : 12 kg × 10 @ RIR 8 ⇒ e1RM ≥ 12 × (1 + 12/30), confiance low ; fourchette indicative exacte', () => {
    const env = withCtx({ recentExposures: [exposure('ex.db_bench_press', 3, [{ loadKg: 12, reps: 10, rir: 8 }])] });
    const k = loadKnowledge(ex('ex.db_bench_press'), env);
    expect(k.confidence).toBe('low');
    expect(k.e1rmKg).toBeCloseTo(16.8, 6);
    const d = decideLoad(ex('ex.db_bench_press'), 10, 2, env);
    expect(d.intensity).toEqual({ mode: 'effort', effort: { rir: 2 }, indicativeKg: { min: 10, max: 12 } });
  });

  it('confiance medium (sans RIR) ⇒ charge suggérée exacte ; déclarations : sources et conflit', () => {
    const med = decideLoad(ex('ex.bench_press'), 6, 2, withCtx({ recentExposures: [exposure('ex.bench_press', 3, [{ loadKg: 80, reps: 8 }])] }));
    expect(med).toMatchObject({ source: 'history', knowledge: 'estimated', intensity: { mode: 'load', kg: 80, certainty: 'suggested' } });
    const cap = (source: 'app_sets_with_rir' | 'declared_recent_loads', e1rmKg: number, asOf = daysAgo(5)) => ({ exerciseId: 'ex.bench_press', source, asOf, e1rmKg });
    expect(loadKnowledge(ex('ex.bench_press'), withCtx({ capacities: [cap('app_sets_with_rir', 100)] })).confidence).toBe('high');
    expect(loadKnowledge(ex('ex.bench_press'), withCtx({ capacities: [cap('declared_recent_loads', 100)] })).confidence).toBe('low');
    const conflict = loadKnowledge(ex('ex.bench_press'), withCtx({ capacities: [cap('app_sets_with_rir', 100), cap('app_sets_with_rir', 130, daysAgo(9))] }));
    expect(conflict).toMatchObject({ confidence: 'medium', e1rmKg: 100 });
  });

  it('plafond matériel sur une charge en % ⇒ plafonnée et tracée ; incrément déclaré seulement si le matériel est présent', () => {
    const env = withCtx({ recentExposures: [exposure('ex.bench_press', 3, [{ loadKg: 80, reps: 8, rir: 2 }])], equipmentIncrements: { barbell: { stepKg: 2.5, maxKg: 60 }, rower: { stepKg: 1 } } });
    const d = decideLoad(ex('ex.bench_press'), 6, 2, env);
    expect(d.capped).toBe(true);
    expect(d.intensity).toMatchObject({ mode: 'percent_of_reference', kgRounded: 60 });
    expect(d.reasons.map((r) => r.code)).toContain('DOSE.LOAD.CAP_REACHED');
    expect(loadStep(ex('ex.bench_press'), env)).toEqual({ stepKg: 2.5, maxKg: 60 });
    expect(loadStep(ex('ex.lat_pulldown'), withCtx({ equipmentIncrements: { cable: { stepKg: 1 } } }))).toEqual({ stepKg: 1 });
    expect(loadStep(ex('ex.lat_pulldown'), withCtx({ equipmentIncrements: { cable: { stepKg: 1 } } }, { profile: { availableEquipment: ['barbell'] } }))).toEqual({ stepKg: 5 });
  });
});

describe('progression : bornes et valeurs exactes', () => {
  const work = (n: number, reps: SetPrescription['reps'], kg: number, rir = 2): SetPrescription[] => Array.from({ length: n }, () => ({ kind: 'working', reps, restAfterS: 120, intensity: { mode: 'load', kg, certainty: 'prescribed', effort: { rir } } }));
  const item = (performed: ExecutedItem['performed'], o: Partial<ExecutedItem> = {}, prescribed = work(3, 8, 80)): ExecutedItem => ({ exerciseId: 'ex.bench_press', prescribed, performed, sessionCompleted: true, ...o });
  const sets = (n: number, reps: number, kg: number, rir?: number) => Array.from({ length: n }, () => ({ reps, loadKg: kg, ...(rir !== undefined ? { rir } : {}) }));
  const track = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({ trackId: 't', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'linear_load', status: 'active', openedAt: NOW, consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, nextPrescription: { sets: 3, reps: 8, loadKg: 80, rir: 2 }, ...o });

  it('classification aux bornes des marges (RIR visé 2 : 0 ⇒ en dessous, 1 ⇒ sur la cible, 3 ⇒ au-dessus) et des séries manquées', () => {
    expect(['below', 'on_target', 'on_target', 'above'].map((_, i) => classifyExposure(item(sets(3, 8, 80, i)), P))).toEqual(['below', 'on_target', 'on_target', 'above']);
    expect(classifyExposure(item([...sets(2, 8, 80, 2), { reps: 6, loadKg: 80, rir: 1 }]), P)).toBe('partial');
    expect(classifyExposure(item([...sets(1, 8, 80, 2), ...sets(2, 6, 80, 1)]), P)).toBe('below');
    expect(classifyExposure(item([...sets(1, 8, 80, 2), { reps: 6, loadKg: 80, rir: 1 }], { sessionCompleted: false }), P)).toBe('partial');
    expect(classifyExposure(item(sets(2, 8, 80, 2), { sessionCompleted: false }), P)).toBe('interrupted');
    expect(classifyExposure(item(sets(3, 8, 80, 2), {}, []), P)).toBe('no_data');
  });

  it('autorégulé : e1RM mis à jour par médiane (track, séance) ; charge bornée par l’e1RM × % et par un pas', () => {
    const t = track({ model: 'autoregulated', e1rmKg: 100, consecutiveSuccess: 1, nextPrescription: { sets: 3, reps: 5, loadKg: 85, rir: 2 } });
    const held = updateTrack(t, item(sets(3, 5, 85, 3), {}, work(3, 5, 85)), 'above', ex('ex.bench_press'), P, 'accumulation');
    expect(held.track.e1rmKg).toBeCloseTo((100 + 85 * (1 + 8 / 30)) / 2, 6);
    expect(held.track.nextPrescription?.loadKg).toBe(85);
    expect(held.reasons.map((r) => r.params.cause)).toEqual(['estimate']);
    const adv = updateTrack(t, item(sets(3, 5, 85, 6), {}, work(3, 5, 85)), 'above', ex('ex.bench_press'), P, 'accumulation');
    expect(adv.track.nextPrescription?.loadKg).toBe(87.5);
    expect(adv.track).toMatchObject({ consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0 });
  });

  it('compteurs exacts : preuves, échecs, maintiens ; rotation au seuil de stagnation (pas avant)', () => {
    const ev = updateTrack(track({ model: 'autoregulated' }), item(sets(3, 8, 80, 2)), 'on_target', ex('ex.bench_press'), P, 'accumulation');
    expect(ev.track).toMatchObject({ consecutiveSuccess: 1, consecutiveBelow: 0 });
    const b1 = updateTrack(track({ consecutiveHolds: 1 }), item(sets(3, 5, 80, 0)), 'below', ex('ex.bench_press'), P, 'accumulation');
    expect(b1.track).toMatchObject({ consecutiveBelow: 1, consecutiveSuccess: 0, consecutiveHolds: 2 });
    expect(b1.rotate).toBe(false);
    const b2 = updateTrack(b1.track, item(sets(3, 5, 80, 0)), 'below', ex('ex.bench_press'), P, 'accumulation');
    expect(b2.track).toMatchObject({ consecutiveBelow: 0, consecutiveHolds: 3 });
    expect(b2.rotate).toBe(true);
    const p2 = updateTrack(track({ consecutiveHolds: 1 }), item([]), 'partial', ex('ex.bench_press'), P, 'accumulation');
    expect([p2.track.consecutiveHolds, p2.rotate]).toEqual([2, false]);
  });

  it('création : plage du profil pour une double progression à reps fixes ; charge de départ = dernière charge chargée ; au moins 1 série', () => {
    const at = asISODateTime('2026-10-05T18:00:00Z');
    const r = createTrack({ tier: 'anchor', archetypeId: 'str_upper', slotId: 'up.main_push_h', exercise: ex('ex.bench_press'), model: 'double_progression', prescribed: [], performed: [{ reps: 8, loadKg: 80, rir: 2 }, { reps: 8, loadKg: 82.5, rir: 2 }, { reps: 8, rir: 2 }], at, stimulus: 'strength_volume', role: 'primary' }, P);
    expect(r.track.repRange).toEqual({ min: 1, max: 10 });
    expect(r.track.cycleStartLoadKg).toBe(82.5);
    expect(r.track.nextPrescription).toMatchObject({ sets: 1, loadKg: 82.5, rir: 2 });
    const r2 = createTrack({ tier: 'anchor', archetypeId: 'str_upper', slotId: 'up.main_push_h', exercise: ex('ex.bench_press'), model: 'double_progression', prescribed: work(3, 6, 80), performed: sets(3, 6, 80, 2), at, stimulus: 'strength_volume', role: 'primary' }, P);
    expect(r2.track.repRange).toEqual({ min: 6, max: 10 });
    expect(r2.track.trackId).toBe('track.str_upper.up.main_push_h.ex.bench_press.2026-10-05');
  });

  it('clôture à la borne exacte de la durée maximale ; nouveau cycle sans effet sur une track suspendue', () => {
    const base = { now: NOW, mesocycleEnded: false, stagnant: false, inadmissible: false, level: 'intermediate' as const };
    expect(closureCause(track({ openedAt: asISODateTime(daysAgo(56)) }), base, P)).toBeUndefined();
    expect(closureCause(track({ openedAt: asISODateTime(daysAgo(57)) }), base, P)).toBe('max_weeks');
    const s = track({ status: 'suspended', cycleStartLoadKg: 60 });
    expect(startCycle(s)).toEqual({ track: s, reasons: [] });
  });
});
