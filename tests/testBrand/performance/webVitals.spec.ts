import { test } from '@pom/theInternet/pageFixture';
import { runWebVitals } from '@utils/webVitals/webVitals';

test.describe('quality checks - core web vitals', { tag: ['@testBrand', '@coreWebVitals'] }, () => {
  test.setTimeout(60_000);

  test('checkboxesPage - flip both checkboxes (observational)', async ({
    page,
    checkboxesPage,
  }) => {
    await runWebVitals(page, checkboxesPage, 'checkboxes-flipBothCheckboxes', {
      thresholds: {},
      interactionActionName: 'flipBothCheckboxes',
    });
  });

  test('checkboxesPage - practical thresholds on LCP + TTFB', async ({ page, checkboxesPage }) => {
    await runWebVitals(page, checkboxesPage, 'checkboxes-practical-thresholds', {
      thresholds: {
        LCP: 8000, // herokuapp.com is slow; generous threshold for stable CI runs
        TTFB: 5000, // herokuapp.com is slow; generous threshold for stable CI runs
      },
      interactionActionName: 'flipBothCheckboxes',
    });
  });

  test('addRemoveElementsPage - add and remove element (assert CLS only)', async ({
    page,
    addRemoveElementsPage,
  }) => {
    await runWebVitals(page, addRemoveElementsPage, 'addRemoveElements-addAndRemove', {
      thresholds: {
        CLS: 0.1,
      },
      interactionActionName: 'addAndRemoveElement',
    });
  });
});
