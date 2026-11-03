import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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
function betaChannel(): Plugin {
  let outDir = 'dist';
  return {
    name: 'rekka-beta-channel',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    transformIndexHtml: (html) => html
      .replace('<title>KAIRO</title>', `<title>${BETA_LABEL}</title>`)
      .replace('<meta name="theme-color" content="#0B0B0D" />', `<meta name="theme-color" content="${BETA_COLOR}" />`)
      .replace('content="KAIRO — entraînement multisport"', `content="${BETA_LABEL} — version complète de validation, données séparées"`),
    closeBundle() {
      const manifestPath = join(outDir, 'manifest.webmanifest');
      const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
      writeFileSync(manifestPath, `${JSON.stringify({ ...m, id: './?kairo-channel=beta', name: BETA_LABEL, short_name: 'REKKA β', description: `${BETA_LABEL} — version complète de validation, données séparées`, theme_color: BETA_COLOR }, null, 2)}\n`);
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      // FAST TRACK V1 — hors ligne dès la PREMIÈRE visite : tous les fichiers versionnés de la build (scripts, styles,
      // images, polices) sont mis en cache à l'installation, et non plus seulement au fil des requêtes.
      const SHELL = "['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png']";
      const assets = readdirSync(join(outDir, 'assets')).sort().map((f) => `./assets/${f}`);
      const next = sw
        .replace("const CACHE = 'kairo-beta0-2';", "const CACHE = 'rekka-beta-1';")
        .replace('keys.filter((k) => k !== CACHE)', "keys.filter((k) => k.startsWith('rekka-beta-') && k !== CACHE)")
        .replace(SHELL, JSON.stringify(['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', ...assets]));
      if (next === sw || !next.includes("'rekka-beta-1'") || !next.includes("k.startsWith('rekka-beta-')") || (assets.length > 0 && !next.includes(JSON.stringify(assets[0])))) throw new Error('service worker : transformation du canal BÊTA impossible');
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
