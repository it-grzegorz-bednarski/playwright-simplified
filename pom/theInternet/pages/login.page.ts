import { BasePage } from '../base.page';
import { waitForPageIdle } from '@utils/waitForPageIdle';

export class LoginPage extends BasePage {
  protected pageUrl = '/login';

  usernameInput = this.page.locator('input[id="username"]');
  passwordInput = this.page.locator('input[id="password"]');
  submitButton = this.page.locator('button[type="submit"]');
  /**
   * Logs in using the provided credentials.
   * Navigates to `/login`, submits the form, then waits for navigation to secure page.
   *
   * @param username - Username credential
   * @param password - Password credential
   * @returns Promise<void>
   *
   * @example
   * await loginPage.login('admin', 'admin');
   */
  async login(username: string, password: string) {
    await this.goto();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await waitForPageIdle(this.page);
    await this.page.waitForURL('**/secure');
  }
}
