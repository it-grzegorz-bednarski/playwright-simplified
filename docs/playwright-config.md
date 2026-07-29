# Playwright Config

← [Back to main documentation](../README.md)

## Overview

Base Playwright configuration is defined in [`playwright.config.ts`](../playwright.config.ts).

The current baseline focuses on:

- predictable reporting,
- one dedicated output location (defined by `buildDir`),
- centralized timeout presets,
- sensible local vs CI worker strategy.

---

## Configuration

Example configuration (`playwright.config.ts`):

```ts
import { defineConfig, type ReporterDescription } from '@playwright/test';
import { timeouts } from './config/timeouts';
import { buildEnvProjects, projectTag } from './utils/projectsBuilder';
import { isCiShardingEnabled } from './utils/runWithoutCiSharding';

export const buildDir = 'build';

const isCiShardedRun = isCiShardingEnabled();

const envProjects = buildEnvProjects(process.env);
const projects = [
  ...envProjects,
  {
    name: 'testBrand',
    grep: projectTag('testBrand'),
  },
];

// Sharded CI runs use a single 'blob' reporter per shard (merged later);
// local/non-sharded CI runs use HTML/JUnit/JSON directly.
const reporters: ReporterDescription[] = [
  ...(process.env.CI ? [['list']] : [['./utils/cleanReporter.ts']]),
  ...(isCiShardedRun
    ? []
    : [['./utils/slackReporter/slackReporterAdapter.ts'], ['./utils/teamsReporter/teamsReporterAdapter.ts']]),
  ...(isCiShardedRun
    ? [['blob', { outputDir: `${buildDir}/blob-report` }]]
    : [
        ['html', { outputFolder: `${buildDir}/html-report`, open: 'never' }],
        ['junit', { outputFile: `${buildDir}/junit/results.xml` }],
        ['json', { outputFile: `${buildDir}/json/results.json` }],
      ]),
];

export default defineConfig({
  projects,
  expect: {
    timeout: Number(process.env.EXPECT_TIMEOUT) || timeouts.short,
  },
  fullyParallel: true,
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  outputDir: `${buildDir}/artifacts`,
  reporter: reporters,
  retries: Number(process.env.RETRIES) || (process.env.CI ? 1 : 0),
  testDir: 'tests',
  timeout: Number(process.env.TEST_TIMEOUT) || timeouts.veryLong,
  use: {
    // Optional per-environment override if needed:
    // baseURL: process.env.BASE_URL,
    actionTimeout: Number(process.env.ACTION_TIMEOUT) || timeouts.normal,
    navigationTimeout: Number(process.env.NAVIGATION_TIMEOUT) || timeouts.long,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  workers: process.env.CI ? undefined : 6,
});
```

### Environment overrides (example)

You can override selected config values from `env/.env.<environmentName>`.

Example values:

```env
TEST_TIMEOUT=90000
EXPECT_TIMEOUT=15000
RETRIES=2
ACTION_TIMEOUT=20000
NAVIGATION_TIMEOUT=45000
BASE_URL=https://dev.example.com
```

- Numeric keys are parsed with `Number(process.env.KEY) || defaultValue`.
- Optional `BASE_URL` can be enabled in `use` when your tests navigate with relative URLs.
- Project list still comes from `buildEnvProjects(process.env)` plus manual entries (for example `testBrand`).

Top-level Playwright config reads global `process.env` values.
Locale-aware keys (for example `<BRAND>_BASE_URL_<KEY>`, `<BRAND>_TENANT_<KEY>`, `<BRAND>_API_URL_<KEY>`) are consumed by project generation and resolved in tests via `envByLocale(...)`.

See [Environments](./environments.md) for full env-file structure.
See [Test Configuration](./testConfiguration.md#using-env-values-in-tests) for test-level examples.

### Build Output and Reporters

All Playwright artifacts are stored under the single base folder defined by `buildDir` in the config file.

Before each run, `global-setup.ts` removes the whole folder pointed by `buildDir`, so reports and artifacts always start from a clean state.

Subfolders for artifacts and reports are derived from that base folder in the config.

The reporter array is built dynamically (CI vs local, sharded vs non-sharded CI) — see [Reporters](./reporters.md#configuration) for the full breakdown and [Reporters - CI sharding](./reporters.md#ci-sharding) for sharded-run behavior.

The same base folder is ignored in:

- [`.gitignore`](../.gitignore),
- [`tsconfig.json`](../tsconfig.json) (`exclude`),
- [`eslint.config.js`](../eslint.config.js) (`ignores`).

> If `buildDir` in `playwright.config.ts` changes, update those files manually.

---

### Lifecycle Hooks

Lifecycle hooks define what should happen before and after the test run.

- `globalSetup` - pre-test logic. In this framework it runs `global-setup.ts` and clears the folder from `buildDir` before tests start.
- `globalTeardown` - post-test logic. In this framework it runs `global-teardown.ts`, aggregates quality reports (accessibility, CSP, etc.) and can convert merged Markdown to PDF.
  - Each merge step is wrapped with `runWithoutCiSharding(...)` and is skipped on sharded CI shards (a single shard only holds partial results). For sharded runs, the same merge logic runs once after all shards finish, via `utils/mergeQualityReports.ts` in the workflow's `merge-reports` job — see [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md).

---

### Timeouts

Timeouts are centralized in [`config/timeouts.ts`](../config/timeouts.ts) and consumed by `playwright.config.ts`.

Detailed timeout documentation:

- [Timeouts](./timeouts.md)

---

### Key Configuration Areas

- `buildDir` - single base folder for artifacts and reports.
- `expect` - shared assertion timeout used by `expect(...)` checks.
- `fullyParallel` - enables parallel execution of tests across files where possible.
- `globalSetup` - pre-test lifecycle hook that clears `buildDir` before execution.
- `globalTeardown` - post-test lifecycle hook for report aggregation, optional Markdown-to-PDF generation, and final cleanup steps.
- `outputDir` - stores Playwright artifacts generated during execution.
- `reporter` - defines terminal, HTML, JUnit, JSON, and (sharded CI only) blob reporting outputs; see [Reporters](./reporters.md).
- `retries` - controls reruns, with different behavior for local and CI runs.
- `testDir` - points Playwright to the folder containing test specs.
- `timeout` - defines the per-test execution limit.
- `use` - shared Playwright options such as `baseURL`, action timeout, navigation timeout, screenshots, traces, and video.
- `workers` - controls parallelism; local runs can use a fixed worker count, while CI can fall back to Playwright's automatic worker calculation.
  - When `undefined`: Playwright automatically calculates workers as **½ of available CPU cores**.

---

## References

- [Playwright Configuration Documentation](https://playwright.dev/docs/test-configuration)
- [Test Configuration](./testConfiguration.md)
- [Timeouts](./timeouts.md)
- [Reporters](./reporters.md)
- [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md)
