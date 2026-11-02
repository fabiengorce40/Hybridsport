/**
 * Reprise 2 — garde d'écriture : aucune écriture sur un stockage modifié par un autre onglet, détection d'un écrasement
 * par une version non protégée, conservation des deux versions, écriture interrompue récupérable. Schéma inchangé.
 */
import { describe, expect, it } from 'vitest';
import { baselineOf, CURRENT_SCHEMA_VERSION, detectOverwrite, emptyState, GUARD_COPY_KEY, guardedSave, MemoryStorage, readStamp, REPLACED_PREFIX, resolveOverwrite, STAMP_KEY, STORAGE_KEY, textHash } from '../src/index.js';
import type { AppState, KeyValueStorage } from '../src/index.js';

const T0 = '2026-10-31T10:00:00.000Z';
const T1 = '2026-10-31T10:05:00.000Z';
const a: AppState = emptyState();
const b: AppState = { ...emptyState(), revision: 1 };

describe('Reprise 2 — garde d’écriture', () => {
  it('première écriture sans marque : écrit l’état, la copie et la marque (révision 1, schéma courant)', () => {
    const s = new MemoryStorage();
    const r = guardedSave(s, a, baselineOf(s), T0);
    expect(r.ok).toBe(true);
    expect(s.getItem(STORAGE_KEY)).toBe(s.getItem(GUARD_COPY_KEY));
    expect(readStamp(s)).toEqual({ rev: 1, schema: CURRENT_SCHEMA_VERSION, hash: textHash(s.getItem(STORAGE_KEY) ?? ''), at: T0 });
  });

  it('migration en place : état existant sans marque (version antérieure) accepté s’il n’a pas changé depuis la lecture', () => {
    const s = new MemoryStorage();
    s.setItem(STORAGE_KEY, JSON.stringify(a));
    const seen = baselineOf(s);
    expect(seen.rev).toBeNull();
    expect(guardedSave(s, b, seen, T0).ok).toBe(true);
  });

  it('autre onglet gardé : révision changée ⇒ conflit, rien n’est écrit', () => {
    const s = new MemoryStorage();
    const seen = baselineOf(s);
    expect(guardedSave(s, a, seen, T0).ok).toBe(true);
    const before = [s.getItem(STORAGE_KEY), s.getItem(STAMP_KEY), s.getItem(GUARD_COPY_KEY)];
    expect(guardedSave(s, b, seen, T1)).toEqual({ ok: false, reason: 'conflict' });
    expect([s.getItem(STORAGE_KEY), s.getItem(STAMP_KEY), s.getItem(GUARD_COPY_KEY)]).toEqual(before);
  });

  it('écriture non gardée (ancienne version) : texte changé ⇒ conflit pour les onglets gardés', () => {
    const s = new MemoryStorage();
    const r = guardedSave(s, a, baselineOf(s), T0);
    s.setItem(STORAGE_KEY, JSON.stringify(b));
    expect(r.ok && guardedSave(s, a, r.baseline, T1)).toEqual({ ok: false, reason: 'conflict' });
  });

  it('contenu identique déjà enregistré : aucune écriture, aucune révision, aucun conflit', () => {
    const s = new MemoryStorage();
    const stale = baselineOf(s);
    expect(guardedSave(s, a, stale, T0).ok).toBe(true);
    const stamp = s.getItem(STAMP_KEY);
    const again = guardedSave(s, a, stale, T1);
    expect(again.ok).toBe(true);
    expect(s.getItem(STAMP_KEY)).toBe(stamp);
  });

  it('écrasement par une version non protégée : détecté, copie gardée cohérente proposée', () => {
    const s = new MemoryStorage();
    expect(detectOverwrite(s)).toBeNull();
    guardedSave(s, a, baselineOf(s), T0);
    expect(detectOverwrite(s)).toBeNull();
    s.setItem(STORAGE_KEY, JSON.stringify(b));
    expect(detectOverwrite(s)).toEqual({ savedAt: T0, guardText: JSON.stringify(a), currentText: JSON.stringify(b) });
  });

  it('copie gardée incohérente : aucune restauration proposée (rien de supposé)', () => {
    const s = new MemoryStorage();
    guardedSave(s, a, baselineOf(s), T0);
    s.setItem(GUARD_COPY_KEY, 'autre');
    s.setItem(STORAGE_KEY, JSON.stringify(b));
    expect(detectOverwrite(s)).toBeNull();
  });

  it('choix « restaurer » : état gardé rétabli, version écartée conservée ; nouvelle écriture possible', () => {
    const s = new MemoryStorage();
    guardedSave(s, a, baselineOf(s), T0);
    s.setItem(STORAGE_KEY, JSON.stringify(b));
    const o = detectOverwrite(s);
    if (!o) throw new Error('écrasement attendu');
    const base = resolveOverwrite(s, o, 'restore', T1);
    expect(s.getItem(STORAGE_KEY)).toBe(JSON.stringify(a));
    expect(s.getItem(`${REPLACED_PREFIX}${T1}`)).toBe(JSON.stringify(b));
    expect(detectOverwrite(s)).toBeNull();
    expect(guardedSave(s, b, base, T1).ok).toBe(true);
  });

  it('choix « garder » : état actuel adopté et marqué, version gardée précédente conservée', () => {
    const s = new MemoryStorage();
    guardedSave(s, a, baselineOf(s), T0);
    s.setItem(STORAGE_KEY, JSON.stringify(b));
    const o = detectOverwrite(s);
    if (!o) throw new Error('écrasement attendu');
    const base = resolveOverwrite(s, o, 'keep', T1);
    expect(s.getItem(STORAGE_KEY)).toBe(JSON.stringify(b));
    expect(s.getItem(`${REPLACED_PREFIX}${T1}`)).toBe(JSON.stringify(a));
    expect(detectOverwrite(s)).toBeNull();
    expect(guardedSave(s, a, base, T1).ok).toBe(true);
  });

  it('écriture interrompue après la marque : l’état voulu reste récupérable au chargement suivant', () => {
    const inner = new MemoryStorage();
    guardedSave(inner, a, baselineOf(inner), T0);
    let writes = 0;
    const flaky: KeyValueStorage = { getItem: (k) => inner.getItem(k), setItem: (k, v) => { writes += 1; if (writes === 3) throw new Error('interrompu'); inner.setItem(k, v); } };
    const r = guardedSave(flaky, b, baselineOf(inner), T1);
    expect(r).toEqual({ ok: false, reason: 'error', error: 'interrompu' });
    expect(inner.getItem(STORAGE_KEY)).toBe(JSON.stringify(a));
    expect(detectOverwrite(inner)?.guardText).toBe(JSON.stringify(b));
  });

  it('erreur d’écriture dès la copie (quota) : erreur signalée, état et marque inchangés', () => {
    const inner = new MemoryStorage();
    guardedSave(inner, a, baselineOf(inner), T0);
    const before = [inner.getItem(STORAGE_KEY), inner.getItem(STAMP_KEY)];
    const full: KeyValueStorage = { getItem: (k) => inner.getItem(k), setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(guardedSave(full, b, baselineOf(inner), T1)).toEqual({ ok: false, reason: 'error', error: 'QuotaExceededError' });
    expect([inner.getItem(STORAGE_KEY), inner.getItem(STAMP_KEY)]).toEqual(before);
  });
});
