/**
 * RC5.3 — banc comparatif (long : exécuté seulement avec `RC53_BENCH=<dossier de sortie>`). Écrit une mesure JSON par
 * profil : `<version du contenu>-<profil>.json` (clés « niveau/trajectoire »). Profils : `RC53_PROFILES` (défaut : tous).
 * Horizon : `RC53_WEEKS` (défaut 24). Lecture et comparaison : `docs/kairo/rc53-etudes/`.
 */
import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { strengthContent } from '../../src/index.js';
import { benchCell, KINDS, LEVELS } from './rc53-bench.js';

const OUT = process.env.RC53_BENCH;
// technical-constant: TEST_ONLY — horizon par défaut du banc (semaines)
const WEEKS = Number(process.env.RC53_WEEKS ?? 24);
const PROFILES = (process.env.RC53_PROFILES ?? 'S4,P1b,S4H,S4D,S3,S4F').split(',');

describe.skipIf(OUT === undefined)('RC5.3 — banc comparatif', () => {
  for (const id of PROFILES) {
    it(`profil ${id}`, () => {
      const out: Record<string, unknown> = {};
      for (const level of LEVELS) for (const kind of KINDS) out[`${level}/${kind}`] = benchCell(id, level, kind, WEEKS);
      writeFileSync(`${String(OUT)}/${strengthContent().ruleset.version}-${id}.json`, JSON.stringify(out));
    }, 7_200_000);
  }
});
