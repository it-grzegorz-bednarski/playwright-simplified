import { expect, request as playwrightRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { loadFixtureWithReplacements } from '@utils/fixtures';
import { applyReplacementsDeep, buildQueryString } from './replacements';
import { logApiEvent } from './logger';
import {
  expectBodyContains,
  expectBodyNotContains,
  expectArrayExactLength,
  expectArrayMinLength,
  expectArrayMaxLength,
  expectJsonHasKeys,
  expectJsonMatches,
  expectJsonMissingKeys,
  expectJsonNotMatches,
  getByPath,
  expectJsonExact,
  expectJsonSubset,
} from './assertions';
import type {
  ApiConfig,
  ApiFixtureRequestDefinition,
  ApiProfileOverrides,
  ApiRequestOptions,
  ApiResponse,
  HttpMethod,
} from './types';

const isFullUrl = (url: string) => /^https?:\/\//i.test(url);

function mergeHeaders(
  base: Record<string, string | undefined>,
  extra?: Record<string, string | undefined>
): Record<string, string> {
  const merged: Record<string, string | undefined> = { ...base, ...(extra ?? {}) };
  return Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined)) as Record<
    string,
    string
  >;
}

function resolveHeaders(
  cfg: ApiConfig,
  sessionMeta?: Record<string, string>,
  overrides?: ApiProfileOverrides
): Record<string, string> {
  const resolved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(cfg.headers ?? {})) {
    resolved[k] = typeof v === 'function' ? v({ env: process.env, sessionMeta }) : v;
  }
  return mergeHeaders(resolved, overrides?.headers);
}

/**
 * Thin wrapper around Playwright APIRequestContext.
 * Supports config defaults, optional overrides, fixtures + replacements, and response assertions.
 */
export class ApiClient {
  private readonly config: ApiConfig;
  private readonly overrides?: ApiProfileOverrides;
  private readonly sessionMeta?: Record<string, string>;
  private ctx: APIRequestContext | undefined;

  /**
   * @param args.config - Loaded API config.
   * @param args.overrides - Optional per-suite overrides (baseURL/headers).
   * @param args.sessionMeta - Optional session meta used by header resolvers.
   */
  constructor(args: {
    config: ApiConfig;
    overrides?: ApiProfileOverrides;
    sessionMeta?: Record<string, string>;
  }) {
    this.config = args.config;
    this.overrides = args.overrides;
    this.sessionMeta = args.sessionMeta;
  }

  private async getContext(): Promise<APIRequestContext> {
    if (!this.ctx) {
      this.ctx = await playwrightRequest.newContext({
        baseURL: this.overrides?.baseURL ?? this.config.baseURL,
        timeout: this.config.timeoutMs,
      });
    }
    return this.ctx;
  }

  /**
   * Dispose underlying Playwright request context.
   * Call after test (the `api` fixture does this automatically).
   */
  async dispose() {
    await this.ctx?.dispose();
    this.ctx = undefined;
  }

  /**
   * Build requests from a request fixture containing `{ endpoint, headers? }`.
   * Fixture headers are merged with config headers (and can be overridden per call).
   *
   * @param requestFixturePath - Path under `fixtures/` (e.g. `api/publicRequest.json`).
   * @param replacements - Optional placeholder replacements for the fixture.
   *
   * @example
   * const res = await api
   *   .fromFixture('api/publicRequest.json', { '%ENDPOINT%': '/products/1' })
   *   .get();
   */
  fromFixture(requestFixturePath: string, replacements?: Record<string, string | number>) {
    const def = loadFixtureWithReplacements(
      requestFixturePath,
      replacements
    ) as ApiFixtureRequestDefinition;
    if (!def?.endpoint) {
      throw new Error(`Missing 'endpoint' in request fixture: ${requestFixturePath}`);
    }

    const fixtureHeaders = def.headers ?? {};
    const endpoint = def.endpoint;

    return {
      get: (opts?: Omit<ApiRequestOptions, 'body' | 'bodyFixture'>) =>
        this.request('GET', endpoint, {
          ...opts,
          headers: { ...fixtureHeaders, ...(opts?.headers ?? {}) },
        }),
      delete: (opts?: Omit<ApiRequestOptions, 'body' | 'bodyFixture'>) =>
        this.request('DELETE', endpoint, {
          ...opts,
          headers: { ...fixtureHeaders, ...(opts?.headers ?? {}) },
        }),
      post: (opts?: ApiRequestOptions) =>
        this.request('POST', endpoint, {
          ...opts,
          headers: { ...fixtureHeaders, ...(opts?.headers ?? {}) },
        }),
      put: (opts?: ApiRequestOptions) =>
        this.request('PUT', endpoint, {
          ...opts,
          headers: { ...fixtureHeaders, ...(opts?.headers ?? {}) },
        }),
      patch: (opts?: ApiRequestOptions) =>
        this.request('PATCH', endpoint, {
          ...opts,
          headers: { ...fixtureHeaders, ...(opts?.headers ?? {}) },
        }),
    };
  }

