import { Page } from '@playwright/test';
import { waitForPageIdleConfig } from '@config/feature-config/waitForPageIdle.config';

/**
 * Waits until the page has no network activity for a configured quiet period.
 * Can use Playwright's built-in `networkidle` or a manual fallback.
 *
 * @param page - The Playwright page object
 *
 * @example
 * await page.goto('/complex-page');
 * await waitForPageIdle(page);
 *
 * @remarks
 * - Behavior is controlled by `waitForPageIdleConfig.usePlaywrightNetworkIdle`
 * - If true -> tries Playwright's `waitForLoadState('networkidle')`
 * - If false -> always uses manual monitoring
 */
export async function waitForPageIdle(page: Page): Promise<void> {
  const { usePlaywrightNetworkIdle } = waitForPageIdleConfig;

  if (!usePlaywrightNetworkIdle) {
    await waitForManualNetworkIdle(page);
    return;
  }

  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {
    await waitForManualNetworkIdle(page);
  }
}

/**
 * Manually waits until the page has been quiet (no requests/responses) for a configured threshold.
 * Monitors network activity and resolves once the idle period is reached or a maximum timeout expires.
 *
 * @param page - The Playwright page object
 *
 * @remarks
 * - Idle threshold and polling interval are configurable
 * - Listeners are automatically cleaned up after completion
 * - Prevents infinite waiting by enforcing a maximum timeout
 */
async function waitForManualNetworkIdle(page: Page): Promise<void> {
  const { idleThreshold, maxWaitTime, pollInterval } = waitForPageIdleConfig;

  let lastRequestTime = Date.now();

  const requestListener = () => {
    lastRequestTime = Date.now();
  };

  const responseListener = () => {
    lastRequestTime = Date.now();
  };

  page.on('request', requestListener);
  page.on('response', responseListener);

  try {
    await Promise.race([
      (async () => {
        while (true) {
          await page.waitForTimeout(pollInterval);
          if (Date.now() - lastRequestTime > idleThreshold) {
            return;
          }
        }
      })(),

      page.waitForTimeout(maxWaitTime).then(() => {
        console.warn('waitForManualNetworkIdle: Maximum wait time exceeded');
      }),
    ]);
  } finally {
    page.off('request', requestListener);
    page.off('response', responseListener);
  }
}
