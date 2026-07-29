# Test Runner

← [Back to main documentation](../README.md)

## Overview

Custom CLI wrapper around Playwright that handles environment loading and running tests or helper commands from a single entrypoint.

Goals:

- one command for all local runs (`yarn test <env> ...`),
- automatic env loading before any command runs (`process.env.ENV` + all values from `env/.env.<env>`),
- reusable aliases for common test combinations (no need for dozens of separate `package.json` scripts),
- built-in validation with descriptive error messages for unknown environments, projects, and tags,
- helper commands (`eslint`, `prettier`, `tscheck`, `report`) under the same entrypoint,
- fail-fast diagnostics logged to `build/error.log`.

---

## Configuration

Runner configuration lives in **`config/testRunner.config.cjs`**.

**Example configuration:**

```js
module.exports = {
  // ---------------------------------------------------------------------------
  // Verbose mode
  // ---------------------------------------------------------------------------

  // When true, prints the fully expanded Playwright command before execution.
  // Can also be enabled without editing this file:
  //   PW_VERBOSE=1 yarn test dev sanityScan
  verbose: false,

  // ---------------------------------------------------------------------------
  // Ignored tags
  // ---------------------------------------------------------------------------

  // Tags always excluded from shared runs (appended as --grep-invert).
  ignoredTags: ['@deprecated'],

  // ---------------------------------------------------------------------------
  // Separate run modes
  // ---------------------------------------------------------------------------

  // Tags treated as dedicated run modes.
  // They are excluded from shared runs unless explicitly selected.
  // Use them as positional arguments, optionally with --grep (AND) or --grep-invert:
  //   yarn test dev visual
  //   yarn test dev performanceTest
  //   yarn test dev visual --grep "@smoke"
  //   yarn test dev performanceTest --grep-invert "@flaky"
  separateRunModes: ['@visual', '@performanceTest', '@performanceMonitoring'],

  // ---------------------------------------------------------------------------
  // Aliases
  // ---------------------------------------------------------------------------

  // Reusable shortcuts for common test combinations.
  // Format:
  //   'alias-name': '--playwright-flags ...'          (simple)
  //   'alias-name': 'env other-alias'                 (composable)
  //
  // Run "yarn test help" to see all defined aliases in the CLI.
  aliases: {
    sanityScan: '--grep "@smoke|@sanity"',
    security: '--grep "@cspCheck|@securityHeaders"',
    'testBrand:security': '--project testBrand security',
    'dev:multi': 'dev --project multilocale',
    'dev:slavic': 'dev --grep "@slavic"',
  },
};
```

**Config fields:**

