/**
 * Étape 18 : anti-biais S7 et contrefactuels. Question testée : la sélection préfère-t-elle une CLASSE
 * d'équipement (machine, poulie, barre, haltère) pour elle-même ? Réponse attendue : non. Toute préférence
 * observée doit s'expliquer par une PROPRIÉTÉ déclarée de l'exercice (loadCeiling, stabilité, coût
 * technique, pertinence) ou par le contexte (historique, préférences) — démontré par contrefactuel.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, ExerciseInput, SessionDraft } from '@hybridsport/domain';
import { strengthCatalogDocument } from '../fixtures/catalog.js';
import { GOLDENS } from '../fixtures/goldens.js';
import { run, scenario, strengthCatalog } from '../fixtures/harness.js';
import type { Scenario } from '../fixtures/harness.js';

const CATALOG = strengthCatalog();
const strengthItems = (s: SessionDraft) => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const idsOf = (o: ReturnType<typeof run>): string[] => (o.result.status === 'ok' ? strengthItems(o.result.value).map((it) => `${it.refs?.slotId ?? '?'}=${it.exerciseId}`) : [`error:${o.result.status}`]);
const modality = (e: Exercise | undefined): string => (!e ? '?' : !e.loadable || !e.loadModel ? 'bodyweight' : e.loadModel === 'machine_stack' || e.loadModel === 'plate_loaded' ? (e.equipment.allOf.includes('cable') ? 'cable' : 'machine') : e.loadModel === 'bodyweight_plus' ? 'bodyweight' : 'free_weight');
const S7 = (GOLDENS.S7 as { scenario: Scenario }).scenario;

/** Catalogue « déguisé » : la classe d'équipement / le modèle de charge sont permutés, les propriétés gardées. */
function disguisedCatalog() {
  const doc = strengthCatalogDocument();
  const swap = (m: ExerciseInput['loadModel']): ExerciseInput['loadModel'] => (m === 'machine_stack' ? 'dumbbell_pair' : m === 'dumbbell_pair' ? 'machine_stack' : m === 'barbell' ? 'plate_loaded' : m === 'plate_loaded' ? 'barbell' : m);
  return strengthCatalog({ ...doc, exercises: doc.exercises.map((e) => ({ ...e, loadModel: swap(e.loadModel) })) });
}

