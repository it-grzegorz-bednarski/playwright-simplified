import { expect, test } from '@playwright/test';
import { resolveBasicAuthProfile } from '@utils/basicAuth';

test.describe('basicAuth profile resolver', { tag: ['@testBrand', '@sessionManager'] }, () => {
  test('resolves global credentials from env for profile=true', async () => {
    const creds = resolveBasicAuthProfile(true, {
      env: {
        BASICAUTH_USERNAME: 'globalUser',
        BASICAUTH_PASSWORD: 'globalPass',
      },
    });

    expect(creds).toEqual({ username: 'globalUser', password: 'globalPass' });
  });

  test('resolves per-user credentials when profile is a string userKey', async () => {
    const creds = resolveBasicAuthProfile('ADMIN', {
      env: {
        ADMIN_BASICAUTH_USERNAME: 'adminUser',
        ADMIN_BASICAUTH_PASSWORD: 'adminPass',
      },
    });

    expect(creds).toEqual({ username: 'adminUser', password: 'adminPass' });
  });

  test('resolves locale-aware credentials for profile=true', async () => {
    const creds = resolveBasicAuthProfile(true, {
      envByLocale: (baseKey: string) => {
        if (baseKey === 'BASICAUTH_USERNAME') return 'multiPlUser';
        if (baseKey === 'BASICAUTH_PASSWORD') return 'multiPlPass';
        throw new Error(`Missing key: ${baseKey}`);
      },
      env: {},
    });

    expect(creds).toEqual({ username: 'multiPlUser', password: 'multiPlPass' });
  });

  test('accepts BASIC_AUTH_* alias keys in envByLocale resolver', async () => {
    const creds = resolveBasicAuthProfile(true, {
      envByLocale: (baseKey: string) => {
        if (baseKey === 'BASIC_AUTH_USERNAME') return 'aliasUser';
        if (baseKey === 'BASIC_AUTH_PASSWORD') return 'aliasPass';
        throw new Error(`Missing key: ${baseKey}`);
      },
      env: {},
    });

    expect(creds).toEqual({ username: 'aliasUser', password: 'aliasPass' });
  });

  test('throws clear error when locale-aware credentials are missing', async () => {
    expect(() =>
      resolveBasicAuthProfile(
        { envByLocale: (_baseKey: string) => '' },
        {
          env: {},
        }
      )
    ).toThrow('Missing locale-aware Basic Auth credentials');
  });

  test('resolves locale-aware per-user credentials from envByLocale(USERKEY_BASICAUTH_*)', async () => {
    const creds = resolveBasicAuthProfile(
      { userKey: 'ADMIN' },
      {
        envByLocale: (baseKey: string) => {
          if (baseKey === 'ADMIN_BASICAUTH_USERNAME') return 'admin_locale_user';
          if (baseKey === 'ADMIN_BASICAUTH_PASSWORD') return 'admin_locale_pass';
          throw new Error(`Missing key: ${baseKey}`);
        },
        env: {},
      }
    );

    expect(creds).toEqual({ username: 'admin_locale_user', password: 'admin_locale_pass' });
  });

  test('throws clear error when locale-aware per-user credentials are missing', async () => {
    expect(() =>
      resolveBasicAuthProfile(
        { userKey: 'ADMIN', envByLocale: (_baseKey: string) => '' },
        {
          env: {},
        }
      )
    ).toThrow('Missing locale-aware Basic Auth credentials for user');
  });

  test('profile=true falls back to plain env credentials when locale keys are missing', async () => {
    const creds = resolveBasicAuthProfile(true, {
      userKey: 'ADMIN',
      env: {
        ADMIN_BASICAUTH_USERNAME: 'adminUser',
        ADMIN_BASICAUTH_PASSWORD: 'adminPass',
      },
    });

    expect(creds).toEqual({ username: 'adminUser', password: 'adminPass' });
  });

  test('resolveBasicAuthProfile with explicit env credentials resolves from provided env', async () => {
    const creds = resolveBasicAuthProfile({
      userKey: 'ADMIN',
      env: {
        ADMIN_BASICAUTH_USERNAME: 'envUser',
        ADMIN_BASICAUTH_PASSWORD: 'envPass',
      },
    });

    expect(creds).toEqual({ username: 'envUser', password: 'envPass' });
  });
});
