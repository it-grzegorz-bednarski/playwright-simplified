# API (API tool)

← [Back to README](../../README.md)

## Overview

The API tool lets you send HTTP requests from tests using a simple `api` fixture.

It is designed for:
- API-only tests (no UI)
- hybrid tests (UI + API)
- projects with different auth schemes (Bearer, API keys, custom headers)

It integrates with the session tool via `sessionMeta`.

---

## Configuration

### API config files

API config is selected by key and loaded by convention from:

- `config/apiConfig.<key>.ts` (must export `apiConfig`)

Example keys:
- `dummyjson.guest`
- `dummyjson.authorized`

Example config file (guest / public API): `config/apiConfig.dummyjson.guest.ts`

```ts
import type { ApiConfig } from '@utils/apiTool/types';

export const apiConfig: ApiConfig = {
  // ---------------------------------------------------------------------------
  // Request defaults
  // ---------------------------------------------------------------------------

  baseURL: process.env.API_URL,
  timeoutMs: 30_000,
  log: false,

  // ---------------------------------------------------------------------------
  // Headers
  // ---------------------------------------------------------------------------

  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};
```

Example config file (authorized): `config/apiConfig.dummyjson.authorized.ts`

```ts
import type { ApiConfig } from '@utils/apiTool/types';
import { fromSessionMeta } from '@utils/apiTool/headerResolvers';

export const apiConfig: ApiConfig = {
  // ---------------------------------------------------------------------------
  // Request defaults
  // ---------------------------------------------------------------------------

  baseURL: process.env.API_URL,
  timeoutMs: 30_000,
  log: false,

  // ---------------------------------------------------------------------------
  // Headers (Authorization from session meta)
  // ---------------------------------------------------------------------------

  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: fromSessionMeta('authHeader'),
  },
};
```

> Tip: keep the value in `sessionMeta.authHeader` in the final format (for example `Bearer <token>`),
> so your tests do not need to add the `Bearer ` prefix manually.

### Selecting a config in tests

Select the API config using the helper:

- `apiProfile({ apiConfigKey: '...' })`

You can apply it at different scopes:

#### 1) Top-level (whole spec file)

```ts
import { test, apiProfile } from '@utils/baseTest';

apiProfile({ apiConfigKey: 'dummyjson.guest' });

test('GET /products/1', async ({ api }) => {
  const res = await api.get('/products/1');
  await res.expectStatus(200);
});
```

#### 2) Describe scope (`test.describe(...)`)

```ts
import { test, apiProfile } from '@utils/baseTest';

test.describe('DummyJSON guest suite', () => {
  apiProfile({ apiConfigKey: 'dummyjson.guest' });

  test('GET /products', async ({ api }) => {
    const res = await api.get('/products');
    await res.expectStatus(200);
  });
});
```

#### 3) Domain fixture default (POM)

Set a default once in your domain fixture:

```ts
// pom/<domain>/pageFixture.ts
import { test as baseTest } from '@utils/baseTest';

type Fixtures = {
  // ...your pages...
};

type Options = {
  apiConfigKey: string;
};

export const test = baseTest.extend<Fixtures & Options>({
  apiConfigKey: 'dummyjson.guest',

  // ...your pages...
});
```

See also:
- **[baseTest](../baseTest.md)** (usage patterns, including API config per scope)
- **[POM fixtures](../pageObjectModel/fixtures.md)** (how domain fixtures control defaults)

> For details (overrides, headers), see: **[Sending requests](./apiRequests.md)**.

---

## Minimal usage

### 1) Public API (no session)

```ts
import { test, apiProfile } from '@utils/baseTest';

apiProfile({ apiConfigKey: 'dummyjson.guest' });

test('GET /products/1', async ({ api }) => {
  const res = await api.get('/products/1');
  await res.expectStatus(200);
});
```

### 2) Authorized API (session + auth header from session meta)

```ts
import { test, session, apiProfile } from '@utils/baseTest';

session('ADMIN', { sessionLoginKey: 'dummyjson' });
apiProfile({ apiConfigKey: 'dummyjson.authorized' });

test('GET /auth/me', async ({ api }) => {
  const res = await api.get('/auth/me');
  await res.expectStatus(200);
});
```

### 3) Override config per describe

```ts
import { test, apiProfile } from '@utils/baseTest';

test.describe('describe using different API config', () => {
  apiProfile({ apiConfigKey: 'dummyjson.guest' });

  test('example', async ({ api }) => {
    const res = await api.get('/products');
    await res.expectStatus(200);
  });
});
```

---

## Next topics

- **[Sending requests](./apiRequests.md)** - methods, headers, body, replacements, overrides
- **[Response assertions](./apiAssertions.md)** - status, JSON keys, matches, fixtures (Exact/Contains)
- **[Fixtures](./apiFixtures.md)** - body fixtures + expected JSON fixtures + placeholders
