const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const playwrightPlugin = require('eslint-plugin-playwright');
const importXPlugin = require('eslint-plugin-import-x');
const prettierPlugin = require('eslint-plugin-prettier');
const noOnlyTestsPlugin = require('eslint-plugin-no-only-tests');
const unusedImportsPlugin = require('eslint-plugin-unused-imports');

/** @type {import('eslint').FlatConfig[]} */
module.exports = [
  {
    ignores: [
      'node_modules/',
      'dist/',
      '*.min.js',
      'eslint.config.js',

      // "build/" matches buildDir in playwright.config.ts — update both if renamed
      'build/',

      // Common caches/output
      '**/.cache/**',
      '**/.eslintcache',
    ],
  },
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      globals: {
        NodeJS: 'readonly',
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import-x': importXPlugin,
      'no-only-tests': noOnlyTestsPlugin,
      playwright: playwrightPlugin,
      prettier: prettierPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-expressions': 'error',
      'import-x/no-extraneous-dependencies': 'warn',
      'no-only-tests/no-only-tests': 'error',
      'prettier/prettier': 'warn',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
];
