# Base Test

← [Back to main documentation](../README.md)

## Overview

`baseTest` is the shared test entrypoint used by domain fixtures.

Current version is multilang-aware and exposes locale fixtures used directly in tests.

---

## Configuration

Current implementation:

```ts
import { test as base, expect, type TestInfo } from '@playwright/test';
import { normalizeLocale, resolveLocaleScopedEnvValue } from './multilang';

type MultilangFixtures = {
  envByLocale: (baseKey: string) => string;
  dataByLocale: <TValue = unknown>(
    source: Record<string, TValue>,
    baseKey: string,
    fallbackLocale?: string
  ) => TValue;
  localeKey: string;
  tenant: string;
};

const test = base.extend<MultilangFixtures>({
  // localeKey, tenant, envByLocale fixtures
});

export { test, expect };
```

Exposed fixtures:

- `localeKey` - current locale project key (for example `pl`, `us`).
- `tenant` - tenant/full locale value resolved from metadata/env.
- `envByLocale(baseKey)` - resolves locale-scoped values (`USER`, `PASS`, `TENANT`, etc.).
- `dataByLocale(source, baseKey, fallbackLocale?)` - resolves locale-scoped data fields (`name_pl`, `name_de`, fallback `name`).

Exposed scope helpers:

- `session('USERKEY')` - enables session-aware context.
- `basicAuth()` / `basicAuth('USERKEY')` - enables context-level HTTP Basic Auth via `httpCredentials`.

`baseTest` also performs fail-fast validation for unknown locale-like routing tags.

---

## Usage

```ts
import { test, expect, basicAuth } from '@utils/baseTest';

test('uses locale-aware values', async ({ envByLocale }) => {
  const user = envByLocale('USER');
  const tenant = envByLocale('TENANT');

  expect(user).toBeTruthy();
  expect(tenant).toBeTruthy();
});

test('uses locale-aware data values', async ({ dataByLocale }) => {
  const product = {
    name_pl: 'Produkt 2',
    name_de: 'Produkt 2',
    name: 'Product 2',
  };

  const productName = dataByLocale(product, 'name', 'pl');
  expect(productName).toBeTruthy();
});

basicAuth();

test('uses context-level Basic Auth', async ({ page }) => {
  await page.goto('/');
});
```

For full locale/tag routing examples, see [Multilang](./multilang.md).
