/**
 * Phase 3.5 — schéma SessionArchetype : invariants, lien avec les emplacements du catalogue,
 * faisabilité par preset, restrictions, besoins de couverture CC1. Archétype de TEST uniquement.
 */
import { describe, expect, it } from 'vitest';
import { zSessionArchetype } from '@hybridsport/domain';
import type { SessionArchetypeInput } from '@hybridsport/domain';
import { archetypeIssues, evaluateCoverage, slotCandidates, toCoverageSpec } from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { testCatalogDocument } from '../fixtures/catalog.js';
import { param, testRulesetDocument } from '../fixtures/ruleset.js';

const catalog = testCatalog();
const ALL_PRESETS = ['preset.commercial_gym', 'preset.box', 'preset.hybrid_race_gym', 'preset.home_equipped', 'preset.dumbbells_only', 'preset.bodyweight'];

function arch(o: Partial<SessionArchetypeInput> = {}): SessionArchetypeInput {
  return {
    id: 'arch.test.upper', version: '0.1.0', discipline: 'strength', status: 'draft', stimulus: 'stim.strength_upper', toleranceProfile: 'strength_sets',
    levels: ['intermediate'], duration: { minS: 1800, maxS: 3600 },
    blocks: [
      { id: 'b.warmup', kind: 'warmup', role: 'support', formats: ['continuous'], minDurationS: 300, slots: [{ id: 's.mob', requirement: { movementTypes: ['mobility'] }, count: { min: 1, max: 1 } }] },
      { id: 'b.main', kind: 'strength', role: 'primary', formats: ['sets'], levers: [{ kind: 'reduce_main_volume', min: 2 }],
        slots: [{ id: 's.push', requirement: { pattern: 'push_horizontal', compound: true }, count: { min: 1, max: 1 }, minFamilies: 2, modalityPreference: 'load_ceiling' }] },
      { id: 'b.acc', kind: 'accessory', role: 'support', formats: ['sets'], levers: [{ kind: 'reduce_sets', min: 2 }, { kind: 'drop_accessory', keepAtLeast: 1 }],
        slots: [{ id: 's.pull', requirement: { region: 'upper', movementTypes: ['strength'] }, count: { min: 1, max: 2 }, modalityPreference: 'stability' }] },
    ],
    feasiblePresets: ['preset.commercial_gym', 'preset.home_equipped', 'preset.dumbbells_only'],
    declaredInfeasiblePresets: ['preset.box', 'preset.hybrid_race_gym', 'preset.bodyweight'],
    declaredInfeasibleRestrictions: [],
    ...o,
  };
}
const parsed = (o: Partial<SessionArchetypeInput> = {}) => zSessionArchetype.parse(arch(o));
const problems = (o: Partial<SessionArchetypeInput> = {}) => archetypeIssues(parsed(o), catalog).map((r) => String(r.params.problem ?? `${String(r.params.kind)}:${String(r.params.id)}`));

describe('SessionArchetype — invariants du schéma', () => {
  it('un archétype conforme est accepté et ne présente aucun problème vis-à-vis du catalogue', () => {
    expect(zSessionArchetype.safeParse(arch()).success).toBe(true);
    expect(problems()).toEqual([]);
  });

  it.each([
    ['sans bloc principal', { blocks: [arch().blocks[0]!] }],
    ['bloc principal optionnel', { blocks: [arch().blocks[0]!, { ...arch().blocks[1]!, optional: true }] }],
    ['emplacements dupliqués', { blocks: [arch().blocks[0]!, { ...arch().blocks[1]!, slots: [...arch().blocks[1]!.slots, ...arch().blocks[1]!.slots] }] }],
    ['count.min > count.max', { blocks: [arch().blocks[0]!, { ...arch().blocks[1]!, slots: [{ id: 's.x', requirement: {}, count: { min: 3, max: 1 } }] }] }],
    ['durée min > max', { duration: { minS: 3600, maxS: 1800 } }],
    ['preset faisable et infaisable à la fois', { declaredInfeasiblePresets: ['preset.commercial_gym'] }],
    ['champ inconnu (strict)', { validated: true } as Partial<SessionArchetypeInput>],
  ])('%s ⇒ refusé', (_n, o) => {
    expect(zSessionArchetype.safeParse(arch(o)).success).toBe(false);
  });
});

