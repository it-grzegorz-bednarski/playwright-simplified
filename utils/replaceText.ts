import { Locator, Page } from '@playwright/test';

/**
 * Replaces the text content of all elements matching the given selector.
 * This function is useful for updating text content in elements that cannot be easily changed
 * through standard input methods (e.g., span elements, divs with contentEditable, etc.).
 *
 * @param page - The Playwright page object
 * @param selector - CSS selector or Playwright locator to find target elements
 * @param text - The new text content to set for all matching elements
 *
 * @example
 * ```typescript
 * await replaceText(page, '.price', '$99.99');
 * ```
 */
export default async function replaceText(
  page: Page,
  selector: string | Locator,
  text: string
): Promise<void> {
  const locator = typeof selector === 'string' ? page.locator(selector) : selector;

  const elementHandles = await locator.elementHandles();

  if (elementHandles.length === 0) {
    throw new Error(`replaceText: No elements matched for : ${selector}`);
  }

  for (const element of elementHandles) {
    await element.evaluate((el, newText) => {
      el.textContent = newText;
    }, text);
  }
}
