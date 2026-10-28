import { describe, expect, it } from 'vitest';
import { SessionClocks } from '../src/clock/session-clock.js';
const id = 'strength';
const date = '2026-10-05T08:00:00Z';
describe('chronomètre en mémoire', () => {
  it('pause et reprise utilisent uniquement les périodes actives', () => {
    const clocks = new SessionClocks();
    clocks.start(id, date, 1000);
    clocks.pause(id, date, 11000);
    expect(clocks.elapsed(id, date, 50000)).toBe(10000);
    clocks.resume(id, date, 50000);
    expect(clocks.elapsed(id, date, 55000)).toBe(15000);
  });
  it('autre onglet, rechargement et identité différente ne récupèrent aucun ancien temps', () => {
    const a = new SessionClocks(); const b = new SessionClocks();
    a.start(id, date, 0); a.pause(id, date, 600000);
    expect(b.get(id, date)).toBeNull();
    expect(new SessionClocks().get(id, date)).toBeNull();
    expect(a.get(id, '2026-10-05T09:00:00Z')).toBeNull();
    a.clear();
    expect(a.get(id, date)).toBeNull();
  });
  it('clôture et suppression effacent le chrono, pas les données sportives', () => {
    const clocks = new SessionClocks(); clocks.start(id, date, 0);
    clocks.retain({ [id]: { startedAt: date, finishedAt: date } });
    expect(clocks.get(id, date)).toBeNull();
  });
});
