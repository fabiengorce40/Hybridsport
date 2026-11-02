import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * REKKA V2 — build du PROTOTYPE isolé (lot V2-2) : racine `prototype/`, sortie `dist-prototype/`. Distincte de la build
 * de l'application (`vite.config.ts`, `dist/`) : aucun fichier de l'application publiée n'est modifié ni ajouté.
 */
// Page AUTONOME (`PROTO_SINGLE=1`, script `proto:single`) : images du kit (SVG, WebP) intégrées au JS en data URI pour
// une ouverture hors ligne sans serveur. Build servie normale : fichiers séparés (seuil Vite par défaut).
const single = process.env.PROTO_SINGLE === '1';

export default defineConfig({
  root: 'prototype',
  base: './',
  plugins: [react()],
  // technical-constant: seuil d'intégration (octets) couvrant les 3 WebP du kit (≤ 150 ko chacun, test v2-assets).
  build: { outDir: '../dist-prototype', emptyOutDir: true, target: 'es2022', sourcemap: false, assetsInlineLimit: single ? 200_000 : undefined },
});
