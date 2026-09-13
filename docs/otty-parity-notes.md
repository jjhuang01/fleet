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
| `insert_screenshot` | Insert Screenshot | `Cmd+V` below |
| `insert_file_path` | Insert from File Path... | absent |
| `paste_file_base64` | Paste File Base64-Encoded… | absent |
| `paste_continue_composer` | Paste and continue in Composer | absent |

That is why an image could be pasted into an agent CLI under Otty and not under
Fleet: the terminal captures the clipboard image, writes it somewhere, and inserts
its path (or its bytes) into the pane. Fleet's terminal had no paste handler at all
beyond xterm's own text paste, so the clipboard image was simply dropped.

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

Three things a review of the first version turned up, all fixed in
`87c658d2`:

| Problem | What the paste does now |
| --- | --- |
| A pane on the far side of ssh cannot open a path in this machine's temp directory | The picture goes through the same upload the drag-and-drop path uses - into the remote shell's own directory - and the prompt gets the remote path |
| Text and picture were read by two IPC calls, so a copy landing between them lost the paste | One call answers text-or-picture from a single read, in `main` |
| The file was world-readable in a shared `/tmp` and never removed | `0700` directory, `0600` file, swept a week after the paste |

The console paste that does not carry a file - `insert_file_path`,
`paste_file_base64`, `paste_continue_composer` - is still absent.

## 3. Scrolling

**Symptom.** Scrolling a pane reads as a series of jumps rather than as movement,
and Otty's is smooth.

**Why they differ.** Otty ships `terminal-scroll-smooth` (label "Smooth Scroll
(Terminal)", `defaultValue: true`, category `controls`): "Scroll the viewport at
pixel granularity instead of snapping row by row; the offset snaps back to a row
boundary when the gesture ends so glyphs stay pixel-aligned. Default on for
macOS-native scroll feel." Fleet's panes are xterm.js 6.0.0 with the **DOM
renderer**, and that renderer has no sub-row offset at all: the visible band is a
fixed list of row elements whose *text* is replaced, so `viewportY` is the only
position that exists and every step is a whole row. Measured in a live pane: the
row elements carry `transform: none` with `scrollTop: 0`, the viewport reports
`scrollHeight === clientHeight`, and scrolling swaps row contents
(`first row 1964 → 1936`).

**What was tried, and why it is not in the build.** The one option that reads
like Otty's is xterm's `smoothScrollDuration`, which VS Code's terminal sets to
125 for `terminal.integrated.smoothScrolling`. It eases the viewport between
positions, row by row, and it works on a quiet terminal:

| `smoothScrollDuration` | `viewportY` after one notch | Time to settle |
| --- | --- | --- |
| `0` | `376 → 373`, one step | one frame |
| `125` | `376 → 375 → 374 → 373` | 57ms |
| `125`, seven rows | `376 → 374 → 372 → 371 → 370` | 81ms |

...and it fails on a busy one. xterm's viewport resyncs to the buffer whenever the
buffer moves on its own - every chunk of output - and that resync sets the
position immediately, cancelling the animation. So in a pane that is printing, an
upward notch is swallowed: with a line arriving every 30ms, three rows up moved
`viewportY` `386 → 383` at `0`, and at `125` the viewport stayed at `386` and then
followed the stream to `406`. A live pane showed the same from the other side: a
wheel-up turned the "scrolled up" affordance on and xterm re-pinned it 220ms
later.

The option was therefore removed again (`987714f6`), with the measurement written
where a maintainer would re-add it.
[docs/learnings/2026-09-14-xterm-smooth-scroll-dies-when-the-buffer-moves.md](learnings/2026-09-14-xterm-smooth-scroll-dies-when-the-buffer-moves.md)
holds the mechanism.

**The other half of the scrolling problem was Fleet's own.** Otty's scroll option is about *how* a
pane moves; whether a pane should follow its output at all is the AI-chat problem, and the rule the
ecosystem settled on there is that only a user gesture changes it (`stackblitz/use-stick-to-bottom`,
"allows the user to cancel the stickiness at any time by scrolling up", which the Vercel AI SDK and
shadcn's chat UI build on). Fleet inferred it from the position instead, with two rows of tolerance,
so output arriving put a reader who had scrolled one notch up back at the bottom - the "scrolled up"
strip appeared and the next chunk took it away. That is fixed (`a11c2913`): an upward gesture escapes,
a downward one re-locks once the view has reached the bottom, and output may only re-lock at the exact
bottom.
[docs/learnings/2026-09-14-follow-intent-is-a-user-gesture.md](learnings/2026-09-14-follow-intent-is-a-user-gesture.md)
carries the measurement and the rule.

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
