# Otty parity notes: colour, images, scrolling, Markdown

What Fleet looks like next to [Otty](https://otty.app) on this machine, why the two
differ, and what of it Fleet can and cannot close. Written from the two binaries
rather than from a description of either: Otty here is the *installed app*
(`/Applications/Otty.app`, `io.appmakes.otty` 1.4.1, Rust), which is **not**
`otty-shell/otty` — the repo compared in [pane-layout-review.md](pane-layout-review.md).
They are different products, and every claim below was checked against the app
bundle or a running pane.

## 1. Terminal colour

**Symptom.** The same agent output that is coloured in Otty arrives in one colour
in Fleet.

**Cause.** Nothing to do with drawing. Both terminals give their panes
`TERM=xterm-256color` and neither sets `TERM_PROGRAM` for local panes (measured in
a live Otty pane and in a live Fleet pane). Fleet, though, merged the *launcher's*
environment into every pane: started from a shell inside another terminal, or from
an agent CLI, Fleet inherited that process's `NO_COLOR`, `TERM_PROGRAM=otty` and
`OTTY_*` bookkeeping. `NO_COLOR=1` is the one that shows: every colour-aware CLI
honours it, so Claude Code, Codex, `git`, `ls` and `bat` all print plain text and no
theme in Settings can undo it.

Measured, in a Fleet pane:

| Environment Fleet was started from | What the pane saw | How a `printf` with SGR 31/32/34/38;2 rendered |
| --- | --- | --- |
| `NO_COLOR=1 TERM_PROGRAM=otty OTTY_*` | `NO_COLOR=[1]` | one colour |
| same, after the fix below | `NO_COLOR=[] COLORTERM=[truecolor] TERM_PROGRAM=[Fleet]` | `rgb(255,92,87)`, `rgb(90,247,142)`, `rgb(87,199,255)`, `rgb(255,128,0)` |

**Fixed** in `src/main/shell-env.ts`. The launcher's terminal identity is removed
before the login shell is asked for the user's environment, so a `NO_COLOR` the
user sets in their own rc still comes back and is still honoured, and panes are
stamped with Fleet's own `TERM_PROGRAM=Fleet` / `COLORTERM=truecolor`. `TERM` comes
from node-pty's pty name and is already Fleet's. A pane also waits for the login
shell's answer before it copies the environment, rather than copying the
half-built one while the answer is still in flight.

`VSCODE_` is deliberately *not* stripped by prefix. A Fleet started from a VS Code
terminal inherits `GIT_ASKPASS` pointing at a script that needs
`VSCODE_GIT_ASKPASS_NODE` / `VSCODE_GIT_ASKPASS_MAIN` to run, so dropping that
namespace by prefix would take git authentication with it; VS Code's identity is
`TERM_PROGRAM=vscode`, and that is what is dropped.

## 2. Pasting an image

Otty's terminal has Edit actions Fleet's does not, read out of its own settings
bundle (`Otty.app/Contents/Resources/settings-ui.html`, `key:"edit"`):

| Otty action | Label | Fleet terminal |
| --- | --- | --- |
| `insert_screenshot` | Insert Screenshot | absent |
| `insert_file_path` | Insert from File Path... | absent |
| `paste_file_base64` | Paste File Base64-Encoded… | absent |
| `paste_continue_composer` | Paste and continue in Composer | absent |

That is why an image can be pasted into an agent CLI under Otty and not under
Fleet: the terminal captures the clipboard image, writes it somewhere, and inserts
its path (or its bytes) into the pane. Fleet's terminal has no paste handler at all
beyond xterm's own text paste, so the clipboard image is simply dropped.

Fleet's **agent composer** is a different story — it already attaches a pasted
image (`AgentThread.tsx` `onPaste` → `attachFiles`, with `main/agent/attachments.ts`
storing a screenshot that has no file of its own).

**Fixed**, in `src/main/paste-image.ts`, the `clipboard:read-image` IPC channel
and the pane's own paste chord. `Cmd+V` is claimed by the pane (`Ctrl+Shift+V`
elsewhere), the clipboard is read as text first and as a picture only when there
is no text, and a picture is written to `$TMPDIR/fleet-paste/image-<ms>.png` and
inserted as its absolute path - the interface the agent CLIs already accept (Codex
and Claude Code take an image path in the prompt, and `pi` documents
`@image.png`).

Measured with a 2400x1600 screenshot on the clipboard, in a pane driven over CDP:

| Chord | What the pane's input line got | What landed on disk |
| --- | --- | --- |
| `Cmd+V` | `/var/folders/.../T/fleet-paste/image-1789328612168.png` | the same file, 114034 bytes |
| `Ctrl+Shift+V` | a second path of the same shape | `image-1789328629373.png`, 114034 bytes |

Plain `Ctrl+V` is deliberately left alone: it still sends `\x16`, which is what
lets a CLI that reads the clipboard itself - Codex does, it shows `[Image #1]`
without being handed a file - keep working for the people who learned that key
here. Otty's other three Edit actions (`insert_file_path`, `paste_file_base64`,
`paste_continue_composer`) are still absent; only the screenshot path is closed.

The text branch is unchanged code (`readText` → `term.paste`), so it was not
re-driven: the machine's clipboard held the screenshot and was left alone.

## 3. Scrolling

**Symptom.** Scrolling a pane reads as a series of jumps rather than as movement.

