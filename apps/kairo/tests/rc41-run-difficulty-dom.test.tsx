// @vitest-environment jsdom
/**
 * RC4.1 — feuille de fin de séance Course (jsdom, backend réel) : question « Difficulté ressentie » facultative à quatre
 * réponses, désélectionnable ; la réponse est enregistrée au contrat Running ; sans réponse, ressenti inconnu.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, loadState, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const fullGym = [...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [])];
const runner: ProfileInput = {
  displayName: '', level: 'intermediate', priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
  running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
  crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: fullGym, confirmedAt: '2026-10-04T10:00:00Z' },
  availability: [60, 0, 60, 0, 60, 90, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
};
const saved = (storage: MemoryStorage): AppState => {
  const r = loadState(storage, now);
  if (r.status !== 'ok') throw new Error(r.status);
  return r.state;
};
function finishEasy(answer: (sheet: ReturnType<typeof within>) => void): AppState {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), runner, clock(), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } }));
  render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
  fireEvent.click(screen.getAllByRole('button', { name: /Footing facile/ })[0] as HTMLElement);
  fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Avant de commencer' })).getByRole('button', { name: 'Passer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }));
  const sheet = within(screen.getByRole('dialog', { name: 'Fin de séance' }));
  fireEvent.click(sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }));
  fireEvent.change(sheet.getByLabelText(/Durée totale courue/), { target: { value: '30' } });
  answer(sheet);
  fireEvent.click(sheet.getByRole('button', { name: 'Enregistrer' }));
  return saved(storage);
}
const last = (s: AppState) => s.running.realized.filter((x) => !x.sessionId.startsWith('free:')).at(-1);

describe('RC4.1 — ressenti Course (DOM)', () => {
  it('quatre réponses proposées, facultatives ; choix modifiable et désélectionnable ; « Plus facile que prévu » enregistré EASIER', () => {
    const s = finishEasy((sheet) => {
      const group = within(sheet.getByRole('radiogroup', { name: 'Difficulté ressentie (facultatif)' }));
      expect(group.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Plus facile que prévu', 'Comme prévu', 'Plus difficile que prévu', 'Beaucoup plus difficile']);
      fireEvent.click(group.getByRole('radio', { name: 'Comme prévu' }));
      expect(group.getByRole('radio', { name: 'Comme prévu' }).getAttribute('aria-checked')).toBe('true');
      fireEvent.click(group.getByRole('radio', { name: 'Comme prévu' }));
      expect(group.getAllByRole('radio').every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
      fireEvent.click(group.getByRole('radio', { name: 'Plus facile que prévu' }));
    });
    expect(last(s)?.unexpectedDifficulty).toBe('EASIER');
  });

  it('question ignorée : séance enregistrée, ressenti inconnu', () => {
    const s = finishEasy(() => undefined);
    expect(last(s)?.unexpectedDifficulty).toBe('UNKNOWN');
    expect(s.programmeState?.results.length).toBe(1);
  });

  it('« Beaucoup plus difficile » enregistré MUCH_HARDER', () => {
    const s = finishEasy((sheet) => fireEvent.click(sheet.getByRole('radio', { name: 'Beaucoup plus difficile' })));
    expect(last(s)?.unexpectedDifficulty).toBe('MUCH_HARDER');
  });
});
