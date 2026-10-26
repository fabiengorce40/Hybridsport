// @vitest-environment jsdom
/**
 * RC5.4 lot B — chronomètre global dans la séance Musculation (backend réel → DOM) : affiché dès le lancement effectif,
 * compact dans la barre du haut ; temps calculé sur les horodatages (navigation, redémarrage de la PWA) ; pause manuelle
 * libellée « Séance en pause », distincte du repos ; figé à la fin (durée réelle et durée prévue).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, loadState, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { clockText } from '../src/workout/SessionClock.js';

afterEach(cleanup);
let now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: '2026-10-05', now });
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
function seeded(): MemoryStorage {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), {
    displayName: '', level: 'intermediate', priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 },
    running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
    availability: [60, 60, 60, 60, 60, 0, 60], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  }, clock(), {}));
  return storage;
}
const saved = (storage: MemoryStorage): AppState => { const r = loadState(storage, now); if (r.status !== 'ok') throw new Error(r.status); return r.state; };
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const timer = () => screen.getByRole('group', { name: /^Temps de séance/ });
const openSession = () => { fireEvent.click(screen.getByRole('button', { name: /^(Commencer|Reprendre) la séance$/ })); };

describe('RC5.4 B — chronomètre global', () => {
  it('format compact', () => {
    expect([clockText(0), clockText(65), clockText(3600 + 5 * 60 + 7)]).toEqual(['0:00', '1:05', '1:05:07']);
  });

  it('lancement effectif, redémarrage, navigation, pause distincte du repos, fin figée', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded();
    mount(storage);
    openSession();
    // Avant le lancement effectif (contrôle avant séance) : aucun chronomètre.
    expect(screen.queryByRole('group', { name: /^Temps de séance/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Avant de commencer' })).getByRole('button', { name: 'Passer' }));
    expect(timer().textContent).toContain('0:00');
    const planned = document.querySelector('[data-planned-s]');
    expect(Number(planned?.getAttribute('data-planned-s'))).toBeGreaterThan(0);
    // PWA fermée 12 min (verrouillage, arrière-plan), puis rouverte : le temps a continué, sans double comptage.
    cleanup();
    now = '2026-10-05T07:42:00.000Z';
    mount(storage);
    openSession();
    expect(timer().textContent).toContain('12:00');
    // Navigation (retour à l'accueil puis retour à la séance) : même temps.
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    openSession();
    expect(timer().textContent).toContain('12:00');
    // Pause manuelle de séance : libellé explicite, temps figé ; le repos n'est pas une pause.
    fireEvent.click(screen.getByRole('button', { name: 'Mettre la séance en pause (hors repos)' }));
    expect(screen.getByText('Séance en pause')).toBeTruthy();
    cleanup();
    now = '2026-10-05T07:52:00.000Z';
    mount(storage);
    openSession();
    expect(timer().textContent).toContain('12:00');
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la séance après la pause' }));
    cleanup();
    now = '2026-10-05T07:55:00.000Z';
    mount(storage);
    openSession();
    expect(timer().textContent).toContain('15:00');
    // Fin de séance partielle : durée réelle figée.
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    const sheet = screen.getByRole('dialog', { name: 'Fin de séance' });
    fireEvent.click(within(sheet).getByRole('radio', { name: 'J’ai arrêté la séance' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Enregistrer' }));
    const log = Object.values(saved(storage).programmeLogs)[0];
    expect(log?.timing?.activeS).toBe(15 * 60);
    expect(log?.timing?.pausedS).toBe(10 * 60);
    cleanup();
    now = '2026-10-05T09:00:00.000Z';
    mount(storage);
    expect(storage.getItem('kairo.state')).toContain('"activeS":900');
  });
});
