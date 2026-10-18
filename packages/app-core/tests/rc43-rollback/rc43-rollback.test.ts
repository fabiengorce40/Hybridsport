/**
 * Repli RC1 TEST après RC4.3 (migration M1). La fixture `rc43-real-state.json` est le texte EXACT écrit par le code
 * RC4.3 (`claude/kairo-rc4-dev`) : course d'onboarding sans date, courses libres typées (longue, seuil, facile),
 * non précisée, commentaire, course « même jour » confirmée, séance du programme réalisée avec ressenti (RC4.1).
 *
 * Critère : aucune séance, aucun historique, aucune référence, aucun profil ni aucune douleur perdus. Seuls les champs
 * additifs listés sont retirés (`running.freeRunMeta` compris) ; les courses restent EASY continues (contrat RC1) ;
 * le texte d'origine est conservé sur l'appareil.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadState, MemoryStorage, RC3_ORIGINAL_KEY, saveState, STORAGE_KEY } from '../../src/index.js';

const TEXT = readFileSync(join(import.meta.dirname, 'fixtures', 'rc43-real-state.json'), 'utf8');
type Obj = Record<string, unknown>;
/** Attendu : le texte RC4.3 exact, moins les champs additifs (retirés à la main, indépendamment du code testé). */
function expected(text: string): Obj {
  const j = JSON.parse(text) as Obj & { planner: { weeks: Record<string, { requests: Obj[] }> }; programmeLogs: Record<string, Obj>; running: Obj };
  for (const w of Object.values(j.planner.weeks)) for (const r of w.requests) delete r.cause;
  for (const l of Object.values(j.programmeLogs)) delete l.runPlayer;
  delete j.running.notes;
  delete j.running.timeUnknown;
  delete j.running.freeRunMeta;
  return j;
}

describe('repli RC1 : état RC4.3 réel relu sans perte', () => {
  it('fixture RC4.3 : `freeRunMeta` présent (4 courses), courses toutes EASY continues dans le texte', () => {
    const j = JSON.parse(TEXT) as { running: { freeRunMeta: Obj; realized: { archetype: string; structureFamily: string }[] } };
    expect(Object.keys(j.running.freeRunMeta)).toHaveLength(4);
    expect(j.running.realized.filter((r) => r.archetype !== 'EASY' && r.archetype !== 'TEST')).toEqual([]);
  });

  it('relu : état = texte RC4.3 moins les seuls champs additifs ; réalisations, références, séances, profil conservés ; texte d’origine gardé', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, TEXT);
    const r = loadState(storage, '2026-11-20T08:00:00Z');
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(JSON.parse(JSON.stringify(r.state))).toEqual(expected(TEXT));
    const j = JSON.parse(TEXT) as { running: { realized: unknown[]; references: unknown[] }; programmeLogs: unknown; profile: unknown; safety: unknown };
    expect(r.state.running.realized).toEqual(j.running.realized);
    expect(r.state.running.references).toEqual(j.running.references);
    expect(r.state.profile).toEqual(j.profile);
    expect(r.state.safety).toEqual(j.safety);
    expect(r.rc3AnnexesRemoved).toMatchObject({ 'running.freeRunMeta': 4 });
    expect(storage.getItem(RC3_ORIGINAL_KEY)).toBe(TEXT);
    // Réécrit au format RC1 : relu ensuite sans aucun retrait.
    expect(saveState(storage, r.state).ok).toBe(true);
    const again = loadState(storage, '2026-11-20T09:00:00Z');
    expect(again.status === 'ok' && again.rc3AnnexesRemoved === undefined).toBe(true);
  });
});
