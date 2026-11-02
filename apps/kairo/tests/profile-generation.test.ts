import { describe, expect, it } from 'vitest';
import { MemoryStorage, STORAGE_KEY } from '@hybridsport/app-core';
import { replaceProfileGeneration, withProfileGeneration } from '../src/clock/profile-generation.js';
import type { ClockLocks } from '../src/clock/global-clock.js';
const a = 'generation-111111111111';
const b = 'generation-222222222222';
const serial = (): ClockLocks => {
  let q: Promise<unknown> = Promise.resolve();
  return { request: <T,>(_name: string, f: () => T): Promise<T> => { const next = q.then(f); q = next.catch(() => undefined); return next; } };
};
describe('barrière auxiliaire de remplacement du profil', () => {
  it('invalide durablement les auteurs tardifs après import du même état', async () => {
    const s = new MemoryStorage(); const l = serial(); s.setItem(STORAGE_KEY, 'ancien');
    expect((await replaceProfileGeneration(s, l, a, () => true)).ok).toBe(true);
    expect((await replaceProfileGeneration(s, l, b, () => { s.setItem(STORAGE_KEY, 'ancien'); return true; })).ok).toBe(true);
    expect(await withProfileGeneration(s, l, a, () => s.setItem('clock', 'fantome'))).toEqual({ ok: false, reason: 'stale' });
    expect(s.getItem('clock')).toBeNull();
    expect((await withProfileGeneration(s, l, b, () => s.setItem('clock', 'nouveau'))).ok).toBe(true);
  });
  it('interruption ou échec : ancienne génération et nouvelle restent bloquées', async () => {
    const s = new MemoryStorage(); const l = serial();
    await replaceProfileGeneration(s, l, a, () => true);
    expect(await replaceProfileGeneration(s, l, b, () => { throw new Error('crash'); })).toEqual({ ok: false, reason: 'replacement' });
    expect(await withProfileGeneration(s, l, a, () => 1)).toEqual({ ok: false, reason: 'pending' });
    expect(await withProfileGeneration(s, l, b, () => 1)).toEqual({ ok: false, reason: 'pending' });
  });
  it('sans verrou ou avec génération périmée, ne lance pas la commande', async () => {
    const s = new MemoryStorage(); const l = serial(); let calls = 0;
    await replaceProfileGeneration(s, l, a, () => true);
    expect(await withProfileGeneration(s, null, a, () => ++calls)).toEqual({ ok: false, reason: 'coordination' });
    expect(await replaceProfileGeneration(s, l, a, () => true)).toEqual({ ok: false, reason: 'invalid' });
    expect(calls).toBe(0);
  });
  it('refuse une écriture ancienne mise en attente derrière un remplacement', async () => {
    const s = new MemoryStorage(); const l = serial();
    await replaceProfileGeneration(s, l, a, () => true);
    const replacing = replaceProfileGeneration(s, l, b, () => true);
    const late = withProfileGeneration(s, l, a, () => s.setItem('clock', 'fantome'));
    expect((await replacing).ok).toBe(true);
    expect(await late).toEqual({ ok: false, reason: 'stale' });
    expect(s.getItem('clock')).toBeNull();
  });
  it('échec de la deuxième écriture : le marqueur en attente interdit la reprise', async () => {
    const s = new MemoryStorage(); const l = serial(); let writes = 0;
    const failing = { getItem: (k: string) => s.getItem(k), setItem: (k: string, v: string) => { if (++writes === 2) throw new Error('quota'); s.setItem(k, v); } };
    expect(await replaceProfileGeneration(failing, l, b, () => true)).toEqual({ ok: false, reason: 'storage' });
    expect(await withProfileGeneration(s, l, b, () => 1)).toEqual({ ok: false, reason: 'pending' });
  });
});
