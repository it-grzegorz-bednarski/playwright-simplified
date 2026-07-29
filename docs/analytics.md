# Analytics

← [Back to main documentation](../README.md)

## Overview

Utility for capturing and asserting analytics events (Adobe / GTM dataLayer) in Playwright tests.

---

## Configuration

Configuration for analytics testing is defined in **`config/feature-config/analyticsConfig.ts`**.
This file controls how analytics events are logged to the console when you use `checkAnalyticsEvent`.

**Example configuration (`config/feature-config/analyticsConfig.ts`):**

```ts
export const analyticsConfig = {
  // ---------------------------------------------------------------------------
  // Debug logging
  // ---------------------------------------------------------------------------

  debugAnalytics: 'ifFail',

  // ---------------------------------------------------------------------------
  // Debug filtering
  // ---------------------------------------------------------------------------

  // Filter for logging analytics events in debug output.
  // Can be:
  // - []                -> no filtering, all events are logged
  // - ['key']           -> event contains property 'key' with any value OR any value equals 'key'
  // - ['value']         -> any property in the event has value 'value'
  // - ['key:value']     -> event contains property 'key' with value 'value'
  // - ['key1', 'key2:value2', 'value3']  -> ALL conditions in the list must be satisfied (logical AND)
  filterKey: [],
} as const;
```

**Configuration options:**

- **`debugAnalytics`** – controls console logging behavior:
  - `'always'` – log expected pattern, filtered current events and result for success and failure
  - `'ifFail'` – log only when `checkAnalyticsEvent` fails (recommended for most CI runs)
  - `'never'` – do not log anything (aside from the thrown error)
- **`filterKey`** – list of patterns used to filter analytics events in debug output (logical AND):
  - `[]` – no filtering, all captured events are logged
  - `['key']` – event contains property `key` (with any value) **or** any property value equals `key`
  - `['value']` – any property in the event has value `value`
  - `['key:value']` – event contains property `key` with value `value`
  - `['event:gtm.click', 'user_status:Guest']` – event must match **both** conditions

> **Note:** `filterKey` affects only what is printed to the console. All events are still captured and used when matching against expected shapes.

### Analytics data files

Expected analytics events are defined as JSON files in **`data/analytics/*.json`**.
Each file contains the expected event structure — only keys present in the file are checked (partial deep match).

Example file `data/analytics/acceptAllCookiesButtonClick.json`:

```json
{
  "event": "gtm.click",
  "gtm.elementClasses": "cookie-accept-button",
  "gtm.triggers": "6,7"
}
```

When you call:

```ts
await checkAnalyticsEvent(page, 'acceptAllCookiesButtonClick.json');
```

`checkAnalyticsEvent` will:

1. Load `data/analytics/acceptAllCookiesButtonClick.json`.
2. Wait until a captured event **deeply matches** the file (only file keys must be present and equal).
3. If no matching event appears before timeout, fail the step and include the expected pattern and the captured events in the error message.

---

## Usage

The analytics helper exposes two main functions from **`utils/analytics.ts`**:

- **`initAnalyticsSpy(page)`** – injects hooks for Adobe and GTM data layers and starts capturing events.
- **`checkAnalyticsEvent(page, fileName, replacements?, options?)`** – waits until a captured event matches the expected shape defined in `data/analytics/*.json`.

### Basic usage

```ts
import { test } from '@playwright/test';
import { initAnalyticsSpy, checkAnalyticsEvent } from '../utils/analytics';

test('Homepage view triggers correct analytics event', async ({ page }) => {
  await initAnalyticsSpy(page);

  await page.goto('https://example.com');

  // Perform action that should trigger analytics
  await page.click('.cookie-accept-button');

  // Validate that expected event was captured
  await checkAnalyticsEvent(page, 'acceptAllCookiesButtonClick.json');
});
```

Per-call overrides are also supported:

```ts
await checkAnalyticsEvent(page, 'acceptAllCookiesButtonClick.json', undefined, {
  debugAnalytics: 'always',
  filterKey: ['tenant:developers'],
});
```

`options` overrides the global `analyticsConfig` only for that assertion.

---

## Dynamic values

You can keep data files stable and override dynamic values (e.g. IDs, timestamps) per test using `replacements`.

Example file `data/analytics/searchEvent.json`:

```json
{
  "event": "search",
  "searchTerm": "%SEARCH_TERM%",
  "language": "pl-pl"
}
```

Test:

```ts
await initAnalyticsSpy(page);
await page.goto('https://example.com');

await page.fill('#search', 'playwright testing');
await page.click('#search-button');

await checkAnalyticsEvent(page, 'searchEvent.json', {
  '%SEARCH_TERM%': 'playwright testing',
});
```

In this example:

- File `searchEvent.json` is loaded from `data/analytics/`.
- Placeholder `%SEARCH_TERM%` is replaced with `playwright testing` **before** matching.
- Any other fields defined in the file (e.g. `language`) must also match the captured event.

---

## Debug output

Debug output from `checkAnalyticsEvent` is controlled by `analyticsConfig.debugAnalytics` and `analyticsConfig.filterKey`.

When debug is enabled (`'always'` or `'ifFail'`), the console output follows this structure:

```text
Check analytics event: searchEvent.json
Expected pattern (from searchEvent.json): {
  "event": "search",
  "searchTerm": "playwright testing",
  "language": "pl-pl"
}
[AnalyticsSpy] Current events (filter: "event:search, user_status:Guest"):
===== [AnalyticsSpy] Event 1 =====
{ ...matching event payload... }
Result: ✅ Expected analytics event found.
```

Or on failure:

```text
Check analytics event: searchEvent.json
Expected pattern (from searchEvent.json): {
  "event": "search",
  "searchTerm": "playwright testing",
  "language": "pl-pl"
}
[AnalyticsSpy] Current events (filter: "event:search, user_status:Guest"):
===== [AnalyticsSpy] Event 1 =====
{ ...non-matching event payload... }
Result: ❌ Expected analytics event NOT found within 10000ms.
```

**Key points:**

- **Expected pattern** – shows the expected shape used (after applying `replacements`).
- **Current events (filter: ...)** – shows **only** events that match all conditions defined in `filterKey`.
  - When `filterKey` has no effective filters (e.g. `[]`), label will be `<<no filter>>`.
- **Result:** – indicates whether the expected event was found.

If `debugAnalytics` is set to `'never'`, `checkAnalyticsEvent` will still throw a detailed error on failure, but will not log intermediate debug information.
