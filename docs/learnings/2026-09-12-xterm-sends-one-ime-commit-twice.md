# xterm hands one IME commit to the PTY twice

## What happened

Typing English with a Chinese IME active and pressing Enter to commit produced the text twice: the
command ran, then the same text appeared again at the fresh prompt. Selecting a candidate with a
number avoided it, which is why it looked like a candidate-window quirk rather than a terminal bug.

## The actual cause

Two xterm code paths can each send the same composition:

1. `CompositionHelper.keydown` treats a keydown during a composition as "flush now":
   `_finalizeComposition(false)` writes `textarea.value.substring(start, end)` to the PTY.
2. `CompositionHelper.compositionend` calls `_finalizeComposition(true)`, which sets a
   `setTimeout(0)` that re-reads the textarea and sends `substring(start)`.

The first path never records what it sent. `_dataAlreadySent` - the field that exists to stop
exactly this duplication (issue #3191) - is only written by `_handleAnyTextareaChanges`, which runs
for `keyCode === 229` keystrokes. So when the IME commits _after_ the Enter keydown (RIME and
Squirrel on macOS do), the textarea still holds the text, the delayed path finds it, and the text
goes out a second time.

Upstream has not fixed it: xterm 6.0.0 is the latest stable, master carries the same
`_finalizeComposition`, and the fixes are still open PRs (#6060, #6089, #6090). Upgrading is not a
fix.

## The fix

`CompositionGuard` (`src/renderer/src/lib/composition-guard.ts`) sits in front of the one place Fleet
writes user input to the PTY - `term.onData` in `use-terminal.ts`. It watches
`compositionupdate` / `compositionend` on `term.textarea`, forwards the first copy of a composition
and drops an identical repeat that arrives before the episode closes (250 ms after
`compositionend`). A new composition resets the guard, so committing the same text twice on purpose
still works, and Enter keeps its existing meaning: the flush still happens and still submits.

## How it was verified

`Input.imeSetComposition` over CDP reproduces the exact ordering (`compose -> Enter -> insertText`).
Before the guard the pane showed the command twice; after it, once:

```
before: ["/tmp echo IMEY", "IMEY", "/tmp echo IMEY"]
after:  ["/tmp echo FDUP1", "FDUP1", "/tmp"]
```

The commit-only path (`compose -> insertText`, no Enter) and plain keyboard typing both still reach
the shell exactly once, and `composition-guard.test.ts` covers the repeat, the new-composition case
and the episode timeout.

## Guardrail

Treat one IME commit as one PTY write. Anything that forwards composition text a second time
produces user-visible duplication, and the duplicate arrives _after_ the first copy already ran, so
it can silently execute a second command.
