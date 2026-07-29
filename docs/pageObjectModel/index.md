# Page Object Model

← [Back to main documentation](../../README.md)
↑ [Back to Page Object Model](./index.md)

## Overview

In this framework we keep tests simple by exposing ready-to-use Page Objects via fixtures.

---

## No POM (optional)

If you want to write tests **without** creating a domain POM, use `baseTest` directly.

- **[baseTest](../baseTest.md)**

---

## Quick start (what to create)

Typical setup for a new domain:

1. **Create a [BasePage](./basePage.md)** - shared navigation and common behavior.
2. **Create [components](./components.md)** - reusable UI pieces such as `header`, `footer`, dialogs.
3. **Create concrete [pages](./pages.md)** - e.g. `HomePage`, `LoginPage`, `MyProfilePage`.
4. **(Optional) Create an [AppPage](./appPage.md)** - add a shared logged-in layout layer on top of `BasePage` when needed.
5. **Wire [fixtures](./fixtures.md)** - expose page objects so tests do not construct pages manually.
6. **(Optional) Add [advanced patterns](./advancedPatterns.md)** - use proven patterns for auto-cookie, auto-login, multi-domain, and fixture-level overrides.

---

## Structure

POM files live under **`pom/`** and are grouped by domain.

Example structure:

```text
pom/
  example/
    components/
      footer.component.ts
      header.component.ts
    pages/
      home.page.ts
      login.page.ts
      myProfile.page.ts
    base.page.ts
    pageFixture.ts
```

---

## Configuration

### `base.page.ts`

- Shared page abstraction for a domain.
- Holds shared navigation (`goto`) and common domain-level components.
- Exposes reusable helpers consumed by all page classes in that domain.

### `components/*`

- Reusable UI fragments used by one or more pages.
- Components keep local locators and reusable assertions.

### `pages/*`

- Concrete screen/page objects.
- Each page class defines its own route and locators.
- Complex page behavior stays in page methods, not in test specs.

#### Static pages (require)

Use static pages when route and selectors are fixed.

```ts
export class HomePage extends BasePage {
  protected pageUrl = '/';
}
```

#### Dynamic pages (require)

Use dynamic pages when route needs runtime input.

```ts
export class ProductPage extends BasePage {
  protected pageUrl = '/products';

  async gotoById(productId: string) {
    await this.page.goto(`${this.pageUrl}/${productId}`);
  }
}
```

### `pageFixture.ts`

- Extends `baseTest` and exposes typed page fixtures (for example: `homePage`, `loginPage`, `securePage`).
- Keeps test files clean by centralizing page object instantiation.

### `utils/baseTest.ts`

- Shared test entrypoint for all domains.
- One import source for test authors (`test`, `expect`) across the whole framework.
- Current phase: minimal re-export of Playwright `test` and `expect`.
- Future phases: session/API fixture integration.

---

## Usage

Example test with domain fixture:

```ts
import { test, expect } from '@pom/<domain>/pageFixture';

test('page should load', async ({ homePage }) => {
  await homePage.goto();
  await expect(homePage.footer.poweredByLink).toBeVisible();
});
```

Example with dynamic page method:

```ts
test('product details should load', async ({ productPage }) => {
  await productPage.gotoById('123');
});
```

---

## References

- [Playwright Page Object Model](https://playwright.dev/docs/pom)
- [Playwright Fixtures](https://playwright.dev/docs/test-fixtures)
