# Replace Intercept

← [Back to main documentation](../README.md)

## Overview

Utility for intercepting HTTP requests and responding with data loaded from JSON fixtures.

For shared fixture/path/placeholder rules, see [Fixtures Strategy](./fixtures-strategy.md).

---

## Configuration

For readability, you can centralize URL patterns in an `INTERCEPTS` map (see **[Intercepts](./intercepts.md)**) and pass `INTERCEPTS.SOME_KEY` as the `urlPattern` argument.

Fixture files are stored under `fixtures/intercepts/`.

Function signature:

- **`replaceIntercept(page, urlPattern, fixtureName, options?)`**
  - **`page`** – Playwright `Page`
  - **`urlPattern`** – wildcard string or `RegExp`
  - **`fixtureName`** – JSON file name or relative path under `fixtures/intercepts/` (e.g. `userList.json`)
  - **`options`** – optional configuration object
    - **`options.method`** – HTTP method to intercept. If omitted, **any** method will be intercepted.
    - **`options.statusCode`** – HTTP status code to return (default: `200`)
    - **`options.replacements`** – placeholder–value pairs for dynamic string replacement inside the fixture

---

## Fixture files

Example fixture in `fixtures/intercepts/userList.json`:

```json
{
  "data": [
    {
      "id": "user-123",
      "name": "Alice Example",
      "role": "Admin"
    },
    {
      "id": "user-456",
      "name": "Bob Demo",
      "role": "User"
    }
  ],
  "totalCount": 2
}
```

Placeholders like `%TODAY_DATE%` can also be used if you want to combine fixtures with dynamic values (see examples below).

---

## Usage

**Important:** Always call `replaceIntercept` **before** the action that triggers the request (e.g., `page.goto()`, `page.click()`). The mock must be set up before the request is made.

### Basic example

Mock response for a request matching a URL pattern using a static fixture.

> Note: if you don't pass `options.method`, the intercept will apply to **any** HTTP method.

```typescript
import { test, expect } from '@playwright/test';
import { replaceIntercept } from '@utils/replaceIntercept';
import { INTERCEPTS } from '@data/intercepts';

test('should display mocked users list', async ({ page }) => {
  await replaceIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN, 'userList.json');

  await page.goto('http://the-internet.herokuapp.com/login');

  await expect(page.locator('li').filter({ hasText: 'Alice Example' })).toBeVisible();

  await expect(page.locator('li').filter({ hasText: 'Bob Demo' })).toBeVisible();
});
```

### Dynamic values

Use placeholders in fixtures and replace them per test run:

Fixture (`fixtures/intercepts/userGreeting.json`):

```json
{
  "id": "user-123",
  "message": "Hello %USER_NAME%, today is %TODAY_DATE%"
}
```

Test:

```typescript
const today = new Date().toLocaleDateString('en-US');

await replaceIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN, 'userGreeting.json', {
  replacements: {
    '%USER_NAME%': 'Alice',
    '%TODAY_DATE%': today,
  },
});

await page.goto('http://the-internet.herokuapp.com/login');

await expect(page.locator(`text=Hello Alice, today is ${today}`)).toBeVisible();
```

### Status code change

Change the HTTP status code and response body using a fixture:

```typescript
await replaceIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN, 'userNotFound.json', {
  method: 'GET',
  statusCode: 404,
});
```

In this example, the original request is intercepted and a `404` response with the body from `userNotFound.json` is returned instead of the real server response.

---

## Debugging

### Verify the mock was applied

To confirm that `replaceIntercept` successfully mocked the request, add a `debug` flag to your fixture and log only mocked responses:

Example fixture (`fixtures/intercepts/mockData.json`):

```json
{
  "debug": true,
  "data": [
    {
      "id": 1,
      "name": "Test Item"
    }
  ]
}
```

Test:

```typescript
await replaceIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN, 'mockData.json');

page.on('response', async response => {
  try {
    const data = await response.json();
    if (data.debug) {
      console.log('✓ Mock applied:', response.url(), '| Status:', response.status());
    }
  } catch (e) {
    // Ignore non-JSON responses (images, CSS, etc.)
  }
});

await page.goto('http://the-internet.herokuapp.com/login');
```

If you see the `✓ Mock applied` log, your fixture was successfully used. Remove the `debug` flag from production fixtures.
