import { Page, expect, test as pwt } from '@playwright/test';
import { loadFixtureWithReplacements } from './fixtures';
import { checkCookieConfig } from '@config/feature-config/checkCookieConfig';

/**
 * Compares a browser cookie with a fixture-defined cookie.
 * Only fields defined in the fixture will be checked.
 *
 * @param page - Playwright Page object
 * @param fixtureName - File name of the JSON file located in `data/cookies` (e.g. `cookie_a.json`)
 * @param replacements - Optional placeholder-value map for dynamic substitution
 * @param shouldExist - When true (default), asserts that the cookie exists and matches the expected file.
 *                      When false, asserts that the cookie does NOT exist in the browser context.
 *
 * @example
 * import { checkCookies } from '@utils/checkCookies';
 *
 * await checkCookies(page, 'cookie_a.json');
 * await checkCookies(page, 'cookie_a.json', {}, false); // asserts it does NOT exist
 */
export async function checkCookies(
  page: Page,
  fixtureName: string,
  replacements?: Record<string, string | number>,
  shouldExist: boolean = true
) {
  const fixturePath = `data/cookies/${fixtureName}`;
  const cookieFixture = loadFixtureWithReplacements(fixturePath, replacements);

  const cookieKey = Object.keys(cookieFixture)[0];
  const expected = cookieFixture[cookieKey];
  const stepLabel = shouldExist
    ? `Check cookie exists: ${expected.name} (${fixtureName})`
    : `Check cookie does NOT exist: ${expected.name} (${fixtureName})`;

  await pwt.step(stepLabel, async () => {
    const context = page.context();
    const actualCookies = await context.cookies();
    const actual = actualCookies.find(c => c.name === expected.name);
    const debugMode = checkCookieConfig.debugCookies;

    const formattedCookies = actualCookies.map(c => `- ${c.name}: ${JSON.stringify(c)}`).join('\n');

    const logDebug = (lines: string[], forceOnFail: boolean = false) => {
      if (debugMode === 'never') return;
      if (debugMode === 'ifFail' && !forceOnFail) return;

      console.log(`[Cookies] ${stepLabel}`);
      for (const line of lines) console.log(line);
    };

    const expectedBlock =
      `===== [Cookies] Expected (from file ${fixtureName}) =====\n` +
      `${JSON.stringify(expected, null, 2)}`;

    const currentBlock =
      `===== [Cookies] Current cookies =====\n` + (formattedCookies || '<no cookies>');

    if (!shouldExist) {
      if (actual) {
        logDebug(
          [
            expectedBlock,
            currentBlock,
            `===== [Cookies] Result =====\n❌ Cookie "${expected.name}" WAS FOUND but should NOT exist.\nActual value:\n${JSON.stringify(
              actual,
              null,
              2
            )}`,
          ],
          true
        );

        throw new Error(
          `❌ Cookie "${expected.name}" was found in browser context, but it should NOT exist.\n` +
            `File: ${fixtureName}\n` +
            `Actual value: ${JSON.stringify(actual, null, 2)}`
        );
      }

      logDebug([
        expectedBlock,
        currentBlock,
        `===== [Cookies] Result =====\n✅ Cookie "${expected.name}" is not present in browser context as expected.`,
      ]);
      return;
    }

    if (!actual) {
      logDebug(
        [
          expectedBlock,
          currentBlock,
          `===== [Cookies] Result =====\n❌ Cookie "${expected.name}" NOT FOUND but it SHOULD exist.`,
        ],
        true
      );

      throw new Error(
        `❌ Cookie "${expected.name}" not found in browser context.\n` +
          `File: ${fixtureName}\n` +
          `Expected value: ${expected.value}\n\n` +
          `Available cookies:\n${formattedCookies}`
      );
    }

    logDebug([
      expectedBlock,
      currentBlock,
      `===== [Cookies] Result =====\n✅ Cookie "${expected.name}" found.\nActual value:\n${JSON.stringify(
        actual,
        null,
        2
      )}`,
    ]);

    for (const key in expected) {
      expect(actual?.[key as keyof typeof actual]).toBe(expected[key]);
    }
  });
}
