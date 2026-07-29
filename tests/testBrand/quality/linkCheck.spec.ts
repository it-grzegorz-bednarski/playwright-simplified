import { test } from '@pom/theInternet/pageFixture';
import { runLinkCheck } from '@utils/linkCheck/runLinkCheck';

test.describe(
  'quality checks - link check',
  { tag: ['@testBrand', '@linkCheck', '@quality'] },
  () => {
    test('homePage - linkCheck', async ({ homePage, page }) => {
      await homePage.goto();
      await runLinkCheck(page);
    });

    test('largePage - linkCheck', async ({ largePage, page }) => {
      await largePage.goto();
      await runLinkCheck(page);
    });

    test('floatingMenuPage - linkCheck', async ({ floatingMenuPage, page }) => {
      await floatingMenuPage.goto();
      await runLinkCheck(page);
    });
  }
);
