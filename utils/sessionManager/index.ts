import { chromium, BrowserContext, Page } from '@playwright/test';
import {
  readSession,
  writeSession,
  tryCreateLock,
  removeLock,
  waitForSessionOrLockRelease,
  StoredSession,
} from './fileSessionStore';
import { resolveCreds } from './envCreds';
import { SessionLoginConfig } from './loginTypes';
import { loadSessionLoginConfig } from './loginConfigLoader';
import { type BasicAuthProfile, resolveBasicAuthProfile } from '@utils/basicAuth';

export interface UserSessionData extends StoredSession {}

export type SessionManagerOptions = {
  /** Which login flow to use when creating the session. Loaded from `config/sessionLogin.<key>.ts`. */
  sessionLoginKey?: string;
  /** Optional session scope key used to isolate sessions across brand/locale projects. */
  sessionScopeKey?: string;
  /** Optional project metadata and env resolver passed into loginFlow. */
  localeKey?: string;
  brand?: string;
  tenant?: string;
  envByLocale?: (baseKey: string) => string;
  /** Optional context-level Basic Auth profile (`httpCredentials`). */
  basicAuth?: BasicAuthProfile;
  [key: string]: unknown;
};

function buildScopedLoginKey(
  sessionLoginKey?: string,
  sessionScopeKey?: string
): string | undefined {
  if (!sessionScopeKey) {
    return sessionLoginKey;
  }
  return sessionLoginKey ? `${sessionScopeKey}__${sessionLoginKey}` : sessionScopeKey;
}

/**
 * Dumps sessionStorage from the first page in the browser context.
 *
 * Used to persist sessionStorage into the session file (optional feature).
 */
async function dumpSessionStorage(context: BrowserContext) {
  const pages = context.pages();
  const mainPage = pages[0];
  if (!mainPage) return [];

  try {
    const url = mainPage.url();
    if (!url || url === 'about:blank') return [];
    const origin = new URL(url).origin;
    const items = await mainPage.evaluate(() =>
      Object.entries(sessionStorage).map(([name, value]) => ({ name, value }))
    );
    return [{ origin, items }];
  } catch {
    return [];
  }
}

/**
 * Dumps localStorage from the first page in the browser context.
 *
 * Used to persist localStorage into the session file (optional feature).
 */
async function dumpLocalStorage(context: BrowserContext) {
  const pages = context.pages();
  const mainPage = pages[0];
  if (!mainPage) return [];

  try {
    const url = mainPage.url();
    if (!url || url === 'about:blank') return [];
    const origin = new URL(url).origin;
    const items = await mainPage.evaluate(() =>
      Object.entries(localStorage).map(([name, value]) => ({ name, value }))
    );
    return [{ origin, items }];
  } catch {
    return [];
  }
}

/**
 * Creates a new session by running the configured `loginFlow` and persisting browser state.
 *
 * Notes:
 * - always validates that env creds for `userKey` exist
 * - applies flags from `SessionLoginConfig` (saveCookies/saveLocalStorage/saveSessionStorage)
 */
async function createSessionForUserKey(
  userKey: string,
  options?: SessionManagerOptions
): Promise<UserSessionData> {
  const config: SessionLoginConfig = await loadSessionLoginConfig(options?.sessionLoginKey);

  const resolveLoginCreds = (loginUserKey: string) =>
    resolveCreds(loginUserKey, { envByLocale: options?.envByLocale });

  const resolveLoginValue = (baseKey: string) => {
    const normalized = baseKey.trim().toUpperCase();

    if (options?.envByLocale) {
      try {
        const value = options.envByLocale(baseKey)?.trim();
        if (value) {
          return value;
        }
      } catch {
        // fall through to env fallback
      }
    }

    const fallback = process.env[normalized]?.trim();
    if (fallback) {
      return fallback;
    }

    throw new Error(
      `[sessionManager] Missing value for key '${baseKey}'. Expected locale resolver or env var '${normalized}'.`
    );
  };

  const browser = await chromium.launch();
  const httpCredentials = resolveBasicAuthProfile(options?.basicAuth, {
    userKey,
    envByLocale: options?.envByLocale,
  });
  const context = await browser.newContext({ httpCredentials });
  const page = await context.newPage();

  const meta: Record<string, string> = {};

  await config.loginFlow({
    page,
    userKey,
    localeKey: options?.localeKey,
    brand: options?.brand,
    tenant: options?.tenant,
    envByLocale: options?.envByLocale,
    resolveCreds: resolveLoginCreds,
    resolveValue: resolveLoginValue,
    saveMeta: (arg1: string | Record<string, string>, arg2?: string) => {
      if (typeof arg1 === 'string') {
        meta[arg1] = arg2 ?? '';
        return;
      }

      for (const [k, v] of Object.entries(arg1)) {
        meta[k] = v;
      }
    },
  });

  let storageState = await context.storageState();

  if (config.saveCookies === false) {
    storageState = { ...storageState, cookies: [] };
  }

  const sessionStorage =
    config.saveSessionStorage !== false ? await dumpSessionStorage(context) : [];
  const localStorage = config.saveLocalStorage !== false ? await dumpLocalStorage(context) : [];

  await context.close();
  await browser.close();

  return {
    userKey,
    storageState,
    meta,
    sessionStorage,
    localStorage,
  };
}

