export const linkCheckConfig = {
  // ---------------------------------------------------------------------------
  // Scope
  // ---------------------------------------------------------------------------

  /**
   * Crawl beyond the initial page.
   * - false: only checks links found on the provided page(s)
   * - true: recursively checks internal pages (be careful in CI)
   */
  recurse: false,

  /**
   * Only follow/check links that are on the same origin (protocol+host+port)
   * as the start URL. Recommended for stable CI.
   */
  sameOriginOnly: true,

  // ---------------------------------------------------------------------------
  // Stability & performance
  // ---------------------------------------------------------------------------

  /** Max concurrent link checks. Lower this if you see 429s / rate limits. */
  concurrency: 5,

  /** Per-link timeout in milliseconds. */
  timeoutMs: 15000,

  // ---------------------------------------------------------------------------
  // Skip / ignore rules
  // ---------------------------------------------------------------------------

  /**
   * Links to skip entirely.
   * key = substring used for matching
   * value = true to enable skip, false to disable
   */
  skippedLinks: {
    'mailto:': true,
    'tel:': true,
    'sms:': true,
    'javascript:': true,
    '#': true,
    '/logout': true,
    '/digest_auth': true,
  } as Record<string, boolean>,

  /**
   * Treat these HTTP status codes as acceptable (won't fail the test).
   * Useful for endpoints that require auth (401/403) or rate limiting (429).
   */
  allowedStatusCodes: {
    401: false,
    403: false,
    429: false,
  } as Record<number, boolean>,

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /** Include non-broken links in the report output. */
  includeOkLinksInReport: true,

  /** Max number of OK links to include in the report (when includeOkLinksInReport=true). */
  okLinksReportLimit: 500,

  /** Max number of broken links to include in report output. */
  brokenLinksReportLimit: 500,
} as const;