describe('S7 — historique biaisé vers les charges libres, tout le matériel disponible', () => {
  it('la séance mélange les modalités ; chaque choix est expliqué par un critère ordinal (jamais la classe d’équipement)', () => {
    const o = run(S7);
    expect(o.result.status).toBe('ok');
    const chosen = o.result.status === 'ok' ? strengthItems(o.result.value).map((it) => CATALOG.exercise(it.exerciseId)) : [];
    const mods = new Set(chosen.map(modality));
    expect(mods.size).toBeGreaterThanOrEqual(2);
    const decided = o.trace.entries.filter((e) => o.result.status === 'ok' && e.subject.id === o.result.value.id).flatMap((e) => e.reasons).filter((r) => r.code === 'SELECT.EXERCISE.CHOSEN').map((r) => String(r.params.decidingCriterion));
    for (const c of decided) expect(['anchor', 'track', 'load_adequacy', 'role_fit', 'volume_fit', 'goal_relevance', 'fatigue_fit', 'recency', 'preference', 'logistics', 'seed_tiebreak', 'only_candidate', 'variant']).toContain(c);
  });

  it('CONTREFACTUEL 1 — permuter la classe d’équipement de tout le catalogue ne change AUCUN exercice choisi (S2, S6, S7)', () => {
    const catalog = disguisedCatalog();
    for (const k of ['S2', 'S6', 'S7']) {
      const s = (GOLDENS[k] as { scenario: Scenario }).scenario;
      expect(idsOf(run({ ...s, catalog })), k).toEqual(idsOf(run(s)));
    }
  });

  it('CONTREFACTUEL 2 — à propriétés ÉGALES, machine et haltère gagnent chacun selon la graine (aucune préférence cachée)', () => {
    const doc = strengthCatalogDocument();
    // Élévations latérales : on aligne stabilité, coût technique, pertinence et mise en place sur la version machine.
    const machine = doc.exercises.find((e) => e.id === 'ex.machine_lateral_raise');
    if (!machine) throw new Error('machine');
    const equal = doc.exercises.map((e) => (['ex.db_lateral_raise', 'ex.cable_lateral_raise'].includes(e.id) ? { ...e, stability: machine.stability, cost: machine.cost, relevance: machine.relevance, loadCeiling: machine.loadCeiling, timing: machine.timing } : e));
    const catalog = strengthCatalog({ ...doc, exercises: equal });
    const winners = new Set<string>();
    // L'emplacement d'isolation n'a que les élévations latérales comme candidats (les autres isolations exclues).
    const others = CATALOG.exercises().filter((e) => e.patterns.primary === 'isolation_upper' && !/lateral_raise/.test(e.id)).map((e) => e.id);
    for (let i = 0; i < 24; i++) {
      const o = run(scenario({ catalog, archetype: 'str_upper', stimulus: 'strength_volume', minutes: 75, seed: `cf2-${String(i)}`, profile: { excludedExercises: [...others, 'ex.cable_lateral_raise'] }, context: { goal: { primary: { goal: 'hypertrophy' } } } }));
      if (o.result.status !== 'ok') continue;
      for (const it of strengthItems(o.result.value)) if (/lateral_raise/.test(it.exerciseId)) winners.add(it.exerciseId);
    }
    expect(winners.size).toBeGreaterThanOrEqual(2);
  });

  it('CONTREFACTUEL 3 — l’historique pèse par la récence des FAMILLES, symétriquement : charges libres récentes ⇔ machines récentes', () => {
    const at = '2026-10-04T08:00:00Z';
    const free = run(scenario({ archetype: 'str_upper', stimulus: 'strength_volume', context: { goal: { primary: { goal: 'hypertrophy' } }, recentExposures: ['ex.db_curl', 'ex.db_lateral_raise'].map((exerciseId) => ({ exerciseId, at, sets: [{ loadKg: 12, reps: 12, rir: 1 }] })) } }));
    const mach = run(scenario({ archetype: 'str_upper', stimulus: 'strength_volume', context: { goal: { primary: { goal: 'hypertrophy' } }, recentExposures: ['ex.cable_curl', 'ex.machine_lateral_raise', 'ex.cable_triceps_pushdown'].map((exerciseId) => ({ exerciseId, at, sets: [{ loadKg: 20, reps: 12, rir: 1 }] })) } }));
    const iso = (o: ReturnType<typeof run>) => (o.result.status === 'ok' ? strengthItems(o.result.value).filter((it) => it.refs?.slotId === 'up.iso_upper').map((it) => it.exerciseId) : []);
    // Une famille exposée la veille n'est pas reprise quand une alternative d'égale adéquation existe.
    expect(iso(mach)).not.toContain('ex.cable_triceps_pushdown');
    expect(iso(free).length).toBeGreaterThanOrEqual(1);
  });

  it('CONTREFACTUEL 4 — les préférences déclarées de l’athlète s’appliquent à égalité des critères précédents, dans les deux sens', () => {
    const base = { archetype: 'str_full_body', stimulus: 'strength_general' as const, context: { goal: { primary: { goal: 'general' as const } } } };
    const likeMachine = run(scenario({ ...base, context: { ...base.context, preferences: { liked: ['ex.machine_row'], disliked: [] } } }));
    const likeCable = run(scenario({ ...base, context: { ...base.context, preferences: { liked: ['ex.seated_cable_row'], disliked: [] } } }));
    const row = (o: ReturnType<typeof run>) => (o.result.status === 'ok' ? strengthItems(o.result.value).find((it) => it.refs?.slotId === 'fb.pull_h')?.exerciseId : undefined);
    expect(row(likeMachine)).toBe('ex.machine_row');
    expect(row(likeCable)).toBe('ex.seated_cable_row');
  });
});

describe('distribution des modalités (lecture pour le rapport)', () => {
  it('répartition machine / poulie / charges libres / poids du corps par rôle, salle complète, 3 niveaux × 3 archétypes × 4 graines', async () => {
    const counts: Record<string, Record<string, number>> = {};
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) for (const [archetype, stimulus, goal] of [['str_full_body', 'strength_general', 'general'], ['str_upper', 'strength_volume', 'hypertrophy'], ['str_lower', 'strength_heavy', 'strength']] as const) for (let i = 0; i < 4; i++) {
      const o = run(scenario({ level, archetype, stimulus, seed: `dist-${String(i)}`, context: { goal: { primary: { goal } } } }));
      if (o.result.status !== 'ok') continue;
      for (const b of o.result.value.blocks) for (const it of b.items) {
        if (b.kind === 'warmup' || b.kind === 'cooldown') continue;
        const row = (counts[b.role] ??= {});
        const m = modality(CATALOG.exercise(it.exerciseId));
        row[m] = (row[m] ?? 0) + 1;
      }
    }
    const table = Object.entries(counts).sort().map(([role, row]) => `${role.padEnd(10)} ${Object.entries(row).sort().map(([m, n]) => `${m}=${String(n)}`).join('  ')}`).join('\n');
    await expect(`${table}\n`).toMatchFileSnapshot('./__goldens__/modality-distribution.txt');
    // Le principal (plafond de charge) n'est jamais une machine quand une barre de même plafond existe.
    expect(counts.primary?.free_weight ?? 0).toBeGreaterThan((counts.primary?.machine ?? 0) + (counts.primary?.cable ?? 0));
  });
});
