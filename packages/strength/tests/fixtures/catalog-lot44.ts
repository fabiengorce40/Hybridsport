/**
 * Reprise RC5 lot 4.4 (chantier B) — catalogue VERSIONNÉ : surcouche du catalogue F6 (qui reste inchangé, relu pour les
 * prescriptions existantes). Seules deux incohérences FACTUELLES démontrées sont corrigées, par comparaison aux variantes
 * de la MÊME famille et du MÊME schéma :
 * - `ex.incline_push_up` : seul développé horizontal sans deltoïde antérieur en secondaire (développé couché, haltères,
 *   machine, pompes le déclarent ; même famille et même progression que `ex.push_up`, rang 1) ⇒ `front_delts` ajouté.
 *   Les abdominaux de `ex.push_up` ne sont PAS ajoutés (demande du tronc réduite par l'inclinaison : non démontré).
 * - `ex.band_assisted_pull_up` : régression (rang 1) de `ex.pull_up`, mêmes actions articulaires, l'élastique réduit la
 *   charge ⇒ `upper_back_traps` ajouté comme pour `ex.pull_up` et `ex.lat_pulldown`.
 * `ex.machine_row` n'est PAS modifié : la sollicitation du deltoïde postérieur dépend de la prise et de l'angle du coude ;
 * deux classes d'équivalence différentes ne sont pas supposées identiques (document 11, § 4).
 */
import type { CatalogDocumentInput } from '@hybridsport/domain';
import { strengthF6CatalogDocument } from './f6.js';

export const LOT44_CATALOG_VERSION = '0.3.1-strength-test-f6-lot44';
const SECONDARY_ADDED: Readonly<Record<string, readonly string[]>> = {
  'ex.incline_push_up': ['front_delts'],
  'ex.band_assisted_pull_up': ['upper_back_traps'],
};

export function strengthLot44CatalogDocument(): CatalogDocumentInput {
  const base = strengthF6CatalogDocument();
  return {
    ...base,
    catalogVersion: LOT44_CATALOG_VERSION,
    exercises: base.exercises.map((e) => {
      const add = SECONDARY_ADDED[e.id];
      if (!add) return e;
      return { ...e, muscles: { ...e.muscles, secondary: [...e.muscles.secondary, ...add.filter((x) => !e.muscles.secondary.includes(x))] } };
    }),
  };
}
