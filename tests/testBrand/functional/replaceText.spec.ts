import { test, expect } from '@pom/theInternet/pageFixture';
import replaceText from '@utils/replaceText';

test.describe('functional - replace text', { tag: ['@testBrand'] }, () => {
  test('should replace text content for matched elements (before/after)', async ({
    homePage,
    page,
  }) => {
    await homePage.goto();

    await expect(page.locator('h1.heading')).toHaveText('Welcome to the-internet');

    await replaceText(page, 'h1.heading', 'Updated heading');

    await expect(page.locator('h1.heading')).toHaveText('Updated heading');
  });
});
