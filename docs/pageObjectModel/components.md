# Components

← [Back to main documentation](../../README.md)
↑ [Back to Page Object Model](./index.md)

## Overview

Components model reusable UI fragments (header, footer, login container, cookie banner, etc.).

---

## Configuration
Create a component file in `pom/${domain}/components/${name}.component.ts` e.g. `cookiePrompt.component.ts`

```ts
import { Page, expect } from '@playwright/test';
import { setCookies } from '@utils/setCookies';

export class CookieDisclaimerComponent {
  constructor(private page: Page) {}

  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------
  container = this.page.locator('[data-test="cookie-disclaimer"]');
  acceptButton = this.container.getByRole('button', { name: accept });
  rejectButton = this.container.getByRole('button', { name: reject });

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------
  /**
   * Asserts that the cookie disclaimer container is not visible.
   *
   * @returns Promise<void>
   *
   * @example
   * await homePage.cookiePrompt.assertNotVisible();
   */
  async assertNotVisible() {
    await expect(this.container).not.toBeVisible();
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  /** Click "Accept" on the cookie disclaimer UI. */
  async clickAcceptCookieButton() {
    await this.acceptButton.click();
    await this.assertNotVisible();
  }

  /** Inject cookie that marks the cookie banner as accepted. */
  async injectAcceptedCookie() {
    await setCookies(this.page, ['COOKIE_BANNER_ACCEPTED']);
  }
}
```

Typical elements:
- **`Locators`** - stable locators for important elements.
- **`Assertions`** - optional methods to verify component state.
- **`Actions`** - small, focused methods that perform user actions.

Where to expose shared components:

- If the component is visible on **every page** in a domain (example: `cookiePrompt`), expose it from **`BasePage`**.
- If the component is visible only **behind a login wall** (example: `header`, `loggedInMenu`), expose it from **`AppPage`**.

Example (inject into `BasePage`):

```ts
import { Page } from '@playwright/test';
import { CookiePromptComponent } from './components/cookiePrompt.component';

export abstract class BasePage {
  protected abstract pageUrl: string;

  public cookiePrompt: CookiePromptComponent;

  constructor(protected page: Page) {
    this.cookiePrompt = new CookiePromptComponent(page);
  }
}
```

---

## Usage

#### Using a component in a test

```ts
import { test } from '@pom/${domain}/pageFixture';

test('can use cookie prompt component from BasePage', async ({ homePage }) => {
  await homePage.goto();
  await homePage.cookiePrompt.clickAcceptCookieButton();
});
```
