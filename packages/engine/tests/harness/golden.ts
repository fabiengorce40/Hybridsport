import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';
import { canonicalStringify } from '../../src/index.js';

const DIR = join(import.meta.dirname, '..', 'golden', '__golden__');

/**
 * Golden test : compare la forme canonique à un fichier approuvé. Un changement n'est JAMAIS accepté
 * automatiquement : sans UPDATE_GOLDEN=1 le test échoue ; avec, le fichier est réécrit et le diff doit
 * être relu et justifié en revue (spec 11 §7).
 */
export function expectGolden(name: string, value: unknown): void {
  const file = join(DIR, `${name}.json`);
  const actual = `${JSON.stringify(JSON.parse(canonicalStringify(value)), null, 2)}\n`;
  if (process.env.UPDATE_GOLDEN === '1') {
    writeFileSync(file, actual);
    return;
  }
  if (!existsSync(file)) throw new Error(`Golden absent : ${name}.json — générer avec UPDATE_GOLDEN=1 puis relire le fichier en revue.`);
  expect(actual, `Golden ${name} modifié : relire le diff et le justifier avant de mettre à jour`).toBe(readFileSync(file, 'utf8'));
}
