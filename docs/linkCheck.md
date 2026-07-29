# Link Check

← [Back to main documentation](../README.md)

## Overview

Link validation utility for Playwright tests using **[Linkinator](https://github.com/JustinBeckwith/linkinator)**.

Scans links found on the current page and reports broken ones.

---

## Configuration

`config/feature-config/linkCheck.config.ts`:

```ts
export const linkCheckConfig = {
  // ---------------------------------------------------------------------------
  // Scope
  // ---------------------------------------------------------------------------

  recurse: false,
  sameOriginOnly: true,

  // ---------------------------------------------------------------------------
  // Stability & performance
  // ---------------------------------------------------------------------------

  concurrency: 5,
  timeoutMs: 15000,

  // ---------------------------------------------------------------------------
  // Skip / allow rules
  // ---------------------------------------------------------------------------

  skippedLinks: {
    'mailto:': true,
    'tel:': true,
    'sms:': true,
    'javascript:': true,
    '#': true,
    '/logout': true,
    '/floating_menu/': true,
  },

  allowedStatusCodes: {
    401: true,
    403: false,
    429: false,
  },

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  includeOkLinksInReport: true,
  okLinksReportLimit: 500,
  brokenLinksReportLimit: 500,
} as const;
```

### Scope

- **`sameOriginOnly`** - when `true`, checks only links from the same origin as the current page.
- **`recurse`** - when `true`, crawls beyond the initial page (can significantly increase scan size).

### Stability & performance

- **`timeoutMs`** - per-link timeout in milliseconds.
- **`concurrency`** - max number of parallel link checks.

### Skip / allow rules

- **`skippedLinks`** - patterns to skip (substring match: `url.includes(pattern)`).

  ```ts
  const skippedLinks = {
    '/download_secure': true,
    '/search?': true,
    'utm_source=': true,
    '/some-legacy-endpoint': false,
  };
  ```

- **`allowedStatusCodes`** - HTTP statuses treated as OK (`true` = allow, `false` = disallow).

### Reporting

- **`includeOkLinksInReport`** - when `true`, includes OK links in per-page reports.
- **`okLinksReportLimit`** - max OK links included in the report (`0`/`undefined` = no limit).
- **`brokenLinksReportLimit`** - max broken links included in the report (`0`/`undefined` = no limit).

**Note:** Link check issues are always reported as soft assertions (`expect.soft`) and never fail the test immediately. This allows tests to collect all issues while still continuing to completion.

---

## Usage

### Minimal usage

```ts
import { runLinkCheck } from '@utils/linkCheck/runLinkCheck';

await page.goto('https://the-internet.herokuapp.com/');
await runLinkCheck(page);
```

### Override configuration per test

```ts
await runLinkCheck(page, {
  timeoutMs: 15000,
  concurrency: 5,
  sameOriginOnly: true,
  skippedLinks: {
    '/download_secure': true,
  },
  allowedStatusCodes: {
    401: true,
  },
});
```

---

## Reports

Output directory (generated): `build/artifacts/linkCheck/`

Files:

- **`link-check_<url>_<timestamp>.json`** - per-page JSON report (attached as downloadable link in HTML reporter)
- **`link-check_<url>_<timestamp>.md`** - per-page Markdown report (attached as downloadable link in HTML reporter)
- **`link-check-report.json`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`link-check-report.md`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`link-check-report.pdf`** - PDF version of the summary generated in `global-teardown.ts` (available on disk)

Per-page reports are attached directly to each test in the HTML reporter as downloadable links.
Merged summary reports are generated in `global-teardown.ts` and saved to disk - they are not attached to the HTML reporter because global teardown runs outside the test context.
On sharded CI runs, this merge step is skipped in `global-teardown.ts` and instead runs once after all shards finish, via `utils/mergeQualityReports.ts` in the `merge-reports` job - see [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md).

Sample reports:

- [Sample JSON report](samples/linkCheck-reports/link-check-report.json)
- [Sample Markdown report](samples/linkCheck-reports/link-check-report.md)
- [Sample PDF report](samples/linkCheck-reports/link-check-report.pdf)
