// @vitest-environment jsdom
/**
 * Outil de test Beta « Recréer mon programme de test », jusqu'au DOM (application réelle, backend réel) :
 * état pré-S1 réel ouvert un mercredi comme sur le téléphone : semaine conservée (Full body, avis) → Réglages →
 * confirmation explicite → reset → Planning recomposé par S1 → AppState relu. Intégrité : un doublon de
 * date dans les données est SIGNALÉ, jamais masqué.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryStorage, selectBeta0Week, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
// Environnement jsdom : `import.meta.url` n'est pas un chemin de fichier ; le dossier du test l'est.
const PRE_S1 = readFileSync(join(import.meta.dirname, '../../../packages/app-core/tests/fixtures/pre-s1-state.json'), 'utf8');
const at = (today: string) => (): Clock => ({ today, now: `${today}T07:30:00.000Z` });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const saved = (st: MemoryStorage): AppState => JSON.parse(st.getItem(STORAGE_KEY) ?? '{}') as AppState;
const strengthCards = () => screen.queryAllByRole('button', { name: /^Musculation : / }).map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Musculation : /, '').replace(/, [^,]+$/, ''));
const dayLabels = () => [...document.querySelectorAll('.week .day')].map((d) => `${d.querySelector('.w')?.textContent ?? ''} ${d.querySelector('.n')?.textContent ?? ''}`);

describe('reset Beta depuis l’état du téléphone (programme pré-S1)', () => {
  it('mercredi : semaine conservée (4 × Full body, avis, jeudi 8 unique) ; reset confirmé ⇒ séances composées par S1 dans le DOM et l’AppState', () => {
    const st = new MemoryStorage();
    // État du téléphone : semaine pré-S1 conservée car la séance de lundi est déjà passée.
    st.setItem(STORAGE_KEY, PRE_S1);
    render(<StoreProvider storage={st} clock={at('2026-10-07')}><App /></StoreProvider>);
    click('Planning');
    expect(strengthCards()).toEqual(['Full body', 'Full body', 'Full body', 'Full body']);
    expect(screen.getByText(/planifiée par une version précédente de KAIRO/)).toBeTruthy();
    expect(dayLabels()).toEqual(['Lun 5', 'Mar 6', 'Mer 7', 'Jeu 8', 'Ven 9', 'Sam 10', 'Dim 11']);
    cleanup();

    // Même téléphone, même jour : recréation du programme de test.
    render(<StoreProvider storage={st} clock={at('2026-10-07')}><App /></StoreProvider>);
    click('Réglages');
    click('Recréer mon programme de test');
    const go = screen.getByRole('button', { name: 'Effacer et recréer' });
    expect(go).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByLabelText(/Je comprends que ces données seront définitivement effacées/));
    fireEvent.click(go);
    expect(screen.getByText('Programme de test recréé avec la version actuelle de KAIRO.')).toBeTruthy();
    click('Planning');
    // Mercredi : jours passés indisponibles ⇒ séances à partir d'aujourd'hui, composées par S1 ; plus aucun avis d'ancienne version.
    expect(strengthCards()).toEqual(['Haut du corps', 'Bas du corps']);
    expect(screen.queryByText(/version précédente/)).toBeNull();
    expect(screen.queryByText(/Full body/)).toBeNull();
    const s = saved(st);
    expect(s.planner.weeks['2026-10-05']?.planningVersion).toBe('beta0-s1');
    expect(s.programmeState?.audit.some((a) => a.reason.code === 'KAIRO.BETA_DATA_RESET')).toBe(true);
    expect(dayLabels()).toEqual(['Lun 5', 'Mar 6', 'Mer 7', 'Jeu 8', 'Ven 9', 'Sam 10', 'Dim 11']);
  });

  it('reset un lundi : les quatre séances Haut / Bas / Haut / Bas, identiques à l’AppState persisté', () => {
    const st = new MemoryStorage();
    st.setItem(STORAGE_KEY, PRE_S1);
    render(<StoreProvider storage={st} clock={at('2026-10-05')}><App /></StoreProvider>);
    click('Réglages');
    click('Recréer mon programme de test');
    fireEvent.click(screen.getByLabelText(/Je comprends/));
    click('Effacer et recréer');
    click('Planning');
    const shown = strengthCards();
    expect(shown).toEqual(['Haut du corps', 'Bas du corps', 'Haut du corps', 'Bas du corps']);
    const v = selectBeta0Week(saved(st), '2026-10-05');
    expect(v?.sessions.filter((x) => x.sport === 'strength').map((x) => x.archetypeId)).toEqual(['str_upper', 'str_lower', 'str_upper', 'str_lower']);
  });

  it('annuler : rien n’est modifié', () => {
    const st = new MemoryStorage();
    st.setItem(STORAGE_KEY, PRE_S1);
    render(<StoreProvider storage={st} clock={at('2026-10-07')}><App /></StoreProvider>);
    const before = st.getItem(STORAGE_KEY);
    click('Réglages');
    click('Recréer mon programme de test');
    click('Annuler');
    expect(st.getItem(STORAGE_KEY)).toBe(before);
  });

  it('données incohérentes (deux séances le même jour) : avis d’incohérence visible, les deux séances restent affichées', () => {
    const s = JSON.parse(PRE_S1) as AppState;
    const w = s.planner.weeks['2026-10-05'];
    if (!w) throw new Error('semaine');
    const corrupted = { ...s, planner: { weeks: { '2026-10-05': { ...w, requests: w.requests.map((r) => (r.sport === 'running' && r.date === '2026-10-06' ? { ...r, date: '2026-10-08' } : r)) } } } };
    const st = new MemoryStorage();
    st.setItem(STORAGE_KEY, JSON.stringify(corrupted));
    render(<StoreProvider storage={st} clock={at('2026-10-07')}><App /></StoreProvider>);
    click('Planning');
    expect(screen.getByText(/Incohérence de données détectée/)).toBeTruthy();
    const thursday = [...document.querySelectorAll('.week .day')].find((d) => d.querySelector('.n')?.textContent === '8');
    expect(thursday?.querySelectorAll('[aria-label^="Musculation"], [aria-label^="Course"]').length).toBe(2);
  });
});
