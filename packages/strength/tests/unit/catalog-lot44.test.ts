/**
 * Reprise RC5 lot 4.4 (chantier B) — catalogue versionné : seules deux incohérences factuelles corrigées, par ajout d'un
 * muscle SECONDAIRE ; aucun autre champ (schémas, familles, classes, substitutions, matériel, coûts) ne change ; le
 * catalogue F6 reste inchangé et relisible.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@hybridsport/engine';
import { F6_CATALOG_VERSION, strengthF6CatalogDocument } from '../fixtures/f6.js';
import { LOT44_CATALOG_VERSION, strengthLot44CatalogDocument } from '../fixtures/catalog-lot44.js';

const f6 = strengthF6CatalogDocument();
const l44 = strengthLot44CatalogDocument();
const byId = (d: typeof f6, id: string) => d.exercises.find((e) => e.id === id);

describe('catalogue lot 4.4', () => {
  it('versions distinctes ; les deux catalogues se chargent', () => {
    expect(l44.catalogVersion).toBe(LOT44_CATALOG_VERSION);
    expect(f6.catalogVersion).toBe(F6_CATALOG_VERSION);
    expect(loadCatalog(l44).ok).toBe(true);
    expect(loadCatalog(f6).ok).toBe(true);
  });
  it('exactement deux exercices modifiés, seulement leurs secondaires (ajout) ; tout le reste identique', () => {
    const changed = l44.exercises.filter((e) => JSON.stringify(e) !== JSON.stringify(byId(f6, e.id))).map((e) => e.id).sort();
    expect(changed).toEqual(['ex.band_assisted_pull_up', 'ex.incline_push_up']);
    for (const id of changed) {
      const a = byId(f6, id); const b = byId(l44, id);
      expect({ ...b, muscles: { ...b?.muscles, secondary: [] } }).toEqual({ ...a, muscles: { ...a?.muscles, secondary: [] } });
      expect(b?.muscles.primary).toEqual(a?.muscles.primary);
      for (const m of a?.muscles.secondary ?? []) expect(b?.muscles.secondary).toContain(m);
    }
    expect(byId(l44, 'ex.incline_push_up')?.muscles.secondary).toEqual(['front_delts']);
    expect(byId(l44, 'ex.band_assisted_pull_up')?.muscles.secondary).toEqual(['forearms_grip', 'upper_back_traps']);
    // Rowing machine NON modifié (non démontré, document 11 § 4).
    expect(byId(l44, 'ex.machine_row')).toEqual(byId(f6, 'ex.machine_row'));
  });
  it('cohérence avec les variantes de même famille : développé horizontal ⇒ deltoïde antérieur ; tractions ⇒ haut du dos', () => {
    for (const e of l44.exercises.filter((x) => x.status === 'active' && x.patterns.primary === 'push_horizontal' && x.compound)) expect([e.id, e.muscles.secondary.includes('front_delts')]).toEqual([e.id, true]);
    for (const id of ['ex.pull_up', 'ex.band_assisted_pull_up', 'ex.lat_pulldown']) expect(byId(l44, id)?.muscles.secondary).toContain('upper_back_traps');
  });
});
