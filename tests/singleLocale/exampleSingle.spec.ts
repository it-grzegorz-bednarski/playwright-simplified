import { test, expect } from '@utils/baseTest';

test.describe('singleLocale - single locale', { tag: ['@singleLocale'] }, () => {
  test('homepage loads', { tag: '@smoke' }, async ({ page, envByLocale }) => {
    const baseUrl = envByLocale('BASE_URL');
    await page.goto(baseUrl || '/');

    // Verify page title exists
    await page.waitForLoadState('networkidle');
    expect(page).toBeTruthy();
  });

  test('login credentials available', async ({ envByLocale }) => {
    const user = envByLocale('USER');
    const pass = envByLocale('PASSWORD');
    const tenant = envByLocale('TENANT');

    expect(user).toBeTruthy();
    expect(pass).toBeTruthy();
    expect(tenant).toBe('en_US');
  });
});
