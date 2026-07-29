import { defineConfig, type ReporterDescription } from '@playwright/test';
import { envLoaderConfig } from '@config/envLoaderConfig';
import { timeouts } from '@config/timeouts';
import { initializeEnvFromProcess } from '@utils/envLoader';
import { buildEnvProjects, projectTag } from '@utils/projectsBuilder';
import { isCiShardingEnabled } from '@utils/runWithoutCiSharding';

initializeEnvFromProcess(envLoaderConfig);

// ============================================
// Build Configuration
// ============================================

/**
 * Output directory for all Playwright artifacts, reports and test results.
 *
 * ⚠️ If you rename this value, update it manually in:
 *   - tsconfig.json       → "exclude"
 *   - eslint.config.js    → "ignores"
 *   - .gitignore          → build output section
 */
export const buildDir = 'build';

const isCiShardedRun = isCiShardingEnabled();

const envProjects = buildEnvProjects(process.env);

const projects = [
  ...envProjects,
  {
    name: 'testBrand',
    grep: projectTag('testBrand'),
  },
];

const ciShardReporters: ReporterDescription[] = [
  ['blob', { outputDir: `${buildDir}/blob-report` }],
];

const nonShardedReporters: ReporterDescription[] = [
  ['html', { outputFolder: `${buildDir}/html-report`, open: 'never' }],
  ['junit', { outputFile: `${buildDir}/junit/results.xml` }],
  ['json', { outputFile: `${buildDir}/json/results.json` }],
];

const reporters: ReporterDescription[] = [
  ...(process.env.CI
    ? ([['list']] as ReporterDescription[])
    : ([['./utils/cleanReporter.ts']] as ReporterDescription[])),
  // For sharded runs: Slack/Teams will run AFTER merge-reports in a dedicated job
  // For non-sharded runs: they run here with complete data
  ...(isCiShardedRun
    ? []
    : ([
        ['./utils/slackReporter/slackReporterAdapter.ts'],
        ['./utils/teamsReporter/teamsReporterAdapter.ts'],
      ] as ReporterDescription[])),
  ...(isCiShardedRun ? ciShardReporters : nonShardedReporters),
];

// ============================================
// Playwright Config Export
// ============================================

export default defineConfig({
  // ──────────────────────────────────────
  // Execution Settings
  // ──────────────────────────────────────
  fullyParallel: true,
  testDir: 'tests',
  workers: process.env.CI ? undefined : 6,
  retries: Number(process.env.RETRIES) || (process.env.CI ? 1 : 0),

  // ──────────────────────────────────────
  // Projects (Locale/Brand Configuration)
  // ──────────────────────────────────────
  projects,

  // ──────────────────────────────────────
  // Timeouts
  // ──────────────────────────────────────
  timeout: Number(process.env.TEST_TIMEOUT) || timeouts.veryLong,
  expect: {
    timeout: Number(process.env.EXPECT_TIMEOUT) || timeouts.short,
  },

  // ──────────────────────────────────────
  // Per-Test Defaults
  // ──────────────────────────────────────
  use: {
    actionTimeout: Number(process.env.ACTION_TIMEOUT) || timeouts.normal,
    navigationTimeout: Number(process.env.NAVIGATION_TIMEOUT) || timeouts.long,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  // ──────────────────────────────────────
  // Reporting & Output
  // ──────────────────────────────────────
  outputDir: `${buildDir}/artifacts`,
  reporter: reporters,

  // ──────────────────────────────────────
  // Global Setup/Teardown
  // ──────────────────────────────────────
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
});

