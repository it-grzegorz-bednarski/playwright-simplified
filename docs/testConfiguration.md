# Test Configuration

← [Back to main documentation](../README.md)

## Overview

Examples of configuring Playwright tests directly in test files (execution mode, per-test timeouts, retries).

---

## Execution modes

Run tests in a describe block **serially** instead of in parallel:

```ts
import { test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Sequential tests', () => {
  test('First test', async ({ page }) => {
    // runs first
  });

  test('Second test', async ({ page }) => {
    // runs after the first test completes
  });
});
```

Restore the default **parallel** mode explicitly if needed:

```ts
test.describe.configure({ mode: 'parallel' });
```

---

## Per-test timeouts

Set a custom timeout for a single test:

```ts
import { test } from '@playwright/test';

test('Long-running test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes for this test only

  await page.goto('/slow-page');
  // assertions
});
```

You can also configure timeouts for all tests in a describe block:

```ts
test.describe.configure({
  timeout: 60000, // 60 seconds per test in this block
});
```

---

## Retries in code

Configure retries for a group of tests in code:

```ts
import { test } from '@playwright/test';

test.describe.configure({
  retries: 2,
});

test.describe('Flaky tests', () => {
  test('API-dependent test', async ({ page }) => {
    await page.goto('/api-dependent');
  });
});
```

Retries can be combined with environment-based configuration (for example using `process.env.CI` to change behaviour in CI).

For global timeouts and retries applied to the whole project, see **[Playwright Config](./playwright-config.md)**.

---

## Focusing tests

Run only a specific test or describe block while developing or debugging:

```ts
import { test } from '@playwright/test';

test.only('runs only this test', async ({ page }) => {
  // test body
});

test.describe.only('focused suite', () => {
  test('runs as part of the focused suite', async ({ page }) => {
    // test body
  });
});
```

---

## Skipping tests

Skip individual tests or whole suites, optionally based on conditions:

```ts
import { test } from '@playwright/test';

// Unconditionally skip a single test

test.skip('temporarily skipped test', async ({ page }) => {
  // will not run
});

// Conditionally skip in CI

test('feature only for local runs', async ({ page }) => {
  test.skip(!!process.env.CI, 'Disabled on CI');
  // test body
});

// Mark a test as "fixme" to indicate a known issue

test.fixme(true, 'Known issue to be fixed later');
```

---

## Test steps

Group parts of a test into named steps to improve readability and reporting:

```ts
import { test } from '@playwright/test';

test('test with steps', async ({ page }) => {
  await test.step('open page', async () => {
    await page.goto('/');
  });

  await test.step('fill form', async () => {
    // interact with the page
  });
});
```

---

## Using env values in tests

Use values loaded from `env/.env.<env>` in tests.

### Global values via `process.env`

```ts
import { test, expect } from '@playwright/test';

test('shows environment-specific username', async ({ page }) => {
  await page.goto('/profile');

  const expectedUsername = process.env.USER1_USERNAME || '';

  await expect(page.locator('[data-test="profile-username"]')).toHaveText(expectedUsername);
});
```

### Locale-aware values via `envByLocale(...)`

Use `envByLocale(baseKey)` when the value depends on the current locale or brand-locale project.

```ts
import { test, expect } from '@utils/baseTest';

test('uses locale-aware env values', async ({ envByLocale }) => {
  const tenant = envByLocale('TENANT');
  const adminUsername = envByLocale('ADMIN_USERNAME');
  const baseUrl = envByLocale('BASE_URL');

  expect(tenant).toBeTruthy();
  expect(adminUsername).toBeTruthy();
  expect(baseUrl).toBeTruthy();
});
```

Combined with **[Environments](./environments.md)** and **[Multilang](./multilang.md)**, this lets you switch values per environment and per locale without changing test code.

For more advanced locale-aware fixtures, see **[baseTest](./baseTest.md)**.


