// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BEFORE_REPLACE_PREFIX, emptyState, exportState, MemoryStorage, STORAGE_KEY } from '@hybridsport/app-core';
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
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Confirmer l’import' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Remplacer mes données' }));
    await waitFor(() => expect(screen.getByText(/Import impossible : l’enregistrement a échoué/)).toBeTruthy());
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
    expect(screen.getByTestId('current').textContent).toBe(before);
    expect(screen.queryByText('Données importées.')).toBeNull();
  });

  const choose = (imported: object) => fireEvent.change(screen.getByLabelText('Fichier de données à importer'), { target: { files: [new File([exportState(imported as never)], 'backup.json', { type: 'application/json' })] } });

  it('fichier valide : rien n’est remplacé avant confirmation ; « Annuler » conserve tout', async () => {
    const storage = new MemoryStorage();
    const original = JSON.stringify({ ...emptyState(), revision: 3 });
    storage.setItem(STORAGE_KEY, original);
    render(<StoreProvider storage={storage}><CurrentState /></StoreProvider>);
    const before = screen.getByTestId('current').textContent;
    choose({ ...emptyState(), revision: 42 });
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Confirmer l’import' })).toBeTruthy());
    expect(screen.getByText(/Données actuelles :/)).toBeTruthy();
    expect(screen.getByText(/Fichier :/)).toBeTruthy();
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
    expect(screen.getByTestId('current').textContent).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog', { name: 'Confirmer l’import' })).toBeNull();
    expect(screen.getByText('Import annulé. Rien n’a été modifié.')).toBeTruthy();
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  it('confirmation : les données actuelles sont copiées à l’identique AVANT le remplacement', async () => {
    const storage = new MemoryStorage();
    const writes: string[] = [];
    const backend = { getItem: (k: string) => storage.getItem(k), setItem: (k: string, v: string) => { writes.push(k); storage.setItem(k, v); } };
    const original = JSON.stringify({ ...emptyState(), revision: 3 });
    storage.setItem(STORAGE_KEY, original);
    render(<StoreProvider storage={backend}><CurrentState /></StoreProvider>);
    writes.length = 0;
    choose({ ...emptyState(), revision: 42 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remplacer mes données' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Remplacer mes données' }));
    await waitFor(() => expect(screen.getByText(/Données importées/)).toBeTruthy());
    const copyKey = writes.find((k) => k.startsWith(BEFORE_REPLACE_PREFIX));
    expect(copyKey).toBeDefined();
    expect(storage.getItem(copyKey ?? '')).toBe(original);
    expect(writes.indexOf(copyKey ?? '')).toBeLessThan(writes.indexOf(STORAGE_KEY));
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').revision).not.toBe(3);
  });

  it('copie de sécurité impossible : rien n’est remplacé', async () => {
    const storage = new MemoryStorage();
    const original = JSON.stringify({ ...emptyState(), revision: 3 });
    storage.setItem(STORAGE_KEY, original);
    const backend = { getItem: (k: string) => storage.getItem(k), setItem: (k: string, v: string) => { if (k.startsWith(BEFORE_REPLACE_PREFIX)) throw new Error('quota'); storage.setItem(k, v); } };
    render(<StoreProvider storage={backend}><CurrentState /></StoreProvider>);
    choose({ ...emptyState(), revision: 42 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remplacer mes données' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Remplacer mes données' }));
    await waitFor(() => expect(screen.getByText(/Import impossible/)).toBeTruthy());
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });
});

