export const performanceMonitoringConfig = {
  /**
   * Hide sensitive data in reports.
   *
   * When enabled, extraHeaders, chrome.flags and extraLighthouseFlags values are hidden in reports.
   * URLs are NOT hidden.
   */
  hideSensitiveDataInReport: true,

  /** Devices to monitor: keys from performanceDevices.config.ts */
  devices: ['desktop', 'mobile'] as const,

  /** Toggle verbose Lighthouse logs */
  logs: false,

  /** Number of Lighthouse runs per URL per device — median is used as the final score */
  numberOfRuns: 3,

  /** Categories to include in monitoring */
  onlyCategories: ['performance', 'accessibility', 'bestPractices', 'seo'] as const,

  /** Audits to skip */
  skipAudits: ['uses-http2'] as const,

  // ---------------------------------------------------------------------------
  // Advanced configuration
  // ---------------------------------------------------------------------------

  chrome: {
    headless: true,
    flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] as const,
  },

  extraHeaders: {} as Record<string, string>,
  extraLighthouseFlags: [] as const,
} as const;
