# Data

← [Back to main documentation](../README.md)

## Overview

Central place for shared test data (users, products, etc.) to keep specs clean and avoid duplicated hardcoded values (IDs, emails, SKUs).

---

## Configuration

This framework doesn't ship with a built-in `data` module.
If you want centralized, typed test data, create it in your project (commonly as `data/data.ts`).

If values differ between environments (dev/stg), define separate datasets and export the one matching `process.env.ENV`.

Example (`data/data.ts`):

```ts
const dev = {
  users: {
    user_1: {
      email: 'user_1.dev@example.com',
      password: 'devPass123',
    },
    user_2: {
      email: 'user_2.dev@example.com',
      password: 'devPass123',
    },
  },
  products: {
    product_1: {
      id: 'dev-123',
      name_pl: 'Produkt 1 [DEV]',
      name_de: 'Produkt 1 [DEV DE]',
      name: 'Product 1 [DEV]',
    },
    product_2: {
      id: 'dev-456',
      name_pl: 'Produkt 2 [DEV]',
      name_de: 'Produkt 2 [DEV DE]',
      name: 'Product 2 [DEV]',
    },
  },
} as const;

const stg = {
  users: {
    user_1: {
      email: 'user_1.stg@example.com',
      password: 'stgPass123',
    },
    user_2: {
      email: 'user_2.stg@example.com',
      password: 'stgPass123',
    },
  },
  products: {
    product_1: {
      id: 'stg-123',
      name_pl: 'Produkt 1 [STG]',
      name_de: 'Produkt 1 [STG DE]',
      name: 'Product 1 [STG]',
    },
    product_2: {
      id: 'stg-456',
      name_pl: 'Produkt 2 [STG]',
      name_de: 'Produkt 2 [STG DE]',
      name: 'Product 2 [STG]',
    },
  },
} as const;

const byEnv = {
  dev,
  stg,
  qa: stg, // QA uses same data as staging
  local: dev, // local uses dev data
} as const;

type EnvKey = keyof typeof byEnv;
const env = process.env.ENV as EnvKey;

export const data = byEnv[env];
```

For multi-brand projects, keep PL-like env selection but split data by brand.

Example (`data/brandb/*.ts`):

```ts
// data/brandb/dev.ts
export const dev = {
  products: {
    product_2: {
      id: 'dev-456',
      name_pl: 'Produkt 2 [DEV]',
      name_de: 'Produkt 2 [DEV DE]',
      name: 'Product 2 [DEV]',
    },
  },
} as const;

// data/brandb/stg.ts
export const stg = {
  products: {
    product_2: {
      id: 'stg-456',
      name_pl: 'Produkt 2 [STG]',
      name: 'Product 2 [STG]',
    },
  },
} as const;

// data/brandb/index.ts
import { dev } from './dev';
import { stg } from './stg';

const byEnv = { dev, stg, qa: stg, local: dev } as const;
type EnvKey = keyof typeof byEnv;
const env = (process.env.ENV || 'dev') as EnvKey;

export const data = byEnv[env];
```

---

## Usage

```ts
import { data } from '@data/brandb';
import { test } from '@utils/baseTest';

test('uses locale-aware data values', async ({ page, dataByLocale }) => {
  const product_2 = data.products.product_2;

  // Second parameter is fallback locale (here: PL).
  // If both locale and fallback are missing, resolver falls back to "name".
  const productName = dataByLocale(product_2, 'name', 'pl');

  await page.goto(`/products/${product_2.id}/details`);
  await page.getByRole('heading', { name: productName }).isVisible();
});
```

`dataByLocale(source, baseKey, fallbackLocale?)` lookup order:

1. `<baseKey>_<currentLocale>`
2. `<baseKey>_<fallbackLocale>` (if provided as second parameter)
3. `<baseKey>`

If `fallbackLocale` is not provided, step 2 is skipped.

