# iFrames

← [Back to main documentation](../README.md)

## Overview

In Playwright, you can interact with elements inside iframes using the `frameLocator` API. This lets you locate and work with elements inside nested browsing contexts (iframes) without switching the whole page context manually.

---

## Usage

Sample usage:

```ts
// Locate the iframe by attribute (e.g. id, title, name)
const frame = page.frameLocator('iframe[id="mce_0_ifr"]');

// Interact with elements inside the iframe
await frame.locator('#tinymce').fill('Sample text inside iframe');
```

You can also assert the presence, visibility or text content of elements inside iframes:

```ts
// Visibility assertion
await expect(frame.locator('button[type="submit"]')).toBeVisible();

// Text assertion
const content = await frame.locator('#tinymce').innerText();
await expect(content).toContain('Sample text inside iframe');
```

For more details, see the **[Playwright documentation on frames](https://playwright.dev/docs/frames)**.
