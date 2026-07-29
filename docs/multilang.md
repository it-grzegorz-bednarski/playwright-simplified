# Multi-Brand & Multi-Locale Setup

← [Back to main documentation](../README.md)

## Overview

This project uses a **BRANDS-based**, multi-locale setup:

- one env file per environment (`env/.env.<env>`),
- **multiple brands** defined in `BRANDS` list,
- each brand has its own **locales, URLs, and optional regional groups**,
- routing by **brand tags** (`@brandc`, `@brandb`) + **locale/group tags** (`@pl`, `@uk`, `@slavic`, `@rtl`),
- locale-aware values in tests via `envByLocale(...)`.

**Organization:**

- Single-locale example tests can live in **`tests/<singleBrandName>/`**.
- Multi-locale example tests can live in **`tests/<multiBrandName>/`**.
- Shared suites for a manual project can live in **`tests/<manualProjectName>/`** (for example `tests/<manualProjectName>/functional/`, `tests/<manualProjectName>/quality/`).

If a test has no brand tag, it runs across all brands. If it has no locale/group tag, it runs across all locales of that brand.

> Project creation is split into two parts: env-driven locale projects from `utils/projectsBuilder.ts` and manual projects added in `playwright.config.ts` (for example a manual project named `testBrand`).

---

## Configuration

### BRANDS list & per-brand setup

```env
ENVIRONMENT=dev
BRANDS=BRANDC,BRANDB
```

Each brand defines its own locales and configuration.

### Brand with Single Locale (BRANDC)

```env
BRANDC_LOCALES=US

BRANDC_BASE_URL_US=https://us.brandc.example.com
BRANDC_TENANT_US=en_US
ADMIN_USERNAME=single_admin
ADMIN_PASSWORD=single_password
BRANDC_ADMIN_USERNAME_US=demo_us_admin
BRANDC_ADMIN_PASSWORD_US=secret_us_admin
```

### Brand with Multiple Locales & Groups (BRANDB)

```env
BRANDB_LOCALES=PL,UK,DE,AR

BRANDB_TENANT_PL=pl_PL
BRANDB_BASE_URL_PL=https://dev.example.com/pl
BRANDB_ADMIN_USERNAME_PL=demo_pl_admin
BRANDB_ADMIN_PASSWORD_PL=secret_pl_admin

BRANDB_TENANT_UK=uk_UA
BRANDB_BASE_URL_UK=https://dev.example.com/uk
BRANDB_ADMIN_USERNAME_UK=demo_uk_admin
BRANDB_ADMIN_PASSWORD_UK=secret_uk_admin

# ... more locales ...

# Regional groups (app extracts group name, lowercases it for @<groupname> tag)
BRANDB_GROUP_SLAVIC=PL,UK
BRANDB_GROUP_RTL=AR

BRANDB_DISABLED_LOCALES=
BRANDB_LOCALE_OVERRIDE=
```

### What each part does

- `BRANDS` - comma-separated list of brand identifiers (e.g., `BRANDC`, `BRANDB`, `MOJASTRONA`).
- `<BRAND>_LOCALES` - comma-separated locale keys for this brand.
- `<BRAND>_BASE_URL_<KEY>` - required base URL per locale key.
- `<BRAND>_TENANT_<KEY>` - optional tenant/full locale code used by test logic.
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` - optional global fallback for single-locale auth.
- `<BRAND>_ADMIN_USERNAME_<KEY>`, `<BRAND>_ADMIN_PASSWORD_<KEY>` - optional locale credentials used by `resolveCreds('ADMIN')` with `envByLocale(...)`.
- `<BRAND>_GROUP_<NAME>` - locale group (e.g., `SLAVIC=PL,UK`). App extracts group name, lowercases it, uses as `@slavic` tag.
- `<BRAND>_DISABLED_LOCALES` / `<BRAND>_LOCALE_OVERRIDE` - per-brand execution controls.
- `<BRAND>_<KEY>` - any other per-brand configuration (for example analytics or integration keys).

For full env details, see [Environments](./environments.md).

---

## Tagging in Tests

- **Brand tag on test/describe:** `@brandc`, `@brandb` — which brand(s) this test runs for.
- **Locale tag on test/describe:** `@pl`, `@uk`, etc. — specific locales within a brand.
- **Group tag on test/describe:** `@slavic`, `@rtl` — regional groups within a brand.
- **Capability tags** (e.g., `@smoke`, `@regression`) are independent from brand/locale routing.

```ts
test.describe('Checkout', { tag: '@smoke' }, () => {
  test('BRANDC only', { tag: '@brandc' }, async () => {
    // Runs only for BRANDC
  });

  test('BRANDB PL only', { tag: ['@brandb', '@pl'] }, async () => {
    // Runs only for BRANDB on PL locale
  });

  test('BRANDB PL + UK (no group)', { tag: ['@brandb', '@pl', '@uk'] }, async () => {
    // Runs for BRANDB on PL and UK without using @slavic group
  });

  test('BRANDB Slavic (PL & UK)', { tag: ['@brandb', '@slavic', '@smoke'] }, async () => {
    // Runs for BRANDB on PL and UK (members of SLAVIC group)
  });
});
```

---

## Usage

Use `envByLocale(...)` from `utils/baseTest` to resolve current locale env values.
Use `dataByLocale(...)` from `utils/baseTest` to resolve current locale data fields.

### Generic test (runs on all brands & locales unless tagged)

```ts
import { test } from '@utils/baseTest';

