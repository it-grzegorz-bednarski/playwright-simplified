import type { TestInfo } from '@playwright/test';
import { normalizeLocale, resolveLocaleScopedEnvValue } from './index';

export type ProjectMetadata = {
  brand?: string;
  localeKey?: string;
  tenant?: string;
  routingTags?: string[];
  knownRoutingTags?: string[];
  fallbackLocale?: string;
};

export type EnvByLocaleResolver = (baseKey: string) => string;

export type MultilangRuntimeContext = {
  metadata: ProjectMetadata;
  brand?: string;
  localeKey: string;
  tenant: string;
  fallbackLocale?: string;
  envByLocale: EnvByLocaleResolver;
  sessionScopeKey: string;
};

export function resolveProjectMetadata(testInfo: TestInfo): ProjectMetadata {
  return (testInfo.project.metadata as ProjectMetadata | undefined) ?? {};
}

export function extractBrandFromProjectName(projectName: string): {
  brand?: string;
  localeKey: string;
} {
  const parts = projectName.split('-');

  if (parts.length >= 2) {
    const localeKey = parts[parts.length - 1];
    const brand = parts.slice(0, -1).join('-');
    return { brand, localeKey };
  }

  return { localeKey: projectName };
}

export function resolveBrandScopedEnvValue(
  baseKey: string,
  brand: string,
  localeKey: string,
  env: NodeJS.ProcessEnv = process.env,
  fallbackLocale?: string
): string {
  const normalizedBrand = brand.toUpperCase();
  const normalizedBaseKey = baseKey.toUpperCase();
  const normalizedLocale = localeKey.toUpperCase();
  const candidateKeys = [`${normalizedBrand}_${normalizedBaseKey}_${normalizedLocale}`];

  if (normalizedBaseKey === 'PASS') {
    candidateKeys.push(`${normalizedBrand}_PASSWORD_${normalizedLocale}`);
  }
  if (normalizedBaseKey === 'PASSWORD') {
    candidateKeys.push(`${normalizedBrand}_PASS_${normalizedLocale}`);
  }

  for (const envKey of candidateKeys) {
    const value = env[envKey]?.trim();
    if (value) {
      return value;
    }
  }

  if (fallbackLocale && fallbackLocale !== localeKey) {
    const normalizedFallback = fallbackLocale.toUpperCase();
    const fallbackCandidateKeys = [`${normalizedBrand}_${normalizedBaseKey}_${normalizedFallback}`];

    if (normalizedBaseKey === 'PASS') {
      fallbackCandidateKeys.push(`${normalizedBrand}_PASSWORD_${normalizedFallback}`);
    }
    if (normalizedBaseKey === 'PASSWORD') {
      fallbackCandidateKeys.push(`${normalizedBrand}_PASS_${normalizedFallback}`);
    }

    for (const envKey of fallbackCandidateKeys) {
      const value = env[envKey]?.trim();
      if (value) {
        return value;
      }
    }
  }

  const brandBaseCandidate = `${normalizedBrand}_${normalizedBaseKey}`;
  const globalBaseCandidate = normalizedBaseKey;

  for (const envKey of [brandBaseCandidate, globalBaseCandidate]) {
    const value = env[envKey]?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(
    `[multilang-brands] Missing value for key "${baseKey}" in brand "${brand}" locale "${localeKey}". Tried env keys: ${Array.from(
      new Set([...candidateKeys, brandBaseCandidate, globalBaseCandidate])
    ).join(', ')}`
  );
}

export function resolveMultilangRuntimeContext(
  testInfo: TestInfo,
  env: NodeJS.ProcessEnv = process.env
): MultilangRuntimeContext {
  const metadata = resolveProjectMetadata(testInfo);
  const extracted = extractBrandFromProjectName(testInfo.project.name);

  const brand = metadata.brand || extracted.brand;
  const localeKey = metadata.localeKey
    ? normalizeLocale(metadata.localeKey)
    : normalizeLocale(extracted.localeKey);
  const tenant = metadata.tenant || localeKey;
  const fallbackLocale = metadata.fallbackLocale;

  const envByLocale: EnvByLocaleResolver = (baseKey: string) => {
    if (baseKey.trim().toUpperCase() === 'TENANT') {
      return tenant;
    }

    if (brand) {
      return resolveBrandScopedEnvValue(baseKey, brand, localeKey, env, fallbackLocale);
    }

    return resolveLocaleScopedEnvValue(baseKey, localeKey, env, {
      tenant,
      fallbackLocale,
    });
  };

  return {
    metadata,
    brand,
    localeKey,
    tenant,
    fallbackLocale,
    envByLocale,
    sessionScopeKey: brand ? `${brand}__${localeKey}` : localeKey,
  };
}

