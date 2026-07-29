import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import { getSession, type UserSessionData } from './index';
import { resolveMultilangRuntimeContext } from '@utils/multilang/runtime';
import { type BasicAuthProfile, resolveBasicAuthProfile } from '@utils/basicAuth';

export type SessionFixtureOptions = {
  /**
   * Optional user key used to create an authenticated browser context for this test.
   * Set via: `test.use({ userKey: 'ADMIN' })`.
   */
  userKey?: string;

  /**
   * Which session login config to use.
   * Loaded automatically by convention from: `config/sessionLogin.<sessionLoginKey>.ts`.
   */
  sessionLoginKey?: string;

  /**
   * Optional HTTP Basic Auth profile applied as Playwright `httpCredentials` on the test context.
   */
  basicAuth?: BasicAuthProfile;
};

function buildSessionScope(testInfo: TestInfo) {
  const runtime = resolveMultilangRuntimeContext(testInfo);

  return {
    brand: runtime.brand,
    localeKey: runtime.localeKey,
    tenant: runtime.tenant,
    envByLocale: runtime.envByLocale,
    sessionScopeKey: runtime.sessionScopeKey,
  };
}

/**
 * Creates Playwright fixtures that support reusable sessions.
 *
 * What it provides:
 * - `sessionData` / `sessionMeta` - loaded session info (or `undefined` if `userKey` is not set)
 * - `context` / `page` - created using `storageState` from the session (if `userKey` is set)
 *
 * @param opts - Optional defaults for this fixture bundle.
 * @param opts.defaultSessionLoginKey - Default `sessionLoginKey` if the test doesn't override it.
 * @returns Fixture object meant to be spread into `base.extend(...)`.
 *
 * @example
 * const test = base.extend<Fixtures & SessionFixtureOptions>({
 *   ...createSessionFixtures({ defaultSessionLoginKey: 'default' }),
 *   // ...your POM fixtures...
 * });
 */
export function createSessionFixtures(opts?: { defaultSessionLoginKey?: string }) {
  const defaultSessionLoginKey = opts?.defaultSessionLoginKey ?? 'default';

  const userKeyOption: [string | undefined, { option: true }] = [undefined, { option: true }];
  const sessionLoginKeyOption: [string, { option: true }] = [
    defaultSessionLoginKey,
    { option: true },
  ];
  const basicAuthOption: [BasicAuthProfile | undefined, { option: true }] = [undefined, { option: true }];

  return {
    userKey: userKeyOption,
    sessionLoginKey: sessionLoginKeyOption,
    basicAuth: basicAuthOption,

    /**
     * Loads session data for the selected `userKey` (if set) and exposes it as a fixture.
     * If `userKey` is not set, exposes `undefined`.
     */
    sessionData: async (
      {
        userKey,
        sessionLoginKey,
        basicAuth,
      }: { userKey?: string; sessionLoginKey?: string; basicAuth?: BasicAuthProfile },
      use: (session: UserSessionData | undefined) => Promise<void>,
      testInfo: TestInfo
    ) => {
      if (!userKey) {
        await use(undefined);
        return;
      }

      const loginKey = sessionLoginKey ?? defaultSessionLoginKey;
      const scope = buildSessionScope(testInfo);
      const sessionOptions = {
        sessionLoginKey: loginKey,
        sessionScopeKey: scope.sessionScopeKey,
        localeKey: scope.localeKey,
        brand: scope.brand,
        tenant: scope.tenant,
        envByLocale: scope.envByLocale,
        basicAuth,
      } as unknown as Parameters<typeof getSession>[1];
      const session = await getSession(userKey, sessionOptions);
      await use(session);
    },

    /**
     * Convenience fixture that exposes `sessionData.meta` directly.
     */
    sessionMeta: async (
      { sessionData }: { sessionData?: UserSessionData },
      use: (meta: Record<string, string> | undefined) => Promise<void>
    ) => {
      await use(sessionData?.meta);
    },

    /**
     * Playwright `context` fixture.
     *
     * If `userKey` is set, the context is created with `storageState` loaded from the session.
     * Otherwise, a normal fresh context is created.
     */
    context: async (
      {
        browser,
        userKey,
        sessionLoginKey,
        basicAuth,
      }: {
        browser: Browser;
        userKey?: string;
        sessionLoginKey?: string;
        basicAuth?: BasicAuthProfile;
      },
      use: (context: BrowserContext) => Promise<void>,
      testInfo: TestInfo
    ) => {
      const loginKey = sessionLoginKey ?? defaultSessionLoginKey;
      const scope = buildSessionScope(testInfo);
      const sessionOptions = {
        sessionLoginKey: loginKey,
        sessionScopeKey: scope.sessionScopeKey,
        localeKey: scope.localeKey,
        brand: scope.brand,
        tenant: scope.tenant,
        envByLocale: scope.envByLocale,
        basicAuth,
      } as unknown as Parameters<typeof getSession>[1];
      const storageState = userKey
        ? (await getSession(userKey, sessionOptions)).storageState
        : undefined;
      const httpCredentials = resolveBasicAuthProfile(basicAuth, {
        userKey,
        envByLocale: scope.envByLocale,
      });
      const context = await browser.newContext({ storageState, httpCredentials });
      await use(context);
      await context.close();
    },

    /**
     * Playwright `page` fixture created from the (possibly session-aware) context.
     */
    page: async ({ context }: { context: BrowserContext }, use: (page: Page) => Promise<void>) => {
      const page = await context.newPage();
      await use(page);
      await page.close();
    },
  };
}

// Mark export as used when loaded/spread dynamically.
void createSessionFixtures;
