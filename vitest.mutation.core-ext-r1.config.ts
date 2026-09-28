import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Stryker ciblé CORE-EXT-R1 (phase 6A) : tests de la séance structurée, des migrations, de la durée et
 * du validateur (les tests d'architecture lisent le texte instrumenté et restent dans `pnpm test`).
 * `@hybridsport/domain` est résolu vers les sources du bac à sable : le lien de l'espace de travail
 * pointe sinon vers les sources d'origine et les mutants du domaine ne seraient jamais exécutés.
 */
export default defineConfig({
  resolve: { alias: { '@hybridsport/domain': resolve(import.meta.dirname, 'packages/domain/src/index.ts') } },
  test: {
    // Un seul worker par exécution : avec la concurrence de Stryker, plusieurs workers par mutant
    // saturaient le CPU (charge ≈ 33 sur 4 cœurs lors du passage interrompu).
    fileParallelism: false,
    include: [
      'packages/engine/tests/unit/core-ext-r1.test.ts',
      'packages/engine/tests/unit/core-ext-r1-hardening.test.ts',
      'packages/engine/tests/property/core-ext-r1.property.test.ts',
      'packages/engine/tests/integration/core-ext-r1-boundary.test.ts',
      'packages/engine/tests/unit/migration.test.ts',
    ],
    env: { STRENGTH_MUTATION_RUN: '1' },
  },
});
