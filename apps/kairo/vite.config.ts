import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Canal `rc1-test` (`VITE_KAIRO_CHANNEL=rc1-test`) : identité TEST dans la page, le manifeste PWA et le service worker
 * (nom, identifiant, couleur, cache préfixé qui ne supprime jamais que ses propres caches). Sans la variable : la build
 * de production est produite à l'identique (aucune transformation).
 */
const TEST = process.env.VITE_KAIRO_CHANNEL === 'rc1-test';
const TEST_LABEL = 'KAIRO RC1 — TEST';
const TEST_COLOR = '#8A1C1C';
function rc1TestChannel(): Plugin {
  let outDir = 'dist';
  return {
    name: 'kairo-rc1-test-channel',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    transformIndexHtml: (html) => html
      .replace('<title>KAIRO</title>', `<title>${TEST_LABEL}</title>`)
      .replace('<meta name="theme-color" content="#0B0B0D" />', `<meta name="theme-color" content="${TEST_COLOR}" />`)
      .replace('content="KAIRO — entraînement multisport"', `content="${TEST_LABEL} — environnement de test isolé"`),
    closeBundle() {
      const manifestPath = join(outDir, 'manifest.webmanifest');
      const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
      writeFileSync(manifestPath, `${JSON.stringify({ ...m, id: './?kairo-channel=rc1-test', name: TEST_LABEL, short_name: 'KAIRO TEST', description: `${TEST_LABEL} — environnement de test isolé, règles expérimentales non validées`, theme_color: TEST_COLOR }, null, 2)}\n`);
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      const next = sw
        .replace("const CACHE = 'kairo-beta0-2';", "const CACHE = 'kairo-rc1-test-1';")
        .replace('keys.filter((k) => k !== CACHE)', "keys.filter((k) => k.startsWith('kairo-rc1-test-') && k !== CACHE)");
      if (next === sw || !next.includes("'kairo-rc1-test-1'") || !next.includes("k.startsWith('kairo-rc1-test-')")) throw new Error('service worker : transformation du canal de test impossible');
      writeFileSync(swPath, next);
    },
  };
}

// Base relative : l'application fonctionne à la racine d'un hôte statique comme dans un sous-dossier.
export default defineConfig({
  base: './',
  plugins: [react(), ...(TEST ? [rc1TestChannel()] : [])],
  // Identifiant de build (commit du déploiement ; vide hors CI ⇒ `dev`) : affiché dans Réglages, comparé à version.json.
  define: { __KAIRO_BUILD__: JSON.stringify((process.env.GITHUB_SHA ?? '').slice(0, 7)), __KAIRO_BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  // Les moteurs (CORE, Strength, Running) et leurs schémas tournent dans le navigateur : ~215 ko gzip assumés en V0.
  build: { outDir: 'dist', target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1000 },
});
