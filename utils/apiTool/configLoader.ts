import * as fs from 'fs';
import * as path from 'path';
import type { ApiConfig } from './types';

/**
 * Resolve absolute path to `config/apiConfig.<key>.ts`.
 *
 * @param apiConfigKey - Config key taken from filename.
 */
function configTsFilePath(apiConfigKey: string) {
  return path.resolve(process.cwd(), 'config', `apiConfig.${apiConfigKey}.ts`);
}

/**
 * Load API config by key.
 * Convention: `config/apiConfig.<key>.ts` exporting `apiConfig`.
 *
 * @param apiConfigKey - Config key (e.g. `dummyjson.guest`).
 * @returns Resolved ApiConfig.
 *
 * @throws If the config file does not exist.
 * @throws If the module does not export `apiConfig`.
 *
 * @example
 * const cfg = await loadApiConfig('dummyjson.guest');
 */
export async function loadApiConfig(apiConfigKey: string): Promise<ApiConfig> {
  // Convention: config/apiConfig.<key>.ts exporting `apiConfig`
  const filePath = configTsFilePath(apiConfigKey);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Failed to load API config for key '${apiConfigKey}'. Expected file: ${filePath}`
    );
  }

  // Use require() for compatibility with ts-node/CommonJS execution.
  const mod = require(filePath) as { apiConfig?: ApiConfig };
  const cfg = mod.apiConfig;

  if (!cfg) {
    throw new Error(`Missing export 'apiConfig' in config/apiConfig.${apiConfigKey}.ts`);
  }

  return cfg;
}
