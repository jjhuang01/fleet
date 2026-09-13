/**
 * Whether a pane should keep following its output.
 *
 * This is the AI-chat problem, not a terminal one: content arrives while the
 * user is reading further up, and every appended line pulls the view back down
 * unless the app is careful. The ecosystem answer is `use-stick-to-bottom`
 * (StackBlitz, MIT - what Vercel's AI SDK and shadcn's chat UI use) and
 * assistant-ui's viewport hook: the *intent* to follow changes only when the user
 * acts. Content growing, the app's own scrolls and a resize must never re-lock a
 * view the user has taken away from the bottom.
 *
 * Fleet used to do the opposite: a tolerant "am I at the bottom" check ran on
 * every content-driven scroll, so a pane the user had nudged one row up was
 * still "at the bottom" and the next chunk of output yanked it back. That is the
 * shudder - the view refusing to stay where it was put - and it is also why the
 * tolerance has to stay out of the content path.
 */

/** Rows of lag that fast output produces, allowed when *the user* asks. */
export const AT_BOTTOM_TOLERANCE_ROWS = 2;

/**
 * A wheel notch. The direction is the intent: up means "let me read", down means
 * "take me back", and only the second one has to look at the position, because
 * the view is only back under the output when it has actually reached it.
 *
 * A pane with nothing behind it has no scrollback to read, so an upward notch
 * there is not an escape: unpinning would silently stop a fresh pane from
 * following its first command.
 */
export function followAfterWheel(state: {
  follow: boolean;
  upward: boolean;
  viewportY: number;
  baseY: number;
}): boolean {
  if (state.upward) return state.baseY > 0 ? false : state.follow;
  return state.viewportY >= state.baseY - AT_BOTTOM_TOLERANCE_ROWS;
}

/**
 * A scroll the pane did not ask the user about: output arriving, the pane's own
 * `scrollToBottom`, a resize.
 *
 * None of those may take the view away from where the user put it, so this only
 * ever re-locks, and only when the view is exactly at the bottom - which is what
 * the pane's own scroll-to-bottom leaves behind, and what a user who scrolled all
 * the way down leaves behind too.
 */
export function followAfterContentScroll(state: {
  follow: boolean;
  viewportY: number;
  baseY: number;
}): boolean {
  if (state.follow) return true;
  return state.viewportY >= state.baseY;
}
