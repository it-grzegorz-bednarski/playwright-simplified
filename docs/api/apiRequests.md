# API Requests

← [Back to API docs](./api.md)

## Supported methods

- `api.get(path, opts?)`
- `api.post(path, opts?)`
- `api.put(path, opts?)`
- `api.patch(path, opts?)`
- `api.delete(path, opts?)`

Each method returns `ApiResponse` with built-in assertions (see: **[API assertions](./apiAssertions.md)**).

---

## Request options (common)

- **`headers?: Record<string, string | undefined>`** - override/extend defaults.
- **`query?: Record<string, string | number | boolean | undefined>`** - query string.
- **`body?: any`** - inline JSON body.
- **`bodyFixture?: string`** - JSON fixture under `fixtures/`.
- **`replace?: Record<string, string | number>`** - placeholder replacements applied to fixture JSON.

### GET with query

```ts
const res = await api.get('/products/search', {
  query: { q: 'phone', limit: 3, skip: 0 },
});
await res.expectStatus(200);
```

### POST with inline body

```ts
const res = await api.post('/products/add', {
  body: { title: 'PW-inline', price: 9.99 },
});
await res.expectStatus(201);
```

### Override / remove a header

```ts
const res = await api.get('/auth/me', {
  headers: { Authorization: undefined },
});
await res.expectStatus(401);
```

### POST with a body fixture + replacements

```ts
const title = `PW-${Date.now()}`;
const res = await api.post('/products/add', {
  bodyFixture: 'api/dummyjson/products/create.POST.json',
  replace: { '%TITLE%': title },
});
await res.expectStatus(201);
```

---

## Fixtures + replacements

Fixtures are loaded from `fixtures/`.

- **Body fixtures**: use `bodyFixture: 'api/...json'`.
- **Expected-response fixtures**: see **[API fixtures](./apiFixtures.md)**.

`replace` applies placeholder replacements inside fixture JSON.

