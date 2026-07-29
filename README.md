# Playwright Simplified

Playwright Simplified is a test automation framework built to make daily work with Playwright faster, clearer, and more maintainable.

It provides a clean structure and practical defaults so teams can focus on writing reliable tests instead of rebuilding common tooling from scratch.

It comes with a clean structure, sensible defaults, and a set of utilities you can reuse across projects:

- Code quality tooling (ESLint, Prettier, Husky, lint-staged)
- Custom Clean Reporter (live in-progress status, colorized pass/fail/skip output, concise failure details)
- Custom test runner (`yarn test`) with aliases, run modes, env-first execution, and GitHub dispatch support (including sharded CI runs)
- Short import aliases (`@config`, `@data`, `@utils`, etc.) instead of relative paths
- Slack & Teams run notifications (pass/fail summaries with failure details)
- Renovate-ready dependency management workflow (optional GitHub App)

Key capabilities (optional modules/features you can enable per project):

- Accessibility testing (axe)
- Analytics event assertions (Google GTM dataLayer + Adobe data layer)
- API requests and response assertions (fixtures, placeholders, auth-aware configs)
- Basic Auth and Bearer token helpers (locale-aware, per-user or global credentials)
- Cookie management and assertions
- Client-side performance testing & monitoring (Lighthouse)
- Core Web Vitals (LCP, CLS, INP, FCP, TTFB)
- CSP validation (CSP Check)
- Environment loading (`env/.env.<env>`) with multi-locale-ready key structure
- HTML validation
- Link checking (Linkinator)
- Multi-brand and multi-locale routing with locale-aware resolvers (`envByLocale`, `dataByLocale`)
- Network mocking & intercept helpers (fixtures + replace/wait for intercept)
- Session management and authentication helpers (session reuse, login flows, Basic Auth, request auth)
- Security headers validation
- Stability helpers for flaky tests (wait for page idle)
- UI quality guardrails (assert no console errors)
- Visual regression testing (Percy)

## Prerequisites

