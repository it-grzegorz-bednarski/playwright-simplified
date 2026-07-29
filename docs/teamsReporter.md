# Teams Reporter

← [Back to main documentation](../README.md)

## Overview

Utility for sending Playwright run summaries to Microsoft Teams channels via incoming webhook URLs, built on top of **[playwright-teams-reporter](https://www.npmjs.com/package/playwright-teams-reporter)**.

---

## Configuration

### 1) Feature config

File: `config/feature-config/teamsReporter.config.ts`

```ts
export const teamsWebhookKeys = {
  failureChannel: 'TEAMS_WEBHOOK_FAILURE_CHANNEL',
  successChannel: 'TEAMS_WEBHOOK_SUCCESS_CHANNEL',
  successChannelQa: 'TEAMS_WEBHOOK_SUCCESS_CHANNEL_QA',
  failureChannelOps: 'TEAMS_WEBHOOK_FAILURE_CHANNEL_OPS',
} as const;

export const teamsReporterConfig = {
  enabled: true,
  debug: 'on-failure' as 'always' | 'on-failure' | 'off',

  // Use key names only. Do not put real webhook URLs here.
  onSuccessWebhookKeys: ['successChannel', 'successChannelQa'],
  onFailureWebhookKeys: ['failureChannel', 'failureChannelOps'],

  showFailuresDetails: true,
} as const;
```

Important:

- Real webhook URLs must be stored in env secrets (`TEAMS_WEBHOOK_*`).
- In config, you only choose which webhook keys are used for success/failure.
- `teamsWebhookKeys` maps logical key names (e.g. `successChannel`) to env variable names.

- `enabled` - master switch for Teams integration (`false` = no sending).
- `debug` - Teams reporter console verbosity:
  - `off` = mute Teams delivery logs,
  - `on-failure` = show Teams logs only when webhook delivery fails,
  - `always` = always show Teams delivery logs.
- `onSuccessWebhookKeys` - keys used when run result is success.
- `onFailureWebhookKeys` - keys used when run result is failure.
- `showFailuresDetails` - include only failed/flaky/timed out/interrupted test details.
  The reporter auto-trims details when Teams payload size is too large (soft limit: ~24 KB).

### 2) Env file secrets

Keep secrets in env, not in git-tracked config files.

Example local values in `env/.env.dev`:

```dotenv
TEAMS_REPORT_ENABLED=true

# Webhook URLs (secrets) used by keys from teamsWebhookKeys
TEAMS_WEBHOOK_SUCCESS_CHANNEL=https://...
TEAMS_WEBHOOK_SUCCESS_CHANNEL_QA=https://...
TEAMS_WEBHOOK_FAILURE_CHANNEL=https://...
TEAMS_WEBHOOK_FAILURE_CHANNEL_OPS=https://...

# Optional overrides
TEAMS_REPORT_DEBUG=on-failure
TEAMS_REPORT_SHOW_FAILURES_DETAILS=true
```

Notes:

- `TEAMS_WEBHOOK_*` values are secrets.

### 3) Playwright config fragment

File: `playwright.config.ts`

```ts
const reporters: ReporterDescription[] = [
  ...(process.env.CI ? [['list']] : [['./utils/cleanReporter.ts']]),
  // Skipped per-shard on sharded CI runs; runs once after merge instead (see below).
  ...(isCiShardedRun
    ? []
    : [['./utils/slackReporter/slackReporterAdapter.ts'], ['./utils/teamsReporter/teamsReporterAdapter.ts']]),
  ...(isCiShardedRun
    ? [['blob', { outputDir: `${buildDir}/blob-report` }]]
    : [['html', { outputFolder: `${buildDir}/html-report`, open: 'never' }]]),
];
```

> On sharded CI runs (`playwright-dispatch-sharded.yml`), this reporter is skipped per-shard (partial results would produce misleading messages) and instead runs once, after all shards are merged, via `playwright.sharding.config.ts` in the workflow's `merge-reports` job. See [Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md).

---

## Teams Preparation

Before using this integration, create a webhook workflow for each Teams channel you want to notify.

For each target channel:

1. Open channel options (**More options** / `...`).
2. Go to **Workflows**.
3. Find template: **Send webhook alerts to a channel**.
4. Configure and finish the workflow.
5. On the final screen copy the **webhook URL** and store it in your env secret (`TEAMS_WEBHOOK_*`).

Notes:

- You need a separate webhook URL per channel.
- On the final step, check whether the workflow is active.
- If activation is blocked, your tenant admin may restrict self-service workflow creation/activation.

Reference docs:

- [Microsoft Learn: Workflows in Teams (Power Automate)](https://learn.microsoft.com/power-automate/teams/overview)
- [Microsoft Teams platform: Webhooks and connectors](https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using)

## Usage

Run tests normally. Teams summary is sent automatically when enabled.

```powershell
yarn test dev --grep accessibility
```

Delivery behavior:

- Passed run -> sends to `onSuccessWebhookKeys` destinations.
- Failed run -> sends to `onFailureWebhookKeys` destinations.
- Failure details are sent as `Failed Cases Details` (not all test cases).
- If payload is too large, details are trimmed automatically and card includes a note.
- If enabled and any configured key is invalid/missing, reporter fails fast with clear config error.


