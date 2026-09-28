import { defineConfig } from 'vitest/config';

/**
 * Stryker ciblé KAIRO V0 (app-core) : tests app-core uniquement, un seul worker par exécution. Le test
 * d'architecture lit le texte des sources (instrumenté dans le bac à sable) : il reste dans `pnpm test`.
 */
export default defineConfig({
  test: {
    fileParallelism: false,
    include: ['packages/app-core/tests/**/*.test.ts'],
    exclude: ['packages/app-core/tests/architecture.test.ts'],
  },
});
