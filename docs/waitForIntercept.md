# Wait for Intercept

← [Back to main documentation](../README.md)

## Overview

Utility for waiting on specific HTTP requests and returning the matched `Request`.

---

## Configuration

You can pass a wildcard string or a `RegExp` as `urlPattern`.
For readability, keep patterns in a shared `INTERCEPTS` map (see **[Intercepts](./intercepts.md)**).

Function signature:

- **`waitForIntercept(page, urlPattern, options?)`**
  - **`page`** - Playwright `Page`
  - **`urlPattern`** - wildcard string or `RegExp`
  - **`options`** - optional configuration object
    - **`options.timeout`** - timeout in milliseconds passed to `page.waitForRequest`
    - **Default timeout** - if `options.timeout` is not provided, Playwright uses its default request timeout from your Playwright configuration

---

## Usage

Basic example - wait for a request triggered by navigation:

```typescript
import { waitForIntercept } from '../utils/waitForIntercept';
import { INTERCEPTS } from '../data/intercepts';

const requestPromise = waitForIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN);
await page.goto('http://the-internet.herokuapp.com/login');
const request = await requestPromise;

await expect(request.method()).toBe('GET');
```

**Important:** Always create the promise **before** triggering the action. This prevents race conditions.

Example with custom timeout:

```typescript
const requestPromise = waitForIntercept(page, INTERCEPTS.THE_INTERNET_HOME, {
  timeout: 10000,
});
await page.goto('http://the-internet.herokuapp.com/');
const request = await requestPromise;
```

Example with RegExp:

```typescript
const requestPromise = waitForIntercept(page, /\/the-internet\.herokuapp\.com\/login/);
await page.goto('http://the-internet.herokuapp.com/login');
const request = await requestPromise;
```

---

## Debugging

### Verify the intercept was captured

To confirm that `waitForIntercept` captured the request, log request details:

```typescript
const requestPromise = waitForIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN);
await page.goto('http://the-internet.herokuapp.com/login');
const request = await requestPromise;

console.log('Request intercepted:', request.url());
console.log('Method:', request.method());
console.log('Resource type:', request.resourceType());
```

If logs are printed, the intercept worked. If the test times out before logs appear,
the pattern likely did not match or the request was never triggered.

### Check URL pattern matching

To inspect all outgoing requests and compare them with your pattern:

```typescript
page.on('request', request => {
  console.log('Request fired:', request.url());
});

const requestPromise = waitForIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN);
await page.goto('http://the-internet.herokuapp.com/login');
const request = await requestPromise;
console.log('Request intercepted:', request.url());
```

Compare the logged URL with your intercept pattern. The intercepted URL should appear
in both logs.
