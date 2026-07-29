import { test, expect } from '@pom/theInternet/pageFixture';
import { INTERCEPTS } from '@data/intercepts';
import { replaceIntercept } from '@utils/replaceIntercept';

test.describe('functional - replace intercept', { tag: ['@testBrand'] }, () => {
  test('should replace login page response with mocked fixture on theInternet', async ({
    loginPage,
    page,
  }) => {
    await replaceIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN, 'theInternetLogin.mock.json', {
      method: 'GET',
      statusCode: 200,
    });

    await loginPage.goto();

    await expect(page.locator('body')).toContainText('Mocked Login Content');
    await expect(page.locator('body')).not.toContainText('Login Page');
  });
});
