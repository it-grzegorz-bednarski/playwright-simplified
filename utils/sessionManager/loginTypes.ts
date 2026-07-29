import { Page } from '@playwright/test';
import type { ResolvedCreds } from './envCreds';

/**
 * Helper used inside `loginFlow` to save extra data into the session file.
 *
 * You can save:
 * - a single key/value pair, or
 * - many values at once.
 *
 * @example
 * saveMeta('authHeader', 'Bearer ...');
 * saveMeta({ authHeader: 'Bearer ...', apiKey: 'xyz' });
 */
export type SaveMetaFn = {
  (key: string, value: string): void;
  (values: Record<string, string>): void;
};

/**
 * Context passed into `SessionLoginConfig.loginFlow(...)`.
 */
export interface SessionLoginFlowContext {
  page: Page;
  userKey: string;
  saveMeta: SaveMetaFn;
  localeKey?: string;
  brand?: string;
  tenant?: string;
  envByLocale?: (baseKey: string) => string;
  resolveCreds: (userKey: string) => ResolvedCreds;
  resolveValue: (baseKey: string) => string;
}

/**
 * Configuration for a single session login flow.
 * Implemented in files like: `config/sessionLogin.<key>.ts`.
 */
export interface SessionLoginConfig {
  saveCookies?: boolean;
  saveLocalStorage?: boolean;
  saveSessionStorage?: boolean;
  /**
   * Performs the UI login flow and optionally saves extra metadata via `saveMeta`.
   *
   * @example
   * loginFlow: async ({ page, userKey, saveMeta }) => {
   *   // ...login steps...
   *   saveMeta({ userKey });
   * }
   */
  loginFlow: (ctx: SessionLoginFlowContext) => Promise<void>;
}
