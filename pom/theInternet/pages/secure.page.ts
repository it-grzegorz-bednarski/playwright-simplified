import { BasePage } from '../base.page';
import { expect } from '@playwright/test';

export class SecurePage extends BasePage {
  protected pageUrl = '/secure';

  logoutButton = this.page.locator('a[href="/logout"]');
  secureAreaText = this.page.locator('h4.subheader');
  /**
   * Asserts that the user is logged in by checking the presence of the Logout button
   * and the Secure Area welcome text.
   *
   * @returns Promise<void>
   *
   * @example
   * await securePage.goto();
   * await securePage.assertUserLoggedIn();
   */
  async assertUserLoggedIn() {
    await expect(this.logoutButton).toBeVisible();
    await expect(this.secureAreaText).toHaveText(
      'Welcome to the Secure Area. When you are done click logout below.'
    );
  }
}
