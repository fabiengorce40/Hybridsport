/**
 * Durcissement ciblé (mutation 4F, §L) : bornes et branches des modules 4E/4F dont une mutation peut changer
 * une prescription réelle (PrescriptionConfidence, InterferenceAssessment, continuité, préservation du stimulus).
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime } from '@hybridsport/domain';
import type { Exercise } from '@hybridsport/domain';
import {
  assessDeclared, assessMeasured, assessNeighborStructure, assessTransferred, continuityMode, criterionValue, loweredStructures, readStrengthParams, recencyOf,
} from '../../src/index.js';
import type { Env, MeasuredObservation, SlotInstance, StrengthContextInput, StrengthTrack } from '../../src/index.js';
import { engineInput, envFor, NOW, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { GOLDENS } from '../fixtures/goldens.js';
import { goldenOutcome } from '../fixtures/golden-record.js';
import { LOCK_RULESET, lockScenario } from '../fixtures/science.js';
import { STRENGTH_SCIENCE_LOCK_VALUES, strengthLockRulesetDocument } from '../fixtures/ruleset.js';

const CATALOG = strengthCatalog();
const P = readStrengthParams(LOCK_RULESET).values;
const RULES = P['strength.prescriptionConfidence'];
const A = P['strength.interference.assessment'];
if (!RULES || !A) throw new Error('ruleset 4F');
const W = P['strength.load'].referenceWindowsDays;
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const daysAgo = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString().replace('.000Z', 'Z');
const obs = (value: number, d: number, withRir = true): MeasuredObservation => ({ value, at: daysAgo(d), withRir });
const measured = (o: readonly MeasuredObservation[], level: 'advanced' | 'beginner' = 'advanced', conflict = false) => assessMeasured(o, { now: NOW, level, conflict }, P, RULES);

describe('PrescriptionConfidence : bornes exactes', () => {
  it('récence : bornes incluses (fraîche ≤ high, vieillissante ≤ medium, ancienne ≤ low)', () => {
    expect(recencyOf(daysAgo(W.high), NOW, P)).toBe('fresh');
    expect(recencyOf(daysAgo(W.high + 1), NOW, P)).toBe('aging');
    expect(recencyOf(daysAgo(W.medium), NOW, P)).toBe('aging');
    expect(recencyOf(daysAgo(W.medium + 1), NOW, P)).toBe('old');
    expect(recencyOf(daysAgo(W.low), NOW, P)).toBe('old');
    expect(recencyOf(daysAgo(W.low + 1), NOW, P)).toBe('expired');
  });

  it('observations utilisables : fenêtre « medium » incluse ; sinon toutes les observations servent (jamais zéro)', () => {
    const a = measured([obs(100, 2), obs(100, 2), obs(101, 5), obs(100, W.medium), obs(150, W.medium + 1)]);
    expect(a.factors.observations).toBe(4);
    expect(a.factors.consistency).toBe('consistent');
    const old = measured([obs(100, 200), obs(101, 200), obs(100, 203), obs(100, 203)]);
    expect(old.factors.observations).toBe(4);
    expect(old.factors.sessions).toBe(2);
    expect(old.level).toBe('low');
  });

  it('la récence vient de l’observation la PLUS récente, quel que soit l’ordre fourni', () => {
    expect(measured([obs(100, 90), obs(100, 3), obs(101, 90), obs(100, 3)]).factors.recency).toBe('fresh');
    expect(measured([obs(100, 3), obs(100, 90), obs(101, 3), obs(100, 90)]).factors.recency).toBe('fresh');
  });

  it('cohérence : dispersion égale à la tolérance = cohérente ; au-delà = incohérente', () => {
    const tol = P['strength.load'].conflictTolerance;
    // médiane 100 (4 valeurs : 100, 100, 100, 100 + 100 × tol) ; dispersion = tol exactement.
    expect(measured([obs(100, 2), obs(100, 2), obs(100, 5), obs(100 + 100 * tol, 5)]).factors.consistency).toBe('consistent');
    expect(measured([obs(100, 2), obs(100, 2), obs(100, 5), obs(100 + 100 * tol + 1, 5)]).factors.consistency).toBe('inconsistent');
  });

  it('capacité déclarée : vieillissante −1, ancienne −2, plafond, conflit −1 ; transfert : pénalité soustraite', () => {
    const d = (base: 'high' | 'medium', days: number, conflict = false) => assessDeclared(base, daysAgo(days), { now: NOW, conflict }, P, RULES).level;
    expect(d('high', 5)).toBe('medium');
    expect(d('high', W.high + 1)).toBe('medium');
    expect(d('medium', W.high + 1)).toBe('low');
    expect(d('high', W.medium + 1)).toBe('low');
    expect(d('medium', W.medium + 1)).toBe('none');
    expect(d('medium', 5, true)).toBe('low');
    expect(d('high', W.low + 1)).toBe('none');
    const medium = measured([obs(100, 2), obs(100, 5)]);
    expect(assessTransferred(medium, 1).level).toBe('low');
    expect(assessTransferred(medium, 0).level).toBe('medium');
  });
});

describe('InterferenceAssessment : bornes et priorités', () => {
  const n = (hours: number, demand: Record<string, 'none' | 'low' | 'moderate' | 'high'>, priority: 'key' | 'standard' | 'optional' = 'key', stimulus = 's') => ({ discipline: 'running' as const, stimulus, priority, hoursFromThisSession: hours, demand });
  const inter = (neighbors: ReturnType<typeof n>[], notes: string[] = [], ruleset = LOCK_RULESET) =>
    loweredStructures(engineInput(scenario({ ruleset, intent: { plannerNotes: notes }, context: { week: { otherStrengthSessions: [], neighbors, known: true } } })), readStrengthParams(ruleset).values);

  it('bornes de bin incluses (12 h = bin ≤ 12 h) ; demande nulle = NONE', () => {
    const first = A.proximityBands[0];
    if (!first) throw new Error('bin');
    expect(assessNeighborStructure(n(first.maxHours, { lower_knee: 'moderate' }), 'lower_knee', A)).toBe('HIGH');
    expect(assessNeighborStructure(n(first.maxHours + 1, { lower_knee: 'moderate' }), 'lower_knee', A)).toBe('MODERATE');
    expect(assessNeighborStructure(n(1, { lower_knee: 'none' }), 'lower_knee', A)).toBe('NONE');
  });

  it('fenêtre de recherche incluse ; au-delà, voisine ignorée ; demande « none » jamais évaluée', () => {
    expect(inter([n(A.searchWindowHours, { lower_knee: 'high' })]).assessments.length).toBe(1);
    expect(inter([n(A.searchWindowHours + 1, { lower_knee: 'high' })]).assessments.length).toBe(0);
    expect(inter([n(-A.searchWindowHours, { lower_knee: 'high' })]).assessments.length).toBe(1);
    expect(inter([n(10, { lower_knee: 'none', grip: 'high' })]).assessments.map((x) => x.structure)).toEqual(['grip']);
    expect(inter([n(10, { unknown_structure: 'high' })]).assessments).toEqual([]);
  });

  it('le niveau retenu par structure est le plus élevé (ordre des voisines sans effet)', () => {
    const low = n(40, { lower_knee: 'high' }, 'standard', 'a');
    const high = n(10, { lower_knee: 'high' }, 'key', 'b');
    for (const list of [[low, high], [high, low]]) {
      const r = inter(list);
      expect(r.lowered.get('lower_knee')).toBe('neighbor:running:b');
      expect(r.rirOnly.has('lower_knee')).toBe(false);
    }
    // Égalité de niveau : la première voisine (tri par heure) est retenue.
    const r = inter([n(20, { lower_knee: 'high' }, 'key', 'z'), n(22, { lower_knee: 'high' }, 'key', 'y')]);
    expect(r.lowered.get('lower_knee')).toBe('neighbor:running:z');
  });

  it('MODERATE ⇒ RIR seulement, sauf si une note abaisse déjà la structure ; LOW ⇒ trace seulement', () => {
    const m = inter([n(30, { lower_knee: 'high' })]);
    expect(m.rirOnly.get('lower_knee')).toBe('neighbor:running:s');
    expect(m.lowered.has('lower_knee')).toBe(false);
    const noted = inter([n(30, { lower_knee: 'high' })], ['avoid_high_lower_body']);
    expect(noted.lowered.get('lower_knee')).toBe('note:avoid_high_lower_body');
    expect(noted.rirOnly.has('lower_knee')).toBe(false);
    const low = inter([n(60, { lower_knee: 'high' })]);
    expect(low.lowered.size + low.rirOnly.size).toBe(0);
    expect(low.reasons.filter((x) => x.code === 'PLAN.INTERFERENCE_BASIS').map((x) => x.params.action)).toEqual(['trace']);
  });

  it('base de preuve : tracée pour chaque action ≠ none, jamais sans l’option, valeurs du registre', () => {
    const r = inter([n(10, { lower_knee: 'high', grip: 'low' }, 'optional')]);
    const basis = r.reasons.filter((x) => x.code === 'PLAN.INTERFERENCE_BASIS');
    expect(basis.map((x) => [x.params.structure, x.params.mechanism, x.params.magnitude])).toEqual([['lower_knee', 'CONTEXT_DEPENDENT', 'PROGRAMMING_HEURISTIC']]);
    const off = strengthRuleset(strengthLockRulesetDocument({}, { 'strength.interference.assessment': { ...A, traceEvidenceBasis: false } }));
    expect(inter([n(10, { lower_knee: 'high' })], [], off).reasons.some((x) => x.code === 'PLAN.INTERFERENCE_BASIS')).toBe(false);
  });

  it('règle binaire 0.2.0 : fenêtre de 36 h incluse', () => {
    const base = strengthRuleset();
    const w = readStrengthParams(base).values['strength.interference'].neighborWindowHours;
    expect(inter([n(w, { lower_knee: 'high' })], [], base).lowered.has('lower_knee')).toBe(true);
    expect(inter([n(w + 1, { lower_knee: 'high' })], [], base).lowered.has('lower_knee')).toBe(false);
  });
});

describe('continuité : raisons de rotation exactes', () => {
  const b = (o: Partial<StrengthContextInput> = {}, notes: string[] = [], ruleset = LOCK_RULESET, level: 'beginner' | 'novice' = 'beginner') =>
    envFor(scenario({ level, ruleset, intent: { plannerNotes: notes }, context: { phase: { kind: 'accumulation', weekInMesocycle: 2, mesocycleLength: 4 }, ...o } }));
  const track = (o: Partial<StrengthTrack>): StrengthTrack => ({ trackId: 't', tier: 'tracked', exerciseId: 'ex.goblet_squat', archetypeId: 'str_full_body', slotId: 'fb.main_knee', model: 'double_progression', status: 'active', openedAt: asISODateTime(daysAgo(20)), consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: P['strength.progression'].stagnationHolds, ...o });
  const g = ex('ex.goblet_squat');

  it('stagnation : seulement la track de CET exercice, active, au seuil', () => {
    expect(continuityMode(g, b({ tracks: [track({})] }))).toBe('avoid');
    expect(continuityMode(g, b({ tracks: [track({ exerciseId: 'ex.back_squat' })] }))).toBe('repeat');
    expect(continuityMode(g, b({ tracks: [track({ status: 'suspended' })] }))).toBe('repeat');
    expect(continuityMode(g, b({ tracks: [track({ consecutiveHolds: P['strength.progression'].stagnationHolds - 1 })] }))).toBe('repeat');
  });

  it('notes du planificateur : une seule note de la liste suffit ; novice ignore le début de cycle', () => {
    const policy = { ...(STRENGTH_SCIENCE_LOCK_VALUES['strength.selection.repetitionPolicy'] as Record<string, unknown>), rotationReasons: { disliked: true, stagnation: true, cycleStartForPreferred: true, plannerNotes: ['planned_variation', 'coach_rotation'] } };
    const rs = strengthRuleset(strengthLockRulesetDocument({}, { 'strength.selection.repetitionPolicy': policy }));
    expect(continuityMode(g, b({}, ['coach_rotation'], rs))).toBe('rotate');
    expect(continuityMode(g, b({}, [], rs))).toBe('repeat');
    const novice = envFor(scenario({ level: 'novice', ruleset: LOCK_RULESET, context: { phase: { kind: 'accumulation', weekInMesocycle: 1, mesocycleLength: 4 } } }));
    expect(continuityMode(g, novice)).toBe('repeat');
    // Raisons désactivées : aucune exception.
    const none = strengthRuleset(strengthLockRulesetDocument({}, { 'strength.selection.repetitionPolicy': { ...policy, rotationReasons: { disliked: false, stagnation: false, cycleStartForPreferred: false, plannerNotes: [] } } }));
    expect(continuityMode(g, b({ preferences: { liked: [], disliked: ['ex.goblet_squat'] }, tracks: [track({})] }, ['planned_variation'], none))).toBe('repeat');
  });

  it('valeur de récence : « avoid » passe derrière un exercice jamais pratiqué ; « repeat » préfère le plus récent', () => {
    const env: Env = b({ preferences: { liked: [], disliked: ['ex.goblet_squat'] }, recentExposures: [{ exerciseId: 'ex.goblet_squat', at: daysAgo(1), sets: [{ reps: 8 }] }, { exerciseId: 'ex.leg_press', at: daysAgo(1), sets: [{ reps: 8 }] }] });
    const def = env.archetype.slots.find((s) => s.id === 'fb.main_knee');
    if (!def) throw new Error('slot');
    const slot: SlotInstance = { def, requirement: env.params['strength.needs'][def.need]?.requirement ?? {} };
    const v = (id: string) => criterionValue('recency', ex(id), slot, env, { chosen: [] })[0] ?? 0;
    const used = new Set([ex('ex.goblet_squat').family, ex('ex.leg_press').family]);
    const never = CATALOG.exercises().find((e) => e.patterns.primary === 'squat' && !used.has(e.family));
    if (!never) throw new Error('squat');
    expect(v('ex.goblet_squat')).toBeLessThan(v(never.id));
    expect(v('ex.leg_press')).toBeGreaterThan(v(never.id));
  });
});

describe('préservation du stimulus : conditions d’échange', () => {
  const S2 = GOLDENS.S2?.scenario;
  if (!S2) throw new Error('S2');

  it('sans la politique (4E), aucun échange ; avec, un seul échange tracé et cohérent', () => {
    const without = strengthRuleset(strengthLockRulesetDocument({}, { 'strength.session.stimulusPreservation': null }));
    expect(goldenOutcome({ ...S2, ruleset: without }).reasons.some((r) => r.code === 'SELECT.STIMULUS_PRESERVED')).toBe(false);
    const o = goldenOutcome(lockScenario(S2));
    const kept = o.reasons.filter((r) => r.code === 'SELECT.STIMULUS_PRESERVED');
    expect(kept).toHaveLength(1);
    expect(kept[0]?.params).toMatchObject({ sets: 3, otherSets: 2 });
    expect(o.reasons.filter((r) => r.code === 'SELECT.SLOT_OMITTED' && r.params.cause === 'duration').map((r) => r.params.slot)).not.toContain('up.iso_upper');
  });

  it('pas d’échange si l’optionnel omis n’apporte pas la majorité de la dose de son groupe (les autres exercices couvrent déjà la cible)', () => {
    // Pectoraux déjà très travaillés par un exercice principal : le pec deck n'apporterait pas la majorité.
    const heavyChest = { ...S2, intent: { ...S2.intent, archetypeId: 'str_upper', stimulus: 'strength_volume' }, profile: { ...S2.profile, excludedExercises: ['ex.barbell_ohp', 'ex.db_shoulder_press', 'ex.machine_shoulder_press'] } };
    const o = run(lockScenario(heavyChest));
    const reasons = o.trace.entries.flatMap((e) => e.reasons);
    for (const r of reasons.filter((x) => x.code === 'SELECT.STIMULUS_PRESERVED')) expect(Number(r.params.sets)).toBeGreaterThanOrEqual(Number(r.params.otherSets));
  });
});
