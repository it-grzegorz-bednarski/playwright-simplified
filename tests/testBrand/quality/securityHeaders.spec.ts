import { test } from '@pom/theInternet/pageFixture';
import { runSecurityHeadersCheck } from '@utils/securityHeaders/runSecurityHeadersCheck';

test.describe(
  'quality checks - security headers',
  { tag: ['@testBrand', '@securityHeaders', '@quality'] },
  () => {
    test('homePage - securityHeaders', async ({ homePage, page }) => {
      await homePage.goto();
      await runSecurityHeadersCheck(page);
    });

    test('largePage - securityHeaders', async ({ largePage, page }) => {
      await largePage.goto();
      await runSecurityHeadersCheck(page);
    });

    test('floatingMenuPage - securityHeaders', async ({ floatingMenuPage, page }) => {
      await floatingMenuPage.goto();
      await runSecurityHeadersCheck(page);
    });
  }
);
