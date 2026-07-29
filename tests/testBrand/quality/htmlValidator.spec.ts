import { test } from '@pom/theInternet/pageFixture';
import { runHtmlValidate } from '@utils/htmlValidator/runHtmlValidate';

test.describe(
  'quality checks - html validator',
  { tag: ['@testBrand', '@htmlValidator', '@quality'] },
  () => {
    test('homePage - htmlValidator', async ({ homePage, page }) => {
      await homePage.goto();
      await runHtmlValidate(page);
    });

    test('largePage - htmlValidator', async ({ largePage, page }) => {
      await largePage.goto();
      await runHtmlValidate(page);
    });

    test('floatingMenuPage - htmlValidator', async ({ floatingMenuPage, page }) => {
      await floatingMenuPage.goto();
      await runHtmlValidate(page);
    });
  }
);
