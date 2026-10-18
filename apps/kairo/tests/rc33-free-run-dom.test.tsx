// @vitest-environment jsdom
/**
 * RC3.3 — « Ajouter une course » (jsdom, backend réel) : saisie depuis l'Historique et le profil Course, allure calculée,
 * refus expliqués (bouton désactivé, toast), doublon refusé, conservation après rechargement, TEST possible ensuite.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, MemoryStorage, saveState, selectBeta0Week, selectFreeRuns, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const MONDAY = '2026-10-05';
const clock = (): Clock => ({ today: MONDAY, now: `${MONDAY}T07:30:00.000Z` });
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const saved = (storage: MemoryStorage): AppState => JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as AppState;
const fullGym = [...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [])];
const base = (o: Partial<ProfileInput> = {}): ProfileInput => ({
  displayName: '', level: 'intermediate', priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
  running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
  crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: fullGym, confirmedAt: '2026-10-04T10:00:00Z' },
  availability: [60, 0, 60, 0, 60, 90, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z', ...o,
});
function seeded(p = base()): MemoryStorage {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), p, clock(), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } }));
  return storage;
}
const form = () => within(screen.getByRole('form', { name: 'Ajouter une course' }));
function fill(o: { date?: string; time?: string; km?: string; h?: string; m?: string; s?: string; feel?: string; note?: string }) {
  const f = form();
  if (o.date !== undefined) fireEvent.change(f.getByLabelText('Date'), { target: { value: o.date } });
  if (o.time !== undefined) fireEvent.change(f.getByLabelText('Heure de départ (facultative)'), { target: { value: o.time } });
  if (o.km !== undefined) fireEvent.change(f.getByLabelText('Distance (km)'), { target: { value: o.km } });
  if (o.h !== undefined) fireEvent.change(f.getByLabelText('Durée : heures'), { target: { value: o.h } });
  if (o.m !== undefined) fireEvent.change(f.getByLabelText('Durée : minutes'), { target: { value: o.m } });
  if (o.s !== undefined) fireEvent.change(f.getByLabelText('Durée : secondes'), { target: { value: o.s } });
  if (o.feel !== undefined) fireEvent.change(f.getByLabelText('Ressenti'), { target: { value: o.feel } });
  if (o.note !== undefined) fireEvent.change(f.getByLabelText('Commentaire (facultatif)'), { target: { value: o.note } });
}
const save = () => form().getByRole('button', { name: 'Enregistrer la course' }) as HTMLButtonElement;
const VALID = { date: '2026-10-03', time: '08:00', km: '5', h: '0', m: '30', s: '0', feel: 'AS_EXPECTED' };

describe('RC3.3 — Ajouter une course', () => {
  it('Historique : formulaire expliqué tant qu’il est incomplet ; allure calculée ; enregistrée, affichée, conservée après rechargement', () => {
    const storage = seeded();
    const view = mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une course' }));
    expect(save().disabled).toBe(true);
    const blockers = () => document.querySelector('[data-free-run-blockers]')?.textContent ?? '';
    // RC4.3 : l'heure est facultative (date du jour préremplie) ; la date seule suffit.
    expect(blockers()).not.toMatch(/Indiquez la date/);
    expect(blockers()).toMatch(/Indiquez la durée/);
    expect(blockers()).toMatch(/Choisissez votre ressenti/);
    fill({ ...VALID, note: 'Bords de Seine' });
    expect(document.querySelector('[data-free-run-pace]')?.textContent).toMatch(/Allure moyenne : 6:00 \/km/);
    expect(save().disabled).toBe(false);
    fireEvent.click(save());
    expect(document.querySelector('[data-free-run-saved]')?.textContent).toMatch(/Course enregistrée : 30 min · 5\.0 km · 6:00 \/km/);
    const free = selectFreeRuns(saved(storage)).filter((r) => r.distanceM !== null);
    expect(free).toHaveLength(1);
    expect(free[0]).toMatchObject({ durationS: 1800, distanceM: 5000, paceSecPerKm: 360, difficulty: 'AS_EXPECTED', note: 'Bords de Seine' });
    const card = () => document.querySelector(`[data-free-run="${free[0]?.sessionId ?? ''}"]`);
    expect(card()?.textContent).toMatch(/Course libre .*30 min · 5\.0 km · 6:00 \/km.*Ressenti : Comme prévu.*« Bords de Seine »/);
    // Rechargement de l'application : la course est toujours là, une seule fois.
    view.unmount();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    expect(card()).not.toBeNull();
    expect(document.querySelectorAll(`[data-free-run="${free[0]?.sessionId ?? ''}"]`)).toHaveLength(1);
  });

  it('refus : distance nulle (bouton désactivé, raison affichée) ; même course ressaisie ou course à venir ⇒ message, rien enregistré', () => {
    const storage = seeded();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une course' }));
    fill({ ...VALID, km: '0' });
    expect(save().disabled).toBe(true);
    expect(document.querySelector('[data-free-run-blockers]')?.textContent).toMatch(/Distance invalide/);
    fill({ km: '5' });
    fireEvent.click(save());
    const n = saved(storage).running.realized.length;
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une course' }));
    fill(VALID);
    fireEvent.click(save());
    expect(screen.getByText(/Cette course est déjà enregistrée/)).toBeTruthy();
    expect(saved(storage).running.realized.length).toBe(n);
    fill({ date: MONDAY, time: '23:00' });
    fireEvent.click(save());
    expect(screen.getByText(/Cette course se terminerait dans le futur/)).toBeTruthy();
    expect(saved(storage).running.realized.length).toBe(n);
  });

  it('profil Course : course avec distance ⇒ « programmer un test » programme le TEST ; aucune séance déjà prévue modifiée par la saisie', () => {
    const storage = seeded();
    mount(storage);
    const before = saved(storage).planner.weeks;
    fireEvent.click(screen.getByRole('button', { name: 'Réglages' }));
    fireEvent.click(screen.getByRole('button', { name: /^Profil Course/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une course' }));
    fill(VALID);
    fireEvent.click(save());
    expect(saved(storage).planner.weeks).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: /programmer un test/ }));
    expect((selectBeta0Week(saved(storage), MONDAY)?.sessions ?? []).some((x) => x.archetypeId === 'running.test' && x.status === 'planned')).toBe(true);
  });

  // RC4.3 (R3) : une course libre compte dans la récupération même sans sport Course — l'entrée est désormais proposée.
  it('profil sans course (Musculation seule) : entrée « Ajouter une course » proposée dans l’Historique (RC4.3)', () => {
    const storage = new MemoryStorage();
    saveState(storage, createBeta0Programme(emptyState(), base({ priorities: ['strength'], strength: { enabled: true, goal: 'general', sessionsPerWeek: 2 }, running: { ...base().running, enabled: false } }), clock(), {}));
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    expect(screen.queryByRole('button', { name: 'Ajouter une course' })).not.toBeNull();
  });
});
