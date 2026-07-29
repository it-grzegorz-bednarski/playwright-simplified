export const htmlValidatorConfig = {
  // ---------------------------------------------------------------------------
  // Presets
  // ---------------------------------------------------------------------------

  /**
   * html-validate presets passed to `extends`.
   *
   * @example
   * presets: ['html-validate:recommended']
   */
  presets: ['html-validate:recommended'] as ReadonlyArray<string>,

  // ---------------------------------------------------------------------------
  // Rules
  // ---------------------------------------------------------------------------

  /**
   * html-validate rules.
   *
   * `true` = enabled
   * `false` = disabled
   */
  rules: {
    'no-dup-attr': true,
    'no-dup-id': true,
    'valid-id': false,
    'element-required-attributes': true,
  } as Record<string, boolean>,

  /**
   * Rules to ignore in reports (useful for legacy HTML pages).
   * `true` = ignore, `false` = keep.
   */
  ignoredRules: {
    'no-trailing-whitespace': true,
    'no-inline-style': true,
    'no-conditional-comment': true,
    'element-permitted-content': true,
    'prefer-native-element': true,
    'attribute-allowed-values': true,
  } as Record<string, boolean>,

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /** When true, include the full HTML snippet in the JSON report (can be large). */
  includeHtmlInReport: true,
} as const;
