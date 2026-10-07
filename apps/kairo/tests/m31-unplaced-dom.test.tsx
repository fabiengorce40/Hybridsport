// @vitest-environment jsdom
/**
 * M3.1 — interface (backend réel → DOM) : carte d'une séance COMPOSÉE MAIS NON PLACÉE (nom, durée, cause lisible,
 * « Voir la séance », « Faire maintenant »), aperçu sans recomposition, démarrage par le runtime normal ; séance
 * BLOQUÉE sans action ; Programme : « Équilibré » visible. Aucun code interne affiché.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, loadState, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { hrProfile } from '../../../packages/app-core/tests/hr/hr-fixtures.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const INTERNAL = /hybrid_race|NOT_ENOUGH_DAYS|slot_unavailable|composed|manual_from_unplaced|TEST_ONLY/;
const saved = (st: MemoryStorage): AppState => { const r = loadState(st, now); if (r.status !== 'ok') throw new Error(r.status); return r.state; };
const mount = (st: MemoryStorage) => render(<StoreProvider storage={st} clock={clock}><App /></StoreProvider>);

function seeded(level: 'intermediate' | 'beginner' = 'intermediate'): MemoryStorage {
  const st = new MemoryStorage();
  saveState(st, createBeta0Programme(emptyState(), hrProfile({ level, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 2 }, availability: [60, 0, 0, 0, 0, 0, 0] }), clock(), {}));
  return st;
}

describe('M3.1 — séance non placée (DOM)', () => {
  it('carte : informations, cause lisible, Voir (aperçu, aucune écriture) puis Faire maintenant (runtime normal)', () => {
    const st = seeded();
    mount(st);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    const card = document.querySelector('[data-unplaced]') as HTMLElement;
    expect(card.textContent).toContain('KAIRO n’a pas trouvé de créneau compatible cette semaine');
    expect(card.textContent).toMatch(/time cap/);
    expect(document.body.textContent ?? '').not.toMatch(INTERNAL);
    const before = JSON.stringify(saved(st));
    fireEvent.click(within(card).getByRole('button', { name: 'Voir la séance' }));
    expect(screen.getByRole('list', { name: 'Parcours de la séance' })).toBeTruthy();
    expect(document.body.textContent).toMatch(/non planifiée/);
    expect(JSON.stringify(saved(st))).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Faire maintenant' }));
    expect(screen.getByRole('timer', { name: 'Chrono de la séance' })).toBeTruthy();
    const id = card.getAttribute('data-unplaced') ?? '';
    expect(saved(st).programmeLogs[id]?.startedAt).toBe('2026-10-05T07:30:00Z');
  });

  it('séance bloquée : ni Voir ni Faire maintenant', () => {
    mount(seeded('beginner'));
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    expect(screen.queryByRole('button', { name: 'Faire maintenant' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Voir la séance' })).toBeNull();
  });
});
