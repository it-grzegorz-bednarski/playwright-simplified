import { test, expect } from '@utils/baseTest';

/**
 * Verifies that MULTILOCALE_FALLBACK_LOCALE works correctly.
 *
 * DE locale has no credentials in env - envByLocale('USER') and envByLocale('PASSWORD')
 * should transparently fall back to PL credentials (MULTILOCALE_FALLBACK_LOCALE=PL).
 */
test.describe('fallback locale credentials', { tag: ['@multiLocale'] }, () => {
  test(
    'DE locale resolves credentials from fallback locale (PL)',
    { tag: ['@de'] },
    async ({ envByLocale, localeKey }) => {
      expect(localeKey).toBe('de');

      // MULTILOCALE_USER_DE and MULTILOCALE_PASSWORD_DE are not defined in env.
      // Both should resolve via MULTILOCALE_FALLBACK_LOCALE=PL.
      const user = envByLocale('USER');
      const pass = envByLocale('PASSWORD');

      expect(user).toBe('demo_pl');
      expect(pass).toBe('secret_pl');
    }
  );
});
