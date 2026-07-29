import { test } from '@pom/theInternet/pageFixture';
import { runPerformanceTest } from '@utils/performance/performanceTest';

test.describe(
  'quality checks - performance test',
  { tag: ['@testBrand', '@performanceTest'] },
  () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180_000);

    test('homePage - POM target', async ({ page, homePage }) => {
      await runPerformanceTest(page, homePage, 'homePageFromPOM');
    });
  }
);
