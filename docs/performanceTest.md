# Performance Test

← [Back to main documentation](../README.md)

## Overview

Run Lighthouse against pages and validate scores against configured thresholds.

Performance tests are integrated with Playwright test flow (no external CLI command execution),
so they can be used in authenticated/login-wall scenarios.

Threshold failures are reported as **soft assertions** — all checks run to completion before the test
is marked as failed, consistent with other quality checks in this framework.

---

## Configuration

File: `config/feature-config/performanceTest.config.ts`

Related:

- [Performance Devices](./performanceDevices.md) - shared device presets used by performance tools

Example:

```ts
export const performanceTestConfig = {
  hideSensitiveDataInReport: true,
  devices: ['desktop', 'mobile'],
  logs: false,
  onlyCategories: ['performance', 'accessibility', 'bestPractices', 'seo'],
  thresholds: {
    performance: 40,
    accessibility: 80,
    bestPractices: 70,
    seo: 90,
    pwa: 50,
  },
  skipAudits: ['uses-http2'],

  chrome: {
    headless: true,
    flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  },
  extraHeaders: {},
  extraLighthouseFlags: [],
} as const;
```

Options:

- `hideSensitiveDataInReport` (`true` | `false`) - Global report option (cannot be overridden per call)
- `devices` - Default device keys (see [Performance Devices](./performanceDevices.md))
- `logs` (`true` | `false`) - Verbose Lighthouse logs
- `onlyCategories` - Categories to run (`performance`, `accessibility`, `bestPractices`, `seo`, `pwa`)
- `thresholds` - Global thresholds per category (0-100)
- `chrome` - Chrome launch options (advanced)
- `extraHeaders` - Extra HTTP headers (advanced)
- `extraLighthouseFlags` - Extra Lighthouse options (advanced)

---

## Usage

### Target formats

`target` can be provided in two ways (same style as `assertNoConsoleErrors`):

1. **POM object** (recommended):

   ```ts
   await runPerformanceTest(page, homePage, 'homePage');
   ```
   - The POM must implement `goto(): Promise<void>`
   - Optionally can expose `getFullPageUrl()` or `getPageUrl()` for a cleaner step label

2. **URL string** — absolute or relative to `BASE_URL`:
   ```ts
   await runPerformanceTest(page, 'https://example.com/', 'homePage');
   await runPerformanceTest(page, '/large', 'largePage');
   ```
   - Absolute URLs are used as-is
   - Relative paths are resolved against `process.env.BASE_URL`

### Example usage in tests

```ts
import { runPerformanceTest } from '@utils/performance/performanceTest';

// 1. POM target (RECOMMENDED)
await runPerformanceTest(page, homePage, 'homePage');
await runPerformanceTest(page, largePage, 'largePage');

// 2. Direct URL string
await runPerformanceTest(page, 'https://example.com/', 'homePage');
await runPerformanceTest(page, '/large', 'largePage');

// 3. With per-call overrides (devices, thresholds, categories)
await runPerformanceTest(page, homePage, 'homePage', {
  thresholds: { performance: 80, seo: 85 },
  devices: ['desktop'],
});
```

### Soft fail behaviour

Threshold failures use `expect.soft()` — if a page fails a threshold, the failure is recorded and
reported, but execution continues to the next `runPerformanceTest()` call within the same test.
The test is marked as failed only after all assertions finish.

### Execution mode (recommended: serial)

Because Lighthouse runs are heavy (especially on Windows), run performance suites in serial mode.
This reduces Chrome temp-profile cleanup conflicts (for example `EPERM` in `chrome-launcher`).

```ts
import { test } from '@pom/theInternet/pageFixture';

test.describe('quality checks - performance test', () => {
  test.describe.configure({ mode: 'serial' });

  test('homePage - POM target', async ({ page, homePage }) => {
    // ...
  });
});
```

### Timeout configuration

Performance Test runs Lighthouse against all configured URLs sequentially. Each run takes considerable time.

**Calculate required timeout:**

- Each single Lighthouse run: ~60-90 seconds
- Total timeout = (number of URLs in single test × number of devices × 90) + buffer

**Example calculations:**

- 2 URLs × 2 devices (desktop, mobile) = 240-360 seconds → use `300_000` ms (5 min) ✓
- 4 URLs × 2 devices = 480-720 seconds → use `600_000` ms (10 min) ✗ (180s is too short)
- 1 URL × 1 device = 60-90 seconds → use `180_000` ms (3 min) ✓

**Set timeout in your test:**

```ts
test.describe('quality checks - performance test', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000); // 3 minutes - adjust based on your config

  test('homePage - POM target', async ({ page, homePage }) => {
    await runPerformanceTest(page, homePage, 'homePageFromPOM');
  });
});
```

**Note:** The timeout applies to the **entire test** (all URLs and devices combined), not to a single URL or run.

---

## Reports

Output directory (generated): `build/artifacts/performance-test-reports/`

Files:

- `performance-test-summary.md` - Markdown summary
- `performance-test-summary.pdf` - PDF version of the summary
- `performance-test-summary.json` - merged summary data
- `performance-test-<name>-<timestamp>.md` - per-test summary attached to the Playwright HTML report
- `performance-test-<name>-<timestamp>.json` - per-test raw summary attached to the Playwright HTML report
- `detailed-results/` - per-URL Lighthouse HTML/JSON reports

In Playwright HTML reporter, each performance test now attaches:

- a report location note,
- per-test summary `.md` and `.json`,
- per-device Lighthouse `.report.json` and `.report.html` files.

Sample reports:

- [Sample JSON report](samples/performance-test-reports/performance-test-summary.json)
- [Sample Markdown report](samples/performance-test-reports/performance-test-summary.md)
- [Sample PDF report](samples/performance-test-reports/performance-test-summary.pdf)

Sample detailed Lighthouse report:

- [Sample HTML report](samples/performance-test-reports/detailed-results/sample-homepage.report.html)
- [Sample JSON report](samples/performance-test-reports/detailed-results/sample-homepage.report.json)
