# Sessions

← [Back to main documentation](../../README.md)

## Overview

Sessions let you reuse an authenticated browser state between tests, so you don't have to log in every time.

How it works (high level):

- Sessions are stored under `build/sessions/<SESSION_LOGIN_KEY>__<USER_KEY>.session.json`.
- When multiple workers need the same session, a lock file (`build/sessions/<SESSION_LOGIN_KEY>__<USER_KEY>.lock`) ensures only one worker creates it.
- If the session file exists, it is reused; otherwise the first worker creates it while others wait.
- In multi-brand/multi-locale runs, session files are additionally isolated by project scope to avoid collisions between locales.

---

## Configuration

### 1) Provide credentials

See: **[Environments](../environments.md#per-brand-credentials)**.

### 2) Create `sessionLogin` configuration file

Create (or edit) `config/sessionLogin.default.ts`.

```ts
import type { SessionLoginConfig } from '../utils/sessionManager/loginTypes';

export const sessionLoginConfig: SessionLoginConfig = {
  // ---------------------------------------------------------------------------
  // Session save options (what will be persisted in build/sessions/*.session.json)
  // ---------------------------------------------------------------------------

  saveCookies: true,
  saveLocalStorage: true,
  saveSessionStorage: true,

  // ---------------------------------------------------------------------------
  // Login flow (creates the authenticated browser state)
  // ---------------------------------------------------------------------------

  async loginFlow({ page, userKey, saveMeta, resolveCreds }) {
    const { username, password } = resolveCreds(userKey);

    // ...your login steps...
    // await page.goto('/login');
    // await page.getByLabel('Username').fill(username);
    // await page.getByLabel('Password').fill(password);
    // await page.getByRole('button', { name: 'Sign in' }).click();

    // ---------------------------------------------------------------------------
    // Save additional session data (session meta)
    // ---------------------------------------------------------------------------

    // Example meta saves:
    // saveMeta({ authHeader: 'Bearer <token>' });
    // saveMeta({ userKey });
  },
};
```

#### 2.1) Session save options

These flags control what is stored in the session file.

- `saveCookies` - cookies from Playwright `storageState`
- `saveLocalStorage` - dumped `localStorage` values
- `saveSessionStorage` - dumped `sessionStorage` values

If you set any of them to `false`, that data will not be persisted.

```ts
export const sessionLoginConfig = {
  // ...existing code...

  saveCookies: true,
  saveLocalStorage: true,
  saveSessionStorage: true,

  // ...existing code...
};
```

#### 2.2) Login flow

The `loginFlow` is the function that creates the authenticated browser state.
Keep it short and prefer calling your POM helpers (LoginPage/LoginComponent) instead of keeping selectors here.

See: **[Login flow](./loginFlow.md)** (examples of implementing login, including Basic Auth).

```ts
export const sessionLoginConfig = {
  // ...existing code...

  async loginFlow({ page, userKey, saveMeta, resolveCreds }) {
    const { username, password } = resolveCreds(userKey);
    // ...login steps...
    // saveMeta({ userKey });
  },
};
```

#### 2.3) Session meta (optional)

Session meta is an optional key-value map stored alongside the session file.
Use it to persist extra values like auth headers, API keys, user ids, etc.

See: **[Session meta](./meta.md)** (configuration and usage in tests).

```ts
export const sessionLoginConfig = {
  // ...existing code...

  async loginFlow({ saveMeta }) {
    // ...login steps...

    // Save additional session data (meta)
    // saveMeta({ authHeader: 'Bearer <token>' });
    // saveMeta({ userId: '123' });
  },
};
```

#### 2.4) Multiple login configs (optional)

If you need more than one login flow, create additional files following: `config/sessionLogin.<key>.ts`.

If you call `session('USER_KEY')` without `sessionLoginKey`, the default config is used.

To override it for a specific spec/describe (rare):

```ts
import { test, session } from '@utils/baseTest';

session('ADMIN', { sessionLoginKey: 'second' });
```

This also affects the session file name on disk, so `default__ADMIN` and `second__ADMIN` are stored separately.

---

## Usage

### Single test

```ts
import { test, session } from '@utils/baseTest';

session('ADMIN');

test('example', async ({ page }) => {
  await page.goto('/');
});
```

### Single test behind HTTP Basic Auth

```ts
import { test, session, basicAuth } from '@utils/baseTest';

session('ADMIN');
basicAuth('ADMIN');

test('example', async ({ page }) => {
  await page.goto('/');
});
```

### Whole describe

```ts
import { test, session } from '@utils/baseTest';

test.describe('admin suite', () => {
  session('ADMIN');

  test('test 1', async ({ page }) => {
    await page.goto('/');
  });

  test('test 2', async ({ sessionMeta }) => {
    const authHeader = sessionMeta?.authHeader;
    // ...use authHeader...
  });
});
```

### Multilocale (optional)

Use this when tests run per locale/project and you need locale-scoped values.

```ts
import { test, session } from '@utils/baseTest';

session('ADMIN');

test('example', async ({ page, envByLocale }) => {
  await page.goto(envByLocale('BASE_URL'));
});
```

For locale-scoped values in `loginFlow`, see **[Multilocale](./loginFlow.md#multilocale-optional)**.

### Use a different login config (e.g. `sessionLogin.second.ts`)

```ts
import { test, session } from '@utils/baseTest';

// Overrides login flow for this scope (example: config/sessionLogin.second.ts)
session('ADMIN', { sessionLoginKey: 'second' });

test('example', async ({ page }) => {
  await page.goto('/');
});
```


