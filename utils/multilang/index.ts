export interface LocaleCredentials {
  username?: string;
  password?: string;
}

export interface LocaleProjectContract {
  key: string;
  tenant: string;
  baseURL: string;
  credentials?: LocaleCredentials;
  groupNames: string[];
  tags: string[];
  brand?: string; // Added for brand-aware routing
  fallbackLocale?: string; // Optional locale key to fall back to for missing env values
}

export interface LocaleGroupContract {
  name: string;
  locales: string[];
  tag?: string;
}

export interface MultilangContract {
  locales: LocaleProjectContract[];
  groups: LocaleGroupContract[];
  tags: string[];
  brands?: string[]; // Added for BRANDS-based setup
}

export interface GeneratedLocaleProject {
  name: string;
  grepInvert?: RegExp;
  use: {
    baseURL: string;
  };
  metadata: {
    brand?: string;
    localeKey: string;
    tenant: string;
    routingTags: string[];
    knownRoutingTags: string[];
    fallbackLocale?: string;
  };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildForeignRoutingTagsGrepInvert(
  projectRoutingTags: string[],
  knownRoutingTags: string[],
  neutralRoutingTags: string[] = []
): RegExp | undefined {
  const neutralTagSet = new Set(neutralRoutingTags.map(tag => normalizeTag(tag)));
  const normalizedProjectTags = projectRoutingTags.map(tag => normalizeTag(tag));
  const projectSet = new Set(normalizedProjectTags.filter(tag => !neutralTagSet.has(tag)));
  const foreignRoutingTags = knownRoutingTags
    .map(tag => normalizeTag(tag))
    .filter(tag => !neutralTagSet.has(tag))
    .filter(tag => !projectSet.has(tag));

  if (foreignRoutingTags.length === 0 || projectSet.size === 0) {
    return undefined;
  }

  const ownPattern = Array.from(projectSet).map(tag => escapeRegex(tag)).join('|');
  const foreignPattern = foreignRoutingTags.map(tag => escapeRegex(tag)).join('|');

  // Exclude only tests that declare foreign routing tags and do not declare any routing tag for this project.
  return new RegExp(
    `^(?![\\s\\S]*@(?:${ownPattern})(?=\\b|$))[\\s\\S]*@(?:${foreignPattern})(?=\\b|$)`,
    'i'
  );
}

function toCsvTokens(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function uniquePreservingOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      output.push(item);
    }
  }

  return output;
}

export function normalizeLocale(locale: string): string {
  const trimmed = locale.trim();

  if (!trimmed) {
    throw new Error('[multilang] Locale value cannot be empty.');
  }

  const unified = trimmed.replace('-', '_').toLowerCase();

  // Accept both key style (pl) and full locale style (pl_PL), always normalize to key.
  const [localeKey] = unified.split('_');

  if (!localeKey) {
    throw new Error(`[multilang] Locale value "${locale}" is invalid.`);
  }

  return localeKey;
}

export function normalizeTag(tag: string): string {
  const trimmed = tag.trim().toLowerCase();

  if (!trimmed) {
    throw new Error('[multilang] Tag value cannot be empty.');
  }

  return trimmed.replace(/[\s_]+/g, '-');
}

export function normalizeRuntimeTag(tag: string): string {
  const withoutPrefix = tag.trim().replace(/^@+/, '');
  return normalizeTag(withoutPrefix);
}

function normalizeEnvToken(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function normalizeDataLocaleToken(value: string): string {
  return value.trim().replace('-', '_').toLowerCase();
}

function normalizeLocaleVariantKey(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error('[multilang] Locale variant key cannot be empty.');
  }

  const normalized = trimmed.toLowerCase();
  if (normalized === '*' || normalized === 'default' || normalized === 'base' || normalized === 'shared') {
    return normalized;
  }

  return normalizeLocale(trimmed);
}

function buildLocaleVariantCandidates(localeKey: string, fallbackLocale?: string): string[] {
  const candidates = [normalizeLocaleVariantKey(localeKey)];

  if (fallbackLocale) {
    const normalizedFallback = normalizeLocaleVariantKey(fallbackLocale);
    if (normalizedFallback !== candidates[0]) {
      candidates.push(normalizedFallback);
    }
  }

  candidates.push('default', 'base', 'shared', '*');

  return uniquePreservingOrder(candidates);
}

