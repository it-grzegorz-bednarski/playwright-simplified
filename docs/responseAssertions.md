# Response Assertions

← [Back to main documentation](../README.md)

## Overview

Guidelines and examples for asserting HTTP responses in Playwright tests.

In examples below responses are obtained from requests captured using **[waitForIntercept](./waitForIntercept.md)**.

---

## Responses

Common **`Response` fields and methods** used in tests, with examples.

### Getting the response

```typescript
const requestPromise = waitForIntercept(page, INTERCEPTS.API_DATA);
await page.goto('/');
const request = await requestPromise;

const response = await request.response();
```

### Response status

- **`response.status()`** – HTTP status code (e.g. `200`, `404`, `500`)

  ```typescript
  const requestPromise = waitForIntercept(page, INTERCEPTS.API_DATA);
  await page.goto('/');
  const request = await requestPromise;
  
  const response = await request.response();
  expect(response?.status()).toBe(200);
  ```

### Response body

- **`response.json()`** – parsed JSON body

  ```typescript
  const requestPromise = waitForIntercept(page, INTERCEPTS.USER_PROFILE);
  await page.goto('/profile');
  const request = await requestPromise;
  
  const response = await request.response();
  const responseBody = await response?.json();
  
  // Check field exists
  expect(responseBody.userId).toBeDefined();
  
  // Check specific value
  expect(responseBody.userName).toBe('John');
  ```

- **`response.text()`** – raw response body as string

  ```typescript
  const requestPromise = waitForIntercept(page, INTERCEPTS.HTML_PAGE);
  await page.goto('/terms');
  const request = await requestPromise;
  
  const response = await request.response();
  const responseText = await response?.text();
  
  // Check text contains substring
  expect(responseText).toContain('<title>Terms of Service</title>');
  
  // Check exact match (inline)
  expect(responseText).toBe('{"status":"ok"}');
  
  // Check exact match (from file)
  const expectedText = fs.readFileSync('fixtures/expected-response.txt', 'utf-8');
  expect(responseText).toBe(expectedText);
  ```

### Nested JSON structures

For complex, deeply nested responses, use optional chaining (`?.`) to safely access nested fields.

Example API response structure:

```json
[
  {
    "result": {
      "data": {
        "users": [
          {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "roles": ["admin", "editor"]
          },
          {
            "id": 2,
            "name": "Jane Smith",
            "email": "jane@example.com",
            "roles": ["user"]
          }
        ]
      }
    }
  }
]
```

Validating this structure:

```typescript
const requestPromise = waitForIntercept(page, INTERCEPTS.API_USERS);
await page.goto('/users');
const request = await requestPromise;

const response = await request.response();
const responseBody = await response?.json();

// Access nested object with optional chaining
const userName = responseBody[0]?.result?.data?.users?.[0]?.name;
expect(userName).toBeDefined();
expect(userName).toBe('John Doe');

// Validate array exists and has items
expect(responseBody[0]?.result?.data?.users).toBeInstanceOf(Array);
expect(responseBody[0]?.result?.data?.users?.length).toBeGreaterThan(0);

// Validate nested array item
const firstUser = responseBody[0]?.result?.data?.users?.[0];
expect(firstUser?.roles).toContain('admin');

// Check if any user matches condition
const users = responseBody[0]?.result?.data?.users || [];
const hasUserJohn = users.some(user => user?.name === 'John Doe');
expect(hasUserJohn).toBe(true);

// Find specific user by property
const adminUser = users.find(user => user?.roles?.includes('admin'));
expect(adminUser).toBeDefined();
expect(adminUser?.email).toBe('john@example.com');
```

