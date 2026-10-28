import { describe, expect, it } from 'vitest';
import { decodeState, emptyState, exportState, MemoryStorage, STORAGE_KEY } from '@hybridsport/app-core';
import { clockKey, controlClockLocked, elapsedMs, exportClock, importClockLocked, readClock } from '../src/clock/global-clock.js';
import type { ClockLocks, ClockSession } from '../src/clock/global-clock.js';
const s: ClockSession = { requestId: '2026-10-05.strength.1', startedAt: '2026-10-05T08:00:00.000Z', active: true };
const serial: ClockLocks = { request: async (_name, work) => work() };
const at = (m: number): string => `2026-10-05T08:${String(m).padStart(2, '0')}:00.000Z`;

describe('horloge indépendante des données de séance', () => {
  it('pause, fermeture, rechargement et reprise : temps figé puis temps actif', async () => {
    const storage = new MemoryStorage();
    const pause = await controlClockLocked(storage, serial, s, at(10), 'pause');
    expect(pause.ok).toBe(true);
    const reloaded = readClock(storage, s);
    expect(reloaded.ok && elapsedMs(s, reloaded.snapshot, at(40))).toBe(600000);
    const resume = await controlClockLocked(storage, serial, s, at(40), 'resume');
    expect(resume.ok && elapsedMs(s, resume.snapshot, at(45))).toBe(900000);
    expect(elapsedMs(s, resume.ok ? resume.snapshot : null, at(44))).toBe(840000);
  });
  it('fermeture ou autre démarrage : aucun chrono fantôme ni accès au contenu', async () => {
    const storage = new MemoryStorage();
    await controlClockLocked(storage, serial, s, at(10), 'pause');
    expect(readClock(storage, { ...s, active: false })).toEqual({ ok: true, snapshot: null });
    expect(await controlClockLocked(storage, serial, { ...s, active: false }, at(11), 'resume')).toEqual({ ok: false, reason: 'inactive' });
    expect(readClock(storage, { ...s, startedAt: at(11) })).toEqual({ ok: true, snapshot: null });
  });
  it('export historique inchangé ; compagnon importable seulement pour la même séance active', async () => {
    const storage = new MemoryStorage();
    const oldExport = exportState(emptyState());
    storage.setItem(STORAGE_KEY, oldExport);
    const pause = await controlClockLocked(storage, serial, s, at(10), 'pause');
    if (!pause.ok) throw new Error('pause impossible');
    expect(storage.getItem(STORAGE_KEY)).toBe(oldExport);
    expect(decodeState(storage.getItem(STORAGE_KEY) ?? '').ok).toBe(true);
    const backup = exportClock(pause.snapshot);
    const restored = new MemoryStorage();
    expect(await importClockLocked(restored, serial, { ...s, active: false }, backup)).toEqual({ ok: false, reason: 'inactive' });
    expect(await importClockLocked(restored, serial, { ...s, startedAt: at(11) }, backup)).toEqual({ ok: false, reason: 'invalid' });
    expect((await importClockLocked(restored, serial, s, backup)).ok).toBe(true);
    expect(await importClockLocked(restored, serial, s, backup)).toEqual({ ok: false, reason: 'conflict' });
    const value = readClock(restored, s);
    expect(value.ok && elapsedMs(s, value.snapshot, at(30))).toBe(600000);
  });
  it.each(['strength', 'running', 'hyrox', 'crosstraining'])('ne modifie pas la sauvegarde sportive pour %s', async (sport) => {
    const storage = new MemoryStorage();
    const session = { ...s, requestId: `2026-10-05.${sport}.1` };
    const legacy = exportState(emptyState());
    storage.setItem(STORAGE_KEY, legacy);
    const paused = await controlClockLocked(storage, serial, session, at(8), 'pause');
    expect(paused.ok).toBe(true);
    expect(await controlClockLocked(storage, serial, session, at(12), 'pause')).toEqual(paused);
    expect((await controlClockLocked(storage, serial, session, at(15), 'resume')).ok).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBe(legacy);
    expect(decodeState(legacy).ok).toBe(true);
  });
  it('n’écrase pas une donnée inconnue ou illisible et signale les échecs de stockage', async () => {
    const storage = new MemoryStorage();
    storage.setItem(clockKey(s), '{"version":2}');
    expect(await controlClockLocked(storage, serial, s, at(5), 'pause')).toEqual({ ok: false, reason: 'invalid' });
    expect(storage.getItem(clockKey(s))).toBe('{"version":2}');
    const blocked = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(await controlClockLocked(blocked, serial, s, at(5), 'pause')).toEqual({ ok: false, reason: 'storage' });
  });
  it('sérialise les commandes concurrentes et refuse toute écriture sans verrou', async () => {
    const storage = new MemoryStorage();
    let queue: Promise<unknown> = Promise.resolve();
    const locks: ClockLocks = { request: <T,>(_name: string, work: () => T): Promise<T> => {
      const next = queue.then(work); queue = next.catch(() => undefined); return next;
    } };
    expect(await controlClockLocked(storage, null, s, at(10), 'pause')).toEqual({ ok: false, reason: 'coordination' });
    const [pause, resume] = await Promise.all([
      controlClockLocked(storage, locks, s, at(10), 'pause'),
      controlClockLocked(storage, locks, s, at(20), 'resume'),
    ]);
    expect(pause.ok && resume.ok && elapsedMs(s, resume.snapshot, at(25))).toBe(900000);
    if (!pause.ok) throw new Error('pause impossible');
    expect(await importClockLocked(storage, locks, s, exportClock(pause.snapshot))).toEqual({ ok: false, reason: 'conflict' });
  });
});
