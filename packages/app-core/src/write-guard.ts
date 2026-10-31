/**
 * Reprise 2 — garde d'écriture de l'état entre onglets et entre versions de la PWA, sans changer le format de l'état
 * (schéma v4 inchangé, aucune migration). Trois clés à côté de `kairo.state` :
 * - `kairo.state.stamp` : révision, version de schéma, empreinte du texte écrit et date de la dernière écriture GARDÉE ;
 * - `kairo.state.guard` : copie du dernier état écrit sous garde (permet de récupérer après un écrasement) ;
 * - `kairo.state.replaced.<date>` : version écartée lors d'un choix de l'utilisateur (jamais supprimée).
 * Règle : un onglet n'écrit que si le stockage est EXACTEMENT celui qu'il a lu ou écrit en dernier (révision et
 * empreinte) ; sinon il n'écrit rien et relit. Un code non gardé (ancienne version encore ouverte) ne met pas la marque
 * à jour : son écriture est reconnue au chargement suivant, et l'utilisateur choisit la version à garder.
 */
import type { AppState } from './model.js';
import { CURRENT_SCHEMA_VERSION, zAppState } from './model.js';
import type { KeyValueStorage } from './store.js';
import { STORAGE_KEY } from './store.js';

export const STAMP_KEY = `${STORAGE_KEY}.stamp`;
export const GUARD_COPY_KEY = `${STORAGE_KEY}.guard`;
export const REPLACED_PREFIX = `${STORAGE_KEY}.replaced.`;

export interface WriteStamp { readonly rev: number; readonly schema: number; readonly hash: string; readonly at: string }
/** Ce qu'un onglet a lu ou écrit en dernier : révision gardée (null : aucune) et empreinte du texte (null : vide). */
export interface Baseline { readonly rev: number | null; readonly hash: string | null }

/** Empreinte FNV-1a 32 bits du texte, préfixée de sa longueur (détection de changement, pas de sécurité). */
export function textHash(text: string): string {
  // technical-constant: base de décalage FNV-1a 32 bits
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    // technical-constant: nombre premier FNV 32 bits
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // technical-constant: base hexadécimale
  return `${String(text.length)}:${h.toString(16)}`;
}

export function readStamp(storage: KeyValueStorage): WriteStamp | null {
  const raw = storage.getItem(STAMP_KEY);
  if (raw === null) return null;
  try {
    const s = JSON.parse(raw) as Partial<WriteStamp>;
    return Number.isInteger(s.rev) && Number.isInteger(s.schema) && typeof s.hash === 'string' && typeof s.at === 'string' ? (s as WriteStamp) : null;
  } catch {
    return null;
  }
}

export function baselineOf(storage: KeyValueStorage): Baseline {
  const text = storage.getItem(STORAGE_KEY);
  return { rev: readStamp(storage)?.rev ?? null, hash: text === null ? null : textHash(text) };
}
export const sameBaseline = (a: Baseline, b: Baseline): boolean => a.rev === b.rev && a.hash === b.hash;

/** Écrasement par un code NON gardé : la marque ne correspond plus au texte, et la copie gardée correspond à la marque. */
export interface Overwrite { readonly savedAt: string; readonly guardText: string; readonly currentText: string | null }
export function detectOverwrite(storage: KeyValueStorage): Overwrite | null {
  const stamp = readStamp(storage);
  if (!stamp) return null;
  const text = storage.getItem(STORAGE_KEY);
  if (text !== null && textHash(text) === stamp.hash) return null;
  const guard = storage.getItem(GUARD_COPY_KEY);
  // Copie absente ou incohérente : rien de fiable à proposer (aucune restauration supposée).
  if (guard === null || textHash(guard) !== stamp.hash) return null;
  return { savedAt: stamp.at, guardText: guard, currentText: text };
}

export type GuardedSave =
  | { readonly ok: true; readonly baseline: Baseline }
  | { readonly ok: false; readonly reason: 'conflict' }
  | { readonly ok: false; readonly reason: 'error'; readonly error: string };

/**
 * Écriture gardée. Ordre : copie, marque, puis état — une interruption entre deux écritures laisse une marque et une
 * copie cohérentes avec l'état VOULU, et le chargement suivant propose de le récupérer au lieu de le perdre.
 */
export function guardedSave(storage: KeyValueStorage, state: AppState, expected: Baseline, now: string): GuardedSave {
  const checked = zAppState.safeParse(state);
  if (!checked.success) return { ok: false, reason: 'error', error: `état invalide : ${checked.error.issues[0]?.path.join('.') ?? ''}` };
  const text = JSON.stringify(checked.data);
  const current = baselineOf(storage);
  // Contenu identique à celui déjà enregistré (et gardé) : rien à écrire, aucun conflit (ex. ouverture d'un 2e onglet).
  if (current.hash === textHash(text) && readStamp(storage)?.hash === current.hash) return { ok: true, baseline: current };
  if (!sameBaseline(current, expected)) return { ok: false, reason: 'conflict' };
  const stamp: WriteStamp = { rev: (current.rev ?? 0) + 1, schema: CURRENT_SCHEMA_VERSION, hash: textHash(text), at: now };
  try {
    storage.setItem(GUARD_COPY_KEY, text);
    storage.setItem(STAMP_KEY, JSON.stringify(stamp));
    storage.setItem(STORAGE_KEY, text);
  } catch (e) {
    return { ok: false, reason: 'error', error: (e as Error).message || 'écriture impossible' };
  }
  return { ok: true, baseline: { rev: stamp.rev, hash: stamp.hash } };
}

/**
 * Choix de l'utilisateur après un écrasement. La version écartée est TOUJOURS conservée sous `kairo.state.replaced.<date>`.
 * `restore` : l'état gardé redevient l'état courant. `keep` : l'état actuel est adopté et marqué.
 */
export function resolveOverwrite(storage: KeyValueStorage, o: Overwrite, choice: 'restore' | 'keep', now: string): Baseline {
  const stamp = readStamp(storage);
  if (choice === 'restore') {
    if (o.currentText !== null) storage.setItem(`${REPLACED_PREFIX}${now}`, o.currentText);
    storage.setItem(STORAGE_KEY, o.guardText);
    return { rev: stamp?.rev ?? null, hash: textHash(o.guardText) };
  }
  storage.setItem(`${REPLACED_PREFIX}${now}`, o.guardText);
  if (o.currentText === null) return { rev: stamp?.rev ?? null, hash: null };
  const next: WriteStamp = { rev: (stamp?.rev ?? 0) + 1, schema: CURRENT_SCHEMA_VERSION, hash: textHash(o.currentText), at: now };
  storage.setItem(GUARD_COPY_KEY, o.currentText);
  storage.setItem(STAMP_KEY, JSON.stringify(next));
  return { rev: next.rev, hash: next.hash };
}
