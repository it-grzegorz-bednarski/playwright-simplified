import type { WebVitalsConfig } from '@utils/webVitals/webVitalsCore.types';

export const webVitalsConfig: WebVitalsConfig = {
  /**
   * Optional pass/fail limits for selected metrics.
   * Leave a metric out to collect it without assertions.
   * Use {} to run monitoring-only (no threshold checks).
   * Units: LCP/FCP/TTFB/INP = ms, CLS = score.
   *
   * Google good reference:
   * LCP <= 2500, CLS <= 0.10, INP <= 200, FCP <= 1800, TTFB <= 800.
   */
  thresholds: {
    LCP: 3500,
    CLS: 0.5,
    INP: 500,
    FCP: 2800,
    TTFB: 1800,
  },

  /** Wait time (ms) after network idle before reading metrics. */
  collectTimeout: 5000,

  /** Device presets executed by default in one runWebVitals() call. */
  devices: ['desktop', 'mobile'],

  /** Wait time (ms) after interaction before reading metrics. */
  interactionDelayMs: 300,
};
