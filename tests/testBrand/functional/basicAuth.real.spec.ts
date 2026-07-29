import { test } from '@pom/theInternet/pageFixture';

test.describe('functional - basic auth (real page)', { tag: ['@testBrand', '@basicAuth'] }, () => {

  test.use({ basicAuth: true });

  test('opens /basic_auth on the real site and validates successful authentication', async ({
    basicAuthPage,
  }) => {
    await basicAuthPage.goto();
    await basicAuthPage.assertBasicAuthSucceeded();
  });
});

