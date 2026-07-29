/**
 * Device presets used by Lighthouse performance test.
 */
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
