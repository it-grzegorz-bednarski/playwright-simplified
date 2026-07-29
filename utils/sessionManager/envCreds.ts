export interface ResolvedCreds {
  username: string;
  password: string;
}

type ResolveCredsOptions = {
  env?: NodeJS.ProcessEnv;
  envByLocale?: (baseKey: string) => string;
};

function isProcessEnv(value: unknown): value is NodeJS.ProcessEnv {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    !('envByLocale' in (value as Record<string, unknown>)) &&
    !('env' in (value as Record<string, unknown>))
  );
}

function tryEnvByLocale(envByLocale: (baseKey: string) => string, key: string): string | undefined {
  try {
    const value = envByLocale(key)?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve credentials for the given `userKey` from environment variables.
 *
 * @param userKey - User identifier used as env var prefix (e.g. `ADMIN`, `TOM`).
 * @param optionsOrEnv - Either a raw env map or resolution options.
 * @param optionsOrEnv.env - Env map to read from (defaults to `process.env`).
 * @param optionsOrEnv.envByLocale - Optional locale resolver (e.g. baseTest `envByLocale`).
 * @returns Resolved username/password pair.
 *
 * @throws Error if username/password env vars are missing.
 *
 * @example
 * const { username, password } = resolveCreds('ADMIN');
 * // reads: ADMIN_USERNAME / ADMIN_PASSWORD
 */
export function resolveCreds(
  userKey: string,
  optionsOrEnv: ResolveCredsOptions | NodeJS.ProcessEnv = {}
): ResolvedCreds {
  const options: ResolveCredsOptions = isProcessEnv(optionsOrEnv)
    ? { env: optionsOrEnv }
    : optionsOrEnv;

  const env = options.env ?? process.env;
  const normalized = userKey.toUpperCase();
  const usernameKey = `${normalized}_USERNAME`;
  const passwordKey = `${normalized}_PASSWORD`;

  const username = options.envByLocale
    ? tryEnvByLocale(options.envByLocale, usernameKey) || env[usernameKey]
    : env[usernameKey];
  const password = options.envByLocale
    ? tryEnvByLocale(options.envByLocale, passwordKey) || env[passwordKey]
    : env[passwordKey];

  if (!username || !password) {
    throw new Error(
      `Missing credentials for user '${userKey}'. Expected env vars: ${usernameKey}, ${passwordKey}`
    );
  }

  return { username, password };
}
