import { test, expect } from '@pom/theInternet/pageFixture';
import { replaceAttribute } from '@utils/replaceAttribute';

test.describe('functional - replace attribute', { tag: ['@testBrand'] }, () => {
  test('should replace link attribute value on theInternet page (before/after)', async ({
    homePage,
    page,
  }) => {
    await homePage.goto();

    await expect(homePage.footer.poweredByLink).toHaveAttribute(
      'href',
      'http://elementalselenium.com/'
    );

    await replaceAttribute(
      page,
      homePage.footer.poweredByLink,
      'href',
      'https://example.com/new-destination'
    );

    await expect(homePage.footer.poweredByLink).toHaveAttribute(
      'href',
      'https://example.com/new-destination'
    );
  });
});
