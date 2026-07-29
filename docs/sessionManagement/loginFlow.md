# Login flow

← [Back to main documentation](../../README.md)
↑ [Back to Sessions](./sessions.md)

## Overview

This doc focuses on what you put inside the `loginFlow` function in your session login config file:

- `config/sessionLogin.<key>.ts`

The `loginFlow` is responsible for creating an authenticated browser state.
Keep selectors in your POM and call them from `loginFlow`.

In this project, `loginFlow` also gives you helpers like `resolveCreds` and `resolveValue`. For multi-locale projects you can also use `envByLocale`, `localeKey`, `brand`, and `tenant` when needed.

For how to select which login config is used (`sessionLoginKey`), see: **[Sessions](./sessions.md)**.

---

## UI login via POM helper (recommended)

Prefer calling a POM method (LoginPage/LoginComponent), so your loginFlow stays readable and reusable.

`Login` function from `login.page.ts`:

```ts
import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async login(username: string, password: string) {
    await this.page.goto('/login');
    await this.page.getByLabel('Username').fill(username);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
```

`sessionLogin` config calling the POM method:

```ts
import { LoginPage } from '../pom/<domain>/pages/login.page';

export const sessionLoginConfig = {
  async loginFlow({ page, userKey, resolveCreds }) {
    const { username, password } = resolveCreds(userKey);
    const loginPage = new LoginPage(page);
    await loginPage.login(username, password);
  },
};
```

---

## UI login without POM (not recommended)

You can log in directly in `loginFlow` without using POM.
Prefer the POM approach above when possible.

```ts
export const sessionLoginConfig = {
  async loginFlow({ page, userKey, resolveCreds }) {
    const { username, password } = resolveCreds(userKey);
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  },
};
```

---

## Multilocale (optional)

Use this only when login values differ by locale/project.

```ts
export const sessionLoginConfig = {
  async loginFlow({ userKey, saveMeta, resolveCreds, resolveValue }) {
    const { username, password } = resolveCreds(userKey);
    const apiUrl = resolveValue('API_URL');

    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const json = await res.json();
    saveMeta({ authHeader: `Bearer ${json.token}` });
  },
};
```

---

## Basic Auth

If your app is behind Basic Auth, configure it at test/describe scope.
The session manager creates the browser context with `httpCredentials`, so `loginFlow` can focus only on login steps.

See: **[Basic Auth](./basicAuth.md)** (how to configure context-level HTTP Basic Auth).

`loginFlow` stays focused on login only:

```ts
export const sessionLoginConfig = {
  async loginFlow({ page, userKey, resolveCreds }) {
    const { username, password } = resolveCreds(userKey);
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  },
};
```

Enable Basic Auth in test/describe scope:

```ts
import { test, session, basicAuth } from '@utils/baseTest';

session('ADMIN');
basicAuth('ADMIN');

test('example', async ({ page }) => {
  await page.goto('/');
});
```




