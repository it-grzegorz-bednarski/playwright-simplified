# API Response Assertions

← [Back to API docs](./api.md)

## Status

Checks the HTTP status code.

```ts
await res.expectStatus(200);
```

---

## JSON keys

Checks whether a JSON response contains (or is missing) the given keys. Dot-paths are supported.

Example test:
```ts
const res = await api.get('/products/1');
await res.expectStatus(200);

await res.expectJsonKeys(['id', 'title', 'dimensions.width']);
await res.expectJsonMissingKeys(['error', 'message']);
```

Example response (meets the checks above):
```json
{
  "id": 1,
  "title": "Essence Mascara Lash Princess",
  "dimensions": 
  {
    "width": 15.14,
    "height": 13.08
  }
}
```

---

## JSON matches / not matches

Checks whether selected JSON fields match (or do not match) expected values. Dot-paths are supported.

Example test:
```ts
const res = await api.get('/products/1');
await res.expectStatus(200);

await res.expectJsonMatches({
  id: 1,
  category: 'beauty',
  'dimensions.width': 15.14,
});

await res.expectJsonNotMatches({ category: 'electronics' });
```

Example response (meets the checks above):
```json
{
  "id": 1,
  "category": "beauty",
  "dimensions":
  { 
    "width": 15.14,
    "height": 13.08
  }
}
```

---

## Arrays

Checks array length (minimum / exact / maximum) for a JSON array field (dot-path supported).

Example test:
```ts
const res = await api.get('/products', { query: { limit: 5 } });
await res.expectStatus(200);

await res.expectArrayMinLength('products', 1);
await res.expectArrayMaxLength('products', 5);
```

Example response (meets the checks above):
```json
{
  "products": [
    { 
      "id": 1, 
      "name": "Product A"
    },
    { 
      "id": 2, 
      "name": "Product B"
    },
    { 
      "id": 3, 
      "name": "Product C"
    },
    { 
      "id": 4, 
      "name": "Product D"
    }
  ]
}
```

---

## Body contains / not contains

Checks raw response text (useful for non-JSON responses too).

Example test:
```ts
const res = await api.get('/products/1');
await res.expectStatus(200);

await res.expectBodyContains('"category":"beauty"');
await res.expectBodyNotContains('InternalError');
```

Example response snippet (meets the checks above):
```json
{
  "id": 1,
  "category": "beauty",
  "dimensions": 
  { 
    "width": 15.14,
    "height": 13.08
  }
}
```

---

## JSON fixture assertions

Compares JSON response with a JSON fixture under `fixtures/api/**`.

See fixture conventions: **[API fixtures](./apiFixtures.md)**.

### Exact (strict 1:1)

Strict equality (fails if response has extra/missing fields OR any field value differs).

Example test:
```ts
const res = await api.get('/products/1');
await res.expectStatus(200);

await res.expectJsonFixtureExact('api/dummyjson/products/getProduct1.full.expected.json');
```

Example fixture file: `fixtures/api/dummyjson/products/getProduct1.full.expected.json`
```json
{
  "id": 1,
  "title": "Essence Mascara Lash Princess",
  "category": "beauty",
  "price": 9.99
}
```

Example response (must match the fixture exactly):
```json
{
  "id": 1,
  "title": "Essence Mascara Lash Princess",
  "category": "beauty",
  "price": 9.99
}
```

### Contains (fixture fields only)

Compares only fields present in the fixture (response may contain extra fields).

Example test:
```ts
const res = await api.get('/products/1');
await res.expectStatus(200);

await res.expectJsonFixtureContains('api/dummyjson/products/getProduct1.full.partial.expected.json');
```

Example fixture file: `fixtures/api/dummyjson/products/getProduct1.full.partial.expected.json`
```json
{
  "id": 1,
  "title": "Essence Mascara Lash Princess",
  "dimensions":
  {
    "width": 15.14
  }
}
```

Example response (can contain extra fields):
```json
{
  "id": 1,
  "title": "Essence Mascara Lash Princess",
  "category": "beauty",
  "price": 9.99,
  "dimensions":
  {
    "width": 15.14,
    "height": 13.08
  }
}
```



