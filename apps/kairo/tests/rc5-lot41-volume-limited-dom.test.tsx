// @vitest-environment jsdom
/**
 * Reprise RC5 lot 4.1 — repère de volume INATTEIGNABLE sans dépasser la borne haute d'un autre groupe : mention
 * informative dans la carte « volume de la semaine » du Programme (aucune compensation silencieuse) ; les groupes qui
 * atteignent leur repère n'en portent pas. Profil fictif L4-1 (hypertrophie 4×).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, MemoryStorage, saveState, strengthWeekInsights } from '@hybridsport/app-core';
import type { Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { P1 } from '../../../packages/app-core/tests/rc5/lot4-profiles.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });

describe('RC5 lot 4.1 — repère inatteignable signalé', () => {
  it('L4-1 : groupes limités par la borne haute d’un autre groupe mentionnés avec ce groupe ; les autres non', () => {
    const s = createBeta0Programme(emptyState(), P1.profile, clock(), {});
    const volume = strengthWeekInsights(s, '2026-10-05')?.volume;
    expect(volume?.groups.some((g) => g.limitedBy.length > 0)).toBe(true);
    const storage = new MemoryStorage();
    saveState(storage, s);
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Navigation principale' })).getByRole('button', { name: /^Programme$/ }));
    let seen = 0;
    for (const g of volume?.groups ?? []) {
      const row = document.querySelector(`[data-volume-group="${g.group}"]`);
      if (!row) continue;
      const flag = row.querySelector('[data-volume-limited-by]');
      if (g.limitedBy.length > 0) {
        seen += 1;
        expect(row.textContent).toContain('(en dessous)');
        expect(flag?.getAttribute('data-volume-limited-by')).toBe(g.limitedBy.join(','));
        expect(flag?.textContent).toMatch(/^ · repère inatteignable sans dépasser la borne haute de : .+$/);
      } else expect(flag).toBeNull();
    }
    expect(seen).toBeGreaterThan(0);
  });
});
