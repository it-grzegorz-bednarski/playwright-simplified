# Reporters

← [Back to main documentation](../README.md)

## Overview

This project uses multiple reporters to present and persist test results. They are configured in `playwright.config.ts` under the `reporter` section.

Note: This page describes Playwright test result reporters (run-level status and outputs), not feature-specific reporters for domains like Accessibility or Performance.

---

## Configuration

Reporters are defined in the `reporter` array inside `playwright.config.ts`. The array is built dynamically so it adapts to CI vs local runs, and to sharded vs non-sharded CI runs:

```ts
const ciShardReporters: ReporterDescription[] = [
  ['blob', { outputDir: `${buildDir}/blob-report` }],
];

const nonShardedReporters: ReporterDescription[] = [
  ['html', { outputFolder: `${buildDir}/html-report`, open: 'never' }],
  ['junit', { outputFile: `${buildDir}/junit/results.xml` }],
  ['json', { outputFile: `${buildDir}/json/results.json` }],
];

const reporters: ReporterDescription[] = [
  // Console reporter: 'list' in CI, custom cleanReporter locally.
  ...(process.env.CI ? [['list']] : [['./utils/cleanReporter.ts']]),
  // Slack/Teams: skipped per-shard on CI sharded runs (see "CI sharding" below),
  // otherwise they run here with complete data.
  ...(isCiShardedRun
    ? []
    : [['./utils/slackReporter/slackReporterAdapter.ts'], ['./utils/teamsReporter/teamsReporterAdapter.ts']]),
  // HTML/JUnit/JSON locally and on non-sharded CI, blob-only per shard on sharded CI.
  ...(isCiShardedRun ? ciShardReporters : nonShardedReporters),
];
```

- To add a built-in reporter: append it to `nonShardedReporters` (or `ciShardReporters` if it should also run per-shard). Shown as array entries: `['line']`, `['list']`, `['json']`, `['junit']`, `['html']`.
- To add a custom reporter: add a path, e.g., `['./utils/cleanReporter.ts']` (use the correct relative path to your custom reporter).
- To configure options (when supported), use tuple syntax with options, as shown above for `html`/`junit`/`json`/`blob`.
- To remove a reporter: delete its entry from the relevant array.

### CI sharding

On sharded CI runs (`.github/workflows/playwright-dispatch-sharded.yml`, detected via `isCiShardingEnabled()` from `@utils/runWithoutCiSharding`), each shard only has a partial slice of results, so:

- HTML/JUnit/JSON reporters are replaced by the `blob` reporter — one blob per shard, merged later with `playwright merge-reports --config playwright.sharding.config.ts`.
- Slack/Teams reporters are skipped per-shard and instead run once, after merging, via `playwright.sharding.config.ts` (see [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md)) — so notifications reflect the complete run, not a single shard.

On local runs and non-sharded CI runs, all reporters above run normally in a single job.

Notes:

- `buildDir` is exported from `playwright.config.ts` and used to keep all artifacts in the `build/` folder.
- Enable only the reporters you need to keep console output readable.
- The `build` folder is cleaned before each run by `global-setup.ts` to ensure fresh artifacts.
- In CI (`CI=true`, including GitHub Actions) the console reporter defaults to `list`.
- Outside CI it defaults to the custom `cleanReporter`.

---

## Clean Reporter

A custom reporter that keeps console output compact while still showing live test progress.

Current behavior:

- One test = one console line (line is updated in place from in-progress to final status).
- In-progress tests use an ASCII spinner (`| / - \\`) in interactive terminals.
- Final statuses are colorized when terminal colors are available:
  - passed: bright green,
  - failed: bright red,
  - skipped: bright blue.
- In CI/non-interactive environments or when colors are disabled, output falls back to plain text.
- Test `stdout`/`stderr` is intentionally muted by this reporter to avoid noisy logs.

- Location: `./utils/cleanReporter.ts`

