# Intercepts

← [Back to main documentation](../README.md)

## Overview

Centralized configuration for HTTP intercept URL patterns used across tests.

---

## Configuration

Intercept patterns are defined in `data/intercepts.ts`:

```typescript
export const INTERCEPTS = {
  THE_INTERNET_HOME: '*/the-internet.herokuapp.com/',
  THE_INTERNET_LOGIN: '*/the-internet.herokuapp.com/login',
} as const;
```

Supported pattern types:

- **`string pattern`** - plain string with optional wildcards (`*`), internally converted to a `RegExp` (e.g. `'*/api/search/*'`)
- **`RegExp`** - full regular expression for advanced matching (e.g. `/\/api\/users\/[0-9]+\/profile/`)

Naming conventions:

- **`UPPER_SNAKE_CASE keys`** - e.g. `USER_LOGIN`, `API_SEARCH` for readability and reuse
- **`Group patterns logically`** - by feature/domain, and reflect URL structure

---

## Usage

Use intercept patterns in helpers and tests, for example with `waitForIntercept`:

```typescript
import { waitForIntercept } from '../utils/waitForIntercept';
import { INTERCEPTS } from '../data/intercepts';

const requestPromise = waitForIntercept(page, INTERCEPTS.THE_INTERNET_LOGIN);
await page.goto('http://the-internet.herokuapp.com/login');
const request = await requestPromise;
```
