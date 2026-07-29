import { Page } from '@playwright/test';
import { COOKIES, COOKIE_SCENARIOS } from '@fixtures/cookies/cookies';
import { setCookies, type SetCookiesOptions } from './setCookies';

export type { SetCookiesOptions };

/**
 * Injects cookies for a predefined scenario from `COOKIE_SCENARIOS`.
 *
 * @param page - Playwright page instance
 * @param scenarioKey - Key of the scenario defined in `COOKIE_SCENARIOS`
 * @param options - Optional replacements for cookie field placeholders
 *
 * @example
 * import { setCookiesScenario } from '@utils/setCookiesScenario';
 *
 * await setCookiesScenario(page, 'closeCookiePrompt', {
 *   replacements: { '#COOKIE_DOMAIN#': '.myDomain.com' },
 * });
 */
export async function setCookiesScenario(
  page: Page,
  scenarioKey: keyof typeof COOKIE_SCENARIOS,
  options: SetCookiesOptions = {}
) {
  const cookieKeys = COOKIE_SCENARIOS[scenarioKey] as Array<keyof typeof COOKIES>;
  await setCookies(page, cookieKeys, options);
}
