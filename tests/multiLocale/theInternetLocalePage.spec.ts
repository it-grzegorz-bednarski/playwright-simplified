import { test, expect } from '@pom/theInternet/pageFixture';

test.describe(
  'multiLocale - locale-aware URL and selector routing',
  { tag: '@multiLocale' },
  () => {
    test(
      'uses locale-specific query params for pl/cs/de',
      { tag: ['@pl', '@cs', '@de'] },
      async ({ localeAwarePage, localeKey, page }) => {
        await localeAwarePage.goto();

        if (localeKey === 'pl') {
          expect(page.url()).toContain('/add_remove_elements/?plAddress=user_id_pl');
        } else if (localeKey === 'cs') {
          expect(page.url()).toContain('/add_remove_elements/?csAddress=user_id_cs');
        } else if (localeKey === 'de') {
          expect(page.url()).toContain('/add_remove_elements/?deAddress=user_id_de');
        } else {
          throw new Error(`Unexpected locale for this test: ${localeKey}`);
        }
      }
    );

    test(
      'uses base URL-template for ar when base overrides fallback locale',
      { tag: '@ar' },
      async ({ localeAwarePage, page }) => {
        await localeAwarePage.goto();

        // AR route is intentionally missing in POM. For page URLs, `base` overrides fallback locale from env.
        expect(page.url()).toContain('/add_remove_elements/?baseAddress=user_id_ar');
      }
    );

    test(
      'uses locale-aware byRole function on existing page element',
      { tag: ['@pl', '@cs', '@de', '@ar'] },
      async ({ localeAwarePage, localeKey }) => {
        await localeAwarePage.goto();

        await localeAwarePage.prepareByRoleSelectorFixture();

        await expect(localeAwarePage.submitButton).toBeVisible();

        if (localeKey === 'pl') {
          await expect(localeAwarePage.submitButton).toHaveAccessibleName('Zaloguj');
        } else if (localeKey === 'cs') {
          await expect(localeAwarePage.submitButton).toHaveAccessibleName('Přihlásit se');
        } else if (localeKey === 'de') {
          await expect(localeAwarePage.submitButton).toHaveAccessibleName('Anmelden');
        } else if (localeKey === 'ar') {
          await expect(localeAwarePage.submitButton).toHaveAccessibleName('Sign in');
        } else {
          throw new Error(`Unexpected locale for this test: ${localeKey}`);
        }
      }
    );

    test(
      'uses locale-aware locator function on existing page element',
      { tag: ['@pl', '@cs', '@de', '@ar'] },
      async ({ localeAwarePage, localeKey }) => {
        await localeAwarePage.goto();

        await localeAwarePage.prepareLocatorSelectorFixture();

        await expect(localeAwarePage.usernameInput).toBeVisible();

        if (localeKey === 'pl') {
          await expect(localeAwarePage.usernameInput).toHaveAttribute(
            'data-testid',
            'nazwa-uzytkownika'
          );
        } else if (localeKey === 'cs') {
          await expect(localeAwarePage.usernameInput).toHaveAttribute('data-testid', 'uzivatel');
        } else if (localeKey === 'de') {
          await expect(localeAwarePage.usernameInput).toHaveAttribute(
            'data-testid',
            'benutzername'
          );
        } else if (localeKey === 'ar') {
          await expect(localeAwarePage.usernameInput).toHaveAttribute(
            'data-testid',
            'username-input'
          );
        } else {
          throw new Error(`Unexpected locale for this test: ${localeKey}`);
        }
      }
    );
  }
);
