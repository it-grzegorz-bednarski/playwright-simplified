# Replace Attribute

← [Back to main documentation](../README.md)

## Overview

The `replaceAttribute` utility helps when you need to change HTML attributes on matching elements during a test (e.g., `href`, `src`, `aria-label`, `data-*`). It applies `setAttribute` directly in the browser.

---

## Usage

```typescript
import { replaceAttribute } from '../utils/replaceAttribute';

test('Replace link href', async ({ page }) => {
  await page.goto('https://example.com');

  // Replace href using CSS selector
  await replaceAttribute(page, 'a', 'href', 'https://example.com/new-destination');

  // Replace aria-label using Playwright locator
  const link = page.locator('a');
  await replaceAttribute(page, link, 'aria-label', 'Read more about example');
});
```

---

## Parameters

- **`page`** - The Playwright page object
- **`selector`** - CSS selector string or Playwright locator
- **`attribute`** (string) - HTML attribute name to set (e.g. `'href'`, `'aria-label'`)
- **`value`** (string) - The new attribute value for all matching elements
