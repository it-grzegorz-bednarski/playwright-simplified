import type { Request } from '@playwright/test';

/**
 * Gets the `Authorization: Bearer ...` header value from an intercepted request.
 *
 * @param requestPromise - Intercepted request (usually from `waitForIntercept(...)`).
 * @returns The full Authorization Bearer header string (e.g., "Bearer eyJ...").
 * @throws Error if the Authorization Bearer header is missing.
 *
 * @example
 * ```ts
 * const requestPromise = waitForIntercept(page, INTERCEPTS.USER_LOGIN);
 * // ...trigger the request...
 * const authHeader = await extractBearerAuthHeader(requestPromise);
 * // authHeader === "Bearer eyJ..."
 * ```
 */
export async function extractBearerAuthHeader(requestPromise: Promise<Request>): Promise<string> {
  const request = await requestPromise;
  const authHeader = request.headers()['authorization'] || '';

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing Authorization Bearer header');
  }

  return authHeader;
}
