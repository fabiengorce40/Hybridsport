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

/**
 * Repli RC1 TEST après un essai RC3 TEST. RC3 n'ajoute au schéma (même version 2) que QUATRE champs facultatifs,
 * inconnus du schéma strict de RC1 ; ils sont retirés À LA LECTURE, et seulement eux :
 * - `planner.weeks.*.requests.*.cause` (motif persisté d'une séance non planifiée) ;
 * - `programmeLogs.*.runPlayer` (lecteur de séance Course : progression, étapes validées) ;
 * - `running.notes` (commentaires des courses libres) ;
 * - `running.timeUnknown` (courses dont seule la date est connue).
 * Tout autre champ inconnu laisse la donnée « illisible » (aucune réparation silencieuse). Le texte RC3 d'origine est
 * conservé sous `RC3_ORIGINAL_KEY` avant toute réécriture.
 */
export const RC3_ORIGINAL_KEY = 'kairo.rc3-original';
export const RC3_ANNEXES = ['planner.weeks.*.requests.*.cause', 'programmeLogs.*.runPlayer', 'running.notes', 'running.timeUnknown'] as const;
export type Rc3Annex = (typeof RC3_ANNEXES)[number];

export function withoutRc3Annexes(data: unknown): { data: unknown; removed: Readonly<Partial<Record<Rc3Annex, number>>> } {
  if (!isObj(data)) return { data, removed: {} };
  const removed: Partial<Record<Rc3Annex, number>> = {};
  const count = (k: Rc3Annex) => { removed[k] = (removed[k] ?? 0) + 1; };
  const out: Obj = { ...data };
  if (isObj(data.planner) && isObj(data.planner.weeks)) {
    const weeks = Object.fromEntries(Object.entries(data.planner.weeks).map(([k, w]) => {
      if (!isObj(w) || !Array.isArray(w.requests)) return [k, w];
      return [k, { ...w, requests: w.requests.map((r: unknown) => {
        if (!isObj(r) || !('cause' in r)) return r;
        count('planner.weeks.*.requests.*.cause');
        const { cause: _cause, ...rest } = r;
        return rest;
      }) }];
    }));
    out.planner = { ...data.planner, weeks };
  }
  if (isObj(data.programmeLogs)) {
    out.programmeLogs = Object.fromEntries(Object.entries(data.programmeLogs).map(([k, l]) => {
      if (!isObj(l) || !('runPlayer' in l)) return [k, l];
      count('programmeLogs.*.runPlayer');
      const { runPlayer: _runPlayer, ...rest } = l;
      return [k, rest];
    }));
  }
  if (isObj(data.running)) {
    const { notes, timeUnknown, ...running } = data.running;
    if (notes !== undefined) removed['running.notes'] = isObj(notes) ? Object.keys(notes).length : 1;
    if (timeUnknown !== undefined) removed['running.timeUnknown'] = Array.isArray(timeUnknown) ? timeUnknown.length : 1;
    out.running = running;
  }
  return { data: out, removed };
}

export type LoadResult =
  | { readonly status: 'empty'; readonly state: AppState }
  | { readonly status: 'ok'; readonly state: AppState; readonly migratedFrom?: number; readonly rc3AnnexesRemoved?: Readonly<Partial<Record<Rc3Annex, number>>> }
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
export function decodeState(text: string): { ok: true; state: AppState; from: number; rc3AnnexesRemoved?: Readonly<Partial<Record<Rc3Annex, number>>> } | { ok: false; problem: string; newer?: number } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, problem: 'JSON invalide' }; }
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) return { ok: false, problem: `version ${String(version)} plus récente que l'application`, newer: version };
  let migrated: { data: unknown; from: number };
  try { migrated = migrate(raw); } catch (e) { return { ok: false, problem: (e as Error).message }; }
  const parsed = zAppState.safeParse(migrated.data);
  if (!parsed.success) {
    // Repli RC1 compatible RC3 : seuls les 4 champs additifs de RC3 sont retirés ; sinon, le refus d'origine.
    const down = withoutRc3Annexes(migrated.data);
    const again = Object.keys(down.removed).length > 0 ? zAppState.safeParse(down.data) : undefined;
    if (again?.success) return { ok: true, state: again.data, from: migrated.from, rc3AnnexesRemoved: down.removed };
    // technical-constant: nombre de problèmes rapportés (lisibilité du message)
    return { ok: false, problem: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join(' ; ') };
  }
  return { ok: true, state: parsed.data, from: migrated.from };
}

export function loadState(storage: KeyValueStorage, now: string): LoadResult {
  const text = storage.getItem(STORAGE_KEY);
  if (text === null) return { status: 'empty', state: emptyState() };
  const d = decodeState(text);
  if (d.ok && d.rc3AnnexesRemoved) {
    // Texte RC3 d'origine conservé (annexes comprises) AVANT que l'état relu ne soit réécrit sans elles.
    storage.setItem(RC3_ORIGINAL_KEY, text);
    return { status: 'ok', state: d.state, rc3AnnexesRemoved: d.rc3AnnexesRemoved };
  }
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
