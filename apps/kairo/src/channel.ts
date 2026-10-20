/**
 * Canal de distribution de la build. `production` (défaut, aucune variable) : comportement historique inchangé.
 * `r51-preview` (`VITE_KAIRO_CHANNEL=r51-preview`) : PRÉVISUALISATION isolée de R5.1 (Planning en grille), hébergée
 * sur une AUTRE origine que la production et que TEST ; en défense supplémentaire, toutes ses clés de stockage local
 * sont préfixées, de sorte qu'elle ne lit ni n'écrit jamais `kairo.state` (ni aucune autre clé) d'un autre
 * environnement, même sur une origine partagée.
 */
import type { KeyValueStorage } from '@hybridsport/app-core';

export type Channel = 'production' | 'r51-preview';
export const CHANNEL: Channel = import.meta.env.VITE_KAIRO_CHANNEL === 'r51-preview' ? 'r51-preview' : 'production';
export const IS_PREVIEW = CHANNEL === 'r51-preview';
/** Identité VISIBLE de la prévisualisation (titre, bandeau, nom du manifeste). */
export const PREVIEW_LABEL = 'REKKA R5.1 — PRÉVISUALISATION';
/** Préfixe des clés de la prévisualisation (vide en production : clés historiques). */
export const STORAGE_NAMESPACE = IS_PREVIEW ? 'kairo-r51-preview:' : '';

/** Stockage dont toutes les clés sont préfixées (identité en production). */
export function namespaced(storage: KeyValueStorage, prefix: string = STORAGE_NAMESPACE): KeyValueStorage {
  if (prefix === '') return storage;
  return {
    getItem: (k) => storage.getItem(prefix + k),
    setItem: (k, v) => { storage.setItem(prefix + k, v); },
  };
}
