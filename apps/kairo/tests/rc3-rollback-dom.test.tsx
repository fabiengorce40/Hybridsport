// @vitest-environment jsdom
/**
 * Repli RC1 TEST après un essai RC3 TEST (jsdom, backend réel) : les données écrites par RC3 sont relues, jamais
 * « illisibles » ; ce qui est mis de côté est dit en clair ; séances et historique affichés ; copie RC3 conservée.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryStorage, RC3_ORIGINAL_KEY, STORAGE_KEY } from '@hybridsport/app-core';
import type { Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const FIX = join(import.meta.dirname, '../../../packages/app-core/tests/rc3-rollback/fixtures');
const clock = (): Clock => ({ today: '2026-10-15', now: '2026-10-15T07:30:00.000Z' });

describe('repli RC1 après RC3 (DOM)', () => {
  it('courses libres commentées, douleur, performance déclarée : relu, message clair, historique, copie RC3 conservée', () => {
    const text = readFileSync(join(FIX, 'rc3-free-runs-notes-pain-performance.json'), 'utf8');
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, text);
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    expect(screen.queryByText('Données illisibles')).toBeNull();
    expect(document.body.textContent).toMatch(/Données de l’essai RC3 relues : séances, historique, références, profil et douleurs conservés\. Mis de côté \(non affichés dans cette version\) : commentaires de courses libres\./);
    expect(storage.getItem(RC3_ORIGINAL_KEY)).toBe(text);
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    expect(screen.queryByText('Données illisibles')).toBeNull();
    expect(document.body.textContent).toMatch(/Test chronométré|Footing/);
  });

  it('données sans champ RC3 : aucun message, aucune copie', () => {
    const text = readFileSync(join(FIX, 'rc3-ct-finished.json'), 'utf8');
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, text);
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    expect(document.body.textContent).not.toMatch(/essai RC3/);
    expect(storage.getItem(RC3_ORIGINAL_KEY)).toBeNull();
  });
});
