import type {
  WebVitalsDeviceKey,
  WebVitalsDevicePreset,
} from '@utils/webVitals/webVitalsCore.types';

/**
 * Device presets for Core Web Vitals runs.
 *
 * They mirror the existing Lighthouse-oriented performance presets
 * so CWV and Lighthouse results can be compared on similar screen sizes.
 */
export const webVitalsDevicesConfig = {
  desktop: {
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  },
  desktopWide: {
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 2560,
      height: 1440,
      deviceScaleFactor: 1,
    },
  },
  mobile: {
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
    },
  },
  tablet: {
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
    },
  },
} as const satisfies Record<WebVitalsDeviceKey, WebVitalsDevicePreset>;
