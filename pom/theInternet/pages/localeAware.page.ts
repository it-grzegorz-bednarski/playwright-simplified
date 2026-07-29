import { BasePage } from '../base.page';

export class LocaleAwarePage extends BasePage {
  override getPageUrl(): string {
    return this.pathByLocaleTemplate({
      base: `/add_remove_elements/?baseAddress=\${USER_ID}`,
      pl: `/add_remove_elements/?plAddress=\${USER_ID}`,
      cs: `/add_remove_elements/?csAddress=\${USER_ID}`,
      de: `/add_remove_elements/?deAddress=\${USER_ID}`,
    });
  }

  submitButton = this.getByRoleByLocale('button', {
    base: 'Sign in',
    pl: 'Zaloguj',
    cs: 'Přihlásit se',
    de: 'Anmelden',
  });

  usernameInput = this.locatorByLocale({
    base: '[data-testid="username-input"]',
    pl: '[data-testid="nazwa-uzytkownika"]',
    cs: '[data-testid="uzivatel"]',
    de: '[data-testid="benutzername"]',
  });

  async prepareByRoleSelectorFixture(): Promise<void> {
    await this.runByLocale({
      pl: () => this.updateExistingAddElementButton({ ariaLabel: 'Zaloguj' }),
      cs: () => this.updateExistingAddElementButton({ ariaLabel: 'Přihlásit se' }),
      de: () => this.updateExistingAddElementButton({ ariaLabel: 'Anmelden' }),
      base: () => this.updateExistingAddElementButton({ ariaLabel: 'Sign in' }),
    });
  }

  async prepareLocatorSelectorFixture(): Promise<void> {
    await this.runByLocale({
      pl: () => this.updateExistingAddElementButton({ testId: 'nazwa-uzytkownika' }),
      cs: () => this.updateExistingAddElementButton({ testId: 'uzivatel' }),
      de: () => this.updateExistingAddElementButton({ testId: 'benutzername' }),
      base: () => this.updateExistingAddElementButton({ testId: 'username-input' }),
    });
  }

  private async updateExistingAddElementButton(options: {
    ariaLabel?: string;
    testId?: string;
  }): Promise<void> {
    await this.page.evaluate(({ ariaLabel, testId }) => {
      const button = document.querySelector('button[onclick="addElement()"]');
      if (!button) {
        throw new Error('Expected Add Element button to exist on the page.');
      }

      if (ariaLabel) {
        button.setAttribute('aria-label', ariaLabel);
      }

      if (testId) {
        button.setAttribute('data-testid', testId);
      }
    }, options);
  }
}
