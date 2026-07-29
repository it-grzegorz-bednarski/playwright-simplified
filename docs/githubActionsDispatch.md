# GitHub Actions Dispatch

← [Back to main documentation](../README.md)

## Overview

Run Playwright tests on GitHub Actions with environment-based secrets. All secrets and environment variables are bundled in a single `.env` file per environment, stored as a repository secret.

Tests can be triggered from:

- **GitHub UI** - via **workflow_dispatch** in **Actions** tab
- **Local test runner** - via `yarn test <env> ... --github` command

---

## Configuration

### Test runner settings

File: `config/testRunner.config.cjs` (`github` section)

```js
module.exports = {
  // ...other settings...

  github: {
    // Enable or disable --github flag in test runner.
    // When false, yarn test ... --github is blocked and --github is hidden from help.
    enabled: true,

    // Filename of the GitHub Actions workflow to dispatch.
    workflowFile: 'playwright-dispatch.yml',

    // GitHub API base URL (usually no need to change).
    apiBaseUrl: 'https://api.github.com',

    // Env variable names checked (in order) for GitHub token.
    tokenEnvVars: ['GITHUB_TOKEN', 'GH_TOKEN'],
  },
};
```

Config fields:

- `enabled` - master switch for `--github` mode. When `false`, blocks dispatch and hides `--github` from help.
- `workflowFile` - filename of the workflow to dispatch (must match file in `.github/workflows/`).
- `apiBaseUrl` - GitHub API base URL. Rarely needs changing.
- **`tokenEnvVars`** - Environment variable names checked (in order) for the Personal Access Token.

### Repository secrets

For each environment, create one repository secret containing the full `.env` file content.

Name mapping must follow this convention:

- `env/.env.dev` -> `ENV_DEV`
- `env/.env.qa` -> `ENV_QA`
- `env/.env.stage` -> `ENV_STAGE`

**Example env file content to paste as secret (`ENV_DEV`):**

```dotenv
ENVIRONMENT=dev

GITHUB_TOKEN=ghp_Xk9mR2nP4wQzL7vBcT1jYsE3aUoHdF5iN8

TEAMS_REPORT_ENABLED=true
TEAMS_WEBHOOK_SUCCESS_CHANNEL=https://default2b755fa00000.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/a00b0000000a000000000add0efa0000/triggers/manual/paths/invoke?api-version=1&sp=xxx
TEAMS_WEBHOOK_FAILURE_CHANNEL=https://default2b755fa00000.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b11c1111111b111111111bee1fbb1111/triggers/manual/paths/invoke?api-version=1&sp=xxx

BASE_URL=https://example.com
```

Notes:

- Paste the entire file content as the secret value — the workflow recreates the `.env` file from it.
- Tokens and URLs above are example-format only. Use real values from your project.

How to add or update secrets:

1. Edit your local env file (e.g., `env/.env.dev`) and add/update any variable you need (framework settings, API tokens, webhook URLs, etc.).
2. Open repository: **Settings** → **Secrets and variables** → **Actions**.
3. In **Repository secrets**, click on the secret name (e.g., `ENV_DEV`) or create a new one with the naming convention `ENV_<ENVNAME>`.
4. Paste the entire content of your updated `env/.env.<env>` file as the secret value.
5. Save.

All framework variables (Teams, Slack, APIs, performance testing, accessibility, etc.) are configured through this single `.env` file — no workflow modifications needed.

### Personal Access Token

Create a GitHub Personal Access Token (classic) for local `yarn test ... --github` commands:

1. GitHub -> **Settings**.
2. **Developer settings** -> **Personal access tokens** -> **Tokens (classic)**.
3. **Generate new token (classic)**.
4. Set token name (describing purpose), expiration (or no expiration per policy).
5. In scopes, select:
   - full `repo` section,
   - `workflow` section.
6. Generate token and copy it immediately (GitHub will not show it again).
7. Store it securely and add it to your local env file as `GITHUB_TOKEN`.

**Example env file entry:**

```dotenv
GITHUB_TOKEN=ghp_Xk9mR2nP4wQzL7vBcT1jYsE3aUoHdF5iN8
```

### Workflow permissions

Enable repository workflow permissions:

1. Repository -> **Settings** -> **Actions** -> **General**.
2. In **Workflow permissions**, choose **Read and write permissions**.
3. Save.

Without this, workflow dispatch may fail due to insufficient permissions.

Reference docs:

- [GitHub Docs: Creating a personal access token (classic)](https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub Docs: Using secrets in GitHub Actions](https://docs.github.com/actions/security-guides/using-secrets-in-github-actions)
- [GitHub Docs: Workflow permissions for GITHUB_TOKEN](https://docs.github.com/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)

---

## Usage

### Run from GitHub UI

1. Open **Actions** tab.
2. Select workflow **Playwright Dispatch**.
3. Click **Run workflow**.
4. Fill:
   - `environment`: e.g. `dev`
   - `env_secret_name`: matching secret, e.g. `ENV_DEV`
   - `runner_args_json`: optional, e.g. `["--grep","@smoke"]`

### Run from test runner (`--github`)

```sh
yarn test dev --grep "@smoke" --github
yarn test dev --github
```

The runner resolves the secret name automatically from the env name (`dev` -> `ENV_DEV`) and dispatches `.github/workflows/playwright-dispatch.yml`.

If `github.enabled` is set to `false` in `config/testRunner.config.cjs`, `--github` is blocked with a clear error.

### Sharded runs

When `sharding.totalShards` in `config/testRunner.config.cjs` is greater than `1`, the runner dispatches `.github/workflows/playwright-dispatch-sharded.yml` instead, splitting the run across parallel shards and merging the reports back into one result. See **[Playwright Dispatch (Sharded)](./playwrightDispatchSharded.md)** for details.

