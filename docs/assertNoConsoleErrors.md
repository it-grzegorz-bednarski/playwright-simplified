# Assert No Console Errors

← [Back to main documentation](../README.md)

## Overview

Utility for asserting that a page loads without unexpected JavaScript console errors.

---

## Configuration

Console error filtering is configured in `config/feature-config/assertNoConsoleErrors.config.ts`:

- **`ignoredPatterns`** - map of substrings to ignore in console error messages
  - key: substring to match in `console.error` text
  - value: `true` -> ignore, `false` -> do not ignore

Example config:

```ts
export const assertNoConsoleErrorsConfig = {
  ignoredPatterns: {
    'Failed to load resource: the server responded with a status of 401 ()': true,
  },
  includeConsoleMessagesInReport: true,
};
```

To override patterns for a single call, use `options.ignoredPatternsOverride`.

Function signature:

- **`assertNoConsoleErrors(page, target, options?)`**
  - **`page`** - Playwright `Page` instance
  - **`target`** - either:
    - absolute `url` string (fallback mode), or
    - POM object with `goto()` (recommended mode)
  - **`options.ignoredPatternsOverride`** (optional) - `Record<string, boolean>` merged with config patterns

---

## Usage

### Basic usage (POM mode)

```ts
import { assertNoConsoleErrors } from '@utils/assertNoConsoleErrors';
import { test } from '@pom/theInternet/pageFixture';

test('home page has no console errors', async ({ homePage, page }) => {
  await assertNoConsoleErrors(page, homePage);
});
```

### Fallback usage (plain URL)

```ts
import { assertNoConsoleErrors } from '@utils/assertNoConsoleErrors';

await assertNoConsoleErrors(page, 'https://www.iana.org/domains/reserved');
```

### Override ignored patterns per call

```ts
import { assertNoConsoleErrors } from '@utils/assertNoConsoleErrors';
import { assertNoConsoleErrorsConfig } from '@config/feature-config/assertNoConsoleErrors.config';

await assertNoConsoleErrors(page, 'https://example.com', {
  ignoredPatternsOverride: {
    ...assertNoConsoleErrorsConfig.ignoredPatterns,
    'Dashboard error message': true,
    'Failed to load resource: the server responded with a status of 401 ()': false,
  },
});
```

---

## Reports

Output directory (generated): `build/artifacts/assertNoConsoleErrors/`

Files:

- **`console-errors_<url>_<timestamp>.json`** - per-page JSON report (attached as downloadable link in HTML reporter)
- **`console-errors_<url>_<timestamp>.md`** - per-page Markdown report (attached as downloadable link in HTML reporter)
- **`console-errors-report.json`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`console-errors-report.md`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`console-errors-report.pdf`** - PDF version of the summary generated in `global-teardown.ts` (available on disk)

Per-page reports are attached directly to each test in the HTML reporter as downloadable links.
Merged summary reports are generated in `global-teardown.ts` and saved to disk - they are not attached to the HTML reporter because global teardown runs outside the test context.
On sharded CI runs, this merge step is skipped in `global-teardown.ts` and instead runs once after all shards finish, via `utils/mergeQualityReports.ts` in the `merge-reports` job - see [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md).

Sample reports:

- [Sample JSON report](samples/assertNoConsoleErrors-reports/console-errors-report.json)
- [Sample Markdown report](samples/assertNoConsoleErrors-reports/console-errors-report.md)
- [Sample PDF report](samples/assertNoConsoleErrors-reports/console-errors-report.pdf)
