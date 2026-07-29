# Tags and Routing

← [Back to main documentation](../README.md)

## Overview

Tags serve two distinct purposes:

1. **Routing tags** — control *which Playwright project* runs a test (locale, brand, group).
2. **Capability tags** — describe *what* a test does; used with `--grep` to select test subsets.

---

## Routing tags

Auto-generated from `env/.env.<env>` by `utils/projectsBuilder.ts`. You do **not** define them manually.

| Pattern | Example |
|---------|---------|
| `@<locale>` | `@pl`, `@de`, `@uk` |
| `@<brand>` | `@brandb`, `@brandc` |
| `@<group>` | `@slavic`, `@rtl` |

A test with **no routing tag** runs on every project. A test with `@pl` runs only on the `pl` project.

---

## Capability tags

Added manually by test authors. The tags below are **examples** — you can define your own.

| Tag | Meaning |
|-----|---------|
| `@p1`, `@p2`, `@p3` | Priority: critical / important / nice-to-have |
| `@smoke`, `@sanity`, `@regression` | Run scope |
| `@ui`, `@api`, `@visual`, `@accessibility` | Feature / domain |
| `@flaky` | Known unstable — exclude with `--grep-invert "@flaky"` |
| `@deprecated` | Excluded from all runs via `ignoredTags` |

`@p1/@p2/@p3` define priority only; they do **not** enforce execution order.

Tags marked as **separate run modes** (e.g. `@visual`, `@performanceTest`) are auto-excluded from shared runs.
→ See [Test Runner: Run modes](./testRunner.md#run-modes) and [separateRunModes / ignoredTags config](./testRunner.md#configuration).

---

## Tagging syntax

```ts
test('homepage loads', { tag: '@smoke' }, async ({ page }) => {
  await page.waitForLoadState('domcontentloaded');
});

test('PL checkout', { tag: ['@pl', '@smoke', '@p1'] }, async ({ page }) => {
  await page.waitForLoadState('domcontentloaded');
});

test('PL + CS checkout', { tag: ['@pl', '@cs', '@smoke'] }, async ({ page }) => {
  await page.waitForLoadState('domcontentloaded');
});

test.describe('Checkout suite', { tag: ['@ui', '@p2'] }, () => {
  test('checkout flow is available', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
  });
});
```

---

## Usage

```sh
# Run by capability tag
yarn test dev --grep "@smoke"
yarn test dev --grep "@p1"
yarn test dev --grep-invert "@flaky"

# Run multiple tags at once (OR)
yarn test dev --grep "@smoke|@sanity"
yarn test dev --grep "@p1|@p2"

# Run by routing tag (project)
yarn test dev --project brandb-pl
yarn test dev --grep "@slavic"

# Combine
yarn test dev --project brandb-pl --grep "@p1"
```

→ For aliases and reusable combinations see [Test Runner: Aliases](./testRunner.md#aliases).

---

## Routing examples

> Projects and groups below are **examples** from a sample `.env` setup.

| Test tags | Runs on |
|-----------|---------|
| _(none)_ | all projects |
| `@pl` | `pl` only |
| `@pl`, `@cs` | `pl`, `cs` (without group tag) |
| `@slavic` | `pl`, `cs` |
| `@slavic`, `@smoke` | `pl`, `cs` — `@smoke` available for `--grep` |

You can combine multiple locale tags on one test (for example `['@pl', '@cs']`) without defining a group.

