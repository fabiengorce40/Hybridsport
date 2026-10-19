// @vitest-environment jsdom
/**
 * RC4.5 (C1) — séance dont le jour a été changé par le placement global G5 : phrase lisible sur sa carte du Planning
 * (jour d'origine, motif), aucun code interne ; les séances non déplacées n'en portent pas.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryStorage, saveState, selectBeta0Week } from '@hybridsport/app-core';
import type { Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { globalPlacementText } from '../src/present.js';
import { MONS, PROFILES, simulate } from '../../../packages/app-core/tests/rc4-audit/rc4-sim.js';

// Simulation de 2 semaines par le chemin réel : délai élargi.
vi.setConfig({ testTimeout: 120_000 });
afterEach(cleanup);

describe('RC4.5 C1 — déplacements G5 expliqués', () => {
  it('texte : jour d’origine et motif, sans code', () => {
    expect(globalPlacementText({ globalPlacement: { fromDate: '2026-10-13' } }, (d) => `le ${d.slice(8)}`)).toBe('Jour changé (prévue le 13) pour éviter deux séances Full Body à la suite.');
    expect(globalPlacementText({ globalPlacement: null }, (d) => d)).toBeNull();
  });

  it('P1, semaine 2 : chaque séance déplacée porte la phrase, les autres non', () => {
    const p1 = PROFILES.find((x) => x.id === 'P1');
    if (!p1) throw new Error('P1');
    const s = simulate(p1, 2).state;
    const mon = MONS[1];
    const views = selectBeta0Week(s, mon)?.sessions ?? [];
    const moved = views.filter((v) => v.globalPlacement !== null);
    expect(moved.length).toBeGreaterThan(0);
    for (const v of moved) expect(v.globalPlacement?.fromDate).not.toBe(v.date);
    const storage = new MemoryStorage();
    saveState(storage, s);
    const now = `${mon}T06:30:00.000Z`;
    const clock = (): Clock => ({ today: mon, now });
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    const lines = Array.from(document.querySelectorAll('[data-g5-moved]'));
    expect(lines).toHaveLength(moved.length);
    for (const l of lines) {
      expect(l.textContent).toMatch(/^Jour changé \(prévue .+\) pour éviter deux séances Full Body à la suite\.$/);
      expect(l.textContent).not.toMatch(/GLOBAL_PLACEMENT|PLAN\.|G5/);
    }
  });
});
