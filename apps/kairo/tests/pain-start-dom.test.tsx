// @vitest-environment jsdom
/**
 * Pause douleur — interface : l'accueil ne propose plus « Commencer la séance », la séance explique pourquoi et le
 * démarrage est refusé par app-core (toast lisible, aucune écriture). Une séance commencée reste « Reprendre ».
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createBeta0Programme, emptyState, finishProgrammeSession, loadState, MemoryStorage, saveState, selectBeta0Week, startProgrammeSession } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { hrProfile } from '../../../packages/app-core/tests/hr/hr-fixtures.js';

afterEach(cleanup);
const now = '2026-10-06T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const FOUR = hrProfile({ strength: true, running: true, ct: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 0, 0] });
function pained(startOther = false): AppState {
  const s0 = createBeta0Programme(emptyState(), FOUR, { today: '2026-10-05', now: '2026-10-05T07:30:00.000Z' }, { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } });
  const xs = selectBeta0Week(s0, '2026-10-05')?.sessions ?? [];
  const str = xs.find((x) => x.sport === 'strength' && x.placement === 'planned')?.requestId ?? '';
  const hr = xs.find((x) => x.sport === 'hyrox' && x.placement === 'planned')?.requestId ?? '';
  const c = { today: '2026-10-05', now: '2026-10-05T18:00:00.000Z' };
  const s1 = startOther ? startProgrammeSession(s0, c, hr) : s0;
  return finishProgrammeSession(startProgrammeSession(s1, c, str), c, { requestId: str, completion: 'modified', pain: true });
}
const mount = (s: AppState) => { const st = new MemoryStorage(); saveState(st, s); render(<StoreProvider storage={st} clock={clock}><App /></StoreProvider>); return st; };

describe('Pause douleur — démarrage des séances planifiées (DOM)', () => {
  it('accueil : pas de « Commencer la séance » ; la séance explique le refus ; le démarrage ne change rien', () => {
    const st = mount(pained());
    expect(screen.queryByRole('button', { name: 'Commencer la séance' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Voir la séance/ }));
    expect(document.querySelector('[data-manual-refused]')?.textContent).toContain('pause douleur');
    const before = JSON.stringify(loadState(st, now).state.programmeLogs);
    const start = screen.queryByRole('button', { name: 'Commencer la séance' });
    if (start) fireEvent.click(start);
    expect(JSON.stringify(loadState(st, now).state.programmeLogs)).toBe(before);
  });
  it('séance commencée avant la douleur : « Reprendre la séance » toujours proposé', () => {
    mount(pained(true));
    expect(screen.getByRole('button', { name: 'Reprendre la séance' })).toBeTruthy();
  });
});
