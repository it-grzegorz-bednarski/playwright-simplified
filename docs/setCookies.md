# Set Cookies

← [Back to main documentation](../README.md)

## Overview

Utility for injecting predefined cookies into Playwright tests.

---

## Configuration

Cookie keys are defined centrally in **[Cookies](./cookies.md)** (`fixtures/cookies/cookies.ts`), under the `COOKIES` object.
Use keys from `COOKIES` as the second argument.

Function signature:

- **`setCookies(page, cookieKeys, options?)`**
  - **`page`** - Playwright `Page`
  - **`cookieKeys`** - array of keys from `COOKIES` (e.g. `['COOKIE_BANNER_ACCEPTED']`)
  - **`options.replacements`** - optional placeholder map applied to string fields in cookie definitions

---

## Usage

Use **`setCookies(page, [...])`** to inject cookies into the test's isolated browser context.
Always call it **before** `page.goto()` or `page.reload()` so cookies are applied before the request is made.

```ts
import { test } from '@playwright/test';
import { setCookies } from '../utils/setCookies';

test('set cookie banner accepted', async ({ page }) => {
  await setCookies(page, ['COOKIE_BANNER_ACCEPTED'], {
    replacements: {
      '#COOKIE_DOMAIN#': '.example.com',
    },
  });
  await page.goto('/');
});
```

### Placeholder replacements

`setCookies` supports runtime replacement of placeholders stored in cookie definitions.

Example cookie definition:

```ts
domain: '#COOKIE_DOMAIN#';
```

Example runtime replacement:

```ts
await setCookies(page, ['COOKIE_BANNER_ACCEPTED'], {
  replacements: {
    '#COOKIE_DOMAIN#': envByLocale('COOKIE_DOMAIN'),
  },
});
```

For grouped scenarios, use **[Set Cookies Scenario](./setCookiesScenario.md)**.
