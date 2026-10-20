import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Canal `r51-preview` (`VITE_KAIRO_CHANNEL=r51-preview`) : identité PRÉVISUALISATION dans la page, le manifeste PWA et le
 * service worker (nom, identifiant, couleur, cache préfixé qui ne supprime jamais que ses propres caches). Sans la
 * variable : la build de production est produite à l'identique (aucune transformation).
 */
const PREVIEW = process.env.VITE_KAIRO_CHANNEL === 'r51-preview';
const PREVIEW_LABEL = 'REKKA R5.1 — PRÉVISUALISATION';
const PREVIEW_COLOR = '#3B2A7A';
function r51PreviewChannel(): Plugin {
  let outDir = 'dist';
  return {
    name: 'kairo-r51-preview-channel',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    transformIndexHtml: (html) => html
      .replace('<title>KAIRO</title>', `<title>${PREVIEW_LABEL}</title>`)
      .replace('<meta name="theme-color" content="#0B0B0D" />', `<meta name="theme-color" content="${PREVIEW_COLOR}" />`)
      .replace('content="KAIRO — entraînement multisport"', `content="${PREVIEW_LABEL} — prévisualisation isolée"`),
    closeBundle() {
      const manifestPath = join(outDir, 'manifest.webmanifest');
      const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
      writeFileSync(manifestPath, `${JSON.stringify({ ...m, id: './?kairo-channel=r51-preview', name: PREVIEW_LABEL, short_name: 'REKKA R5.1', description: `${PREVIEW_LABEL} — prévisualisation isolée, données séparées`, theme_color: PREVIEW_COLOR }, null, 2)}\n`);
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      const next = sw
        .replace("const CACHE = 'kairo-beta0-2';", "const CACHE = 'kairo-r51-preview-1';")
        .replace('keys.filter((k) => k !== CACHE)', "keys.filter((k) => k.startsWith('kairo-r51-preview-') && k !== CACHE)");
      if (next === sw || !next.includes("'kairo-r51-preview-1'") || !next.includes("k.startsWith('kairo-r51-preview-')")) throw new Error('service worker : transformation du canal de prévisualisation impossible');
      writeFileSync(swPath, next);
    },
  };
}

// Base relative : l'application fonctionne à la racine d'un hôte statique comme dans un sous-dossier.
export default defineConfig({
  base: './',
  plugins: [react(), ...(PREVIEW ? [r51PreviewChannel()] : [])],
  // Identifiant de build (commit du déploiement ; vide hors CI ⇒ `dev`) : affiché dans Réglages, comparé à version.json.
  define: { __KAIRO_BUILD__: JSON.stringify((process.env.GITHUB_SHA ?? '').slice(0, 7)), __KAIRO_BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  // Les moteurs (CORE, Strength, Running) et leurs schémas tournent dans le navigateur : ~215 ko gzip assumés en V0.
  build: { outDir: 'dist', target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1000 },
});
