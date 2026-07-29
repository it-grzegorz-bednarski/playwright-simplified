# Request Assertions

← [Back to main documentation](../README.md)

## Overview

Guidelines and examples for asserting HTTP requests in Playwright tests.

In examples below requests are captured using **[waitForIntercept](./waitForIntercept.md)**.

---

## Requests

Common **`Request` fields and methods** used in tests, with examples.

### Request URL and method

- **`request.url()`** – full request URL

  ```typescript
  const requestPromise = waitForIntercept(page, INTERCEPTS.USER_LOGIN);
  await page.goto('/login');
  const request = await requestPromise;

  expect(request.url()).toContain('/orgUsers/');
  ```

- **`request.method()`** – HTTP method (e.g. `GET`, `POST`)

  ```typescript
  const requestPromise = waitForIntercept(page, INTERCEPTS.USER_LOGIN);
  await page.goto('/login');
  const request = await requestPromise;

  expect(request.method()).toBe('POST');
  ```

- **`request.resourceType()`** – request type (e.g. `xhr`, `fetch`)

  ```typescript
  const requestPromise = waitForIntercept(page, INTERCEPTS.USER_LOGIN);
  await page.goto('/login');
  const request = await requestPromise;

  expect(request.resourceType()).toBe('xhr');
  ```

### Request headers

- **`request.headers()`** – headers as key–value object

  ```typescript
  const requestPromise = waitForIntercept(page, INTERCEPTS.USER_LOGIN);
  await page.goto('/login');
  const request = await requestPromise;

  const headers = request.headers();
  expect(headers['x-correlation-id']).toBeDefined();
  expect(headers['authorization']).toContain('Bearer ');
  ```

### Request body

- **`request.postDataJSON()`** – parsed JSON payload (if body is JSON)

  ```typescript
  const requestPromise = waitForIntercept(page, INTERCEPTS.USER_LOGIN);
  await page.goto('/login');
  const request = await requestPromise;

  const payload = await request.postDataJSON();
  
  // Check field exists
  expect(payload.email).toBeDefined();
  
  // Check specific value
  expect(payload.email).toBe('test.user@example.com');
  ```

- **`request.postData()`** – raw request body as string (useful when payload is not JSON)

  ```typescript
  const requestPromise = waitForIntercept(page, INTERCEPTS.API_SEARCH);
  await page.goto('/search');
  const request = await requestPromise;

  const rawBody = request.postData();
  
  // Check text contains substring
  expect(rawBody).toContain('searchTerm=playwright');
  
  // Check exact match
  expect(rawBody).toBe('searchTerm=playwright&limit=10');
  ```

