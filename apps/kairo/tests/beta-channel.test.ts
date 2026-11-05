/**
 * REKKA BÊTA : workflow ISOLÉ (projet Cloudflare distinct, branche dédiée, lecture seule, jamais gh-pages, TEST ni
 * prévisualisation), stockage préfixé STABLE du canal (aucune clé d'un autre environnement lue ni écrite ; mêmes clés
 * relues après chaque mise à jour) et build de production inchangée (aucun canal sans variable).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '@hybridsport/app-core';
import { CHANNEL, namespaced, STORAGE_NAMESPACE } from '../src/channel.js';

const wf = readFileSync(new URL('../../../.github/workflows/rekka-beta-pages.yml', import.meta.url), 'utf8');
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

describe('REKKA BÊTA — workflow isolé', () => {
  it('déclenché et publié UNIQUEMENT depuis la branche BÊTA', () => {
    expect(wf).toMatch(/push:\n\s+branches: \[claude\/rekka-beta\]/);
    expect(wf).toMatch(/^ {4}if: github\.ref == 'refs\/heads\/claude\/rekka-beta'$/m);
  });
  it('projet Cloudflare distinct de TEST et de la prévisualisation, lecture seule, jamais gh-pages ni production', () => {
    expect(wf).toContain('CF_PROJECT: rekka-beta');
    expect(wf).not.toMatch(/CF_PROJECT: kairo-rc1-test|CF_PROJECT: kairo-r51-preview/);
    expect(wf).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(wf).not.toMatch(/git push|gh-pages[^`]|: write/);
    expect(wf).not.toMatch(/branches: \[claude\/crosstraining-c1-c2-spike-vbg8dv\]|branches: \[claude\/kairo-rc1-test-env\]|branches: \[claude\/kairo-r51-preview\]/);
    expect(wf).toContain('pnpm kairo:build:beta');
  });
  it('REKKA V3 (planche carbone) : la build publiée par le workflow BÊTA active explicitement le rendu V3', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['build:beta']).toBe('VITE_KAIRO_CHANNEL=beta VITE_REKKA_THEME=v2 VITE_REKKA_VISUAL=v3 vite build --outDir dist-beta');
    expect(pkg.scripts.build).toBe('vite build');
  });
  it('garde anti-écrasement : un projet existant qui ne publie pas la BÊTA n’est jamais remplacé', () => {
    expect(wf).toContain(`grep -q '"channel":"beta"'`);
    expect(wf).toContain('déploiement refusé pour ne rien écraser');
  });
  it('version et commit déployés publiés (version.json, canal beta) et vérifiés après déploiement', () => {
    expect(wf).toContain('\\"channel\\":\\"beta\\"');
    expect(wf).toContain('E2E_EXPECT_BUILD="${GITHUB_SHA}"');
  });
});

describe('REKKA BÊTA — données', () => {
  it('toutes les lectures et écritures passent par le préfixe ; production (préfixe vide) inchangée', () => {
    const raw = new MemoryStorage();
    raw.setItem('kairo.state', 'production');
    const s = namespaced(raw, 'rekka-beta:');
    expect(s.getItem('kairo.state')).toBeNull();
    s.setItem('kairo.state', 'beta');
    expect(raw.getItem('kairo.state')).toBe('production');
    expect(raw.getItem('rekka-beta:kairo.state')).toBe('beta');
    expect(namespaced(raw, '')).toBe(raw);
  });
  it('préfixe STABLE de la BÊTA (les mises à jour relisent les mêmes clés) ; tests = canal production', () => {
    expect(readFileSync(new URL('../src/channel.ts', import.meta.url), 'utf8')).toContain("IS_BETA ? 'rekka-beta:' : ''");
    expect(CHANNEL).toBe('production');
    expect(STORAGE_NAMESPACE).toBe('');
  });
  it('service worker : ne touche jamais au stockage local ; la BÊTA ne supprime que ses propres caches', () => {
    expect(sw).not.toMatch(/localStorage|indexedDB/);
    expect(vite).toContain("keys.filter((k) => k.startsWith('rekka-beta-') && k !== CACHE)");
  });
  it('FAST TRACK V1 — hors ligne dès la première visite : la BÊTA met en cache tous les fichiers de sa build à l’installation', () => {
    expect(vite).toContain("readdirSync(join(outDir, 'assets'))");
    expect(sw).toContain("c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png'])");
  });
});

describe('REKKA BÊTA — Chantier D : identité PWA REKKA', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')) as { id?: string; start_url: string; scope: string; background_color: string; icons: { src: string }[] };
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  it('identifiant, start_url et scope de la BÊTA inchangés (mise à jour sur place, jamais d’installation en double)', () => {
    expect(vite).toContain("id: './?kairo-channel=beta'");
    expect(vite).not.toMatch(/start_url:|scope:/);
  });
  it('icônes REKKA officielles sous des noms NOUVEAUX (192, 512, maskable) et fond de lancement bleu nuit', () => {
    for (const f of ['rekka-icon-192.png', 'rekka-icon-512.png', 'rekka-icon-192-maskable.png', 'rekka-icon-512-maskable.png']) expect(vite).toContain(`src: '${f}'`);
    expect(vite).toContain("purpose: 'maskable'");
    expect(vite).toContain("const REKKA_ICON_DIR = 'resources/android-test-icons';");
    expect(vite).toContain('background_color: BETA_COLOR, icons: REKKA_MANIFEST_ICONS');
    expect(vite).toContain("const BETA_COLOR = '#04121f';");
    expect(vite).toContain("'<link rel=\"apple-touch-icon\" href=\"./rekka-apple-touch-icon.png\" />'");
  });
  it('service worker BÊTA : icônes REKKA dans la liste de préchargement, garde de transformation conservée', () => {
    expect(vite).toContain("...Object.keys(REKKA_ICON_FILES).map((f) => `./${f}`), ...assets");
    expect(vite).toContain("!next.includes('\"./rekka-icon-512-maskable.png\"')");
    expect(vite).toContain("throw new Error('service worker : transformation du canal BÊTA impossible')");
  });
  it('production inchangée : plugin réservé à la variable BÊTA, manifeste et page KAIRO d’origine', () => {
    expect(vite).toContain("plugins: [react(), ...(BETA ? [betaChannel()] : [])]");
    expect(manifest.id).toBeUndefined();
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.background_color).toBe('#0B0B0D');
    expect(manifest.icons.map((i) => i.src)).toEqual(['icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'icon.svg']);
    expect(html).toContain('<link rel="icon" href="./icon.svg" type="image/svg+xml" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="./icon-192.png" />');
    expect(html).not.toContain('rekka-');
  });
});
