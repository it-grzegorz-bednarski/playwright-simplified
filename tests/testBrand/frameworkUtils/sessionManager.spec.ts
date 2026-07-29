import { expect, test } from '@playwright/test';
import { resolveCreds } from '@utils/sessionManager/envCreds';
import {
  readSession,
  writeSession,
  type StoredSession,
} from '@utils/sessionManager/fileSessionStore';
import { sessionLoginConfig as dummyjsonSessionLoginConfig } from '@config/sessionLogin.dummyjson';

test.describe(
  'sessionManager - multilang support',
  { tag: ['@testBrand', '@sessionManager'] },
  () => {
    test('env.dev provides single-locale ADMIN credentials via envByLocale', async () => {
      const creds = resolveCreds('ADMIN', {
        envByLocale: (baseKey: string) => {
          const envKey = `SINGLELOCALE_${baseKey}_US`;
          const value = process.env[envKey];
          if (!value) {
            throw new Error(`Missing key: ${envKey}`);
          }
          return value;
        },
      });

      expect(creds).toEqual({
        username: 'single_admin_us',
        password: 'single_password_us',
      });
    });

    test('env.dev provides multi-locale ADMIN credentials for PL and CS via envByLocale', async () => {
      const resolveForLocale = (localeKey: 'PL' | 'CS') =>
        resolveCreds('ADMIN', {
          envByLocale: (baseKey: string) => {
            const envKey = `MULTILOCALE_${baseKey}_${localeKey}`;
            const value = process.env[envKey];
            if (!value) {
              throw new Error(`Missing key: ${envKey}`);
            }
            return value;
          },
        });

      expect(resolveForLocale('PL')).toEqual({
        username: 'multi_admin_pl',
        password: 'multi_password_pl',
      });

      expect(resolveForLocale('CS')).toEqual({
        username: 'multi_admin_cs',
        password: 'multi_password_cs',
      });
    });

    test('single-locale credentials resolve from classic env keys', async () => {
      const creds = resolveCreds('ADMIN', {
        env: {
          ADMIN_USERNAME: 'single_admin',
          ADMIN_PASSWORD: 'single_password',
        },
      });

      expect(creds).toEqual({
        username: 'single_admin',
        password: 'single_password',
      });
    });

    test('multi-locale credentials resolve via envByLocale', async () => {
      const envByLocale = (baseKey: string) => {
        if (baseKey === 'ADMIN_USERNAME') {
          return 'pl_admin';
        }
        if (baseKey === 'ADMIN_PASSWORD') {
          return 'pl_password';
        }
        throw new Error(`Missing key: ${baseKey}`);
      };

      const creds = resolveCreds('ADMIN', {
        envByLocale,
        env: {},
      });

      expect(creds).toEqual({
        username: 'pl_admin',
        password: 'pl_password',
      });
    });

    test('session files are isolated by locale scope key', async () => {
      const uniqueUser = `ADMIN_${Date.now()}`;

      const sessionPl: StoredSession = {
        userKey: uniqueUser,
        storageState: { cookies: [{ name: 'locale', value: 'pl' }], origins: [] },
        meta: { locale: 'PL' },
      };

      const sessionCs: StoredSession = {
        userKey: uniqueUser,
        storageState: { cookies: [{ name: 'locale', value: 'cs' }], origins: [] },
        meta: { locale: 'CS' },
      };

      writeSession(sessionPl, 'multilocale__pl__default');
      writeSession(sessionCs, 'multilocale__cs__default');

      const loadedPl = readSession(uniqueUser, 'multilocale__pl__default');
      const loadedCs = readSession(uniqueUser, 'multilocale__cs__default');

      expect(loadedPl?.meta?.locale).toBe('PL');
      expect(loadedCs?.meta?.locale).toBe('CS');
    });

    test('dummyjson loginFlow uses envByLocale(API_URL) when provided', async () => {
      const originalFetch = global.fetch;
      let capturedUrl = '';

      global.fetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
        capturedUrl = String(input);
        return {
          json: async () => ({ token: 'token-123' }),
        } as Response;
      }) as typeof fetch;

      const savedMeta: Record<string, string> = {};

      try {
        await dummyjsonSessionLoginConfig.loginFlow({
          page: {} as any,
          userKey: 'ADMIN',
          resolveCreds: (userKey: string) => {
            expect(userKey).toBe('ADMIN');
            return { username: 'admin_pl', password: 'password_pl' };
          },
          resolveValue: (baseKey: string) => {
            expect(baseKey).toBe('API_URL');
            return 'https://pl.api.example.com';
          },
          saveMeta: (arg1: string | Record<string, string>, arg2?: string) => {
            if (typeof arg1 === 'string') {
              savedMeta[arg1] = arg2 ?? '';
              return;
            }
            Object.assign(savedMeta, arg1);
          },
        });
      } finally {
        global.fetch = originalFetch;
      }

      expect(capturedUrl).toContain('https://pl.api.example.com/auth/login');
      expect(savedMeta.authHeader).toBe('Bearer token-123');
    });
  }
);
