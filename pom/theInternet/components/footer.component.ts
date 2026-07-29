import { Page, expect } from '@playwright/test';

export class FooterComponent {
  constructor(private page: Page) {}

  container = this.page.locator('#page-footer');
  poweredByLink = this.container.getByRole('link', { name: 'Elemental Selenium' });

  /**
   * Asserts that the "Powered by" link is visible and points to the expected URL.
   *
   * @returns Promise<void>
   *
   * @example
   * await homePage.footer.assertPoweredByLink();
   */
  async assertPoweredByLink() {
    await expect(this.poweredByLink).toHaveAttribute('href', 'http://elementalselenium.com/');
  }
}
