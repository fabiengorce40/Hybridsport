/**
 * A2 (C4.2) — non-régression : un exercice de mobilité RÉSERVÉ à une autre discipline (`disciplines: ['crosstraining']`),
 * ajouté au catalogue, ne change AUCUNE prescription Strength (même classé premier et couvrant les patterns de la séance).
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@hybridsport/engine';
import type { ExerciseInput } from '@hybridsport/domain';
import { strengthCatalogDocument } from '../fixtures/catalog.js';
import { run, scenario } from '../fixtures/harness.js';

const doc = strengthCatalogDocument();
const mob = doc.exercises.find((e) => e.id === 'ex.shoulder_mobility_flow') as ExerciseInput;
// Identifiant classé en tête, patterns secondaires des séances haut et bas du corps : candidat idéal sans le marqueur.
const ctOnly: ExerciseInput = { ...mob, id: 'ex.aa_ct_only_mobility', disciplines: ['crosstraining'], patterns: { primary: 'mobility', secondary: ['push_horizontal', 'squat'] } };
const loaded = loadCatalog({ ...doc, exercises: [...doc.exercises, ctOnly] });

describe('Strength — mobilité gouvernée par discipline (A2)', () => {
  it('séances identiques avec ou sans un exercice de mobilité réservé au Cross-training', () => {
    if (!loaded.ok) throw new Error('catalogue invalide');
    let withMobility = 0;
    for (const archetype of ['str_full_body', 'str_upper', 'str_lower', 'str_support']) for (const minutes of [45, 60]) {
      const base = scenario({ archetype, minutes });
      const a = run(base).result;
      const b = run({ ...base, catalog: loaded.catalog }).result;
      expect(b.status).toBe(a.status);
      if (a.status !== 'ok' || b.status !== 'ok') continue;
      expect(b.value.blocks).toEqual(a.value.blocks);
      expect(b.value.blocks.flatMap((x) => x.items.map((i) => i.exerciseId))).not.toContain('ex.aa_ct_only_mobility');
      if (a.value.blocks.some((x) => x.items.some((i) => i.prescription.type === 'mobility'))) withMobility += 1;
    }
    // Le test exerce réellement la sélection de mobilité de Strength.
    expect(withMobility).toBeGreaterThan(0);
  });
});
