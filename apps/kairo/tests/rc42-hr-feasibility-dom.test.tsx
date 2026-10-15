// @vitest-environment jsdom
/**
 * RC4.2 — faisabilité HYROX affichée (jsdom, backend réel, sonde du moteur HYROX) :
 * - onboarding débutant (niveau par défaut) : vérification annoncée tant que le matériel est inconnu, puis « aucun type
 *   réalisable », restriction de NIVEAU (jamais une coupure) ;
 * - onboarding intermédiaire au poids du corps, type « Endurance de force » : types réalisables, restriction matériel,
 *   choix d'un type réalisable ⇒ séance composée ;
 * - profil EXISTANT avancé en mode Équilibré : onglet Programme et « Modifier » annoncent les types impossibles.
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
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const notice = () => document.querySelector('[data-hr-feasibility-notice]') as HTMLElement | null;
const items = (id: string) => [...(EQUIPMENT_PRESETS.find((p) => p.id === id)?.equipment ?? [])];

function hyroxOnboarding(storage: MemoryStorage, level: string | null, role: RegExp) {
  mount(storage);
  fireEvent.click(screen.getByLabelText(/J’ai compris/));
  fireEvent.click(button('Commencer'));
  fireEvent.click(screen.getByRole('radio', { name: /^HYROX/ }));
  fireEvent.click(button('Continuer'));
  if (level) fireEvent.change(screen.getByLabelText('Niveau d’entraînement général'), { target: { value: level } });
  fireEvent.click(screen.getByRole('radio', { name: role }));
  fireEvent.click(screen.getByRole('radio', { name: /^Préparer une course HYROX/ }));
  fireEvent.change(screen.getByLabelText('Séances HYROX par semaine'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Coupure récente du HYROX'), { target: { value: 'NONE' } });
  // Matériel encore inconnu : la vérification est annoncée, jamais supposée.
  expect(document.querySelector('[data-hr-feasibility-pending]')).not.toBeNull();
  expect(notice()).toBeNull();
  fireEvent.click(button('Continuer'));
  fireEvent.click(button('Continuer'));
}

describe('RC4.2 — faisabilité HYROX dans l’onboarding', () => {
  it('débutant : aucun type réalisable, restriction de niveau pour chacun ; aucune séance inventée', () => {
    const storage = new MemoryStorage();
    hyroxOnboarding(storage, null, /^Capacité stations/);
    fireEvent.change(screen.getByLabelText('Lieu d’entraînement'), { target: { value: 'preset.hybrid_race_gym' } });
    const n = notice();
    expect(n?.getAttribute('data-hr-feasibility-notice')).toBe('blocked');
    expect(n?.textContent).toMatch(/Aucun type de séance HYROX n’est réalisable avec votre profil actuel/);
    const ko = [...document.querySelectorAll('[data-hr-infeasible-role]')];
    expect(ko).toHaveLength(5);
    for (const li of ko) { expect(li.textContent).toMatch(/niveau déclaré/); expect(li.textContent).not.toMatch(/coupure/); }
    expect(within(n as HTMLElement).queryByRole('group')).toBeNull();
    fireEvent.click(button('Créer mon programme'));
    expect((selectBeta0Week(saved(storage), MONDAY)?.sessions ?? []).filter((x) => x.sport === 'hyrox' && x.placement !== 'blocked')).toHaveLength(0);
  });

  it('intermédiaire au poids du corps, « Endurance de force » : types réalisables, restriction matériel, choix d’un type réalisable ⇒ séance composée', () => {
    const storage = new MemoryStorage();
    hyroxOnboarding(storage, 'intermediate', /^Endurance de force/);
    fireEvent.change(screen.getByLabelText('Lieu d’entraînement'), { target: { value: 'preset.bodyweight' } });
    const n = notice() as HTMLElement;
    expect(n.querySelector('[data-hr-feasible-roles]')?.textContent).toBe('Capacité stations');
    expect(n.querySelector('[data-hr-infeasible-role="hybrid_race.h2.strength_endurance"]')?.textContent).toMatch(/matériel/);
    expect(n.querySelector('[data-hr-infeasible-role="hybrid_race.h2.partial_simulation"]')?.textContent).toMatch(/ne précise pas/);
    expect(n.querySelector('[data-hr-chosen-infeasible]')).not.toBeNull();
    fireEvent.click(within(n).getByRole('button', { name: 'Choisir « Capacité stations »' }));
    expect(notice()?.getAttribute('data-hr-feasibility-notice')).toBe('restricted');
    fireEvent.click(button('Créer mon programme'));
    const st = saved(storage);
    expect(st.profile?.hyrox.role).toBe('hybrid_race.h2.station_capacity');
    expect((selectBeta0Week(st, MONDAY)?.sessions ?? []).filter((x) => x.sport === 'hyrox' && x.placement !== 'blocked').length).toBeGreaterThan(0);
  });
});

describe('RC4.2 — profil existant', () => {
  it('avancé, Équilibré : l’onglet Programme et « Modifier » annoncent les types impossibles et l’impact', () => {
    const storage = new MemoryStorage();
    const p: ProfileInput = {
      displayName: '', level: 'advanced', priorities: ['hyrox'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
      running: { enabled: false, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
      crosstraining: { enabled: false }, hyrox: { enabled: true, sessionsPerWeek: 3, focus: 'balanced', goal: 'RACE_PREPARATION', returnState: 'NONE' } as ProfileInput['hyrox'],
      equipment: { presetId: 'preset.hybrid_race_gym', items: items('preset.hybrid_race_gym'), confirmedAt: '2026-10-04T10:00:00Z' },
      availability: [75, 60, 75, 60, 75, 90, 60], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
    };
    saveState(storage, createBeta0Programme(emptyState(), p, clock(), {}));
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Programme' }));
    const prog = document.querySelector('[data-hr-infeasible-programme="balanced"]') as HTMLElement;
    expect(prog.textContent).toMatch(/« Conditionnement stations » \(stations composables insuffisantes/);
    expect(prog.textContent).toMatch(/« Course compromise » \(durée de séance hors du temps disponible/);
    expect(prog.textContent).toMatch(/Mode « Équilibré » : les semaines où le programme retient un type impossible/);
    fireEvent.click(button('Modifier et recréer le programme'));
    fireEvent.click(button('Continuer'));
    expect(screen.getByRole('radio', { name: /^Conditionnement stations/ }).getAttribute('data-hr-feasibility')).toBe('infeasible');
    expect(screen.getByRole('radio', { name: /^Capacité stations/ }).getAttribute('data-hr-feasibility')).toBe('feasible');
    expect(document.querySelector('[data-hr-balanced-impact]')).not.toBeNull();
  });
});
