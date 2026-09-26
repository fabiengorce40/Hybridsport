// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const domainSources = ['packages/domain/src/**/*.ts', 'packages/engine/src/**/*.ts'];

export default tseslint.config(
  { ignores: ['**/node_modules/**', 'coverage/**', 'exports/**', 'reports/**', '.stryker-tmp/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.ts'],
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
    // Les tests portent sur des fixtures connues : l'assertion non nulle y est acceptable.
    files: ['packages/*/tests/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
