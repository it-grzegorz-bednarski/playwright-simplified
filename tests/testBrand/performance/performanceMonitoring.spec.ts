import { test } from '@pom/theInternet/pageFixture';
import { runPerformanceMonitoring } from '@utils/performance/performanceMonitoring';

test.describe(
  'quality checks - performance monitoring',
  { tag: ['@testBrand', '@performanceMonitoring'] },
  () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(300_000);

    test('homePage - POM target', async ({ page, homePage }) => {
      await runPerformanceMonitoring(page, homePage, 'homePage');
    });
  }
);
