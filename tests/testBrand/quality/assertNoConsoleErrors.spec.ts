import { test } from '@pom/theInternet/pageFixture';
import { assertNoConsoleErrors } from '@utils/assertNoConsoleErrors';

test.describe(
  'quality checks - assert no console errors',
  { tag: ['@testBrand', '@quality'] },
  () => {
    test('homePage - assertNoConsoleErrors', async ({ homePage, page }) => {
      await assertNoConsoleErrors(page, homePage);
    });

    test('largePage - assertNoConsoleErrors', async ({ largePage, page }) => {
      await assertNoConsoleErrors(page, largePage);
    });

    test('floatingMenuPage - assertNoConsoleErrors', async ({ floatingMenuPage, page }) => {
      await assertNoConsoleErrors(page, floatingMenuPage);
    });

    test('iana - assertNoConsoleErrors by URL fallback', async ({ page }) => {
      await assertNoConsoleErrors(page, 'https://www.iana.org/domains/reserved');
    });
  }
);
