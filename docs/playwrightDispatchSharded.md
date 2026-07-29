# Playwright Dispatch (Sharded)

← [Back to main documentation](../README.md)

## Overview

Sharded variant of **[Playwright Dispatch](./playwrightDispatch.md)** - runs the test suite in parallel across multiple runners, then merges the reports into one result. Triggered manually via **[workflow_dispatch](https://docs.github.com/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_dispatch)** from the GitHub UI, or automatically from `yarn test ... --github` when sharding is enabled in the test runner config.

---

## Configuration

Workflow file: `.github/workflows/playwright-dispatch-sharded.yml`

### Dispatch inputs

Pass these when triggering the workflow:

- **`environment`** - Environment name (e.g., `dev`, `qa`). Must match a secret `ENV_<UPPERCASE>`.
- **`env_secret_name`** - Repository secret name containing env file content (e.g., `ENV_DEV`).
- **`runner_args_json`** - JSON array of extra Playwright args (optional, e.g., `["--grep","@smoke"]`). Do not pass `--shard` here — it is added automatically from `shard_total`.
- **`shard_total`** - Number of parallel CI shards to run (optional, default: `1`).

From the test runner, shard count is not passed manually — it comes from `sharding.totalShards` in `config/testRunner.config.cjs`:

```js
module.exports = {
  // ...other settings...

  sharding: {
    totalShards: 4, // > 1 dispatches this workflow instead of playwright-dispatch.yml
  },
};
```

### Jobs

- **`prepare-shards`** - Builds the shard matrix (`shard_index`/`shard_total` pairs) from the `shard_total` input.
- **`run-tests`** - Runs the suite once per matrix entry (one runner per shard), passing `--shard <index>/<total>`. Uploads per-shard artifacts.
- **`merge-reports`** - Downloads shard artifacts, merges blob reports (`playwright merge-reports --config playwright.sharding.config.ts`) and quality reports (`utils/mergeQualityReports.ts`), generates PDFs, uploads the merged artifact.
- **`send-reports`** - Downloads the merged artifact and logs a pass/fail/flaky/skipped summary.

### Key features

- **Concurrency:** One run per environment at a time (shared with the non-sharded workflow). New dispatches cancel in-progress runs.
- **Parallel shards:** `fail-fast: false` — a failing shard does not cancel the others.
- **Report merging:** Blob reports are merged through `playwright.sharding.config.ts` so Slack/Teams reporters fire once for the full run, not per shard.
- **Caching & artifacts:** Same Yarn/Playwright caching as the non-sharded workflow; per-shard and merged artifacts are uploaded.

### Extending the workflow

**Add a new secret or environment variable:** add it to `env/.env.<env>` and update the matching repository secret (see [Repository secrets setup](./githubActionsDispatch.md#repository-secrets)).

**Change the default shard count:** update `sharding.totalShards` in `config/testRunner.config.cjs`, or override per-dispatch with the `shard_total` input (GitHub UI).

**Adjust timeout:** change `timeout-minutes` in the `run-tests` (default: 60), `merge-reports` (default: 30), or `send-reports` (default: 10) job.

---

## Usage

### From GitHub UI

1. Open the **Actions** tab.
2. Select **Playwright Dispatch - Sharded** workflow.
3. Click **Run workflow**.
4. Fill in:
   - `environment`: e.g., `dev`
   - `env_secret_name`: matching secret, e.g., `ENV_DEV`
   - `runner_args_json`: optional, e.g., `["--grep","@smoke"]`
   - `shard_total`: e.g., `4`

### From test runner

```sh
yarn test dev --grep "@smoke" --github
```

No extra flag needed — this workflow is dispatched automatically whenever `sharding.totalShards` (in `config/testRunner.config.cjs`) is greater than `1`.

---

## Reference

- [GitHub Docs: Manually triggering a workflow](https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow)
- [GitHub Docs: workflow_dispatch event](https://docs.github.com/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_dispatch)
- [GitHub Docs: Running variations of jobs in a workflow (matrix)](https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow)
- [Playwright Docs: Sharding tests between multiple machines](https://playwright.dev/docs/test-sharding)
- [Playwright Dispatch](./playwrightDispatch.md) - non-sharded workflow reference
- [GitHub Actions Dispatch](./githubActionsDispatch.md) - setup and repository secrets configuration











