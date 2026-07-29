import { test, expect, apiProfile } from '@utils/baseTest';

test.describe('api.project - multiLocale', { tag: ['@multiLocale', '@api'] }, () => {
  // -------------------------------------------------------------------------
  // Mechanism: verify that envByLocale('API_URL') resolves to a locale-specific
  // API URL defined per locale in the .env file.
  // -------------------------------------------------------------------------
  test.describe('mechanism: locale-specific API URL resolution via envByLocale', () => {
    test(
      'multilocale-pl resolves MULTILOCALE_API_URL_PL',
      { tag: ['@pl'] },
      async ({ envByLocale, localeKey, brand }) => {
        expect(brand).toBe('multilocale');
        expect(localeKey).toBe('pl');

        const apiUrl = envByLocale('API_URL');
        expect(apiUrl).toBe('https://pl.api.example.com');
      }
    );

    test(
      'multilocale-cs resolves MULTILOCALE_API_URL_CS',
      { tag: ['@cs'] },
      async ({ envByLocale, localeKey, brand }) => {
        expect(brand).toBe('multilocale');
        expect(localeKey).toBe('cs');

        const apiUrl = envByLocale('API_URL');
        expect(apiUrl).toBe('https://cs.api.example.com');
      }
    );

    test(
      'multilocale-de falls back to MULTILOCALE_FALLBACK_LOCALE (PL) API URL',
      { tag: ['@de'] },
      async ({ envByLocale, localeKey, brand }) => {
        expect(brand).toBe('multilocale');
        expect(localeKey).toBe('de');

        // No MULTILOCALE_API_URL_DE defined -> falls back to MULTILOCALE_API_URL_PL
        const apiUrl = envByLocale('API_URL');
        expect(apiUrl).toBe('https://pl.api.example.com');
      }
    );
  });

  // -------------------------------------------------------------------------
  // Practical usage: api fixture works in a multiLocale project.
  // Uses the global API_URL (https://dummyjson.com) via apiConfig.
  // -------------------------------------------------------------------------
  test.describe('practical usage: api fixture in multiLocale project', () => {
    apiProfile({ apiConfigKey: 'dummyjson.guest' });

    test('GET /products/1 (multilocale context)', async ({ api, localeKey, brand }) => {
      expect(brand).toBe('multilocale');
      expect(localeKey).toBeTruthy();

      const res = await api.get('/products/1');

      await test.step('Assert status code', async () => {
        await res.expectStatus(200);
      });

      await test.step('Assert required JSON keys exist', async () => {
        await res.expectJsonKeys(['id', 'title', 'price', 'category']);
      });

      await test.step('Assert specific values', async () => {
        await res.expectJsonMatches({ id: 1, category: 'beauty' });
      });
    });

    test('GET /products (list)', async ({ api }) => {
      const res = await api.get('/products');

      await test.step('Assert status code', async () => {
        await res.expectStatus(200);
      });

      await test.step('Assert products array has at least 1 element', async () => {
        await res.expectArrayMinLength('products', 1);
      });
    });
  });
});
