# Base Page

← [Back to main documentation](../../README.md)
↑ [Back to Page Object Model](./index.md)

## Overview

`base.page.ts` is the shared foundation for page objects in a domain.

---

## Configuration
Example:

```ts
import type { Page } from '@playwright/test';
import { resolveBaseUrl, resolveCookieDomain } from '@utils/basePage';
import { waitForPageIdle } from '@utils/waitForPageIdle';
import { createLocalePageHelper, type LocalePageContext } from '@utils/multilang/pom';
import { CookieDisclaimerComponent } from './components/cookieDisclaimer.component';
import { FooterComponent } from './components/footer.component';

export abstract class BasePage {
  // Optional: child pages usually override this with e.g. '/' or '/login'.
  protected pageUrl = '';
  // Optional fallback for docs/sample. A domain BasePage may also intentionally prefer this value.
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
      // Optional: force this BasePage to always use class-level baseUrl.
      // Useful when this domain should ignore brand/locale BASE_URL values from env.
      preferBaseUrl: true,
    });
  }

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
```

`pageUrl` and `baseUrl` are optional defaults in `BasePage`.

- `pageUrl = ''` means "no path override yet" and is typically overridden in a concrete page object.
- `baseUrl` can be either a fallback for env-driven projects or an intentionally preferred domain URL when `preferBaseUrl: true` is enabled.

### Optional: locale-aware `baseUrl` and cookie replacements

If you use locale fixtures, keep URL resolution in `utils/basePage.ts` and reuse it from domain-specific `BasePage` classes.
Cookie placeholders can be replaced at runtime before navigation.

`setCookiesScenario(..., { replacements })` is documented in:
- **[Cookies](../cookies.md)**
- **[Set Cookies Scenario](../setCookiesScenario.md)**

Use the helpers from `@utils/basePage`:
- `resolveBaseUrl(...)` — resolves the final base URL with locale/env fallback
- `resolveCookieDomain(...)` — converts a base URL into a cookie domain string

Use the helpers from `@utils/multilang/pom` through the thin BasePage wrappers:
- `locatorByLocale(...)`
- `getByRoleByLocale(...)`
- `pathByLocaleTemplate(...)`
- `valueByLocale(...)`
- `runByLocale(...)`

`resolveBaseUrl(...)` also supports `preferBaseUrl: true`.

- `preferBaseUrl: false` (default) - use locale/env resolution first (for example `MULTILOCALE_BASE_URL_PL`).
- `preferBaseUrl: true` - always use `this.baseUrl` from the current `BasePage` class when it is set.

Use `preferBaseUrl: true` only for domain-specific pages that must ignore project-wide brand/locale base URL overrides.

This keeps the page object small and lets each domain reuse the same helper logic.

### Optional future pattern: `autoCloseCookies`

If you want a page-object level switch for cookie cleanup during navigation, you can keep it as a future extension pattern and document it like this:

```ts
type GotoOptions = {
  autoCloseCookies?: boolean;
};

async goto(options: GotoOptions = {}) {
  const { autoCloseCookies = true } = options;

  if (autoCloseCookies) {
    // Example only: use a cookie scenario with replacements.
    // await setCookiesScenario(this.page, 'privacyMinimal', {
    //   replacements: {
    //     '#COOKIE_DOMAIN#': this.resolveCookieDomain(),
    //   },
    // });
  }

  await this.page.goto(this.getFullPageUrl());
  await waitForPageIdle(this.page);
}
```

This is a documentation-only example for now; it does not need to exist in the current `BasePage` implementation.

Example test usage:

```ts
test('opens page without auto-closing cookies', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto({ autoCloseCookies: false });
});
```

Locale-aware resolution order in POM helpers is:

`<locale>` -> `base` -> `<fallbackLocale>` -> `default` -> `shared` -> `*`

This means `base` explicitly overrides env fallback locale behavior for POM values.

---

## Usage

```ts
import { BasePage } from '../base.page';

export class HomePage extends BasePage {
  protected pageUrl = '/';
}
```
