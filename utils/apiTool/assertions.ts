import { expect } from '@playwright/test';

/**
 * Read value from nested object using a dotted path (e.g. `a.b.0.c`).
 * Supports array indexes.
 *
 * @param obj - Source object.
 * @param path - Dotted path (supports indexes).
 *
 * @example
 * getByPath({ a: { items: [{ id: 1 }] } }, 'a.items.0.id'); // -> 1
 */
export function getByPath(obj: any, path: string): any {
  if (!path) return obj;
  const parts = path.split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    const idx = /^\d+$/.test(p) ? Number(p) : null;
    if (idx !== null && Array.isArray(cur)) {
      cur = cur[idx];
    } else {
      cur = cur[p];
    }
  }
  return cur;
}

/**
 * Assert that all provided paths exist in the JSON (value is not undefined).
 *
 * @param json - JSON response body.
 * @param paths - Dotted paths to validate.
 *
 * @example
 * expectJsonHasKeys(json, ['id', 'user.name', 'roles.0']);
 */
export function expectJsonHasKeys(json: any, paths: string[]) {
  for (const path of paths) {
    const val = getByPath(json, path);
    expect(val, `Expected JSON to have key: ${path}`).not.toBeUndefined();
  }
}

/**
 * Assert that JSON contains specific key:value pairs (supports dotted paths).
 *
 * @param json - JSON response body.
 * @param pairs - Map of dottedPath -> expectedValue.
 *
 * @example
 * expectJsonMatches(json, { id: 1, 'dimensions.width': 15.14 });
 */
export function expectJsonMatches(json: any, pairs: Record<string, any>) {
  for (const [path, expected] of Object.entries(pairs)) {
    const actual = getByPath(json, path);
    expect(
      actual,
      `Expected JSON '${path}' = ${JSON.stringify(expected)} (actual: ${JSON.stringify(actual)})`
    ).toEqual(expected);
  }
}

/**
 * Assert that all provided paths are missing in the JSON (value is undefined).
 *
 * @param json - JSON response body.
 * @param paths - Dotted paths that should NOT exist.
 *
 * @example
 * expectJsonMissingKeys(json, ['password', 'token']);
 */
export function expectJsonMissingKeys(json: any, paths: string[]) {
  for (const path of paths) {
    const val = getByPath(json, path);
    expect(val, `Expected JSON NOT to have key: ${path}`).toBeUndefined();
  }
}

/**
 * Assert that JSON key:value pairs are NOT equal (supports dotted paths).
 *
 * @param json - JSON response body.
 * @param pairs - Map of dottedPath -> value that must NOT match.
 *
 * @example
 * expectJsonNotMatches(json, { status: 'ERROR' });
 */
export function expectJsonNotMatches(json: any, pairs: Record<string, any>) {
  for (const [path, expected] of Object.entries(pairs)) {
    const actual = getByPath(json, path);
    expect(
      actual,
      `Expected JSON at '${path}' NOT to equal ${JSON.stringify(expected)}`
    ).not.toEqual(expected);
  }
}

/**
 * Assert that `value` is an array and has length >= min.
 *
 * @param value - Value at a JSON path.
 * @param min - Minimum expected length.
 * @param label - Message label (usually the path).
 *
 * @example
 * expectArrayMinLength(json.items, 1, 'items');
 */
export function expectArrayMinLength(value: any, min: number, label: string) {
  expect(Array.isArray(value), `${label} should be an array`).toBe(true);
  expect((value as any[]).length, `${label} length should be >= ${min}`).toBeGreaterThanOrEqual(
    min
  );
}

/**
 * Assert that `value` is an array and has length == exact.
 *
 * @param value - Value at a JSON path.
 * @param exact - Exact expected length.
 * @param label - Message label (usually the path).
 *
 * @example
 * expectArrayExactLength(json.roles, 3, 'roles');
 */
export function expectArrayExactLength(value: any, exact: number, label: string) {
  expect(Array.isArray(value), `${label} should be an array`).toBe(true);
  expect((value as any[]).length, `${label} length should be == ${exact}`).toBe(exact);
}

/**
 * Assert that `value` is an array and has length <= max.
 *
 * @param value - Value at a JSON path.
 * @param max - Maximum expected length.
 * @param label - Message label (usually the path).
 *
 * @example
 * expectArrayMaxLength(json.items, 10, 'items');
 */
export function expectArrayMaxLength(value: any, max: number, label: string) {
  expect(Array.isArray(value), `${label} should be an array`).toBe(true);
  expect((value as any[]).length, `${label} length should be <= ${max}`).toBeLessThanOrEqual(max);
}

/**
 * Assert that response body contains the given text (JSON is stringified).
 *
 * @param body - JSON or text body.
 * @param text - Substring that must appear in body.
 *
 * @example
 * expectBodyContains(json, '"category":"beauty"');
 */
export function expectBodyContains(body: any, text: string) {
  const asString = typeof body === 'string' ? body : JSON.stringify(body);
  expect(asString, `Expected body to contain '${text}'`).toContain(text);
}

/**
 * Assert that response body does NOT contain the given text (JSON is stringified).
 *
 * @param body - JSON or text body.
 * @param text - Substring that must NOT appear in body.
 *
 * @example
 * expectBodyNotContains(json, 'THIS_TEXT_SHOULD_NOT_EXIST');
 */
export function expectBodyNotContains(body: any, text: string) {
  const asString = typeof body === 'string' ? body : JSON.stringify(body);
  expect(asString, `Expected body NOT to contain '${text}'`).not.toContain(text);
}

/**
 * Assert that `actual` deep-equals `expected` (strict: no extra/missing fields).
 *
 * @param actual - Actual JSON.
 * @param expected - Expected JSON.
 */
export function expectJsonExact(actual: any, expected: any) {
  expect(actual, 'Expected JSON response to exactly equal the expected fixture JSON').toEqual(
    expected
  );
}

/**
 * Assert that `actual` contains at least `expected` structure/values (extra fields allowed).
 *
 * @param actual - Actual JSON.
 * @param expected - Expected JSON subset.
 */
export function expectJsonSubset(actual: any, expected: any) {
  expect(actual, 'Expected JSON response to contain the expected fixture JSON').toMatchObject(
    expected
  );
}
