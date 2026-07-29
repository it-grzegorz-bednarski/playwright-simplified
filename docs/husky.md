# Husky

← [Back to main documentation](../README.md)

## Overview

Husky manages Git hooks and automates checks like linting and formatting before commits. In this project, Husky runs **[lint-staged](./lintStaged.md)** on pre-commit and **typecheck** on pre-push.

---

## Setup

After cloning the repository and running `yarn install`, Husky is set up automatically through the `prepare` script in `package.json`.

No additional manual setup is required for contributors.

---

## Usage

Hooks run automatically at the appropriate Git event — no manual invocation needed:

| Hook         | Trigger      | What runs                                         |
| ------------ | ------------ | ------------------------------------------------- |
| `pre-commit` | `git commit` | `lint-staged` (ESLint + Prettier on staged files) |
| `pre-push`   | `git push`   | `tsc --noEmit` (full typecheck)                   |

---

## Configuration

### Pre-commit hook (single-repo and monorepo ready)

The `.husky/pre-commit` script supports both single-repo and monorepo setups. To add more packages in a monorepo, update the `packages` array.

```sh
#!/bin/sh
# === Husky pre-commit hook for lint-staged in (mono)repo ===
packages=("./")

root_dir=$(pwd)
for package in "${packages[@]}"; do
  cd "$root_dir/$package" || exit 1
  echo "Starting lint-staged for:"
  pwd
  yarn lint-staged || exit 1
done
```

### Pre-push hook (single-repo and monorepo ready)

The `.husky/pre-push` script runs a full TypeScript typecheck before pushing. To add more packages in a monorepo, update the `packages` array.

```sh
#!/bin/sh
# === Husky pre-push hook for typecheck in (mono)repo ===
packages=("./")

root_dir=$(pwd)
for package in "${packages[@]}"; do
  cd "$root_dir/$package" || exit 1
  echo "Starting typecheck for:"
  pwd
  if ! find . -name "*.ts" -not -path "*/node_modules/*" | grep -q .; then
    echo "No .ts files found, skipping typecheck."
    continue
  fi
  yarn tsc --noEmit || exit 1
done
```

---

## Customization

You can add or customize hooks by editing files in `.husky/`.

Common hooks:

- `pre-commit` - runs before commit
- `pre-push` - runs before push
- `commit-msg` - validates commit messages

---

## Integration with Lint-staged

Husky and **[lint-staged](./lintStaged.md)** work together:

1. Husky triggers hooks on Git events.
2. Lint-staged processes only the staged files with linters and formatters.
3. Together they block commits that do not meet project quality rules.

## References

- **[Husky Documentation](https://typicode.github.io/husky/#/)**
