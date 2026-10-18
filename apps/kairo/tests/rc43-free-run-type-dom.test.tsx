// @vitest-environment jsdom
/**
 * RC4.3 — courses libres (jsdom, backend réel) : type facultatif (« Non précisé » par défaut, facile, longue, qualité
 * avec sous-type obligatoire) et sa modification, avertissement « même jour » (annuler / confirmer, aucune fusion),
 * course d'onboarding sans date réelle (date laissée vide), saisie sans sport Course.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, finishProgrammeSession, logFreeRun, MemoryStorage, saveState, selectBeta0Week, selectFreeRuns, startProgrammeSession, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const MONDAY = '2026-10-05';
const clock = (): Clock => ({ today: MONDAY, now: `${MONDAY}T19:30:00.000Z` });
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const saved = (storage: MemoryStorage): AppState => JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as AppState;
const fullGym = [...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [])];
const runner = (o: Partial<ProfileInput> = {}): ProfileInput => ({
  displayName: '', level: 'intermediate', priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
  running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
  crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: fullGym, confirmedAt: '2026-10-04T10:00:00Z' },
  availability: [60, 0, 60, 0, 60, 90, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z', ...o,
});
const toHistory = () => fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
const openForm = () => { fireEvent.click(screen.getByRole('button', { name: 'Ajouter une course' })); return within(screen.getByRole('form', { name: 'Ajouter une course' })); };
const fill = (f: ReturnType<typeof openForm>, o: { date?: string; time?: string; minutes?: string } = {}) => {
  fireEvent.change(f.getByLabelText('Date'), { target: { value: o.date ?? '2026-10-03' } });
  fireEvent.change(f.getByLabelText('Heure de départ (facultative)'), { target: { value: o.time ?? '08:00' } });
  fireEvent.change(f.getByLabelText('Durée : minutes'), { target: { value: o.minutes ?? '50' } });
  fireEvent.change(f.getByLabelText('Ressenti'), { target: { value: 'AS_EXPECTED' } });
};
function seeded(p = runner(), lastRunDate?: string): MemoryStorage {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), p, clock(), p.running.enabled ? { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', ...(lastRunDate ? { date: lastRunDate } : {}) } } : {}));
  return storage;
}

describe('RC4.3 — type de course', () => {
  it('« Non précisé » par défaut ; qualité ⇒ sous-type obligatoire ; types enregistrés et affichés ; modification du type', () => {
    const storage = seeded();
    mount(storage);
    toHistory();
    let f = openForm();
    fill(f);
    expect(f.getByRole('radio', { name: 'Non précisé' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(f.getByRole('radio', { name: 'Séance de qualité' }));
    expect(document.querySelector('[data-free-run-blockers]')?.textContent).toMatch(/Précisez la séance de qualité/);
    fireEvent.click(f.getByRole('radio', { name: 'Côtes' }));
    fireEvent.click(f.getByRole('button', { name: 'Enregistrer la course' }));
    const id = 'free:2026-10-03T08:50:00Z';
    expect(saved(storage).running.freeRunMeta?.[id]).toEqual({ type: 'hills' });
    const card = () => document.querySelector(`[data-free-run="${id}"]`) as HTMLElement;
    expect(card().querySelector('[data-free-run-type-label]')?.textContent).toBe('Type : Qualité · côtes');
    // Correction : « Sortie longue », puis « Non précisé » (métadonnée retirée, aucune intensité supposée).
    fireEvent.click(within(card()).getByRole('button', { name: /^Corriger la course/ }));
    f = within(screen.getByRole('form', { name: 'Corriger la course' }));
    expect(f.getByRole('radio', { name: 'Côtes' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(f.getByRole('radio', { name: 'Sortie longue' }));
    fireEvent.click(f.getByRole('button', { name: 'Enregistrer la correction' }));
    expect(saved(storage).running.freeRunMeta?.[id]).toEqual({ type: 'long' });
    fireEvent.click(within(card()).getByRole('button', { name: /^Corriger la course/ }));
    f = within(screen.getByRole('form', { name: 'Corriger la course' }));
    fireEvent.click(f.getByRole('radio', { name: 'Non précisé' }));
    fireEvent.click(f.getByRole('button', { name: 'Enregistrer la correction' }));
    expect(saved(storage).running.freeRunMeta?.[id]).toBeUndefined();
    expect(card().querySelector('[data-free-run-type-label]')?.textContent).toBe('Type : non précisé');
  });

  it('facile : enregistré tel quel ; suppression ⇒ métadonnées retirées', () => {
    const storage = seeded(runner(), '2026-10-01');
    mount(storage);
    toHistory();
    const f = openForm();
    fill(f);
    fireEvent.click(f.getByRole('radio', { name: 'Footing facile' }));
    fireEvent.click(f.getByRole('button', { name: 'Enregistrer la course' }));
    const id = 'free:2026-10-03T08:50:00Z';
    expect(saved(storage).running.freeRunMeta).toEqual({ [id]: { type: 'easy' } });
    const card = document.querySelector(`[data-free-run="${id}"]`) as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: /^Supprimer la course/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));
    expect(saved(storage).running.freeRunMeta).toBeUndefined();
  });
});

describe('RC4.3 — même jour, date inconnue, sans sport Course', () => {
  it('même jour qu’une course du programme réalisée, sans heure : avertissement ; Annuler ferme ; Confirmer enregistre une activité supplémentaire', () => {
    const storage = new MemoryStorage();
    let s = createBeta0Programme(emptyState(), runner(), { today: MONDAY, now: `${MONDAY}T07:00:00Z` }, { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', date: '2026-10-01' } });
    const v = (selectBeta0Week(s, MONDAY)?.sessions ?? []).find((x) => x.sport === 'running' && x.date === MONDAY);
    if (!v) throw new Error('course du lundi attendue');
    s = startProgrammeSession(s, { today: MONDAY, now: `${MONDAY}T07:05:00Z` }, v.requestId, undefined, { painAnswer: 'no' });
    s = finishProgrammeSession(s, { today: MONDAY, now: `${MONDAY}T08:00:00Z` }, { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800, distanceM: 5000, ...(v.archetypeId === 'running.test' ? { testTimeS: 1500 } : {}) } });
    saveState(storage, s);
    const n = s.running.realized.length;
    mount(storage);
    toHistory();
    let f = openForm();
    fill(f, { date: MONDAY, time: '' });
    const warn = screen.getByRole('alertdialog', { name: 'Course du programme le même jour' });
    expect(warn.textContent).toMatch(/jamais fusionnée automatiquement/);
    expect((f.getByRole('button', { name: 'Enregistrer la course' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(warn).getByRole('button', { name: 'Annuler la saisie' }));
    expect(screen.queryByRole('form', { name: 'Ajouter une course' })).toBeNull();
    expect(saved(storage).running.realized.length).toBe(n);
    f = openForm();
    fill(f, { date: MONDAY, time: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer une activité supplémentaire' }));
    fireEvent.click(f.getByRole('button', { name: 'Enregistrer la course' }));
    expect(saved(storage).running.realized.length).toBe(n + 1);
  });

  it('course d’onboarding sans date : « date non renseignée » ; correction en laissant la date vide ⇒ date toujours inconnue', () => {
    const storage = seeded();
    mount(storage);
    toHistory();
    const r = selectFreeRuns(saved(storage))[0];
    if (!r) throw new Error('course d’onboarding attendue');
    const card = () => document.querySelector(`[data-free-run="${r.sessionId}"]`) as HTMLElement;
    expect(card().textContent).toMatch(/date non renseignée \(déclarée à l’inscription\)/);
    fireEvent.click(within(card()).getByRole('button', { name: /^Corriger la course/ }));
    const f = within(screen.getByRole('form', { name: 'Corriger la course' }));
    expect((f.getByLabelText('Date') as HTMLInputElement).value).toBe('');
    expect(document.querySelector('[data-free-run-date-unknown]')).not.toBeNull();
    fireEvent.click(f.getByRole('radio', { name: 'Footing facile' }));
    fireEvent.click(f.getByRole('button', { name: 'Enregistrer la correction' }));
    expect(saved(storage).running.freeRunMeta?.[r.sessionId]).toEqual({ type: 'easy', dateUnknown: true });
    expect(saved(storage).running.realized.find((x) => x.sessionId === r.sessionId)?.completedAt).toBe(r.completedAt);
  });

  it('profil sans sport Course : saisie possible ; la course compte dans la récupération (texte explicite)', () => {
    const storage = seeded(runner({ priorities: ['strength'], strength: { enabled: true, goal: 'general', sessionsPerWeek: 2 }, running: { ...runner().running, enabled: false } }));
    mount(storage);
    toHistory();
    openForm();
    expect(document.querySelector('[data-free-run-no-running]')?.textContent).toMatch(/compte dans la récupération de vos autres séances/);
  });
});

void logFreeRun;
