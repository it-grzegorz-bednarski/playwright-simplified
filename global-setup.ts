import { existsSync, rmSync } from 'node:fs';
import { buildDir } from './playwright.config';

/**
 * Cleans the build folder before every Playwright run.
 */
export default async function globalSetup(): Promise<void> {
  if (existsSync(buildDir)) {
    rmSync(buildDir, { recursive: true, force: true });
  }
}
