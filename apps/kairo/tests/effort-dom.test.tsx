// @vitest-environment jsdom
/**
 * Strength S5 — saisie de l'EFFORT observé (répétitions en réserve) dans la séance Musculation (backend réel → DOM) :
 * une rangée de pastilles sous les séries, pour la DERNIÈRE série validée de l'exercice, facultative ; choisir,
 * modifier, effacer ; le chrono de repos n'est jamais relancé ni modifié ; la valeur survit au rechargement ; aucune
 * pastille ⇒ effort inconnu (aucun RIR écrit, jamais 0).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, exerciseLabel, loadState, MemoryStorage, saveState, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

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
const saved = (storage: MemoryStorage): AppState => {
  const r = loadState(storage, now);
  if (r.status !== 'ok') throw new Error(r.status);
  return r.state;
};
const log = (storage: MemoryStorage) => Object.values(saved(storage).programmeLogs)[0];

describe('effort observé (RIR) dans la séance', () => {
  it('pastilles après la première série validée ; choisir / modifier / effacer ; chrono intact ; rechargement', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded();
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    const section = screen.getByRole('region', { name: new RegExp(`: ${exerciseLabel('ex.bench_press')}$`) });
    // Avant toute série validée : aucune saisie d'effort proposée.
    expect(within(section).queryByRole('group', { name: /Répétitions en réserve/ })).toBeNull();
    // Première série de TRAVAIL (les montées en charge ne portent pas l'effort lu par le moteur).
    const line = [...section.querySelectorAll('.k-set')].find((x) => !x.classList.contains('warm')) as HTMLElement;
    fireEvent.change(within(line).getByLabelText('Répétitions réalisées'), { target: { value: '6' } });
    const kg = within(line).getByLabelText('Charge (kg)') as HTMLInputElement;
    if (kg.value === '') fireEvent.change(kg, { target: { value: '40' } });
    fireEvent.click(within(line).getByRole('button', { name: 'Cocher la série' }));
    const rest = log(storage)?.rest;
    expect(rest).not.toBeNull();
    // Sans pastille : effort INCONNU (aucun RIR écrit).
    expect(log(storage)?.sets.every((x) => x.rir === undefined)).toBe(true);
    const group = within(section).getByRole('group', { name: /Répétitions en réserve/ });
    // Choisir 2, modifier à 3 (avant la fin de séance) : le chrono n'est ni relancé ni modifié.
    now = '2026-10-05T07:31:00.000Z';
    fireEvent.click(within(group).getByRole('button', { name: '2 répétitions en réserve' }));
    expect(log(storage)?.sets.find((x) => x.done)?.rir).toBe(2);
    fireEvent.click(within(group).getByRole('button', { name: '3 répétitions en réserve' }));
    expect(log(storage)?.sets.find((x) => x.done)?.rir).toBe(3);
    expect(log(storage)?.rest).toEqual(rest);
    expect(within(group).getByRole('button', { name: '3 répétitions en réserve' }).getAttribute('aria-pressed')).toBe('true');
    // RIR 0 réellement saisi : conservé comme 0 (distinct de « inconnu »).
    fireEvent.click(within(group).getByRole('button', { name: '0 répétition en réserve' }));
    expect(log(storage)?.sets.find((x) => x.done)?.rir).toBe(0);
    // Re-toucher la pastille choisie efface : effort inconnu.
    fireEvent.click(within(group).getByRole('button', { name: '0 répétition en réserve' }));
    expect(log(storage)?.sets.find((x) => x.done)?.rir).toBeUndefined();
    fireEvent.click(within(group).getByRole('button', { name: '1 répétition en réserve' }));
    cleanup();
    // Rechargement de l'application pendant la séance : la saisie est conservée et réaffichée.
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    expect(storage.getItem(STORAGE_KEY)).toContain('"rir":1');
    expect(log(storage)?.sets.find((x) => x.done)?.rir).toBe(1);
  });
});
