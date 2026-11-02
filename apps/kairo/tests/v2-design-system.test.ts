/**
 * REKKA V2 — lot V2-1 : design system isolé derrière `data-theme="v2"`. Vérifie la palette validée, les contrastes
 * (texte ≥ 4,5:1, composants et grands textes ≥ 3:1), les tailles tactiles, l'isolation de l'ancien thème (aucun jeton
 * hors de `[data-theme="v2"]`, fichiers de l'ancien thème intacts), le pont des jetons hérités et le budget des polices.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyTheme } from '../src/design/theme.js';

const dir = new URL('../src/design/', import.meta.url).pathname;
const v2 = readFileSync(join(dir, 'rekka-v2.css'), 'utf8');
const comps = readFileSync(join(dir, 'rekka-components.css'), 'utf8');
const token = (name: string): string => {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(v2);
  if (!m?.[1]) throw new Error(`jeton absent : ${name}`);
  const v = m[1].trim();
  const ref = /^var\(--([a-z0-9-]+)\)$/.exec(v);
  return ref?.[1] ? token(ref[1]) : v;
};
const lum = (hex: string): number => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};
const contrast = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x ?? 0) + 0.05) / ((y ?? 0) + 0.05); };

describe('REKKA V2 — design system', () => {
  it('palette validée du cahier des charges', () => {
    expect([token('r-neon'), token('r-night'), token('r-slate'), token('r-cyan'), token('r-magenta'), token('r-violet'), token('r-ice')])
      .toEqual(['#dcff35', '#071827', '#122a3c', '#39ddeb', '#ff438b', '#8b5cf6', '#f3f8fc']);
  });

  it('contrastes : textes ≥ 4,5:1 sur fond et sur carte ; accents de discipline ≥ 3:1 ; texte sur bouton néon ≥ 7:1', () => {
    for (const bg of ['r-bg', 'r-surface-1', 'r-surface-2']) {
      for (const fg of ['r-text', 'r-text-2', 'r-text-3', 'r-accent', 'r-danger', 'r-success', 'r-warning', 'r-violet-text', 'r-running']) expect([fg, bg, contrast(token(fg), token(bg)) >= 4.5]).toEqual([fg, bg, true]);
      for (const fg of ['r-strength', 'r-running', 'r-hyrox', 'r-crosstraining', 'r-phase-warmup', 'r-phase-work', 'r-phase-backoff']) expect([fg, bg, contrast(token(fg), token(bg)) >= 3]).toEqual([fg, bg, true]);
    }
    expect(contrast(token('r-on-accent'), token('r-accent'))).toBeGreaterThanOrEqual(7);
  });

  it('isolation : jetons V2 uniquement sous [data-theme="v2"] ; ancien thème non modifié', () => {
    const blocks = [...v2.matchAll(/([^{}]+)\{([^{}]*--r-[a-z0-9-]+:[^{}]*)\}/g)].map((m) => (m[1] ?? '').trim());
    expect(blocks.length).toBeGreaterThan(0);
    for (const sel of blocks) expect(sel).toContain('[data-theme="v2"]');
    for (const f of ['../styles.css', 'kairo-ds.css']) expect(readFileSync(join(dir, f), 'utf8')).not.toContain('--r-');
    // Les règles de composants ne s'appliquent au document entier que sous le thème V2.
    expect(comps).not.toMatch(/(^|\n)\s*(body|html|:root)\s*\{/);
  });

  it('pont des jetons hérités : chaque jeton de l’ancien thème est redéfini en V2', () => {
    const legacy = (file: string) => [...readFileSync(join(dir, file), 'utf8').matchAll(/(--(?:k-)?[a-z0-9-]+):\s*#|(--(?:k-)?[a-z0-9-]+):\s*rgba/g)].map((m) => m[1] ?? m[2]);
    const colors = new Set([...legacy('../styles.css'), ...legacy('kairo-ds.css')].filter((n) => n !== undefined && !/radius|space|fast|base|shadow|ease/.test(n)));
    const missing = [...colors].filter((n) => !v2.includes(`  ${String(n)}:`));
    expect(missing).toEqual([]);
  });

  it('cibles tactiles : boutons, puces, onglets, validation de série ≥ 44 px', () => {
    expect(token('r-touch-min')).toBe('44px');
    for (const sel of ['.r-btn {', '.r-chip {', '.r-btn.ghost', '.r-tab {']) expect(comps.slice(comps.indexOf(sel)).split('}')[0]).toMatch(/min-height: (var\(--r-touch(-min)?\)|5\dpx)/);
    expect(comps).toMatch(/\.r-set-check \{ width: 48px; height: 48px;/);
  });

  it('polices locales (OFL) : 6 fichiers woff2, ≤ 160 Ko au total, licences présentes ; aucune police distante', () => {
    const fonts = readdirSync(join(dir, 'fonts'));
    const woff = fonts.filter((f) => f.endsWith('.woff2'));
    expect(woff.length).toBe(6);
    expect(woff.reduce((s, f) => s + statSync(join(dir, 'fonts', f)).size, 0)).toBeLessThanOrEqual(160 * 1024);
    expect(fonts).toEqual(expect.arrayContaining(['OFL-BarlowCondensed.txt', 'OFL-Inter.txt']));
    expect(v2 + comps).not.toMatch(/https?:\/\//);
  });

  it('bascule : thème V2 seulement sur demande, retrait propre', () => {
    const el = { dataset: {} as Record<string, string> } as unknown as HTMLElement;
    applyTheme(el, 'kairo');
    expect(el.dataset.theme).toBeUndefined();
    applyTheme(el, 'v2');
    expect(el.dataset.theme).toBe('v2');
    applyTheme(el, 'kairo');
    expect(el.dataset.theme).toBeUndefined();
  });
});

describe('REKKA V2 — ancien thème strictement inchangé', () => {
  it('polices V2 sous des noms propres : l’ancienne pile (Inter, system-ui) ne peut pas les charger', () => {
    const faces = [...v2.matchAll(/font-family: '([^']+)'; font-style/g)].map((m) => m[1]);
    expect(new Set(faces)).toEqual(new Set(['REKKA Barlow Condensed', 'REKKA Inter']));
    expect(readFileSync(join(dir, '../styles.css'), 'utf8')).not.toContain('REKKA');
  });
});