describe('SessionArchetype — lien avec le catalogue, faisabilité, restrictions', () => {
  it('leviers soumis aux mêmes règles que les séances (échauffement protégé, principal réduit seulement par reduce_main_volume)', () => {
    const warm = { ...arch().blocks[0]!, levers: [{ kind: 'reduce_rest' as const, floorS: 0 }] };
    const main = { ...arch().blocks[1]!, levers: [{ kind: 'reduce_sets' as const, min: 1 }] };
    expect(problems({ blocks: [warm, main, arch().blocks[2]!] })).toEqual(['b.warmup : levier interdit sur un bloc warmup', 'b.main : reduce_sets interdit sur le bloc principal']);
  });

  it('faisabilité jamais implicite : chaque preset du catalogue est déclaré faisable ou infaisable', () => {
    expect(problems({ declaredInfeasiblePresets: ['preset.box', 'preset.hybrid_race_gym'] })).toEqual(['faisabilité non déclarée pour le preset preset.bodyweight']);
  });

  it('références inconnues (pattern, preset, restriction) ⇒ TECHNICAL', () => {
    const main = { ...arch().blocks[1]!, slots: [{ id: 's.push', requirement: { pattern: 'push_diagonal' }, count: { min: 1, max: 1 } }] };
    const p = problems({ blocks: [arch().blocks[0]!, main, arch().blocks[2]!], declaredInfeasibleRestrictions: ['no_teleport'] });
    expect(p).toEqual(expect.arrayContaining(['pattern:push_diagonal', 'restriction:no_teleport']));
  });

  it('un preset déclaré faisable sans candidat pour un emplacement ⇒ problème explicite', () => {
    const acc = { ...arch().blocks[2]!, slots: [{ id: 's.leg_iso', requirement: { pattern: 'isolation_lower' }, count: { min: 1, max: 1 } }] };
    expect(problems({ blocks: [arch().blocks[0]!, arch().blocks[1]!, acc], feasiblePresets: [...arch().feasiblePresets, 'preset.bodyweight'], declaredInfeasiblePresets: ['preset.box', 'preset.hybrid_race_gym'] }))
      .toContain('emplacement s.leg_iso sans aucun candidat pour le preset déclaré faisable preset.bodyweight');
  });

  it('candidats par emplacement : triés, filtrés par matériel du preset, exigences et restrictions', () => {
    const a = parsed();
    const gym = slotCandidates(a, catalog, 'preset.commercial_gym');
    expect(gym['s.push']).toEqual(['ex.bench_press', 'ex.db_bench_press', 'ex.incline_push_up', 'ex.machine_chest_press', 'ex.push_up']);
    // L'incliné exige une box, absente du preset « haltères seuls ».
    expect(slotCandidates(a, catalog, 'preset.dumbbells_only')['s.push']).toEqual(['ex.db_bench_press', 'ex.push_up']);
    for (const id of gym['s.pull'] ?? []) expect(catalog.document.taxonomy.patterns.find((p) => p.id === catalog.exercise(id)?.patterns.primary)?.region).toBe('upper');
    const underRestriction = slotCandidates(a, catalog, 'preset.commercial_gym', ['no_overhead']);
    for (const id of underRestriction['s.pull'] ?? []) expect(catalog.exercise(id)?.contraindicationTags).not.toContain('no_overhead');
  });
});

describe('SessionArchetype — besoins de couverture CC1', () => {
  it('la projection de couverture conserve toutes les exigences ; CC1 compte les mêmes candidats que slotCandidates', () => {
    const a = parsed();
    const spec = toCoverageSpec(a);
    expect(spec.slots.find((s) => s.id === 's.push')).toEqual({ id: 's.push', pattern: 'push_horizontal', compound: true, minFamilies: 2 });
    const base = testRulesetDocument();
    const rs = testRuleset({ ...base, parameters: [...base.parameters, param('coverage.cc1.minCandidates', 4, 'G5')] });
    const cov = evaluateCoverage(testCatalog(testCatalogDocument({ archetypes: [spec] })), rs, 'local');
    const cc1 = cov.criteria.find((c) => c.id === 'CC1');
    expect(cc1?.status).toBe('FAIL');
    // Chaque manque signalé par CC1 correspond exactement au nombre de candidats de slotCandidates.
    let checked = 0;
    for (const gap of cc1?.details ?? []) {
      const m = /^arch\.test\.upper\/(\S+) @ (\S+) : (\d+) candidat/.exec(gap);
      if (m) { expect(slotCandidates(a, catalog, m[2]!)[m[1]!]).toHaveLength(Number(m[3])); checked++; }
    }
    expect(checked).toBeGreaterThan(0);
    expect(cc1?.details).toContain('arch.test.upper/s.push @ preset.dumbbells_only : 2 candidat(s) < 4');
  });

  it('un archétype infaisable pour un preset n’est pas compté dans CC1 pour ce preset', () => {
    const spec = toCoverageSpec(parsed());
    expect(spec.feasiblePresets).not.toContain('preset.bodyweight');
    expect(spec.declaredInfeasiblePresets).toContain('preset.bodyweight');
    expect([...spec.feasiblePresets, ...spec.declaredInfeasiblePresets].sort()).toEqual([...ALL_PRESETS].sort());
  });
});
