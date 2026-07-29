# Visual Testing

← [Back to main documentation](../README.md)

## Overview

Visual regression tests in this repository are powered by [Percy](https://percy.io) on top of Playwright snapshots.

---

## Configuration

Percy is configured through `config/feature-config/percy.yml`.

**Example configuration:**

```yaml
version: 2
snapshot:
  widths:
    - 375
    - 768
    - 1024
    - 1440
  percy-css: |
    /* Hide dynamic elements that can change between runs */
    .ad-banner,
    #chat-widget,
    .timestamp {
      display: none !important;
      visibility: hidden !important;
    }
discovery:
  disable-cache: true
  network-idle-timeout: 250
```

**Configuration breakdown:**

- **`snapshot.widths`** – viewport widths for snapshot capture (mobile, tablet, desktop, wide desktop).
- **`snapshot.percy-css`** – CSS rules to hide dynamic elements (ads, timestamps, chat widgets) that would cause false visual diffs.
- **`discovery.disable-cache`** – ensures fresh snapshots on each run.
- **`discovery.network-idle-timeout`** – wait time (ms) for network to settle before capturing.

**Environment variables:**

- **`PERCY_TOKEN`** – Percy project token used for authentication. Get it from [Percy.io (project settings)](https://percy.io/).
- **`PERCY_BRANCH`** – branch name shown in Percy builds. Usually matches your feature/test branch.

These values should live in `env/.env.<env>` alongside the rest of the environment config. See **[Environments: Visual Testing (Percy)](./environments.md#visual-testing-percy)** for setup details.

---

## Usage

### Visual spec location

Suggested location for visual specs is `tests/<brandName>/visual/`.

Tag visual tests with `@visual` plus your project/brand tag (for example `@testBrand`).

The `percy` alias in `config/testRunner.config.cjs` expands to the `visual` run mode.
When this mode is selected, testRunner runs Playwright through `percy exec` with `--config config/feature-config/percy.yml`.

### Example spec

```ts
import { test } from '@pom/theInternet/pageFixture';
import percySnapshot from '@utils/percy';

test.describe('visual - <brandName>', { tag: ['@<brandName>', '@visual'] }, () => {
  test('homePage visual snapshot', async ({ homePage, page }) => {
    await homePage.goto();
    await percySnapshot(page, 'HomePage');
  });
});
```

### Running Percy

Use testRunner directly. It loads `env/.env.<env>` first and then starts Percy for visual mode.

```sh
yarn test dev percy
```

Windows PowerShell:

```powershell
$env:ENV='dev'
yarn test dev percy
```

If you prefer the raw run mode name, this is equivalent:

```sh
yarn test dev visual
```

You can narrow visual runs with additional filters. The runner still enforces `@visual` and then applies your extra grep options.

```sh
yarn test dev percy --grep "@smoke"
yarn test dev percy --grep-invert "@flaky"
```

### Important

- Percy reads `PERCY_TOKEN` before Playwright starts.
- testRunner loads `env/.env.<env>` first and then starts Percy with the same process environment.
- Visual tests should be run through dedicated run mode selection (`visual` / `percy`), optionally with additional grep filters.

---

## Notes

- The current visual workflow is intentionally simple: one dedicated visual spec, one tag (`@visual`), one project scope (`@testBrand`).
- UI mode is not used for Percy captures.
- For additional Percy configuration options, see the official [Percy docs](https://www.browserstack.com/docs/percy).
