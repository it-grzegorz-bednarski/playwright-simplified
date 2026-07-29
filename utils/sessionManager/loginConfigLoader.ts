import * as fs from 'fs';
import * as path from 'path';
import type { SessionLoginConfig } from './loginTypes';

/**
 * Builds an absolute path to a `config/sessionLogin.<key>.ts` file.
 *
 * @param sessionLoginKey - Login config key taken from the filename (e.g. `default`, `second`).
 */
function configTsFilePath(sessionLoginKey: string) {
  return path.resolve(process.cwd(), 'config', `sessionLogin.${sessionLoginKey}.ts`);
}

/**
 * Loads session login config by `sessionLoginKey`.
 *
 * Conventions:
 * - File name: `config/sessionLogin.<key>.ts`
 * - Named export: `sessionLoginConfig`
 * - If `sessionLoginKey` is not provided, `default` is used.
 *
 * @param sessionLoginKey - Login config key from the filename.
 * @returns Resolved `SessionLoginConfig`.
 *
 * @throws Error if the config file does not exist.
 * @throws Error if the module does not export `sessionLoginConfig`.
 *
 * @example
 * const cfg = await loadSessionLoginConfig('default');
 * await cfg.loginFlow({ page, userKey, saveMeta });
 */
export async function loadSessionLoginConfig(
  sessionLoginKey?: string
): Promise<SessionLoginConfig> {
  const key = sessionLoginKey ?? 'default';
  const filePath = configTsFilePath(key);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[sessionManager] Session login config not found for sessionLoginKey='${key}'. Expected file: ${filePath}`
    );
  }

  const mod = require(filePath) as { sessionLoginConfig?: SessionLoginConfig };

  const config = mod.sessionLoginConfig;
  if (!config) {
    throw new Error(
      `[sessionManager] Invalid session login config module for sessionLoginKey='${key}'. ` +
        `Expected named export: 'sessionLoginConfig'. File: ${filePath}`
    );
  }

  return config;
}
