# xterm's smooth scroll dies whenever the buffer moves on its own

## What looked right

A pane scrolled a whole row at a time, and Otty - the terminal this fork is
measured against - ships `terminal-scroll-smooth`, "scroll the viewport at pixel
granularity instead of snapping row by row". xterm has one option that reads like
the same thing, `smoothScrollDuration`, and VS Code's terminal sets it to 125 for
`terminal.integrated.smoothScrolling`. It was set to 125 here.

## What actually happens

xterm's `Scrollable.setScrollPositionSmooth` does not move anything itself: it
records the target and schedules a frame. The first movement happens on the next
animation frame, and each frame after that moves part of the way.

Meanwhile `Viewport._sync`, which runs whenever the buffer's `y` position changes
- that is, on every chunk of output - does this:

```ts
// If ydisp has been changed by some other component (input/buffer), then stop
// animating smooth scroll and scroll there immediately.
if (ydisp !== this._latestYDisp) {
  this._scrollableElement.setScrollPosition({ scrollTop: ydisp * cell.height });
}
```

`setScrollPosition` without `reuseAnimation` is the immediate path, which cancels
the pending animation. So in any pane that is printing, the wheel's scroll is
cancelled before it moves a row: the view never leaves the bottom. `_latestYDisp`
only stops looking "changed" once a user scroll has committed a row, which is the
thing the cancellation prevents.

## How it was measured

Against the same xterm 6.0.0 build, in Chromium, writing a line every 30ms and
then asking for three rows up (`scrollLines(-3)`, the call a wheel notch becomes):

| `smoothScrollDuration` | `viewportY` | What it did |
| --- | --- | --- |
| `0` | `386 -> 383` | scrolled up and stayed |
| `125` | `386 -> 386 ... 406` | did nothing, then followed the stream |

In a live pane: a wheel-up while the pane was printing turned the pane's
"scrolled up" affordance on, and xterm re-pinned it within 220ms - the same
finding from the other side.

The same option does work when the pane is quiet, which is what makes it look
correct in a small test: a settled terminal stepped `376 -> 375 -> 374 -> 373`
over 57ms at 125, against one step at 0.

## Guardrail

Do not enable `smoothScrollDuration` for panes. Pixel-granularity scrolling needs
a renderer that can offset the grid by a fraction of a row - xterm's DOM renderer
draws whole rows and has no sub-row offset - which is a rendering project, not a
setting. `docs/otty-parity-notes.md` carries the comparison with Otty.
