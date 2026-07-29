# Performance Devices

← [Back to main documentation](../README.md)

## Overview

Device presets for performance tests.

Use these keys to control device emulation (screen size, scale factor, form factor) in:

- **[Performance Test](./performanceTest.md)**
- **[Performance Monitoring](./performanceMonitoring.md)**

Performance tools are built on top of **[Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)**.

---

## Configuration

File: `config/feature-config/performanceDevices.config.ts`

Each device defines:

- `formFactor` - passed to Lighthouse (`desktop` / `mobile`)
- `screenEmulation` - screen settings used by Lighthouse
  - `mobile` - enable/disable mobile emulation
  - `width`, `height` - viewport size
  - `deviceScaleFactor` - device pixel ratio

Example:

```ts
export const performanceDevicesConfig = {
  desktop: {
    formFactor: 'desktop' as const,
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  },
  desktopWide: {
    formFactor: 'desktop' as const,
    screenEmulation: {
      mobile: false,
      width: 2560,
      height: 1440,
      deviceScaleFactor: 1,
    },
  },
  mobile: {
    formFactor: 'mobile' as const,
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
    },
  },
  tablet: {
    formFactor: 'mobile' as const,
    screenEmulation: {
      mobile: true,
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
    },
  },
} as const;

export type PerformanceDeviceKey = keyof typeof performanceDevicesConfig;
```

Available device keys: `desktop` | `desktopWide` | `mobile` | `tablet`

---

## Usage

Use device keys in both performance configs:

- `config/feature-config/performanceTest.config.ts` – for threshold-based audits
- `config/feature-config/performanceMonitoring.config.ts` – for observational runs (no thresholds)

### Global default (applies to all URLs)

```ts
export const performanceTestConfig = {
  devices: ['desktop', 'mobile'],
  // ...
} as const;
```

### Per-call override (in tests)

```ts
await runPerformanceTest(page, homePage, 'homePage', {
  devices: ['desktop'],
});
```

### Per-URL override (in config)

```ts
export const performanceTestConfig = {
  devices: ['desktop'],
  urlsToTest: [
    {
      name: 'homePage',
      path: '/',
      devices: ['mobile', 'tablet'],
    },
  ],
} as const;
```
