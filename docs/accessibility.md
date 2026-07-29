# Accessibility

← [Back to main documentation](../README.md)

## Overview

Utility for running automated accessibility scans with project-wide configuration and reporting, built on top of **[axe-core](https://www.deque.com/axe/core-documentation/)**.

---

## Configuration

Configuration for accessibility testing is defined in `config/feature-config/accessibility.config.ts`.

### Configuration options

- **`tags`** - WCAG/Section 508 compliance levels to test against
- **`ignoredRules`** - map of rules to ignore (`true` -> ignore rule)
- **`excludeElements`** - CSS selectors for elements to exclude from scanning
- **`includeNodesInReport`** - includes affected node targets in per-page reports
- **`issueLimitPerPage`** - limits detailed issues in merged summary report

Example configuration:

```ts
export const accessibilityConfig = {
  tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  ignoredRules: {
    'color-contrast': true,
  },
  excludeElements: ['.cookie-banner'],
  includeNodesInReport: true,
  issueLimitPerPage: 50,
} as const;
```

---

## Usage

### Minimal usage

```ts
import { runAccessibilityCheck } from '@utils/accessibility/runAccessibilityCheck';

await page.goto('https://example.com');
await runAccessibilityCheck(page);
```

### Override configuration per test

```ts
await runAccessibilityCheck(page, {
  tags: ['best-practice'],
  ignoredRules: {
    'landmark-banner-is-top-level': true,
  },
  excludeElements: ['.popup-modal', '#advertisement'],
});
```

**Note:** Accessibility violations are always reported as soft assertions (`expect.soft`) and never fail the test immediately. This allows tests to collect all issues while still continuing to completion.

---

## Reports

Output directory (generated): `build/artifacts/accessibility/`

Files:

- **`accessibility_<url>_<timestamp>.json`** - per-page JSON report (attached as downloadable link in HTML reporter)
- **`accessibility_<url>_<timestamp>.md`** - per-page Markdown report (attached as downloadable link in HTML reporter)
- **`accessibility-report.json`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`accessibility-report.md`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`accessibility-report.pdf`** - PDF version of the summary generated in `global-teardown.ts` (available on disk)

Per-page reports are attached directly to each test in the HTML reporter as downloadable links.
Merged summary reports are generated in `global-teardown.ts` and saved to disk - they are not attached to the HTML reporter because global teardown runs outside the test context.
On sharded CI runs, this merge step is skipped in `global-teardown.ts` and instead runs once after all shards finish, via `utils/mergeQualityReports.ts` in the `merge-reports` job - see [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md).

Sample reports:

- [Sample JSON report](samples/accessibility-reports/accessibility-report.json)
- [Sample Markdown report](samples/accessibility-reports/accessibility-report.md)
- [Sample PDF report](samples/accessibility-reports/accessibility-report.pdf)
