import { Locator, Page } from '@playwright/test';

/**
 * Replaces an HTML attribute value on all elements matching the given selector.
 * Useful for modifying `href`, `src`, `aria-label`, `data-*`, or any other
 * attribute during tests without triggering standard form-input flows.
 *
 * @param page - The Playwright page object
 * @param selector - CSS selector string or Playwright locator to find target elements
 * @param attribute - The name of the HTML attribute to set (e.g. 'href', 'src', 'aria-label')
 * @param value - The new attribute value to apply to all matching elements
 *
 * @throws {Error} When no elements are found matching the selector
 *
 * @example
 * await replaceAttribute(page, 'a.download-link', 'href', '/files/report.pdf');
 */
export async function replaceAttribute(
  page: Page,
  selector: string | Locator,
  attribute: string,
  value: string
): Promise<void> {
  const locator = typeof selector === 'string' ? page.locator(selector) : selector;

  const elementHandles = await locator.elementHandles();

  if (elementHandles.length === 0) {
    throw new Error(`replaceAttribute: No elements matched for: ${selector}`);
  }

  for (const element of elementHandles) {
    await element.evaluate(
      (el, { attr, val }) => {
        (el as HTMLElement).setAttribute(attr, val);
      },
      { attr: attribute, val: value }
    );
  }
}
