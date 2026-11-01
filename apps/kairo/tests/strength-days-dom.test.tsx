// @vitest-environment jsdom
/**
 * Reprise 3A — jours Musculation définis APRÈS les disponibilités générales (défaut V2.1 corrigé : ils étaient figés à
 * l'étape Objectifs, d'après les disponibilités PAR DÉFAUT, et jamais resynchronisés). Proposition initiale = tous les
 * jours disponibles ; une préférence explicite n'est jamais modifiée sans action ; fréquence impossible expliquée.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, defaultStrengthPersonalization, emptyState, EQUIPMENT_PRESETS, MemoryStorage, saveState, STORAGE_KEY, withStrengthPersonalization } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { StrengthProfileScreen } from '../src/strength/StrengthProfile.js';
import { completeStrengthCustomization } from './strength-onboarding.js';

afterEach(cleanup);
const MONDAY = '2026-10-05';
const clock = (): Clock => ({ today: MONDAY, now: `${MONDAY}T07:30:00.000Z` });
const mount = (storage = new MemoryStorage()) => { render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>); return storage; };
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const saved = (s: MemoryStorage): AppState => JSON.parse(s.getItem(STORAGE_KEY) ?? '{}') as AppState;
const daysGroup = () => screen.getByRole('group', { name: 'Jours possibles pour la musculation' });
const checkedDays = () => within(daysGroup()).getAllByRole('checkbox').flatMap((b, i) => ((b as HTMLInputElement).checked ? [i] : []));
const setMinutes = (day: string, value: string) => fireEvent.change(screen.getByLabelText(`Temps disponible le ${day}`), { target: { value } });
const next = () => screen.getByRole('button', { name: 'Continuer' });

/** Onboarding Musculation seule jusqu'à l'étape « Disponibilités ». */
function toAvailability(frequency?: number) {
  const storage = mount();
  fireEvent.click(screen.getByLabelText(/J’ai compris/));
  click('Commencer');
  fireEvent.click(screen.getByRole('radio', { name: /^Musculation Séances/ }));
  click('Continuer');
  completeStrengthCustomization(frequency ? { frequency } : {});
  click('Continuer');
  return storage;
}

