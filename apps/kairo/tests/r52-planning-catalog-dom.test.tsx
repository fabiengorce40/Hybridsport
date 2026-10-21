// @vitest-environment jsdom
/**
 * R5.2 — Planning en LISTE : catalogue des séances regroupées par sport (Musculation, Cross-training, HYROX, Course à
 * pied), triées par date, période « Cette semaine / 2 semaines », catégories repliables, clic = fiche de séance, statuts
 * distincts, courses libres enregistrées, aucune séance inventée sur une semaine non planifiée, aucune donnée modifiée.
 * La grille (R5.1) n'est pas modifiée (voir r51-planning-grid-dom).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ensureBeta0Week, MemoryStorage, saveState, selectBeta0Week, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { StoreProvider } from '../src/store.js';
import { Planning0, PLANNING_PERIOD_KEY, PLANNING_VIEW_KEY } from '../src/screens/beta0/Planning0.js';
import { STATUS_LABELS } from '../src/present.js';
import { MONS, PROFILES, simulate } from '../../../packages/app-core/tests/rc4-audit/rc4-sim.js';

vi.setConfig({ testTimeout: 180_000 });
afterEach(cleanup);
beforeEach(() => localStorage.clear());

const W1 = MONS[0] as string;
const W2 = MONS[1] as string;
const spec = (id: string) => { const p = PROFILES.find((x) => x.id === id); if (!p) throw new Error(id); return p; };
/** Semaine 1 réalisée par le chemin réel, semaine 2 planifiée. */
const twoWeeks = (id: string, n = 1): AppState => ensureBeta0Week(simulate(spec(id), n).state, { today: W2, now: `${W2}T05:30:00.000Z` });
const P5 = twoWeeks('P5');
// P1 sur deux semaines réalisées : course libre enregistrée le samedi 17 octobre (données existantes du parcours).
const P1 = simulate(spec('P1'), 2).state;
const clockOf = (today: string) => (): Clock => ({ today, now: `${today}T06:30:00.000Z` });
const ORDER = ['strength', 'crosstraining', 'hyrox', 'running'];

function mount(state: AppState, today = W2, onOpen = vi.fn()) {
  const storage = new MemoryStorage();
  saveState(storage, state);
  render(<StoreProvider storage={storage} clock={clockOf(today)}><Planning0 onOpen={onOpen} onGo={() => undefined} /></StoreProvider>);
  return { storage, onOpen };
}
const catalog = () => document.querySelector('[data-planning-catalog]');
const groups = () => Array.from(document.querySelectorAll<HTMLElement>('[data-catalog-sport]'));
const cardsOf = (sport: string) => Array.from(document.querySelectorAll<HTMLElement>(`[data-catalog-sport="${sport}"] [data-request], [data-catalog-sport="${sport}"] [data-free-run]`));
const placed = (s: AppState, mon: string) => (selectBeta0Week(s, mon)?.days ?? []).flatMap((d) => d.sessions.map((v) => ({ ...v, date: d.date })));

