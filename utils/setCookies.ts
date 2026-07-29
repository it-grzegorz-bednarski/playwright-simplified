import { Page } from '@playwright/test';
import { COOKIES } from '@fixtures/cookies/cookies';

export type SetCookiesOptions = {
  /**
   * Placeholder replacements applied to all string fields of each cookie.
   * Keys are placeholder strings (e.g. `'#COOKIE_DOMAIN#'`), values are their resolved replacements.
   *
   * @example
   * { '#COOKIE_DOMAIN#': '.myDomain.com' }
   */
  replacements?: Record<string, string>;
};

function applyReplacements(value: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (result, [placeholder, replacement]) => result.replaceAll(placeholder, replacement),
    value
  );
}

/**
 * Injects predefined cookies into the current browser context.
 *
 * @remarks
 * - Cookie definitions live in `fixtures/cookies/cookies.ts` under the `COOKIES` object.
 * - Call this helper before `page.goto()` or `page.reload()` so cookies
 *   are applied before the request is made.
 * - Use `options.replacements` to substitute placeholders like `#COOKIE_DOMAIN#`.
 *
 * @param page - Playwright page instance
 * @param cookieKeys - Keys of cookies defined in the `COOKIES` object
 * @param options - Optional replacements for cookie field placeholders
 *
 * @example
 * await setCookies(page, ['OPTANON_ALERT_BOX_CLOSED'], {
 *   replacements: { '#COOKIE_DOMAIN#': '.myDomain.com' },
 * });
 * await page.goto('/');
 */
export async function setCookies(
  page: Page,
  cookieKeys: Array<keyof typeof COOKIES>,
  options: SetCookiesOptions = {}
) {
  const { replacements = {} } = options;
  const context = page.context();
  const cookieObjects = cookieKeys.map(key => {
    const cookie = { ...COOKIES[key] };
    if (Object.keys(replacements).length > 0) {
      return {
        ...cookie,
        name: applyReplacements(cookie.name, replacements),
        value: applyReplacements(cookie.value, replacements),
        domain: applyReplacements(cookie.domain, replacements),
        path: applyReplacements(cookie.path, replacements),
      };
    }
    return cookie;
  });
  await context.addCookies(cookieObjects);
}
