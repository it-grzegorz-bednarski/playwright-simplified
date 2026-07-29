# ESLint

← [Back to main documentation](../README.md)

## Overview

ESLint is used for static code analysis and enforcing code quality. It helps catch potential bugs, enforce coding standards, and maintain consistent code style across the project.

---

## Configuration

ESLint configuration is located in [`eslint.config.js`](../eslint.config.js) using the modern flat config format.

Note: ESLint uses a dedicated TypeScript config file [`tsconfig.eslint.json`](../tsconfig.eslint.json) via `parserOptions.project`. This keeps type-aware linting fast and scoped, and prevents mixing build-specific settings with linting.

Example configuration (`eslint.config.js`) — refer to the file for the current state:

```javascript
module.exports = [
  {
    ignores: ['node_modules/', 'eslint.config.js', '**/build/**'],
  },
  {
    files: ['**/*.ts', '**/*.js'],
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
    },
  },
];
```

**Plugins used:**

- **`@typescript-eslint`** - TypeScript-specific linting rules
- **`eslint-plugin-import-x`** - Import/dependency validation (fork of `eslint-plugin-import` with ESLint 9/10 + flat config support)
- **`eslint-plugin-playwright`** - Playwright test best practices
- **`eslint-plugin-no-only-tests`** - Prevents `.only()` in tests
- **`eslint-plugin-prettier`** - Integration with **[Prettier](./prettier.md)**
- **`eslint-plugin-unused-imports`** - Detects and removes unused imports/vars

---

## Usage

To manually run ESLint:

```sh
yarn eslint .
```

---

## Integration with other tools

ESLint works seamlessly with:

- **[Husky](./husky.md)** - Runs lint-staged automatically in pre-commit hooks
- **[Lint-staged](./lintStaged.md)** - Run linting only on staged files before commits
- **[Prettier](./prettier.md)** - Code formatting (integrated via `eslint-plugin-prettier`)
- **[TypeScript](./typescript.md)** - Type checking and TS-specific rules

---

## References

- **[ESLint Documentation](https://eslint.org/docs/user-guide/configuring/rules)**
