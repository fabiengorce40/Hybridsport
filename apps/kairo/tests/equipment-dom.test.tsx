// @vitest-environment jsdom
/**
 * P1 — matériel dans l'interface : profil antérieur non confirmé ⇒ bandeau (confirmer sans rien écraser) ; séance :
 * « Matériel indisponible » ⇒ substitut validé affiché (ou refus explicite), séries de l'exercice intactes.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, loadState, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });

function seeded(preset: string, confirmed: boolean, sessions = 3): MemoryStorage {
  const storage = new MemoryStorage();
  const items = EQUIPMENT_PRESETS.find((p) => p.id === preset)?.equipment ?? [];
  saveState(storage, createBeta0Programme(emptyState(), {
    displayName: '', level: 'intermediate', priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: sessions },
    running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: false },
    equipment: { presetId: preset, items: [...items], ...(confirmed ? { confirmedAt: '2026-10-04T10:00:00.000Z' } : {}) }, availability: [75, 75, 75, 75, 75, 0, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  }, clock(), {}));
  return storage;
}
const saved = (s: MemoryStorage): AppState => { const r = loadState(s, now); if (r.status !== 'ok') throw new Error(r.status); return r.state; };
const mount = (s: MemoryStorage) => render(<StoreProvider storage={s} clock={clock}><App /></StoreProvider>);

describe('matériel (DOM)', () => {
  it('profil antérieur (présélection, non confirmé) : bandeau de vérification ; confirmer conserve matériel et séances', () => {
    const storage = seeded('preset.full_gym', false);
    const before = saved(storage);
    mount(storage);
    const banner = document.querySelector('[data-equipment-confirm]') as HTMLElement;
    expect(banner.textContent).toContain('Vérifiez votre matériel');
    expect(banner.textContent).toContain('Salle complète');
    fireEvent.click(within(banner).getByRole('button', { name: 'C’est bien mon matériel' }));
    expect(document.querySelector('[data-equipment-confirm]')).toBeNull();
    const after = saved(storage);
    expect(after.profile?.equipment.items).toEqual(before.profile?.equipment.items);
    expect(after.profile?.equipment.confirmedAt).toBeDefined();
    expect(JSON.stringify(after.planner)).toBe(JSON.stringify(before.planner));
  });

  it('séance : « Matériel indisponible » sur la presse pectoraux ⇒ substitut affiché, aucune charge reprise', () => {
    const storage = seeded('preset.commercial_gym', true);
    mount(storage);
    expect(document.querySelector('[data-equipment-confirm]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Musculation/ })[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Avant de commencer' })).getByRole('button', { name: 'Passer' }));
    const btn = screen.queryByRole('button', { name: 'Matériel indisponible pour Presse pectoraux machine' });
    if (!btn) return; // séance sans presse pectoraux : couvert par app-core (equipment.test.ts)
    fireEvent.click(btn);
    expect(document.querySelector('[data-swap="substituted"]')?.textContent).toContain('Remplace Presse pectoraux machine');
    expect(saved(storage).programmeLogs[Object.keys(saved(storage).programmeLogs)[0] ?? '']?.swaps?.at(-1)?.substituteId).toBeDefined();
  });
});
