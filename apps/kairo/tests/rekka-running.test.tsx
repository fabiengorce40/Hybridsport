// @vitest-environment jsdom
/**
 * REKKA — parcours Course dans l'interface : séance de course non planifiée faute de course réelle ⇒ information nommée,
 * actions directes ; requalification d'un chrono en sortie d'entraînement SEULEMENT après confirmation ; footings placés
 * dans la semaine en cours ; saisie « Sortie d'entraînement » jamais enregistrée comme performance de référence.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, MemoryStorage, saveState, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock, DeclaredPerformance } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const clock = (): Clock => ({ today: '2026-10-21', now: '2026-10-21T07:30:00.000Z' });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const saved = (st: MemoryStorage): AppState => (JSON.parse(st.getItem(STORAGE_KEY) ?? '{}') as { state: AppState }).state ?? (JSON.parse(st.getItem(STORAGE_KEY) ?? '{}') as AppState);
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
const chrono = (date: string, distanceM: number, durationS: number): DeclaredPerformance => ({ kind: 'TIME_TRIAL', date, distanceM, durationS, measuredCourse: true, conditions: 'NORMAL', interruptionSince: 'NONE' });

/** État du test réel : Musculation + Course 2×, deux sorties saisies comme chronos (5 km 30:00 le 15/10, 10 km 1:05:00 le 14/08). */
function mountReal(): MemoryStorage {
  const s = createBeta0Programme(emptyState(), {
    displayName: '', level: 'intermediate', priorities: ['strength', 'running'],
    strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
    running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: true, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: false },
    equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
    availability: [60, 60, 60, 60, 60, 90, 90], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  }, clock(), { performances: [chrono('2026-10-15', 5000, 1800), chrono('2026-08-14', 10000, 3900)] });
  const storage = new MemoryStorage();
  expect(saveState(storage, s).ok).toBe(true);
  render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
  return storage;
}
const runningCards = () => screen.queryAllByLabelText(/^Course.* non planifiée$/);

describe('REKKA — parcours Course', () => {
  it('carte non planifiée : information nommée, raison, actions ; requalification confirmée ⇒ deux footings placés cette semaine', () => {
    const storage = mountReal();
    click('Planning');
    const cards = runningCards();
    expect(cards).toHaveLength(2);
    const card = within(cards[0] as HTMLElement);
    expect(card.getByText(/Il manque votre dernière course réelle/)).toBeTruthy();
    expect(card.getByText(/aucun test maximal n’est nécessaire/)).toBeTruthy();
    expect(card.getByRole('button', { name: 'Enregistrer une course réalisée' })).toBeTruthy();
    const requalify = card.getAllByRole('button', { name: 'Ce n’était pas un effort maximal' });
    expect(requalify).toHaveLength(2);
    // Annuler : rien n'est écrit.
    fireEvent.click(requalify[0] as HTMLElement);
    fireEvent.click(card.getByRole('button', { name: 'Annuler' }));
    expect(saved(storage).running.requalified).toBeUndefined();
    // Confirmer (sortie récente de 5 km) : séances de course retentées et placées.
    const five = card.getAllByText(/km du/).find((e) => e.textContent?.startsWith('5 km')) as HTMLElement;
    fireEvent.click(within(five.parentElement as HTMLElement).getByRole('button', { name: 'Ce n’était pas un effort maximal' }));
    click('Confirmer : c’était une sortie');
    const st = saved(storage);
    expect(Object.keys(st.running.requalified ?? {})).toHaveLength(1);
    expect(st.running.references).toHaveLength(2);
    expect(st.planner.weeks['2026-10-19']?.requests.filter((r) => r.sport === 'running').map((r) => r.status)).toEqual(['planned', 'planned']);
    expect(runningCards()).toHaveLength(0);
  });

  it('profil Course : séances clés « non prévues par l’objectif », allure VO₂ avec sa source ; « Sortie d’entraînement » n’est jamais une performance', () => {
    const storage = mountReal();
    click('Réglages');
    click(/^Profil Course/);
    expect(screen.getByText(/Seuil : disponibles · non prévues par l’objectif « .* » \(footings\)/)).toBeTruthy();
    expect(screen.getByText(/estimée depuis votre chrono du .*15 octobre/)).toBeTruthy();
    click('Ajouter une performance');
    const f = within(screen.getByLabelText('Ajouter une performance'));
    fireEvent.click(f.getByRole('radio', { name: /^Sortie d’entraînement/ }));
    expect(f.queryByLabelText(/effort maximal/)).toBeNull();
    fireEvent.click(f.getByRole('radio', { name: '5 km' }));
    fireEvent.change(f.getByLabelText('Chrono : minutes'), { target: { value: '31' } });
    fireEvent.change(f.getByLabelText('Chrono : secondes'), { target: { value: '00' } });
    fireEvent.change(f.getByLabelText('Date de réalisation'), { target: { value: '2026-10-20' } });
    fireEvent.click(f.getByRole('button', { name: 'Ajouter cette sortie' }));
    const st = saved(storage);
    expect(st.running.references).toHaveLength(2);
    expect(st.running.realized.map((r) => [r.realizedDurationS, r.distanceM])).toEqual([[1860, 5000]]);
    expect(screen.getByRole('status').textContent).toMatch(/^Sortie ajoutée : sortie d’entraînement 5 km en 31:00\./);
    expect(st.planner.weeks['2026-10-19']?.requests.filter((r) => r.sport === 'running').map((r) => r.status)).toEqual(['planned', 'planned']);
  });
});
