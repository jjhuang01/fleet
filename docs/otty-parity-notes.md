# Otty parity notes: colour, images, Markdown

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

**Not yet implemented.** The shape it should take, matching Otty:

1. `main` gains an IPC that reads `clipboard.readImage()`, writes a PNG under the
   app's cache directory, and returns the path; empty clipboard → no path.
2. The terminal pane, on `paste` with **no text** and an image present, inserts the
   quoted path into the focused pane instead of doing nothing. Text paste keeps
   today's behaviour.
3. A palette command ("Paste image as path") for the same thing from the keyboard
   alone, and an i18n key for both.

## 3. Markdown

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

## 4. Not closeable cheaply, or not at all

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

# Otty's own view of its panes:
/Applications/Otty.app/Contents/MacOS/otty-cli pane list          # agent, session id, agent state per pane
/Applications/Otty.app/Contents/MacOS/otty-cli features list      # what its terminal can draw
```
