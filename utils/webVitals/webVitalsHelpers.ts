import type { Page } from '@playwright/test';

/**
 * Type-safe target assertion for Web Vitals interaction actions.
 * Throws a descriptive error when the POM type does not match the expected class.
 *
 * @example
 * const p = requireTarget(target, CheckboxesPage, 'flipBothCheckboxes');
 * await p.flipBothCheckboxes();
 */
export function requireTarget<T>(
  target: unknown,
  expected: new (...args: never[]) => T,
  actionName: string
): T {
  if (target instanceof expected) return target;

  throw new Error(
    `Web Vitals action "${actionName}" requires target to be ${expected.name}. ` +
      'Make sure you pass the matching POM object to runWebVitals() for this action.'
  );
}

/**
 * Built-in fallback interaction: clicks in the centre of the viewport.
 * Used automatically when triggerInteractionForInp is true but no
 * custom interactionAction / interactionActionName is provided.
 */
export async function centerClickFallback(page: Page): Promise<void> {
  try {
    const vp = page.viewportSize();
    const x = vp ? Math.floor(vp.width / 2) : 400;
    const y = vp ? Math.floor(vp.height / 2) : 300;
    await page.mouse.click(x, y);
  } catch {
    // Ignore — page may not accept clicks.
  }
}
