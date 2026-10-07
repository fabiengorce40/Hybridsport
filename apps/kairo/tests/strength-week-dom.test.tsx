// @vitest-environment jsdom
/**
 * E2E interface → DOM (jsdom, application réelle, backend réel) du bug post-S1 « 4 × Full body » :
 *   A — programme NEUF créé après S1 depuis l'onboarding, 4 séances de musculation : le Planning affiche la composition
 *       réellement renvoyée par le moteur Strength (Haut / Bas en alternance), jamais Full body ;
 *   B — programme créé AVANT S1 (AppState réel exporté par le code pré-S1) puis ouvert avec l'application à jour :
 *       semaine non commencée régénérée (Haut / Bas, avis visible) ; semaine commencée conservée telle quelle (Full
 *       body, avis expliquant pourquoi) ; semaine suivante en S1.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryStorage, selectBeta0Week, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { sessionName } from '../src/present.js';

afterEach(cleanup);
// Environnement jsdom : `import.meta.url` n'est pas un chemin de fichier ; le dossier du test l'est.
const PRE_S1 = readFileSync(join(import.meta.dirname, '../../../packages/app-core/tests/fixtures/pre-s1-state.json'), 'utf8');
const at = (today: string) => (): Clock => ({ today, now: `${today}T07:30:00.000Z` });
const mount = (storage: MemoryStorage, today: string) => render(<StoreProvider storage={storage} clock={at(today)}><App /></StoreProvider>);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const saved = (storage: MemoryStorage): AppState => JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as AppState;
/** Titres des séances de musculation affichées dans le Planning, dans l'ordre des jours (DOM). */
const strengthCards = () => screen.getAllByRole('button', { name: /^Musculation : / }).map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Musculation : /, '').replace(/, [^,]+$/, ''));

describe('A — programme neuf après S1 (onboarding UI, 4 séances de musculation)', () => {
  it('Planning : Haut / Bas en alternance, identique à la composition renvoyée par selectBeta0Week ; aucun Full body', () => {
    const storage = new MemoryStorage();
    mount(storage, '2026-10-05');
    fireEvent.click(screen.getByLabelText(/J’ai compris/));
    click('Commencer');
    fireEvent.click(screen.getByRole('radio', { name: /^Musculation Séances/ }));
    click('Continuer');
    const card = screen.getByRole('heading', { name: 'Musculation' }).closest('.card') as HTMLElement;
    fireEvent.change(within(card).getByLabelText('Séances par semaine'), { target: { value: '4' } });
    click('Continuer');
    click('Continuer');
    click('Créer mon programme');
    click('Planning');
    const shown = strengthCards();
    const view = selectBeta0Week(saved(storage), '2026-10-05');
    const expected = (view?.sessions ?? []).filter((x) => x.sport === 'strength' && x.date !== null).map((x) => sessionName(x.sport, x.archetypeId, x.dataError));
    expect(shown).toEqual(expected);
    expect(shown).toHaveLength(4);
    expect(new Set(shown)).toEqual(new Set(['Haut du corps', 'Bas du corps']));
    expect(shown.every((x, i) => i === 0 || x !== shown[i - 1])).toBe(true);
    expect(screen.queryByText(/Full body/)).toBeNull();
  });
});

describe('B — programme créé avant S1 (AppState réel pré-S1), application mise à jour', () => {
  const preS1Storage = () => { const st = new MemoryStorage(); st.setItem(STORAGE_KEY, PRE_S1); return st; };

  it('avant mise à jour, l’état contient bien 4 × str_full_body (cas utilisateur)', () => {
    const s = JSON.parse(PRE_S1) as AppState;
    expect((s.planner.weeks['2026-10-05']?.requests ?? []).filter((r) => r.sport === 'strength').map((r) => r.intent?.archetypeId)).toEqual(Array(4).fill('str_full_body'));
  });

  it('ouverte le lundi (semaine non commencée) : régénérée, Planning Haut / Bas / Haut / Bas et avis de replanification', () => {
    const storage = preS1Storage();
    mount(storage, '2026-10-05');
    click('Planning');
    expect(strengthCards()).toEqual(['Haut du corps', 'Bas du corps', 'Haut du corps', 'Bas du corps']);
    expect(screen.getByText(/replanifiée avec la nouvelle version de KAIRO/)).toBeTruthy();
    expect(screen.queryByText(/Full body/)).toBeNull();
    expect(saved(storage).planner.weeks['2026-10-05']?.planningVersion).toBe('beta0-m3');
  });

  it('ouverte le mercredi (séance de lundi passée) : conservée telle quelle (Full body), avis explicite ; lundi suivant : Haut / Bas', () => {
    const storage = preS1Storage();
    mount(storage, '2026-10-07');
    click('Planning');
    expect(strengthCards()).toEqual(['Full body', 'Full body', 'Full body', 'Full body']);
    expect(screen.getByText(/planifiée par une version précédente de KAIRO.*séances prévues sont déjà passées/)).toBeTruthy();
    cleanup();
    mount(storage, '2026-10-12');
    click('Planning');
    expect(strengthCards()).toEqual(['Haut du corps', 'Bas du corps', 'Haut du corps', 'Bas du corps']);
    expect(screen.queryByText(/version précédente/)).toBeNull();
  });
});

describe('libellés : aucun repli silencieux', () => {
  it('archétype inconnu ou absent ⇒ erreur de données visible, jamais « Full body »', () => {
    expect(sessionName('strength', 'str_mystery')).toBe('Erreur de données : archétype inconnu (str_mystery)');
    expect(sessionName('strength', null)).toBe('Erreur de données : archétype absent');
    expect(sessionName('strength', null, 'ARCHETYPE_MISMATCH')).toBe('Erreur de données : archétype incohérent');
    expect(['str_full_body', 'str_upper', 'str_lower'].map((a) => sessionName('strength', a))).toEqual(['Full body', 'Haut du corps', 'Bas du corps']);
  });

  it('Réglages : version de l’application affichée', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, PRE_S1);
    mount(storage, '2026-10-05');
    click('Réglages');
    expect(screen.getByLabelText('Version de l’application').textContent).toMatch(/^Version : \S+$/);
  });
});
