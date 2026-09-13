# Fleet

A lightweight, cross-platform terminal multiplexer for developers running multiple AI coding agents simultaneously.

Fleet gives you a single window to manage all your terminal sessions with vertical tabs, split panes, real-time agent activity detection, and OS-level notifications when agents need your attention.

> **This is a community fork** of [khang859/fleet](https://github.com/khang859/fleet). Everything that existed before the fork is Khang Nguyen's work, MIT licensed; see [Credits](#credits).
>
> It also speaks more than one language: **Settings > General > Language** (or `Cmd+K` and type "language") switches the whole interface between English and Simplified Chinese, and the default follows the OS locale. The document language, date formats and font stack follow that choice rather than the machine's, and so do the terminal's right-click menu, the window title and desktop notifications. Text your models, tools and servers send back stays as they wrote it; [docs/i18n.md](docs/i18n.md) lists what is and is not translated, and why.
>
> On top of upstream, this fork adds the pane layout Otty users keep asking for: drag a pane onto another pane's edge to re-dock it, drop a pane on a sidebar tab to merge the two into one tab (and drop it back out to un-merge), drag a grid intersection to move a whole row and column at once, `Cmd+Shift+B` to balance a tab, and `Cmd+Alt+Arrow` to move a pane without the mouse. [docs/pane-layout-review.md](docs/pane-layout-review.md) records what upstream has, what this fork added, and what neither has; [docs/blocks-plan.md](docs/blocks-plan.md) is the next planned project. [docs/status.md](docs/status.md) is the fork's status board: what each round shipped, what was verified and how, what is known-broken, and what comes next.

## Download

Releases for this fork are published at [jjhuang01/fleet releases](https://github.com/jjhuang01/fleet/releases/latest):

- [macOS — Apple Silicon (M1/M2/M3/M4)](https://github.com/jjhuang01/fleet/releases/latest) — `fleet-<version>-arm64.dmg`
- [macOS — Intel](https://github.com/jjhuang01/fleet/releases/latest) — `fleet-<version>-x64.dmg`
- [Windows](https://github.com/jjhuang01/fleet/releases/latest) — `.exe`
- [Linux](https://github.com/jjhuang01/fleet/releases/latest) — `.deb` (Debian/Ubuntu), `.rpm` (Fedora/RHEL), `.AppImage` (universal)

macOS builds from this fork are **not notarized**: they need an Apple Developer account to sign and notarize, which a fork cannot borrow. Right-click the app and choose **Open** the first time, or build it yourself with `npm run build:mac` (see `electron-builder.yml` for how to turn notarization on if you have your own credentials).

### Linux install

**Debian / Ubuntu / Mint:**

```bash
sudo apt install ./fleet_<version>_amd64.deb
```

Use `apt install` rather than `dpkg -i` so system dependencies (`libxss1`, etc.) are auto-resolved. The package installs to `/opt/Fleet`, registers a desktop entry, and ships an AppArmor profile so the Chromium sandbox works on Ubuntu 24.04+ without `--no-sandbox`.

**Fedora / RHEL:**

```bash
sudo dnf install ./fleet-<version>.x86_64.rpm
```

**Other distros:** download the `.AppImage`, `chmod +x`, and run. On distros with `apparmor_restrict_unprivileged_userns=1` (Ubuntu 24.04+), prefer the `.deb` — AppImages don't ship an AppArmor profile and may need `--no-sandbox` to launch.

## Features

### Tabs & Workspaces

Vertical sidebar with draggable tabs. Organize sessions into named workspaces that persist across restarts. Rename tabs with F2 (or Shift+F2 to rename a pane), undo a closed tab within 5 seconds, and switch workspaces without losing state. Collapse the sidebar to a mini icon-only view for more screen space.

### Dashboard

When no tab is active, Fleet shows a dashboard with an ASCII header, recent files, and recent folders — a quick way to jump back into recent work or switch workspaces.

### Split Panes

Split any tab horizontally or vertically (`Cmd+D` / `Cmd+Shift+D`) and drag a divider to resize. The recursive split tree supports arbitrary nesting, so the layout is a grid you build rather than a fixed set of slots. Navigate between panes with `Cmd+[` / `Cmd+]`.

Two dividers that meet at a grid intersection move together: grab the crossing point and the whole row and the whole column follow, which is how a 2×2 grid trades a corner instead of only its width or only its height. The strip that answers the pointer is 12px wide while the seam it draws stays 6px, so a divider is catchable without widening the gutter between cards. `Cmd+Shift+B` balances the panes in a tab, and splitting equalizes the panes the split divides rather than leaving the new one at an arbitrary fraction.

Panes are re-arrangeable without closing their shells. Drag a pane onto another pane's edge to re-dock it there — the half of the target you drop on is where it lands. Drag it onto a sidebar tab to merge that pane into that tab, or onto the empty sidebar below the tabs to pull it back out into a tab of its own, so merging is reversible rather than a one-way door. The PTY is never rebuilt, so a running agent keeps its session and its scrollback through any of these moves. `Cmd+Alt+Arrow` is the keyboard version of the same re-arrangement.

Terminal panes carry their own title, set by double-clicking the pane header or pressing `Shift+F2`, so `Claude`, `Codex`, `Server` and `Logs` read as what they are instead of as four indistinguishable shells.

### Notification Badges & Activity Tracking

Fleet watches terminal output for signals that an agent needs attention:

- **Amber pulse** — agent is asking for permission
- **Red dot** — process exited with an error
- **Blue dot** — task completed
- **Gray dot** — process exited cleanly

Notifications are forwarded to your OS (macOS/Windows) and batched to prevent alert fatigue. Fleet also tracks granular activity states (working, reading, idle, waiting, needs-permission) for each pane.

### Copilot (macOS)

A floating overlay panel that monitors active Claude Code sessions across all your panes. Surfaces permission requests, tracks session activity, and displays conversation threads — so you can keep an eye on multiple agents without switching tabs. Comes with selectable animated mascots (Officer, Robot, Cat, Bear, Kraken, Dragon, Owl).

### Command Palette

Open the command palette with `Cmd+K` to quickly access any action — new tabs, splits, settings, git changes, and more.

### Git Integration

Tab labels update in real-time to show each pane's current working directory and git branch. View file-level diffs with syntax highlighting via the Git Changes panel (`Cmd+Shift+G`), showing modified, added, deleted, renamed, and untracked files with line-level insertions and deletions.

### Worktree Management

Create, list, and remove git worktrees directly from Fleet. Worktree tabs are automatically grouped by parent repository in the sidebar, and branches get auto-generated descriptive names.

### File Editor & Viewer

Open files in a built-in editor with syntax highlighting (JavaScript, TypeScript, HTML, CSS, JSON, Markdown, Python, Go, Rust, Java, PHP, Vue, SQL, YAML, and more). CodeMirror-powered with undo/redo, line numbers, and auto-save. Editor chrome and the markdown preview sidebar show the full file path so same-named files stay distinguishable. Image files open in an inline viewer.

### Markdown Preview

Markdown files open in a dedicated preview pane with preview and raw sub-tabs — GFM, syntax-highlighted code blocks, and the same rendering whether you open them from the sidebar, `Cmd+O`, or `fleet open`.

### Notes

The pane toolbar opens a Markdown scratchpad bound to that pane's project — the repository root, or the folder itself when it is not a repo — stored under `~/.fleet/notes/`. It autosaves as you type and switches between editor, split and preview layouts, so a pasted log, a URL or a command you are about to run has somewhere to live that is not your shell history. The same note opens from any subfolder of the project, and a file changed in another program is reported with the choice to reload or overwrite rather than silently clobbered.

### Telescope Finder

A multi-mode fuzzy finder (`Cmd+Shift+T`) with file, grep, symbol, browse, and panes modes. Preview images inline, navigate directories, and see gitignored entries dimmed. Markdown files open in the markdown preview pane; the `fleet open` CLI uses the same routing.

### File Search & Quick Open

- **Quick Open** (`Cmd+P`) — fast fuzzy file finder
- **Search files on disk** (`Cmd+Shift+O`) — deep file search across directories
- **Search in pane** (`Cmd+F`) — search terminal output

### Annotate

Annotate live webpages with an element picker or free-draw canvas, then hand the annotated screenshot to an AI agent. Move/drag tool (V) repositions drawn elements; picker UI is hidden from the saved capture.

### Clipboard History

Access your clipboard history with `Cmd+Shift+H` and paste previous entries into any pane.

### Socket API

Control Fleet programmatically over a Unix socket at `~/.fleet/fleet.sock` (macOS/Linux) or a named pipe `\\.\pipe\fleet` (Windows):

```bash
# List all panes
echo '{"command":"list-panes"}' | nc -U ~/.fleet/fleet.sock

# Send input to a pane
echo '{"command":"send-input","paneId":"abc123","input":"ls\n"}' | nc -U ~/.fleet/fleet.sock

# Subscribe to events
echo '{"command":"subscribe"}' | nc -U ~/.fleet/fleet.sock
```

### Fleet CLI

Fleet installs a `fleet` command to `~/.fleet/bin` for opening files, images, and managing panes from the terminal. Agent skills are managed separately, in Settings > Agent, where a skill is imported from a folder or a URL and copied into `~/.fleet/skills`.

### Settings

Configurable default shell, font size/family (bundled JetBrains Mono + custom font support), scrollback buffer, theme (dark/light), notification preferences per alert level (badge, sound, and OS notification toggles), and copilot options.

### Auto-Updates

Fleet checks GitHub Releases on launch and prompts you to install new versions.

## Keyboard Shortcuts

| Action               | macOS            | Windows/Linux       |
| -------------------- | ---------------- | ------------------- |
| New tab              | `Cmd+T`          | `Ctrl+T`            |
| Close pane           | `Cmd+W`          | `Ctrl+Shift+W`      |
| Split right          | `Cmd+D`          | `Ctrl+Shift+D`      |
| Split down           | `Cmd+Shift+D`    | `Ctrl+Shift+Alt+D`  |
| Previous pane        | `Cmd+[`          | `Ctrl+Shift+[`      |
| Next pane            | `Cmd+]`          | `Ctrl+Shift+]`      |
| Balance panes        | `Cmd+Shift+B`    | `Ctrl+Shift+B`      |
| Move pane            | `Cmd+Alt+Arrows` | `Ctrl+Shift+Arrows` |
| Next tab             | `Ctrl+Tab`       | `Ctrl+Tab`          |
| Previous tab         | `Ctrl+Shift+Tab` | `Ctrl+Shift+Tab`    |
| Command palette      | `Cmd+K`          | `Ctrl+K`            |
| Quick open           | `Cmd+P`          | `Ctrl+P`            |
| Telescope finder     | `Cmd+Shift+T`    | `Ctrl+Shift+T`      |
| Search files on disk | `Cmd+Shift+O`    | `Ctrl+Shift+O`      |
| Search in pane       | `Cmd+F`          | `Ctrl+Shift+F`      |
| Git changes          | `Cmd+Shift+G`    | `Ctrl+Shift+G`      |
| Clipboard history    | `Cmd+Shift+H`    | `Ctrl+Shift+H`      |
| Open file            | `Cmd+O`          | `Ctrl+O`            |
| Rename tab           | `F2`             | `F2`                |
| Rename pane          | `Shift+F2`       | `Shift+F2`          |
| Settings             | `Cmd+,`          | `Ctrl+,`            |
| Show shortcuts       | `Cmd+/`          | `Ctrl+/`            |
| Switch to tab 1–9    | `Cmd+1`–`Cmd+9`  | `Ctrl+1`–`Ctrl+9`   |

## Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build:mac     # macOS
npm run build:win     # Windows
npm run build:linux   # Linux
```

## Stack

Electron + electron-vite + React + TypeScript, xterm.js for terminal emulation, node-pty for PTY processes, shadcn/ui + Tailwind for UI, Zustand for state management.

## Credits

- **Upstream:** [Fleet](https://github.com/khang859/fleet) by [Khang Nguyen](https://github.com/khang859), MIT licensed. This fork keeps that copyright notice and builds on his work; the product, its architecture and most of the code are his.
- **Pane layout behaviour:** [Otty](https://github.com/otty-shell/otty) by the Otty authors, also MIT. `lib/pane-balance.ts` reproduces the split-equalization semantics of Otty's `pane_balance.rs`, and the 12px divider grab strip matches the leeway iced gives Otty's splitters. Otty is Rust + iced and this app is Electron + xterm, so no code crossed over: the behaviour was re-implemented from reading Otty's source and checked against it, and `docs/pane-layout-review.md` states exactly which Otty capabilities exist upstream, which this fork added, and which exist in neither.

## License

MIT — see [LICENSE](LICENSE), which carries both the upstream copyright and this fork's.
