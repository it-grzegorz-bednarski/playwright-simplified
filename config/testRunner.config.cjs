module.exports = {
  // CLI aliases: 'alias': '--flags', or composable: 'alias': 'env other-alias'
  // Run "yarn test help" to see defined aliases listed in the CLI.
  // Print expanded command before each run. Override: PW_VERBOSE=1 yarn test ...
  verbose: false,

  // Tags always excluded from shared runs.
  ignoredTags: ['@deprecated'],

  // Tags treated as separate run modes.
  // They are excluded from shared runs unless explicitly selected.
  separateRunModes: ['@visual', '@performanceTest', '@performanceMonitoring', '@reporter'],

  github: {
    enabled: true,
    workflowFile: 'playwright-dispatch.yml',
    apiBaseUrl: 'https://api.github.com',
    tokenEnvVars: ['GITHUB_TOKEN', 'GH_TOKEN'],
  },

  // Sharding configuration (CI-agnostic).
  // totalShards > 1 enables sharded CI run via playwright-dispatch-sharded.yml.
  // Override with env: PW_GITHUB_SHARD_TOTAL, GITHUB_SHARD_TOTAL, or PLAYWRIGHT_GITHUB_SHARD_TOTAL.
  sharding: {
    totalShards: 4,
  },

  aliases: {
    security: '--grep "@cspCheck|@securityHeaders"',
    'testBrand:security': '--project testBrand security',
    'dev:multi': 'dev --project multiLocale',
    'dev:slavic': 'dev --grep "@slavic"',
    'performance': 'performanceTest --workers=1',
  },
};



