// @vitest-environment jsdom
/**
 * Consolidation PR #2 + #3 — état RÉEL de la version déployée (f9f7e2e) ouvert par l'interface intégrée : bandeau de
 * confirmation du matériel (rien d'écrasé), Cross-training C3 en cours (chrono conservé) ouvert dans l'écran C4,
 * Musculation en cours reprise SANS contrôle pré-séance, séries conservées, aucune erreur.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { loadState, MemoryStorage } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const now = '2026-10-06T18:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
// Environnement jsdom : chemin depuis la racine du dépôt (racine de vitest).
const fixture = resolve(process.cwd(), 'packages/app-core/tests/strength-fixes/fixtures/deployed-f9f7e2e-L1-inprogress.json');

function deployed(): MemoryStorage {
  const st = new MemoryStorage();
  for (const [k, v] of Object.entries(JSON.parse(readFileSync(fixture, 'utf8')) as Record<string, string>)) st.setItem(k, v);
  return st;
}
const saved = (s: MemoryStorage): AppState => { const r = loadState(s, now); if (r.status !== 'ok') throw new Error(r.status); return r.state; };
const mount = (s: MemoryStorage) => render(<StoreProvider storage={s} clock={clock}><App /></StoreProvider>);

describe('état de la version déployée dans l’interface intégrée (DOM)', () => {
  it('matériel à confirmer sans écrasement ; Musculation en cours reprise sans contrôle, séries conservées', () => {
    const storage = deployed();
    mount(storage);
    const banner = document.querySelector('[data-equipment-confirm]');
    expect(banner).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'C’est bien mon matériel' }));
    const s = saved(storage);
    expect(s.profile?.equipment.presetId).toBe('preset.full_gym');
    expect(s.profile?.equipment.confirmedAt).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la séance' }));
    expect(screen.queryByRole('dialog', { name: 'Avant de commencer' })).toBeNull();
    expect(saved(storage).programmeLogs['2026-10-05.strength.2']?.sets).toHaveLength(2);
    expect(saved(storage).checkIns).toEqual([]);
  });

  it('Cross-training C3 en cours : ouvert dans l’écran intégré, chrono conservé, aucun contrôle', () => {
    const storage = deployed();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Cross-training/ })[0] as HTMLElement);
    expect(screen.queryByRole('dialog', { name: 'Avant de commencer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Commencer la séance' })).toBeNull();
    expect(saved(storage).programmeLogs['2026-10-05.crosstraining.1']?.ct?.runningSince).toBe('2026-10-07T17:00:00Z');
    expect(document.body.textContent).not.toMatch(/Erreur|undefined|NaN/);
  });
});
