import { test, expect } from '@utils/baseTest';

test.describe('multiLocale - multi locale', { tag: '@multiLocale' }, () => {
  test('homepage loads on all locales', { tag: '@smoke' }, async ({ page, envByLocale }) => {
    const baseUrl = envByLocale('BASE_URL');
    await page.goto(baseUrl || '/');

    await page.waitForLoadState('networkidle');
    expect(page).toBeTruthy();
  });

  test('locale-specific credentials', { tag: ['@pl', '@smoke'] }, async ({ envByLocale }) => {
    const user = envByLocale('USER');
    const pass = envByLocale('PASSWORD');
    const tenant = envByLocale('TENANT');

    expect(user).toBe('demo_pl');
    expect(pass).toBeTruthy();
    expect(tenant).toBe('pl_PL');
  });

  test(
    'slavic region login (PL & CS only)',
    { tag: ['@slavic', '@regression'] },
    async ({ envByLocale, localeKey }) => {
      const user = envByLocale('USER');

      expect(user).toBeTruthy();
      expect(['pl', 'cs']).toContain(localeKey);
    }
  );

  test('CS locale credentials and tenant', { tag: '@cs' }, async ({ envByLocale }) => {
    expect(envByLocale('USER')).toBe('demo_cs');
    expect(envByLocale('TENANT')).toBe('cs_CZ');
  });

  test('dataByLocale resolves product name with fallback to base key', async ({
    dataByLocale,
    localeKey,
  }) => {
    const product = {
      name_pl: 'Produkt 2',
      name_cs: 'Produkt 2 CZ',
      name: 'Product 2',
    };

    const name = dataByLocale(product, 'name', 'pl');

    expect(name).toBeTruthy();
    if (localeKey === 'cs') {
      expect(name).toBe('Produkt 2 CZ');
    }
  });

  test('routing visibility for @slavic', { tag: '@slavic' }, async ({ envByLocale }, testInfo) => {
    console.log(
      `[routing-check] test=@slavic project=${testInfo.project.name} tenant=${envByLocale('TENANT')}`
    );
  });

  test(
    'routing visibility for @slavic + @sanity',
    { tag: ['@slavic', '@sanity'] },
    async ({ envByLocale }, testInfo) => {
      console.log(
        `[routing-check] test=@slavic+@sanity project=${testInfo.project.name} tenant=${envByLocale('TENANT')}`
      );
    }
  );

  test('routing visibility without locale tag', async ({ envByLocale }, testInfo) => {
    console.log(
      `[routing-check] test=no-locale-tag project=${testInfo.project.name} tenant=${envByLocale('TENANT')}`
    );
  });

  test(
    'RTL region layout (AR only)',
    { tag: ['@rtl', '@ui'] },
    async ({ page, envByLocale, localeKey }) => {
      const baseUrl = envByLocale('BASE_URL');
      expect(['ar']).toContain(localeKey);

      await page.goto(baseUrl || '/');
      await page.waitForLoadState('networkidle');

      // RTL-specific assertions would go here
      expect(page).toBeTruthy();
    }
  );
});
