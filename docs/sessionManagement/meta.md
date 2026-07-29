# Session meta

← [Back to main documentation](../../README.md)
↑ [Back to Sessions](./sessions.md)

## Overview

Session meta is an optional key-value map stored alongside the session.
Use it to persist extra values like auth headers, API keys, user ids, etc.

You typically save meta values in your `config/sessionLogin.<key>.ts` (inside `loginFlow` via `saveMeta(...)`).

If your tests use `session('KEY')`, meta is exposed as `sessionMeta`.

---

## Bearer token (Authorization header)

See: **[Request auth helpers](./requestAuth.md)**.

### Configuration

Save a Bearer auth header (example: after intercepting a login request):

```ts
// config/sessionLogin.default.ts

export const sessionLoginConfig = {
  async loginFlow({ page, saveMeta }) {
    // ...login steps...

    const requestPromise = waitForIntercept(page, '/api/login');
    // ...actions that trigger request (e.g., await page.click('button[type="submit"]'))...
    const authHeader = await extractBearerAuthHeader(requestPromise);

    saveMeta({ authHeader });
  },
};
```

### Usage

```ts
import { test, session } from '@utils/baseTest';

session('ADMIN');

test('can use authHeader from session meta', async ({ sessionMeta }) => {
  const authHeader = sessionMeta?.authHeader;
  // ...use authHeader in API calls...
});
```

---

## API key / custom header

### Configuration

```ts
// config/sessionLogin.default.ts

export const sessionLoginConfig = {
  async loginFlow({ saveMeta }) {
    // ...login steps...
    const xFunctionsKey = process.env.X_FUNCTIONS_KEY || '';
    if (!xFunctionsKey) {
      throw new Error('Missing env var: X_FUNCTIONS_KEY');
    }

    saveMeta({ xFunctionsKey });
  },
};
```

### Usage

```ts
import { test, session } from '@utils/baseTest';

session('ADMIN');

test('can use x-functions-key from session meta', async ({ sessionMeta }) => {
  const xFunctionsKey = sessionMeta?.xFunctionsKey;
  // ...use xFunctionsKey in API calls...
});
```

---

## Custom value (dynamic)

### Configuration

```ts
// config/sessionLogin.default.ts

export const sessionLoginConfig = {
  async loginFlow({ page, saveMeta }) {
    // ...login steps...

    const requestPromise = waitForIntercept(page, '/api/login');
    // ...actions that trigger request (e.g., await page.click('button[type="submit"]'))...
    const request = await requestPromise;
    const customValue = request.headers()['x-user-id'] || '';

    if (!customValue) {
      throw new Error('Missing x-user-id header');
    }

    saveMeta({ customValue });
  },
};
```

### Usage

```ts
import { test, session } from '@utils/baseTest';

session('ADMIN');

test('can use customValue from session meta', async ({ sessionMeta }) => {
  const customValue = sessionMeta?.customValue;
  // ...use customValue in API calls or URLs...
});
```

---

## Do I need to change fixtures?

No additional fixture changes are required. `baseTest` already enables sessions and exposes `sessionMeta` when you use `session('KEY')`.


