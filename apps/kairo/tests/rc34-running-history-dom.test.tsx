// @vitest-environment jsdom
/**
 * RC3.4 — historique Running (jsdom, backend réel) : corriger / supprimer une course libre (confirmation), douleur
 * déclarée ⇒ pause douleur existante, profil HYROX sans Course, date facultative de la dernière course (onboarding),
 * distinction « historique d'entraînement » / performance de référence.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, logFreeRun, MemoryStorage, saveState, selectFreeRuns, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const MONDAY = '2026-10-05';
const clock = (): Clock => ({ today: MONDAY, now: `${MONDAY}T07:30:00.000Z` });
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const saved = (storage: MemoryStorage): AppState => JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as AppState;
const fullGym = [...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [])];
const runner = (o: Partial<ProfileInput> = {}): ProfileInput => ({
  displayName: '', level: 'intermediate', priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
  running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
  crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: fullGym, confirmedAt: '2026-10-04T10:00:00Z' },
  availability: [60, 0, 60, 0, 60, 90, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z', ...o,
});
const ID = 'free:2026-10-03T08:30:00Z';
function seeded(p = runner()): MemoryStorage {
  const storage = new MemoryStorage();
  const s = createBeta0Programme(emptyState(), p, clock(), p.running.enabled ? { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } } : {});
  saveState(storage, logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, distanceM: 5000, startedAt: '2026-10-03T08:00:00Z', note: 'Parc' }, clock()));
  return storage;
}
const card = (id = ID) => document.querySelector(`[data-free-run="${id}"]`) as HTMLElement | null;
const toHistory = () => fireEvent.click(screen.getByRole('button', { name: 'Historique' }));

describe('RC3.4 — corriger / supprimer', () => {
  it('corriger : formulaire prérempli ; nouvelle durée ⇒ allure recalculée ; une seule carte ; distinction historique / référence affichée', () => {
    const storage = seeded();
    mount(storage);
    toHistory();
    expect(card()?.textContent).toMatch(/Historique d’entraînement \(pas une performance de référence\)/);
    fireEvent.click(within(card() as HTMLElement).getByRole('button', { name: /^Corriger la course/ }));
    const form = within(screen.getByRole('form', { name: 'Corriger la course' }));
    expect((form.getByLabelText('Distance (km)') as HTMLInputElement).value).toBe('5');
    expect((form.getByLabelText('Durée : minutes') as HTMLInputElement).value).toBe('30');
    expect((form.getByLabelText('Commentaire (facultatif)') as HTMLTextAreaElement).value).toBe('Parc');
    expect(document.querySelector('[data-free-run-reference-note]')?.textContent).toMatch(/jamais utilisée comme performance de référence/);
    fireEvent.change(form.getByLabelText('Durée : minutes'), { target: { value: '25' } });
    fireEvent.click(form.getByRole('button', { name: 'Enregistrer la correction' }));
    const runs = selectFreeRuns(saved(storage)).filter((r) => r.note === 'Parc');
    expect(runs).toEqual([expect.objectContaining({ sessionId: 'free:2026-10-03T08:25:00Z', durationS: 1500, paceSecPerKm: 300 })]);
    expect(card('free:2026-10-03T08:25:00Z')?.textContent).toMatch(/25 min · 5\.0 km · 5:00 \/km/);
    expect(card()).toBeNull();
  });

  it('supprimer : confirmation explicite ; Annuler conserve ; Supprimer retire la course et son commentaire', () => {
    const storage = seeded();
    mount(storage);
    toHistory();
    fireEvent.click(within(card() as HTMLElement).getByRole('button', { name: /^Supprimer la course/ }));
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer cette course' });
    expect(dialog.textContent).toMatch(/Les séances déjà prévues ne changent pas/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(card()).not.toBeNull();
    fireEvent.click(within(card() as HTMLElement).getByRole('button', { name: /^Supprimer la course/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));
    expect(card()).toBeNull();
    expect(selectFreeRuns(saved(storage)).some((r) => r.sessionId === ID)).toBe(false);
    expect(saved(storage).running.notes).toBeUndefined();
  });
});

describe('RC3.4 — douleur, HYROX, date de la dernière course', () => {
  it('douleur déclarée avec une course ⇒ pause douleur existante (zones conservées), visible à l’accueil', () => {
    const storage = seeded();
    mount(storage);
    toHistory();
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une course' }));
    const f = within(screen.getByRole('form', { name: 'Ajouter une course' }));
    fireEvent.change(f.getByLabelText('Date'), { target: { value: '2026-10-04' } });
    fireEvent.change(f.getByLabelText('Heure de départ'), { target: { value: '08:00' } });
    fireEvent.change(f.getByLabelText('Durée : minutes'), { target: { value: '30' } });
    fireEvent.change(f.getByLabelText('Ressenti'), { target: { value: 'HARDER' } });
    fireEvent.click(f.getByLabelText('Douleur pendant ou après cette course'));
    expect(screen.getByText(/met la planification en pause/)).toBeTruthy();
    fireEvent.click(f.getByRole('button', { name: 'Genou' }));
    fireEvent.click(f.getByRole('button', { name: 'Enregistrer la course' }));
    expect(saved(storage).safety.activePain).toMatchObject({ areas: ['knee'] });
    fireEvent.click(screen.getByRole('button', { name: 'Accueil' }));
    expect(screen.getByText(/La planification automatique est suspendue car une douleur a été signalée/)).toBeTruthy();
  });

  it('profil HYROX sans Course : entrée disponible, avertissement « sans effet sur vos séances HYROX », course enregistrée', () => {
    const p = runner({ priorities: ['hyrox'], running: { ...runner().running, enabled: false }, hyrox: { enabled: true, sessionsPerWeek: 2, focus: 'balanced', goal: 'RACE_PREPARATION', returnState: 'NONE' } as ProfileInput['hyrox'],
      equipment: { presetId: 'preset.hybrid_race_gym', items: [...(EQUIPMENT_PRESETS.find((x) => x.id === 'preset.hybrid_race_gym')?.equipment ?? []), ...fullGym], confirmedAt: '2026-10-04T10:00:00Z' } });
    const storage = new MemoryStorage();
    saveState(storage, createBeta0Programme(emptyState(), p, clock(), {}));
    const weeks = saved(storage).planner.weeks;
    mount(storage);
    toHistory();
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une course' }));
    expect(document.querySelector('[data-free-run-no-running]')?.textContent).toMatch(/sans effet sur vos séances HYROX/);
    const f = within(screen.getByRole('form', { name: 'Ajouter une course' }));
    fireEvent.change(f.getByLabelText('Date'), { target: { value: '2026-10-04' } });
    fireEvent.change(f.getByLabelText('Heure de départ'), { target: { value: '08:00' } });
    fireEvent.change(f.getByLabelText('Durée : minutes'), { target: { value: '40' } });
    fireEvent.change(f.getByLabelText('Distance (km)'), { target: { value: '8' } });
    fireEvent.change(f.getByLabelText('Ressenti'), { target: { value: 'AS_EXPECTED' } });
    fireEvent.click(f.getByRole('button', { name: 'Enregistrer la course' }));
    expect(selectFreeRuns(saved(storage))).toHaveLength(1);
    expect(saved(storage).planner.weeks).toEqual(weeks);
  });

  it('onboarding : date facultative de la dernière course ⇒ historique à cette date, « heure non renseignée » ; corrigeable sans heure', () => {
    const storage = new MemoryStorage();
    mount(storage);
    fireEvent.click(screen.getByLabelText(/J’ai compris/));
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    fireEvent.click(screen.getByRole('radio', { name: /^Course Footing/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.change(screen.getByLabelText('Durée (min)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Date de cette course (facultatif)'), { target: { value: '2026-10-08' } });
    expect((screen.getByRole('button', { name: 'Continuer' }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('[data-next-blockers]')?.textContent).toMatch(/la date ne peut pas être dans le futur/);
    fireEvent.change(screen.getByLabelText('Date de cette course (facultatif)'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon programme' }));
    const r = selectFreeRuns(saved(storage))[0];
    expect(r).toMatchObject({ completedAt: '2026-10-01T12:00:00Z', timeKnown: false });
    toHistory();
    expect(card(r?.sessionId)?.textContent).toMatch(/Course libre · .*1 octobre · heure non renseignée/);
    fireEvent.click(within(card(r?.sessionId) as HTMLElement).getByRole('button', { name: /^Corriger la course/ }));
    const f = within(screen.getByRole('form', { name: 'Corriger la course' }));
    expect(screen.getByText('Heure inconnue : seule la date est enregistrée.')).toBeTruthy();
    fireEvent.change(f.getByLabelText('Durée : minutes'), { target: { value: '35' } });
    fireEvent.click(f.getByRole('button', { name: 'Enregistrer la correction' }));
    expect(selectFreeRuns(saved(storage))[0]).toMatchObject({ completedAt: '2026-10-01T12:00:00Z', durationS: 2100, timeKnown: false });
  });
});
