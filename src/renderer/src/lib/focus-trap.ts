/**
 * Keeping Tab inside a dialog.
 *
 * A modal that only sets `aria-modal` still lets Tab walk out of it and into the
 * page behind: the browser has no idea the rest is meant to be inert, and the
 * panes underneath are real focusable content. So the shell that draws the
 * overlay also has to hold the focus.
 *
 * The decisions themselves are these two functions so they can be tested
 * without a DOM.
 */

/**
 * Candidates for a Tab stop inside a panel, in the order the browser reaches
 * them. Whether any of them really is one is {@link isTabStop}'s answer, not the
 * selector's: `button` also matches a button taken out of the Tab order with
 * `tabindex="-1"`, and a list that lets one of those through sends Tab past the
 * end of the panel and out of the dialog.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]'
].join(',');

/** The two facts about an element that decide whether Tab stops on it. */
export type TabStopFacts = {
  /** The element's `tabIndex` property: -1 for a disabled or explicitly skipped one. */
  tabIndex: number;
  /** How many boxes it lays out. A hidden element has none and is not a stop. */
  rectCount: number;
};

/**
 * Whether Tab stops on this element.
 *
 * `tabIndex` rather than a selector because the selector cannot see the whole
 * answer: a disabled control, and a control its author deliberately skipped,
 * are both -1 here whatever tag they are.
 */
export function isTabStop({ tabIndex, rectCount }: TabStopFacts): boolean {
  return tabIndex >= 0 && rectCount > 0;
}

/**
 * What Tab inside an open dialog should do.
 *
 * `hold: false` is the common case - the browser's own next stop is already
 * inside the dialog, so it is left to move there. `hold: true` means the default
 * is suppressed and focus goes to `index` among the dialog's Tab stops, or to
 * the panel itself when there are none: a dialog whose one button is disabled
 * has nowhere inside to go, and letting Tab fall through would take it out to
 * the panes behind.
 */
export type TabTarget = { hold: false } | { hold: true; index: number | null };

/**
 * `activeIndex` is the focused element's position among the dialog's Tab stops,
 * or -1 when focus is on the panel itself or somewhere else entirely.
 */
export function tabTarget(activeIndex: number, count: number, shift: boolean): TabTarget {
  if (count === 0) return { hold: true, index: null };
  if (activeIndex < 0) return { hold: true, index: shift ? count - 1 : 0 };
  if (!shift && activeIndex >= count - 1) return { hold: true, index: 0 };
  if (shift && activeIndex === 0) return { hold: true, index: count - 1 };
  return { hold: false };
}
