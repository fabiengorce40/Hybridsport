/**
 * Canal de distribution : la build de production garde ses clés historiques ; le canal de test préfixe TOUTES ses
 * clés et ne touche jamais celles de la production, même sur un stockage partagé.
 */
import { describe, expect, it } from 'vitest';
import { loadState, MemoryStorage, saveState, emptyState, STORAGE_KEY } from '@hybridsport/app-core';
import { CHANNEL, IS_TEST, namespaced, STORAGE_NAMESPACE } from '../src/channel.js';

describe('canal de distribution KAIRO', () => {
  it('build par défaut = production : aucun préfixe, stockage inchangé', () => {
    expect(CHANNEL).toBe('production');
    expect(IS_TEST).toBe(false);
    expect(STORAGE_NAMESPACE).toBe('');
    const raw = new MemoryStorage();
    expect(namespaced(raw)).toBe(raw);
  });

  it('canal de test : l’état est écrit et relu sous le préfixe, la clé de production reste intacte', () => {
    const shared = new MemoryStorage();
    shared.setItem(STORAGE_KEY, 'PRODUCTION');
    const test = namespaced(shared, 'kairo-rc1-test:');
    saveState(test, emptyState());
    expect(shared.getItem(STORAGE_KEY)).toBe('PRODUCTION');
    expect(shared.getItem(`kairo-rc1-test:${STORAGE_KEY}`)).not.toBeNull();
    expect(loadState(test, '2026-10-05T07:30:00.000Z').status).toBe('ok');
  });

  it('canal de test : une donnée de production n’est jamais lue par le test', () => {
    const shared = new MemoryStorage();
    saveState(shared, emptyState());
    const test = namespaced(shared, 'kairo-rc1-test:');
    expect(test.getItem(STORAGE_KEY)).toBeNull();
  });
});
