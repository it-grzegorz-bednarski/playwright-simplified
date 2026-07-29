# Fixtures Strategy

← [Back to main documentation](../README.md)

## Overview

This project uses one shared loader: `loadFixtureWithReplacements(...)` from `utils/fixtures.ts`.
It supports JSON fixtures and optional placeholder replacements.

---

## Configuration

Use this split to keep tests predictable:

- `fixtures/intercepts/**` - mock HTTP responses for `replaceIntercept(...)`.
- `fixtures/api/**` - API request/response fixture files used by `bodyFixture` and JSON fixture assertions.
- `data/**` - domain test data and assertion templates not tied to intercept mocking.

Placeholder convention:

- Use `%UPPER_SNAKE_CASE%` tokens, for example `%TITLE%`, `%USER_ID%`.
- Pass replacements from the test, for example `replace: { '%TITLE%': title }`.

Runtime behavior:

- If a replacement is provided, matching placeholders are replaced.
- If a replacement is missing, placeholder text stays unchanged (no automatic fail-fast).

---

## Usage

### 1) API body fixture + replacements

```ts
const res = await api.post('/products/add', {
  bodyFixture: 'api/dummyjson/products/createWithPlaceholder.POST.json',
  replace: { '%TITLE%': 'Dynamic Title' },
});
```

### 2) replaceIntercept + dynamic values

```ts
await replaceIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN, 'userGreeting.json', {
  replacements: {
    '%USER_NAME%': 'Alice',
    '%TODAY_DATE%': today,
  },
});
```

### 3) direct loader usage

```ts
const payload = loadFixtureWithReplacements('fixtures/intercepts/userGreeting.json', {
  '%USER_NAME%': 'Alice',
});
```

---

## Related docs

- [API Fixtures](./api/apiFixtures.md)
- [Replace Intercept](./replaceIntercept.md)
- [Data](./data.md)

