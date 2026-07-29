# Fixtures

← [Back to main documentation](../../README.md)
↑ [Back to Page Object Model](./index.md)

## Overview

Fixtures expose ready-to-use page objects to tests.

---

## Configuration

Example (`pom/<domain>/pageFixture.ts`):

```ts
import { test as baseTest, expect } from '@utils/baseTest';
import { createLocalePageFixture, createSimplePageFixture } from '@utils/multilang/pomFixture';
import { HomePage } from './pages/home.page';
import { LocaleAwarePage } from './pages/localeAware.page';

type Fixtures = {
  homePage: HomePage;
  localeAwarePage: LocaleAwarePage;
};

const test = baseTest.extend<Fixtures>({
  // Standard page fixture
  homePage: createSimplePageFixture(HomePage),

  // Locale-aware page fixture (injects localeKey/fallbackLocale/envByLocale context)
  localeAwarePage: createLocalePageFixture(LocaleAwarePage),
});

export { test, expect };
```

---

## Usage

```ts
import { test, expect } from '@pom/theInternet/pageFixture';

test('home', async ({ homePage }) => {
  await homePage.goto();
  await expect(homePage.footer.poweredByLink).toBeVisible();
});
```
