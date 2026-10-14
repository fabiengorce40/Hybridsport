/**
 * Canal de distribution de la build. `production` (défaut, aucune variable) : comportement historique inchangé.
 * `rc1-test` (`VITE_KAIRO_CHANNEL=rc1-test`) : environnement de TEST isolé de RC1, hébergé sur une AUTRE origine
 * que la production ; en défense supplémentaire, toutes ses clés de stockage local sont préfixées, de sorte qu'il
 * ne lit ni n'écrit jamais `kairo.state` (ni aucune autre clé) de la version publique, même sur une origine partagée.
 */
import type { KeyValueStorage } from '@hybridsport/app-core';

export type Channel = 'production' | 'rc1-test';
export const CHANNEL: Channel = import.meta.env.VITE_KAIRO_CHANNEL === 'rc1-test' ? 'rc1-test' : 'production';
export const IS_TEST = CHANNEL === 'rc1-test';
/** Identité visible de la build de test. */
export const TEST_LABEL = 'KAIRO RC1 — TEST';
/** Préfixe des clés de l'environnement de test (vide en production : clés historiques). */
export const STORAGE_NAMESPACE = IS_TEST ? 'kairo-rc1-test:' : '';

/** Stockage dont toutes les clés sont préfixées (identité en production). */
export function namespaced(storage: KeyValueStorage, prefix: string = STORAGE_NAMESPACE): KeyValueStorage {
  if (prefix === '') return storage;
  return {
    getItem: (k) => storage.getItem(prefix + k),
    setItem: (k, v) => { storage.setItem(prefix + k, v); },
  };
}