export function resolveByLocale<TValue = unknown>(
  source: Record<string, TValue>,
  localeKey: string,
  fallbackLocale?: string
): TValue {
  const candidates = buildLocaleVariantCandidates(localeKey, fallbackLocale);

  for (const candidate of candidates) {
    if (!Object.prototype.hasOwnProperty.call(source, candidate)) {
      continue;
    }

    const value = source[candidate];
    if (typeof value !== 'undefined') {
      return value;
    }
  }

  throw new Error(
    `[multilang] Missing locale-aware value for locale "${localeKey}". Tried: ${candidates.join(', ')}`
  );
}

function extractLocaleTemplateTokens(template: string): string[] {
  return uniquePreservingOrder(
    Array.from(template.matchAll(/\$\{([^}]+)\}/g), match => match[1].trim()).filter(Boolean)
  );
}

export function interpolateLocaleTemplate(
  template: string,
  values: Record<string, string | number> = {}
): string {
  const missingTokens = new Set<string>();

  const result = template.replace(/\$\{([^}]+)\}/g, (match, tokenName: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, tokenName)) {
      missingTokens.add(tokenName);
      return match;
    }

    const value = values[tokenName];
    if (typeof value === 'undefined' || value === null) {
      missingTokens.add(tokenName);
      return match;
    }

    return String(value);
  });

  if (missingTokens.size > 0) {
    throw new Error(
      `[multilang] Missing token value(s) for template "${template}": ${Array.from(missingTokens).join(', ')}`
    );
  }

  return result;
}

export function resolveLocaleTemplateByResolver(
  variants: Record<string, string>,
  localeKey: string,
  resolveToken: (tokenName: string) => string | number | undefined,
  fallbackLocale?: string
): string {
  const template = resolveByLocale(variants, localeKey, fallbackLocale);
  const tokens = extractLocaleTemplateTokens(template);

  if (tokens.length === 0) {
    return template;
  }

  const values: Record<string, string | number> = {};
  for (const token of tokens) {
    const value = resolveToken(token);
    if (typeof value === 'undefined' || value === null || value === '') {
      throw new Error(
        `[multilang] Missing token value for "${token}" while resolving locale template "${template}".`
      );
    }

    values[token] = value;
  }

  return interpolateLocaleTemplate(template, values);
}

export function resolveLocaleTemplate(
  variants: Record<string, string>,
  localeKey: string,
  fallbackLocale?: string,
  values?: Record<string, string | number>
): string {
  return resolveLocaleTemplateByResolver(
    variants,
    localeKey,
    tokenName => values?.[tokenName],
    fallbackLocale
  );
}

function buildDataLocaleCandidates(baseKey: string, locale: string): string[] {
  const normalizedLocale = normalizeDataLocaleToken(locale);
  if (!normalizedLocale) {
    return [];
  }

  const [localeKey] = normalizedLocale.split('_');
  return uniquePreservingOrder(
    [`${baseKey}_${normalizedLocale}`, localeKey ? `${baseKey}_${localeKey}` : ''].filter(Boolean)
  );
}

export function resolveDataByLocaleValue<TValue = unknown>(
  source: Record<string, TValue>,
  baseKey: string,
  localeKey: string,
  fallbackLocale?: string
): TValue {
  const normalizedBaseKey = baseKey.trim();
  if (!normalizedBaseKey) {
    throw new Error('[multilang] dataByLocale key cannot be empty.');
  }

  const localizedCandidates = buildDataLocaleCandidates(normalizedBaseKey, localeKey);
  const fallbackCandidates = fallbackLocale
    ? buildDataLocaleCandidates(normalizedBaseKey, fallbackLocale)
    : [];

  const candidates = uniquePreservingOrder([
    ...localizedCandidates,
    ...fallbackCandidates,
    normalizedBaseKey,
  ]);

  for (const key of candidates) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    const value = source[key];
    if (typeof value !== 'undefined') {
      return value;
    }
  }

  throw new Error(
    `[multilang] Missing dataByLocale value for key "${normalizedBaseKey}". Tried: ${candidates.join(', ')}`
  );
}

