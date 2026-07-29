# Slack Reporter

← [Back to main documentation](../README.md)

## Overview

Utility for sending Playwright run summaries to Slack channels/DM, built on top of **[playwright-slack-report](https://github.com/ryanrosello-og/playwright-slack-report)**.

---

## Configuration

### 1) Feature config

File: `config/feature-config/slackReporter.config.ts`

```ts
export const slackReporterConfig = {
  enabled: true,
  debug: 'on-failure' as 'always' | 'on-failure' | 'off',
  onSuccessChannels: [
    // Slack channel: myProject-dev-team-channel
    'C0BJQFW3A77',
    // Optional member IDs:
    // John Doe (Developer) - Member ID
    'U0BJRMVA8NS',
  ] as string[],
  onFailureChannels: [
    // Slack channel: myProject-dev-team-channel
    'C0BJQFW3A77',
    // DM/member alerts for failures:
    // John Doe (Developer) - Member ID
    'U0BJRMVA8NS',
    // Jane Doe (QA) - Member ID
    'U0BJMD8M3J7',
  ] as string[],
  showInThread: true,
  disableUnfurl: false,
  maxNumberOfFailuresToShow: 9999,
} as const;
```

- `enabled` - master switch for Slack integration (`false` = no sending).
- `debug` - Slack reporter console verbosity:
  - `off` = mute Slack delivery logs,
  - `on-failure` = show Slack logs only when Slack delivery fails,
  - `always` = always show Slack delivery logs.
- `onSuccessChannels` - destinations for successful runs.
- `onFailureChannels` - destinations for failed runs.
- `showInThread` - post failure details in Slack thread under summary message.
- `disableUnfurl` - disable Slack link preview cards.
- `maxNumberOfFailuresToShow` - max number of failure details to include.
  - Use a large number (e.g. `9999`) for practical "no limit".

### 2) Env file secrets

Keep secrets in env, not in git-tracked config files.

Example local values in `env/.env.dev`:

```dotenv
SLACK_REPORT_ENABLED=true
SLACK_BOT_USER_OAUTH_TOKEN=xoxb-271904563812-940176235408-vN7qLm2sKp9Tz4dYw8rBc6He

# Optional overrides
SLACK_REPORT_DEBUG=on-failure
SLACK_REPORT_ON_SUCCESS_CHANNELS=C0BJQFW3A77
SLACK_REPORT_ON_FAILURE_CHANNELS=C0BJQFW3A77,U0BJRMVA8NS
SLACK_REPORT_SHOW_IN_THREAD=true
SLACK_REPORT_DISABLE_UNFURL=false
SLACK_REPORT_MAX_FAILURES=100
```

Notes:

- `SLACK_BOT_USER_OAUTH_TOKEN` is the secret.
- Channel/member/conversation IDs are usually not secrets.

### 3) Playwright config fragment

File: `playwright.config.ts`

```ts
const reporters: ReporterDescription[] = [
  ...(process.env.CI ? [['list']] : [['./utils/cleanReporter.ts']]),
  // Skipped per-shard on sharded CI runs; runs once after merge instead (see below).
  ...(isCiShardedRun ? [] : [['./utils/slackReporter/slackReporterAdapter.ts']]),
  ...(isCiShardedRun
    ? [['blob', { outputDir: `${buildDir}/blob-report` }]]
    : [['html', { outputFolder: `${buildDir}/html-report`, open: 'never' }]]),
];
```

> On sharded CI runs (`playwright-dispatch-sharded.yml`), this reporter is skipped per-shard (partial results would produce misleading messages) and instead runs once, after all shards are merged, via `playwright.sharding.config.ts` in the workflow's `merge-reports` job. See [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md).

---

## Slack Preparation

Before using this integration, prepare a Slack app/bot in your workspace.

1. Open **[Slack Apps](https://api.slack.com/apps)** and create a new app (**From scratch**).
2. Set app name (for example `myProjectName-Slack-Reporter`) and choose your workspace.
3. In **OAuth & Permissions** -> **Bot Token Scopes**, add:
   - `chat:write`
   - `chat:write.customize`
   - `chat:write.public`
4. In **OAuth Tokens**, click **Install to Workspace** and accept permissions.
5. Copy **Bot User OAuth Token** (`xoxb-...`) to your local env file as `SLACK_BOT_USER_OAUTH_TOKEN`.
6. Invite bot to each channel where it should post messages:

```text
/invite @myProjectName-Slack-Reporter
```

Notes:

- Direct messages do not require channel invite.

Reference docs:

- [Slack: Creating an app](https://api.slack.com/start/building)
- [Slack: OAuth & scopes](https://api.slack.com/authentication/oauth-v2)
- [Slack: Inviting apps to channels](https://slack.com/help/articles/202035138-Add-apps-to-your-Slack-workspace)


## Usage

Run tests normally. Slack summary is sent automatically when enabled.

```powershell
yarn test dev --grep accessibility
```

Scope handling in Slack message:

- User-provided scope (e.g. `--grep accessibility`, `performanceMonitoring`) is shown as `Scope`.
- Auto-injected runner filters (locale/project internals) are not shown as user scope.

---

## Example Slack Report

Example sample file:

- [`docs/samples/slack-reporter-reports/slack-thread-failure-sample.md`](./samples/slack-reporter-reports/slack-thread-failure-sample.md)
