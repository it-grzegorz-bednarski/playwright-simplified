export const assertNoConsoleErrorsConfig = {
  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  /**
   * Console message substrings to ignore.
   *
   * key = message substring
   * value = true -> ignore, false -> keep
   */
  ignoredPatterns: {
    'net::ERR_NAME_NOT_RESOLVED': true,
    'Failed to load resource: the server responded with a status of 401 ()': false,
  } as Record<string, boolean>,

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /** When true, include captured console messages in the JSON report. */
  includeConsoleMessagesInReport: true,
} as const;