export function buildLocaleEnvCandidateKeys(
  baseKey: string,
  localeKey: string,
  tenant?: string
): string[] {
  const normalizedBaseKey = normalizeEnvToken(baseKey);
  if (!normalizedBaseKey) {
    throw new Error('[multilang] envByLocale key cannot be empty.');
  }

  const normalizedLocaleKey = normalizeEnvToken(localeKey);
  if (!normalizedLocaleKey) {
    throw new Error('[multilang] Locale key cannot be empty while resolving locale env key.');
  }

  const candidates = [`${normalizedBaseKey}_${normalizedLocaleKey}`];
  const normalizedTenant = tenant ? normalizeEnvToken(tenant) : undefined;

  if (normalizedTenant && normalizedTenant !== normalizedLocaleKey) {
    candidates.push(`${normalizedBaseKey}_${normalizedTenant}`);
  }

  return uniquePreservingOrder(candidates);
}

export function resolveLocaleScopedEnvValue(
  baseKey: string,
  localeKey: string,
  env: NodeJS.ProcessEnv = process.env,
  options?: {
    tenant?: string;
    fallbackLocale?: string;
  }
): string {
  const candidateKeys = uniquePreservingOrder([
    ...buildLocaleEnvCandidateKeys(baseKey, localeKey, options?.tenant),
  ]);

  for (const candidate of candidateKeys) {
    const value = env[candidate]?.trim();
    if (value) {
      return value;
    }
  }

  if (options?.fallbackLocale && options.fallbackLocale !== localeKey) {
    const fallbackCandidateKeys = buildLocaleEnvCandidateKeys(baseKey, options.fallbackLocale);
    for (const candidate of fallbackCandidateKeys) {
      const value = env[candidate]?.trim();
      if (value) {
        return value;
      }
    }
  }

  const normalizedBaseKey = normalizeEnvToken(baseKey);
  const baseValue = env[normalizedBaseKey]?.trim();
  if (baseValue) {
    return baseValue;
  }

  throw new Error(
    `[multilang] Missing locale-scoped value for key "${baseKey}" and locale "${localeKey}". Tried: ${uniquePreservingOrder([
      ...candidateKeys,
      normalizedBaseKey,
    ]).join(', ')}`
  );
}

function readRequiredBaseUrl(localeKey: string, env: NodeJS.ProcessEnv): string {
  const envKey = `BASE_URL_${localeKey.toUpperCase()}`;
  const baseURL = env[envKey]?.trim();

  if (!baseURL) {
    throw new Error(
      `[multilang] Missing required base URL for locale "${localeKey}". Expected env key: ${envKey}`
    );
  }

  return baseURL;
}

function readOptionalCredentials(
  localeKey: string,
  env: NodeJS.ProcessEnv
): LocaleCredentials | undefined {
  const user = env[`USER_${localeKey.toUpperCase()}`]?.trim();
  const pass =
    env[`PASS_${localeKey.toUpperCase()}`]?.trim() ||
    env[`PASSWORD_${localeKey.toUpperCase()}`]?.trim();

  if (!user && !pass) {
    return undefined;
  }

  return {
    username: user,
    password: pass,
  };
}

function readTenant(localeKey: string, env: NodeJS.ProcessEnv): string {
  const explicitTenant = env[`TENANT_${localeKey.toUpperCase()}`]?.trim();

  return explicitTenant || localeKey;
}

function readGroupsFromEnv(env: NodeJS.ProcessEnv): LocaleGroupContract[] {
  const groupEntries = Object.entries(env).filter(([key, value]) => {
    return key.startsWith('GROUP_') && !key.startsWith('GROUP_TAG_') && Boolean(value?.trim());
  });

  return groupEntries.map(([key, value]) => {
    const groupName = normalizeTag(key.replace('GROUP_', ''));
    const locales = uniquePreservingOrder(
      toCsvTokens(value).map(locale => normalizeLocale(locale))
    );
    const groupTagRaw = env[`GROUP_TAG_${key.replace('GROUP_', '')}`]?.trim();

    return {
      name: groupName,
      locales,
      tag: groupTagRaw ? normalizeTag(groupTagRaw) : undefined,
    };
  });
}

