// @vitest-environment jsdom
/**
 * FAST TRACK V1 — semaine planifiée par une version antérieure, non commencée : AUCUNE modification à l'ouverture ;
 * proposition « Planning actuel / Planning proposé » ; « Conserver mon planning » et « Appliquer le nouveau planning ».
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryStorage, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const MON = '2026-10-05';
const at = (d: string) => (): Clock => ({ today: d, now: `${d}T07:30:00.000Z` });
const fixture = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../packages/app-core/tests/fixtures/pre-s1-state.json'), 'utf8');
const weekOf = (storage: MemoryStorage) => (JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as AppState).planner.weeks[MON];
function open() {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, fixture);
  render(<StoreProvider storage={storage} clock={at(MON)}><App /></StoreProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
  return storage;
}

describe('proposition de planning (semaine obsolète)', () => {
  it('ouverture : planning inchangé ; comparaison puis « Conserver mon planning » ⇒ inchangé, plus de proposition', () => {
    const storage = open();
    // L'ouverture peut réenregistrer l'état (mise à niveau tracée de l'intention) mais jamais modifier la semaine.
    const initial = (JSON.parse(fixture) as AppState).planner.weeks[MON];
    expect(weekOf(storage) ?? initial).toEqual(initial);
    fireEvent.click(screen.getByRole('button', { name: 'Voir la proposition' }));
    expect(screen.getByRole('region', { name: 'Planning actuel' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Planning proposé' })).toBeTruthy();
    expect(screen.getAllByText(/^Remplacée :/).length).toBeGreaterThan(0);
    expect(weekOf(storage) ?? initial).toEqual(initial);
    fireEvent.click(screen.getByRole('button', { name: 'Conserver mon planning' }));
    expect(screen.queryByRole('region', { name: 'Nouveau planning proposé' })).toBeNull();
    expect(weekOf(storage)).toEqual(initial);
    expect(screen.getByText(/Vous avez choisi de conserver le planning de cette semaine/)).toBeTruthy();
  });
  it('« Appliquer le nouveau planning » ⇒ semaine replanifiée, choix tracé', () => {
    const storage = open();
    fireEvent.click(screen.getByRole('button', { name: 'Voir la proposition' }));
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer le nouveau planning' }));
    expect(screen.getByText(/Cette semaine a été replanifiée avec votre accord/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Nouveau planning proposé' })).toBeNull();
    const s = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as AppState;
    expect(s.planner.weeks[MON]?.planningVersion).toBeDefined();
    expect(s.programmeState?.audit.some((a) => a.reason.code === 'KAIRO.WEEK_REPLANNED_STALE' && a.reason.params.confirmedBy === 'user')).toBe(true);
  });
});
