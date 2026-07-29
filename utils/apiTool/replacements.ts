/**
 * Apply placeholder replacements to arbitrary JSON-like data.
 * Replaces all occurrences (global) using stringify -> replace -> parse.
 *
 * @param input - JSON-like input (object/array/primitive).
 * @param replacements - Map of placeholder -> value.
 * @returns Input with replacements applied (or original input on failure).
 *
 * @example
 * applyReplacementsDeep({ name: '%NAME%' }, { '%NAME%': 'John' }); // -> { name: 'John' }
 */
export function applyReplacementsDeep<T>(
  input: T,
  replacements?: Record<string, string | number>
): T {
  if (!replacements || Object.keys(replacements).length === 0) return input;

  try {
    let mutated = JSON.stringify(input);
    for (const [placeholder, value] of Object.entries(replacements)) {
      // Escape placeholder for regex
      const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      mutated = mutated.replace(new RegExp(escaped, 'g'), String(value));
    }
    return JSON.parse(mutated) as T;
  } catch {
    return input;
  }
}

/**
 * Build query string from key/value object.
 * Skips null/undefined values.
 *
 * @param query - Query object.
 * @returns Query string starting with `?` or empty string.
 *
 * @example
 * buildQueryString({ limit: 10, q: 'abc' }); // -> '?limit=10&q=abc'
 */
export function buildQueryString(query?: Record<string, any>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
