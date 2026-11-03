import { copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Canal `beta` (`VITE_KAIRO_CHANNEL=beta`) : identité REKKA BÊTA dans la page, le manifeste PWA et le service worker (nom,
 * identifiant, couleur, cache préfixé qui ne supprime jamais que ses propres caches). Sans la variable : la build de
 * production est produite à l'identique (aucune transformation).
 */
const BETA = process.env.VITE_KAIRO_CHANNEL === 'beta';
const BETA_LABEL = 'REKKA BÊTA';
const BETA_COLOR = '#04121f'; // FAST TRACK V1 : bleu nuit de la charte REKKA (identifiant du manifeste inchangé)
/**
 * Chantier D — identité PWA REKKA (BÊTA uniquement) : icônes officielles pleine surface
 * (`resources/android-test-icons/`, cf. docs/kairo/REKKA-ICONE-FULLBLEED-2026-10-29.md) copiées dans la build sous des
 * noms NOUVEAUX : la PWA installée les retélécharge, tandis que `id`, `start_url` et `scope` restent inchangés (mise à
 * jour sur place, jamais d'installation en double). Les icônes KAIRO de `public/` restent servies pour la production.
 */
const REKKA_ICON_DIR = 'resources/android-test-icons';
const REKKA_ICON_FILES: Record<string, string> = {
  'rekka-icon-192.png': 'icon-192.png',
  'rekka-icon-512.png': 'icon-512.png',
  'rekka-icon-192-maskable.png': 'icon-192-maskable.png',
  'rekka-icon-512-maskable.png': 'icon-512-maskable.png',
  'rekka-apple-touch-icon.png': 'icon-180.png',
  'rekka-favicon.ico': 'favicon.ico',
};
const REKKA_MANIFEST_ICONS = [
  { src: 'rekka-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: 'rekka-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: 'rekka-icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: 'rekka-icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];
/** Remplacement obligatoire : une page source modifiée ailleurs fait échouer la build BÊTA au lieu de livrer l'ancienne identité. */
function mustReplace(text: string, from: string, to: string): string {
  if (!text.includes(from)) throw new Error(`canal BÊTA : « ${from} » introuvable`);
  return text.replace(from, to);
}
function betaChannel(): Plugin {
  let outDir = 'dist';
  let root = '.';
  return {
    name: 'rekka-beta-channel',
    apply: 'build',
    configResolved(c) { root = c.root; outDir = resolve(c.root, c.build.outDir); },
    transformIndexHtml: (html) => {
      const page = html
        .replace('<title>KAIRO</title>', `<title>${BETA_LABEL}</title>`)
        .replace('<meta name="theme-color" content="#0B0B0D" />', `<meta name="theme-color" content="${BETA_COLOR}" />`)
        .replace('content="KAIRO — entraînement multisport"', `content="${BETA_LABEL} — version complète de validation, données séparées"`);
      return mustReplace(
        mustReplace(page, '<link rel="icon" href="./icon.svg" type="image/svg+xml" />', '<link rel="icon" href="./rekka-favicon.ico" sizes="16x16 32x32 48x48" />'),
        '<link rel="apple-touch-icon" href="./icon-192.png" />', '<link rel="apple-touch-icon" href="./rekka-apple-touch-icon.png" />',
      );
    },
    closeBundle() {
      for (const [to, from] of Object.entries(REKKA_ICON_FILES)) copyFileSync(join(root, REKKA_ICON_DIR, from), join(outDir, to));
      const manifestPath = join(outDir, 'manifest.webmanifest');
      const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
      writeFileSync(manifestPath, `${JSON.stringify({ ...m, id: './?kairo-channel=beta', name: BETA_LABEL, short_name: 'REKKA β', description: `${BETA_LABEL} — version complète de validation, données séparées`, theme_color: BETA_COLOR, background_color: BETA_COLOR, icons: REKKA_MANIFEST_ICONS }, null, 2)}\n`);
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      // FAST TRACK V1 — hors ligne dès la PREMIÈRE visite : tous les fichiers versionnés de la build (scripts, styles,
      // images, polices) sont mis en cache à l'installation, et non plus seulement au fil des requêtes.
      const SHELL = "['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png']";
      const assets = readdirSync(join(outDir, 'assets')).sort().map((f) => `./assets/${f}`);
      const next = sw
        .replace("const CACHE = 'kairo-beta0-2';", "const CACHE = 'rekka-beta-1';")
        .replace('keys.filter((k) => k !== CACHE)', "keys.filter((k) => k.startsWith('rekka-beta-') && k !== CACHE)")
        .replace(SHELL, JSON.stringify(['./', './index.html', './manifest.webmanifest', ...Object.keys(REKKA_ICON_FILES).map((f) => `./${f}`), ...assets]));
      if (next === sw || !next.includes("'rekka-beta-1'") || !next.includes("k.startsWith('rekka-beta-')") || !next.includes('"./rekka-icon-512-maskable.png"') || (assets.length > 0 && !next.includes(JSON.stringify(assets[0])))) throw new Error('service worker : transformation du canal BÊTA impossible');
      writeFileSync(swPath, next);
    },
  };
}

// Base relative : l'application fonctionne à la racine d'un hôte statique comme dans un sous-dossier.
export default defineConfig({
  base: './',
  plugins: [react(), ...(BETA ? [betaChannel()] : [])],
  // Identifiant de build (commit du déploiement ; vide hors CI ⇒ `dev`) : affiché dans Réglages, comparé à version.json.
  define: { __KAIRO_BUILD__: JSON.stringify((process.env.GITHUB_SHA ?? '').slice(0, 7)), __KAIRO_BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  // Les moteurs (CORE, Strength, Running) et leurs schémas tournent dans le navigateur : ~215 ko gzip assumés en V0.
  build: { outDir: 'dist', target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1000 },
});
