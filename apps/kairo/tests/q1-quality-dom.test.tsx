// @vitest-environment jsdom
/**
 * Q1 — interface minimale : une ligne « Qualité expérimentale » lisible (aucun code, aucun score) ; une qualité
 * BLOQUÉE retire « Faire maintenant ».
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createBeta0Programme, emptyState, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { hrProfile } from '../../../packages/app-core/tests/hr/hr-fixtures.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const CODES = /UNRESOLVED|SIMULATION_ONLY|TEST_ONLY|dose_coherence|no_approved|score/;
const mount = (s: AppState) => { const st = new MemoryStorage(); saveState(st, s); render(<StoreProvider storage={st} clock={clock}><App /></StoreProvider>); };

describe('Q1 — qualité (DOM)', () => {
  it('ligne « Séance expérimentale » sur les séances, sans code ni score', () => {
    mount(createBeta0Programme(emptyState(), hrProfile({ hr: { role: 'hybrid_race.h2.strength_endurance' } }), clock(), {}));
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    const lines = Array.from(document.querySelectorAll('[data-quality]'));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.textContent).toBe('Séance expérimentale');
    expect(document.body.textContent ?? '').not.toMatch(CODES);
  });
  it('qualité BLOQUÉE (séance non placée) : « Faire maintenant » absent', () => {
    const s0 = createBeta0Programme(emptyState(), hrProfile({ hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 2 }, availability: [60, 0, 0, 0, 0, 0, 0] }), clock(), {});
    const weeks = Object.fromEntries(Object.entries(s0.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map((r) => (r.status === 'unplaced' && r.quality ? { ...r, quality: { ...r.quality, verdict: 'BLOCKED' as const } } : r)) }]));
    mount({ ...s0, planner: { weeks } });
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    expect(document.querySelector('[data-unplaced]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Faire maintenant' })).toBeNull();
    expect(document.body.textContent).toContain('Séance non réalisable : prescription incohérente.');
  });
});
