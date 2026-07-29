# Prettier

← [Back to main documentation](../README.md)

## Overview

Prettier is a code formatter tool that ensures consistent code formatting across the project.

---

## Configuration

Prettier configuration is located in the `.prettierrc` file. You can adjust these settings to fit your team's preferences.

**Example configuration (`.prettierrc`):**

```json
{
  "arrowParens": "avoid",
  "bracketSpacing": true,
  "endOfLine": "auto",
  "printWidth": 100,
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "useTabs": false
}
```

**Key configuration options:**

- **`arrowParens`**: Avoids parentheses around single arrow function parameters
- **`bracketSpacing`**: Adds spaces inside object literals (e.g., `{ foo: bar }`)
- **`endOfLine`**: Auto-detects line endings for cross-platform compatibility
- **`printWidth`**: Sets maximum line length to 100 characters
- **`semi`**: Requires semicolons at the end of statements
- **`singleQuote`**: Uses single quotes instead of double quotes
- **`tabWidth`**: Sets indentation to 2 spaces
- **`trailingComma`**: Adds trailing commas where valid in ES5 (objects, arrays)
- **`useTabs`**: Uses spaces for indentation instead of tabs

---

## Usage

To manually format all supported files in the project, run:

```sh
yarn prettier . --write
```

This command formats all supported file types (JavaScript, TypeScript, JSON, Markdown, YAML, HTML, CSS, etc.) in the current directory and subdirectories.

### Common commands

**Check formatting without making changes** (dry-run):

```sh
yarn prettier . --check
```

**Format a specific file**:

```sh
yarn prettier <path-to-file> --write
```

Examples:

```sh
yarn prettier docs/eslint.md --write
yarn prettier package.json --write
yarn prettier src/test.ts --write
```

**Format files matching a pattern**:

```sh
yarn prettier "src/**/*.ts" --write
```

**Integration:** Prettier is integrated with:

- **[ESLint](./eslint.md)** via `eslint-plugin-prettier` - reports formatting issues during linting
- **[Husky](./husky.md)** - triggers lint-staged automatically during pre-commit
- **[Lint-staged](./lintStaged.md)** - formats staged files before commit

---

## References

- **[Prettier Documentation](https://prettier.io/docs/)**
