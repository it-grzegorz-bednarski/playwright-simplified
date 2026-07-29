export const cwvMetricKeys = ['LCP', 'CLS', 'INP', 'FCP', 'TTFB'] as const;

export type CwvMetricKey = (typeof cwvMetricKeys)[number];

export type CwvThresholds = Partial<Record<CwvMetricKey, number>>;

export type WebVitalsDeviceKey = 'desktop' | 'desktopWide' | 'mobile' | 'tablet';

export interface WebVitalsDevicePreset {
  formFactor: 'desktop' | 'mobile';
  screenEmulation: {
    mobile: boolean;
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
}

export type WebVitalsConfig = {
  thresholds: CwvThresholds;
  collectTimeout: number;
  devices: WebVitalsDeviceKey[];
  interactionDelayMs: number;
};

export const WEB_VITALS_DEFAULT_TRIGGER_INTERACTION_FOR_INP = true;

export function ensureWebVitalsDevicesConfigured(
  devices: readonly WebVitalsDeviceKey[] | undefined
): asserts devices is readonly WebVitalsDeviceKey[] {
  if (!devices || devices.length === 0) {
    throw new Error(
      'Web Vitals devices are not configured. Set at least one device in webVitals.config.ts (e.g. devices: ["desktop"]).'
    );
  }
}
