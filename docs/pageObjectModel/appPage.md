# AppPage

← [Back to main documentation](../../README.md)
↑ [Back to Page Object Model](./index.md)

## Overview

`AppPage` is an optional layer between `BasePage` and your concrete pages.

Use it when most pages share the same layout or when the layout changes after login (for example: a logged-in header, logged-in menu / user menu, different navigation).

---

## When to use AppPage

Typical sign you need `AppPage`:

- you have a *login wall* (some pages are public, others require login)
- public pages do NOT show the same header/menu as logged-in pages
- you want shared logged-in UI (e.g. user menu) available on all authenticated pages

---

## Configuration

`AppPage` should extend `BasePage` and include shared logged-in layout components.

Create a appPage file in: `pom/${domain}/app.page.ts`

```ts
import { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { HeaderComponent } from './components/header.component';
import { FooterComponent } from './components/footer.component';

export abstract class AppPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Shared logged-in layout
  // ---------------------------------------------------------------------------
  header: HeaderComponent;
  footer: FooterComponent;

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------
  constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.footer = new FooterComponent(page);
  }
}
```

Typical fields:

- **`header`** - shared header component for authenticated pages.
- **`footer`** - shared footer (optional; sometimes this lives in `BasePage` if it exists everywhere).

To reuse shared logged-in layout, extend `AppPage` in your authenticated pages.

```ts
import { AppPage } from '../app.page';

export class MyProfilePage extends AppPage {
  protected pageUrl = '/my-profile';
}
```

`AppPage` extends `BasePage`, so all `BasePage` helpers are available here as well.
See: **[Base pages](./basePage.md)**

### Shared components

`AppPage` is a good place to define shared, logged-in layout components.

```ts
import { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { HeaderComponent } from './components/header.component';
import { FooterComponent } from './components/footer.component';

export abstract class AppPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Shared logged-in layout
  // ---------------------------------------------------------------------------
  header: HeaderComponent;
  footer: FooterComponent;

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------
  constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.footer = new FooterComponent(page);
  }
}
```

> Tip: keep only logged-in layout in `AppPage`. Components that exist on all pages (like a cookie prompt) should live in `BasePage`.

---

## Usage

If your pages extend `AppPage`, they inherit all `BasePage` helpers (`goto()`, `getPageUrl()`, etc.) and also get access to shared logged-in UI like `header`, `footer` (and any other components you add here).

#### Use shared components (e.g. `header`)

```ts
import { test } from '@pom/${domain}/pageFixture';

test('authenticated pages can use AppPage header helpers', async ({ loginPage, myProfilePage }) => {
  await loginPage.login('ADMIN');
  await myProfilePage.goto();

  await myProfilePage.header.assertLoggedInMenuVisible();
});
```
