import { BasePage } from '../base.page';
import { expect } from '@playwright/test';

export class BasicAuthPage extends BasePage {
  protected pageUrl = '/basic_auth';

  headerText = this.page.locator('h3');
  paragraphText = this.page.locator('p');
  /**
   * Asserts that the page is accessible after Basic Auth and that the success texts are displayed.
   *
   * @returns Promise<void>
   *
   * @example
   * // Basic Auth should be configured at test/describe scope
   * basicAuth('ADMIN');
   * await basicAuthPage.goto();
   * await basicAuthPage.assertBasicAuthSucceeded();
   */
  async assertBasicAuthSucceeded() {
    await expect(this.headerText).toHaveText('Basic Auth');
    await expect(this.paragraphText).toHaveText(
      'Congratulations! You must have the proper credentials.'
    );
  }
}
