import { test } from '@pom/theInternet/pageFixture';
import { runCspCheck } from '@utils/cspCheck/runCspCheck';

test.describe('quality checks - CSP', { tag: ['@testBrand', '@cspCheck', '@quality'] }, () => {
  test('homePage - cspCheck', async ({ homePage, page }) => {
    await homePage.goto();
    await runCspCheck(page);
  });

  test('iana - cspCheck', async ({ page }) => {
    await page.goto('https://www.iana.org/domains/reserved');
    await runCspCheck(page);
  });

  test('hackerNews - cspCheck', async ({ page }) => {
    await page.goto('https://news.ycombinator.com/');
    await runCspCheck(page);
  });
});