describe('R5.2 — Planning en liste : catalogue par sport', () => {
  it('mode Liste = catalogue (par défaut), Grille inchangée ; bascule dans les deux sens', () => {
    mount(P5);
    expect(catalog()).not.toBeNull();
    expect(document.querySelector('[data-planning-grid]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Grille' }));
    expect(catalog()).toBeNull();
    expect(document.querySelectorAll('[data-agenda-day]')).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: 'Liste' }));
    expect(catalog()).not.toBeNull();
    expect(localStorage.getItem(PLANNING_VIEW_KEY)).toBe('list');
  });

  it('regroupement : Musculation, Cross-training, HYROX, Course à pied, dans cet ordre ; chaque séance placée une fois, dans sa catégorie, triée par date', () => {
    mount(P5);
    expect(groups().map((g) => g.dataset.catalogSport)).toEqual(ORDER);
    expect(groups().map((g) => g.querySelector('.catalog-name')?.textContent)).toEqual(['Musculation', 'Cross-training', 'HYROX', 'Course à pied']);
    const sessions = placed(P5, W2);
    for (const sport of ORDER) {
      const ids = cardsOf(sport).map((c) => c.dataset.request);
      const expected = sessions.filter((v) => v.sport === sport).sort((a, b) => (a.date < b.date ? -1 : 1)).map((v) => v.requestId);
      expect(ids, sport).toEqual(expected);
    }
    expect(document.querySelectorAll('[data-planning-catalog] [data-request]')).toHaveLength(sessions.length);
  });

  it('chaque séance : nom, jour et date prévus, durée, statut', () => {
    mount(P5);
    for (const v of placed(P5, W2)) {
      const card = document.querySelector<HTMLElement>(`[data-planning-catalog] [data-request="${v.requestId}"]`);
      const date = card?.querySelector('[data-catalog-date]')?.textContent ?? '';
      expect(date).toMatch(new RegExp(`^[A-Z][a-zé]{2}\\. ${String(Number(v.date.slice(8)))} oct\\.$`));
      expect(card?.getAttribute('aria-describedby')).toBe(`date-${v.requestId}`);
      expect(card?.querySelector('h3')?.textContent?.length).toBeGreaterThan(0);
      expect(card?.textContent).toMatch(/min/);
      expect(card?.textContent).toContain(STATUS_LABELS.planned);
    }
  });

  it('période « Cette semaine / 2 semaines » : deux semaines planifiées affichées ensemble ; semaine non planifiée jamais inventée', () => {
    mount(P5);
    const g = screen.getByRole('group', { name: 'Période de la liste' });
    expect(within(g).getByRole('button', { name: 'Cette semaine' }).getAttribute('aria-pressed')).toBe('true');
    // Semaine 2 : la semaine 3 n'est pas planifiée ⇒ aucune séance ajoutée, avis explicite.
    fireEvent.click(within(g).getByRole('button', { name: '2 semaines' }));
    expect(document.querySelectorAll('[data-planning-catalog] [data-request]')).toHaveLength(placed(P5, W2).length);
    expect(document.querySelector('[data-catalog-next-missing]')?.textContent).toMatch(/n’est pas encore planifiée : aucune séance n’y est affichée/);
    expect(localStorage.getItem(PLANNING_PERIOD_KEY)).toBe('two_weeks');
    // Depuis la semaine 1 : semaines 1 et 2 ensemble, triées par date dans chaque sport.
    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    const both = [...placed(P5, W1), ...placed(P5, W2)];
    expect(document.querySelectorAll('[data-planning-catalog] [data-request]')).toHaveLength(both.length);
    expect(document.querySelector('[data-catalog-next-missing]')).toBeNull();
    for (const sport of ORDER) {
      const dates = Array.from(document.querySelectorAll<HTMLElement>(`[data-catalog-sport="${sport}"] [data-catalog-entry]`)).map((e) => e.dataset.date ?? '');
      expect(dates, sport).toEqual([...dates].sort());
      expect(dates.length, sport).toBe(both.filter((v) => v.sport === sport).length);
    }
    expect(document.querySelector('[data-catalog-range]')?.textContent).toMatch(/^Du lun\. 5 oct\. au dim\. 18 oct\./);
    fireEvent.click(within(screen.getByRole('group', { name: 'Période de la liste' })).getByRole('button', { name: 'Cette semaine' }));
    expect(document.querySelectorAll('[data-planning-catalog] [data-request]')).toHaveLength(placed(P5, W1).length);
  });

  it('période mémorisée après rechargement', () => {
    mount(P5);
    fireEvent.click(screen.getByRole('button', { name: '2 semaines' }));
    cleanup();
    mount(P5);
    expect(document.querySelector('[data-planning-catalog]')?.getAttribute('data-period')).toBe('two_weeks');
  });

  it('catégories repliables : aria-expanded, contenu masqué puis réaffiché, les autres catégories intactes', () => {
    mount(P5);
    const btn = screen.getByRole('button', { name: /^Catégorie Musculation : / });
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const n = cardsOf('strength').length;
    expect(n).toBeGreaterThan(0);
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(cardsOf('strength')).toHaveLength(0);
    expect(cardsOf('running').length).toBeGreaterThan(0);
    // Le résumé reste visible replié.
    expect(btn.textContent).toMatch(new RegExp(`${String(n)} séance`));
    fireEvent.click(btn);
    expect(cardsOf('strength')).toHaveLength(n);
  });

  it('clic sur une séance : ouvre sa fiche (même action que la grille)', () => {
    const { onOpen } = mount(P5);
    const first = placed(P5, W2)[0];
    if (!first) throw new Error('séance');
    fireEvent.click(document.querySelector(`[data-planning-catalog] [data-request="${first.requestId}"]`) as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Grille' }));
    fireEvent.click(document.querySelector(`.agenda-card[data-request="${first.requestId}"]`) as HTMLElement);
    expect(onOpen.mock.calls).toEqual([[first.requestId], [first.requestId]]);
  });

  it('statuts distincts : prévue, réalisée, adaptée, arrêtée, manquée (statut du sélecteur, libellé et marqueur)', () => {
    // État de test : réalisations de la semaine 1 qualifiées différemment (statuts lus tels quels par le sélecteur).
    const s: AppState = JSON.parse(JSON.stringify(P5));
    const results = s.programmeState?.results ?? [];
    const set = (i: number, completion: string) => { const r = results[i] as { completion: string } | undefined; if (r) r.completion = completion; };
    set(0, 'modified'); set(1, 'missed'); set(2, 'abandoned');
    mount(s);
    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    fireEvent.click(screen.getByRole('button', { name: '2 semaines' }));
    const views = [...placed(s, W1), ...placed(s, W2)];
    const shown = new Set<string>();
    for (const v of views) {
      const card = document.querySelector<HTMLElement>(`[data-planning-catalog] [data-request="${v.requestId}"]`);
      expect(card?.dataset.status, v.requestId).toBe(v.status);
      expect(card?.textContent).toContain(STATUS_LABELS[v.status as keyof typeof STATUS_LABELS]);
      shown.add(v.status);
    }
    expect([...shown].sort()).toEqual(['abandoned', 'completed_as_prescribed', 'missed', 'modified', 'planned']);
  });

  it('courses libres déjà enregistrées : dans « Course à pied », à leur date, hors programme, non inventées', () => {
    mount(P1, W2);
    const free = Array.from(document.querySelectorAll<HTMLElement>('[data-catalog-sport="running"] [data-free-run]'));
    expect(free).toHaveLength(1);
    expect(free[0]?.textContent).toMatch(/Sam\. 17 oct\./);
    expect(free[0]?.textContent).toContain('Course libre');
    expect(free[0]?.textContent).toContain('Hors programme');
    // La course d'onboarding sans date réelle n'est jamais placée sur un jour.
    expect(document.querySelectorAll('[data-free-run]')).toHaveLength(1);
    // Ordre des dates avec les courses du programme (la course libre du samedi 17 entre les séances du 16 et du 18).
    const dates = Array.from(document.querySelectorAll<HTMLElement>('[data-catalog-sport="running"] [data-catalog-entry]')).map((e) => e.dataset.date ?? '');
    expect(dates.length).toBeGreaterThan(1);
    expect(dates).toEqual([...dates].sort());
    expect(dates).toContain('2026-10-17');
  });

  it('aucune donnée modifiée par la liste (bascules, période, repli, navigation)', () => {
    const { storage } = mount(P5);
    const before = storage.getItem(STORAGE_KEY);
    fireEvent.click(screen.getByRole('button', { name: '2 semaines' }));
    fireEvent.click(screen.getByRole('button', { name: /^Catégorie HYROX/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grille' }));
    fireEvent.click(screen.getByRole('button', { name: 'Liste' }));
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it('clés de stockage (intégration rc4-dev) : clés historiques sans préfixe, état jamais renommé ni réécrit par les préférences', () => {
    expect(PLANNING_VIEW_KEY).toBe('kairo.planning.view');
    expect(PLANNING_PERIOD_KEY).toBe('kairo.planning.period');
    expect(STORAGE_KEY).toBe('kairo.state');
    // Préférence R5.1 déjà enregistrée (« grid ») : relue telle quelle ; préférence absente ⇒ liste, une semaine.
    localStorage.setItem(PLANNING_VIEW_KEY, 'grid');
    const { storage } = mount(P5);
    expect(document.querySelector('[data-planning-grid]')).not.toBeNull();
    cleanup();
    localStorage.clear();
    mount(P5);
    expect(document.querySelector('[data-planning-catalog]')?.getAttribute('data-period')).toBe('week');
    expect(Object.keys(localStorage)).toEqual([]);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});

