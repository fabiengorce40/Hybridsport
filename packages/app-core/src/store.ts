/**
 * Persistance locale versionnée de KAIRO V0 (stockage clé/valeur injecté ; stockage du navigateur dans la PWA).
 *
 * Garanties :
 * - toute donnée lue est validée par le schéma strict ; jamais « réparée » en silence ;
 * - une donnée illisible est SAUVEGARDÉE telle quelle sous une clé de secours AVANT tout écrasement ;
 * - une version de schéma plus récente que l'application n'est jamais écrasée (mise à jour requise) ;
 * - un échec d'écriture (quota, stockage bloqué) est renvoyé à l'appelant, jamais ignoré.
 * Limite assumée : stockage LOCAL à l'appareil et au navigateur — aucune synchronisation multi-appareils.
 */
import type { AppState } from './model.js';
import { CURRENT_SCHEMA_VERSION, emptyState, zAppState } from './model.js';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'kairo.state';
export const BACKUP_PREFIX = 'kairo.unreadable.';

/** Migrations successives : MIGRATIONS[n] transforme une donnée de version n en version n + 1. */
export const MIGRATIONS: Readonly<Record<number, (data: unknown) => unknown>> = {};

export type LoadResult =
  | { readonly status: 'empty'; readonly state: AppState }
  | { readonly status: 'ok'; readonly state: AppState; readonly migratedFrom?: number }
  | { readonly status: 'unreadable'; readonly state: AppState; readonly backupKey: string; readonly problem: string }
  | { readonly status: 'newer_version'; readonly state: AppState; readonly version: number };

function migrate(raw: unknown): { data: unknown; from: number } {
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) throw new Error('schemaVersion absente');
  let data = raw;
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`aucune migration depuis la version ${String(v)}`);
    data = step(data);
  }
  return { data, from: version };
}

/** Décode une sauvegarde (JSON) : état validé, ou description exacte du problème. */
export function decodeState(text: string): { ok: true; state: AppState; from: number } | { ok: false; problem: string; newer?: number } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, problem: 'JSON invalide' }; }
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) return { ok: false, problem: `version ${String(version)} plus récente que l'application`, newer: version };
  let migrated: { data: unknown; from: number };
  try { migrated = migrate(raw); } catch (e) { return { ok: false, problem: (e as Error).message }; }
  const parsed = zAppState.safeParse(migrated.data);
  // technical-constant: nombre de problèmes rapportés (lisibilité du message)
  if (!parsed.success) return { ok: false, problem: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join(' ; ') };
  return { ok: true, state: parsed.data, from: migrated.from };
}

export function loadState(storage: KeyValueStorage, now: string): LoadResult {
  const text = storage.getItem(STORAGE_KEY);
  if (text === null) return { status: 'empty', state: emptyState() };
  const d = decodeState(text);
  if (d.ok) return d.from === CURRENT_SCHEMA_VERSION ? { status: 'ok', state: d.state } : { status: 'ok', state: d.state, migratedFrom: d.from };
  if (d.newer !== undefined) return { status: 'newer_version', state: emptyState(), version: d.newer };
  const backupKey = `${BACKUP_PREFIX}${now}`;
  storage.setItem(backupKey, text);
  return { status: 'unreadable', state: emptyState(), backupKey, problem: d.problem };
}

export function saveState(storage: KeyValueStorage, state: AppState): { ok: true } | { ok: false; error: string } {
  const checked = zAppState.safeParse(state);
  if (!checked.success) return { ok: false, error: `état invalide : ${checked.error.issues[0]?.path.join('.') ?? ''}` };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(checked.data));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'écriture impossible' };
  }
}

export function exportState(state: AppState): string {
  // technical-constant: indentation de l’export JSON
  return JSON.stringify(state, null, 2);
}

/** Mémoire (tests et repli si le navigateur bloque le stockage : l'interface le signale alors). */
export class MemoryStorage implements KeyValueStorage {
  private readonly m = new Map<string, string>();
  getItem(key: string): string | null { return this.m.get(key) ?? null; }
  setItem(key: string, value: string): void { this.m.set(key, value); }
  keys(): string[] { return [...this.m.keys()].sort(); }
}
