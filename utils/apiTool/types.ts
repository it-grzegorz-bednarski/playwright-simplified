export interface ApiConfig {
  /** Base URL for relative paths (optional if you always use full URLs). */
  baseURL?: string;

  /** Enable request/response logging to console. */
  log?: boolean;

  /** Request timeout in ms (passed to Playwright request context). */
  timeoutMs?: number;

  /** Default headers applied to every request. */
  headers?: Record<string, string | HeaderValueResolver>;
}

/**
 * Resolve a header value dynamically (from env and/or session meta).
 *
 * @param ctx.env - Process env.
 * @param ctx.sessionMeta - Session meta (if session fixtures are enabled).
 * @returns Header value or undefined (to omit the header).
 *
 * @example
 * const auth: HeaderValueResolver = ({ sessionMeta }) => sessionMeta?.authHeader;
 */
export type HeaderValueResolver = (ctx: {
  env: NodeJS.ProcessEnv;
  sessionMeta?: Record<string, string>;
}) => string | undefined;

export type ApiProfileOverrides = {
  /** Override/extend headers from config for a test/describe scope. */
  headers?: Record<string, string | undefined>;

  /** Override baseURL for a test/describe scope. */
  baseURL?: string;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  /** Per-request headers (merged with config headers). */
  headers?: Record<string, string | undefined>;

  /** Optional query parameters appended to the URL. */
  query?: Record<string, string | number | boolean | undefined | null>;

  /** Inline request body (object/string/etc). */
  body?: any;

  /** Load request body from fixture (path under `fixtures/`). */
  bodyFixture?: string;

  /** Placeholder replacements applied to body (global replacement). */
  replace?: Record<string, string | number>;

  /** Equivalent to Playwright's `failOnStatusCode` (default: false). */
  failOnStatusCode?: boolean;
}

/** Request fixture shape: `{ endpoint, headers? }`. */
export interface ApiFixtureRequestDefinition {
  endpoint: string;
  headers?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  /** Parsed JSON if content-type is JSON, else undefined. */
  json?: any;
  /** Raw text response (best effort). */
  text?: string;

  /** Underlying Playwright response for advanced use. */
  raw: Awaited<ReturnType<import('@playwright/test').APIRequestContext['fetch']>>;

  expectStatus(expected: number): Promise<void>;

  /** Asserts JSON has all key paths (dot notation, supports array indexes like `items.0.id`). */
  expectJsonKeys(paths: string[]): Promise<void>;

  /** Asserts JSON has multiple key:value pairs (dot notation paths). */
  expectJsonMatches(pairs: Record<string, any>): Promise<void>;

  /** Asserts response body (json or text) contains substring. */
  expectBodyContains(text: string): Promise<void>;

  /** Asserts JSON does NOT have any of the key paths. */
  expectJsonMissingKeys(paths: string[]): Promise<void>;

  /** Asserts JSON does NOT match the provided key:value pairs (per pair check). */
  expectJsonNotMatches(pairs: Record<string, any>): Promise<void>;

  /** Asserts response body (json or text) does NOT contain substring. */
  expectBodyNotContains(text: string): Promise<void>;

  /** Asserts an array at JSON path has length >= min. */
  expectArrayMinLength(path: string, min: number): Promise<void>;

  /** Asserts an array at JSON path has exact length. */
  expectArrayExactLength(path: string, exact: number): Promise<void>;

  /** Asserts an array at JSON path has length <= max. */
  expectArrayMaxLength(path: string, max: number): Promise<void>;

  /**
   * Loads expected JSON from fixture (with replacements) and asserts response JSON exactly equals it.
   * Strict match: fails on extra/missing fields.
   */
  expectJsonFixtureExact(
    fixturePath: string,
    replacements?: Record<string, string | number>
  ): Promise<void>;

  /**
   * Loads expected JSON from fixture (with replacements) and asserts response JSON contains it.
   * Partial match: extra fields in response are allowed.
   */
  expectJsonFixtureContains(
    fixturePath: string,
    replacements?: Record<string, string | number>
  ): Promise<void>;
}
