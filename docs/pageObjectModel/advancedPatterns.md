# Advanced patterns

← [Back to main documentation](../../README.md)
↑ [Back to Page Object Model](./index.md)

## Overview

Common patterns for larger projects.

---

## Automatic cookie handling in `goto()`

Sometimes a cookie prompt blocks the page right after navigation.
A common pattern is to make `goto()` auto-handle it by default, but still allow opting out.

### Configuration

**File:** `pom/${domain}/pages/<somePage>.page.ts`

Override `goto()` and add a boolean flag.

```ts
import { waitForPageIdle } from '@utils/waitForPageIdle';
import { HomePage } from './home.page';

export class SomePage extends HomePage {
  // ...existing code...

  /**
   * Navigate to this page.
   * By default we auto-handle the cookie prompt.
   *
   * @param options - Optional navigation options.
   * @returns Promise<void>
   *
   * @example
   * await somePage.goto();
   * await somePage.goto({ autoAcceptCookies: false });
   */
  async goto(options?: { autoAcceptCookies?: boolean }) {
    const autoAcceptCookies = options?.autoAcceptCookies ?? true;

    await this.page.goto(this.pageUrl);
    await waitForPageIdle(this.page);

    if (autoAcceptCookies) {
      // Example options:
      // - inject a cookie in a helper (fast)
      // - click the cookie prompt UI (slower but closer to real behavior)
      await this.cookiePrompt.injectAcceptedCookie();
    }
  }
}
```

> Note: the exact cookie method depends on your domain.
> See: **[Components](./components.md)** (`CookiePromptComponent`).

### Usage

```ts
await somePage.goto();

await somePage.goto({ autoAcceptCookies: false });
```

---

## Automatic login in `goto()`

For many projects it is convenient to say: "go to page, and if userKey is provided, ensure we are logged in first".

### Configuration

**File:** `pom/${domain}/pages/<somePage>.page.ts`

Override `goto()` and accept an optional `userKey`.

```ts
import { waitForPageIdle } from '@utils/waitForPageIdle';
import { resolveCreds } from '@utils/sessionManager/envCreds';

export class SomePage /* extends BasePage/AppPage */ {
  // ...existing code...

  /**
   * Navigate to the page.
   * If `userKey` is provided, perform UI login after navigation.
   *
   * @param options - Optional navigation options.
   * @returns Promise<void>
   *
   * @example
   * await somePage.goto();
   * await somePage.goto({ userKey: 'ADMIN' });
   */
  async goto(options?: { userKey?: string }) {
    const userKey = options?.userKey;

    await this.page.goto(this.pageUrl);
    await waitForPageIdle(this.page);

    if (userKey) {
      const { username, password } = resolveCreds(userKey);
      await this.loginComponent.login(username, password);
    }
  }
}
```

> Tip: keep the UI login details in a `LoginPage` or `LoginComponent`.
> The `goto()` should orchestrate, not contain all selectors.
>
> Multi-locale note: `resolveCreds(...)` also supports `envByLocale`.
> If you have locale-aware env resolver in scope, pass it so credentials can resolve per locale first, then fall back to global env:
>
> ```ts
> const { username, password } = resolveCreds(userKey, { envByLocale });
> ```

### Usage

```ts
// Navigate without logging in
await somePage.goto();

// Navigate and log in first (if needed)
await somePage.goto({ userKey: 'ADMIN' });
```

---

## Automatic cookie injection in `goto()`

If your application uses a cookie to hide a banner (or to set a state), you can inject it during `goto()`.

This is similar to "Automatic cookie handling", but more generic: it's not a UI click, it's direct cookie injection.

### Configuration

**File:** `pom/${domain}/pages/<somePage>.page.ts`

```ts
import { setCookies } from '@utils/setCookies';

export class SomePage /* extends BasePage/AppPage */ {
  // ...existing code...

  /**
   * Navigate to the page.
   * By default this injects selected cookies before navigation.
   *
   * @param options - Optional navigation options.
   * @returns Promise<void>
   *
   * @example
   * await somePage.goto();
   * await somePage.goto({ injectCookies: false });
   */
  async goto(options?: { injectCookies?: boolean }) {
    const injectCookies = options?.injectCookies ?? true;

    if (injectCookies) {
      await setCookies(this.page, ['TEST_COOKIE_A']);
    }

    await super.goto();
  }
}
```

