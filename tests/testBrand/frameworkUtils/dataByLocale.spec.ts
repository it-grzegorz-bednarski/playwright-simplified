import { expect, test } from '@playwright/test';
import { resolveDataByLocaleValue } from '@utils/multilang';

test.describe('dataByLocale resolver', { tag: '@testBrand' }, () => {
  test('resolves current locale value first', async () => {
    const product = {
      name_pl: 'Produkt 2',
      name_de: 'Produkt 2 DE',
      name: 'Product 2',
    };

    const value = resolveDataByLocaleValue(product, 'name', 'de');
    expect(value).toBe('Produkt 2 DE');
  });

  test('uses explicit fallback locale when current locale is missing', async () => {
    const product = {
      name_pl: 'Produkt 2',
      name: 'Product 2',
    };

    const value = resolveDataByLocaleValue(product, 'name', 'de', 'pl');
    expect(value).toBe('Produkt 2');
  });

  test('falls back to base key when locale entries are missing', async () => {
    const product = {
      name: 'Product 2',
    };

    const value = resolveDataByLocaleValue(product, 'name', 'de', 'pl');
    expect(value).toBe('Product 2');
  });

  test('throws clear error when key is missing for all candidates', async () => {
    expect(() => resolveDataByLocaleValue({}, 'name', 'de', 'pl')).toThrow(
      /Missing dataByLocale value/
    );
  });
});
