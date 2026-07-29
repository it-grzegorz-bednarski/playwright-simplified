# Cookies

← [Back to main documentation](../README.md)

## Overview

Central place for configuring predefined cookies and cookie scenarios used in tests.

---

## Cookies configuration

Cookie definitions live in `fixtures/cookies/cookies.ts` in the `COOKIES` object. Example shape:

```ts
export const COOKIES = {
  COOKIE_BANNER_ACCEPTED: {
    name: 'cookie_banner_accepted',
    value: 'true',
    domain: '#COOKIE_DOMAIN#',
    path: '/',
    httpOnly: false,
    secure: true,
  },

  MARKETING_CONSENT_GIVEN: {
    name: 'marketing_consent',
    value: 'granted',
    domain: '#COOKIE_DOMAIN#',
    path: '/',
    httpOnly: false,
    secure: true,
  },
};
```

Guidelines:

- Keep all cookie definitions in `fixtures/cookies/cookies.ts`.
- Use meaningful keys that describe the behavior (e.g. `COOKIE_BANNER_ACCEPTED`).
- Align `domain`, `path`, and security flags (`httpOnly`, `secure`) with your environment.
- Use placeholders (for example `#COOKIE_DOMAIN#`) when a value should be resolved at runtime.

For using individual cookies in tests, see **[Set Cookies](./setCookies.md)**.

### Runtime placeholder replacement

If environments/brands/locales use different cookie values, keep placeholders in `COOKIES` and replace them at runtime.

```ts
export const COOKIES = {
  COOKIE_BANNER_ACCEPTED: {
    name: 'cookie_banner_accepted',
    value: 'true',
    domain: '#COOKIE_DOMAIN#',
    path: '/',
    httpOnly: false,
    secure: true,
  },
};
```

Then inject cookies with replacements:

```ts
await setCookiesScenario(page, 'privacyMinimal', {
  replacements: {
    '#COOKIE_DOMAIN#': envByLocale('COOKIE_DOMAIN'),
  },
});
```

This keeps cookie configuration centralized while allowing runtime overrides.

---

## Cookie scenarios configuration

Reusable combinations of cookies are defined next to cookies in `fixtures/cookies/cookies.ts`:

```ts
export const COOKIE_SCENARIOS = {
  privacyMinimal: ['COOKIE_BANNER_ACCEPTED'],
  fullTracking: ['COOKIE_BANNER_ACCEPTED', 'MARKETING_CONSENT_GIVEN', 'REMEMBER_ME_ENABLED'],
};
```

Use these scenarios in tests via the `setCookiesScenario` helper (see **[Set Cookies Scenario](./setCookiesScenario.md)**).
