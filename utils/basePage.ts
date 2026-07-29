export type ResolveBaseUrlOptions = {
  baseUrl?: string;
  env?: NodeJS.ProcessEnv;
  envByLocale?: (baseKey: string) => string;
  envKey?: string;
  preferBaseUrl?: boolean;
};

function readTrimmedValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveHostname(baseUrl: string): string {
  const normalized = baseUrl.trim();
  if (!normalized) {
    return '';
  }

  const candidates = normalized.includes('://')
    ? [normalized]
    : [`https://${normalized}`, `http://${normalized}`];

  for (const candidate of candidates) {
    try {
      return new URL(candidate).hostname.replace(/^\./, '');
    } catch {
      // try next candidate
    }
  }

  return normalized
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^\./, '');
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  );
}

// Public helper used by domain BasePage classes.
export function resolveBaseUrl(options: ResolveBaseUrlOptions = {}): string {
  const {
    baseUrl = '',
    env = process.env,
    envByLocale,
    envKey = 'BASE_URL',
    preferBaseUrl = false,
  } = options;

  const explicitBaseUrl = readTrimmedValue(baseUrl);
  if (preferBaseUrl && explicitBaseUrl) {
    return explicitBaseUrl;
  }

  if (envByLocale) {
    try {
      const localeValue = readTrimmedValue(envByLocale(envKey));
      if (localeValue) {
        return localeValue;
      }
    } catch {
      // Fall back to process env / default base URL.
    }
  }

  return readTrimmedValue(env?.[envKey]) ?? explicitBaseUrl ?? '';
}

// Public helper used by domain BasePage classes.
export function buildFullPageUrl(baseUrl: string, pageUrl: string): string {
  const normalizedBaseUrl = baseUrl.trim();
  const normalizedPageUrl = pageUrl.trim();

  if (!normalizedBaseUrl) {
    return normalizedPageUrl;
  }

  if (!normalizedPageUrl) {
    return normalizedBaseUrl;
  }

  const cleanBaseUrl = normalizedBaseUrl.endsWith('/')
    ? normalizedBaseUrl.slice(0, -1)
    : normalizedBaseUrl;
  const cleanPageUrl = normalizedPageUrl.startsWith('/')
    ? normalizedPageUrl
    : `/${normalizedPageUrl}`;

  return `${cleanBaseUrl}${cleanPageUrl}`;
}

// Public helper used by domain BasePage classes.
export function resolveCookieDomain(baseUrl: string): string {
  const hostname = resolveHostname(baseUrl);
  if (!hostname) {
    return '';
  }

  return isLocalHostname(hostname) ? hostname : `.${hostname}`;
}
