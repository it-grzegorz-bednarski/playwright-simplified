# Check Cookies

← [Back to main documentation](../README.md)

## Overview

Utility for asserting browser cookies against JSON files.

---

## Configuration

- Expected cookie files live in `data/cookies/*.json`.
- Each file defines a single cookie under a top-level key (e.g. `COOKIE_BANNER_ACCEPTED`).
- Debug logging is controlled via `config/feature-config/checkCookieConfig.ts` (`debugCookies: 'always' | 'ifFail' | 'never'`).

Example configuration:

```ts
export const checkCookieConfig = {
  debugCookies: 'ifFail',
} as const;
```

Example file:

```json
{
  "COOKIE_BANNER_ACCEPTED": {
    "name": "cookie_banner_accepted",
    "value": "true",
    "domain": "example.com",
    "path": "/",
    "httpOnly": false,
    "secure": true
  }
}
```

---

## Usage

```ts
import { checkCookies } from '../utils/checkCookies';

// Positive check - cookie must exist and match file
await checkCookies(page, 'cookie_banner_accepted.json');

// Negative check - cookie must NOT exist
await checkCookies(page, 'remember_me_enabled.json', undefined, false);
```

---

## Dynamic values

You can use placeholders in files and replace them per test:

```json
{
  "REMEMBER_ME_ENABLED": {
    "name": "remember_me",
    "value": "%SESSION_ID%",
    "domain": "example.com",
    "path": "/",
    "httpOnly": true,
    "secure": true
  }
}
```

```ts
await checkCookies(page, 'remember_me_enabled.json', {
  '%SESSION_ID%': 'abc-123',
});
```

---

## Debug output

Depending on `debugCookies`, `checkCookies` logs:

- `'always'` - logs on success and failure,
- `'ifFail'` - logs only when assertion fails,
- `'never'` - does not log debug blocks.

When logging is enabled for a given outcome, output includes:

- step label (what is being checked),
- expected pattern from the file,
- current cookies in the context,
- a short `Result: ...` line (found / not found / should not exist).

Example console output for a successful positive check:

```text
[Cookies] Check cookie exists: cookie_banner_accepted (cookie_banner_accepted.json)
===== [Cookies] Expected (from file cookie_banner_accepted.json) =====
{
  "name": "cookie_banner_accepted",
  "value": "true",
  "domain": "example.com",
  "path": "/",
  "httpOnly": false,
  "secure": true
}
===== [Cookies] Current cookies =====
- cookie_banner_accepted: {"name":"cookie_banner_accepted","value":"true","domain":"example.com","path":"/","httpOnly":false,"secure":true}
===== [Cookies] Result =====
✅ Cookie "cookie_banner_accepted" found.
```

This helps quickly see why a cookie assertion passed or failed.
