import { describe, expect, it } from 'vitest';
import { decodeState, emptyState, exportState, MemoryStorage, STORAGE_KEY } from '@hybridsport/app-core';
import { clockKey, controlClock, elapsedMs, exportClock, importClock, readClock } from '../src/clock/global-clock.js';
import type { ClockSession } from '../src/clock/global-clock.js';
const s: ClockSession = { requestId: '2026-10-05.strength.1', startedAt: '2026-10-05T08:00:00.000Z', active: true };
const at = (m: number): string => `2026-10-05T08:${String(m).padStart(2, '0')}:00.000Z`;

describe('horloge indépendante des données de séance', () => {
  it('pause, fermeture, rechargement et reprise : temps figé puis temps actif', () => {
    const storage = new MemoryStorage();
    const pause = controlClock(storage, s, at(10), 'pause');
    expect(pause.ok).toBe(true);
    const reloaded = readClock(storage, s);
    expect(reloaded.ok && elapsedMs(s, reloaded.snapshot, at(40))).toBe(600000);
    const resume = controlClock(storage, s, at(40), 'resume');
    expect(resume.ok && elapsedMs(s, resume.snapshot, at(45))).toBe(900000);
    expect(elapsedMs(s, resume.ok ? resume.snapshot : null, at(44))).toBe(840000);
  });
  it('fermeture ou autre démarrage : aucun chrono fantôme ni accès au contenu', () => {
    const storage = new MemoryStorage();
    controlClock(storage, s, at(10), 'pause');
    expect(readClock(storage, { ...s, active: false })).toEqual({ ok: true, snapshot: null });
    expect(controlClock(storage, { ...s, active: false }, at(11), 'resume')).toEqual({ ok: false, reason: 'inactive' });
    expect(readClock(storage, { ...s, startedAt: at(11) })).toEqual({ ok: true, snapshot: null });
  });
  it('export historique inchangé ; compagnon importable seulement pour la même séance active', () => {
    const storage = new MemoryStorage();
    const oldExport = exportState(emptyState());
    storage.setItem(STORAGE_KEY, oldExport);
    const pause = controlClock(storage, s, at(10), 'pause');
    if (!pause.ok) throw new Error('pause impossible');
    expect(storage.getItem(STORAGE_KEY)).toBe(oldExport);
    expect(decodeState(storage.getItem(STORAGE_KEY) ?? '').ok).toBe(true);
    const backup = exportClock(pause.snapshot);
    const restored = new MemoryStorage();
    expect(importClock(restored, { ...s, active: false }, backup)).toEqual({ ok: false, reason: 'inactive' });
    expect(importClock(restored, { ...s, startedAt: at(11) }, backup)).toEqual({ ok: false, reason: 'invalid' });
    expect(importClock(restored, s, backup).ok).toBe(true);
    expect(importClock(restored, s, backup)).toEqual({ ok: false, reason: 'conflict' });
    const value = readClock(restored, s);
    expect(value.ok && elapsedMs(s, value.snapshot, at(30))).toBe(600000);
  });
  it.each(['strength', 'running', 'hyrox', 'crosstraining'])('ne modifie pas la sauvegarde sportive pour %s', (sport) => {
    const storage = new MemoryStorage();
    const session = { ...s, requestId: `2026-10-05.${sport}.1` };
    const legacy = exportState(emptyState());
    storage.setItem(STORAGE_KEY, legacy);
    const paused = controlClock(storage, session, at(8), 'pause');
    expect(paused.ok).toBe(true);
    expect(controlClock(storage, session, at(12), 'pause')).toEqual(paused);
    expect(controlClock(storage, session, at(15), 'resume').ok).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBe(legacy);
    expect(decodeState(legacy).ok).toBe(true);
  });
  it('n’écrase pas une donnée inconnue ou illisible et signale les échecs de stockage', () => {
    const storage = new MemoryStorage();
    storage.setItem(clockKey(s), '{"version":2}');
    expect(controlClock(storage, s, at(5), 'pause')).toEqual({ ok: false, reason: 'invalid' });
    expect(storage.getItem(clockKey(s))).toBe('{"version":2}');
    const blocked = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(controlClock(blocked, s, at(5), 'pause')).toEqual({ ok: false, reason: 'storage' });
  });
});
