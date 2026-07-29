/**
 * Username/password pair used for HTTP Basic Auth.
 */
export type BasicAuthCreds = {
  username: string;
  password: string;
};

export type BasicAuthEnvByLocale = (baseKey: string) => string;

export type UseBasicAuthOptions = {
  userKey?: string;
  env?: NodeJS.ProcessEnv;
  envByLocale?: BasicAuthEnvByLocale;
};

/**
 * Basic Auth profile used by fixtures/context-level setup.
 *
 * - `true` -> enable and resolve credentials automatically
 * - `'ADMIN'` -> resolve per-user credentials for that key
 * - `{ ... }` -> explicit advanced options
 */
export type BasicAuthProfile = boolean | string | UseBasicAuthOptions;

function tryResolveByLocale(envByLocale: BasicAuthEnvByLocale, key: string): string | undefined {
  try {
    const value = envByLocale(key)?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve locale-aware per-user Basic Auth credentials.
 * Tries: `<USERKEY>_BASICAUTH_<BASE>` (locale-scoped), then fallback to global per-user pattern.
 */
function resolveLocalePerUserBasicAuth(
  userKey: string,
  envByLocale: BasicAuthEnvByLocale
): BasicAuthCreds {
  const normalized = userKey.toUpperCase();
  const usernameSuffixKey = `${normalized}_BASICAUTH_USERNAME`;
  const passwordSuffixKey = `${normalized}_BASICAUTH_PASSWORD`;

  const username =
    tryResolveByLocale(envByLocale, usernameSuffixKey) ||
    tryResolveByLocale(envByLocale, `${normalized}_BASIC_AUTH_USERNAME`);
  const password =
    tryResolveByLocale(envByLocale, passwordSuffixKey) ||
    tryResolveByLocale(envByLocale, `${normalized}_BASIC_AUTH_PASSWORD`);

  if (!username || !password) {
    throw new Error(
      `Missing locale-aware Basic Auth credentials for user '${userKey}'. Expected envByLocale keys: ${usernameSuffixKey}/${passwordSuffixKey} (or ${normalized}_BASIC_AUTH_USERNAME/${normalized}_BASIC_AUTH_PASSWORD).`
    );
  }

  return { username, password };
}

/**
 * Resolve global Basic Auth credentials from env vars.
 *
 * Expected env vars:
 * - `BASICAUTH_USERNAME`
 * - `BASICAUTH_PASSWORD`
 */
function resolveGlobalBasicAuth(env: NodeJS.ProcessEnv): BasicAuthCreds {
  const username = env.BASICAUTH_USERNAME;
  const password = env.BASICAUTH_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing global Basic Auth credentials. Expected env vars: BASICAUTH_USERNAME, BASICAUTH_PASSWORD'
    );
  }

  return { username, password };
}

/**
 * Resolve per-user Basic Auth credentials from env vars.
 *
 * Expected env vars:
 * - `${USERKEY}_BASICAUTH_USERNAME`
 * - `${USERKEY}_BASICAUTH_PASSWORD`
 */
function resolveUserBasicAuth(userKey: string, env: NodeJS.ProcessEnv): BasicAuthCreds {
  const normalized = userKey.toUpperCase();
  const usernameKey = `${normalized}_BASICAUTH_USERNAME`;
  const passwordKey = `${normalized}_BASICAUTH_PASSWORD`;

  const username = env[usernameKey];
  const password = env[passwordKey];

  if (!username || !password) {
    throw new Error(
      `Missing Basic Auth credentials for user '${userKey}'. Expected env vars: ${usernameKey}, ${passwordKey}`
    );
  }

  return { username, password };
}

/**
 * Resolve locale-aware Basic Auth credentials using the project's locale resolver.
 *
 * Supported base keys (in order):
 * - `BASICAUTH_USERNAME` / `BASICAUTH_PASSWORD`
 * - `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD`
 */
function resolveLocaleBasicAuth(envByLocale: BasicAuthEnvByLocale): BasicAuthCreds {
  const username =
    tryResolveByLocale(envByLocale, 'BASICAUTH_USERNAME') ||
    tryResolveByLocale(envByLocale, 'BASIC_AUTH_USERNAME');
  const password =
    tryResolveByLocale(envByLocale, 'BASICAUTH_PASSWORD') ||
    tryResolveByLocale(envByLocale, 'BASIC_AUTH_PASSWORD');

  if (!username || !password) {
    throw new Error(
      'Missing locale-aware Basic Auth credentials. Expected envByLocale keys: BASICAUTH_USERNAME/BASICAUTH_PASSWORD (or BASIC_AUTH_USERNAME/BASIC_AUTH_PASSWORD).'
    );
  }

  return { username, password };
}

/**
 * Resolves Basic Auth credentials without applying them to Playwright objects.
 */
export function resolveBasicAuthCredentials(
  userKeyOrOptions?: string | UseBasicAuthOptions,
  env: NodeJS.ProcessEnv = process.env
): BasicAuthCreds {
  const options: UseBasicAuthOptions =
    typeof userKeyOrOptions === 'string'
      ? { userKey: userKeyOrOptions, env }
      : { ...(userKeyOrOptions || {}), env: userKeyOrOptions?.env || env };

  return options.envByLocale && options.userKey
    ? resolveLocalePerUserBasicAuth(options.userKey, options.envByLocale)
    : options.envByLocale
      ? resolveLocaleBasicAuth(options.envByLocale)
      : options.userKey
        ? resolveUserBasicAuth(options.userKey, options.env || process.env)
        : resolveGlobalBasicAuth(options.env || process.env);
}

type ResolveBasicAuthProfileDefaults = {
  userKey?: string;
  envByLocale?: BasicAuthEnvByLocale;
  env?: NodeJS.ProcessEnv;
};

/**
 * Resolves Basic Auth credentials from a fixture profile for context-level `httpCredentials`.
 * Returns `undefined` when profile is disabled or omitted.
 */
export function resolveBasicAuthProfile(
  profile: BasicAuthProfile | undefined,
  defaults?: ResolveBasicAuthProfileDefaults
): BasicAuthCreds | undefined {
  if (!profile) {
    return undefined;
  }

  if (profile === true) {
    const autoOptions: UseBasicAuthOptions = {
      userKey: defaults?.userKey,
      envByLocale: defaults?.envByLocale,
      env: defaults?.env,
    };

    try {
      return resolveBasicAuthCredentials(autoOptions, defaults?.env || process.env);
    } catch {
      // If locale-scoped keys are missing, fall back to non-locale env credentials.
      return resolveBasicAuthCredentials(
        {
          userKey: defaults?.userKey,
          env: defaults?.env,
        },
        defaults?.env || process.env
      );
    }
  }

  if (typeof profile === 'string') {
    return resolveBasicAuthCredentials(profile, defaults?.env || process.env);
  }

  const hasExplicitEnv = typeof profile.env !== 'undefined';
  const mergedOptions: UseBasicAuthOptions = {
    userKey: profile.userKey || defaults?.userKey,
    // Explicit `env` in profile should take precedence over inherited locale resolver.
    envByLocale: profile.envByLocale || (hasExplicitEnv ? undefined : defaults?.envByLocale),
    env: profile.env || defaults?.env || process.env,
  };

  return resolveBasicAuthCredentials(mergedOptions, mergedOptions.env || process.env);
}

