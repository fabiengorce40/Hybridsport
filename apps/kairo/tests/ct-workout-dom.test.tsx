// @vitest-environment jsdom
/**
 * C3.5 — séance Cross-training dans l'interface (backend réel → DOM) : programme Cross-training seul, carte du planning
 * (format lu dans la séance persistée), ouverture du bon workout (aucun repli Strength), démarrage du chrono, tours,
 * pause / reprise, rechargement (chrono et score conservés), fin avec résultat STRUCTURÉ, historique.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, loadState, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
let now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];

function seeded(intent = 'crosstraining.mixed_modal_medium'): MemoryStorage {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), {
    displayName: '', level: 'intermediate', priorities: ['crosstraining'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
    running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: true, sessionsPerWeek: 3, intent, returnState: 'NONE' }, hyrox: { enabled: false },
    equipment: { presetId: 'preset.full_gym', items: [...fullGym] }, availability: [60, 0, 60, 0, 60, 0, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  }, clock(), {}));
  return storage;
}
const saved = (storage: MemoryStorage): AppState => {
  const r = loadState(storage, now);
  if (r.status !== 'ok') throw new Error(r.status);
  return r.state;
};
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);

describe('séance Cross-training (DOM)', () => {
  it('planning → AMRAP : démarrer, tours, pause, rechargement, fin structurée, historique', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    const card = screen.getAllByRole('button', { name: /^Cross-training : Mixte/ })[0] as HTMLElement;
    expect(card.textContent).toContain('AMRAP');
    fireEvent.click(card);
    expect(screen.getByRole('heading', { name: 'Mixte', level: 1 })).toBeTruthy();
    expect(screen.queryByLabelText('Répétitions réalisées')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    expect(screen.getByRole('timer', { name: 'Chrono de la séance' })).toBeTruthy();
    // Deux tours, puis 5 répétitions du tour en cours (valeurs absolues persistées à chaque appui).
    fireEvent.click(screen.getByRole('button', { name: 'Tours complets : plus un' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tours complets : plus un' }));
    for (let k = 0; k < 5; k += 1) fireEvent.click(screen.getByRole('button', { name: 'Répétitions du tour en cours : plus un' }));
    const log = () => Object.values(saved(storage).programmeLogs)[0];
    expect(log()?.ct).toMatchObject({ rounds: 2, partialReps: 5 });
    // Pause à +3 min : cumul figé ; aucune écriture tant que le chrono tourne.
    now = '2026-10-05T07:33:00.000Z';
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(log()?.ct).toMatchObject({ runningSince: null, accumulatedS: 180 });
    cleanup();
    // Rechargement 10 min plus tard : chrono figé (pause), score conservé, séance pas redevenue « prévue ».
    now = '2026-10-05T07:43:00.000Z';
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Cross-training : Mixte, En cours/ })[0] as HTMLElement);
    expect(screen.getByRole('timer').textContent).toContain('EN PAUSE');
    expect(within(screen.getByRole('group', { name: 'Tours complets' })).getByText('2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    now = '2026-10-05T07:52:00.000Z';
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    const sheet = screen.getByRole('dialog', { name: 'Fin de séance' });
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Tout s’est passé comme prévu' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Enregistrer' }));
    const s = saved(storage);
    expect(s.crosstraining.realized).toHaveLength(1);
    expect(s.crosstraining.realized[0]).toMatchObject({ stimulus: 'mixed_modal_medium', result: { kind: 'rounds_reps', rounds: 2, reps: 5 }, completion: 'completed_as_prescribed', pain: 'NONE' });
    expect(log()?.outcome?.ct).toMatchObject({ result: { kind: 'rounds_reps', rounds: 2, reps: 5 }, elapsedS: 720 });
    cleanup();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    expect(document.body.textContent).toContain('2 tours + 5 rép.');
    expect(document.body.textContent).toContain('AMRAP');
  });
});
