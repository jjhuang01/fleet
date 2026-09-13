# Fork status

One file that answers "where does this fork stand, what is broken, and what is next?" Round-by-round detail stays in the documents each row links to; this is the index and the current state, not another review.

- **Upstream:** [khang859/fleet](https://github.com/khang859/fleet) by Khang Nguyen, MIT. The product, its architecture and most of this code are his.
- **Last verified:** 2026-09-14, on macOS arm64, at version `2.119.0`.
- **Shape of the fork:** upstream Fleet, plus the pane layout Otty users keep asking for, plus a Simplified Chinese interface. Everything else tracks upstream, and bug fixes that are not fork-specific are worth offering upstream too (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

## What this fork adds over upstream

Upstream features — vertical tabs and workspaces, split panes, per-pane titles and rename, notification badges and activity tracking, the Copilot overlay, the command palette, the file editor and Markdown preview, project notes, the Telescope finder, clipboard history, the socket API, the `fleet` CLI, auto-updates — are described in [README.md](../README.md#features) and are not re-listed here.

| Addition                                                                   | Notes                                                                                                                          | Landed in                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Drag a pane onto another pane's edge to re-dock it                         | Four-way edge drops with a half-pane preview. The PTY is not rebuilt, so a running agent keeps its session and its scrollback. | `24b98df0`                                     |
| Drag a pane onto a sidebar tab to merge, or below the tabs to un-merge     | Merging is reversible. Merge target and sort target use one predicate, so a merge preview cannot silently become a re-order.   | `24b98df0`, `d41adb96`                         |
| `Cmd+Alt+Arrow` moves a pane without the mouse                             | Neighbour resolution is a pure function (`lib/pane-neighbour.ts`) with its own tests.                                          | `5e09dac6`                                     |
| A grid intersection drags a row and a column together                      | Keeps the panes it cuts collinear; the collinearity key is quantized rather than a CSS string.                                 | `24b98df0`, `5e09dac6`                         |
| Splitting equalizes the group it divides, and `Cmd+Shift+B` balances a tab | Semantics re-implemented from Otty's `pane_balance.rs`. Otty is Rust and iced; no code crossed over.                           | `d41adb96`                                     |
| The divider's pointer target is 12px while its seam stays 6px              | Matches the leeway iced gives Otty's own splitters (`PANE_RESIZE_GRAB`).                                                       | `d41adb96`                                     |
| A Simplified Chinese interface, switchable in Settings                     | `zh-Hans`, following the OS by default. [docs/i18n.md](i18n.md) states what is translated and what is deliberately left alone. | `87ef20b1`, `64a40a14`, `e666a928`, `f8eedb0c` |

[docs/pane-layout-review.md](pane-layout-review.md) checks both Otty branches against their source and records which of these Otty already has (divider resize, and equalizing splits after `Cmd+D`) and which it does not (every other row here).

## Progress

| Round                        | Commits                                                                | Outcome                                                                                                                                                                                                                                        | Evidence                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pane layout                  | `24b98df0`, `aeb309f3`                                                 | Pane drag re-dock, tab merge, corner resize; IME duplicate-commit guard; self-drop preview removed.                                                                                                                                            | [docs/pane-layout-review.md](pane-layout-review.md)                                                                                                                                        |
| Layout round-out             | `d41adb96`, `5e09dac6`                                                 | Reversible merges, balance and equalizing splits, 12px hit strip, keyboard pane moves, `npm run qa:panes` (9/9 scenarios).                                                                                                                     | Same document, "第三轮" section; packaged `.app` smoke-tested end to end.                                                                                                                  |
| Simplified Chinese interface | `87ef20b1`, `64a40a14`, `e666a928`, `4211861a`, `cc30c92c`, `f8eedb0c` | Typed catalogue, locale-following dates and document language, AA contrast in all four light themes, the last hardcoded toasts moved into the catalogue.                                                                                       | `npm run typecheck` fails on a missing translation by construction; [docs/i18n.md](i18n.md)                                                                                                |
| Standing on its own          | `2fd4117a`, `82479cf9`                                                 | Update feed, issue links, OpenRouter referer, Linux maintainer and pricing feed point at this fork; upstream stays credited.                                                                                                                   | `package.json`, `electron-builder.yml`                                                                                                                                                     |
| Audit and QA round           | `1b003648`, `7f74cdc4`, `85fabf80`, `b18814bf`, `36e46e19`, `6bd887bc` | Tail-flush before a natural PTY exit; MCP connect races and the unread stderr pipe; quit waiting for children and releasing per-pane state; one Escape per dialog; stale drags; `ImageBitmap` release; native-dep install no longer swallowed. | 251 test files / 3226 cases, `--maxWorkers=4`; `git diff --check`; `npm run build:mac` exit 0; installed app launched under an isolated `--user-data-dir` and exited within 1s of SIGTERM. |
| Dialog accessibility         | `7ee42446`                                                             | Overlays are labelled modals with focus containment: each is named after the heading it draws or by an explicit `label`, focus moves in on open and returns to the control that opened it, and Tab wraps rather than walking out. A control taken out of the Tab order is not counted as a stop, and a dialog whose every control is disabled holds Tab on the panel. | 254 test files / 3247 cases, `--maxWorkers=4`; a real window on an isolated `--user-data-dir` driven over CDP: wrap both ways, 20 Tabs that never left the dialog, Escape returning focus to the trigger, and an injected `tabindex="-1"` control that Tab steps over; installed `.app` re-signed, hash-matched against the build and smoke-tested. |
| Terminal colour              | `pending`                                                              | A Fleet started from inside another terminal, or from an agent CLI, used to hand every pane that process's `NO_COLOR` / `TERM_PROGRAM` / `OTTY_*`, so every agent CLI printed in one colour. The launcher's terminal identity is dropped before the login shell is asked for the user's environment, and panes are stamped with Fleet's own `TERM_PROGRAM` / `COLORTERM`. | Measured in a live pane before and after: `NO_COLOR=[1]` and one colour, then `NO_COLOR=[] COLORTERM=[truecolor] TERM_PROGRAM=[Fleet]` and `rgb(255,92,87)` / `rgb(90,247,142)` / `rgb(87,199,255)` / `rgb(255,128,0)`; 3 unit cases on the key predicate; [docs/otty-parity-notes.md](otty-parity-notes.md). |

## Known issues

Everything here is understood, has a location, and is listed rather than silently absorbed. Nothing in this table blocks normal use.

| Issue                                                                             | Location                                            | Status                                                                                                                                                                                            |
| --------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `McpManager.closeAll()` does not wait for a connection that is still handshaking. | `src/main/agent/mcp/manager.ts`                     | Deliberate. Process exit closes the pipe, and the stdio server goes with it; the quit path bounds the wait at 2s.                                                                                 |
| Long agent transcripts are neither virtualized nor windowed.                      | `src/renderer/src/components/agent/AgentThread.tsx` | Not measured. The transcript has hand-tuned scroll anchoring, so a node-count and frame measurement on a real long conversation comes first; a virtualizer or a window cap without it is a guess. |
| Background workspaces stay mounted.                                               | `src/renderer/src/App.tsx`                          | Deliberate: unmounting would drop PTYs that are meant to stay warm.                                                                                                                               |

[docs/performance-and-issues-audit.md](performance-and-issues-audit.md) is the earlier, upstream-era audit; its statuses are only current as of its own date.

## Plan documents

Longer proposals live next to the code they would change rather than in an issue tracker. None of them is a second status board; each one carries its own header, and these are the states as of the last sync:

| Document                                                                 | Covers                                        | State                                                                                                            |
| ------------------------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [blocks-plan.md](blocks-plan.md)                                         | Command blocks                                | Scoped, not started. Re-checked against the code this round; there is still no block model.                      |
| [update-notification-plan.md](update-notification-plan.md)               | Long-running windows noticing a new version   | Implemented: the launch check, the in-app nudge and Settings > Updates all exist.                                |
| [workspace-copilot-settings-plan.md](workspace-copilot-settings-plan.md) | Workspace and Copilot settings                | Implemented in outline - Settings has both sections; not re-verified line by line.                               |
| [chat-agentic-workbench-epic.md](chat-agentic-workbench-epic.md)         | Chat as an agentic workbench                  | Superseded in part. The `src/main/chat/` tree it targets is gone; the note at its head says where the loop went. |
| [openrouter-integration-review.md](openrouter-integration-review.md)     | OpenRouter capability assessment              | A review of a past commit, not a plan.                                                                           |
| [ux-improvements.md](ux-improvements.md)                                 | Baymard and NNG checklist for the terminal UI | All ten items are checked off in the document.                                                                   |

## Next

1. **Command blocks** — Otty's signature capability, scoped but not started. [docs/blocks-plan.md](blocks-plan.md) states the model, the first slice, and the one design question (alternate-screen programs) it must answer first.
2. **PTY backpressure** — the ACK protocol change described above.
3. **Windows and Linux builds** — the fork has only been built and launched on macOS; `build:win` and `build:linux` are unverified here.

## Reproducing the verification

```bash
npm run typecheck
npx vitest run --maxWorkers=4 --exclude '**/*learnings*'   # never bare `npm test` while a dev window is open
npx eslint --no-cache <files you changed>
npm run build:mac
```

`better-sqlite3` is compiled for one architecture at a time, and the repository copy is left wherever the last command put it: `npm run build:mac` leaves an x86_64 build of the native module in `node_modules` while the host Node is arm64, so the vitest line above fails until `npm run rebuild:node` runs. `npm test` performs that rebuild through its `pretest` hook, which is also the reason it must not run while a dev window is open. The packaged app is unaffected — it carries its own copy.

Layout work has a live pass that drives a real window — start `npm run dev`, then `npm run qa:panes`. It snapshots the tabs you have open and asserts they come back untouched.

Not covered by any of the above: real IMEs (RIME/Squirrel were never driven), automated drag-and-drop end-to-end (the QA script needs a dev window and is not wired into CI), and Windows or Linux.