/**
 * Get (or create) a stored session for a given `userKey`.
 *
 * Behavior:
 * - if session exists on disk → reuse
 * - otherwise one worker creates it under a file-lock, others wait
 *
 * @param userKey - User identifier used to resolve credentials (e.g. `ADMIN`, `TOM`).
 * @param options - Optional session options.
 * @param options.sessionLoginKey - Optional login config key (`config/sessionLogin.<key>.ts`).
 * @param options.sessionScopeKey - Optional scope key to isolate sessions across brand/locale projects.
 * @returns Session data loaded from disk.
 *
 * @example
 * const session = await getSession('ADMIN');
 * console.log(session.meta);
 */
export async function getSession(
  userKey: string,
  options?: SessionManagerOptions
): Promise<UserSessionData> {
  const loginKey = options?.sessionLoginKey;
  const scopeKey = options?.sessionScopeKey;
  const scopedLoginKey = buildScopedLoginKey(loginKey, scopeKey);

  const existing = readSession(userKey, scopedLoginKey);
  if (existing) {
    return existing;
  }

  if (tryCreateLock(userKey, scopedLoginKey)) {
    try {
      const created = await createSessionForUserKey(userKey, options);
      writeSession(created, scopedLoginKey);
      return created;
    } finally {
      removeLock(userKey, scopedLoginKey);
    }
  }

  await waitForSessionOrLockRelease(userKey, scopedLoginKey);

  const afterWait = readSession(userKey, scopedLoginKey);
  if (!afterWait) {
    throw new Error(`Session for userKey '${userKey}' not created after waiting.`);
  }
  return afterWait;
}

/**
 * Creates a new Playwright context using `storageState` from the stored session.
 *
 * @param userKey - User identifier used to resolve credentials.
 * @param options - Optional session options.
 */
export async function createContextWithSession(
  userKey: string,
  options?: SessionManagerOptions
): Promise<{ context: BrowserContext; session: UserSessionData }> {
  const session = await getSession(userKey, options);
  const browser = await chromium.launch();
  const httpCredentials = resolveBasicAuthProfile(options?.basicAuth, {
    userKey,
    envByLocale: options?.envByLocale,
  });
  const context = await browser.newContext({ storageState: session.storageState, httpCredentials });

  return { context, session };
}

/**
 * Convenience helper that opens a Page inside a session-aware context.
 *
 * @param userKey - User identifier used to resolve credentials.
 * @param options - Optional session options.
 * @returns Page + context + session + close function.
 *
 * @example
 * const { page, closeSession } = await openSession('ADMIN');
 * await page.goto('https://example.com');
 * await closeSession();
 */
export async function openSession(
  userKey: string,
  options?: SessionManagerOptions
): Promise<{
  page: Page;
  session: UserSessionData;
  context: BrowserContext;
  closeSession: () => Promise<void>;
}> {
  const { context, session } = await createContextWithSession(userKey, options);
  const page = await context.newPage();

  const closeSession = async () => {
    await context.close();
  };

  return { page, session, context, closeSession };
}

// Mark export as used when loaded dynamically.
void openSession;
