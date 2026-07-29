import { test as base, expect } from '@playwright/test';
import { createMultilangFixtures, type MultilangFixtures } from './multilang/fixtures';
import {
  createSessionFixtures,
  type SessionFixtureOptions,
} from './sessionManager/sessionFixtures';
import type { BasicAuthProfile } from './basicAuth';
import type { UserSessionData } from './sessionManager';
import {
  createApiFixtures,
  type ApiFixtureOptions,
  apiProfile as applyApiProfile,
} from './apiTool/apiFixtures';
import type { ApiClient } from './apiTool/client';

type SessionFixtures = {
  sessionData: UserSessionData | undefined;
  sessionMeta: Record<string, string> | undefined;
};

type ApiFixtures = {
  apiConfig: import('./apiTool/types').ApiConfig;
  api: ApiClient;
};

type Options = SessionFixtureOptions & ApiFixtureOptions;

/**
 * Base test entry point with multilang and session support.
 *
 * - `envByLocale(key)` - resolves locale-scoped env values.
 * - `dataByLocale(source, key, fallback?)` - resolves locale-scoped data values.
 * - `localeKey` / `tenant` / `brand` - multilang metadata fixtures.
 * - `sessionData` / `sessionMeta` - loaded session (set via `session('USERKEY')`).
 * - `basicAuth` option - context-level HTTP Basic Auth (set via `basicAuth(...)`).
 * - `context` / `page` - session-aware if `userKey` is set.
 */
const test = base.extend<MultilangFixtures & SessionFixtures & ApiFixtures & Options>({
  // ---------------------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------------------
  ...createSessionFixtures({ defaultSessionLoginKey: 'default' }),

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------
  ...createApiFixtures({ defaultApiConfigKey: 'default' }),

  // ---------------------------------------------------------------------------
  // Multilang
  // ---------------------------------------------------------------------------
  ...createMultilangFixtures(),
});

export { test, expect };

export type SessionOptions = { sessionLoginKey?: string };
export type ApiProfileOptions = import('./apiTool/apiFixtures').ApiProfileOptions;
export type BasicAuthOptions = BasicAuthProfile;

/**
 * Shortcut for setting a session (authenticated user) in tests.
 *
 * @example
 * session('ADMIN');
 * test('example', async ({ page }) => { ... });
 *
 * @example
 * session('ADMIN', { sessionLoginKey: 'second' });
 */
export function session(userKey: string, opts?: SessionOptions) {
  test.use({ userKey, sessionLoginKey: opts?.sessionLoginKey });
}

/**
 * Shortcut for choosing API config/overrides in tests.
 *
 * @example
 * apiProfile({ apiConfigKey: 'dummyjson.guest' });
 */
export function apiProfile(opts: ApiProfileOptions) {
  applyApiProfile(test, opts);
}

/**
 * Shortcut for enabling context-level HTTP Basic Auth.
 *
 * @example
 * basicAuth(); // global BASICAUTH_USERNAME / BASICAUTH_PASSWORD
 * basicAuth('ADMIN'); // ADMIN_BASICAUTH_USERNAME / ADMIN_BASICAUTH_PASSWORD
 */
export function basicAuth(opts: BasicAuthOptions = true) {
  test.use({ basicAuth: opts });
}

