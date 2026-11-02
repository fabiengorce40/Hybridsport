// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { emptyState, exportState, MemoryStorage, STORAGE_KEY } from '@hybridsport/app-core';
import { DataSection } from '../src/screens/beta0/Settings0.js';
import { StoreProvider, useStore } from '../src/store.js';

afterEach(cleanup);

function CurrentState() {
  const store = useStore();
  return <><span data-testid="current">{JSON.stringify(store.state)}</span><DataSection /></>;
}

describe('import et remplacement des données', () => {
  it('signale une écriture refusée et conserve les données en mémoire et sur disque', async () => {
    const storage = new MemoryStorage();
    const original = JSON.stringify(emptyState());
    storage.setItem(STORAGE_KEY, original);
    let blocked = false;
    const backend = { getItem: (key: string) => storage.getItem(key), setItem: (key: string, value: string) => { if (blocked) throw new Error('quota'); storage.setItem(key, value); } };
    render(<StoreProvider storage={backend}><CurrentState /></StoreProvider>);
    const before = screen.getByTestId('current').textContent;
    blocked = true;
    const imported = { ...emptyState(), revision: 42 };
    expect(JSON.stringify(imported)).not.toBe(before);
    fireEvent.change(screen.getByLabelText('Fichier de données à importer'), { target: { files: [new File([exportState(imported)], 'backup.json', { type: 'application/json' })] } });
    await waitFor(() => expect(screen.getByText(/Import impossible : l’enregistrement a échoué/)).toBeTruthy());
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
    expect(screen.getByTestId('current').textContent).toBe(before);
    expect(screen.queryByText('Données importées.')).toBeNull();
  });
});
