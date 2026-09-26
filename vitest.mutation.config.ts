import { defineConfig } from 'vitest/config';

/**
 * Configuration pour Stryker : les tests d'architecture analysent le TEXTE des sources, qui est
 * instrumenté par Stryker ; ils sont donc exclus ici (ils restent exécutés par `pnpm test`).
 */
export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.ts'],
    exclude: ['packages/*/tests/architecture/**', 'packages/*/tests/golden/**', '**/node_modules/**'],
  },
});
