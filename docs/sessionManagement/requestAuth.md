# Request auth helpers

← [Back to main documentation](../../README.md)
↑ [Back to Sessions](./sessions.md)

## Overview

Helpers for extracting auth-related values from intercepted requests.

**Implementation:** `utils/requestAuth.ts`

---

## extractBearerAuthHeader

Gets the `Authorization` header value in `Bearer ...` format from an intercepted request.

### Usage

```ts
import { extractBearerAuthHeader } from '@utils/requestAuth';
import { waitForIntercept } from '@utils/waitForIntercept';

const requestPromise = waitForIntercept(page, '/api/login');
// ...trigger the request (e.g., await page.click('button[type="submit"]'))...
const authHeader = await extractBearerAuthHeader(requestPromise);
// authHeader === 'Bearer eyJ...'
```

