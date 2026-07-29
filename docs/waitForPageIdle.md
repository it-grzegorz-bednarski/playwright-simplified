# Wait for Page Idle

← [Back to main documentation](../README.md)

## Overview

`waitForPageIdle` is a small helper that waits until the page is "quiet" from a network perspective before you interact with the UI (useful for dynamic pages, SPAs, lazy-loaded content, etc.).

---

## Configuration

Configuration lives in `config/feature-config/waitForPageIdle.config.ts`:

- **`usePlaywrightNetworkIdle`**:
  - `true` : first try `page.waitForLoadState('networkidle')` (10s timeout), then manual fallback
  - `false` : always use manual network monitoring
- **`idleThreshold`** : milliseconds of **no network activity** required to consider the page idle
- **`maxWaitTime`** : maximum total time to wait for idle (in milliseconds); logs a warning on timeout
- **`pollInterval`** : how often (in milliseconds) manual monitoring checks for recent network activity

Manual monitoring:

- Listens to `page.on('request')` and `page.on('response')`
- Tracks the timestamp of the last network activity
- Finishes when `idleThreshold` ms pass without any request/response (or when `maxWaitTime` is reached)

---

## Usage

```ts
import { waitForPageIdle } from '../utils/waitForPageIdle';

test('should interact with dynamically loaded content', async ({ page }) => {
  await page.goto('/complex-page');

  // Wait until the page is network-idle
  await waitForPageIdle(page);

  await page.locator('#dynamic-button').click();
});
```

Behavior:

- By default, uses Playwright `networkidle` first and falls back to manual monitoring (based on configuration)
- You can force manual-only mode with `usePlaywrightNetworkIdle: false`

---

## When to use

Use `waitForPageIdle` when:

- the page loads content dynamically after navigation,
- elements appear only after AJAX/API calls,
- `waitForLoadState('networkidle')` alone is not reliable enough for your app.
