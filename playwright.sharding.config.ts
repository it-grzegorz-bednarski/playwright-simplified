import { defineConfig } from '@playwright/test';
import { envLoaderConfig } from '@config/envLoaderConfig';
import { initializeEnvFromProcess } from '@utils/envLoader';

// Loads env/.env.<ENV> into process.env (same mechanism as the main config)
// so Slack/Teams auth (SLACK_BOT_USER_OAUTH_TOKEN, TEAMS_WEBHOOK_*_CHANNEL, ...)
// is available when this config is used by `playwright merge-reports`.
initializeEnvFromProcess(envLoaderConfig);

const buildDir = 'build';

export default defineConfig({
  reporter: [
    ['html', { outputFolder: `${buildDir}/html-report`, open: 'never' }],
    ['junit', { outputFile: `${buildDir}/junit/results.xml` }],
    ['json', { outputFile: `${buildDir}/json/results.json` }],
    // For sharded CI runs, the main config skips these reporters per-shard
    // (see playwright.config.ts) and instead relies on `playwright merge-reports`
    // replaying the combined blob reports through this config exactly once,
    // so Slack/Teams notifications reflect the complete, merged test run.
    ['./utils/slackReporter/slackReporterAdapter.ts'],
    ['./utils/teamsReporter/teamsReporterAdapter.ts'],
  ],
});