function validateGroupLocales(groups: LocaleGroupContract[], knownLocaleKeys: string[]): void {
  const known = new Set(knownLocaleKeys);

  for (const group of groups) {
    const unknown = group.locales.filter(locale => !known.has(locale));
    if (unknown.length > 0) {
      throw new Error(
        `[multilang] Group "${group.name}" references unknown locale(s): ${unknown.join(', ')}`
      );
    }
  }
}

// ============================================
// BRANDS-Based Setup (New)
// ============================================

function readBrandsFromEnv(env: NodeJS.ProcessEnv): string[] {
  const brandsRaw = env.BRANDS?.trim();
  if (!brandsRaw) {
    return [];
  }

  return uniquePreservingOrder(toCsvTokens(brandsRaw));
}

function readBrandLocalesFromEnv(brandName: string, env: NodeJS.ProcessEnv): string[] {
  const envKey = `${brandName}_LOCALES`;
  const localesRaw = env[envKey]?.trim();

  if (!localesRaw) {
    throw new Error(
      `[multilang-brands] Brand "${brandName}" has no LOCALES defined. Expected env key: ${envKey}`
    );
  }

  return uniquePreservingOrder(toCsvTokens(localesRaw).map(locale => normalizeLocale(locale)));
}

function readRequiredBaseUrlForBrand(
  brandName: string,
  localeKey: string,
  env: NodeJS.ProcessEnv
): string {
  const envKey = `${brandName}_BASE_URL_${localeKey.toUpperCase()}`;
  const baseURL = env[envKey]?.trim();

  if (!baseURL) {
    throw new Error(
      `[multilang-brands] Missing required base URL for brand "${brandName}" locale "${localeKey}". Expected env key: ${envKey}`
    );
  }

  return baseURL;
}

function readOptionalCredentialsForBrand(
  brandName: string,
  localeKey: string,
  env: NodeJS.ProcessEnv
): LocaleCredentials | undefined {
  const user = env[`${brandName}_USER_${localeKey.toUpperCase()}`]?.trim();
  const pass = env[`${brandName}_PASSWORD_${localeKey.toUpperCase()}`]?.trim();

  if (!user && !pass) {
    return undefined;
  }

  return {
    username: user,
    password: pass,
  };
}

function readTenantForBrand(brandName: string, localeKey: string, env: NodeJS.ProcessEnv): string {
  const explicitTenant = env[`${brandName}_TENANT_${localeKey.toUpperCase()}`]?.trim();
  return explicitTenant || localeKey;
}

function readGroupsFromEnvForBrand(
  brandName: string,
  env: NodeJS.ProcessEnv
): LocaleGroupContract[] {
  const prefix = `${brandName}_GROUP_`;
  const groupEntries = Object.entries(env).filter(([key, value]) => {
    return key.startsWith(prefix) && Boolean(value?.trim());
  });

  return groupEntries.map(([key, value]) => {
    const groupName = normalizeTag(key.replace(prefix, ''));
    const locales = uniquePreservingOrder(
      toCsvTokens(value).map(locale => normalizeLocale(locale))
    );

    // For BRANDS model, group tag is auto-generated from group name (no explicit GROUP_TAG_*)
    return {
      name: groupName,
      locales,
      tag: groupName, // Auto-generate tag from group name
    };
  });
}

function validateBrandGroupLocales(
  brandName: string,
  groups: LocaleGroupContract[],
  knownLocaleKeys: string[]
): void {
  const known = new Set(knownLocaleKeys);

  for (const group of groups) {
    const unknown = group.locales.filter(locale => !known.has(locale));
    if (unknown.length > 0) {
      throw new Error(
        `[multilang-brands] Brand "${brandName}" group "${group.name}" references unknown locale(s): ${unknown.join(
          ', '
        )}`
      );
    }
  }
}

