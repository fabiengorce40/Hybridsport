// @vitest-environment jsdom
/**
 * RC5.4 lot A — PHASES des séries dans la séance Musculation (backend réel → DOM) : montée en charge et séries de travail
 * séparées par un titre explicite (jamais la couleur seule) ; état de la série (à faire / en cours / validée)
 * indépendant de son type ; prescription inchangée (mêmes séries, mêmes indices) ; les montées en charge validées ne
 * sont jamais comptées comme séries effectives (exposition de progression = séries de travail seules).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, exerciseLabel, loadState, MemoryStorage, saveState, selectProgrammeSession } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { adaptationText, setPhases } from '../src/workout/StrengthWorkout.js';

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
const start = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
  fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Avant de commencer' })).getByRole('button', { name: 'Passer' }));
};
const validate = (line: HTMLElement) => {
  const reps = within(line).getByLabelText('Répétitions réalisées') as HTMLInputElement;
  if (reps.value === '') fireEvent.change(reps, { target: { value: '8' } });
  const kg = within(line).getByLabelText('Charge (kg)') as HTMLInputElement;
  if (kg.value === '') fireEvent.change(kg, { target: { value: '40' } });
  fireEvent.click(within(line).getByRole('button', { name: 'Cocher la série' }));
};

describe('RC5.4 A — phases visuelles', () => {
  it('regroupement contigu par type, indices d’origine conservés ; back-off seulement s’il est prescrit', () => {
    const w = { reps: 8, restAfterS: 90 } as const;
    expect(setPhases([{ kind: 'rampup', ...w }, { kind: 'rampup', ...w }, { kind: 'working', ...w }, { kind: 'working', ...w }])).toEqual([{ phase: 'warmup', indices: [0, 1] }, { phase: 'work', indices: [2, 3] }]);
    expect(setPhases([{ kind: 'top_set', ...w }, { kind: 'backoff', ...w }, { kind: 'backoff', ...w }])).toEqual([{ phase: 'work', indices: [0] }, { phase: 'backoff', indices: [1, 2] }]);
    expect(setPhases([{ kind: 'working', ...w }])).toEqual([{ phase: 'work', indices: [0] }]);
  });

  it('adaptation : explication tirée des changements persistés de l’exercice, rien pour un exercice inchangé', () => {
    const changes = ['sets:ex.bench_press:3>2', 'rir:ex.bench_press:2>3', 'sets:ex.squat:4>3'];
    expect(adaptationText(changes, 'ex.bench_press')).toBe('Adaptée au contrôle avant séance : 3 → 2 séries de travail ; effort visé : 2 → 3 reps en réserve.');
    expect(adaptationText(changes, 'ex.pec_deck')).toBeNull();
  });

  it('séance réelle : titres de phase, états indépendants du type, prescription intacte, montées hors exposition', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded();
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    start();
    const requestId = Object.keys(saved(storage).programmeLogs)[0] ?? '';
    const before = selectProgrammeSession(saved(storage), requestId)?.session;
    const section = screen.getByRole('region', { name: new RegExp(`: ${exerciseLabel('ex.bench_press')}$`) });
    const warm = within(section).getByRole('group', { name: /^Montée en charge,/ });
    const work = within(section).getByRole('group', { name: /^Séries de travail,/ });
    expect(within(warm).getByText('Montée en charge')).toBeTruthy();
    expect(within(work).getByText('Séries de travail')).toBeTruthy();
    expect([...warm.querySelectorAll('.k-set')].every((x) => x.getAttribute('data-set-kind') === 'rampup')).toBe(true);
    expect([...work.querySelectorAll('.k-set')].every((x) => x.getAttribute('data-set-kind') !== 'rampup')).toBe(true);
    // État « en cours » : première série non validée de l'exercice courant (ici une montée), signalée par un texte.
    const first = warm.querySelector('.k-set') as HTMLElement;
    expect(first.getAttribute('data-set-state')).toBe('current');
    expect(first.getAttribute('aria-current')).toBe('step');
    expect(within(first).getByText(/en cours/)).toBeTruthy();
    // Validation de toutes les montées, puis d'une série de travail : états validés, l'état « en cours » avance.
    for (const line of [...warm.querySelectorAll('.k-set')] as HTMLElement[]) validate(line);
    expect([...warm.querySelectorAll('.k-set')].every((x) => x.getAttribute('data-set-state') === 'done')).toBe(true);
    const w1 = work.querySelector('.k-set') as HTMLElement;
    expect(w1.getAttribute('data-set-state')).toBe('current');
    validate(w1);
    expect(w1.getAttribute('data-set-state')).toBe('done');
    // Prescription inchangée : mêmes séries (type, répétitions, charge) qu'avant l'affichage.
    expect(selectProgrammeSession(saved(storage), requestId)?.session).toEqual(before);
    // Fin de séance partielle : l'exposition de progression ne contient QUE la série de travail validée.
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    const sheet = screen.getByRole('dialog', { name: 'Fin de séance' });
    fireEvent.click(within(sheet).getByRole('radio', { name: 'J’ai adapté la séance' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Enregistrer' }));
    const expo = saved(storage).strength.exposures.filter((x) => x.exerciseId === 'ex.bench_press');
    expect(expo.length).toBe(1);
    expect(expo[0]?.sets.length).toBe(1);
  });
});
