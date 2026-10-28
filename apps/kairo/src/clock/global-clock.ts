/**
 * Horloge de présentation indépendante de la sauvegarde sportive stricte. Pas de lecture ni d'écriture de kairo.state.
 * Ce module est une fondation isolée : il n'est pas encore relié à l'interface ou à l'import principal.
 */
import type { KeyValueStorage } from '@hybridsport/app-core';

export interface ClockSession {
  readonly requestId: string;
  readonly startedAt: string;
  /** Déduit de l'état sportif courant ; une séance terminée n'a jamais de chrono actif. */
  readonly active: boolean;
}
export interface ClockSnapshot {
  readonly version: 1;
  readonly requestId: string;
  readonly startedAt: string;
  readonly accumulatedMs: number;
  /** null signifie en pause. */
  readonly runningSince: string | null;
}
export type ClockRead = { readonly ok: true; readonly snapshot: ClockSnapshot | null } | { readonly ok: false; readonly reason: 'storage' | 'invalid' };
export type ClockWrite = { readonly ok: true; readonly snapshot: ClockSnapshot } | { readonly ok: false; readonly reason: 'storage' | 'invalid' | 'inactive' | 'conflict' | 'coordination' };

/** Adaptateur explicite : jamais de repli non coordonné si plusieurs onglets peuvent écrire. */
export interface ClockLocks {
  request<T>(name: string, work: () => T): Promise<T>;
}

const PREFIX = 'rekka.global-clock.v1.';
const validDate = (s: string): boolean => Number.isFinite(Date.parse(s));
const validSession = (s: ClockSession): boolean => s.requestId.length > 0 && validDate(s.startedAt);
/** Un même requestId réutilisé après une réinitialisation ne partage pas son chrono avec l'ancienne séance. */
export const clockKey = (s: ClockSession): string => `${PREFIX}${encodeURIComponent(s.requestId)}.${encodeURIComponent(s.startedAt)}`;
const isSnapshot = (value: unknown): value is ClockSnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v).sort().join(',');
  return keys === 'accumulatedMs,requestId,runningSince,startedAt,version' && v.version === 1
    && typeof v.requestId === 'string' && v.requestId.length > 0
    && typeof v.startedAt === 'string' && validDate(v.startedAt)
    && typeof v.accumulatedMs === 'number' && Number.isSafeInteger(v.accumulatedMs) && v.accumulatedMs >= 0
    && (v.runningSince === null || (typeof v.runningSince === 'string' && validDate(v.runningSince)));
};
const matches = (s: ClockSession, v: ClockSnapshot): boolean => s.requestId === v.requestId && s.startedAt === v.startedAt;

/** Aucune lecture d'un ancien état pour une séance close ou une identité différente. */
export function readClock(storage: KeyValueStorage, session: ClockSession): ClockRead {
  if (!validSession(session)) return { ok: false, reason: 'invalid' };
  if (!session.active) return { ok: true, snapshot: null };
  let raw: string | null;
  try { raw = storage.getItem(clockKey(session)); } catch { return { ok: false, reason: 'storage' }; }
  if (raw === null) return { ok: true, snapshot: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSnapshot(parsed) && matches(session, parsed) ? { ok: true, snapshot: parsed } : { ok: false, reason: 'invalid' };
  } catch { return { ok: false, reason: 'invalid' }; }
}

/** Une séance existante sans métadonnée démarre par le temps écoulé depuis son début connu. */
export function elapsedMs(session: ClockSession, snapshot: ClockSnapshot | null, now: string): number | null {
  if (!session.active || !validSession(session) || !validDate(now) || (snapshot && (!isSnapshot(snapshot) || !matches(session, snapshot)))) return null;
  const base = snapshot?.accumulatedMs ?? 0;
  const anchor = snapshot ? snapshot.runningSince : session.startedAt;
  return anchor === null ? base : base + Math.max(0, Date.parse(now) - Date.parse(anchor));
}

/** Les commandes sont explicites et n'écrivent jamais à chaque tic d'affichage. */
function controlClock(storage: KeyValueStorage, session: ClockSession, now: string, action: 'pause' | 'resume'): ClockWrite {
  if (!validSession(session) || !validDate(now)) return { ok: false, reason: 'invalid' };
  if (!session.active) return { ok: false, reason: 'inactive' };
  const current = readClock(storage, session);
  if (!current.ok) return current;
  const prev = current.snapshot;
  const value = elapsedMs(session, prev, now);
  if (value === null || !Number.isSafeInteger(value)) return { ok: false, reason: 'invalid' };
  const paused = prev?.runningSince === null;
  if ((action === 'pause' && paused) || (action === 'resume' && !paused)) {
    return { ok: true, snapshot: prev ?? { version: 1, requestId: session.requestId, startedAt: session.startedAt, accumulatedMs: 0, runningSince: session.startedAt } };
  }
  const snapshot: ClockSnapshot = { version: 1, requestId: session.requestId, startedAt: session.startedAt, accumulatedMs: value, runningSince: action === 'pause' ? null : now };
  try { storage.setItem(clockKey(session), JSON.stringify(snapshot)); } catch { return { ok: false, reason: 'storage' }; }
  return { ok: true, snapshot };
}

/** Une future interface doit utiliser ce point d'entrée et partager le même verrou pour l'import. */
export async function controlClockLocked(storage: KeyValueStorage, locks: ClockLocks | null, session: ClockSession, now: string, action: 'pause' | 'resume'): Promise<ClockWrite> {
  if (!locks) return { ok: false, reason: 'coordination' };
  try { return await locks.request(clockKey(session), () => controlClock(storage, session, now, action)); }
  catch { return { ok: false, reason: 'coordination' }; }
}

/** Sauvegarde compagnon séparée ; l'export historique de l'application reste strictement inchangé. */
export function exportClock(snapshot: ClockSnapshot): string { return JSON.stringify(snapshot); }
/** Import explicite d'un compagnon lié à une séance en cours ; n'écrase jamais un chrono existant. */
function importClock(storage: KeyValueStorage, session: ClockSession, raw: string): ClockWrite {
  if (!validSession(session)) return { ok: false, reason: 'invalid' };
  if (!session.active) return { ok: false, reason: 'inactive' };
  let snapshot: unknown;
  try { snapshot = JSON.parse(raw); } catch { return { ok: false, reason: 'invalid' }; }
  if (!isSnapshot(snapshot) || !matches(session, snapshot)) return { ok: false, reason: 'invalid' };
  const current = readClock(storage, session);
  if (!current.ok) return current;
  if (current.snapshot) return { ok: false, reason: 'conflict' };
  try { storage.setItem(clockKey(session), JSON.stringify(snapshot)); } catch { return { ok: false, reason: 'storage' }; }
  return { ok: true, snapshot };
}

export async function importClockLocked(storage: KeyValueStorage, locks: ClockLocks | null, session: ClockSession, raw: string): Promise<ClockWrite> {
  if (!locks) return { ok: false, reason: 'coordination' };
  try { return await locks.request(clockKey(session), () => importClock(storage, session, raw)); }
  catch { return { ok: false, reason: 'coordination' }; }
}
