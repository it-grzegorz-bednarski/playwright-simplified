# Environments

← [Back to main documentation](../README.md)

## Overview

Environment loading is based on one file per environment:

- `env/.env.dev`
- `env/.env.staging`
- `env/.env.prod`

Each file is a single source of truth for that environment and defines:

- global settings (`ENVIRONMENT`, `BRANDS`),
- per-brand configuration (locales, URLs, credentials, groups, regional controls).

The committed template is `env/.env.example`.

---

## Configuration

### Global + Multi-Brand Example (`env/.env.<environmentName>`)

```env
# Environment metadata
ENVIRONMENT=dev

# Optional Playwright config overrides
TEST_TIMEOUT=90000
EXPECT_TIMEOUT=15000
RETRIES=2
ACTION_TIMEOUT=20000
NAVIGATION_TIMEOUT=45000

# Optional API base URL (used by API-only login flows)
API_URL=https://api.example.com

# ============================================
# Percy Visual Testing
# ============================================
PERCY_TOKEN=web_480b97bba201fbeab51cf8ef2892a7430a6d5b460c125e82c0474c266dc532254
PERCY_BRANCH=dev

# ============================================
# Basic Auth (optional)
# ============================================
# Global Basic Auth for the whole environment/domain
BASICAUTH_USERNAME=admin
BASICAUTH_PASSWORD=admin

# Optional per-user Basic Auth overrides
ADMIN_BASICAUTH_USERNAME=admin
ADMIN_BASICAUTH_PASSWORD=admin.super-secret

# ============================================
# BRANDS Registry
# ============================================
BRANDS=BRANDC,BRANDB

# ============================================
# BRANDC: Single-locale brand
# ============================================
BRANDC_LOCALES=US

BRANDC_BASE_URL_US=https://dev.brandc.example.com
BRANDC_TENANT_US=en_US
BRANDC_USER_US=demo_brandc
BRANDC_PASSWORD_US=secret_brandc

# ============================================
# BRANDB: Multi-locale brand with groups
# ============================================
BRANDB_LOCALES=PL,UK,DE,AR

BRANDB_TENANT_PL=pl_PL
BRANDB_BASE_URL_PL=https://dev.brandb.example.com/pl
BRANDB_USER_PL=demo_pl
BRANDB_PASSWORD_PL=secret_pl

BRANDB_TENANT_UK=uk_UA
BRANDB_BASE_URL_UK=https://dev.brandb.example.com/uk
BRANDB_USER_UK=demo_uk
BRANDB_PASSWORD_UK=secret_uk

BRANDB_TENANT_DE=de_DE
BRANDB_BASE_URL_DE=https://dev.brandb.example.com/de
BRANDB_USER_DE=demo_de
BRANDB_PASSWORD_DE=secret_de

BRANDB_TENANT_AR=ar_AE
BRANDB_BASE_URL_AR=https://dev.brandb.example.com/ar
BRANDB_USER_AR=demo_ar
BRANDB_PASSWORD_AR=secret_ar

# Optional per-locale Basic Auth for each brand
BRANDC_BASICAUTH_USERNAME_US=admin_brandc_us
BRANDC_BASICAUTH_PASSWORD_US=secret_brandc_us

BRANDB_BASICAUTH_USERNAME_PL=admin_brandb_pl
BRANDB_BASICAUTH_PASSWORD_PL=secret_brandb_pl

# Optional locale-aware API URLs
BRANDC_API_URL_US=https://us.api.brandc.example.com
BRANDB_API_URL_PL=https://pl.api.brandb.example.com

# Optional per-locale per-user Basic Auth for each brand
BRANDB_ADMIN_BASICAUTH_USERNAME_PL=admin_brandb_pl_special
BRANDB_ADMIN_BASICAUTH_PASSWORD_PL=secret_brandb_pl_special

# Regional groups (app lowercases group name for @<groupname> tag)
BRANDB_GROUP_SLAVIC=PL,UK
BRANDB_GROUP_RTL=AR

# Optional execution controls per brand
BRANDB_DISABLED_LOCALES=
BRANDB_LOCALE_OVERRIDE=
```

> `BRANDS` is always required. Each brand in the list must have `<BRAND>_LOCALES` defined.

---

## Configuration Breakdown

### Environment metadata

```env
ENVIRONMENT=dev
```