1. **[NVM](https://github.com/nvm-sh/nvm)** (Node Version Manager)
   - [Setup guide](./docs/nvm-setup.md) - install and configure NVM for your OS
   - Install **Node.js 24.18.0 LTS** (pinned in [`.nvmrc`](./.nvmrc))

2. **[Yarn](https://yarnpkg.com/)** (4.12.0)
   - Managed via Corepack (built into Node.js)
   - [Setup guide](./docs/yarn-corepack-setup.md) - enable Corepack and install dependencies

3. **Optional (for automated dependency updates):** Install the **[Renovate GitHub App](https://github.com/apps/renovate)** for this repository.

## Installation

💡 If you change the Playwright version (newer or older), run `yarn playwright uninstall --all` first to remove old browser binaries.

After `yarn install`, Husky hooks are installed automatically via the `prepare` script in `package.json`.

If you want Renovate to open dependency PRs on GitHub, make sure the Renovate GitHub App is installed for this repository.

Run the following commands in your console:

```sh
yarn install
yarn playwright install
```

## Start here

If you want to run tests in this project, start with these first steps:

1. **[Get the environment files](./docs/secrets.md#how-to-get-the-env-files-locally)** - real `.env.*` files are not in this repo. See where they are stored and how to get them.
2. **[Create an environment file](./docs/environments.md#usage)** - copy `env/.env.example` to `env/.env.<env>` and fill in real values.
3. **[Configure test runner](./docs/testRunner.md#configuration)** - set aliases, separate run modes, and optional verbose command output.
4. **Run tests** - [CLI runs](./docs/testRunner.md#running-tests) | [UI mode](./docs/testRunner.md#ui-mode) | [Aliases](./docs/testRunner.md#aliases) | [Helper commands](./docs/testRunner.md#helper-commands)

## 📁 Framework Structure

```
playwright-simplified/
├── 📁 .github/                      # GitHub Actions workflows
│   └── 📁 workflows/                # playwright-dispatch.yml, playwright-dispatch-sharded.yml
├── 📁 .husky/                      # Husky Git hooks
│   ├── pre-commit                  # Runs lint-staged before commit (monorepo-ready)
│   └── pre-push                    # Runs tsc --noEmit before push (monorepo-ready)
├── 📁 config/                      # Framework configuration files
├── 📁 data/                        # Test data files (JSON, static payloads, fixtures input)
├── 📁 docs/                        # Documentation files (feature & configuration docs)
├── 📁 env/                         # Local environment files (.env.*), only .env.example is committed
├── 📁 fixtures/                    # Reusable fixture inputs for test setup and mocking
│   ├── 📁 cookies/                 # Predefined cookies and cookie scenarios (setCookies helpers)
│   └── 📁 intercepts/              # JSON fixtures for replaceIntercept utility
├── 📁 pom/                         # Page Object Model modules (pages/components/domain-level POM)
├── 📁 scripts/                     # Utility scripts used by local and CI workflows
├── 📁 tests/                       # Test specs
├── 📁 utils/                       # Reusable helpers and feature tooling
├── .editorconfig                   # Editor formatting defaults (UTF-8, indentation, LF)
├── .gitattributes                  # Git line-ending policy (LF by default)
├── .gitignore                      # Git ignore rules
├── .nvmrc                          # Pinned Node.js version
├── .prettierrc                     # Prettier code formatting configuration
├── .yarnrc.yml                     # Yarn configuration (nodeLinker)
├── eslint.config.js                # ESLint configuration
├── global-setup.ts                 # Pre-test hook that clears build/ before each run
├── global-teardown.ts              # Post-test hook that aggregates reports and generates PDF
├── LICENSE                         # MIT License
├── package.json                    # Project manifest (dependencies, engines, packageManager)
├── playwright.config.ts            # Playwright runner configuration
├── playwright.sharding.config.ts   # Used to merge blob reports on sharded CI runs
├── README.md                       # Main documentation
├── renovate.json                   # Renovate dependency update policy
├── tsconfig.eslint.json            # TypeScript config used by ESLint
├── tsconfig.json                   # TypeScript configuration
└── yarn.lock                       # Yarn dependency lockfile
```

## Documentation

- **[Playwright Documentation](https://playwright.dev/docs/intro)**

### 🔧 Configuration

- **[Environments](./docs/environments.md)** - `.env` strategy (`env/.env.<env>`), secret handling policy, and multi-locale key conventions.
- **[How to add a locale](./docs/how-to-add-locale.md)** - step-by-step: add a locale, brand, group, or disable a locale — env only, no code changes.
- **[Multilang](./docs/multilang.md)** - practical setup for locales, tenants, groups, tags, and test authoring usage.
  - [Configuration](./docs/multilang.md#configuration) | [Usage](./docs/multilang.md#usage) | [envByLocale usage](./docs/multilang.md#envbylocale-usage)
- **[Playwright Config](./docs/playwright-config.md)** - Base runner config, lifecycle hooks, reporters, build output, timeout presets, and workers strategy.
  - [Configuration](./docs/playwright-config.md#configuration) | [Timeouts](./docs/timeouts.md)
- **[Path Aliases](./docs/path-aliases.md)** - short import aliases (`@config`, `@data`, `@utils`, etc.) configured in `tsconfig.json`.
- **[Projects](./docs/projects.md)** - auto project creation from env and manual project definition in `playwright.config.ts`.
- **[Secrets & Environment Files](./docs/secrets.md)** - why `.env` files are not in this repo, where secrets are stored, and how to get them.
- **[Tags and Routing](./docs/tags.md)** - how to tag tests/describe blocks and how to run tests by tag (`--grep`).
  - [Configuration](./docs/tags.md#configuration) | [Usage](./docs/tags.md#usage)
- **[Test Configuration](./docs/testConfiguration.md)** - Examples of per-test execution modes, timeouts, retries, skip/fixme, steps, and env usage.
- **[Test Runner](./docs/testRunner.md)** - runner entrypoint (`yarn test <env> ...`) with helper commands.
  - [Configuration](./docs/testRunner.md#configuration) | [Running tests](./docs/testRunner.md#running-tests) | [Aliases](./docs/testRunner.md#aliases) | [Helper commands](./docs/testRunner.md#helper-commands) | [GitHub Actions Dispatch](./docs/githubActionsDispatch.md)
- **[GitHub Actions Dispatch](./docs/githubActionsDispatch.md)** - token setup, repository secrets naming, workflow permissions.
  - [Workflow file reference](./docs/playwrightDispatch.md) | [Sharded workflow reference](./docs/playwrightDispatchSharded.md)

### 🎨 Code Quality & Formatting

- **[ESLint](./docs/eslint.md)** - Code linting and static analysis.
  - [Configuration](./docs/eslint.md#configuration) | [Usage](./docs/eslint.md#usage)
- **[Husky](./docs/husky.md)** - Git hooks management and pre-commit automation.
  - [Configuration](./docs/husky.md#configuration) | [Usage](./docs/husky.md#usage)
- **[Lint-staged](./docs/lintStaged.md)** - Run linting only on staged files.
  - [Configuration](./docs/lintStaged.md#configuration)
- **[Prettier](./docs/prettier.md)** - Code formatting.
  - [Configuration](./docs/prettier.md#configuration) | [Usage](./docs/prettier.md#usage)
- **[Renovate](./docs/renovate.md)** - Automated dependency updates and update policy examples.
  - [Configuration](./docs/renovate.md#configuration) | [Usage](./docs/renovate.md#usage)
- **[TypeScript](./docs/typescript.md)** - TypeScript configuration and usage in this repository.
  - [Configuration](./docs/typescript.md#configuration) | [Usage](./docs/typescript.md#usage)

### 🧩 Page Object Model

- **[Page Object Model](./docs/pageObjectModel/index.md)** - Entry point (overview, quick start, and structure)
  - **[Advanced patterns](./docs/pageObjectModel/advancedPatterns.md)** - patterns for auto-cookie, auto-login, fixture overrides, and multi-domain setup
    - [Cookie handling](./docs/pageObjectModel/advancedPatterns.md#automatic-cookie-handling-in-goto) | [Auto-login](./docs/pageObjectModel/advancedPatterns.md#automatic-login-in-goto) | [Cookie injection](./docs/pageObjectModel/advancedPatterns.md#automatic-cookie-injection-in-goto) | [Locale-aware pageUrl](./docs/pageObjectModel/advancedPatterns.md#locale-aware-pageurl) | [Locale-aware selectors](./docs/pageObjectModel/advancedPatterns.md#locale-aware-selectors-locator--role) | [Locale-aware functions](./docs/pageObjectModel/advancedPatterns.md#locale-aware-functions) | [Session login key](./docs/pageObjectModel/advancedPatterns.md#choosing-a-different-login-flow-sessionloginkey) | [API config key](./docs/pageObjectModel/advancedPatterns.md#choosing-a-different-api-config-apiconfigkey) | [Basic Auth](./docs/pageObjectModel/advancedPatterns.md#basic-auth-automation) | [Multiple domains](./docs/pageObjectModel/advancedPatterns.md#multiple-fixtures--multiple-domains) | [Tests without POM](./docs/pageObjectModel/advancedPatterns.md#writing-tests-without-a-domain-pom-basetest)
  - **[AppPage](./docs/pageObjectModel/appPage.md)** - optional layer for shared logged-in layout
    - [Configuration](./docs/pageObjectModel/appPage.md#configuration) | [Usage](./docs/pageObjectModel/appPage.md#usage)
  - **[Base pages](./docs/pageObjectModel/basePage.md)** - shared helpers and navigation
    - [Configuration](./docs/pageObjectModel/basePage.md#configuration) | [Usage](./docs/pageObjectModel/basePage.md#usage)
  - **[Base test](./docs/baseTest.md)** - shared test entrypoint
    - [Configuration](./docs/baseTest.md#configuration) | [Usage](./docs/baseTest.md#usage)
  - **[Components](./docs/pageObjectModel/components.md)** - reusable UI fragments
    - [Configuration](./docs/pageObjectModel/components.md#configuration) | [Usage](./docs/pageObjectModel/components.md#usage)
  - **[Fixtures](./docs/pageObjectModel/fixtures.md)** - expose pages to tests
    - [Configuration](./docs/pageObjectModel/fixtures.md#configuration) | [Usage](./docs/pageObjectModel/fixtures.md#usage)
  - **[Pages](./docs/pageObjectModel/pages.md)** - concrete pages
    - [Configuration](./docs/pageObjectModel/pages.md#configuration) | [Usage](./docs/pageObjectModel/pages.md#usage)
    - [Static pages](./docs/pageObjectModel/pages.md#static-pages-require) | [Dynamic pages](./docs/pageObjectModel/pages.md#dynamic-pages-require)

### 📝 API requests (API tool)

- **[API](./docs/api/api.md)** - Quick start + how to configure the API tool.
  - [Configuration](./docs/api/api.md#configuration) | [Minimal usage](./docs/api/api.md#minimal-usage)
- **[Fixtures](./docs/api/apiFixtures.md)** - How to use JSON fixtures + placeholders.
  - [Body fixtures](./docs/api/apiFixtures.md#body-fixtures) | [Placeholder replacements](./docs/api/apiFixtures.md#placeholder-replacements) | [Expected-response fixtures](./docs/api/apiFixtures.md#expected-response-fixtures)
- **[Sending requests](./docs/api/apiRequests.md)** - How to send requests (methods, headers, body).
  - [Supported methods](./docs/api/apiRequests.md#supported-methods) | [Request options](./docs/api/apiRequests.md#request-options-common) | [Fixtures + replacements](./docs/api/apiRequests.md#fixtures--replacements)
- **[Response assertions](./docs/api/apiAssertions.md)** - Ready-to-use assertions for API responses.
  - [Status](./docs/api/apiAssertions.md#status) | [JSON keys](./docs/api/apiAssertions.md#json-keys) | [JSON matches](./docs/api/apiAssertions.md#json-matches--not-matches) | [Arrays](./docs/api/apiAssertions.md#arrays)
  - [Body contains](./docs/api/apiAssertions.md#body-contains--not-contains) | [JSON fixtures](./docs/api/apiAssertions.md#json-fixture-assertions)

### 🍪 Cookie Management

- **[Check Cookies](./docs/checkCookies.md)** - Assert cookies using JSON files (exist / not exist)
  - [Configuration](./docs/checkCookies.md#configuration) | [Usage](./docs/checkCookies.md#usage) | [Dynamic values](./docs/checkCookies.md#dynamic-values) | [Debug output](./docs/checkCookies.md#debug-output)
- **[Set Cookies](./docs/setCookies.md)** - Inject selected cookies into the browser context
  - [Configuration](./docs/setCookies.md#configuration) | [Usage](./docs/setCookies.md#usage)
- **[Set Cookies Scenario](./docs/setCookiesScenario.md)** - Apply predefined cookie combinations by name
  - [Configuration](./docs/setCookiesScenario.md#configuration) | [Usage](./docs/setCookiesScenario.md#usage)

### 📊 Data Management

- **[Cookies](./docs/cookies.md)** - Central configuration for predefined cookies and reusable cookie scenarios
  - [Cookies configuration](./docs/cookies.md#cookies-configuration) | [Dynamic domains](./docs/cookies.md#dynamic-cookie-domains) | [Cookie scenarios configuration](./docs/cookies.md#cookie-scenarios-configuration)
- **[Data](./docs/data.md)** - Centralized test data patterns (`data/data.ts`), env-based dataset selection, and locale-aware data fields via `dataByLocale`
- **[Fixtures strategy](./docs/fixtures-strategy.md)** - Where to store fixtures/data and how `%PLACEHOLDER%` replacements work.
- **[Intercepts](./docs/intercepts.md)** - Centralized URL patterns for HTTP request interception
  - [Configuration](./docs/intercepts.md#configuration) | [Usage](./docs/intercepts.md#usage)

### 📝 Reporting & Artifacts

- **Build output cleanup (`buildDir`)** - `global-setup.ts` clears the folder defined by `buildDir` before each run
  - [Implementation](./global-setup.ts) | [Lifecycle hooks docs](./docs/playwright-config.md#lifecycle-hooks)
- **[mdToPdf Utility](./docs/mdToPdf.md)** - Convert Markdown reports to PDF documents
  - [Configuration](./docs/mdToPdf.md#configuration) | [Usage](./docs/mdToPdf.md#usage)
- **Post-run report aggregation** - `global-teardown.ts` aggregates reports and converts merged Markdown to PDF
  - [Implementation](./global-teardown.ts) | [Lifecycle hooks docs](./docs/playwright-config.md#lifecycle-hooks)
- **[Reporters](./docs/reporters.md)** - Playwright test result reporters
  - [Configuration](./docs/reporters.md#configuration) | [Clean Reporter](./docs/reporters.md#clean-reporter) | [HTML Reporter](./docs/reporters.md#html-reporter) | [JSON Reporter](./docs/reporters.md#json-reporter) | [JUnit Reporter](./docs/reporters.md#junit-reporter) | [Slack Reporter](./docs/slackReporter.md) | [Teams Reporter](./docs/teamsReporter.md)

### 🔐 Session Management

- **[Sessions](./docs/sessionManagement/sessions.md)** - Reuse authenticated browser state between tests via session fixtures.
  - [Configuration](./docs/sessionManagement/sessions.md#configuration) | [Usage](./docs/sessionManagement/sessions.md#usage) | [Multilocale](./docs/sessionManagement/sessions.md#multilocale-example)
- **[Login flow](./docs/sessionManagement/loginFlow.md)** - Implement login flows (UI, API, Basic Auth) in session login config files.
- **[Session meta](./docs/sessionManagement/meta.md)** - Persist extra values (auth headers, API keys, user ids) alongside sessions.
- **[Basic Auth](./docs/sessionManagement/basicAuth.md)** - Configure and apply HTTP Basic Authentication from env variables.
- **[Request auth helpers](./docs/sessionManagement/requestAuth.md)** - Extract `Authorization: Bearer ...` from intercepted login requests and persist it in session meta.

### 🧪 Testing Features

- **[Accessibility](./docs/accessibility.md)** - Automated accessibility checks and audits
  - [Configuration](./docs/accessibility.md#configuration) | [Usage](./docs/accessibility.md#usage) | [Reports](./docs/accessibility.md#reports)
- **[Analytics](./docs/analytics.md)** - Capture and assert analytics events (Adobe / GTM dataLayer)
  - [Configuration](./docs/analytics.md#configuration) | [Usage](./docs/analytics.md#usage) | [Dynamic values](./docs/analytics.md#dynamic-values) | [Debug output](./docs/analytics.md#debug-output)
- **[Core Web Vitals](./docs/webVitals.md)** - Collect LCP, CLS, INP, FCP, TTFB from the browser Performance API with optional per-metric thresholds
  - [Configuration](./docs/webVitals.md#configuration) | [Usage](./docs/webVitals.md#usage) | [Reports](./docs/webVitals.md#reports)
- **[Performance Devices](./docs/performanceDevices.md)** - Device presets (desktop / desktopWide / mobile / tablet) for Lighthouse-based tools
- **[Performance Monitoring](./docs/performanceMonitoring.md)** - Run Lighthouse multiple times per URL and aggregate results (median) — observational, no thresholds
  - [Configuration](./docs/performanceMonitoring.md#configuration) | [Usage](./docs/performanceMonitoring.md#usage) | [Reports](./docs/performanceMonitoring.md#reports)
- **[Performance Test](./docs/performanceTest.md)** - Run Lighthouse-based performance audits with threshold validation
  - [Configuration](./docs/performanceTest.md#configuration) | [Usage](./docs/performanceTest.md#usage) | [Reports](./docs/performanceTest.md#reports)
- **[Visual Testing](./docs/visualTesting.md)** - Visual regression testing with Percy and Playwright
  - [Configuration](./docs/visualTesting.md#configuration) | [Usage](./docs/visualTesting.md#usage)

### 🛠️ Test Utilities

- **[Assert No Console Errors](./docs/assertNoConsoleErrors.md)** - Assert that pages load without unexpected console errors
  - [Configuration](./docs/assertNoConsoleErrors.md#configuration) | [Usage](./docs/assertNoConsoleErrors.md#usage) | [Reports](./docs/assertNoConsoleErrors.md#reports)
- **[CSP Check](./docs/cspCheck.md)** - Validate Content-Security-Policy (CSP) on pages
  - [Configuration](./docs/cspCheck.md#configuration) | [Usage](./docs/cspCheck.md#usage) | [Reports](./docs/cspCheck.md#reports)
- **[HTML Validator](./docs/htmlValidator.md)** - Validate rendered HTML on pages using html-validate
  - [Configuration](./docs/htmlValidator.md#configuration) | [Usage](./docs/htmlValidator.md#usage) | [Reports](./docs/htmlValidator.md#reports)
- **[iFrames](./docs/iFrames.md)** - Working with embedded frames and nested browsing contexts
- **[Link Check](./docs/linkCheck.md)** - Validate broken links on pages using Linkinator
  - [Configuration](./docs/linkCheck.md#configuration) | [Usage](./docs/linkCheck.md#usage) | [Reports](./docs/linkCheck.md#reports)
- **[Replace Attribute](./docs/replaceAttribute.md)** - Modify HTML attributes in DOM elements for testing scenarios
  - [Usage](./docs/replaceAttribute.md#usage)
- **[Replace Text](./docs/replaceText.md)** - Modify text content in DOM elements for testing scenarios
  - [Usage](./docs/replaceText.md#usage)
- **[Security Headers](./docs/securityHeaders.md)** - Validate HTTP security response headers on pages
  - [Configuration](./docs/securityHeaders.md#configuration) | [Usage](./docs/securityHeaders.md#usage) | [Reports](./docs/securityHeaders.md#reports)
- **[Wait for Page Idle](./docs/waitForPageIdle.md)** - Wait until the page is network-idle before interacting with the UI
  - [Configuration](./docs/waitForPageIdle.md#configuration) | [Usage](./docs/waitForPageIdle.md#usage)

### 🌐 Working with HTTP requests

- **[Replace Intercept](./docs/replaceIntercept.md)** - Mock HTTP responses using JSON fixtures
  - [Configuration](./docs/replaceIntercept.md#configuration) | [Usage](./docs/replaceIntercept.md#usage) | [Dynamic values](./docs/replaceIntercept.md#dynamic-values) | [Status code change](./docs/replaceIntercept.md#status-code-change) | [Debugging](./docs/replaceIntercept.md#debugging)
- **[Request Assertions](./docs/requestAssertions.md)** - Common patterns for validating HTTP requests in tests
- **[Response Assertions](./docs/responseAssertions.md)** - Common patterns for validating HTTP responses in tests
- **[Wait for Intercept](./docs/waitForIntercept.md)** - Wait for specific HTTP requests during tests
  - [Configuration](./docs/waitForIntercept.md#configuration) | [Usage](./docs/waitForIntercept.md#usage) | [Debugging](./docs/waitForIntercept.md#debugging)

---

## About This Repository

### Repository Standards

- [`.editorconfig`](./.editorconfig) - consistent editor formatting defaults (UTF-8, indentation, final newline).
- [`.gitattributes`](./.gitattributes) - repository line-ending policy (`LF` by default, Windows script exceptions).
- [`.gitignore`](./.gitignore) - local/temporary files excluded from version control.

### License

This project is licensed under [`LICENSE`](./LICENSE) (MIT).

### Author

IT Grzegorz Bednarski ( [it.grzegorz.bednarski@gmail.com](mailto:it.grzegorz.bednarski@gmail.com) )
