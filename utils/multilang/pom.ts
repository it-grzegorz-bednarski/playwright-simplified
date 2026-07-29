import type { Locator, Page, TestInfo } from '@playwright/test';
import { interpolateLocaleTemplate, normalizeLocale } from './index';

export type EnvByLocaleResolver = (baseKey: string) => string;

export type LocalePageContext = {
  localeKey?: string;
  fallbackLocale?: string;
  envByLocale?: EnvByLocaleResolver;
};

export type LocalePathValues = Record<string, string | number>;

export type LocalePathHelper = {
  valueByLocale<TValue>(variants: Record<string, TValue>): TValue;
  pathByLocale<TValue extends string>(variants: Record<string, TValue>): TValue;
  pathByLocaleTemplate(variants: Record<string, string>, values?: LocalePathValues): string;
  envValue(baseKey: string): string;
};

export type LocalePageHelper = LocalePathHelper & {
  locatorByLocale(variants: Record<string, string>): Locator;
  getByRoleByLocale(
    role: Parameters<Page['getByRole']>[0],
    nameVariants: Record<string, string>,
    options?: Omit<NonNullable<Parameters<Page['getByRole']>[1]>, 'name'>
  ): Locator;
  pathByLocaleTemplate(variants: Record<string, string>, values?: LocalePathValues): string;
};

const MISSING_LOCALE_KEY_ERROR =
  '[pom] Missing localeKey in BasePage. Provide it through the page fixture.';
const MISSING_ENV_BY_LOCALE_ERROR =
  '[pom] Missing envByLocale helper in BasePage. Provide it through the page fixture.';

function normalizePomVariantKey(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error('[pom] Locale variant key cannot be empty.');
  }

  const normalized = trimmed.toLowerCase();
  if (normalized === '*' || normalized === 'default' || normalized === 'base' || normalized === 'shared') {
    return normalized;
  }

  return normalizeLocale(trimmed);
}

function uniquePreservingOrder<TValue>(items: TValue[]): TValue[] {
  return Array.from(new Set(items));
}

function buildPomVariantCandidates(localeKey: string, fallbackLocale?: string): string[] {
  const candidates = [normalizePomVariantKey(localeKey), 'base'];

  if (fallbackLocale) {
    const normalizedFallback = normalizePomVariantKey(fallbackLocale);
    if (normalizedFallback !== candidates[0] && normalizedFallback !== 'base') {
      candidates.push(normalizedFallback);
    }
  }

  candidates.push('default', 'shared', '*');

  return uniquePreservingOrder(candidates);
}

function resolvePomValueByLocale<TValue>(
  variants: Record<string, TValue>,
  localeKey: string,
  fallbackLocale?: string
): TValue {
  const candidates = buildPomVariantCandidates(localeKey, fallbackLocale);

  for (const candidate of candidates) {
    if (!Object.prototype.hasOwnProperty.call(variants, candidate)) {
      continue;
    }

    const value = variants[candidate];
    if (typeof value !== 'undefined') {
      return value;
    }
  }

  throw new Error(
    `[pom] Missing locale-aware value for locale "${localeKey}". Tried: ${candidates.join(', ')}`
  );
}

function extractTemplateTokens(template: string): string[] {
  return uniquePreservingOrder(
    Array.from(template.matchAll(/\$\{([^}]+)}/g), match => match[1].trim()).filter(Boolean)
  );
}

export function createLocalePathHelper(context: LocalePageContext = {}): LocalePathHelper {
  return {
    valueByLocale<TValue>(variants: Record<string, TValue>): TValue {
      if (!context.localeKey) {
        throw new Error(MISSING_LOCALE_KEY_ERROR);
      }

      return resolvePomValueByLocale(variants, context.localeKey, context.fallbackLocale);
    },

    pathByLocale<TValue extends string>(variants: Record<string, TValue>): TValue {
      if (!context.localeKey) {
        throw new Error(MISSING_LOCALE_KEY_ERROR);
      }

      return resolvePomValueByLocale(variants, context.localeKey, context.fallbackLocale);
    },

    pathByLocaleTemplate(variants: Record<string, string>, values?: LocalePathValues): string {
      if (!context.localeKey) {
        throw new Error(MISSING_LOCALE_KEY_ERROR);
      }

      const template = resolvePomValueByLocale(variants, context.localeKey, context.fallbackLocale);
      const tokens = extractTemplateTokens(template);

      if (tokens.length === 0) {
        return template;
      }

      const resolvedValues: Record<string, string | number> = {};

      for (const tokenName of tokens) {
        if (values && Object.prototype.hasOwnProperty.call(values, tokenName)) {
          resolvedValues[tokenName] = values[tokenName];
          continue;
        }

        if (context.envByLocale) {
          try {
            const envValue = context.envByLocale(tokenName);
            if (envValue !== '') {
              resolvedValues[tokenName] = envValue;
              continue;
            }
          } catch {
            // ignore and report a single template-level error below
          }
        }

        throw new Error(
          `[multilang] Missing token value for "${tokenName}" while resolving locale template "${template}".`
        );
      }

      return interpolateLocaleTemplate(template, resolvedValues);
    },

    envValue(baseKey: string): string {
      if (!context.envByLocale) {
        throw new Error(MISSING_ENV_BY_LOCALE_ERROR);
      }

      return context.envByLocale(baseKey);
    },
  };
}

export function createLocalePageHelper(
  page: Page,
  context: LocalePageContext = {}
): LocalePageHelper {
  const pathHelper = createLocalePathHelper(context);

  return {
    ...pathHelper,

    pathByLocaleTemplate(variants: Record<string, string>, values?: LocalePathValues): string {
      return pathHelper.pathByLocaleTemplate(variants, values);
    },

    locatorByLocale(variants: Record<string, string>): Locator {
      return page.locator(pathHelper.valueByLocale(variants));
    },

    getByRoleByLocale(
      role: Parameters<Page['getByRole']>[0],
      nameVariants: Record<string, string>,
      options?: Omit<NonNullable<Parameters<Page['getByRole']>[1]>, 'name'>
    ): Locator {
      return page.getByRole(role, {
        ...(options || {}),
        name: pathHelper.valueByLocale(nameVariants),
      });
    },
  };
}

export function resolveLocalePageContext(
  testInfo: TestInfo,
  localeKey?: string,
  envByLocale?: EnvByLocaleResolver
): LocalePageContext {
  const fallbackLocale = (testInfo.project.metadata as { fallbackLocale?: string } | undefined)
    ?.fallbackLocale;

  return {
    localeKey,
    fallbackLocale,
    envByLocale,
  };
}