test('global health check', async ({ page }) => {
  await page.goto('/');
});
```

### Brand-specific test

```ts
import { test } from '@utils/baseTest';

test('BRANDC login flow', { tag: '@brandc' }, async ({ page, envByLocale }) => {
  const baseUrl = envByLocale('BASE_URL');
  const adminUsername = envByLocale('ADMIN_USERNAME');

  await page.goto(baseUrl || '/');
  await page.getByLabel('Username').fill(adminUsername);
  // BRANDC-specific login logic...
});
```

### Multi-brand test with locale routing

```ts
import { test } from '@utils/baseTest';

test(
  'checkout (BRANDB PL & UK only)',
  { tag: ['@brandb', '@slavic'] },
  async ({ envByLocale, localeKey }) => {
    const adminUsername = envByLocale('ADMIN_USERNAME');
    const tenant = envByLocale('TENANT');

    console.log(`Running on ${localeKey}: admin=${adminUsername}, tenant=${tenant}`);
    // Checkout logic...
  }
);
```

### envByLocale usage

`envByLocale(baseKey)` resolves env values scoped to the current locale.

```ts
test('locale-specific config', async ({ envByLocale }) => {
  const adminUsername = envByLocale('ADMIN_USERNAME');
  const adminPassword = envByLocale('ADMIN_PASSWORD');
  const tenant = envByLocale('TENANT'); // Resolves BRANDC_TENANT_US or BRANDB_TENANT_PL, etc.
  const baseUrl = envByLocale('BASE_URL'); // Resolves BRANDC_BASE_URL_US or BRANDB_BASE_URL_PL, etc.

  console.log(adminUsername, adminPassword, tenant, baseUrl);
});
```

### dataByLocale usage

`dataByLocale(source, baseKey, fallbackLocale?)` resolves data fields scoped to the current locale.
The second parameter is an optional fallback locale (for example `pl`).
If neither current locale nor fallback locale key exists, resolver falls back to base key (for example `name`).

```ts
import { data } from '@data/brandb';

test('locale-specific product content', async ({ dataByLocale }) => {
  const product = data.products.product_2;

  const name = dataByLocale(product, 'name', 'pl');
  console.log(name);
});
```

---

## Routing Example

Assume:

- Brands: `BRANDC` (locales: `US`), `BRANDB` (locales: `PL`, `UK`, `AR`), groups in BRANDB: `@slavic` (PL, UK), `@rtl` (AR).

- `t1` no routing tag → runs on all brands, all locales.
- `t2` tag `@brandc` → runs only in BRANDC (on US locale).
- `t3` tags `@brandb + @pl` → runs only in BRANDB on PL locale.
- `t4` tags `@brandb + @slavic + @smoke` → runs in BRANDB on PL and UK.
- `t5` tag `@brandb + @rtl` → runs in BRANDB on AR locale.

Unknown routing tags do not fail fast at runtime. If a tag does not match any project routing tags, the test simply does not run for that project.

