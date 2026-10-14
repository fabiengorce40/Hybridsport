// @vitest-environment jsdom
/**
 * RC3.2 — A3 et boutons désactivés (jsdom, backend réel) :
 * - onboarding Cross-training : intention « Force + conditionnement » avec haltères seules ⇒ avertissement explicite
 *   (sonde du moteur réel), options réalisables proposées ; en choisir une ⇒ séance composée ;
 * - « Continuer » / « Créer » désactivés : la raison est TOUJOURS affichée (ce qui manque) ;
 * - modification du programme (profil existant) : avertissement dès l'étape Objectifs (matériel connu) ;
 * - profil existant enregistré avec une intention irréalisable : onglet Programme et planning l'expliquent.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, MemoryStorage, saveState, selectBeta0Week, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const MONDAY = '2026-10-05';
const clock = (): Clock => ({ today: MONDAY, now: `${MONDAY}T07:30:00.000Z` });
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const saved = (storage: MemoryStorage): AppState => JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as AppState;
const blockers = () => document.querySelector('[data-next-blockers]')?.textContent ?? '';
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const SPC = 'crosstraining.strength_plus_conditioning';
const items = (id: string) => [...(EQUIPMENT_PRESETS.find((p) => p.id === id)?.equipment ?? [])];

function toObjectives(storage: MemoryStorage) {
  mount(storage);
  expect(button('Commencer').disabled).toBe(true);
  expect(blockers()).toContain('Cochez « J’ai compris » pour commencer.');
  fireEvent.click(screen.getByLabelText(/J’ai compris/));
  expect(document.querySelector('[data-next-blockers]')).toBeNull();
  fireEvent.click(button('Commencer'));
  expect(button('Continuer').disabled).toBe(true);
  expect(blockers()).toContain('Choisissez au moins un sport.');
  fireEvent.click(screen.getByRole('radio', { name: /^Cross-training/ }));
  fireEvent.click(button('Continuer'));
}

describe('RC3.2 — boutons désactivés expliqués', () => {
  it('Objectifs : chaque information manquante est listée (Cross-training, HYROX) ; elle disparaît une fois saisie', () => {
    const storage = new MemoryStorage();
    toObjectives(storage);
    expect(button('Continuer').disabled).toBe(true);
    expect(blockers()).toMatch(/Cross-training : choisissez une intention/);
    fireEvent.click(screen.getByRole('radio', { name: /^Mixte/ }));
    const ctCard = screen.getByRole('radiogroup', { name: 'Intention Cross-training' }).parentElement as HTMLElement;
    fireEvent.change(within(ctCard).getByLabelText('Séances de Cross-training par semaine'), { target: { value: '2' } });
    fireEvent.change(within(ctCard).getByLabelText('Coupure récente du Cross-training'), { target: { value: 'NONE' } });
    expect(document.querySelector('[data-next-blockers]')).toBeNull();
    expect(button('Continuer').disabled).toBe(false);
    // Retour terrain : HYROX ajouté mais non complété ⇒ Continuer grisé SANS explication auparavant.
    fireEvent.click(button('Retour'));
    fireEvent.click(screen.getByLabelText('Ajouter HYROX'));
    fireEvent.click(button('Continuer'));
    expect(button('Continuer').disabled).toBe(true);
    expect(blockers()).toMatch(/HYROX : choisissez un type de séance, choisissez un objectif/);
  });

  it('Disponibilités et Matériel : raison affichée tant que le bouton est désactivé', () => {
    const storage = new MemoryStorage();
    toObjectives(storage);
    fireEvent.click(screen.getByRole('radio', { name: /^Mixte/ }));
    const ctCard = screen.getByRole('radiogroup', { name: 'Intention Cross-training' }).parentElement as HTMLElement;
    fireEvent.change(within(ctCard).getByLabelText('Séances de Cross-training par semaine'), { target: { value: '1' } });
    fireEvent.change(within(ctCard).getByLabelText('Coupure récente du Cross-training'), { target: { value: 'NONE' } });
    fireEvent.click(button('Continuer'));
    const days = screen.getAllByLabelText(/^Temps disponible le /);
    expect(days.length).toBe(7);
    for (const el of days) fireEvent.change(el, { target: { value: '0' } });
    expect(button('Continuer').disabled).toBe(true);
    expect(blockers()).toContain('Indiquez au moins un jour disponible.');
    fireEvent.change(days[0] as HTMLElement, { target: { value: '60' } });
    expect(button('Continuer').disabled).toBe(false);
    expect(document.querySelector('[data-next-blockers]')).toBeNull();
  });
});

describe('RC3.2 — A3 intention Cross-training selon le moteur', () => {
  it('onboarding (niveau débutant par défaut) : haltères seules + « Force + conditionnement » ⇒ avertissement, options RÉELLEMENT réalisables (sonde) ; en choisir une ⇒ séance composée', () => {
    const storage = new MemoryStorage();
    toObjectives(storage);
    fireEvent.click(screen.getByRole('radio', { name: /^Force \+ conditionnement/ }));
    // Matériel encore inconnu : la vérification est annoncée, jamais supposée.
    expect(document.querySelector('[data-ct-feasibility-pending]')).not.toBeNull();
    const ctCard = screen.getByRole('radiogroup', { name: 'Intention Cross-training' }).parentElement as HTMLElement;
    fireEvent.change(within(ctCard).getByLabelText('Séances de Cross-training par semaine'), { target: { value: '2' } });
    fireEvent.change(within(ctCard).getByLabelText('Coupure récente du Cross-training'), { target: { value: 'NONE' } });
    fireEvent.click(button('Continuer'));
    fireEvent.click(button('Continuer'));
    expect(button('Créer mon programme').disabled).toBe(true);
    expect(blockers()).toContain('Matériel : choisissez votre lieu d’entraînement.');
    fireEvent.change(screen.getByLabelText('Lieu d’entraînement'), { target: { value: 'preset.dumbbells_only' } });
    const notice = document.querySelector(`[data-ct-infeasible-notice="${SPC}"]`) as HTMLElement;
    expect(notice).not.toBeNull();
    expect(notice.textContent).toMatch(/Force \+ conditionnement » : le moteur ne peut composer aucune séance avec votre profil actuel/);
    const options = within(notice).getByRole('group', { name: 'Intentions Cross-training réalisables' });
    // Débutant + haltères seules : matrice du moteur (Mixte, Endurance musculaire et Force + conditionnement irréalisables).
    expect(within(options).getAllByRole('button').map((b) => b.textContent)).toEqual(['Choisir « Capacité aérobie »', 'Choisir « Seuil »', 'Choisir « Intervalles intenses »']);
    fireEvent.click(within(options).getByRole('button', { name: 'Choisir « Capacité aérobie »' }));
    expect(document.querySelector('[data-ct-infeasible-notice]')).toBeNull();
    fireEvent.click(button('Créer mon programme'));
    const st = saved(storage);
    expect(st.profile?.crosstraining.intent).toBe('crosstraining.aerobic_capacity');
    expect((selectBeta0Week(st, MONDAY)?.sessions ?? []).filter((x) => x.sport === 'crosstraining' && x.placement !== 'blocked').length).toBeGreaterThan(0);
  });

  it('non-régression : intention réalisable (intermédiaire, salle complète) ⇒ aucun avertissement ; création possible telle quelle', () => {
    const storage = new MemoryStorage();
    toObjectives(storage);
    fireEvent.change(screen.getByLabelText('Niveau d’entraînement général'), { target: { value: 'intermediate' } });
    fireEvent.click(screen.getByRole('radio', { name: /^Force \+ conditionnement/ }));
    const ctCard = screen.getByRole('radiogroup', { name: 'Intention Cross-training' }).parentElement as HTMLElement;
    fireEvent.change(within(ctCard).getByLabelText('Séances de Cross-training par semaine'), { target: { value: '1' } });
    fireEvent.change(within(ctCard).getByLabelText('Coupure récente du Cross-training'), { target: { value: 'NONE' } });
    fireEvent.click(button('Continuer'));
    fireEvent.click(button('Continuer'));
    fireEvent.change(screen.getByLabelText('Lieu d’entraînement'), { target: { value: 'preset.full_gym' } });
    expect(document.querySelector('[data-ct-infeasible-notice]')).toBeNull();
    fireEvent.click(button('Créer mon programme'));
    expect(saved(storage).profile?.crosstraining.intent).toBe(SPC);
  });

  it('profil EXISTANT (avant RC3.2) avec intention irréalisable : planning et onglet Programme l’expliquent ; « Modifier » avertit dès l’étape Objectifs', () => {
    const storage = new MemoryStorage();
    const p: ProfileInput = {
      displayName: '', level: 'intermediate', priorities: ['crosstraining'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
      running: { enabled: false, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
      crosstraining: { enabled: true, sessionsPerWeek: 2, intent: SPC, returnState: 'NONE' }, hyrox: { enabled: false },
      equipment: { presetId: 'preset.dumbbells_only', items: items('preset.dumbbells_only'), confirmedAt: '2026-10-04T10:00:00Z' },
      availability: [60, 60, 60, 60, 60, 0, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
    };
    saveState(storage, createBeta0Programme(emptyState(), p, clock(), {}));
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    expect(screen.getAllByText(/Cette intention Cross-training ne peut pas être composée avec votre profil actuel/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Programme' }));
    expect(document.querySelector(`[data-ct-infeasible-programme="${SPC}"]`)?.textContent).toMatch(/Réalisables avec ce profil : « Mixte »/);
    fireEvent.click(button('Modifier et recréer le programme'));
    fireEvent.click(button('Continuer'));
    expect(document.querySelector(`[data-ct-infeasible-notice="${SPC}"]`)).not.toBeNull();
    expect(screen.getByRole('radio', { name: /^Force \+ conditionnement/ }).getAttribute('data-ct-feasibility')).toBe('infeasible');
    expect(screen.getByRole('radio', { name: /^Mixte/ }).getAttribute('data-ct-feasibility')).toBe('feasible');
  });
});
