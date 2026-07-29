# Lint-staged

← [Back to main documentation](../README.md)

## Overview

Lint-staged runs a set of predefined actions only on files that have been changed and staged in Git before a commit. This ensures that only the changes you're about to commit are checked and processed by the linters and formatters, helping to keep the codebase clean and consistent.

---

## Configuration

Lint-staged configuration is located in the `package.json` file under the `lint-staged` section.

**Example configuration (`package.json`):**

```json
{
  "lint-staged": {
    "**/*.{js,ts}": ["eslint --fix", "prettier --write"]
  }
}
```

**Configuration breakdown:**

- **`"**/*.{js,ts}"`**: Matches all JavaScript and TypeScript files in the project
- **`"eslint --fix"`**: Runs ESLint and automatically fixes fixable issues
- **`"prettier --write"`**: Formats code according to Prettier configuration

---

## How it works

1. **Git staging**: When you stage files with `git add`, lint-staged identifies which files are staged
2. **Pattern matching**: Only files matching the configured patterns (e.g., `**/*.{js,ts}`) are processed
3. **Sequential execution**: Commands run in order - first ESLint fixes issues, then Prettier formats
4. **Automatic re-staging**: After processing, modified files are automatically re-staged

---

## Integration with other tools

Lint-Staged works seamlessly with:

- **[ESLint](./eslint.md)** - runs ESLint fixes on staged files
- **[Husky](./husky.md)** - triggers lint-staged on pre-commit
- **[Prettier](./prettier.md)** - runs code formatting on staged files

---

## References

- **[Lint-staged Documentation](https://github.com/okonet/lint-staged)**
