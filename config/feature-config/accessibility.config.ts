export const accessibilityConfig = {
  // ---------------------------------------------------------------------------
  // axe-core tags
  // ---------------------------------------------------------------------------

  /** WCAG / Section 508 tags used by axe-core. */
  tags: [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ] as ReadonlyArray<string>,

  // ---------------------------------------------------------------------------
  // Rule exceptions
  // ---------------------------------------------------------------------------

  /** Rules to ignore globally. true = ignore, false = keep. */
  ignoredRules: {
    'color-contrast': true,
    'landmark-one-main': true,
    'page-has-heading-one': true,
    region: true,
  } as Record<string, boolean>,

  // ---------------------------------------------------------------------------
  // Global exclusions
  // ---------------------------------------------------------------------------

  /** CSS selectors excluded from scans. */
  excludeElements: ['.cookie-banner'] as ReadonlyArray<string>,

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /** Include node targets in per-page JSON reports. */
  includeNodesInReport: true,

  /** Max number of violations to include in merged page details. */
  issueLimitPerPage: 50,
} as const;
