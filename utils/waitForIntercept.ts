import { Page, Request } from '@playwright/test';

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

/**
 * Waits for a request whose URL matches the given pattern.
 * Pattern may be a wildcard string (`*` -> `.*`) or a `RegExp`.
 *
 * @param page Playwright `Page`
 * @param urlPattern URL pattern as wildcard string or `RegExp`
 * @param options Optional options (e.g. `timeout` in milliseconds)
 * @returns Matching `Request`
 */
export async function waitForIntercept(
  page: Page,
  urlPattern: string | RegExp,
  options?: { timeout?: number }
): Promise<Request> {
  const pattern = typeof urlPattern === 'string' ? wildcardToRegExp(urlPattern) : urlPattern;

  return page.waitForRequest(req => pattern.test(req.url()), {
    timeout: options?.timeout,
  });
}
