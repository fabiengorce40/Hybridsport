import { describe, expect, it } from 'vitest';
import { SessionClocks } from '../src/clock/session-clock.js';
const id = 'strength';
const date = '2026-10-05T08:00:00Z';
const at = (n: number) => ({ monotonic: n, wall: n });
describe('chronomètre en mémoire', () => {
  it('pause et reprise utilisent uniquement les périodes actives', () => {
    const clocks = new SessionClocks();
    clocks.start(id, date, at(1000));
    clocks.pause(id, date, at(11000));
    expect(clocks.elapsed(id, date, at(50000))).toBe(10000);
    clocks.resume(id, date, at(50000));
    expect(clocks.elapsed(id, date, at(55000))).toBe(15000);
  });
  it('autre onglet, rechargement et identité différente ne récupèrent aucun ancien temps', () => {
    const a = new SessionClocks(); const b = new SessionClocks();
    a.start(id, date, at(0)); a.pause(id, date, at(600000));
    expect(b.get(id, date)).toBeNull();
    expect(new SessionClocks().get(id, date)).toBeNull();
    expect(a.get(id, '2026-10-05T09:00:00Z')).toBeNull();
    a.clear();
    expect(a.get(id, date)).toBeNull();
  });
  it('veille ou changement d’heure indéterminable invalide uniquement un chrono actif', () => {
    const clocks = new SessionClocks(); clocks.start(id, date, at(0));
    expect(clocks.elapsed(id, date, { monotonic: 1000, wall: 3600000 })).toBeNull();
    expect(clocks.get(id, date)).toBeNull();
    clocks.start(id, date, at(0)); clocks.pause(id, date, at(1000));
    expect(clocks.elapsed(id, date, { monotonic: 2000, wall: 3600000 })).toBe(1000);
    clocks.resume(id, date, { monotonic: 2000, wall: 3600000 });
    expect(clocks.elapsed(id, date, { monotonic: 3000, wall: 3601000 })).toBe(2000);
  });
  it('clôture et suppression effacent le chrono, pas les données sportives', () => {
    const clocks = new SessionClocks(); clocks.start(id, date, at(0));
    clocks.retain({ [id]: { startedAt: date, finishedAt: date } });
    expect(clocks.get(id, date)).toBeNull();
  });
});
