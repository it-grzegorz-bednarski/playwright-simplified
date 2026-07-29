# Core Web Vitals

← [Back to main documentation](../README.md)

## Overview

Utility for collecting and optionally asserting Core Web Vitals (`LCP`, `CLS`, `INP`, `FCP`, `TTFB`) using the browser `Performance` API in Playwright.

- Metrics are always collected; thresholds are optional.
- If INP interaction is enabled (default), a built-in center click is used when no custom action is provided.

---

## Configuration

File: `config/feature-config/webVitals.config.ts`

```ts
import type { WebVitalsConfig } from './webVitalsCore.types';

export const webVitalsConfig: WebVitalsConfig = {
  thresholds: {
    LCP: 2500,
    CLS: 0.1,
    INP: 200,
    FCP: 1800,
    TTFB: 800,
  },
  collectTimeout: 5000,
  devices: ['desktop', 'mobile'],
  interactionDelayMs: 300,
};
```

**Config fields:**

- `thresholds` - pass/fail limits for selected metrics; use `{}` for monitoring-only runs.
- `collectTimeout` - wait time (ms) after network idle before reading metrics.
- `devices` - default presets executed in one `runWebVitals()` call.
- `interactionDelayMs` - wait time (ms) after interaction before metric read.

### Devices presets

File: `config/feature-config/webVitalsDevices.config.ts`

Example:

```ts
import type { WebVitalsDeviceKey, WebVitalsDevicePreset } from './webVitalsCore.types';

export const webVitalsDevicesConfig = {
  desktop: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1920, height: 1080, deviceScaleFactor: 1 },
  },
  mobile: {
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 375, height: 667, deviceScaleFactor: 2 },
  },
} as const satisfies Record<WebVitalsDeviceKey, WebVitalsDevicePreset>;
```

Use these keys in `webVitalsConfig.devices` or per-call `devices` override.

| Key           | Form factor | Width x Height | Scale |
| ------------- | ----------- | -------------- | ----- |
| `desktop`     | desktop     | 1920 x 1080    | 1     |
| `desktopWide` | desktop     | 2560 x 1440    | 1     |
| `mobile`      | mobile      | 375 x 667      | 2     |
| `tablet`      | mobile      | 768 x 1024     | 2     |

### Interaction actions (INP)

File: `config/feature-config/webVitalsActions.config.ts`

Use named actions when you want meaningful INP interactions (instead of fallback center click).

```ts
export const webVitalsActions: Record<string, WebVitalsInteractionAction> = {
  flipBothCheckboxes: async ({ target }) => {
    await requireTarget(target, CheckboxesPage, 'flipBothCheckboxes').flipBothCheckboxes();
  },
  addAndRemoveElement: async ({ target }) => {
    await requireTarget(
      target,
      AddRemoveElementsPage,
      'addAndRemoveElement'
    ).addAndRemoveSingleElement();
  },
};
```

Set action per test:

```ts
await runWebVitals(page, checkboxesPage, 'checkboxes', {
  interactionActionName: 'flipBothCheckboxes',
});
```

---

## Usage

### Basic call

```ts
import { runWebVitals } from '@utils/webVitals/webVitals';

await runWebVitals(page, homePage, 'homePage');
```

### Named action (for meaningful INP)

```ts
await runWebVitals(page, checkboxesPage, 'checkboxes', {
  thresholds: { LCP: 2500, CLS: 0.1 },
  interactionActionName: 'flipBothCheckboxes',
});
```

### Monitoring-only mode

```ts
await runWebVitals(page, homePage, 'homePage-observational', {
  thresholds: {},
});
```

### Per-call overrides

```ts
await runWebVitals(page, homePage, 'homePage-mobile-only', {
  devices: ['mobile'],
  collectTimeout: 7000,
  triggerInteractionForInp: true,
  interactionDelayMs: 400,
});
```

### Available per-call options

| Option                     | Type                                    | Description                                   |
| -------------------------- | --------------------------------------- | --------------------------------------------- |
| `thresholds`               | `Partial<Record<CwvMetricKey, number>>` | Thresholds to assert in this call             |
| `collectTimeout`           | `number`                                | Wait after network idle                       |
| `devices`                  | `WebVitalsDeviceKey[]`                  | Device presets for this run                   |
| `triggerInteractionForInp` | `boolean`                               | Enable/disable interaction for INP            |
| `interactionActionName`    | `string`                                | Named action from actions config              |
| `interactionAction`        | `WebVitalsInteractionAction`            | Inline custom action (overrides named action) |
| `interactionDelayMs`       | `number`                                | Wait after interaction                        |

---

## Reports

Output directory: `build/artifacts/web-vitals-reports/`

Per test:

- `web-vitals-<name>-<timestamp>.json`
- `web-vitals-<name>-<timestamp>.md`

Merged in teardown:

- `web-vitals-summary.json`
- `web-vitals-summary.md`
- `web-vitals-summary.pdf`

Sample reports:

- [Sample JSON report](samples/web-vitals-reports/web-vitals-summary.json)
- [Sample Markdown report](samples/web-vitals-reports/web-vitals-summary.md)
- [Sample PDF report](samples/web-vitals-reports/web-vitals-summary.pdf)

Sample per-test (partial) reports:

- [Sample JSON report](samples/web-vitals-reports/web-vitals-homepage-sample.json)
- [Sample Markdown report](samples/web-vitals-reports/web-vitals-homepage-sample.md)
- [Sample PDF report](samples/web-vitals-reports/web-vitals-homepage-sample.pdf)

Each report includes metric value, Google rating (`good` / `needs-improvement` / `poor`), custom threshold status, and `NOT ASSERTED` where threshold is not set.

### Google recommended scoring (reference)

| Metric | Good       | Needs improvement | Poor       |
| ------ | ---------- | ----------------- | ---------- |
| LCP    | <= 2500 ms | < 4000 ms         | >= 4000 ms |
| CLS    | <= 0.10    | < 0.25            | >= 0.25    |
| INP    | <= 200 ms  | < 500 ms          | >= 500 ms  |
| FCP    | <= 1800 ms | < 3000 ms         | >= 3000 ms |
| TTFB   | <= 800 ms  | < 1800 ms         | >= 1800 ms |

---

## References

- [Google Web Vitals](https://web.dev/vitals/)
- [LCP](https://web.dev/articles/lcp)
- [CLS](https://web.dev/articles/cls)
- [INP](https://web.dev/articles/inp)
- [FCP](https://web.dev/articles/fcp)
- [TTFB](https://web.dev/articles/ttfb)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [md-to-pdf](https://www.npmjs.com/package/md-to-pdf)
