/**
 * RC5.3 — TA-18 : données existantes relues SANS migration et réécrites octet pour octet ; à l'ouverture et à la
 * planification de la semaine suivante, les semaines EXISTANTES, l'historique et les tracks sont IDENTIQUES à ceux que
 * produit le code de référence d'avant RC5.3 (`ca99bdd`, empreintes figées dans `fixtures/conservation-reference.json`,
 * écrites par ce test exécuté sur le code de référence avec `RC53_WRITE_REFERENCE=1`). Seule la nouvelle semaine porte
 * le contenu courant.
 * États : BÊTA `e2cdcc5` (avant RC5.1 : séance en cours, course réalisée, Musculation + Course après 3 semaines, S4 avec la
 * semaine 4 planifiée ; synthétiques, écrits par le code BÊTA) et RC5.1 (S4 après 3 semaines, tracks par archétype A/B).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ensureBeta0Week, loadState, MemoryStorage, saveState, selectHistory, STORAGE_KEY } from '../../src/index.js';
import type { AppState } from '../../src/index.js';

const STATES = [
  { file: 'beta-e2cdcc5-real-inprogress.json', now: '2026-10-21T18:00:00.000Z' },
  { file: 'beta-e2cdcc5-real-running.json', now: '2026-10-21T18:00:00.000Z' },
  { file: 'beta-e2cdcc5-p1b-w3.json', now: '2026-10-26T07:00:00.000Z' },
  { file: '../../rc51/fixtures/pre-rc51-s4-w4.json', now: '2026-10-26T07:00:00.000Z' },
  { file: 'rc51-s4-w3.json', now: '2026-10-26T07:00:00.000Z' },
] as const;
const NEXT = { today: '2026-10-26', now: '2026-10-26T07:00:00.000Z' };
// technical-constant: TEST_ONLY — longueur des empreintes (hexadécimal)
const HASH_LEN = 16;
const REFERENCE = new URL('./fixtures/conservation-reference.json', import.meta.url);
const h = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, HASH_LEN);
const read = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const load = (raw: string, now: string): AppState => {
  const st = new MemoryStorage(); st.setItem(STORAGE_KEY, raw);
  const r = loadState(st, now);
  if (r.status !== 'ok') throw new Error(r.status);
  if (r.migratedFrom !== undefined) throw new Error(`migration inattendue depuis ${String(r.migratedFrom)}`);
  return r.state;
};

/** Empreintes de ce qui doit être conservé : semaines existantes (après planification de la suivante), historique, tracks. */
function fingerprint(file: string, now: string): Record<string, string> {
  const s = load(read(file), now);
  const next = ensureBeta0Week(s, NEXT);
  const existing = Object.keys(s.planner.weeks).filter((w) => w !== NEXT.today).sort();
  return {
    ...Object.fromEntries(existing.map((w) => [`week:${w}`, h(next.planner.weeks[w])])),
    history: h(selectHistory(next)),
    tracks: h(next.strength.tracks.filter((t) => s.strength.tracks.some((x) => x.trackId === t.trackId))),
    exposures: h(next.strength.exposures),
  };
}

describe('RC5.3 — TA-18 conservation des données existantes', () => {
  const all = Object.fromEntries(STATES.map(({ file, now }) => [file, fingerprint(file, now)]));
  if (process.env.RC53_WRITE_REFERENCE) writeFileSync(REFERENCE, `${JSON.stringify(all, null, 1)}\n`);
  const reference = JSON.parse(readFileSync(REFERENCE, 'utf8')) as Record<string, Record<string, string>>;

  for (const { file, now } of STATES) {
    it(`${file} : relu sans migration, réécrit octet pour octet ; semaines existantes, historique et tracks identiques à la référence`, () => {
      const raw = read(file);
      const st = new MemoryStorage(); saveState(st, load(raw, now));
      expect(st.getItem(STORAGE_KEY)).toBe(raw.trimEnd());
      expect(all[file]).toEqual(reference[file]);
    });
  }
});
