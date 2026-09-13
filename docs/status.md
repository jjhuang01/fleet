# Fork status

One file that answers "where does this fork stand, what is broken, and what is next?" Round-by-round detail stays in the documents each row links to; this is the index and the current state, not another review.

- **Upstream:** [khang859/fleet](https://github.com/khang859/fleet) by Khang Nguyen, MIT. The product, its architecture and most of this code are his.
- **Last verified:** 2026-09-13, at `6bd887bc`, on macOS arm64, version `2.119.0`.
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

## Known issues

Everything here is understood, has a location, and is listed rather than silently absorbed. Nothing in this table blocks normal use.

| Issue                                                                                                                                                                                                       | Location                                                             | Status                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backpressure is not end-to-end: after 250ms a paused PTY is resumed whether or not the renderer drained it. The overflow guard at 256KB still caps the buffer, so this costs throughput rather than memory. | `src/main/pty-manager.ts` (overflow guard, `resumeIfStuck`)          | Verified. Fixing it means changing the pause ACK to carry a byte count; `src/preload/index.ts` currently ACKs once with no size. Its own project. |
| A process that exits while its tab is inactive can lose the last of its output: the hidden-tab buffer flushes on a 250ms timer and the close path serializes immediately.                                   | `src/renderer/src/hooks/use-terminal.ts`, `src/renderer/src/App.tsx` | Verified.                                                                                                                                         |
| The sidebar still subscribes to the whole cwd `Map` to read one pane's directory, so it re-renders when an unrelated pane changes directory.                                                                | `src/renderer/src/components/Sidebar.tsx`                            | Verified. A one-line selector fix; the store's `new Map` per update is fine once this is done.                                                    |
| Copilot's socket server may not close the socket on the normal event path under `allowHalfOpen`.                                                                                                            | `src/main/copilot/socket-server.ts`                                  | Flagged by the 2026-09-13 review, not re-verified. Copilot is off by default.                                                                     |
| `toolUseIdCache` grows for the life of a session and is only reclaimed when the session is cleared.                                                                                                         | `src/main/copilot/session-store.ts`                                  | Verified. Copilot is off by default.                                                                                                              |
| `McpManager.closeAll()` does not wait for a connection that is still handshaking.                                                                                                                           | `src/main/agent/mcp/manager.ts`                                      | Deliberate. Process exit closes the pipe, and the stdio server goes with it; the quit path bounds the wait at 2s.                                 |
| Overlays have no `role="dialog"`, `aria-modal`, or focus containment.                                                                                                                                       | `src/renderer/src/components/Overlay.tsx`                            | Deliberate. Adding the ARIA without the focus trap would be worse than neither, so both belong in one change.                                     |
| Long agent transcripts are not virtualized.                                                                                                                                                                 | `src/renderer/src/components/agent/AgentThread.tsx`                  | Observed, not measured.                                                                                                                           |
| Background workspaces stay mounted.                                                                                                                                                                         | `src/renderer/src/App.tsx`                                           | Deliberate: unmounting would drop PTYs that are meant to stay warm.                                                                               |

[docs/performance-and-issues-audit.md](performance-and-issues-audit.md) is the earlier, upstream-era audit; its statuses are only current as of its own date, and one of its entries is now marked "partly fixed" to match the row above.

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
3. **Overlay accessibility** — ARIA roles together with focus containment, in one change.
4. **Windows and Linux builds** — the fork has only been built and launched on macOS; `build:win` and `build:linux` are unverified here.

## Reproducing the verification

```bash
npm run typecheck
npx vitest run --maxWorkers=4 --exclude '**/*learnings*'   # never bare `npm test` while a dev window is open
npx eslint --no-cache <files you changed>
npm run build:mac
```

Layout work has a live pass that drives a real window — start `npm run dev`, then `npm run qa:panes`. It snapshots the tabs you have open and asserts they come back untouched.

Not covered by any of the above: real IMEs (RIME/Squirrel were never driven), automated drag-and-drop end-to-end (the QA script needs a dev window and is not wired into CI), and Windows or Linux.
