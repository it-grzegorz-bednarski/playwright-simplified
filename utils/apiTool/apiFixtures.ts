import { ApiClient } from './client';
import { loadApiConfig } from './configLoader';
import type { ApiConfig, ApiProfileOverrides } from './types';

export type ApiFixtureOptions = {
  /**
   * Which API config to use.
   * Loaded by convention from: `config/apiConfig.<apiConfigKey>.ts`.
   */
  apiConfigKey?: string;

  /**
   * Optional API overrides at test/describe scope (exposed via wrapper `apiProfile`).
   */
  apiProfile?: ApiProfileOverrides;
};

export type ApiProfileOptions = {
  apiConfigKey?: string;
  apiProfile?: ApiProfileOverrides;
};

/**
 * Playwright fixtures for an `api` client.
 * Loads `config/apiConfig.<key>.ts` and provides a fresh client per test.
 */
export function createApiFixtures(opts?: { defaultApiConfigKey?: string }) {
  const defaultApiConfigKey = opts?.defaultApiConfigKey ?? 'default';

  const apiConfigKeyOption: [string, { option: true }] = [defaultApiConfigKey, { option: true }];
  const apiProfileOption: [ApiProfileOverrides | undefined, { option: true }] = [
    undefined,
    { option: true },
  ];

  return {
    apiConfigKey: apiConfigKeyOption,
    apiProfile: apiProfileOption,

    apiConfig: async (
      { apiConfigKey }: { apiConfigKey?: string },
      use: (cfg: ApiConfig) => Promise<void>
    ) => {
      const key = apiConfigKey ?? defaultApiConfigKey;
      const cfg = await loadApiConfig(key);
      await use(cfg);
    },

    api: async (
      {
        apiConfig,
        apiProfile,
        sessionMeta,
      }: {
        apiConfig: ApiConfig;
        apiProfile?: ApiProfileOverrides;
        sessionMeta?: Record<string, string>;
      },
      use: (client: ApiClient) => Promise<void>
    ) => {
      // Create a fresh client per test to avoid cross-test interference
      // when running with multiple workers.
      const client = new ApiClient({
        config: apiConfig,
        overrides: apiProfile,
        sessionMeta,
      });
      await use(client);
      await client.dispose();
    },
  };
}

/** Apply API config selection and/or overrides at test/describe scope. */
export function apiProfile(
  test: { use: (opts: { apiConfigKey?: string; apiProfile?: ApiProfileOverrides }) => void },
  opts: ApiProfileOptions
) {
  test.use({ apiConfigKey: opts.apiConfigKey, apiProfile: opts.apiProfile });
}
