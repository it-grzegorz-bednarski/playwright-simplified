import { test, expect } from '@pom/theInternet/pageFixture';
import { INTERCEPTS } from '@data/intercepts';
import { waitForIntercept } from '@utils/waitForIntercept';

test.describe('functional - wait for intercept', { tag: ['@testBrand'] }, () => {
  test('should capture login page request on theInternet using intercept pattern', async ({
    loginPage,
    page,
  }) => {
    const requestPromise = waitForIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN);

    await loginPage.goto();

    const request = await requestPromise;
    await expect(request.url()).toContain('/login');
    await expect(request.method()).toBe('GET');
  });
});
