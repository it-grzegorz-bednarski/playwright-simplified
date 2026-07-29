import type { TestInfo } from '@playwright/test';
import { resolveDataByLocaleValue } from './index';
import { resolveMultilangRuntimeContext, type EnvByLocaleResolver } from './runtime';

export type MultilangFixtures = {
  envByLocale: EnvByLocaleResolver;
  dataByLocale: <TValue = unknown>(
    source: Record<string, TValue>,
    baseKey: string,
    fallbackLocale?: string
  ) => TValue;
  localeKey: string;
  tenant: string;
  brand?: string;
};

export function createMultilangFixtures() {
  return {
    brand: async ({}, use: (value: string | undefined) => Promise<void>, testInfo: TestInfo) => {
      await use(resolveMultilangRuntimeContext(testInfo).brand);
    },

    localeKey: async ({}, use: (value: string) => Promise<void>, testInfo: TestInfo) => {
      await use(resolveMultilangRuntimeContext(testInfo).localeKey);
    },

    tenant: async (
      { localeKey }: { localeKey: string },
      use: (value: string) => Promise<void>,
      testInfo: TestInfo
    ) => {
      const runtime = resolveMultilangRuntimeContext(testInfo);
      await use(runtime.tenant || localeKey);
    },

    envByLocale: async ({}, use: (resolver: EnvByLocaleResolver) => Promise<void>, testInfo: TestInfo) => {
      await use(resolveMultilangRuntimeContext(testInfo).envByLocale);
    },

    dataByLocale: async (
      { localeKey }: { localeKey: string },
      use: (
        resolver: <TValue = unknown>(
          source: Record<string, TValue>,
          baseKey: string,
          fallbackLocale?: string
        ) => TValue
      ) => Promise<void>
    ) => {
      await use((source, baseKey, fallbackLocale) => {
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
          throw new Error('[multilang] dataByLocale source must be a plain object.');
        }

        return resolveDataByLocaleValue(source, baseKey, localeKey, fallbackLocale);
      });
    },
  };
}

