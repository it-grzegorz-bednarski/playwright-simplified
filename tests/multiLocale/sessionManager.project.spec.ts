import { test, expect, session } from '@utils/baseTest';
import { getSession } from '@utils/sessionManager';
import { readSession } from '@utils/sessionManager/fileSessionStore';

type LocaleExpectation = {
  localeKey: 'pl' | 'cs';
  scopeKey: string;
  apiUrl: string;
  username: string;
  password: string;
  token: string;
  tenant: string;
};

async function assertDummyjsonSessionForProject(
  args: {
    envByLocale: (baseKey: string) => string;
    localeKey: string;
    brand?: string;
    tenant: string;
  },
  testInfo: { parallelIndex: number },
  expected: {
    localeKey: 'pl' | 'cs';
    apiUrl: string;
    username: string;
    password: string;
    token: string;
    tenant: string;
  }
) {
  const { envByLocale, localeKey, brand, tenant } = args;

  expect(brand).toBe('multilocale');
  expect(localeKey).toBe(expected.localeKey);
  expect(tenant).toBe(expected.tenant);

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
      json: async () => ({ token: expected.token }),
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
      url: `${expected.apiUrl}/auth/login`,
      body: {
        username: expected.username,
        password: expected.password,
      },
    });

    expect(first.meta?.authHeader).toBe(`Bearer ${expected.token}`);
    expect(second.meta?.authHeader).toBe(`Bearer ${expected.token}`);
    expect(stored?.meta?.authHeader).toBe(`Bearer ${expected.token}`);
    expect(stored?.meta?.userKey).toBe('ADMIN');
    expect(stored?.storageState.cookies).toEqual([]);
  } finally {
    global.fetch = originalFetch;
  }
}

async function seedDummyjsonSessionFile(expected: LocaleExpectation) {
  const originalFetch = global.fetch;

  global.fetch = (async (_input: RequestInfo | URL, _init?: RequestInit) => {
    return {
      json: async () => ({ token: expected.token }),
    } as Response;
  }) as typeof fetch;

  try {
    await getSession('ADMIN', {
      sessionLoginKey: 'dummyjson',
      sessionScopeKey: expected.scopeKey,
      brand: 'multilocale',
      localeKey: expected.localeKey,
      tenant: expected.tenant,
      envByLocale: (baseKey: string) => {
        if (baseKey === 'API_URL') {
          return expected.apiUrl;
        }
        if (baseKey === 'ADMIN_USERNAME') {
          return expected.username;
        }
        if (baseKey === 'ADMIN_PASSWORD') {
          return expected.password;
        }
        throw new Error(`Missing key: ${baseKey}`);
      },
    });
  } finally {
    global.fetch = originalFetch;
  }
}

test.describe(
  'sessionManager - multiLocale project',
  { tag: ['@multiLocale', '@sessionManager'] },
  () => {
    test(
      'mechanism: multilocale-pl creates and reuses a scoped session with PL credentials',
      { tag: ['@pl'] },
      async ({ envByLocale, localeKey, brand, tenant }, testInfo) => {
        await assertDummyjsonSessionForProject(
          { envByLocale, localeKey, brand, tenant },
          testInfo,
          {
            localeKey: 'pl',
            apiUrl: 'https://pl.api.example.com',
            username: 'multi_admin_pl',
            password: 'multi_password_pl',
            token: 'multilocale-pl-token',
            tenant: 'pl_PL',
          }
        );
      }
    );

    test(
      'mechanism: multilocale-cs creates and reuses a scoped session with CS credentials',
      { tag: ['@cs'] },
      async ({ envByLocale, localeKey, brand, tenant }, testInfo) => {
        await assertDummyjsonSessionForProject(
          { envByLocale, localeKey, brand, tenant },
          testInfo,
          {
            localeKey: 'cs',
            apiUrl: 'https://cs.api.example.com',
            username: 'multi_admin_cs',
            password: 'multi_password_cs',
            token: 'multilocale-cs-token',
            tenant: 'cs_CZ',
          }
        );
      }
    );

    test.describe('practical usage: session fixture + sessionMeta', () => {
      test.beforeAll(async () => {
        await seedDummyjsonSessionFile({
          localeKey: 'pl',
          scopeKey: 'multilocale__pl',
          apiUrl: 'https://pl.api.example.com',
          username: 'multi_admin_pl',
          password: 'multi_password_pl',
          token: 'multilocale-pl-token',
          tenant: 'pl_PL',
        });

        await seedDummyjsonSessionFile({
          localeKey: 'cs',
          scopeKey: 'multilocale__cs',
          apiUrl: 'https://cs.api.example.com',
          username: 'multi_admin_cs',
          password: 'multi_password_cs',
          token: 'multilocale-cs-token',
          tenant: 'cs_CZ',
        });
      });

      session('ADMIN', { sessionLoginKey: 'dummyjson' });

      test(
        'reads already-created session data the easy way (PL)',
        { tag: ['@pl'] },
        async ({ sessionMeta, envByLocale, localeKey, brand, tenant }) => {
          expect(brand).toBe('multilocale');
          expect(localeKey).toBe('pl');
          expect(tenant).toBe('pl_PL');
          expect(envByLocale('ADMIN_USERNAME')).toBe('multi_admin_pl');
          expect(envByLocale('ADMIN_PASSWORD')).toBe('multi_password_pl');
          expect(sessionMeta?.userKey).toBe('ADMIN');
          expect(sessionMeta?.authHeader).toBe('Bearer multilocale-pl-token');
        }
      );

      test(
        'reads already-created session data the easy way (CS)',
        { tag: ['@cs'] },
        async ({ sessionMeta, envByLocale, localeKey, brand, tenant }) => {
          expect(brand).toBe('multilocale');
          expect(localeKey).toBe('cs');
          expect(tenant).toBe('cs_CZ');
          expect(envByLocale('ADMIN_USERNAME')).toBe('multi_admin_cs');
          expect(envByLocale('ADMIN_PASSWORD')).toBe('multi_password_cs');
          expect(sessionMeta?.userKey).toBe('ADMIN');
          expect(sessionMeta?.authHeader).toBe('Bearer multilocale-cs-token');
        }
      );
    });
  }
);