Example (conceptual):

```text
  |  3 checkout.spec.ts › user can place order
  ✓  3 checkout.spec.ts › user can place order (4.2s)
  /  4 checkout.spec.ts › user sees payment validation
  ✗  4 checkout.spec.ts › user sees payment validation (2.1s)

  1) checkout.spec.ts:42:5 › user sees payment validation ───

    Error: Error: Expected validation message was not visible.
```

---

## HTML Reporter

Generates an interactive HTML report with detailed test results, traces, and artifacts.

- Output folder: `build/html-report`
- Open mode: `never` (open manually as needed)
- On sharded CI runs, replaced per-shard by the `blob` reporter and regenerated once from the merged blob (see [CI sharding](#ci-sharding)).

### Usage:

To open the HTML report after a test run, run directly:

```sh
yarn playwright show-report build/html-report
```

> **Note:** A dedicated `yarn report` shortcut will be added when the custom test runner is implemented. See [`docs/testRunner.md`](./testRunner.md) for details once available.

---

## JSON Reporter

Outputs a machine-readable JSON report with all test results and metadata.

- Output file: `build/json/results.json`
- Use cases: Custom processing, dashboards, or data pipelines.
- On sharded CI runs, replaced per-shard by the `blob` reporter and regenerated once from the merged blob (see [CI sharding](#ci-sharding)).

---

## JUnit Reporter

Produces a JUnit-compatible XML file suitable for CI integrations (Jenkins, GitHub Actions, Azure DevOps, etc.).

- Output file: `build/junit/results.xml`
- Use cases: CI test summary, trend charts, gates.
- On sharded CI runs, replaced per-shard by the `blob` reporter and regenerated once from the merged blob (see [CI sharding](#ci-sharding)).

---

## Blob Reporter

Playwright's binary intermediate report format, used only on sharded CI runs in place of HTML/JUnit/JSON.

- Output folder: `build/blob-report`
- One blob file per shard; merged with `playwright merge-reports --config playwright.sharding.config.ts` in the `merge-reports` job to produce the final HTML/JUnit/JSON reports.
- See [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md) for the full merge workflow.

---

## Line Reporter

Minimal, single-line output for each test—useful for quick feedback with low verbosity.

Example output:

```text
✓ [EXAMPLE] tests/<brandName>/functional/cookies.spec.ts:5:1 › homepage cookies behavior (1.2s)
✗ [EXAMPLE] tests/<brandName>/accessibility/accessibility.spec.ts:6:5 › page has no serious violations (3.9s)
✓ [EXAMPLE] tests/<brandName>/quality/cspCheck.spec.ts:12:3 › page has valid CSP headers (1.1s)
```

---

## List Reporter

A structured list-style output with test grouping; useful when you want a readable console report without the HTML UI.

Example output:

```text
[EXAMPLE]
  functional
    ✓ homepage cookies behavior (1.2s)
  quality
    ✗ page has no serious violations (3.9s)
      Error: Expected no accessibility violations, but found 2
      at utils/accessibility/index.ts:45:9
    ✓ page has valid CSP headers (1.1s)

3 tests: 2 passed, 1 failed
```

---

## Slack Reporter

Slack Reporter publishes Playwright run summaries to Slack channels and/or direct messages.

On sharded CI runs, it is skipped per-shard and runs once after merging (see [CI sharding](#ci-sharding)).

Full setup, configuration, env overrides, usage examples and sample output are documented here:

- [`docs/slackReporter.md`](./slackReporter.md)

---

## Teams Reporter

Teams Reporter publishes Playwright run summaries to Microsoft Teams channels using webhook URLs resolved from env secrets.

On sharded CI runs, it is skipped per-shard and runs once after merging (see [CI sharding](#ci-sharding)).

Full setup, key-to-env mapping, env overrides, and usage details are documented here:

- [`docs/teamsReporter.md`](./teamsReporter.md)

