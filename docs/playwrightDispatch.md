# Playwright Dispatch

← [Back to main documentation](../README.md)

## Overview

GitHub Actions workflow for running Playwright tests on CI. The workflow is manually triggered via **[workflow_dispatch](https://docs.github.com/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_dispatch)** from the GitHub UI or `yarn test ... --github` from the local test runner.

The workflow accepts an environment name and a matching repository secret, rebuilds the env file on the runner, and executes the test suite.

---

## Configuration

Workflow file: `.github/workflows/playwright-dispatch.yml`

### Dispatch inputs

Pass these when triggering the workflow:

- **`environment`** - Environment name (e.g., `dev`, `qa`). Must match a secret `ENV_<UPPERCASE>`.
- **`env_secret_name`** - Repository secret name containing env file content (e.g., `ENV_DEV`).
- **`runner_args_json`** - JSON array of extra Playwright args (optional, e.g., `["--grep","@smoke"]`).

### Key features

- **Concurrency:** Only one run per environment at a time. New dispatches cancel in-progress runs for the same environment.
- **Environment reconstruction:** Restores the `.env` file from the `ENV_<UPPERCASE>` repository secret before running tests.
- **Caching:** Yarn packages and Playwright browsers are cached by OS, Node version, Yarn version, and `yarn.lock`.
- **Artifacts:** Build outputs (reports, screenshots, traces) are uploaded as workflow artifacts.

### Extending the workflow

**Add a new secret or environment variable:**

1. Add it to your local `env/.env.<env>` file (e.g., `env/.env.dev`).
2. Update the corresponding repository secret (e.g., `ENV_DEV`) with the full `.env` file content (see [Repository secrets setup](./githubActionsDispatch.md#repository-secrets)).

**Adjust timeout:**

Change `timeout-minutes` in the job (default: 60).

---

## Usage

### From GitHub UI

1. Open the **Actions** tab.
2. Select **Playwright Dispatch** workflow.
3. Click **Run workflow**.
4. Fill in:
   - `environment`: e.g., `dev`
   - `env_secret_name`: matching secret, e.g., `ENV_DEV`
   - `runner_args_json`: optional, e.g., `["--grep","@smoke"]`

### From test runner

```sh
yarn test dev --grep "@smoke" --github
yarn test dev --github
```

The test runner automatically resolves the secret name from the env name (`dev` → `ENV_DEV`) and dispatches the workflow.

---

## Reference

- [GitHub Docs: Manually triggering a workflow](https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow)
- [GitHub Docs: workflow_dispatch event](https://docs.github.com/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_dispatch)
- [GitHub Docs: Caching dependencies](https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows)
- [GitHub Actions Dispatch](./githubActionsDispatch.md) - setup and repository secrets configuration



