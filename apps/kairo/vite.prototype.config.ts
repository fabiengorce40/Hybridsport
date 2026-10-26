import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * REKKA V2 — build du PROTOTYPE isolé (lot V2-2) : racine `prototype/`, sortie `dist-prototype/`. Distincte de la build
 * de l'application (`vite.config.ts`, `dist/`) : aucun fichier de l'application publiée n'est modifié ni ajouté.
 */
export default defineConfig({
  root: 'prototype',
  base: './',
  plugins: [react()],
  build: { outDir: '../dist-prototype', emptyOutDir: true, target: 'es2022', sourcemap: false },
});
