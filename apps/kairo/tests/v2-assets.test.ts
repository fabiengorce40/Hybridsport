/**
 * REKKA V2-2B — ressources du kit `assets/rekka-v2/` : fichiers autonomes et sûrs (SVG sans script, lien, image ni
 * ressource externe ; `viewBox`), aucune référence PNG de maquette dans le bundle, budget de poids des illustrations,
 * pictogrammes de navigation pilotés par `currentColor`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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

  it('illustrations WebP ≤ 150 Ko chacune', () => {
    for (const f of files.filter((x) => x.endsWith('.webp'))) {
      expect(readFileSync(f).subarray(8, 12).toString()).toBe('WEBP');
      expect([f, statSync(f).size <= 150 * 1024]).toEqual([f, true]);
    }
  });
});
