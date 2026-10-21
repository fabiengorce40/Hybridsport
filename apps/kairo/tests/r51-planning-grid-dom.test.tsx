// @vitest-environment jsdom
/**
 * R5.1 — Planning en grille (agenda hebdomadaire, une ligne par jour) : sélecteur Liste / Grille, sept jours dans
 * l'ordre, plusieurs séances le même jour, cartes cliquables (même action que la liste), statuts et couleurs par sport,
 * jours de repos, navigation entre les semaines existantes, persistance du mode, non-régression de la liste, aucune
 * donnée modifiée.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ensureBeta0Week, MemoryStorage, saveState, selectBeta0Week, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { Planning0, PLANNING_VIEW_KEY } from '../src/screens/beta0/Planning0.js';
import { sportName, STATUS_LABELS } from '../src/present.js';
import { MONS, PROFILES, simulate } from '../../../packages/app-core/tests/rc4-audit/rc4-sim.js';

vi.setConfig({ testTimeout: 180_000 });
afterEach(cleanup);
beforeEach(() => localStorage.clear());

const MON = MONS[1] as string;
const spec = (id: string) => { const p = PROFILES.find((x) => x.id === id); if (!p) throw new Error(id); return p; };
/** Semaine 1 réalisée par le chemin réel, semaine 2 planifiée (statuts réels mêlés). */
const twoWeeks = (id: string): AppState => ensureBeta0Week(simulate(spec(id), 1).state, { today: MON, now: `${MON}T05:30:00.000Z` });
// Quatre sports, une séance chaque jour.
const STATE: AppState = twoWeeks('P5');
// Musculation 3× + Course 2× : jours sans séance.
const WITH_REST: AppState = twoWeeks('P1');
const clock = (): Clock => ({ today: MON, now: `${MON}T06:30:00.000Z` });
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const SPORT_CLASS: Record<string, string> = { strength: 'sport-strength', running: 'sport-running', crosstraining: 'sport-crosstraining', hyrox: 'sport-hyrox' };

function mount(state: AppState, onOpen = vi.fn()) {
  const storage = new MemoryStorage();
  saveState(storage, state);
  const r = render(<StoreProvider storage={storage} clock={clock}><Planning0 onOpen={onOpen} onGo={() => undefined} /></StoreProvider>);
  return { ...r, storage, onOpen };
}
const grid = () => document.querySelector('[data-planning-grid]');
const days = () => Array.from(document.querySelectorAll<HTMLElement>('[data-agenda-day]'));
const toGrid = () => fireEvent.click(screen.getByRole('button', { name: 'Grille' }));
const toList = () => fireEvent.click(screen.getByRole('button', { name: 'Liste' }));

