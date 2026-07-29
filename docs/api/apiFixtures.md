# API Fixtures

← [Back to API docs](./api.md)

## Overview
API fixtures should live under `fixtures/api/**`.

For global conventions (what goes to `fixtures/` vs `data/`, placeholder contract), see [Fixtures Strategy](../fixtures-strategy.md).

In tests, reference them by a path relative to `fixtures/` (for example: `api/users/create.POST.json`).

---

## Body fixtures

Use `bodyFixture` to load JSON from a fixture file.

Example body fixture file: `fixtures/api/dummyjson/products/create.POST.json`
```json
{
  "title": "Essence Mascara Lash Princess",
  "price": 9.99
}
```

Example test:
```ts
const res = await api.post('/products/add', {
  bodyFixture: 'api/dummyjson/products/create.POST.json',
});

await res.expectStatus(201);
```

---

## Placeholder replacements

Use `replace` to substitute placeholders inside fixture JSON.

Example body fixture file with placeholders: `fixtures/api/dummyjson/products/createWithPlaceholder.POST.json`
```json
{
  "title": "%TITLE%",
  "price": 9.99
}
```

Example test:
```ts
const title = 'Essence Mascara Lash Princess';

const res = await api.post('/products/add', {
  bodyFixture: 'api/dummyjson/products/createWithPlaceholder.POST.json',
  replace: { '%TITLE%': title },
});

await res.expectStatus(201);
```

Recommended conventions:
- Use placeholders like `%NAME%`, `%TITLE%`, `%ID%`.

---

## Expected-response fixtures

Expected-response fixtures are used by response assertions:
- `expectJsonFixtureExact(...)` - when you want strict 1:1 comparison.
- `expectJsonFixtureContains(...)` - compares only fields present in the fixture (response may contain extra fields).

Example expected fixture file: `fixtures/api/dummyjson/products/getProduct1.partial.expected.json`
```json
{
  "id": 1,
  "category": "beauty",
  "title": "Essence Mascara Lash Princess"
}
```

Example test:
```ts
await res.expectJsonFixtureContains('api/dummyjson/products/getProduct1.partial.expected.json');
```

