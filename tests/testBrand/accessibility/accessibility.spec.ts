import { test } from '@pom/theInternet/pageFixture';
import { runAccessibilityCheck } from '@utils/accessibility/runAccessibilityCheck';

test.describe('quality checks - accessibility', { tag: ['@testBrand', '@accessibility'] }, () => {
  test('homePage - accessibility', async ({ homePage, page }) => {
    await homePage.goto();
    await runAccessibilityCheck(page);
  });

  test('largePage - accessibility', async ({ largePage, page }) => {
    await largePage.goto();
    await runAccessibilityCheck(page);
  });

  test('floatingMenuPage - accessibility', async ({ floatingMenuPage, page }) => {
    await floatingMenuPage.goto();
    await runAccessibilityCheck(page);
  });
});
