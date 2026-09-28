import { defineConfig } from 'vitest/config';

/**
 * Stryker ciblé RunningEngine vague 1 (phase 6B), leçon de 6A : un seul worker vitest par exécution,
 * tests Running uniquement (les tests d'architecture lisent le texte instrumenté et restent dans `pnpm test`).
 */
export default defineConfig({
  test: {
    fileParallelism: false,
    include: ['packages/running/tests/unit/**/*.test.ts', 'packages/running/tests/integration/**/*.test.ts'],
  },
});
