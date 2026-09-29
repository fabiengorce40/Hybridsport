// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const domainSources = ['packages/domain/src/**/*.ts', 'packages/engine/src/**/*.ts', 'packages/strength/src/**/*.ts', 'packages/running/src/**/*.ts', 'packages/crosstraining/src/**/*.ts'];

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/dist-single/**', 'coverage/**', 'exports/**', 'reports/**', '.stryker-tmp/**', '.stryker-tmp-*/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Frontières du CORE (doublées par les tests d'architecture, qui font foi).
    files: domainSources,
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Le temps est injecté (EngineContext.now).' },
        { object: 'Math', property: 'random', message: 'Le hasard est injecté (SeededRng).' },
        { object: 'performance', property: 'now', message: 'Pas d’horloge système dans le CORE.' },
        { object: 'process', property: 'env', message: 'Pas de lecture de l’environnement dans le CORE.' },
        { object: 'crypto', property: 'getRandomValues', message: 'Le hasard est injecté (SeededRng).' },
        { object: 'crypto', property: 'randomUUID', message: 'Les identifiants sont injectés.' },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Pas de réseau dans le CORE.' },
        { name: 'XMLHttpRequest', message: 'Pas de réseau dans le CORE.' },
        { name: 'localStorage', message: 'Pas de stockage dans le CORE.' },
        { name: 'setTimeout', message: 'Pas de dépendance au temps réel dans le CORE.' },
        { name: 'setInterval', message: 'Pas de dépendance au temps réel dans le CORE.' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'new Date() lit l’horloge système : le temps est injecté.' },
      ],
    },
  },
  {
    // Service worker de la PWA (contexte ServiceWorkerGlobalScope).
    files: ['apps/*/public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { self: 'readonly', caches: 'readonly', fetch: 'readonly', URL: 'readonly', Promise: 'readonly' } },
  },
  {
    // Scripts Node de l'application (icônes, parcours de bout en bout).
    files: ['apps/*/scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } },
  },
  {
    // Les tests portent sur des fixtures connues : l'assertion non nulle y est acceptable.
    files: ['packages/*/tests/**/*.ts', 'apps/*/tests/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
