/**
 * Canal de distribution de la build. `production` (défaut, aucune variable) : comportement historique inchangé.
 * `beta` (`VITE_KAIRO_CHANNEL=beta`) : BÊTA complète de REKKA, environnement de validation utilisateur, hébergée sur une
 * AUTRE origine que la production et que TEST ; en défense supplémentaire, toutes ses clés de stockage local sont
 * préfixées, de sorte qu'elle ne lit ni n'écrit jamais `kairo.state` (ni aucune autre clé) d'un autre environnement,
 * même sur une origine partagée. Le préfixe est STABLE : les mises à jour de la BÊTA relisent toujours les mêmes clés.
 */
import type { KeyValueStorage } from '@hybridsport/app-core';

export type Channel = 'production' | 'beta';
export const CHANNEL: Channel = import.meta.env.VITE_KAIRO_CHANNEL === 'beta' ? 'beta' : 'production';
export const IS_BETA = CHANNEL === 'beta';
/** Identité VISIBLE de la BÊTA (titre, bandeau, nom du manifeste). */
export const BETA_LABEL = 'REKKA BÊTA';
/** Préfixe des clés de la BÊTA (vide en production : clés historiques). Ne jamais le modifier : données de la BÊTA. */
export const STORAGE_NAMESPACE = IS_BETA ? 'rekka-beta:' : '';

/** Stockage dont toutes les clés sont préfixées (identité en production). */
export function namespaced(storage: KeyValueStorage, prefix: string = STORAGE_NAMESPACE): KeyValueStorage {
  if (prefix === '') return storage;
  return {
    getItem: (k) => storage.getItem(prefix + k),
    setItem: (k, v) => { storage.setItem(prefix + k, v); },
  };
}
