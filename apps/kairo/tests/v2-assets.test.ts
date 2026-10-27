/**
 * REKKA V2-2B — ressources du kit `assets/rekka-v2/` : fichiers autonomes et sûrs (SVG sans script, lien, image ni
 * ressource externe ; `viewBox`), aucune référence PNG de maquette dans le bundle, budget de poids des illustrations,
 * pictogrammes de navigation pilotés par `currentColor`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FINAL_ASSETS, MISSING_FINAL_ASSETS, resolveAsset } from '../src/design/assets.js';

const root = [join(process.cwd(), 'apps/kairo/src/assets/rekka-v2'), join(process.cwd(), 'src/assets/rekka-v2')].find((d) => { try { return statSync(d).isDirectory(); } catch { return false; } }) ?? '';
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(root);

describe('REKKA V2-2B — ressources graphiques du kit', () => {
  it('inventaire attendu : 5 logos, 4 + 9 pictogrammes, 4 badges, 4 décors, 3 illustrations ; aucun PNG', () => {
    const count = (dir: string, ext: string) => files.filter((f) => f.includes(`/${dir}/`) && f.endsWith(ext)).length;
    expect([count('logos', '.svg'), count('sports', '.svg'), count('navigation', '.svg'), count('badges', '.svg'), count('decorations', '.svg'), count('illustrations', '.webp')]).toEqual([5, 4, 9, 4, 4, 3]);
    expect(files.filter((f) => f.endsWith('.png'))).toEqual([]);
  });

  it('SVG sûrs et autonomes : viewBox, aucun script, gestionnaire, lien, image ou objet étranger', () => {
    for (const f of files.filter((x) => x.endsWith('.svg'))) {
      const s = readFileSync(f, 'utf8');
      expect([f, /viewBox="/.test(s)]).toEqual([f, true]);
      expect([f, /<script|\son[a-z]+=|href=|<image|<foreignObject|url\((?!#)/i.test(s)]).toEqual([f, false]);
    }
  });

  it('pictogrammes de navigation en currentColor (couleur pilotée par le CSS)', () => {
    for (const f of files.filter((x) => x.includes('/navigation/'))) expect([f, readFileSync(f, 'utf8').includes('currentColor')]).toEqual([f, true]);
  });

  it('illustrations WebP : ≤ 150 Ko pour le kit, ≤ 300 Ko pour une illustration finale validée', () => {
    for (const f of files.filter((x) => x.endsWith('.webp'))) {
      expect(readFileSync(f).subarray(8, 12).toString()).toBe('WEBP');
      expect([f, statSync(f).size <= (f.includes('/validated/') ? 300 : 150) * 1024]).toEqual([f, true]);
    }
  });

  it('V2-2C : dossier des ressources finales — seuls les noms attendus sont acceptés', () => {
    const allowed = new Set(Object.values(FINAL_ASSETS) as string[]).add('README.md');
    for (const f of files.filter((x) => x.includes('/validated/'))) expect([f, allowed.has(f.slice(f.lastIndexOf('/') + 1))]).toEqual([f, true]);
  });

  it('V2-2C : une ressource finale validée remplace la provisoire ; sinon la provisoire reste signalée', () => {
    expect(resolveAsset({}, 'logo', 'kit.svg')).toEqual({ src: 'kit.svg', validated: false });
    expect(resolveAsset({ 'rekka-logo.svg': 'final.svg' }, 'logo', 'kit.svg')).toEqual({ src: 'final.svg', validated: true });
    expect(resolveAsset({ 'rekka-logo.svg': 'final.svg' }, 'homeHero', 'kit.webp')).toEqual({ src: 'kit.webp', validated: false });
    // Cohérence avec le dépôt : une ressource est « manquante » exactement quand son fichier final est absent.
    const present = new Set(files.filter((x) => x.includes('/validated/')).map((f) => f.slice(f.lastIndexOf('/') + 1)));
    const expected = (Object.keys(FINAL_ASSETS) as (keyof typeof FINAL_ASSETS)[]).filter((k) => !present.has(FINAL_ASSETS[k])).sort();
    expect([...MISSING_FINAL_ASSETS].sort()).toEqual(expected);
  });
});
