import { test } from '@pom/theInternet/pageFixture';

// Dedicated demo tests for verifying status rendering in custom reporter.
test('reporter status demo - always passed', { tag: ['@testBrand', '@reporter'] }, async () => {
  // Intentionally passed.
});

test.skip(
  'reporter status demo - always skipped',
  { tag: ['@testBrand', '@reporter'] },
  async () => {
    // Intentionally skipped.
  }
);

test('reporter status demo - always failed', { tag: ['@testBrand', '@reporter'] }, async () => {
  throw new Error('Intentional reporter demo failure.');
});

test(
  'reporter status demo - in progress then passed',
  { tag: ['@testBrand', '@reporter'] },
  async () => {
    await new Promise(resolve => setTimeout(resolve, 5_000));
  }
);

test.describe('reporter status demo - flaky', { tag: ['@testBrand', '@reporter'] }, () => {
  test.describe.configure({ retries: 1 });

  test('reporter status demo - flaky (fail once, pass on retry)', async ({}, testInfo) => {
    if (testInfo.retry === 0) {
      throw new Error('Intentional first-run failure for flaky demo.');
    }
  });
});
