import type { Page } from '@playwright/test';

export type PercySnapshotOptions = Record<string, unknown>;

type PercySnapshot = (page: Page, name: string, options?: PercySnapshotOptions) => Promise<void>;

// Percy ships runtime code; this thin wrapper keeps the test code typed even
// when the package does not provide TypeScript declarations in the local setup.

const percySnapshot = require('@percy/playwright') as PercySnapshot;

export default percySnapshot;
