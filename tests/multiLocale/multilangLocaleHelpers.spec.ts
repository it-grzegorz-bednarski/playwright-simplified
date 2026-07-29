import { expect, test } from '@playwright/test';
import {
  interpolateLocaleTemplate,
  resolveByLocale,
  resolveLocaleScopedEnvValue,
} from '@utils/multilang';
import { createLocalePathHelper } from '@utils/multilang/pom';

test.describe('multiLocale - multilang locale helpers', { tag: '@multiLocale' }, () => {
  test('resolves the locale variant with fallback and default', () => {
    const variants = {
      pl: '/profil',
      default: '/profile',
    };

    expect(resolveByLocale(variants, 'pl')).toBe('/profil');
    expect(resolveByLocale(variants, 'uk', 'pl')).toBe('/profil');
    expect(resolveByLocale(variants, 'uk')).toBe('/profile');
  });

  test('interpolates template tokens', () => {
    const url = interpolateLocaleTemplate('/profil/${userId}?loc=${LOC}', {
      userId: '12345',
      LOC: 'pl',
    });

    expect(url).toBe('/profil/12345?loc=pl');
  });

  test('envByLocale-style resolution falls back to fallback locale and then base key', () => {
    const env = {
      USER_ID_PL: 'user-id-pl',
      USER_ID: 'user-id-base',
    } as NodeJS.ProcessEnv;

    expect(resolveLocaleScopedEnvValue('USER_ID', 'uk', env, { fallbackLocale: 'pl' })).toBe('user-id-pl');
    expect(resolveLocaleScopedEnvValue('USER_ID', 'uk', { USER_ID: 'user-id-base' })).toBe('user-id-base');
  });

  test('POM locale helper prefers base over fallback locale for URLs and selectors', () => {
    const helper = createLocalePathHelper({
      localeKey: 'ar',
      fallbackLocale: 'pl',
      envByLocale: () => 'user-id-ar',
    });

    expect(
      helper.pathByLocaleTemplate({
        base: '/profile?userId=${USER_ID}',
        pl: '/profil?plAddress=${USER_ID}',
      })
    ).toBe('/profile?userId=user-id-ar');

    expect(
      helper.valueByLocale({
        base: '[data-testid="username-input"]',
        pl: '[data-testid="nazwa-uzytkownika"]',
      })
    ).toBe('[data-testid="username-input"]');
  });
});




