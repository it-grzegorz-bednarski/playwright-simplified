import { test, expect, session } from '@utils/baseTest';
import { getSession } from '@utils/sessionManager';
import { readSession } from '@utils/sessionManager/fileSessionStore';

async function seedDummyjsonSessionFile(sessionScopeKey: string, token: string) {
  const originalFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
    return {
      json: async () => ({ token }),
    } as Response;
  }) as typeof fetch;

  try {
    await getSession('ADMIN', {
      sessionLoginKey: 'dummyjson',
      sessionScopeKey,
      brand: 'singlelocale',
      localeKey: 'us',
      tenant: 'en_US',
      envByLocale: (baseKey: string) => {
        if (baseKey === 'API_URL') {
          return 'https://dummyjson.com';
        }
        if (baseKey === 'ADMIN_USERNAME') {
          return 'single_admin_us';
        }
        if (baseKey === 'ADMIN_PASSWORD') {
          return 'single_password_us';
        }
        throw new Error(`Missing key: ${baseKey}`);
      },
    });
  } finally {
    global.fetch = originalFetch;
  }
}

test.describe(
  'sessionManager - singleLocale project',
  { tag: ['@singleLocale', '@sessionManager'] },
  () => {
    test('mechanism: singlelocale-us creates and reuses a scoped session using project credentials', async ({
      envByLocale,
      localeKey,
      brand,
      tenant,
    }, testInfo) => {
      expect(brand).toBe('singlelocale');
      expect(localeKey).toBe('us');
      expect(tenant).toBe('en_US');

      const originalFetch = global.fetch;
      const capturedRequests: Array<{ url: string; body: Record<string, unknown> }> = [];
      const sessionScopeKey = `${brand}__${localeKey}__dummyjson-project-${Date.now()}-${testInfo.parallelIndex}`;

      global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        capturedRequests.push({
          url: String(input),
          body,
        });

        return {
          json: async () => ({ token: 'singlelocale-token' }),
        } as Response;
      }) as typeof fetch;

      try {
        const first = await getSession('ADMIN', {
          sessionLoginKey: 'dummyjson',
          sessionScopeKey,
          brand,
          localeKey,
          tenant,
          envByLocale,
        });

        const second = await getSession('ADMIN', {
          sessionLoginKey: 'dummyjson',
          sessionScopeKey,
          brand,
          localeKey,
          tenant,
          envByLocale,
        });

        const stored = readSession('ADMIN', 'dummyjson', sessionScopeKey);

        expect(capturedRequests).toHaveLength(1);
        expect(capturedRequests[0]).toEqual({
          url: 'https://dummyjson.com/auth/login',
          body: {
            username: 'single_admin_us',
            password: 'single_password_us',
          },
        });

        expect(first.meta?.authHeader).toBe('Bearer singlelocale-token');
        expect(second.meta?.authHeader).toBe('Bearer singlelocale-token');
        expect(stored?.meta?.authHeader).toBe('Bearer singlelocale-token');
        expect(stored?.meta?.userKey).toBe('ADMIN');
        expect(stored?.storageState.cookies).toEqual([]);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test.describe('practical usage: session fixture + sessionMeta', () => {
      test.beforeAll(async () => {
        await seedDummyjsonSessionFile('singlelocale__us', 'singlelocale-token');
      });

      session('ADMIN', { sessionLoginKey: 'dummyjson' });

      test('reads already-created session data the easy way', async ({
        sessionMeta,
        envByLocale,
        localeKey,
        brand,
        tenant,
      }) => {
        expect(brand).toBe('singlelocale');
        expect(localeKey).toBe('us');
        expect(tenant).toBe('en_US');

        expect(envByLocale('ADMIN_USERNAME')).toBe('single_admin_us');
        expect(envByLocale('ADMIN_PASSWORD')).toBe('single_password_us');

        expect(sessionMeta?.userKey).toBe('ADMIN');
        expect(sessionMeta?.authHeader).toBe('Bearer singlelocale-token');
      });
    });
  }
);
