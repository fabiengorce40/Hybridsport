/**
 * Étapes 4–6 : archétypes (structures du ruleset), besoins d'emplacement, filtres éliminatoires,
 * classement lexicographique déterministe, et invariant anti-biais (aucun bonus de classe d'équipement).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Exercise } from '@hybridsport/domain';
import { archetypeIssues } from '@hybridsport/engine';
import { decidingCriterion, firstFailingFilter, rankCandidates, resolveSlots, slotCandidatesFor, strengthArchetypeIssues, toSessionArchetype } from '../../src/index.js';
import type { SlotInstance } from '../../src/index.js';
import { envFor, run, scenario, strengthCatalog } from '../fixtures/harness.js';
import { TEST_ARCHETYPES } from '../fixtures/ruleset.js';

const CATALOG = strengthCatalog();
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const STIMULI = ['strength_heavy', 'strength_volume', 'strength_general', 'strength_support'];
const NEEDS = ['knee_dominant', 'hip_dominant', 'single_leg', 'push_horizontal', 'push_vertical', 'pull_horizontal', 'pull_vertical', 'trunk', 'carry', 'isolation_upper', 'isolation_lower'];
const slotIn = (env: ReturnType<typeof envFor>, id: string): SlotInstance => {
  const def = env.archetype.slots.find((s) => s.id === id);
  if (!def) throw new Error(id);
  return { def, requirement: env.params['strength.needs'][def.need]?.requirement ?? {} };
};
const NONE = { chosen: [] };

describe('archétypes (étape 4)', () => {
  const env = envFor(scenario());

  it('les 4 archétypes V1 seulement, chacun valide pour le CORE (leviers, couverture du catalogue, préréglages)', () => {
    expect(TEST_ARCHETYPES.map((a) => a.id).sort()).toEqual(['str_full_body', 'str_lower', 'str_support', 'str_upper']);
    for (const a of env.params['strength.archetypes']) {
      const r = strengthArchetypeIssues(a, env.params, CATALOG);
      expect(r.core, a.id).toEqual([]);
      expect(r.uncoveredGroups, a.id).toEqual([]);
    }
    // Le contrôle CC1 du CORE, emplacement par emplacement, signale bien le membre non couvert (fb.pull_v sans barre).
    const fb = env.params['strength.archetypes'].find((a) => a.id === 'str_full_body');
    expect(fb && archetypeIssues(toSessionArchetype(fb, env.params), CATALOG).map((r) => String(r.params.problem)).join()).toMatch(/fb\.pull_v.*preset\.dumbbells_only/);
  });

  it('les 11 besoins d’emplacement sont définis par le ruleset et utilisés par au moins un archétype', () => {
    expect(Object.keys(env.params['strength.needs']).sort()).toEqual([...NEEDS].sort());
    const used = new Set(env.params['strength.archetypes'].flatMap((a) => a.slots.map((s) => s.need)));
    for (const n of NEEDS) expect(used.has(n), n).toBe(true);
  });

  it('PROPRIÉTÉ : les emplacements REQUIS ne dépendent jamais du stimulus (archétype, objectif, historique fixés)', () => {
    fc.assert(fc.property(
      fc.constantFrom(...env.params['strength.archetypes']),
      fc.constantFrom('strength', 'hypertrophy', 'general', 'support:running', 'support:hybrid_race'),
      fc.dictionary(fc.constantFrom(...NEEDS), fc.nat({ max: 5 })),
      fc.constantFrom(...STIMULI), fc.constantFrom(...STIMULI),
      (a, goal, exposure, s1, s2) => {
        const r = (s: string) => resolveSlots(a, env.params, goal, s, (n) => exposure[n] ?? 0).required.map((x) => x.def.id);
        expect(r(s1)).toEqual(r(s2));
      },
    ), { numRuns: 300, seed: 4242 });
  });

  it('groupe de choix : besoin le moins exposé récemment, puis besoin non encore couvert dans la séance', () => {
    const lower = env.params['strength.archetypes'].find((a) => a.id === 'str_lower');
    if (!lower) throw new Error('str_lower');
    const squatRecent = resolveSlots(lower, env.params, 'strength', 'strength_heavy', (n) => (n === 'knee_dominant' ? 2 : 0)).required.map((s) => s.def.id);
    expect(squatRecent).toContain('lo.main_hip');
    // Le secondaire n'est pas une seconde charnière quand le principal en est une.
    expect(squatRecent).toContain('lo.sec_knee');
    const fresh = resolveSlots(lower, env.params, 'strength', 'strength_heavy', () => 0).required.map((s) => s.def.id);
    expect(fresh).toEqual(['lo.main_knee', 'lo.sec_hip']);
  });

  it('groupe de choix : le membre portant une ANCRE déclarée est prioritaire sur l’alternance', () => {
    const lower = env.params['strength.archetypes'].find((a) => a.id === 'str_lower');
    if (!lower) throw new Error('str_lower');
    const r = resolveSlots(lower, env.params, 'strength', 'strength_heavy', (n) => (n === 'knee_dominant' ? 5 : 0), (id) => id === 'lo.main_knee').required.map((s) => s.def.id);
    expect(r).toContain('lo.main_knee');
  });

  it('objectif soutien course : un membre hors priorités de l’objectif n’est jamais retenu (pas de principal genou)', () => {
    const sup = env.params['strength.archetypes'].find((a) => a.id === 'str_support');
    if (!sup) throw new Error('str_support');
    for (const k of [0, 1, 2]) {
      const r = resolveSlots(sup, env.params, 'support:running', 'strength_support', (n) => (n === 'hip_dominant' ? k : 0)).required.map((s) => s.def.id);
      expect(r).not.toContain('sp.main_knee');
    }
  });

  it('le stimulus ordonne les optionnels ; un optionnel qui répète un besoin requis passe en dernier', () => {
    const up = env.params['strength.archetypes'].find((a) => a.id === 'str_upper');
    if (!up) throw new Error('str_upper');
    const vol = resolveSlots(up, env.params, 'hypertrophy', 'strength_volume', () => 0);
    const heavy = resolveSlots(up, env.params, 'hypertrophy', 'strength_heavy', () => 0);
    expect(vol.required).toEqual(heavy.required);
    const requiredNeeds = new Set(vol.required.map((s) => s.def.need));
    const firstRepeat = vol.optional.findIndex((s) => requiredNeeds.has(s.def.need));
    if (firstRepeat >= 0) expect(vol.optional.slice(firstRepeat).every((s) => requiredNeeds.has(s.def.need))).toBe(true);
  });
});

describe('filtres éliminatoires (étape 5)', () => {
  it('matériel (F3), exclusion utilisateur (F6), restriction (F4), compétence (F7) et discipline (F8)', () => {
    const dumbbells = envFor(scenario({ preset: 'preset.dumbbells_only' }));
    const knee = slotIn(dumbbells, 'fb.main_knee');
    expect(firstFailingFilter(ex('ex.back_squat'), knee, dumbbells, { technicalCount: 0 })).toBe('F3_equipment');
    expect(firstFailingFilter(ex('ex.goblet_squat'), knee, dumbbells, { technicalCount: 0 })).toBeUndefined();
    const excluded = envFor(scenario({ profile: { excludedExercises: ['ex.back_squat'] } }));
    expect(firstFailingFilter(ex('ex.back_squat'), slotIn(excluded, 'fb.main_knee'), excluded, { technicalCount: 0 })).toBe('F6_user_exclusion');
    const gym = envFor(scenario());
    expect(firstFailingFilter(ex('ex.bench_press'), slotIn(gym, 'fb.main_knee'), gym, { technicalCount: 0 })).toBe('F2_slot');
    expect(firstFailingFilter(ex('ex.wall_ball'), slotIn(gym, 'fb.main_knee'), gym, { technicalCount: 0 })).toBe('F8_discipline');
  });

  it('novice / débutant : au plus un exercice technique, et seulement en principal (F7b, G1)', () => {
    const b = envFor(scenario({ level: 'beginner' }));
    expect(firstFailingFilter(ex('ex.back_squat'), slotIn(b, 'fb.main_knee'), b, { technicalCount: 0 })).toBeUndefined();
    expect(firstFailingFilter(ex('ex.back_squat'), slotIn(b, 'fb.main_knee'), b, { technicalCount: 1 })).toBe('F7b_novice_technical');
    expect(firstFailingFilter(ex('ex.barbell_ohp'), slotIn(b, 'fb.push_v'), b, { technicalCount: 0 })).toBe('F7b_novice_technical');
    const i = envFor(scenario({ level: 'intermediate' }));
    expect(firstFailingFilter(ex('ex.barbell_ohp'), slotIn(i, 'fb.push_v'), i, { technicalCount: 3 })).toBeUndefined();
  });

  it('contexte (F9) : grip abaissé par une séance clé voisine ⇒ exercices à forte sollicitation du grip exclus', () => {
    const env = envFor(scenario({ archetype: 'str_support', stimulus: 'strength_support', context: { goal: { primary: { goal: 'support', supportFor: 'hybrid_race' } }, week: { otherStrengthSessions: [], neighbors: [{ discipline: 'hybrid_race', stimulus: 'hr', priority: 'key', hoursFromThisSession: 12, demand: { grip: 'high' } }], known: true } } }));
    expect(env.lowered.has('grip')).toBe(true);
    const carry = slotIn(env, 'sp.carry');
    expect(firstFailingFilter(ex('ex.farmers_carry'), carry, env, { technicalCount: 0 })).toBe('F9_context');
  });

  it('les rejets sont comptés par filtre ; le résultat ne dépend pas de l’ordre du catalogue', () => {
    const env = envFor(scenario({ preset: 'preset.dumbbells_only' }));
    const r = slotCandidatesFor(slotIn(env, 'fb.main_knee'), env, { technicalCount: 0 });
    expect(r.candidates.map((e) => e.id)).toContain('ex.goblet_squat');
    expect(r.rejected.F3_equipment).toBeGreaterThanOrEqual(1);
    expect(r.candidates.map((e) => e.id)).toEqual([...r.candidates.map((e) => e.id)].sort());
  });
});

describe('classement lexicographique (étape 6)', () => {
  it('déterministe : même entrée ⇒ même ordre ; ordre d’entrée des candidats sans effet', () => {
    const env = envFor(scenario());
    const slot = slotIn(env, 'fb.push_h');
    const cands = slotCandidatesFor(slot, env, { technicalCount: 0 }).candidates;
    const a = rankCandidates(cands, slot, env, NONE).map((r) => r.exercise.id);
    const b = rankCandidates([...cands].reverse(), slot, envFor(scenario()), NONE).map((r) => r.exercise.id);
    expect(b).toEqual(a);
  });

  it('égalité parfaite en tête : départage par la GRAINE (jamais l’ordre du catalogue), tracé seed_tiebreak', () => {
    const winners = new Set<string>();
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const env = envFor(scenario({ seed }));
      const slot = slotIn(env, 'fb.pull_h');
      const ranked = rankCandidates(slotCandidatesFor(slot, env, { technicalCount: 0 }).candidates, slot, env, NONE);
      if (decidingCriterion(ranked, slot, env) === 'seed_tiebreak') winners.add(ranked[0]?.exercise.id ?? '');
    }
    expect(winners.size).toBeGreaterThanOrEqual(2);
  });

  it('load_adequacy : pour un avancé, un exercice plafonné au poids du corps ne passe jamais devant une option chargeable', () => {
    const env = envFor(scenario({ level: 'advanced', archetype: 'str_lower', stimulus: 'strength_heavy', context: { goal: { primary: { goal: 'strength' } } } }));
    const slot = slotIn(env, 'lo.single_leg');
    const ranked = rankCandidates(slotCandidatesFor(slot, env, { technicalCount: 0 }).candidates, slot, env, NONE);
    expect(ranked[0]?.exercise.loadCeiling).toBeGreaterThanOrEqual(1);
    // Sans alternative chargeable (poids du corps seul), l'exercice plafonné reste choisi : critère ordinal, pas un filtre.
    const bw = envFor(scenario({ level: 'advanced', preset: 'preset.home_equipped', archetype: 'str_lower', stimulus: 'strength_heavy', context: { goal: { primary: { goal: 'strength' } } }, profile: { excludedExercises: ['ex.bulgarian_split_squat', 'ex.walking_lunge_db', 'ex.sandbag_lunge'] } }));
    const s2 = slotIn(bw, 'lo.single_leg');
    expect(rankCandidates(slotCandidatesFor(s2, bw, { technicalCount: 0 }).candidates, s2, bw, NONE)[0]?.exercise.id).toBe('ex.reverse_lunge_bw');
  });

  it('préférences : un exercice aimé gagne à égalité des critères précédents ; jamais au-dessus d’une ancre', () => {
    const base = envFor(scenario());
    const slot = slotIn(base, 'fb.pull_h');
    const cands = slotCandidatesFor(slot, base, { technicalCount: 0 }).candidates;
    for (const liked of ['ex.machine_row', 'ex.seated_cable_row']) {
      const env = envFor(scenario({ context: { preferences: { liked: [liked], disliked: [] } } }));
      expect(rankCandidates(cands, slot, env, NONE)[0]?.exercise.id).toBe(liked);
    }
  });

  it('ANTI-BIAIS (métamorphique) : changer la classe d’équipement / le modèle de charge des candidats ne change pas le classement', () => {
    const env = envFor(scenario());
    for (const id of ['fb.push_h', 'fb.pull_h', 'fb.pull_v', 'fb.iso_upper', 'fb.iso_lower', 'fb.main_knee']) {
      const slot = slotIn(env, id);
      const cands = slotCandidatesFor(slot, env, { technicalCount: 0 }).candidates;
      const disguised = cands.map((e) => ({ ...e, loadModel: e.loadModel === 'machine_stack' ? 'barbell' as const : e.loadModel === 'barbell' ? 'machine_stack' as const : e.loadModel }));
      expect(rankCandidates(disguised, slot, env, NONE).map((r) => r.exercise.id), id).toEqual(rankCandidates(cands, slot, env, NONE).map((r) => r.exercise.id));
    }
  });
});

describe('groupe de choix et faisabilité (régression)', () => {
  it('haltères seuls + tirage horizontal récent : le groupe « tirage » choisit un membre FAISABLE (pas de tirage vertical sans barre)', () => {
    const s = scenario({ preset: 'preset.dumbbells_only', level: 'beginner', context: { goal: { primary: { goal: 'general' } }, recentExposures: [{ exerciseId: 'ex.db_row', at: '2026-10-03T08:00:00Z', sets: [{ loadKg: 20, reps: 10, rir: 2 }] }, { exerciseId: 'ex.db_row', at: '2026-10-01T08:00:00Z', sets: [{ loadKg: 20, reps: 10, rir: 2 }] }] } });
    const o = run(s);
    expect(o.result.status).toBe('ok');
    // Le membre faisable (tirage horizontal) est choisi DIRECTEMENT, sans repli sur un besoin voisin mal étiqueté.
    const slots = o.result.status === 'ok' ? o.result.value.blocks.flatMap((b) => b.items.map((i) => i.refs?.slotId)) : [];
    expect(slots).toContain('fb.pull_h');
    expect(slots).not.toContain('fb.pull_v');
  });
});
