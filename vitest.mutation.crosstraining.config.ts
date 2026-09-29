import { defineConfig } from 'vitest/config';

/**
 * Stryker ciblé Cross-training C1 : un seul worker vitest, tests unitaires et d'intégration du paquet
 * (les tests d'architecture lisent le texte instrumenté et restent dans `pnpm test`).
 */
export default defineConfig({
  test: {
    fileParallelism: false,
    include: ['packages/crosstraining/tests/unit/**/*.test.ts', 'packages/crosstraining/tests/integration/**/*.test.ts'],
  },
});
