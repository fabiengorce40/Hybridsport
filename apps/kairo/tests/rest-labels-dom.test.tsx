// @vitest-environment jsdom
/**
 * Retour terrain RC1 TEST (développé couché) : la montée en charge a son PROPRE repos prescrit, distinct de celui des
 * séries de travail. L'en-tête de l'exercice affiche les deux (« Repos montée en charge : 1:00 », « Repos séries de
 * travail : 2:30 ») ; le chrono indique quelle série l'a déclenché et survit au rechargement. Valeurs lues dans la
 * prescription (backend réel), jamais recalculées ici.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, exerciseLabel, loadState, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
let now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: '2026-10-05', now });
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
const clockOf = (s: number) => `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, '0')}`;

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
const log = (storage: MemoryStorage) => Object.values(saved(storage).programmeLogs)[0];

function validate(line: HTMLElement, reps: string, kgValue: string) {
  fireEvent.change(within(line).getByLabelText('Répétitions réalisées'), { target: { value: reps } });
  const kg = within(line).getByLabelText('Charge (kg)') as HTMLInputElement;
  if (kg.value === '') fireEvent.change(kg, { target: { value: kgValue } });
  fireEvent.click(within(line).getByRole('button', { name: 'Cocher la série' }));
}

describe('repos montée en charge / séries de travail (développé couché)', () => {
  it('en-tête : deux repos libellés ; chaque validation déclenche le bon chrono ; chrono conservé au rechargement', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded();
    const view = render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Avant de commencer' })).getByRole('button', { name: 'Passer' }));
    const section = () => screen.getByRole('region', { name: new RegExp(`: ${exerciseLabel('ex.bench_press')}$`) });
    const split = section().querySelector('[data-rest-split]') as HTMLElement;
    expect(split).not.toBeNull();
    const rampTxt = (split.querySelector('[data-rest="rampup"]') as HTMLElement).textContent ?? '';
    const workTxt = (split.querySelector('[data-rest="working"]') as HTMLElement).textContent ?? '';
    expect(rampTxt).toMatch(/^Repos montée en charge : \d+:\d\d$/);
    expect(workTxt).toMatch(/^Repos séries de travail : \d+:\d\d$/);
    // Plus d'« repos X:XX » ambigu dans la ligne de résumé quand les deux repos diffèrent.
    expect(section().querySelector('.k-ex-head .k-ex-sub')?.textContent).not.toMatch(/repos \d/);

    // 1. Série de MONTÉE validée ⇒ chrono = repos de montée, libellé « montée en charge ».
    const warm = section().querySelector('.k-set.warm') as HTMLElement;
    validate(warm, '8', '20');
    const r1 = log(storage)?.rest;
    expect(r1?.setKind).toBe('rampup');
    expect(`Repos montée en charge : ${clockOf(r1?.totalS ?? -1)}`).toBe(rampTxt);
    expect(screen.getByRole('timer').textContent).toContain('REPOS MONTÉE EN CHARGE');

    // Rechargement de l'application : même chrono, même libellé.
    view.unmount();
    now = '2026-10-05T07:30:20.000Z';
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    expect(log(storage)?.rest).toEqual(r1);
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la séance' }));
    expect(screen.getByRole('timer').textContent).toContain('REPOS MONTÉE EN CHARGE');

    // 2. Série de TRAVAIL validée ⇒ chrono = repos de travail, libellé « série de travail ».
    const work = [...section().querySelectorAll('.k-set')].find((x) => !x.classList.contains('warm')) as HTMLElement;
    validate(work, '8', '40');
    const r2 = log(storage)?.rest;
    expect(r2?.setKind).toBe('working');
    expect(`Repos séries de travail : ${clockOf(r2?.totalS ?? -1)}`).toBe(workTxt);
    expect(screen.getByRole('timer').textContent).toContain('REPOS SÉRIE DE TRAVAIL');
  });
});
