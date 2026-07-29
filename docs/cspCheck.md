# CSP Check

← [Back to main documentation](../README.md)

## Overview

Content-Security-Policy (CSP) validation utility for Playwright tests.

It reads CSP from the `Content-Security-Policy` response header (fallback: meta tag) and applies basic heuristic rules.

---

## Configuration

`config/feature-config/cspCheck.config.ts`:

```ts
export const cspCheckConfig = {
  // ---------------------------------------------------------------------------
  // Scope
  // ---------------------------------------------------------------------------

  /**
   * When true, checks CSP header on the document navigation response if available.
   * When false, always uses `page.request.get(page.url())`.
   */
  preferNavigationResponse: true,

  // ---------------------------------------------------------------------------
  // Rules
  // ---------------------------------------------------------------------------

  /** If true, requires that a CSP policy is present (either header or meta). */
  requireCsp: true,

  /** Rules applied to the effective CSP string (basic heuristic checks). */
  rules: {
    disallowUnsafeInline: true,
    disallowUnsafeEval: true,
    disallowWildcardSources: true,
    requireDefaultSrc: true,
  },

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  includeDirectivesInReport: true,
} as const;
```

### Scope

- **`preferNavigationResponse`** - when `true`, attempts to use CSP from the document navigation response; otherwise uses `page.request.get(page.url())`.

### Rules

- **`requireCsp`** - when `true`, fails if CSP is missing.
- **`rules.disallowUnsafeInline`** - flags `'unsafe-inline'`.
- **`rules.disallowUnsafeEval`** - flags `'unsafe-eval'`.
- **`rules.disallowWildcardSources`** - flags `*` sources.
- **`rules.requireDefaultSrc`** - flags missing `default-src`.

### Reporting

- **`includeDirectivesInReport`** - when `true`, includes parsed CSP directives in JSON report.

**Note:** CSP issues are always reported as soft assertions (`expect.soft`) and never fail the test immediately. This allows tests to collect all CSP issues while still continuing to completion.

---

## Usage

### Minimal usage

```ts
import { runCspCheck } from '../utils/cspCheck/runCspCheck';

await page.goto('https://example.com');
await runCspCheck(page);
```

### Override configuration per test

```ts
await runCspCheck(page, {
  preferNavigationResponse: false,
  requireCsp: true,
  rules: {
    disallowUnsafeInline: true,
    disallowUnsafeEval: true,
    disallowWildcardSources: true,
    requireDefaultSrc: true,
  },
});
```

---

## Reports

Output directory (generated): `build/artifacts/cspCheck/`

Files:

- **`csp_<url>_<timestamp>.json`** - per-page JSON report (attached as downloadable link in HTML reporter)
- **`csp_<url>_<timestamp>.md`** - per-page Markdown report (attached as downloadable link in HTML reporter)
- **`csp-report.json`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`csp-report.md`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`csp-report.pdf`** - PDF version of the summary generated in `global-teardown.ts` (available on disk)

Per-page reports are attached directly to each test in the HTML reporter as downloadable links.
Merged summary reports are generated in `global-teardown.ts` and saved to disk — they are not attached to the HTML reporter because global teardown runs outside the test context.
On sharded CI runs, this merge step is skipped in `global-teardown.ts` and instead runs once after all shards finish, via `utils/mergeQualityReports.ts` in the `merge-reports` job - see [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md).

Sample reports:

- [Sample JSON report](samples/cspCheck-reports/csp-report.json)
- [Sample Markdown report](samples/cspCheck-reports/csp-report.md)
- [Sample PDF report](samples/cspCheck-reports/csp-report.pdf)
