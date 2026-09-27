import { defineConfig } from 'vitest/config';

/**
 * Stryker ciblé StrengthEngine (phase 4C) : tests unitaires et d'intégration du package strength
 * (les tests d'architecture lisent le texte instrumenté ; goldens, fuzz et simulations sont trop lents
 * pour une exécution par mutant et restent dans `pnpm test`).
 */
export default defineConfig({
  test: {
    include: ['packages/strength/tests/unit/**/*.test.ts', 'packages/strength/tests/integration/**/*.test.ts'],
    env: { STRENGTH_MUTATION_RUN: '1' },
  },
});
