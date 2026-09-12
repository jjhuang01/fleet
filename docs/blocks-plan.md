# 命令块（block-based terminal）：立项范围与第一切片

- 日期：2026-09-12
- 状态：已调研，未开工。本轮只做多窗格布局收尾，命令块按之前的判断单独立项。
- 参考实现：`otty-shell/otty` `main` @ `4c6dc38`（Rust + iced），本地检出在 `/tmp/otty-ref.dwZL`。
- 本文所有 Otty 结论都对着源码核过，行号见文末。

## 先纠正两个我先前的说法

1. **Otty 用的不是 OSC 133。** 它自己定了一套 DCS 协议：`ESC P otty-dcs;block;<hex-json> ESC \`，phase 只有 `preexec | exit | precmd`（`crates/escape/src/dcs/mod.rs:10`、`crates/escape/src/dcs/block.rs:88-120`）。所以「Fleet 已经有 OSC 133 解析，接上就能做块」是不成立的：两边协议不同，但**语义可以对齐**。
2. **Otty 的块没有「重跑」和「折叠」。** 全仓搜不到 rerun / fold / collapse 的块实现，`BlockMeta` 里的 `exit_code` 也没被界面读取。它真正给用户的是：左键选中一个块、右键复制整块内容 / 复制 prompt / 复制 command，库层还有 `ScrollTo`。我上一轮把它描述成「可复制、可重跑、可折叠」，重跑与折叠是我加的，不是它的。

## Otty 到底建了什么

- **模型**：每个块自带一个独立 `Surface`（自己的 grid），`BlockMeta { id, kind, cmd, cwd, shell, exit_code, started_at, finished_at, is_alt_screen, is_finished }`；对外快照只用 `start_line + line_count` 描述行范围，按 id 找元数据（`crates/surface/src/block.rs:41-62`）。
- **语义**：`preexec` 把活动 prompt 块改成 command 块，`precmd` 收尾旧块并新开 prompt 块，`exit` 只有协议支持、随附的 shell hook 并不发。
- **shell 集成**：自动的，不是用户手工 opt-in —— 写 `~/.config/otty/` 后用 `ZDOTDIR`（zsh）或 `--rcfile`（bash）起 shell；zsh 走 `add-zsh-hook preexec/precmd`（`assets/shell-integrations/otty.zsh:116-117`），bash 内嵌 bash-preexec（`otty.bash:206-250`）。**只有 zsh 和 bash，没有 fish；SSH 会话直接开远端 shell，不注入**，所以 Otty 的块在 SSH 里默认不存在。
- **reflow**：不按换行切块，每个块独立 grid，resize 时逐块重排，每次快照重算可见范围和行号。

## Fleet 今天的家底

- 主进程只认 `OSC 133 ;C` 和 `;D[;code]`，而且只用来发通知（`src/main/notification-detector.ts:126-139`），不记录块范围，也不告诉 renderer。
- 没有 shell 注入（`src/main/shell-profiles.ts` 直接用用户的 profile 起 shell），远端 rc 只发 OSC 7 与私有 5522（`src/main/remote-ssh/rc-snippet.ts`）。
- 没有 buffer marker、没有块模型。renderer 侧 `term.write(data, cb)`（`src/renderer/src/hooks/use-terminal.ts`）是唯一能对齐「数据落进哪个 buffer 行」的时机。
- 可用的 xterm API（本仓 `@xterm/xterm` 6.0.0）：`registerMarker`（`typings/xterm.d.ts:1147`）、`registerDecoration`（`:1157`）、`registerOscHandler`（`:1864`，解析器层，天然跨 chunk）。`use-terminal.ts:266` 已经在用 `term.parser.registerCsiHandler`，这条路径本仓走过。

## 建议的第一切片（不做 shell 注入，先证明模型）

1. `src/renderer/src/lib/command-blocks.ts`（新）：纯模型。`CommandBlock { id, cmd, exitCode, marker, startLine, endLine, state }`，只依赖传入的 marker 接口，便于单测。
2. `use-terminal.ts`：`term.parser.registerOscHandler(133, ...)` 收 A/B/C/D（BEL 与 ST 都由解析器处理），C 时 `term.registerMarker()` 记下块起点，D 时收尾并记录 exit code；marker 的 `onDispose` 用来丢弃被 trim 掉的块。
3. 先只做一个可见动作：块起点画一条 `registerDecoration()` 细线 + 悬停显示该块的复制按钮（复制 command / 复制 output）。等价于 Otty 现有能力的子集，不做重跑、不做折叠。
4. 需要决定的一件事：**alternate screen 怎么算**。Claude Code、vim 这类全屏程序不产生干净的块边界，Otty 的 `BlockMeta` 专门有 `is_alt_screen`。第一切片建议「alt-screen 期间不开新块」，避免把 TUI 输出切碎。

第二切片才考虑 shell 注入（zsh/bash 的 preexec/precmd hook，可开关）与 SSH 远端 rc 里的同类 hook —— 那是让块在真实 shell 里可靠的前提，但它动的是启动路径，风险比第一切片大一个量级。

## 为什么现在不做

第一切片也要动 `use-terminal.ts` 这个全应用最热的文件，并新增一套随 buffer trim/resize 变化的状态机；放在「布局收尾 + 打包验证」的同一轮里，只会两头都不扎实。布局这一轮已经收尾（见 `docs/pane-layout-review.md` 第三轮），命令块应该带着自己的验收标准单独开始。

## 源码出处

- `crates/escape/src/dcs/mod.rs:10`、`crates/escape/src/dcs/block.rs:88-120`、`crates/escape/docs/support_sequences.md:187` — DCS 协议与 phase
- `crates/surface/src/block.rs:41-62` — `BlockMeta`
- `assets/shell-integrations/otty.zsh:116-117`、`assets/shell-integrations/otty.bash:206-250` — hook 安装
- `app/src/widgets/terminal_workspace/view/pane_context_menu.rs`、`crates/ui/terminal/src/input.rs` — 块操作（复制三类，无重跑/折叠）
