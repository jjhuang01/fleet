# Following a pane is a state a gesture changes, not a position

## What happened

An agent streaming into a pane made scrollback unreadable. Scrolling up to read
something that had already gone by turned the pane's "scrolled up" strip on, and
the next chunk of output took the view back to the bottom - the strip went out
again in the same moment. Reading back through a pane that is printing is most of
what a pane is for, so this was the common case, not a corner.

## Why it happened

Whether a pane should follow its output was derived from a position, on every
scroll, including the ones the output itself causes:

```ts
const isAtBottom = (): boolean => {
  const buf = term.buffer.active;
  return buf.viewportY >= buf.baseY - 2; // two rows of tolerance
};

term.onScroll(() => {
  // runs for output too
  if (isAtBottom()) {
    pinnedToBottom = true;
    options.onScrollStateChange?.(false);
  }
});
```

Two rows is a whole wheel notch of reading, so a view the user had just taken up
still counted as "at the bottom" - and `writeToTerm` calls `scrollToBottom()` on
every chunk while the flag says so. The wheel path added a second, independent
failure: it decided in a frame (`requestAnimationFrame(() => updatePinnedState())`),
and by then the write's `scrollToBottom` had already put the viewport back inside
those two rows, so the gesture was read as "still following".

The tolerance itself was not baseless. During fast output `viewportY` briefly
lags `baseY`, and without tolerance a pane would drop out of follow mode exactly
when it is busiest. But that lag matters when judging _the user's own_ downward
gesture, not when deciding whether new content may steal the view.

## What the ecosystem settled on

The same problem is the defining one for AI chat UIs, and the answer there is the
same shape: follow is a state that only user intent changes.

- `stackblitz/use-stick-to-bottom` (MIT; the Vercel AI SDK and shadcn's chat UI
  build on it - "Designed with AI chat bots in mind") states the rule in its
  README: "Allows the user to cancel the stickiness at any time by scrolling up"
  and "Clever logic distinguishes the user scrolling from the custom animation
  scroll events (without doing any debouncing which could cause some events to be
  missed)".
- Content arriving is explicitly not an input to that state. The same README
  sells the opposite of a position check: "Correctly handles Scroll Anchoring.
  This is where when content above the viewport resizes, it doesn't cause the
  content currently displayed in viewport to jump up or down."
- `assistant-ui/assistant-ui` reaches the same conclusion the hard way, with the
  check that separates the two causes: a scroll is the user's only when
  `scrollTop` went _down_ while `scrollHeight` stayed the same
  (`packages/store/src/utils/viewport-scroll.ts`), so content growing taller can
  never be mistaken for a gesture. Its thread viewport cancels the follow only on
  that, and `lastScrollTop` / `lastScrollHeight` are kept precisely to tell its own
  smooth scrolls apart from the user's.
- The failure is common enough to have its own reports in the projects that use
  this: `vercel/chatbot#577` ("scroll up to see the previous conversation it
  scrolls down after a delay without being triggered") and `assistant-ui#4140`
  ("after the user scrolls away from bottom, subtree mutations should not pull the
  viewport back to bottom"). Both are this bug, in a chat transcript instead of a
  pane.
- Browser-level scroll anchoring is not the answer either, and turning it off to
  take over is the wrong move: MDN notes it is "enabled by default in any browser
  that supports it" and `overflow-anchor: none` is an explicit opt-out, which is
  what `use-stick-to-bottom` avoids relying on in the first place ("Does not
  require `overflow-anchor` browser-level CSS support which Safari does not
  support").

`docs/otty-parity-notes.md` carries the comparison with Otty, which scrolls
through iced and has no equivalent of this state machine to copy.

## The fix

`lib/scroll-follow.ts` holds both rules as functions, so the policy is testable
without a terminal:

- `followAfterWheel` - a gesture. Upward always escapes (unless the pane has no
  scrollback, where an upward notch is not an escape but a no-op, and unpinning
  would stop a fresh pane from following its first command). Downward re-locks
  once the view has reached the bottom, within the two-row tolerance that fast
  output earns.
- `followAfterContentScroll` - not a gesture. Output arriving, the pane's own
  `scrollToBottom`, and a resize may only ever _re-lock_, and only at the exact
  bottom. This is the one that stops the yank.

`use-terminal.ts` wires both: the wheel, Page keys and the modified arrows all
call one `userScrolled(upward)`, `term.onScroll` calls the content rule, and
`fitPreservingScroll` reconciles with the same exact-bottom test. The tolerant
`isAtBottom` and the `updatePinnedState` that only the keyboard path still used
are gone with it, so there is no second opinion about what "at the bottom" means
in the content path.

## How it was measured

In a live pane streaming a line every 50ms, with the "scrolled up" strip as the
observable:

In the packaged build, with a pane printing a line every 50ms, one upward wheel
notch over the middle of the pane turned the "scrolled up" strip on and the pane
stayed there: the stream markers in view held at `1..32` across eight samples over
1.7 s while the stream kept writing. The previous round had the same script and
the same gesture catch the strip going out again within 220 ms
([2026-09-14-xterm-smooth-scroll-dies-when-the-buffer-moves.md](2026-09-14-xterm-smooth-scroll-dies-when-the-buffer-moves.md)),
which is the yank from the other side. The script is `/tmp/fleet-qa/qa-unpin3.mjs`

- it drives the packaged app over CDP and sends the gesture through
  `Input.synthesizeScrollGesture` with `gestureSourceType: mouse`.

Both halves of the rule are locked by a test that fails when the fix is reverted:
putting the two-row tolerance back into `followAfterContentScroll` fails `never
takes the view away from where the user put it`, and 6 cases in
`src/renderer/src/lib/__tests__/scroll-follow.test.ts` cover the rest.

## Guardrail

Do not derive the intent to follow from a position read while the pane is
printing: the position is exactly what the output is moving. A gesture changes
the state, content may only re-lock it at the exact bottom, and the one place
tolerance is allowed is the user's own downward gesture. Re-adding a tolerant
"am I at the bottom" test to the content path restores the yank, whatever the
tolerance is called.
