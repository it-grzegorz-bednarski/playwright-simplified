export const performanceTestConfig = {
  hideSensitiveDataInReport: true,

  devices: ['desktop', 'mobile'] as const,
  logs: false,

  onlyCategories: ['performance', 'accessibility', 'bestPractices', 'seo'] as const,
  thresholds: {
    accessibility: 50,
    bestPractices: 50,
    performance: 50,
    pwa: 50,
    seo: 50,
  },
  skipAudits: ['uses-http2'] as const,

  // ---------------------------------------------------------------------------
  // Advanced configuration
  // ---------------------------------------------------------------------------

  chrome: {
    headless: true,
    flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] as const,
  },

  extraHeaders: {},
  extraLighthouseFlags: [] as const,
} as const;