describe('R5.1 — Planning en grille', () => {
  it('sélecteur Liste / Grille : liste par défaut, bascule accessible (aria-pressed)', () => {
    mount(STATE);
    const g = screen.getByRole('group', { name: 'Affichage du planning' });
    expect(within(g).getByRole('button', { name: 'Liste' }).getAttribute('aria-pressed')).toBe('true');
    expect(grid()).toBeNull();
    expect(document.querySelector('[data-planning-catalog]')).not.toBeNull();
    toGrid();
    expect(within(g).getByRole('button', { name: 'Grille' }).getAttribute('aria-pressed')).toBe('true');
    expect(grid()).not.toBeNull();
    expect(document.querySelector('[data-planning-catalog]')).toBeNull();
  });

  it('sept lignes, du lundi au dimanche, dans l’ordre ; jour et date dans la colonne de gauche', () => {
    mount(STATE);
    toGrid();
    const d = days();
    expect(d).toHaveLength(7);
    const view = selectBeta0Week(STATE, MON);
    expect(d.map((x) => x.dataset.agendaDay)).toEqual(view?.days.map((x) => x.date));
    d.forEach((x, i) => {
      expect(x.querySelector('[data-agenda-day-label]')?.textContent).toMatch(new RegExp(`^${DAY_NAMES[i] ?? ''} ${String(Number((x.dataset.agendaDay ?? '').slice(8)))} `));
      expect(x.querySelector('.agenda-date .n')?.textContent).toBe(String(Number((x.dataset.agendaDay ?? '').slice(8))));
    });
    expect(d[0]?.getAttribute('aria-current')).toBe('date');
  });

  it('cartes : une par séance placée, avec sport, nom, durée et statut ; couleurs par sport ; jours sans séance affichés', () => {
    mount(STATE);
    toGrid();
    const view = selectBeta0Week(STATE, MON);
    const placed = view?.days.flatMap((x) => x.sessions) ?? [];
    const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.agenda-card'));
    expect(cards.map((c) => c.dataset.request)).toEqual(placed.map((x) => x.requestId));
    expect(new Set(cards.map((c) => c.dataset.sport))).toEqual(new Set(['strength', 'running', 'crosstraining', 'hyrox']));
    for (const c of cards) {
      const v = placed.find((x) => x.requestId === c.dataset.request);
      expect(c.classList.contains(SPORT_CLASS[c.dataset.sport ?? ''] ?? 'none')).toBe(true);
      expect(c.querySelector('.agenda-sport')?.textContent).toContain(sportName(c.dataset.sport ?? ''));
      expect(c.querySelector('.agenda-name')?.textContent?.length).toBeGreaterThan(0);
      expect(c.querySelector('.agenda-dur')?.textContent).toMatch(/min/);
      expect(c.textContent).toContain(STATUS_LABELS[c.dataset.status as keyof typeof STATUS_LABELS]);
      expect(c.getAttribute('aria-label')).toContain(sportName(v?.sport ?? ''));
    }
  });

  it('jours de repos et journées sans séance affichés (Musculation 3× + Course 2×)', () => {
    mount(WITH_REST);
    toGrid();
    const placed = selectBeta0Week(WITH_REST, MON)?.days.flatMap((x) => x.sessions) ?? [];
    const empty = days().filter((x) => x.querySelector('.agenda-card') === null);
    expect(empty.length).toBe(7 - new Set(placed.map((x) => x.date)).size);
    expect(empty.length).toBeGreaterThan(0);
    const avail = WITH_REST.profile?.availability ?? [];
    for (const e of empty) {
      const wd = (new Date(`${e.dataset.agendaDay ?? ''}T12:00:00Z`).getUTCDay() + 6) % 7;
      expect(e.querySelector('[data-agenda-rest]')?.textContent).toBe((avail[wd] ?? 0) > 0 ? 'Disponible, aucune séance' : 'Repos');
      expect(e.querySelector('[data-agenda-day-label]')?.textContent).toMatch(/: (Repos|Disponible, aucune séance)$/);
    }
  });

  it('statuts : semaine réalisée (statuts réels) puis semaine planifiée (« prévue »)', () => {
    mount(STATE);
    toGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    const statuses = new Set(Array.from(document.querySelectorAll<HTMLElement>('.agenda-card')).map((c) => c.dataset.status));
    const expected = new Set((selectBeta0Week(STATE, MON, 0)?.days.flatMap((x) => x.sessions) ?? []).map((x) => x.status));
    expect(statuses).toEqual(expected);
    expect([...statuses].some((x) => x !== 'planned')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Semaine suivante' }));
    expect(new Set(Array.from(document.querySelectorAll<HTMLElement>('.agenda-card')).map((c) => c.dataset.status))).toEqual(new Set(['planned']));
    expect(document.querySelector('.agenda-card')?.textContent).toContain(STATUS_LABELS.planned);
  });

  it('plusieurs séances le même jour : côte à côte dans la ligne du jour (état de test)', () => {
    const view = selectBeta0Week(STATE, MON);
    const placed = view?.days.flatMap((x) => x.sessions) ?? [];
    const [a, b] = placed;
    if (!a || !b) throw new Error('séances');
    // Fixture d'interface : la 2e séance est posée sur le jour de la 1re (le planificateur n'en place qu'une par jour).
    const s: AppState = JSON.parse(JSON.stringify(STATE));
    for (const w of Object.values(s.planner.weeks)) for (const r of w.requests) if (r.requestId === b.requestId) (r as { date: string | null }).date = a.date;
    mount(s);
    toGrid();
    const row = days().find((x) => x.dataset.agendaDay === a.date);
    const list = row?.querySelector('.agenda-cards');
    expect(list?.querySelectorAll('.agenda-card')).toHaveLength(2);
    expect(row?.querySelector('[data-agenda-day-label]')?.textContent).toMatch(/: 2 séances$/);
  });

  it('clic sur une carte : même action que la liste (ouverture de la séance)', () => {
    const { onOpen } = mount(STATE);
    const id = selectBeta0Week(STATE, MON)?.days.flatMap((x) => x.sessions)[0]?.requestId ?? '';
    fireEvent.click(document.querySelector(`[data-planning-catalog] button[data-request="${id}"]`) as HTMLElement);
    toGrid();
    fireEvent.click(document.querySelector(`.agenda-card[data-request="${id}"]`) as HTMLElement);
    expect(onOpen.mock.calls).toEqual([[id], [id]]);
  });

  it('dans l’application : la carte de la grille ouvre la même séance que la liste', () => {
    const storage = new MemoryStorage();
    saveState(storage, STATE);
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    const id = selectBeta0Week(STATE, MON)?.days.flatMap((x) => x.sessions)[0]?.requestId ?? '';
    fireEvent.click(document.querySelector(`[data-planning-catalog] button[data-request="${id}"]`) as HTMLElement);
    const fromList = document.querySelector('.overlay')?.textContent;
    expect(fromList?.length).toBeGreaterThan(0);
    cleanup();
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    toGrid();
    fireEvent.click(document.querySelector(`.agenda-card[data-request="${id}"]`) as HTMLElement);
    expect(document.querySelector('.overlay')?.textContent).toBe(fromList);
  });

  it('navigation entre les semaines existantes, retour à la semaine en cours', () => {
    mount(STATE);
    toGrid();
    expect(document.querySelector('[data-week-shown]')?.getAttribute('data-week-shown')).toBe(MON);
    expect(screen.getByRole('button', { name: 'Semaine suivante' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    expect(document.querySelector('[data-week-shown]')?.getAttribute('data-week-shown')).toBe(MONS[0]);
    expect(days()[0]?.dataset.agendaDay).toBe(MONS[0]);
    expect(screen.getByRole('button', { name: 'Semaine précédente' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Revenir à la semaine en cours' }));
    expect(days()[0]?.dataset.agendaDay).toBe(MON);
    expect(screen.queryByRole('button', { name: 'Revenir à la semaine en cours' })).toBeNull();
  });

  it('mode mémorisé : Grille puis rechargement ⇒ Grille ; Liste ⇒ Liste', () => {
    mount(STATE);
    toGrid();
    expect(localStorage.getItem(PLANNING_VIEW_KEY)).toBe('grid');
    cleanup();
    mount(STATE);
    expect(grid()).not.toBeNull();
    toList();
    expect(localStorage.getItem(PLANNING_VIEW_KEY)).toBe('list');
    cleanup();
    mount(STATE);
    expect(grid()).toBeNull();
  });

  it('non-régression (R5.2) : la grille est rendue À L’IDENTIQUE avant et après un passage par la liste ; aucune donnée modifiée', () => {
    const { storage } = mount(STATE);
    const before = storage.getItem(STORAGE_KEY);
    toGrid();
    const gridHtml = grid()?.outerHTML;
    expect(days()).toHaveLength(7);
    toList();
    fireEvent.click(screen.getByRole('button', { name: '2 semaines' }));
    fireEvent.click(screen.getByRole('button', { name: /^Catégorie Musculation/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Semaine suivante' }));
    toGrid();
    expect(grid()?.outerHTML).toBe(gridHtml);
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it('états de départ du parcours E2E mobile (fixtures écrites par ce test, relues à l’identique)', () => {
    const view = selectBeta0Week(STATE, MON);
    const placed = view?.days.flatMap((x) => x.sessions) ?? [];
    const [a, b, c] = placed;
    if (!a || !b || !c) throw new Error('séances');
    // Fixture d'interface : trois séances le même jour (le planificateur n'en place qu'une par jour).
    const multi: AppState = JSON.parse(JSON.stringify(STATE));
    for (const w of Object.values(multi.planner.weeks)) for (const r of w.requests) if (r.requestId === b.requestId || r.requestId === c.requestId) (r as { date: string | null }).date = a.date;
    for (const [name, st] of [['r51-p5-w2', STATE], ['r51-multi-day', multi]] as const) {
      const storage = new MemoryStorage();
      expect(saveState(storage, st).ok).toBe(true);
      const text = storage.getItem(STORAGE_KEY) ?? '';
      const file = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', `${name}.json`);
      if (process.env.R51_WRITE_FIXTURE) writeFileSync(file, text);
      expect(readFileSync(file, 'utf8')).toBe(text);
    }
  });
});