function resolveBrandLocalesForContract(
  brandName: string,
  env: NodeJS.ProcessEnv
): LocaleProjectContract[] {
  const localeKeys = readBrandLocalesFromEnv(brandName, env);
  const groups = readGroupsFromEnvForBrand(brandName, env);
  const fallbackLocaleRaw = env[`${brandName}_FALLBACK_LOCALE`]?.trim();
  const fallbackLocale = fallbackLocaleRaw ? normalizeLocale(fallbackLocaleRaw) : undefined;

  validateBrandGroupLocales(brandName, groups, localeKeys);

  return localeKeys.map(localeKey => {
    const baseURL = readRequiredBaseUrlForBrand(brandName, localeKey, env);
    const credentials = readOptionalCredentialsForBrand(brandName, localeKey, env);
    const membership = groups.filter(group => group.locales.includes(localeKey));

    // Tags for BRANDS: include brand name + locale + groups
    const tags = uniquePreservingOrder([
      normalizeTag(brandName),
      normalizeTag(localeKey),
      ...membership.map(group => normalizeTag(group.name)),
    ]);

    return {
      key: localeKey,
      brand: brandName,
      tenant: readTenantForBrand(brandName, localeKey, env),
      baseURL,
      credentials,
      groupNames: membership.map(group => group.name),
      tags,
      fallbackLocale,
    };
  });
}

// ============================================
// Original LOCALES-Based Setup (Legacy)
// ============================================

export function resolveMultilangContract(env: NodeJS.ProcessEnv = process.env): MultilangContract {
  // Check if BRANDS-based setup is used
  const brands = readBrandsFromEnv(env);
  if (brands.length > 0) {
    return resolveBrandsMultilangContract(env, brands);
  }

  // Fall back to legacy LOCALES-based setup
  const localeTokens = toCsvTokens(env.LOCALES);

  if (localeTokens.length === 0) {
    throw new Error('[multilang] LOCALES is required and must contain at least one locale key.');
  }

  const localeKeys = uniquePreservingOrder(localeTokens.map(locale => normalizeLocale(locale)));
  const groups = readGroupsFromEnv(env);

  validateGroupLocales(groups, localeKeys);

  const locales: LocaleProjectContract[] = localeKeys.map(localeKey => {
    const baseURL = readRequiredBaseUrl(localeKey, env);
    const credentials = readOptionalCredentials(localeKey, env);
    const membership = groups.filter(group => group.locales.includes(localeKey));
    const tags = uniquePreservingOrder([
      normalizeTag(localeKey),
      ...membership.map(group => normalizeTag(group.name)),
      ...membership.filter(group => group.tag).map(group => normalizeTag(group.tag as string)),
    ]);

    return {
      key: localeKey,
      tenant: readTenant(localeKey, env),
      baseURL,
      credentials,
      groupNames: membership.map(group => group.name),
      tags,
    };
  });

  return {
    locales,
    groups,
    tags: uniquePreservingOrder(locales.flatMap(locale => locale.tags)),
  };
}

function resolveBrandsMultilangContract(
  env: NodeJS.ProcessEnv,
  brands: string[]
): MultilangContract {
  const allLocales: LocaleProjectContract[] = [];
  const allGroups: LocaleGroupContract[] = [];
  const allTags = new Set<string>();

  for (const brandName of brands) {
    const brandLocales = resolveBrandLocalesForContract(brandName, env);
    const brandGroups = readGroupsFromEnvForBrand(brandName, env);

    allLocales.push(...brandLocales);
    allGroups.push(...brandGroups);

    for (const locale of brandLocales) {
      locale.tags.forEach(tag => allTags.add(tag));
    }
  }

  return {
    locales: allLocales,
    groups: allGroups,
    tags: Array.from(allTags),
    brands,
  };
}

function parseLocaleControlList(value: string | undefined): Set<string> {
  const entries = toCsvTokens(value).map(locale => normalizeLocale(locale));
  return new Set(entries);
}