**Cause.** The two terminals disagree about what a scroll is. Otty ships
`terminal-scroll-smooth` (label "Smooth Scroll (Terminal)", `defaultValue: true`,
category `controls`): "Scroll the viewport at pixel granularity instead of
snapping row by row; the offset snaps back to a row boundary when the gesture ends
so glyphs stay pixel-aligned. Default on for macOS-native scroll feel." Fleet's
panes are xterm.js 6.0.0 with the **DOM renderer**, and that renderer has no
sub-row offset at all: the visible band is a fixed list of row elements whose
*text* is replaced, so `viewportY` is the only position that exists and every step
is a whole row. Measured in a live pane: the row elements carry
`transform: none` with `scrollTop: 0`, the viewport reports
`scrollHeight === clientHeight`, and scrolling swaps row contents
(`first row 1964 → 1936`). Nothing can be animated below one row.

**Fixed as far as this renderer goes** in `src/renderer/src/hooks/use-terminal.ts`:
`Terminal` now takes `smoothScrollDuration: 125`. xterm animates its virtual
scroll offset over that duration and commits rows as the offset crosses them, so
the same rows arrive spread over the animation instead of in one frame. This is
the value VS Code's terminal uses for `terminal.integrated.smoothScrolling`
(`RenderConstants.SmoothScrollDuration = 125` in `xtermTerminal.ts`).

Measured against the same xterm 6.0.0 build, in Chromium, on the path a wheel
notch takes (`Viewport.scrollLines` → `setScrollPosition({reuseAnimation: true})`):

| `smoothScrollDuration` | `viewportY` after one notch | Time to settle |
| --- | --- | --- |
| `0` | `376 → 373`, one step | one frame |
| `125` | `376 → 375 → 374 → 373` | 57ms |
| `125`, seven rows | `376 → 374 → 372 → 371 → 370` | 81ms |

Frame pacing during a burst of 20 notches 30ms apart: median 16.7ms, p95 17.7ms,
max 17.8ms, no frame over 33ms - the extra row repaints do not cost a frame.

One consequence worth knowing: a smooth animation is cancelled by the content
itself. xterm stops animating and snaps when the buffer's `y` position changes for
any other reason - output arriving, a resize - which is what keeps a pane that is
following its output pinned to the bottom.

**What is left.** Pixel granularity itself. It needs a renderer that can offset
the whole grid by a fraction of a row, which the DOM renderer cannot, so this is
the same class of project as the inline images below rather than a setting.

## 4. Markdown

Both render it, in different places.

- **Otty** renders Markdown/SVG/HTML as a *file pane* preview by default
  (`editor-default-to-preview-readonly`) and can show an agent's session JSONL as
  syntax-highlighted text (`view_as_jsonl`).
- **Fleet** renders Markdown in `MarkdownPane` (preview, find bar, Mermaid,
  Shiki-highlighted code blocks, copy-as), and in the agent transcript through
  `AgentMarkdown`/Shiki.

So a *file* of Markdown looks comparable in both, and Fleet's terminal does not
render Markdown for the same reason Otty's does not: a terminal shows what the
program in it prints. Where the two genuinely differ is *inside a pane running an
agent*: Otty's own chrome names the session and its state, and — see below — Otty's
terminal can draw inline images.

## 5. Not closeable cheaply, or not at all

| Otty capability | Evidence in the bundle | Fleet today |
| --- | --- | --- |
| Inline images in the terminal (Kitty/iTerm2/Sixel) | `otty features list`: `kitty-image`, `iterm-image`, `sixel-image` | no `@xterm/addon-image`, no protocol handling |
| Terminal-side syntax highlighting | `syntaxes.bin`, `view_as_jsonl` | none |
| Text drag/paste modes (shell-escaped, selection, base64) | `key:"edit"` actions above | none |

Inline images are the largest single gap: xterm.js has no support for the Kitty
graphics protocol, so closing it means either an addon that renders images as DOM
overlays above the grid (what `@xterm/addon-image` does for iTerm2/Sixel) or a
different renderer. Nothing about the pane layout or the agent plumbing blocks it;
it is a rendering-layer project of its own.

## Reproducing the measurements

```bash
# What a pane is actually given, from inside the pane:
printf 'TERM=%s COLORTERM=[%s] NO_COLOR=[%s] TERM_PROGRAM=[%s]\n' "$TERM" "$COLORTERM" "$NO_COLOR" "$TERM_PROGRAM"
printf '\033[31mRED \033[32mGREEN \033[34mBLUE \033[38;2;255;128;0mTRUE\033[0m\n'

# What the app was started with (macOS):
ps eww -p "$(pgrep -f 'Fleet.app/Contents/MacOS/Fleet')" | tr ' ' '\n' | grep -E '^(NO_COLOR|COLORTERM|TERM_PROGRAM|OTTY_)='

# Otty's smooth-scroll setting, out of its own settings bundle:
python3 -c "import io;s=io.open('/Applications/Otty.app/Contents/Resources/settings-ui.html',encoding='utf-8',errors='replace').read();i=s.find('terminal-scroll-smooth');print(s[i-50:i+400])"

# Otty's own view of its panes:
/Applications/Otty.app/Contents/MacOS/otty-cli pane list          # agent, session id, agent state per pane
/Applications/Otty.app/Contents/MacOS/otty-cli features list      # what its terminal can draw
```
