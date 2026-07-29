import { test } from '@pom/theInternet/pageFixture';
import { checkCookies } from '@utils/checkCookies';
import { setCookies } from '@utils/setCookies';

test.describe('functional - cookies', { tag: ['@testBrand', '@cookies'] }, () => {
  test('homepage cookies behavior', async ({ homePage, page }) => {
    await setCookies(page, ['TEST_COOKIE_A']);
    await homePage.goto();

    await checkCookies(page, 'test_cookie_a.json');
    await checkCookies(page, 'test_cookie_b.json', undefined, false);
  });

  test('cookie disclaimer component - inject accepted cookie', async ({ homePage }) => {
    await homePage.goto();
    await homePage.cookiePrompt.injectAcceptedCookie();
    // Cookie is now injected and ready for next navigation
  });

  test('cookie disclaimer component - click accept button (if visible)', async ({ homePage }) => {
    await homePage.goto();
    // Check if the cookie banner is visible before attempting to click
    const isVisible = await homePage.cookiePrompt.isVisible();
    if (isVisible) {
      await homePage.cookiePrompt.clickAcceptCookieButton();
    } else {
      // Banner not visible on this page - skip actual click and verify banner is not visible
      await homePage.cookiePrompt.assertNotVisible();
    }
  });
});
