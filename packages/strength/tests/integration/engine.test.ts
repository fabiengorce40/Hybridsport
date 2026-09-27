/**
 * Intégration moteur → CORE (étapes 7, 14–16, 21) : absence de proposition explicable, ancres et
 * tracks, substitutions, multisport sans replanification, génération sous contrainte de durée.
 */
import { describe, expect, it } from 'vitest';
import type { SessionDraft, SessionItem } from '@hybridsport/domain';
import { proposeStrength } from '../../src/index.js';
import type { StrengthContextInput, StrengthTrack } from '../../src/index.js';
import { engineInput, NOW, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { strengthRulesetDocument, STRENGTH_TEST_VALUES } from '../fixtures/ruleset.js';

const CATALOG = strengthCatalog();
type Outcome = ReturnType<typeof run>;
const ok = (o: Outcome): SessionDraft => { if (o.result.status !== 'ok') throw new Error(JSON.stringify(o.result.status === 'error' ? o.result.error : o.result.status)); return o.result.value; };
const items = (s: SessionDraft): SessionItem[] => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const errorCodes = (o: Outcome): string[] => (o.result.status === 'error' ? o.result.error.reasons.map((r) => r.code) : []);
const traceCodes = (o: Outcome): string[] => o.trace.entries.flatMap((e) => e.reasons.map((r) => r.code));
const anchorTrack = (o: Partial<StrengthTrack>): StrengthTrack => ({
  trackId: 'track.bench', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'linear_load', status: 'active', openedAt: NOW,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, nextPrescription: { sets: 4, reps: 5, loadKg: 90, rir: 2 }, ...o,
});
const upperWithAnchor = (o: { declared?: boolean; context?: Partial<StrengthContextInput>; excluded?: string[]; preset?: string } = {}) => scenario({
  archetype: 'str_upper', stimulus: 'strength_heavy', level: 'intermediate', preset: o.preset ?? 'preset.full_gym', profile: { excludedExercises: o.excluded ?? [] },
  intent: o.declared === false ? {} : { repetitionIntents: [{ kind: 'progression_anchor', trackId: 'track.bench' }] },
  context: { goal: { primary: { goal: 'strength' } }, tracks: [anchorTrack({})], recentExposures: [{ exerciseId: 'ex.bench_press', at: '2026-10-01T08:00:00Z', sets: [{ loadKg: 87.5, reps: 5, rir: 2 }] }], ...o.context },
});

describe('NO_VALID_PROPOSAL explicite (étape 21)', () => {
  it('archétype inconnu ou objectif non admis ⇒ NO_VALID_SOLUTION avec PLAN.ARCHETYPE_NOT_APPLICABLE (jamais une séance d’un autre archétype)', () => {
    const unknown = run(scenario({ archetype: 'str_push_pull_legs' }));
    expect(unknown.result.status === 'error' && unknown.result.error.code).toBe('NO_VALID_SOLUTION');
    expect(errorCodes(unknown)).toContain('PLAN.ARCHETYPE_NOT_APPLICABLE');
    const goal = run(scenario({ archetype: 'str_lower', stimulus: 'strength_support', context: { goal: { primary: { goal: 'support', supportFor: 'running' } } } }));
    expect(errorCodes(goal)).toContain('PLAN.ARCHETYPE_NOT_APPLICABLE');
  });

  it('emplacement requis sans candidat (tous les squats et charnières exclus, objectif force : aucun repli du principal) ⇒ besoin bloquant et « catalog_coverage »', () => {
    const blocked = CATALOG.exercises().filter((e) => ['squat', 'hinge'].includes(e.patterns.primary)).map((e) => e.id);
    const s = scenario({ archetype: 'str_lower', stimulus: 'strength_heavy', profile: { excludedExercises: blocked }, context: { goal: { primary: { goal: 'strength' } } } });
    const r = proposeStrength(engineInput(s));
    expect(r.status).toBe('no_valid_proposal');
    if (r.status === 'no_valid_proposal') {
      expect(r.reasons.map((x) => x.code)).toContain('SELECT.NO_CANDIDATE_FOR_SLOT');
      expect((r.blockingNeeds ?? []).length).toBeGreaterThanOrEqual(1);
      expect(r.missingData).toContain('catalog_coverage');
    }
    expect(errorCodes(run(s))).toEqual(expect.arrayContaining(['SELECT.NO_CANDIDATE_FOR_SLOT', 'SELECT.BLOCKING_NEED', 'DATA.MISSING_FOR_PROPOSAL']));
    // Objectif général : le principal peut se replier sur l'unilatéral (repli F4 tracé), jamais en silence.
    const general = run({ ...s, context: { ...s.context, goal: { primary: { goal: 'general' } } } });
    expect(general.result.status).toBe('ok');
    expect(traceCodes(general)).toContain('SELECT.PATTERN_FALLBACK');
  });

  it('D-S4 (régression) : contexte incompatible avec l’objet de l’archétype ⇒ PLAN.CONTEXT_INCOMPATIBLE, jamais un changement silencieux de stimulus ou d’archétype', () => {
    const interference = STRENGTH_TEST_VALUES['strength.interference'] as { perStructure: Record<string, Record<string, unknown>> };
    const strict = { ...interference, perStructure: { ...interference.perStructure, lower_knee: { ...interference.perStructure.lower_knee, excludeContributionAtLeast: 1 }, lower_hip: { ...interference.perStructure.lower_hip, excludeContributionAtLeast: 1 } } };
    const ruleset = strengthRuleset(strengthRulesetDocument({ 'strength.interference': strict }));
    const s = scenario({ ruleset, archetype: 'str_lower', stimulus: 'strength_heavy', context: { goal: { primary: { goal: 'strength' } }, week: { otherStrengthSessions: [], neighbors: [{ discipline: 'running', stimulus: 'run_long', priority: 'key', hoursFromThisSession: 12, demand: { lower_knee: 'high', lower_hip: 'high' } }], known: true } } });
    const o = run(s);
    expect(o.result.status === 'error' && o.result.error.code).toBe('NO_VALID_SOLUTION');
    expect(errorCodes(o)).toContain('PLAN.CONTEXT_INCOMPATIBLE');
    const r = proposeStrength(engineInput(s));
    expect(r.status).toBe('no_valid_proposal');
    if (r.status === 'no_valid_proposal') expect(r.missingData).toEqual([]);
    // Le même contexte avec les règles normales : séance bas du corps ALLÉGÉE, jamais une séance haut du corps.
    const normal = run({ ...s, ruleset: undefined });
    const session = ok(normal);
    expect(items(session).some((it) => ['squat', 'hinge'].includes(CATALOG.exercise(it.exerciseId)?.patterns.primary ?? ''))).toBe(true);
    expect(traceCodes(normal)).toContain('DOSE.MODIFIED');
  });

  it('durée cible sous le minimum réaliste du noyau ⇒ DURATION.TARGET_BELOW_ARCHETYPE_MIN (le noyau n’est jamais amputé)', () => {
    const o = run(scenario({ archetype: 'str_lower', stimulus: 'strength_heavy', minutes: 12, level: 'advanced', context: { goal: { primary: { goal: 'strength' } } } }));
    expect(o.result.status).toBe('error');
    expect([...errorCodes(o), ...traceCodes(o)]).toContain('DURATION.TARGET_BELOW_ARCHETYPE_MIN');
  });
});

describe('ancres et tracks (étape 7, addendum V1.1)', () => {
  it('ancre déclarée : exercice imposé, refs declared + progressionTrackId, prescription de la track appliquée telle quelle', () => {
    const s = ok(run(upperWithAnchor()));
    const bench = items(s).find((it) => it.exerciseId === 'ex.bench_press');
    expect(bench?.refs).toMatchObject({ anchor: 'declared', progressionTrackId: 'track.bench', prescriptionSource: 'track', slotId: 'up.main_push_h' });
    const work = bench?.prescription.type === 'sets' ? bench.prescription.sets.filter((x) => x.kind !== 'rampup') : [];
    expect(work).toHaveLength(4);
    expect(work.every((x) => x.reps === 5 && x.intensity?.mode === 'load' && x.intensity.kg === 90)).toBe(true);
  });

  it('track existante NON déclarée par l’intention : jamais marquée declared (le moteur ne s’accorde aucune exemption)', () => {
    const o = run(upperWithAnchor({ declared: false }));
    const s = ok(o);
    expect(items(s).every((it) => it.refs?.anchor !== 'declared')).toBe(true);
    const r = proposeStrength(engineInput(upperWithAnchor({ declared: false })));
    if (r.status === 'proposals') for (const p of r.proposals) expect(p.repetitionIntents).toEqual([]);
  });

  it('ancre temporairement impossible : substitution PONCTUELLE tracée (substitutedFrom), la track n’est ni consommée ni détruite', () => {
    const sub = upperWithAnchor({ excluded: ['ex.bench_press'] });
    const o = run(sub);
    const s = ok(o);
    const replaced = items(s).find((it) => it.refs?.substitutedFrom === 'ex.bench_press');
    expect(replaced).toBeDefined();
    expect(replaced?.refs?.anchor).not.toBe('declared');
    expect(traceCodes(o).some((c) => c === 'SELECT.SUBSTITUTION' || c === 'SELECT.SUBSTITUTION_LOW_FIDELITY')).toBe(true);
    const r = proposeStrength(engineInput(sub));
    if (r.status === 'proposals') expect(r.proposals[0]?.repetitionIntents).toEqual([]);
    // La séance suivante, matériel de retour : l'ancre est de nouveau utilisée (le moteur ne modifie jamais les tracks).
    expect(items(ok(run(upperWithAnchor()))).find((it) => it.exerciseId === 'ex.bench_press')?.refs?.anchor).toBe('declared');
  });

  it('les tracks d’un autre archétype, suspendues ou closes, ne s’appliquent pas', () => {
    for (const t of [anchorTrack({ archetypeId: 'str_full_body' }), anchorTrack({ status: 'suspended' }), anchorTrack({ status: 'closed' })]) {
      const s = ok(run(upperWithAnchor({ context: { tracks: [t] } })));
      expect(items(s).every((it) => it.refs?.anchor !== 'declared'), t.status + t.archetypeId).toBe(true);
    }
  });
});

describe('substitutions (étape 16)', () => {
  it('matériel indisponible : machine → poulie / haltères ; barre → machine ; chaque item garde ≤ 3 alternatives faisables', () => {
    const noRowMachine = ok(run(scenario({ archetype: 'str_upper', stimulus: 'strength_volume', profile: { excludedExercises: ['ex.machine_row'] }, context: { goal: { primary: { goal: 'hypertrophy' } } } })));
    expect(items(noRowMachine).map((it) => it.exerciseId)).not.toContain('ex.machine_row');
    const noBarbell = ok(run(scenario({ archetype: 'str_lower', stimulus: 'strength_heavy', profile: { availableEquipment: ['dumbbells', 'bench', 'leg_press', 'leg_curl_machine', 'hack_squat', 'leg_extension_machine', 'calf_machine', 'hip_thrust_machine', 'cable'] }, context: { goal: { primary: { goal: 'strength' } } } })));
    for (const it of items(noBarbell)) expect(CATALOG.exercise(it.exerciseId)?.equipment.allOf ?? []).not.toContain('barbell');
    for (const s of [noRowMachine, noBarbell]) for (const it of items(s)) {
      expect((it.alternatives ?? []).length).toBeLessThanOrEqual(3);
      expect(it.alternatives ?? []).not.toContain(it.exerciseId);
    }
  });

  it('restriction (contre-indication) : l’exercice concerné n’apparaît jamais, la séance reste construite', () => {
    const tags = [...new Set(CATALOG.exercises().flatMap((e) => e.contraindicationTags))].sort();
    for (const tag of tags.slice(0, 3)) {
      const o = run(scenario({ profile: { restrictions: [tag] } }));
      if (o.result.status !== 'ok') continue; // une restriction peut rendre l'archétype infaisable : issue explicite, testée ailleurs
      for (const it of items(o.result.value)) expect(CATALOG.exercise(it.exerciseId)?.contraindicationTags ?? []).not.toContain(tag);
    }
  });

  it('substitution utilisateur a posteriori : alternatives de même emplacement, faisables avec le matériel déclaré', () => {
    const s = ok(run(scenario({ preset: 'preset.home_equipped' })));
    const eq = new Set(scenario({ preset: 'preset.home_equipped' }).profile.availableEquipment);
    for (const it of items(s)) for (const alt of it.alternatives ?? []) {
      const e = CATALOG.exercise(alt);
      expect(e && CATALOG.isFeasibleWith(e, eq), alt).toBe(true);
    }
  });
});

describe('multisport : le contexte est consommé, jamais replanifié (étape 14)', () => {
  const neighbor = (hours: number, priority: 'key' | 'standard' = 'key') => ({ week: { otherStrengthSessions: [], neighbors: [{ discipline: 'running' as const, stimulus: 'run_intervals_vo2', priority, hoursFromThisSession: hours, demand: { lower_knee: 'high' as const } }], known: true } });

  it('séance clé proche ⇒ structure abaissée, dose allégée et optionnels ciblés omis ; loin ou non clé ⇒ aucun effet', () => {
    const near = run(scenario({ archetype: 'str_lower', stimulus: 'strength_general', context: { goal: { primary: { goal: 'general' } }, ...neighbor(18) } }));
    const far = run(scenario({ archetype: 'str_lower', stimulus: 'strength_general', context: { goal: { primary: { goal: 'general' } }, ...neighbor(60) } }));
    const standard = run(scenario({ archetype: 'str_lower', stimulus: 'strength_general', context: { goal: { primary: { goal: 'general' } }, ...neighbor(18, 'standard') } }));
    expect(traceCodes(near)).toContain('PLAN.STRUCTURE_LOWERED');
    expect(traceCodes(far)).not.toContain('PLAN.STRUCTURE_LOWERED');
    expect(traceCodes(standard)).not.toContain('PLAN.STRUCTURE_LOWERED');
    const vol = (o: Outcome) => items(ok(o)).reduce((a, it) => a + (it.prescription.type === 'sets' ? it.prescription.sets.filter((x) => x.kind !== 'rampup').length : 0), 0);
    expect(vol(near)).toBeLessThan(vol(far));
    // Jamais de déplacement : même intention, même archétype, même date.
    expect(ok(near).id.startsWith('intent.str_lower.strength_general')).toBe(true);
  });

  it('semaine inconnue ⇒ hypothèse prudente tracée (DATA.WEEK_CONTEXT_UNKNOWN), séance produite', () => {
    const o = run(scenario({ archetype: 'str_lower', stimulus: 'strength_general', context: { goal: { primary: { goal: 'general' } }, week: { otherStrengthSessions: [], neighbors: [], known: false } } }));
    ok(o);
    expect(traceCodes(o)).toEqual(expect.arrayContaining(['DATA.WEEK_CONTEXT_UNKNOWN', 'PLAN.STRUCTURE_LOWERED']));
  });
});

describe('durée (étape 15)', () => {
  it('le noyau d’abord, puis les optionnels tant que la cible le permet : plus de temps ⇒ jamais moins d’exercices', () => {
    let prev = 0;
    for (const minutes of [30, 40, 50, 60, 75, 90]) {
      const s = ok(run(scenario({ archetype: 'str_upper', stimulus: 'strength_volume', minutes, context: { goal: { primary: { goal: 'hypertrophy' } } } })));
      const n = items(s).length;
      expect(n, `${String(minutes)} min`).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });

  it('la séance produite tient dans le temps disponible (p90) et les emplacements requis sont toujours présents', () => {
    for (const minutes of [30, 45, 60]) {
      const o = run(scenario({ minutes }));
      const s = ok(o);
      const est = o.trace.entries.filter((e) => e.subject.id === s.id && e.step === 'duration').flatMap((e) => e.reasons).find((r) => r.code === 'DURATION.ESTIMATED');
      expect(Number(est?.params.p90S)).toBeLessThanOrEqual(minutes * 60);
      const slots = items(s).map((it) => it.refs?.slotId ?? '');
      expect(slots.some((x) => x.startsWith('fb.main_'))).toBe(true);
    }
  });
});
