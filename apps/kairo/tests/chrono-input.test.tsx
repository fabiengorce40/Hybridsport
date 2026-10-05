// @vitest-environment jsdom
/**
 * Saisie mobile d'un chrono Running : composants h / min / s au clavier numérique (aucun « : » à taper), assemblage
 * exact en secondes pour le contrat Running existant, refus EXPLIQUÉS, ajout visible, persistance.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, MemoryStorage, saveState, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { durationFromParts, formatChrono } from '../src/running/duration.js';

afterEach(cleanup);
const MONDAY = '2026-10-05';
const clock = (): Clock => ({ today: MONDAY, now: `${MONDAY}T07:30:00.000Z` });
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
const saved = (s: MemoryStorage): AppState => JSON.parse(s.getItem(STORAGE_KEY) ?? '{}') as AppState;

describe('assemblage des composants (h, min, s)', () => {
  it.each([
    ['5 km 20:30', { h: '', m: '20', s: '30' }, false, 1230],
    ['10 km 45:00', { h: '', m: '45', s: '00' }, true, 2700],
    ['10 km 43:27', { h: '0', m: '43', s: '27' }, true, 2607],
    ['semi 1:35:20', { h: '1', m: '35', s: '20' }, true, 5720],
    ['marathon 3:30:00', { h: '3', m: '30', s: '00' }, true, 12600],
    ['sans heures : 75 min', { h: '', m: '75', s: '0' }, false, 4500],
  ])('%s ⇒ %d s', (_, p, withHours, seconds) => {
    expect(durationFromParts(p, withHours)).toEqual({ ok: true, seconds });
  });
  it('45 min + 00 s correspond exactement à 45:00 ; affichage réciproque', () => {
    const r = durationFromParts({ h: '', m: '45', s: '00' }, true);
    expect(r.ok && formatChrono(r.seconds)).toBe('45:00');
    expect(formatChrono(5720)).toBe('1:35:20');
  });
  it.each([
    ['secondes = 60', { h: '', m: '45', s: '60' }, true, 'Les secondes vont de 0 à 59.'],
    ['champ vide', { h: '', m: '', s: '' }, true, 'Indiquez le chrono.'],
    ['minutes = 60 avec heures', { h: '1', m: '60', s: '00' }, true, 'Les minutes vont de 0 à 59 (utilisez le champ heures).'],
    ['durée nulle', { h: '0', m: '0', s: '0' }, true, 'Le chrono doit être supérieur à zéro.'],
  ])('%s ⇒ refus expliqué', (_, p, withHours, error) => {
    expect(durationFromParts(p, withHours, 'le chrono')).toEqual({ ok: false, error });
  });
});

describe('Profil Course : ajout d’une performance au clavier numérique', () => {
  function mountRunner(storage: MemoryStorage) {
    const p: ProfileInput = {
      displayName: '', level: 'intermediate', priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
      running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: true, sessionsPerWeek: 3, returnState: 'NONE' },
      crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
      availability: [60, 0, 60, 0, 60, 90, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
    };
    saveState(storage, createBeta0Programme(emptyState(), p, clock(), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } }));
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Réglages' }));
    fireEvent.click(screen.getByRole('button', { name: /^Profil Course/ }));
  }
  const openForm = () => { fireEvent.click(screen.getByRole('button', { name: 'Ajouter une performance' })); return within(screen.getByLabelText('Ajouter une performance')); };
  function add(distance: string, chrono: { h?: string; m: string; s: string }) {
    const f = openForm();
    fireEvent.click(f.getByRole('radio', { name: /^Chrono personnel/ }));
    fireEvent.click(f.getByRole('radio', { name: distance }));
    if (chrono.h !== undefined) fireEvent.change(f.getByLabelText('Chrono : heures'), { target: { value: chrono.h } });
    fireEvent.change(f.getByLabelText('Chrono : minutes'), { target: { value: chrono.m } });
    fireEvent.change(f.getByLabelText('Chrono : secondes'), { target: { value: chrono.s } });
    fireEvent.change(f.getByLabelText('Date de réalisation'), { target: { value: '2026-09-27' } });
    fireEvent.click(f.getByRole('button', { name: 'Ajouter cette performance' }));
  }

  it('clavier numérique mobile : composants séparés, aucun « : » requis ; heures proposées dès 10 km', () => {
    mountRunner(new MemoryStorage());
    const f = openForm();
    fireEvent.click(f.getByRole('radio', { name: '5 km' }));
    expect(f.queryByLabelText('Chrono : heures')).toBeNull();
    for (const label of ['Chrono : minutes', 'Chrono : secondes']) {
      const input = f.getByLabelText(label) as HTMLInputElement;
      expect([input.type, input.inputMode, input.pattern]).toEqual(['text', 'numeric', '[0-9]*']);
      fireEvent.change(input, { target: { value: '4:5' } });
      expect(input.value).toBe('45');
    }
    fireEvent.click(f.getByRole('radio', { name: '10 km' }));
    expect((f.getByLabelText('Chrono : heures') as HTMLInputElement).inputMode).toBe('numeric');
    expect(screen.queryAllByPlaceholderText(/:/)).toEqual([]);
  });

  it('5 km 20:30, 10 km 45:00, 10 km 43:27, semi 1:35:20, marathon 3:30:00 : valeurs exactes au contrat, ajout visible et immédiat', () => {
    const storage = new MemoryStorage();
    mountRunner(storage);
    add('5 km', { m: '20', s: '30' });
    expect(screen.getByRole('status').textContent).toBe('Performance ajoutée : chrono 5 km en 20:30.');
    add('10 km', { m: '45', s: '00' });
    expect(screen.getByRole('status').textContent).toBe('Performance ajoutée : chrono 10 km en 45:00.');
    add('10 km', { h: '0', m: '43', s: '27' });
    add('Semi', { h: '1', m: '35', s: '20' });
    add('Marathon', { h: '3', m: '30', s: '00' });
    expect(saved(storage).running.references.map((r) => [r.values.distanceM, r.values.durationS])).toEqual([[5000, 1230], [10000, 2700], [10000, 2607], [21097.5, 5720], [42195, 12600]]);
    const rows = screen.getAllByLabelText(/^Chrono du/).map((e) => e.textContent ?? '');
    expect(rows).toHaveLength(5);
    for (const shown of ['20:30', '45:00', '43:27', '1:35:20', '3:30:00']) expect(rows.some((t) => t.includes(shown))).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('Performance ajoutée : chrono Marathon en 3:30:00.');
  });

  it('secondes = 60 ⇒ refus expliqué, rien n’est ajouté ; champ vide ⇒ refus expliqué ; date manquante ⇒ refus expliqué', () => {
    const storage = new MemoryStorage();
    mountRunner(storage);
    const f = openForm();
    fireEvent.click(f.getByRole('radio', { name: '10 km' }));
    fireEvent.click(f.getByRole('button', { name: 'Ajouter cette performance' }));
    expect(f.getByText('Indiquez le chrono.')).toBeTruthy();
    expect(f.getByText('Indiquez la date de réalisation.')).toBeTruthy();
    fireEvent.change(f.getByLabelText('Chrono : minutes'), { target: { value: '45' } });
    fireEvent.change(f.getByLabelText('Chrono : secondes'), { target: { value: '60' } });
    fireEvent.change(f.getByLabelText('Date de réalisation'), { target: { value: '2026-09-27' } });
    fireEvent.click(f.getByRole('button', { name: 'Ajouter cette performance' }));
    expect(f.getByText('Les secondes vont de 0 à 59.')).toBeTruthy();
    expect(saved(storage).running.references).toEqual([]);
    fireEvent.change(f.getByLabelText('Chrono : secondes'), { target: { value: '00' } });
    fireEvent.click(f.getByRole('button', { name: 'Ajouter cette performance' }));
    expect(saved(storage).running.references.map((r) => r.values.durationS)).toEqual([2700]);
  });

  it('persistance : la référence saisie est conservée après rechargement', () => {
    const storage = new MemoryStorage();
    mountRunner(storage);
    add('10 km', { m: '45', s: '00' });
    cleanup();
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Réglages' }));
    fireEvent.click(screen.getByRole('button', { name: /^Profil Course/ }));
    expect(screen.getByLabelText(/^Chrono du/).textContent).toMatch(/10 km.*45:00/);
  });
});
