import { Page, expect } from '@playwright/test';
import { setCookies } from '@utils/setCookies';

export class CookieDisclaimerComponent {
  constructor(private page: Page) {}

  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------
  container = this.page.locator('[data-test="cookie-disclaimer"]');
  acceptButton = this.container.getByRole('button', { name: 'accept' });
  rejectButton = this.container.getByRole('button', { name: 'reject' });

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------
  /**
   * Asserts that the cookie disclaimer container is not visible.
   *
   * @returns Promise<void>
   *
   * @example
   * await homePage.cookiePrompt.assertNotVisible();
   */
  async assertNotVisible() {
    await expect(this.container).not.toBeVisible();
  }

  // ---------------------------------------------------------------------------
  // Checks
  // ---------------------------------------------------------------------------
  /**
   * Check if the cookie disclaimer container is visible without failing.
   *
   * @returns Promise<boolean>
   *
   * @example
   * const isVisible = await homePage.cookiePrompt.isVisible();
   */
  async isVisible(): Promise<boolean> {
    return await this.container.isVisible({ timeout: 1000 }).catch(() => false);
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  /** Click "Accept" on the cookie disclaimer UI. */
  async clickAcceptCookieButton() {
    await this.acceptButton.click();
    await this.assertNotVisible();
  }

  /** Inject cookie that marks the cookie banner as accepted. */
  async injectAcceptedCookie() {
    await setCookies(this.page, ['COOKIE_BANNER_ACCEPTED']);
  }
}
