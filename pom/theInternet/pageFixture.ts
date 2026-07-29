import { test as baseTest, expect } from '@utils/baseTest';
import { createLocalePageFixture, createSimplePageFixture } from '@utils/multilang/pomFixture';
import { AddRemoveElementsPage } from './pages/addRemoveElements.page';
import { BasicAuthPage } from './pages/basicAuth.page';
import { CheckboxesPage } from './pages/checkboxes.page';
import { FloatingMenuPage } from './pages/floatingMenu.page';
import { HomePage } from './pages/home.page';
import { LargePage } from './pages/large.page';
import { LocaleAwarePage } from './pages/localeAware.page';
import { LoginPage } from './pages/login.page';
import { SecurePage } from './pages/secure.page';

// ---------------------------------------------------------------------------
// POM fixtures types
// ---------------------------------------------------------------------------

type Fixtures = {
  addRemoveElementsPage: AddRemoveElementsPage;
  basicAuthPage: BasicAuthPage;
  checkboxesPage: CheckboxesPage;
  floatingMenuPage: FloatingMenuPage;
  homePage: HomePage;
  largePage: LargePage;
  localeAwarePage: LocaleAwarePage;
  loginPage: LoginPage;
  securePage: SecurePage;
};

// ---------------------------------------------------------------------------
// Test extensions
// ---------------------------------------------------------------------------

const test = baseTest.extend<Fixtures>({
  addRemoveElementsPage: createSimplePageFixture(AddRemoveElementsPage),
  basicAuthPage: createSimplePageFixture(BasicAuthPage),
  checkboxesPage: createSimplePageFixture(CheckboxesPage),
  floatingMenuPage: createSimplePageFixture(FloatingMenuPage),
  homePage: createSimplePageFixture(HomePage),
  largePage: createSimplePageFixture(LargePage),
  localeAwarePage: createLocalePageFixture(LocaleAwarePage),
  loginPage: createSimplePageFixture(LoginPage),
  securePage: createSimplePageFixture(SecurePage),
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { test, expect };