export function resolveActiveLocales(
  contract: MultilangContract,
  env: NodeJS.ProcessEnv = process.env
): LocaleProjectContract[] {
  // Handle BRANDS-based setup
  if (contract.brands && contract.brands.length > 0) {
    const activeByBrand: { [key: string]: LocaleProjectContract[] } = {};

    for (const brand of contract.brands) {
      const brandLocales = contract.locales.filter(locale => locale.brand === brand);
      const disabledKey = `${brand}_DISABLED_LOCALES`;
      const overrideKey = `${brand}_LOCALE_OVERRIDE`;

      const disabledLocales = parseLocaleControlList(env[disabledKey]);
      const localeOverride = env[overrideKey]?.trim();

      if (localeOverride) {
        const overrideLocaleKey = normalizeLocale(localeOverride);
        const selectedLocale = brandLocales.find(locale => locale.key === overrideLocaleKey);

        if (!selectedLocale) {
          throw new Error(
            `[multilang-brands] ${brand}_LOCALE_OVERRIDE points to unknown locale "${localeOverride}". Known locales: ${brandLocales
              .map(locale => locale.key)
              .join(', ')}`
          );
        }

        activeByBrand[brand] = [selectedLocale];
      } else {
        activeByBrand[brand] = brandLocales.filter(locale => !disabledLocales.has(locale.key));
      }
    }

    return Object.values(activeByBrand).flat();
  }

  // Legacy LOCALES-based setup
  const disabledLocales = parseLocaleControlList(env.DISABLED_LOCALES);
  const localeOverride = env.LOCALE_OVERRIDE?.trim();

  if (localeOverride) {
    const overrideKey = normalizeLocale(localeOverride);
    const selectedLocale = contract.locales.find(locale => locale.key === overrideKey);

    if (!selectedLocale) {
      throw new Error(
        `[multilang] LOCALE_OVERRIDE points to unknown locale "${localeOverride}". Known locales: ${contract.locales
          .map(locale => locale.key)
          .join(', ')}`
      );
    }

    return [selectedLocale];
  }

  return contract.locales.filter(locale => !disabledLocales.has(locale.key));
}

export function buildLocaleProjects(
  contract: MultilangContract,
  env: NodeJS.ProcessEnv = process.env
): GeneratedLocaleProject[] {
  const activeLocales = resolveActiveLocales(contract, env);
  const knownRoutingTags = contract.tags;
  const normalizedTagsByLocale = activeLocales.map(locale =>
    uniquePreservingOrder(locale.tags.map(tag => normalizeTag(tag)))
  );

  return activeLocales.map((locale, index) => {
    // For BRANDS-based setup, project name includes brand prefix (e.g., brandb-pl)
    // For legacy LOCALES setup, project name is just locale (e.g., pl)
    const projectName = locale.brand ? `${locale.brand.toLowerCase()}-${locale.key}` : locale.key;
    const projectRoutingTags = normalizedTagsByLocale[index];
    const neutralRoutingTags = locale.brand ? [normalizeTag(locale.brand)] : [];

    return {
      name: projectName,
      grepInvert: buildForeignRoutingTagsGrepInvert(
        projectRoutingTags,
        knownRoutingTags,
        neutralRoutingTags
      ),
      use: {
        baseURL: locale.baseURL,
      },
      metadata: {
        brand: locale.brand ? normalizeTag(locale.brand) : undefined,
        localeKey: locale.key,
        tenant: locale.tenant,
        routingTags: projectRoutingTags,
        knownRoutingTags,
        fallbackLocale: locale.fallbackLocale,
      },
    };
  });
}

export function shouldRunForProject(
  testTags: string[],
  projectRoutingTags: string[],
  knownRoutingTags: string[]
): boolean {
  const normalizedTestTags = uniquePreservingOrder(testTags.map(tag => normalizeRuntimeTag(tag)));
  const knownRoutingTagSet = new Set(knownRoutingTags.map(tag => normalizeTag(tag)));
  const projectRoutingTagSet = new Set(projectRoutingTags.map(tag => normalizeTag(tag)));

  const unknownLocaleRoutingTags = normalizedTestTags.filter(
    tag => /^[a-z]{2}$/.test(tag) && !knownRoutingTagSet.has(tag)
  );
  if (unknownLocaleRoutingTags.length > 0) return false;

  // Locale routing uses only tags that are known locale/group tags.
  const localeRoutingTags = normalizedTestTags.filter(tag => knownRoutingTagSet.has(tag));

  // No locale/group tags on the test means "run on all locale projects".
  if (localeRoutingTags.length === 0) {
    return true;
  }

  return localeRoutingTags.some(tag => projectRoutingTagSet.has(tag));
}

