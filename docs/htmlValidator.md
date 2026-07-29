# HTML Validator

← [Back to main documentation](../README.md)

## Overview

HTML validation utility for Playwright tests.

It validates rendered HTML (`page.content()`) using **[html-validate](https://html-validate.org/)**.

---

## Configuration

`config/feature-config/htmlValidator.config.ts`:

```ts
export const htmlValidatorConfig = {
  // ---------------------------------------------------------------------------
  // Presets
  // ---------------------------------------------------------------------------

  presets: ['html-validate:recommended'],

  // ---------------------------------------------------------------------------
  // Rules
  // ---------------------------------------------------------------------------

  rules: {
    'no-dup-attr': true,
    'no-dup-id': true,
    'valid-id': false,
    'element-required-attributes': true,
  },

  ignoredRules: {
    'no-trailing-whitespace': true,
    'no-inline-style': true,
    'no-conditional-comment': true,
    'element-permitted-content': true,
    'prefer-native-element': true,
    'attribute-allowed-values': true,
  },

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  includeHtmlInReport: true,
} as const;
```

### Presets

- **`presets`** - base configurations to extend from (default: `['html-validate:recommended']`) ([full list](https://html-validate.org/rules/presets.html)).

### Rules

Use this section only for overrides:

- **`rules`** - enable/disable specific rule ids (`true` = enabled, `false` = disabled) ([full list](https://html-validate.org/rules/))
- **`ignoredRules`** - ignore specific rule ids in reporting/failing (`true` = ignored) ([full list](https://html-validate.org/rules/))

### Reporting

- **`includeHtmlInReport`** - when `true`, includes full HTML in JSON report.

**Note:** HTML validation issues are always reported as soft assertions (`expect.soft`) and never fail the test immediately. This allows tests to collect all issues while still continuing to completion.

---

## Usage

### Minimal usage

```ts
import { runHtmlValidate } from '@utils/htmlValidator/runHtmlValidate';

await page.goto('https://example.com');
await runHtmlValidate(page);
```

### Override configuration per test

```ts
await runHtmlValidate(page, {
  presets: ['html-validate:recommended'],

  rules: {
    'valid-id': false,
  },

  ignoredRules: {
    // Ignore a noisy rule for a single page
    'no-inline-style': true,
  },

  // Keep JSON smaller for this test
  includeHtmlInReport: false,
});
```

---

## Reports

Output directory (generated): `build/artifacts/htmlValidator/`

Files:

- **`html-validate_<url>_<timestamp>.json`** - per-page JSON report (attached as downloadable link in HTML reporter)
- **`html-validate_<url>_<timestamp>.md`** - per-page Markdown report (attached as downloadable link in HTML reporter)
- **`html-validate-report.json`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`html-validate-report.md`** - merged summary generated in `global-teardown.ts` (available on disk)
- **`html-validate-report.pdf`** - PDF version of the summary generated in `global-teardown.ts` (available on disk)

Per-page reports are attached directly to each test in the HTML reporter as downloadable links.
Merged summary reports are generated in `global-teardown.ts` and saved to disk - they are not attached to the HTML reporter because global teardown runs outside the test context.
On sharded CI runs, this merge step is skipped in `global-teardown.ts` and instead runs once after all shards finish, via `utils/mergeQualityReports.ts` in the `merge-reports` job - see [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md).

Sample reports:

- [Sample JSON report](samples/htmlValidator-reports/html-validate-report.json)
- [Sample Markdown report](samples/htmlValidator-reports/html-validate-report.md)
- [Sample PDF report](samples/htmlValidator-reports/html-validate-report.pdf)
