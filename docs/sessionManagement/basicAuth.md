# Basic Auth

← [Back to main documentation](../../README.md)
↑ [Back to Sessions](./sessions.md)

## Overview

Use HTTP Basic Authentication on Playwright context level (`httpCredentials`) via the `basicAuth` helper from `utils/baseTest`.

This avoids sending `Authorization: Basic ...` as a generic request header and reduces CORS/401 side effects on API calls.

---

## Configuration

Basic Auth credentials are read from `.env`.
See: **[Environments](../environments.md#basic-auth-naming-convention)**.

---

## Usage

#### 1) Global Basic Auth (per environment / domain)

Use this when the whole environment (or domain) is protected by the same Basic Auth credentials.

```ts
import { test, basicAuth } from '@utils/baseTest';

basicAuth();

test('example', async ({ page }) => {
  await page.goto('/');
});
```

#### 2) Per-user Basic Auth

Use this when Basic Auth credentials are provided per user key.

```ts
import { test, basicAuth } from '@utils/baseTest';

basicAuth('ADMIN');

test('example', async ({ page }) => {
  await page.goto('/');
});
```

#### 3) Locale-aware Basic Auth (optional)

Use this only when Basic Auth differs by locale/project.

```ts
import { test, basicAuth } from '@utils/baseTest';

basicAuth(); // locale-aware when BASICAUTH_* is defined per locale/project
// or: basicAuth('ADMIN');


test('example', async ({ page, envByLocale }) => {
  await page.goto(envByLocale('BASE_URL'));
});
```

