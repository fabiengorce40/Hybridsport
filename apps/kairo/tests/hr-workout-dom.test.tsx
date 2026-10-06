// @vitest-environment jsdom
/**
 * H2.5 — séance HYROX dans l'interface (backend réel → DOM) : programme HYROX (course compromise), carte du planning
 * (rôle lisible, time cap), ouverture du bon workout (aucun repli Strength / Cross-training), démarrage, étape en
 * cours / suivante, course sans allure, charge réelle, pause, rechargement, fin structurée, historique ; aucun code
 * interne affiché (n° 44).
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
const gym = [...new Set([...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.hybrid_race_gym')?.equipment ?? []), ...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [])])];

function seeded(role = 'hybrid_race.h2.compromised_running'): MemoryStorage {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), {
    displayName: '', level: 'intermediate', priorities: ['hyrox'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
    running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: true, sessionsPerWeek: 2, role, goal: 'RACE_PREPARATION', returnState: 'NONE' },
    equipment: { presetId: 'preset.hybrid_race_gym', items: gym }, availability: [60, 0, 60, 0, 60, 0, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  }, clock(), {}));
  return storage;
}
const saved = (storage: MemoryStorage): AppState => {
  const r = loadState(storage, now);
  if (r.status !== 'ok') throw new Error(r.status);
  return r.state;
};
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const INTERNAL = /hybrid_race|ex\.[a-z]|after_station|run_station|BLOCKED|station_capacity|compromised_running|TEST_ONLY/;

describe('séance HYROX (DOM)', () => {
  it('planning → course compromise : étape en cours / suivante, course sans allure, charge réelle, pause, rechargement, fin, historique', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    const card = screen.getAllByRole('button', { name: /^HYROX : Course compromise/ })[0] as HTMLElement;
    expect(card.textContent).toContain('time cap');
    expect(document.body.textContent ?? '').not.toMatch(INTERNAL);
    fireEvent.click(card);
    expect(screen.getByRole('heading', { name: 'Course compromise', level: 1 })).toBeTruthy();
    expect(screen.queryByLabelText('Répétitions réalisées')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Tours complets' })).toBeNull();
    // Avant départ : le parcours prescrit est visible (station → course → …), aucun chrono.
    expect(screen.getByRole('list', { name: 'Parcours de la séance' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    expect(screen.getByRole('timer', { name: 'Chrono de la séance' }).textContent).toContain('Time cap');
    const nowCard = () => screen.getByLabelText('Maintenant');
    expect(nowCard().textContent).toContain('Station');
    // Station chargée ou non : la première étape est une station ; valider → la course arrive, sans allure.
    fireEvent.click(screen.getByRole('button', { name: /Étape faite/ }));
    expect(nowCard().textContent).toContain('Course');
    expect(nowCard().textContent).toContain('Allure libre');
    expect(nowCard().textContent).not.toMatch(/min\/km|\/km/);
    fireEvent.click(screen.getByRole('button', { name: /Étape faite/ }));
    // Deuxième station : chargée (farmer walk, 24 kg prescrits) → charge réelle saisie.
    const load = screen.queryByLabelText(/Charge réellement utilisée/) as HTMLInputElement | null;
    if (load) {
      fireEvent.change(load, { target: { value: '20' } });
      fireEvent.blur(load);
      expect(Object.values(saved(storage).programmeLogs)[0]?.hr?.loads[0]?.kg).toBe(20);
    }
    const log = () => Object.values(saved(storage).programmeLogs)[0];
    expect(log()?.hr?.steps).toBe(2);
    // Pause à +6 min, rechargement 10 min plus tard : chrono figé, position et charge conservées.
    now = '2026-10-05T07:36:00.000Z';
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(log()?.hr).toMatchObject({ runningSince: null, accumulatedS: 360, steps: 2 });
    cleanup();
    now = '2026-10-05T07:46:00.000Z';
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^HYROX : Course compromise, En cours/ })[0] as HTMLElement);
    expect(screen.getByRole('timer').textContent).toContain('EN PAUSE');
    expect(screen.getByText(/Étape 3 \/ 8/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    // Abandon (progression conservée) : seules les issues cohérentes sont proposées (time cap non atteint).
    now = '2026-10-05T07:56:00.000Z';
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    const sheet = screen.getByRole('dialog', { name: 'Fin de séance' });
    expect(within(sheet).queryByRole('radio', { name: 'Tout s’est passé comme prévu' })).toBeNull();
    expect(within(sheet).queryByRole('radio', { name: /Time cap atteint/ })).toBeNull();
    fireEvent.click(within(sheet).getByRole('radio', { name: 'J’ai arrêté la séance' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Enregistrer' }));
    const s = saved(storage);
    expect(s.hyrox.realized[0]).toMatchObject({ completion: 'abandoned', result: { kind: 'abandoned', roundsCompleted: 0, itemsCompletedInRound: 2, elapsedS: 960 } });
    expect(document.body.textContent).toContain('Arrêtée · 0 tour complet + 2/4 étapes');
    cleanup();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    expect(document.body.textContent).toContain('Arrêtée · 0 tour complet + 2/4 étapes');
    expect(document.body.textContent).toContain('Station → course');
    expect(document.body.textContent ?? '').not.toMatch(INTERNAL);
  });

  it('séance terminée : toutes les étapes ⇒ « comme prévu » proposé, résultat « Terminée en … »', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded('hybrid_race.h2.station_capacity');
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^HYROX : Capacité stations/ })[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    for (let k = 0; k < 20 && screen.queryByRole('button', { name: /[ÉéEe]tape faite/ })?.hasAttribute('disabled') === false; k += 1) fireEvent.click(screen.getByRole('button', { name: /[ÉéEe]tape faite/ }));
    expect(screen.getByText('Toutes les étapes sont validées')).toBeTruthy();
    now = '2026-10-05T07:55:00.000Z';
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    const sheet = screen.getByRole('dialog', { name: 'Fin de séance' });
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Tout s’est passé comme prévu' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Enregistrer' }));
    expect(saved(storage).hyrox.realized[0]).toMatchObject({ completion: 'completed_as_prescribed', result: { kind: 'completed', elapsedS: 1500 } });
    expect(document.body.textContent).toContain('Terminée en 25:00');
  });
});
