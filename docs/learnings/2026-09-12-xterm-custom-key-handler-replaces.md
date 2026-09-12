# xterm's custom key handler replaces, so the last `attachCustomKeyEventHandler` won

## What happened

Users asked for macOS `Cmd+Delete` to clear the terminal's input line, the way every other macOS
text field behaves. Sending the physical key did nothing at all: the line stayed put.

The obvious explanation - "xterm does not translate Cmd+Backspace into a control character" - was
true but incomplete. The pane had no transformer for it either, and adding one to the existing
scroll/scrollback handler would still have failed.

## The actual cause

`use-terminal.ts` called `term.attachCustomKeyEventHandler` **twice**: once to reserve `Cmd/Ctrl+K`
for the command palette, and later to translate `Shift+Enter` into `Meta+Enter`.

xterm's API does not accumulate handlers:

```ts
public attachCustomKeyEventHandler(customKeyEventHandler: CustomKeyEventHandler): void {
  this._core.attachCustomKeyEventHandler(customKeyEventHandler);
}
// CoreBrowserTerminal
public attachCustomKeyEventHandler(customKeyEventHandler: CustomKeyEventHandler): void {
  this._customKeyEventHandler = customKeyEventHandler;   // assignment, not a list
}
```

So the second call silently replaced the first. Anything added to the "first" handler was dead code

- including the `Cmd/Ctrl+K` guard it was there for, which had been relying on a window-level
  listener to open the palette and letting xterm _also_ send `Ctrl+K` (readline `kill-line`) to the
  PTY on Linux/Windows.

## The fix

One handler, one `attachCustomKeyEventHandler` call, checked in order: `Cmd/Ctrl+K` (return `false`),
then the macOS translation, then `Shift+Enter`, then `Ctrl+Shift+C` / `Ctrl+Shift+V`, then `true` for
everything else.

The macOS translation lives in `src/renderer/src/lib/terminal-keybindings.ts` so it is testable
without a Terminal instance:

```ts
if (
  platform === 'darwin' &&
  event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey &&
  (event.key === 'Backspace' || event.key === 'Delete')
) {
  return '\x15'; // ^U: readline/zsh kill-whole-line
}
```

`Backspace` and `Delete` both map: macOS keyboards reach `delete backward` through either key name
depending on the external keyboard.

## How it was verified

Screen scraping through `.xterm-rows` is not proof - ZLE repaints leave the previous row visible in
the viewport. The discriminating check is a command that can only be formed if the line was _not_
cleared: type a probe, press the chord, then send `echo MARKER\n`. `fleet-probe-abcecho MARKER` on
screen means the chord never reached the shell; a clean `MARKER` means `^U` landed. Both `Cmd+Delete`
and `Cmd+Backspace` produced the clean variant, a plain `Backspace` still deleted exactly one
character, and `Cmd+K` still opened the palette.

## Guardrail

Never call `attachCustomKeyEventHandler` more than once per `Terminal`. Add new key behaviour to the
single consolidated handler, and prefer extracting the mapping into a pure function that a unit test
can call.
