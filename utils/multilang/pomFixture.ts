import type { Page, TestInfo } from '@playwright/test';
import { resolveLocalePageContext, type EnvByLocaleResolver, type LocalePageContext } from './pom';

type PageWithContextConstructor<TPage> = new (page: Page, options?: LocalePageContext) => TPage;

export function createSimplePageFixture<TPage>(PageObject: new (page: Page) => TPage) {
  return async ({ page }: { page: Page }, use: (v: TPage) => Promise<void>) => {
    await use(new PageObject(page));
  };
}

export function createLocalePageFixture<TPage>(PageObject: PageWithContextConstructor<TPage>) {
  return async (
    {
      page,
      localeKey,
      envByLocale,
    }: { page: Page; localeKey: string; envByLocale: EnvByLocaleResolver },
    use: (v: TPage) => Promise<void>,
    testInfo: TestInfo
  ) => {
    await use(new PageObject(page, resolveLocalePageContext(testInfo, localeKey, envByLocale)));
  };
}

