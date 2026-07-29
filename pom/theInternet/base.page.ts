import type { Page } from '@playwright/test';
import { CookieDisclaimerComponent } from './components/cookieDisclaimer.component';
import { FooterComponent } from './components/footer.component';
import { resolveBaseUrl, resolveCookieDomain } from '@utils/basePage';
import { waitForPageIdle } from '@utils/waitForPageIdle';
import { createLocalePageHelper, type LocalePageContext } from '@utils/multilang/pom';

export abstract class BasePage {
  protected pageUrl = '';
  protected baseUrl = 'http://the-internet.herokuapp.com';
  private readonly localeContext: LocalePageContext;
  private readonly localeHelper;
  cookiePrompt: CookieDisclaimerComponent;
  footer: FooterComponent;

  constructor(
    protected page: Page,
    options: LocalePageContext = {}
  ) {
    this.localeContext = options;
    this.localeHelper = createLocalePageHelper(page, options);
    this.cookiePrompt = new CookieDisclaimerComponent(page);
    this.footer = new FooterComponent(page);
  }

  getFullPageUrl(): string {
    return `${this.resolveBaseUrl()}${this.getPageUrl()}`;
  }

  getPageUrl(): string {
    return this.pageUrl;
  }

  protected resolveBaseUrl(): string {
    return resolveBaseUrl({
      baseUrl: this.baseUrl,
      envByLocale: this.localeContext.envByLocale,
      preferBaseUrl: true,
    });
  }

  // The helper is intentionally exposed for future domain-specific cookie scenarios.
  protected resolveCookieDomain(): string {
    return resolveCookieDomain(this.resolveBaseUrl());
  }

  protected locatorByLocale(variants: Record<string, string>) {
    return this.localeHelper.locatorByLocale(variants);
  }

  protected getByRoleByLocale(...args: Parameters<typeof this.localeHelper.getByRoleByLocale>) {
    return this.localeHelper.getByRoleByLocale(...args);
  }

  protected pathByLocaleTemplate(
    variants: Record<string, string>,
    values?: Record<string, string | number>
  ): string {
    return this.localeHelper.pathByLocaleTemplate(variants, values);
  }

  protected valueByLocale<TValue>(variants: Record<string, TValue>): TValue {
    return this.localeHelper.valueByLocale(variants);
  }

  protected runByLocale = async <TValue>(
    variants: Record<string, () => Promise<TValue> | TValue>
  ): Promise<TValue> => {
    const action = this.valueByLocale(variants);
    return await action();
  };

  async goto(): Promise<void> {
    await this.page.goto(this.getFullPageUrl());
    await waitForPageIdle(this.page);
  }
}