- **`verbose`** – when `true`, prints the fully expanded Playwright command before execution. Can be enabled on demand via `PW_VERBOSE=1 yarn test ...` without editing this file.
- **`ignoredTags`** – tags automatically excluded from shared runs via `--grep-invert`. Useful for permanently skipping deprecated or work-in-progress tests.
- **`separateRunModes`** – tags that define dedicated run modes (e.g. `@visual`, `@performanceTest`, `@performanceMonitoring`). These are excluded from all shared runs and must be invoked explicitly. You can combine them with `--grep` (AND) or `--grep-invert` for additional filtering. See [Run modes](#run-modes) for usage.
- **`aliases`** – reusable shortcuts for common flag combinations. Support simple and composable forms. See [Aliases](#aliases) for details. Percy is exposed here as the `percy` alias that expands to the `visual` run mode.

### Verbose / debug output

When `verbose` is `false`, the runner stays quiet and only prints the regular Playwright output.

When `verbose` is `true` (or when `PW_VERBOSE=1` is set), the runner prints the full command that will be executed after alias expansion and runner-level filtering.

Example:

```js
aliases: {
  'security': '--grep "@cspCheck|@securityHeaders"',
}
```

```sh
# verbose = false
yarn test dev security

# verbose = true
[testRunner] Running: yarn test dev --grep "@cspCheck|@securityHeaders" --grep-invert "(@deprecated|@visual|@performanceTest|@performanceMonitoring)"
```

---

## Usage

### Running tests

```sh
yarn test <env>
yarn test <env> [playwright-args...]
```

**Examples:**

```sh
# All tests in the dev environment
yarn test dev

# Filter by tag
yarn test dev --grep "@smoke"
yarn test dev --grep "@sanity"
yarn test dev --grep "@smoke|@sanity"

# Exclude a tag
yarn test dev --grep-invert "@flaky"

# Run tests for a specific project (brand/locale)
yarn test dev --project testBrand

# Run all locales of a multi-locale project
yarn test dev --project multilocale

# Run a specific locale of a multi-locale project
yarn test dev --project multilocale-pl
yarn test dev --project multilocale-cs

# Combine project and tag filter
yarn test dev --project testBrand --grep "@smoke"

# Run a single test file
yarn test dev tests/<brandName>/functional/cookies.spec.ts --reporter=line
```

---

### Run modes

`separateRunModes` are dedicated modes for test types that should not run alongside standard tests.
They are configured in **`config/testRunner.config.cjs`** under the `separateRunModes` key.

> **Important:** modes like `visual`, `performanceTest`, and `performanceMonitoring` are automatically excluded from shared runs. They must always be invoked explicitly.
>
> You can combine a mode with additional filters (`--grep` / `--grep-invert`). testRunner keeps the mode tag required and applies your extra filters on top.

For Percy-backed visual runs, see [Visual Testing](./visualTesting.md). testRunner loads `env/.env.<env>` and starts Percy automatically when `visual` / `percy` mode is selected.

```sh
yarn test dev visual
yarn test dev performanceTest
yarn test dev performanceMonitoring

# Mode + additional include tag (AND)
yarn test dev visual --grep "@smoke"

# Mode + additional exclude tag
yarn test dev performanceTest --grep-invert "@flaky"
```

Combined with a project:

```sh
yarn test dev --project testBrand performanceTest
yarn test dev --project testBrand visual
```

---

### Aliases

Aliases are reusable shortcuts for common flag combinations. They are expanded before Playwright runs, so the full expanded command is always transparent (use `PW_VERBOSE=1` to inspect it).

**Two alias forms:**

| Form                                      | Example definition                         |
| ----------------------------------------- | ------------------------------------------ |
| Simple — maps to Playwright flags         | `'sanityScan': '--grep "@smoke\|@sanity"'` |
| Composable — references env + other alias | `'dev:sanityScan': 'dev sanityScan'`       |

**Why aliases instead of `package.json` scripts?**

Aliases live in one config file, are listed in `yarn test` and `yarn test help`, support composability, and work across all environments without duplicating entries in `package.json`.

**Example: `sanityScan` alias**

Define once in config:

```js
aliases: {
  'sanityScan': '--grep "@smoke|@sanity"',
}
```

Run the same sanity scan across different environments — no extra config needed:

```sh
yarn test dev sanityScan
yarn test staging sanityScan
yarn test prod sanityScan
```

This is useful when you want one reusable command for the same scan across multiple environments.

**Example: composable alias**

```js
aliases: {
  'sanityScan': '--grep "@smoke|@sanity"',
  'dev:sanityScan': 'dev sanityScan',
}
```

```sh
# Both are equivalent:
yarn test dev sanityScan
yarn test dev:sanityScan
```

**Example: project-scoped alias**

```js
aliases: {
  'security': '--grep "@cspCheck|@securityHeaders"',
  'testBrand:security': '--project testBrand security',
}
```

```sh
# Run security checks across all projects
yarn test dev security

# Run security checks scoped to testBrand only
yarn test dev testBrand:security
```

You can mix aliases with environment names in the same way, for example `yarn test dev sanityScan` or `yarn test prod sanityScan`.

**Debug: see the expanded command**

```sh
PW_VERBOSE=1 yarn test dev sanityScan
# [testRunner] Running: yarn test dev --grep "@smoke|@sanity" --grep-invert "..."
```

---

### UI mode

```sh
yarn test <env> ui
yarn test <env> ui --project testBrand
```

- `yarn test <env> ui` without `--project` starts interactive project selection.
- In interactive selection, use the arrow keys to choose a project and press `Enter` to confirm.
- UI mode works with one concrete project at a time; it does not load multiple env configs or multiple projects simultaneously.
- If you want a specific locale project, pass the concrete project name directly (for example `--project multilocale-pl`). Prefix selectors are resolved to a single concrete project, not to all locales at once.

---

### Helper commands

```sh
yarn test eslint        # Run ESLint
yarn test prettier      # Run Prettier
yarn test tscheck       # Run TypeScript type check
yarn test report        # Open Playwright HTML report
```

---

### GitHub Actions dispatch

To dispatch CI runs directly from test runner, use `--github`:

```sh
yarn test <env> --github
yarn test <env> --grep "@smoke" --github
```

Setup details (token, workflow permissions, repository secrets naming like `ENV_DEV`) are documented here:

- [`docs/githubActionsDispatch.md`](./githubActionsDispatch.md)
- [`docs/playwrightDispatch.md`](./playwrightDispatch.md) - workflow file reference
- [`docs/playwrightDispatchSharded.md`](./playwrightDispatchSharded.md) - sharded workflow reference (auto-selected when `sharding.totalShards` > 1)

---

### Help output

```sh
yarn test               # Compact helper: env, aliases, run modes, examples
yarn test help          # Full help: all projects, grep tags, detailed examples
```

---

## Notes

- Projects and locale routing are defined in native Playwright config (`playwright.config.ts` + `utils/projectsBuilder.ts`).
- Tags are native Playwright (`--grep` / `--grep-invert`).
- When a run mode (`visual`, `performanceTest`, `performanceMonitoring`) is combined with `--grep`, testRunner merges them as logical AND — the mode tag is always required and the extra `--grep` value narrows the selection further.
- Aliases are expanded before validation — invalid resulting flags are still caught and reported with helpful error messages.
- For additional Playwright CLI options and filtering syntax, see the official [Playwright docs](https://playwright.dev/docs/intro).
