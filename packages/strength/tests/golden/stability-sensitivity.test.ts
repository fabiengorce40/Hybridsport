/**
 * Phase 4C §6 — analyse de sensibilité : la stabilité est-elle devenue un bonus quasi absolu de
 * modalité ? On fait varier UNIQUEMENT la stabilité des haltères ou des machines (toutes les autres
 * propriétés identiques) et on mesure la répartition des accessoires. Attendu : la sélection suit la
 * propriété, dans les deux sens ; aucune modalité n'est favorisée pour elle-même.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, ExerciseInput } from '@hybridsport/domain';
import { strengthCatalogDocument } from '../fixtures/catalog.js';
import { run, scenario, strengthCatalog } from '../fixtures/harness.js';
import type { LoadedCatalog } from '@hybridsport/engine';

type Mod = 'free_weight' | 'machine' | 'cable' | 'bodyweight';
const modality = (e: Exercise | undefined): Mod => (!e || !e.loadable || !e.loadModel || e.loadModel === 'bodyweight_plus' ? 'bodyweight' : e.loadModel === 'machine_stack' || e.loadModel === 'plate_loaded' ? (e.equipment.allOf.includes('cable') ? 'cable' : 'machine') : 'free_weight');
const isDumbbell = (e: ExerciseInput) => e.loadModel === 'dumbbell_pair' || e.loadModel === 'dumbbell_single' || e.loadModel === 'kettlebell';
const isMachine = (e: ExerciseInput) => (e.loadModel === 'machine_stack' || e.loadModel === 'plate_loaded') && !e.equipment.allOf.includes('cable');

function variant(f: (e: ExerciseInput) => ExerciseInput['stability'] | undefined): LoadedCatalog {
  const doc = strengthCatalogDocument();
  return strengthCatalog({ ...doc, exercises: doc.exercises.map((e) => { const s = f(e); return s === undefined ? e : { ...e, stability: s }; }) });
}

const VARIANTS: [string, LoadedCatalog][] = [
  ['V0 référence', strengthCatalog()],
  ['V1 haltères stabilité 2', variant((e) => (isDumbbell(e) ? 2 : undefined))],
  ['V2 haltères stabilité 3', variant((e) => (isDumbbell(e) ? 3 : undefined))],
  ['V3 machines stabilité 2', variant((e) => (isMachine(e) ? 2 : undefined))],
  ['V4 machines stabilité 1', variant((e) => (isMachine(e) ? 1 : undefined))],
  ['V5 inversé (haltères 3, machines 1)', variant((e) => (isDumbbell(e) ? 3 : isMachine(e) ? 1 : undefined))],
  ['V6 = V4 + coût technique des haltères à 0', (() => {
    const doc = strengthCatalogDocument();
    return strengthCatalog({ ...doc, exercises: doc.exercises.map((e) => (isMachine(e) ? { ...e, stability: 1 as const } : isDumbbell(e) ? { ...e, cost: { ...e.cost, technical: 0 as const } } : e)) });
  })()],
];

function distribution(catalog: LoadedCatalog): Record<Mod, number> {
  const out: Record<Mod, number> = { free_weight: 0, machine: 0, cable: 0, bodyweight: 0 };
  for (const level of ['beginner', 'intermediate', 'advanced'] as const) for (const [archetype, stimulus, goal] of [['str_full_body', 'strength_general', 'general'], ['str_upper', 'strength_volume', 'hypertrophy'], ['str_lower', 'strength_heavy', 'strength']] as const) for (let i = 0; i < 4; i++) {
    const o = run(scenario({ catalog, level, archetype, stimulus, seed: `sens-${String(i)}`, context: { goal: { primary: { goal } } } }));
    if (o.result.status !== 'ok') continue;
    for (const b of o.result.value.blocks) if (b.role === 'support' && b.kind === 'accessory') for (const it of b.items) out[modality(catalog.exercise(it.exerciseId))]++;
  }
  return out;
}

describe('sensibilité de la sélection des accessoires à la stabilité', () => {
  it('la répartition suit la stabilité, dans les deux sens ; aucune modalité n’est favorisée structurellement', async () => {
    const rows = VARIANTS.map(([name, c]) => ({ name, d: distribution(c) }));
    const share = (d: Record<Mod, number>, m: Mod) => d[m] / Math.max(1, Object.values(d).reduce((a, b) => a + b, 0));
    const pct = (x: number) => `${(x * 100).toFixed(0).padStart(3)} %`;
    const table = ['variante                               libres  machines  poulies  poids-corps', ...rows.map((r) => `${r.name.padEnd(38)} ${pct(share(r.d, 'free_weight'))}  ${pct(share(r.d, 'machine'))}    ${pct(share(r.d, 'cable'))}   ${pct(share(r.d, 'bodyweight'))}`)].join('\n');
    await expect(`${table}\n`).toMatchFileSnapshot('./__goldens__/stability-sensitivity.txt');
    const [v0, v1, v2, v3, v4, v5, v6] = rows.map((r) => r.d) as Record<Mod, number>[];
    if (!v0 || !v1 || !v2 || !v3 || !v4 || !v5 || !v6) throw new Error('variantes');
    // Monotonie : plus les haltères sont stables, plus ils sont choisis ; moins les machines le sont, moins elles le sont.
    expect(share(v1, 'free_weight')).toBeGreaterThanOrEqual(share(v0, 'free_weight'));
    expect(share(v2, 'free_weight')).toBeGreaterThan(share(v0, 'free_weight'));
    expect(share(v3, 'machine')).toBeLessThanOrEqual(share(v0, 'machine'));
    expect(share(v4, 'machine')).toBeLessThan(share(v0, 'machine'));
    // Symétrie : propriétés inversées ⇒ préférence inversée (les charges libres deviennent majoritaires devant les machines).
    expect(share(v5, 'free_weight')).toBeGreaterThan(share(v5, 'machine'));
    // Le reliquat machine de V4 s'explique par le coût technique (propriété) : aligné, il diminue encore.
    expect(share(v6, 'machine')).toBeLessThan(share(v4, 'machine'));
  }, 120_000);
});