  /** Convenience GET (no body). @param pathOrUrl - Relative path or full URL. */
  get(pathOrUrl: string, opts?: Omit<ApiRequestOptions, 'body' | 'bodyFixture'>) {
    return this.request('GET', pathOrUrl, opts);
  }
  /** Convenience DELETE (no body). @param pathOrUrl - Relative path or full URL. */
  delete(pathOrUrl: string, opts?: Omit<ApiRequestOptions, 'body' | 'bodyFixture'>) {
    return this.request('DELETE', pathOrUrl, opts);
  }
  /** Convenience POST. @param pathOrUrl - Relative path or full URL. */
  post(pathOrUrl: string, opts?: ApiRequestOptions) {
    return this.request('POST', pathOrUrl, opts);
  }
  /** Convenience PUT. @param pathOrUrl - Relative path or full URL. */
  put(pathOrUrl: string, opts?: ApiRequestOptions) {
    return this.request('PUT', pathOrUrl, opts);
  }
  /** Convenience PATCH. @param pathOrUrl - Relative path or full URL. */
  patch(pathOrUrl: string, opts?: ApiRequestOptions) {
    return this.request('PATCH', pathOrUrl, opts);
  }

  /**
   * Send HTTP request.
   *
   * @param method - HTTP method.
   * @param pathOrUrl - Relative path (uses config baseURL) or full URL.
   * @param opts - Optional headers/query/body/fixture + replacements.
   */
  async request(
    method: HttpMethod,
    pathOrUrl: string,
    opts?: ApiRequestOptions
  ): Promise<ApiResponse> {
    const api = await this.getContext();

    const baseHeaders = resolveHeaders(this.config, this.sessionMeta, this.overrides);
    const headers = mergeHeaders(baseHeaders, opts?.headers);

    let body: any = undefined;
    if (opts?.bodyFixture) {
      const fixtureBody = loadFixtureWithReplacements(opts.bodyFixture);
      body = applyReplacementsDeep(fixtureBody, opts.replace);
    } else if (opts && 'body' in opts) {
      body = applyReplacementsDeep(opts.body, opts.replace);
    }

    const qs = buildQueryString(opts?.query);
    const target = pathOrUrl + qs;

    const start = Date.now();
    const response = await api.fetch(target, {
      method,
      headers,
      data: body,
      failOnStatusCode: opts?.failOnStatusCode ?? false,
    });
    const durationMs = Date.now() - start;

    const status = response.status();
    const respHeaders = response.headers();

    let json: any = undefined;
    let text: string | undefined = undefined;

    const ctype = respHeaders['content-type'];
    if (ctype?.includes('application/json')) {
      try {
        json = await response.json();
      } catch {}
    } else {
      try {
        text = await response.text();
      } catch {}
    }

    const base = this.overrides?.baseURL ?? this.config.baseURL ?? '';
    const printableUrl = isFullUrl(target) ? target : `${base}${target}`;

    if (this.config.log) {
      logApiEvent({
        method,
        url: printableUrl,
        status,
        durationMs,
        requestHeaders: headers,
        requestBody: body,
        responseHeaders: respHeaders,
        responseBody: json ?? text,
      });
    }

    return {
      status,
      headers: respHeaders,
      json,
      text,
      raw: response,
      expectStatus: async (expected: number) => {
        expect(status, `Expected HTTP status ${expected} for ${method} ${target}`).toBe(expected);
      },
      expectJsonKeys: async (paths: string[]) => {
        expect(json, 'Expected JSON response (content-type application/json)').toBeDefined();
        expectJsonHasKeys(json, paths);
      },
      expectJsonMatches: async (pairs: Record<string, any>) => {
        expect(json, 'Expected JSON response (content-type application/json)').toBeDefined();
        expectJsonMatches(json, pairs);
      },
      expectBodyContains: async (needle: string) => {
        expectBodyContains(json ?? text ?? '', needle);
      },
      expectJsonMissingKeys: async (paths: string[]) => {
        expect(json, 'Expected JSON response (content-type application/json)').toBeDefined();
        expectJsonMissingKeys(json, paths);
      },
      expectJsonNotMatches: async (pairs: Record<string, any>) => {
        expect(json, 'Expected JSON response (content-type application/json)').toBeDefined();
        expectJsonNotMatches(json, pairs);
      },
      expectBodyNotContains: async (needle: string) => {
        expectBodyNotContains(json ?? text ?? '', needle);
      },
      expectArrayMinLength: async (path: string, min: number) => {
        expect(json, 'Expected JSON response (content-type application/json)').toBeDefined();
        const val = getByPath(json, path);
        expectArrayMinLength(val, min, path);
      },
      expectArrayExactLength: async (path: string, exact: number) => {
        expect(json, 'Expected JSON response (content-type application/json)').toBeDefined();
        const val = getByPath(json, path);
        expectArrayExactLength(val, exact, path);
      },
      expectArrayMaxLength: async (path: string, max: number) => {
        expect(json, 'Expected JSON response (content-type application/json)').toBeDefined();
        const val = getByPath(json, path);
        expectArrayMaxLength(val, max, path);
      },
      expectJsonFixtureExact: async (
        fixturePath: string,
        replacements?: Record<string, string | number>
      ) => {
        expect(json, 'Expected JSON response (content-type application/json)').toBeDefined();
        const expected = loadFixtureWithReplacements(fixturePath, replacements);
        expectJsonExact(json, expected);
      },
      expectJsonFixtureContains: async (
        fixturePath: string,
        replacements?: Record<string, string | number>
      ) => {
        expect(json, 'Expected JSON response (content-type application/json)').toBeDefined();
        const expected = loadFixtureWithReplacements(fixturePath, replacements);
        expectJsonSubset(json, expected);
      },
    };
  }
}

// Mark seldom-used public members as part of the public API.
// (These are used by consumers, but may be unused inside the framework repo.)
void ApiClient.prototype.fromFixture;
void ApiClient.prototype.patch;
void ApiClient.prototype.delete;
