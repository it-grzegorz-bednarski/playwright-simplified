import { test, expect, apiProfile } from '@utils/baseTest';

test.describe('api.project - singleLocale', { tag: ['@singleLocale', '@api'] }, () => {
  test.describe('practical usage: api fixture in singleLocale project', () => {
    apiProfile({ apiConfigKey: 'dummyjson.guest' });

    test('GET /products/1', async ({ api, localeKey, brand }) => {
      expect(brand).toBe('singlelocale');
      expect(localeKey).toBe('us');

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
