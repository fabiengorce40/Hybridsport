// @vitest-environment jsdom
/**
 * RC4.5 (F5) — volume de la semaine au-dessus de la borne haute gouvernée : indicateur informatif dans le Programme
 * (aucune réduction automatique) ; les groupes à la borne ou en dessous n'en portent pas.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, MemoryStorage, saveState, strengthWeekInsights } from '@hybridsport/app-core';
import type { Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { PROFILES } from '../../../packages/app-core/tests/rc4-audit/rc4-sim.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });

describe('RC4.5 F5 — au-dessus de la borne haute', () => {
  it('P2 : groupes au-dessus de la borne haute signalés, sans réduction ; les autres non', () => {
    const p2 = PROFILES.find((x) => x.id === 'P2');
    if (!p2) throw new Error('P2');
    const s = createBeta0Programme(emptyState(), p2.profile, clock(), {});
    const volume = strengthWeekInsights(s, '2026-10-05')?.volume;
    const over = volume?.groups.filter((g) => g.aboveHigh) ?? [];
    expect(over.length).toBeGreaterThan(0);
    const storage = new MemoryStorage();
    saveState(storage, s);
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Navigation principale' })).getByRole('button', { name: /^Programme$/ }));
    const card = document.querySelector('[data-week-volume]');
    expect(card?.textContent).toContain('ne le réduit pas automatiquement');
    for (const g of volume?.groups ?? []) {
      const row = document.querySelector(`[data-volume-group="${g.group}"]`);
      if (!row) continue;
      const flag = row.querySelector('[data-volume-above-high]');
      if (g.aboveHigh) expect(flag?.textContent).toBe(` · au-dessus de la borne haute (${String(g.high)}), non réduit automatiquement`);
      else expect(flag).toBeNull();
    }
  });
});
