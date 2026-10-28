/** Fondation de coordination : aucun branchement à l'interface tant que toutes les écritures ne sont pas coordonnées. */
import type { KeyValueStorage } from '@hybridsport/app-core';
import type { ClockLocks } from './global-clock.js';

const KEY = 'rekka.clock.profile-generation.v1';
const LOCK = 'rekka.clock.profile-replacement.v1';
type Generation = { version: 1; id: string; status: 'pending' | 'ready' };
type Result = { ok: true; generation: string } | { ok: false; reason: 'coordination' | 'storage' | 'invalid' | 'pending' | 'stale' | 'replacement' };

function read(storage: KeyValueStorage): Generation | null {
  const raw = storage.getItem(KEY);
  if (raw === null) return null;
  const v: unknown = JSON.parse(raw);
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('invalid');
  const x = v as Record<string, unknown>;
  if (Object.keys(x).sort().join(',') !== 'id,status,version' || x.version !== 1 || typeof x.id !== 'string' || x.id.length < 16 || (x.status !== 'pending' && x.status !== 'ready')) throw new Error('invalid');
  return x as Generation;
}

/** La génération ne peut être réutilisée ; une interruption laisse la porte fermée. */
export async function replaceProfileGeneration(storage: KeyValueStorage, locks: ClockLocks | null, id: string, replace: () => boolean): Promise<Result> {
  if (!locks) return { ok: false, reason: 'coordination' };
  if (id.length < 16) return { ok: false, reason: 'invalid' };
  try {
    return await locks.request(LOCK, () => {
      let previous: Generation | null;
      try { previous = read(storage); } catch { return { ok: false, reason: 'invalid' } as const; }
      if (previous?.id === id) return { ok: false, reason: 'invalid' } as const;
      try { storage.setItem(KEY, JSON.stringify({ version: 1, id, status: 'pending' })); } catch { return { ok: false, reason: 'storage' } as const; }
      try { if (!replace()) return { ok: false, reason: 'replacement' } as const; } catch { return { ok: false, reason: 'replacement' } as const; }
      try { storage.setItem(KEY, JSON.stringify({ version: 1, id, status: 'ready' })); } catch { return { ok: false, reason: 'storage' } as const; }
      return { ok: true, generation: id } as const;
    });
  } catch { return { ok: false, reason: 'coordination' }; }
}

/** Les lecteurs et écrivains doivent tester et opérer sous ce même verrou, sans conserver une autorisation. */
export async function withProfileGeneration<T>(storage: KeyValueStorage, locks: ClockLocks | null, id: string, operation: () => T): Promise<{ ok: true; value: T } | { ok: false; reason: 'coordination' | 'invalid' | 'pending' | 'stale' }> {
  if (!locks) return { ok: false, reason: 'coordination' };
  try {
    return await locks.request(LOCK, () => {
      let current: Generation | null;
      try { current = read(storage); } catch { return { ok: false, reason: 'invalid' } as const; }
      if (!current || current.status === 'pending') return { ok: false, reason: 'pending' } as const;
      if (current.id !== id) return { ok: false, reason: 'stale' } as const;
      return { ok: true, value: operation() } as const;
    });
  } catch { return { ok: false, reason: 'coordination' }; }
}
