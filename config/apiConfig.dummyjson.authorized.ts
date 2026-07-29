import type { ApiConfig } from '@utils/apiTool/types';
import { fromSessionMeta } from '@utils/apiTool/headerResolvers';

/**
 * API Config: dummyjson.authorized
 *
 * Purpose:
 * - DummyJSON baseURL
 * - Adds Authorization header from session meta.
 * - Requires: sessionMeta.authHeader === 'Bearer ...'
 */
export const apiConfig: ApiConfig = {
  // ---------------------------------------------------------------------------
  // Request defaults
  // ---------------------------------------------------------------------------

  baseURL: process.env.API_URL,
  timeoutMs: 30_000,
  log: false,

  // ---------------------------------------------------------------------------
  // Headers (Authorization from session meta)
  // ---------------------------------------------------------------------------

  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: fromSessionMeta('authHeader'),
  },
};

void apiConfig;
