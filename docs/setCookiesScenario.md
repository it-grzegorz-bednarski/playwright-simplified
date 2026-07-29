# Set Cookies Scenario

← [Back to main documentation](../README.md)

## Overview

Helper for applying predefined cookie scenarios from `COOKIE_SCENARIOS` - a scenario injects a named set of cookies in one call.

---

## Configuration

Scenarios are defined centrally in **[Cookies](./cookies.md)** (`fixtures/cookies/cookies.ts`), under the `COOKIE_SCENARIOS` object.
Use keys from `COOKIE_SCENARIOS` as the second argument.

Function signature:

- **`setCookiesScenario(page, scenarioKey, options?)`**
  - **`page`** - Playwright `Page`
  - **`scenarioKey`** - key from `COOKIE_SCENARIOS` (e.g. `'privacyMinimal'`)
  - **`options.replacements`** - optional placeholder map applied before cookies are injected

---

## Usage

```ts
import { test } from '@playwright/test';
import { setCookiesScenario } from '../utils/setCookiesScenario';

// privacyMinimal = ['COOKIE_BANNER_ACCEPTED']
// fullTracking   = ['COOKIE_BANNER_ACCEPTED', 'MARKETING_CONSENT_GIVEN', 'REMEMBER_ME_ENABLED']

test('use minimal privacy scenario', async ({ page }) => {
  await setCookiesScenario(page, 'privacyMinimal', {
    replacements: {
      '#COOKIE_DOMAIN#': '.example.com',
    },
  });
  await page.goto('/');
});
```

When used with locale-aware fixtures/page objects, replacements can come from runtime env resolution:

```ts
await setCookiesScenario(page, 'privacyMinimal', {
  replacements: {
    '#COOKIE_DOMAIN#': envByLocale('COOKIE_DOMAIN'),
  },
});
```

For injecting individual cookies instead of scenarios, see **[Set Cookies](./setCookies.md)**.
