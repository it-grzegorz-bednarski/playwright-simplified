# Security Headers

← [Back to main documentation](../README.md)

## Overview

Security headers validation utility for Playwright tests.

It reads response headers from the `Content-Security-Policy`, `X-Frame-Options` and other security-related headers and checks for required and forbidden entries.

---

## Configuration

`config/feature-config/securityHeaders.config.ts`:

```ts
export const securityHeadersConfig = {
  // ---------------------------------------------------------------------------
  // Scope
  // ---------------------------------------------------------------------------

  /**
   * When true, validates security headers on the last navigation response.
   * When false, uses a separate request (Playwright request context) to given URL.
   */
  preferNavigationResponse: true,

  // ---------------------------------------------------------------------------
  // Rules
  // ---------------------------------------------------------------------------

  /** Required headers (case-insensitive). true = enabled, false = disabled. */
  requiredHeaders: {
    'x-content-type-options': true,
    'x-frame-options': true,
    'referrer-policy': false,
    'permissions-policy': false,
    'strict-transport-security': false,
    'content-security-policy': false,
  },

  /** Headers that must NOT be present. true = enabled, false = disabled. */
  forbiddenHeaders: {
    'x-powered-by': true,
    server: false,
  },

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /** When true, includes all response headers in the JSON report. */
  includeAllHeadersInReport: true,
} as const;
```

### Scope

- **`preferNavigationResponse`** – when `true`, attempts to use headers from the document navigation response; otherwise uses `page.request.get(page.url())`.

### Rules

- **`requiredHeaders`** – headers that must exist (`true` = enabled, `false` = disabled).
- **`forbiddenHeaders`** – headers that must not be present (`true` = enabled, `false` = disabled).

Common headers (quick reference):

- **`x-content-type-options`** – prevents MIME sniffing (`nosniff`).
- **`x-frame-options`** – basic clickjacking protection (often replaced by CSP `frame-ancestors`).
- **`referrer-policy`** – controls referrer information sent on requests.
- **`permissions-policy`** – restricts access to browser features (camera, geolocation, etc.).
- **`strict-transport-security`** – forces HTTPS (HSTS).
- **`content-security-policy`** – controls allowed sources for scripts/styles/etc.

More info:

- **[OWASP Secure Headers documentation](https://owasp.org/www-project-secure-headers/)**

Common forbidden headers (quick reference):

- **`x-powered-by`** – reveals the framework/runtime (e.g. Express). Typically removed in production.
- **`server`** – reveals server/vendor details. Often minimized/removed to reduce fingerprinting.

### Reporting

- **`includeAllHeadersInReport`** – when `true`, writes all response headers into the JSON report (`headers` field).

**Note:** Security headers issues are always reported as soft assertions (`expect.soft`) and never fail the test immediately. This allows tests to collect all issues while still continuing to completion.

---

## Usage

### Minimal usage

```ts
import { runSecurityHeadersCheck } from '@utils/securityHeaders/runSecurityHeadersCheck';

await page.goto('https://example.com');
await runSecurityHeadersCheck(page);
```

### Override configuration per test

```ts
await runSecurityHeadersCheck(page, {
  preferNavigationResponse: false,
  requiredHeaders: {
    'x-content-type-options': true,
    'content-security-policy': true,
  },
  forbiddenHeaders: {
    'x-powered-by': true,
  },
});
```

---

## Reports

Output directory (generated): `build/artifacts/securityHeaders/`

Files:

- **`security-headers_<url>_<timestamp>.json`** – per-page JSON report (attached as downloadable link in HTML reporter)
- **`security-headers_<url>_<timestamp>.md`** – per-page Markdown report (attached as downloadable link in HTML reporter)
- **`security-headers-report.json`** – merged summary generated in `global-teardown.ts` (available on disk)
- **`security-headers-report.md`** – merged summary generated in `global-teardown.ts` (available on disk)
- **`security-headers-report.pdf`** – PDF version of the summary generated in `global-teardown.ts` (available on disk)

Per-page reports are attached directly to each test in the HTML reporter as downloadable links.
Merged summary reports are generated in `global-teardown.ts` and saved to disk — they are not attached to the HTML reporter because global teardown runs outside the test context.

Sample reports:

- [Sample JSON report](samples/securityHeaders-reports/security-headers-report.json)
- [Sample Markdown report](samples/securityHeaders-reports/security-headers-report.md)
- [Sample PDF report](samples/securityHeaders-reports/security-headers-report.pdf)