describe('Reprise 3A — jours Musculation après les disponibilités', () => {
  it('assistant : plus de choix de jours avant les disponibilités ; ils viennent après la grille générale', () => {
    mount();
    fireEvent.click(screen.getByLabelText(/J’ai compris/));
    click('Commencer');
    fireEvent.click(screen.getByRole('radio', { name: /^Musculation Séances/ }));
    click('Continuer');
    click('Me tonifier et me remettre en forme');
    click('Suivant · Musculation');
    click('Suivant · Musculation');
    click('Suivant · Musculation');
    expect(screen.queryByRole('group', { name: 'Jours possibles pour la musculation' })).toBeNull();
    expect(document.querySelector('[data-strength-days-later]')).not.toBeNull();
    cleanup();
    toAvailability();
    const grid = screen.getByLabelText('Temps disponible le Lundi');
    // Ordre du document : disponibilités générales, puis jours Musculation.
    expect(grid.compareDocumentPosition(daysGroup()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('proposition initiale = tous les jours disponibles, suivie tant que rien n’est choisi', () => {
    toAvailability();
    // Disponibilités par défaut : lundi, mercredi, vendredi, samedi.
    expect(checkedDays()).toEqual([0, 2, 4, 5]);
    expect(document.querySelector('[data-strength-days-proposal]')).not.toBeNull();
    setMinutes('Mardi', '60');
    expect(checkedDays()).toEqual([0, 1, 2, 4, 5]);
    // Jour indisponible : non sélectionnable.
    expect((within(daysGroup()).getByLabelText('Dimanche') as HTMLInputElement).disabled).toBe(true);
  });

  it('préférence choisie puis disponibilité retirée : signalée, conservée jusqu’à l’accord, puis corrigée', () => {
    const storage = toAvailability();
    fireEvent.click(within(daysGroup()).getByLabelText('Samedi'));
    expect(checkedDays()).toEqual([0, 2, 4]);
    expect(document.querySelector('[data-strength-days-proposal]')).toBeNull();
    setMinutes('Lundi', '0');
    // Jamais retiré en silence : Lundi reste choisi, l'incompatibilité est signalée et bloque la suite.
    expect(checkedDays()).toEqual([0, 2, 4]);
    expect(screen.getByText(/Lundi était choisi pour la Musculation mais n’est plus disponible/)).toBeTruthy();
    expect(next()).toHaveProperty('disabled', true);
    expect(screen.getByText(/Lundi n’est plus disponible ; confirmez son retrait/)).toBeTruthy();
    // Nouveaux jours disponibles : jamais ajoutés d'office.
    setMinutes('Mardi', '60');
    expect(checkedDays()).toEqual([0, 2, 4]);
    click('Retirer Lundi des jours Musculation');
    expect(checkedDays()).toEqual([2, 4]);
    expect(next()).toHaveProperty('disabled', false);
    click('Continuer');
    click('Créer mon programme');
    expect(saved(storage).profile?.strength.personalization?.days).toEqual([2, 4]);
  });

  it('fréquence impossible : moins de jours que de séances ⇒ expliqué et bloquant', () => {
    toAvailability(3);
    for (const d of ['Samedi', 'Vendredi']) fireEvent.click(within(daysGroup()).getByLabelText(d));
    expect(checkedDays()).toEqual([0, 2]);
    expect(screen.getByText(/3 séances Musculation demandées, mais 2 jours Musculation choisis/)).toBeTruthy();
    expect(next()).toHaveProperty('disabled', true);
  });

  it('récupération : jours consécutifs ⇒ nombre de séances plaçables expliqué (règle du planificateur), séance non placée motivée', () => {
    const storage = toAvailability(3);
    for (const [d, m] of [['Lundi', '60'], ['Mardi', '60'], ['Mercredi', '60'], ['Jeudi', '0'], ['Vendredi', '0'], ['Samedi', '0'], ['Dimanche', '0']] as const) setMinutes(d, m);
    expect(checkedDays()).toEqual([0, 1, 2]);
    expect(screen.getByText(/au plus 2 séances Musculation par semaine respectent 36 h de récupération/)).toBeTruthy();
    expect(screen.getByText(/1 séance sur 3 ne sera pas placée/)).toBeTruthy();
    // Information, pas un blocage : l'utilisateur peut accepter.
    expect(next()).toHaveProperty('disabled', false);
    click('Continuer');
    click('Créer mon programme');
    const strength = Object.values(saved(storage).planner.weeks)[0]?.requests.filter((r) => r.sport === 'strength') ?? [];
    expect(strength.filter((r) => r.status === 'planned')).toHaveLength(2);
    expect(strength.filter((r) => r.status !== 'planned').flatMap((r) => r.reasons ?? []).some((x) => x.params.cause === 'strength_recovery_window')).toBe(true);
  });

  it('« Modifier le programme » : préférence existante incompatible signalée, rien de modifié sans accord', () => {
    const fullGym = EQUIPMENT_PRESETS.find((x) => x.id === 'preset.full_gym')?.equipment ?? [];
    const base: ProfileInput = {
      displayName: '', level: 'intermediate', priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 2 },
      running: { enabled: false, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
      crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
      availability: [60, 0, 60, 0, 60, 90, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
    };
    const p = withStrengthPersonalization(base, { ...defaultStrengthPersonalization(base), completed: true, outcome: 'muscle', days: [0, 2, 4] });
    const storage = new MemoryStorage();
    saveState(storage, createBeta0Programme(emptyState(), p, clock(), {}));
    mount(storage);
    click('Programme');
    click('Modifier et recréer le programme');
    click('Continuer');
    click('Continuer');
    expect(document.querySelector('[data-strength-days-proposal]')).toBeNull();
    expect(checkedDays()).toEqual([0, 2, 4]);
    setMinutes('Vendredi', '0');
    expect(checkedDays()).toEqual([0, 2, 4]);
    expect(screen.getByText(/Vendredi était choisi pour la Musculation mais n’est plus disponible/)).toBeTruthy();
    expect(saved(storage).profile?.strength.personalization?.days).toEqual([0, 2, 4]);
    expect(next()).toHaveProperty('disabled', true);
  });

  it('« Ma musculation » : disponibilités générales puis jours Musculation dans la même étape, préférence conservée', () => {
    const storage = toAvailability();
    click('Continuer');
    click('Créer mon programme');
    cleanup();
    render(<StoreProvider storage={storage} clock={clock}><StrengthProfileScreen onBack={() => undefined} /></StoreProvider>);
    click('Modifier ma semaine');
    const grid = screen.getByLabelText('Temps disponible le Lundi');
    expect(grid.compareDocumentPosition(daysGroup()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector('[data-strength-days-proposal]')).toBeNull();
    expect(checkedDays()).toEqual([0, 2, 4, 5]);
  });
});
