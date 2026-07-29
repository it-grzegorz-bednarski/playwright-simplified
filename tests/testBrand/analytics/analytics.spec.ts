import { test } from '@pom/theInternet/pageFixture';
import { checkAnalyticsEvent, initAnalyticsSpy } from '@utils/analytics';

test.describe('analytics checks', { tag: ['@testBrand', '@analytics'] }, () => {
  test('google analytics landing page served', async ({ page }) => {
    await initAnalyticsSpy(page);

    await page.goto('https://developers.google.com/analytics');
    await checkAnalyticsEvent(page, 'google_analytics_landingPage_served.json');
  });

  test('adobe analytics page viewed event', async ({ page }) => {
    await initAnalyticsSpy(page);
    await page.goto('https://experienceleague.adobe.com/en/docs/analytics/implementation/home');
    await checkAnalyticsEvent(page, 'adobe_analytics_page_viewed.json');
  });
});
