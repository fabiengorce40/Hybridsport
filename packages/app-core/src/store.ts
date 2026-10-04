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
// technical-constant: numéro de version du schéma persistant (contrat de format), pas une valeur sportive
export const MIGRATIONS: Readonly<Record<number, (data: unknown) => unknown>> = { 1: migrateV1toV2 };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * v1 → v2 (Beta 0), déterministe et sans invention :
 * - séances V0 : marquées `storage: legacy_v0` (contenu inchangé ; aucune provenance reconstituée) ;
 * - semaines planifiées : propriétaire DÉDUIT de la seule donnée existante — référencée par le programme ⇒ `programme`,
 *   sinon ⇒ `multisport` (seul autre écrivain de `planner.weeks` en v1) ;
 * - tout le reste à l'identique. Le résultat est validé STRICTEMENT par le schéma v2 (decodeState) : une donnée v1
 *   malformée est refusée et sauvegardée, jamais réparée.
 */
export function migrateV1toV2(data: unknown): unknown {
  // technical-constant: numéro de version du schéma persistant (contrat de format)
  if (!isObj(data) || data.schemaVersion !== 1) throw new Error('migration v1 → v2 : donnée v1 attendue');
  const sessions = isObj(data.sessions) ? Object.fromEntries(Object.entries(data.sessions).map(([k, g]) => [k, isObj(g) ? { storage: 'legacy_v0', ...g } : g])) : data.sessions;
  const ps = isObj(data.programmeState) ? data.programmeState : undefined;
  const refs = new Set(Array.isArray(ps?.weeks) ? ps.weeks.flatMap((w) => (isObj(w) && typeof w.plannerRef === 'string' ? [w.plannerRef] : [])) : []);
  const planner = isObj(data.planner) && isObj(data.planner.weeks)
    ? { ...data.planner, weeks: Object.fromEntries(Object.entries(data.planner.weeks).map(([k, w]) => [k, isObj(w) ? { ...w, owner: refs.has(k) ? 'programme' : 'multisport' } : w])) }
    : data.planner;
  // technical-constant: numéro de version du schéma persistant (contrat de format)
  return { ...data, schemaVersion: 2, sessions, ...(planner === undefined ? {} : { planner }) };
}

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
