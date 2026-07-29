import type { ApiConfig } from '@utils/apiTool/types';

/**
 * API Config: dummyjson.guest
 *
 * Purpose:
 * - Public (no auth) endpoints for DummyJSON.
 *
 * Note:
 * - Uses API_URL from env (loaded by the repo testRunner/dotenv).
 */
export const apiConfig: ApiConfig = {
  // ---------------------------------------------------------------------------
  // Request defaults
  // ---------------------------------------------------------------------------

  baseURL: process.env.API_URL,
  timeoutMs: 30_000,
  log: false,

  // ---------------------------------------------------------------------------
  // Headers
  // ---------------------------------------------------------------------------

  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};

void apiConfig;
