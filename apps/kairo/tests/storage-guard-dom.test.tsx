// @vitest-environment jsdom
/**
 * Reprise 2 — sécurité des données entre onglets et entre versions de la PWA.
 * Deux « onglets » = deux applications montées sur le MÊME stockage. Une version sans protection (ancien onglet resté
 * ouvert après une mise à jour) est simulée par une écriture directe dans la clé de l'état, sans marque de révision.
 * Attendu : aucune action d'un onglet périmé n'écrase ce qu'un autre onglet a enregistré ; un écrasement par une
 * version non protégée est détecté au chargement et les deux versions des données sont conservées.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, MemoryStorage, saveState, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const MONDAY = '2026-10-05';
const clock = (): Clock => ({ today: MONDAY, now: `${MONDAY}T07:30:00.000Z` });
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
const profile: ProfileInput = {
  displayName: '', level: 'intermediate', priorities: ['strength'],
  strength: { enabled: true, goal: 'strength', sessionsPerWeek: 1 },
  running: { enabled: false, population: 'P_R2', goal: 'HALF_MARATHON', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' },
  crosstraining: { enabled: false }, hyrox: { enabled: false },
  equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
  availability: [60, 45, 60, 0, 60, 90, 75], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
};
const saved = (s: MemoryStorage): AppState => JSON.parse(s.getItem(STORAGE_KEY) ?? '{}') as AppState;
const doneSets = (s: AppState) => Object.values(s.programmeLogs).flatMap((l) => l.sets.filter((x) => x.done));

/** Un « onglet » : application montée dans son propre conteneur, requêtes limitées à ce conteneur. */
function tab(storage: MemoryStorage) {
  const container = document.body.appendChild(document.createElement('div'));
  render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>, { container });
  const q = within(container);
  const click = (name: string | RegExp) => {
    fireEvent.click(q.getByRole('button', { name }));
    const d = q.queryByRole('dialog', { name: 'Avant de commencer' });
    if (d) fireEvent.click(within(d).getByRole('button', { name: 'Passer' }));
  };
  return { q, click };
}
function seeded(): MemoryStorage {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), profile, clock(), {}));
  return storage;
}
function validateFirstSet(t: ReturnType<typeof tab>) {
  t.click('Commencer la séance');
  t.click('Commencer la séance');
  fireEvent.change(t.q.getAllByLabelText('Répétitions réalisées')[0]!, { target: { value: '12' } });
  fireEvent.change(t.q.getAllByLabelText('Charge (kg)')[0]!, { target: { value: '20' } });
  fireEvent.click(t.q.getAllByRole('button', { name: 'Cocher la série' })[0]!);
}

describe('Reprise 2 — écrasement entre onglets et versions', () => {
  it('onglet périmé : son action n’écrase pas la série validée dans un autre onglet', () => {
    const storage = seeded();
    const a = tab(storage);
    const b = tab(storage);
    validateFirstSet(a);
    expect(doneSets(saved(storage))).toHaveLength(1);
    // L'onglet B n'a jamais vu cette série : il démarre la même séance depuis son état en mémoire.
    b.click('Commencer la séance');
    b.click('Commencer la séance');
    expect(doneSets(saved(storage))).toHaveLength(1);
    expect(doneSets(saved(storage))[0]).toMatchObject({ reps: 12, loadKg: 20 });
    // B est prévenu et relit les données à jour (aucune action perdue en silence).
    expect(b.q.getByText(/modifiées dans un autre onglet/)).toBeTruthy();
  });

  it('RC5 lot 2 — chronomètre global entre deux onglets : une seule pause, jamais relancée par une série, aucune écriture perdue', () => {
    const storage = seeded();
    const a = tab(storage);
    const b = tab(storage);
    a.click('Commencer la séance');
    a.click('Commencer la séance');
    a.click('Mettre en pause le chronomètre global');
    const pausedAt = Object.values(saved(storage).programmeLogs)[0]?.clock?.pausedAt;
    expect(pausedAt).toBeDefined();
    // B (périmé) : son démarrage est refusé sans écriture, il relit l'état ; la séance y apparaît en pause.
    b.click('Commencer la séance');
    b.click('Commencer la séance');
    expect(b.q.getByText(/modifiées dans un autre onglet/)).toBeTruthy();
    expect(b.q.getByRole('timer', { name: 'Chronomètre global' }).textContent).toMatch(/en pause/);
    fireEvent.change(b.q.getAllByLabelText('Répétitions réalisées')[0]!, { target: { value: '12' } });
    fireEvent.change(b.q.getAllByLabelText('Charge (kg)')[0]!, { target: { value: '20' } });
    fireEvent.click(b.q.getAllByRole('button', { name: 'Cocher la série' })[0]!);
    expect(doneSets(saved(storage))).toHaveLength(1);
    expect(Object.values(saved(storage).programmeLogs)[0]?.clock).toEqual({ pausedS: 0, pausedAt });
    // A (périmé à son tour) : sa reprise est refusée sans écraser la série de B ; après relecture, la reprise s'applique.
    const before = storage.getItem(STORAGE_KEY);
    a.click('Reprendre le chronomètre global');
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
    a.click('Reprendre le chronomètre global');
    expect(Object.values(saved(storage).programmeLogs)[0]?.clock).toEqual({ pausedS: 0 });
    expect(doneSets(saved(storage))).toHaveLength(1);
  });

  it('version sans protection : un écrasement est détecté au chargement, les deux versions des données sont conservées', () => {
    const storage = seeded();
    const a = tab(storage);
    validateFirstSet(a);
    const good = storage.getItem(STORAGE_KEY);
    cleanup();
    // Ancien onglet (version non protégée) : il réécrit son état antérieur, sans la série validée.
    const stale = createBeta0Programme(emptyState(), profile, clock(), {});
    storage.setItem(STORAGE_KEY, JSON.stringify(stale));
    const c = tab(storage);
    expect(c.q.getByRole('heading', { name: /Données remplacées/ })).toBeTruthy();
    // Rien n'est choisi à la place de l'utilisateur : la clé de l'état n'est pas réécrite tant qu'il n'a pas choisi.
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(stale));
    c.click(/Restaurer les données enregistrées/);
    expect(doneSets(saved(storage))).toHaveLength(1);
    expect(storage.getItem(STORAGE_KEY)).toBe(good);
    // La version écartée reste sur l'appareil.
    const kept = storage.keys().filter((k) => k.startsWith('kairo.state.replaced.'));
    expect(kept).toHaveLength(1);
    expect(storage.getItem(kept[0]!)).toBe(JSON.stringify(stale));
  });
});
