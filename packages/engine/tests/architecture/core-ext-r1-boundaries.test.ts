/**
 * Phase 6A — CORE-EXT-R1 : le CORE porte la représentation et la validation, JAMAIS la science de la
 * course (kilométrage, seuils, VO2, novice, reprise, affûtage, prédiction, progression, sortie longue).
 */
import { describe, expect, it } from 'vitest';
import { loadCoreSources } from './source-scanner.js';

/** Fichiers introduits ou étendus par CORE-EXT-R1. */
export const CORE_EXT_R1_FILES = [
  'packages/domain/src/run-structure.ts',
  'packages/domain/src/run-execution.ts',
  'packages/engine/src/duration/run-structure.ts',
  'packages/engine/src/duration/recorded.ts',
  'packages/engine/src/trace/schema-issue.ts',
];

/** Vocabulaire de programmation Running interdit dans le CORE. `threshold_like` est une étiquette de domaine (représentation). */
const FORBIDDEN = /mileage|kilom[eé]trage|vo2|v[oO]2max|taper|aff[uû]tage|riegel|critical[_ ]?speed|lactate|long[_ ]?run|sortie[_ ]?longue|return[_ ]?to[_ ]?run|reprise[_ ]?(de|apr[eè]s)[_ ]?(la[_ ]?)?(course|coupure)|weekly[_ ]?volume|progression|pr[eé]diction|prediction|novice|threshold(?!_like)|\b80\/20\b|10 ?%/i;

describe('CORE-EXT-R1 — aucune science Running dans le CORE', () => {
  const files = loadCoreSources().filter((f) => CORE_EXT_R1_FILES.includes(f.path));

  it('les fichiers CORE-EXT-R1 existent et sont scannés', () => {
    expect(files.map((f) => f.path).sort()).toEqual([...CORE_EXT_R1_FILES].sort());
  });

  it('aucun terme de programmation Running (kilométrage, seuil, VO2, novice, reprise, affûtage, prédiction, progression, sortie longue)', () => {
    const hits = files.flatMap((f) => f.text.split('\n').flatMap((line, i) => (FORBIDDEN.test(line) ? [`${f.path}:${String(i + 1)}: ${line.trim()}`] : [])));
    expect(hits).toEqual([]);
  });

  it('le scanner détecte un terme interdit (auto-test)', () => {
    for (const s of ['const weeklyMileage = x', 'if (vo2max)', 'taperWeeks', 'longRunCap', 'thresholdPace', 'novice', 'reprise après coupure']) expect(FORBIDDEN.test(s)).toBe(true);
    // « reprise » d'exécution (adresse de reprise d'une séance) n'est pas la reprise après une coupure.
    for (const s of ["domain: 'threshold_like'", 'adresse de reprise']) expect(FORBIDDEN.test(s)).toBe(false);
  });

  it('aucune allure, FC ou RPE écrite en dur : les seuls littéraux sont des bornes techniques annotées', () => {
    for (const f of files) {
      const lines = f.text.split('\n');
      lines.forEach((line, i) => {
        if (/^\s*(\*|\/\*|\/\/)/.test(line)) return; // commentaire
        const code = line.replace(/\/\/.*$/, '').replace(/'[^']*'/g, "''");
        for (const m of code.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g)) {
          if (m[0] === '0' || m[0] === '1') continue;
          expect(`${line}\n${lines[i - 1] ?? ''}`, `${f.path}:${String(i + 1)}`).toContain('technical-constant:');
        }
      });
    }
  });
});
