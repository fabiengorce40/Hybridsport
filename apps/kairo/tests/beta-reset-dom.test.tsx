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
const strengthCards = () => screen.queryAllByRole('button', { name: /^Musculation : / }).map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Musculation : /, '').replace(/, [^,]+$/, '').replace(/ [A-Z]$/, ''));
// RC5.1 — libellés COMPLETS (Haut du corps A / B, Bas du corps A / B) : sans retrait de la lettre de variante.
const strengthLabels = () => screen.queryAllByRole('button', { name: /^Musculation : / }).map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Musculation : /, '').replace(/, [^,]+$/, ''));
// R5.2 — la vue chronologique (un jour par ligne) est la GRILLE ; la liste est un catalogue par sport. Lecture des jours
// dans la grille, puis retour à la liste (mode d'affichage inchangé pour la suite du test).
const inGrid = <T,>(read: () => T): T => { click('Grille'); const r = read(); click('Liste'); return r; };
const dayLabels = () => inGrid(() => [...document.querySelectorAll('[data-agenda-day]')].map((d) => `${d.querySelector('.agenda-date .w')?.textContent ?? ''} ${d.querySelector('.agenda-date .n')?.textContent ?? ''}`));

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
    expect(s.planner.weeks['2026-10-05']?.planningVersion).toBe('beta0-m31');
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
    // RC5.1 — hypertrophie 4× : Haut A / Bas A / Haut B / Bas B (semaine calendaire paire).
    expect(strengthLabels()).toEqual(['Haut du corps A', 'Bas du corps A', 'Haut du corps B', 'Bas du corps B']);
    const v = selectBeta0Week(saved(st), '2026-10-05');
    expect(v?.sessions.filter((x) => x.sport === 'strength').map((x) => x.archetypeId)).toEqual(['str_upper_a', 'str_lower_a', 'str_upper_b', 'str_lower_b']);
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
    expect(inGrid(() => document.querySelectorAll('[data-agenda-day="2026-10-08"] .agenda-card[aria-label^="Musculation"], [data-agenda-day="2026-10-08"] .agenda-card[aria-label^="Course"]').length)).toBe(2);
  });
});
