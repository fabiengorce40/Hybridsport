// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useAlignedSecond } from '../src/sober/useAlignedSecond.js';

afterEach(() => { cleanup(); vi.useRealTimers(); });

/** Composant témoin : note l'instant de chacun de ses rendus. */
function probe(phase: number | null) {
  const at: number[] = [];
  function Probe() { at.push(Date.now()); useAlignedSecond(phase, () => Date.now()); return null; }
  return { at, Probe };
}

it('un seul rendu par seconde, juste après chaque frontière de la référence persistante', () => {
  vi.useFakeTimers();
  vi.setSystemTime(10_300); // 300 ms après une frontière de la référence (phase 10 000 ms)
  const { at, Probe } = probe(10_000);
  render(<Probe/>);
  act(() => { vi.advanceTimersByTime(714); });
  expect(at).toEqual([10_300]); // pas de rendu avant la frontière (11 000 ms + marge)
  act(() => { vi.advanceTimersByTime(1); });
  expect(at.at(-1)).toBe(11_015);
  for (let i = 0; i < 3; i++) act(() => { vi.advanceTimersByTime(1000); }); // un act par seconde (rendus non regroupés)
  expect(at.slice(1)).toEqual([11_015, 12_015, 13_015, 14_015]);
});

it('minuterie en retard (fil principal bloqué) : la prochaine échéance se recale sur la frontière suivante', () => {
  vi.useFakeTimers();
  vi.setSystemTime(20_000);
  const { at, Probe } = probe(20_000);
  render(<Probe/>);
  act(() => { vi.advanceTimersByTime(1015); });
  vi.setSystemTime(Date.now() + 2400); // 2,4 s de blocage sans exécuter de minuterie
  act(() => { vi.advanceTimersByTime(1000); }); // la minuterie en retard s'exécute enfin (24 415 ms) : rendu immédiat
  expect(at.at(-1)).toBe(24_415);
  // L'échéance suivante est recalée sur la frontière (25 015 ms), et non 1 s après le réveil (25 415 ms).
  act(() => { vi.advanceTimersByTime(600); });
  expect(at.at(-1)).toBe(25_015);
});

it('pause (référence nulle) : aucun rafraîchissement', () => {
  vi.useFakeTimers();
  vi.setSystemTime(5_000);
  const { at, Probe } = probe(null);
  render(<Probe/>);
  act(() => { vi.advanceTimersByTime(10_000); });
  expect(at).toHaveLength(1);
});

it('retour au premier plan : resynchronisation immédiate', () => {
  vi.useFakeTimers();
  vi.setSystemTime(30_500);
  const { at, Probe } = probe(30_000);
  render(<Probe/>);
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(at).toHaveLength(2);
});