### Usage

```ts
await somePage.goto();
await somePage.goto({ injectCookies: false });
```

---

## Locale-aware pageUrl

Use this when one page has different URL variants per locale.

### Configuration

**File:** `pom/${domain}/pages/<somePage>.page.ts`

```ts
import { BasePage } from '../base.page';

export class LocaleAwarePage extends BasePage {
  override getPageUrl(): string {
    return this.pathByLocaleTemplate({
      base: `/profile?user=\${USER_ID}`,
      pl: `/profil?user=\${USER_ID}`,
      cs: `/profil-cz?user=\${USER_ID}`,
      de: `/profil-de?user=\${USER_ID}`,
    });
  }
}
```

`base` is optional, but recommended when you want deterministic fallback inside POM.

### Usage

```ts
import { test, expect } from '@pom/${domain}/pageFixture';

test('resolves locale-aware page url', { tag: ['@pl', '@cs', '@de', '@ar'] }, async ({ localeAwarePage, page }) => {
  await localeAwarePage.goto();
  await expect(page).toHaveURL(localeAwarePage.getFullPageUrl());
});
```

---

## Locale-aware selectors (locator + role)

Use this when selector text or selector path differs by locale.

### Configuration

**File:** `pom/${domain}/pages/<somePage>.page.ts`

```ts
import { BasePage } from '../base.page';

export class LocaleAwarePage extends BasePage {
  submitButton = this.getByRoleByLocale('button', {
    base: 'Sign in',
    pl: 'Zaloguj',
    cs: 'Přihlásit se',
    de: 'Anmelden',
  });

  usernameInput = this.locatorByLocale({
    base: '[data-testid="username-input"]',
    pl: '[data-testid="nazwa-uzytkownika"]',
    cs: '[data-testid="uzivatel"]',
    de: '[data-testid="benutzername"]',
  });
}
```

### Usage

```ts
import { test, expect } from '@pom/${domain}/pageFixture';

test('uses locale-aware selectors', { tag: ['@pl', '@cs', '@de', '@ar'] }, async ({ localeAwarePage }) => {
  await localeAwarePage.goto();

  await expect(localeAwarePage.submitButton).toBeVisible();
  await expect(localeAwarePage.usernameInput).toBeVisible();
});
```

---

## Locale-aware functions

Use this when one public POM method should run a different implementation per locale.

### Configuration

**File:** `pom/${domain}/pages/<somePage>.page.ts`

```ts
import { BasePage } from '../base.page';

export class LocaleAwarePage extends BasePage {
  async prepareByRoleSelectorFixture(): Promise<void> {
    await this.runByLocale({
      pl: () => this.updateButton({ ariaLabel: 'Zaloguj' }),
      cs: () => this.updateButton({ ariaLabel: 'Přihlásit se' }),
      de: () => this.updateButton({ ariaLabel: 'Anmelden' }),
      base: () => this.updateButton({ ariaLabel: 'Sign in' }),
    });
  }

  private async updateButton(options: { ariaLabel: string }): Promise<void> {
    await this.page.evaluate(({ ariaLabel }) => {
      const button = document.querySelector('button[onclick="addElement()"]');
      if (!button) throw new Error('Expected button to exist.');
      button.setAttribute('aria-label', ariaLabel);
    }, options);
  }
}
```

### Usage

```ts
import { test, expect } from '@pom/${domain}/pageFixture';

test('uses locale-aware function', { tag: ['@pl', '@cs', '@de', '@ar'] }, async ({ localeAwarePage }) => {
  await localeAwarePage.goto();
  await localeAwarePage.prepareByRoleSelectorFixture();
  await expect(localeAwarePage.submitButton).toBeVisible();
});
```

---

## Choosing a different login flow (sessionLoginKey)

When you maintain multiple `sessionLogin.*.ts` configs (different domains or different login mechanics),
you can choose which one is used for session creation.

### Configuration

