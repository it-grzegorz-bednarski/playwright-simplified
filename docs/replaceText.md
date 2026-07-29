# Replace Text

← [Back to main documentation](../README.md)

## Overview

The `replaceText` utility helps when you need to quickly substitute text in many dynamic UI elements during tests (e.g., changing prices, dates, labels). It targets textContent directly, making it handy for spans/divs and similar nodes.

---

## Usage

```typescript
import replaceText from '../utils/replaceText';

test('Replace text in elements', async ({ page }) => {
  await page.goto('https://example.com');

  // Replace text using CSS selector
  await replaceText(page, 'h1', '$99.99');

  // Replace text using Playwright locator
  const titleLocator = page.locator('h1');
  await replaceText(page, titleLocator, 'Updated Title');
});
```

---

## Parameters

- **`page`** - The Playwright page object
- **`selector`** - CSS selector string or Playwright locator
- **`text`** (string) - The new text content for all matching elements
