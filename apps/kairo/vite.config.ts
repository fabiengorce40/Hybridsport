import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base relative : l'application fonctionne à la racine d'un hôte statique comme dans un sous-dossier.
export default defineConfig({
  base: './',
  plugins: [react()],
  // Les moteurs (CORE, Strength, Running) et leurs schémas tournent dans le navigateur : ~215 ko gzip assumés en V0.
  build: { outDir: 'dist', target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1000 },
});