**Files:**
- `config/sessionLogin.default.ts` (default flow)
- `config/sessionLogin.second.ts` (another flow)

Your fixture sets the default config:

**File:** `pom/${domain}/pageFixture.ts`

```ts
import { createSessionFixtures } from '@utils/sessionFixtures';

const baseTest = base.extend<Fixtures & Options>({
  ...createSessionFixtures({ defaultSessionLoginKey: 'default' }),
});
```

### Usage

Override per describe/test file (rare case):

```ts
import { test, session } from '@pom/${domain}/pageFixture';

session('ADMIN', { sessionLoginKey: 'second' });

test('uses SECOND login flow for session creation', async ({ homePage }) => {
  await homePage.goto();
});
```

---

## Choosing a different API config (apiConfigKey)

When you maintain multiple `apiConfig.*.ts` configs (different domains, auth schemes, or headers),
you can choose which one is used by the `api` fixture.

### Configuration

**Files:**
- `config/apiConfig.default.ts` (default flow)
- `config/apiConfig.dummyjson.guest.ts` (example: public API)
- `config/apiConfig.dummyjson.authorized.ts` (example: auth from session meta)

Your domain fixture can set the default config:

**File:** `pom/${domain}/pageFixture.ts`

```ts
import { test as baseTest } from '@utils/baseTest';

export const test = baseTest.extend<Fixtures>({
  apiConfigKey: 'dummyjson.guest',

  // ...pages...
});
```

### Usage

Override per describe/test file (rare case):

```ts
import { test, apiProfile } from '@pom/${domain}/pageFixture';

apiProfile({ apiConfigKey: 'dummyjson.authorized' });

test('uses AUTHORIZED api config', async ({ api }) => {
  const res = await api.get('/auth/me');
  await res.expectStatus(200);
});
```

---

## Basic Auth automation

Before you use Basic Auth automation, read: **[Basic Auth](../sessionManagement/basicAuth.md)**.

### Global Basic Auth (per domain / per environment)

If the whole domain uses one Basic Auth, enable it once in your fixture scope.

```ts
import { test as base, basicAuth } from '@utils/baseTest';

basicAuth(); // uses BASICAUTH_USERNAME / BASICAUTH_PASSWORD

export const test = base.extend<Fixtures & Options>({
  // ...existing code...

  // ...existing pages/components...
});
```

### Per-user Basic Auth

If Basic Auth is per-user, set it in the same scope where you select the session user.

```ts
import { test, session, basicAuth } from '@utils/baseTest';

session('ADMIN');
basicAuth('ADMIN');

test('example', async ({ homePage }) => {
  await homePage.goto();
});
```

> Tip: if the whole domain is behind one Basic Auth, prefer the global fixture approach.

---

## Multiple fixtures / multiple domains

When you test multiple domains, keep separate folders under `pom/`.
Each domain has its own pages and its own `pageFixture.ts`.

### Configuration

Example structure:

```text
pom/
  theInternet/
    pages/
    components/
    pageFixture.ts
  products/
    pages/
    components/
    pageFixture.ts
tests/
  functional/
    theInternet.spec.ts
    productsNavigation.spec.ts
```

### Usage

In a test file, import `test` from the correct fixture:

```ts
import { test, expect } from '@pom/theInternet/pageFixture';

test('theInternet test', async ({ homePage }) => {
  await homePage.goto();
  await expect(homePage.footer.container).toBeVisible();
});
```

Another spec can import a different fixture:

```ts
import { test, expect } from '@pom/products/pageFixture';

test('products test', async ({ singleProductPage, page }) => {
  await singleProductPage.gotoDynamicPage({ Id: '2' });
  await expect(page).toHaveURL(singleProductPage.getDynamicPageUrl({ Id: '2' }));
});
```

---

## Writing tests without a domain POM (baseTest)

If you don't have (or don't want) a domain POM yet, you can still write tests using `baseTest` directly.

See: **[baseTest](../baseTest.md)**.

### Usage

```ts
import { test } from '@utils/baseTest';

test('example without POM', async ({ api }) => {
  const res = await api.get('/products/1');
  await res.expectStatus(200);
});
```
