// @vitest-environment jsdom
/**
 * M3 — raison LISIBLE dans le Planning (aucune UI majeure) : backend réel (Beta 0, politique M3 TEST_ONLY) → DOM.
 * Une séance déplacée, échangée ou restée en conflit porte une phrase compréhensible ; aucun code interne, aucune
 * structure ni valeur affichée.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createBeta0Programme, emptyState, MemoryStorage, saveState, selectBeta0Week } from '@hybridsport/app-core';
import type { Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { profile } from '../../../packages/app-core/tests/fixtures.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const INTERNAL = /M3_|lower_knee|lower_hip|locomotor|PARTIAL|RESOLVED|SWAP|MOVE|TEST_ONLY|m3\.test/;

describe('M3 — Planning', () => {
  it('séance en conflit restant : phrase lisible, aucun code', () => {
    const storage = new MemoryStorage();
    const s = createBeta0Programme(emptyState(), profile({
      priorities: ['strength', 'running'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
      running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' },
      availability: [60, 45, 60, 45, 60, 90, 75],
    }), clock(), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
    saveState(storage, s);
    const views = selectBeta0Week(s, '2026-10-05')?.sessions.filter((v) => v.arbitration !== null) ?? [];
    expect(views.length).toBeGreaterThan(0);
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    const lines = Array.from(document.querySelectorAll('[data-m3]'));
    expect(lines.length).toBe(views.length);
    for (const l of lines) expect(l.textContent).toMatch(/sollicite les mêmes zones du corps|pour l’éloigner|Jour échangé|Adaptée par son moteur/);
    expect(document.body.textContent ?? '').not.toMatch(INTERNAL);
  });
});
