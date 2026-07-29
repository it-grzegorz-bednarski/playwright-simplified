# Performance Monitoring

← [Back to main documentation](../README.md)

## Overview

Run Lighthouse against pages multiple times and aggregate scores using the **median** — ideal for tracking performance trends over time without the noise of single-run variance.

Unlike `performanceTest`, monitoring has **no thresholds and no assertions**. It is purely observational: results are collected, aggregated, and attached to the Playwright HTML reporter. The test always passes.

---

## Configuration

File: `config/feature-config/performanceMonitoring.config.ts`

Related:

- [Performance Devices](./performanceDevices.md) - shared device presets used by performance tools

Example:

```ts
export const performanceMonitoringConfig = {
  hideSensitiveDataInReport: true,
  devices: ['desktop', 'mobile'],
  logs: false,
  numberOfRuns: 3,
  onlyCategories: ['performance', 'accessibility', 'bestPractices', 'seo'],
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

- `hideSensitiveDataInReport` — hide extraHeaders and chrome flags values in reports
- `devices` — device keys from [Performance Devices](./performanceDevices.md)
- `logs` — verbose Lighthouse logs
- `numberOfRuns` — how many Lighthouse runs per URL per device; median is used as the final score
- `onlyCategories` — categories to measure (`performance`, `accessibility`, `bestPractices`, `seo`, `pwa`)
- `skipAudits` — Lighthouse audits to skip
- `chrome` — Chrome launch options (advanced)
- `extraHeaders` — extra HTTP headers forwarded to Lighthouse (advanced)
- `extraLighthouseFlags` — extra Lighthouse CLI flags (advanced)

---

## Usage

### Target formats

Same style as `assertNoConsoleErrors` and `runPerformanceTest`:

1. **POM object** (recommended):

   ```ts
   await runPerformanceMonitoring(page, homePage, 'homePage');
   ```
   - POM must implement `goto(): Promise<void>`
   - Optional `getFullPageUrl()` / `getPageUrl()` for a cleaner step label

2. **URL string** — absolute or relative to `BASE_URL`:
   ```ts
   await runPerformanceMonitoring(page, 'https://example.com/', 'homePage');
   await runPerformanceMonitoring(page, '/large', 'largePage');
   ```

### Example usage in tests

```ts
import { runPerformanceMonitoring } from '@utils/performance/performanceMonitoring';

// 1. POM target (RECOMMENDED)
await runPerformanceMonitoring(page, homePage, 'homePage');
await runPerformanceMonitoring(page, largePage, 'largePage');

// 2. Direct URL
await runPerformanceMonitoring(page, 'https://example.com/', 'homePage');

// 3. With per-call overrides
await runPerformanceMonitoring(page, homePage, 'homePage', {
  numberOfRuns: 5,
  devices: ['desktop'],
  onlyCategories: ['performance', 'seo'],
});
```

### No assertions

Monitoring never fails a test. Scores are reported regardless of their value.
To gate deployments on performance scores, use `runPerformanceTest` instead.

### Execution mode (recommended: serial)

Because monitoring executes Lighthouse multiple times per page, run monitoring suites in serial mode.
This reduces resource contention and temp-profile cleanup conflicts (notably on Windows).

```ts
import { test } from '@pom/theInternet/pageFixture';

test.describe('quality checks - performance monitoring', () => {
  test.describe.configure({ mode: 'serial' });

  test('homePage - POM target', async ({ page, homePage }) => {
    // ...
  });
});
```

### Timeout configuration

Performance Monitoring tests run multiple Lighthouse audits sequentially, which can be time-consuming.

**Calculate required timeout:**

- Each single Lighthouse run: ~60-90 seconds
- Total timeout = (numberOfRuns × number of devices × 90) + buffer

**Example calculations:**

- 2 runs × 2 devices (desktop, mobile) = 360-540 seconds → use `300_000` ms (5 min) ✓
- 3 runs × 2 devices = 540-810 seconds → use `600_000` ms (10 min) ✗ (300s is too short)
- 1 run × 1 device = 60-90 seconds → use `180_000` ms (3 min) ✓

**Set timeout in your test:**

```ts
test.describe('quality checks - performance monitoring', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(300_000); // 5 minutes - adjust based on your config

  test('homePage - POM target', async ({ page, homePage }) => {
    await runPerformanceMonitoring(page, homePage, 'homePage');
  });
});
```

**Note:** The timeout applies to the **entire test** (all runs combined), not to a single run.

---

## Reports

Output directory (generated): `build/artifacts/performance-monitoring-reports/`

Files:

- `performance-monitoring-summary.md` — aggregated summary (median scores)
- `performance-monitoring-summary.pdf` — PDF version
- `performance-monitoring-summary.json` — full data with per-run scores
- `performance-monitoring-<name>-<timestamp>.md` — per-test report attached to Playwright HTML reporter
- `performance-monitoring-<name>-<timestamp>.json` — per-test raw data attached to Playwright HTML reporter
- `detailed-results/` — per-run Lighthouse HTML/JSON reports

Each report shows:

- **Median scores** table (aggregated across all runs)
- **Raw scores per run** table for variance inspection

Sample reports:

- [Sample JSON report](samples/performance-monitoring-reports/performance-monitoring-summary.json)
- [Sample Markdown report](samples/performance-monitoring-reports/performance-monitoring-summary.md)
- [Sample PDF report](samples/performance-monitoring-reports/performance-monitoring-summary.pdf)

Sample detailed Lighthouse report:

- [Sample HTML report](samples/performance-monitoring-reports/detailed-results/sample-homepage.report.html)
- [Sample JSON report](samples/performance-monitoring-reports/detailed-results/sample-homepage.report.json)