Current environment name. Used by testRunner to load the correct `env/.env.<env>` file.

### Percy Visual Testing

```env
PERCY_TOKEN=web_480b97bba201fbeab51cf8ef2892a7430a6d5b460c125e82c0474c266dc532254
PERCY_BRANCH=dev
```

- `PERCY_TOKEN` - Percy project token for visual regression testing. Get it from [Percy.io (project settings)](https://percy.io/).
- `PERCY_BRANCH` - Branch name shown in Percy builds (usually your feature branch name).

Both are optional — only needed if you run visual tests via `yarn test <env> percy`. See [Visual Testing (Percy)](#visual-testing-percy) for setup details.

### BRANDS list

```env
BRANDS=BRANDC,BRANDB,MOJASTRONA
```

Comma-separated list of brand prefixes used throughout env. Each brand name becomes a variable prefix (e.g., `BRANDC_`, `BRANDB_`).

### Per-Brand: Locales

```env
BRANDC_LOCALES=US
BRANDB_LOCALES=PL,UK,DE,AR
```

Comma-separated locale keys for this brand. Short keys keep variable names readable.

### Per-Brand: Base URLs & Tenants

```env
BRANDC_BASE_URL_US=https://dev.brandc.example.com
BRANDC_TENANT_US=en_US

BRANDB_BASE_URL_PL=https://dev.brandb.example.com/pl
BRANDB_TENANT_PL=pl_PL
```

- `<BRAND>_BASE_URL_<KEY>` - required for each locale key from `<BRAND>_LOCALES`.
- `<BRAND>_TENANT_<KEY>` - optional full locale/tenant mapping (used by test logic).

### API URL for login flows (optional)

```env
# Global fallback
API_URL=https://api.example.com

# Locale-aware per brand
BRANDB_API_URL_PL=https://pl.api.brandb.example.com
BRANDB_API_URL_UK=https://uk.api.brandb.example.com
```

- `API_URL` - global fallback for API-only login flows.
- `<BRAND>_API_URL_<KEY>` - optional locale-aware API URL resolved via `envByLocale('API_URL')` in `sessionLogin` configs.

### Per-Brand: Credentials

```env
BRANDC_USER_US=demo_brandc
BRANDC_PASSWORD_US=secret_brandc

BRANDB_USER_PL=demo_pl
BRANDB_PASSWORD_PL=secret_pl
```

- `<BRAND>_USER_<KEY>`, `<BRAND>_PASSWORD_<KEY>` - optional, only define if login is required.
- Define only for locales that need credentials.

### Per-Brand: Locale-aware IDs for POM templates (optional)

```env
MULTILOCALE_USER_ID_PL=user_id_pl
MULTILOCALE_USER_ID_CS=user_id_cs
MULTILOCALE_USER_ID_DE=user_id_de
MULTILOCALE_USER_ID_AR=user_id_ar
```

- `<BRAND>_USER_ID_<KEY>` - optional locale-aware value for POM URL templates (for example `${USER_ID}`).
- Used by locale-aware `pathByLocaleTemplate(...)` calls in page objects.

### Basic Auth naming convention

```env
# Global
BASICAUTH_USERNAME=admin
BASICAUTH_PASSWORD=admin

# Per-user override example
ADMIN_BASICAUTH_USERNAME=admin
ADMIN_BASICAUTH_PASSWORD=admin.super-secret

# Locale-aware (legacy LOCALES setup)
BASICAUTH_USERNAME_PL=admin_pl
BASICAUTH_PASSWORD_PL=secret_pl

# Locale-aware (BRANDS setup)
MULTILOCALE_BASICAUTH_USERNAME_PL=admin_multilocale_pl
MULTILOCALE_BASICAUTH_PASSWORD_PL=secret_multilocale_pl
```

- `BASICAUTH_USERNAME`, `BASICAUTH_PASSWORD` - global HTTP Basic Auth credentials.
- `<USERKEY>_BASICAUTH_USERNAME`, `<USERKEY>_BASICAUTH_PASSWORD` - optional per-user Basic Auth credentials.
- `BASICAUTH_USERNAME_<KEY>`, `BASICAUTH_PASSWORD_<KEY>` - optional locale-aware credentials for legacy LOCALES setup.
- `<BRAND>_BASICAUTH_USERNAME_<KEY>`, `<BRAND>_BASICAUTH_PASSWORD_<KEY>` - optional locale-aware credentials for BRANDS setup.

With `baseTest` you can resolve locale-aware values via `envByLocale('BASICAUTH_USERNAME')` and `envByLocale('BASICAUTH_PASSWORD')`.

Used by: **[Basic Auth helper](./sessionManagement/basicAuth.md)**.

### Per-Brand: Regional Groups

```env
BRANDB_GROUP_SLAVIC=PL,UK
BRANDB_GROUP_RTL=AR
```

- `<BRAND>_GROUP_<NAME>` - comma-separated locale keys in this group.
- App automatically:
  1. Extracts group name (`SLAVIC` → `SLAVIC`).
  2. Lowercases it (`slavic`).
  3. Creates `@slavic` routing tag for tests.

**No `GROUP_TAG_*` required.** The tag is auto-generated.

### Per-Brand: Execution Controls

```env
BRANDB_DISABLED_LOCALES=
BRANDB_LOCALE_OVERRIDE=
```

- `<BRAND>_DISABLED_LOCALES` - comma-separated locale keys to temporarily skip (empty = use all).
- `<BRAND>_LOCALE_OVERRIDE` - force run to a single locale key (empty = use all active locales).

### Per-Brand: Custom Keys

Any other per-brand configuration (e.g., analytics tokens, API keys):

```env
BRANDB_PROJECT_CUSTOM_KEY=custom-value-brandb
```

Tests access these via `process.env.<KEY>` or dedicated fixtures (if implemented).

### Env loader options

`config/envLoaderConfig.ts` exposes:

- `override`
  - `true`: values from `env/.env.<env>` can overwrite existing `process.env`
  - `false`: existing `process.env` values win
- `enableLogging`
  - `true`: logs one info line when env is loaded
  - `false`: silent loading

The loader reads from `env/`.

---

## Visual Testing (Percy)

To run visual regression tests with Percy, you need to configure two environment variables in your `env/.env.<env>` file:

```env
PERCY_TOKEN=web_your_project_token_here
PERCY_BRANCH=your-branch-name
```

- **`PERCY_TOKEN`** — Your Percy project authentication token. Get it from [Percy.io (project settings)](https://percy.io/).
- **`PERCY_BRANCH`** — The branch name that will appear in Percy builds. Usually matches your feature/test branch name.

Both values should live in `env/.env.<env>` alongside your brand and locale configuration.

For details on how to use Percy with testRunner, see **[Visual Testing](./visualTesting.md)**.

---

## Security Model

- Only `env/.env.example` is committed.
- All other files in `env/` are ignored by Git.
- Keep real secrets only in local files or CI variables.
- For team sharing, keep secrets in a central vault/secret manager and generate local `env/.env.<environmentName>` files from that source.

Current `.gitignore` policy:

```gitignore
env/*
!env/.env.example
```

---

## Usage

### 1. Create a local env file from template

Create a local file in `env/` using this naming convention:

- `env/.env.<environmentName>`

Example for development:

- `env/.env.dev`

### 2. Update values in `env/.env.<environmentName>`

Fill in real URLs, credentials, and brand-specific values.

**Important:** `.env.example` is a template showing all possible keys.  
You only need to include values in `env/.env.<env>` that your tests actually use:

### 3. Run the environment with the runner

```sh
yarn test dev
```

Use `yarn test <env>` to load the chosen environment first and then run Playwright.

For details on project selectors, tag filters, UI mode, aliases, and helper commands, see **[Test Runner](./testRunner.md#running-tests)** and **[Test Runner configuration](./testRunner.md#configuration)**.

### 4. Use env values in tests

- Use `process.env.KEY` for global values loaded from `env/.env.<env>`.
- Use `envByLocale('KEY')` for locale-aware values such as `BASE_URL`, `TENANT`, `ADMIN_USERNAME`, `API_URL`.

See **[Test Configuration](./testConfiguration.md#using-env-values-in-tests)** and **[Multilang](./multilang.md#envbylocale-usage)** for examples.

---

## Tips

- **Empty execution controls** (`DISABLED_LOCALES=`, `LOCALE_OVERRIDE=`) mean "no override".
- **Missing credentials** for a locale is OK — just don't define `<BRAND>_USER_<KEY>` or `<BRAND>_PASSWORD_<KEY>`.
