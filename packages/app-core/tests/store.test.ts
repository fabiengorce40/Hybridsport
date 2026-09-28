/** Persistance versionnée : aller-retour, réouverture, données illisibles jamais perdues, version plus récente, échec d'écriture. */
import { describe, expect, it } from 'vitest';
import {
  BACKUP_PREFIX, completeOnboarding, decodeState, emptyState, exportState, finishSession, loadState, MemoryStorage, recordSet, saveState, startSession, STORAGE_KEY,
} from '../src/index.js';
import type { KeyValueStorage } from '../src/index.js';
import { clock, MONDAY, profile } from './fixtures.js';

const NOW = '2026-10-05T08:00:00Z';

describe('persistance', () => {
  it('stockage vide ⇒ état initial', () => {
    expect(loadState(new MemoryStorage(), NOW)).toEqual({ status: 'empty', state: emptyState() });
  });

  it('fermeture / réouverture : profil, planning, séries cochées, séance terminée, feedback et historique conservés à l’identique', () => {
    const storage = new MemoryStorage();
    let s = completeOnboarding(emptyState(), profile(), clock());
    const key = s.plans[MONDAY]!.entries[0]!.key;
    s = startSession(s, key, clock(MONDAY, '18:00:00'));
    const item = s.sessions[key]!.outcome.status === 'ok' ? s.sessions[key]!.outcome.session.blocks[1]!.items[0]! : undefined;
    s = recordSet(s, key, { itemId: item!.id, setIndex: 0, done: true, reps: 8, loadKg: 20 });
    expect(saveState(storage, s)).toEqual({ ok: true });
    expect(loadState(storage, NOW)).toEqual({ status: 'ok', state: s });
    s = finishSession(s, key, { difficulty: 'HARDER', pain: false, painAreas: [], note: 'ok' }, clock(MONDAY, '19:00:00'));
    saveState(storage, s);
    const reopened = loadState(storage, NOW);
    expect(reopened).toEqual({ status: 'ok', state: s });
    expect(reopened.state.logs[key]?.feedback?.note).toBe('ok');
  });

  it('donnée illisible : sauvegardée telle quelle AVANT tout écrasement, problème exposé', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{"schemaVersion":1,"profile":42}');
    const r = loadState(storage, NOW);
    expect(r.status).toBe('unreadable');
    if (r.status !== 'unreadable') return;
    expect(r.backupKey).toBe(`${BACKUP_PREFIX}${NOW}`);
    expect(storage.getItem(r.backupKey)).toBe('{"schemaVersion":1,"profile":42}');
    expect(storage.getItem(STORAGE_KEY)).toBe('{"schemaVersion":1,"profile":42}');
    expect(decodeState('pas du json')).toEqual({ ok: false, problem: 'JSON invalide' });
    expect(decodeState('{}')).toEqual({ ok: false, problem: 'schemaVersion absente' });
  });

  it('version plus récente que l’application : jamais écrasée ni sauvegardée comme illisible', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{"schemaVersion":2}');
    expect(loadState(storage, NOW)).toMatchObject({ status: 'newer_version', version: 2 });
    expect(storage.keys()).toEqual([STORAGE_KEY]);
  });

  it('échec d’écriture (quota) : renvoyé, jamais ignoré ; état invalide jamais écrit', () => {
    const full: KeyValueStorage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(saveState(full, emptyState())).toEqual({ ok: false, error: 'QuotaExceededError' });
    const storage = new MemoryStorage();
    expect(saveState(storage, { ...emptyState(), revision: -1 }).ok).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('export : JSON relisible à l’identique', () => {
    const s = completeOnboarding(emptyState(), profile(), clock());
    expect(decodeState(exportState(s))).toEqual({ ok: true, state: s, from: 1 });
  });
});
